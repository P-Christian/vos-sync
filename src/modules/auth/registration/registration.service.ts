import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  registrationInputUnionSchema,
  emailCorrectionInputSchema,
  MAX_SEALED_PAYLOAD_LENGTH,
} from "./registration.schemas";
import {
  InitiateRegistrationResult,
  RegistrationStatusResponse,
  ResendOtpResponse,
  EmailCorrectionResponse,
  SealedRegistrationPayloadV1,
  RegistrationChallengeRecord,
  ClientProvisioningInput,
  FreelancerProvisioningInput,
  SchoolProvisioningInput,
} from "./registration.types";
import { RegistrationError } from "./registration.errors";
import { getRegistrationConfig } from "./registration.config";
import {
  generateChallengeId,
  generateOtp,
  computeOtpHmac,
  verifyOtpHmac,
  computePayloadDigest,
  hashClientIp,
  encryptRegistrationPayload,
  decryptRegistrationPayload,
  maskEmail,
} from "./registration.crypto";
import { RegistrationChallengeRepository } from "./registration.challenge.repo";
import {
  assertOtpMailConfiguration,
  sendOTP,
} from "../services/email.service";
import { userExistsByEmail } from "../services/auth.repo";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { parseDirectusUtcDateTime } from "./registration.timestamps";

const CHALLENGE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertChallengeId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !CHALLENGE_ID_PATTERN.test(value)) {
    throw new RegistrationError(
      "Invalid registration challenge.",
      "INVALID_REQUEST",
      400
    );
  }
}

function assertCiphertext(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_SEALED_PAYLOAD_LENGTH
  ) {
    throw new RegistrationError(
      "Invalid sealed registration payload.",
      "PAYLOAD_INVALID",
      400
    );
  }
}

function assertOtp(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^\d{6}$/.test(value.trim())) {
    throw new RegistrationError(
      "Verification code must be exactly 6 digits.",
      "INVALID_REQUEST",
      400
    );
  }
}

function parseUtcTimestamp(value: unknown, fieldName: string): number {
  const timestamp = parseDirectusUtcDateTime(value);
  if (!Number.isFinite(timestamp)) {
    throw new RegistrationError(
      `Registration challenge has an invalid ${fieldName}.`,
      "CONFIGURATION_ERROR",
      503
    );
  }
  return timestamp;
}

function assertRegistrationMailConfiguration(): void {
  try {
    assertOtpMailConfiguration();
  } catch {
    throw new RegistrationError(
      "Registration email delivery is not configured on the server.",
      "CONFIGURATION_ERROR",
      500
    );
  }
}

/**
 * Adapt the shared Turnstile helper to registration's stable error contract.
 * The shared helper owns the HTTP call, server-only secret lookup, and remote
 * IP forwarding; registration owns only its public error codes/statuses.
 */
async function verifyServerTurnstile(
  token: string | undefined | null,
  remoteIp?: string
): Promise<void> {
  const result = await verifyTurnstileToken(token, remoteIp);
  if (result.success) {
    return;
  }

  switch (result.failureReason) {
    case "CONFIGURATION_ERROR":
      throw new RegistrationError(
        "CAPTCHA secret key is not configured on the server.",
        "CONFIGURATION_ERROR",
        500
      );
    case "TOKEN_REQUIRED":
      throw new RegistrationError(
        "Security CAPTCHA verification is required.",
        "CAPTCHA_REQUIRED",
        400
      );
    case "SERVICE_ERROR":
      throw new RegistrationError(
        "Failed to communicate with CAPTCHA verification service.",
        "CAPTCHA_FAILED",
        502
      );
    case "VERIFICATION_FAILED":
    default:
      // Keep a safe default for results created by older helper versions or
      // other callers that omit the optional machine-readable reason.
      throw new RegistrationError(
        "CAPTCHA verification failed. Please try again.",
        "CAPTCHA_FAILED",
        400
      );
  }
}

/**
 * Performs an advisory duplicate check while keeping Directus failures
 * sanitized and fail-closed for registration.
 */
async function checkExistingEmail(email: string): Promise<void> {
  try {
    if (await userExistsByEmail(email)) {
      throw new RegistrationError(
        "An account with this email address already exists. Please log in.",
        "EMAIL_ALREADY_REGISTERED",
        409
      );
    }
  } catch (err: unknown) {
    if (err instanceof RegistrationError) {
      throw err;
    }

    console.error("[registration] Failed to check email availability", {
      error: err instanceof Error ? err.name : "UNKNOWN_ERROR",
    });
    throw new RegistrationError(
      "Unable to verify email availability. Please try again later.",
      "CONFIGURATION_ERROR",
      503
    );
  }
}

