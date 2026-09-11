import type {
  FreelancerProvisioningInput,
} from "@/modules/auth/registration/registration.types";
import { RegistrationError } from "@/modules/auth/registration/registration.errors";
import type { RegistrationProvisioningRepository } from "../registration.provisioning.repo";

type RecordId = string | number;
type DirectusRecord = Record<string, unknown>;

interface CreatedResource {
  collection: string;
  id: RecordId;
}

/**
 * A failed mutation may have committed even when its response was lost. The
 * outer saga must leave existing records in place in that case and let a
 * later verification retry reconcile them.
 */
class AmbiguousProvisioningError extends Error {
  public readonly causeError: unknown;

  constructor(operation: string, causeError: unknown) {
    super(`Ambiguous freelancer provisioning mutation: ${operation}`);
    this.name = "AmbiguousProvisioningError";
    this.causeError = causeError;
  }
}

interface ProvisioningUser extends DirectusRecord {
  user_id?: RecordId;
  id?: RecordId;
  role?: unknown;
  role_id?: unknown;
}

interface GenericProvisioningRepository {
  findOne(
    collection: string,
    filter: Record<string, unknown>,
    fields: readonly string[]
  ): Promise<unknown>;
  create(collection: string, payload: DirectusRecord): Promise<unknown>;
  update(
    collection: string,
    id: RecordId,
    payload: DirectusRecord
  ): Promise<unknown>;
  delete(collection: string, id: RecordId): Promise<unknown>;
}

export interface ProvisionedFreelancerGraph {
  user: DirectusRecord;
  profile: DirectusRecord;
  preferences: DirectusRecord;
  skillMappings: DirectusRecord[];
  notificationPreference: DirectusRecord;
}

const PROFILE_COLLECTION = "vs_job_seeker_profile";
const USER_COLLECTION = "vs_user";
const PREFERENCES_COLLECTION = "vs_job_preferences";
const MASTER_SKILLS_COLLECTION = "vs_master_skills";
const SKILL_MAP_COLLECTION = "vs_user_skills_map";
const NOTIFICATION_PREFERENCE_COLLECTION = "vs_notification_preference";
const MARKETING_CATEGORY = "MARKETING_UPDATES";

const USER_FIELDS = [
  "user_id",
  "user_email",
  "role",
  "role_id",
  "user_province",
  "user_city",
  "user_brgy",
] as const;
const PROFILE_FIELDS = [
  "profile_id",
  "user_id",
  "profile_status",
  "profile_completion_percent",
  "profile_visibility",
] as const;
const PREFERENCES_FIELDS = [
  "id",
  "user_id",
  "work_setup",
  "preferred_location",
] as const;
const MASTER_SKILL_FIELDS = ["id", "skill_name"] as const;
const SKILL_MAP_FIELDS = ["id", "user_id", "skill_id"] as const;
const NOTIFICATION_FIELDS = [
  "preference_id",
  "user_id",
  "category",
  "email_enabled",
  "in_app_enabled",
] as const;

function isRecord(value: unknown): value is DirectusRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapRecord(value: unknown): DirectusRecord | undefined {
  if (Array.isArray(value)) {
    const first = value[0];
    return isRecord(first) ? first : undefined;
  }
  if (!isRecord(value)) return undefined;
  if (Array.isArray(value.data)) {
    const first = value.data[0];
    return isRecord(first) ? first : undefined;
  }
  if (isRecord(value.data)) return value.data;
  return value;
}

function toRecordId(value: unknown): RecordId | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (isRecord(value)) {
    return toRecordId(
      value.id ??
        value.user_id ??
        value.skill_id ??
        value.profile_id ??
        value.preference_id
    );
  }
  return undefined;
}

function recordId(
  record: DirectusRecord,
  ...keys: string[]
): RecordId | undefined {
  for (const key of keys) {
    const id = toRecordId(record[key]);
    if (id !== undefined) return id;
  }
  return undefined;
}

