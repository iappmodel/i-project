import type React from "react";
import { popsTokens } from "../../../design/pops/pops-tokens";
import type { EarnOfferVerificationStep } from "./earn-pops-rules";

export interface EarnOfferVerificationStepsProps {
  steps: EarnOfferVerificationStep[];
}

export function EarnOfferVerificationSteps({ steps }: EarnOfferVerificationStepsProps) {
  return (
    <section style={containerStyle} aria-label="P.O.P.S verification steps">
      <h3 style={{ margin: 0, color: popsTokens.color.text.primary }}>Verification steps</h3>
      <ol style={listStyle}>
        {steps.map((step, index) => (
          <li key={step.id} style={itemStyle}>
            <span style={statusBadge(step.completed)}>{step.completed ? "Done" : "Pending"}</span>
            <span style={stepLabelStyle}>
              {index + 1}. {step.label}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const containerStyle: React.CSSProperties = {
  border: `1px solid ${popsTokens.color.border.subtle}`,
  borderRadius: popsTokens.radius.lg,
  padding: 14,
  background: popsTokens.color.surface.elevated
};

const listStyle: React.CSSProperties = {
  marginTop: 10,
  marginBottom: 0,
  paddingLeft: 0,
  listStyle: "none",
  display: "grid",
  gap: 8
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10
};

const stepLabelStyle: React.CSSProperties = {
  color: popsTokens.color.text.primary,
  fontSize: 13
};

function statusBadge(completed: boolean): React.CSSProperties {
  return {
    minWidth: 64,
    textAlign: "center",
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
    color: completed ? "#16a34a" : popsTokens.color.text.secondary,
    background: completed ? "rgba(22, 163, 74, 0.16)" : "rgba(148, 163, 184, 0.2)",
    border: `1px solid ${completed ? "rgba(22, 163, 74, 0.34)" : "rgba(148, 163, 184, 0.28)"}`
  };
}