export class RegistrationService {
  private repo: RegistrationChallengeRepository;

  constructor(repo?: RegistrationChallengeRepository) {
    this.repo = repo || new RegistrationChallengeRepository();
  }

  private nextOtpExpiryMs(
    nowMs: number,
    challengeCreatedAtMs: number,
    config: ReturnType<typeof getRegistrationConfig>
  ): number {
    if (!Number.isFinite(challengeCreatedAtMs)) {
      throw new RegistrationError(
        "Registration challenge has an invalid creation time.",
        "CONFIGURATION_ERROR",
        503
      );
    }
    return Math.min(
      nowMs + config.otpLifetimeMs,
      challengeCreatedAtMs + config.challengeLifetimeMs
    );
  }

  private async markExpiredBestEffort(
    challenge: RegistrationChallengeRecord
  ): Promise<boolean> {
    try {
      await this.repo.markExpired(challenge.challenge_id, challenge.state_version, [
        challenge.status as "ACTIVE" | "VERIFYING",
      ]);
      return true;
    } catch (err: unknown) {
      // Expiry is enforced logically by the caller even if this cleanup races
      // with another state transition or Directus is temporarily unavailable.
      if (
        !(err instanceof RegistrationError) ||
        err.code !== "INVALID_REQUEST"
      ) {
        console.error("[registration] Failed to persist challenge expiry", {
          code: err instanceof RegistrationError ? err.code : "UNKNOWN",
        });
      }
      return false;
    }
  }

  private async cancelAfterMailFailure(
    challengeId: string,
    expectedStateVersion: number
  ): Promise<void> {
    try {
      await this.repo.cancelChallenge(
        challengeId,
        expectedStateVersion,
        "ACTIVE"
      );
      return;
    } catch (err: unknown) {
      // Do not retry with an unguarded write. Reload first and retry only when
      // the row is still the exact version whose mail delivery failed. If a
      // concurrent resend/correction changed the version, that operation owns
      // the new delivery outcome and must not be cancelled here.
      try {
        const current = await this.repo.getChallengeById(challengeId);
        if (
          current?.status === "ACTIVE" &&
          current.state_version === expectedStateVersion
        ) {
          await this.repo.cancelChallenge(
            challengeId,
            expectedStateVersion,
            "ACTIVE"
          );
          return;
        }

        if (
          current?.status === "CANCELLED" ||
          current?.status === "LOCKED" ||
          current?.status === "CONSUMED" ||
          current?.status === "EXPIRED"
        ) {
          return;
        }
      } catch (retryError: unknown) {
        console.error("[registration] Failed to invalidate challenge after mail failure", {
          code:
            retryError instanceof RegistrationError
              ? retryError.code
              : err instanceof RegistrationError
              ? err.code
              : "UNKNOWN",
        });
        return;
      }

      console.error("[registration] Challenge changed before mail-failure invalidation", {
        code: err instanceof RegistrationError ? err.code : "UNKNOWN",
      });
    }
  }

  private validatePayloadContext(
    payload: SealedRegistrationPayloadV1,
    challenge: RegistrationChallengeRecord
  ): void {
    if (
      payload.version !== challenge.payload_version ||
      payload.challengeId !== challenge.challenge_id ||
      payload.role !== challenge.role ||
      payload.email !== challenge.email_normalized ||
      payload.userData.user_email !== challenge.email_normalized
    ) {
      throw new RegistrationError(
        "Sealed payload does not match the registration challenge context.",
        "PAYLOAD_INVALID",
        400
      );
    }
  }

  /**
   * Initiates challenge-backed registration
   */
  async initiateRegistration(
    rawInput: unknown,
    clientIp?: string
  ): Promise<InitiateRegistrationResult> {
    const config = getRegistrationConfig();
    assertRegistrationMailConfiguration();

    // 1. Validate payload schema with strict discriminated union
    const parsed = registrationInputUnionSchema.safeParse(rawInput);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new RegistrationError(
        issue ? issue.message : "Invalid registration input.",
        "INVALID_REQUEST",
        400,
        { details: parsed.error.issues }
      );
    }
    const input = parsed.data;

    // 2. Validate CAPTCHA
    const turnstileToken = input.turnstileToken || input["cf-turnstile-response"];
    await verifyServerTurnstile(turnstileToken, clientIp);

    // 3. Throttling checks
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const emailAttempts = await this.repo.countRecentChallengesByEmail(
      input.email,
      oneHourAgo
    );
    if (emailAttempts >= config.rateLimitEmailHourly) {
      throw new RegistrationError(
        "Too many registration requests for this email. Please try again later.",
        "RATE_LIMITED",
        429
      );
    }

