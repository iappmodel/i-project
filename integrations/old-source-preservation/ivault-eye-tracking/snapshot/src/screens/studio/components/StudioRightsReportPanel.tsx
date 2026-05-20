import type { StudioController } from "../studioStore";

export function StudioRightsReportPanel({ studio, onClose }: { studio: StudioController; onClose: () => void }) {
  const { project } = studio.state;
  const { actions } = studio;
  const rr = project.rightsReport;

  if (!rr) {
    return (
      <div
        role="dialog"
        aria-label="Rights report"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 90,
          background: "rgba(0,0,0,0.65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
        onClick={onClose}
      >
        <div className="ist-panel" style={{ padding: 20, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
          <p className="ist-mono" style={{ fontSize: 12, margin: "0 0 12px" }}>
            No rights report yet. Run a rights scan from Publish or Rights &amp; Safety.
          </p>
          <button type="button" className="ist-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const exportBlocked = rr.status === "blocked" && rr.blockedAssets.length > 0;
  const monetizationBlocked = !rr.monetizationAllowed;

  return (
    <div
      role="dialog"
      aria-label="Rights report"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 16,
        overflow: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="ist-panel"
        style={{
          width: "min(720px, 100%)",
          maxHeight: "min(90vh, 880px)",
          overflow: "auto",
          padding: 16,
          marginTop: 12,
          borderColor: "rgba(59,130,246,0.35)",
          background: "rgba(15,23,42,0.96)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 className="ist-panel__title" style={{ margin: 0 }}>
            Rights report
          </h3>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: "0 0 12px" }}>
          Status: {rr.status} · Ownership: {rr.ownershipStatus} · Music: {rr.musicRightsStatus}
        </p>
        <div style={{ fontSize: 12, marginBottom: 8 }}>
          Commercial use: {rr.commercialUseAllowed ? "allowed" : "not allowed"} · Monetization:{" "}
          {rr.monetizationAllowed ? "allowed" : "blocked"} · Attribution: {rr.attributionRequired ? "required" : "optional"}
        </div>
        {monetizationBlocked ? (
          <p className="ist-mono" style={{ fontSize: 11, color: "#fde68a", margin: "0 0 10px" }}>
            Content may publish, but monetization is disabled.
          </p>
        ) : null}
        {exportBlocked ? (
          <p className="ist-mono" style={{ fontSize: 11, color: "#fecaca", margin: "0 0 10px" }}>
            Export blocked by rights status.
          </p>
        ) : null}
        {rr.warnings.length > 0 ? (
          <ul className="ist-mono" style={{ fontSize: 10, color: "#fde68a", margin: "0 0 10px", paddingLeft: 18 }}>
            {rr.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        {rr.blockedAssets.length > 0 ? (
          <p className="ist-mono" style={{ fontSize: 10, color: "#fecaca" }}>
            Blocked assets: {rr.blockedAssets.join(", ")}
          </p>
        ) : null}
        <div style={{ marginTop: 14 }}>
          <button type="button" className="ist-btn" onClick={() => actions.runRightsScan()}>
            Run rights scan again
          </button>
        </div>
      </div>
    </div>
  );
}
