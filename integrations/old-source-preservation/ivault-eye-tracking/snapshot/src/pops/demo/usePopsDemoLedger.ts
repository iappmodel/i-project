import { useCallback, useMemo, useState } from "react";
import type { PopsDemoLedgerAddInput, PopsDemoLedgerEntry } from "./pops-demo-ledger.types";

const STORAGE_KEY = "pops.mvp.demoRewardLedger";

function newId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadEntries(): PopsDemoLedgerEntry[] {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return [];
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PopsDemoLedgerEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: PopsDemoLedgerEntry[]): void {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return;
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-50)));
  } catch {
    /* ignore */
  }
}

export function usePopsDemoLedger() {
  const [entries, setEntries] = useState<PopsDemoLedgerEntry[]>(() => loadEntries());

  const addEntry = useCallback((input: PopsDemoLedgerAddInput) => {
    const { rewardDecision, walletIntent } = input;
    const walletStatus = walletIntent?.status ?? "NONE";
    const summary =
      rewardDecision.decisionStatus === "DENIED_FRAUD_RISK" || rewardDecision.decisionStatus === "DENIED_LOW_CONFIDENCE"
        ? "Reward not issued for this session."
        : rewardDecision.decisionStatus === "HELD"
          ? "Reward held for review (mock)."
          : "Pending wallet intent created (mock).";

    const row: PopsDemoLedgerEntry = {
      id: newId(),
      sessionId: rewardDecision.sessionId,
      decisionStatus: rewardDecision.decisionStatus,
      walletStatus,
      coinType: rewardDecision.coinType,
      amount:
        rewardDecision.decisionStatus === "DENIED_FRAUD_RISK" || rewardDecision.decisionStatus === "DENIED_LOW_CONFIDENCE"
          ? 0
          : rewardDecision.finalAmount,
      createdAt: rewardDecision.createdAt,
      summary,
    };

    setEntries((prev) => {
      const next = [...prev, row];
      persist(next);
      return next;
    });
  }, []);

  const clearLedger = useCallback(() => {
    setEntries([]);
    persist([]);
    if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
      try {
        globalThis.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const totals = useMemo(() => {
    let totalPending = 0;
    let totalHeld = 0;
    let deniedCount = 0;
    for (const e of entries) {
      if (e.walletStatus === "PENDING") totalPending += e.amount;
      if (e.walletStatus === "HELD") totalHeld += e.amount;
      if (e.decisionStatus === "DENIED_FRAUD_RISK" || e.decisionStatus === "DENIED_LOW_CONFIDENCE") deniedCount++;
    }
    return { totalPending, totalHeld, deniedCount };
  }, [entries]);

  return {
    entries,
    addEntry,
    clearLedger,
    totalPending: totals.totalPending,
    totalHeld: totals.totalHeld,
    deniedCount: totals.deniedCount,
  };
}
