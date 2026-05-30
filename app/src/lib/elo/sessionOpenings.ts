import { getPreset } from './presets'
import { getRelationshipMode } from './relationshipModes'
import type { EloPersonalityStack } from './types'

/** First line ELO speaks when a voice/session manifestation completes */
export function getSessionOpening(stack: EloPersonalityStack): string {
  const primary = stack.layers.find((l) => l.role === 'primary')
  const preset = getPreset(primary?.presetId ?? 'calm_guide')
  const relationship = getRelationshipMode(stack.relationshipMode)

  const tone = preset?.tagline ?? 'Present with you.'
  return `${tone} I'm here — as your ${relationship.label.toLowerCase()}. What are you watching?`
}

/** Compact copy for the on-feed greeting pill */
export function getSessionGreetingShort(): string {
  return "I'm here. Tap to talk."
}
