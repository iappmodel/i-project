import type { StudioController } from "../../studioStore";

export function SettlementHoldPanel({ studio }: { studio: StudioController }) {
  const pending = studio.state.unlocks.filter((u) => u.settlementStatus === "pending" || u.settlementStatus === "held");
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {pending.map((u) => (
        <div key={u.id} className="ist-panel" style={{ padding: 10 }}>
          <div className="ist-mono" style={{ fontSize: 10 }}>
            {u.id.slice(0, 10)} · {u.revealId.slice(0, 8)} · {u.coin} {u.creatorGrossAmount}
          </div>
          <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", marginTop: 4 }}>
            verification {u.verificationStatus} · settlement {u.settlementStatus}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => studio.actions.mockReleaseSettlement(u.id)}>Release if allowed</button>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => studio.actions.mockRefundUnlock(u.id)}>Reverse / refund</button>
          </div>
        </div>
      ))}
      {pending.length === 0 ? <p className="ist-mono" style={{ fontSize: 10 }}>No pending creator settlements.</p> : null}
    </div>
  );
}
