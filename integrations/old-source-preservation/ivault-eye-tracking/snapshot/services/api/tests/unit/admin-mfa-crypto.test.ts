import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../../src/modules/admin-mfa/admin-mfa.crypto";

describe("admin MFA crypto", () => {
  it("encrypts and decrypts a secret", () => {
    process.env.ADMIN_MFA_ENCRYPTION_KEY_BASE64 = Buffer.alloc(32, 7).toString("base64");

    const secret = "ABCDEF123456";
    const encrypted = encryptSecret(secret);

    expect(encrypted).not.toBe(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("uses different ciphertext for same plaintext", () => {
    process.env.ADMIN_MFA_ENCRYPTION_KEY_BASE64 = Buffer.alloc(32, 7).toString("base64");

    const a = encryptSecret("same-secret");
    const b = encryptSecret("same-secret");

    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same-secret");
    expect(decryptSecret(b)).toBe("same-secret");
  });
});
