import type {
  InitiateRegistrationResponse,
  RegistrationRole,
  RegistrationStatusResponse,
  ResendOtpResponse,
  EmailCorrectionResponse,
} from "../registration.types";
import type { RegistrationInput } from "../registration.schemas";
import type { RegistrationErrorCode } from "../registration.errors";

/** The stable public paths used by all challenge-backed signup roles. */
export const REGISTRATION_ENDPOINTS = {
  initiate: "/api/auth/registration/initiate",
  status: "/api/auth/registration/status",
  resend: "/api/auth/registration/resend",
  email: "/api/auth/registration/email",
  verify: "/api/auth/registration/verify",
  cancel: "/api/auth/registration/cancel",
  schoolInvitation: "/api/auth/registration/school-invitation",
  metadata: "/api/public/registration-metadata",
} as const;

export interface VerifyRegistrationResponse {
  ok: true;
  role: RegistrationRole;
  destination: string;
}

export interface CancelRegistrationResponse {
  ok: true;
}

export type RegistrationStage = RegistrationStatusResponse["stage"];

export interface RegistrationErrorResponse {
  ok: false;
  code: RegistrationErrorCode;
  message: string;
  remainingAttempts?: number;
  resendAvailableAt?: string;
}

export type SchoolInvitationInvalidReason =
  | "invalid"
  | "not_found"
  | "used"
  | "expired";

export interface SchoolInvitationResponse {
  ok: true;
  valid: boolean;
  reason?: SchoolInvitationInvalidReason;
  invitedEmail?: string;
  schoolId?: string | number;
  schoolName?: string;
  expiresAt?: string;
}

/**
 * Metadata is deliberately typed as a narrow, display-only response.  The
 * server may add display fields in a backwards-compatible way, but callers
 * must not treat this endpoint as a collection proxy.
 */
export interface RegistrationMetadataResponse {
  ok: true;
  companySizes?: Array<Record<string, unknown>>;
  industries?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

const REGISTRATION_ERROR_CODES: readonly RegistrationErrorCode[] = [
  "INVALID_REQUEST",
  "CONFIGURATION_ERROR",
  "CAPTCHA_REQUIRED",
  "CAPTCHA_FAILED",
  "RATE_LIMITED",
  "EMAIL_ALREADY_REGISTERED",
  "REGISTRATION_RESTRICTED",
  "COMPANY_EMAIL_CONFLICT",
  "COMPANY_TIN_CONFLICT",
  "SCHOOL_CONFLICT",
  "INVITATION_INVALID",
  "CHALLENGE_NOT_FOUND",
  "CHALLENGE_EXPIRED",
  "CHALLENGE_LOCKED",
  "CHALLENGE_CONSUMED",
  "CHALLENGE_CANCELLED",
  "RESEND_COOLDOWN",
  "RESEND_LIMIT_REACHED",
  "OTP_INVALID",
  "PAYLOAD_INVALID",
  "PROVISIONING_IN_PROGRESS",
  "PROVISIONING_CONFLICT",
  "PROVISIONING_FAILED",
  "MAIL_DELIVERY_FAILED",
];

const isRegistrationErrorCode = (
  value: unknown
): value is RegistrationErrorCode =>
  typeof value === "string" &&
  (REGISTRATION_ERROR_CODES as readonly string[]).includes(value);

const ERROR_MESSAGES: Record<RegistrationErrorCode, string> = {
  INVALID_REQUEST: "Please check the registration details and try again.",
  CONFIGURATION_ERROR: "Registration is temporarily unavailable.",
  CAPTCHA_REQUIRED: "Please complete the security check and try again.",
  CAPTCHA_FAILED: "The security check could not be completed.",
  RATE_LIMITED: "Too many requests. Please wait and try again.",
  EMAIL_ALREADY_REGISTERED: "That email address is already registered.",
  REGISTRATION_RESTRICTED: "This registration cannot be completed right now.",
  COMPANY_EMAIL_CONFLICT: "That company email is already in use.",
  COMPANY_TIN_CONFLICT: "That company tax identifier is already in use.",
  SCHOOL_CONFLICT: "That school registration conflicts with an existing record.",
  INVITATION_INVALID: "The school invitation is invalid or has expired.",
  CHALLENGE_NOT_FOUND: "Your registration session could not be found.",
  CHALLENGE_EXPIRED: "Your verification session has expired. Please start again.",
  CHALLENGE_LOCKED: "Your verification session is locked.",
  CHALLENGE_CONSUMED: "This registration has already been completed.",
  CHALLENGE_CANCELLED: "This registration was cancelled.",
  RESEND_COOLDOWN: "Please wait before requesting another code.",
  RESEND_LIMIT_REACHED: "You have requested the maximum number of codes.",
  OTP_INVALID: "Invalid verification code.",
  PAYLOAD_INVALID: "Your registration session is no longer valid. Please start again.",
  PROVISIONING_IN_PROGRESS: "Your account is still being set up. Please wait a moment.",
  PROVISIONING_CONFLICT: "Your account could not be completed because of a conflict.",
  PROVISIONING_FAILED: "Registration could not be completed. Please try again.",
  MAIL_DELIVERY_FAILED: "The verification email could not be sent. Please try again.",
  LEGACY_REGISTRATION_RETIRED: "This registration endpoint is no longer available.",
};

export interface RegistrationApiErrorOptions {
  statusCode?: number;
  remainingAttempts?: number;
  resendAvailableAt?: string;
  retryAfterMs?: number;
}

/**
 * Error exposed by the browser client.  It contains only the stable error
 * contract and timing metadata needed by the UI; raw response bodies are not
 * retained.
 */
export class RegistrationApiError extends Error {
  public readonly code: RegistrationErrorCode;
  public readonly statusCode: number;
  public readonly remainingAttempts?: number;
  public readonly resendAvailableAt?: string;
  public readonly retryAfterMs?: number;