function sameId(left: unknown, right: RecordId): boolean {
  const leftId = toRecordId(left);
  if (leftId === undefined) return true;
  return String(leftId) === String(right);
}

function normalizeSkillName(value: string): string {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}

function canonicalSkillName(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left === undefined || left === null) return right === undefined || right === null;
  if (typeof left === "boolean") return isTruthyFlag(left) === isTruthyFlag(right);
  return String(left) === String(right);
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function isApprovedSkill(skill: DirectusRecord): boolean {
  for (const field of ["is_active", "active", "enabled"]) {
    if (skill[field] !== undefined && skill[field] !== null && !isTruthyFlag(skill[field])) {
      return false;
    }
  }

  if (skill.is_approved !== undefined && skill.is_approved !== null) {
    if (!isTruthyFlag(skill.is_approved)) return false;
  }

  for (const field of ["status", "approval_status", "approvalState"]) {
    const value = skill[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      continue;
    }
    if (!["ACTIVE", "APPROVED", "PUBLISHED"].includes(String(value).toUpperCase())) {
      return false;
    }
  }

  return true;
}

function provisioningConflict(message: string, details?: unknown): never {
  throw new RegistrationError(message, "PROVISIONING_CONFLICT", 409, {
    details,
  });
}

function provisioningFailure(
  operation: string,
  error: unknown
): never {
  if (error instanceof RegistrationError) throw error;

  console.error("[registration.freelancer] Provisioning repository operation failed", {
    operation,
    error: error instanceof Error ? error.name : "UNKNOWN_ERROR",
  });
  throw new RegistrationError(
    "Freelancer registration could not be completed. Please try again.",
    "PROVISIONING_FAILED",
    503
  );
}

async function findOne(
  repo: GenericProvisioningRepository,
  collection: string,
  filter: Record<string, unknown>,
  fields: readonly string[]
): Promise<DirectusRecord | undefined> {
  try {
    const row = await repo.findOne(collection, filter, fields);
    return unwrapRecord(row);
  } catch (error: unknown) {
    return provisioningFailure(`${collection}.findOne`, error);
  }
}

async function create(
  repo: GenericProvisioningRepository,
  collection: string,
  payload: DirectusRecord
): Promise<DirectusRecord> {
  try {
    const row = await repo.create(collection, payload);
    const record = unwrapRecord(row);
    if (!record) {
      return provisioningFailure(`${collection}.create.invalidResponse`, row);
    }
    return record;
  } catch (error: unknown) {
    return provisioningFailure(`${collection}.create`, error);
  }
}

async function update(
  repo: GenericProvisioningRepository,
  collection: string,
  id: RecordId,
  payload: DirectusRecord,
  fallback: DirectusRecord
): Promise<DirectusRecord> {
  try {
    const row = unwrapRecord(await repo.update(collection, id, payload));
    return row ?? { ...fallback, ...payload };
  } catch (error: unknown) {
    throw new AmbiguousProvisioningError(`${collection}.update`, error);
  }
}

async function createOrReconcile(
  repo: GenericProvisioningRepository,
  collection: string,
  payload: DirectusRecord,
  naturalKey: DirectusRecord,
  fields: readonly string[],
  created: CreatedResource[],
  idKeys: readonly string[]
): Promise<DirectusRecord> {
  try {
    const record = await create(repo, collection, payload);
    const id = recordId(record, ...idKeys);
    if (id !== undefined) created.push({ collection, id });
    return record;
  } catch (error: unknown) {
    // Directus may commit a write while the response is lost. Re-read the
    // natural key before surfacing the failure so verification can be retried.
    try {
      const reconciled = await findOne(repo, collection, naturalKey, fields);
      if (reconciled) return reconciled;
    } catch (reconciliationError: unknown) {
      throw new AmbiguousProvisioningError(
        `${collection}.create.reconcile`,
        reconciliationError
      );
    }
    throw new AmbiguousProvisioningError(`${collection}.create`, error);
  }
}

