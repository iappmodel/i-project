import type { ReactNode } from "react";
import type { MagicReveal, ViewerUnlockScenario } from "../studioTypes";
import type { RevealEligibilityPost, RevealEligibilityViewer } from "../magic/evaluateRevealEligibility";
import {
  evaluateRevealEligibility,
  MOCK_UNLOCK_POST,
  MOCK_UNLOCK_VIEWER,
  viewerUnlockScenarioFromReveal,
} from "../studioRevealEngine";

/** When set, eligibility + CTAs drive Stage 3 wallet simulation (balances / confirm). */
export type ViewerUnlockSheetSimulation = {
  viewer: RevealEligibilityViewer;
  post: RevealEligibilityPost;
  selectedTipAmount: number;
  onSelectTipAmount: (n: number) => void;
  collectiveContrib: number;
  onCollectiveContribChange: (n: number) => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
};

export function ViewerUnlockSheet({
  scenario,
  reveal,
  onClose,
  simulation,
  previewSlot,
}: {
  scenario: ViewerUnlockScenario;
  reveal?: MagicReveal;
  onClose: () => void;
  simulation?: ViewerUnlockSheetSimulation;
  previewSlot?: ReactNode;
}) {
  const effScenario = reveal ? viewerUnlockScenarioFromReveal(reveal) : scenario;
  const viewer = simulation?.viewer ?? MOCK_UNLOCK_VIEWER;
  const post = simulation?.post ?? MOCK_UNLOCK_POST;
  const evalResult =
    reveal && reveal.status !== "deleted"
      ? evaluateRevealEligibility({
          reveal,
          viewer,
          post,
          now: new Date().toISOString(),
          forPreview: true,
        })
      : { eligible: true as const, displayMessage: "Preview" };

  const title =
    effScenario === "always_hidden"
      ? "Hidden by creator"
      : effScenario === "free"
        ? "Reveal hidden moment"
        : effScenario === "tip"
          ? "Tip to reveal"
          : effScenario === "pay"
            ? `Unlock for ${reveal?.pricing?.amount ?? 3} ${reveal?.pricing?.coin ?? "iCoins"}`
            : effScenario === "watch"
              ? "Watch to reveal"
              : effScenario === "trust"
                ? "Trusted viewers only"
                : effScenario === "age"
                  ? "Age restricted"
                  : effScenario === "collective"
                    ? "Community Reveal"
                    : effScenario === "creator_approval"
                      ? "Creator approval required"
                      : effScenario === "follow"
                        ? "Follow to reveal"
                        : effScenario === "subscribe"
                          ? "Subscribe to reveal"
                          : effScenario === "time"
                            ? "Timed reveal"
                            : effScenario === "location"
                              ? "Location gated"
                              : "Unlock";

  const collectiveGoal =
    reveal?.collectiveProgress?.goal ?? reveal?.eligibility.revealAfterTotalTips ?? 100;
  const collectiveCurrent = simulation ? post.totalTips : (reveal?.collectiveProgress?.current ?? MOCK_UNLOCK_POST.totalTips);

  const tipAmount = simulation?.selectedTipAmount ?? 3;
  const ctaDisabled = !evalResult.eligible || (simulation?.confirmDisabled ?? false);
  const fire = simulation?.onConfirm;

  return (
    <div
      className="ist-unlock-sheet-backdrop"
      role="dialog"
      aria-modal
      aria-label="Unlock preview"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="ist-panel"
        style={{ width: "100%", maxWidth: 420, marginBottom: 8, borderColor: "rgba(168,85,247,0.35)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
          <div>
            <div className="ist-display" style={{ fontSize: 16, fontWeight: 800 }}>
              {title}
            </div>
            <p style={{ fontSize: 12, color: "var(--ist-muted)", margin: "6px 0 0" }}>{evalResult.displayMessage}</p>
          </div>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ padding: "4px 10px" }} onClick={onClose}>
            ✕
          </button>
        </div>

        {previewSlot ? <div style={{ marginBottom: 12 }}>{previewSlot}</div> : null}

        {!evalResult.eligible && evalResult.blockedReason === "age_requirement" ? (
          <div className="ist-chip ist-chip--warn" style={{ marginBottom: 10, display: "block" }}>
            Payment never overrides age — verify {reveal?.eligibility.minAge ?? 18}+
          </div>
        ) : null}

        {effScenario === "always_hidden" ? (
          <p style={{ fontSize: 12, color: "var(--ist-muted)" }}>This area is not available to reveal.</p>
        ) : null}

        {effScenario === "free" ? (
          <button
            type="button"
            className="ist-btn ist-btn--primary"
            style={{ width: "100%" }}
            disabled={ctaDisabled}
            onClick={() => fire?.()}
          >
            Reveal
          </button>
        ) : null}

        {effScenario === "tip" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)" }}>
              {reveal?.hiddenRender.overlayText ?? "Hidden by creator"}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[1, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`ist-btn ist-btn--ghost ist-mono${tipAmount === n ? " ist-tab--on" : ""}`}
                  onClick={() => simulation?.onSelectTipAmount(n)}
                >
                  {n} {reveal?.pricing?.coin ?? "iCoin"}
                </button>
              ))}
            </div>
            <button type="button" className="ist-btn ist-btn--primary" disabled={ctaDisabled} onClick={() => fire?.()}>
              Tip & Reveal
            </button>
            <span className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)" }}>
              Creator earnings settle as pending until settlement release.
            </span>
          </div>
        ) : null}

        {effScenario === "pay" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="ist-mono" style={{ fontSize: 14 }}>
              {reveal?.pricing?.amount ?? 3} {reveal?.pricing?.coin ?? "iCoin"}
            </div>
            <button type="button" className="ist-btn ist-btn--primary" disabled={ctaDisabled} onClick={() => fire?.()}>
              Pay & Reveal
            </button>
          </div>
        ) : null}

        {effScenario === "watch" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 12, color: "var(--ist-muted)" }}>Watch a verified sponsor clip to unlock.</p>
            <button type="button" className="ist-btn ist-btn--primary" disabled={ctaDisabled} onClick={() => fire?.()}>
              Watch & Reveal
            </button>
            <span className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)" }}>
              Reward credits after verification completes.
            </span>
          </div>
        ) : null}

        {effScenario === "trust" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="button" className="ist-btn ist-btn--primary" disabled={ctaDisabled} onClick={() => fire?.()}>
              Build Trust
            </button>
          </div>
        ) : null}

        {effScenario === "age" ? (
          <button type="button" className="ist-btn ist-btn--primary" disabled={ctaDisabled} onClick={() => fire?.()}>
            Verify Age
          </button>
        ) : null}

        {effScenario === "follow" ? (
          <button type="button" className="ist-btn ist-btn--primary" disabled={ctaDisabled} onClick={() => fire?.()}>
            Follow & Reveal
          </button>
        ) : null}

        {effScenario === "subscribe" ? (
          <button type="button" className="ist-btn ist-btn--primary" disabled={ctaDisabled} onClick={() => fire?.()}>
            Subscribe & Reveal
          </button>
        ) : null}

        {effScenario === "time" ? (
          <button type="button" className="ist-btn ist-btn--primary" disabled={ctaDisabled} onClick={() => fire?.()}>
            Wait for unlock time
          </button>
        ) : null}

        {effScenario === "location" ? (
          <button type="button" className="ist-btn ist-btn--primary" disabled={ctaDisabled} onClick={() => fire?.()}>
            Share location
          </button>
        ) : null}

        {effScenario === "collective" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="ist-mono" style={{ fontSize: 11 }}>
              {collectiveCurrent} / {collectiveGoal} toward goal (simulated post tips)
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(100, (collectiveCurrent / Math.max(1, collectiveGoal)) * 100)}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--ist-mint), var(--ist-purple))",
                }}
              />
            </div>
            {simulation ? (
              <label className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                Contribution ({reveal?.pricing?.coin ?? "iCoin"})
                <input
                  className="ist-select"
                  type="number"
                  min={1}
                  step={1}
                  value={simulation.collectiveContrib}
                  onChange={(e) => simulation.onCollectiveContribChange(Math.max(1, Number(e.target.value) || 1))}
                  style={{ maxWidth: 120 }}
                />
              </label>
            ) : null}
            <button type="button" className="ist-btn ist-btn--primary" disabled={ctaDisabled} onClick={() => fire?.()}>
              Contribute
            </button>
          </div>
        ) : null}

        {effScenario === "creator_approval" ? (
          <button type="button" className="ist-btn ist-btn--primary" disabled={ctaDisabled} onClick={() => fire?.()}>
            Request Access
          </button>
        ) : null}
      </div>
    </div>
  );
}
