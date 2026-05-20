import React from "react";
import type { BrandPopsIntentProofRow } from "./brand-pops-report.service";

export interface BrandIntentProofTableProps {
  rows: BrandPopsIntentProofRow[];
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function BrandIntentProofTable({ rows }: BrandIntentProofTableProps) {
  return (
    <section style={cardStyle} aria-label="Brand intent proof">
      <h3 style={titleStyle}>Intent proof</h3>
      <p style={copyStyle}>Actions that happened after enough verified exposure to count as deliberate.</p>

      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Action type</th>
              <th style={thStyle}>Verified actions</th>
              <th style={thStyle}>Avg confidence</th>
              <th style={thStyle}>Qualified rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={tdStyle} colSpan={4}>
                  No verified intent actions in selected range.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.actionType}>
                  <td style={tdStyle}>{row.actionType}</td>
                  <td style={tdStyle}>{row.verifiedCount}</td>
                  <td style={tdStyle}>{percent(row.averageConfidence)}</td>
                  <td style={tdStyle}>{percent(row.qualifiedRate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
  margin: "0 0 10px 0",
  color: "#475569",
  fontSize: 14
};

const tableWrapperStyle = {
  overflowX: "auto"
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const
};

const thStyle = {
  textAlign: "left" as const,
  borderBottom: "1px solid #cbd5e1",
  color: "#334155",
  padding: "8px 6px",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: 0.5
};

const tdStyle = {
  borderBottom: "1px solid #e2e8f0",
  color: "#0f172a",
  padding: "8px 6px",
  fontSize: 13
};
