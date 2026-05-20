import type { StudioWalletAccount } from "../../wallet/studioWalletTypes";

function sumAvailableICoin(account: StudioWalletAccount | undefined): number {
  if (!account) return 0;
  const row = account.balances.find((b) => b.coin === "iCoin");
  return row?.available ?? 0;
}

export function StudioRuntimeWalletChip({ accounts }: { accounts: StudioWalletAccount[] }) {
  const viewer = accounts.find((a) => a.type === "viewer");
  const i = sumAvailableICoin(viewer);
  return (
    <div
      className="ist-mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(94,234,212,0.35)",
        background: "rgba(15,23,42,0.75)",
        fontSize: 11,
        color: "#e2e8f0",
      }}
      title="Runtime wallet (Stage 3 simulation)"
    >
      <span style={{ color: "var(--ist-muted)" }}>Wallet</span>
      <span style={{ fontWeight: 800 }}>{i.toFixed(2)} iCoin</span>
    </div>
  );
}
