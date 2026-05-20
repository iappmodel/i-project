import { describe, expect, it } from "vitest";
import { POPS_REWARD_DECISION_STATUS } from "../../rewards/pops-reward-decision.types";
import type { PopsRewardDecision } from "../../rewards/pops-reward-decision.types";
import { PopsBudgetReconciliationService } from "../pops-budget-reconciliation.service";
import { buildPopsBrandInvoiceExport } from "../pops-brand-invoice-export";
import { PopsEconomicAuditService, PopsInMemoryEconomicAuditSink } from "../pops-economic-audit.service";
import {
  POPS_BUDGET_STATUS,
  POPS_ECONOMIC_WALLET_STATUS,
  POPS_RECONCILIATION_STATUS,
  type PopsCampaignBudgetReservation,
  type PopsCampaignFunding,
  type PopsEconomicDateRange,
  type PopsWalletIntentSnapshot
} from "../pops-economic.types";
import {
  PopsRewardReconciliationService,
  runPopsEconomicReconciliation,
  type PopsEconomicReconciliationReader
} from "../pops-reward-reconciliation.service";

const range: PopsEconomicDateRange = {
  start: "2026-01-01T00:00:00.000Z",
  end: "2026-12-31T23:59:59.999Z"
};

function decision(partial: Partial<PopsRewardDecision> & Pick<PopsRewardDecision, "id" | "decision" | "finalAmount">): PopsRewardDecision {
  return {
    privacyReceiptId: undefined,
    sessionId: "sess_1",
    userId: "user_1",
    campaignId: "camp_1",
    contentId: "c1",
    coinType: "ICOIN",
    baseAmount: 100,
    rewardQuality: 0.9,
    presenceConfidence: 0.9,
    attentionConfidence: 0.9,
    intentConfidence: 0.9,
    continuityConfidence: 0.9,
    fraudRisk: 0.05,
    holdRequired: false,
    holdReason: null,
    reasonCodes: [],
    walletTransactionIntent: null,
    createdAt: "2026-04-01T12:00:00.000Z",
    ...partial
  };
}

class MemoryReader implements PopsEconomicReconciliationReader {
  decisions: PopsRewardDecision[] = [];
  snapshots: PopsWalletIntentSnapshot[] = [];
  reserves: PopsCampaignBudgetReservation[] = [];
  funding: PopsCampaignFunding | null = {
    campaignId: "camp_1",
    fundedMinor: 1_000_000,
    requiresBudgetReservation: true,
    holdAccountingPolicy: "DEBIT_ON_HOLD"
  };

  async listDecisions(_range: PopsEconomicDateRange): Promise<PopsRewardDecision[]> {
    return this.decisions;
  }

  async listWalletSnapshots(_range: PopsEconomicDateRange): Promise<PopsWalletIntentSnapshot[]> {
    return this.snapshots;
  }

  async listBudgetReservations(_range: PopsEconomicDateRange): Promise<PopsCampaignBudgetReservation[]> {
    return this.reserves;
  }

  async getCampaignFunding(campaignId: string): Promise<PopsCampaignFunding | null> {
    if (campaignId !== "camp_1") return null;
    return this.funding;
  }
}

describe("PopsBudgetReconciliationService", () => {
  const svc = new PopsBudgetReconciliationService();
  const funding: PopsCampaignFunding = {
    campaignId: "c",
    fundedMinor: 5000,
    requiresBudgetReservation: true,
    holdAccountingPolicy: "KEEP_RESERVED"
  };

  it("approved + pending wallet → DEBITED_PENDING", () => {
    const st = svc.expectedBudgetStatus({
      decision: POPS_REWARD_DECISION_STATUS.APPROVED_FULL,
      wallet: POPS_ECONOMIC_WALLET_STATUS.PENDING,
      funding,
      reserve: null
    });
    expect(st).toBe(POPS_BUDGET_STATUS.DEBITED_PENDING);
  });

  it("denied + no wallet release → RELEASED_BACK_TO_CAMPAIGN", () => {
    const st = svc.expectedBudgetStatus({
      decision: POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK,
      wallet: POPS_ECONOMIC_WALLET_STATUS.NONE,
      funding,
      reserve: null
    });
    expect(st).toBe(POPS_BUDGET_STATUS.RELEASED_BACK_TO_CAMPAIGN);
  });

  it("unfunded campaign → NOT_REQUIRED", () => {
    const st = svc.expectedBudgetStatus({
      decision: POPS_REWARD_DECISION_STATUS.APPROVED_FULL,
      wallet: POPS_ECONOMIC_WALLET_STATUS.PENDING,
      funding: { campaignId: "c", fundedMinor: 0, requiresBudgetReservation: true, holdAccountingPolicy: "KEEP_RESERVED" },
      reserve: null
    });
    expect(st).toBe(POPS_BUDGET_STATUS.NOT_REQUIRED);
  });
});

