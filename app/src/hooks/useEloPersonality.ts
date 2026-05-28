import { useMemo } from 'react'
import { PERSONALITY_PRESETS, getPreset } from '../lib/elo/presets'
import { getRelationshipMode } from '../lib/elo/relationshipModes'
import { getOperatingMode } from '../lib/elo/operatingModes'
import { useElo } from '../state/eloContext'

export function useEloPersonality() {
  const { config, setStack, setRoom } = useElo()
  const stack = config.stack

  const primaryPreset = useMemo(() => {
    const primary = stack.layers.find((l) => l.role === 'primary')
    return getPreset(primary?.presetId ?? 'calm_guide')
  }, [stack.layers])

  const relationship = useMemo(
    () => getRelationshipMode(stack.relationshipMode),
    [stack.relationshipMode],
  )

  const operating = useMemo(
    () => getOperatingMode(stack.operatingMode),
    [stack.operatingMode],
  )

  const displayName = useMemo(() => {
    if (primaryPreset) return primaryPreset.label
    return 'ELO'
  }, [primaryPreset])

  return {
    stack,
    presets: PERSONALITY_PRESETS,
    primaryPreset,
    relationship,
    operating,
    displayName,
    setStack,
    setRoom,
  }
}
