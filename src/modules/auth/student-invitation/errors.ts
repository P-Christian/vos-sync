/**
 * Stable machine-readable error codes for the student-invitation APIs.
 *
 * These strings are part of the public API contract that clients switch on:
 * treat the list as append-only and never rename or reuse an existing code.
 */
export const STUDENT_INVITATION_ERROR_CODES = [
  "UNAUTHENTICATED",
  "INVALID_REQUEST",
  "INVITATION_INVALID",
  "INVITATION_EXPIRED",
  "INVITATION_USED",
  "INVITATION_ROLE_INVALID",
  "INVITATION_OWNERSHIP_CONFLICT",
  "INVITATION_CHALLENGE_LOCKED",
  "INVITATION_CHALLENGE_IN_PROGRESS",
  "OTP_REQUIRED",
  "OTP_INVALID",
  "OTP_EXPIRED",
  "RATE_LIMITED",
  "SERVICE_UNAVAILABLE",
] as const;

/** Any code the student-invitation APIs can return in an error body. */
export type StudentInvitationErrorCode =
  (typeof STUDENT_INVITATION_ERROR_CODES)[number];
