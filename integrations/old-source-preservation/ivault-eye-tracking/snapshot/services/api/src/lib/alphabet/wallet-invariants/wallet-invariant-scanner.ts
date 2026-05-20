import {
  fetchCampaignBudgetRowDb,
  fetchWalletAccountInvariantBundleDb,
  listWalletAccountsForInvariantScanDb
} from "../db-repositories/wallet-invariants.repository";
import { evaluateAndPersistWalletInvariant } from "./wallet-invariant-store";
import {
  calculateBalanceDeltas,
  computeBalancesFromLedgers,
  computeLedgerDeltaSum,
  computeLedgerSignedSumFromAmount,
  computeValueLotTotal,
  ledgerSignedAmount,
  ledgerIsPosted,
  roundMoney,
  toNumber
} from "./wallet-invariant-normalizers";
import type {
  WalletInvariantRiskScores,
  WalletInvariantScannerResult,
  WalletInvariantSignalInput,
  WalletInvariantType
} from "@/types/alphabet/wallet-invariant.types";

const EPSILON = 0.000001;

const EXTERNAL_TRANSFER_SUCCESS_STATUSES = new Set([
  "completed",
  "succeeded",
  "success",
  "paid",
  "settled"
]);

function isMismatch(value: number | null | undefined): boolean {
  return Math.abs(value ?? 0) > EPSILON;
}

