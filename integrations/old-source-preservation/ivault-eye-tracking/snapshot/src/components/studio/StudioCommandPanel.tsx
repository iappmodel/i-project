import React, { useState } from "react";
import type { StudioSession, StudioEffectPreview } from "../../lib/studio/studio.types";

type Props = {
  open: boolean;
  session: StudioSession;
  effectPreviews: StudioEffectPreview[];
  onSubmit: (raw: string) => void;
};

const CAPTURE_COMMANDS = [
  { label: "GO", command: "go", accent: true },
  { label: "PAUSE", command: "pause", accent: false },
  { label: "RESUME", command: "resume", accent: false },
  { label: "STOP", command: "stop", accent: false },
  { label: "MARK", command: "mark", accent: false },
] as const;

const AUTOCUT_COMMANDS = [
  { label: "AUTO 45S", command: "i-make this video 45 seconds" },
  { label: "REMOVE DEAD PARTS", command: "i-remove dead parts" },
  { label: "MARKED MOMENTS", command: "i-use marked moments" },
  { label: "BEST HIGHLIGHTS", command: "i-best highlights" },
  { label: "3 VERSIONS", command: "i-make 3 versions" },
] as const;

const CLEANUP_COMMANDS = [
  { label: "CLEANUP STORAGE", command: "i-cleanup storage" },
  { label: "DELETE UNUSED RAW", command: "i-delete unused raw clips" },
  { label: "KEEP FINAL ONLY", command: "i-keep only final edit" },
  { label: "PROTECT MARKED", command: "i-protect marked moments" },
] as const;

const PROOF_COMMANDS = [
  { label: "GENERATE PROOF", command: "i-generate proof" },
  { label: "CHECK ORIGINALITY", command: "i-check originality" },
  { label: "CREATE FINGERPRINT", command: "i-create fingerprint" },
  { label: "PROTECT VIDEO", command: "i-protect this video" },
  { label: "EXPORT PROOF PACKAGE", command: "i-export proof package" },
  { label: "SAVE TO PROOF VAULT", command: "i-save to proof vault" },
] as const;

const StudioCommandPanel: React.FC<Props> = ({ open, session, effectPreviews, onSubmit }) => {
  const [value, setValue] = useState("");
  if (!open) return null;
  const recent = session.commands.slice(0, 3);

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        width: 480,
        background: "rgba(6,8,12,0.95)",
        padding: 14,
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ fontWeight: 700, color: "#cfe8ff", marginBottom: 10 }}>Command</div>

      {/* Capture quick buttons */}
      <div style={{ fontSize: 11, color: "#748099", marginBottom: 4 }}>Capture</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {CAPTURE_COMMANDS.map(({ label, command, accent }) => (
          <button
            key={command}
            onClick={() => onSubmit(command)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.5,
              background: accent ? "rgba(220,40,40,0.16)" : "rgba(255,255,255,0.05)",
              color: accent ? "#ff5555" : "#cfe8ff",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Auto-cut quick buttons */}
      <div style={{ fontSize: 11, color: "#748099", marginBottom: 4 }}>Auto-cut</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {AUTOCUT_COMMANDS.map(({ label, command }) => (
          <button
            key={command}
            onClick={() => onSubmit(command)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              background: "rgba(94,188,255,0.08)",
              color: "#5ebcff",
              border: "1px solid rgba(94,188,255,0.15)",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cleanup quick buttons */}
      <div style={{ fontSize: 11, color: "#748099", marginBottom: 4 }}>Storage cleanup</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {CLEANUP_COMMANDS.map(({ label, command }) => (
          <button
            key={command}
            onClick={() => onSubmit(command)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              background: "rgba(240,140,40,0.08)",
              color: "#f08c28",
              border: "1px solid rgba(240,140,40,0.15)",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Publish quick buttons */}
      <div style={{ fontSize: 11, color: "#748099", marginBottom: 4 }}>Publish</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { label: "POST FEED", command: "i-post to feed" },
          { label: "POST STORIES", command: "i-post to stories" },
          { label: "FEED + STORIES", command: "i-post to feed and stories" },
          { label: "CAMPAIGN VERSION", command: "i-make campaign version" },
          { label: "SAVE DRAFT", command: "i-save draft" },
          { label: "SCHEDULE", command: "i-schedule this tomorrow" },
        ].map(({ label, command }) => (
          <button
            key={command}
            onClick={() => onSubmit(command)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              background: "rgba(167,139,250,0.1)",
              color: "#a78bfa",
              border: "1px solid rgba(167,139,250,0.2)",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Text input */}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { onSubmit(value); setValue(""); } }}
        placeholder="Try: i-cleanup storage"
        style={{
          width: "100%",
          padding: 8,
          borderRadius: 6,
          border: "none",
          background: "rgba(255,255,255,0.06)",
          color: "#e6eef8",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={() => { onSubmit(value); setValue(""); }} style={{ padding: "6px 10px", borderRadius: 6 }}>
          Run
        </button>
      </div>

      {/* Proof / originality quick buttons */}
      <div style={{ fontSize: 11, color: "#748099", marginBottom: 4 }}>Proof / originality</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {PROOF_COMMANDS.map(({ label, command }) => (
          <button
            key={command}
            onClick={() => onSubmit(command)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              background: "rgba(34,197,94,0.08)",
              color: "#22c55e",
              border: "1px solid rgba(34,197,94,0.15)",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Recent commands */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "#9aa4b2", marginBottom: 6 }}>Recent</div>
        {recent.length === 0
          ? <div style={{ opacity: 0.5, fontSize: 13 }}>No recent commands</div>
          : recent.map((c) => (
            <div key={c.id} style={{ padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 6, marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{c.raw}</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{c.previewText}</div>
            </div>
          ))}
      </div>

      {/* Effect previews */}
      {effectPreviews.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "#9aa4b2", marginBottom: 6 }}>Effect previews</div>
          {effectPreviews.slice(0, 5).map((e) => (
            <div key={e.id} style={{ padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 6, marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{e.label}</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{e.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudioCommandPanel;
