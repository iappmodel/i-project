import React from "react";
import type { BrandPopsReportMetrics } from "./brand-pops-report.service";

export interface BrandAttentionQualityChartProps {
  metrics: BrandPopsReportMetrics;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function BrandAttentionQualityChart({ metrics }: BrandAttentionQualityChartProps) {
  const rows = [
    { label: "Average presence confidence", value: metrics.averagePresenceConfidence },
    { label: "Average attention confidence", value: metrics.averageAttentionConfidence },
    { label: "Average intent confidence", value: metrics.averageIntentConfidence },
    { label: "CTA intent quality", value: metrics.ctaIntentQuality }
  ];

  return (
    <section style={cardStyle} aria-label="Brand attention quality chart">
      <h3 style={titleStyle}>Attention quality</h3>
      <p style={copyStyle}>Quality indicators from verified sessions only. No raw private signals are exposed.</p>

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: "grid", gap: 6 }}>
            <div style={labelRowStyle}>
              <span>{row.label}</span>
              <strong>{percent(row.value)}</strong>
            </div>
            <div style={barTrackStyle}>
              <div style={{ ...barFillStyle, width: `${Math.round(Math.max(0, Math.min(1, row.value)) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const cardStyle = {
  border: "1px solid #dbe3ea",
  borderRadius: 12,
  background: "#ffffff",
  padding: 14
};

const titleStyle = {
  margin: "0 0 6px 0",
  color: "#0f172a"
};

const copyStyle = {
  margin: "0 0 12px 0",
  color: "#475569",
  fontSize: 14
};

const labelRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  color: "#334155",
  fontSize: 13
};

const barTrackStyle = {
  width: "100%",
  background: "#e2e8f0",
  borderRadius: 999,
  height: 10,
  overflow: "hidden"
};

const barFillStyle = {
  height: "100%",
  background: "linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)",
  borderRadius: 999
};
