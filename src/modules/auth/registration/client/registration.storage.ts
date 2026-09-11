import {
  REGISTRATION_ROLES,
  type RegistrationRole,
} from "../registration.types";

/**
 * The only browser storage keys used by challenge-backed registration.
 *
 * The challenge id itself remains in the HttpOnly cookie.  The payload key
 * contains only the server-returned ciphertext; it is intentionally not
 * parsed, decoded, or copied into the readable draft.
 */
export const SIGNUP_DRAFT_STORAGE_KEY = "vos_signup_draft" as const;
export const REGISTRATION_PAYLOAD_STORAGE_KEY =
  "vos_registration_payload" as const;

/** Backwards-friendly names for callers that prefer concise key constants. */
export const DRAFT_STORAGE_KEY = SIGNUP_DRAFT_STORAGE_KEY;
export const PAYLOAD_STORAGE_KEY = REGISTRATION_PAYLOAD_STORAGE_KEY;

export const REGISTRATION_DRAFT_VERSION = 1 as const;
export const MAX_DRAFT_BYTES = 4_096;
export const MAX_STORED_PAYLOAD_LENGTH = 32_768;

const DRAFT_STEPS = new Set([
  "selection",
  "client",
  "client-otp",
  "freelancer",
  "freelancer-otp",
  "school",
  "school-otp",
]);

/** Presentational steps used by the current signup page and future clients. */
export type RegistrationDraftStep =
  | "selection"
  | "client"
  | "client-otp"
  | "freelancer"
  | "freelancer-otp"
  | "school"
  | "school-otp"
  | number;

/**
 * File flags are deliberately booleans only.  They never identify a file,
 * document type supplied by the user, or a Directus record.
 */
export const FILE_RESELECTION_KEYS = [
  "clientGovernmentId",
  "freelancerResume",
  "freelancerGovernmentId",
  "schoolDocuments",
  "resume",
  "governmentId",
  "identityDocument",
] as const;

export type FileReselectionKey = (typeof FILE_RESELECTION_KEYS)[number];

export type RegistrationFileReselectionFlags = Partial<
  Record<FileReselectionKey, boolean>
>;

/**
 * Readable registration draft.  This is intentionally not the registration
 * request type: passwords, OTPs, TINs, addresses, contact numbers,
 * invitations, file metadata, and server-controlled fields have no property
 * in this interface.
 */
export interface RegistrationDraft {
  version: typeof REGISTRATION_DRAFT_VERSION;
  role?: RegistrationRole;
  step?: RegistrationDraftStep;
  /** Alias retained for integrations that call the UI step displayStep. */
  displayStep?: RegistrationDraftStep;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  schoolName?: string;
  needsFileReselection?: boolean | RegistrationFileReselectionFlags;
}

/** Name used by the signup UI for the same strictly allowlisted shape. */
export type SignupDraft = RegistrationDraft;

/** Input accepted by the sanitizer. Unknown properties are ignored. */
export type RegistrationDraftInput = Partial<
  Omit<RegistrationDraft, "version">
> & {
  /** Explicit aliases let the signup forms pass their existing field names. */
  user_fname?: unknown;
  user_lname?: unknown;
  user_email?: unknown;
  company_name?: unknown;
  school_name?: unknown;
};

export interface RegistrationStorageSnapshot {
  draft: RegistrationDraft | null;
  sealedPayload: string | null;
  /** True when either key was present but failed the strict allowlist. */
  corrupted: boolean;
}

const DRAFT_ALLOWED_KEYS = new Set([
  "version",
  "role",
  "step",
  "displayStep",
  "firstName",
  "lastName",
  "email",
  "companyName",
  "schoolName",
  "needsFileReselection",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isRegistrationRole = (value: unknown): value is RegistrationRole =>
  typeof value === "string" &&
  (REGISTRATION_ROLES as readonly string[]).includes(value);

const isDraftStep = (value: unknown): value is RegistrationDraftStep => {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 && value <= 20;
  }
  return typeof value === "string" && DRAFT_STEPS.has(value);
};

const sanitizeText = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/\s+/gu, " ");
  if (!normalized || normalized.length > maxLength) return undefined;
  return normalized;
};

const sanitizeEmail = (value: unknown): string | undefined => {
  const normalized = sanitizeText(value, 320)?.toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized)) {
    return undefined;
  }
  return normalized;
};

