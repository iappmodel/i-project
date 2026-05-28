import type { PersonalityPreset } from './types'

export const PERSONALITY_PRESETS: PersonalityPreset[] = [
  { id: 'mentor', label: 'Mentor', tagline: 'Wise guidance, long view', defaultRole: 'primary', toneHint: 'warm' },
  { id: 'strategist', label: 'Strategist', tagline: 'Clear priorities, sharp focus', defaultRole: 'primary', toneHint: 'concise' },
  { id: 'calm_guide', label: 'Calm guide', tagline: 'Steady presence, gentle pace', defaultRole: 'primary', toneHint: 'warm' },
  { id: 'creative_partner', label: 'Creative partner', tagline: 'Playful energy, nonlinear ideas', defaultRole: 'creative', toneHint: 'warm' },
  { id: 'aggressive_coach', label: 'Aggressive coach', tagline: 'Push hard, no excuses', defaultRole: 'discipline', toneHint: 'coach' },
  { id: 'spiritual_thinker', label: 'Spiritual thinker', tagline: 'Meaning, reflection, depth', defaultRole: 'emotional', toneHint: 'warm' },
  { id: 'scientist', label: 'Scientist', tagline: 'Evidence, curiosity, precision', defaultRole: 'primary', toneHint: 'clear' },
  { id: 'artist', label: 'Artist', tagline: 'Emotion, beauty, expression', defaultRole: 'creative', toneHint: 'warm' },
  { id: 'entertainer', label: 'Entertainer', tagline: 'Rhythm, warmth, delight', defaultRole: 'secondary', toneHint: 'warm' },
  { id: 'friend', label: 'Friend', tagline: 'Familiar, honest, present', defaultRole: 'secondary', toneHint: 'warm' },
  { id: 'hybrid', label: 'Hybrid', tagline: 'Blend multiple energies', defaultRole: 'primary', toneHint: 'clear' },
  { id: 'custom', label: 'Build your own', tagline: 'Compose your stack', defaultRole: 'primary', toneHint: 'clear' },
]

export function getPreset(id: string): PersonalityPreset | undefined {
  return PERSONALITY_PRESETS.find((p) => p.id === id)
}
