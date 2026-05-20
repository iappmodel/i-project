import { describe, expect, it } from "vitest";
import { evaluateAdminReviewHook } from "../admin-review-hook-engine";
import { buildReviewCaseParamsFromHook } from "../review-case-factory";
import type { AdminReviewHookInput } from "@/types/alphabet/admin-review-hooks.types";

describe("review-case-factory", () => {
  it("maps hook evaluation to review case params", () => {
    const input: AdminReviewHookInput = {
      hookSource: "external_transfer",
      hookTrigger: "external_transfer_unknown",
      subjectIds: {
        userId: "user_1",
        walletId: "wallet_1",
        externalTransferId: "transfer_1"
      },
      sourceObjectType: "external_transfer",
      sourceObjectId: "transfer_1",
      rawEvidence: {
        providerRawPayload: {
          bankToken: "secret"
        },
        status: "provider_unknown"
      },
      sourceEventIds: ["event_1"],
      riskScore: 0.8,
      uncertaintyScore: 0.9,
      userImpactScore: 0.8,
      platformImpactScore: 0.8,
      moneyMovementPossible: true,
      paymentUncertainty: true,
      fraudSuspected: false,
      userVisible: true,
      existingOpenReviewCaseCount: 0,
      now: new Date().toISOString(),
      metadata: {}
    };

    const evaluation = evaluateAdminReviewHook(input);
    const params = buildReviewCaseParamsFromHook({ input, evaluation });

    expect(params.reviewCaseType).toBe("external_transfer_review");
    expect(params.reviewTrigger).toBe("external_transfer_unknown");
    expect(params.userId).toBe("user_1");
    expect(params.externalTransferId).toBe("transfer_1");
    expect(params.idempotencyKey).toContain("review-hook");
    expect(params.dedupeKey).toContain("review-case");
    expect(params.redactedEvidence.providerRawPayload).toBe("[REDACTED]");
  });
});