  constructor(
    code: RegistrationErrorCode,
    message = ERROR_MESSAGES[code],
    options?: RegistrationApiErrorOptions
  ) {
    super(message);
    this.name = "RegistrationApiError";
    this.code = code;
    this.statusCode = options?.statusCode ?? 0;
    this.remainingAttempts = options?.remainingAttempts;
    this.resendAvailableAt = options?.resendAvailableAt;
    this.retryAfterMs = options?.retryAfterMs;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RegistrationApiError);
    }
  }

  toJSON() {
    return {
      ok: false as const,
      code: this.code,
      message: this.message,
      ...(this.remainingAttempts !== undefined
        ? { remainingAttempts: this.remainingAttempts }
        : {}),
      ...(this.resendAvailableAt
        ? { resendAvailableAt: this.resendAvailableAt }
        : {}),
    };
  }
}

/** Compatibility name for form code that treats this as a request failure. */
export { RegistrationApiError as RegistrationRequestError };

export function isRegistrationApiError(
  value: unknown
): value is RegistrationApiError {
  return value instanceof RegistrationApiError;
}

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasString = (value: JsonRecord, key: string): value is JsonRecord & Record<string, string> =>
  typeof value[key] === "string" && value[key].length > 0;

const isRole = (value: unknown): value is RegistrationRole =>
  value === "CLIENT" || value === "FREELANCER" || value === "SCH_ADMIN";

const isChallengeStatus = (value: unknown): value is RegistrationStatusResponse["status"] =>
  value === "ACTIVE" ||
  value === "VERIFYING" ||
  value === "LOCKED" ||
  value === "CONSUMED" ||
  value === "CANCELLED" ||
  value === "EXPIRED";

const isStage = (value: unknown): value is RegistrationStatusResponse["stage"] =>
  value === "ACTIVE" || value === "VERIFYING" || value === "TERMINAL";

function isInitiateResponse(value: unknown): value is InitiateRegistrationResponse {
  if (!isRecord(value) || value.ok !== true || !isRole(value.role)) return false;
  return (
    hasString(value, "sealedPayload") &&
    hasString(value, "emailMasked") &&
    hasString(value, "expiresAt") &&
    hasString(value, "resendAvailableAt")
  );
}

function isStatusResponse(value: unknown): value is RegistrationStatusResponse {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !isRole(value.role) ||
    !isStage(value.stage) ||
    !isChallengeStatus(value.status) ||
    !hasString(value, "emailMasked") ||
    !hasString(value, "expiresAt") ||
    !hasString(value, "resendAvailableAt") ||
    typeof value.attemptsRemaining !== "number" ||
    !Number.isInteger(value.attemptsRemaining) ||
    value.attemptsRemaining < 0
  ) {
    return false;
  }

  return (
    value.terminalReason === undefined ||
    (typeof value.terminalReason === "string" && value.terminalReason.length > 0)
  );
}

