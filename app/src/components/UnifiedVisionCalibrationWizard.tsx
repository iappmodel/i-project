import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from './Button'
import {
  buildVisionCalibration,
  getCalibrationCapturePreset,
  type GazeSample,
  type GestureChecks,
} from '../lib/visionCalibration/calibrationFit'
import { setCalibrationMode } from '../lib/visionCalibration/calibrationEvents'
import {
  loadVisionCalibration,
  saveVisionCalibration,
  type VisionCalibrationProfile,
} from '../lib/visionCalibration/profile'
import '../styles/vision-calibration-wizard.css'

type StepId = 'ready' | 'track' | 'verify'

const STEPS: StepId[] = ['ready', 'track', 'verify']
const MIN_GAZE_SAMPLES = 3
const READY_LIVENESS_MIN = 0.25
const READY_JITTER_MAX = 0.05

const GAZE_POINTS = [
  { x: 0.5, y: 0.5, label: 'Center' },
  { x: 0.16, y: 0.18, label: 'Top Left' },
  { x: 0.84, y: 0.18, label: 'Top Right' },
  { x: 0.2, y: 0.82, label: 'Bottom Left' },
  { x: 0.8, y: 0.82, label: 'Bottom Right' },
]

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

type Props = {
  isOpen: boolean
  onClose: () => void
  rawGazePosition: { x: number; y: number } | null
  hasFace: boolean
  livenessScore: number
  livenessStable: boolean
  calibration?: VisionCalibrationProfile
  onSave?: (next: VisionCalibrationProfile) => void
}

