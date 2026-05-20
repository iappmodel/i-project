import type { CSSProperties } from "react";

const card: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 20,
  background: "#fff"
};
const muted: CSSProperties = { color: "#64748b", fontSize: 12 };

export function TrustAlertEventTable({ items }: { items: Record<string, unknown>[] }) {
  return (
    <section style={card}>
      <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Trust alerts</h2>

      <div style={{ marginTop: 20, overflowX: "auto" }}>
        <table style={{ width: "100%", textAlign: "left" as const, fontSize: 13, borderCollapse: "collapse" }}>
          <thead style={muted}>
            <tr>
              <th style={{ padding: "8px 4px" }}>Priority</th>
              <th style={{ padding: "8px 4px" }}>Status</th>
              <th style={{ padding: "8px 4px" }}>Alert</th>
              <th style={{ padding: "8px 4px" }}>Source</th>
              <th style={{ padding: "8px 4px" }}>Customer</th>
              <th style={{ padding: "8px 4px" }}>Notifications</th>
              <th style={{ padding: "8px 4px" }}>Escalation</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={String(item.admin_security_trust_alert_event_id ?? item.alert_event_key)}
                style={{ borderTop: "1px solid #e2e8f0" }}
              >
                <td style={{ padding: "12px 4px" }}>{String(item.alert_priority ?? "")}</td>
                <td style={{ padding: "12px 4px" }}>{String(item.status ?? "")}</td>
                <td style={{ padding: "12px 4px" }}>
                  <div style={{ fontWeight: 600 }}>{String(item.title ?? "")}</div>
                  <div style={{ ...muted, fontSize: 11 }}>{String(item.summary ?? "")}</div>
                </td>
                <td style={{ padding: "12px 4px" }}>
                  {String(item.source_module ?? "")}.{String(item.source_event_type ?? "")}
                </td>
                <td style={{ padding: "12px 4px" }}>{item.customer_name != null ? String(item.customer_name) : "—"}</td>
                <td style={{ padding: "12px 4px" }}>
                  {String(item.delivered_notification_count ?? 0)}/{String(item.notification_count ?? 0)}
                </td>
                <td style={{ padding: "12px 4px" }}>
                  {item.escalated === true ? `L${String(item.escalation_level ?? 0)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TrustAlertNotificationTable({ items }: { items: Record<string, unknown>[] }) {
  return (
    <section style={card}>
      <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Alert notifications</h2>

      <div style={{ marginTop: 20, overflowX: "auto" }}>
        <table style={{ width: "100%", textAlign: "left" as const, fontSize: 13, borderCollapse: "collapse" }}>
          <thead style={muted}>
            <tr>
              <th style={{ padding: "8px 4px" }}>Status</th>
              <th style={{ padding: "8px 4px" }}>Channel</th>
              <th style={{ padding: "8px 4px" }}>Recipient</th>
              <th style={{ padding: "8px 4px" }}>Alert</th>
              <th style={{ padding: "8px 4px" }}>Attempts</th>
              <th style={{ padding: "8px 4px" }}>Next attempt</th>
              <th style={{ padding: "8px 4px" }}>Error</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={String(item.admin_security_trust_alert_notification_id ?? item.alert_notification_key)}
                style={{ borderTop: "1px solid #e2e8f0" }}
              >
                <td style={{ padding: "12px 4px" }}>{String(item.status ?? "")}</td>
                <td style={{ padding: "12px 4px" }}>{String(item.channel_type ?? "")}</td>
                <td style={{ padding: "12px 4px" }}>
                  {item.recipient_name != null
                    ? String(item.recipient_name)
                    : item.recipient_address != null
                      ? String(item.recipient_address)
                      : "—"}
                </td>
                <td style={{ padding: "12px 4px" }}>{String(item.title ?? "")}</td>
                <td style={{ padding: "12px 4px" }}>
                  {String(item.attempt_count ?? 0)}/{String(item.max_attempts ?? 0)}
                </td>
                <td style={{ padding: "12px 4px" }}>{item.next_attempt_at != null ? String(item.next_attempt_at) : "—"}</td>
                <td style={{ padding: "12px 4px" }}>{item.last_error != null ? String(item.last_error) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TrustAlertIntegrityCards({ integrity }: { integrity: Record<string, unknown> | null }) {
  if (!integrity) return null;

  const cards: [string, unknown][] = [
    ["Open alerts", integrity.open_alert_event_count],
    ["Critical alerts", integrity.open_critical_alert_count],
    ["High alerts", integrity.open_high_alert_count],
    ["Due notifications", integrity.due_notification_count],
    ["Failed notifications 24h", integrity.failed_notification_count_24h],
    ["Due escalations", integrity.due_escalation_count],
    ["Active channels", integrity.active_channel_count],
    ["Active recipients", integrity.active_recipient_count]
  ];

  return (
    <section
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))"
      }}
    >
      {cards.map(([label, value]) => (
        <article key={label} style={card}>
          <p style={{ ...muted, textTransform: "uppercase", margin: 0, letterSpacing: "0.04em" }}>{label}</p>
          <p style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>{Number(value ?? 0).toLocaleString()}</p>
        </article>
      ))}
    </section>
  );
}
