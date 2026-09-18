import type {
  StudentInvitationClaimDto,
  StudentInvitationPreviewDto,
  StudentInvitationVerifyDto,
} from "@/modules/auth/student-invitation/types";
import {
  STUDENT_INVITATION_ERROR_CODES,
  type StudentInvitationErrorCode,
} from "@/modules/auth/student-invitation/errors";

/**
 * Browser client for the student invitation acceptance endpoints. Responses
 * are validated against the DTO contracts in
 * `src/modules/auth/student-invitation/types.ts` before they reach the UI;
 * anything else is treated as a service failure.
 */

export const STUDENT_INVITATION_ENDPOINTS = {
  preview: "/api/student-invitations/preview",
  claim: "/api/student-invitations/claim",
  verify: "/api/student-invitations/verify",
} as const;

export class StudentInvitationApiError extends Error {
  public readonly code: StudentInvitationErrorCode;
  public readonly statusCode: number;
  public readonly attemptsRemaining: number | null;
  public readonly resendAvailableAt: string | null;

  constructor(
    code: StudentInvitationErrorCode,
    statusCode: number,
    message: string,
    details?: {
      readonly attemptsRemaining?: number;
      readonly resendAvailableAt?: string;
    }
  ) {
    super(message);
    this.name = "StudentInvitationApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.attemptsRemaining = details?.attemptsRemaining ?? null;
    this.resendAvailableAt = details?.resendAvailableAt ?? null;
  }
}

export function isStudentInvitationApiError(
  value: unknown
): value is StudentInvitationApiError {
  return value instanceof StudentInvitationApiError;
}

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasString = (value: JsonRecord, key: string): boolean =>
  typeof value[key] === "string" && value[key].length > 0;

const errorCodeSet = new Set<string>(STUDENT_INVITATION_ERROR_CODES);

function isStudentInvitationErrorCode(
  value: unknown
): value is StudentInvitationErrorCode {
  return typeof value === "string" && errorCodeSet.has(value);
}

function isPreviewResponse(
  value: unknown
): value is StudentInvitationPreviewDto {
  if (!isRecord(value)) return false;
  switch (value.state) {
    case "valid":
      return (
        hasString(value, "schoolName") &&
        hasString(value, "courseName") &&
        hasString(value, "schoolYear") &&
        hasString(value, "studentFirstName") &&
        typeof value.studentLastName === "string" &&
        hasString(value, "emailMasked") &&
        hasString(value, "expiresAt")
      );
    case "expired":
    case "used":
    case "registered":
    case "invalid":
      return true;
    default:
      return false;
  }
}

function isClaimResult(value: unknown): value is StudentInvitationClaimDto {
  if (!isRecord(value)) return false;
  if (value.state === "linked") return true;
  if (value.mode === "same_email") return hasString(value, "notice");
  if (value.mode === "otp_sent") {
    return (
      hasString(value, "emailMasked") &&
      hasString(value, "otpExpiresAt") &&
      hasString(value, "resendAvailableAt") &&
      typeof value.attemptsRemaining === "number" &&
      Number.isInteger(value.attemptsRemaining) &&
      value.attemptsRemaining >= 0
    );
  }
  return false;
}

function isVerifyResponse(
  value: unknown
): value is StudentInvitationVerifyDto {
  return isRecord(value) && value.state === "linked";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

const ERROR_MESSAGES: Record<StudentInvitationErrorCode, string> = {
  UNAUTHENTICATED: "Your session has expired. Please sign in again.",
  INVALID_REQUEST: "This invitation link is no longer valid.",
  INVITATION_INVALID: "This invitation link is no longer valid.",
  INVITATION_EXPIRED: "This invitation has expired.",
  INVITATION_USED: "This invitation has already been used.",
  INVITATION_ROLE_INVALID: "This account cannot accept the invitation.",
  INVITATION_OWNERSHIP_CONFLICT:
    "This invitation has already been linked to another account.",
  INVITATION_CHALLENGE_LOCKED:
    "No verification attempts remain. Request a new code to continue.",
  INVITATION_CHALLENGE_IN_PROGRESS:
    "Verification is already in progress. Please try again.",
  OTP_REQUIRED: "Enter the verification code sent to your school email.",
  OTP_INVALID: "The verification code is invalid.",
  OTP_EXPIRED: "The verification code has expired. Request a new code.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  SERVICE_UNAVAILABLE: "We couldn't complete that request. Please try again.",
};

async function requestJson<T>(
  path: string,
  method: "GET" | "POST",
  guard: (value: unknown) => value is T,
  body?: JsonRecord
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new StudentInvitationApiError(
      "SERVICE_UNAVAILABLE",
      0,
      "Unable to reach the server. Please check your connection and try again."
    );
  }

  const responseBody = await readJson(response);
  if (!response.ok) {
    const bodyRecord = isRecord(responseBody) ? responseBody : undefined;
    const code = isStudentInvitationErrorCode(bodyRecord?.code)
      ? bodyRecord.code
      : "SERVICE_UNAVAILABLE";
    const attemptsRemaining =
      typeof bodyRecord?.attemptsRemaining === "number" &&
      Number.isInteger(bodyRecord.attemptsRemaining) &&
      bodyRecord.attemptsRemaining >= 0
        ? bodyRecord.attemptsRemaining
        : undefined;
    const resendAvailableAt =
      bodyRecord && hasString(bodyRecord, "resendAvailableAt")
        ? String(bodyRecord.resendAvailableAt)
        : undefined;
    throw new StudentInvitationApiError(
      code,
      response.status,
      ERROR_MESSAGES[code],
      { attemptsRemaining, resendAvailableAt }
    );
  }

  if (!guard(responseBody)) {
    throw new StudentInvitationApiError(
      "SERVICE_UNAVAILABLE",
      response.status,
      "The server returned an unexpected response. Please try again."
    );
  }

  return responseBody;
}

/** Masked, non-consuming preview of a student invitation. */
export function previewStudentInvitation(
  token: string
): Promise<StudentInvitationPreviewDto> {
  const query = new URLSearchParams({ token }).toString();
  return requestJson(
    `${STUDENT_INVITATION_ENDPOINTS.preview}?${query}`,
    "GET",
    isPreviewResponse
  );
}

/**
 * Validate the invitation for the signed-in account. Sends the roster-email
 * OTP unless the account email already matches the roster email.
 */
export function claimStudentInvitation(
  token: string
): Promise<StudentInvitationClaimDto> {
  return requestJson(
    STUDENT_INVITATION_ENDPOINTS.claim,
    "POST",
    isClaimResult,
    { token }
  );
}

/** Complete acceptance; `otp` is omitted in same-email mode. */
export function verifyStudentInvitation(
  token: string,
  otp?: string
): Promise<StudentInvitationVerifyDto> {
  return requestJson(
    STUDENT_INVITATION_ENDPOINTS.verify,
    "POST",
    isVerifyResponse,
    otp === undefined ? { token } : { token, otp }
  );
}
