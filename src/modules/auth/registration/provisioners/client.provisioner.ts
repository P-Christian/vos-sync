import { randomInt } from "node:crypto";

import { RegistrationError } from "../registration.errors";
import type { ClientProvisioningInput } from "../registration.types";
import type { RegistrationProvisioningRepository } from "../registration.provisioning.repo";

/**
 * A client registration creates the company graph only after the challenge
 * has been verified.  Files and identity-verification rows deliberately do
 * not belong to this graph; they are collected by authenticated onboarding.
 */

type DirectusId = string | number;
type DirectusRecord = Record<string, unknown>;

/**
 * The sealed payload is intentionally smaller than the legacy registration
 * request.  These optional fields keep the provisioner compatible with a
 * server-created payload that still carries the legacy address/reference
 * values while retaining the canonical Directus field names.
 */
type ClientProvisioningData = ClientProvisioningInput & {
  industry_id?: DirectusId | null;
  company_size_id?: DirectusId | null;
  /** Legacy alias accepted only from a server-created sealed payload. */
  company_contact?: string | null;
  company_country?: string | null;
  company_address?: string | null;
  company_zipCode?: string | null;
  company_description?: string | null;
};

export interface ClientProvisioningUser extends DirectusRecord {
  user_id: DirectusId;
  user_email?: string | null;
  user_contact?: string | null;
}

export interface ClientProvisionedGraph {
  user: ClientProvisioningUser;
  company: DirectusRecord;
  companyUser: DirectusRecord;
  notificationPreference: DirectusRecord;
}

/** Maximum number of unique company-code candidates tried for one graph. */
export const MAX_COMPANY_CODE_ATTEMPTS = 8;

const COMPANY_FIELDS = [
  "company_id",
  "company_code",
  "company_name",
  "company_legal_name",
  "company_email",
  "company_contact",
  "company_website",
  "company_description",
  "industry_id",
  "company_size_id",
  "company_country",
  "company_province",
  "company_city",
  "company_brgy",
  "company_address",
  "company_zipCode",
  "company_tin",
  "verification_status",
  "is_active",
  "is_public",
  "created_by_user_id",
] as const;
const COMPANY_USER_FIELDS = [
  "company_user_id",
  "company_id",
  "user_id",
  "company_user_role",
  "is_primary_contact",
  "status",
] as const;
const PREFERENCE_FIELDS = [
  "preference_id",
  "user_id",
  "category",
  "email_enabled",
  "in_app_enabled",
] as const;

/**
 * The repository is imported as the shared application type, but this local
 * view keeps the provisioner tolerant of the repository's record generics.
 * The runtime contract is the four methods documented by Phase 4.
 */
interface ProvisioningRepositoryRuntime {
  findOne(
    collection: string,
    filter: DirectusRecord,
    fields: readonly string[]
  ): Promise<unknown>;
  create(collection: string, data: DirectusRecord): Promise<unknown>;
  update(
    collection: string,
    id: DirectusId,
    data: DirectusRecord
  ): Promise<unknown>;
  delete(collection: string, id: DirectusId): Promise<unknown>;
}

interface CreatedResource {
  collection: string;
  id: DirectusId;
}

/**
 * Only successful writes with a stable returned identifier are eligible for
 * compensation.  An ambiguous write marks the whole saga as non-revertible;
 * a retry must be able to reconcile that state instead of deleting a record
 * that may have been committed by another attempt.
 */
interface ProvisioningLedger {
  created: CreatedResource[];
  ambiguous: boolean;
}

function newProvisioningLedger(): ProvisioningLedger {
  return { created: [], ambiguous: false };
}

function recordCreated(
  ledger: ProvisioningLedger,
  collection: string,
  record: DirectusRecord,
  ...idFields: string[]
): DirectusId | null {
  const id = recordId(record, ...idFields);
  if (id === null) {
    ledger.ambiguous = true;
    return null;
  }
  if (
    !ledger.created.some(
      (resource) =>
        resource.collection === collection && sameValue(resource.id, id, "id")
    )
  ) {
    ledger.created.push({ collection, id });
  }
  return id;
}

