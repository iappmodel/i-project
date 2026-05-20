import {
  createContentRightsRecord,
  evaluateStoredContentRights
} from "./content-rights-store";
import {
  createCreatorPayoutRecord,
  evaluateStoredCreatorPayout
} from "./creator-payout-store";
import {
  createTrustEventFromContentRights,
  createUValueEventFromContentRights
} from "./content-rights-event-factory";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore
} from "./trust-store";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";

const userId = crypto.randomUUID();
const creatorId = crypto.randomUUID();
const walletId = crypto.randomUUID();

const rightsRecord = createContentRightsRecord({
  creatorId,
  userId,
  contentType: "video",
  rightsClaimType: "original",
  originalityScore: 0.9,
  attributionConfidenceScore: 0.85,
  transformationScore: 0.4,
  similarityScore: 0.08,
  knownSourceOverlapScore: 0.05,
  collaborators: [
    {
      userId,
      creatorId,
      role: "primary_creator",
      attributionRate: 1,
      evidenceScore: 0.9
    }
  ]
});

const rightsResult = evaluateStoredContentRights({
  contentRightsId: rightsRecord.contentRightsId,
  copyrightRisk: 0.02,
  plagiarismRisk: 0.02,
  impersonationRisk: 0.01,
  monetizationRisk: 0.03,
  safetyRisk: 0.02,
  creatorTrustScore: 80,
  creatorUValueScore: 40,
  disputeOpened: false,
  takedownNoticeReceived: false,
  manualReviewRequested: false,
  monetizationRequested: true
});

const rightsTrustEvent = createTrustEventFromContentRights(rightsResult);
if (rightsTrustEvent) applyTrustImpactEventToUser(rightsTrustEvent);

const rightsUValueEvent = createUValueEventFromContentRights(rightsResult);
if (rightsUValueEvent) applyUValueImpactEventToUser(rightsUValueEvent);

const payoutRecord = createCreatorPayoutRecord({
  creatorId,
  userId,
  walletId,
  revenueSource: "content_sale",
  sourceObjectId: rightsResult.contentId,
  grossRevenue: 100,
  collaborators: [
    {
      recipientUserId: userId,
      recipientWalletId: walletId,
      role: "creator",
      splitRate: 1
    }
  ]
});

const payoutResult = evaluateStoredCreatorPayout({
  creatorPayoutId: payoutRecord.creatorPayoutId,
  holdExpired: true,
  originalityScore: rightsResult.originalityConfidenceScore,
  attributionConfidenceScore: rightsResult.attributionIntegrityScore,
  contentQualityScore: rightsResult.monetizationEligibilityScore,
  audienceQualityScore: 0.8,
  copyrightRisk: rightsResult.copyrightRisk,
  safetyRisk: rightsResult.safetyRisk,
  fraudRisk: rightsResult.monetizationBlocked ? 0.4 : 0.02,
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
  payoutLocked: rightsResult.monetizationBlocked,
  reversalRequested: false,
  completionRequested: true
});

console.log("Content rights:");
console.log(JSON.stringify(rightsResult, null, 2));

console.log("Creator payout:");
console.log(JSON.stringify(payoutResult, null, 2));

console.log("Creator Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("Creator U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
