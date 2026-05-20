import React from "react";
import type { PopsDemoLedgerEntry } from "./pops-demo-ledger.types";

export type PopsDemoRewardLedgerProps = {
  entries: PopsDemoLedgerEntry[];
  totalPending: number;
  totalHeld: number;
  deniedCount: number;
  onClear?: () => void;
};

export function PopsDemoRewardLedger({ entries, totalPending, totalHeld, deniedCount, onClear }: PopsDemoRewardLedgerProps) {
  const lastFive = [...entries].slice(-5).reverse();
  return (
    <article
      data-testid="pops-demo-reward-ledger"
      style={{
        border: "1px solid #E2E8F0",
        borderRadius: 10,
        padding: 12,
        background: "#F8FAFC",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ fontWeight: 700, color: "#0F172A" }}>Demo ledger</div>
        {onClear ? (
          <button type="button" style={{ fontSize: 12, cursor: "pointer" }} onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#475569" }}>
        P.O.P.S created pending reward intents. Wallet settlement is mocked.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 12, marginBottom: 10 }}>
        <div>
          <div style={{ color: "#64748B" }}>Pending total</div>
          <div style={{ fontWeight: 600 }}>{totalPending.toFixed(4)}</div>
        </div>
        <div>
          <div style={{ color: "#64748B" }}>Held total</div>
          <div style={{ fontWeight: 600 }}>{totalHeld.toFixed(4)}</div>
        </div>
        <div>
          <div style={{ color: "#64748B" }}>Denied count</div>
          <div style={{ fontWeight: 600 }}>{deniedCount}</div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Last entries</div>
      <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 6 }}>
        {lastFive.length === 0 ? <li style={{ color: "#64748B" }}>No entries yet.</li> : null}
        {lastFive.map((e) => (
          <li key={e.id} style={{ fontSize: 12, color: "#334155" }}>
            <span style={{ fontFamily: "ui-monospace, monospace" }}>{e.decisionStatus}</span> · wallet {e.walletStatus} ·{" "}
            {e.amount} {e.coinType}
          </li>
        ))}
      </ul>
    </article>
  );
}
