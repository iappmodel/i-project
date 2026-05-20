import { useEffect } from "react";
import type { AspectRatio, StudioExportQuality, StudioExportTarget } from "../studioTypes";
import type { StudioController } from "../studioStore";
import { assertMagicPublishAllowed, collectMagicPublishSoftWarnings, isMonetizedRevealType } from "../magic/magicSafetyRules";
import { getBalance } from "../wallet/studioWalletLedger";
import { findWalletAccountByType } from "../wallet/studioWalletUi";

export function ExportPanel({ studio }: { studio: StudioController }) {
  const { project, unlocks, walletAccounts } = studio.state;
  const { actions } = studio;
  const exp = project.exportSettings;
  const reveals = project.magicReveals.filter((r) => r.status !== "deleted");
  const magicActive = reveals.filter((r) => r.status === "active").length;
  const magicMonetized = reveals.filter((r) => isMonetizedRevealType(r.revealType)).length;
  const magicBlocked = reveals.filter((r) => r.safety.publishBlocked).length;
  const magicWarnings = reveals.filter((r) => r.safety.safetyStatus === "warning").length;
  const magicPublish = assertMagicPublishAllowed(project.magicReveals);
  const magicSoft = collectMagicPublishSoftWarnings(project.magicReveals);
  const creator = findWalletAccountByType(walletAccounts, "creator");
  const pendingCreatorICoin = creator ? getBalance(creator, "iCoin").pending : 0;
  const simUnlockCount = unlocks.length;
  const blockedRevenueCount = unlocks.filter((u) => u.status === "blocked" && u.amount + u.creatorGrossAmount > 0).length;
  const unresolvedRefundish = unlocks.filter((u) => u.status === "failed" && u.amount > 0).length;

  useEffect(() => {
    if (exp.status !== "exporting") return;
    let p = 0;
    const id = window.setInterval(() => {
      p = Math.min(100, p + 10);
      actions.updateExportProgress(p);
      if (p >= 100) {
        window.clearInterval(id);
        actions.completeExport();
      }
    }, 180);
    return () => window.clearInterval(id);
  }, [exp.status, actions]);

  const readyLabel =
    exp.status === "completed" && exp.progress >= 100 ? "Export ready" : exp.status === "exporting" ? "Exporting…" : "Idle";

  const publishChecks = project.publishChecks ?? [];
  const publishReady =
    publishChecks.length > 0 && !publishChecks.some((c) => c.blocking && (c.status === "failed" || c.status === "blocked"));

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Export</h3>
      <div
        className="ist-panel"
        style={{ marginBottom: 14, padding: 12, borderColor: "rgba(94,234,212,0.2)", background: "rgba(15,23,42,0.45)" }}
      >
        <div className="ist-display" style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
          Publish readiness (Stage 4)
        </div>
        <ul className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: "0 0 10px", paddingLeft: 16, lineHeight: 1.55 }}>
          <li>Safety: {project.safetyReport?.status ?? "—"}</li>
          <li>Rights: {project.rightsReport?.status ?? "—"}</li>
          <li>Magic publish: {magicPublish.ok ? "ok" : "blocked"}</li>
          <li>Wallet / sim unlocks: {simUnlockCount} unlock rows · pending iCoin {pendingCreatorICoin.toFixed(2)}</li>
          <li>Disclosures: {project.disclosures.length} row(s)</li>
          <li>Validation: {publishChecks.length ? (publishReady ? "passing (no blocking checks)" : "blocking / review") : "not run"}</li>
        </ul>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="ist-btn" onClick={() => actions.runPublishValidation()}>
            Run validation
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.openPublishPanel()}>
            Open publish panel
          </button>
        </div>
      </div>
      {reveals.length > 0 ? (
        <div
          className="ist-panel"
          style={{ marginBottom: 14, padding: 12, borderColor: "rgba(168,85,247,0.25)", background: "rgba(168,85,247,0.06)" }}
        >
          <div className="ist-display" style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
            Magic safety summary
          </div>
          <ul className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
            <li>Total reveals: {reveals.length}</li>
            <li>Active: {magicActive}</li>
            <li>Monetized types: {magicMonetized}</li>
            <li>Publish-blocked: {magicBlocked}</li>
            <li>Safety warnings: {magicWarnings}</li>
          </ul>
          <div className="ist-display" style={{ fontSize: 11, fontWeight: 800, marginTop: 10, marginBottom: 4 }}>
            Economic simulation (local)
          </div>
          <ul className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
            <li>Simulated unlocks: {simUnlockCount}</li>
            <li>Creator iCoin pending (mock): {pendingCreatorICoin.toFixed(2)}</li>
            <li>Blocked revenue attempts: {blockedRevenueCount}</li>
            <li>Failed paid attempts (refund review): {unresolvedRefundish}</li>
          </ul>
          {!magicPublish.ok ? (
            <p className="ist-mono" style={{ fontSize: 11, color: "#fecaca", margin: "10px 0 0" }}>
              Publishing blocked. Resolve blocked Magic reveals first.
            </p>
          ) : null}
          {magicPublish.ok && magicSoft.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              <p className="ist-mono" style={{ fontSize: 10, color: "#fcd34d", margin: "0 0 6px" }}>
                Some reveals can publish but cannot be monetized. Review warnings in Magic panel.
              </p>
              <ul className="ist-mono" style={{ fontSize: 9, color: "#fde68a", margin: 0, paddingLeft: 16 }}>
                {magicSoft.slice(0, 5).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="ist-field">
        <label className="ist-label">Target</label>
        <select
          className="ist-select"
          value={exp.target}
          onChange={(e) => actions.setExportSettings({ target: e.target.value as StudioExportTarget })}
        >
          {(["i_feed", "story", "campaign", "private_link", "download"] as StudioExportTarget[]).map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="ist-grid2">
        <div className="ist-field">
          <label className="ist-label">Aspect</label>
          <select
            className="ist-select"
            value={exp.aspectRatio}
            onChange={(e) => actions.setExportSettings({ aspectRatio: e.target.value as AspectRatio })}
          >
            {(["9:16", "1:1", "4:5", "16:9", "original"] as AspectRatio[]).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="ist-field">
          <label className="ist-label">Quality</label>
          <select
            className="ist-select"
            value={exp.quality}
            onChange={(e) => actions.setExportSettings({ quality: e.target.value as StudioExportQuality })}
          >
            {(["preview", "standard", "high", "original"] as StudioExportQuality[]).map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={exp.includeWatermark}
          onChange={(e) => actions.setExportSettings({ includeWatermark: e.target.checked })}
        />
        Include watermark
      </label>
      <div className="ist-field">
        <label className="ist-label">Progress</label>
        <div className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)" }}>
          {exp.progress}% · {readyLabel}
        </div>
        <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ width: `${exp.progress}%`, height: "100%", background: "linear-gradient(90deg,#5eead4,#fbbf24)" }} />
        </div>
      </div>
      <button type="button" className="ist-btn ist-btn--primary" onClick={() => actions.startExport()} disabled={exp.status === "exporting"}>
        Start export
      </button>
    </div>
  );
}
