import React from "react";
import { BrandAttentionQualityChart } from "./BrandAttentionQualityChart";
import { BrandFraudSavingsCard } from "./BrandFraudSavingsCard";
import { BrandIntentProofTable } from "./BrandIntentProofTable";
import { BrandVerifiedReachCard } from "./BrandVerifiedReachCard";
import type { BrandPopsCampaignReport as BrandPopsCampaignReportModel } from "./brand-pops-report.service";

export interface BrandPopsCampaignReportProps {
  report: BrandPopsCampaignReportModel;
}

function currency(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function BrandPopsCampaignReport({ report }: BrandPopsCampaignReportProps) {
  const { metrics, exportModel } = report;
  const locationProof = metrics.locationProofSuccessRate;
  const merchantProof = metrics.merchantProofSuccessRate;

  return (
    <main style={pageStyle} aria-label="P.O.P.S brand campaign report">
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ margin: "0 0 6px 0" }}>P.O.P.S Campaign Proof Report</h1>
        <p style={{ margin: "0 0 6px 0", color: "#475569" }}>
          Campaign-level proof that budget paid for verified human moments.
        </p>
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
          Campaign: <strong>{report.campaignId}</strong> | Brand: <strong>{report.brandId}</strong> | Range:{" "}
          {report.dateRange.start} to {report.dateRange.end}
        </p>
      </header>

      <section style={cardGridStyle}>
        <BrandVerifiedReachCard metrics={metrics} />
        <BrandAttentionQualityChart metrics={metrics} />
        <BrandFraudSavingsCard metrics={metrics} />
      </section>

      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 6px 0" }}>Cost per verified moment</h3>
        <p style={copyStyle}>What you paid for confirmed human presence, not raw impressions.</p>
        <div style={twoColumnStyle}>
          <Metric label="Cost per verified moment" value={currency(metrics.costPerVerifiedMoment)} />
          <Metric label="Cost per verified intent" value={currency(metrics.costPerVerifiedIntent)} />
        </div>
      </section>

      <BrandIntentProofTable rows={report.intentProofRows} />

      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 10px 0" }}>Optional proof channels</h3>
        <div style={twoColumnStyle}>
          <Metric
            label="Location proof success rate"
            value={locationProof == null ? "N/A" : `${Math.round(locationProof * 100)}%`}
          />
          <Metric
            label="Merchant proof success rate"
            value={merchantProof == null ? "N/A" : `${Math.round(merchantProof * 100)}%`}
          />
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 10px 0" }}>Export package</h3>
        <ul style={listStyle}>
          <li>CSV summary is ready for campaign proof export.</li>
          <li>PDF-ready report data includes aggregate metrics and intent proof rows.</li>
          <li>Campaign proof receipt includes invoice-safe reconciliation fields.</li>
        </ul>

        <div style={exportGridStyle}>
          <article style={subCardStyle}>
            <h4 style={subTitleStyle}>Campaign proof receipt</h4>
            <pre style={preStyle}>{JSON.stringify(exportModel.campaignProofReceipt, null, 2)}</pre>
          </article>

          <article style={subCardStyle}>
            <h4 style={subTitleStyle}>Invoice reconciliation fields</h4>
            <pre style={preStyle}>{JSON.stringify(exportModel.invoiceReconciliationFields, null, 2)}</pre>
          </article>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricCardStyle}>
      <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
      <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 20 }}>{value}</div>
    </div>
  );
}

const pageStyle = {
  margin: "0 auto",
  maxWidth: 1200,
  padding: 16,
  display: "grid",
  gap: 12,
  fontFamily: "system-ui, sans-serif",
  color: "#0f172a"
};

const cardGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(3, minmax(260px, 1fr))"
};

const cardStyle = {
  border: "1px solid #dbe3ea",
  borderRadius: 12,
  background: "#ffffff",
  padding: 14
};

const copyStyle = {
  margin: "0 0 10px 0",
  color: "#475569",
  fontSize: 14
};

const twoColumnStyle = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(2, minmax(220px, 1fr))"
};

const metricCardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#f8fafc",
  padding: "8px 10px"
};

const listStyle = {
  margin: "0 0 10px 18px",
  color: "#334155",
  lineHeight: 1.5
};

const exportGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(2, minmax(300px, 1fr))"
};

const subCardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#f8fafc",
  padding: 10
};

const subTitleStyle = {
  margin: "0 0 6px 0",
  color: "#0f172a"
};

const preStyle = {
  margin: 0,
  fontSize: 12,
  color: "#1e293b",
  overflowX: "auto" as const
};
