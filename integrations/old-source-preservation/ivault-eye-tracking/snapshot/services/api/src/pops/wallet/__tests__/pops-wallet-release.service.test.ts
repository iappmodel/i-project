import { describe, expect, it } from "vitest";
import { POPS_REWARD_DECISION_STATUS } from "../../rewards/pops-reward-decision.types";
import { POPS_WALLET_REWARD_STATUS } from "../pops-wallet.types";
import { PopsWalletReleaseService } from "../pops-wallet-release.service";
import { POPS_WALLET_DETAIL_COPY, POPS_WALLET_STATUS_COPY } from "../pops-wallet-copy";

function baseInput() {
  return {
    userId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    campaignId: crypto.randomUUID(),
    rewardDecisionId: crypto.randomUUID(),
    coinType: "ICOIN",
    amount: 5_000,
    context: {
      trustTier: 4,
      fraudRisk: 0.05,
      amount: 5_000,
      campaignRequiresHold: false,
      kycRequired: false,
      kycCompleted: true,
      ageRestricted: false,
      ageEligible: true
    }
  };
}

describe("PopsWalletReleaseService", () => {
  const service = new PopsWalletReleaseService();

  it("creates pending intent for APPROVED_FULL", () => {
    const result = service.buildRewardIntent({
      ...baseInput(),
      decision: POPS_REWARD_DECISION_STATUS.APPROVED_FULL
    });
    expect(result.deniedAuditRecord).toBeNull();
    expect(result.intent?.status).toBe(POPS_WALLET_REWARD_STATUS.PENDING);
    expect(result.intent?.releaseEligibleAt).not.toBeNull();
  });

  it("creates pending review for PENDING_REVIEW decision", () => {
    const result = service.buildRewardIntent({
      ...baseInput(),
      decision: POPS_REWARD_DECISION_STATUS.PENDING_REVIEW
    });
    expect(result.intent?.status).toBe(POPS_WALLET_REWARD_STATUS.PENDING_REVIEW);
  });

  it("holds high-value rewards for manual review", () => {
    const result = service.buildRewardIntent({
      ...baseInput(),
      decision: POPS_REWARD_DECISION_STATUS.APPROVED_FULL,
      amount: 350_000,
      context: {
        ...baseInput().context,
        amount: 350_000
      }
    });
    expect(result.intent?.status).toBe(POPS_WALLET_REWARD_STATUS.HELD);
    expect(result.intent?.holdReason).toBe("HIGH_VALUE_REWARD");
  });

  it("denies ineligible age-restricted rewards", () => {
    const result = service.buildRewardIntent({
      ...baseInput(),
      decision: POPS_REWARD_DECISION_STATUS.APPROVED_FULL,
      context: {
        ...baseInput().context,
        ageRestricted: true,
        ageEligible: false
      }
    });
    expect(result.intent).toBeNull();
    expect(result.deniedAuditRecord?.reason).toBe("AGE_RESTRICTED_INELIGIBLE");
  });

  it("creates denied audit record for denied decisions", () => {
    const result = service.buildRewardIntent({
      ...baseInput(),
      decision: POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK
    });
    expect(result.intent).toBeNull();
    expect(result.deniedAuditRecord).not.toBeNull();
  });

  it("releases intent and marks partial release when needed", () => {
    const created = service.buildRewardIntent({
      ...baseInput(),
      decision: POPS_REWARD_DECISION_STATUS.APPROVED_FULL
    });
    if (!created.intent) throw new Error("expected intent");
    const released = service.releaseIntent(created.intent, 1_000);
    expect(released.intent.status).toBe(POPS_WALLET_REWARD_STATUS.PARTIALLY_RELEASED);
    expect(released.event.toStatus).toBe(POPS_WALLET_REWARD_STATUS.PARTIALLY_RELEASED);
  });
});

describe("Pops wallet copy", () => {
  it("contains required short copy", () => {
    expect(POPS_WALLET_STATUS_COPY.PENDING).toBe("Reward pending.");
    expect(POPS_WALLET_STATUS_COPY.HELD).toBe("Reward held for review.");
    expect(POPS_WALLET_STATUS_COPY.DENIED).toBe("Reward not approved.");
  });

  it("contains required detailed copy", () => {
    expect(POPS_WALLET_DETAIL_COPY.PENDING).toContain(
      "P.O.P.S verified the humane factor of this moment. Your reward is pending wallet release."
    );
    expect(POPS_WALLET_DETAIL_COPY.HELD).toContain(
      "P.O.P.S could not fully verify this moment. The reward is held for review."
    );
    expect(POPS_WALLET_DETAIL_COPY.DENIED).toContain(
      "This moment did not meet the verification requirements for the reward."
    );
  });
});
