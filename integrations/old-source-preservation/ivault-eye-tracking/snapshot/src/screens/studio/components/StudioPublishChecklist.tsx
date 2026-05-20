import type { PublishCheck, PublishCheckCategory } from "../publish/studioPublishTypes";

const CAT_ORDER: PublishCheckCategory[] = [
  "media",
  "safety",
  "rights",
  "magic",
  "wallet",
  "age",
  "disclosure",
  "export",
];

function statusColor(status: PublishCheck["status"], blocking: boolean): string {
  if (status === "passed") return "#34d399";
  if (status === "warning") return "#fbbf24";
  if (status === "pending") return "var(--ist-muted)";
  if (status === "failed" || status === "blocked" || blocking) return "#f87171";
  return "var(--ist-muted)";
}

function statusIcon(status: PublishCheck["status"]): string {
  if (status === "passed") return "✓";
  if (status === "warning") return "!";
  if (status === "pending") return "…";
  if (status === "failed" || status === "blocked") return "✕";
  return "·";
}

export function StudioPublishChecklist({ checks }: { checks: PublishCheck[] }) {
  const blocking = checks.some((c) => c.blocking && (c.status === "failed" || c.status === "blocked"));
  const hasWarnings = checks.some((c) => c.status === "warning");
  const byCat = new Map<PublishCheckCategory, PublishCheck[]>();
  for (const c of checks) {
    const arr = byCat.get(c.category) ?? [];
    arr.push(c);
    byCat.set(c.category, arr);
  }

  return (
    <div>
      {blocking ? (
        <p className="ist-mono" style={{ fontSize: 11, color: "#fecaca", margin: "0 0 10px" }}>
          Publishing blocked. Resolve blocking checks first.
        </p>
      ) : hasWarnings ? (
        <p className="ist-mono" style={{ fontSize: 11, color: "#fde68a", margin: "0 0 10px" }}>
          Publish allowed with warnings.
        </p>
      ) : checks.length > 0 ? (
        <p className="ist-mono" style={{ fontSize: 11, color: "#a7f3d0", margin: "0 0 10px" }}>
          No blocking issues from the last validation run.
        </p>
      ) : (
        <p className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)", margin: "0 0 10px" }}>
          Run “Validate publish” to populate the checklist.
        </p>
      )}

      {CAT_ORDER.map((cat) => {
        const list = byCat.get(cat);
        if (!list?.length) return null;
        return (
          <div key={cat} style={{ marginBottom: 10 }}>
            <div className="ist-display" style={{ fontSize: 11, fontWeight: 800, marginBottom: 6, textTransform: "capitalize" }}>
              {cat.replace(/_/g, " ")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {list.map((c) => (
                <div
                  key={c.id}
                  className="ist-panel"
                  style={{
                    padding: "6px 8px",
                    borderColor: "rgba(255,255,255,0.08)",
                    display: "grid",
                    gridTemplateColumns: "18px 1fr",
                    gap: 8,
                    alignItems: "start",
                  }}
                >
                  <span className="ist-mono" style={{ fontSize: 12, color: statusColor(c.status, c.blocking), fontWeight: 800 }}>
                    {statusIcon(c.status)}
                  </span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{c.label}</div>
                    <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", marginTop: 2 }}>
                      {c.description}
                    </div>
                    {c.reason ? (
                      <div className="ist-mono" style={{ fontSize: 9, color: "#fecaca", marginTop: 4 }}>
                        {c.reason}
                      </div>
                    ) : null}
                    {c.fixAction ? (
                      <div className="ist-mono" style={{ fontSize: 9, color: "#fde68a", marginTop: 2 }}>
                        Fix: {c.fixAction}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
