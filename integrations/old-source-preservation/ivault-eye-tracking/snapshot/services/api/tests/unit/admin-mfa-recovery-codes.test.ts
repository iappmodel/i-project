import { describe, expect, it } from "vitest";
import {
  generateRecoveryCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode
} from "../../src/modules/admin-mfa/admin-mfa.recovery-codes";

describe("admin MFA recovery codes", () => {
  it("generates recovery codes", () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  });

  it("generates unique recovery codes", () => {
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });

  it("normalizes recovery code", () => {
    expect(normalizeRecoveryCode(" abcd2-efgh3 ")).toBe("ABCD2-EFGH3");
  });

  it("hashes recovery code deterministically", () => {
    process.env.ADMIN_MFA_RECOVERY_CODE_PEPPER = "test-pepper";

    const input = {
      adminAuthUserId: "00000000-0000-0000-0000-000000000000",
      code: "ABCDE-23456"
    };

    expect(hashRecoveryCode(input)).toBe(hashRecoveryCode(input));
    expect(hashRecoveryCode(input)).toMatch(/^[a-f0-9]{64}$/);
  });
});
