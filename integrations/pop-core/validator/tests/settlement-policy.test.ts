import { describe, expect, it } from "vitest";

import {
  computeReleaseEligibleAt,
  canServerAutoSettleNow,
  readServerSettlementPolicy
} from "../src/settlement-policy.js";

describe("settlement-policy", () => {
  it("release delay applies to approved holds by trust tier", () => {
    process.env.POP_TRUST_T1_DELAY_SECONDS = "60";
    const policy = readServerSettlementPolicy();
    const at = computeReleaseEligibleAt(
      "2026-06-02T12:00:00.000Z",
      "approved",
      policy,
      "t1_established"
    );
    expect(at).toBe("2026-06-02T12:01:00.000Z");
  });

  it("pending review has no release eligibility", () => {
    const policy = readServerSettlementPolicy();
    expect(computeReleaseEligibleAt("2026-06-02T12:00:00.000Z", "pending", policy)).toBeNull();
  });

  it("canServerAutoSettleNow respects release_eligible_at", () => {
    expect(
      canServerAutoSettleNow("approved", "2099-01-01T00:00:00.000Z", Date.parse("2026-01-01"))
    ).toBe(false);
    expect(canServerAutoSettleNow("approved", null, Date.now(), "t2_trusted")).toBe(true);
    expect(canServerAutoSettleNow("approved", null, Date.now(), "t0_new")).toBe(false);
  });
});
