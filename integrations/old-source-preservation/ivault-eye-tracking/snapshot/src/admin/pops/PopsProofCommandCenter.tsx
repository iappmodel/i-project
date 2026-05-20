/**
 * Proof Command Center (Step 9.80) — operational brain for trust / proof observability.
 *
 * Module map (console IA):
 * - Overview — global health + snapshot summary
 * - Operational Queues — SLA-adjacent backlog counts
 * - Customer Health — per-room trust health
 * - Health Signals — normalized proof health signals
 * - Recent Activity — incidents, verifications, reports, signals
 * - Observability Integrity — pipeline freshness checks
 *
 * Wire `snapshot`, `queues`, `customerHealthItems`, `signals`, `activity`, `integrity`
 * from GET `/v1/admin/security-proof-observability/*`. Actions POST `/cycle`, etc.
 */
import type { CSSProperties } from "react";
import { useState } from "react";
import { CustomerTrustHealthTable } from "./proof-command-center/CustomerTrustHealthTable";
import { ProofCommandCenterQueues } from "./proof-command-center/ProofCommandCenterQueues";
import { ProofCommandCenterSummary } from "./proof-command-center/ProofCommandCenterSummary";
import { ProofRecentActivityFeed } from "./proof-command-center/ProofRecentActivityFeed";

const pageStyle: CSSProperties = {
  margin: "0 auto",
  maxWidth: 1200,
  padding: 16,
  fontFamily: "system-ui, sans-serif",
  color: "#0f172a"
};

const navStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 16,
  padding: 0,
  listStyle: "none"
};

const navItem = (active: boolean): CSSProperties => ({
  padding: "8px 12px",
  borderRadius: 8,
  border: active ? "1px solid #0f172a" : "1px solid #e2e8f0",
  background: active ? "#f8fafc" : "#fff",
  cursor: "pointer",
  fontSize: 13
});

const actionsRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 20
};

const btnStyle: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 13,
  cursor: "pointer"
};

type Section =
  | "overview"
  | "queues"
  | "customer_health"
  | "signals"
  | "activity"
  | "integrity";

export type ProofCommandCenterProps = {
  snapshot?: Record<string, unknown> | null;
  queues?: Record<string, unknown> | null;
  customerHealthItems?: Record<string, unknown>[];
  signalItems?: Record<string, unknown>[];
  activityItems?: Record<string, unknown>[];
  integrity?: Record<string, unknown> | null;
  onRunObservabilityCycle?: () => void;
  onDetectIncidents?: () => void;
};

export function PopsProofCommandCenter({
  snapshot = null,
  queues = null,
  customerHealthItems = [],
  signalItems = [],
  activityItems = [],
  integrity = null,
  onRunObservabilityCycle,
  onDetectIncidents
}: ProofCommandCenterProps) {
  const [section, setSection] = useState<Section>("overview");

  return (
    <main style={pageStyle}>
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ marginBottom: 6 }}>Proof Command Center</h1>
        <p style={{ marginTop: 0, color: "#475569", fontSize: 14 }}>
          One place for healthy vs failing vs risky vs immediate action across proof objects, incidents,
          verifications, digests, QR/links, and crypto integrity signals.
        </p>
      </header>

      <ul style={navStyle}>
        {(
          [
            ["overview", "Overview"],
            ["queues", "Operational Queues"],
            ["customer_health", "Customer Health"],
            ["signals", "Health Signals"],
            ["activity", "Recent Activity"],
            ["integrity", "Observability Integrity"]
          ] as const
        ).map(([key, label]) => (
          <li key={key}>
            <button type="button" style={navItem(section === key)} onClick={() => setSection(key)}>
              {label}
            </button>
          </li>
        ))}
      </ul>

      <div style={actionsRow}>
        <button type="button" style={btnStyle} onClick={onRunObservabilityCycle}>
          Run observability cycle
        </button>
        <button type="button" style={btnStyle} onClick={onDetectIncidents}>
          Detect incidents now
        </button>
        <button type="button" style={btnStyle} disabled title="Wire to trust incident APIs">
          Auto-escalate incidents
        </button>
        <button type="button" style={btnStyle} disabled title="Deep links to filtered incident lists">
          Open critical / unassigned / missing notices
        </button>
        <button type="button" style={btnStyle} disabled title="POST /signals + export snapshot">
          Create manual signal / export snapshot
        </button>
      </div>

      {section === "overview" ? <ProofCommandCenterSummary snapshot={snapshot} /> : null}
      {section === "queues" ? <ProofCommandCenterQueues queues={queues} /> : null}
      {section === "customer_health" ? <CustomerTrustHealthTable items={customerHealthItems} /> : null}
      {section === "signals" ? <SignalsList items={signalItems} /> : null}
      {section === "activity" ? <ProofRecentActivityFeed items={activityItems} /> : null}
      {section === "integrity" ? <IntegrityPanel integrity={integrity} /> : null}
    </main>
  );
}

function SignalsList({ items }: { items: Record<string, unknown>[] }) {
  return (
    <section
      style={{
        border: "1px solid #dbe3ea",
        borderRadius: 12,
        padding: 20,
        background: "#fff"
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Health signals</h2>
      <ul style={{ marginTop: 16, paddingLeft: 18 }}>
        {items.length === 0 ? (
          <li style={{ color: "#64748b" }}>No active signals in this feed.</li>
        ) : (
          items.map((s) => (
            <li key={String(s.admin_security_proof_health_signal_id ?? s.signal_key)} style={{ marginBottom: 10 }}>
              <strong>{String(s.severity)}</strong> — {String(s.title)}{" "}
              <span style={{ color: "#64748b" }}>({String(s.signal_type)})</span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function IntegrityPanel({ integrity }: { integrity: Record<string, unknown> | null }) {
  if (!integrity) {
    return (
      <section style={{ border: "1px solid #dbe3ea", borderRadius: 12, padding: 20 }}>
        <p style={{ color: "#64748b" }}>No integrity payload loaded.</p>
      </section>
    );
  }
  return (
    <section style={{ border: "1px solid #dbe3ea", borderRadius: 12, padding: 20, background: "#fff" }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Observability integrity</h2>
      <dl style={{ marginTop: 16, display: "grid", gap: 8 }}>
        {Object.entries(integrity).map(([k, v]) => (
          <div key={k} style={{ display: "flex", gap: 12 }}>
            <dt style={{ minWidth: 220, color: "#64748b", fontSize: 13 }}>{k}</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{String(v)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
