import {
  CreateChallengeRecordParams,
  RegistrationChallengeRecord,
  RegistrationChallengeStatus,
  RegistrationRole,
} from "./registration.types";
import { RegistrationError } from "./registration.errors";
import { getRegistrationConfig } from "./registration.config";
import { parseDirectusUtcDateTime } from "./registration.timestamps";

const CHALLENGE_COLLECTION = "vs_registration_challenge";
const MAX_CLEANUP_BATCH = 20;

/**
 * Keep the challenge API deliberately explicit. In particular, do not use
 * `fields=*`: the challenge contains the OTP HMAC and payload digest and the
 * service policy must expose only this known set to this repository.
 */
const CHALLENGE_FIELDS = [
  "challenge_id",
  "email_normalized",
  "role",
  "otp_hmac",
  "attempts",
  "max_attempts",
  "resend_count",
  "last_sent_at",
  "expires_at",
  "payload_digest",
  "payload_version",
  "status",
  "state_version",
  "verification_lease_id",
  "verification_lease_expires_at",
  "request_ip_hash",
  "created_at",
  "updated_at",
  "consumed_at",
].join(",");

const CHALLENGE_STATUSES: readonly RegistrationChallengeStatus[] = [
  "ACTIVE",
  "VERIFYING",
  "LOCKED",
  "CONSUMED",
  "CANCELLED",
  "EXPIRED",
];

const CHALLENGE_STATUS_SET = new Set<RegistrationChallengeStatus>(
  CHALLENGE_STATUSES
);

const MUTABLE_FIELDS = new Set([
  "email_normalized",
  "otp_hmac",
  "attempts",
  "resend_count",
  "last_sent_at",
  "expires_at",
  "payload_digest",
  "payload_version",
  "status",
  "verification_lease_id",
  "verification_lease_expires_at",
  "consumed_at",
]);

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || typeof value === "string";
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isValidDateString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Number.isFinite(parseDirectusUtcDateTime(value))
  );
}

function isRegistrationRole(value: unknown): value is RegistrationRole {
  return value === "CLIENT" || value === "FREELANCER" || value === "SCH_ADMIN";
}

function isRegistrationStatus(
  value: unknown
): value is RegistrationChallengeStatus {
  return (
    typeof value === "string" &&
    CHALLENGE_STATUS_SET.has(value as RegistrationChallengeStatus)
  );
}

