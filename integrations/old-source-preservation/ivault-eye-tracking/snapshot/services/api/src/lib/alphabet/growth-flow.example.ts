import {
  recordGrowthAfterScore,
  recordGrowthPractice,
  startGrowthSession,
  verifyStoredGrowthSession
} from "./growth-session-store";
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
  createTrustEventFromGrowthVerification,
  createUValueEventFromGrowthVerification
} from "./growth-event-factory";
import { createTrustEventFromRewardResult } from "./trust-event-factory";
import { createUValueEventFromRewardResult } from "./u-value-event-factory";

const userId = crypto.randomUUID();
const wallet = createWallet(userId);

const session = startGrowthSession({
  userId,
  domain: "learning",
  baselineScore: 0.4,
  difficultyLevel: 6,
  ageBand: "18_plus",
  objectType: "lesson_skill",
  objectId: crypto.randomUUID()
});

recordGrowthPractice({
  growthSessionId: session.growthSessionId,
  practiceCountDelta: 3,
  practiceDurationMsDelta: 20 * 60 * 1000
});

recordGrowthAfterScore({
  growthSessionId: session.growthSessionId,
  afterScore: 0.7
});

const growthResult = verifyStoredGrowthSession({
  growthSessionId: session.growthSessionId,

  learningScore: 0.85,
  knowledgeScore: 0.75,
  focusScore: 0.8,
  masterySignalScore: 0.4,

  repeatedAttemptCount: 2,
  easyAttemptRatio: 0.2,

  cheatingRisk: 0.03,
  scoreManipulationRisk: 0.03,
  repeatedAttemptFarmingRisk: 0.03,
  deviceIntegrityScore: 0.9
});

const growthTrustEvent = createTrustEventFromGrowthVerification(growthResult);
if (growthTrustEvent) applyTrustImpactEventToUser(growthTrustEvent);

const growthUValueEvent = createUValueEventFromGrowthVerification(growthResult);
if (growthUValueEvent) applyUValueImpactEventToUser(growthUValueEvent);

if (growthResult.growthEvent) {
  const trustState = getOrCreateTrustScore(userId);

  const rewardResult = issueRewardFromVerifiedEvent({
    walletId: wallet.walletId,
    context: {
      event: growthResult.growthEvent,
      trustScore: trustState.trustScore,
      trustTier: trustState.trustTier,
      qualityScore: growthResult.qualityScore,
      riskScore: growthResult.riskScore,
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

console.log("Growth verification:");
console.log(JSON.stringify(growthResult, null, 2));

console.log("Wallet:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
