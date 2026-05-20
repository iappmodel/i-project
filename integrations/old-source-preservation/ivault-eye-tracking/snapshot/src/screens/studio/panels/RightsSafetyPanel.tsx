import type { StudioController } from "../studioStore";

function statusChip(status: string) {
  if (status === "passed" || status === "cleared" || status === "ok") return "ist-chip ist-chip--ok";
  if (status === "warning") return "ist-chip ist-chip--warn";
  if (status === "failed" || status === "blocked") return "ist-chip ist-chip--bad";
  return "ist-chip ist-chip--bad";
}

export function RightsSafetyPanel({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { actions } = studio;
  const rr = project.rightsReport;
  const sr = project.safetyReport;

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Rights & Safety</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" className="ist-btn" onClick={() => actions.runRightsScan()}>
          Run rights scan
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.runSafetyScan()}>
          Run safety scan
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.runMagicSafetyScan()}>
          Re-scan Magic
        </button>
      </div>

      <div className="ist-panel" style={{ marginBottom: 10, padding: 10 }}>
        <div className="ist-display" style={{ fontSize: 12, marginBottom: 6 }}>
          Rights
        </div>
        <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: "0 0 8px" }}>
          {rr.status} · {rr.ownershipStatus} · music: {rr.musicRightsStatus}
        </p>
        <div style={{ fontSize: 11, marginBottom: 6 }}>
          Monetization allowed: {rr.monetizationAllowed ? "yes" : "no"} · Commercial use:{" "}
          {rr.commercialUseAllowed ? "yes" : "no"}
        </div>
        {rr.warnings.length > 0 && (
          <ul className="ist-mono" style={{ fontSize: 10, margin: "0 0 8px", paddingLeft: 16 }}>
            {rr.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        {rr.blockedAssets.length > 0 && (
          <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-warn)" }}>
            Blocked assets: {rr.blockedAssets.join(", ")}
          </p>
        )}
      </div>

      <div className="ist-panel" style={{ padding: 10 }}>
        <div className="ist-display" style={{ fontSize: 12, marginBottom: 6 }}>
          Safety
        </div>
        <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: "0 0 8px" }}>
          {sr.status} · age rating: {sr.ageRating}
        </p>
        {sr.checks.length > 0 ? (
          sr.checks.map((c) => (
            <div
              key={c.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 8 }}
            >
              <span style={{ fontSize: 11 }}>{c.label}</span>
              <span className={statusChip(c.status)} style={{ fontSize: 9 }}>
                {c.status}
              </span>
            </div>
          ))
        ) : (
          <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: "0 0 8px" }}>
            No inline checks; see detected issues below.
          </p>
        )}
        {sr.detectedIssues.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <div className="ist-display" style={{ fontSize: 11, marginBottom: 6 }}>
              Detected issues
            </div>
            <ul className="ist-mono" style={{ fontSize: 10, margin: 0, paddingLeft: 16, lineHeight: 1.5 }}>
              {sr.detectedIssues.map((i) => (
                <li key={i.id}>
                  {i.type} · {i.severity}
                  {i.relatedRevealId ? ` · reveal ${i.relatedRevealId.slice(0, 8)}…` : ""}
                  {i.message ? ` — ${i.message}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", marginTop: 12 }}>
        Screenshot risk: unlocked viewers may still record. Product must not over-promise DRM.
      </p>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", margin: "0 0 8px" }}>
          Verification, fraud, and POPS outcomes cannot be client-supplied in production. Backend Readiness documents the boundary.
        </p>
        <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.setActiveTool("backend")}>
          Open Backend Readiness
        </button>
      </div>
    </div>
  );
}
