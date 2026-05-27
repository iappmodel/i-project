import { useEffect, useState } from 'react'
import { Button } from './Button'
import { TARGET_PRESETS, useScreenTargets } from '../hooks/useScreenTargets'

type Props = {
  className?: string
}

export function VisionTargetPresetPicker({ className }: Props) {
  const { targets, applyPreset, clearAll } = useScreenTargets()
  const [activePreset, setActivePreset] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setActivePreset(null)
    window.addEventListener('screenTargetsChanged', sync)
    return () => window.removeEventListener('screenTargetsChanged', sync)
  }, [])

  return (
    <section className={className ?? 'profile-section'}>
      <h2 className="profile-section__title">Screen target layouts</h2>
      <p className="profile-trust-card__hint" style={{ marginBottom: 12 }}>
        Apply a preset for gaze/blink rings on Feed and Earn. Custom drag-and-drop editor still deferred.
      </p>

      <p className="profile-trust-card__hint mono" style={{ marginBottom: 12, fontSize: 11 }}>
        Active targets: {targets.filter((t) => t.enabled).length}
        {activePreset ? ` · last preset: ${activePreset}` : ''}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TARGET_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            variant="secondary"
            onClick={() => {
              applyPreset(preset.id)
              setActivePreset(preset.name)
            }}
          >
            {preset.name} — {preset.description}
          </Button>
        ))}
        <Button variant="ghost" onClick={() => clearAll()}>
          Clear all targets
        </Button>
      </div>
    </section>
  )
}
