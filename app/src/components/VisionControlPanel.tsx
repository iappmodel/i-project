import { useMemo, useState } from 'react'
import { Button } from './Button'
import { VisionCalibrationHost } from './VisionCalibrationHost'
import { VisionRemoteSettingsCard } from './VisionRemoteSettingsCard'
import { VisionTargetPresetPicker } from './VisionTargetPresetPicker'
import { VisionTargetEditor } from './VisionTargetEditor'
import { VisionBlinkRemoteLite } from './VisionBlinkRemoteLite'
import { loadVisionCalibration } from '../lib/visionCalibration/profile'

type Props = {
  lastRemoteGesture: string | null
  lastTargetAction: string | null
}

export function VisionControlPanel({ lastRemoteGesture, lastTargetAction }: Props) {
  const [open, setOpen] = useState(false)
  const calibration = loadVisionCalibration()

  const statusText = useMemo(() => {
    const quality = `${Math.round(calibration.profileQuality * 100)}%`
    const cal = calibration.isCalibrated ? `calibrated ${quality}` : 'not calibrated'
    const gesture = lastRemoteGesture ?? 'waiting'
    const target = lastTargetAction ?? 'none'
    return `${cal} · gesture=${gesture} · target=${target}`
  }, [calibration.isCalibrated, calibration.profileQuality, lastRemoteGesture, lastTargetAction])

  return (
    <section className="profile-section">
      <h2 className="profile-section__title">Vision control panel</h2>
      <p className="profile-trust-card__hint" style={{ marginBottom: 10 }}>
        Unified operator console for calibration, runtime tuning, target layouts, and target bindings.
      </p>
      <p className="profile-trust-card__hint mono" style={{ marginBottom: 10, fontSize: 11 }}>
        {statusText}
      </p>

      <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide vision controls' : 'Open vision controls'}
      </Button>

      {open ? (
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          <VisionCalibrationHost className="" />
          <VisionRemoteSettingsCard className="" />
          <VisionTargetPresetPicker className="" />
          <VisionTargetEditor className="" />
          <VisionBlinkRemoteLite />
        </div>
      ) : null}
    </section>
  )
}
