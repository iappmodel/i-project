import {
  recordMasteryEvidence,
  startMasteryPath,
  verifyStoredMasteryPath
} from "./mastery-session-store";
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
  createTrustEventFromMasteryVerification,
  createUValueEventFromMasteryVerification
} from "./mastery-event-factory";
import { createTrustEventFromRewardResult } from "./trust-event-factory";
import { createUValueEventFromRewardResult } from "./u-value-event-factory";

const userId = crypto.randomUUID();
const wallet = createWallet(userId);

const path = startMasteryPath({
  userId,
  domain: "learning",
  ageBand: "18_plus",
  objectType: "course_domain",
  objectId: crypto.randomUUID()
});

recordMasteryEvidence({
  masteryPathId: path.masteryPathId,
  attemptCountDelta: 7,
  successfulAttemptCountDelta: 6
});

const masteryResult = verifyStoredMasteryPath({
  masteryPathId: path.masteryPathId,

  averagePerformanceScore: 0.88,
  peakPerformanceScore: 0.94,
  consistencyScore: 0.86,

  difficultyLevel: 7,

  qualityScore: 0.86,
  growthScore: 0.8,
  knowledgeScore: 0.85,
  focusScore: 0.82,

  expertValidationScore: 0.75,
  peerValidationScore: 0.65,
  systemValidationScore: 0.82,

  evidenceSpanDays: 21,

  cheatingRisk: 0.03,
  shortcutRisk: 0.03,
  validationManipulationRisk: 0.03,
  deviceIntegrityScore: 0.9
});

const masteryTrustEvent = createTrustEventFromMasteryVerification(masteryResult);
if (masteryTrustEvent) applyTrustImpactEventToUser(masteryTrustEvent);

const masteryUValueEvent = createUValueEventFromMasteryVerification(masteryResult);
if (masteryUValueEvent) applyUValueImpactEventToUser(masteryUValueEvent);

if (masteryResult.masteryEvent) {
  const trustState = getOrCreateTrustScore(userId);

  const rewardResult = issueRewardFromVerifiedEvent({
    walletId: wallet.walletId,
    context: {
      event: masteryResult.masteryEvent,
      trustScore: trustState.trustScore,
      trustTier: trustState.trustTier,
      qualityScore:
        masteryResult.masteryEvent.qualityScore ?? masteryResult.masteryScore,
      riskScore: masteryResult.riskScore,
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

console.log("Mastery verification:");
console.log(JSON.stringify(masteryResult, null, 2));

console.log("Wallet:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
