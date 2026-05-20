import { describe, expect, it } from "vitest";
import { redactEvidence } from "../evidence-redactor";

describe("evidence-redactor", () => {
  it("redacts sensitive top-level keys", () => {
    const result = redactEvidence({
      amount: 25,
      bankToken: "secret"
    });

    expect(result).toEqual({
      amount: 25,
      bankToken: "[REDACTED]"
    });
  });

  it("redacts nested sensitive keys", () => {
    const result = redactEvidence({
      provider: {
        paymentToken: "secret",
        status: "failed"
      }
    });

    expect(result).toEqual({
      provider: {
        paymentToken: "[REDACTED]",
        status: "failed"
      }
    });
  });
});
