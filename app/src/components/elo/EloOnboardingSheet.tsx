import { useMemo, useState } from 'react'
import { PERSONALITY_PRESETS } from '../../lib/elo/presets'
import { RELATIONSHIP_MODES } from '../../lib/elo/relationshipModes'
import type { EloPersonalityStack, PersonalityPreset } from '../../lib/elo/types'
import { useElo } from '../../state/eloContext'

export function EloOnboardingSheet({ open }: { open: boolean }) {
  const { completeOnboarding } = useElo()
  const [primaryId, setPrimaryId] = useState<string>('calm_guide')
  const [secondaryId, setSecondaryId] = useState<string | null>(null)
  const [relationshipMode, setRelationshipMode] = useState<EloPersonalityStack['relationshipMode']>('companion')

  const selectable = useMemo(
    () => PERSONALITY_PRESETS.filter((p) => p.id !== 'custom' && p.id !== 'hybrid'),
    [],
  )

  if (!open) return null

  const finish = () => {
    const layers: EloPersonalityStack['layers'] = [
      {
        id: 'layer-primary',
        presetId: primaryId,
        role: 'primary',
        weight: secondaryId ? 0.65 : 1,
      },
    ]
    if (secondaryId) {
      const sec = PERSONALITY_PRESETS.find((p) => p.id === secondaryId)
      layers.push({
        id: 'layer-secondary',
        presetId: secondaryId,
        role: sec?.defaultRole ?? 'secondary',
        weight: 0.35,
      })
    }
    completeOnboarding({
      layers,
      relationshipMode,
      operatingMode: null,
      visualForm: 'lineFace',
    })
  }

  return (
    <div className="elo-onboarding-backdrop" role="dialog" aria-label="ELO onboarding">
      <div className="elo-onboarding-sheet">
        <h2>I heard you.</h2>
        <p>Your first interaction with ELO — choose who you want beside you.</p>

        <p className="elo-section-title">Primary presence</p>
        <div className="elo-preset-grid">
          {selectable.map((preset: PersonalityPreset) => (
            <button
              key={preset.id}
              type="button"
              className={`elo-preset-card ${primaryId === preset.id ? 'elo-preset-card--selected' : ''}`}
              onClick={() => setPrimaryId(preset.id)}
            >
              <strong>{preset.label}</strong>
              <span>{preset.tagline}</span>
            </button>
          ))}
        </div>

        <p className="elo-section-title">Secondary layer (optional)</p>
        <div className="elo-chip-row">
          <button
            type="button"
            className={`elo-chip ${secondaryId === null ? 'elo-chip--active' : ''}`}
            onClick={() => setSecondaryId(null)}
          >
            None
          </button>
          {selectable
            .filter((p) => p.id !== primaryId)
            .slice(0, 6)
            .map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`elo-chip ${secondaryId === preset.id ? 'elo-chip--active' : ''}`}
                onClick={() => setSecondaryId(preset.id)}
              >
                {preset.label}
              </button>
            ))}
        </div>

        <p className="elo-section-title">Relationship mode</p>
        <div className="elo-chip-row">
          {RELATIONSHIP_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`elo-chip ${relationshipMode === mode.id ? 'elo-chip--active' : ''}`}
              onClick={() => setRelationshipMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <button type="button" className="elo-primary-btn" onClick={finish}>
          Adopt ELO
        </button>
      </div>
    </div>
  )
}
