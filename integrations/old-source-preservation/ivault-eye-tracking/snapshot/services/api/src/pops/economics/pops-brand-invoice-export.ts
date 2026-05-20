import {
  POPS_ECONOMIC_WALLET_STATUS,
  POPS_RECONCILIATION_STATUS,
  type PopsBrandInvoiceExportRow,
  type PopsEconomicDateRange,
  type PopsEconomicRecord
} from "./pops-economic.types";
import { POPS_REWARD_DECISION_STATUS } from "../rewards/pops-reward-decision.types";
import { isDeniedDecision } from "../rewards/pops-reward-reason-codes";

/**
 * Aggregates reconciled economic records into a single brand invoice row.
 * Uses only {@link PopsEconomicRecord} lines that are MATCHED unless {@link includeAllForCostBasis} is true.
 */
export function buildPopsBrandInvoiceExport(params: {
  campaignId: string;
  dateRange: PopsEconomicDateRange;
  records: PopsEconomicRecord[];
  /** When true, cost denominators use all non-denied verified moments; default uses MATCHED only. */
  includeAllForCostBasis?: boolean;
}): PopsBrandInvoiceExportRow {
  const { campaignId, dateRange, records, includeAllForCostBasis } = params;
  const rows = records.filter((r) => r.campaignId === campaignId);

  const matchedOrOk = (r: PopsEconomicRecord) =>
    includeAllForCostBasis
      ? r.reconciliationStatus !== POPS_RECONCILIATION_STATUS.DUPLICATE_REWARD
      : r.reconciliationStatus === POPS_RECONCILIATION_STATUS.MATCHED;

  let verifiedMoments = 0;
  let approvedFullCount = 0;
  let approvedPartialCount = 0;
  let heldCount = 0;
  let deniedCount = 0;
  let releasedRewardTotal = 0;
  let heldRewardTotal = 0;
  let fraudPreventedEstimate = 0;

  for (const r of rows) {
    if (!matchedOrOk(r)) continue;

    const isVerified =
      r.decisionStatus === POPS_REWARD_DECISION_STATUS.APPROVED_FULL ||
      r.decisionStatus === POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL ||
      r.decisionStatus === POPS_REWARD_DECISION_STATUS.PENDING_REVIEW ||
      r.decisionStatus === POPS_REWARD_DECISION_STATUS.HELD;

    if (isVerified) verifiedMoments += 1;

    if (r.decisionStatus === POPS_REWARD_DECISION_STATUS.APPROVED_FULL) approvedFullCount += 1;
    if (r.decisionStatus === POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL) approvedPartialCount += 1;
    if (r.decisionStatus === POPS_REWARD_DECISION_STATUS.HELD) heldCount += 1;

    if (isDeniedDecision(r.decisionStatus)) {
      deniedCount += 1;
      fraudPreventedEstimate += r.baseAmount;
    }

    if (r.walletStatus === POPS_ECONOMIC_WALLET_STATUS.RELEASED) {
      releasedRewardTotal += r.finalAmount;
    }
    if (r.walletStatus === POPS_ECONOMIC_WALLET_STATUS.HELD) {
      heldRewardTotal += r.finalAmount;
    }
  }

  const costDenominatorMoments = verifiedMoments;
  const costDenominatorIntents = approvedFullCount + approvedPartialCount;

  return {
    campaignId,
    dateRange,
    verifiedMoments,
    approvedFullCount,
    approvedPartialCount,
    heldCount,
    deniedCount,
    releasedRewardTotal,
    heldRewardTotal,
    fraudPreventedEstimate,
    costPerVerifiedMoment: costDenominatorMoments > 0 ? releasedRewardTotal / costDenominatorMoments : null,
    costPerVerifiedIntent: costDenominatorIntents > 0 ? releasedRewardTotal / costDenominatorIntents : null
  };
}
