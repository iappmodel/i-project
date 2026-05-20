import { useMemo } from "react";
import type { StudioController } from "../studioStore";
import type { StudioLedgerEntry, StudioLedgerEntryType } from "../wallet/studioWalletTypes";
import { findWalletAccountByType } from "../wallet/studioWalletUi";
import { formatCoinAmount, getBalance, sumLedgerByType } from "../wallet/studioWalletLedger";
import { canRefundUnlock } from "../wallet/studioUnlockEngine";
import { StudioLedgerPanel } from "./StudioLedgerPanel";
import { StudioVerificationGate } from "./StudioVerificationGate";

function sumFromAccount(entries: StudioLedgerEntry[], accountId: string | undefined, types: StudioLedgerEntryType[]): number {
  if (!accountId) return 0;
  return entries
    .filter((e) => e.status === "completed" && e.fromAccountId === accountId && types.includes(e.type))
    .reduce((s, e) => s + e.amount, 0);
}

export function StudioSettlementSummary({ studio }: { studio: StudioController }) {
  if (!studio.state.settlementSummaryOpen) return null;
  const { ledgerEntries, unlocks, selectedUnlockId, walletAccounts } = studio.state;
  const { actions } = studio;

  const viewer = findWalletAccountByType(walletAccounts, "viewer");
  const creator = findWalletAccountByType(walletAccounts, "creator");
  const escrow = findWalletAccountByType(walletAccounts, "escrow");
  const pool = findWalletAccountByType(walletAccounts, "reward_pool");

  const selectedUnlock = useMemo(() => {
    if (selectedUnlockId) return unlocks.find((u) => u.id === selectedUnlockId);
    return [...unlocks].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  }, [unlocks, selectedUnlockId]);

  const stats = useMemo(() => {
    const payTypes: StudioLedgerEntryType[] = ["magic_unlock_tip", "magic_unlock_payment", "escrow_hold"];
    const viewerSpent = viewer ? sumFromAccount(ledgerEntries, viewer.id, payTypes) : 0;

    const creatorPendingICoin = creator ? getBalance(creator, "iCoin").pending : 0;
    const platformFees =
      sumLedgerByType(ledgerEntries, "magic_platform_fee") + sumLedgerByType(ledgerEntries, "magic_platform_fee_from_pending");
    const viewerRewards = sumLedgerByType(ledgerEntries, "magic_viewer_reward") + sumLedgerByType(ledgerEntries, "magic_ad_reward");

    const escrowHeldCoins = escrow ? escrow.balances.map((b) => ({ coin: b.coin, held: b.pending + b.reserved })) : [];

    const released = sumLedgerByType(ledgerEntries, "magic_settlement_release");
    const refundedCount = unlocks.filter((u) => u.status === "refunded" || u.settlementStatus === "refunded").length;

    return {
      viewerSpent,
      creatorPendingICoin,
      platformFees,
      viewerRewards,
      escrowHeldCoins,
      released,
      refundedCount,
      poolICoin: pool ? getBalance(pool, "iCoin").available : 0,
    };
  }, [ledgerEntries, unlocks, viewer, creator, escrow, pool]);

  return (
    <div
      role="dialog"
      aria-label="Settlement summary and ledger"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 87,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 16,
        overflow: "auto",
      }}
      onClick={() => actions.setSettlementSummaryOpen(false)}
    >
      <div
        className="ist-panel"
        style={{
          width: "min(960px, 100%)",
          maxHeight: "min(94vh, 960px)",
          overflow: "auto",
          padding: 16,
          marginTop: 8,
          borderColor: "rgba(251,191,36,0.3)",
          background: "rgba(15,23,42,0.95)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div>
            <h3 className="ist-panel__title" style={{ margin: 0 }}>
              Ledger & settlement (sim)
            </h3>
            <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: "6px 0 0", maxWidth: 560 }}>
              Creator earnings remain pending until verification clears (where applicable), then use Release to move pending → available.
            </p>
          </div>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.setSettlementSummaryOpen(false)}>
            Close
          </button>
        </div>

        <div
          className="ist-mono"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 8,
            fontSize: 10,
            marginBottom: 14,
          }}
        >
          <Stat label="Viewer spent (ledger)" value={formatCoinAmount(stats.viewerSpent, "iCoin")} />
          <Stat label="Creator iCoin pending" value={formatCoinAmount(stats.creatorPendingICoin, "iCoin")} />
          <Stat label="Platform fees" value={formatCoinAmount(stats.platformFees, "iCoin")} />
          <Stat label="Viewer rewards (pool→viewer)" value={formatCoinAmount(stats.viewerRewards, "aCoin")} />
          <Stat label="Released (settlement)" value={formatCoinAmount(stats.released, "iCoin")} />
          <Stat label="Refunded unlocks" value={String(stats.refundedCount)} />
          <Stat label="Reward pool iCoin" value={formatCoinAmount(stats.poolICoin, "iCoin")} />
        </div>

        {escrow ? (
          <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", margin: "0 0 12px" }}>
            Escrow held (sum pending+reserved):{" "}
            {stats.escrowHeldCoins.map((x) => `${formatCoinAmount(x.held, x.coin)}`).join(" · ") || "—"}
          </p>
        ) : null}

        <div style={{ marginBottom: 12 }}>
          <label className="ist-label" style={{ fontSize: 10 }}>
            Selected unlock
          </label>
          <select
            className="ist-select"
            style={{ width: "100%", maxWidth: 480 }}
            value={selectedUnlock?.id ?? ""}
            onChange={(e) => actions.selectUnlock(e.target.value || undefined)}
          >
            <option value="">— Latest —</option>
            {[...unlocks]
              .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id.slice(0, 12)}… · {u.revealId.slice(0, 8)} · {u.status}
                </option>
              ))}
          </select>
        </div>

        <StudioVerificationGate studio={studio} unlock={selectedUnlock} />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, marginBottom: 14 }}>
          <button
            type="button"
            className="ist-btn ist-btn--ghost"
            disabled={!selectedUnlock || selectedUnlock.verificationStatus === "verified"}
            onClick={() => selectedUnlock && actions.mockVerifyUnlock(selectedUnlock.id)}
          >
            Mock verify
          </button>
          <button
            type="button"
            className="ist-btn ist-btn--ghost"
            disabled={!selectedUnlock || selectedUnlock.settlementStatus === "released" || selectedUnlock.creatorGrossAmount <= 0}
            onClick={() => selectedUnlock && actions.mockReleaseSettlement(selectedUnlock.id)}
          >
            Release settlement
          </button>
          <button
            type="button"
            className="ist-btn ist-btn--ghost"
            disabled={!selectedUnlock || !canRefundUnlock(selectedUnlock)}
            onClick={() => selectedUnlock && actions.mockRefundUnlock(selectedUnlock.id)}
          >
            Refund
          </button>
        </div>

        <div className="ist-display" style={{ fontSize: 11, fontWeight: 800, marginBottom: 8 }}>
          Ledger
        </div>
        <StudioLedgerPanel studio={studio} compact />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)" }}>
      <div style={{ color: "var(--ist-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#e2e8f0", fontWeight: 700 }}>{value}</div>
    </div>
  );
}
