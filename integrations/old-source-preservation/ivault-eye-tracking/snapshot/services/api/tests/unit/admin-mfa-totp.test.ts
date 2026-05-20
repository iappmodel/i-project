import { generateSync } from "otplib";
import { describe, expect, it } from "vitest";
import {
  buildTotpOtpAuthUrl,
  generateTotpSecret,
  verifyTotpCode
} from "../../src/modules/admin-mfa/admin-mfa.totp";

describe("admin MFA TOTP", () => {
  it("generates and verifies a TOTP code", () => {
    const secret = generateTotpSecret();
    const token = generateSync({
      strategy: "totp",
      secret
    });

    expect(
      verifyTotpCode({
        token,
        secret,
        window: 1
      })
    ).toBe(true);
  });

  it("builds otpauth url", () => {
    const secret = generateTotpSecret();

    const url = buildTotpOtpAuthUrl({
      issuer: "i Admin",
      accountName: "admin@example.com",
      secret
    });

    expect(url).toContain("otpauth://totp/");
    expect(url).toContain("issuer=i%20Admin");
  });
});
