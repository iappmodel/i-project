import { useMemo, useState } from "react";
import type { MagicReveal } from "../studioTypes";
import type { StudioController } from "../studioStore";
import { evaluateRevealEligibility, type RevealEligibilityPost } from "../magic/evaluateRevealEligibility";
import { calculateMagicSettlement } from "../wallet/studioSettlementEngine";
import { revealToUnlockAction } from "../wallet/studioUnlockEngine";
import type { StudioCoin } from "../wallet/studioWalletTypes";
import { formatCoinAmount, getBalance, hasSufficientBalance } from "../wallet/studioWalletLedger";
import { findWalletAccountByType, walletAccountToEligibilityViewer } from "../wallet/studioWalletUi";

function simAmount(reveal: MagicReveal, tip: number, collective: number): number {
  if (reveal.revealType === "tip_to_reveal") return Math.max(0, tip);
  if (reveal.revealType === "pay_to_reveal") return Math.max(0, reveal.pricing?.amount ?? 0);
  if (reveal.revealType === "collective_reveal") return Math.max(0, collective);
  return 0;
}

function simCoin(reveal: MagicReveal): StudioCoin {
  return (reveal.pricing?.coin ?? "iCoin") as StudioCoin;
}

function SettlementPathVisual({ reveal, settlement, hasPayment }: { reveal: MagicReveal; settlement: ReturnType<typeof calculateMagicSettlement>; hasPayment: boolean }) {
  if (reveal.revealType === "always_hidden") {
    return <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)" }}>No settlement path (always hidden).</p>;
  }
  if (reveal.revealType === "free_tap_reveal") {
    return <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)" }}>Free tap — no ledger movement.</p>;
  }
  if (reveal.revealType === "watch_to_reveal") {
    return (
      <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", lineHeight: 1.6 }}>
        <div>Reward pool → viewer reward ({formatCoinAmount(settlement.viewerRewardAmount, reveal.reward?.viewerRewardCoin ?? "aCoin")})</div>
        <div>Reward pool → creator pending ({formatCoinAmount(settlement.creatorGrossAmount, simCoin(reveal))})</div>
        <div>Platform fee (sim): {formatCoinAmount(settlement.platformFeeAmount, simCoin(reveal))}</div>
      </div>
    );
  }
  if (reveal.revealType === "collective_reveal") {
    return (
      <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", lineHeight: 1.6 }}>
        <div>Viewer available → Escrow (hold)</div>
        <div>Escrow → Creator pending (when threshold met)</div>
      </div>
    );
  }
  if (hasPayment) {
    return (
      <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", lineHeight: 1.6 }}>
        <div>Viewer available → Creator pending ({formatCoinAmount(settlement.creatorGrossAmount, simCoin(reveal))})</div>
        <div>Viewer available → Platform fee ({formatCoinAmount(settlement.platformFeeAmount, simCoin(reveal))})</div>
        {settlement.viewerRewardAmount > 0 ? (
          <div>Reward pool → Viewer (after verify) ({formatCoinAmount(settlement.viewerRewardAmount, reveal.reward?.viewerRewardCoin ?? simCoin(reveal))})</div>
        ) : null}
      </div>
    );
  }
  return <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)" }}>Gate-only reveal — no payment path.</p>;
}

