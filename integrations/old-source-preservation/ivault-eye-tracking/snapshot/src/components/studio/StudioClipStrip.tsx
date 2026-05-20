import React from "react";
import type { StudioClip, StudioCleanupPlan } from "../../lib/studio/studio.types";

type Props = {
  clips: StudioClip[];
  selectedClipId: string | null;
  latestCleanupPlan?: StudioCleanupPlan | null;
  deletionProtected?: boolean;
  onSelect: (id: string) => void;
  onToggleDiscard: (id: string) => void;
};

const StudioClipStrip: React.FC<Props> = ({
  clips,
  selectedClipId,
  latestCleanupPlan = null,
  deletionProtected = false,
  onSelect,
  onToggleDiscard,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {deletionProtected && (
        <div
          style={{
            padding: "4px 10px",
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 6,
            fontSize: 11,
            color: "#22c55e",
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          🔒 Protected media — deletion locked by proof layer. Mock only.
        </div>
      )}
    <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
      {clips.map((c) => {
        const candidate = latestCleanupPlan?.candidates.find((cd) => cd.clipId === c.id);
        const isProtected = candidate?.action === "keep_protected";
        const isDeleteCandidate = candidate?.action === "delete_candidate";

        return (
          <div
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              minWidth: 140,
              padding: 8,
              borderRadius: 8,
              background:
                selectedClipId === c.id
                  ? "linear-gradient(90deg,#111827,#0b1220)"
                  : "rgba(255,255,255,0.02)",
              cursor: "pointer",
              position: "relative",
              border: isProtected
                ? "1px solid rgba(52,211,153,0.25)"
                : isDeleteCandidate
                ? "1px solid rgba(248,113,113,0.2)"
                : "1px solid transparent",
            }}
          >
            {/* Marked badge */}
            {c.isMarked ? (
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "#ffdd57",
                  color: "#000",
                  padding: "2px 6px",
                  borderRadius: 6,
                  fontSize: 11,
                }}
              >
                ★
              </div>
            ) : null}

            {/* Cleanup badges */}
            {isProtected && (
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  left: 6,
                  background: "rgba(52,211,153,0.15)",
                  color: "#34d399",
                  padding: "2px 5px",
                  borderRadius: 5,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                PROTECTED
              </div>
            )}
            {isDeleteCandidate && (
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  left: 6,
                  background: "rgba(248,113,113,0.12)",
                  color: "#f87171",
                  padding: "2px 5px",
                  borderRadius: 5,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                DELETE
              </div>
            )}

            <div style={{ fontWeight: 700, marginTop: isProtected || isDeleteCandidate ? 18 : 0 }}>
              {c.title}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {c.durationSeconds}s • {c.type}
            </div>
            <div style={{ marginTop: 6 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDiscard(c.id);
                }}
                style={{ padding: "4px 6px", borderRadius: 6 }}
              >
                {c.status === "discarded" ? "Restore" : "Discard"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
};

export default StudioClipStrip;
