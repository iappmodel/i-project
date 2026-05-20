import type { CSSProperties } from "react";

const sectionStyle: CSSProperties = {
  border: "1px solid #dbe3ea",
  borderRadius: 12,
  padding: 20,
  background: "#fff"
};

const listStyle: CSSProperties = {
  marginTop: 20,
  display: "flex",
  flexDirection: "column",
  gap: 12
};

const cardStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 16
};

export function ProofRecentActivityFeed({ items }: { items: Record<string, unknown>[] }) {
  return (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Recent proof activity</h2>

      <div style={listStyle}>
        {items.map((item) => (
          <article
            key={`${String(item.activity_type)}-${String(item.activity_key)}`}
            style={cardStyle}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>
                  {String(item.activity_type)} · {String(item.activity_subtype ?? "")}
                </p>
                <h3 style={{ margin: "6px 0 0", fontSize: 16, fontWeight: 600 }}>{String(item.title ?? "")}</h3>
                {item.summary != null && String(item.summary).length > 0 ? (
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b" }}>{String(item.summary)}</p>
                ) : null}
              </div>

              <span
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 11,
                  height: "fit-content"
                }}
              >
                {String(item.severity ?? "")}
              </span>
            </div>

            <p style={{ margin: "12px 0 0", fontSize: 12, color: "#94a3b8" }}>{String(item.activity_time ?? "")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