function isResendResponse(value: unknown): value is ResendOtpResponse {
  if (!isRecord(value) || value.ok !== true) return false;
  return (
    hasString(value, "sealedPayload") &&
    hasString(value, "emailMasked") &&
    hasString(value, "expiresAt") &&
    hasString(value, "resendAvailableAt")
  );
}

function isEmailCorrectionResponse(
  value: unknown
): value is EmailCorrectionResponse {
  return isResendResponse(value);
}

function isVerifyResponse(value: unknown): value is VerifyRegistrationResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    isRole(value.role) &&
    hasString(value, "destination")
  );
}

function isCancelResponse(value: unknown): value is CancelRegistrationResponse {
  return isRecord(value) && value.ok === true;
}

function isInvitationReason(value: unknown): value is SchoolInvitationInvalidReason {
  return (
    value === "invalid" ||
    value === "not_found" ||
    value === "used" ||
    value === "expired"
  );
}

function isInvitationResponse(value: unknown): value is SchoolInvitationResponse {
  if (!isRecord(value) || value.ok !== true || typeof value.valid !== "boolean") {
    return false;
  }
  if (value.reason !== undefined && !isInvitationReason(value.reason)) return false;
  if (value.invitedEmail !== undefined && typeof value.invitedEmail !== "string") {
    return false;
  }
  if (
    value.schoolId !== undefined &&
    typeof value.schoolId !== "string" &&
    typeof value.schoolId !== "number"
  ) {
    return false;
  }
  if (value.schoolName !== undefined && typeof value.schoolName !== "string") {
    return false;
  }
  return value.expiresAt === undefined || typeof value.expiresAt === "string";
}

function isMetadataResponse(value: unknown): value is RegistrationMetadataResponse {
  return isRecord(value) && value.ok === true;
}

function parseRetryAfter(response: Response): number | undefined {
  const raw = response.headers.get("retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1_000);
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.max(0, timestamp - Date.now());
}

function fallbackCode(statusCode: number): RegistrationErrorCode {
  if (statusCode === 401 || statusCode === 404) return "CHALLENGE_NOT_FOUND";
  if (statusCode === 410) return "CHALLENGE_EXPIRED";
  if (statusCode === 409) return "PROVISIONING_CONFLICT";
  if (statusCode === 413 || statusCode === 400) return "INVALID_REQUEST";
  if (statusCode === 429) return "RATE_LIMITED";
  if (statusCode === 503) return "CONFIGURATION_ERROR";
  if (statusCode >= 500) return "PROVISIONING_FAILED";
  return "INVALID_REQUEST";
}

function responseError(
  response: Response,
  body: unknown
): RegistrationApiError {
  const bodyRecord = isRecord(body) ? body : undefined;
  const requestedCode = bodyRecord?.code;
  const code = isRegistrationErrorCode(requestedCode)
    ? requestedCode
    : fallbackCode(response.status);
  const remainingAttempts =
    typeof bodyRecord?.remainingAttempts === "number" &&
    Number.isInteger(bodyRecord.remainingAttempts) &&
    bodyRecord.remainingAttempts >= 0
      ? bodyRecord.remainingAttempts
      : undefined;
  const resendAvailableAt =
    typeof bodyRecord?.resendAvailableAt === "string" &&
    bodyRecord.resendAvailableAt.length > 0
      ? bodyRecord.resendAvailableAt
      : undefined;
  const serverMessage =
    typeof bodyRecord?.message === "string" && bodyRecord.message.length > 0
      ? bodyRecord.message
      : ERROR_MESSAGES[code];

  return new RegistrationApiError(code, serverMessage, {
    statusCode: response.status,
    remainingAttempts,
    resendAvailableAt,
    retryAfterMs: parseRetryAfter(response),
  });
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

type ResponseGuard<T> = (value: unknown) => value is T;

async function requestJson<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  guard: ResponseGuard<T>,
  body?: unknown
): Promise<T> {
  let serializedBody: string | undefined;
  if (body !== undefined) {
    try {
      serializedBody = JSON.stringify(body);
    } catch {
      throw new RegistrationApiError("INVALID_REQUEST");
    }
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(serializedBody !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(serializedBody !== undefined ? { body: serializedBody } : {}),
    });
  } catch {
    throw new RegistrationApiError(
      "PROVISIONING_FAILED",
      "Unable to reach the registration service. Please try again."
    );
  }

  const responseBody = await readJson(response);
  if (!response.ok) throw responseError(response, responseBody);

  if (!guard(responseBody)) {
    throw new RegistrationApiError(
      "PROVISIONING_FAILED",
      "Registration service returned an invalid response.",
      { statusCode: response.status }
    );
  }

  return responseBody;
}