export function StudioUnlockSimulator({ studio }: { studio: StudioController }) {
  const { project, walletAccounts, studioSimPost, unlocks } = studio.state;
  const { actions } = studio;
  const reveal =
    project.magicReveals.find((m) => m.id === project.selectedMagicRevealId && m.status !== "deleted") ??
    project.magicReveals.find((m) => m.status !== "deleted");

  const viewer = findWalletAccountByType(walletAccounts, "viewer");
  const creator = findWalletAccountByType(walletAccounts, "creator");

  const defaultTip = reveal ? Math.max(reveal.pricing?.minimumTip ?? 1, 3) : 3;
  const [tip, setTip] = useState(defaultTip);
  const [collective, setCollective] = useState(reveal ? Math.max(1, reveal.pricing?.minimumTip ?? 1) : 1);

  const coin = reveal ? simCoin(reveal) : ("iCoin" as StudioCoin);
  const amount = reveal ? simAmount(reveal, tip, collective) : 0;
  const unlockAction = reveal ? revealToUnlockAction(reveal) : ("free" as const);

  const settlement = useMemo(
    () => (reveal ? calculateMagicSettlement({ reveal, unlockAction, amount, coin }) : null),
    [reveal, unlockAction, amount, coin]
  );

  const eligibility = useMemo(() => {
    if (!reveal || !viewer) return null;
    const post = studioSimPost as RevealEligibilityPost & { postId: string };
    return evaluateRevealEligibility({
      reveal,
      viewer: walletAccountToEligibilityViewer(viewer),
      post,
      now: new Date().toISOString(),
      forPreview: true,
    });
  }, [reveal, viewer, studioSimPost]);

  const latestUnlock = useMemo(() => {
    if (!reveal || !viewer) return undefined;
    const list = unlocks.filter((u) => u.revealId === reveal.id && u.viewerAccountId === viewer.id);
    return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  }, [reveal, viewer, unlocks]);

  if (!reveal) {
    return <p className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)" }}>Select a Magic Reveal in the list or timeline.</p>;
  }

  const hasPayment =
    reveal.revealType === "tip_to_reveal" ||
    reveal.revealType === "pay_to_reveal" ||
    reveal.revealType === "collective_reveal";
  const payBlocked = reveal.revealType === "pay_to_reveal" && (reveal.description ?? "").trim().length < 3;
  const sufficient =
    reveal.revealType === "watch_to_reveal" ||
    reveal.revealType === "free_tap_reveal" ||
    reveal.revealType === "always_hidden" ||
    amount <= 0
      ? true
      : viewer
        ? hasSufficientBalance(viewer, coin, amount)
        : false;
  const confirmDisabled = payBlocked || !sufficient || !eligibility?.eligible;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section>
        <div className="ist-display" style={{ fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
          1 · Reveal selected
        </div>
        <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>
          {reveal.name} · {reveal.revealType} · {reveal.id.slice(0, 10)}…
        </div>
      </section>

      <section>
        <div className="ist-display" style={{ fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
          2 · Viewer account (demo)
        </div>
        {viewer ? (
          <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", lineHeight: 1.5 }}>
            {viewer.displayName} · age {viewer.age ?? "—"} · trust {viewer.trustScore ?? "—"} · iCoin av{" "}
            {formatCoinAmount(viewer.balances.find((b) => b.coin === "iCoin")?.available ?? 0, "iCoin")}
          </div>
        ) : (
          <span className="ist-mono" style={{ fontSize: 10, color: "#fecaca" }}>Missing viewer wallet row.</span>
        )}
      </section>

      <section>
        <div className="ist-display" style={{ fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
          3 · Eligibility
        </div>
        {eligibility ? (
          <div className="ist-mono" style={{ fontSize: 10, color: eligibility.eligible ? "#86efac" : "#fecaca", lineHeight: 1.5 }}>
            {eligibility.displayMessage}
            {!eligibility.eligible && eligibility.blockedReason ? ` · ${eligibility.blockedReason}` : ""}
          </div>
        ) : null}
      </section>

      <section>
        <div className="ist-display" style={{ fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
          4 · Cost / reward
        </div>
        {reveal.revealType === "tip_to_reveal" ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {[1, 3, 5].map((n) => (
              <button key={n} type="button" className={tip === n ? "ist-btn ist-btn--primary" : "ist-btn ist-btn--ghost"} onClick={() => setTip(n)}>
                {n} {coin}
              </button>
            ))}
            <label className="ist-mono" style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 6 }}>
              Custom
              <input className="ist-input" type="number" min={0} step={0.5} value={tip} onChange={(e) => setTip(Number(e.target.value) || 0)} style={{ width: 72 }} />
            </label>
          </div>
        ) : null}
        {reveal.revealType === "collective_reveal" ? (
          <label className="ist-mono" style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            Contribution ({coin})
            <input className="ist-input" type="number" min={0} step={0.5} value={collective} onChange={(e) => setCollective(Number(e.target.value) || 0)} style={{ width: 80 }} />
          </label>
        ) : null}
        {settlement ? (
          <ul className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
            <li>Viewer pays / contributes: {amount > 0 ? formatCoinAmount(amount, coin) : "—"}</li>
            <li>Creator pending (gross): {formatCoinAmount(settlement.creatorGrossAmount, coin)}</li>
            <li>Platform fee: {formatCoinAmount(settlement.platformFeeAmount, coin)}</li>
            {settlement.viewerRewardAmount > 0 ? <li>Viewer reward (after verify): {formatCoinAmount(settlement.viewerRewardAmount, reveal.reward?.viewerRewardCoin ?? coin)}</li> : null}
          </ul>
        ) : null}
        {payBlocked ? <p className="ist-mono" style={{ fontSize: 9, color: "#fecaca", margin: "6px 0 0" }}>Pay reveal needs a description (≥ 3 chars).</p> : null}
        {!sufficient && amount > 0 ? (
          <p className="ist-mono" style={{ fontSize: 9, color: "#fecaca", margin: "6px 0 0" }}>
            Insufficient {coin} balance for this amount.
          </p>
        ) : null}
      </section>

      <section>
        <div className="ist-display" style={{ fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
          5 · Settlement path
        </div>
        {settlement ? <SettlementPathVisual reveal={reveal} settlement={settlement} hasPayment={hasPayment} /> : null}
      </section>

      <section>
        <div className="ist-display" style={{ fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
          6 · Result
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="ist-btn ist-btn--primary" disabled={confirmDisabled} onClick={() => actions.confirmRevealUnlock(reveal.id, amount > 0 ? amount : undefined)}>
            Confirm unlock (writes ledger)
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.simulateRevealUnlock(reveal.id, amount > 0 ? amount : undefined)}>
            Dry-run (same engine, logs started/blocked)
          </button>
        </div>
        {latestUnlock ? (
          <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", marginTop: 8 }}>
            Latest sim for this reveal: <strong>{latestUnlock.status}</strong> · settlement {latestUnlock.settlementStatus} · verify {latestUnlock.verificationStatus}
            {creator ? ` · creator pending ${formatCoinAmount(getBalance(creator, coin).pending, coin)}` : ""}
          </p>
        ) : (
          <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", marginTop: 8 }}>No unlock rows yet for this reveal + demo viewer.</p>
        )}
      </section>
    </div>
  );
}
