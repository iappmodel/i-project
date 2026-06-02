import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  computeReleaseEligibleAtForTier,
  canServerAutoSettleNowForTier,
  isAutoSettleEligibleTier,
  releaseDelaySecondsForTier,
  resolveTrustTier
} from "../../settlement/trust-tier.js";

describe("trust-tier", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  beforeEach(() => {
    process.env.POP_TRUST_T0_DELAY_SECONDS = "3600";
    process.env.POP_TRUST_T1_DELAY_SECONDS = "900";
    process.env.POP_TRUST_T2_DELAY_SECONDS = "0";
    delete process.env.POP_DEFAULT_TRUST_TIER;
    delete process.env.POP_TRUST_T1_ALLOWLIST;
    delete process.env.POP_TRUST_T2_ALLOWLIST;
  });

  it("defaults to t0_new", () => {
    expect(resolveTrustTier({ localUserRef: "user-a" })).toBe("t0_new");
  });

  it("honors allowlists", () => {
    process.env.POP_TRUST_T2_ALLOWLIST = "vip-user";
    process.env.POP_TRUST_T1_ALLOWLIST = "regular-user";
    expect(resolveTrustTier({ localUserRef: "vip-user" })).toBe("t2_trusted");
    expect(resolveTrustTier({ localUserRef: "regular-user" })).toBe("t1_established");
  });

  it("tiered release delays", () => {
    expect(releaseDelaySecondsForTier("t0_new")).toBe(3600);
    expect(releaseDelaySecondsForTier("t1_established")).toBe(900);
    expect(releaseDelaySecondsForTier("t2_trusted")).toBe(0);
    const at = computeReleaseEligibleAtForTier(
      "2026-06-02T12:00:00.000Z",
      "approved",
      "t1_established"
    );
    expect(at).toBe("2026-06-02T12:15:00.000Z");
  });

  it("auto-settle only for t2_trusted after release window", () => {
    expect(isAutoSettleEligibleTier("t0_new")).toBe(false);
    expect(isAutoSettleEligibleTier("t2_trusted")).toBe(true);
    expect(
      canServerAutoSettleNowForTier(
        "approved",
        "t0_new",
        null,
        Date.now()
      )
    ).toBe(false);
    expect(
      canServerAutoSettleNowForTier(
        "approved",
        "t2_trusted",
        "2099-01-01T00:00:00.000Z",
        Date.parse("2026-01-01")
      )
    ).toBe(false);
    expect(
      canServerAutoSettleNowForTier("approved", "t2_trusted", null, Date.now())
    ).toBe(true);
  });
});
