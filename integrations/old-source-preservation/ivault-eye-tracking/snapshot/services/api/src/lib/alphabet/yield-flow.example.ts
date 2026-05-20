import {
  applyRewardIssuanceResult,
  calculateWalletSummary,
  createWallet
} from "./wallet-store";
import { issueRewardFromVerifiedEvent } from "./reward-issuance-engine";
import { applyTrustImpactEventToUser, getOrCreateTrustScore } from "./trust-store";
import { createTrustEventFromRewardResult } from "./trust-event-factory";
import { applyUValueImpactEventToUser, getOrCreateUValueState } from "./u-value-store";
import { createUValueEventFromRewardResult } from "./u-value-event-factory";
import {
  createTrustEventFromYieldVerification,
  createUValueEventFromYieldVerification
} from "./yield-event-factory";
import {
  createYieldProfile,
  verifyStoredYieldProfile
} from "./yield-profile-store";

const userId = crypto.randomUUID();

const wallet = createWallet(userId);

createYieldProfile({
  userId,
  ageBand: "18_plus"
});

const yieldResult = verifyStoredYieldProfile({
  userId,

  accountAgeDays: 365,

  uValueScore: 78,
  trustScore: 88,

  verifiedContributionCount: 180,
  verifiedContributionScore: 0.86,

  learningScore: 0.75,
  growthScore: 0.8,
  masteryScore: 0.7,
  helpScore: 0.88,
  nobilityScore: 0.82,
  safetyScore: 0.78,
  creationScore: 0.72,
  originalityScore: 0.68,
  workScore: 0.75,
  exchangeScore: 0.82,
  reputationScore: 0.84,
  identityStrengthScore: 0.82,

  consistencyScore: 0.86,
  longTermReliabilityScore: 0.88,
  communityBenefitScore: 0.86,

  recentPenaltyCount: 0,
  recentSeverePenaltyCount: 0,
  cooldownDaysRemaining: 0,

  volatilityScore: 0.08,
  gamingPatternScore: 0.03,

  fraudRisk: 0.02,
  grantGamingRisk: 0.02,
  collusionRisk: 0.02,
  fakeNobilityRisk: 0.01,
  reputationFarmingRisk: 0.02,
  identityRisk: 0.02,
  deviceIntegrityScore: 0.9,

  priorGrantCount: 0,
  daysSinceLastGrant: null
});

const yieldTrustEvent = createTrustEventFromYieldVerification(yieldResult);
if (yieldTrustEvent) applyTrustImpactEventToUser(yieldTrustEvent);

const yieldUValueEvent = createUValueEventFromYieldVerification(yieldResult);
if (yieldUValueEvent) applyUValueImpactEventToUser(yieldUValueEvent);

const trustState = getOrCreateTrustScore(userId);

const rewardEvents = [
  yieldResult.yieldAccruedEvent,
  yieldResult.grantEligibilityUpdatedEvent,
  yieldResult.rareGrantCandidateEvent
].filter(Boolean);

for (const event of rewardEvents) {
  const rewardResult = issueRewardFromVerifiedEvent({
    walletId: wallet.walletId,
    context: {
      event: event!,
      trustScore: trustState.trustScore,
      trustTier: trustState.trustTier,
      qualityScore: event!.qualityScore ?? yieldResult.grantEligibilityScore,
      riskScore: yieldResult.riskScore,
      ageBand: "18_plus",
      hasBudgetSource: false
    }
  });

  applyRewardIssuanceResult(rewardResult);

  const rewardTrustEvent = createTrustEventFromRewardResult(rewardResult);
  if (rewardTrustEvent) applyTrustImpactEventToUser(rewardTrustEvent);

  const rewardUValueEvent = createUValueEventFromRewardResult(rewardResult);
  if (rewardUValueEvent) applyUValueImpactEventToUser(rewardUValueEvent);
}

/**
 * Production note:
 * valueGrantAwardedEvent should NOT be auto-paid through normal rewards.
 * It should go through:
 * - grant review queue
 * - human/system approval
 * - grant ledger
 * - compliance checks
 * - payment/benefit fulfillment
 */

console.log("Yield verification:");
console.log(JSON.stringify(yieldResult, null, 2));

console.log("Wallet:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