async function persistUserLocation(
  repo: GenericProvisioningRepository,
  user: ProvisioningUser,
  userId: RecordId,
  data: FreelancerProvisioningInput
): Promise<DirectusRecord> {
  const location: DirectusRecord = {};
  if (data.user_province !== undefined) {
    location.user_province = data.user_province;
  }
  if (data.user_city !== undefined) location.user_city = data.user_city;
  if (data.user_brgy !== undefined) location.user_brgy = data.user_brgy;
  if (Object.keys(location).length === 0) return user;

  try {
    return await update(repo, USER_COLLECTION, userId, location, user);
  } catch (error: unknown) {
    // A lost PATCH response can still leave the desired location committed.
    const reconciled = await findOne(
      repo,
      USER_COLLECTION,
      { user_id: userId },
      USER_FIELDS
    );
    if (reconciled) {
      assertBelongsToUser(reconciled, userId, "freelancer account");
      return reconciled;
    }
    throw error;
  }
}

function assertUserId(user: ProvisioningUser): RecordId {
  const userId = toRecordId(user.user_id ?? user.id);
  if (userId === undefined) {
    throw new RegistrationError(
      "Freelancer account is missing its user identifier.",
      "PROVISIONING_FAILED",
      503
    );
  }

  const role = user.role;
  if (
    role !== undefined &&
    role !== null &&
    String(role).trim() !== "" &&
    String(role).toUpperCase() !== "FREELANCER"
  ) {
    provisioningConflict("Provisioning user role is incompatible with freelancer registration.");
  }

  if (
    user.role_id !== undefined &&
    user.role_id !== null &&
    String(toRecordId(user.role_id) ?? user.role_id) !== "1"
  ) {
    provisioningConflict("Provisioning user role is incompatible with freelancer registration.");
  }

  return userId;
}

function assertBelongsToUser(
  row: DirectusRecord,
  userId: RecordId,
  resource: string
): void {
  if (!sameId(row.user_id, userId)) {
    provisioningConflict(`Existing ${resource} is linked to a different user.`);
  }
}

async function ensureProfile(
  repo: GenericProvisioningRepository,
  userId: RecordId,
  created: CreatedResource[]
): Promise<DirectusRecord> {
  const existing = await findOne(
    repo,
    PROFILE_COLLECTION,
    { user_id: userId },
    PROFILE_FIELDS
  );
  if (existing) {
    assertBelongsToUser(existing, userId, "freelancer profile");
    return existing;
  }

  const payload = {
    user_id: userId,
    profile_status: "draft",
    profile_completion_percent: 0,
    profile_visibility: "Public",
  };
  return createOrReconcile(
    repo,
    PROFILE_COLLECTION,
    payload,
    { user_id: userId },
    PROFILE_FIELDS,
    created,
    ["profile_id", "id"]
  );
}

async function ensurePreferences(
  repo: GenericProvisioningRepository,
  userId: RecordId,
  data: FreelancerProvisioningInput,
  created: CreatedResource[]
): Promise<DirectusRecord> {
  const existing = await findOne(
    repo,
    PREFERENCES_COLLECTION,
    { user_id: userId },
    PREFERENCES_FIELDS
  );
  if (existing) {
    assertBelongsToUser(existing, userId, "job preferences");
    return existing;
  }

  const employmentTypes = (data.employment_types ?? [])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  const payload = {
    user_id: userId,
    work_setup: employmentTypes.length > 0 ? employmentTypes.join(", ") : null,
    preferred_location:
      data.preferred_location?.trim() ||
      [data.user_city, data.user_province, data.country]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(", ") ||
      null,
  };
  return createOrReconcile(
    repo,
    PREFERENCES_COLLECTION,
    payload,
    { user_id: userId },
    PREFERENCES_FIELDS,
    created,
    ["id", "preference_id"]
  );
}

