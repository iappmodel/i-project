import { useEffect, useState } from 'react'
import { Button } from './Button'
import {
  loadRemoteControlSettings,
  saveRemoteControlSettings,
  type RemoteControlSettings,
  type VisionBackend,
} from '../lib/remoteControlSettings'

type Props = {
  className?: string
}

export function VisionRemoteSettingsCard({ className }: Props) {
  const [settings, setSettings] = useState<RemoteControlSettings>(() => loadRemoteControlSettings())
  const [savedHint, setSavedHint] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setSettings(loadRemoteControlSettings())
    window.addEventListener('remoteControlSettingsChanged', sync)
    return () => window.removeEventListener('remoteControlSettingsChanged', sync)
  }, [])

  const patch = (partial: Partial<RemoteControlSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
  }

  const apply = () => {
    saveRemoteControlSettings(settings)
    setSavedHint('Saved — vision runtime will refresh.')
    window.setTimeout(() => setSavedHint(null), 2500)
  }

  const reset = () => {
    localStorage.removeItem('app_remote_control_settings')
    const fresh = loadRemoteControlSettings()
    setSettings(fresh)
    saveRemoteControlSettings(fresh)
    setSavedHint('Reset to device defaults.')
    window.setTimeout(() => setSavedHint(null), 2500)
  }

  return (
    <section className={className ?? 'profile-section'}>
      <h2 className="profile-section__title">Web vision tuning</h2>
      <p className="profile-trust-card__hint" style={{ marginBottom: 12 }}>
        Operator controls for gaze mirror, dwell time, and backend. Full calibration wizard still deferred.
      </p>

      <label className="profile-trust-card__row" style={{ marginBottom: 8 }}>
        <span className="profile-trust-card__label">Mirror X</span>
        <input
          type="checkbox"
          checked={settings.mirrorX}
          onChange={(e) => patch({ mirrorX: e.target.checked })}
        />
      </label>

      <label className="profile-trust-card__row" style={{ marginBottom: 8 }}>
        <span className="profile-trust-card__label">Invert Y</span>
        <input
          type="checkbox"
          checked={settings.invertY}
          onChange={(e) => patch({ invertY: e.target.checked })}
        />
      </label>

      <label className="profile-trust-card__hint" style={{ display: 'block', marginBottom: 4 }}>
        Gaze reach ({settings.gazeReach.toFixed(2)})
      </label>
      <input
        type="range"
        min={0.8}
        max={2.5}
        step={0.05}
        value={settings.gazeReach}
        onChange={(e) => patch({ gazeReach: Number(e.target.value) })}
        style={{ width: '100%', marginBottom: 12 }}
      />

      <label className="profile-trust-card__hint" style={{ display: 'block', marginBottom: 4 }}>
        Gaze hold / dwell ({settings.gazeHoldTime} ms)
      </label>
      <input
        type="range"
        min={600}
        max={3500}
        step={50}
        value={settings.gazeHoldTime}
        onChange={(e) => patch({ gazeHoldTime: Number(e.target.value) })}
        style={{ width: '100%', marginBottom: 12 }}
      />

      <label className="profile-trust-card__hint" style={{ display: 'block', marginBottom: 4 }}>
        Blink pattern timeout ({settings.blinkPatternTimeout} ms)
      </label>
      <input
        type="range"
        min={300}
        max={1200}
        step={50}
        value={settings.blinkPatternTimeout}
        onChange={(e) => patch({ blinkPatternTimeout: Number(e.target.value) })}
        style={{ width: '100%', marginBottom: 12 }}
      />

      <label className="profile-trust-card__hint" style={{ display: 'block', marginBottom: 4 }}>
        Vision backend
      </label>
      <select
        value={settings.visionBackend ?? 'face_landmarker'}
        onChange={(e) => patch({ visionBackend: e.target.value as VisionBackend })}
        style={{ width: '100%', marginBottom: 12 }}
      >
        <option value="face_landmarker">face_landmarker</option>
        <option value="face_mesh">face_mesh</option>
      </select>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button onClick={apply}>Save tuning</Button>
        <Button variant="secondary" onClick={reset}>
          Reset defaults
        </Button>
      </div>

      {savedHint ? (
        <p className="profile-trust-card__hint mono" style={{ marginTop: 8, fontSize: 11 }}>
          {savedHint}
        </p>
      ) : null}
    </section>
  )
}