export class RegistrationChallengeRepository {
  /**
   * Resolve the server-only Directus connection once per request. Production
   * configuration validation is owned by getRegistrationConfig(); an empty
   * URL is still rejected here so Node never attempts a relative fetch.
   */
  private getRequestContext(operation: string): {
    baseUrl: string;
    headers: Record<string, string>;
  } {
    const config = getRegistrationConfig();
    if (!config.directusBaseUrl) {
      throw this.dependencyError(`${operation}.configuration`);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (config.directusToken) {
      headers.Authorization = `Bearer ${config.directusToken}`;
    }

    return {
      baseUrl: config.directusBaseUrl,
      headers,
    };
  }

  private dependencyError(operation: string, status?: number): RegistrationError {
    // Never log a Directus response body. It can contain field values or
    // request details that must not cross the registration boundary.
    console.error("[registration.challenge.repo] Directus operation failed", {
      operation,
      status,
    });
    return new RegistrationError(
      "Registration storage is temporarily unavailable.",
      "CONFIGURATION_ERROR",
      503
    );
  }

  private invalidArgument(message: string): RegistrationError {
    return new RegistrationError(message, "INVALID_REQUEST", 400);
  }

  private concurrentUpdateError(): RegistrationError {
    return new RegistrationError(
      "Challenge was modified concurrently. Please refresh and retry.",
      "INVALID_REQUEST",
      409
    );
  }

  private validateChallengeId(challengeId: string): void {
    if (!isNonEmptyString(challengeId) || challengeId.length > 128) {
      throw this.invalidArgument("Invalid registration challenge.");
    }
  }

  private validateStateVersion(stateVersion: number): void {
    if (!isSafeInteger(stateVersion) || stateVersion < 0) {
      throw this.invalidArgument("Invalid registration challenge version.");
    }
  }

  private validateLeaseId(leaseId: string | undefined): asserts leaseId is string {
    if (!isNonEmptyString(leaseId) || leaseId.length > 64) {
      throw new RegistrationError(
        "A verification lease owner is required.",
        "PROVISIONING_CONFLICT",
        409
      );
    }
  }

  private validateStatuses(
    statuses: RegistrationChallengeStatus | RegistrationChallengeStatus[]
  ): RegistrationChallengeStatus[] {
    const values = Array.isArray(statuses) ? statuses : [statuses];
    if (
      values.length === 0 ||
      values.some((status) => !isRegistrationStatus(status))
    ) {
      throw this.invalidArgument("Invalid registration challenge state.");
    }
    return [...new Set(values)];
  }

  private validatePatch(patchData: Record<string, unknown>): void {
    for (const key of Object.keys(patchData)) {
      if (!MUTABLE_FIELDS.has(key)) {
        throw this.invalidArgument("Invalid registration challenge update.");
      }
    }
  }

  private validateChallengeRecord(
    value: unknown,
    operation: string
  ): RegistrationChallengeRecord {
    if (!isJsonObject(value)) {
      throw this.dependencyError(`${operation}.invalidResponse`);
    }

    const requiredStrings = [
      "challenge_id",
      "email_normalized",
      "otp_hmac",
      "last_sent_at",
      "expires_at",
      "payload_digest",
      "created_at",
      "updated_at",
    ] as const;
    for (const field of requiredStrings) {
      if (!isNonEmptyString(value[field])) {
        throw this.dependencyError(`${operation}.invalidResponse`);
      }
    }

    if (
      !isRegistrationRole(value.role) ||
      !isRegistrationStatus(value.status) ||
      !isValidDateString(value.last_sent_at) ||
      !isValidDateString(value.expires_at) ||
      !isValidDateString(value.created_at) ||
      !isValidDateString(value.updated_at)
    ) {
      throw this.dependencyError(`${operation}.invalidResponse`);
    }

    const numericFields = [
      "attempts",
      "max_attempts",
      "resend_count",
      "payload_version",
      "state_version",
    ] as const;
    if (numericFields.some((field) => !isSafeInteger(value[field]))) {
      throw this.dependencyError(`${operation}.invalidResponse`);
    }

    const attempts = value.attempts as number;
    const maxAttempts = value.max_attempts as number;
    const resendCount = value.resend_count as number;
    const payloadVersion = value.payload_version as number;
    const stateVersion = value.state_version as number;
    if (
      attempts < 0 ||
      maxAttempts <= 0 ||
      attempts > maxAttempts ||
      resendCount < 0 ||
      payloadVersion <= 0 ||
      stateVersion < 0
    ) {
      throw this.dependencyError(`${operation}.invalidResponse`);
    }

    const optionalStringFields = [
      "verification_lease_id",
      "verification_lease_expires_at",
      "request_ip_hash",
      "consumed_at",
    ] as const;
    if (optionalStringFields.some((field) => !isNullableString(value[field]))) {
      throw this.dependencyError(`${operation}.invalidResponse`);
    }
    if (
      value.verification_lease_expires_at !== null &&
      value.verification_lease_expires_at !== undefined &&
      !isValidDateString(value.verification_lease_expires_at)
    ) {
      throw this.dependencyError(`${operation}.invalidResponse`);
    }
    if (
      value.consumed_at !== null &&
      value.consumed_at !== undefined &&
      !isValidDateString(value.consumed_at)
    ) {
      throw this.dependencyError(`${operation}.invalidResponse`);
    }

    return {
      challenge_id: value.challenge_id as string,
      email_normalized: value.email_normalized as string,
      role: value.role,
      otp_hmac: value.otp_hmac as string,
      attempts,
      max_attempts: maxAttempts,
      resend_count: resendCount,
      last_sent_at: value.last_sent_at as string,
      expires_at: value.expires_at as string,
      payload_digest: value.payload_digest as string,
      payload_version: payloadVersion,
      status: value.status,
      state_version: stateVersion,
      verification_lease_id:
        (value.verification_lease_id as string | null | undefined) ?? null,
      verification_lease_expires_at:
        (value.verification_lease_expires_at as string | null | undefined) ??
        null,
      request_ip_hash:
        (value.request_ip_hash as string | null | undefined) ?? null,
      created_at: value.created_at as string,
      updated_at: value.updated_at as string,
      consumed_at: (value.consumed_at as string | null | undefined) ?? null,
    };
  }

  private async requestJson(
    operation: string,
    url: string,
    init: RequestInit
  ): Promise<unknown> {
    try {
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
      });
      if (!response.ok) {
        throw this.dependencyError(operation, response.status);
      }
      try {
        return await response.json();
      } catch {
        throw this.dependencyError(`${operation}.invalidResponse`);
      }
    } catch (error: unknown) {
      if (error instanceof RegistrationError) {
        throw error;
      }
      throw this.dependencyError(operation);
    }
  }

  private async requestJsonAllowNotFound(
    operation: string,
    url: string,
    init: RequestInit
  ): Promise<unknown | null> {
    try {
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
      });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw this.dependencyError(operation, response.status);
      }
      try {
        return await response.json();
      } catch {
        throw this.dependencyError(`${operation}.invalidResponse`);
      }
    } catch (error: unknown) {
      if (error instanceof RegistrationError) {
        throw error;
      }
      throw this.dependencyError(operation);
    }
  }

  private buildCollectionUrl(
    baseUrl: string,
    params: Record<string, string>
  ): string {
    const search = new URLSearchParams(params);
    return `${baseUrl}/items/${CHALLENGE_COLLECTION}?${search.toString()}`;
  }

  private parseSingleResponse(
    response: unknown,
    operation: string
  ): RegistrationChallengeRecord {
    if (!isJsonObject(response) || !("data" in response)) {
      throw this.dependencyError(`${operation}.invalidResponse`);
    }
    return this.validateChallengeRecord(response.data, operation);
  }

  private parseUpdatedResponse(
    response: unknown,
    operation: string
  ): RegistrationChallengeRecord | null {
    // PATCH on the collection is Directus "update multiple" semantics. Its
    // response must be an array; accepting an object would make a zero-row or
    // single-item response indistinguishable from a successful CAS update.
    if (!isJsonObject(response) || !Array.isArray(response.data)) {
      throw this.dependencyError(`${operation}.invalidResponse`);
    }
    if (response.data.length === 0) {
      return null;
    }
    if (response.data.length !== 1) {
      throw this.dependencyError(`${operation}.invalidResponse`);
    }
    return this.validateChallengeRecord(response.data[0], operation);
  }

  /**
   * Creates a new registration challenge row in Directus.
   */
  async createChallenge(
    params: CreateChallengeRecordParams
  ): Promise<RegistrationChallengeRecord> {
    const config = getRegistrationConfig();
    this.validateChallengeId(params.challenge_id);
    if (
      !isNonEmptyString(params.email_normalized) ||
      params.email_normalized !== params.email_normalized.trim().toLowerCase()
    ) {
      throw this.invalidArgument("Invalid normalized registration email.");
    }
    if (!isRegistrationRole(params.role)) {
      throw this.invalidArgument("Invalid registration role.");
    }
    if (!isNonEmptyString(params.otp_hmac) || !isNonEmptyString(params.payload_digest)) {
      throw this.invalidArgument("Invalid registration challenge secrets.");
    }
    if (
      !isValidDateString(params.last_sent_at) ||
      !isValidDateString(params.expires_at)
    ) {
      throw this.invalidArgument("Invalid registration challenge timing.");
    }

    const attempts = params.attempts ?? 0;
    const maxAttempts = params.max_attempts ?? config.maxOtpAttempts;
    const resendCount = params.resend_count ?? 0;
    const payloadVersion = params.payload_version ?? 1;
    const stateVersion = params.state_version ?? 0;
    if (
      !isSafeInteger(attempts) ||
      !isSafeInteger(maxAttempts) ||
      !isSafeInteger(resendCount) ||
      !isSafeInteger(payloadVersion) ||
      !isSafeInteger(stateVersion) ||
      attempts < 0 ||
      maxAttempts <= 0 ||
      attempts > maxAttempts ||
      resendCount < 0 ||
      payloadVersion <= 0 ||
      stateVersion < 0
    ) {
      throw this.invalidArgument("Invalid registration challenge counters.");
    }
    if (!isRegistrationStatus(params.status)) {
      throw this.invalidArgument("Invalid registration challenge state.");
    }
    if (
      params.request_ip_hash !== null &&
      params.request_ip_hash !== undefined &&
      !isNonEmptyString(params.request_ip_hash)
    ) {
      throw this.invalidArgument("Invalid registration request fingerprint.");
    }

    const nowIso = new Date().toISOString();
    const body = {
      challenge_id: params.challenge_id,
      email_normalized: params.email_normalized,
      role: params.role,
      otp_hmac: params.otp_hmac,
      attempts,
      max_attempts: maxAttempts,
      resend_count: resendCount,
      last_sent_at: params.last_sent_at,
      expires_at: params.expires_at,
      payload_digest: params.payload_digest,
      payload_version: payloadVersion,
      status: params.status,
      state_version: stateVersion,
      verification_lease_id: null,
      verification_lease_expires_at: null,
      request_ip_hash: params.request_ip_hash ?? null,
      created_at: nowIso,
      updated_at: nowIso,
      consumed_at: null,
    };

    const { baseUrl, headers } = this.getRequestContext("createChallenge");
    const url = this.buildCollectionUrl(baseUrl, {
      fields: CHALLENGE_FIELDS,
    });
    const response = await this.requestJson("createChallenge", url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return this.parseSingleResponse(response, "createChallenge");
  }

  /**
   * Retrieves a challenge by UUID. A missing row is a normal domain result;
   * all other Directus and response failures are sanitized dependency errors.
   */
  async getChallengeById(
    challengeId: string
  ): Promise<RegistrationChallengeRecord | null> {
    this.validateChallengeId(challengeId);
    const { baseUrl, headers } = this.getRequestContext("getChallengeById");
    const url = `${baseUrl}/items/${CHALLENGE_COLLECTION}/${encodeURIComponent(
      challengeId
    )}?${new URLSearchParams({ fields: CHALLENGE_FIELDS }).toString()}`;
    const response = await this.requestJsonAllowNotFound(
      "getChallengeById",
      url,
      {
        method: "GET",
        headers,
      }
    );
    if (response === null) {
      return null;
    }
    return this.parseSingleResponse(response, "getChallengeById");
  }

  /**
   * Optimistic compare-and-set update. Every mutation is filtered by the
   * challenge ID, expected status, and expected state version in Directus'
   * bulk-update query body. Lease-protected mutations add the expected lease
   * owner to that same filter. There is no item-ID fallback: an unguarded
   * update would reintroduce lost attempts, resend rotations, and lease races.
   */
  private async guardedUpdate(
    challengeId: string,
    expectedStatuses: RegistrationChallengeStatus | RegistrationChallengeStatus[],
    expectedStateVersion: number,
    patchData: Record<string, unknown>,
    expectedLeaseId?: string
  ): Promise<RegistrationChallengeRecord> {
    this.validateChallengeId(challengeId);
    const statuses = this.validateStatuses(expectedStatuses);
    this.validateStateVersion(expectedStateVersion);
    this.validatePatch(patchData);
    if (expectedLeaseId !== undefined) {
      this.validateLeaseId(expectedLeaseId);
    }

    const nextVersion = expectedStateVersion + 1;
    if (!Number.isSafeInteger(nextVersion)) {
      throw this.invalidArgument("Invalid registration challenge version.");
    }

    const { baseUrl, headers } = this.getRequestContext("guardedUpdate");
    // Directus collection PATCH uses the request body's `query` to select
    // update targets. Query-string filters control the returned fields but do
    // not safely define the mutation target on the bulk endpoint. Keeping the
    // complete filter in the body prevents an accidental all-row update.
    const filter: Record<string, unknown> = {
      challenge_id: { _eq: challengeId },
      state_version: { _eq: expectedStateVersion },
      status:
        statuses.length === 1
          ? { _eq: statuses[0] }
          : { _in: statuses },
    };
    if (expectedLeaseId !== undefined) {
      filter.verification_lease_id = { _eq: expectedLeaseId };
    }

    const url = this.buildCollectionUrl(baseUrl, {
      fields: CHALLENGE_FIELDS,
    });
    const payload = {
      ...patchData,
      state_version: nextVersion,
      updated_at: new Date().toISOString(),
    };
    const response = await this.requestJson("guardedUpdate", url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        data: payload,
        query: { filter },
      }),
    });
    const updated = this.parseUpdatedResponse(response, "guardedUpdate");

    if (updated) {
      if (
        updated.challenge_id !== challengeId ||
        updated.state_version !== nextVersion
      ) {
        throw this.dependencyError("guardedUpdate.invalidResponse");
      }
      return updated;
    }

    // A zero-row collection PATCH is the expected stale-CAS signal. Reload
    // solely to classify it; never write the reloaded record without a fresh
    // expected version and status.
    const current = await this.getChallengeById(challengeId);
    if (!current) {
      throw new RegistrationError(
        "Registration challenge not found.",
        "CHALLENGE_NOT_FOUND",
        404
      );
    }

    const leaseMatches =
      expectedLeaseId === undefined ||
      current.verification_lease_id === expectedLeaseId;
    if (
      current.state_version === expectedStateVersion &&
      statuses.includes(current.status) &&
      leaseMatches
    ) {
      // Directus claimed success but returned no rows while the guarded state
      // is unchanged. Treat this as an unavailable/unsupported response
      // contract rather than guessing that the mutation happened.
      throw this.dependencyError("guardedUpdate.zeroRowsUnexplained");
    }
    throw this.concurrentUpdateError();
  }

  /**
   * Updates challenge on OTP resend.
   */
  async updateOnResend(
    challengeId: string,
    expectedStateVersion: number,
    params: {
      otpHmac: string;
      payloadDigest: string;
      expiresAt: string;
      lastSentAt: string;
      resendCount: number;
    }
  ): Promise<RegistrationChallengeRecord> {
    if (
      !isNonEmptyString(params.otpHmac) ||
      !isNonEmptyString(params.payloadDigest) ||
      !isValidDateString(params.expiresAt) ||
      !isValidDateString(params.lastSentAt) ||
      !isSafeInteger(params.resendCount) ||
      params.resendCount < 0
    ) {
      throw this.invalidArgument("Invalid registration resend update.");
    }
    return this.guardedUpdate(challengeId, "ACTIVE", expectedStateVersion, {
      otp_hmac: params.otpHmac,
      payload_digest: params.payloadDigest,
      expires_at: params.expiresAt,
      last_sent_at: params.lastSentAt,
      resend_count: params.resendCount,
      attempts: 0,
      status: "ACTIVE",
      verification_lease_id: null,
      verification_lease_expires_at: null,
    });
  }

  /**
   * Updates challenge on email correction.
   */
  async updateOnEmailCorrection(
    challengeId: string,
    expectedStateVersion: number,
    params: {
      newEmailNormalized: string;
      otpHmac: string;
      payloadDigest: string;
      expiresAt: string;
      lastSentAt: string;
    }
  ): Promise<RegistrationChallengeRecord> {
    if (
      !isNonEmptyString(params.newEmailNormalized) ||
      params.newEmailNormalized !==
        params.newEmailNormalized.trim().toLowerCase() ||
      !isNonEmptyString(params.otpHmac) ||
      !isNonEmptyString(params.payloadDigest) ||
      !isValidDateString(params.expiresAt) ||
      !isValidDateString(params.lastSentAt)
    ) {
      throw this.invalidArgument("Invalid registration email update.");
    }
    return this.guardedUpdate(challengeId, "ACTIVE", expectedStateVersion, {
      email_normalized: params.newEmailNormalized,
      otp_hmac: params.otpHmac,
      payload_digest: params.payloadDigest,
      expires_at: params.expiresAt,
      last_sent_at: params.lastSentAt,
      attempts: 0,
      status: "ACTIVE",
      verification_lease_id: null,
      verification_lease_expires_at: null,
    });
  }

  /**
   * Records a failed OTP attempt and locks if the threshold is reached.
   */
  async recordFailedAttempt(
    challengeId: string,
    currentAttempts: number,
    maxAttempts: number,
    expectedStateVersion: number
  ): Promise<{ attempts: number; isLocked: boolean; stateVersion: number }> {
    if (
      !isSafeInteger(currentAttempts) ||
      !isSafeInteger(maxAttempts) ||
      currentAttempts < 0 ||
      maxAttempts <= 0 ||
      currentAttempts >= maxAttempts
    ) {
      throw this.invalidArgument("Invalid registration attempt counter.");
    }
    const nextAttempts = currentAttempts + 1;
    const isLocked = nextAttempts >= maxAttempts;
    const patch: Record<string, unknown> = {
      attempts: nextAttempts,
    };
    if (isLocked) {
      patch.status = "LOCKED";
    }

    const updated = await this.guardedUpdate(
      challengeId,
      "ACTIVE",
      expectedStateVersion,
      patch
    );

    return {
      attempts: updated.attempts,
      isLocked: updated.status === "LOCKED",
      stateVersion: updated.state_version,
    };
  }

  /**
   * Acquires a temporary lease for idempotent verification/provisioning.
   * A VERIFYING row may be acquired only after the caller has observed an
   * expired prior lease; state_version still closes the write race.
   */
  async acquireVerificationLease(
    challengeId: string,
    expectedStateVersion: number,
    leaseId: string,
    leaseExpiresAt: string
  ): Promise<RegistrationChallengeRecord> {
    this.validateLeaseId(leaseId);
    if (!isValidDateString(leaseExpiresAt)) {
      throw this.invalidArgument("Invalid verification lease expiry.");
    }
    return this.guardedUpdate(
      challengeId,
      ["ACTIVE", "VERIFYING"],
      expectedStateVersion,
      {
        status: "VERIFYING",
        verification_lease_id: leaseId,
        verification_lease_expires_at: leaseExpiresAt,
      }
    );
  }

  /**
   * Releases a verification lease. The lease owner is mandatory at runtime;
   * omitting it must never degrade into an unowned VERIFYING update.
   *
   * The boolean is retained in the third position for compatibility with the
   * initial Phase 2 service shape. Callers must provide the owner as the fourth
   * argument: (challengeId, stateVersion, revertToActive, leaseId).
   */
  async releaseVerificationLease(
    challengeId: string,
    expectedStateVersion: number,
    revertToActive = true,
    expectedLeaseId?: string
  ): Promise<RegistrationChallengeRecord> {
    this.validateLeaseId(expectedLeaseId);
    const patch: Record<string, unknown> = {
      verification_lease_id: null,
      verification_lease_expires_at: null,
    };
    if (revertToActive) {
      patch.status = "ACTIVE";
    }

    return this.guardedUpdate(
      challengeId,
      "VERIFYING",
      expectedStateVersion,
      patch,
      expectedLeaseId
    );
  }

  /**
   * Marks a challenge as consumed upon completed provisioning. Only the lease
   * owner can cross this terminal transition.
   */
  async consumeChallenge(
    challengeId: string,
    expectedStateVersion: number,
    expectedLeaseId: string
  ): Promise<RegistrationChallengeRecord> {
    this.validateLeaseId(expectedLeaseId);
    return this.guardedUpdate(
      challengeId,
      "VERIFYING",
      expectedStateVersion,
      {
        status: "CONSUMED",
        consumed_at: new Date().toISOString(),
        verification_lease_id: null,
        verification_lease_expires_at: null,
      },
      expectedLeaseId
    );
  }

  /**
   * Cancels an active challenge. Verification leases cannot be cancelled by
   * this operation; the provisioning owner must release or consume them.
   */
  async cancelChallenge(
    challengeId: string,
    expectedStateVersion: number,
    expectedStatus: "ACTIVE" = "ACTIVE"
  ): Promise<RegistrationChallengeRecord> {
    return this.guardedUpdate(challengeId, expectedStatus, expectedStateVersion, {
      status: "CANCELLED",
      verification_lease_id: null,
      verification_lease_expires_at: null,
    });
  }

  /**
   * Marks an active or verifying challenge as expired. Expiry is a logical
   * terminal state; retention deletion is intentionally left to a separately
   * audited/manual process so a cleanup race cannot delete a newly resent row.
   */
  async markExpired(
    challengeId: string,
    expectedStateVersion: number,
    expectedStatuses: ("ACTIVE" | "VERIFYING")[] = ["ACTIVE", "VERIFYING"]
  ): Promise<RegistrationChallengeRecord> {
    return this.guardedUpdate(challengeId, expectedStatuses, expectedStateVersion, {
      status: "EXPIRED",
      verification_lease_id: null,
      verification_lease_expires_at: null,
    });
  }

  private async countRecentChallenges(
    operation: string,
    filterField: "email_normalized" | "request_ip_hash",
    filterValue: string,
    sinceIsoString: string
  ): Promise<number> {
    if (
      !isNonEmptyString(filterValue) ||
      !isValidDateString(sinceIsoString)
    ) {
      throw this.invalidArgument("Invalid registration throttle query.");
    }

    const { baseUrl, headers } = this.getRequestContext(operation);
    const url = this.buildCollectionUrl(baseUrl, {
      [`filter[${filterField}][_eq]`]: filterValue,
      "filter[created_at][_gte]": sinceIsoString,
      "aggregate[count]": "challenge_id",
    });
    const response = await this.requestJson(operation, url, {
      method: "GET",
      headers,
    });
    if (!isJsonObject(response) || !Array.isArray(response.data)) {
      throw this.dependencyError(`${operation}.invalidResponse`);
    }
    if (response.data.length !== 1 || !isJsonObject(response.data[0])) {
      throw this.dependencyError(`${operation}.invalidResponse`);
    }

    const aggregate = response.data[0].count;
    let rawCount: unknown = aggregate;
    if (isJsonObject(aggregate)) {
      rawCount = aggregate.challenge_id;
    }
    const numericCount =
      typeof rawCount === "number"
        ? rawCount
        : typeof rawCount === "string" && /^\d+$/.test(rawCount)
        ? Number(rawCount)
        : NaN;
    if (!Number.isSafeInteger(numericCount) || numericCount < 0) {
      throw this.dependencyError(`${operation}.invalidResponse`);
    }
    return numericCount;
  }

  /**
   * Count challenges created for an email within the given timeframe.
   * Any Directus/transport/shape failure rejects instead of returning zero,
   * allowing the service to fail closed rather than bypass throttling.
   */
  async countRecentChallengesByEmail(
    emailNormalized: string,
    sinceIsoString: string
  ): Promise<number> {
    return this.countRecentChallenges(
      "countRecentChallengesByEmail",
      "email_normalized",
      emailNormalized,
      sinceIsoString
    );
  }

  /**
   * Count challenges created for an IP hash within the given timeframe.
   * Any Directus/transport/shape failure rejects instead of returning zero.
   */
  async countRecentChallengesByIpHash(
    ipHash: string,
    sinceIsoString: string
  ): Promise<number> {
    return this.countRecentChallenges(
      "countRecentChallengesByIpHash",
      "request_ip_hash",
      ipHash,
      sinceIsoString
    );
  }

  /**
   * Bounded, best-effort opportunistic cleanup. Rows are logically expired via
   * the same ID + status + state_version CAS as normal state changes. Do not
   * bulk-delete IDs from a prior read: a resend could make one of those IDs
   * live before DELETE executes.
   */
  async cleanupExpiredChallenges(limit = MAX_CLEANUP_BATCH): Promise<number> {
    const requestedLimit = Number.isFinite(limit) ? Math.floor(limit) : MAX_CLEANUP_BATCH;
    const boundedLimit = Math.min(
      MAX_CLEANUP_BATCH,
      Math.max(0, requestedLimit)
    );
    if (boundedLimit === 0) {
      return 0;
    }

    try {
      const { baseUrl, headers } = this.getRequestContext(
        "cleanupExpiredChallenges"
      );
      const cleanupNow = new Date().toISOString();
      const url = this.buildCollectionUrl(baseUrl, {
        "filter[expires_at][_lt]": cleanupNow,
        "filter[status][_in]": "ACTIVE,VERIFYING",
        limit: String(boundedLimit),
        sort: "expires_at",
        fields: "challenge_id,status,state_version,expires_at",
      });
      const response = await this.requestJson(
        "cleanupExpiredChallenges",
        url,
        {
          method: "GET",
          headers,
        }
      );
      if (!isJsonObject(response) || !Array.isArray(response.data)) {
        return 0;
      }

      const candidates = response.data.slice(0, boundedLimit);
      let expiredCount = 0;
      for (const candidate of candidates) {
        if (!isJsonObject(candidate)) {
          continue;
        }
        const challengeId = candidate.challenge_id;
        const status = candidate.status;
        const stateVersion = candidate.state_version;
        const expiresAt = candidate.expires_at;
        if (
          !isNonEmptyString(challengeId) ||
          (status !== "ACTIVE" && status !== "VERIFYING") ||
          !isSafeInteger(stateVersion) ||
          stateVersion < 0 ||
          !isValidDateString(expiresAt) ||
          parseDirectusUtcDateTime(expiresAt) >=
            parseDirectusUtcDateTime(cleanupNow)
        ) {
          continue;
        }
        try {
          await this.markExpired(challengeId, stateVersion, [status]);
          expiredCount += 1;
        } catch {
          // Cleanup is opportunistic. A concurrent update or transient
          // dependency failure must not fail initiation.
        }
      }
      return expiredCount;
    } catch {
      return 0;
    }
  }
}
