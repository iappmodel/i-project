import { describe, expect, it } from "vitest";
import { evaluateAdminReviewHook } from "../admin-review-hook-engine";
import type { AdminReviewHookInput } from "@/types/alphabet/admin-review-hooks.types";

function makeInput(overrides: Partial<AdminReviewHookInput> = {}): AdminReviewHookInput {
  return {
    hookSource: "external_transfer",
    hookTrigger: "external_transfer_unknown",

    subjectIds: {
      userId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      externalTransferId: crypto.randomUUID()
    },

    sourceObjectType: "external_transfer",
    sourceObjectId: crypto.randomUUID(),

    rawEvidence: {
      status: "provider_unknown"
    },

    publicSummary: "External transfer needs review.",
    internalSummary: "Provider state unknown.",

    sourceEventIds: [crypto.randomUUID()],

    riskScore: 0.8,
    uncertaintyScore: 0.95,
    userImpactScore: 0.9,
    platformImpactScore: 0.9,

    moneyMovementPossible: true,
    paymentUncertainty: true,
    fraudSuspected: false,
    userVisible: true,

    existingOpenReviewCaseCount: 0,

    now: new Date().toISOString(),
    metadata: {},
    ...overrides
  };
}

describe("admin-review-hook-engine", () => {
  it("creates case for external transfer unknown", () => {
    const result = evaluateAdminReviewHook(makeInput());

    expect(result.status).toBe("review_hook_create_case");
    expect(result.shouldCreateCase).toBe(true);
    expect(result.reviewCaseType).toBe("external_transfer_review");
    expect(result.severity).toBe("critical");
  });

  it("skips duplicate when duplicate risk is too high", () => {
    const result = evaluateAdminReviewHook(
      makeInput({
        existingOpenReviewCaseCount: 4
      })
    );

    expect(result.status).toBe("review_hook_skip_duplicate");
  });

  it("noops when risk and uncertainty are too low", () => {
    const result = evaluateAdminReviewHook(
      makeInput({
        riskScore: 0.05,
        uncertaintyScore: 0.05,
        paymentUncertainty: false,
        moneyMovementPossible: false
      })
    );

    expect(result.status).toBe("review_hook_noop");
  });

  it("creates fraud review for high fraud risk", () => {
    const result = evaluateAdminReviewHook(
      makeInput({
        hookSource: "fraud_engine",
        hookTrigger: "fraud_risk_above_threshold",
        riskScore: 0.9,
        uncertaintyScore: 0.4,
        fraudSuspected: true
      })
    );

    expect(result.status).toBe("review_hook_create_case");
    expect(result.reviewCaseType).toBe("fraud_review");
    expect(result.severity).toBe("critical");
  });

  it("fails when no rule exists", () => {
    const result = evaluateAdminReviewHook(
      makeInput({
        hookTrigger: "__no_active_rule_test__" as AdminReviewHookInput["hookTrigger"]
      })
    );

    expect(result.status).toBe("review_hook_failed");
  });
});
