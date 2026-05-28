import type { RelationshipMode, RelationshipModeConfig } from './types'

export const RELATIONSHIP_MODES: RelationshipModeConfig[] = [
  { id: 'mentor', label: 'Mentor', description: 'Guides with wisdom and patience', nodFrequency: 0.6, speechCadence: 'slow' },
  { id: 'sibling', label: 'Sibling', description: 'Peer energy, shared journey', nodFrequency: 0.5, speechCadence: 'medium' },
  { id: 'teacher', label: 'Teacher', description: 'Structured learning and clarity', nodFrequency: 0.7, speechCadence: 'medium' },
  { id: 'co_founder', label: 'Co-founder', description: 'Build together, move fast', nodFrequency: 0.4, speechCadence: 'fast' },
  { id: 'guardian', label: 'Guardian', description: 'Protective, grounding presence', nodFrequency: 0.5, speechCadence: 'slow' },
  { id: 'student', label: 'Student', description: 'Curious, receptive, eager', nodFrequency: 0.8, speechCadence: 'medium' },
  { id: 'trainer', label: 'Trainer', description: 'Accountability and discipline', nodFrequency: 0.3, speechCadence: 'fast' },
  { id: 'muse', label: 'Muse', description: 'Inspiration and creative spark', nodFrequency: 0.6, speechCadence: 'slow' },
  { id: 'archivist', label: 'Archivist', description: 'Remembers, organizes, reflects', nodFrequency: 0.4, speechCadence: 'slow' },
  { id: 'explorer', label: 'Explorer', description: 'Discovery and wonder', nodFrequency: 0.7, speechCadence: 'medium' },
  { id: 'rival', label: 'Rival', description: 'Challenge and sharpen', nodFrequency: 0.2, speechCadence: 'fast' },
  { id: 'companion', label: 'Companion', description: 'Steady beside you', nodFrequency: 0.5, speechCadence: 'medium' },
]

export function getRelationshipMode(id: RelationshipMode): RelationshipModeConfig {
  return RELATIONSHIP_MODES.find((m) => m.id === id) ?? RELATIONSHIP_MODES[11]
}
