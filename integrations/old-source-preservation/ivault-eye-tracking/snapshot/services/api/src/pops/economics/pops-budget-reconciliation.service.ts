import {
  POPS_BUDGET_STATUS,
  POPS_ECONOMIC_WALLET_STATUS,
  type PopsBudgetStatus,
  type PopsCampaignBudgetReservation,
  type PopsCampaignFunding,
  type PopsEconomicWalletStatus
} from "./pops-economic.types";
import { POPS_REWARD_DECISION_STATUS, type PopsRewardDecisionStatus } from "../rewards/pops-reward-decision.types";
import { isDeniedDecision } from "../rewards/pops-reward-reason-codes";

/**
 * Derives expected campaign budget status from reward decision + wallet lifecycle.
 * Implements Stage 33 economic rules (campaign reserve / debit / release back).
 */
export class PopsBudgetReconciliationService {
  /**
   * Rule 1: funded + requires reservation → RESERVED until debit.
   * Rule 2–3: approved → DEBITED_PENDING when wallet pending; HELD policy splits RESERVED vs DEBITED_PENDING.
   * Rule 4–5: denied / expired unreleased → RELEASED_BACK_TO_CAMPAIGN.
   * Rule 6: wallet released → DEBITED_RELEASED (final spend).
   * Rule 7: wallet denied after debit → RELEASED_BACK_TO_CAMPAIGN or FAILED (fraud-saved = keep debited; caller passes fraudSaved).
   */
  expectedBudgetStatus(params: {
    decision: PopsRewardDecisionStatus;
    wallet: PopsEconomicWalletStatus;
    funding: PopsCampaignFunding | null;
    reserve: PopsCampaignBudgetReservation | null;
    fraudSavedBudget?: boolean;
  }): PopsBudgetStatus {
    const { decision, wallet, funding, reserve, fraudSavedBudget } = params;

    if (!funding || funding.fundedMinor <= 0) {
      return POPS_BUDGET_STATUS.NOT_REQUIRED;
    }

    if (!funding.requiresBudgetReservation) {
      return POPS_BUDGET_STATUS.NOT_REQUIRED;
    }

    if (isDeniedDecision(decision)) {
      if (wallet === POPS_ECONOMIC_WALLET_STATUS.RELEASED) {
        return POPS_BUDGET_STATUS.FAILED;
      }
      if (reserve?.debitedMinor && reserve.debitedMinor > 0 && fraudSavedBudget) {
        return POPS_BUDGET_STATUS.DEBITED_RELEASED;
      }
      return POPS_BUDGET_STATUS.RELEASED_BACK_TO_CAMPAIGN;
    }

    if (decision === POPS_REWARD_DECISION_STATUS.DENIED_DUPLICATE) {
      return POPS_BUDGET_STATUS.NOT_REQUIRED;
    }

    if (
      decision === POPS_REWARD_DECISION_STATUS.APPROVED_FULL ||
      decision === POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL ||
      decision === POPS_REWARD_DECISION_STATUS.PENDING_REVIEW
    ) {
      if (wallet === POPS_ECONOMIC_WALLET_STATUS.RELEASED) {
        return POPS_BUDGET_STATUS.DEBITED_RELEASED;
      }
      if (wallet === POPS_ECONOMIC_WALLET_STATUS.DENIED || wallet === POPS_ECONOMIC_WALLET_STATUS.EXPIRED) {
        return POPS_BUDGET_STATUS.RELEASED_BACK_TO_CAMPAIGN;
      }
      if (wallet === POPS_ECONOMIC_WALLET_STATUS.PENDING) {
        return POPS_BUDGET_STATUS.DEBITED_PENDING;
      }
      if (wallet === POPS_ECONOMIC_WALLET_STATUS.HELD) {
        return funding.holdAccountingPolicy === "DEBIT_ON_HOLD"
          ? POPS_BUDGET_STATUS.DEBITED_PENDING
          : POPS_BUDGET_STATUS.RESERVED;
      }
      return POPS_BUDGET_STATUS.DEBITED_PENDING;
    }

    if (decision === POPS_REWARD_DECISION_STATUS.HELD) {
      if (wallet === POPS_ECONOMIC_WALLET_STATUS.RELEASED) {
        return POPS_BUDGET_STATUS.DEBITED_RELEASED;
      }
      if (wallet === POPS_ECONOMIC_WALLET_STATUS.DENIED || wallet === POPS_ECONOMIC_WALLET_STATUS.EXPIRED) {
        return POPS_BUDGET_STATUS.RELEASED_BACK_TO_CAMPAIGN;
      }
      return funding.holdAccountingPolicy === "DEBIT_ON_HOLD"
        ? POPS_BUDGET_STATUS.DEBITED_PENDING
        : POPS_BUDGET_STATUS.RESERVED;
    }

    return POPS_BUDGET_STATUS.NOT_REQUIRED;
  }

  /**
   * Validates that we never debit more than funded campaign balance (aggregate check).
   */
  assertNoOverdraft(params: {
    funding: PopsCampaignFunding;
    totalDebitedMinorAcrossCampaign: number;
  }): boolean {
    return params.totalDebitedMinorAcrossCampaign <= params.funding.fundedMinor;
  }

  reserveRowMatchesDecision(reserve: PopsCampaignBudgetReservation | null, rewardDecisionId: string): boolean {
    if (!reserve) return false;
    return reserve.rewardDecisionId === rewardDecisionId || reserve.rewardDecisionId === null;
  }
}
