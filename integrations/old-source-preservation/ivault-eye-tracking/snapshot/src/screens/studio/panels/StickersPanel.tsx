import type { StudioController } from "../studioStore";

export function StickersPanel({ studio }: { studio: StudioController }) {
  const { actions } = studio;

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Stickers</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <button
            key={i}
            type="button"
            className="ist-btn ist-btn--ghost"
            style={{ aspectRatio: "1", padding: 0, fontSize: 18 }}
            onClick={() => actions.logEvent("studio.sticker.added_mock", { index: i })}
          >
            ◆
          </button>
        ))}
      </div>
      <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", marginTop: 12 }}>
        Sticker assets are mocked — no CDN.
      </p>
    </div>
  );
}
