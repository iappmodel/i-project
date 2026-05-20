import React from "react";
import type { BrandPopsReportMetrics } from "./brand-pops-report.service";

export interface BrandFraudSavingsCardProps {
  metrics: BrandPopsReportMetrics;
}

function currency(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function BrandFraudSavingsCard({ metrics }: BrandFraudSavingsCardProps) {
  return (
    <section style={cardStyle} aria-label="Brand fraud savings">
      <h3 style={titleStyle}>Fraud prevented</h3>
      <p style={copyStyle}>Reward attempts blocked or held because the humane factor could not be verified.</p>

      <div style={bigValueStyle}>{currency(metrics.estimatedFraudPrevented)}</div>

      <div style={gridStyle}>
        <Metric label="Approved rewards" value={String(metrics.approvedRewards)} />
        <Metric label="Partial rewards" value={String(metrics.partialRewards)} />
        <Metric label="Held rewards" value={String(metrics.heldRewards)} />
        <Metric label="Denied rewards" value={String(metrics.deniedRewards)} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricCardStyle}>
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{value}</div>
    </div>
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
  margin: "0 0 10px 0",
  color: "#475569",
  fontSize: 14
};

const bigValueStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: "#166534",
  marginBottom: 12
};

const gridStyle = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(2, minmax(150px, 1fr))"
};

const metricCardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#f8fafc",
  padding: "8px 10px"
};

const metricLabelStyle = {
  color: "#64748b",
  fontSize: 12
};

const metricValueStyle = {
  color: "#0f172a",
  fontWeight: 700,
  fontSize: 18
};
