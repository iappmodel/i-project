import { useMemo, useState } from "react";
import { usePopsAppState } from "./hooks/usePopsAppState";
import { usePopsContentProgress } from "./hooks/usePopsContentProgress";
import { usePopsInteractionCapture } from "./hooks/usePopsInteractionCapture";
import { usePopsSession } from "./hooks/usePopsSession";

const DEMO_REQUIRED_DURATION_MS = 45_000;

export function PopsSessionDemo() {
  const pops = usePopsSession();
  const [privacyMode, setPrivacyMode] = useState(true);
  const [progressPct, setProgressPct] = useState(0);
  const [isForeground, setIsForeground] = useState(true);
  const [screenActive, setScreenActive] = useState(true);
  const [integrityOk, setIntegrityOk] = useState(true);
  const [continuityOk, setContinuityOk] = useState(true);

  const interactions = usePopsInteractionCapture({
    recordEvent: pops.recordEvent,
    recordSignalBatch: pops.recordSignalBatch,
  });

  const appState = usePopsAppState({
    recordEvent: pops.recordEvent,
    recordSignalBatch: pops.recordSignalBatch,
    isForeground,
    screenActive,
    integrityOk,
    continuityOk,
  });

  usePopsContentProgress({
    recordEvent: pops.recordEvent,
    recordSignalBatch: pops.recordSignalBatch,
    progressPct,
    started: pops.state !== "IDLE",
    completed: progressPct >= 100,
  });

  const statusCopy = useMemo(() => pops.recommendedAction, [pops.recommendedAction]);

  const start = () => {
    pops.startSession({
      userId: "demo_user_001",
      deviceId: "demo_device_001",
      contentId: "demo_content_001",
      campaignId: "demo_campaign_001",
      sessionType: "REWARD",
      proofLevel: "BASIC",
      requiredDurationMs: DEMO_REQUIRED_DURATION_MS,
    });
    setProgressPct(0);
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif", lineHeight: 1.4 }}>
      <h2 style={{ margin: 0 }}>P.O.P.S Session Capture Demo</h2>
      <p style={{ marginTop: 8, color: "#475569" }}>P.O.P.S is verifying the humane factor of this moment.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={start}>Start session</button>
        <button onClick={() => pops.pauseSession("manual_pause")}>Pause</button>
        <button onClick={() => pops.resumeSession("manual_resume")}>Resume</button>
        <button onClick={() => pops.completeSession()}>Complete session</button>
        <button onClick={() => pops.closeSession()}>Close session</button>
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(220px, 1fr))" }}>
        <Metric label="Current session state" value={pops.state} />
        <Metric label="Progress percentage" value={`${Math.round(pops.progressPct)}%`} />
        <Metric label="Presence confidence" value={String(pops.presenceConfidence)} />
        <Metric label="Attention confidence" value={String(pops.attentionConfidence)} />
        <Metric label="Intent confidence" value={String(pops.intentConfidence)} />
        <Metric label="Fraud risk" value={String(pops.fraudRisk)} />
        <Metric label="Reward eligibility" value={pops.rewardEligibility ? "Eligible" : "Not eligible"} />
        <Metric label="Status" value={statusCopy} />
        <Metric label="Raw event count" value={String(pops.rawEventCount)} />
        <Metric label="Buffered event count" value={String(pops.bufferedEventCount)} />
        <Metric label="Privacy mode" value={privacyMode ? "On" : "Off"} />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setProgressPct((v) => Math.min(100, v + 10))}>+10% progress</button>
        <button onClick={() => interactions.tap()}>Tap</button>
        <button onClick={() => interactions.scroll(180)}>Scroll</button>
        <button onClick={() => interactions.swipe("left")}>Swipe</button>
        <button onClick={() => interactions.motion(true)}>Motion stable</button>
        <button onClick={() => interactions.motion(false)}>Motion unstable</button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setIsForeground((v) => !v)}>{isForeground ? "Background app" : "Foreground app"}</button>
        <button onClick={() => setScreenActive((v) => !v)}>{screenActive ? "Screen inactive" : "Screen active"}</button>
        <button onClick={() => appState.recordNotificationInterruption()}>Notification interruption</button>
        <button onClick={() => setIntegrityOk((v) => !v)}>{integrityOk ? "Integrity warning" : "Integrity normal"}</button>
        <button onClick={() => setContinuityOk((v) => !v)}>{continuityOk ? "Continuity fail" : "Continuity ok"}</button>
        <button onClick={() => setPrivacyMode((v) => !v)}>Toggle privacy mode</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h4 style={{ marginBottom: 6 }}>Reason codes</h4>
        {pops.reasonCodes.length === 0 ? (
          <div style={{ color: "#64748b" }}>No reason codes yet.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {pops.reasonCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #dbe3ea", borderRadius: 8, padding: "10px 12px", background: "#f8fafc" }}>
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, color: "#0f172a" }}>{value}</div>
    </div>
  );
}