export function UnifiedVisionCalibrationWizard({
  isOpen,
  onClose,
  rawGazePosition,
  hasFace,
  livenessScore,
  livenessStable,
  calibration: calibrationProp,
  onSave,
}: Props) {
  const [step, setStep] = useState<StepId>('ready')
  const [calibration, setCalibration] = useState<VisionCalibrationProfile>(
    () => calibrationProp ?? loadVisionCalibration(),
  )
  const [samples, setSamples] = useState<GazeSample[]>([])
  const [gestures, setGestures] = useState<GestureChecks>({
    singleBlink: false,
    handPinch: false,
    doubleBlink: false,
    headNod: false,
  })
  const [holdProgress, setHoldProgress] = useState(0)
  const [activeDistance, setActiveDistance] = useState<number | null>(null)
  const [gazeSpread, setGazeSpread] = useState(1)

  const holdStartRef = useRef<number | null>(null)
  const holdBufferRef = useRef<Array<{ x: number; y: number; t: number }>>([])
  const captureCooldownUntilRef = useRef(0)
  const stabilityHistoryRef = useRef<Array<{ x: number; y: number; t: number }>>([])

  const activePoint = step === 'track' ? GAZE_POINTS[samples.length] : undefined
  const gestureDoneCount = [gestures.singleBlink, gestures.handPinch, gestures.doubleBlink, gestures.headNod].filter(
    Boolean,
  ).length
  const hasLivenessReadiness = livenessStable || livenessScore >= READY_LIVENESS_MIN
  const hasSteadyCamera = hasFace && gazeSpread <= READY_JITTER_MAX
  const canStartTracking = hasFace && hasLivenessReadiness && hasSteadyCamera
  const canSave = samples.length >= MIN_GAZE_SAMPLES && gestures.singleBlink && gestures.handPinch

  const { holdMs, cooldownMs, targetRadius } = useMemo(
    () => getCalibrationCapturePreset(calibration.deviceClass),
    [calibration.deviceClass],
  )

  const preview = useMemo(
    () => buildVisionCalibration(calibration, samples, gestures),
    [calibration, gestures, samples],
  )

  useEffect(() => {
    if (!isOpen) return
    setCalibrationMode(true)
    setStep('ready')
    setSamples([])
    setGestures({ singleBlink: false, handPinch: false, doubleBlink: false, headNod: false })
    setHoldProgress(0)
    setActiveDistance(null)
    setGazeSpread(1)
    holdStartRef.current = null
    holdBufferRef.current = []
    captureCooldownUntilRef.current = 0
    stabilityHistoryRef.current = []
    setCalibration(calibrationProp ?? loadVisionCalibration())
    return () => setCalibrationMode(false)
  }, [isOpen, calibrationProp])

  useEffect(() => {
    if (!isOpen || !rawGazePosition) return
    const now = performance.now()
    const next = {
      x: clamp01(rawGazePosition.x),
      y: clamp01(rawGazePosition.y),
      t: now,
    }
    stabilityHistoryRef.current = [...stabilityHistoryRef.current, next]
      .filter((entry) => now - entry.t < 1000)
      .slice(-16)

    const history = stabilityHistoryRef.current
    if (history.length < 4) {
      setGazeSpread(1)
      return
    }

    const centerX = history.reduce((acc, entry) => acc + entry.x, 0) / history.length
    const centerY = history.reduce((acc, entry) => acc + entry.y, 0) / history.length
    const spread =
      history.reduce((acc, entry) => acc + Math.hypot(entry.x - centerX, entry.y - centerY), 0) / history.length
    setGazeSpread(spread)
  }, [isOpen, rawGazePosition])

  useEffect(() => {
    if (!isOpen || step !== 'track' || !activePoint) {
      holdStartRef.current = null
      holdBufferRef.current = []
      setHoldProgress(0)
      setActiveDistance(null)
      return
    }

    if (!rawGazePosition || !hasFace) {
      holdStartRef.current = null
      holdBufferRef.current = []
      setHoldProgress(0)
      setActiveDistance(null)
      return
    }

    const now = performance.now()
    if (now < captureCooldownUntilRef.current) return

    const gazeX = clamp01(rawGazePosition.x)
    const gazeY = clamp01(rawGazePosition.y)
    const distance = Math.hypot(gazeX - activePoint.x, gazeY - activePoint.y)
    setActiveDistance(distance)

    if (distance > targetRadius) {
      holdStartRef.current = null
      holdBufferRef.current = []
      setHoldProgress(0)
      return
    }

    if (holdStartRef.current == null) {
      holdStartRef.current = now
      holdBufferRef.current = []
    }

    holdBufferRef.current.push({ x: gazeX, y: gazeY, t: now })
    holdBufferRef.current = holdBufferRef.current.filter((entry) => now - entry.t <= holdMs + 120)
    const elapsed = now - (holdStartRef.current ?? now)
    const progress = Math.min(1, elapsed / holdMs)
    setHoldProgress(progress)

    if (progress < 1) return

    const recent = holdBufferRef.current.slice(-6)
    const avgX = recent.reduce((acc, item) => acc + item.x, 0) / recent.length
    const avgY = recent.reduce((acc, item) => acc + item.y, 0) / recent.length

    setSamples((prev) => [
      ...prev,
      { targetX: activePoint.x, targetY: activePoint.y, gazeX: avgX, gazeY: avgY },
    ])

    holdStartRef.current = null
    holdBufferRef.current = []
    captureCooldownUntilRef.current = now + cooldownMs
    setHoldProgress(0)
    setActiveDistance(null)
  }, [activePoint, cooldownMs, hasFace, holdMs, isOpen, rawGazePosition, step, targetRadius])

  useEffect(() => {
    if (!isOpen || step !== 'track') return
    if (samples.length < GAZE_POINTS.length) return
    const timeoutId = window.setTimeout(() => setStep('verify'), 180)
    return () => window.clearTimeout(timeoutId)
  }, [isOpen, samples.length, step])

  useEffect(() => {
    if (!isOpen || step !== 'verify') return
    const onBlink = (event: Event) => {
      const count = (event as CustomEvent<{ count?: number }>).detail?.count
      if (count === 1) setGestures((prev) => ({ ...prev, singleBlink: true }))
      if (count === 2) setGestures((prev) => ({ ...prev, doubleBlink: true }))
    }
    const onGesture = (event: Event) => {
      const trigger = (event as CustomEvent<{ trigger?: string }>).detail?.trigger
      if (trigger === 'handPinch') setGestures((prev) => ({ ...prev, handPinch: true }))
      if (trigger === 'headNod') setGestures((prev) => ({ ...prev, headNod: true }))
    }
    window.addEventListener('remoteBlinkPattern', onBlink)
    window.addEventListener('remoteGestureTrigger', onGesture)
    return () => {
      window.removeEventListener('remoteBlinkPattern', onBlink)
      window.removeEventListener('remoteGestureTrigger', onGesture)
    }
  }, [isOpen, step])

  const readyGuidance = !hasFace
    ? 'Move your face into the frame and keep both eyes visible.'
    : !hasLivenessReadiness
      ? 'Increase front lighting and avoid backlight.'
      : !hasSteadyCamera
        ? 'Hold the device still for a second to lock tracking.'
        : 'Ready. Start tracking now.'

  const holdRemainingMs = Math.max(0, Math.ceil((1 - holdProgress) * holdMs))
  const trackGuidance = !hasFace
    ? 'Face lost. Re-center and keep looking at the target.'
    : !activePoint
      ? 'All gaze targets captured.'
      : activeDistance == null
        ? `Look at ${activePoint.label}.`
        : activeDistance > targetRadius
          ? `Move gaze to ${activePoint.label}.`
          : `Hold for ${holdRemainingMs}ms to auto-capture.`

  const captureNow = () => {
    if (!rawGazePosition || !activePoint) return
    setSamples((prev) => [
      ...prev,
      {
        targetX: activePoint.x,
        targetY: activePoint.y,
        gazeX: clamp01(rawGazePosition.x),
        gazeY: clamp01(rawGazePosition.y),
      },
    ])
    holdStartRef.current = null
    holdBufferRef.current = []
    setHoldProgress(0)
    setActiveDistance(null)
    captureCooldownUntilRef.current = performance.now() + cooldownMs
  }

  const handleSave = () => {
    const next = buildVisionCalibration(calibration, samples, gestures)
    if (onSave) {
      onSave(next)
    } else {
      saveVisionCalibration(next)
      setCalibration(next)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="vision-cal-modal-backdrop" role="dialog" aria-modal aria-label="Vision calibration">
      <div className="vision-cal-modal">
        <h2 className="screen-title" style={{ fontSize: 18, marginBottom: 4 }}>
          Quick calibration
        </h2>
        <p className="profile-trust-card__hint">
          Step {STEPS.indexOf(step) + 1} of {STEPS.length}
        </p>

        <div className="vision-cal-steps">
          {STEPS.map((id) => (
            <div
              key={id}
              className={`vision-cal-step ${
                id === step
                  ? 'vision-cal-step--active'
                  : STEPS.indexOf(id) < STEPS.indexOf(step)
                    ? 'vision-cal-step--done'
                    : ''
              }`}
            >
              {id === 'ready' ? 'Ready' : id === 'track' ? 'Track' : 'Verify'}
            </div>
          ))}
        </div>

        {step === 'ready' ? (
          <>
            <p className="profile-trust-card__hint">{readyGuidance}</p>
            <div className="vision-cal-checklist" style={{ gridTemplateColumns: '1fr' }}>
              <ReadinessRow label="Face in frame" value={hasFace ? 'Ready' : 'Not detected'} ok={hasFace} />
              <ReadinessRow
                label="Lighting / liveness"
                value={`${(livenessScore * 100).toFixed(0)}%`}
                ok={hasLivenessReadiness}
              />
              <ReadinessRow
                label="Camera stability"
                value={hasSteadyCamera ? 'Stable' : 'Hold still'}
                ok={hasSteadyCamera}
              />
            </div>
            <div className="vision-cal-actions">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep('track')} disabled={!canStartTracking}>
                Start tracking
              </Button>
            </div>
          </>
        ) : null}

        {step === 'track' ? (
          <>
            <p className="profile-trust-card__hint">{trackGuidance}</p>
            <div className="vision-cal-track">
              {GAZE_POINTS.map((point, index) => {
                const captured = index < samples.length
                const isCurrent = index === samples.length
                return (
                  <div
                    key={point.label}
                    className={`vision-cal-point ${captured ? 'vision-cal-point--captured' : ''} ${
                      isCurrent ? 'vision-cal-point--current' : ''
                    }`}
                    style={{
                      left: `${point.x * 100}%`,
                      top: `${point.y * 100}%`,
                      width: isCurrent ? 18 : 12,
                      height: isCurrent ? 18 : 12,
                    }}
                    title={point.label}
                  />
                )
              })}
            </div>
            <p className="profile-trust-card__hint mono" style={{ fontSize: 11 }}>
              Captured {samples.length}/{GAZE_POINTS.length}
              {samples.length >= MIN_GAZE_SAMPLES ? ' · minimum reached' : ` · minimum ${MIN_GAZE_SAMPLES}`}
            </p>
            <div className="vision-cal-progress">
              <span style={{ width: `${Math.round(holdProgress * 100)}%` }} />
            </div>
            <div className="vision-cal-actions">
              <Button variant="secondary" onClick={() => setStep('ready')}>
                Back
              </Button>
              {activePoint ? (
                <Button variant="secondary" onClick={captureNow} disabled={!rawGazePosition || !hasFace}>
                  Capture now
                </Button>
              ) : null}
              <Button onClick={() => setStep('verify')} disabled={samples.length < MIN_GAZE_SAMPLES}>
                Continue
              </Button>
            </div>
          </>
        ) : null}

        {step === 'verify' ? (
          <>
            <p className="profile-trust-card__hint">
              Quick verification: single blink and hand pinch are required.
            </p>
            <div className="vision-cal-checklist">
              <GestureRow done={gestures.singleBlink} label="Single blink" required />
              <GestureRow done={gestures.handPinch} label="Hand pinch" required />
              <GestureRow done={gestures.doubleBlink ?? false} label="Double blink" />
              <GestureRow done={gestures.headNod ?? false} label="Head nod" />
            </div>
            <p className="profile-trust-card__hint mono" style={{ fontSize: 11 }}>
              Gaze points: {samples.length} · checks: {gestureDoneCount}/4 · quality:{' '}
              {Math.round(preview.profileQuality * 100)}%
            </p>
            <div className="vision-cal-actions">
              <Button variant="secondary" onClick={() => setStep('track')}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={!canSave}>
                Save calibration
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function ReadinessRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`vision-cal-check ${ok ? 'vision-cal-check--done' : ''}`}>
      <span>{label}</span>
      <span className="mono" style={{ float: 'right', color: ok ? 'var(--accent-lime)' : 'var(--accent-rose)' }}>
        {value}
      </span>
    </div>
  )
}

function GestureRow({ done, label, required }: { done: boolean; label: string; required?: boolean }) {
  return (
    <div className={`vision-cal-check ${done ? 'vision-cal-check--done' : ''}`}>
      {label}
      {required ? <span className="mono" style={{ fontSize: 10, opacity: 0.7 }}> · required</span> : null}
      <span style={{ float: 'right' }}>{done ? '✓' : '…'}</span>
    </div>
  )
}
