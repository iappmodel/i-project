import React from "react";
import type { StudioEditPlan } from "../../lib/studio/studio.types";

type Props = {
  open: boolean;
  plans: StudioEditPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (planId: string) => void;
  onAcceptPlan: (planId: string) => void;
  onRejectPlan: (planId: string) => void;
  onClose: () => void;
};

const modeLabel: Record<StudioEditPlan["mode"], string> = {
  target_duration: "Target Duration",
  remove_dead_parts: "Remove Dead Parts",
  marked_moments: "Marked Moments",
  multi_version: "Multi-Version",
  best_highlights: "Best Highlights",
};

const statusColor: Record<StudioEditPlan["status"], string> = {
  draft: "#748099",
  previewed: "#5ebcff",
  accepted: "#34d399",
  rejected: "#f87171",
};

const StudioAutoCutPanel: React.FC<Props> = ({
  open,
  plans,
  selectedPlanId,
  onSelectPlan,
  onAcceptPlan,
  onRejectPlan,
  onClose,
}) => {
  if (!open) return null;

  const plan = plans.find((p) => p.id === selectedPlanId) ?? plans[0] ?? null;

  return (
    <div
      style={{
        position: "fixed",
        top: 60,
        right: 20,
        width: 480,
        maxHeight: "calc(100vh - 80px)",
        overflowY: "auto",
        background: "rgba(5,7,12,0.97)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#cfe8ff" }}>Auto-Cut Plans</div>
        <button onClick={onClose} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 12 }}>Close</button>
      </div>

      {/* Plan selector tabs */}
      {plans.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPlan(p.id)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 12,
                background: p.id === selectedPlanId ? "rgba(94,188,255,0.12)" : "rgba(255,255,255,0.04)",
                color: p.id === selectedPlanId ? "#5ebcff" : "#9aa4b2",
                border: `1px solid ${p.id === selectedPlanId ? "rgba(94,188,255,0.3)" : "transparent"}`,
                cursor: "pointer",
              }}
            >
              {modeLabel[p.mode]}
            </button>
          ))}
        </div>
      )}

      {/* No plans */}
      {!plan && (
        <div style={{ color: "#748099", fontSize: 13 }}>No auto-cut plans generated yet. Use a command like "i-make this video 45 seconds".</div>
      )}

      {/* Plan detail */}
      {plan && (
        <>
          {/* Plan meta */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{plan.title}</div>
            <div style={{ display: "flex", gap: 10, fontSize: 12, flexWrap: "wrap" }}>
              <span style={{ color: "#9aa4b2" }}>Mode: <span style={{ color: "#cfe8ff" }}>{modeLabel[plan.mode]}</span></span>
              <span style={{ color: "#9aa4b2" }}>Status: <span style={{ color: statusColor[plan.status], fontWeight: 600 }}>{plan.status}</span></span>
              <span style={{ color: "#9aa4b2" }}>Target: <span style={{ color: "#cfe8ff" }}>{plan.targetDurationSeconds}s</span></span>
              <span style={{ color: "#9aa4b2" }}>Est: <span style={{ color: "#cfe8ff" }}>{plan.estimatedDurationSeconds.toFixed(1)}s</span></span>
            </div>
          </div>

          {/* Summary */}
          <div style={{ fontSize: 13, color: "#b0c4de", padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
            {plan.summary}
          </div>

          {/* Warnings */}
          {plan.warnings.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {plan.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: "#f08c28", padding: "5px 8px", background: "rgba(240,140,40,0.06)", borderRadius: 6 }}>
                  ⚠ {w}
                </div>
              ))}
            </div>
          )}

          {/* Included clips */}
          <div>
            <div style={{ fontSize: 12, color: "#9aa4b2", marginBottom: 6 }}>
              Included clips ({plan.clips.length}) — excluded: {plan.excludedClipIds.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {plan.clips.map((pc, idx) => (
                <div
                  key={pc.id}
                  style={{ padding: "7px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start" }}
                >
                  <div style={{ fontSize: 11, color: "#748099", minWidth: 18 }}>{idx + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{pc.title}</div>
                    <div style={{ fontSize: 11, color: "#9aa4b2", marginTop: 2 }}>{pc.reason}</div>
                    <div style={{ fontSize: 11, color: "#748099", marginTop: 2 }}>
                      {pc.durationSeconds.toFixed(1)}s · score {pc.score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {plan.status === "previewed" || plan.status === "draft" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => onAcceptPlan(plan.id)}
                style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: "rgba(52,211,153,0.12)", color: "#34d399", fontWeight: 700, fontSize: 13, border: "1px solid rgba(52,211,153,0.25)", cursor: "pointer" }}
              >
                Accept preview
              </button>
              <button
                onClick={() => onRejectPlan(plan.id)}
                style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: "rgba(248,113,113,0.08)", color: "#f87171", fontWeight: 700, fontSize: 13, border: "1px solid rgba(248,113,113,0.2)", cursor: "pointer" }}
              >
                Reject
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: statusColor[plan.status], fontWeight: 600, textAlign: "center" }}>
              Plan {plan.status}
            </div>
          )}

          {/* Mock disclaimer */}
          <div style={{ fontSize: 11, color: "#748099", fontStyle: "italic", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 10 }}>
            Mock auto-cut plan only. No media has been modified.
          </div>
        </>
      )}
    </div>
  );
};

export default StudioAutoCutPanel;
