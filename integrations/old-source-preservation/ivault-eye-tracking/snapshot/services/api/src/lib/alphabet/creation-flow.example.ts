import {
  submitCreationArtifact,
  verifyStoredCreationArtifact
} from "./creation-session-store";
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
  createTrustEventFromCreationVerification,
  createUValueEventFromCreationVerification
} from "./creation-event-factory";
import { createTrustEventFromRewardResult } from "./trust-event-factory";
import { createUValueEventFromRewardResult } from "./u-value-event-factory";

const userId = crypto.randomUUID();
const creatorId = crypto.randomUUID();
const wallet = createWallet(userId);

const artifact = submitCreationArtifact({
  userId,
  creatorId,
  artifactType: "video",
  ageBand: "18_plus",
  title: "Demo Creation",
  description: "A verified creator artifact.",
  aiAssisted: true,
  aiDisclosed: true
});

const creationResult = verifyStoredCreationArtifact({
  artifactId: artifact.artifactId,
  artifactExists: true,
  rightsScore: 0.9,
  originalityScore: 0.82,
  remixScore: 0.7,
  qualityScore: 0.86,
  usefulnessScore: 0.78,
  effortScore: 0.8,
  audienceValueScore: 0.72,
  plagiarismRisk: 0.03,
  copyrightRisk: 0.03,
  aiSpamRisk: 0.03,
  duplicateContentRisk: 0.04,
  manipulationRisk: 0.04,
  deviceIntegrityScore: 0.9
});

const creationTrustEvent = createTrustEventFromCreationVerification(creationResult);
if (creationTrustEvent) applyTrustImpactEventToUser(creationTrustEvent);

const creationUValueEvent = createUValueEventFromCreationVerification(creationResult);
if (creationUValueEvent) applyUValueImpactEventToUser(creationUValueEvent);

const trustState = getOrCreateTrustScore(userId);

const rewardEvents = [
  creationResult.cCoinEvent,
  creationResult.oCoinEvent,
  creationResult.qCoinEvent
].filter(Boolean);

for (const event of rewardEvents) {
  const rewardResult = issueRewardFromVerifiedEvent({
    walletId: wallet.walletId,
    context: {
      event: event!,
      trustScore: trustState.trustScore,
      trustTier: trustState.trustTier,
      qualityScore: event!.qualityScore ?? creationResult.finalQualityScore,
      riskScore: creationResult.riskScore,
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

console.log("Creation verification:");
console.log(JSON.stringify(creationResult, null, 2));

console.log("Wallet:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
