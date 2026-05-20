import { useMemo, useState } from "react";
import type { MagicReveal, StudioSimPost, ViewerUnlockScenario } from "../../studioTypes";
import type { StudioController } from "../../studioStore";
import { ViewerUnlockSheet, type ViewerUnlockSheetSimulation } from "../ViewerUnlockSheet";
import { calculateMagicSettlement } from "../../wallet/studioSettlementEngine";
import { revealToUnlockAction } from "../../wallet/studioUnlockEngine";
import type { StudioCoin } from "../../wallet/studioWalletTypes";
import { formatCoinAmount, hasSufficientBalance } from "../../wallet/studioWalletLedger";
import { findWalletAccountByType, walletAccountToEligibilityViewer } from "../../wallet/studioWalletUi";

function previewAmount(
  reveal: MagicReveal,
  scenario: ViewerUnlockScenario,
  selectedTip: number,
  collectiveContrib: number
): number {
  if (reveal.revealType === "tip_to_reveal") return Math.max(0, selectedTip);
  if (reveal.revealType === "pay_to_reveal") return Math.max(0, reveal.pricing?.amount ?? 0);
  if (reveal.revealType === "collective_reveal") return Math.max(0, collectiveContrib);
  return 0;
}

function previewCoin(reveal: MagicReveal): StudioCoin {
  return (reveal.pricing?.coin ?? "iCoin") as StudioCoin;
}

export function ViewerUnlockSheetPreview({
  studio,
  reveal,
  scenario,
  postOverride,
  onClose,
}: {
  studio: StudioController;
  reveal: MagicReveal;
  scenario: ViewerUnlockScenario;
  /** When set (e.g. Stage 4 runtime preview), eligibility/settlement use this post id + stats. */
  postOverride?: StudioSimPost;
  onClose: () => void;
}) {
  const { actions } = studio;
  const viewer = findWalletAccountByType(studio.state.walletAccounts, "viewer");
  const creator = findWalletAccountByType(studio.state.walletAccounts, "creator");
  const post = postOverride ?? studio.state.studioSimPost;

  const defaultTip = Math.max(reveal.pricing?.minimumTip ?? 1, 3);
  const [selectedTipAmount, setSelectedTipAmount] = useState(defaultTip);
  const [collectiveContrib, setCollectiveContrib] = useState(Math.max(1, reveal.pricing?.minimumTip ?? 1));

  const coin = previewCoin(reveal);
  const amount = previewAmount(reveal, scenario, selectedTipAmount, collectiveContrib);
  const unlockAction = revealToUnlockAction(reveal);

  const settlement = useMemo(
    () => calculateMagicSettlement({ reveal, unlockAction, amount, coin }),
    [reveal, unlockAction, amount, coin]
  );

  const simViewer = viewer ? walletAccountToEligibilityViewer(viewer) : null;
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

  const confirmDisabled = payBlocked || !sufficient;

  const simulation: ViewerUnlockSheetSimulation | undefined =
    viewer && simViewer
      ? {
          viewer: simViewer,
          post,
          selectedTipAmount,
          onSelectTipAmount: setSelectedTipAmount,
          collectiveContrib,
          onCollectiveContribChange: setCollectiveContrib,
          onConfirm: () => {
            const override =
              reveal.revealType === "tip_to_reveal"
                ? selectedTipAmount
                : reveal.revealType === "collective_reveal"
                  ? collectiveContrib
                  : undefined;
            actions.confirmRevealUnlock(reveal.id, override);
            onClose();
          },
          confirmDisabled,
        }
      : undefined;

  const previewSlot =
    viewer && creator ? (
      <div
        className="ist-panel"
        style={{ padding: 10, borderColor: "rgba(94,234,212,0.25)", background: "rgba(15,23,42,0.55)", fontSize: 11 }}
      >
        {studio.state.lastConfirmUnlockMessage ? (
          <p className="ist-mono" style={{ marginTop: 0, marginBottom: 6, color: "#fcd34d", fontSize: 10 }}>
            {studio.state.lastConfirmUnlockMessage}
          </p>
        ) : null}
        {studio.state.fraudAssessments.length ? (
          <p className="ist-mono" style={{ marginTop: 0, marginBottom: 6, color: "var(--ist-muted)", fontSize: 10 }}>
            Latest fraud: {studio.state.fraudAssessments.at(-1)?.riskLevel} ({studio.state.fraudAssessments.at(-1)?.riskScore})
          </p>
        ) : null}
        <div className="ist-mono" style={{ color: "var(--ist-muted)", marginBottom: 6 }}>
          Settlement preview (simulated)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, lineHeight: 1.45 }}>
          <span className="ist-mono" style={{ color: "var(--ist-muted)" }}>
            Your {coin} (avail.)
          </span>
          <span className="ist-mono">{viewer ? formatCoinAmount(viewer.balances.find((b) => b.coin === coin)?.available ?? 0, coin) : "—"}</span>
          <span className="ist-mono" style={{ color: "var(--ist-muted)" }}>
            Debit / contrib.
          </span>
          <span className="ist-mono">{amount > 0 ? formatCoinAmount(amount, coin) : "—"}</span>
          <span className="ist-mono" style={{ color: "var(--ist-muted)" }}>
            Creator pending (est.)
          </span>
          <span className="ist-mono">{formatCoinAmount(settlement.creatorGrossAmount, coin)}</span>
          <span className="ist-mono" style={{ color: "var(--ist-muted)" }}>
            Platform fee (est.)
          </span>
          <span className="ist-mono">{formatCoinAmount(settlement.platformFeeAmount, coin)}</span>
          <span className="ist-mono" style={{ color: "var(--ist-muted)" }}>
            Viewer reward (est.)
          </span>
          <span className="ist-mono">{formatCoinAmount(settlement.viewerRewardAmount, reveal.reward?.viewerRewardCoin ?? coin)}</span>
        </div>
        {payBlocked ? (
          <p className="ist-mono" style={{ color: "#fecaca", margin: "8px 0 0", fontSize: 10 }}>
            Paid reveal needs a description (≥3 chars). Payment cannot complete until then.
          </p>
        ) : null}
        {!sufficient && amount > 0 ? (
          <p className="ist-mono" style={{ color: "#fecaca", margin: "8px 0 0", fontSize: 10 }}>
            Insufficient {coin} balance for this action.
          </p>
        ) : null}
      </div>
    ) : (
      <p className="ist-mono" style={{ fontSize: 10, color: "#fecaca" }}>Wallet mock missing viewer account.</p>
    );

  return (
    <div>
      <div
        className="ist-mono"
        style={{
          position: "fixed",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 81,
          fontSize: 10,
          color: "var(--ist-muted)",
        }}
      >
        Preview · {viewer?.displayName ?? "Viewer"} · {creator?.displayName ?? "Creator"} · Stage 3 simulation
      </div>
      <ViewerUnlockSheet
        scenario={scenario}
        reveal={reveal}
        onClose={onClose}
        simulation={simulation}
        previewSlot={previewSlot}
      />
    </div>
  );
}