/** Start a challenge for any of the three registration roles. */
export function initiateRegistration(
  input: RegistrationInput
): Promise<InitiateRegistrationResponse> {
  return requestJson(
    REGISTRATION_ENDPOINTS.initiate,
    "POST",
    isInitiateResponse,
    input
  );
}

/** Recover the authoritative challenge stage from the HttpOnly cookie. */
export function getRegistrationStatus(): Promise<RegistrationStatusResponse> {
  return requestJson(
    REGISTRATION_ENDPOINTS.status,
    "GET",
    isStatusResponse
  );
}

/** Rotate the OTP and sealed payload while retaining the current email. */
export function resendRegistrationOtp(
  sealedPayload: string
): Promise<ResendOtpResponse> {
  return requestJson(
    REGISTRATION_ENDPOINTS.resend,
    "POST",
    isResendResponse,
    { sealedPayload }
  );
}

/** Correct the email and rotate both OTP and sealed payload. */
export function correctRegistrationEmail(
  newEmail: string,
  sealedPayload: string,
  turnstileToken?: string
): Promise<EmailCorrectionResponse> {
  return requestJson(
    REGISTRATION_ENDPOINTS.email,
    "PATCH",
    isEmailCorrectionResponse,
    {
      newEmail,
      sealedPayload,
      ...(turnstileToken ? { turnstileToken } : {}),
    }
  );
}

/** Verify OTP and let the server issue the authenticated session cookie. */
export function verifyRegistrationOtp(
  otp: string,
  sealedPayload: string
): Promise<VerifyRegistrationResponse> {
  return requestJson(
    REGISTRATION_ENDPOINTS.verify,
    "POST",
    isVerifyResponse,
    { otp, sealedPayload }
  );
}

/** Cancel the challenge. The server also expires the HttpOnly cookie. */
export function cancelRegistration(): Promise<CancelRegistrationResponse> {
  return requestJson(
    REGISTRATION_ENDPOINTS.cancel,
    "DELETE",
    isCancelResponse
  );
}

// Concise aliases keep the client ergonomic while the explicit names above
// remain the preferred public contract for role-agnostic signup code.
export const initiate = initiateRegistration;
export const status = getRegistrationStatus;
export const resend = resendRegistrationOtp;
export const correctEmail = correctRegistrationEmail;
export const verify = verifyRegistrationOtp;
export const cancel = cancelRegistration;

/** Narrow, display-only school invitation lookup used before initiation. */
export function getRegistrationSchoolInvitation(
  token: string
): Promise<SchoolInvitationResponse> {
  const query = new URLSearchParams({ token }).toString();
  return requestJson(
    `${REGISTRATION_ENDPOINTS.schoolInvitation}?${query}`,
    "GET",
    isInvitationResponse
  );
}

/** Allowlisted display metadata; this is not a generic collection lookup. */
export function getRegistrationMetadata(): Promise<RegistrationMetadataResponse> {
  return requestJson(
    REGISTRATION_ENDPOINTS.metadata,
    "GET",
    isMetadataResponse
  );
}

/** Object form for components that prefer a single injected client surface. */
export const registrationApi = {
  initiate: initiateRegistration,
  status: getRegistrationStatus,
  resend: resendRegistrationOtp,
  correctEmail: correctRegistrationEmail,
  verify: verifyRegistrationOtp,
  cancel: cancelRegistration,
  schoolInvitation: getRegistrationSchoolInvitation,
  metadata: getRegistrationMetadata,
} as const;
