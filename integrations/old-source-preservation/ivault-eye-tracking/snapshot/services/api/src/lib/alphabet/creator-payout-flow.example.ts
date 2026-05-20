import {
  createCreatorPayoutRecord,
  evaluateStoredCreatorPayout
} from "./creator-payout-store";
import {
  applyCreatorPayoutCreditToWallet,
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
  createTrustEventFromCreatorPayout,
  createUValueEventFromCreatorPayout
} from "./creator-payout-event-factory";

const userId = crypto.randomUUID();
const creatorId = crypto.randomUUID();
const wallet = createWallet(userId);

const record = createCreatorPayoutRecord({
  creatorId,
  userId,
  walletId: wallet.walletId,
  revenueSource: "content_sale",
  sourceObjectId: crypto.randomUUID(),
  grossRevenue: 100,
  collaborators: [
    {
      recipientUserId: userId,
      recipientWalletId: wallet.walletId,
      role: "creator",
      splitRate: 1
    }
  ]
});

const payoutResult = evaluateStoredCreatorPayout({
  creatorPayoutId: record.creatorPayoutId,
  holdExpired: true,
  originalityScore: 0.9,
  attributionConfidenceScore: 0.9,
  contentQualityScore: 0.85,
  audienceQualityScore: 0.8,
  copyrightRisk: 0.02,
  safetyRisk: 0.02,
  fraudRisk: 0.02,
  chargebackRisk: 0.02,
  refundRisk: 0.02,
  payoutVelocityRisk: 0.02,
  trustScore: 80,
  uValueScore: 40,
  payoutPoolAvailableAmount: 1000,
  payoutPoolCoverageRatio: 0.9,
  recentPenaltyCount: 0,
  recentSeverePenaltyCount: 0,
  creatorAccountLocked: false,
  payoutLocked: false,
  reversalRequested: false,
  completionRequested: true
});

const trustEvent = createTrustEventFromCreatorPayout(payoutResult);
if (trustEvent) applyTrustImpactEventToUser(trustEvent);

const uValueEvent = createUValueEventFromCreatorPayout(payoutResult);
if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

if (payoutResult.walletCreditAuthorized) {
  applyCreatorPayoutCreditToWallet({
    walletId: payoutResult.walletId,
    userId: payoutResult.userId,
    creatorPayoutId: payoutResult.creatorPayoutId,
    coinCode: "I",
    amount: payoutResult.distributableAmount,
    platformFeeAmount: payoutResult.platformFeeAmount,
    taxWithholdingEstimate: payoutResult.taxWithholdingEstimate
  });
}

console.log("Creator payout:");
console.log(JSON.stringify(payoutResult, null, 2));

console.log("Creator Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("Creator U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
