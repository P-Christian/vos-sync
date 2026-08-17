import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const secret = process.env.MESSAGE_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("MESSAGE_ENCRYPTION_KEY is not configured.");
  }

  const key = Buffer.from(secret, "base64");

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      "MESSAGE_ENCRYPTION_KEY must be a base64-encoded 32-byte key."
    );
  }

  return key;
}

/**
 * Encrypts plaintext message using AES-256-GCM.
 * Output format: "v1:<ivBase64>:<authTagBase64>:<ciphertextBase64>"
 */
export function encryptMessage(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypts a versioned AES-256-GCM ciphertext payload.
 */
export function decryptMessage(payload: string): string {
  const [version, ivBase64, authTagBase64, encryptedBase64] =
    payload.split(":");

  if (version !== "v1") {
    throw new Error("Unsupported message encryption version.");
  }

  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error("Invalid encrypted message format.");
  }

  const key = getKey();

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Safely decrypts message_content:
 * - If null/undefined, returns null.
 * - If legacy plaintext (does not start with "v1:"), returns plaintext as-is.
 * - If starts with "v1:", decrypts and returns plaintext, falling back to "[Unable to decrypt message]" on error.
 */
export function safeDecryptMessage(
  content: string | null | undefined
): string | null {
  if (content == null) return null;
  if (typeof content !== "string") return null;

  if (content.startsWith("v1:")) {
    try {
      return decryptMessage(content);
    } catch (error) {
      console.error("Failed to decrypt message:", error);
      return "[Unable to decrypt message]";
    }
  }

  // Legacy plaintext fallback
  return content;
}
