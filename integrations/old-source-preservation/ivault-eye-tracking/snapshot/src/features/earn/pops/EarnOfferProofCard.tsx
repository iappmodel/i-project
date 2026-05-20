import type React from "react";
import { popsTokens } from "../../../design/pops/pops-tokens";
import type { UseEarnOfferPopsOutput } from "./useEarnOfferPops";

export interface EarnOfferProofCardProps {
  pops: UseEarnOfferPopsOutput;
}

export function EarnOfferProofCard({ pops }: EarnOfferProofCardProps) {
  return (
    <section style={containerStyle} aria-label="Offer proof requirements">
      <h3 style={{ margin: 0, color: popsTokens.color.text.primary }}>Offer proof requirements</h3>
      <p style={proofCopyStyle}>{pops.proofCopy}</p>
      <div style={gridStyle}>
        <Row label="Proof level" value={pops.summary.proofLevel} />
        <Row label="Required time" value={pops.summary.estimatedTime} mono />
        <Row label="Required completion" value={pops.summary.requiredActions.join(", ")} />
        <Row label="Visual presence" value="Not required for MVP" />
        <Row label="Raw camera/audio" value="Not stored" />
        <Row label="Reward release" value="Pending after verification" />
      </div>
    </section>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={{ ...valueStyle, ...(mono ? monoStyle : null) }}>{value}</span>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  border: `1px solid ${popsTokens.color.border.subtle}`,
  borderRadius: popsTokens.radius.lg,
  padding: 14,
  background: popsTokens.color.surface.elevated
};

const proofCopyStyle: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 14,
  color: popsTokens.color.text.secondary,
  fontSize: 14
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: 8
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10
};

const labelStyle: React.CSSProperties = {
  color: popsTokens.color.text.secondary,
  fontSize: 13
};

const valueStyle: React.CSSProperties = {
  color: popsTokens.color.text.primary,
  fontSize: 13,
  fontWeight: 600,
  textAlign: "right"
};

const monoStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace"
};
