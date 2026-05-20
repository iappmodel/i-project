import React from "react";
import type { PopsPrivacyReceipt } from "../types/pops-privacy.types";

export type PopsPrivacyReceiptCardProps = {
  receipt: PopsPrivacyReceipt | null;
};

export function PopsPrivacyReceiptCard({ receipt }: PopsPrivacyReceiptCardProps) {
  if (!receipt) {
    return (
      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }} data-testid="pops-privacy-receipt-empty">
        No receipt yet.
      </p>
    );
  }

  return (
    <article
      data-testid="pops-privacy-receipt"
      style={{
        border: "1px solid rgba(148,163,184,0.25)",
        borderRadius: 12,
        background: "#0f172a",
        padding: 14,
        color: "#e2e8f0",
      }}
    >
      <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Verification receipt</h3>
      <dl style={{ margin: 0, display: "grid", gap: 8, fontSize: 12 }}>
        <div>
          <dt style={{ color: "#64748b", marginBottom: 2 }}>Session type</dt>
          <dd style={{ margin: 0 }}>{receipt.sessionType}</dd>
        </div>
        <div>
          <dt style={{ color: "#64748b", marginBottom: 2 }}>Proof level</dt>
          <dd style={{ margin: 0 }}>{receipt.proofLevel}</dd>
        </div>
        <div>
          <dt style={{ color: "#64748b", marginBottom: 2 }}>Signals used</dt>
          <dd style={{ margin: 0 }}>{receipt.signalCategoriesUsed.join(", ")}</dd>
        </div>
        <div>
          <dt style={{ color: "#64748b", marginBottom: 2 }}>Raw camera stored</dt>
          <dd style={{ margin: 0 }}>No</dd>
        </div>
        <div>
          <dt style={{ color: "#64748b", marginBottom: 2 }}>Raw audio stored</dt>
          <dd style={{ margin: 0 }}>No</dd>
        </div>
        <div>
          <dt style={{ color: "#64748b", marginBottom: 2 }}>Local processing</dt>
          <dd style={{ margin: 0 }}>{receipt.localProcessingUsed ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt style={{ color: "#64748b", marginBottom: 2 }}>Retention</dt>
          <dd style={{ margin: 0 }}>{receipt.retentionPolicy}</dd>
        </div>
        <div>
          <dt style={{ color: "#64748b", marginBottom: 2 }}>Summary</dt>
          <dd style={{ margin: 0, lineHeight: 1.5, color: "#cbd5e1" }}>{receipt.userVisibleSummary}</dd>
        </div>
      </dl>
    </article>
  );
}
