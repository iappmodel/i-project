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
  detectVisionDeviceClass,
  loadVisionCalibration,
  saveVisionCalibration,
  type VisionCalibrationProfile,
} from '../lib/visionCalibration/profile'
import '../styles/vision-calibration-wizard.css'

type StepId = 'ready' | 'track' | 'verify'

const STEPS: StepId[] = ['ready', 'track', 'verify']
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
  gazePosition: { x: number; y: number } | null
  hasFace: boolean
  livenessScore: number
}

export function VisionCalibrationWizard({ isOpen, onClose, gazePosition, hasFace, livenessScore }: Props) {
  const [step, setStep] = useState<StepId>('ready')
  const [calibration, setCalibration] = useState<VisionCalibrationProfile>(() => loadVisionCalibration())
  const [samples, setSamples] = useState<GazeSample[]>([])
  const [gestures, setGestures] = useState<GestureChecks>({ singleBlink: false, handPinch: false })
  const [holdProgress, setHoldProgress] = useState(0)
  const [activeDistance, setActiveDistance] = useState<number | null>(null)

  const holdStartRef = useRef<number | null>(null)
  const captureCooldownUntilRef = useRef(0)

  const deviceClass = calibration.deviceClass ?? detectVisionDeviceClass()
  const { holdMs, cooldownMs, targetRadius } = useMemo(
    () => getCalibrationCapturePreset(deviceClass),
    [deviceClass],
  )

  const activePoint = step === 'track' ? GAZE_POINTS[samples.length] : undefined
  const canStart = hasFace && livenessScore >= 0.25
  const canSave = samples.length >= 3 && gestures.singleBlink && gestures.handPinch

  const preview = useMemo(
    () => buildVisionCalibration(calibration, samples, gestures),
    [calibration, gestures, samples],
  )

  useEffect(() => {
    if (!isOpen) return
    setCalibrationMode(true)
    setStep('ready')
    setSamples([])
    setGestures({ singleBlink: false, handPinch: false })
    setHoldProgress(0)
    setActiveDistance(null)
    setCalibration(loadVisionCalibration())
    return () => setCalibrationMode(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || step !== 'track' || !activePoint) {
      holdStartRef.current = null
      setHoldProgress(0)
      setActiveDistance(null)
      return
    }

    if (!gazePosition || !hasFace) {
      holdStartRef.current = null
      setHoldProgress(0)
      setActiveDistance(null)
      return
    }

    const now = performance.now()
    if (now < captureCooldownUntilRef.current) return

    const gazeX = clamp01(gazePosition.x)
    const gazeY = clamp01(gazePosition.y)
    const distance = Math.hypot(gazeX - activePoint.x, gazeY - activePoint.y)
    setActiveDistance(distance)

    if (distance > targetRadius) {
      holdStartRef.current = null
      setHoldProgress(0)
      return
    }

    if (holdStartRef.current == null) holdStartRef.current = now
    const elapsed = now - (holdStartRef.current ?? now)
    const progress = Math.min(1, elapsed / holdMs)
    setHoldProgress(progress)

    if (progress < 1) return

    setSamples((prev) => [
      ...prev,
      { targetX: activePoint.x, targetY: activePoint.y, gazeX, gazeY },
    ])
    holdStartRef.current = null
    captureCooldownUntilRef.current = now + cooldownMs
    setHoldProgress(0)
    setActiveDistance(null)
  }, [activePoint, cooldownMs, gazePosition, hasFace, holdMs, isOpen, step, targetRadius])

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

  const captureNow = () => {
    if (!gazePosition || !activePoint) return
    setSamples((prev) => [
      ...prev,
      {
        targetX: activePoint.x,
        targetY: activePoint.y,
        gazeX: clamp01(gazePosition.x),
        gazeY: clamp01(gazePosition.y),
      },
    ])
    captureCooldownUntilRef.current = performance.now() + cooldownMs
    setHoldProgress(0)
    setActiveDistance(null)
  }

  const handleSave = () => {
    const next = buildVisionCalibration(calibration, samples, gestures)
    saveVisionCalibration(next)
    setCalibration(next)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="vision-cal-modal-backdrop" role="dialog" aria-modal aria-label="Vision calibration">
      <div className="vision-cal-modal">
        <h2 className="screen-title" style={{ fontSize: 18, marginBottom: 4 }}>
          Quick gaze calibration
        </h2>
        <p className="profile-trust-card__hint">Step {STEPS.indexOf(step) + 1} of {STEPS.length}</p>

        <div className="vision-cal-steps">
          {STEPS.map((id) => (
            <div
              key={id}
              className={`vision-cal-step ${
                id === step ? 'vision-cal-step--active' : STEPS.indexOf(id) < STEPS.indexOf(step) ? 'vision-cal-step--done' : ''
              }`}
            >
              {id === 'ready' ? 'Ready' : id === 'track' ? 'Track' : 'Verify'}
            </div>
          ))}
        </div>

        {step === 'ready' ? (
          <>
            <p className="profile-trust-card__hint">
              {!hasFace
                ? 'Allow camera access and center your face.'
                : livenessScore < 0.25
                  ? 'Improve lighting, then continue.'
                  : 'Face detected. Continue to capture gaze targets.'}
            </p>
            <div className="vision-cal-actions">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep('track')} disabled={!canStart}>
                Start tracking
              </Button>
            </div>
          </>
        ) : null}

        {step === 'track' ? (
          <>
            <p className="profile-trust-card__hint">
              {activePoint
                ? activeDistance != null && activeDistance <= targetRadius
                  ? `Hold on ${activePoint.label}…`
                  : `Look at ${activePoint.label}`
                : 'All points captured — continue to verify.'}
            </p>
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
            </p>
            <div className="vision-cal-progress">
              <span style={{ width: `${Math.round(holdProgress * 100)}%` }} />
            </div>
            <div className="vision-cal-actions">
              <Button variant="secondary" onClick={() => setStep('ready')}>
                Back
              </Button>
              {activePoint ? (
                <Button variant="secondary" onClick={captureNow} disabled={!gazePosition || !hasFace}>
                  Capture now
                </Button>
              ) : null}
              <Button onClick={() => setStep('verify')} disabled={samples.length < 3}>
                Continue
              </Button>
            </div>
          </>
        ) : null}

        {step === 'verify' ? (
          <>
            <p className="profile-trust-card__hint">Blink once and pinch to confirm gesture detection.</p>
            <div className="vision-cal-checklist">
              <div className={`vision-cal-check ${gestures.singleBlink ? 'vision-cal-check--done' : ''}`}>
                Single blink {gestures.singleBlink ? '✓' : '…'}
              </div>
              <div className={`vision-cal-check ${gestures.handPinch ? 'vision-cal-check--done' : ''}`}>
                Hand pinch {gestures.handPinch ? '✓' : '…'}
              </div>
            </div>
            <p className="profile-trust-card__hint mono" style={{ fontSize: 11 }}>
              Estimated quality: {Math.round(preview.profileQuality * 100)}%
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