function sanitizeFileReselection(
  value: unknown
): boolean | RegistrationFileReselectionFlags | undefined {
  if (typeof value === "boolean") return value;
  if (!isRecord(value)) return undefined;

  const result: RegistrationFileReselectionFlags = {};
  for (const key of Object.keys(value)) {
    if (
      !(FILE_RESELECTION_KEYS as readonly string[]).includes(key) ||
      typeof value[key] !== "boolean"
    ) {
      continue;
    }
    result[key as FileReselectionKey] = value[key] as boolean;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Build a versioned draft from an arbitrary form-shaped value by copying
 * only the low-risk allowlist.  It is safe to call this with the complete
 * signup form: every other property is discarded before serialization.
 */
export function sanitizeRegistrationDraft(
  input: RegistrationDraftInput | unknown
): RegistrationDraft {
  const source = isRecord(input) ? input : {};
  const draft: RegistrationDraft = {
    version: REGISTRATION_DRAFT_VERSION,
  };

  if (isRegistrationRole(source.role)) draft.role = source.role;

  if (isDraftStep(source.step)) draft.step = source.step;
  if (isDraftStep(source.displayStep)) draft.displayStep = source.displayStep;

  const firstName = sanitizeText(source.firstName ?? source.user_fname, 100);
  const lastName = sanitizeText(source.lastName ?? source.user_lname, 100);
  const email = sanitizeEmail(source.email ?? source.user_email);
  const companyName = sanitizeText(
    source.companyName ?? source.company_name,
    255
  );
  const schoolName = sanitizeText(source.schoolName ?? source.school_name, 255);

  if (firstName) draft.firstName = firstName;
  if (lastName) draft.lastName = lastName;
  if (email) draft.email = email;
  if (companyName) draft.companyName = companyName;
  if (schoolName) draft.schoolName = schoolName;

  const fileFlags = sanitizeFileReselection(source.needsFileReselection);
  if (fileFlags !== undefined) draft.needsFileReselection = fileFlags;

  return draft;
}

function isValidStoredDraft(value: unknown): value is RegistrationDraft {
  if (!isRecord(value) || value.version !== REGISTRATION_DRAFT_VERSION) {
    return false;
  }

  if (
    Object.keys(value).some((key) => !DRAFT_ALLOWED_KEYS.has(key)) ||
    (value.role !== undefined && !isRegistrationRole(value.role)) ||
    (value.step !== undefined && !isDraftStep(value.step)) ||
    (value.displayStep !== undefined && !isDraftStep(value.displayStep)) ||
    (value.firstName !== undefined &&
      (typeof value.firstName !== "string" ||
        sanitizeText(value.firstName, 100) !== value.firstName)) ||
    (value.lastName !== undefined &&
      (typeof value.lastName !== "string" ||
        sanitizeText(value.lastName, 100) !== value.lastName)) ||
    (value.email !== undefined && sanitizeEmail(value.email) !== value.email) ||
    (value.companyName !== undefined &&
      (typeof value.companyName !== "string" ||
        sanitizeText(value.companyName, 255) !== value.companyName)) ||
    (value.schoolName !== undefined &&
      (typeof value.schoolName !== "string" ||
        sanitizeText(value.schoolName, 255) !== value.schoolName))
  ) {
    return false;
  }

  if (value.needsFileReselection !== undefined) {
    if (typeof value.needsFileReselection === "boolean") return true;
    if (!isRecord(value.needsFileReselection)) return false;
    for (const [key, flag] of Object.entries(value.needsFileReselection)) {
      if (
        !(FILE_RESELECTION_KEYS as readonly string[]).includes(key) ||
        typeof flag !== "boolean"
      ) {
        return false;
      }
    }
  }

  return true;
}

function isOpaqueCiphertext(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (
    value.length === 0 ||
    value.length > MAX_STORED_PAYLOAD_LENGTH ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return false;
  }

  // A sealed payload is opaque ciphertext, never a JSON object/array.  Do
  // not parse it: preserving the exact returned bytes is part of the digest
  // binding contract.
  return !/^[\[{]/u.test(value);
}

function getSessionStorage(): Storage | null {
  try {
    if (typeof globalThis.sessionStorage === "undefined") return null;
    return globalThis.sessionStorage;
  } catch {
    // Access can throw in privacy-mode or sandboxed browser contexts.
    return null;
  }
}

function removeStorageKeys(storage: Storage): void {
  try {
    storage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
  } catch {
    // Storage is best-effort. Never surface a browser storage exception with
    // registration secrets or form data attached to it.
  }
  try {
    storage.removeItem(REGISTRATION_PAYLOAD_STORAGE_KEY);
  } catch {
    // See above.
  }
}

/** Serialize only the strict allowlisted draft shape. */
export function serializeRegistrationDraft(
  input: RegistrationDraftInput | unknown
): string {
  const draft = sanitizeRegistrationDraft(input);
  const serialized = JSON.stringify(draft);
  if (new TextEncoder().encode(serialized).length > MAX_DRAFT_BYTES) {
    throw new RangeError("Registration draft is too large.");
  }
  return serialized;
}

/** Parse a draft without silently retaining unknown or malformed fields. */
export function parseRegistrationDraft(raw: string): RegistrationDraft | null {
  if (
    typeof raw !== "string" ||
    raw.length === 0 ||
    raw.length > MAX_DRAFT_BYTES ||
    new TextEncoder().encode(raw).length > MAX_DRAFT_BYTES
  ) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidStoredDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Save a sanitized draft and report whether the browser accepted it. */
export function saveRegistrationDraft(
  input: RegistrationDraftInput | unknown
): RegistrationDraft | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const serialized = serializeRegistrationDraft(input);
    const draft = parseRegistrationDraft(serialized);
    if (!draft) return null;
    storage.setItem(SIGNUP_DRAFT_STORAGE_KEY, serialized);
    return draft;
  } catch {
    return null;
  }
}

export function loadRegistrationDraft(): RegistrationDraft | null {
  const snapshot = readRegistrationStorage();
  return snapshot.draft;
}

/** Save only the exact opaque ciphertext returned by the server. */
export function saveRegistrationPayload(payload: string): boolean {
  const storage = getSessionStorage();
  if (!storage || !isOpaqueCiphertext(payload)) return false;
  try {
    storage.setItem(REGISTRATION_PAYLOAD_STORAGE_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

export const saveSealedPayload = saveRegistrationPayload;

export function loadRegistrationPayload(): string | null {
  // Read both keys so a malformed draft cannot leave an opaque payload
  // stranded in storage.  Corruption is an all-or-nothing cleanup boundary.
  return readRegistrationStorage().sealedPayload;
}

export const loadSealedPayload = loadRegistrationPayload;

/** Read both keys and clear both together if either value is corrupt. */
export function readRegistrationStorage(): RegistrationStorageSnapshot {
  const storage = getSessionStorage();
  if (!storage) {
    return { draft: null, sealedPayload: null, corrupted: false };
  }

  let rawDraft: string | null = null;
  let rawPayload: string | null = null;
  try {
    rawDraft = storage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    rawPayload = storage.getItem(REGISTRATION_PAYLOAD_STORAGE_KEY);
  } catch {
    return { draft: null, sealedPayload: null, corrupted: false };
  }

  const hasDraft = rawDraft !== null;
  const hasPayload = rawPayload !== null;
  const draft = rawDraft === null ? null : parseRegistrationDraft(rawDraft);
  const sealedPayload =
    rawPayload === null || !isOpaqueCiphertext(rawPayload)
      ? null
      : rawPayload;
  const corrupted =
    (hasDraft && draft === null) || (hasPayload && sealedPayload === null);

  if (corrupted) {
    removeStorageKeys(storage);
    return { draft: null, sealedPayload: null, corrupted: true };
  }

  return { draft, sealedPayload, corrupted: false };
}

/** Clear both registration keys on every terminal lifecycle boundary. */
export function clearRegistrationStorage(): void {
  const storage = getSessionStorage();
  if (storage) removeStorageKeys(storage);
}

export const clearSignupStorage = clearRegistrationStorage;

export function clearRegistrationDraft(): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
  } catch {
    // Best effort; callers still clear the payload through the lifecycle API.
  }
}

export function clearRegistrationPayload(): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(REGISTRATION_PAYLOAD_STORAGE_KEY);
  } catch {
    // Best effort; see clearRegistrationDraft.
  }
}