function isKnownNonAmbiguousFailure(error: unknown): boolean {
  if (error instanceof RegistrationError) {
    // A 409 from the provisioning repository is a rejected unique write. It
    // did not create a second row, so earlier definite writes can be cleaned.
    return (
      error.code === "PROVISIONING_CONFLICT" ||
      error.code === "COMPANY_EMAIL_CONFLICT" ||
      error.code === "COMPANY_TIN_CONFLICT" ||
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
  if (!(error instanceof RegistrationError)) return false;
  if (isKnownNonAmbiguousFailure(error)) return true;
  // These are deterministic malformed-existing-graph failures raised before
  // any uncertain write. They are safe to compensate while retaining the
  // stable provisioning-failure code exposed by the helper.
  return (
    error.code === "PROVISIONING_FAILED" &&
    /existing .* (has|have) no identifier/iu.test(error.message)
  );
}

async function compensateKnownWrites(
  repo: ProvisioningRepositoryRuntime,
  ledger: ProvisioningLedger
): Promise<void> {
  if (ledger.ambiguous || ledger.created.length === 0) return;

  // Reverse dependency order: preference -> company membership -> company.
  for (const resource of [...ledger.created].reverse()) {
    try {
      await repo.delete(resource.collection, resource.id);
    } catch (error: unknown) {
      // Compensation is best effort. Keep the original provisioning error and
      // never delete a resource whose identifier was not returned by create.
      console.error("[registration.client] Failed to compensate provisioned record", {
        collection: resource.collection,
        error: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      });
    }
  }
}

function runtimeRepository(
  repo: RegistrationProvisioningRepository
): ProvisioningRepositoryRuntime {
  return repo as unknown as ProvisioningRepositoryRuntime;
}

function isRecord(value: unknown): value is DirectusRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Directus adapters commonly return either a record or a `{ data }` body. */
function unwrapRecord(value: unknown): DirectusRecord | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return isRecord(first) ? first : null;
  }
  if (!isRecord(value)) return null;

  const nested = value.data;
  if (Array.isArray(nested)) {
    const first = nested[0];
    return isRecord(first) ? first : null;
  }
  if (isRecord(nested)) return nested;
  return value;
}

async function findOne(
  repo: ProvisioningRepositoryRuntime,
  collection: string,
  filter: DirectusRecord,
  fields: readonly string[]
): Promise<DirectusRecord | null> {
  const value = await repo.findOne(collection, filter, fields);
  return unwrapRecord(value);
}

async function create(
  repo: ProvisioningRepositoryRuntime,
  collection: string,
  data: DirectusRecord
): Promise<DirectusRecord> {
  const value = unwrapRecord(await repo.create(collection, data));
  if (!value) {
    throw new RegistrationError(
      `Directus did not return the created ${collection} record.`,
      "PROVISIONING_FAILED",
      503
    );
  }
  return value;
}

async function update(
  repo: ProvisioningRepositoryRuntime,
  collection: string,
  id: DirectusId,
  data: DirectusRecord,
  fallback: DirectusRecord,
  ledger?: ProvisioningLedger
): Promise<DirectusRecord> {
  let raw: unknown;
  try {
    raw = await repo.update(collection, id, data);
  } catch (error: unknown) {
    // A PATCH may have been committed even when its response was lost. Do not
    // compensate any earlier creates after that ambiguous outcome.
    if (ledger && !isKnownNonAmbiguousFailure(error)) ledger.ambiguous = true;
    throw error;
  }
  const value = unwrapRecord(raw);
  // Some Directus update configurations return 204.  The caller already has
  // the compatible row, so retaining it is safe and keeps retries convergent.
  return value ?? { ...fallback, ...data };
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/gu, " ");
  return normalized.length > 0 ? normalized : null;
}

function optionalEmail(value: unknown): string | null {
  const text = optionalText(value);
  return text ? text.toLowerCase() : null;
}

function requiredText(value: unknown, fieldName: string): string {
  const text = optionalText(value);
  if (!text) {
    throw new RegistrationError(
      `Client ${fieldName} is missing from the sealed registration payload.`,
      "PAYLOAD_INVALID",
      400
    );
  }
  return text;
}

