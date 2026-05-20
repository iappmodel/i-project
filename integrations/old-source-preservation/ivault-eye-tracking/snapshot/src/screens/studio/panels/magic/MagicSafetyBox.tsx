import type { MagicReveal } from "../../studioTypes";

export function MagicSafetyBox({ reveal, onRunScan }: { reveal: MagicReveal; onRunScan: () => void }) {
  const s = reveal.safety;
  const tone =
    s.safetyStatus === "blocked" || s.publishBlocked ? "ist-magic-safety--blocked" : s.safetyStatus === "warning" ? "ist-magic-safety--warn" : "ist-magic-safety--ok";

  return (
    <div className={`ist-magic-safety ${tone}`}>
      <div className="ist-magic-safety__grid">
        <div>
          <span className="ist-label">Safety class</span>
          <div className="ist-mono">{s.safetyClass}</div>
        </div>
        <div>
          <span className="ist-label">Scan status</span>
          <div className="ist-mono">{s.safetyStatus}</div>
        </div>
        <div>
          <span className="ist-label">Monetization</span>
          <div className="ist-mono">{s.monetizationAllowed ? "Allowed" : "Restricted / off"}</div>
        </div>
        <div>
          <span className="ist-label">Age gate</span>
          <div className="ist-mono">{s.ageGateRequired ? "Required" : "No"}</div>
        </div>
        <div>
          <span className="ist-label">Publish</span>
          <div className="ist-mono">{s.publishBlocked ? "Blocked" : "OK"}</div>
        </div>
      </div>
      {s.monetizationRestrictionReason ? (
        <p className="ist-magic-safety__reason">{s.monetizationRestrictionReason}</p>
      ) : null}
      <p className="ist-mono" style={{ fontSize: 10, marginTop: 8, opacity: 0.85 }}>
        Age gates cannot be bypassed by payment. Blocked reveals prevent publishing.
      </p>
      <button type="button" className="ist-btn ist-btn--ghost" style={{ marginTop: 10, width: "100%" }} onClick={onRunScan}>
        Run Safety Scan
      </button>
    </div>
  );
}
