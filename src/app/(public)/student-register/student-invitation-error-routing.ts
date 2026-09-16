import {
  isStudentInvitationApiError,
  type StudentInvitationApiError,
} from "./student-invitation.api";
import type { StudentInvitationTerminalVariant } from "./terminal-screen";

export type StudentInvitationOtpView = {
  readonly emailMasked: string;
  readonly otpExpiresAt: string | null;
  readonly resendAvailableAt: string | null;
  readonly acceptanceRetry: boolean;
};

export type StudentInvitationErrorSurface =
  | "preview"
  | "claim"
  | "same_email"
  | "otp"
  | "resend";

export type StudentInvitationErrorRoute =
  | { readonly kind: "terminal"; readonly variant: StudentInvitationTerminalVariant }
  | { readonly kind: "sign_in" }
  | {
      readonly kind: "otp";
      readonly acceptanceRetry: boolean;
      readonly message: string;
      readonly attemptsRemaining: number | null;
      readonly resendAvailableAt: string | null;
    }
  | { readonly kind: "preview_retry"; readonly message: string }
  | { readonly kind: "claim_retry"; readonly message: string }
  | { readonly kind: "same_email_retry"; readonly message: string }
  | {
      readonly kind: "otp_retry";
      readonly message: string;
      readonly resendAvailableAt: string | null;
    };

export function routeStudentInvitationError(
  error: unknown,
  surface: StudentInvitationErrorSurface
): StudentInvitationErrorRoute {
  if (!isStudentInvitationApiError(error)) {
    return retryRoute(surface, "Network error. Please try again.", null);
  }

  switch (error.code) {
    case "INVALID_REQUEST":
    case "INVITATION_INVALID":
      return { kind: "terminal", variant: "invalid" };
    case "INVITATION_EXPIRED":
      return { kind: "terminal", variant: "expired" };
    case "INVITATION_USED":
      return { kind: "terminal", variant: "used" };
    case "INVITATION_ROLE_INVALID":
    case "INVITATION_OWNERSHIP_CONFLICT":
      return { kind: "terminal", variant: "conflict" };
    case "UNAUTHENTICATED":
      return { kind: "sign_in" };
    case "INVITATION_CHALLENGE_IN_PROGRESS":
      return otpRoute(error, true);
    case "INVITATION_CHALLENGE_LOCKED":
    case "OTP_REQUIRED":
    case "OTP_INVALID":
    case "OTP_EXPIRED":
      return otpRoute(error, false);
    case "RATE_LIMITED":
      return surface === "claim" && error.resendAvailableAt
        ? otpRoute(error, false)
        : retryRoute(surface, error.message, error.resendAvailableAt);
    case "SERVICE_UNAVAILABLE":
      return retryRoute(surface, error.message, error.resendAvailableAt);
    default:
      return assertNever(error.code);
  }
}

function otpRoute(
  error: StudentInvitationApiError,
  acceptanceRetry: boolean
): StudentInvitationErrorRoute {
  return {
    kind: "otp",
    acceptanceRetry,
    message: error.message,
    attemptsRemaining: acceptanceRetry ? null : error.attemptsRemaining,
    resendAvailableAt: error.resendAvailableAt,
  };
}

function retryRoute(
  surface: StudentInvitationErrorSurface,
  message: string,
  resendAvailableAt: string | null
): StudentInvitationErrorRoute {
  switch (surface) {
    case "preview":
      return { kind: "preview_retry", message };
    case "claim":
      return { kind: "claim_retry", message };
    case "same_email":
      return { kind: "same_email_retry", message };
    case "otp":
    case "resend":
      return { kind: "otp_retry", message, resendAvailableAt };
    default:
      return assertNever(surface);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled student invitation variant: ${String(value)}`);
}
