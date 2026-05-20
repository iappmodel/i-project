import { POPS_REWARD_DECISION_STATUS, type PopsRewardDecision } from "../rewards/pops-reward-decision.types";
import { isDeniedDecision } from "../rewards/pops-reward-reason-codes";
import { POPS_WALLET_REWARD_STATUS, type PopsWalletRewardIntent } from "../wallet/pops-wallet.types";
import { PopsBudgetReconciliationService } from "./pops-budget-reconciliation.service";
import {
  POPS_ECONOMIC_WALLET_STATUS,
  POPS_RECONCILIATION_STATUS,
  type PopsCampaignBudgetReservation,
  type PopsCampaignFunding,
  type PopsEconomicDateRange,
  type PopsEconomicReconciliationIssue,
  type PopsEconomicReconciliationOptions,
  type PopsEconomicReconciliationRunResult,
  type PopsEconomicRecord,
  type PopsEconomicWalletStatus,
  type PopsReconciliationStatus,
  type PopsWalletIntentSnapshot
} from "./pops-economic.types";

function nowIso(now?: () => string): string {
  return (now ?? (() => new Date().toISOString()))();
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function inRange(iso: string, range: PopsEconomicDateRange): boolean {
  const t = Date.parse(iso);
  return t >= Date.parse(range.start) && t <= Date.parse(range.end);
}

/** Map wallet reward intent → economic wallet status */
export function walletIntentToEconomicStatus(intent: PopsWalletRewardIntent): PopsEconomicWalletStatus {
  switch (intent.status) {
    case POPS_WALLET_REWARD_STATUS.NO_REWARD:
      return POPS_ECONOMIC_WALLET_STATUS.NONE;
    case POPS_WALLET_REWARD_STATUS.PENDING:
    case POPS_WALLET_REWARD_STATUS.PENDING_REVIEW:
      return POPS_ECONOMIC_WALLET_STATUS.PENDING;
    case POPS_WALLET_REWARD_STATUS.HELD:
      return POPS_ECONOMIC_WALLET_STATUS.HELD;
    case POPS_WALLET_REWARD_STATUS.RELEASED:
    case POPS_WALLET_REWARD_STATUS.PARTIALLY_RELEASED:
      return POPS_ECONOMIC_WALLET_STATUS.RELEASED;
    case POPS_WALLET_REWARD_STATUS.DENIED:
      return POPS_ECONOMIC_WALLET_STATUS.DENIED;
    case POPS_WALLET_REWARD_STATUS.EXPIRED:
      return POPS_ECONOMIC_WALLET_STATUS.EXPIRED;
    default:
      return POPS_ECONOMIC_WALLET_STATUS.NONE;
  }
}

export function walletSnapshotToEconomicStatus(s: PopsWalletIntentSnapshot): PopsEconomicWalletStatus {
  switch (s.lifecycle) {
    case "NONE":
      return POPS_ECONOMIC_WALLET_STATUS.NONE;
    case "PENDING":
      return POPS_ECONOMIC_WALLET_STATUS.PENDING;
    case "HELD":
      return POPS_ECONOMIC_WALLET_STATUS.HELD;
    case "RELEASED":
      return POPS_ECONOMIC_WALLET_STATUS.RELEASED;
    case "DENIED":
      return POPS_ECONOMIC_WALLET_STATUS.DENIED;
    case "EXPIRED":
      return POPS_ECONOMIC_WALLET_STATUS.EXPIRED;
    default:
      return POPS_ECONOMIC_WALLET_STATUS.NONE;
  }
}

export interface PopsEconomicReconciliationReader {
  listDecisions(range: PopsEconomicDateRange): Promise<PopsRewardDecision[]>;
  listWalletSnapshots(range: PopsEconomicDateRange): Promise<PopsWalletIntentSnapshot[]>;
  listBudgetReservations(range: PopsEconomicDateRange): Promise<PopsCampaignBudgetReservation[]>;
  getCampaignFunding(campaignId: string): Promise<PopsCampaignFunding | null>;
}

export class PopsRewardReconciliationService {
  private readonly budget = new PopsBudgetReconciliationService();

  constructor(private readonly reader: PopsEconomicReconciliationReader) {}

  /**
   * Batch reconciliation: validates wallet ↔ decision ↔ budget invariants and emits {@link PopsEconomicRecord} rows.
   */
  async runPopsEconomicReconciliation(
    range: PopsEconomicDateRange,
    options: PopsEconomicReconciliationOptions = {}
  ): Promise<PopsEconomicReconciliationRunResult> {
    const startedAt = nowIso(options.now);
    const runId = id("pops_econ_run");
    const holdMax = options.holdMaxDurationMs ?? 7 * 24 * 60 * 60 * 1000;
    const nowFn = options.now ?? (() => new Date().toISOString());

    const [decisions, snapshots, reserves] = await Promise.all([
      this.reader.listDecisions(range),
      this.reader.listWalletSnapshots(range),
      this.reader.listBudgetReservations(range)
    ]);

    const walletRowsByDecision = new Map<string, PopsWalletIntentSnapshot[]>();
    for (const s of snapshots) {
      const arr = walletRowsByDecision.get(s.rewardDecisionId) ?? [];
      arr.push(s);
      walletRowsByDecision.set(s.rewardDecisionId, arr);
    }

    const reserveByDecision = new Map<string, PopsCampaignBudgetReservation>();
    for (const r of reserves) {
      if (r.rewardDecisionId) reserveByDecision.set(r.rewardDecisionId, r);
    }

    const approvedKeys = new Map<string, number>();
    for (const d of decisions) {
      if (
        d.decision === POPS_REWARD_DECISION_STATUS.APPROVED_FULL ||
        d.decision === POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL
      ) {
        const k = `${d.sessionId}|${d.userId}|${d.campaignId}`;
        approvedKeys.set(k, (approvedKeys.get(k) ?? 0) + 1);
      }
    }

    const issues: PopsEconomicReconciliationIssue[] = [];
    const records: PopsEconomicRecord[] = [];
    let matchedCount = 0;
    let failedCount = 0;

    for (const d of decisions) {
      if (!inRange(d.createdAt, range)) continue;

      const funding = await this.reader.getCampaignFunding(d.campaignId);
      const snapsForDecision = walletRowsByDecision.get(d.id) ?? [];
      const snap = snapsForDecision[0] ?? null;
      let duplicateWalletIntents = false;
      if (snapsForDecision.length > 1) {
        duplicateWalletIntents = true;
        issues.push({
          code: POPS_RECONCILIATION_STATUS.DUPLICATE_REWARD,
          message: "Multiple wallet snapshots for one reward decision",
          rewardDecisionId: d.id
        });
      }
      const reserve = reserveByDecision.get(d.id) ?? reserves.find((r) => r.sessionId === d.sessionId && r.campaignId === d.campaignId) ?? null;

      const walletStatus = snap ? walletSnapshotToEconomicStatus(snap) : inferWalletStatusFromDecision(d);

      const dupKey = `${d.sessionId}|${d.userId}|${d.campaignId}`;
      const dupCount = approvedKeys.get(dupKey) ?? 0;

      let reconciliationStatus: PopsReconciliationStatus = POPS_RECONCILIATION_STATUS.MATCHED;

      if (duplicateWalletIntents) {
        reconciliationStatus = POPS_RECONCILIATION_STATUS.DUPLICATE_REWARD;
      }

      if (dupCount > 1 && (d.decision === POPS_REWARD_DECISION_STATUS.APPROVED_FULL || d.decision === POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL)) {
        reconciliationStatus = POPS_RECONCILIATION_STATUS.DUPLICATE_REWARD;
        issues.push({
          code: POPS_RECONCILIATION_STATUS.DUPLICATE_REWARD,
          message: "Multiple approved rewards for same session/user/campaign",
          rewardDecisionId: d.id,
          sessionId: d.sessionId,
          campaignId: d.campaignId
        });
      }

      const needsWallet =
        d.decision === POPS_REWARD_DECISION_STATUS.APPROVED_FULL ||
        d.decision === POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL ||
        d.decision === POPS_REWARD_DECISION_STATUS.PENDING_REVIEW;
      const needsHoldWallet = d.decision === POPS_REWARD_DECISION_STATUS.HELD;

      if (needsWallet && !snap && reconciliationStatus === POPS_RECONCILIATION_STATUS.MATCHED) {
        reconciliationStatus = POPS_RECONCILIATION_STATUS.MISSING_WALLET_INTENT;
        issues.push({
          code: POPS_RECONCILIATION_STATUS.MISSING_WALLET_INTENT,
          message: "Approved or pending-review reward missing wallet snapshot",
          rewardDecisionId: d.id,
          sessionId: d.sessionId
        });
      }

      if (needsHoldWallet && !snap && reconciliationStatus === POPS_RECONCILIATION_STATUS.MATCHED) {
        reconciliationStatus = POPS_RECONCILIATION_STATUS.MISSING_WALLET_INTENT;
        issues.push({
          code: POPS_RECONCILIATION_STATUS.MISSING_WALLET_INTENT,
          message: "HELD reward missing wallet hold snapshot",
          rewardDecisionId: d.id
        });
      }

      const funded = funding && funding.fundedMinor > 0 && funding.requiresBudgetReservation;
      if (funded && !reserve && !isDeniedDecision(d.decision) && d.decision !== POPS_REWARD_DECISION_STATUS.DENIED_DUPLICATE) {
        if (reconciliationStatus === POPS_RECONCILIATION_STATUS.MATCHED) {
          reconciliationStatus = POPS_RECONCILIATION_STATUS.MISSING_BUDGET_RECORD;
          issues.push({
            code: POPS_RECONCILIATION_STATUS.MISSING_BUDGET_RECORD,
            message: "Funded campaign requires budget reservation row",
            rewardDecisionId: d.id,
            campaignId: d.campaignId
          });
        }
      }

      if (snap && snap.amountMinor !== d.finalAmount) {
        if (reconciliationStatus === POPS_RECONCILIATION_STATUS.MATCHED) {
          reconciliationStatus = POPS_RECONCILIATION_STATUS.AMOUNT_MISMATCH;
          issues.push({
            code: POPS_RECONCILIATION_STATUS.AMOUNT_MISMATCH,
            message: `Wallet amount ${snap.amountMinor} != decision finalAmount ${d.finalAmount}`,
            rewardDecisionId: d.id
          });
        }
      }

      if (isDeniedDecision(d.decision) && snap && snap.lifecycle === "RELEASED") {
        reconciliationStatus = POPS_RECONCILIATION_STATUS.FAILED_REQUIRES_REVIEW;
        issues.push({
          code: "DENIED_WITH_RELEASED_WALLET",
          message: "Denied reward must not have released wallet value",
          rewardDecisionId: d.id
        });
      }

      if (snap?.lifecycle === "HELD" && snap.releaseEligibleAt) {
        const eligible = Date.parse(snap.releaseEligibleAt);
        const n = Date.parse(nowFn());
        if (n - eligible > holdMax) {
          issues.push({
            code: "HELD_EXPIRED_UNRESOLVED",
            message: "Hold exceeded allowed window without release or deny",
            rewardDecisionId: d.id
          });
          if (reconciliationStatus === POPS_RECONCILIATION_STATUS.MATCHED) {
            reconciliationStatus = POPS_RECONCILIATION_STATUS.FAILED_REQUIRES_REVIEW;
          }
        }
      }

      const budgetStatus = this.budget.expectedBudgetStatus({
        decision: d.decision,
        wallet: walletStatus,
        funding,
        reserve,
        fraudSavedBudget: false
      });

      if (
        reconciliationStatus === POPS_RECONCILIATION_STATUS.MATCHED &&
        funded &&
        reserve &&
        reserve.reserveStatus === "OPEN" &&
        reserve.debitedMinor === 0 &&
        d.finalAmount > 0 &&
        needsWallet &&
        snap
      ) {
        reconciliationStatus = POPS_RECONCILIATION_STATUS.PENDING_BUDGET;
      }

      if (reconciliationStatus === POPS_RECONCILIATION_STATUS.MATCHED) {
        matchedCount += 1;
      } else {
        failedCount += 1;
      }

      records.push({
        id: id("pops_econ_rec"),
        sessionId: d.sessionId,
        campaignId: d.campaignId,
        userId: d.userId,
        rewardDecisionId: d.id,
        walletIntentId: snap?.id ?? null,
        budgetReserveId: reserve?.id ?? null,
        coinType: d.coinType,
        baseAmount: d.baseAmount,
        finalAmount: d.finalAmount,
        decisionStatus: d.decision,
        budgetStatus,
        walletStatus,
        reconciliationStatus,
        createdAt: nowIso(options.now)
      });
    }

    return {
      runId,
      range,
      records,
      issues,
      matchedCount,
      failedCount,
      startedAt,
      finishedAt: nowIso(options.now)
    };
  }
}

function inferWalletStatusFromDecision(d: PopsRewardDecision): PopsEconomicWalletStatus {
  if (isDeniedDecision(d.decision)) {
    return POPS_ECONOMIC_WALLET_STATUS.NONE;
  }
  if (d.decision === POPS_REWARD_DECISION_STATUS.DENIED_DUPLICATE) {
    return POPS_ECONOMIC_WALLET_STATUS.NONE;
  }
  if (d.walletTransactionIntent) {
    return POPS_ECONOMIC_WALLET_STATUS.PENDING;
  }
  if (d.decision === POPS_REWARD_DECISION_STATUS.HELD) {
    return POPS_ECONOMIC_WALLET_STATUS.HELD;
  }
  return POPS_ECONOMIC_WALLET_STATUS.NONE;
}

/** Job entrypoint: reconciles P.O.P.S economics for a time window. */
export async function runPopsEconomicReconciliation(
  reader: PopsEconomicReconciliationReader,
  dateRange: PopsEconomicDateRange,
  options?: PopsEconomicReconciliationOptions
): Promise<PopsEconomicReconciliationRunResult> {
  return new PopsRewardReconciliationService(reader).runPopsEconomicReconciliation(dateRange, options);
}
