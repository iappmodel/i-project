import {
  createGrantEligibilityRecord,
  evaluateStoredGrantEligibility,
  updateGrantAuditStatus,
  updateGrantReviewStatus,
  updateGrantTreasuryStatus
} from "./grant-store";
import {
  createTrustEventFromGrantResult,
  createUValueEventFromGrantResult
} from "./grant-event-factory";
import { applyTrustImpactEventToUser, getOrCreateTrustScore } from "./trust-store";
import { applyUValueImpactEventToUser, getOrCreateUValueState } from "./u-value-store";
import { applyGrantCreditToWallet, createWallet } from "./wallet-store";
import { createNotification, verifyStoredNotification } from "./notification-store";

const userId = crypto.randomUUID();
const wallet = createWallet(userId);

const grantRecord = createGrantEligibilityRecord({
  userId,
  walletId: wallet.walletId,
  grantType: "rare_reward",
  uValueScore: 90,
  trustScore: 90,
  contributionScore: 80,
  learningScore: 85,
  creationScore: 80,
  helpScore: 75,
  safetyScore: 95,
  originalityScore: 85,
  economicNeedScore: 30,
  communityImpactScore: 80,
  consistencyScore: 0.9,
  rarityScore: 0.95,
  grantAmount: 1000,
  rewardCoinCode: "I",
  ageBand: "18_plus",
  regionCode: "US",
  secrecyMode: true
});

/*
 * Production path:
 * review, audit, and treasury reserve are separate engines.
 * This example marks them complete to demonstrate grant issuance path.
 */
updateGrantReviewStatus({
  grantEligibilityId: grantRecord.grantEligibilityId,
  reviewStatus: "approved"
});

updateGrantAuditStatus({
  grantEligibilityId: grantRecord.grantEligibilityId,
  auditStatus: "complete"
});

updateGrantTreasuryStatus({
  grantEligibilityId: grantRecord.grantEligibilityId,
  treasuryStatus: "funded"
});

const grantResult = evaluateStoredGrantEligibility({
  grantEligibilityId: grantRecord.grantEligibilityId,
  fraudRisk: 0.01,
  safetyRisk: 0.01,
  paymentRisk: 0.01,
  reputationRisk: 0.01,
  complianceRisk: 0.01,
  regionEligible: true,
  treasuryBudgetAvailable: 10000,
  treasuryReserveRequested: true,
  treasuryReserveApproved: true,
  guardianApprovalRequired: false,
  guardianApprovalReceived: false,
  manualGrantRequested: false,
  adminApproved: false,
  issueRequested: true,
  completeRequested: false,
  cancelRequested: false
});

const trustEvent = createTrustEventFromGrantResult(grantResult);
if (trustEvent) applyTrustImpactEventToUser(trustEvent);

const uValueEvent = createUValueEventFromGrantResult(grantResult);
if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

if (
  grantResult.walletCreditAuthorized &&
  grantResult.rewardCoinCode &&
  grantResult.walletId
) {
  applyGrantCreditToWallet({
    walletId: grantResult.walletId,
    userId: grantResult.userId,
    grantEligibilityId: grantResult.grantEligibilityId,
    coinCode: grantResult.rewardCoinCode,
    amount: grantResult.grantAmount
  });
}

const notification = createNotification({
  userId,
  walletId: grantResult.walletId ?? null,
  category: "grant",
  channel: "in_app",
  priority: "high",
  sourceEventId:
    grantResult.grantIssuedEvent?.eventId ??
    grantResult.grantEligibilityCreatedEvent.eventId,
  sourceObjectType: "grant",
  sourceObjectId: grantResult.grantEligibilityId,
  title: grantResult.secrecyMode ? "Platform grant issued" : "Grant issued",
  body: grantResult.secrecyMode
    ? "A platform grant has been issued to your account."
    : `Grant issued: ${grantResult.grantAmount} ${grantResult.rewardCoinCode ?? ""}`.trim(),
  actionLabel: "Open wallet",
  actionTarget: "/wallet",
  explanationLevel: "standard",
  appealAllowed: false,
  userActionRequired: false,
  sensitiveLogicRedacted: true,
  containsComplianceDetail: false,
  containsFraudDetail: false,
  ageBand: "18_plus"
});

const notificationResult = verifyStoredNotification({
  notificationId: notification.notificationId,
  userCanReceiveChannel: true,
  userOptedOut: false,
  guardianRoutingRequired: false,
  guardianAvailable: false,
  adminReviewRequired: false,
  deliveryProviderHealthy: true,
  abuseRisk: 0.01,
  privacyRisk: 0.01,
  exploitLeakRisk: 0.01,
  confusionRisk: 0.01,
  urgencyScore: 0.7
});

console.log("Grant:");
console.log(JSON.stringify(grantResult, null, 2));

console.log("Grant notification:");
console.log(JSON.stringify(notificationResult, null, 2));

console.log("User Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("User U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
