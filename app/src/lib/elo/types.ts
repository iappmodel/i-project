export type EloMemoryType =
  | 'declared_preference'
  | 'inferred_preference'
  | 'behavior_pattern'
  | 'earning_pattern'
  | 'wallet_pattern'
  | 'trust_pattern'
  | 'creator_pattern'
  | 'content_pattern'
  | 'risk_pattern'
  | 'goal'
  | 'boundary'
  | 'life_context'

export type EloPermissionKey =
  | 'memory'
  | 'proactive_suggestions'
  | 'wallet_advisory'
  | 'location_opportunities'
  | 'cross_platform_context'
  | 'automation_preparation'

export type EloOrbState =
  | 'idle'
  | 'thinking'
  | 'hasInsight'
  | 'warning'
  | 'celebrating'
  | 'blocked'
  | 'muted'

export type PersonalityLayerRole =
  | 'primary'
  | 'secondary'
  | 'creative'
  | 'discipline'
  | 'emotional'

export type RelationshipMode =
  | 'mentor'
  | 'sibling'
  | 'teacher'
  | 'co_founder'
  | 'guardian'
  | 'student'
  | 'trainer'
  | 'muse'
  | 'archivist'
  | 'explorer'
  | 'rival'
  | 'companion'

export type OperatingMode = 'founder' | 'monk' | 'artist'

export type EloVisualForm = 'lineFace' | 'abstract' | 'lightForm' | 'symbol'

export type PresenceRoomId =
  | 'philosophy'
  | 'focus'
  | 'creator'
  | 'sleep'
  | 'grief'
  | 'writing'
  | 'study'

export interface PersonalityLayer {
  id: string
  presetId: string | 'custom'
  role: PersonalityLayerRole
  weight: number
}

export interface EloPersonalityStack {
  layers: PersonalityLayer[]
  relationshipMode: RelationshipMode
  operatingMode: OperatingMode | null
  visualForm: EloVisualForm
}

export interface PersonalityPreset {
  id: string
  label: string
  tagline: string
  defaultRole: PersonalityLayerRole
  toneHint: EloProfile['tone']
}

export interface PresenceRoom {
  id: PresenceRoomId
  label: string
  description: string
  lineColor: string
  pulseSpeed: number
  opacityScale: number
  microExpressionScale: number
  cadence: 'reflective' | 'minimal' | 'amplified' | 'static' | 'gentle' | 'attentive'
}

export interface OperatingModeConfig {
  id: OperatingMode
  label: string
  description: string
  opacityScale: number
  intensityScale: number
  challengeLevel: number
  notificationTone: string
  feedWeightHint: string
}

export interface RelationshipModeConfig {
  id: RelationshipMode
  label: string
  description: string
  nodFrequency: number
  speechCadence: 'slow' | 'medium' | 'fast'
}

export interface EloExpressionState {
  opacity: number
  tiltY: number
  tiltX: number
  blinkScale: number
  pulseSpeed: number
  lineColor: string
  nodPhase: number
  emergence: number
  microExpressionScale: number
}

export interface SharedPresenceMemory {
  id: string
  participantIds: string[]
  ivatarId: string
  thread: { id: string; authorId: string; content: string; createdAt: string }[]
}

export interface PersonalityPublishDraft {
  id: string
  authorLabel: string
  title: string
  description: string
  stack: EloPersonalityStack
  remixCount: number
  adoptedCount: number
}

export interface EloPermission {
  key: EloPermissionKey
  label: string
  description: string
  granted: boolean
}

export interface EloProfile {
  id: string
  userId: string
  eloEnabled: boolean
  memoryEnabled: boolean
  proactiveEnabled: boolean
  automationEnabled: boolean
  tone: 'clear' | 'warm' | 'coach' | 'concise'
}

export interface EloMemory {
  id: string
  userId: string
  memoryType: EloMemoryType
  source: 'declared' | 'inferred' | 'system'
  content: Record<string, unknown>
  confidence: number
  sensitivity: 'low' | 'normal' | 'sensitive'
  userVisible: boolean
  userEditable: boolean
  createdAt: string
}

export interface EloAction {
  id: string
  actionType:
    | 'open_screen'
    | 'save_offer'
    | 'draft_content'
    | 'prepare_withdrawal'
    | 'prepare_conversion'
    | 'withdraw'
    | 'convert'
    | 'pay'
    | 'external_post'
    | 'external_message'
    | 'identity_verification'
    | 'bank_linking'
    | 'tax_forms'
  payload: Record<string, unknown>
  sensitivity: 'low' | 'normal' | 'financial' | 'identity' | 'minor'
  permissionRequired: boolean
}

export interface EloRecommendation {
  id: string
  type: 'wallet' | 'earn' | 'trust' | 'creator' | 'safety' | 'feed'
  title: string
  body: string
  reasonCodes: string[]
  confidence: number
  urgency: 'low' | 'medium' | 'high' | 'critical'
  targetScreen: 'feed' | 'earn' | 'wallet' | 'profile' | 'studio' | 'campaign_builder'
  targetAction?: EloAction
  requiresPermission: boolean
}

export interface EloMessage {
  id: string
  role: 'assistant' | 'user' | 'system'
  content: string
  createdAt: string
}

export interface EloNotification {
  id: string
  type: 'opportunity' | 'reminder' | 'warning' | 'wallet' | 'trust' | 'creator'
  title: string
  body: string
  score: number
}

export interface EloPresenceConfig {
  activated: boolean
  onboardingComplete: boolean
  stack: EloPersonalityStack
  roomId: PresenceRoomId
  panelOpen: boolean
}

export const DEFAULT_ELO_STACK: EloPersonalityStack = {
  layers: [
    {
      id: 'layer-primary',
      presetId: 'calm_guide',
      role: 'primary',
      weight: 1,
    },
  ],
  relationshipMode: 'companion',
  operatingMode: null,
  visualForm: 'lineFace',
}
