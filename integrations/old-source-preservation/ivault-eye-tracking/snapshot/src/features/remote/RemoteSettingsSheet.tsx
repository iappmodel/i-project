import type { ReactNode } from "react";
import { useRemote } from "./useRemote";
import type { RemotePreferences } from "./types";

export function RemoteSettingsSheet() {
  const {
    remoteState,
    preferences,
    updatePreferences,
    closeRemote,
    setRemoteMode,
    emergencyStop,
  } = useRemote();

  if (remoteState.mode !== "settings") {
    return null;
  }

  function patch(update: Partial<RemotePreferences>) {
    updatePreferences(update);
  }

  return (
    <div className="i-remote-settings">
      <div className="i-remote-settings__scrim" onClick={closeRemote} />

      <section className="i-remote-settings__sheet" aria-label="iRemote Settings">
        <header className="i-remote-settings__header">
          <div>
            <div className="i-remote-settings__eyebrow">iRemote</div>
            <h2>Remote Settings</h2>
            <p>Control how the remote behaves across the app.</p>
          </div>

          <button type="button" className="i-remote-settings__close" onClick={closeRemote}>
            ×
          </button>
        </header>

        <div className="i-remote-settings__body">
          <SettingsGroup title="Appearance">
            <SegmentedControl
              label="Size"
              value={preferences.size}
              options={[
                { label: "Small", value: "small" },
                { label: "Medium", value: "medium" },
                { label: "Large", value: "large" },
              ]}
              onChange={(value) => patch({ size: value as RemotePreferences["size"] })}
            />

            <RangeControl
              label="Opacity"
              value={preferences.opacity}
              min={0.42}
              max={1}
              step={0.02}
              formatter={(value) => `${Math.round(value * 100)}%`}
              onChange={(value) => patch({ opacity: value })}
            />

            <ToggleRow
              label="Left-handed mode"
              description="Bias panels and controls toward the left side."
              checked={preferences.leftHanded}
              onChange={(checked) => patch({ leftHanded: checked })}
            />
          </SettingsGroup>

          <SettingsGroup title="Interaction">
            <ToggleRow
              label="Haptic feedback"
              description="Use subtle vibration on supported devices."
              checked={preferences.hapticsEnabled}
              onChange={(checked) => patch({ hapticsEnabled: checked })}
            />

            <ToggleRow
              label="Reduced motion"
              description="Minimize spring movement and animated transitions."
              checked={preferences.reducedMotion}
              onChange={(checked) => patch({ reducedMotion: checked })}
            />

            <ToggleRow
              label="Strict confirmations"
              description="Require confirmation more often for money, campaign, and connector actions."
              checked={preferences.strictConfirmations}
              onChange={(checked) => patch({ strictConfirmations: checked })}
            />
          </SettingsGroup>

          <SettingsGroup title="Future Inputs">
            <ToggleRow
              label="Voice control"
              description="Allow voice-triggered remote commands. High-risk commands still require confirmation."
              checked={preferences.voiceEnabled}
              onChange={(checked) => patch({ voiceEnabled: checked })}
            />

            <ToggleRow
              label="Gaze control"
              description="Allow gaze-assisted highlighting and low-risk control. Money actions remain blocked."
              checked={preferences.gazeEnabled}
              onChange={(checked) => patch({ gazeEnabled: checked })}
            />
          </SettingsGroup>

          <SettingsGroup title="Safety">
            <div className="i-remote-settings__safety-grid">
              <button type="button" onClick={() => setRemoteMode("quick")}>
                Back to Quick Panel
              </button>
              <button type="button" onClick={() => setRemoteMode("command_center")}>
                Command Center
              </button>
              <button type="button" className="danger" onClick={emergencyStop}>
                Emergency Stop
              </button>
            </div>
          </SettingsGroup>
        </div>
      </section>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="i-remote-settings__group">
      <div className="i-remote-settings__group-title">{title}</div>
      <div className="i-remote-settings__group-body">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="i-remote-toggle-row">
      <div>
        <strong>{label}</strong>
        <span>{description}</span>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />

      <i />
    </label>
  );
}

function SegmentedControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="i-remote-segment">
      <div className="i-remote-segment__label">{label}</div>

      <div className="i-remote-segment__options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === value ? "active" : ""}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  formatter,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatter: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="i-remote-range">
      <div className="i-remote-range__top">
        <span>{label}</span>
        <strong>{formatter(value)}</strong>
      </div>

      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