function readJsonObject(row: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = row[key];
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function extractCampaignId(
  account: Record<string, unknown>,
  wallet: Record<string, unknown> | null | undefined
): string | null {
  const am = readJsonObject(account, "metadata");
  const wm = wallet ? readJsonObject(wallet, "metadata") : {};
  const raw = am.campaign_id ?? am.campaignId ?? wm.campaign_id ?? wm.campaignId;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function accountAllowsNegative(account: Record<string, unknown>): boolean {
  if (Boolean(account.allow_negative)) return true;
  const m = readJsonObject(account, "metadata");
  return Boolean(m.allow_negative ?? m.allowNegative);
}

function defaultRiskScores(overrides?: Partial<WalletInvariantRiskScores>): WalletInvariantRiskScores {
  return {
    financialImpactScore: overrides?.financialImpactScore ?? 0.75,
    userImpactScore: overrides?.userImpactScore ?? 0.65,
    exploitabilityScore: overrides?.exploitabilityScore ?? 0.3,
    recurrenceRiskScore: overrides?.recurrenceRiskScore ?? 0.4,
    confidenceScore: overrides?.confidenceScore ?? 0.9,
    repairComplexityScore: overrides?.repairComplexityScore ?? 0.7
  };
}

function externalTransferIsSuccess(transfer: Record<string, unknown>): boolean {
  return EXTERNAL_TRANSFER_SUCCESS_STATUSES.has(String(transfer.status ?? "").toLowerCase());
}

function nullableId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function collectIds(item: Awaited<ReturnType<typeof evaluateAndPersistWalletInvariant>>): {
  alertIds: string[];
  reviewCaseIds: string[];
  eventIds: string[];
} {
  const alertIds: string[] = [];
  const reviewCaseIds: string[] = [];
  const eventIds: string[] = [...(item.eventIds ?? [])];

  const opAlert = item.operationalAlert?.alert as Record<string, unknown> | null | undefined;
  if (opAlert?.alert_id) alertIds.push(String(opAlert.alert_id));

  const opReview = item.operationalAlert?.reviewCase as Record<string, unknown> | null | undefined;
  if (opReview?.review_case_id) reviewCaseIds.push(String(opReview.review_case_id));

  const extra = item.extraReviewCase as Record<string, unknown> | null | undefined;
  if (extra?.review_case_id) reviewCaseIds.push(String(extra.review_case_id));

  return { alertIds, reviewCaseIds, eventIds };
}

function isReversalLedger(row: Record<string, unknown>): boolean {
  const st = String(row.source_type ?? "").toLowerCase();
  return st === "ledger_reversal" || st.includes("reversal");
}

function ledgerShouldHaveValueLot(row: Record<string, unknown>): boolean {
  if (!ledgerIsPosted(row)) return false;
  if (toNumber(row.available_delta) <= 0) return false;
  const dir = String(row.direction ?? "").toLowerCase();
  if (dir !== "credit") return false;
  if (isReversalLedger(row)) return false;
  const rc = String(row.reason_code ?? "").toLowerCase();
  if (
    rc.includes("transfer") ||
    rc.includes("conversion") ||
    rc.includes("reversal") ||
    rc.includes("writeoff") ||
    rc.includes("system_adj")
  ) {
    return false;
  }
  return true;
}

function valueLotSourceId(lot: Record<string, unknown>): string | null {
  const raw = lot.source_ledger_entry_id ?? lot.sourceLedgerEntryId;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

async function scanWalletAccount(walletAccountId: string) {
  const bundle = await fetchWalletAccountInvariantBundleDb(walletAccountId);

  const account = bundle.walletAccount as Record<string, unknown>;
  const wallet = (bundle.wallet ?? null) as Record<string, unknown> | null;
  const ledgers = bundle.ledgers as Array<Record<string, unknown>>;
  const valueLots = bundle.valueLots as Array<Record<string, unknown>>;
  const externalTransfers = bundle.externalTransfers as Array<Record<string, unknown>>;
  const compensations = bundle.compensations as Array<Record<string, unknown>>;
  const siblingAccounts = bundle.siblingAccounts as Array<Record<string, unknown>>;
  const walletLedgers = bundle.walletLedgers as Array<Record<string, unknown>>;

  const computed = computeBalancesFromLedgers(ledgers);

  const storedAvailableBalance = toNumber(account.available_balance);
  const storedPendingBalance = toNumber(account.pending_balance);
  const storedReservedBalance = toNumber(account.locked_balance);
  const storedTotalBalance = roundMoney(
    storedAvailableBalance + storedPendingBalance + storedReservedBalance
  );

  const deltas = calculateBalanceDeltas({
    ...computed,
    storedAvailableBalance,
    storedPendingBalance,
    storedReservedBalance,
    storedTotalBalance
  });

  const allowNegative = accountAllowsNegative(account);
  const uid = nullableId(account.user_id);
  const wid = nullableId(account.wallet_id);
  const waid = nullableId(account.wallet_account_id);
  const results: Awaited<ReturnType<typeof evaluateAndPersistWalletInvariant>>[] = [];

  const anyBalanceMismatch =
    isMismatch(deltas.availableDelta) ||
    isMismatch(deltas.pendingDelta) ||
    isMismatch(deltas.reservedDelta) ||
    isMismatch(deltas.totalDelta);

  results.push(
    await evaluateAndPersistWalletInvariant({
      invariantType: "wallet_account_balance_mismatch",
      scanScope: "single_wallet_account",
      linkedObjectIds: {
        userId: uid,
        walletId: wid,
        walletAccountId: waid
      },
      balances: {
        ...computed,
        storedAvailableBalance,
        storedPendingBalance,
        storedReservedBalance,
        storedTotalBalance,
        ...deltas
      },
      riskScores: defaultRiskScores({
        financialImpactScore: anyBalanceMismatch ? 0.85 : 0.1,
        confidenceScore: 0.95
      }),
      evidence: {
        walletAccountId: account.wallet_account_id,
        ledgerCount: ledgers.length,
        computed,
        stored: {
          available: storedAvailableBalance,
          pending: storedPendingBalance,
          reserved: storedReservedBalance,
          total: storedTotalBalance
        },
        deltas
      } as WalletInvariantSignalInput["evidence"],
      redactedEvidence: {
        walletAccountId: account.wallet_account_id,
        walletId: account.wallet_id,
        ledgerCount: ledgers.length,
        computed,
        stored: {
          available: storedAvailableBalance,
          pending: storedPendingBalance,
          reserved: storedReservedBalance,
          total: storedTotalBalance
        },
        deltas
      } as WalletInvariantSignalInput["redactedEvidence"],
      sourceEventIds: [],
      mismatchDetected: anyBalanceMismatch,
      negativeBalanceDetected: false,
      moneyMovementAffected: anyBalanceMismatch,
      externalProviderAffected: false,
      userVisibleAffected: true,
      allowNegative,
      now: new Date().toISOString(),
      metadata: { scanner: "wallet_account_balance" }
    })
  );

  const walletComputed = computeBalancesFromLedgers(walletLedgers);
  let siblingsStoredTotal = 0;
  for (const s of siblingAccounts) {
    siblingsStoredTotal += roundMoney(
      toNumber(s.available_balance) + toNumber(s.pending_balance) + toNumber(s.locked_balance)
    );
  }
  const walletBalanceMismatch =
    Math.abs(walletComputed.computedTotalBalance - roundMoney(siblingsStoredTotal)) > EPSILON;

  if (walletBalanceMismatch) {
    results.push(
      await evaluateAndPersistWalletInvariant({
        invariantType: "wallet_balance_mismatch",
        scanScope: "single_wallet",
        linkedObjectIds: {
          userId: uid,
          walletId: wid,
          walletAccountId: waid
        },
        balances: {
          computedTotalBalance: walletComputed.computedTotalBalance,
          storedTotalBalance: roundMoney(siblingsStoredTotal),
          totalDelta: roundMoney(roundMoney(siblingsStoredTotal) - walletComputed.computedTotalBalance)
        },
        riskScores: defaultRiskScores({ financialImpactScore: 0.9, confidenceScore: 0.92 }),
        evidence: {
          walletComputed,
          siblingsStoredTotal,
          siblingCount: siblingAccounts.length,
          walletLedgerCount: walletLedgers.length
        } as WalletInvariantSignalInput["evidence"],
        redactedEvidence: {
          walletId: account.wallet_id,
          walletComputedTotal: walletComputed.computedTotalBalance,
          siblingsStoredTotal: roundMoney(siblingsStoredTotal)
        } as WalletInvariantSignalInput["redactedEvidence"],
        sourceEventIds: [],
        mismatchDetected: true,
        negativeBalanceDetected: false,
        moneyMovementAffected: true,
        externalProviderAffected: false,
        userVisibleAffected: true,
        allowNegative,
        now: new Date().toISOString(),
        metadata: { scanner: "wallet_balance" }
      })
    );
  }

  const deltaSum = computeLedgerDeltaSum(ledgers);
  const signedSum = computeLedgerSignedSumFromAmount(ledgers);
  if (Math.abs(deltaSum - signedSum) > EPSILON) {
    results.push(
      await evaluateAndPersistWalletInvariant({
        invariantType: "ledger_sum_mismatch",
        scanScope: "single_wallet_account",
        linkedObjectIds: {
          userId: uid,
          walletId: wid,
          walletAccountId: waid
        },
        balances: {
          computedTotalBalance: deltaSum,
          storedTotalBalance: signedSum,
          totalDelta: roundMoney(signedSum - deltaSum)
        },
        riskScores: defaultRiskScores({ financialImpactScore: 0.95, confidenceScore: 0.9 }),
        evidence: { deltaSum, signedSum, ledgerCount: ledgers.length } as WalletInvariantSignalInput["evidence"],
        redactedEvidence: { deltaSum, signedSum } as WalletInvariantSignalInput["redactedEvidence"],
        sourceEventIds: [],
        mismatchDetected: true,
        negativeBalanceDetected: false,
        moneyMovementAffected: true,
        externalProviderAffected: false,
        userVisibleAffected: false,
        allowNegative: false,
        now: new Date().toISOString(),
        metadata: { scanner: "ledger_sum" }
      })
    );
  }

  const negativeChecks: Array<[WalletInvariantType, number]> = [
    ["wallet_negative_available_balance", storedAvailableBalance],
    ["wallet_negative_pending_balance", storedPendingBalance],
    ["wallet_negative_reserved_balance", storedReservedBalance]
  ];

  for (const [invariantType, balance] of negativeChecks) {
    if (balance < -EPSILON) {
      results.push(
        await evaluateAndPersistWalletInvariant({
          invariantType,
          scanScope: "single_wallet_account",
          linkedObjectIds: {
            userId: uid,
            walletId: wid,
            walletAccountId: waid
          },
          balances: {
            ...computed,
            storedAvailableBalance,
            storedPendingBalance,
            storedReservedBalance,
            storedTotalBalance,
            ...deltas
          },
          riskScores: defaultRiskScores({
            financialImpactScore: 0.95,
            userImpactScore: 0.9,
            exploitabilityScore: 0.5,
            confidenceScore: 0.98,
            repairComplexityScore: 0.8
          }),
          evidence: {
            walletAccountId: account.wallet_account_id,
            negativeBalance: balance,
            invariantType
          } as WalletInvariantSignalInput["evidence"],
          redactedEvidence: {
            walletAccountId: account.wallet_account_id,
            walletId: account.wallet_id,
            negativeBalance: balance,
            invariantType
          } as WalletInvariantSignalInput["redactedEvidence"],
          sourceEventIds: [],
          mismatchDetected: true,
          negativeBalanceDetected: true,
          moneyMovementAffected: true,
          externalProviderAffected: false,
          userVisibleAffected: true,
          allowNegative,
          now: new Date().toISOString(),
          metadata: { scanner: "negative_balance" }
        })
      );
    }
  }

  const maxBucket = Math.max(storedAvailableBalance, storedPendingBalance, storedReservedBalance);
  if (storedTotalBalance > EPSILON && maxBucket > storedTotalBalance + EPSILON) {
    results.push(
      await evaluateAndPersistWalletInvariant({
        invariantType: "impossible_wallet_state",
        scanScope: "single_wallet_account",
        linkedObjectIds: {
          userId: nullableId(account.user_id),
          walletId: nullableId(account.wallet_id),
          walletAccountId: nullableId(account.wallet_account_id)
        },
        balances: {
          ...computed,
          storedAvailableBalance,
          storedPendingBalance,
          storedReservedBalance,
          storedTotalBalance,
          ...deltas
        },
        riskScores: defaultRiskScores({ financialImpactScore: 0.98, confidenceScore: 0.95 }),
        evidence: {
          accountSnapshot: { storedTotalBalance, maxBucket, storedAvailableBalance, storedPendingBalance, storedReservedBalance }
        } as WalletInvariantSignalInput["evidence"],
        redactedEvidence: {
          walletAccountId: account.wallet_account_id,
          storedTotalBalance,
          maxBucket
        } as WalletInvariantSignalInput["redactedEvidence"],
        sourceEventIds: [],
        mismatchDetected: true,
        negativeBalanceDetected: false,
        moneyMovementAffected: true,
        externalProviderAffected: false,
        userVisibleAffected: true,
        allowNegative,
        now: new Date().toISOString(),
        metadata: { scanner: "impossible_wallet_state" }
      })
    );
  }

  const valueLotTotal = computeValueLotTotal(valueLots);
  const ledgerAvailableTotal = computed.computedAvailableBalance;

  if (Math.abs(valueLotTotal - ledgerAvailableTotal) > EPSILON) {
    results.push(
      await evaluateAndPersistWalletInvariant({
        invariantType: "value_lot_sum_mismatch",
        scanScope: "single_wallet_account",
        linkedObjectIds: {
          userId: uid,
          walletId: wid,
          walletAccountId: waid
        },
        balances: {
          computedAvailableBalance: valueLotTotal,
          storedAvailableBalance: ledgerAvailableTotal,
          availableDelta: roundMoney(ledgerAvailableTotal - valueLotTotal)
        },
        riskScores: defaultRiskScores({ financialImpactScore: 0.75, confidenceScore: 0.9 }),
        evidence: {
          valueLotCount: valueLots.length,
          valueLotTotal,
          ledgerAvailableTotal
        } as WalletInvariantSignalInput["evidence"],
        redactedEvidence: {
          walletAccountId: account.wallet_account_id,
          valueLotCount: valueLots.length,
          valueLotTotal,
          ledgerAvailableTotal
        } as WalletInvariantSignalInput["redactedEvidence"],
        sourceEventIds: [],
        mismatchDetected: true,
        negativeBalanceDetected: false,
        moneyMovementAffected: true,
        externalProviderAffected: false,
        userVisibleAffected: false,
        allowNegative: false,
        now: new Date().toISOString(),
        metadata: { scanner: "value_lot_sum" }
      })
    );
  }

  const ledgerIds = new Set(ledgers.map((l) => String(l.ledger_entry_id ?? "")));
  for (const lot of valueLots) {
    const src = valueLotSourceId(lot);
    if (src && !ledgerIds.has(src)) {
      results.push(
        await evaluateAndPersistWalletInvariant({
          invariantType: "value_lot_without_ledger",
          scanScope: "single_wallet_account",
          linkedObjectIds: {
            userId: uid,
            walletId: wid,
            walletAccountId: waid,
            valueLotId: String(lot.value_lot_id ?? ""),
            ledgerEntryId: src
          },
          balances: {},
          riskScores: defaultRiskScores({ financialImpactScore: 0.8, confidenceScore: 0.88 }),
          evidence: { valueLot: lot } as WalletInvariantSignalInput["evidence"],
          redactedEvidence: {
            valueLotId: lot.value_lot_id,
            sourceLedgerEntryId: src
          } as WalletInvariantSignalInput["redactedEvidence"],
          sourceEventIds: [],
          mismatchDetected: true,
          negativeBalanceDetected: false,
          moneyMovementAffected: true,
          externalProviderAffected: false,
          userVisibleAffected: false,
          allowNegative: false,
          now: new Date().toISOString(),
          metadata: { scanner: "value_lot_without_ledger" }
        })
      );
    }
  }

  const lotSourceIds = new Set(
    valueLots.map((l) => valueLotSourceId(l)).filter((x): x is string => Boolean(x))
  );
  for (const ledger of ledgers) {
    if (!ledgerShouldHaveValueLot(ledger)) continue;
    const lid = String(ledger.ledger_entry_id ?? "");
    if (!lotSourceIds.has(lid)) {
      results.push(
        await evaluateAndPersistWalletInvariant({
          invariantType: "ledger_without_value_lot",
          scanScope: "single_wallet_account",
          linkedObjectIds: {
            userId: uid,
            walletId: wid,
            walletAccountId: waid,
            ledgerEntryId: lid
          },
          balances: {},
          riskScores: defaultRiskScores({
            financialImpactScore: 0.45,
            confidenceScore: 0.85,
            exploitabilityScore: 0.2
          }),
          evidence: { ledgerEntry: ledger } as WalletInvariantSignalInput["evidence"],
          redactedEvidence: { ledgerEntryId: lid, reasonCode: ledger.reason_code } as WalletInvariantSignalInput["redactedEvidence"],
          sourceEventIds: [],
          mismatchDetected: true,
          negativeBalanceDetected: false,
          moneyMovementAffected: true,
          externalProviderAffected: false,
          userVisibleAffected: false,
          allowNegative: false,
          now: new Date().toISOString(),
          metadata: { scanner: "ledger_without_value_lot" }
        })
      );
    }
  }

  const reversalOriginalIds = new Map<string, Array<Record<string, unknown>>>();
  for (const ledger of ledgers) {
    if (!isReversalLedger(ledger)) continue;
    const oid = String(ledger.source_object_id ?? "");
    if (!oid) continue;
    const list = reversalOriginalIds.get(oid) ?? [];
    list.push(ledger);
    reversalOriginalIds.set(oid, list);
  }

  for (const [originalId, group] of reversalOriginalIds) {
    if (group.length > 1) {
      for (const ledger of group) {
        results.push(
          await evaluateAndPersistWalletInvariant({
            invariantType: "duplicate_reversal_detected",
            scanScope: "single_wallet_account",
            linkedObjectIds: {
              userId: uid,
              walletId: wid,
              walletAccountId: waid,
              ledgerEntryId: String(ledger.ledger_entry_id ?? ""),
              originalLedgerEntryId: originalId
            },
            balances: {},
            riskScores: defaultRiskScores({ financialImpactScore: 0.92, confidenceScore: 0.93 }),
            evidence: { originalId, reversalCount: group.length, reversals: group } as WalletInvariantSignalInput["evidence"],
            redactedEvidence: { originalLedgerEntryId: originalId, reversalCount: group.length } as WalletInvariantSignalInput["redactedEvidence"],
            sourceEventIds: [],
            mismatchDetected: true,
            negativeBalanceDetected: false,
            moneyMovementAffected: true,
            externalProviderAffected: false,
            userVisibleAffected: false,
            allowNegative: false,
            now: new Date().toISOString(),
            metadata: { scanner: "duplicate_reversal" }
          })
        );
      }
    }
  }

  for (const ledger of ledgers) {
    if (!isReversalLedger(ledger)) continue;
    const originalId = String(ledger.source_object_id ?? "");
    const original = ledgers.find((c) => String(c.ledger_entry_id ?? "") === originalId);

    if (!original) {
      results.push(
        await evaluateAndPersistWalletInvariant({
          invariantType: "reversal_without_original",
          scanScope: "single_wallet_account",
          linkedObjectIds: {
            userId: uid,
            walletId: wid,
            walletAccountId: waid,
            ledgerEntryId: String(ledger.ledger_entry_id ?? ""),
            originalLedgerEntryId: originalId
          },
          balances: {},
          riskScores: defaultRiskScores({
            financialImpactScore: 0.95,
            confidenceScore: 0.95
          }),
          evidence: { reversalLedgerEntry: ledger } as WalletInvariantSignalInput["evidence"],
          redactedEvidence: {
            ledgerEntryId: ledger.ledger_entry_id,
            originalLedgerEntryId: ledger.source_object_id
          } as WalletInvariantSignalInput["redactedEvidence"],
          sourceEventIds: [],
          mismatchDetected: true,
          negativeBalanceDetected: false,
          moneyMovementAffected: true,
          externalProviderAffected: false,
          userVisibleAffected: false,
          allowNegative: false,
          now: new Date().toISOString(),
          metadata: { scanner: "reversal_reference" }
        })
      );
      continue;
    }

    const revAmt = Math.abs(ledgerSignedAmount(ledger));
    const origAmt = Math.abs(ledgerSignedAmount(original));
    if (Math.abs(revAmt - origAmt) > EPSILON) {
      results.push(
        await evaluateAndPersistWalletInvariant({
          invariantType: "reversal_amount_mismatch",
          scanScope: "single_wallet_account",
          linkedObjectIds: {
            userId: uid,
            walletId: wid,
            walletAccountId: waid,
            ledgerEntryId: String(ledger.ledger_entry_id ?? ""),
            originalLedgerEntryId: String(original.ledger_entry_id ?? "")
          },
          balances: {
            computedTotalBalance: origAmt,
            storedTotalBalance: revAmt,
            totalDelta: roundMoney(revAmt - origAmt)
          },
          riskScores: defaultRiskScores({ financialImpactScore: 0.95, confidenceScore: 0.92 }),
          evidence: { reversal: ledger, original } as WalletInvariantSignalInput["evidence"],
          redactedEvidence: {
            reversalLedgerEntryId: ledger.ledger_entry_id,
            originalLedgerEntryId: original.ledger_entry_id,
            revAmt,
            origAmt
          } as WalletInvariantSignalInput["redactedEvidence"],
          sourceEventIds: [],
          mismatchDetected: true,
          negativeBalanceDetected: false,
          moneyMovementAffected: true,
          externalProviderAffected: false,
          userVisibleAffected: false,
          allowNegative: false,
          now: new Date().toISOString(),
          metadata: { scanner: "reversal_amount" }
        })
      );
    }
  }

  for (const ledger of ledgers) {
    const sourceType = String(ledger.source_type ?? "");
    const ledgerType = String(ledger.ledger_type ?? ledger.entry_type ?? "");

    const looksLikeWithdrawalDebit =
      ledgerType.toLowerCase().includes("withdrawal") ||
      sourceType.toLowerCase().includes("withdrawal") ||
      String(ledger.reason_code ?? "")
        .toLowerCase()
        .includes("withdrawal");

    if (looksLikeWithdrawalDebit && ledgerSignedAmount(ledger) < 0) {
      const transfer = externalTransfers.find(
        (candidate) => String(candidate.original_ledger_entry_id ?? "") === String(ledger.ledger_entry_id ?? "")
      );

      if (!transfer) {
        results.push(
          await evaluateAndPersistWalletInvariant({
            invariantType: "withdrawal_debit_without_external_transfer",
            scanScope: "single_wallet_account",
            linkedObjectIds: {
              userId: uid,
              walletId: wid,
              walletAccountId: waid,
              ledgerEntryId: String(ledger.ledger_entry_id ?? ""),
              executionRequestId: String(ledger.source_object_id ?? "")
            },
            balances: {},
            riskScores: defaultRiskScores({
              financialImpactScore: 0.85,
              userImpactScore: 0.85,
              confidenceScore: 0.9
            }),
            evidence: { withdrawalLedgerEntry: ledger } as WalletInvariantSignalInput["evidence"],
            redactedEvidence: {
              ledgerEntryId: ledger.ledger_entry_id,
              amount: ledger.amount,
              coinCode: ledger.coin_code
            } as WalletInvariantSignalInput["redactedEvidence"],
            sourceEventIds: [],
            mismatchDetected: true,
            negativeBalanceDetected: false,
            moneyMovementAffected: true,
            externalProviderAffected: true,
            userVisibleAffected: true,
            allowNegative: false,
            now: new Date().toISOString(),
            metadata: { scanner: "withdrawal_debit_external_transfer" }
          })
        );
      }
    }
  }

  for (const transfer of externalTransfers) {
    const hasDebit = Boolean(transfer.original_ledger_entry_id);

    if (!hasDebit && externalTransferIsSuccess(transfer)) {
      results.push(
        await evaluateAndPersistWalletInvariant({
          invariantType: "external_transfer_without_debit",
          scanScope: "external_transfer",
          linkedObjectIds: {
            userId: uid,
            walletId: wid,
            walletAccountId: waid,
            externalTransferId: String(transfer.external_transfer_id ?? ""),
            executionRequestId: String(transfer.original_execution_request_id ?? ""),
            pipelineId: String(transfer.pipeline_id ?? ""),
            sagaId: String(transfer.saga_id ?? "")
          },
          balances: {},
          riskScores: defaultRiskScores({
            financialImpactScore: 0.98,
            userImpactScore: 0.9,
            confidenceScore: 0.95,
            repairComplexityScore: 0.9
          }),
          evidence: { externalTransfer: transfer } as WalletInvariantSignalInput["evidence"],
          redactedEvidence: {
            externalTransferId: transfer.external_transfer_id,
            status: transfer.status,
            amount: transfer.amount,
            coinCode: transfer.coin_code
          } as WalletInvariantSignalInput["redactedEvidence"],
          sourceEventIds: [],
          mismatchDetected: true,
          negativeBalanceDetected: false,
          moneyMovementAffected: true,
          externalProviderAffected: true,
          userVisibleAffected: true,
          allowNegative: false,
          now: new Date().toISOString(),
          metadata: { scanner: "external_transfer_debit" }
        })
      );
    }

    const originalLedger = ledgers.find(
      (l) => String(l.ledger_entry_id ?? "") === String(transfer.original_ledger_entry_id ?? "")
    );

    if (originalLedger && hasDebit) {
      const transferAmount = toNumber(transfer.amount);
      const ledgerAmount = Math.abs(toNumber(originalLedger.amount));

      if (Math.abs(transferAmount - ledgerAmount) > EPSILON) {
        results.push(
          await evaluateAndPersistWalletInvariant({
            invariantType: "external_transfer_amount_mismatch",
            scanScope: "external_transfer",
            linkedObjectIds: {
              userId: uid,
              walletId: wid,
              walletAccountId: waid,
              externalTransferId: String(transfer.external_transfer_id ?? ""),
              originalLedgerEntryId: String(originalLedger.ledger_entry_id ?? "")
            },
            balances: {
              computedTotalBalance: ledgerAmount,
              storedTotalBalance: transferAmount,
              totalDelta: roundMoney(transferAmount - ledgerAmount)
            },
            riskScores: defaultRiskScores({
              financialImpactScore: 0.95,
              userImpactScore: 0.9,
              confidenceScore: 0.95
            }),
            evidence: {
              externalTransfer: transfer,
              originalLedger
            } as WalletInvariantSignalInput["evidence"],
            redactedEvidence: {
              externalTransferId: transfer.external_transfer_id,
              originalLedgerEntryId: originalLedger.ledger_entry_id,
              transferAmount,
              ledgerAmount
            } as WalletInvariantSignalInput["redactedEvidence"],
            sourceEventIds: [],
            mismatchDetected: true,
            negativeBalanceDetected: false,
            moneyMovementAffected: true,
            externalProviderAffected: true,
            userVisibleAffected: true,
            allowNegative: false,
            now: new Date().toISOString(),
            metadata: { scanner: "external_transfer_amount" }
          })
        );
      }
    }
  }

  for (const compensation of compensations) {
    if (!compensation.original_ledger_entry_id) {
      results.push(
        await evaluateAndPersistWalletInvariant({
          invariantType: "compensation_without_original_ledger",
          scanScope: "compensation",
          linkedObjectIds: {
            userId: uid,
            walletId: wid,
            walletAccountId: waid,
            compensationId: String(compensation.compensation_id ?? "")
          },
          balances: {},
          riskScores: defaultRiskScores({
            financialImpactScore: 0.85,
            confidenceScore: 0.9
          }),
          evidence: { compensation } as WalletInvariantSignalInput["evidence"],
          redactedEvidence: {
            compensationId: compensation.compensation_id,
            status: compensation.status
          } as WalletInvariantSignalInput["redactedEvidence"],
          sourceEventIds: [],
          mismatchDetected: true,
          negativeBalanceDetected: false,
          moneyMovementAffected: true,
          externalProviderAffected: false,
          userVisibleAffected: false,
          allowNegative: false,
          now: new Date().toISOString(),
          metadata: { scanner: "compensation_original_ledger" }
        })
      );
    }

    if (
      String(compensation.status ?? "").toLowerCase() === "compensation_completed" &&
      !compensation.reversal_ledger_entry_id
    ) {
      results.push(
        await evaluateAndPersistWalletInvariant({
          invariantType: "compensation_without_reversal_ledger",
          scanScope: "compensation",
          linkedObjectIds: {
            userId: uid,
            walletId: wid,
            walletAccountId: waid,
            compensationId: String(compensation.compensation_id ?? ""),
            originalLedgerEntryId: String(compensation.original_ledger_entry_id ?? "")
          },
          balances: {},
          riskScores: defaultRiskScores({
            financialImpactScore: 0.95,
            userImpactScore: 0.85,
            confidenceScore: 0.95
          }),
          evidence: { compensation } as WalletInvariantSignalInput["evidence"],
          redactedEvidence: {
            compensationId: compensation.compensation_id,
            status: compensation.status,
            originalLedgerEntryId: compensation.original_ledger_entry_id
          } as WalletInvariantSignalInput["redactedEvidence"],
          sourceEventIds: [],
          mismatchDetected: true,
          negativeBalanceDetected: false,
          moneyMovementAffected: true,
          externalProviderAffected: false,
          userVisibleAffected: true,
          allowNegative: false,
          now: new Date().toISOString(),
          metadata: { scanner: "compensation_reversal_ledger" }
        })
      );
    }
  }

  const campaignId = extractCampaignId(account, wallet);
  if (campaignId) {
    const budget = await fetchCampaignBudgetRowDb(campaignId);
    if (budget) {
      const funded = toNumber(budget.funded_minor ?? budget.funded ?? 0);
      const reserved = toNumber(budget.reserved_minor ?? budget.reserved ?? 0);
      const spent = toNumber(budget.spent_minor ?? budget.spent ?? 0);
      const released = toNumber(budget.released_minor ?? budget.released ?? 0);

      if (reserved + spent > funded + EPSILON) {
        results.push(
          await evaluateAndPersistWalletInvariant({
            invariantType: "campaign_reserve_mismatch",
            scanScope: "global_batch",
            linkedObjectIds: {
              userId: uid,
              walletId: wid,
              walletAccountId: waid,
              campaignId
            },
            balances: {
              computedTotalBalance: funded,
              storedTotalBalance: reserved + spent,
              totalDelta: roundMoney(reserved + spent - funded)
            },
            riskScores: defaultRiskScores({ financialImpactScore: 0.9, confidenceScore: 0.88 }),
            evidence: { campaignId, funded, reserved, spent, released, budget } as WalletInvariantSignalInput["evidence"],
            redactedEvidence: { campaignId, funded, reserved, spent } as WalletInvariantSignalInput["redactedEvidence"],
            sourceEventIds: [],
            mismatchDetected: true,
            negativeBalanceDetected: false,
            moneyMovementAffected: true,
            externalProviderAffected: false,
            userVisibleAffected: false,
            allowNegative: false,
            now: new Date().toISOString(),
            metadata: { scanner: "campaign_budget" }
          })
        );
      }
    }
  }

  return {
    walletAccountId,
    results
  };
}

export async function runWalletInvariantScan(params?: {
  limit?: number;
  cursorWalletAccountId?: string | null;
}): Promise<WalletInvariantScannerResult> {
  const accounts = await listWalletAccountsForInvariantScanDb({
    limit: params?.limit ?? 100,
    cursorWalletAccountId: params?.cursorWalletAccountId ?? null
  });

  const allResults: Array<{
    walletAccountId: string;
    results: Awaited<ReturnType<typeof scanWalletAccount>>["results"];
  }> = [];
  const sourceEventIds: string[] = [];
  const createdAlertIds: string[] = [];
  const createdReviewCaseIds: string[] = [];

  for (const account of accounts) {
    const accountResult = await scanWalletAccount(String(account.wallet_account_id));
    allResults.push(accountResult);

    for (const item of accountResult.results) {
      const ids = collectIds(item);
      sourceEventIds.push(...ids.eventIds);
      createdAlertIds.push(...ids.alertIds);
      createdReviewCaseIds.push(...ids.reviewCaseIds);
    }
  }

  const failedCount = allResults.reduce(
    (sum, accountResult) =>
      sum +
      accountResult.results.filter((item) => item.evaluation.failed || item.evaluation.critical).length,
    0
  );

  const warningCount = allResults.reduce(
    (sum, accountResult) =>
      sum + accountResult.results.filter((item) => item.evaluation.warning).length,
    0
  );

  const ok = failedCount === 0;

  return {
    ok,
    resultPayload: {
      scannedWalletAccounts: accounts.length,
      failedCount,
      warningCount,
      cursorWalletAccountId:
        accounts.length > 0 ? accounts[accounts.length - 1].wallet_account_id : null
    } as WalletInvariantScannerResult["resultPayload"],
    errorPayload: ok
      ? null
      : ({
          failedCount,
          warningCount,
          reasonCodes: ["wallet_invariant_scan_completed_with_failures"]
        } as WalletInvariantScannerResult["errorPayload"]),
    scannedObjectCounts: {
      walletAccounts: accounts.length
    },
    mutationCounts: {
      invariantResultsCreated: allResults.reduce((sum, ar) => sum + ar.results.length, 0),
      alertsCreated: createdAlertIds.length,
      reviewCasesCreated: createdReviewCaseIds.length
    },
    sourceEventIds,
    createdAlertIds,
    createdReviewCaseIds,
    reasonCodes:
      failedCount > 0
        ? ["wallet_invariant_scan_completed_with_failures"]
        : ["wallet_invariant_scan_completed"],
    retryable: false
  };
}
