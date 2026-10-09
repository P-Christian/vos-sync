// src/lib/ai/encryption.ts
// Secure server-side credential encryption at rest and masking.
// Never expose raw keys in responses, logs, or client-side code.

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

/** Derive a 32-byte master encryption key from environment secrets */
function getMasterSecret(): Buffer {
  const secret =
    process.env.AI_CREDENTIALS_SECRET ||
    process.env.DIRECTUS_STATIC_TOKEN ||
    process.env.AUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[ai-encryption] FATAL: Missing AI_CREDENTIALS_SECRET, DIRECTUS_STATIC_TOKEN, or AUTH_SECRET in production environment."
      );
    }
    console.warn(
      "[ai-encryption] ⚠️ No encryption secret defined in environment. Using dev-only volatile fallback key."
    );
    return crypto.createHash("sha256").update("vos-sync-dev-volatile-key").digest();
  }

  return crypto.createHash("sha256").update(secret).digest();
}

/** Encrypt raw API key using AES-256-GCM */
export function encryptApiKey(rawKey: string): string {
  if (!rawKey) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterSecret(), iv);

  const encrypted = Buffer.concat([cipher.update(rawKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: iv:tag:ciphertext (all in hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypt raw API key using AES-256-GCM */
export function decryptApiKey(encryptedPayload?: string): string {
  if (!encryptedPayload) return "";
  // If not in iv:tag:ciphertext format, could be unencrypted fallback
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) return encryptedPayload;

  try {
    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const encryptedText = Buffer.from(parts[2], "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, getMasterSecret(), iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("[ai-encryption] ❌ Failed to decrypt API key:", err instanceof Error ? err.message : err);
    return "";
  }
}

/** Mask API key for client-safe responses (e.g., "sk-...a1b2") */
export function maskApiKey(rawOrEncryptedKey?: string): string {
  if (!rawOrEncryptedKey) return "";
  const raw = decryptApiKey(rawOrEncryptedKey);
  if (!raw || raw.length <= 8) return "••••••••";
  const start = raw.slice(0, 4);
  const end = raw.slice(-4);
  return `${start}...${end}`;
}
