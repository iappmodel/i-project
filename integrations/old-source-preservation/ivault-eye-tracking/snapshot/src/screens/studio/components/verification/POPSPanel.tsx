import type { StudioController } from "../../studioStore";
import type { POPSMethod } from "../../verification/studioVerificationTypes";

const methods: POPSMethod[] = [
  "active_tap",
  "hold_gesture",
  "session_continuity",
  "location_presence",
  "qr_presence",
  "nfc_presence",
  "device_attestation_mock",
];

export function POPSPanel({ studio }: { studio: StudioController }) {
  const selectedReveal = studio.state.selectedMagicRevealId;
  const selectedChallengeId = studio.state.popsChallenges.at(-1)?.id;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: 0 }}>
        POPS confirms presence at the moment of value. It does not need to store biometric identity.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {methods.map((m) => (
          <button key={m} type="button" className="ist-btn ist-btn--ghost" onClick={() => studio.actions.createPopsChallenge(m, selectedReveal)}>
            {m}
          </button>
        ))}
      </div>
      {selectedChallengeId ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="ist-btn ist-btn--primary" onClick={() => studio.actions.completePopsChallenge(selectedChallengeId, true)}>
            Complete as Passed
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => studio.actions.completePopsChallenge(selectedChallengeId, false)}>
            Complete as Failed
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => studio.actions.expirePopsChallenge(selectedChallengeId)}>
            Expire
          </button>
        </div>
      ) : null}
      {studio.state.popsChallenges.map((c) => (
        <div key={c.id} className="ist-panel" style={{ padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong style={{ fontSize: 11 }}>{c.method}</strong>
            <span className="ist-mono" style={{ fontSize: 10 }}>{c.status}</span>
          </div>
          <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", marginTop: 4 }}>
            required within {c.requiredWithinMs}ms · score {c.score.toFixed(2)}
          </div>
          <div className="ist-mono" style={{ fontSize: 10 }}>{c.prompt}</div>
        </div>
      ))}
    </div>
  );
}
