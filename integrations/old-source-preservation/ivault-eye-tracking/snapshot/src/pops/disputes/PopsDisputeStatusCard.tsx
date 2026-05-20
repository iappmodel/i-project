import React from "react";
import {
  POPS_DISPUTE_STATUS_COPY,
  type PopsDispute,
  type PopsDisputeStatus
} from "./pops-dispute.types";

export interface PopsDisputeStatusCardProps {
  dispute: PopsDispute;
}

const statusTone: Record<PopsDisputeStatus, { bg: string; border: string; text: string }> = {
  CREATED: { bg: "#f8fafc", border: "#cbd5e1", text: "#334155" },
  UNDER_REVIEW: { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" },
  NEEDS_MORE_INFO: { bg: "#fff7ed", border: "#fdba74", text: "#c2410c" },
  APPROVED: { bg: "#ecfdf5", border: "#86efac", text: "#166534" },
  PARTIALLY_APPROVED: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  DENIED: { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c" },
  CLOSED: { bg: "#f8fafc", border: "#d1d5db", text: "#4b5563" }
};

export function PopsDisputeStatusCard({ dispute }: PopsDisputeStatusCardProps) {
  const tone = statusTone[dispute.status];
  return (
    <section
      style={{
        border: `1px solid ${tone.border}`,
        borderRadius: 10,
        background: tone.bg,
        padding: 14,
        maxWidth: 720
      }}
      aria-label="P.O.P.S dispute status"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <h3 style={{ margin: 0, color: "#0f172a" }}>Dispute status</h3>
        <span
          style={{
            borderRadius: 999,
            border: `1px solid ${tone.border}`,
            color: tone.text,
            padding: "2px 10px",
            fontSize: 12,
            fontWeight: 700
          }}
        >
          {dispute.status}
        </span>
      </div>

      <p style={{ margin: "8px 0 10px 0", color: tone.text }}>{POPS_DISPUTE_STATUS_COPY[dispute.status]}</p>

      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(180px, 1fr))" }}>
        <Field label="Reason" value={dispute.reason} />
        <Field label="Session ID" value={dispute.sessionId} />
        <Field label="Reward decision" value={dispute.rewardDecisionId} />
        <Field label="Submitted at" value={new Date(dispute.createdAt).toLocaleString()} />
      </div>

      {dispute.adminNote ? (
        <div
          style={{
            marginTop: 10,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            borderRadius: 8,
            padding: "8px 10px",
            color: "#334155"
          }}
        >
          <strong style={{ display: "block", marginBottom: 4 }}>Reviewer note</strong>
          <span>{dispute.adminNote}</span>
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
        background: "#ffffff",
        padding: "8px 10px"
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#0f172a", fontWeight: 600, fontSize: 13 }}>{value}</div>
    </div>
  );
}
