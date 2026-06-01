import { useCallback, useEffect, useState } from 'react'
import { GestureComboBuilderSheet } from './GestureComboBuilderSheet'
import { COMBO_ACTION_LABELS } from '../hooks/useGestureCombos'
import {
  DEFAULT_GESTURE_COMBOS,
  addGestureComboPreset,
  describeComboSteps,
  exportGestureCombosJson,
  importGestureCombosJson,
  loadGestureCombos,
  removeGestureCombo,
  resetGestureCombos,
  toggleGestureCombo,
  type GestureComboRecord,
} from '../lib/gestureComboStore'
import {
  loadRemoteControlSettings,
  saveRemoteControlSettings,
  type RemoteControlProfile,
  type RemoteControlSettings,
} from '../lib/remoteControlSettings'
import { isWebVisionEnabled } from '../lib/visionEngine'

type TabId = 'debug' | 'combos' | 'settings'

const PROFILE_OPTIONS: RemoteControlProfile[] = ['adaptive', 'precision', 'speed']

const PROFILE_PRESETS: Record<
  RemoteControlProfile,
  Pick<RemoteControlSettings, 'gazeReach' | 'gazeHoldTime' | 'blinkPatternTimeout'>
> = {
  adaptive: { gazeReach: 1.6, gazeHoldTime: 800, blinkPatternTimeout: 600 },
  precision: { gazeReach: 1.25, gazeHoldTime: 1100, blinkPatternTimeout: 750 },
  speed: { gazeReach: 2.0, gazeHoldTime: 550, blinkPatternTimeout: 480 },
}

