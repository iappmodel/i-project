import { useRef, useState } from 'react'
import { UnifiedVisionCalibrationWizard } from './UnifiedVisionCalibrationWizard'
import { Button } from './Button'
import { isWebVisionEnabled, useWebVisionEngine } from '../lib/visionEngine'
import {
  loadVisionCalibration,
  saveVisionCalibration,
  type VisionCalibrationProfile,
} from '../lib/visionCalibration/profile'

type Props = {
  className?: string
}

export function VisionCalibrationHost({ className }: Props) {
  const enabled = isWebVisionEnabled()
  const [open, setOpen] = useState(false)
  const [calibration, setCalibration] = useState<VisionCalibrationProfile>(() => loadVisionCalibration())
  const videoRef = useRef<HTMLVideoElement>(null)
  const vision = useWebVisionEngine(enabled && open, videoRef, { calibrationMode: true })

  if (!enabled) return null

  const handleSave = (next: VisionCalibrationProfile) => {
    saveVisionCalibration(next)
    setCalibration(next)
  }

  return (
    <section className={className ?? 'profile-section'}>
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
      <UnifiedVisionCalibrationWizard
        isOpen={open}
        onClose={() => setOpen(false)}
        rawGazePosition={vision.gazePosition}
        hasFace={vision.hasFace}
        livenessScore={vision.livenessScore}
        livenessStable={vision.livenessStable}
        calibration={calibration}
        onSave={handleSave}
      />
    </section>
  )
}
