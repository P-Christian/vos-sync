import { RegistrationError } from "../registration.errors";
import type { SchoolProvisioningInput } from "../registration.types";
import type { RegistrationProvisioningRepository } from "../registration.provisioning.repo";
import { parseDirectusUtcDateTime } from "../registration.timestamps";

type ProvisioningId = string | number;
type ProvisioningRecord = Record<string, unknown>;

export interface ProvisioningUser extends ProvisioningRecord {
  user_id: ProvisioningId;
  user_email: string;
  role?: string | null;
  role_id?: ProvisioningId | null;
  registration_key?: string | null;
}

export interface ProvisioningResource {
  collection: string;
  id: ProvisioningId;
}

interface ProvisioningLedger {
  created: ProvisioningResource[];
  ambiguous: boolean;
}

export interface SchoolProvisioningResult {
  school: ProvisioningRecord;
  schoolAdmin: ProvisioningRecord;
  invitation: ProvisioningRecord | null;
  created: ProvisioningResource[];
}

const SCHOOL_COLLECTION = "vs_school";
const SCHOOL_ADMIN_COLLECTION = "vs_school_admin";
const INVITATION_COLLECTION = "vs_invite_token";

// Keep every provisioning lookup explicit. These are the fields used by this
// provisioner and mirror the names present in the legacy school routes.
const SCHOOL_FIELDS = [
  "school_id",
  "school_name",
  "school_type",
  "school_email",
  "city_municipality",
  "province",
  "barangay",
  "school_status",
  "profile_completion_percent",
  "created_by",
] as const;

const SCHOOL_ADMIN_FIELDS = [
  "school_admin_id",
  "school_id",
  "user_id",
  "is_active",
] as const;

const INVITATION_FIELDS = [
  "token_id",
  "id",
  "token",
  "invited_email",
  "is_used",
  "expires_at",
  "school_id",
  // Phase 1 must provision at least one of these ownership fields. Keeping
  // both in the explicit selection lets the service support either approved
  // schema variant while failing closed if neither is available.
  "used_by_user_id",
  "registration_key",
] as const;

function isRecord(value: unknown): value is ProvisioningRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProvisioningId(value: unknown): value is ProvisioningId {
  return (
    (typeof value === "string" && value.trim().length > 0) ||
    (typeof value === "number" && Number.isSafeInteger(value))
  );
}

function recordId(record: ProvisioningRecord, ...keys: string[]): ProvisioningId | null {
  for (const key of keys) {
    const value = record[key];
    if (isProvisioningId(value)) return value;
    if (isRecord(value)) {
      const nested = recordId(value, "id", "school_id", "user_id", "token_id");
      if (nested !== null) return nested;
    }
  }
  return null;
}

