import type { MagicCoin, MagicReveal } from "../../studioTypes";
import type { StudioActions } from "../../studioStore";

const QUICK = [1, 3, 5, 10, 25] as const;

function bpsPart(amount: number, bps: number): string {
  return ((amount * bps) / 10_000).toFixed(2);
}

export function MagicPriceTab({ reveal, actions }: { reveal: MagicReveal; actions: StudioActions }) {
  const rt = reveal.revealType;
  if (rt !== "tip_to_reveal" && rt !== "pay_to_reveal" && rt !== "collective_reveal") {
    return (
      <p className="ist-mono" style={{ fontSize: 12, color: "var(--ist-muted)" }}>
        Price controls apply to tip, pay, and collective reveals. Switch reveal type on the Reveal tab.
      </p>
    );
  }

  const p = reveal.pricing ?? { coin: "iCoin" as MagicCoin, amount: 1 };
  const goal = reveal.eligibility.revealAfterTotalTips ?? 100;
  const cur = reveal.collectiveProgress?.current ?? 0;

  const gross = p.amount;
  const creatorGross = Number(bpsPart(gross, reveal.settlement.creatorShareBps));
  const platformFee = Number(bpsPart(gross, reveal.settlement.platformFeeBps));
  const viewerReserve =
    reveal.settlement.viewerRewardBps != null ? Number(bpsPart(gross, reveal.settlement.viewerRewardBps)) : 0;

  return (
    <div className="ist-grid2">
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label className="ist-label">Description (paid reveals)</label>
        <textarea
          className="ist-input ist-mono"
          rows={2}
          placeholder="Short description — required for monetized reveals (≥3 chars)."
          value={reveal.description ?? ""}
          onChange={(e) => actions.updateMagicReveal(reveal.id, { description: e.target.value })}
        />
        <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", marginTop: 6 }}>
          Paid reveals require a description for publish eligibility.
        </p>
      </div>
      <div className="ist-field">
        <label className="ist-label">Coin</label>
        <select
          className="ist-input"
          value={p.coin}
          onChange={(e) =>
            actions.updateMagicPricing(reveal.id, {
              ...p,
              coin: e.target.value as MagicCoin,
            })
          }
        >
          {(["iCoin", "vCoin", "aCoin", "uCoin"] as const).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="ist-field">
        <label className="ist-label">Amount</label>
        <input
          className="ist-input ist-mono"
          type="number"
          min={0}
          value={p.amount}
          onChange={(e) => actions.updateMagicPricing(reveal.id, { ...p, amount: Number(e.target.value) })}
        />
      </div>
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label className="ist-label">Quick amounts</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {QUICK.map((n) => (
            <button key={n} type="button" className="ist-btn ist-btn--ghost ist-mono" onClick={() => actions.updateMagicPricing(reveal.id, { ...p, amount: n })}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label className="ist-label">Allow custom tip</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={!!p.allowCustomTip}
            onChange={(e) => actions.updateMagicPricing(reveal.id, { ...p, allowCustomTip: e.target.checked })}
          />
          Viewers can tip above list price
        </label>
      </div>
      <div className="ist-field">
        <label className="ist-label">Minimum tip</label>
        <input
          className="ist-input ist-mono"
          type="number"
          value={p.minimumTip ?? 0}
          onChange={(e) => actions.updateMagicPricing(reveal.id, { ...p, minimumTip: Number(e.target.value) })}
        />
      </div>
      {rt === "collective_reveal" ? (
        <>
          <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
            <label className="ist-label">Total tips threshold (iCoins)</label>
            <input
              className="ist-input ist-mono"
              type="number"
              value={goal}
              onChange={(e) =>
                actions.updateMagicEligibility(reveal.id, {
                  ...reveal.eligibility,
                  revealAfterTotalTips: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
            <label className="ist-label">Deadline (placeholder)</label>
            <input className="ist-input ist-mono" disabled placeholder="Coming in Stage 3" />
          </div>
          <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
            <label className="ist-label">Progress preview</label>
            <div className="ist-mono" style={{ fontSize: 13 }}>
              {cur} / {goal} iCoins
            </div>
          </div>
        </>
      ) : null}
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label className="ist-label">Estimated split (demo)</label>
        <div className="ist-mono" style={{ fontSize: 11, lineHeight: 1.7 }}>
          Creator gross ≈ {creatorGross.toFixed(2)} · Platform fee ≈ {platformFee.toFixed(2)}
          {viewerReserve > 0 ? ` · Viewer reward reserve ≈ ${viewerReserve.toFixed(2)}` : ""}
        </div>
        <p className="ist-mono" style={{ fontSize: 10, marginTop: 8, color: "var(--ist-muted)" }}>
          Creator revenue settles as pending until verification clears.
        </p>
      </div>
    </div>
  );
}
