import { useMemo } from "react";
import type { MagicPanelTab, MagicReveal } from "../studioTypes";
import type { StudioController } from "../studioStore";
import { assertMagicPublishAllowed } from "../magic/magicSafetyRules";
import { viewerUnlockScenarioFromReveal } from "../studioRevealEngine";
import { createDraftMagicReveal } from "../studioMockData";
import { calculateMagicSettlement } from "../wallet/studioSettlementEngine";
import { revealToUnlockAction } from "../wallet/studioUnlockEngine";
import type { StudioCoin } from "../wallet/studioWalletTypes";
import { formatCoinAmount } from "../wallet/studioWalletLedger";
import { ViewerUnlockSheetPreview } from "./magic/ViewerUnlockSheetPreview";
import { MagicRevealList } from "./magic/MagicRevealList";
import { MagicHideTab } from "./magic/MagicHideTab";
import { MagicRevealTab } from "./magic/MagicRevealTab";
import { MagicPriceTab } from "./magic/MagicPriceTab";
import { MagicRewardTab } from "./magic/MagicRewardTab";
import { MagicRulesTab } from "./magic/MagicRulesTab";
import { MagicSafetyBox } from "./magic/MagicSafetyBox";

export function MagicPanel({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { actions } = studio;
  const tab = project.magicPanelTab;
  const reveals = project.magicReveals.filter((m) => m.status !== "deleted");
  const selected = reveals.find((m) => m.id === project.selectedMagicRevealId) ?? reveals[0];
  const gate = assertMagicPublishAllowed(project.magicReveals);
  const quickSettlement = useMemo(() => {
    if (!selected) return null;
    const coin = (selected.pricing?.coin ?? "iCoin") as StudioCoin;
    const amt =
      selected.revealType === "tip_to_reveal"
        ? Math.max(selected.pricing?.minimumTip ?? 1, selected.pricing?.amount ?? 3)
        : selected.revealType === "pay_to_reveal"
          ? (selected.pricing?.amount ?? 0)
          : 0;
    if (amt <= 0 && selected.revealType !== "watch_to_reveal") return null;
    const s = calculateMagicSettlement({
      reveal: selected,
      unlockAction: revealToUnlockAction(selected),
      amount: selected.revealType === "watch_to_reveal" ? 0 : amt,
      coin,
    });
    return { coin, amt, s };
  }, [selected]);

  return (
    <div className="ist-scroll">
      <header style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h3 className="ist-panel__title" style={{ margin: 0 }}>
              Magic
            </h3>
            <p className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)", margin: "6px 0 0", maxWidth: 320, lineHeight: 1.5 }}>
              Hide, lock, price, and reveal parts of your media. Choose what stays hidden and what it takes to reveal it.
            </p>
          </div>
          <button
            type="button"
            className="ist-btn ist-btn--magic"
            onClick={() =>
              actions.createMagicReveal(createDraftMagicReveal(project.id, project.ownerUserId, project.playheadMs))
            }
          >
            + New Magic Reveal
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
          {selected ? (
            <span className={`ist-chip${selected.status === "draft" ? "" : selected.status === "blocked" ? " ist-chip--bad" : " ist-chip--ok"}`}>
              {selected.name} · {selected.status}
            </span>
          ) : (
            <span className="ist-chip">No reveal selected</span>
          )}
          {!gate.ok ? (
            <span className="ist-chip ist-chip--bad">Publishing blocked — resolve Magic safety first</span>
          ) : null}
        </div>
      </header>

      <MagicRevealList reveals={reveals} selectedId={project.selectedMagicRevealId} onSelect={(id) => actions.selectMagicReveal(id)} />

      <div className="ist-tabs" role="tablist" style={{ marginTop: 14 }}>
        {(["hide", "reveal", "price", "reward", "rules"] as const satisfies readonly MagicPanelTab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            className={tab === t ? "ist-tab ist-tab--on" : "ist-tab"}
            onClick={() => actions.setMagicTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {!selected ? (
        <p style={{ fontSize: 12, color: "var(--ist-muted)", marginTop: 14 }}>Create a reveal or pick one from the list.</p>
      ) : (
        <>
          <div style={{ marginTop: 12 }}>
            {tab === "hide" ? <MagicHideTab reveal={selected} actions={actions} /> : null}
            {tab === "reveal" ? <MagicRevealTab reveal={selected} actions={actions} /> : null}
            {tab === "price" ? <MagicPriceTab reveal={selected} actions={actions} /> : null}
            {tab === "reward" ? <MagicRewardTab reveal={selected} actions={actions} /> : null}
            {tab === "rules" ? <MagicRulesTab reveal={selected} actions={actions} /> : null}
          </div>

          <div style={{ marginTop: 14 }}>
            <MagicSafetyBox reveal={selected} onRunScan={() => actions.runMagicSafetyScan()} />
          </div>

          {quickSettlement && selected.revealType !== "always_hidden" ? (
            <div
              className="ist-mono"
              style={{
                marginTop: 10,
                fontSize: 10,
                color: "var(--ist-muted)",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(190,242,100,0.2)",
                background: "rgba(15,23,42,0.45)",
                lineHeight: 1.5,
              }}
            >
              Quick settlement (demo viewer): viewer pays {quickSettlement.amt > 0 ? formatCoinAmount(quickSettlement.amt, quickSettlement.coin) : "—"} → creator
              pending {formatCoinAmount(quickSettlement.s.creatorGrossAmount, quickSettlement.coin)} · platform fee{" "}
              {formatCoinAmount(quickSettlement.s.platformFeeAmount, quickSettlement.coin)}
              {quickSettlement.s.viewerRewardAmount > 0
                ? ` · viewer reward ${formatCoinAmount(quickSettlement.s.viewerRewardAmount, selected.reward?.viewerRewardCoin ?? quickSettlement.coin)} (after verify)`
                : ""}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.openPreviewUnlockSheet()}>
              Viewer unlock preview
            </button>
            <button
              type="button"
              className="ist-btn ist-btn--ghost"
              onClick={() => {
                actions.selectMagicReveal(selected.id);
                actions.openUnlockSimulator();
              }}
            >
              Simulate unlock
            </button>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.openWalletPanel()}>
              Open wallet
            </button>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.setSettlementSummaryOpen(true)}>
              Open ledger / settlement
            </button>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.runMagicSafetyScan()}>
              Run Safety Scan
            </button>
            <button
              type="button"
              className="ist-btn ist-btn--primary"
              onClick={() => actions.updateMagicReveal(selected.id, { status: "active" })}
            >
              Apply / Save Reveal
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.duplicateMagicReveal(selected.id)}>
              Duplicate
            </button>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.deleteMagicReveal(selected.id)}>
              Remove
            </button>
          </div>
        </>
      )}

      {project.previewUnlockSheetOpen && selected ? (
        <ViewerUnlockSheetPreview
          studio={studio}
          reveal={selected}
          scenario={viewerUnlockScenarioFromReveal(selected)}
          onClose={() => actions.closePreviewUnlockSheet()}
        />
      ) : null}
    </div>
  );
}
