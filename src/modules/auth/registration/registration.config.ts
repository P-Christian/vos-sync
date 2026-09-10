import { RegistrationError } from "./registration.errors";

export interface RegistrationConfig {
  /** Exactly 32 bytes used only for the registration payload envelope. */
  payloadKey: Uint8Array;
  /** Independent secret used only for registration OTP HMACs/IP hashes. */
  otpHmacSecret: string;
  /** Server-only Turnstile secret (the shared helper reads the same env key). */
  turnstileSecret: string;
  directusBaseUrl: string;
  directusToken: string;
  isV2Enabled: boolean;
  otpLifetimeMs: number;
  maxOtpAttempts: number;
  resendCooldownMs: number;
  maxResends: number;
  challengeLifetimeMs: number;
  verificationLeaseDurationMs: number;
  maxCleanupBatch: number;
  rateLimitEmailHourly: number;
  rateLimitIpHourly: number;
}

export const REGISTRATION_CONSTANTS = {
  OTP_LIFETIME_MS: 10 * 60 * 1000, // 10 minutes
  MAX_OTP_ATTEMPTS: 5,
  RESEND_COOLDOWN_MS: 60 * 1000, // 60 seconds
  MAX_RESENDS: 5,
  CHALLENGE_LIFETIME_MS: 24 * 60 * 60 * 1000, // 24 hours
  VERIFICATION_LEASE_DURATION_MS: 30 * 1000, // 30 seconds
  MAX_CLEANUP_BATCH: 20,
  RATE_LIMIT_EMAIL_HOURLY: 5,
  RATE_LIMIT_IP_HOURLY: 15,
} as const;

const PAYLOAD_KEY_BYTES = 32;

/** Read the rollout flag without forcing unavailable Phase 3 secrets to load. */
export function isRegistrationV2Enabled(): boolean {
  return process.env.REGISTRATION_V2_ENABLED?.trim() === "true";
}

function configurationError(message: string): RegistrationError {
  return new RegistrationError(message, "CONFIGURATION_ERROR", 500);
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw configurationError(`${name} is not configured.`);
  }
  return value;
}

/**
 * Decode the payload key without deriving or inventing a fallback key. The
 * deployment contract is base64, but accepting an explicit 32-byte value is
 * useful for local secret stores that do not encode binary values.
 */
function resolvePayloadKey(rawKey: string): Uint8Array {
  const base64Candidate = rawKey.replace(/\s+/gu, "");
  const isBase64 =
    /^[A-Za-z0-9+/]+={0,2}$/u.test(base64Candidate) &&
    base64Candidate.length % 4 === 0;

  if (isBase64) {
    const decoded = Buffer.from(base64Candidate, "base64");
    if (decoded.length === PAYLOAD_KEY_BYTES) {
      return new Uint8Array(decoded);
    }
  }

  // Do not hash a weak/incorrect value into a key. Only an explicitly
  // supplied 32-byte value may use this compatibility form.
  const rawBytes = Buffer.from(rawKey, "utf8");
  if (rawBytes.length === PAYLOAD_KEY_BYTES) {
    return new Uint8Array(rawBytes);
  }

  throw configurationError(
    "REGISTRATION_PAYLOAD_KEY must decode to exactly 32 bytes (base64 recommended)."
  );
}

export function getRegistrationConfig(): RegistrationConfig {
  // Registration secrets are required whenever this module is used. The
  // rollout flag controls route exposure; it must not make cryptographic
  // helpers silently fall back to development keys.
  const payloadKey = resolvePayloadKey(
    readRequiredEnv("REGISTRATION_PAYLOAD_KEY")
  );
  const otpHmacSecret = readRequiredEnv("REGISTRATION_OTP_HMAC_SECRET");
  const turnstileSecret = readRequiredEnv("TURNSTILE_SECRET");
  const directusBaseUrl = readRequiredEnv(
    process.env.DIRECTUS_URL?.trim()
      ? "DIRECTUS_URL"
      : "NEXT_PUBLIC_API_BASE_URL"
  ).replace(/\/$/u, "");
  const directusToken = readRequiredEnv("DIRECTUS_STATIC_TOKEN");

  return {
    payloadKey,
    otpHmacSecret,
    turnstileSecret,
    directusBaseUrl,
    directusToken,
    isV2Enabled: isRegistrationV2Enabled(),
    otpLifetimeMs: REGISTRATION_CONSTANTS.OTP_LIFETIME_MS,
    maxOtpAttempts: REGISTRATION_CONSTANTS.MAX_OTP_ATTEMPTS,
    resendCooldownMs: REGISTRATION_CONSTANTS.RESEND_COOLDOWN_MS,
    maxResends: REGISTRATION_CONSTANTS.MAX_RESENDS,
    challengeLifetimeMs: REGISTRATION_CONSTANTS.CHALLENGE_LIFETIME_MS,
    verificationLeaseDurationMs:
      REGISTRATION_CONSTANTS.VERIFICATION_LEASE_DURATION_MS,
    maxCleanupBatch: REGISTRATION_CONSTANTS.MAX_CLEANUP_BATCH,
    rateLimitEmailHourly: REGISTRATION_CONSTANTS.RATE_LIMIT_EMAIL_HOURLY,
    rateLimitIpHourly: REGISTRATION_CONSTANTS.RATE_LIMIT_IP_HOURLY,
  };
}
