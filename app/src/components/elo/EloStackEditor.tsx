import { OPERATING_MODES } from '../../lib/elo/operatingModes'
import { RELATIONSHIP_MODES } from '../../lib/elo/relationshipModes'
import type { EloPersonalityStack, OperatingMode, PersonalityLayerRole } from '../../lib/elo/types'
import { useEloPersonality } from '../../hooks/useEloPersonality'
import { PERSONALITY_PRESETS } from '../../lib/elo/presets'

export function EloStackEditor() {
  const { stack, setStack, primaryPreset } = useEloPersonality()

  const updatePrimary = (presetId: string) => {
    const layers = stack.layers.filter((l) => l.role !== 'primary')
    layers.unshift({
      id: 'layer-primary',
      presetId,
      role: 'primary' as PersonalityLayerRole,
      weight: 1,
    })
    setStack({ ...stack, layers })
  }

  const setOperatingMode = (mode: OperatingMode | null) => {
    setStack({ ...stack, operatingMode: mode })
  }

  const setRelationship = (relationshipMode: EloPersonalityStack['relationshipMode']) => {
    setStack({ ...stack, relationshipMode })
  }

  return (
    <section>
      <p className="elo-section-title">Personality stack</p>
      <div className="elo-card">
        <h4>Primary · {primaryPreset?.label ?? 'ELO'}</h4>
        <p>{primaryPreset?.tagline}</p>
        <div className="elo-chip-row" style={{ marginTop: 8 }}>
          {PERSONALITY_PRESETS.filter((p) => !['custom', 'hybrid'].includes(p.id))
            .slice(0, 6)
            .map((p) => (
              <button
                key={p.id}
                type="button"
                className={`elo-chip ${stack.layers[0]?.presetId === p.id ? 'elo-chip--active' : ''}`}
                onClick={() => updatePrimary(p.id)}
              >
                {p.label}
              </button>
            ))}
        </div>
      </div>

      <p className="elo-section-title">Operating mode</p>
      <div className="elo-chip-row">
        <button
          type="button"
          className={`elo-chip ${stack.operatingMode === null ? 'elo-chip--active' : ''}`}
          onClick={() => setOperatingMode(null)}
        >
          Default
        </button>
        {OPERATING_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`elo-chip ${stack.operatingMode === mode.id ? 'elo-chip--active' : ''}`}
            onClick={() => setOperatingMode(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <p className="elo-section-title">Relationship</p>
      <div className="elo-chip-row">
        {RELATIONSHIP_MODES.slice(0, 8).map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`elo-chip ${stack.relationshipMode === mode.id ? 'elo-chip--active' : ''}`}
            onClick={() => setRelationship(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </section>
  )
}
