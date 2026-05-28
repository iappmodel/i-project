import type {
  EloMemory,
  EloMessage,
  EloNotification,
  EloPermission,
  EloProfile,
  EloRecommendation,
  PersonalityPublishDraft,
  SharedPresenceMemory,
} from './types'
import { DEFAULT_ELO_STACK } from './types'

export const mockEloProfile: EloProfile = {
  id: 'elo-profile-1',
  userId: 'user-1',
  eloEnabled: true,
  memoryEnabled: true,
  proactiveEnabled: true,
  automationEnabled: false,
  tone: 'warm',
}

export const mockWalletState = {
  spendable: 124.3,
  pending: 83.0,
  conversionRate: 1.08,
  payoutReadiness: 'blocked_identity',
  pendingLikelyClearingToday: 2,
  failedVerificationReason: 'incomplete_attention',
}

export const mockTrustState = {
  score: 72,
  tier: 2,
  nextTier: 3,
  progressToNextTier: 0.84,
  unlockHint: 'Sustain sessions above 70% attention quality.',
}

export const mockEarningHistory = {
  bestCategory: 'GPS check-ins',
  rewardPerVerifiedMinute: 0.44,
  weekTotal: 34.7,
}

export const mockCreatorInsight = {
  creator: '@citybuilds',
  affinity: 0.88,
  recommendation: 'This creator consistently drives your completion quality.',
}

export const mockContentPreference = {
  preferredLengthSeconds: [18, 35],
  preferredCategories: ['local missions', 'how-to creators'],
  skippedCategories: ['long watch offers'],
}

export const mockPermissions: EloPermission[] = [
  { key: 'memory', label: 'Memory', description: 'Let ELO remember long-term preferences.', granted: true },
  {
    key: 'proactive_suggestions',
    label: 'Proactive suggestions',
    description: 'Allow timely guidance cards and nudges.',
    granted: true,
  },
  {
    key: 'wallet_advisory',
    label: 'Wallet advisory',
    description: 'Use wallet state for smarter recommendations.',
    granted: true,
  },
  {
    key: 'location_opportunities',
    label: 'Location opportunities',
    description: 'Use approximate location for nearby offers.',
    granted: true,
  },
  {
    key: 'cross_platform_context',
    label: 'Cross-platform context',
    description: 'Use connected creator platform signals.',
    granted: false,
  },
  {
    key: 'automation_preparation',
    label: 'Automation preparation',
    description: 'Allow ELO to prepare drafts and reminders.',
    granted: false,
  },
]

export const mockMemories: EloMemory[] = [
  {
    id: 'mem-1',
    userId: 'user-1',
    memoryType: 'declared_preference',
    source: 'declared',
    content: { key: 'avoid_category', value: 'restaurants' },
    confidence: 1,
    sensitivity: 'normal',
    userVisible: true,
    userEditable: true,
    createdAt: '2026-04-27T10:00:00.000Z',
  },
  {
    id: 'mem-2',
    userId: 'user-1',
    memoryType: 'earning_pattern',
    source: 'inferred',
    content: { bestCategory: 'GPS', successRate: 0.82 },
    confidence: 0.86,
    sensitivity: 'normal',
    userVisible: true,
    userEditable: true,
    createdAt: '2026-04-27T12:00:00.000Z',
  },
  {
    id: 'mem-3',
    userId: 'user-1',
    memoryType: 'goal',
    source: 'declared',
    content: { goal: 'Reach Trust Tier 3 this week' },
    confidence: 1,
    sensitivity: 'low',
    userVisible: true,
    userEditable: true,
    createdAt: '2026-04-27T13:00:00.000Z',
  },
]

export const mockRecommendations: EloRecommendation[] = [
  {
    id: 'rec-1',
    type: 'earn',
    title: 'A 5 iCoin GPS offer is nearby and expires today.',
    body: 'You usually complete GPS offers successfully. This one is 0.4 miles away and expires in 2 hours.',
    reasonCodes: ['high_user_success_rate_gps', 'nearby_offer', 'expires_today'],
    confidence: 0.86,
    urgency: 'medium',
    targetScreen: 'earn',
    requiresPermission: true,
  },
  {
    id: 'rec-2',
    type: 'trust',
    title: 'You are close to Trust Tier 3.',
    body: 'Waiting a little longer can improve conversion quality and payout speed.',
    reasonCodes: ['trust_tier_progress_high'],
    confidence: 0.8,
    urgency: 'medium',
    targetScreen: 'wallet',
    requiresPermission: true,
  },
  {
    id: 'rec-3',
    type: 'creator',
    title: 'This creator performs well with your audience.',
    body: 'Save @citybuilds for future campaign drafts and studio inspiration.',
    reasonCodes: ['high_creator_affinity'],
    confidence: 0.84,
    urgency: 'low',
    targetScreen: 'profile',
    requiresPermission: false,
  },
]

export const mockMessages: EloMessage[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    content: 'Your best move today is a nearby GPS offer worth 5 iCoins before it expires.',
    createdAt: '2026-04-28T10:00:00.000Z',
  },
]

export const mockNotifications: EloNotification[] = [
  {
    id: 'note-1',
    type: 'opportunity',
    title: 'Nearby verified offer',
    body: '5 iCoins available nearby for the next 2 hours.',
    score: 0.88,
  },
]

export const DEMO_PUBLISHED_PERSONALITIES: PersonalityPublishDraft[] = [
  {
    id: 'pub-maya',
    authorLabel: 'Professor Maya',
    title: 'Teaching clarity',
    description: 'Calm mentor stack for learning sessions',
    stack: {
      ...DEFAULT_ELO_STACK,
      layers: [{ id: 'l1', presetId: 'mentor', role: 'primary', weight: 1 }],
      relationshipMode: 'teacher',
    },
    remixCount: 1240,
    adoptedCount: 8900,
  },
  {
    id: 'pub-focus',
    authorLabel: 'Focus Lab',
    title: 'Deep work companion',
    description: 'Monk-mode discipline for productivity',
    stack: {
      ...DEFAULT_ELO_STACK,
      layers: [
        { id: 'l1', presetId: 'strategist', role: 'primary', weight: 0.7 },
        { id: 'l2', presetId: 'aggressive_coach', role: 'discipline', weight: 0.3 },
      ],
      operatingMode: 'monk',
      relationshipMode: 'trainer',
    },
    remixCount: 560,
    adoptedCount: 3200,
  },
  {
    id: 'pub-ava',
    authorLabel: 'Ava Studio',
    title: 'Creative muse',
    description: 'Artist energy with warm companion framing',
    stack: {
      ...DEFAULT_ELO_STACK,
      layers: [
        { id: 'l1', presetId: 'artist', role: 'creative', weight: 0.6 },
        { id: 'l2', presetId: 'friend', role: 'emotional', weight: 0.4 },
      ],
      operatingMode: 'artist',
      relationshipMode: 'muse',
    },
    remixCount: 2100,
    adoptedCount: 15400,
  },
]

export const mockSharedPresenceMemory: SharedPresenceMemory = {
  id: 'shared-1',
  participantIds: ['user-1', 'user-friend'],
  ivatarId: 'elo-shared',
  thread: [
    {
      id: 't1',
      authorId: 'user-1',
      content: 'Started the focus room together',
      createdAt: '2026-05-20T10:00:00.000Z',
    },
    {
      id: 't2',
      authorId: 'user-friend',
      content: 'ELO remembered our project deadline',
      createdAt: '2026-05-20T11:00:00.000Z',
    },
  ],
}
