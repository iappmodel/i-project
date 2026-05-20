import React from "react";
import type {
  StudioPublishPlan,
  StudioPublishPlanStatus,
  StudioPublishReadinessGateStatus,
} from "../../lib/studio/studio.types";

type Props = {
  open: boolean;
  plans: StudioPublishPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (planId: string) => void;
  onMarkReady: (planId: string) => void;
  onMockPublish: (planId: string) => void;
  onRejectPlan: (planId: string) => void;
  onClose: () => void;
};

const statusColor: Record<StudioPublishPlanStatus, string> = {
  draft: "#748099",
  previewed: "#5ebcff",
  ready: "#34d399",
  published_mock: "#a78bfa",
  rejected: "#f87171",
};

const gateIcon: Record<StudioPublishReadinessGateStatus, string> = {
  passed: "✓",
  warning: "⚠",
  blocked: "✗",
  pending: "…",
};
const gateColor: Record<StudioPublishReadinessGateStatus, string> = {
  passed: "#34d399",
  warning: "#f59e0b",
  blocked: "#f87171",
  pending: "#748099",
};

const StudioPublishPanel: React.FC<Props> = ({
  open,
  plans,
  selectedPlanId,
  onSelectPlan,
  onMarkReady,
  onMockPublish,
  onRejectPlan,
  onClose,
}) => {
  if (!open) return null;

  const plan = plans.find((p) => p.id === selectedPlanId) ?? plans[0] ?? null;
  if (!plan) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 400,
          height: "100vh",
          background: "rgba(15,17,21,0.97)",
          borderLeft: "1px solid rgba(167,139,250,0.15)",
          zIndex: 80,
          padding: 20,
          overflowY: "auto",
          color: "#e0e4ea",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, color: "#a78bfa" }}>Publish Plan</h3>
          <button onClick={onClose} style={closeBtnStyle}>
            ✕
          </button>
        </div>
        <p style={{ color: "#748099", marginTop: 12, fontStyle: "italic" }}>
          No publish plan yet. Try &quot;i-post to feed&quot;.
        </p>
      </div>
    );
  }

  const canAct = plan.status === "previewed" || plan.status === "ready";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 400,
        height: "100vh",
        background: "rgba(15,17,21,0.97)",
        borderLeft: "1px solid rgba(167,139,250,0.15)",
        zIndex: 80,
        padding: 20,
        overflowY: "auto",
        color: "#e0e4ea",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 16, color: "#a78bfa" }}>Publish Plan</h3>
        <button onClick={onClose} style={closeBtnStyle}>
          ✕
        </button>
      </div>

      <div
        style={{
          margin: "10px 0",
          padding: "6px 10px",
          borderRadius: 6,
          background: "rgba(167,139,250,0.08)",
          color: "#a78bfa",
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        Mock publish only. No external platform receives this post.
      </div>

      {plans.length > 1 && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: "#748099" }}>Select plan</label>
          <select
            value={plan.id}
            onChange={(e) => onSelectPlan(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid rgba(167,139,250,0.2)",
              background: "rgba(255,255,255,0.04)",
              color: "#e0e4ea",
              fontSize: 12,
            }}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {p.status}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={rowStyle}>
        <span style={labelStyle}>Status</span>
        <span style={{ color: statusColor[plan.status], fontWeight: 600 }}>{plan.status}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Destinations</span>
        <span style={{ color: "#a78bfa" }}>{plan.destinations.join(", ")}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Title</span>
        <span>{plan.title}</span>
      </div>
      <div style={{ ...rowStyle, flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
        <span style={labelStyle}>Caption</span>
        <span style={{ fontSize: 12 }}>{plan.caption}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Hashtags</span>
        <span style={{ color: "#5ebcff", fontSize: 12 }}>{plan.hashtags.join(" ")}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Schedule</span>
        <span style={{ fontSize: 12 }}>{plan.schedule.label}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Disclosure</span>
        <span style={{ color: plan.disclosureRequired ? "#f59e0b" : "#748099" }}>
          {plan.disclosureRequired ? plan.disclosureText ?? "required" : "not required"}
        </span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>CTA</span>
        <span>{plan.cta.enabled ? plan.cta.label : "disabled"}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Originality</span>
        <span style={{ color: plan.originalityStatus === "ready" ? "#34d399" : "#748099" }}>
          {plan.originalityStatus}
        </span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Edit plan</span>
        <span>{plan.selectedEditPlanId ?? "none"}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Cleanup plan</span>
        <span>{plan.selectedCleanupPlanId ?? "none"}</span>
      </div>

      <div style={{ marginTop: 14, marginBottom: 6, fontWeight: 700, fontSize: 13, color: "#a78bfa" }}>
        Readiness Gates
      </div>
      {plan.readinessGates.map((g) => (
        <div
          key={g.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "4px 0",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            fontSize: 12,
          }}
        >
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: gateColor[g.status], fontWeight: 700 }}>
              {gateIcon[g.status]}
            </span>
            {g.label}
          </span>
          <span style={{ color: "#748099", textAlign: "right", maxWidth: 180 }}>{g.message}</span>
        </div>
      ))}

      {plan.warnings.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>
            Warnings
          </div>
          {plan.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 11, color: "#f59e0b", marginBottom: 2 }}>
              • {w}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 12, color: "#748099" }}>{plan.summary}</div>

      {canAct && (
        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {plan.status === "previewed" && (
            <button onClick={() => onMarkReady(plan.id)} style={actionBtnStyle("#34d399")}>
              Mark ready
            </button>
          )}
          {plan.status === "ready" && (
            <button onClick={() => onMockPublish(plan.id)} style={actionBtnStyle("#a78bfa")}>
              Mock publish
            </button>
          )}
          <button onClick={() => onRejectPlan(plan.id)} style={actionBtnStyle("#f87171")}>
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#748099",
  fontSize: 18,
  cursor: "pointer",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 12,
  padding: "3px 0",
  borderBottom: "1px solid rgba(255,255,255,0.03)",
};

const labelStyle: React.CSSProperties = { color: "#9aa4b2" };

const actionBtnStyle = (color: string): React.CSSProperties => ({
  padding: "6px 14px",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  background: `${color}22`,
  color,
  border: `1px solid ${color}44`,
  cursor: "pointer",
});

export default StudioPublishPanel;
