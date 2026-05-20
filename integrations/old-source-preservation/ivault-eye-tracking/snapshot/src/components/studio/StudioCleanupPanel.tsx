import React from "react";
import type { StudioCleanupPlan, StudioCleanupCandidateAction } from "../../lib/studio/studio.types";

type Props = {
  open: boolean;
  plans: StudioCleanupPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (planId: string) => void;
  onConfirmPlan: (planId: string) => void;
  onRejectPlan: (planId: string) => void;
  onClose: () => void;
};

const ACTION_LABEL: Record<StudioCleanupCandidateAction, string> = {
  keep_protected: "Protected",
  delete_candidate: "Delete candidates",
  compress_candidate: "Compress candidates",
  cloud_backup_candidate: "Cloud backup candidates",
};

const ACTION_COLOR: Record<StudioCleanupCandidateAction, string> = {
  keep_protected: "#34d399",
  delete_candidate: "#f87171",
  compress_candidate: "#f59e0b",
  cloud_backup_candidate: "#60a5fa",
};

const STATUS_COLOR: Record<StudioCleanupPlan["status"], string> = {
  draft: "#748099",
  previewed: "#5ebcff",
  confirmed: "#34d399",
  rejected: "#f87171",
};

const ACTION_ORDER: StudioCleanupCandidateAction[] = [
  "keep_protected",
  "delete_candidate",
  "compress_candidate",
  "cloud_backup_candidate",
];

const StudioCleanupPanel: React.FC<Props> = ({
  open,
  plans,
  selectedPlanId,
  onSelectPlan,
  onConfirmPlan,
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
        left: 20,
        width: 500,
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
        <div style={{ fontWeight: 700, fontSize: 15, color: "#cfe8ff" }}>Storage Cleanup</div>
        <button onClick={onClose} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 12 }}>Close</button>
      </div>

      {/* Plan selector */}
      {plans.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {plans.map((p, i) => (
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
              Plan {i + 1}
            </button>
          ))}
        </div>
      )}

      {!plan && (
        <div style={{ color: "#748099", fontSize: 13 }}>
          No cleanup plans generated yet. Use a command like "i-cleanup storage".
        </div>
      )}

      {plan && (
        <>
          {/* Storage stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            {[
              { label: "Total", value: `${plan.totalStorageMb} MB`, color: "#cfe8ff" },
              { label: "Recoverable", value: `${plan.recoverableStorageMb} MB`, color: "#34d399" },
              { label: "Protected", value: `${plan.protectedStorageMb} MB`, color: "#f59e0b" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{ padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 8, textAlign: "center" }}
              >
                <div style={{ fontSize: 11, color: "#748099" }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Status + summary */}
          <div style={{ fontSize: 13, color: "#b0c4de", padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#9aa4b2" }}>Status</span>
              <span style={{ color: STATUS_COLOR[plan.status], fontWeight: 600 }}>{plan.status}</span>
            </div>
            <div>{plan.summary}</div>
          </div>

          {/* Warnings */}
          {plan.warnings.map((w, i) => (
            <div
              key={i}
              style={{ fontSize: 12, color: "#f08c28", padding: "5px 8px", background: "rgba(240,140,40,0.06)", borderRadius: 6 }}
            >
              ⚠ {w}
            </div>
          ))}

          {/* Candidates grouped by action */}
          {ACTION_ORDER.map((action) => {
            const group = plan.candidates.filter((c) => c.action === action);
            if (group.length === 0) return null;
            return (
              <div key={action}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: ACTION_COLOR[action],
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {ACTION_LABEL[action]} ({group.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {group.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: "7px 10px",
                        background: "rgba(255,255,255,0.025)",
                        borderLeft: `3px solid ${ACTION_COLOR[action]}44`,
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.title}</span>
                        {c.estimatedRecoverableMb > 0 && (
                          <span style={{ fontSize: 12, color: ACTION_COLOR[action] }}>
                            ~{c.estimatedRecoverableMb} MB
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#748099", marginTop: 2 }}>
                        {c.reasons.map((r) => r.replace(/_/g, " ")).join(" · ")}
                      </div>
                      <div style={{ fontSize: 12, color: "#9aa4b2", marginTop: 2 }}>{c.explanation}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Actions */}
          {(plan.status === "previewed" || plan.status === "draft") && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => onConfirmPlan(plan.id)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  background: "rgba(52,211,153,0.1)",
                  color: "#34d399",
                  fontWeight: 700,
                  fontSize: 13,
                  border: "1px solid rgba(52,211,153,0.22)",
                  cursor: "pointer",
                }}
              >
                Confirm mock cleanup
              </button>
              <button
                onClick={() => onRejectPlan(plan.id)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  background: "rgba(248,113,113,0.08)",
                  color: "#f87171",
                  fontWeight: 700,
                  fontSize: 13,
                  border: "1px solid rgba(248,113,113,0.2)",
                  cursor: "pointer",
                }}
              >
                Reject
              </button>
            </div>
          )}

          {(plan.status === "confirmed" || plan.status === "rejected") && (
            <div
              style={{
                fontSize: 13,
                color: STATUS_COLOR[plan.status],
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              Plan {plan.status}
            </div>
          )}

          {/* Mock disclaimer */}
          <div
            style={{
              fontSize: 11,
              color: "#748099",
              fontStyle: "italic",
              textAlign: "center",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              paddingTop: 10,
            }}
          >
            Mock cleanup only. Raw media is not deleted.
          </div>
        </>
      )}
    </div>
  );
};

export default StudioCleanupPanel;
