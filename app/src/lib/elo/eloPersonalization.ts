import { getPreset } from './presets'
import { getRelationshipMode } from './relationshipModes'
import type { EloMemory, EloPersonalityStack, PresenceRoom } from './types'

export interface PersonalizationHints {
  prefix: string
  suffix: string
  toneTag: 'warm' | 'direct' | 'reflective' | 'minimal'
}

export function buildPersonalizationHints(
  stack: EloPersonalityStack,
  room: PresenceRoom,
  memories: EloMemory[],
): PersonalizationHints {
  const primary = stack.layers.find((l) => l.role === 'primary')
  const preset = getPreset(primary?.presetId ?? 'calm_guide')
  const relationship = getRelationshipMode(stack.relationshipMode)
  const declaredGoal = memories.find((m) => m.memoryType === 'goal' && m.userVisible)

  let toneTag: PersonalizationHints['toneTag'] = 'warm'
  if (preset?.toneHint === 'coach') toneTag = 'direct'
  if (room.cadence === 'reflective' || room.cadence === 'gentle') toneTag = 'reflective'
  if (room.cadence === 'minimal' || room.cadence === 'static') toneTag = 'minimal'

  const prefixByMode: Record<PersonalizationHints['toneTag'], string> = {
    warm: '',
    direct: '',
    reflective: 'Take a breath — ',
    minimal: '',
  }

  let suffix = ''
  if (declaredGoal?.content && typeof declaredGoal.content.summary === 'string') {
    suffix = ` (Still holding your goal: ${declaredGoal.content.summary}.)`
  } else if (relationship.speechCadence === 'slow') {
    suffix = ' No rush.'
  }

  return {
    prefix: prefixByMode[toneTag],
    suffix,
    toneTag,
  }
}

export function applyPersonalization(reply: string, hints: PersonalizationHints): string {
  const trimmed = reply.trim()
  if (!hints.prefix && !hints.suffix) return trimmed
  return `${hints.prefix}${trimmed}${hints.suffix}`
}
