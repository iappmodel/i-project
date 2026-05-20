import React from "react";
import type { BrandPopsReportMetrics } from "./brand-pops-report.service";

export interface BrandVerifiedReachCardProps {
  metrics: BrandPopsReportMetrics;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function BrandVerifiedReachCard({ metrics }: BrandVerifiedReachCardProps) {
  return (
    <section style={cardStyle} aria-label="Brand verified reach">
      <h3 style={titleStyle}>Verified moments</h3>
      <p style={copyStyle}>Sessions where P.O.P.S validated real human presence before reward release.</p>

      <div style={metricGridStyle}>
        <Metric label="Total impressions" value={String(metrics.totalImpressions)} />
        <Metric label="Verified moments" value={String(metrics.verifiedMoments)} />
        <Metric label="Verified reach" value={String(metrics.verifiedReach)} />
        <Metric label="Completion rate" value={percent(metrics.completionRate)} />
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
  margin: "0 0 12px 0",
  color: "#475569",
  fontSize: 14
};

const metricGridStyle = {
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
  fontSize: 12,
  color: "#64748b"
};

const metricValueStyle = {
  fontWeight: 700,
  fontSize: 18,
  color: "#0f172a"
};
