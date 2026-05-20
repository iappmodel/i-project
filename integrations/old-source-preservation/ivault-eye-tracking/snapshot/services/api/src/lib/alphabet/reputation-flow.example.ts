import {
  createReputationProfile,
  verifyStoredReputationProfile
} from "./reputation-profile-store";
import { issueRewardFromVerifiedEvent } from "./reward-issuance-engine";
import {
  applyRewardIssuanceResult,
  calculateWalletSummary,
  createWallet
} from "./wallet-store";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore
} from "./trust-store";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";
import {
  createTrustEventFromReputationVerification,
  createUValueEventFromReputationVerification
} from "./reputation-event-factory";
import { createTrustEventFromRewardResult } from "./trust-event-factory";
import { createUValueEventFromRewardResult } from "./u-value-event-factory";

const userId = crypto.randomUUID();
const wallet = createWallet(userId);

createReputationProfile({
  userId,
  identityProofLevel: "document_verified",
  ageBand: "18_plus"
});

const reputationResult = verifyStoredReputationProfile({
  userId,
  accountAgeDays: 120,
  trustScore: 82,
  uValueScore: 55,
  walletIntegrityScore: 0.9,
  accountIntegrityScore: 0.92,
  contributionScore: 0.75,
  creatorReputationScore: 0.6,
  workerReputationScore: 0.7,
  helperReputationScore: 0.75,
  safetyReputationScore: 0.7,
  judgmentReputationScore: 0.72,
  learningReputationScore: 0.8,
  masteryReputationScore: 0.65,
  exchangeReliabilityScore: 0.85,
  verifiedEventCount: 80,
  negativeEventCount: 1,
  severeNegativeEventCount: 0,
  impersonationRisk: 0.02,
  syntheticIdentityRisk: 0.02,
  reputationFarmingRisk: 0.03,
  banEvasionRisk: 0.01,
  deviceIntegrityScore: 0.9
});

const reputationTrustEvent =
  createTrustEventFromReputationVerification(reputationResult);
if (reputationTrustEvent) applyTrustImpactEventToUser(reputationTrustEvent);

const reputationUValueEvent =
  createUValueEventFromReputationVerification(reputationResult);
if (reputationUValueEvent) applyUValueImpactEventToUser(reputationUValueEvent);

const trustState = getOrCreateTrustScore(userId);

const rewardEvents = [
  reputationResult.reputationVerifiedEvent,
  reputationResult.identityStrengthenedEvent
].filter(Boolean);

for (const event of rewardEvents) {
  const rewardResult = issueRewardFromVerifiedEvent({
    walletId: wallet.walletId,
    context: {
      event: event!,
      trustScore: trustState.trustScore,
      trustTier: trustState.trustTier,
      qualityScore: event!.qualityScore ?? reputationResult.credibilityScore,
      riskScore: reputationResult.riskScore,
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

console.log("Reputation verification:");
console.log(JSON.stringify(reputationResult, null, 2));

console.log("Wallet:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
