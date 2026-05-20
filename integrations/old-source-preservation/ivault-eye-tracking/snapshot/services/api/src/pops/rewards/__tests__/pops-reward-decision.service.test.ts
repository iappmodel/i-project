import { describe, expect, it } from "vitest";
import {
  POPS_COMPLETION_LEVEL,
  POPS_REWARD_DECISION_STATUS
} from "../pops-reward-decision.types";
import { PopsRewardDecisionService } from "../pops-reward-decision.service";
import { MockPopsWalletIntegration } from "../pops-wallet-integration";

function baseRequest() {
  return {
    sessionId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    campaignId: crypto.randomUUID(),
    contentId: crypto.randomUUID(),
    coinType: "ICOIN",
    baseAmount: 500,
    trustTier: 3,
    campaignMultiplier: 1.0,
    completionLevel: POPS_COMPLETION_LEVEL.COMPLETED_REQUIRED,
    presenceConfidence: 0.95,
    attentionConfidence: 0.9,
    intentConfidence: 0.88,
    continuityConfidence: 0.9,
    fraudRisk: 0.05,
    proofLevel: 3,
    intentConfidenceThreshold: 0.6,
    intentLowConfidenceAction: "DOWNGRADE" as const,
    isEligible: true,
    campaignExpired: false,
    isDuplicateAttempt: false
  };
}

describe("PopsRewardDecisionService", () => {
  const service = new PopsRewardDecisionService(new MockPopsWalletIntegration());

  it("approves full and creates pending wallet intent", async () => {
    const result = await service.createDecision(baseRequest());
    expect(result.decision.decision).toBe(POPS_REWARD_DECISION_STATUS.APPROVED_FULL);
    expect(result.walletTransactionIntent).not.toBeNull();
    expect(result.walletTransactionIntent?.status).toBe("PENDING_AVAILABLE_SOON");
    expect(result.walletDenyIntent).toBeNull();
  });

  it("approves partial for mid-quality sessions", async () => {
    const result = await service.createDecision({
      ...baseRequest(),
      presenceConfidence: 0.84,
      attentionConfidence: 0.8,
      intentConfidence: 0.78,
      fraudRisk: 0.2
    });
    expect(result.decision.decision).toBe(POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL);
    expect(result.walletTransactionIntent).not.toBeNull();
    expect(result.decision.finalAmount).toBeGreaterThan(0);
  });

  it("holds when fraud risk is medium", async () => {
    const result = await service.createDecision({
      ...baseRequest(),
      fraudRisk: 0.55
    });
    expect(result.decision.decision).toBe(POPS_REWARD_DECISION_STATUS.HELD);
    expect(result.walletHoldIntent).not.toBeNull();
    expect(result.walletTransactionIntent).toBeNull();
  });

  it("denies for high fraud risk", async () => {
    const result = await service.createDecision({
      ...baseRequest(),
      fraudRisk: 0.8
    });
    expect(result.decision.decision).toBe(POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK);
    expect(result.decision.finalAmount).toBe(0);
    expect(result.walletDenyIntent).not.toBeNull();
  });

  it("denies duplicate attempts before score checks", async () => {
    const result = await service.createDecision({
      ...baseRequest(),
      isDuplicateAttempt: true
    });
    expect(result.decision.decision).toBe(POPS_REWARD_DECISION_STATUS.DENIED_DUPLICATE);
    expect(result.walletDenyIntent).not.toBeNull();
  });

  it("downgrades reward when proof level requires higher intent", async () => {
    const result = await service.createDecision({
      ...baseRequest(),
      intentConfidence: 0.4,
      intentLowConfidenceAction: "DOWNGRADE"
    });
    expect(result.decision.decision).toBe(POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL);
    expect(result.decision.finalAmount).toBeGreaterThan(0);
  });

  it("holds reward when intent policy is hold", async () => {
    const result = await service.createDecision({
      ...baseRequest(),
      intentConfidence: 0.2,
      intentLowConfidenceAction: "HOLD"
    });
    expect(result.decision.decision).toBe(POPS_REWARD_DECISION_STATUS.HELD);
    expect(result.walletHoldIntent).not.toBeNull();
  });

  it("denies reward when intent policy is deny", async () => {
    const result = await service.createDecision({
      ...baseRequest(),
      intentConfidence: 0.2,
      intentLowConfidenceAction: "DENY"
    });
    expect(result.decision.decision).toBe(POPS_REWARD_DECISION_STATUS.DENIED_LOW_CONFIDENCE);
    expect(result.walletDenyIntent).not.toBeNull();
  });
});
