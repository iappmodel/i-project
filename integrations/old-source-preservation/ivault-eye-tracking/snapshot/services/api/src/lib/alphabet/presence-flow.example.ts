import { issueRewardFromVerifiedEvent } from "./reward-issuance-engine";
import {
  completePresenceSession,
  createLocalOffer,
  markPresenceArrived,
  startPresenceSession,
  updatePresenceDwell,
  verifyStoredPresenceSession
} from "./presence-session-store";
import {
  applyRewardIssuanceResult,
  calculateWalletSummary,
  createWallet
} from "./wallet-store";
import { applyTrustImpactEventToUser, getOrCreateTrustScore } from "./trust-store";
import { applyUValueImpactEventToUser, getOrCreateUValueState } from "./u-value-store";
import {
  createTrustEventFromPresenceVerification,
  createUValueEventFromPresenceVerification
} from "./presence-event-factory";
import { createTrustEventFromRewardResult } from "./trust-event-factory";
import { createUValueEventFromRewardResult } from "./u-value-event-factory";

const userId = crypto.randomUUID();
const businessId = crypto.randomUUID();
const locationId = crypto.randomUUID();
const wallet = createWallet(userId);

const offer = createLocalOffer({
  businessId,
  locationId,
  title: "Check in and earn",
  description: "Visit the location and complete the local action.",
  context: "local_offer",
  rewardCoin: "P",
  expectedRewardAmount: 5,
  requiresPurchaseProof: false,
  requiresQrProof: true,
  requiresNfcProof: false,
  requiresBluetoothProof: true,
  guardianRequiredForMinors: true
});

const session = startPresenceSession({
  userId,
  context: "local_offer",
  offerId: offer.offerId,
  requiredDwellMs: 2 * 60 * 1000,
  ageBand: "18_plus"
});

markPresenceArrived(session.presenceSessionId);
updatePresenceDwell({
  presenceSessionId: session.presenceSessionId,
  dwellMs: 2 * 60 * 1000
});
completePresenceSession(session.presenceSessionId);

const presenceResult = verifyStoredPresenceSession({
  presenceSessionId: session.presenceSessionId,
  geofenceMatchScore: 0.9,
  movementConsistencyScore: 0.85,
  deviceLocationIntegrityScore: 0.9,
  networkLocationCorroborationScore: 0.8,
  qrProofScore: 0.8,
  nfcProofScore: 0.2,
  bluetoothProofScore: 0.6,
  purchaseProofScore: 0.5,
  staffConfirmationScore: 0.7,
  actionCompletionScore: 0.85,
  gpsSpoofingRisk: 0.02,
  emulatorRisk: 0.02,
  duplicateCheckinRisk: 0.03,
  impossibleTravelRisk: 0.01,
  businessCollusionRisk: 0.02,
  deviceIntegrityScore: 0.9
});

const presenceTrustEvent = createTrustEventFromPresenceVerification(presenceResult);
if (presenceTrustEvent) applyTrustImpactEventToUser(presenceTrustEvent);

const presenceUValueEvent = createUValueEventFromPresenceVerification(presenceResult);
if (presenceUValueEvent) applyUValueImpactEventToUser(presenceUValueEvent);

const trustState = getOrCreateTrustScore(userId);

/**
 * Production note:
 * localOfferRedeemedEvent requires campaign/local offer budget reservation.
 * For this demo, only issue presenceVerifiedEvent unless your reward rule
 * for local_offer_redeemed has hasBudgetSource=true from budget reserve.
 */
const rewardEvents = [presenceResult.presenceVerifiedEvent].filter(
  (event): event is NonNullable<typeof event> => Boolean(event)
);

for (const event of rewardEvents) {
  const rewardResult = issueRewardFromVerifiedEvent({
    walletId: wallet.walletId,
    context: {
      event,
      trustScore: trustState.trustScore,
      trustTier: trustState.trustTier,
      qualityScore: event.qualityScore ?? presenceResult.qualityScore,
      riskScore: presenceResult.riskScore,
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

console.log("Presence verification:");
console.log(JSON.stringify(presenceResult, null, 2));

console.log("Wallet:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
