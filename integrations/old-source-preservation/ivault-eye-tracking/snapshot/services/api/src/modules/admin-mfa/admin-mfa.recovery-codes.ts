import crypto from "node:crypto";

const RECOVERY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomChar() {
  const index = crypto.randomInt(0, RECOVERY_CODE_ALPHABET.length);
  return RECOVERY_CODE_ALPHABET[index];
}

export function generateRecoveryCode() {
  const left = Array.from({ length: 5 }, randomChar).join("");
  const right = Array.from({ length: 5 }, randomChar).join("");
  return `${left}-${right}`;
}

export function generateRecoveryCodes(count = 10) {
  const safeCount = Math.min(Math.max(count, 1), 20);
  const codes = new Set<string>();

  while (codes.size < safeCount) {
    codes.add(generateRecoveryCode());
  }

  return Array.from(codes);
}

export function normalizeRecoveryCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function hashRecoveryCode(input: { adminAuthUserId: string; code: string }) {
  const pepper = process.env.ADMIN_MFA_RECOVERY_CODE_PEPPER ?? "";
  if (!pepper) {
    throw new Error("ADMIN_MFA_RECOVERY_CODE_PEPPER is not configured");
  }

  const normalized = normalizeRecoveryCode(input.code);
  return crypto
    .createHash("sha256")
    .update(`${input.adminAuthUserId}.${normalized}.${pepper}`)
    .digest("hex");
}
