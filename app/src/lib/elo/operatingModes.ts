import type { OperatingMode, OperatingModeConfig } from './types'

export const OPERATING_MODES: OperatingModeConfig[] = [
  {
    id: 'founder',
    label: 'Founder Mode',
    description: 'Tone, pacing, and priorities tuned for building',
    opacityScale: 1.1,
    intensityScale: 1.2,
    challengeLevel: 0.85,
    notificationTone: 'direct',
    feedWeightHint: 'strategy, productivity, growth',
  },
  {
    id: 'monk',
    label: 'Monk Mode',
    description: 'Minimal stimulation, reflective guidance',
    opacityScale: 0.65,
    intensityScale: 0.4,
    challengeLevel: 0.3,
    notificationTone: 'quiet',
    feedWeightHint: 'calm, focus, minimal',
  },
  {
    id: 'artist',
    label: 'Artist Mode',
    description: 'Visual richness and emotional amplification',
    opacityScale: 1.25,
    intensityScale: 1.4,
    challengeLevel: 0.6,
    notificationTone: 'expressive',
    feedWeightHint: 'creative, mood, nonlinear',
  },
]

export function getOperatingMode(id: OperatingMode | null): OperatingModeConfig | null {
  if (!id) return null
  return OPERATING_MODES.find((m) => m.id === id) ?? null
}
