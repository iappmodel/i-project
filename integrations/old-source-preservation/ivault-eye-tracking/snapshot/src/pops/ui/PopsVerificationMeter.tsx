import React from "react";

type PopsVerificationMeterProps = {
  value: number;
};

export function PopsVerificationMeter({ value }: PopsVerificationMeterProps) {
  const normalized = Math.max(0, Math.min(1, value));
  const width = `${Math.round(normalized * 100)}%`;
  return (
    <div data-testid="pops-verification-meter">
      <div style={{ fontSize: 12, color: "#334155", marginBottom: 6 }}>Moment confidence rising.</div>
      <div style={{ height: 10, borderRadius: 999, background: "#E2E8F0", overflow: "hidden" }}>
        <div
          style={{
            width,
            height: "100%",
            background: normalized >= 0.8 ? "#16A34A" : normalized >= 0.5 ? "#2563EB" : "#F59E0B",
            transition: "width 180ms ease",
          }}
        />
      </div>
    </div>
  );
}
