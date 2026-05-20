import React from "react";
import type { PopsProofLevel } from "../types/pops.types";
import { getPopsProofLevelDescription, getPopsProofLevelLabel } from "./pops-proof-level-copy";

export type PopsProofLevelBadgeProps = {
  proofLevel: PopsProofLevel;
  showDescription?: boolean;
  size?: "sm" | "md";
};

function palette(level: PopsProofLevel): { border: string; color: string; bg: string } {
  if (level === "LEVEL_0_NONE") {
    return { border: "rgba(148,163,184,0.45)", color: "#94a3b8", bg: "rgba(15,23,42,0.5)" };
  }
  if (level === "LEVEL_1_SESSION" || level === "LEVEL_2_ATTENTION") {
    return { border: "rgba(34,211,238,0.45)", color: "#a5f3fc", bg: "rgba(6,78,59,0.35)" };
  }
  if (level === "LEVEL_3_INTENT" || level === "LEVEL_4_IDENTITY_CONTINUITY") {
    return { border: "rgba(251,191,36,0.5)", color: "#fcd34d", bg: "rgba(120,53,15,0.35)" };
  }
  return { border: "rgba(244,114,182,0.45)", color: "#fbcfe8", bg: "rgba(88,28,135,0.35)" };
}

export function PopsProofLevelBadge({ proofLevel, showDescription, size = "sm" }: PopsProofLevelBadgeProps) {
  const p = palette(proofLevel);
  const fontSize = size === "md" ? 12 : 11;
  const pad = size === "md" ? "6px 12px" : "4px 10px";
  return (
    <div data-testid="pops-proof-level-badge" style={{ display: "grid", gap: showDescription ? 4 : 0 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 999,
          border: `1px solid ${p.border}`,
          padding: pad,
          fontSize,
          fontWeight: 600,
          color: p.color,
          background: p.bg,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          letterSpacing: "0.02em",
          width: "fit-content",
        }}
      >
        {getPopsProofLevelLabel(proofLevel)}
      </span>
      {showDescription ? (
        <span style={{ fontSize: size === "md" ? 12 : 11, color: "#94a3b8", lineHeight: 1.45, maxWidth: 320 }}>
          {getPopsProofLevelDescription(proofLevel)}
        </span>
      ) : null}
    </div>
  );
}
