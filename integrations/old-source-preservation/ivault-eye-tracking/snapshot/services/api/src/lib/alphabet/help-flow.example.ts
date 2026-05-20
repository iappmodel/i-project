import {
  completeHelpSession,
  startHelpSession,
  updateHelpSessionDuration,
  verifyStoredHelpSession
} from "./help-session-store";
import { issueRewardFromVerifiedEvent } from "./reward-issuance-engine";
import { applyRewardIssuanceResult, calculateWalletSummary, createWallet } from "./wallet-store";
import { applyTrustImpactEventToUser, getOrCreateTrustScore } from "./trust-store";
import { applyUValueImpactEventToUser, getOrCreateUValueState } from "./u-value-store";
import {
  createTrustEventFromHelpVerification,
  createUValueEventFromHelpVerification
} from "./help-event-factory";
import { createTrustEventFromRewardResult } from "./trust-event-factory";
import { createUValueEventFromRewardResult } from "./u-value-event-factory";

const helperUserId = crypto.randomUUID();
const recipientUserId = crypto.randomUUID();

const wallet = createWallet(helperUserId);

const session = startHelpSession({
  helperUserId,
  recipientUserId,
  context: "learning_help",
  helperAgeBand: "18_plus",
  recipientAgeBand: "18_plus",
  objectType: "lesson_question",
  objectId: crypto.randomUUID()
});

updateHelpSessionDuration({
  helpSessionId: session.helpSessionId,
  durationMs: 10 * 60 * 1000
});

completeHelpSession(session.helpSessionId);

const helpResult = verifyStoredHelpSession({
  helpSessionId: session.helpSessionId,
  recipientConfirmed: true,
  recipientUsefulnessScore: 0.85,
  recipientOutcomeScore: 0.8,
  helperEffortScore: 0.82,
  kindnessScore: 0.9,
  clarityScore: 0.86,
  followThroughScore: 0.8,
  repeatHelpScore: 0.4,
  impactScore: 0.75,
  vulnerabilityLevel: 0.3,
  sensitivityLevel: 0.2,
  independentOutcomeEvidenceScore: 0.72,
  communityValidationScore: 0.5,
  systemValidationScore: 0.75,
  collusionRisk: 0.03,
  manipulationRisk: 0.03,
  harassmentRisk: 0.02,
  fakeRecipientRisk: 0.02,
  paymentCoercionRisk: 0.01,
  deviceIntegrityScore: 0.9
});

const helpTrustEvent = createTrustEventFromHelpVerification(helpResult);
if (helpTrustEvent) applyTrustImpactEventToUser(helpTrustEvent);

const helpUValueEvent = createUValueEventFromHelpVerification(helpResult);
if (helpUValueEvent) applyUValueImpactEventToUser(helpUValueEvent);

const trustState = getOrCreateTrustScore(helperUserId);

const rewardEvents = [helpResult.hCoinEvent, helpResult.nCoinEvent].filter(Boolean);

for (const event of rewardEvents) {
  const rewardResult = issueRewardFromVerifiedEvent({
    walletId: wallet.walletId,
    context: {
      event: event!,
      trustScore: trustState.trustScore,
      trustTier: trustState.trustTier,
      qualityScore: event!.qualityScore ?? helpResult.outcomeScore,
      riskScore: helpResult.riskScore,
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

console.log("Help verification:");
console.log(JSON.stringify(helpResult, null, 2));

console.log("Wallet:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(helperUserId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(helperUserId), null, 2));