function getCountryAlpha2(value: unknown): string {
  const trimmed = optionalText(value)?.toUpperCase();
  if (!trimmed) return "PH";
  if (/^[A-Z]{2}$/u.test(trimmed)) return trimmed;

  const countryMap: Record<string, string> = {
    PHILIPPINES: "PH",
    "UNITED STATES": "US",
    "UNITED STATES OF AMERICA": "US",
    USA: "US",
    JAPAN: "JP",
    AUSTRALIA: "AU",
    CANADA: "CA",
    "UNITED KINGDOM": "GB",
    UK: "GB",
    SINGAPORE: "SG",
    GERMANY: "DE",
    FRANCE: "FR",
    CHINA: "CN",
    INDIA: "IN",
    "SOUTH KOREA": "KR",
    KOREA: "KR",
  };

  return countryMap[trimmed] || countryMap[trimmed.replace(/[\s_-]+/gu, " ")] || "PH";
}

function slugifyCompanyName(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/\s+/gu, "-")
    .replace(/[^\w-]+/gu, "")
    .replace(/--+/gu, "-")
    .replace(/^-+/u, "")
    .replace(/-+$/u, "");

  return (slug || "company").toUpperCase();
}

function positiveId(value: unknown): DirectusId | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/u.test(trimmed)) {
    const numberValue = Number(trimmed);
    if (numberValue <= 0) return null;
    return Number.isSafeInteger(numberValue) && numberValue > 0
      ? numberValue
      : trimmed;
  }
  if (/^-\d+$/u.test(trimmed)) return null;
  return trimmed;
}

function recordId(
  record: DirectusRecord | null,
  ...keys: string[]
): DirectusId | null {
  if (!record) return null;
  for (const key of keys) {
    const candidate = record[key];
    const id = isRecord(candidate)
      ? positiveId(candidate[`${key.replace(/_id$/u, "")}_id`]) ||
        positiveId(candidate.id) ||
        positiveId(candidate[key])
      : positiveId(candidate);
    if (id !== null) return id;
  }
  return null;
}

function comparable(value: unknown, fieldName: string): string | number | null {
  if (value === null || value === undefined || value === "") return null;
  if (fieldName.endsWith("email")) return optionalEmail(value);
  if (typeof value === "number") return value;
  return optionalText(String(value));
}

function sameValue(a: unknown, b: unknown, fieldName: string): boolean {
  const left = comparable(a, fieldName);
  const right = comparable(b, fieldName);
  if (left === null || right === null) return left === right;
  return String(left).toLowerCase() === String(right).toLowerCase();
}

function assertCompanyCompatible(
  existing: DirectusRecord,
  expected: DirectusRecord,
  userId: DirectusId
): void {
  const existingCreator = existing.created_by_user_id;
  if (
    existingCreator !== undefined &&
    existingCreator !== null &&
    !sameValue(existingCreator, userId, "created_by_user_id")
  ) {
    throw new RegistrationError(
      "An existing company is owned by a different registration.",
      "PROVISIONING_CONFLICT",
      409
    );
  }

  const fields = [
    "company_name",
    "company_legal_name",
    "company_email",
    "company_contact",
    "company_website",
    "company_description",
    "industry_id",
    "company_size_id",
    "company_country",
    "company_province",
    "company_city",
    "company_brgy",
    "company_address",
    "company_zipCode",
    "company_tin",
  ];

  for (const field of fields) {
    // A row can be observed without nullable fields when Directus omits them.
    // Missing values are completed by the original create and do not make a
    // retry incompatible; a concrete value must still match exactly.
    if (existing[field] === undefined || existing[field] === null) continue;
    if (!sameValue(existing[field], expected[field], field)) {
      throw new RegistrationError(
        "An existing company does not match this registration payload.",
        "PROVISIONING_CONFLICT",
        409
      );
    }
  }
}

function assertOwnerLinkCompatible(
  existing: DirectusRecord,
  companyId: DirectusId,
  userId: DirectusId
): void {
  if (
    existing.company_id !== undefined &&
    existing.company_id !== null &&
    !sameValue(existing.company_id, companyId, "company_id")
  ) {
    throw new RegistrationError(
      "The existing company membership points to another company.",
      "PROVISIONING_CONFLICT",
      409
    );
  }
  if (
    existing.user_id !== undefined &&
    existing.user_id !== null &&
    !sameValue(existing.user_id, userId, "user_id")
  ) {
    throw new RegistrationError(
      "The existing company membership belongs to another user.",
      "PROVISIONING_CONFLICT",
      409
    );
  }
  if (
    existing.company_user_role !== undefined &&
    existing.company_user_role !== null &&
    String(existing.company_user_role).toUpperCase() !== "OWNER"
  ) {
    throw new RegistrationError(
      "The existing company membership is not an owner membership.",
      "PROVISIONING_CONFLICT",
      409
    );
  }
  if (
    existing.is_primary_contact !== undefined &&
    existing.is_primary_contact !== null &&
    !isEnabled(existing.is_primary_contact)
  ) {
    throw new RegistrationError(
      "The existing company membership is not the primary contact.",
      "PROVISIONING_CONFLICT",
      409
    );
  }
  if (
    existing.status !== undefined &&
    existing.status !== null &&
    String(existing.status).toUpperCase() !== "ACTIVE"
  ) {
    throw new RegistrationError(
      "The existing company membership is inactive.",
      "PROVISIONING_CONFLICT",
      409
    );
  }
}

