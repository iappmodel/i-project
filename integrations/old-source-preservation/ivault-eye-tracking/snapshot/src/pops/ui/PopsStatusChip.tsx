import React from "react";

export type PopsStatusChipVariant =
  | "idle"
  | "active"
  | "verified"
  | "pending"
  | "held"
  | "denied"
  | "degraded";

const VARIANT_STYLES: Record<
  PopsStatusChipVariant,
  { bg: string; fg: string; dot: string }
> = {
  idle: { bg: "#1e293b", fg: "#94a3b8", dot: "#64748b" },
  active: { bg: "#0f172a", fg: "#22d3ee", dot: "#34d399" },
  verified: { bg: "#052e16", fg: "#86efac", dot: "#22c55e" },
  pending: { bg: "#422006", fg: "#fcd34d", dot: "#fbbf24" },
  held: { bg: "#431407", fg: "#fdba74", dot: "#fb923c" },
  denied: { bg: "#450a0a", fg: "#fecdd3", dot: "#fb7185" },
  degraded: { bg: "#172554", fg: "#93c5fd", dot: "#60a5fa" },
};

export type PopsStatusChipProps = {
  status: string;
  variant?: PopsStatusChipVariant;
};

export function PopsStatusChip({ status, variant = "idle" }: PopsStatusChipProps) {
  const s = VARIANT_STYLES[variant];
  return (
    <span
      data-testid="pops-status-chip"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 999,
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.fg,
        border: "1px solid rgba(148,163,184,0.25)",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: s.dot }} aria-hidden />
      {status}
    </span>
  );
}
