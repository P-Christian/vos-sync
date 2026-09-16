import crypto from "crypto";
import * as jose from "jose";
import type {
  RegistrationRole,
  SealedRegistrationPayloadV1,
} from "./registration.types";
import { RegistrationError } from "./registration.errors";
import {
  MAX_SEALED_PAYLOAD_LENGTH,
  normalizeEmail,
  sealedRegistrationPayloadSchema,
} from "./registration.schemas";

const PAYLOAD_KEY_BYTES = 32;
const MAX_CLOCK_SKEW_MS = 30_000;
const PAYLOAD_JWE_TYPE = "vos-registration";
const PAYLOAD_VERSION = "1";

function configurationError(message: string): RegistrationError {
  return new RegistrationError(message, "CONFIGURATION_ERROR", 500);
}

function assertPayloadKey(key: Uint8Array): void {
  if (!(key instanceof Uint8Array) || key.byteLength !== PAYLOAD_KEY_BYTES) {
    throw configurationError(
      "Registration payload encryption key must be exactly 32 bytes."
    );
  }
}

function assertSecret(secret: string): void {
  if (typeof secret !== "string" || secret.trim().length === 0) {
    throw configurationError("Registration cryptographic secret is not configured.");
  }
}

/** Generate a cryptographically secure six-digit numeric OTP. */
export function generateOtp(): string {
  return crypto.randomInt(100_000, 1_000_000).toString();
}

/** Generate a cryptographically secure UUID for a challenge identifier. */
export function generateChallengeId(): string {
  return crypto.randomUUID();
}

/** Compute HMAC-SHA256 of the challenge-bound OTP value. */
export function computeOtpHmac(
  challengeId: string,
  otp: string,
  secret: string
): string {
  assertSecret(secret);
  return crypto
    .createHmac("sha256", secret)
    .update(`${challengeId}:${otp}`)
    .digest("hex");
}

/**
 * Verify a submitted OTP using equal-length binary digests and a constant-
 * time comparison. Invalid input fails closed without doing a provider call.
 */
