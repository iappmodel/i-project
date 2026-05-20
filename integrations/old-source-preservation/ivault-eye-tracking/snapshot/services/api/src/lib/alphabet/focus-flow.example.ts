import {
  completeFocusSession,
  startFocusSession,
  updateFocusSessionProgress,
  verifyStoredFocusSession
} from "./focus-session-store";
import { issueRewardFromVerifiedEvent } from "./reward-issuance-engine";
import { applyRewardIssuanceResult, calculateWalletSummary, createWallet } from "./wallet-store";
import { applyTrustImpactEventToUser, getOrCreateTrustScore } from "./trust-store";
import { applyUValueImpactEventToUser, getOrCreateUValueState } from "./u-value-store";
import {
  createTrustEventFromFocusVerification,
  createUValueEventFromFocusVerification
} from "./focus-event-factory";
import { createTrustEventFromRewardResult } from "./trust-event-factory";
import { createUValueEventFromRewardResult } from "./u-value-event-factory";

const userId = crypto.randomUUID();
const wallet = createWallet(userId);

const session = startFocusSession({
  userId,
  purpose: "learning",
  intendedDurationMs: 10 * 60 * 1000,
  ageBand: "18_plus",
  objectType: "lesson",
  objectId: crypto.randomUUID()
});

updateFocusSessionProgress({
  focusSessionId: session.focusSessionId,
  focusedDurationMs: 10 * 60 * 1000
});

completeFocusSession(session.focusSessionId);

const focusResult = verifyStoredFocusSession({
  focusSessionId: session.focusSessionId,
  interruptionCount: 1,
  appSwitchCount: 1,
  idleTimeMs: 30 * 1000,
  scrollNoiseScore: 0.1,
  taskContinuityScore: 0.9,
  interactionCoherenceScore: 0.85,
  attentionStabilityScore: 0.9,
  deviceIntegrityScore: 0.9,
  sessionContinuityScore: 0.9,
  botSignalScore: 0.03,
  automationRisk: 0.02,
  duplicateSessionRisk: 0.02
});

const focusTrustEvent = createTrustEventFromFocusVerification(focusResult);
if (focusTrustEvent) applyTrustImpactEventToUser(focusTrustEvent);

const focusUValueEvent = createUValueEventFromFocusVerification(focusResult);
if (focusUValueEvent) applyUValueImpactEventToUser(focusUValueEvent);

if (focusResult.fCoinEvent) {
  const trustState = getOrCreateTrustScore(userId);

  const rewardResult = issueRewardFromVerifiedEvent({
    walletId: wallet.walletId,
    context: {
      event: focusResult.fCoinEvent,
      trustScore: trustState.trustScore,
      trustTier: trustState.trustTier,
      qualityScore: focusResult.focusQualityScore,
      riskScore: focusResult.riskScore,
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

console.log("Focus verification:");
console.log(JSON.stringify(focusResult, null, 2));

console.log("Wallet:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
