import { useState } from "react";
import type { StudioController } from "../studioStore";

export function CaptionsPanel({ studio }: { studio: StudioController }) {
  const { actions } = studio;
  const [lang, setLang] = useState("en-US");

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Captions</h3>
      <button type="button" className="ist-btn ist-btn--primary" style={{ marginBottom: 12 }} onClick={() => actions.logEvent("studio.captions.generate_mock", { lang })}>
        Generate captions
      </button>
      <div className="ist-field">
        <label className="ist-label">Language</label>
        <select className="ist-select" value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="en-US">English (US)</option>
          <option value="es-MX">Spanish (MX)</option>
          <option value="pt-BR">Portuguese (BR)</option>
        </select>
      </div>
      <div className="ist-label">Style</div>
      <div className="ist-tabs">
        {["Minimal", "Bold", "Safe area"].map((s) => (
          <button key={s} type="button" className="ist-tab" onClick={() => actions.logEvent("studio.captions.style_mock", { style: s })}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