export function verifyOtpHmac(
  challengeId: string,
  submittedOtp: string,
  expectedHmacHex: string,
  secret: string
): boolean {
  if (
    typeof submittedOtp !== "string" ||
    !/^\d{6}$/u.test(submittedOtp.trim()) ||
    typeof expectedHmacHex !== "string" ||
    !/^[a-f0-9]{64}$/iu.test(expectedHmacHex)
  ) {
    return false;
  }

  try {
    const computed = Buffer.from(
      computeOtpHmac(challengeId, submittedOtp.trim(), secret),
      "hex"
    );
    const expected = Buffer.from(expectedHmacHex, "hex");

    if (computed.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(computed, expected);
  } catch (error: unknown) {
    // A missing secret is a configuration failure, but this low-level
    // predicate still fails closed for callers that only need a boolean.
    if (error instanceof RegistrationError && error.code === "CONFIGURATION_ERROR") {
      return false;
    }
    throw error;
  }
}

/** Compute SHA-256 of the exact ciphertext returned to the browser. */
export function computePayloadDigest(ciphertext: string): string {
  if (typeof ciphertext !== "string") {
    throw new RegistrationError(
      "Invalid encrypted registration payload.",
      "PAYLOAD_INVALID",
      400
    );
  }

  return crypto.createHash("sha256").update(ciphertext, "utf8").digest("hex");
}

/** Hash an IP address with the OTP secret; never persist the raw address. */
export function hashClientIp(ip: string, secret: string): string {
  assertSecret(secret);
  return crypto
    .createHmac("sha256", secret)
    .update(ip.trim())
    .digest("hex");
}

/** Encrypt a server-produced payload using compact JWE (dir + A256GCM). */
export async function encryptRegistrationPayload(
  payload: SealedRegistrationPayloadV1,
  key: Uint8Array
): Promise<string> {
  assertPayloadKey(key);

  const validatedPayload = sealedRegistrationPayloadSchema.safeParse(payload);
  if (!validatedPayload.success) {
    throw new RegistrationError(
      "Invalid sealed registration payload.",
      "PAYLOAD_INVALID",
      400
    );
  }

  const plaintext = new TextEncoder().encode(
    JSON.stringify(validatedPayload.data)
  );

  const ciphertext = await new jose.CompactEncrypt(plaintext)
    .setProtectedHeader({
      alg: "dir",
      enc: "A256GCM",
      typ: PAYLOAD_JWE_TYPE,
      v: PAYLOAD_VERSION,
    })
    .encrypt(key);

  // This guards future additions to the payload schema from accidentally
  // making browser responses unbounded.
  if (ciphertext.length > MAX_SEALED_PAYLOAD_LENGTH) {
    throw new RegistrationError(
      "Registration payload is too large.",
      "INVALID_REQUEST",
      400
    );
  }

  return ciphertext;
}

export interface RegistrationPayloadDecryptContext {
  challengeId?: string;
  role?: RegistrationRole;
  email?: string;
  nowMs?: number;
  /** Optional row expiry used to enforce payload/challenge expiry alignment. */
  challengeExpiresAtMs?: number;
}

/**
 * Decrypt, authenticate, and validate a compact JWE registration payload.
 * Context binding is performed after authenticated decryption and before the
 * payload is returned to provisioning code.
 */
export async function decryptRegistrationPayload(
  ciphertext: string,
  key: Uint8Array,
  context?: RegistrationPayloadDecryptContext
): Promise<SealedRegistrationPayloadV1> {
  assertPayloadKey(key);

  if (
    typeof ciphertext !== "string" ||
    ciphertext.length === 0 ||
    ciphertext.length > MAX_SEALED_PAYLOAD_LENGTH
  ) {
    throw new RegistrationError(
      "Invalid encrypted registration payload.",
      "PAYLOAD_INVALID",
      400
    );
  }

  try {
    const { plaintext, protectedHeader } = await jose.compactDecrypt(
      ciphertext,
      key
    );

    if (
      protectedHeader.alg !== "dir" ||
      protectedHeader.enc !== "A256GCM" ||
      protectedHeader.typ !== PAYLOAD_JWE_TYPE ||
      protectedHeader.v !== PAYLOAD_VERSION
    ) {
      throw new RegistrationError(
        "Invalid encrypted payload header.",
        "PAYLOAD_INVALID",
        400
      );
    }

    const json = new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
    const parsed = JSON.parse(json) as unknown;
    const validated = sealedRegistrationPayloadSchema.safeParse(parsed);

    if (!validated.success) {
      throw new RegistrationError(
        "Invalid sealed payload structure.",
        "PAYLOAD_INVALID",
        400
      );
    }

    const payload = validated.data;
    const nowMs = context?.nowMs ?? Date.now();

    if (
      payload.issuedAt > nowMs + MAX_CLOCK_SKEW_MS ||
      payload.expiresAt <= nowMs
    ) {
      throw new RegistrationError(
        "Sealed registration payload has expired or is not yet valid.",
        "PAYLOAD_INVALID",
        400
      );
    }

    if (
      context?.challengeExpiresAtMs !== undefined &&
      (!Number.isFinite(context.challengeExpiresAtMs) ||
        payload.expiresAt > context.challengeExpiresAtMs)
    ) {
      throw new RegistrationError(
        "Sealed payload expiry does not match the registration challenge.",
        "PAYLOAD_INVALID",
        400
      );
    }

    if (
      context?.challengeId !== undefined &&
      payload.challengeId !== context.challengeId
    ) {
      throw new RegistrationError(
        "Sealed payload does not match the registration challenge.",
        "PAYLOAD_INVALID",
        400
      );
    }

    if (context?.role !== undefined && payload.role !== context.role) {
      throw new RegistrationError(
        "Sealed payload does not match the registration challenge.",
        "PAYLOAD_INVALID",
        400
      );
    }

    if (
      context?.email !== undefined &&
      payload.email !== normalizeEmail(context.email)
    ) {
      throw new RegistrationError(
        "Sealed payload does not match the registration challenge.",
        "PAYLOAD_INVALID",
        400
      );
    }

    return validated.data as SealedRegistrationPayloadV1;
  } catch (error: unknown) {
    if (error instanceof RegistrationError) throw error;

    // Never expose jose/parser/provider details to a caller. In particular,
    // do not include plaintext, ciphertext, or key material in this error.
    throw new RegistrationError(
      "Failed to decrypt or authenticate registration payload.",
      "PAYLOAD_INVALID",
      400
    );
  }
}

/** Mask an email for safe challenge responses. */
export function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");

  if (atIndex <= 0 || atIndex === normalized.length - 1) return "***";

  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);

  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }

  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}