    if (clientIp) {
      const ipHash = hashClientIp(clientIp, config.otpHmacSecret);
      const ipAttempts = await this.repo.countRecentChallengesByIpHash(
        ipHash,
        oneHourAgo
      );
      if (ipAttempts >= config.rateLimitIpHourly) {
        throw new RegistrationError(
          "Too many registration requests from this network. Please try again later.",
          "RATE_LIMITED",
          429
        );
      }
    }

    // 4. Advisory duplicate check
    await checkExistingEmail(input.email);

    // 5. Hash password (bcrypt runs ONCE at initiation)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(input.password, saltRounds);

    // 6. Construct SealedRegistrationPayloadV1
    const challengeId = generateChallengeId();
    const now = Date.now();
    const expiresAtMs = this.nextOtpExpiryMs(now, now, config);

    let clientData: ClientProvisioningInput | undefined;
    let freelancerData: FreelancerProvisioningInput | undefined;
    let schoolData: SchoolProvisioningInput | undefined;

    if (input.role === "CLIENT") {
      clientData = {
        company_name: input.company_name,
        industry: input.industry,
        company_size: input.company_size || null,
        company_email: input.company_email || null,
        company_tin: input.company_tin || null,
        company_website: input.company_website || null,
        company_phone: input.company_phone || null,
        company_province: input.company_province,
        company_city: input.company_city,
        company_brgy: input.company_brgy || null,
        marketing_consent: input.marketing_consent,
      };
    } else if (input.role === "FREELANCER") {
      freelancerData = {
        user_province: input.province || null,
        user_city: input.city || null,
        user_brgy: input.street
          ? `${input.street}, ${input.barangay || ""}`.trim()
          : input.barangay || null,
        employment_types: input.employmentTypes,
        preferred_location: [input.city, input.province, input.country]
          .filter(Boolean)
          .join(", ") || null,
        country: input.country,
        skills: Array.isArray(input.skills)
          ? input.skills
          : input.skills
          ? [input.skills]
          : [],
        marketing_consent: input.marketing_consent,
      };
    } else if (input.role === "SCH_ADMIN") {
      schoolData = {
        school_name: input.school_name,
        school_type: input.school_type,
        school_province: input.province,
        school_city: input.city_municipality,
        school_brgy: input.barangay || null,
        invitation_token: input.token || null,
      };
    }

    const sealedPayload = {
      version: 1,
      challengeId,
      role: input.role,
      email: input.email,
      issuedAt: now,
      expiresAt: expiresAtMs,
      userData: {
        user_email: input.email,
        hash_password: hashedPassword,
        user_fname: input.user_fname,
        user_lname: input.user_lname,
        user_contact: input.user_contact,
        user_position:
          input.role === "CLIENT"
            ? input.user_position || null
            : input.role === "FREELANCER"
            ? input.jobTitle || null
            : null,
      },
      ...(clientData ? { clientData } : {}),
      ...(freelancerData ? { freelancerData } : {}),
      ...(schoolData ? { schoolData } : {}),
    } as SealedRegistrationPayloadV1;

    // 7. Encrypt payload and compute digests
    const ciphertext = await encryptRegistrationPayload(
      sealedPayload,
      config.payloadKey
    );
    const payloadDigest = computePayloadDigest(ciphertext);

    // 8. Generate OTP & HMAC
    const otp = generateOtp();
    const otpHmac = computeOtpHmac(challengeId, otp, config.otpHmacSecret);

    const nowIso = new Date(now).toISOString();
    const expiresAtIso = new Date(expiresAtMs).toISOString();
    const resendAvailableAtIso = new Date(
      now + config.resendCooldownMs
    ).toISOString();

    const ipHash = clientIp
      ? hashClientIp(clientIp, config.otpHmacSecret)
      : null;

    // 9. Bounded opportunistic cleanup of expired records (fail-safe)
    this.repo.cleanupExpiredChallenges(config.maxCleanupBatch).catch(() => {});

    // 10. Persist challenge in Directus
    const createdChallenge = await this.repo.createChallenge({
      challenge_id: challengeId,
      email_normalized: input.email,
      role: input.role,
      otp_hmac: otpHmac,
      attempts: 0,
      max_attempts: config.maxOtpAttempts,
      resend_count: 0,
      last_sent_at: nowIso,
      expires_at: expiresAtIso,
      payload_digest: payloadDigest,
      payload_version: 1,
      status: "ACTIVE",
      state_version: 0,
      request_ip_hash: ipHash,
    });

