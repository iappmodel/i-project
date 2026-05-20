import type { StudioController } from "../studioStore";
import type { StudioWalletAccount } from "../wallet/studioWalletTypes";
import { formatCoinAmount, getBalance } from "../wallet/studioWalletLedger";

const ORDER: StudioWalletAccount["type"][] = ["viewer", "creator", "platform", "escrow", "reward_pool"];

function AccountCard({ a, highlight }: { a: StudioWalletAccount; highlight: "creator_pending" | "viewer_i" | "pool" | null }) {
  const coins = [...a.balances].sort((x, y) => x.coin.localeCompare(y.coin));
  return (
    <div
      className="ist-panel"
      style={{
        padding: 12,
        borderColor:
          highlight === "creator_pending" && a.type === "creator"
            ? "rgba(251,191,36,0.45)"
            : highlight === "viewer_i" && a.type === "viewer"
              ? "rgba(94,234,212,0.45)"
              : highlight === "pool" && a.type === "reward_pool"
                ? "rgba(168,85,247,0.45)"
                : "rgba(255,255,255,0.1)",
        background: "rgba(15,23,42,0.55)",
      }}
    >
      <div className="ist-display" style={{ fontSize: 13, fontWeight: 800 }}>
        {a.displayName}
      </div>
      <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", marginBottom: 8 }}>
        {a.type.replace(/_/g, " ")} · {a.id.slice(0, 8)}…
      </div>
      {a.type === "viewer" ? (
        <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", marginBottom: 8 }}>
          age {a.age ?? "—"} · trust {a.trustScore ?? "—"} · human {a.isVerifiedHuman ? "yes" : "no"}
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {coins.map((b) => (
          <div key={b.coin} className="ist-mono" style={{ fontSize: 11, display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ color: "var(--ist-muted)" }}>{b.coin}</span>
            <span>
              <span style={{ color: "#a5f3fc" }}>av {formatCoinAmount(b.available, b.coin)}</span>
              {" · "}
              <span style={{ color: b.pending > 0 ? "#fde68a" : "var(--ist-muted)" }}>pd {formatCoinAmount(b.pending, b.coin)}</span>
              {" · "}
              <span style={{ color: "var(--ist-muted)" }}>rsv {formatCoinAmount(b.reserved, b.coin)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StudioWalletPanel({ studio }: { studio: StudioController }) {
  const { actions } = studio;
  if (!studio.state.walletPanelOpen) return null;
  const accounts = studio.state.walletAccounts;
  const ordered = ORDER.map((t) => accounts.find((a) => a.type === t)).filter(Boolean) as StudioWalletAccount[];
  const creator = accounts.find((a) => a.type === "creator");
  const pendingI = creator ? getBalance(creator, "iCoin").pending : 0;
  const highlight: "creator_pending" | "viewer_i" | "pool" | null =
    pendingI > 0 ? "creator_pending" : creator ? "viewer_i" : "pool";

  return (
    <div
      role="dialog"
      aria-label="Studio wallet simulation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 86,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 24,
        overflow: "auto",
      }}
      onClick={() => actions.closeWalletPanel()}
    >
      <div
        className="ist-panel"
        style={{ width: "100%", maxWidth: 520, marginTop: 24, padding: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div className="ist-display" style={{ fontSize: 16, fontWeight: 800 }}>
              Wallet (local simulation)
            </div>
            <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: "6px 0 0" }}>
              Mock accounts only — no real money or APIs. Final balances and ledger lines are server-owned in production.
            </p>
            <button type="button" className="ist-btn ist-btn--ghost" style={{ marginTop: 8 }} onClick={() => actions.setActiveTool("backend")}>
              Backend / ledger contracts
            </button>
          </div>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.closeWalletPanel()}>
            Close
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ordered.map((a) => (
            <AccountCard key={a.id} a={a} highlight={highlight} />
          ))}
        </div>
      </div>
    </div>
  );
}
