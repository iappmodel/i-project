import type React from "react";
import { popsTokens } from "../../../design/pops/pops-tokens";
import {
  EARN_POPS_COMPLETION_COPY,
  type EarnPopsCompletionState
} from "./earn-pops-rules";

export interface EarnPopsCompletionScreenProps {
  state: EarnPopsCompletionState;
  reasonCodes?: string[];
}

export function EarnPopsCompletionScreen({
  state,
  reasonCodes = []
}: EarnPopsCompletionScreenProps) {
  const copy = EARN_POPS_COMPLETION_COPY[state];
  const tone = toneByState[state];
  return (
    <section style={{ ...containerStyle, ...tone }} aria-live="polite" aria-label="P.O.P.S completion status">
      <h2 style={titleStyle}>{copy.title}</h2>
      <p style={bodyStyle}>{copy.body}</p>
      {reasonCodes.length > 0 ? (
        <div style={reasonBlockStyle}>
          <strong>Verification notes</strong>
          <ul style={reasonListStyle}>
            {reasonCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

const containerStyle: React.CSSProperties = {
  border: `1px solid ${popsTokens.color.border.subtle}`,
  borderRadius: popsTokens.radius.lg,
  padding: 16,
  background: popsTokens.color.surface.elevated
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: popsTokens.color.text.primary
};

const bodyStyle: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 0,
  color: popsTokens.color.text.secondary
};

const reasonBlockStyle: React.CSSProperties = {
  marginTop: 12,
  borderTop: `1px solid ${popsTokens.color.border.subtle}`,
  paddingTop: 10,
  color: popsTokens.color.text.secondary,
  fontSize: 13
};

const reasonListStyle: React.CSSProperties = {
  margin: "8px 0 0 16px",
  padding: 0
};

const toneByState: Record<EarnPopsCompletionState, React.CSSProperties> = {
  APPROVED_FULL: { borderColor: "rgba(22, 163, 74, 0.4)" },
  APPROVED_PARTIAL: { borderColor: "rgba(245, 158, 11, 0.36)" },
  PENDING_REVIEW: { borderColor: "rgba(245, 158, 11, 0.36)" },
  DENIED: { borderColor: "rgba(239, 68, 68, 0.4)" }
};