async function resolveExistingSkills(
  repo: GenericProvisioningRepository,
  skills: string[]
): Promise<Array<{ id: RecordId; name: string }>> {
  const resolved: Array<{ id: RecordId; name: string }> = [];
  const seen = new Set<string>();

  for (const rawSkill of skills) {
    if (typeof rawSkill !== "string") {
      provisioningConflict("Freelancer skill mapping contains an invalid value.");
    }
    const name = canonicalSkillName(rawSkill);
    const normalizedName = normalizeSkillName(name);
    if (!normalizedName || seen.has(normalizedName)) continue;
    seen.add(normalizedName);

    const skill = await findOne(
      repo,
      MASTER_SKILLS_COLLECTION,
      { skill_name: name },
      MASTER_SKILL_FIELDS
    );
    if (!skill) {
      provisioningConflict(
        "A requested freelancer skill is not an approved master skill.",
        { skill: name }
      );
    }

    const skillId = toRecordId(skill.id ?? skill.skill_id);
    if (skillId === undefined || !isApprovedSkill(skill)) {
      provisioningConflict(
        "A requested freelancer skill has an incompatible master mapping.",
        { skill: name }
      );
    }

    if (
      typeof skill.skill_name === "string" &&
      normalizeSkillName(skill.skill_name) !== normalizedName
    ) {
      provisioningConflict(
        "A requested freelancer skill has an incompatible master mapping.",
        { skill: name }
      );
    }

    if (!resolved.some((item) => String(item.id) === String(skillId))) {
      resolved.push({ id: skillId, name });
    }
  }

  return resolved;
}

async function ensureSkillMappings(
  repo: GenericProvisioningRepository,
  userId: RecordId,
  skills: Array<{ id: RecordId; name: string }>,
  created: CreatedResource[]
): Promise<DirectusRecord[]> {
  const mappings: DirectusRecord[] = [];

  for (const skill of skills) {
    const existing = await findOne(
      repo,
      SKILL_MAP_COLLECTION,
      { user_id: userId, skill_id: skill.id },
      SKILL_MAP_FIELDS
    );
    if (existing) {
      assertBelongsToUser(existing, userId, "skill mapping");
      const existingSkillId = toRecordId(existing.skill_id);
      if (
        existingSkillId !== undefined &&
        String(existingSkillId) !== String(skill.id)
      ) {
        provisioningConflict("Existing freelancer skill mapping is incompatible.", {
          skill: skill.name,
        });
      }
      mappings.push(existing);
      continue;
    }

    mappings.push(
      await createOrReconcile(
        repo,
        SKILL_MAP_COLLECTION,
        { user_id: userId, skill_id: skill.id },
        { user_id: userId, skill_id: skill.id },
        SKILL_MAP_FIELDS,
        created,
        ["id"]
      )
    );
  }

  return mappings;
}

