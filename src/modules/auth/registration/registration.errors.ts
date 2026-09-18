export type RegistrationErrorCode =
  | "INVALID_REQUEST"
  | "CONFIGURATION_ERROR"
  | "CAPTCHA_REQUIRED"
  | "CAPTCHA_FAILED"
  | "RATE_LIMITED"
  | "EMAIL_ALREADY_REGISTERED"
  | "REGISTRATION_RESTRICTED"
  | "COMPANY_EMAIL_CONFLICT"
  | "COMPANY_TIN_CONFLICT"
  | "SCHOOL_CONFLICT"
  | "INVITATION_INVALID"
  | "CHALLENGE_NOT_FOUND"
  | "CHALLENGE_EXPIRED"
  | "CHALLENGE_LOCKED"
  | "CHALLENGE_CONSUMED"
  | "CHALLENGE_CANCELLED"
  | "RESEND_COOLDOWN"
  | "RESEND_LIMIT_REACHED"
  | "OTP_INVALID"
  | "PAYLOAD_INVALID"
  | "PROVISIONING_IN_PROGRESS"
  | "PROVISIONING_CONFLICT"
  | "PROVISIONING_FAILED"
  | "MAIL_DELIVERY_FAILED"
  | "LEGACY_REGISTRATION_RETIRED";

export interface RegistrationErrorOptions {
  remainingAttempts?: number;
  resendAvailableAt?: string;
  details?: unknown;
}

export class RegistrationError extends Error {
  public readonly code: RegistrationErrorCode;
  public readonly statusCode: number;
  public readonly remainingAttempts?: number;
  public readonly resendAvailableAt?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: RegistrationErrorCode,
    statusCode = 400,
    options?: RegistrationErrorOptions
  ) {
    super(message);
    this.name = "RegistrationError";
    this.code = code;
    this.statusCode = statusCode;
    this.remainingAttempts = options?.remainingAttempts;
    this.resendAvailableAt = options?.resendAvailableAt;
    this.details = options?.details;

    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RegistrationError);
    }
  }

  public toJSON() {
    return {
      ok: false,
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
