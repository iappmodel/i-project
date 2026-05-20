import type { CSSProperties } from "react";

const sectionStyle: CSSProperties = {
  border: "1px solid #dbe3ea",
  borderRadius: 12,
  padding: 20,
  background: "#fff"
};

const metricGrid: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  marginTop: 24
};

const metricBox: CSSProperties = {
  borderRadius: 8,
  background: "#f1f5f9",
  padding: 16
};

export function ProofCommandCenterSummary({ snapshot }: { snapshot: Record<string, unknown> | null }) {
  if (!snapshot) {
    return (
      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Proof Command Center</h2>
        <p style={{ marginTop: 10, fontSize: 14, color: "#64748b" }}>
          No observability snapshot has been generated yet.
        </p>
      </section>
    );
  }

  const healthStatus = String(snapshot.health_status ?? "");
  const healthScore = snapshot.health_score;
  const generatedAt = String(snapshot.generated_at ?? "");

  return (
    <section style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.06em", color: "#64748b", textTransform: "uppercase" }}>
            Proof Command Center
          </p>
          <h2 style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 600 }}>{healthStatus}</h2>
          <p style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>Health score: {String(healthScore)}</p>
        </div>
        <span
          style={{
            alignSelf: "flex-start",
            border: "1px solid #cbd5e1",
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 12
          }}
        >
          {generatedAt}
        </span>
      </div>

      <div style={metricGrid}>
        <Metric label="Proof objects" value={snapshot.proof_object_count} />
        <Metric label="Active rooms" value={snapshot.active_room_count} />
        <Metric label="Active incidents" value={snapshot.active_incident_count} />
        <Metric label="Critical incidents" value={snapshot.critical_incident_count} />
        <Metric label="Failed verifications 24h" value={snapshot.failed_verification_count_24h} />
        <Metric label="Hash mismatches 24h" value={snapshot.hash_mismatch_count_24h} />
        <Metric label="Expiring links 7d" value={snapshot.expiring_link_count_7d} />
        <Metric label="Failed jobs 1h" value={snapshot.failed_job_count_1h} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={metricBox}>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{label}</p>
      <p style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 600 }}>{String(value ?? 0)}</p>
    </div>
  );
}