    // 11. Send OTP email (blocking)
    try {
      await sendOTP(input.email, otp);
    } catch {
      // If email delivery fails, cancel challenge to release state
      await this.cancelAfterMailFailure(
        challengeId,
        createdChallenge.state_version ?? 0
      );
      throw new RegistrationError(
        "Failed to deliver verification code. Please try again later.",
        "MAIL_DELIVERY_FAILED",
        502
      );
    }

    return {
      ok: true,
      challengeId,
      sealedPayload: ciphertext,
      role: input.role,
      emailMasked: maskEmail(input.email),
      expiresAt: expiresAtIso,
      resendAvailableAt: resendAvailableAtIso,
    };
  }

  /**
   * Retrieves authoritative challenge status
   */
  async getChallengeStatus(
    challengeId: string
  ): Promise<RegistrationStatusResponse> {
    assertChallengeId(challengeId);
    const config = getRegistrationConfig();
    const challenge = await this.repo.getChallengeById(challengeId);

    if (!challenge) {
      throw new RegistrationError(
        "Registration challenge not found.",
        "CHALLENGE_NOT_FOUND",
        404
      );
    }

    const nowMs = Date.now();
    const expiresAtMs = parseUtcTimestamp(challenge.expires_at, "expiry");
    const expiresAtIso = new Date(expiresAtMs).toISOString();
    // The challenge schema requires this timestamp. Validate it before
    // calculating cooldown metadata or returning a terminal response.
    const lastSentAtMs = parseUtcTimestamp(
      challenge.last_sent_at,
      "last-sent timestamp"
    );

    // Expiry is logical first and applies while verification/provisioning is
    // in progress as well. Physical state cleanup is best effort.
    if (
      nowMs >= expiresAtMs &&
      (challenge.status === "ACTIVE" || challenge.status === "VERIFYING")
    ) {
      const markedExpired = await this.markExpiredBestEffort(challenge);
      if (!markedExpired) {
        // A resend/correction/cancel may have won the compare-and-set race.
        // Re-read before reporting a terminal state so a newly rotated active
        // challenge is not incorrectly presented as expired.
        const current = await this.repo.getChallengeById(challengeId);
        if (current && current.state_version !== challenge.state_version) {
          return this.getChallengeStatus(challengeId);
        }
      }
      return {
        ok: true,
        role: challenge.role,
        stage: "TERMINAL",
        status: "EXPIRED",
        emailMasked: maskEmail(challenge.email_normalized),
        expiresAt: expiresAtIso,
        resendAvailableAt: new Date(lastSentAtMs).toISOString(),
        attemptsRemaining: 0,
        terminalReason: "Verification code has expired.",
      };
    }

    if (challenge.status === "LOCKED") {
      return {
        ok: true,
        role: challenge.role,
        stage: "TERMINAL",
        status: "LOCKED",
        emailMasked: maskEmail(challenge.email_normalized),
        expiresAt: expiresAtIso,
        resendAvailableAt: new Date(lastSentAtMs).toISOString(),
        attemptsRemaining: 0,
        terminalReason: "Too many failed attempts. Challenge is locked.",
      };
    }

    if (
      challenge.status === "CANCELLED" ||
      challenge.status === "CONSUMED" ||
      challenge.status === "EXPIRED"
    ) {
      return {
        ok: true,
        role: challenge.role,
        stage: "TERMINAL",
        status: challenge.status,
        emailMasked: maskEmail(challenge.email_normalized),
        expiresAt: expiresAtIso,
        resendAvailableAt: new Date(lastSentAtMs).toISOString(),
        attemptsRemaining: 0,
        terminalReason:
          challenge.status === "CONSUMED"
            ? "Registration already completed."
            : challenge.status === "EXPIRED"
            ? "Verification code has expired."
            : "Registration was cancelled.",
      };
    }

    if (challenge.status === "VERIFYING") {
      return {
        ok: true,
        role: challenge.role,
        stage: "VERIFYING",
        status: "VERIFYING",
        emailMasked: maskEmail(challenge.email_normalized),
        expiresAt: expiresAtIso,
        resendAvailableAt: new Date(lastSentAtMs).toISOString(),
        attemptsRemaining: Math.max(
          0,
          challenge.max_attempts - challenge.attempts
        ),
      };
    }

    if (challenge.status !== "ACTIVE") {
      throw new RegistrationError(
        "Registration challenge has an invalid state.",
        "CONFIGURATION_ERROR",
        503
      );
    }

    // ACTIVE challenge
    const resendAvailableAt = new Date(
      lastSentAtMs + config.resendCooldownMs
    ).toISOString();
    const attemptsRemaining = Math.max(
      0,
      challenge.max_attempts - challenge.attempts
    );

    return {
      ok: true,
      role: challenge.role,
      stage: "ACTIVE",
      status: "ACTIVE",
      emailMasked: maskEmail(challenge.email_normalized),
      expiresAt: expiresAtIso,
      resendAvailableAt,
      attemptsRemaining,
    };
  }

  /**
   * Resends OTP code: rotates OTP, extends expiry, re-encrypts payload
   */
  async resendOtp(
    challengeId: string,
    currentCiphertext: string
  ): Promise<ResendOtpResponse> {
    assertChallengeId(challengeId);
    assertCiphertext(currentCiphertext);
    const config = getRegistrationConfig();
    assertRegistrationMailConfiguration();
    const challenge = await this.repo.getChallengeById(challengeId);

    if (!challenge) {
      throw new RegistrationError(
        "Registration challenge not found.",
        "CHALLENGE_NOT_FOUND",
        404
      );
    }

    if (challenge.status === "VERIFYING") {
      throw new RegistrationError(
        "Registration provisioning is in progress. Please wait for it to finish.",
        "PROVISIONING_IN_PROGRESS",
        409
      );
    }

    if (challenge.status === "LOCKED") {
      throw new RegistrationError(
        "Challenge is locked due to too many failed attempts.",
        "CHALLENGE_LOCKED",
        409
      );
    }

    if (challenge.status === "CONSUMED") {
      throw new RegistrationError(
        "Registration has already been completed.",
        "CHALLENGE_CONSUMED",
        409
      );
    }

    if (challenge.status === "CANCELLED") {
      throw new RegistrationError(
        "Registration was cancelled.",
        "CHALLENGE_CANCELLED",
        410
      );
    }

    if (challenge.status === "EXPIRED") {
      throw new RegistrationError(
        "Verification code has expired. Please start over.",
        "CHALLENGE_EXPIRED",
        410
      );
    }

    if (challenge.status !== "ACTIVE") {
      throw new RegistrationError(
        "Registration challenge has an invalid state.",
        "CONFIGURATION_ERROR",
        503
      );
    }

    const now = Date.now();
    const challengeExpiresAtMs = parseUtcTimestamp(
      challenge.expires_at,
      "expiry"
    );
    if (now >= challengeExpiresAtMs) {
      await this.markExpiredBestEffort(challenge);
      throw new RegistrationError(
        "Verification code has expired. Please start over.",
        "CHALLENGE_EXPIRED",
        410
      );
    }

    // Check resend limits
    if (challenge.resend_count >= config.maxResends) {
      throw new RegistrationError(
        "Maximum resend limit reached for this session.",
        "RESEND_LIMIT_REACHED",
        429
      );
    }

    // Check cooldown
    const lastSentTime = parseUtcTimestamp(
      challenge.last_sent_at,
      "last-sent timestamp"
    );
    const cooldownRemaining = lastSentTime + config.resendCooldownMs - now;
    if (cooldownRemaining > 0) {
      const resendAvailableAt = new Date(
        lastSentTime + config.resendCooldownMs
      ).toISOString();
      throw new RegistrationError(
        "Please wait before requesting a new code.",
        "RESEND_COOLDOWN",
        429,
        { resendAvailableAt }
      );
    }

    // Verify ciphertext against payload digest
    const currentDigest = computePayloadDigest(currentCiphertext);
    if (currentDigest !== challenge.payload_digest) {
      throw new RegistrationError(
        "Payload digest mismatch.",
        "PAYLOAD_INVALID",
        400
      );
    }

    // Decrypt payload to get existing data
    const payload = await decryptRegistrationPayload(
      currentCiphertext,
      config.payloadKey,
      {
        challengeId: challenge.challenge_id,
        role: challenge.role,
        email: challenge.email_normalized,
        nowMs: now,
      }
    );
    this.validatePayloadContext(payload, challenge);

    // Generate new OTP & extend expiry
    const newOtp = generateOtp();
    const newOtpHmac = computeOtpHmac(challengeId, newOtp, config.otpHmacSecret);
    const newExpiresAtMs = this.nextOtpExpiryMs(
      now,
      parseUtcTimestamp(challenge.created_at, "creation timestamp"),
      config
    );
    if (newExpiresAtMs <= now) {
      await this.markExpiredBestEffort(challenge);
      throw new RegistrationError(
        "Registration challenge has expired. Please start over.",
        "CHALLENGE_EXPIRED",
        410
      );
    }
    const newExpiresAtIso = new Date(newExpiresAtMs).toISOString();
    const newLastSentAtIso = new Date(now).toISOString();
    const newResendAvailableAtIso = new Date(
      now + config.resendCooldownMs
    ).toISOString();

    // Re-encrypt payload with updated expiry
    payload.expiresAt = newExpiresAtMs;
    const newCiphertext = await encryptRegistrationPayload(
      payload,
      config.payloadKey
    );
    const newPayloadDigest = computePayloadDigest(newCiphertext);

    // Update Directus challenge row
    const updatedChallenge = await this.repo.updateOnResend(
      challengeId,
      challenge.state_version,
      {
      otpHmac: newOtpHmac,
      payloadDigest: newPayloadDigest,
      expiresAt: newExpiresAtIso,
      lastSentAt: newLastSentAtIso,
      resendCount: challenge.resend_count + 1,
      }
    );

    // Send new OTP
    try {
      await sendOTP(challenge.email_normalized, newOtp);
    } catch {
      await this.cancelAfterMailFailure(
        challengeId,
        updatedChallenge.state_version
      );
      throw new RegistrationError(
        "Failed to deliver verification code. Please start over.",
        "MAIL_DELIVERY_FAILED",
        502
      );
    }

    return {
      ok: true,
      sealedPayload: newCiphertext,
      emailMasked: maskEmail(challenge.email_normalized),
      expiresAt: newExpiresAtIso,
      resendAvailableAt: newResendAvailableAtIso,
    };
  }

  /**
   * Correct email: requires fresh CAPTCHA, rechecks duplicates, rotates OTP and ciphertext
   */
  async correctEmail(
    challengeId: string,
    currentCiphertext: string,
    newEmailRaw: string,
    turnstileToken?: string,
    clientIp?: string
  ): Promise<EmailCorrectionResponse> {
    assertChallengeId(challengeId);
    assertCiphertext(currentCiphertext);
    const config = getRegistrationConfig();
    assertRegistrationMailConfiguration();
    const parsedEmail = emailCorrectionInputSchema.safeParse({
      newEmail: newEmailRaw,
      sealedPayload: currentCiphertext,
      turnstileToken,
    });
    if (!parsedEmail.success) {
      throw new RegistrationError(
        parsedEmail.error.issues[0]?.message || "Invalid email address.",
        "INVALID_REQUEST",
        400
      );
    }
    const newEmail = parsedEmail.data.newEmail;

    // 1. CAPTCHA verification
    await verifyServerTurnstile(turnstileToken, clientIp);

    // 2. Load and validate challenge
    const challenge = await this.repo.getChallengeById(challengeId);
    if (!challenge) {
      throw new RegistrationError(
        "Registration challenge not found.",
        "CHALLENGE_NOT_FOUND",
        404
      );
    }

    if (challenge.status === "VERIFYING") {
      throw new RegistrationError(
        "Registration provisioning is in progress. Please wait for it to finish.",
        "PROVISIONING_IN_PROGRESS",
        409
      );
    }

    if (challenge.status === "LOCKED") {
      throw new RegistrationError(
        "Challenge is locked due to too many failed attempts.",
        "CHALLENGE_LOCKED",
        409
      );
    }

    if (challenge.status === "CONSUMED") {
      throw new RegistrationError(
        "Registration has already been completed.",
        "CHALLENGE_CONSUMED",
        409
      );
    }

    if (challenge.status === "CANCELLED") {
      throw new RegistrationError(
        "Registration was cancelled.",
        "CHALLENGE_CANCELLED",
        410
      );
    }

    if (challenge.status === "EXPIRED") {
      throw new RegistrationError(
        "Verification code has expired. Please start over.",
        "CHALLENGE_EXPIRED",
        410
      );
    }

    if (challenge.status !== "ACTIVE") {
      throw new RegistrationError(
        "Registration challenge has an invalid state.",
        "CONFIGURATION_ERROR",
        503
      );
    }

    const now = Date.now();
    const challengeExpiresAtMs = parseUtcTimestamp(
      challenge.expires_at,
      "expiry"
    );
    if (now >= challengeExpiresAtMs) {
      await this.markExpiredBestEffort(challenge);
      throw new RegistrationError(
        "Verification code has expired. Please start over.",
        "CHALLENGE_EXPIRED",
        410
      );
    }

    if (newEmail === challenge.email_normalized) {
      throw new RegistrationError(
        "The new email is identical to the current email.",
        "INVALID_REQUEST",
        400
      );
    }

    // 3. Duplicate check for new email
    await checkExistingEmail(newEmail);

    // 4. Verify ciphertext against current digest
    const currentDigest = computePayloadDigest(currentCiphertext);
    if (currentDigest !== challenge.payload_digest) {
      throw new RegistrationError(
        "Payload digest mismatch.",
        "PAYLOAD_INVALID",
        400
      );
    }

    // 5. Decrypt and update payload
    const payload = await decryptRegistrationPayload(
      currentCiphertext,
      config.payloadKey,
      {
        challengeId: challenge.challenge_id,
        role: challenge.role,
        email: challenge.email_normalized,
        nowMs: now,
      }
    );
    this.validatePayloadContext(payload, challenge);
    payload.email = newEmail;
    payload.userData.user_email = newEmail;

    // 6. Rotate OTP & extend expiry
    const newOtp = generateOtp();
    const newOtpHmac = computeOtpHmac(challengeId, newOtp, config.otpHmacSecret);
    const newExpiresAtMs = this.nextOtpExpiryMs(
      now,
      parseUtcTimestamp(challenge.created_at, "creation timestamp"),
      config
    );
    if (newExpiresAtMs <= now) {
      await this.markExpiredBestEffort(challenge);
      throw new RegistrationError(
        "Registration challenge has expired. Please start over.",
        "CHALLENGE_EXPIRED",
        410
      );
    }
    const newExpiresAtIso = new Date(newExpiresAtMs).toISOString();
    const newLastSentAtIso = new Date(now).toISOString();
    const newResendAvailableAtIso = new Date(
      now + config.resendCooldownMs
    ).toISOString();

    payload.expiresAt = newExpiresAtMs;
    const newCiphertext = await encryptRegistrationPayload(
      payload,
      config.payloadKey
    );
    const newPayloadDigest = computePayloadDigest(newCiphertext);

    // 7. Update challenge in repo
    const updatedChallenge = await this.repo.updateOnEmailCorrection(
      challengeId,
      challenge.state_version,
      {
        newEmailNormalized: newEmail,
        otpHmac: newOtpHmac,
        payloadDigest: newPayloadDigest,
        expiresAt: newExpiresAtIso,
        lastSentAt: newLastSentAtIso,
      }
    );

    // 8. Send OTP to new address
    try {
      await sendOTP(newEmail, newOtp);
    } catch {
      await this.cancelAfterMailFailure(
        challengeId,
        updatedChallenge.state_version
      );
      throw new RegistrationError(
        "Failed to deliver verification code. Please start over.",
        "MAIL_DELIVERY_FAILED",
        502
      );
    }

    return {
      ok: true,
      sealedPayload: newCiphertext,
      emailMasked: maskEmail(newEmail),
      expiresAt: newExpiresAtIso,
      resendAvailableAt: newResendAvailableAtIso,
    };
  }

  /**
   * Cancels an active challenge
   */
  async cancelRegistration(challengeId: string): Promise<{ ok: true }> {
    assertChallengeId(challengeId);
    const challenge = await this.repo.getChallengeById(challengeId);
    if (!challenge) {
      return { ok: true };
    }

    if (challenge.status === "VERIFYING") {
      throw new RegistrationError(
        "Registration provisioning is in progress and cannot be cancelled.",
        "PROVISIONING_IN_PROGRESS",
        409
      );
    }

    if (
      challenge.status === "CONSUMED" ||
      challenge.status === "CANCELLED" ||
      challenge.status === "LOCKED" ||
      challenge.status === "EXPIRED"
    ) {
      // Terminal states are immutable. Cancellation remains idempotent from
      // the caller's perspective without attempting an invalid transition.
      return { ok: true };
    }

    if (challenge.status !== "ACTIVE") {
      throw new RegistrationError(
        "Registration challenge has an invalid state.",
        "CONFIGURATION_ERROR",
        503
      );
    }

    const nowMs = Date.now();
    const expiresAtMs = parseUtcTimestamp(challenge.expires_at, "expiry");
    if (nowMs >= expiresAtMs) {
      await this.markExpiredBestEffort(challenge);
      return { ok: true };
    }

    try {
      await this.repo.cancelChallenge(
        challengeId,
        challenge.state_version,
        "ACTIVE"
      );
    } catch (err: unknown) {
      if (
        err instanceof RegistrationError &&
        err.code === "INVALID_REQUEST"
      ) {
        const current = await this.repo.getChallengeById(challengeId);
        if (
          !current ||
          current.status === "CONSUMED" ||
          current.status === "CANCELLED" ||
          current.status === "LOCKED" ||
          current.status === "EXPIRED"
        ) {
          return { ok: true };
        }
      }
      throw err;
    }
    return { ok: true };
  }

  /**
   * Validates OTP and acquires verification lease for provisioning (used by Phase 4)
   */
  async verifyOtpAndAcquireLease(
    challengeId: string,
    submittedOtp: string,
    currentCiphertext: string
  ): Promise<{
    challenge: RegistrationChallengeRecord;
    payload: SealedRegistrationPayloadV1;
    leaseId: string;
  }> {
    assertChallengeId(challengeId);
    assertOtp(submittedOtp);
    assertCiphertext(currentCiphertext);
    const config = getRegistrationConfig();
    const challenge = await this.repo.getChallengeById(challengeId);

    if (!challenge) {
      throw new RegistrationError(
        "Registration challenge not found.",
        "CHALLENGE_NOT_FOUND",
        404
      );
    }

    if (challenge.status === "CONSUMED") {
      throw new RegistrationError(
        "Registration has already been completed.",
        "CHALLENGE_CONSUMED",
        409
      );
    }

    if (challenge.status === "LOCKED") {
      throw new RegistrationError(
        "Challenge is locked due to too many failed attempts.",
        "CHALLENGE_LOCKED",
        409
      );
    }

    if (challenge.status === "CANCELLED") {
      throw new RegistrationError(
        "Registration was cancelled.",
        "CHALLENGE_CANCELLED",
        410
      );
    }

    if (challenge.status === "EXPIRED") {
      throw new RegistrationError(
        "Verification code has expired.",
        "CHALLENGE_EXPIRED",
        410
      );
    }

    if (
      challenge.status !== "ACTIVE" &&
      challenge.status !== "VERIFYING"
    ) {
      throw new RegistrationError(
        "Registration challenge has an invalid state.",
        "CONFIGURATION_ERROR",
        503
      );
    }

    const now = Date.now();
    const challengeExpiresAtMs = parseUtcTimestamp(
      challenge.expires_at,
      "expiry"
    );
    if (now >= challengeExpiresAtMs) {
      await this.markExpiredBestEffort(challenge);
      throw new RegistrationError(
        "Verification code has expired.",
        "CHALLENGE_EXPIRED",
        410
      );
    }

    // Check lease if currently VERIFYING. An expired lease can be resumed,
    // but a live lease must remain exclusive to its current provisioner.
    const resumingExpiredLease = challenge.status === "VERIFYING";
    if (challenge.status === "VERIFYING") {
      const leaseExpiry = challenge.verification_lease_expires_at
        ? parseUtcTimestamp(
            challenge.verification_lease_expires_at,
            "verification lease expiry"
          )
        : 0;
      if (now < leaseExpiry) {
        throw new RegistrationError(
          "Provisioning is already in progress. Please wait a moment.",
          "PROVISIONING_IN_PROGRESS",
          409
        );
      }
    }

    // Check payload digest
    const currentDigest = computePayloadDigest(currentCiphertext);
    if (currentDigest !== challenge.payload_digest) {
      throw new RegistrationError(
        "Payload digest mismatch. Please refresh and try again.",
        "PAYLOAD_INVALID",
        400
      );
    }

    // Verify OTP using constant-time HMAC check
    const isValidOtp = verifyOtpHmac(
      challengeId,
      submittedOtp,
      challenge.otp_hmac,
      config.otpHmacSecret
    );

    if (!isValidOtp) {
      let attemptState = challenge;

      // The repository's failed-attempt CAS intentionally accepts only
      // ACTIVE rows. Reopen an expired verification lease first so a bad
      // resume code is counted under the same five-attempt policy instead of
      // surfacing as an internal state error.
      if (resumingExpiredLease) {
        attemptState = await this.repo.releaseVerificationLease(
          challengeId,
          challenge.state_version,
          true,
          challenge.verification_lease_id || undefined
        );
      }

      const { attempts, isLocked } = await this.repo.recordFailedAttempt(
        challengeId,
        attemptState.attempts,
        attemptState.max_attempts,
        attemptState.state_version
      );

      if (isLocked) {
        throw new RegistrationError(
          "Too many failed attempts. Registration session is locked.",
          "CHALLENGE_LOCKED",
          409,
          { remainingAttempts: 0 }
        );
      }

      const remainingAttempts = attemptState.max_attempts - attempts;
      throw new RegistrationError(
        "Invalid verification code.",
        "OTP_INVALID",
        400,
        { remainingAttempts }
      );
    }

    // Decrypt and validate payload
    const payload = await decryptRegistrationPayload(
      currentCiphertext,
      config.payloadKey,
      {
        challengeId: challenge.challenge_id,
        role: challenge.role,
        email: challenge.email_normalized,
        nowMs: now,
      }
    );
    this.validatePayloadContext(payload, challenge);

    // Acquire verification lease
    const leaseId = crypto.randomUUID();
    const leaseExpiresAt = new Date(
      now + config.verificationLeaseDurationMs
    ).toISOString();

    const updatedChallenge = await this.repo.acquireVerificationLease(
      challengeId,
      challenge.state_version,
      leaseId,
      leaseExpiresAt
    );

    return {
      challenge: updatedChallenge,
      payload,
      leaseId,
    };
  }
}
