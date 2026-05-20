import { Fragment, useMemo, useState } from "react";
import type { StudioController } from "../studioStore";
import type { StudioLedgerEntry, StudioLedgerEntryStatus, StudioLedgerEntryType } from "../wallet/studioWalletTypes";
import type { StudioWalletAccount } from "../wallet/studioWalletTypes";
import { formatCoinAmount } from "../wallet/studioWalletLedger";

type LedgerFilter = "all" | "unlocks" | "rewards" | "fees" | "pending" | "completed" | "reversed";

const UNLOCK_TYPES: StudioLedgerEntryType[] = [
  "magic_unlock_payment",
  "magic_unlock_tip",
  "escrow_hold",
  "escrow_release",
  "magic_creator_pending_credit",
  "magic_creator_pending_debit",
];
const REWARD_TYPES: StudioLedgerEntryType[] = ["magic_ad_reward", "magic_viewer_reward"];
const FEE_TYPES: StudioLedgerEntryType[] = ["magic_platform_fee", "magic_platform_fee_from_pending"];

function accountLabel(accounts: StudioWalletAccount[], id?: string): string {
  if (!id) return "—";
  const a = accounts.find((x) => x.id === id);
  return a?.displayName ?? id.slice(0, 6);
}

function filterEntries(entries: StudioLedgerEntry[], f: LedgerFilter): StudioLedgerEntry[] {
  if (f === "all") return entries;
  if (f === "pending") return entries.filter((e) => e.status === "pending");
  if (f === "completed") return entries.filter((e) => e.status === "completed");
  if (f === "reversed") return entries.filter((e) => e.status === "reversed" || e.type.includes("reversal"));
  if (f === "unlocks") return entries.filter((e) => UNLOCK_TYPES.includes(e.type));
  if (f === "rewards") return entries.filter((e) => REWARD_TYPES.includes(e.type));
  if (f === "fees") return entries.filter((e) => FEE_TYPES.includes(e.type));
  return entries;
}

export function StudioLedgerPanel({ studio, compact }: { studio: StudioController; compact?: boolean }) {
  const { walletAccounts, ledgerEntries } = studio.state;
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const rows = useMemo(() => filterEntries(ledgerEntries, filter).slice().reverse(), [ledgerEntries, filter]);

  const chips: { id: LedgerFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unlocks", label: "Unlocks" },
    { id: "rewards", label: "Rewards" },
    { id: "fees", label: "Platform fees" },
    { id: "pending", label: "Pending" },
    { id: "completed", label: "Completed" },
    { id: "reversed", label: "Reversed" },
  ];

  return (
    <div className="ist-panel" style={{ padding: compact ? 8 : 12, borderColor: "rgba(255,255,255,0.1)" }}>
      <div className="ist-display" style={{ fontSize: compact ? 12 : 14, fontWeight: 800, marginBottom: 8 }}>
        Ledger
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            className={filter === c.id ? "ist-chip ist-chip--ok" : "ist-chip"}
            style={{ cursor: "pointer", border: "1px solid rgba(255,255,255,0.12)" }}
            onClick={() => setFilter(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)" }}>
          No simulated ledger activity yet.
        </p>
      ) : (
        <div style={{ overflowX: "auto", maxHeight: compact ? 220 : 360 }}>
          <table className="ist-mono" style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--ist-muted)" }}>
                <th style={{ padding: "4px 6px" }}>Time</th>
                <th style={{ padding: "4px 6px" }}>Type</th>
                <th style={{ padding: "4px 6px" }}>Coin</th>
                <th style={{ padding: "4px 6px" }}>Amt</th>
                <th style={{ padding: "4px 6px" }}>From</th>
                <th style={{ padding: "4px 6px" }}>To</th>
                <th style={{ padding: "4px 6px" }}>Status</th>
                <th style={{ padding: "4px 6px" }}>Reveal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <Fragment key={e.id}>
                  <tr
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}
                    onClick={() => setExpandedId((x) => (x === e.id ? null : e.id))}
                  >
                    <td style={{ padding: "6px", whiteSpace: "nowrap" }}>{new Date(e.createdAt).toLocaleTimeString()}</td>
                    <td style={{ padding: "6px", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{e.type}</td>
                    <td style={{ padding: "6px" }}>{e.coin}</td>
                    <td style={{ padding: "6px" }}>{formatCoinAmount(e.amount, e.coin)}</td>
                    <td style={{ padding: "6px", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {accountLabel(walletAccounts, e.fromAccountId)}
                    </td>
                    <td style={{ padding: "6px", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {accountLabel(walletAccounts, e.toAccountId)}
                    </td>
                    <td style={{ padding: "6px" }}>{e.status as StudioLedgerEntryStatus}</td>
                    <td style={{ padding: "6px" }}>{e.revealId?.slice(0, 6) ?? "—"}</td>
                  </tr>
                  {expandedId === e.id ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "0 8px 8px", color: "var(--ist-muted)", fontSize: 9 }}>
                        {e.description}
                        {e.metadata ? ` · ${JSON.stringify(e.metadata)}` : ""}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
