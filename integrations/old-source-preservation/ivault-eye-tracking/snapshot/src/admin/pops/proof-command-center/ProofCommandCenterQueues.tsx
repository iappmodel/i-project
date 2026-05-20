import type { CSSProperties } from "react";

const sectionStyle: CSSProperties = {
  border: "1px solid #dbe3ea",
  borderRadius: 12,
  padding: 20,
  background: "#fff"
};

const grid: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  marginTop: 20
};

const cell: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 14
};

export function ProofCommandCenterQueues({ queues }: { queues: Record<string, unknown> | null }) {
  return (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Operational queues</h2>

      <div style={grid}>
        <QueueMetric label="Active incidents" value={queues?.active_incidents} />
        <QueueMetric label="Critical incidents" value={queues?.critical_incidents} />
        <QueueMetric label="Unassigned incidents" value={queues?.unassigned_incidents} />
        <QueueMetric label="Overdue high incidents" value={queues?.overdue_high_incidents} />
        <QueueMetric label="Missing customer notices" value={queues?.missing_customer_notices} />
        <QueueMetric label="Queued digests" value={queues?.queued_digests} />
        <QueueMetric label="Failed report jobs 1h" value={queues?.failed_report_jobs_1h} />
        <QueueMetric label="Failed QR jobs 1h" value={queues?.failed_qr_jobs_1h} />
        <QueueMetric label="Expiring links 7d" value={queues?.expiring_links_7d} />
      </div>
    </section>
  );
}

function QueueMetric({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={cell}>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{label}</p>
      <p style={{ margin: "8px 0 0", fontSize: 20, fontWeight: 600 }}>{String(value ?? 0)}</p>
    </div>
  );
}
