import { describe, expect, it } from "vitest";
import { POPS_REWARD_DECISION_STATUS } from "../../rewards/pops-reward-decision.types";
import {
  MockPopsTrustIntegration,
  PopsTrustImpactService
} from "../pops-trust-impact.service";
import {
  POPS_RECOMMENDED_TRUST_ACTION,
  POPS_TRUST_EVENT_TYPE,
  type PopsTrustEventType
} from "../pops-trust.types";

function baseInput() {
  return {
    userId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    source: "POPS_REWARD_DECISION",
    decision: POPS_REWARD_DECISION_STATUS.APPROVED_FULL,
    fraudRisk: 0.05,
    confidence: 0.92,
    reasonCodes: ["QUALITY_HIGH_CONFIDENCE"],
    trustContext: {
      trustTier: { level: 3, label: "TRUSTED" },
      risk: { riskScore: 0.2, riskStatus: "LOW" as const },
      rewardHoldProfile: { holdRequired: false, profile: "NONE" as const },
      payoutEligibilityProfile: { eligible: true, reasonCodes: [] }
    }
  };
}

describe("PopsTrustImpactService", () => {
  it("creates positive trust event for clean approved full decisions", async () => {
    const integration = new MockPopsTrustIntegration();
    const service = new PopsTrustImpactService(integration);
    const result = await service.createFromRewardDecision(baseInput());

    expect(result.trustEvent.eventType).toBe(POPS_TRUST_EVENT_TYPE.VERIFIED_ATTENTION_SESSION);
    expect(result.trustEvent.weight).toBeGreaterThan(0);
    expect(result.recommendedTrustAction).toBe(POPS_RECOMMENDED_TRUST_ACTION.INCREASE_TRUST_LOW);
  });

  it("creates monitor event for pending review", async () => {
    const integration = new MockPopsTrustIntegration();
    const service = new PopsTrustImpactService(integration);
    const result = await service.createFromRewardDecision({
      ...baseInput(),
      decision: POPS_REWARD_DECISION_STATUS.PENDING_REVIEW,
      fraudRisk: 0.32,
      reasonCodes: ["QUALITY_REVIEW_BAND"]
    });

    expect(result.trustEvent.eventType).toBe(POPS_TRUST_EVENT_TYPE.LOW_CONFIDENCE_SESSION);
    expect(result.trustEvent.weight).toBe(0);
    expect(result.recommendedTrustAction).toBe(POPS_RECOMMENDED_TRUST_ACTION.MONITOR);
  });

  it("escalates to abuse pattern when suspicious reason repeats 3 times in 7 days", async () => {
    const integration = new MockPopsTrustIntegration();
    const service = new PopsTrustImpactService(integration);
    const userId = crypto.randomUUID();
    const now = Date.now();

    for (let i = 0; i < 2; i += 1) {
      await service.createFromRewardDecision({
        ...baseInput(),
        userId,
        sessionId: crypto.randomUUID(),
        decision: POPS_REWARD_DECISION_STATUS.HELD,
        fraudRisk: 0.63,
        reasonCodes: ["FRAUD_RISK_REVIEW"],
        createdAt: new Date(now - i * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    const third = await service.createFromRewardDecision({
      ...baseInput(),
      userId,
      sessionId: crypto.randomUUID(),
      decision: POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK,
      fraudRisk: 0.82,
      reasonCodes: ["FRAUD_RISK_REVIEW"],
      createdAt: new Date(now).toISOString()
    });

    expect(third.trustEvent.eventType).toBe(POPS_TRUST_EVENT_TYPE.REWARD_ABUSE_PATTERN);
    expect(third.recommendedTrustAction).toBe(
      POPS_RECOMMENDED_TRUST_ACTION.BLOCK_REWARDS_TEMPORARILY
    );
  });

  it("grants consistency bonus on 20th clean session", async () => {
    const integration = new MockPopsTrustIntegration();
    const service = new PopsTrustImpactService(integration);
    const userId = crypto.randomUUID();

    let twentiethEventType: PopsTrustEventType = POPS_TRUST_EVENT_TYPE.VERIFIED_ATTENTION_SESSION;
    for (let i = 0; i < 20; i += 1) {
      const result = await service.createFromRewardDecision({
        ...baseInput(),
        userId,
        sessionId: crypto.randomUUID()
      });
      if (i === 19) twentiethEventType = result.trustEvent.eventType;
    }

    expect(twentiethEventType).toBe(POPS_TRUST_EVENT_TYPE.CLEAN_CAMPAIGN_COMPLETION);
  });
});