function requireId(
  record: ProvisioningRecord,
  message: string,
  ...keys: string[]
): ProvisioningId {
  const id = recordId(record, ...keys);
  if (id === null) {
    throw new RegistrationError(message, "PROVISIONING_FAILED", 503);
  }
  return id;
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function sameId(left: unknown, right: unknown): boolean {
  return isProvisioningId(left) && isProvisioningId(right) && String(left) === String(right);
}

function relationId(value: unknown): ProvisioningId | null {
  if (isProvisioningId(value)) return value;
  if (!isRecord(value)) return null;
  return recordId(value, "school_id", "id");
}

function isUsed(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function provisioningFailure(): RegistrationError {
  return new RegistrationError(
    "School registration could not be completed. Please try again.",
    "PROVISIONING_FAILED",
    503
  );
}

/**
 * A failed invitation PATCH may have committed even when its response was
 * lost. Keep this marker internal so the coordinator does not compensate a
 * graph that is needed to prove ownership on the next retry.
 */
class InvitationConsumptionUncertainError extends Error {
  constructor() {
    super("Invitation consumption outcome is uncertain.");
    this.name = "InvitationConsumptionUncertainError";
  }
}

async function compensateCreatedResources(
  repo: RegistrationProvisioningRepository,
  ledger: ProvisioningLedger
): Promise<void> {
  if (ledger.ambiguous || ledger.created.length === 0) return;

  // Resources are recorded only after a successful create response with a
  // stable ID. Delete children before parents and stop if a child cannot be
  // removed, avoiding a parent delete that could violate a live FK.
  for (let index = ledger.created.length - 1; index >= 0; index -= 1) {
    const resource = ledger.created[index];
    try {
      await repo.delete(resource.collection, resource.id);
    } catch (error: unknown) {
      console.error("[registration.school.provisioner] Compensation failed", {
        collection: resource.collection,
        error: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      });
      break;
    }
  }
}

function invitationFailure(): RegistrationError {
  return new RegistrationError(
    "The school invitation is invalid or no longer available.",
    "INVITATION_INVALID",
    409
  );
}

function schoolConflict(): RegistrationError {
  return new RegistrationError(
    "This school is already registered in the selected city or municipality.",
    "SCHOOL_CONFLICT",
    409
  );
}

function isKnownNonAmbiguousFailure(error: unknown): boolean {
  if (error instanceof RegistrationError) {
    return (
      error.code === "CONFIGURATION_ERROR" ||
      error.code === "INVITATION_INVALID" ||
      error.code === "PROVISIONING_CONFLICT" ||
      error.code === "SCHOOL_CONFLICT" ||
      (error.code === "PROVISIONING_FAILED" && error.statusCode === 409)
    );
  }
  if (isRecord(error)) {
    const status = Number(error.status ?? error.statusCode);
    return status === 409;
  }
  return false;
}

function isHandledDownstreamFailure(error: unknown): boolean {
  return isKnownNonAmbiguousFailure(error);
}

function validateUser(user: ProvisioningUser): void {
  if (
    !isProvisioningId(user?.user_id) ||
    !normalizeEmail(user?.user_email)
  ) {
    throw new RegistrationError(
      "Registration user context is invalid.",
      "PROVISIONING_CONFLICT",
      409
    );
  }

  if (
    user.role !== undefined &&
    user.role !== null &&
    (typeof user.role !== "string" || user.role.toUpperCase() !== "SCH_ADMIN")
  ) {
    throw new RegistrationError(
      "Registration role does not match the school administrator graph.",
      "PROVISIONING_CONFLICT",
      409
    );
  }
}

function validateSchoolData(data: SchoolProvisioningInput): void {
  if (
    !data ||
    typeof data.school_name !== "string" ||
    typeof data.school_type !== "string" ||
    typeof data.school_province !== "string" ||
    typeof data.school_city !== "string" ||
    !data.school_name.trim() ||
    !data.school_type.trim() ||
    !data.school_province.trim() ||
    !data.school_city.trim() ||
    (data.school_brgy !== undefined &&
      data.school_brgy !== null &&
      typeof data.school_brgy !== "string") ||
    (data.invitation_token !== undefined &&
      data.invitation_token !== null &&
      typeof data.invitation_token !== "string")
  ) {
    throw new RegistrationError(
      "School registration data is incomplete.",
      "PROVISIONING_CONFLICT",
      409
    );
  }
}

function assertInvitationEmail(
  invitation: ProvisioningRecord,
  user: ProvisioningUser
): void {
  const invitedEmail = normalizeEmail(invitation.invited_email);
  if (!invitedEmail || invitedEmail !== normalizeEmail(user.user_email)) {
    throw invitationFailure();
  }
}

function invitationOwnerMatches(
  invitation: ProvisioningRecord,
  user: ProvisioningUser
): boolean {
  const ownerId =
    relationId(invitation.used_by_user_id) ??
    relationId(invitation.consumed_by_user_id) ??
    relationId(invitation.user_id);
  if (ownerId !== null && !sameId(ownerId, user.user_id)) return false;

  const ownerRegistrationKey =
    invitation.registration_key ??
    invitation.used_by_registration_key ??
    invitation.consumed_by_registration_key;
  if (
    ownerRegistrationKey !== undefined &&
    ownerRegistrationKey !== null &&
    String(ownerRegistrationKey) !== String(user.registration_key ?? "")
  ) {
    return false;
  }

  return true;
}

function schoolMatchesSelfSignup(
  school: ProvisioningRecord,
  user: ProvisioningUser,
  data: SchoolProvisioningInput
): boolean {
  const existingBarangay = String(school.barangay ?? "").trim();
  const requestedBarangay = String(data.school_brgy ?? "").trim();
  return (
    sameId(school.created_by, user.user_id) &&
    normalizeEmail(school.school_email) === normalizeEmail(user.user_email) &&
    String(school.school_name ?? "").trim() === data.school_name.trim() &&
    String(school.school_type ?? "").trim() === data.school_type.trim() &&
    String(school.city_municipality ?? "").trim() === data.school_city.trim() &&
    String(school.province ?? "").trim() === data.school_province.trim() &&
    existingBarangay === requestedBarangay
  );
}

async function findSchoolAdminLink(
  repo: RegistrationProvisioningRepository,
  schoolId: ProvisioningId,
  userId: ProvisioningId
): Promise<ProvisioningRecord | null> {
  return (await repo.findOne(SCHOOL_ADMIN_COLLECTION, {
    school_id: schoolId,
    user_id: userId,
  }, SCHOOL_ADMIN_FIELDS)) as ProvisioningRecord | null;
}

async function ensureSchoolAdminLink(
  repo: RegistrationProvisioningRepository,
  schoolId: ProvisioningId,
  user: ProvisioningUser,
  ledger: ProvisioningLedger
): Promise<ProvisioningRecord> {
  const existing = await findSchoolAdminLink(repo, schoolId, user.user_id);
  if (existing) {
    if (
      existing.is_active === false ||
      existing.is_active === 0 ||
      existing.is_active === "false" ||
      existing.is_active === "0"
    ) {
      const linkId = requireId(
        existing,
        "School administrator link has no stable identifier.",
        "school_admin_id",
        "id"
      );
      try {
        return (await repo.update(SCHOOL_ADMIN_COLLECTION, linkId, {
          is_active: true,
        })) as ProvisioningRecord;
      } catch (error: unknown) {
        if (!isKnownNonAmbiguousFailure(error)) ledger.ambiguous = true;
        throw error;
      }
    }
    return existing;
  }

  const linkPayload = {
    school_id: schoolId,
    user_id: user.user_id,
    is_active: true,
  };

  try {
    const createdLink = (await repo.create(
      SCHOOL_ADMIN_COLLECTION,
      linkPayload
    )) as ProvisioningRecord;
    const linkId = requireId(
      createdLink,
      "Created school administrator link has no stable identifier.",
      "school_admin_id",
      "id"
    );
    ledger.created.push({
      collection: SCHOOL_ADMIN_COLLECTION,
      id: linkId,
    });
    return createdLink;
  } catch (error: unknown) {
    // A unique-pair conflict or an ambiguous response may mean another retry
    // created the link. Reconcile by the natural key before reporting failure.
    let reconciled: ProvisioningRecord | null;
    try {
      reconciled = await findSchoolAdminLink(repo, schoolId, user.user_id);
    } catch {
      ledger.ambiguous = true;
      throw error;
    }
    if (reconciled) {
      ledger.ambiguous = true;
      return reconciled;
    }
    if (!isKnownNonAmbiguousFailure(error)) ledger.ambiguous = true;
    throw error;
  }
}

async function resolveSelfSignupSchool(
  repo: RegistrationProvisioningRepository,
  user: ProvisioningUser,
  data: SchoolProvisioningInput,
  ledger: ProvisioningLedger
): Promise<ProvisioningRecord> {
  const existing = (await repo.findOne(SCHOOL_COLLECTION, {
    school_name: data.school_name,
    city_municipality: data.school_city,
  }, SCHOOL_FIELDS)) as ProvisioningRecord | null;

  if (existing) {
    if (schoolMatchesSelfSignup(existing, user, data)) return existing;
    throw schoolConflict();
  }

  const schoolPayload: ProvisioningRecord = {
    school_name: data.school_name,
    school_type: data.school_type,
    school_email: normalizeEmail(user.user_email),
    city_municipality: data.school_city,
    province: data.school_province,
    school_status: "Draft",
    profile_completion_percent: 40,
    created_by: user.user_id,
  };
  if (data.school_brgy) schoolPayload.barangay = data.school_brgy;

  try {
    const school = (await repo.create(
      SCHOOL_COLLECTION,
      schoolPayload
    )) as ProvisioningRecord;
    const schoolId = requireId(
      school,
      "Created school has no stable identifier.",
      "school_id",
      "id"
    );
    ledger.created.push({ collection: SCHOOL_COLLECTION, id: schoolId });
    return school;
  } catch (error: unknown) {
    // Reconcile an ambiguous create or a concurrent uniqueness conflict. A
    // same-name school created by another user is still a hard conflict.
    let reconciled: ProvisioningRecord | null;
    try {
      reconciled = (await repo.findOne(SCHOOL_COLLECTION, {
        school_name: data.school_name,
        city_municipality: data.school_city,
      }, SCHOOL_FIELDS)) as ProvisioningRecord | null;
    } catch {
      ledger.ambiguous = true;
      throw error;
    }
    if (reconciled && schoolMatchesSelfSignup(reconciled, user, data)) {
      ledger.ambiguous = true;
      return reconciled;
    }
    if (reconciled) throw schoolConflict();
    if (!isKnownNonAmbiguousFailure(error)) ledger.ambiguous = true;
    throw error;
  }
}

function validateInvitationExpiry(invitation: ProvisioningRecord): void {
  const expiresAt = parseDirectusUtcDateTime(invitation.expires_at);
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    throw invitationFailure();
  }
}

async function resolveInvitedSchool(
  repo: RegistrationProvisioningRepository,
  invitation: ProvisioningRecord,
  data: SchoolProvisioningInput
): Promise<ProvisioningRecord> {
  const schoolId = relationId(invitation.school_id);
  if (schoolId === null) throw invitationFailure();

  if (
    data.invited_school_id !== null &&
    data.invited_school_id !== undefined &&
    !sameId(data.invited_school_id, schoolId)
  ) {
    throw invitationFailure();
  }

  const school = (await repo.findOne(SCHOOL_COLLECTION, {
    school_id: schoolId,
  }, SCHOOL_FIELDS)) as ProvisioningRecord | null;
  if (!school) throw invitationFailure();
  return school;
}

async function consumeInvitation(
  repo: RegistrationProvisioningRepository,
  invitation: ProvisioningRecord,
  user: ProvisioningUser,
  schoolId: ProvisioningId
): Promise<ProvisioningRecord> {
  const invitationId = requireId(
    invitation,
    "Invitation has no stable identifier.",
    "token_id",
    "id"
  );
  const invitationToken =
    typeof invitation.token === "string" ? invitation.token.trim() : "";
  if (!invitationToken) throw invitationFailure();

  const hasUserOwnershipField = Object.prototype.hasOwnProperty.call(
    invitation,
    "used_by_user_id"
  );
  const hasRegistrationOwnershipField = Object.prototype.hasOwnProperty.call(
    invitation,
    "registration_key"
  );
  if (!hasUserOwnershipField && !hasRegistrationOwnershipField) {
    throw new RegistrationError(
      "Invitation retry ownership is not configured.",
      "CONFIGURATION_ERROR",
      503
    );
  }
  if (!user.registration_key?.trim()) {
    throw new RegistrationError(
      "Registration retry ownership is not available.",
      "PROVISIONING_CONFLICT",
      409
    );
  }

  const ownershipPatch: ProvisioningRecord = { is_used: true };
  if (hasUserOwnershipField) ownershipPatch.used_by_user_id = user.user_id;
  if (hasRegistrationOwnershipField) {
    ownershipPatch.registration_key = user.registration_key;
  }

  let updated: ProvisioningRecord;
  try {
    updated = (await repo.update(
      INVITATION_COLLECTION,
      invitationId,
      ownershipPatch
    )) as ProvisioningRecord;
  } catch (error: unknown) {
    // A timeout may have committed the consume. Re-read and accept only when
    // the resulting used token is still compatible with this user's graph.
    let reconciled: ProvisioningRecord | null;
    try {
      reconciled = (await repo.findOne(INVITATION_COLLECTION, {
        token: invitationToken,
      }, INVITATION_FIELDS)) as ProvisioningRecord | null;
    } catch {
      // The PATCH result is unknown and the reconciliation read also failed.
      // Do not compensate the graph: the invite may already be consumed and
      // must remain available as ownership evidence for a later retry.
      throw new InvitationConsumptionUncertainError();
    }
    if (
      reconciled &&
      isUsed(reconciled.is_used) &&
      normalizeEmail(reconciled.invited_email) === normalizeEmail(user.user_email) &&
      invitationOwnerMatches(reconciled, user)
    ) {
      try {
        const link = await findSchoolAdminLink(repo, schoolId, user.user_id);
        if (link) return reconciled;
      } catch {
        // The invitation is known to be owned by this user, but the graph
        // read is inconclusive. Preserve both records for reconciliation.
        throw new InvitationConsumptionUncertainError();
      }
      // A consumed invitation without a provable graph cannot be safely
      // rolled back. Keep it and fail closed until a later retry reconciles it.
      throw new InvitationConsumptionUncertainError();
    }
    if (
      reconciled &&
      isUsed(reconciled.is_used) &&
      normalizeEmail(reconciled.invited_email) === normalizeEmail(user.user_email)
    ) {
      // The token is now owned by another registration key/user. Never
      // attempt to undo that consume; only the current invocation's graph is
      // eligible for compensation by the caller.
      throw invitationFailure();
    }
    throw error;
  }

  // A successful PATCH followed by a stale/missing read is still an
  // uncertain cross-record state. Only a confirmed owner read is safe to
  // return; a confirmed different owner is a deterministic conflict.
  let owned: ProvisioningRecord | null;
  try {
    owned = (await repo.findOne(INVITATION_COLLECTION, {
      token: invitationToken,
    }, INVITATION_FIELDS)) as ProvisioningRecord | null;
  } catch {
    throw new InvitationConsumptionUncertainError();
  }
  if (
    owned &&
    isUsed(owned.is_used) &&
    normalizeEmail(owned.invited_email) === normalizeEmail(user.user_email) &&
    invitationOwnerMatches(owned, user)
  ) {
    return updated;
  }
  if (
    owned &&
    isUsed(owned.is_used) &&
    normalizeEmail(owned.invited_email) === normalizeEmail(user.user_email)
  ) {
    throw invitationFailure();
  }
  throw new InvitationConsumptionUncertainError();
}

/**
 * Provision the school-admin graph after OTP verification.
 *
 * This function never creates a user, uploads files, or changes activation
 * state. The provisioning coordinator owns the user row and the activation
 * commit point; this slice only ensures school/link/invitation state.
 */
export async function provisionSchoolGraph(
  repo: RegistrationProvisioningRepository,
  user: ProvisioningUser,
  data: SchoolProvisioningInput
): Promise<SchoolProvisioningResult> {
  validateUser(user);
  validateSchoolData(data);

  const ledger: ProvisioningLedger = { created: [], ambiguous: false };
  const invitationToken = data.invitation_token?.trim() || null;

  try {
    if (!invitationToken && data.invited_school_id !== null && data.invited_school_id !== undefined) {
      throw invitationFailure();
    }

    if (!invitationToken) {
      const school = await resolveSelfSignupSchool(repo, user, data, ledger);
      const schoolId = requireId(
        school,
        "School has no stable identifier.",
        "school_id",
        "id"
      );
      const schoolAdmin = await ensureSchoolAdminLink(
        repo,
        schoolId,
        user,
        ledger
      );
      return {
        school,
        schoolAdmin,
        invitation: null,
        created: ledger.created,
      };
    }

    const invitation = (await repo.findOne(INVITATION_COLLECTION, {
      token: invitationToken,
    }, INVITATION_FIELDS)) as ProvisioningRecord | null;
    if (!invitation) throw invitationFailure();
    assertInvitationEmail(invitation, user);

    const alreadyUsed = isUsed(invitation.is_used);
    if (alreadyUsed) {
      // A used invite is resumable only if the same registration-key user is
      // already linked to this exact school. Never create a second link from
      // an invitation that was consumed by another registration.
      if (!user.registration_key || !invitationOwnerMatches(invitation, user)) {
        throw invitationFailure();
      }
      const school = await resolveInvitedSchool(repo, invitation, data);
      const schoolId = requireId(
        school,
        "School has no stable identifier.",
        "school_id",
        "id"
      );
      const existingLink = await findSchoolAdminLink(
        repo,
        schoolId,
        user.user_id
      );
      if (!existingLink) throw invitationFailure();
      const schoolAdmin =
        existingLink.is_active === false ||
        existingLink.is_active === 0 ||
        existingLink.is_active === "false" ||
        existingLink.is_active === "0"
          ? await ensureSchoolAdminLink(repo, schoolId, user, ledger)
          : existingLink;
      return {
        school,
        schoolAdmin,
        invitation,
        created: ledger.created,
      };
    }

    validateInvitationExpiry(invitation);
    const school = await resolveInvitedSchool(repo, invitation, data);
    const schoolId = requireId(
      school,
      "School has no stable identifier.",
      "school_id",
      "id"
    );
    const schoolAdmin = await ensureSchoolAdminLink(
      repo,
      schoolId,
      user,
      ledger
    );
    const consumedInvitation = await consumeInvitation(
      repo,
      invitation,
      user,
      schoolId
    );

    return {
      school,
      schoolAdmin,
      invitation: consumedInvitation,
      created: ledger.created,
    };
  } catch (error: unknown) {
    if (isHandledDownstreamFailure(error)) {
      await compensateCreatedResources(repo, ledger);
    }
    if (error instanceof InvitationConsumptionUncertainError) {
      console.error(
        "[registration.school.provisioner] Invitation consumption is uncertain",
        { error: error.name }
      );
      throw provisioningFailure();
    }
    if (error instanceof RegistrationError) throw error;
    console.error("[registration.school.provisioner] Provisioning failed", {
      error: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    throw provisioningFailure();
  }
}
