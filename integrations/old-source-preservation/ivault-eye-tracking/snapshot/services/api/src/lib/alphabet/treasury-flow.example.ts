import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore
} from "./trust-store";
import {
  createTrustEventFromTreasuryEvaluation,
  createUValueEventFromTreasuryEvaluation
} from "./treasury-event-factory";
import {
  createTreasuryReserveAccount,
  evaluateStoredTreasuryAction
} from "./treasury-store";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";

const campaignBudgetPool = createTreasuryReserveAccount({
  reserveType: "campaign_budget",
  coinCode: "I",
  currencyCode: "USD",
  totalReserveBalance: 10000,
  allocatedBalance: 1000,
  pendingObligationBalance: 1000,
  expectedInflows: 2000,
  expectedOutflows: 1500
});

const treasuryResult = evaluateStoredTreasuryAction({
  treasuryAccountId: campaignBudgetPool.treasuryAccountId,
  actionType: "approve_campaign_budget",
  requestedAmount: 1000,

  campaignBudgetCommitments: 1000,
  liquidityConversionObligations: 500,
  withdrawalObligations: 500,
  grantObligations: 200,
  creatorPayoutObligations: 300,
  refundChargebackExposure: 100,

  reserveCoverageRatio: 1.4,
  liquidityCoverageRatio: 1.2,

  economyHealthScore: 0.78,
  fraudPressureScore: 0.08,
  rewardLeakageScore: 0.12,
  anomalyScore: 0.08,

  trustScore: 80,
  riskScore: 0.05,

  campaignId: crypto.randomUUID(),
  businessId: crypto.randomUUID(),
  budgetOwnerId: crypto.randomUUID()
});

const trustEvent = createTrustEventFromTreasuryEvaluation(treasuryResult);

if (trustEvent) {
  applyTrustImpactEventToUser(trustEvent);
}

const uValueEvent = createUValueEventFromTreasuryEvaluation(treasuryResult);

if (uValueEvent) {
  applyUValueImpactEventToUser(uValueEvent);
}

/**
 * Production use:
 * if treasuryResult.budgetApproved:
 * - campaign builder can activate campaign
 *
 * if treasuryResult.budgetRejected:
 * - campaign remains draft/rejected
 * - notify business
 *
 * if treasuryResult.reviewRecommended:
 * - create admin review case
 *
 * if treasuryResult.auditRecommended:
 * - create audit record
 */

console.log("Treasury:");
console.log(JSON.stringify(treasuryResult, null, 2));

console.log("System Trust:");
console.log(JSON.stringify(getOrCreateTrustScore("system"), null, 2));

console.log("System U Value:");
console.log(JSON.stringify(getOrCreateUValueState("system"), null, 2));
