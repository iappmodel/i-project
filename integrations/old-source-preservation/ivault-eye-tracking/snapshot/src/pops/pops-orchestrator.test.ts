import { describe, expect, it } from "vitest";
import { PopsOrchestrator, runExamplePopsPipeline } from "./pops-orchestrator";

function buildBaseInput() {
  return {
    session: {
      id: "session_test_001",
      userId: "user_test_001",
      campaignId: "campaign_test_001",
      startedAtMs: 1000,
      endedAtMs: 5000,
      contentId: "content_test_001",
    },
    events: [{ type: "attention.session.started", timestampMs: 1001 }],
    signalBatches: [
      {
        timestampMs: 1500,
        presenceScore: 0.85,
        attentionScore: 0.82,
        intentScore: 0.8,
        continuityScore: 0.83,
        fraudSignals: 0.12,
      },
    ],
    campaignRequirements: {
      minPresenceScore: 0.7,
      minAttentionScore: 0.7,
      minIntentScore: 0.7,
      minContinuityScore: 0.7,
      maxFraudRisk: 0.6,
      rewardAmountMinor: 100,
      currency: "USD" as const,
      trustFailureBlocksRelease: false,
    },
    userTrustProfile: {
      level: 2,
      riskScore: 0.15,
    },
    walletRiskProfile: {
      blocked: false,
      requiresManualReview: false,
      retryableIntegrationFailure: false,
    },
    eligibilityProfile: {
      eligible: true,
      reasonCodes: [],
    },
    privacyPolicy: {
      version: "POPS_PRIVACY_V1",
      allowRawSensitiveStorageByDefault: false,
      retentionDays: 30,
    },
  };
}

describe("PopsOrchestrator", () => {
  it("runs deterministically with auditable outputs", async () => {
    const orchestrator = new PopsOrchestrator();
    const input = buildBaseInput();

    const first = await orchestrator.runPopsPipeline(input);
    const second = await orchestrator.runPopsPipeline(input);

    expect(first).toEqual(second);
    expect(first.rewardDecision.reasonCodes.length).toBeGreaterThan(0);
    expect(first.walletIntent.reasonCodes.length).toBeGreaterThan(0);
    expect(first.trustImpact.reasonCodes.length).toBeGreaterThan(0);
    expect(first.privacyReceipt?.rawSensitiveDataStored).toBe(false);
    expect(first.recommendedAction.type).toBe("RELEASE_REWARD");
  });

  it("handles scoring failure with pending review + privacy receipt + admin review", async () => {
    const orchestrator = new PopsOrchestrator();
    const input = buildBaseInput();
    input.signalBatches[0].scoringErrorCode = "MODEL_TIMEOUT";

    const output = await orchestrator.runPopsPipeline(input);

    expect(output.rewardDecision.status).toBe("PENDING_REVIEW");
    expect(output.privacyReceipt).not.toBeNull();
    expect(output.adminReviewItem).not.toBeNull();
    expect(output.recommendedAction.type).toBe("REVIEW_REWARD");
  });

  it("keeps reward decision when wallet integration fails and retries wallet intent", async () => {
    const orchestrator = new PopsOrchestrator();
    const input = buildBaseInput();
    input.walletRiskProfile.retryableIntegrationFailure = true;

    const output = await orchestrator.runPopsPipeline(input);

    expect(output.rewardDecision.status).toBe("APPROVED");
    expect(output.walletIntent.status).toBe("RETRY_SCHEDULED");
    expect(output.walletIntent.reasonCodes).toContain("REWARD_DECISION_PRESERVED");
    expect(output.recommendedAction.type).toBe("RETRY_WALLET_INTENT");
  });

  it("blocks final release when privacy receipt fails", async () => {
    const orchestrator = new PopsOrchestrator();
    const input = buildBaseInput();
    input.privacyPolicy.version = "FAIL_RECEIPT";

    const output = await orchestrator.runPopsPipeline(input);

    expect(output.privacyReceipt).toBeNull();
    expect(output.recommendedAction.type).toBe("WAIT_FOR_PRIVACY_RECEIPT");
  });

  it("does not block reward on trust integration failure unless campaign requires it", async () => {
    const orchestrator = new PopsOrchestrator();
    const nonBlockingInput = buildBaseInput();
    nonBlockingInput.signalBatches[0].scoringErrorCode = "TRUST_INTEGRATION";
    nonBlockingInput.campaignRequirements.trustFailureBlocksRelease = false;

    const nonBlocking = await orchestrator.runPopsPipeline(nonBlockingInput);
    expect(nonBlocking.trustImpact.integrationFailed).toBe(true);
    expect(nonBlocking.trustImpact.blocksReward).toBe(false);

    const blockingInput = buildBaseInput();
    blockingInput.signalBatches[0].scoringErrorCode = "TRUST_INTEGRATION";
    blockingInput.campaignRequirements.trustFailureBlocksRelease = true;

    const blocking = await orchestrator.runPopsPipeline(blockingInput);
    expect(blocking.trustImpact.integrationFailed).toBe(true);
    expect(blocking.trustImpact.blocksReward).toBe(true);
  });

  it("exposes a full pipeline example run", async () => {
    const output = await runExamplePopsPipeline();
    expect(output.pipelineEvents.length).toBeGreaterThan(0);
    expect(output.rewardDecision.reasonCodes.length).toBeGreaterThan(0);
  });
});
