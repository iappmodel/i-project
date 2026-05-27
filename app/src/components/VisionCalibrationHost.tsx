import { useRef, useState } from 'react'
import { VisionCalibrationWizard } from './VisionCalibrationWizard'
import { Button } from './Button'
import { isWebVisionEnabled, useWebVisionEngine } from '../lib/visionEngine'
import { loadVisionCalibration } from '../lib/visionCalibration/profile'

export function VisionCalibrationHost() {
  const enabled = isWebVisionEnabled()
  const [open, setOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const vision = useWebVisionEngine(enabled && open, videoRef, { calibrationMode: true })
  const calibration = loadVisionCalibration()

  if (!enabled) return null

  return (
    <section className="profile-section">
      <h2 className="profile-section__title">Gaze calibration</h2>
      <p className="profile-trust-card__hint" style={{ marginBottom: 12 }}>
        {calibration.isCalibrated
          ? `Calibrated · quality ${Math.round(calibration.profileQuality * 100)}%`
          : 'Not calibrated — run quick wizard for better target accuracy.'}
      </p>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {calibration.isCalibrated ? 'Recalibrate gaze' : 'Calibrate gaze'}
      </Button>
      <video ref={videoRef} playsInline muted autoPlay style={{ display: 'none' }} />
      <VisionCalibrationWizard
        isOpen={open}
        onClose={() => setOpen(false)}
        gazePosition={vision.gazePosition}
        hasFace={vision.hasFace}
        livenessScore={vision.livenessScore}
      />
    </section>
  )
}
