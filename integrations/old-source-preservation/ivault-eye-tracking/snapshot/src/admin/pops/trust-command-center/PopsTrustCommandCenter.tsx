import type { CSSProperties } from "react";

const sectionGap: CSSProperties = { display: "grid", gap: 16 };
const cardBorder: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 16,
  background: "#fff"
};
const muted: CSSProperties = { color: "#64748b", fontSize: 12 };
const gridCards: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))"
};
const split: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "1.2fr 0.8fr"
};

export type TrustCommandCenterPanelProps = {
  snapshot?: Record<string, unknown> | null;
  cards?: Record<string, unknown>[];
  queue?: Record<string, unknown>[];
  timeline?: Record<string, unknown>[];
};

export function PopsTrustCommandCenter({
  snapshot = null,
  cards = [],
  queue = [],
  timeline = []
}: TrustCommandCenterPanelProps) {
  return (
    <section style={sectionGap}>
      <header>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Trust Command Center</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
          Unified posture, cards, cross-module queue, and operational timeline. Wire to{" "}
          <code>/v1/admin/security-trust-command-center</code> for live data.
        </p>
      </header>

      <TrustCommandCenterShell snapshot={snapshot} cards={cards} queue={queue} timeline={timeline} />
    </section>
  );
}

export function TrustCommandCenterShell({
  snapshot,
  cards,
  queue,
  timeline
}: {
  snapshot: Record<string, unknown> | null;
  cards: Record<string, unknown>[];
  queue: Record<string, unknown>[];
  timeline: Record<string, unknown>[];
}) {
  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <CommandPostureHero snapshot={snapshot} />
      <CommandCardGrid cards={cards} />
      <div style={split}>
        <CommandQueueTable items={queue} />
        <CommandTimeline items={timeline} />
      </div>
    </main>
  );
}

export function CommandPostureHero({ snapshot }: { snapshot: Record<string, unknown> | null }) {
  if (!snapshot) {
    return (
      <section style={cardBorder}>
        <h3 style={{ marginTop: 0 }}>Trust Command Center</h3>
        <p style={{ ...muted, marginBottom: 0 }}>
          No command center snapshot is available yet. Run refresh from the admin API or scheduled job.
        </p>
      </section>
    );
  }

  const title = String(snapshot.summary_title ?? "Trust posture");
  const body = String(snapshot.summary_body ?? "");
  const score = snapshot.posture_score;
  const level = String(snapshot.posture_level ?? "—");

  return (
    <section style={cardBorder}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16 }}>
        <div style={{ flex: "1 1 280px" }}>
          <p style={{ ...muted, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>Trust Command Center</p>
          <h1 style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 700 }}>{title}</h1>
          <p style={{ marginTop: 10, fontSize: 13, color: "#475569", lineHeight: 1.5, maxWidth: 720 }}>{body}</p>
        </div>
        <div style={{ ...cardBorder, minWidth: 140, textAlign: "right" as const }}>
          <p style={{ ...muted, textTransform: "uppercase", margin: 0 }}>Posture</p>
          <p style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 700 }}>
            {typeof score === "number" ? score.toFixed(1) : Number(score).toFixed(1)}
          </p>
          <p style={{ ...muted, marginBottom: 0 }}>{level}</p>
        </div>
      </div>
    </section>
  );
}

export function CommandCardGrid({ cards }: { cards: Record<string, unknown>[] }) {
  if (!cards.length) return null;

  return (
    <section style={gridCards}>
      {cards.map((card, index) => {
        const id = String(card.admin_security_trust_command_center_card_id ?? card.command_card_key ?? index);
        return (
          <article key={id} style={cardBorder}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
              <div>
                <p style={{ ...muted, textTransform: "uppercase", margin: 0 }}>{String(card.card_group ?? "")}</p>
                <h2 style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 700 }}>{String(card.title ?? "")}</h2>
              </div>
              <span style={{ fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 999, padding: "2px 8px" }}>
                {String(card.severity ?? "")}
              </span>
            </div>
            {card.subtitle != null && String(card.subtitle).length > 0 && (
              <p style={{ ...muted, marginTop: 8, fontSize: 13 }}>{String(card.subtitle)}</p>
            )}
            <p style={{ marginTop: 12, fontSize: 22, fontWeight: 700 }}>
              {formatMetric(card.metric_value as number | null | undefined, card.metric_unit as string | undefined)}
            </p>
            {card.body != null && String(card.body).length > 0 && (
              <p style={{ marginTop: 8, fontSize: 13, color: "#475569", lineHeight: 1.45 }}>{String(card.body)}</p>
            )}
            {card.action_label != null && String(card.action_label).length > 0 && (
              <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600 }}>{String(card.action_label)}</p>
            )}
          </article>
        );
      })}
    </section>
  );
}

export function CommandQueueTable({ items }: { items: Record<string, unknown>[] }) {
  return (
    <section style={cardBorder}>
      <h2 style={{ marginTop: 0, fontSize: 17, fontWeight: 700 }}>Command queue</h2>
      {!items.length && <p style={{ ...muted, marginTop: 8 }}>No queue items in this view.</p>}
      {!!items.length && (
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" as const }}>
            <thead>
              <tr style={muted}>
                <th style={{ padding: "8px 4px" }}>Priority</th>
                <th style={{ padding: "8px 4px" }}>Type</th>
                <th style={{ padding: "8px 4px" }}>Item</th>
                <th style={{ padding: "8px 4px" }}>Customer</th>
                <th style={{ padding: "8px 4px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={String(item.admin_security_trust_command_center_queue_item_id ?? item.command_queue_item_key)}
                  style={{ borderTop: "1px solid #e2e8f0" }}
                >
                  <td style={{ padding: "10px 4px" }}>{String(item.queue_priority ?? "")}</td>
                  <td style={{ padding: "10px 4px" }}>{String(item.queue_type ?? "")}</td>
                  <td style={{ padding: "10px 4px" }}>
                    <div style={{ fontWeight: 600 }}>{String(item.title ?? "")}</div>
                    <div style={{ ...muted, fontSize: 11 }}>{String(item.summary ?? "")}</div>
                  </td>
                  <td style={{ padding: "10px 4px" }}>{item.customer_name != null ? String(item.customer_name) : "—"}</td>
                  <td style={{ padding: "10px 4px" }}>{String(item.status ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function CommandTimeline({ items }: { items: Record<string, unknown>[] }) {
  return (
    <section style={cardBorder}>
      <h2 style={{ marginTop: 0, fontSize: 17, fontWeight: 700 }}>Operational timeline</h2>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
        {!items.length && <p style={{ ...muted }}>No visible timeline events.</p>}
        {items.map((item) => (
          <article
            key={String(item.admin_security_trust_command_center_timeline_id ?? item.command_timeline_key)}
            style={{ borderLeft: "3px solid #cbd5e1", paddingLeft: 12 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{String(item.title ?? "")}</p>
              <span style={{ ...muted, fontSize: 11, whiteSpace: "nowrap" }}>{String(item.severity ?? "")}</span>
            </div>
            {item.summary != null && String(item.summary).length > 0 && (
              <p style={{ ...muted, margin: "6px 0 0", fontSize: 12 }}>{String(item.summary)}</p>
            )}
            <p style={{ ...muted, margin: "6px 0 0", fontSize: 11 }}>
              {String(item.event_group ?? "")} · {String(item.occurred_at ?? "")}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatMetric(value: number | null | undefined, unit?: string) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  if (unit === "cents") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) / 100);
  }
  if (unit === "score") return Number(value).toFixed(1);
  return Number(value).toLocaleString();
}
