import { useMemo, useState } from "react";
import { STUDIO_PRODUCTION_CHECKLIST, type ChecklistStatus } from "../../backend/studioProductionChecklist";

type Filter = "all" | "blocking" | "scaffolded" | "not_started";

export function ProductionChecklistPanel() {
  const [filter, setFilter] = useState<Filter>("all");
  const items = useMemo(() => {
    if (filter === "blocking") return STUDIO_PRODUCTION_CHECKLIST.filter((i) => i.blockingForProduction);
    if (filter === "scaffolded") return STUDIO_PRODUCTION_CHECKLIST.filter((i) => i.status === "scaffolded");
    if (filter === "not_started") return STUDIO_PRODUCTION_CHECKLIST.filter((i) => i.status === "not_started");
    return STUDIO_PRODUCTION_CHECKLIST;
  }, [filter]);

  const scaffolded = STUDIO_PRODUCTION_CHECKLIST.filter((i) => i.status === "scaffolded").length;
  const blockingLeft = STUDIO_PRODUCTION_CHECKLIST.filter((i) => i.blockingForProduction && i.status !== "verified" && i.status !== "implemented").length;
  const pct = Math.round((scaffolded / Math.max(STUDIO_PRODUCTION_CHECKLIST.length, 1)) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 10 }} className="ist-mono">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ color: "var(--ist-muted)" }}>Filter:</span>
        {(["all", "blocking", "scaffolded", "not_started"] as const).map((f) => (
          <button key={f} type="button" className={`ist-btn ist-btn--ghost${filter === f ? " ist-btn--active" : ""}`} style={{ fontSize: 9, padding: "2px 8px" }} onClick={() => setFilter(f)}>
            {f.replaceAll("_", " ")}
          </button>
        ))}
      </div>
      <div style={{ color: "var(--ist-muted)" }}>
        Scaffolded: {scaffolded} · Blocking remaining (non-verified): {blockingLeft} · Mock readiness % (scaffolded/total): {pct}%
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((i) => (
          <div key={i.id} style={{ padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{i.label}</span>
              <span style={{ color: "var(--ist-muted)" }}>{i.status as ChecklistStatus}</span>
            </div>
            <div style={{ color: "var(--ist-muted)", marginTop: 4 }}>{i.category}</div>
            {i.blockingForProduction ? <div style={{ color: "#fca5a5", marginTop: 4 }}>Blocking for production</div> : null}
            {i.notes ? <div style={{ marginTop: 4 }}>{i.notes}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
