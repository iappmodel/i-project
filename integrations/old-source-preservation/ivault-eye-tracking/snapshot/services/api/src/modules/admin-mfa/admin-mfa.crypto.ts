import crypto from "node:crypto";

function getEncryptionKey(): Buffer {
  const raw = process.env.ADMIN_MFA_ENCRYPTION_KEY_BASE64;

  if (!raw) {
    throw new Error("ADMIN_MFA_ENCRYPTION_KEY_BASE64 is not configured");
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error("ADMIN_MFA_ENCRYPTION_KEY_BASE64 must decode to 32 bytes");
  }

  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url")
  ].join(".");
}

export function decryptSecret(encoded: string): string {
  const [version, ivRaw, tagRaw, ciphertextRaw] = encoded.split(".");

  if (version !== "v1" || !ivRaw || !tagRaw || !ciphertextRaw) {
    throw new Error("invalid encrypted secret format");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivRaw, "base64url");
  const tag = Buffer.from(tagRaw, "base64url");
  const ciphertext = Buffer.from(ciphertextRaw, "base64url");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return plaintext.toString("utf8");
}
