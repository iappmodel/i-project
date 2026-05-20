import React from "react";
import { POPS_FALLBACK_REWARD_IMPACT, type PopsFallbackDecision } from "./pops-fallback.types";

export interface PopsFallbackStatusCardProps {
  decision: PopsFallbackDecision;
}

const impactLabel: Record<PopsFallbackDecision["rewardImpact"], string> = {
  [POPS_FALLBACK_REWARD_IMPACT.NONE]: "No change to reward timing",
  [POPS_FALLBACK_REWARD_IMPACT.FULL_REWARD_ALLOWED]: "Full reward may still apply",
  [POPS_FALLBACK_REWARD_IMPACT.PARTIAL_REWARD_ALLOWED]: "Partial reward path",
  [POPS_FALLBACK_REWARD_IMPACT.HOLD_REQUIRED]: "Verification on hold",
  [POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED]: "Pending review",
  [POPS_FALLBACK_REWARD_IMPACT.REWARD_DENIED]: "Offer could not be completed"
};

export function PopsFallbackStatusCard({ decision }: PopsFallbackStatusCardProps) {
  return (
    <section
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        background: "#ffffff",
        padding: 14,
        maxWidth: 720
      }}
      aria-label="P.O.P.S fallback verification status"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, color: "#0f172a" }}>Verification path</h3>
        <span
          style={{
            borderRadius: 999,
            border: "1px solid #cbd5e1",
            color: "#334155",
            padding: "2px 10px",
            fontSize: 12,
            fontWeight: 700
          }}
        >
          {decision.fallbackMethod}
        </span>
      </div>

      <p style={{ margin: "10px 0", color: "#475569", fontSize: 14 }}>{decision.userVisibleMessage}</p>

      <p style={{ margin: "0 0 10px 0", color: "#64748b", fontSize: 13 }}>{impactLabel[decision.rewardImpact]}</p>

      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(160px, 1fr))" }}>
        <Field label="Reason code" value={decision.fallbackReason} />
        <Field label="Proof level" value={`${decision.originalProofLevel} → ${decision.fallbackProofLevel}`} />
        <Field label="User action" value={decision.requiresUserAction ? "Required" : "Not required"} />
        <Field label="Admin review" value={decision.requiresAdminReview ? "Queued" : "Not required"} />
        <Field label="Session" value={decision.sessionId} />
        <Field label="Recorded" value={new Date(decision.createdAt).toLocaleString()} />
      </div>

      {decision.auditReasonCodes.length > 0 ? (
        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
          <strong style={{ color: "#334155" }}>Audit</strong>
          <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
            {decision.auditReasonCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        background: "#f8fafc",
        padding: "8px 10px"
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#0f172a", fontWeight: 600, fontSize: 13, wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}