describe("runPopsEconomicReconciliation", () => {
  it("PENDING_BUDGET when reserve is still OPEN and not debited while wallet pending exists", async () => {
    const reader = new MemoryReader();
    const rid = "pops_reward_decision_open_budget";
    reader.decisions = [
      decision({
        id: rid,
        decision: POPS_REWARD_DECISION_STATUS.APPROVED_FULL,
        finalAmount: 80,
        walletTransactionIntent: { type: "PENDING_REWARD", status: "PENDING_AVAILABLE_SOON", amountMinor: 80, hold: false }
      })
    ];
    reader.snapshots = [
      {
        id: "w_open",
        rewardDecisionId: rid,
        sessionId: "sess_1",
        userId: "user_1",
        campaignId: "camp_1",
        coinType: "ICOIN",
        amountMinor: 80,
        lifecycle: "PENDING",
        releaseEligibleAt: null,
        expiresAt: null,
        createdAt: "2026-04-01T12:00:00.000Z"
      }
    ];
    reader.reserves = [
      {
        id: "br_open",
        campaignId: "camp_1",
        sessionId: "sess_1",
        userId: "user_1",
        rewardDecisionId: rid,
        estimatedRewardMinor: 80,
        debitedMinor: 0,
        releasedBackMinor: 0,
        reserveStatus: "OPEN",
        createdAt: "2026-04-01T12:00:00.000Z",
        updatedAt: null
      }
    ];
    const result = await runPopsEconomicReconciliation(reader, range);
    expect(result.records[0]?.reconciliationStatus).toBe(POPS_RECONCILIATION_STATUS.PENDING_BUDGET);
    expect(result.failedCount).toBe(1);
  });

  it("MATCHED when approved decision has wallet + budget + amounts align", async () => {
    const reader = new MemoryReader();
    const rid = "pops_reward_decision_match_1";
    reader.decisions = [
      decision({
        id: rid,
        decision: POPS_REWARD_DECISION_STATUS.APPROVED_FULL,
        finalAmount: 250,
        walletTransactionIntent: { type: "PENDING_REWARD", status: "PENDING_AVAILABLE_SOON", amountMinor: 250, hold: false }
      })
    ];
    reader.snapshots = [
      {
        id: "w1",
        rewardDecisionId: rid,
        sessionId: "sess_1",
        userId: "user_1",
        campaignId: "camp_1",
        coinType: "ICOIN",
        amountMinor: 250,
        lifecycle: "PENDING",
        releaseEligibleAt: null,
        expiresAt: null,
        createdAt: "2026-04-01T12:00:01.000Z"
      }
    ];
    reader.reserves = [
      {
        id: "br1",
        campaignId: "camp_1",
        sessionId: "sess_1",
        userId: "user_1",
        rewardDecisionId: rid,
        estimatedRewardMinor: 250,
        debitedMinor: 250,
        releasedBackMinor: 0,
        reserveStatus: "DEBITED_PENDING",
        createdAt: "2026-04-01T12:00:00.000Z",
        updatedAt: null
      }
    ];

    const result = await runPopsEconomicReconciliation(reader, range);
    expect(result.failedCount).toBe(0);
    expect(result.matchedCount).toBe(1);
    expect(result.records[0]?.reconciliationStatus).toBe(POPS_RECONCILIATION_STATUS.MATCHED);
    expect(result.records[0]?.budgetStatus).toBe(POPS_BUDGET_STATUS.DEBITED_PENDING);
  });

  it("MISSING_WALLET_INTENT for approved full without snapshot", async () => {
    const reader = new MemoryReader();
    reader.decisions = [
      decision({
        id: "pops_reward_decision_nowallet",
        decision: POPS_REWARD_DECISION_STATUS.APPROVED_FULL,
        finalAmount: 100,
        walletTransactionIntent: { type: "PENDING_REWARD", status: "PENDING_AVAILABLE_SOON", amountMinor: 100, hold: false }
      })
    ];
    const result = await new PopsRewardReconciliationService(reader).runPopsEconomicReconciliation(range);
    expect(result.records[0]?.reconciliationStatus).toBe(POPS_RECONCILIATION_STATUS.MISSING_WALLET_INTENT);
    expect(result.failedCount).toBe(1);
  });

  it("DUPLICATE_REWARD when two wallet rows for same decision", async () => {
    const reader = new MemoryReader();
    const rid = "pops_reward_decision_dupw";
    reader.decisions = [
      decision({
        id: rid,
        decision: POPS_REWARD_DECISION_STATUS.APPROVED_FULL,
        finalAmount: 50,
        walletTransactionIntent: { type: "PENDING_REWARD", status: "PENDING_AVAILABLE_SOON", amountMinor: 50, hold: false }
      })
    ];
    reader.snapshots = [
      {
        id: "w_a",
        rewardDecisionId: rid,
        sessionId: "sess_1",
        userId: "user_1",
        campaignId: "camp_1",
        coinType: "ICOIN",
        amountMinor: 50,
        lifecycle: "PENDING",
        releaseEligibleAt: null,
        expiresAt: null,
        createdAt: "2026-04-01T12:00:00.000Z"
      },
      {
        id: "w_b",
        rewardDecisionId: rid,
        sessionId: "sess_1",
        userId: "user_1",
        campaignId: "camp_1",
        coinType: "ICOIN",
        amountMinor: 50,
        lifecycle: "PENDING",
        releaseEligibleAt: null,
        expiresAt: null,
        createdAt: "2026-04-01T12:00:01.000Z"
      }
    ];
    reader.reserves = [
      {
        id: "br_dup",
        campaignId: "camp_1",
        sessionId: "sess_1",
        userId: "user_1",
        rewardDecisionId: rid,
        estimatedRewardMinor: 50,
        debitedMinor: 50,
        releasedBackMinor: 0,
        reserveStatus: "DEBITED_PENDING",
        createdAt: "2026-04-01T12:00:00.000Z",
        updatedAt: null
      }
    ];
    const result = await runPopsEconomicReconciliation(reader, range);
    expect(result.records[0]?.reconciliationStatus).toBe(POPS_RECONCILIATION_STATUS.DUPLICATE_REWARD);
  });

  it("FAILED_REQUIRES_REVIEW when denied decision has released wallet", async () => {
    const reader = new MemoryReader();
    const rid = "pops_reward_decision_bad";
    reader.decisions = [
      decision({
        id: rid,
        decision: POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK,
        finalAmount: 0
      })
    ];
    reader.snapshots = [
      {
        id: "w_x",
        rewardDecisionId: rid,
        sessionId: "sess_1",
        userId: "user_1",
        campaignId: "camp_1",
        coinType: "ICOIN",
        amountMinor: 0,
        lifecycle: "RELEASED",
        releaseEligibleAt: null,
        expiresAt: null,
        createdAt: "2026-04-01T12:00:00.000Z"
      }
    ];
    const result = await runPopsEconomicReconciliation(reader, range);
    expect(result.records[0]?.reconciliationStatus).toBe(POPS_RECONCILIATION_STATUS.FAILED_REQUIRES_REVIEW);
  });
});

