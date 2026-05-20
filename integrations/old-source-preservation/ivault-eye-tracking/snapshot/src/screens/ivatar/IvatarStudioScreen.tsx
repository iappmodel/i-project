import React, { useState } from "react";
import { ivatarNavigate } from "../../features/ivatar/ivatarNavigate";

function navBackPrimary() {
  ivatarNavigate("/iam");
}

export default function IvatarStudioScreen() {
  const [mode, setMode] = useState<"TrueFit" | "Dream">("TrueFit");
  const [previewGlow, setPreviewGlow] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0); // 0 = idle, 1..3 progress

  const getStepName = (i: number) => {
    if (i === 1) return "Reading proportions";
    if (i === 2) return mode === "Dream" ? "Building Dream mesh" : "Building TrueFit mesh";
    if (i === 3) return "Preparing try-on mirror";
    return "";
  };

  function startGeneration() {
    if (generating) return;
    setGenerating(true);
    setStep(1);
    // total ~1400ms, split across three steps
    const t1 = 420;
    const t2 = 520;
    const t3 = 460;

    setTimeout(() => setStep(2), t1);
    setTimeout(() => setStep(3), t1 + t2);
    setTimeout(() => {
      try {
        sessionStorage.setItem("ivatar_generated", "1");
      } catch (e) {}
      setStep(0);
      setGenerating(false);
      ivatarNavigate("/ivatar/tryon");
    }, t1 + t2 + t3);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#08090A",
        color: "white",
        padding: 20,
        fontFamily: "DM Sans, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
          maxWidth: 920,
        }}
      >
        <button
          type="button"
          onClick={() => navBackPrimary()}
          style={{
            flexShrink: 0,
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.86)",
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ← Profile
        </button>
      </div>

      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontFamily: "Syne, system-ui, sans-serif" }}>
          Create your Ivatar
        </h1>
        <div style={{ color: "rgba(255,255,255,0.72)", marginTop: 6 }}>
          Scan, design, or enter measurements.
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
          maxWidth: 920,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <OptionCard label="Scan with camera" note="(mock)" disabled={generating} />
            <OptionCard label="Design manually" note="customize look" disabled={generating} />
            <OptionCard label="Enter measurements" note="precision" disabled={generating} />
            <OptionCard label="Let [ i ] suggest" note="AI-guided" disabled={generating} />
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.6)", marginRight: 8 }}>Mode:</div>
            <Toggle
              leftLabel="TrueFit"
              rightLabel="Dream"
              value={mode === "Dream"}
              onChange={(v) => setMode(v ? "Dream" : "TrueFit")}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            padding: 18,
            borderRadius: 12,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02), 0 8px 30px rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              width: 220,
              height: 360,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              background:
                "linear-gradient(180deg, rgba(16,18,19,0.8), rgba(10,11,12,0.6))",
            }}
          >
            <div
              style={{
                width: 140,
                height: 220,
                borderRadius: 12,
                background:
                  "radial-gradient(circle at 40% 10%, rgba(0,255,200,0.06), rgba(0,0,0,0.06))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: previewGlow ? "0 12px 40px rgba(0,255,200,0.08)" : undefined,
                transition: "box-shadow 600ms ease",
              }}
            >
              <svg width="110" height="180" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2a4 4 0 100 8 4 4 0 000-8zm0 10c4.418 0 8 2.239 8 5v1H4v-1c0-2.761 3.582-5 8-5z"
                  fill={mode === "Dream" ? "#7EE7FF" : "#7CFCB2"}
                />
              </svg>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ marginBottom: 8, color: "rgba(255,255,255,0.9)" }}>Preview</div>
            <div style={{ color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>
              {mode === "Dream"
                ? "Enhanced appearance — artistic stylings applied."
                : "Accurate sizing and proportions."}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={startGeneration}
                disabled={generating}
                aria-busy={generating}
                style={{
                  background: generating
                    ? "linear-gradient(180deg, rgba(124,252,178,0.06), rgba(124,252,178,0.03))"
                    : "linear-gradient(180deg, rgba(124,252,178,0.12), rgba(124,252,178,0.06))",
                  border: "1px solid rgba(124,252,178,0.18)",
                  color: "#7CFCB2",
                  padding: "10px 16px",
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: generating ? "default" : "pointer",
                  opacity: generating ? 0.92 : 1,
                }}
              >
                {generating ? "Generating..." : "Generate Ivatar"}
              </button>

              <button
                type="button"
                onClick={() => setPreviewGlow((g) => !g)}
                disabled={generating}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: generating ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.8)",
                  padding: "10px 12px",
                  borderRadius: 12,
                  cursor: generating ? "default" : "pointer",
                }}
              >
                Toggle Glow
              </button>
            </div>

            <div style={{ marginTop: 12, maxWidth: 520 }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                Demo mode — no camera or biometric capture.
              </div>

              <div style={{ marginTop: 10 }}>
                {[1, 2, 3].map((i) => {
                  const active = step >= i;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        opacity: generating ? (active ? 1 : 0.6) : 1,
                        transition: "opacity 220ms ease, transform 220ms ease",
                        marginBottom: 6,
                        pointerEvents: generating ? "none" : "auto",
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: active ? "#7CFCB2" : "rgba(255,255,255,0.06)",
                          boxShadow: active ? "0 6px 18px rgba(124,252,178,0.12)" : undefined,
                        }}
                      />
                      <div style={{ color: active ? "#fff" : "rgba(255,255,255,0.6)" }}>
                        {getStepName(i)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function OptionCard({
  label,
  note,
  disabled,
}: {
  label: string;
  note?: string;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        padding: 12,
        borderRadius: 10,
        minWidth: 140,
        textAlign: "center",
        opacity: disabled ? 0.54 : 1,
        pointerEvents: disabled ? "none" : "auto",
        border: disabled ? "1px solid rgba(255,255,255,0.02)" : undefined,
      }}
    >
      <div style={{ fontWeight: 700 }}>{label}</div>
      {note && (
        <div style={{ color: "rgba(255,255,255,0.6)", marginTop: 6, fontSize: 12 }}>{note}</div>
      )}
    </div>
  );
}

function Toggle({
  leftLabel,
  rightLabel,
  value,
  onChange,
}: {
  leftLabel: string;
  rightLabel: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.02)",
        padding: 6,
        borderRadius: 999,
      }}
    >
      <button
        type="button"
        onClick={() => onChange(false)}
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          background: value ? "transparent" : "rgba(255,255,255,0.04)",
          color: value ? "rgba(255,255,255,0.6)" : "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        {leftLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          background: value ? "rgba(124,252,178,0.08)" : "transparent",
          color: value ? "#7CFCB2" : "rgba(255,255,255,0.6)",
          border: "none",
          marginLeft: 4,
          cursor: "pointer",
        }}
      >
        {rightLabel}
      </button>
    </div>
  );
}
