import { issueRewardFromVerifiedEvent } from "./reward-issuance-engine";
import {
  submitSafetyReport,
  verifyStoredSafetyReport
} from "./safety-report-store";
import {
  createTrustEventFromSafetyVerification,
  createUValueEventFromSafetyVerification
} from "./safety-event-factory";
import { createTrustEventFromRewardResult } from "./trust-event-factory";
import { applyTrustImpactEventToUser, getOrCreateTrustScore } from "./trust-store";
import { createUValueEventFromRewardResult } from "./u-value-event-factory";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";
import {
  applyRewardIssuanceResult,
  calculateWalletSummary,
  createWallet
} from "./wallet-store";

const reporterUserId = crypto.randomUUID();
const reportedUserId = crypto.randomUUID();

const wallet = createWallet(reporterUserId);

const report = submitSafetyReport({
  reporterUserId,
  reportedUserId,
  context: "scam",
  objectType: "message",
  objectId: crypto.randomUUID(),
  reporterAgeBand: "18_plus"
});

const safetyResult = verifyStoredSafetyReport({
  safetyReportId: report.safetyReportId,

  evidenceScore: 0.85,
  reportClarityScore: 0.8,
  reporterHistoryScore: 0.75,

  harmSeverity: 0.8,
  urgencyScore: 0.7,

  moderationOutcome: "account_restricted",

  reportValid: true,
  appealReversed: false,

  falseReportRisk: 0.03,
  brigadingRisk: 0.03,
  retaliationRisk: 0.03,
  manipulationRisk: 0.03,
  reporterDeviceIntegrityScore: 0.9
});

const safetyTrustEvent = createTrustEventFromSafetyVerification(safetyResult);
if (safetyTrustEvent) applyTrustImpactEventToUser(safetyTrustEvent);

const safetyUValueEvent = createUValueEventFromSafetyVerification(safetyResult);
if (safetyUValueEvent) applyUValueImpactEventToUser(safetyUValueEvent);

const trustState = getOrCreateTrustScore(reporterUserId);

const rewardEvents = [safetyResult.safetyContributionEvent, safetyResult.judgmentEvent].filter(
  Boolean
);

for (const event of rewardEvents) {
  const rewardResult = issueRewardFromVerifiedEvent({
    walletId: wallet.walletId,
    context: {
      event: event!,
      trustScore: trustState.trustScore,
      trustTier: trustState.trustTier,
      qualityScore: event!.qualityScore ?? safetyResult.judgmentScore,
      riskScore: safetyResult.riskScore,
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

console.log("Safety verification:");
console.log(JSON.stringify(safetyResult, null, 2));

console.log("Wallet:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(reporterUserId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(reporterUserId), null, 2));
