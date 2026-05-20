import { describe, expect, it } from "vitest";
import { evaluateTrustFraudReview } from "../trust-fraud-review-engine";
import type { TrustFraudReviewSignalInput } from "@/types/alphabet/trust-fraud-review.types";

function counts() {
  return {
    userCount: 10,
    walletCount: 10,
    walletAccountCount: 10,
    ledgerEntryCount: 2,
    alphabetEventCount: 20,
    trustEventCount: 2,
    uValueEventCount: 2,
    rewardEventCount: 5,
    payoutCount: 1,
    campaignCount: 1,
    deviceSignalCount: 1,
    presenceSignalCount: 1,
    policyDecisionCount: 1,
    adminReviewCaseCount: 0,
    operationalAlertCount: 0
  };
}

function input(overrides: Partial<TrustFraudReviewSignalInput> = {}): TrustFraudReviewSignalInput {
  return {
    batchScope: "global_daily",
    batchObjectId: "7a8af415-fb84-4cb7-8f82-b0df40e2f4c0",
    batchDate: "2026-04-27",
    periodStart: "2026-04-27T00:00:00.000Z",
    periodEnd: "2026-04-28T00:00:00.000Z",
    counts: counts(),
    findings: [],
    sourceEventIds: [],
    generatedBy: "test",
    now: new Date().toISOString(),
    metadata: {},
    ...overrides
  };
}

describe("trust-fraud-review-engine", () => {
  it("marks clean batch", () => {
    const result = evaluateTrustFraudReview(input());
    expect(result.status).toBe("trust_fraud_clean");
    expect(result.clean).toBe(true);
  });

  it("requires review for critical payout finding", () => {
    const result = evaluateTrustFraudReview(
      input({
        findings: [
          {
            findingId: "finding_1",
            findingType: "payout_risk_above_threshold",
            category: "payout",
            severity: "critical",
            title: "Payout risk",
            summary: "Payout risk above threshold.",
            linkedObjectIds: {
              userId: "user_1",
              externalTransferId: "transfer_1"
            },
            scores: {
              trustRiskScore: 0.2,
              fraudRiskScore: 0.8,
              walletRiskScore: 0.8,
              payoutRiskScore: 0.95,
              campaignRiskScore: 0,
              agePolicyRiskScore: 0,
              identityRiskScore: 0.2,
              deviceRiskScore: 0.2,
              rewardAbuseRiskScore: 0,
              presenceRiskScore: 0,
              confidenceScore: 0.95
            },
            recommendedActions: ["create_review_case", "restrict_withdrawals"],
            evidence: {},
            redactedEvidence: {},
            reasonCodes: ["payout_risk_above_threshold"]
          }
        ]
      })
    );

    expect(result.requiresReview).toBe(true);
    expect(result.shouldCreateReviewCase).toBe(true);
  });

  it("requires review for sybil cluster candidate", () => {
    const result = evaluateTrustFraudReview(
      input({
        findings: [
          {
            findingId: "finding_2",
            findingType: "sybil_cluster_candidate",
            category: "identity",
            severity: "critical",
            title: "Sybil candidate",
            summary: "Identity cluster risk.",
            linkedObjectIds: {
              identityClusterId: "identity_cluster_1"
            },
            scores: {
              trustRiskScore: 0.4,
              fraudRiskScore: 0.95,
              walletRiskScore: 0.2,
              payoutRiskScore: 0.2,
              campaignRiskScore: 0,
              agePolicyRiskScore: 0,
              identityRiskScore: 0.95,
              deviceRiskScore: 0.8,
              rewardAbuseRiskScore: 0.4,
              presenceRiskScore: 0.3,
              confidenceScore: 0.9
            },
            recommendedActions: ["create_review_case", "request_reverification"],
            evidence: {},
            redactedEvidence: {},
            reasonCodes: ["sybil_cluster_candidate"]
          }
        ]
      })
    );

    expect(result.requiresReview).toBe(true);
  });

  it("warns for low severity finding", () => {
    const result = evaluateTrustFraudReview(
      input({
        findings: [
          {
            findingId: "finding_3",
            findingType: "reward_velocity_spike",
            category: "reward",
            severity: "warning",
            title: "Reward spike",
            summary: "Low reward spike.",
            linkedObjectIds: { userId: "user_1" },
            scores: {
              trustRiskScore: 0.1,
              fraudRiskScore: 0.2,
              walletRiskScore: 0,
              payoutRiskScore: 0,
              campaignRiskScore: 0,
              agePolicyRiskScore: 0,
              identityRiskScore: 0,
              deviceRiskScore: 0,
              rewardAbuseRiskScore: 0.3,
              presenceRiskScore: 0,
              confidenceScore: 0.9
            },
            recommendedActions: ["monitor"],
            evidence: {},
            redactedEvidence: {},
            reasonCodes: ["reward_velocity_spike_detected"]
          }
        ]
      })
    );

    expect(result.warning || result.clean).toBe(true);
  });
});