describe("PopsEconomicAuditService", () => {
  it("appends audit row for reconciliation run", async () => {
    const sink = new PopsInMemoryEconomicAuditSink();
    const audit = new PopsEconomicAuditService(sink);
    await audit.recordReconciliationRun({
      runId: "run_1",
      range,
      records: [],
      issues: [],
      matchedCount: 3,
      failedCount: 0,
      startedAt: "2026-04-01T00:00:00.000Z",
      finishedAt: "2026-04-01T00:00:01.000Z"
    });
    expect(sink.entries).toHaveLength(1);
    expect(sink.entries[0]?.level).toBe("INFO");
  });
});

describe("buildPopsBrandInvoiceExport", () => {
  it("computes counts and cost metrics", () => {
    const invoice = buildPopsBrandInvoiceExport({
      campaignId: "camp_1",
      dateRange: range,
      records: [
        {
          id: "1",
          sessionId: "s",
          campaignId: "camp_1",
          userId: "u",
          rewardDecisionId: "d1",
          walletIntentId: "w",
          budgetReserveId: "b",
          coinType: "ICOIN",
          baseAmount: 100,
          finalAmount: 100,
          decisionStatus: POPS_REWARD_DECISION_STATUS.APPROVED_FULL,
          budgetStatus: POPS_BUDGET_STATUS.DEBITED_RELEASED,
          walletStatus: POPS_ECONOMIC_WALLET_STATUS.RELEASED,
          reconciliationStatus: POPS_RECONCILIATION_STATUS.MATCHED,
          createdAt: "2026-04-01T00:00:00.000Z"
        },
        {
          id: "2",
          sessionId: "s2",
          campaignId: "camp_1",
          userId: "u",
          rewardDecisionId: "d2",
          walletIntentId: null,
          budgetReserveId: null,
          coinType: "ICOIN",
          baseAmount: 50,
          finalAmount: 0,
          decisionStatus: POPS_REWARD_DECISION_STATUS.DENIED_DUPLICATE,
          budgetStatus: POPS_BUDGET_STATUS.NOT_REQUIRED,
          walletStatus: POPS_ECONOMIC_WALLET_STATUS.NONE,
          reconciliationStatus: POPS_RECONCILIATION_STATUS.MATCHED,
          createdAt: "2026-04-01T00:00:00.000Z"
        }
      ]
    });
    expect(invoice.approvedFullCount).toBe(1);
    expect(invoice.deniedCount).toBe(1);
    expect(invoice.releasedRewardTotal).toBe(100);
    expect(invoice.costPerVerifiedIntent).toBe(100);
  });
});