/** Dependency-safe blink remote panel — combos, debug gaze, runtime profile. */
export function VisionBlinkRemoteLite() {
  const enabled = isWebVisionEnabled()
  const [tab, setTab] = useState<TabId>('combos')
  const [gaze, setGaze] = useState<{ x: number; y: number } | null>(null)
  const [lastGesture, setLastGesture] = useState<string | null>(null)
  const [combos, setCombos] = useState<GestureComboRecord[]>(() => loadGestureCombos())
  const [settings, setSettings] = useState(() => loadRemoteControlSettings())
  const [eventLog, setEventLog] = useState<string[]>([])
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingCombo, setEditingCombo] = useState<GestureComboRecord | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  const pushLog = useCallback((line: string) => {
    setEventLog((prev) => [line, ...prev].slice(0, 8))
  }, [])

  useEffect(() => {
    if (!enabled) return
    const syncCombos = () => setCombos(loadGestureCombos())
    const syncSettings = () => setSettings(loadRemoteControlSettings())
    window.addEventListener('gestureCombosChanged', syncCombos)
    window.addEventListener('remoteControlSettingsChanged', syncSettings)
    return () => {
      window.removeEventListener('gestureCombosChanged', syncCombos)
      window.removeEventListener('remoteControlSettingsChanged', syncSettings)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const gazeHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ x?: number; y?: number }>).detail
      if (typeof detail?.x === 'number' && typeof detail?.y === 'number') {
        setGaze({ x: detail.x, y: detail.y })
      }
    }
    const gestureHandler = (e: Event) => {
      const trigger = (e as CustomEvent<{ trigger?: string }>).detail?.trigger
      if (trigger) {
        setLastGesture(trigger)
        pushLog(`gesture · ${trigger}`)
      }
    }
    const blinkHandler = (e: Event) => {
      const count = (e as CustomEvent<{ count?: number }>).detail?.count
      if (count) pushLog(`blink pattern · ${count}`)
    }
    const comboHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ name?: string; action?: string }>).detail
      if (detail?.name) pushLog(`combo ✓ ${detail.name}`)
    }
    window.addEventListener('remoteGazePosition', gazeHandler)
    window.addEventListener('remoteGestureTrigger', gestureHandler)
    window.addEventListener('remoteBlinkPattern', blinkHandler)
    window.addEventListener('gestureComboExecuted', comboHandler)
    return () => {
      window.removeEventListener('remoteGazePosition', gazeHandler)
      window.removeEventListener('remoteGestureTrigger', gestureHandler)
      window.removeEventListener('remoteBlinkPattern', blinkHandler)
      window.removeEventListener('gestureComboExecuted', comboHandler)
    }
  }, [enabled, pushLog])

  if (!enabled) return null

  const saveProfile = (controlProfile: RemoteControlProfile) => {
    const next = {
      ...settings,
      ...PROFILE_PRESETS[controlProfile],
      controlProfile,
      enabled: true,
    }
    setSettings(next)
    saveRemoteControlSettings(next)
  }

  return (
    <section className="profile-section vision-blink-remote">
      <h2 className="profile-section__title">Blink remote panel</h2>
      <p className="profile-trust-card__hint" style={{ marginBottom: 10 }}>
        Combos, debug stream, and control profile — archive Tobii/voice UI still deferred.
      </p>

      <div className="vision-blink-remote__tabs" role="tablist">
        {(['combos', 'debug', 'settings'] as TabId[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`vision-blink-remote__tab${tab === id ? ' vision-blink-remote__tab--active' : ''}`}
            onClick={() => setTab(id)}
          >
            {id}
          </button>
        ))}
      </div>

      {tab === 'combos' ? (
        <div className="vision-blink-remote__panel" role="tabpanel">
          <div className="vision-blink-remote__toolbar">
            <button
              type="button"
              className="ds-btn ds-btn--primary"
              onClick={() => {
                setEditingCombo(null)
                setBuilderOpen(true)
              }}
            >
              Create combo
            </button>
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              onClick={() => {
                const preset = DEFAULT_GESTURE_COMBOS.find(
                  (d) => !combos.some((c) => c.name === d.name),
                )
                if (preset) setCombos(addGestureComboPreset(preset))
              }}
            >
              Add preset
            </button>
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(exportGestureCombosJson())
                  pushLog('exported combos JSON')
                } catch {
                  pushLog('export failed — copy from import panel')
                  setImportText(exportGestureCombosJson())
                  setImportOpen(true)
                }
              }}
            >
              Export
            </button>
            <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setImportOpen((v) => !v)}>
              Import
            </button>
            <button
              type="button"
              className="ds-btn ds-btn--ghost"
              onClick={() => setCombos(resetGestureCombos())}
            >
              Reset
            </button>
          </div>

          {importOpen ? (
            <div className="combo-builder-import">
              <textarea
                className="combo-builder-import__area mono"
                rows={4}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste combo JSON array…"
              />
              {importError ? <p className="combo-builder-error mono">{importError}</p> : null}
              <button
                type="button"
                className="ds-btn ds-btn--secondary"
                onClick={() => {
                  try {
                    setCombos(importGestureCombosJson(importText))
                    setImportError(null)
                    setImportOpen(false)
                    pushLog('imported combos')
                  } catch (err) {
                    setImportError(err instanceof Error ? err.message : 'Import failed')
                  }
                }}
              >
                Apply import
              </button>
            </div>
          ) : null}

          <ul className="vision-blink-remote__combo-list">
            {combos.map((combo) => (
              <li key={combo.id} className="vision-blink-remote__combo">
                <label className="vision-blink-remote__combo-head">
                  <input
                    type="checkbox"
                    checked={combo.enabled}
                    onChange={(e) => setCombos(toggleGestureCombo(combo.id, e.target.checked))}
                  />
                  <span className="vision-blink-remote__combo-name">{combo.name}</span>
                </label>
                <p className="vision-blink-remote__combo-steps mono">
                  {describeComboSteps(combo.steps)} → {COMBO_ACTION_LABELS[combo.action]}
                </p>
                <button
                  type="button"
                  className="vision-blink-remote__combo-edit"
                  onClick={() => {
                    setEditingCombo(combo)
                    setBuilderOpen(true)
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="vision-blink-remote__combo-remove"
                  onClick={() => setCombos(removeGestureCombo(combo.id))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === 'debug' ? (
        <div className="vision-blink-remote__panel mono" role="tabpanel" style={{ fontSize: 11 }}>
          <p>Profile: {settings.controlProfile ?? 'adaptive'}</p>
          <p>
            Gaze:{' '}
            {gaze ? `${Math.round(gaze.x)}×${Math.round(gaze.y)} px` : 'waiting for remoteGazePosition…'}
          </p>
          <p>Last gesture: {lastGesture ?? '—'}</p>
          <div className="vision-blink-remote__log">
            {eventLog.length === 0 ? (
              <p className="profile-trust-card__hint">Event log empty — enable vision on Earn/Watch.</p>
            ) : (
              eventLog.map((line) => <p key={line}>{line}</p>)
            )}
          </div>
        </div>
      ) : null}

      {tab === 'settings' ? (
        <div className="vision-blink-remote__panel" role="tabpanel">
          <p className="profile-trust-card__hint">Control profile (maps to gaze reach + dwell presets)</p>
          <div className="vision-blink-remote__profile-row">
            {PROFILE_OPTIONS.map((profile) => (
              <button
                key={profile}
                type="button"
                className={`ds-btn ${settings.controlProfile === profile ? 'ds-btn--primary' : 'ds-btn--secondary'}`}
                onClick={() => saveProfile(profile)}
              >
                {profile}
              </button>
            ))}
          </div>
          <p className="profile-trust-card__hint mono" style={{ marginTop: 10, fontSize: 11 }}>
            Reach {settings.gazeReach.toFixed(2)} · dwell {settings.gazeHoldTime}ms · pattern{' '}
            {settings.blinkPatternTimeout}ms
          </p>
          <p className="profile-trust-card__hint" style={{ marginTop: 8 }}>
            Full tuning lives in Web vision tuning above. Tobii WebSocket and voice calibration deferred.
          </p>
        </div>
      ) : null}

      <GestureComboBuilderSheet
        open={builderOpen}
        editCombo={editingCombo}
        onClose={() => {
          setBuilderOpen(false)
          setEditingCombo(null)
        }}
        onSaved={() => setCombos(loadGestureCombos())}
      />
    </section>
  )
}
