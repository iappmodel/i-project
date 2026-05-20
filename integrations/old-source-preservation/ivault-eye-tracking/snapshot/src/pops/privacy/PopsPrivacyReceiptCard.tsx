import React from "react";
import type { PopsPrivacyReceipt } from "./pops-privacy-receipt.types";
import { retentionLabel } from "./pops-retention-policy";

export interface PopsPrivacyReceiptCardProps {
  receipt: PopsPrivacyReceipt;
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function decisionLabel(receipt: PopsPrivacyReceipt): string {
  return receipt.decisionId ? "Decision recorded" : "Session recorded";
}

export function PopsPrivacyReceiptCard({ receipt }: PopsPrivacyReceiptCardProps) {
  return (
    <section
      style={{
        border: "1px solid #dbe3ea",
        borderRadius: 10,
        background: "#f8fafc",
        padding: 14,
        maxWidth: 720
      }}
      aria-label="P.O.P.S privacy receipt"
    >
      <h3 style={{ margin: 0, color: "#0f172a" }}>Privacy receipt</h3>
      <p style={{ marginTop: 6, color: "#475569" }}>{receipt.userVisibleSummary}</p>

      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(180px, 1fr))" }}>
        <Field label="Session type" value={receipt.sessionType} />
        <Field label="Proof level" value={receipt.proofLevel} />
        <Field label="Decision" value={decisionLabel(receipt)} />
        <Field label="Signals used" value={receipt.signalCategoriesUsed.join(", ")} />
        <Field
          label="Raw data stored"
          value={receipt.rawDataTypesStored.length > 0 ? "Yes" : "No"}
        />
        <Field label="Local processing" value={yesNo(receipt.localProcessingUsed)} />
        <Field label="Retention" value={retentionLabel(receipt.retentionPolicy)} />
        <Field label="Policy version" value={receipt.policyVersion} />
      </div>
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
      <div style={{ color: "#0f172a", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

