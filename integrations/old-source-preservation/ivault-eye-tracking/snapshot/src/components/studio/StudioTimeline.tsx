import React from "react";
import type { StudioTimeline as STimeline, StudioEditPlan } from "../../lib/studio/studio.types";

type Props = {
  timeline: STimeline;
  selectedEditPlan?: StudioEditPlan | null;
};

const StudioTimeline: React.FC<Props> = ({ timeline, selectedEditPlan }) => {
  return (
    <div style={{ width: "100%", background: "rgba(255,255,255,0.01)", padding: 8, borderRadius: 8 }}>
      <div style={{ fontSize: 12, color: "#9fb4d8", marginBottom: 6 }}>Timeline — {timeline.durationSeconds}s</div>
      <div style={{ display: "flex", gap: 8 }}>
        {timeline.layers.map((layer) => (
          <div key={layer.id} style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#9aa4b2" }}>{layer.name}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {layer.items.map((it) => (
                <div
                  key={it.id}
                  title={it.label}
                  style={{ background: "linear-gradient(90deg,#1f2937,#0b1220)", padding: "6px 8px", borderRadius: 6, color: "#e6eef8", minWidth: 80 }}
                >
                  {it.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Auto-cut plan preview row */}
      {selectedEditPlan ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: "#5ebcff", marginBottom: 4 }}>Plan preview — {selectedEditPlan.title}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {selectedEditPlan.clips.map((pc) => (
              <div
                key={pc.id}
                title={`${pc.title} · ${pc.durationSeconds.toFixed(1)}s · score ${pc.score}`}
                style={{
                  background: "rgba(94,188,255,0.08)",
                  border: "1px solid rgba(94,188,255,0.15)",
                  padding: "4px 8px",
                  borderRadius: 6,
                  color: "#5ebcff",
                  fontSize: 11,
                  minWidth: 60,
                }}
              >
                {pc.title.slice(0, 10)} · {pc.durationSeconds.toFixed(1)}s
              </div>
            ))}
          </div>
          <div style={{ marginTop: 4, fontSize: 10, color: "#748099", fontStyle: "italic" }}>
            Mock plan preview only — no media reordered.
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StudioTimeline;
