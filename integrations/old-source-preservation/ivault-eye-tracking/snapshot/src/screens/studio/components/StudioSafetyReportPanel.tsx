import type { StudioController } from "../studioStore";

export function StudioSafetyReportPanel({ studio, onClose }: { studio: StudioController; onClose: () => void }) {
  const { project } = studio.state;
  const { actions } = studio;
  const sr = project.safetyReport;

  if (!sr) {
    return (
      <div
        role="dialog"
        aria-label="Safety report"
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
            No safety report yet. Run a safety scan from Publish or Rights &amp; Safety.
          </p>
          <button type="button" className="ist-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Safety report"
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
          borderColor: "rgba(248,113,113,0.35)",
          background: "rgba(15,23,42,0.96)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 className="ist-panel__title" style={{ margin: 0 }}>
            Safety report
          </h3>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: "0 0 12px" }}>
          Status: {sr.status} · Age: {sr.ageRating} · Monetization allowed: {sr.monetizationAllowed ? "yes" : "no"} · Human review:{" "}
          {sr.requiresHumanReview ? "required" : "not required"}
        </p>
        {sr.blockedReasons.length > 0 ? (
          <ul className="ist-mono" style={{ fontSize: 10, color: "#fecaca", margin: "0 0 12px", paddingLeft: 18 }}>
            {sr.blockedReasons.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}

        <div className="ist-display" style={{ fontSize: 12, marginBottom: 8 }}>
          Detected issues
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {sr.detectedIssues.map((issue) => (
            <div key={issue.id} className="ist-panel" style={{ padding: 8, borderColor: "rgba(255,255,255,0.1)" }}>
              <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>
                {issue.type} · {issue.severity}
                {issue.timelineStartMs != null ? ` · ${issue.timelineStartMs}–${issue.timelineEndMs ?? "?"} ms` : ""}
                {issue.relatedRevealId ? ` · reveal ${issue.relatedRevealId.slice(0, 8)}…` : ""}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{issue.message}</div>
              <div className="ist-mono" style={{ fontSize: 10, color: "#fde68a", marginTop: 4 }}>
                Action: {issue.requiredAction}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="ist-btn" onClick={() => actions.runSafetyScan()}>
            Run scan again
          </button>
          <button
            type="button"
            className="ist-btn ist-btn--ghost"
            onClick={() => {
              const privacy = sr.detectedIssues.find((i) => i.type === "personal_information");
              if (privacy) window.alert("Recommended: Keep privacy blur on affected Magic regions.");
              const age = sr.detectedIssues.find((i) => i.requiredAction === "age_gate_required");
              if (age) window.alert("Recommended: Apply age gate on post and affected reveals.");
              const blockedReveal = sr.detectedIssues.find((i) => i.relatedRevealId && i.requiredAction === "publish_blocked");
              if (blockedReveal?.relatedRevealId) {
                actions.updateMagicReveal(blockedReveal.relatedRevealId, { status: "paused" });
                window.alert("Mock fix: reveal set inactive. Re-run validation.");
              }
            }}
          >
            Apply recommended fix (mock)
          </button>
        </div>
      </div>
    </div>
  );
}