function isEnabled(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function isUniqueConflict(error: unknown): boolean {
  if (!isRecord(error) && !(error instanceof Error)) return false;
  const message = error instanceof Error ? error.message : String(error.message ?? "");
  const status = isRecord(error) ? Number(error.status ?? error.statusCode) : NaN;
  return (
    status === 409 ||
    /already\s+exists|duplicate|unique|constraint|collision|company[_\s-]*code/i.test(
      message
    )
  );
}

function toProvisioningError(error: unknown, message: string): RegistrationError {
  if (error instanceof RegistrationError) return error;
  return new RegistrationError(message, "PROVISIONING_FAILED", 503);
}

async function resolveReferenceId(
  repo: ProvisioningRepositoryRuntime,
  collection: "vs_industry" | "vs_company_size",
  rawValue: unknown,
  idField: "industry_id" | "company_size_id",
  nameField: "industry_name" | "company_size_name",
  required: boolean
): Promise<DirectusId | null> {
  const directId = positiveId(rawValue);
  if (directId !== null && typeof rawValue !== "string") return directId;
  if (directId !== null && /^\d+$/u.test(rawValue as string)) return directId;

  const name = optionalText(rawValue);
  if (!name) {
    if (required) {
      throw new RegistrationError(
        "Client industry reference is required and could not be resolved.",
        "PROVISIONING_CONFLICT",
        409
      );
    }
    return null;
  }

  try {
    const record = await findOne(
      repo,
      collection,
      { [nameField]: name },
      [idField, nameField]
    );
    const resolvedId = recordId(record, idField);
    if (resolvedId !== null) return resolvedId;
  } catch {
    // Do not silently write an invalid/null relation. The sealed payload has
    // already passed schema validation, so an unavailable reference is a
    // stable provisioning conflict rather than a partial company graph.
  }

  throw new RegistrationError(
    required
      ? "Client industry reference is required and could not be resolved."
      : "Client company size reference could not be resolved.",
    "PROVISIONING_CONFLICT",
    409
  );
}

function companyNaturalOwner(
  company: DirectusRecord | null,
  userId: DirectusId
): boolean {
  if (!company) return false;
  const owner = company.created_by_user_id;
  // A natural-key match without the registration owner proof is an existing
  // company's conflict, not an idempotent retry.  Only the registration-key
  // lookup (created_by_user_id) may establish ownership.
  return owner !== undefined && owner !== null && sameValue(owner, userId, "created_by_user_id");
}

function buildCompanyData(
  data: ClientProvisioningData,
  user: ClientProvisioningUser,
  userId: DirectusId,
  industryId: DirectusId | null,
  companySizeId: DirectusId | null
): DirectusRecord {
  const userEmail = optionalEmail(user.user_email);
  const userContact = optionalText(user.user_contact);
  const companyName = requiredText(data.company_name, "company name");

  return {
    // company_code is added for each collision-safe create attempt.
    company_name: companyName,
    company_legal_name: companyName,
    company_email: optionalEmail(data.company_email) || userEmail,
    company_contact:
      optionalText(data.company_phone) ||
      optionalText(data.company_contact) ||
      userContact,
    company_website: optionalText(data.company_website),
    company_description: optionalText(data.company_description),
    industry_id: industryId,
    company_size_id: companySizeId,
    company_country: getCountryAlpha2(data.company_country),
    company_province: optionalText(data.company_province),
    company_city: optionalText(data.company_city),
    company_brgy: optionalText(data.company_brgy),
    company_address: optionalText(data.company_address),
    company_zipCode: optionalText(data.company_zipCode),
    company_tin: optionalText(data.company_tin),
    verification_status: "DRAFT",
    is_active: 1,
    is_public: 0,
    created_by_user_id: userId,
  };
}

async function findCompanyForUser(
  repo: ProvisioningRepositoryRuntime,
  userId: DirectusId
): Promise<DirectusRecord | null> {
  return findOne(
    repo,
    "vs_company",
    { created_by_user_id: userId },
    COMPANY_FIELDS
  );
}

async function findNaturalCompany(
  repo: ProvisioningRepositoryRuntime,
  expected: DirectusRecord,
  userId: DirectusId
): Promise<DirectusRecord | null> {
  let existingByEmail: DirectusRecord | null = null;
  const email = expected.company_email;
  if (email) {
    existingByEmail = await findOne(
      repo,
      "vs_company",
      { company_email: email },
      COMPANY_FIELDS
    );
    if (existingByEmail !== null) {
      if (!companyNaturalOwner(existingByEmail, userId)) {
        throw new RegistrationError(
          "Company email address is already registered to another company.",
          "COMPANY_EMAIL_CONFLICT",
          409
        );
      }
    }
  }

  let existingByTin: DirectusRecord | null = null;
  const tin = expected.company_tin;
  if (tin) {
    existingByTin = await findOne(
      repo,
      "vs_company",
      { company_tin: tin },
      COMPANY_FIELDS
    );
    if (existingByTin !== null) {
      if (!companyNaturalOwner(existingByTin, userId)) {
        throw new RegistrationError(
          "A company with this Tax Identification Number is already registered.",
          "COMPANY_TIN_CONFLICT",
          409
        );
      }
    }
  }

  if (existingByEmail !== null && existingByTin !== null) {
    const emailId = recordId(existingByEmail, "company_id");
    const tinId = recordId(existingByTin, "company_id");
    if (emailId !== null && tinId !== null && !sameValue(emailId, tinId, "company_id")) {
      throw new RegistrationError(
        "Company email and Tax Identification Number belong to different companies.",
        "PROVISIONING_CONFLICT",
        409
      );
    }
  }

  return existingByEmail ?? existingByTin;
}

async function ensureCompany(
  repo: ProvisioningRepositoryRuntime,
  user: ClientProvisioningUser,
  expected: DirectusRecord,
  ledger: ProvisioningLedger
): Promise<DirectusRecord> {
  const userId = user.user_id;
  const companyForUser = await findCompanyForUser(repo, userId);
  if (companyForUser !== null) {
    assertCompanyCompatible(companyForUser, expected, userId);
    return companyForUser;
  }

  const naturalCompany = await findNaturalCompany(repo, expected, userId);
  if (naturalCompany !== null) {
    assertCompanyCompatible(naturalCompany, expected, userId);
    return naturalCompany;
  }

  const baseCode = slugifyCompanyName(String(expected.company_name));
  let lastCollision: unknown;

  for (let attempt = 0; attempt < MAX_COMPANY_CODE_ATTEMPTS; attempt += 1) {
    // randomInt is backed by Node's CSPRNG and avoids Math.random-based code
    // collisions from the legacy endpoint.
    const candidate = `${baseCode}-${randomInt(1000, 10000)}`;

    const occupied = await findOne(
      repo,
      "vs_company",
      { company_code: candidate },
      COMPANY_FIELDS
    );
    if (occupied !== null) {
      if (companyNaturalOwner(occupied, userId)) {
        assertCompanyCompatible(occupied, expected, userId);
        return occupied;
      }
      lastCollision = new Error("Company code is already in use.");
      continue;
    }

    try {
      const created = await create(repo, "vs_company", {
        ...expected,
        company_code: candidate,
      });
      recordCreated(ledger, "vs_company", created, "company_id");
      return created;
    } catch (error: unknown) {
      // A timeout can hide a successful write.  Reconcile by idempotency and
      // natural keys before deciding whether to try another code.
      const reconciled = await findCompanyForUser(repo, userId);
      if (reconciled !== null) {
        // The create response was ambiguous. Even though the row is now
        // visible, it cannot be attributed with certainty to this invocation.
        ledger.ambiguous = true;
        assertCompanyCompatible(reconciled, expected, userId);
        return reconciled;
      }
      const reconciledNatural = await findNaturalCompany(repo, expected, userId);
      if (reconciledNatural !== null) {
        ledger.ambiguous = true;
        assertCompanyCompatible(reconciledNatural, expected, userId);
        return reconciledNatural;
      }

      const occupiedAfterError = await findOne(
        repo,
        "vs_company",
        { company_code: candidate },
        COMPANY_FIELDS
      );
      if (occupiedAfterError !== null) {
        if (companyNaturalOwner(occupiedAfterError, userId)) {
          ledger.ambiguous = true;
          assertCompanyCompatible(occupiedAfterError, expected, userId);
          return occupiedAfterError;
        }
        lastCollision = error;
        continue;
      }

      if (isUniqueConflict(error)) {
        lastCollision = error;
        continue;
      }
      ledger.ambiguous = true;
      throw toProvisioningError(error, "Unable to provision the client company.");
    }
  }

  throw new RegistrationError(
    "Unable to allocate a unique company code. Please try again.",
    "PROVISIONING_FAILED",
    503,
    { details: lastCollision instanceof Error ? lastCollision.name : undefined }
  );
}

async function ensureOwnerLink(
  repo: ProvisioningRepositoryRuntime,
  companyId: DirectusId,
  userId: DirectusId,
  ledger: ProvisioningLedger
): Promise<DirectusRecord> {
  const expected = {
    company_id: companyId,
    user_id: userId,
    company_user_role: "OWNER",
    is_primary_contact: 1,
    status: "ACTIVE",
  } satisfies DirectusRecord;

  const existing = await findOne(
    repo,
    "vs_company_user",
    { company_id: companyId, user_id: userId },
    COMPANY_USER_FIELDS
  );
  if (existing) {
    assertOwnerLinkCompatible(existing, companyId, userId);
    const needsCompletion =
      existing.company_user_role === undefined ||
      existing.is_primary_contact === undefined ||
      existing.status === undefined;
    if (!needsCompletion) return existing;
    const id = recordId(existing, "company_user_id");
    if (id === null) {
      throw new RegistrationError(
        "The existing company owner link has no identifier.",
        "PROVISIONING_FAILED",
        503
      );
    }
    return update(repo, "vs_company_user", id, expected, existing, ledger);
  }

  try {
    const created = await create(repo, "vs_company_user", expected);
    recordCreated(ledger, "vs_company_user", created, "company_user_id", "id");
    return created;
  } catch (error: unknown) {
    const reconciled = await findOne(
      repo,
      "vs_company_user",
      { company_id: companyId, user_id: userId },
      COMPANY_USER_FIELDS
    );
    if (reconciled !== null) {
      // The failed create may have committed. Preserve it for a retry rather
      // than treating a visible row as definitely created by this invocation.
      ledger.ambiguous = true;
      assertOwnerLinkCompatible(reconciled, companyId, userId);
      return reconciled;
    }
    if (!isKnownNonAmbiguousFailure(error)) ledger.ambiguous = true;
    throw toProvisioningError(error, "Unable to link the client to the company.");
  }
}

async function ensureMarketingPreference(
  repo: ProvisioningRepositoryRuntime,
  userId: DirectusId,
  marketingConsent: boolean,
  ledger: ProvisioningLedger
): Promise<DirectusRecord> {
  const expected = {
    user_id: userId,
    category: "MARKETING_UPDATES",
    email_enabled: marketingConsent ? 1 : 0,
    in_app_enabled: marketingConsent ? 1 : 0,
  } satisfies DirectusRecord;

  const existing = await findOne(
    repo,
    "vs_notification_preference",
    { user_id: userId, category: "MARKETING_UPDATES" },
    PREFERENCE_FIELDS
  );
  if (existing) {
    const existingUser = existing.user_id;
    const existingCategory = existing.category;
    if (
      existingUser !== undefined &&
      existingUser !== null &&
      !sameValue(existingUser, userId, "user_id")
    ) {
      throw new RegistrationError(
        "The existing marketing preference belongs to another user.",
        "PROVISIONING_CONFLICT",
        409
      );
    }
    if (
      existingCategory !== undefined &&
      existingCategory !== null &&
      String(existingCategory).toUpperCase() !== "MARKETING_UPDATES"
    ) {
      throw new RegistrationError(
        "The existing notification preference has an incompatible category.",
        "PROVISIONING_CONFLICT",
        409
      );
    }

    const needsUpdate =
      !sameValue(existing.email_enabled, expected.email_enabled, "email_enabled") ||
      !sameValue(existing.in_app_enabled, expected.in_app_enabled, "in_app_enabled");
    if (!needsUpdate) return existing;

    const id = recordId(existing, "preference_id");
    if (id === null) {
      throw new RegistrationError(
        "The existing marketing preference has no identifier.",
        "PROVISIONING_FAILED",
        503
      );
    }
    return update(
      repo,
      "vs_notification_preference",
      id,
      {
        email_enabled: expected.email_enabled,
        in_app_enabled: expected.in_app_enabled,
      },
      existing,
      ledger
    );
  }

  try {
    const created = await create(repo, "vs_notification_preference", expected);
    recordCreated(
      ledger,
      "vs_notification_preference",
      created,
      "preference_id",
      "id"
    );
    return created;
  } catch (error: unknown) {
    const reconciled = await findOne(
      repo,
      "vs_notification_preference",
      { user_id: userId, category: "MARKETING_UPDATES" },
      PREFERENCE_FIELDS
    );
    if (reconciled !== null) {
      // The create response was ambiguous, so any earlier definite writes
      // must remain for idempotent reconciliation.
      ledger.ambiguous = true;
      return ensureMarketingPreference(repo, userId, marketingConsent, ledger);
    }
    if (!isKnownNonAmbiguousFailure(error)) ledger.ambiguous = true;
    throw toProvisioningError(
      error,
      "Unable to save the client marketing preference."
    );
  }
}

/**
 * Provision the client role graph for an already-created PROVISIONING user.
 *
 * The user row itself is owned by the provisioning coordinator.  This
 * function is safe to call again after an interrupted Directus request: it
 * first finds the company by `created_by_user_id`, then reconciles natural
 * keys and company-code collisions before creating anything new.
 */
export async function provisionClientGraph(
  repo: RegistrationProvisioningRepository,
  user: ClientProvisioningUser,
  data: ClientProvisioningInput
): Promise<ClientProvisionedGraph> {
  const runtimeRepo = runtimeRepository(repo);
  const ledger = newProvisioningLedger();
  const clientData = data as ClientProvisioningData;
  const userId = positiveId(user.user_id);
  if (userId === null) {
    throw new RegistrationError(
      "Client provisioning requires a user identifier.",
      "PROVISIONING_FAILED",
      503
    );
  }

  const userEmail = optionalEmail(user.user_email);
  if (!userEmail) {
    throw new RegistrationError(
      "Client provisioning requires a canonical user email.",
      "PROVISIONING_FAILED",
      503
    );
  }

  try {
    const [industryId, companySizeId] = await Promise.all([
      resolveReferenceId(
        runtimeRepo,
        "vs_industry",
        clientData.industry_id || clientData.industry,
        "industry_id",
        "industry_name",
        true
      ),
      resolveReferenceId(
        runtimeRepo,
        "vs_company_size",
        clientData.company_size_id || clientData.company_size,
        "company_size_id",
        "company_size_name",
        Boolean(
          optionalText(clientData.company_size_id || clientData.company_size)
        )
      ),
    ]);

    const expectedCompany = buildCompanyData(
      clientData,
      { ...user, user_email: userEmail },
      userId,
      industryId,
      companySizeId
    );
    const company = await ensureCompany(
      runtimeRepo,
      user,
      expectedCompany,
      ledger
    );
    const companyId = recordId(company, "company_id");
    if (companyId === null) {
      throw new RegistrationError(
        "The provisioned company has no identifier.",
        "PROVISIONING_FAILED",
        503
      );
    }

    const companyUser = await ensureOwnerLink(
      runtimeRepo,
      companyId,
      userId,
      ledger
    );
    const notificationPreference = await ensureMarketingPreference(
      runtimeRepo,
      userId,
      clientData.marketing_consent === true,
      ledger
    );

    return {
      user,
      company,
      companyUser,
      notificationPreference,
    };
  } catch (error: unknown) {
    // Only our own, known validation/uniqueness conflicts are safe to roll
    // back. A dependency timeout or ambiguous write intentionally leaves the
    // inactive graph available for the next verification retry.
    if (isHandledDownstreamFailure(error)) {
      await compensateKnownWrites(runtimeRepo, ledger);
    }
    throw error;
  }
}
