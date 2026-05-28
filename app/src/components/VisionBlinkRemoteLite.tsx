import { useEffect, useState } from 'react'
import { isWebVisionEnabled } from '../lib/visionEngine'
import { loadRemoteControlSettings } from '../lib/remoteControlSettings'

/** Debug gaze panel — listens for remoteGazePosition without full BlinkRemoteControl UI. */
export function VisionBlinkRemoteLite() {
  const enabled = isWebVisionEnabled()
  const [gaze, setGaze] = useState<{ x: number; y: number } | null>(null)
  const [expanded, setExpanded] = useState(false)
  const settings = loadRemoteControlSettings()

  useEffect(() => {
    if (!enabled) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ x?: number; y?: number }>).detail
      if (typeof detail?.x === 'number' && typeof detail?.y === 'number') {
        setGaze({ x: detail.x, y: detail.y })
      }
    }
    window.addEventListener('remoteGazePosition', handler)
    return () => window.removeEventListener('remoteGazePosition', handler)
  }, [enabled])

  if (!enabled) return null

  return (
    <section className="profile-section">
      <h2 className="profile-section__title">Blink remote (lite)</h2>
      <p className="profile-trust-card__hint" style={{ marginBottom: 8 }}>
        Debug gaze stream and runtime profile — full archive panel still deferred.
      </p>
      <button
        type="button"
        className="ds-btn ds-btn--secondary"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Hide debug' : 'Show debug gaze'}
      </button>
      {expanded ? (
        <div style={{ marginTop: 10, fontSize: 11 }} className="mono profile-trust-card__hint">
          <p>Profile: {settings.controlProfile ?? 'adaptive'}</p>
          <p>Gaze reach: {settings.gazeReach.toFixed(2)} · dwell: {settings.gazeHoldTime}ms</p>
          <p>
            Gaze:{' '}
            {gaze
              ? `${Math.round(gaze.x)}×${Math.round(gaze.y)} px`
              : 'waiting for remoteGazePosition…'}
          </p>
        </div>
      ) : null}
    </section>
  )
}