async function ensureNotificationPreference(
  repo: GenericProvisioningRepository,
  userId: RecordId,
  marketingConsent: boolean | undefined,
  created: CreatedResource[]
): Promise<DirectusRecord> {
  const existing = await findOne(
    repo,
    NOTIFICATION_PREFERENCE_COLLECTION,
    { user_id: userId, category: MARKETING_CATEGORY },
    NOTIFICATION_FIELDS
  );
  if (existing) {
    assertBelongsToUser(existing, userId, "notification preference");
    if (
      existing.category !== undefined &&
      existing.category !== null &&
      String(existing.category) !== MARKETING_CATEGORY
    ) {
      provisioningConflict("Existing freelancer notification preference is incompatible.");
    }

    const enabled = marketingConsent === true ? 1 : 0;
    const hasStoredSettings =
      existing.email_enabled !== undefined ||
      existing.in_app_enabled !== undefined;
    const needsUpdate =
      hasStoredSettings &&
      (!sameValue(existing.email_enabled, enabled) ||
        !sameValue(existing.in_app_enabled, enabled));
    if (!needsUpdate) return existing;

    const preferenceId = recordId(existing, "preference_id", "id");
    if (preferenceId === undefined) {
      throw new RegistrationError(
        "Existing freelancer notification preference has no identifier.",
        "PROVISIONING_FAILED",
        503
      );
    }
    return update(
      repo,
      NOTIFICATION_PREFERENCE_COLLECTION,
      preferenceId,
      { email_enabled: enabled, in_app_enabled: enabled },
      existing
    );
  }

  const enabled = marketingConsent === true ? 1 : 0;
  const payload = {
    user_id: userId,
    category: MARKETING_CATEGORY,
    email_enabled: enabled,
    in_app_enabled: enabled,
  };
  return createOrReconcile(
    repo,
    NOTIFICATION_PREFERENCE_COLLECTION,
    payload,
    { user_id: userId, category: MARKETING_CATEGORY },
    NOTIFICATION_FIELDS,
    created,
    ["preference_id", "id"]
  );
}

function isCompensableFailure(error: unknown): boolean {
  // Only deterministic graph conflicts are safe to compensate. Dependency
  // failures and unexpected errors may follow an unknown Directus outcome.
  return (
    error instanceof RegistrationError &&
    error.code === "PROVISIONING_CONFLICT"
  );
}

function unwrapProvisioningError(error: unknown): RegistrationError {
  if (error instanceof AmbiguousProvisioningError) {
    if (error.causeError instanceof RegistrationError) return error.causeError;
    return new RegistrationError(
      "Freelancer registration could not be completed. Please try again.",
      "PROVISIONING_FAILED",
      503
    );
  }
  if (error instanceof RegistrationError) return error;
  return new RegistrationError(
    "Freelancer registration could not be completed. Please try again.",
    "PROVISIONING_FAILED",
    503
  );
}

async function compensateCreatedResources(
  repo: GenericProvisioningRepository,
  created: CreatedResource[]
): Promise<void> {
  for (const resource of [...created].reverse()) {
    try {
      await repo.delete(resource.collection, resource.id);
    } catch (error: unknown) {
      // Compensation is best effort. Keep the original provisioning error
      // and leave any residual PROVISIONING graph for a later reconciliation.
      console.error("[registration.freelancer] Compensation failed", {
        collection: resource.collection,
        error: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      });
    }
  }
}

/**
 * Ensures the permanent freelancer graph exists without creating taxonomy
 * rows. Every lookup uses the graph's natural key so verification retries
 * converge on the same records.
 */
export async function provisionFreelancerGraph(
  repo: RegistrationProvisioningRepository,
  user: ProvisioningUser,
  data: FreelancerProvisioningInput
): Promise<ProvisionedFreelancerGraph> {
  const genericRepo = repo as unknown as GenericProvisioningRepository;
  const userId = assertUserId(user);
  const created: CreatedResource[] = [];

  try {
    const resolvedSkills = await resolveExistingSkills(
      genericRepo,
      data.skills ?? []
    );
    const provisionedUser = await persistUserLocation(
      genericRepo,
      user,
      userId,
      data
    );
    const profile = await ensureProfile(genericRepo, userId, created);
    const preferences = await ensurePreferences(
      genericRepo,
      userId,
      data,
      created
    );
    const skillMappings = await ensureSkillMappings(
      genericRepo,
      userId,
      resolvedSkills,
      created
    );
    const notificationPreference = await ensureNotificationPreference(
      genericRepo,
      userId,
      data.marketing_consent,
      created
    );

    return {
      user: provisionedUser,
      profile,
      preferences,
      skillMappings,
      notificationPreference,
    };
  } catch (error: unknown) {
    if (isCompensableFailure(error)) {
      await compensateCreatedResources(genericRepo, created);
    }
    throw unwrapProvisioningError(error);
  }
}
