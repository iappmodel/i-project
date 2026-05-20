import type { StudioController } from "../studioStore";

export function StudioDisclosurePanel({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { actions } = studio;

  if (!project.disclosures.length) {
    return (
      <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: 0 }}>
        No disclosures yet. Run validation or change publish target / monetization to generate required rows.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {project.disclosures.map((d) => (
        <div key={d.id} className="ist-panel" style={{ padding: 8, borderColor: "rgba(148,163,184,0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{d.label}</span>
            <span className="ist-chip ist-chip--muted ist-mono" style={{ fontSize: 9 }}>
              {d.type}
            </span>
          </div>
          <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", margin: "6px 0 8px" }}>
            {d.message}
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 6 }}>
            <input type="checkbox" checked={d.required} disabled />
            Required (locked)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={d.visibleToViewer}
              disabled={d.required}
              onChange={(e) => actions.updateDisclosure(d.id, { visibleToViewer: e.target.checked })}
            />
            Visible to viewer
          </label>
          {d.required && !d.requirementAccepted ? (
            <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10, marginTop: 4 }} onClick={() => actions.acceptDisclosureRequirement(d.id)}>
              Acknowledge requirement (demo)
            </button>
          ) : null}
          <div className="ist-chip ist-chip--ok ist-mono" style={{ fontSize: 9, marginTop: 8, display: "inline-block" }}>
            Preview: {d.label}
          </div>
        </div>
      ))}
    </div>
  );
}
