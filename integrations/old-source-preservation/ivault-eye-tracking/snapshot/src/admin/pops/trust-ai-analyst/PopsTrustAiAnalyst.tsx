import type { CSSProperties } from "react";
import { CustomerTrustRiskScoreCards, TrustAiFindingTable, TrustAiRecommendedActionTable } from "./TrustAiAnalystTables";

const introStyle: CSSProperties = {
  marginBottom: 12,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  fontSize: 13,
  color: "#334155",
  lineHeight: 1.5
};

const metricRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 10,
  marginBottom: 16
};

const metricBox: CSSProperties = {
  border: "1px solid #dbe3ea",
  borderRadius: 10,
  padding: 12,
  background: "#fff"
};

export type TrustAiAnalystPanelProps = {
  integrity?: Record<string, unknown> | null;
  findings?: Record<string, unknown>[];
  riskScores?: Record<string, unknown>[];
  recommendedActions?: Record<string, unknown>[];
};

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function PopsTrustAiAnalyst({
  integrity = null,
  findings = [],
  riskScores = [],
  recommendedActions = []
}: TrustAiAnalystPanelProps) {
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Trust AI Analyst</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
          Detectors, anomaly findings, customer risk scores, and recommended actions. Wire to admin API for live data.
        </p>
      </header>

      <p style={introStyle}>
        <strong>Decision support only:</strong> findings are not automatic judgment. Critical items must stay explainable;
        suppression requires a reason; resolution keeps evidence; customer-visible steps stay deliberate.
      </p>

      <div style={metricRow}>
        <div style={metricBox}>
          <div style={{ fontSize: 11, color: "#64748b" }}>Active detectors</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{num(integrity?.active_detector_count)}</div>
        </div>
        <div style={metricBox}>
          <div style={{ fontSize: 11, color: "#64748b" }}>Failed analyst runs (24h)</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{num(integrity?.failed_analyst_run_count_24h)}</div>
        </div>
        <div style={metricBox}>
          <div style={{ fontSize: 11, color: "#64748b" }}>Open findings</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{num(integrity?.open_finding_count)}</div>
        </div>
        <div style={metricBox}>
          <div style={{ fontSize: 11, color: "#64748b" }}>Open critical</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{num(integrity?.open_critical_finding_count)}</div>
        </div>
        <div style={metricBox}>
          <div style={{ fontSize: 11, color: "#64748b" }}>Open high</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{num(integrity?.open_high_finding_count)}</div>
        </div>
        <div style={metricBox}>
          <div style={{ fontSize: 11, color: "#64748b" }}>Open recommended actions</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{num(integrity?.open_recommended_action_count)}</div>
        </div>
        <div style={metricBox}>
          <div style={{ fontSize: 11, color: "#64748b" }}>High/critical risk (24h)</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{num(integrity?.high_or_critical_customer_risk_count_24h)}</div>
        </div>
      </div>

      <TrustAiFindingTable items={findings} />
      <CustomerTrustRiskScoreCards items={riskScores} />
      <TrustAiRecommendedActionTable items={recommendedActions} />
    </section>
  );
}
