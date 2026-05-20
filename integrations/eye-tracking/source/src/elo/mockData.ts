import type {
  EloContextSnapshot,
  EloMemory,
  EloMessage,
  EloNotification,
  EloPermission,
  EloProfile,
  EloRecommendation,
} from './types';

export const mockEloProfile: EloProfile = {
  id: 'elo-profile-1',
  userId: 'user-1',
  eloEnabled: true,
  memoryEnabled: true,
  proactiveEnabled: true,
  automationEnabled: false,
  tone: 'clear',
};

export const mockWalletState = {
  spendable: 124.3,
  pending: 83.0,
  conversionRate: 1.08,
  payoutReadiness: 'blocked_identity',
  pendingLikelyClearingToday: 2,
  failedVerificationReason: 'incomplete_attention',
};

export const mockTrustState = {
  score: 72,
  tier: 2,
  nextTier: 3,
  progressToNextTier: 0.84,
  unlockHint: 'Sustain sessions above 70% attention quality.',
};

export const mockEarningHistory = {
  bestCategory: 'GPS check-ins',
  rewardPerVerifiedMinute: 0.44,
  weekTotal: 34.7,
};

export const mockNearbyOffer = {
  id: 'offer-gps-5',
  title: 'Local coffee partner check-in',
  reward: 5,
  distanceMiles: 0.4,
  expiresInHours: 2,
};

export const mockCreatorInsight = {
  creator: '@citybuilds',
  affinity: 0.88,
  recommendation: 'This creator consistently drives your completion quality.',
};

export const mockContentPreference = {
  preferredLengthSeconds: [18, 35],
  preferredCategories: ['local missions', 'how-to creators'],
  skippedCategories: ['long watch offers'],
};

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
];

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
];

export const mockRecommendations: EloRecommendation[] = [
  {
    id: 'rec-1',
    type: 'earn',
    title: 'A 5 iCoin GPS offer is nearby and expires today.',
    body: 'You usually complete GPS offers successfully. This one is 0.4 miles away and expires in 2 hours.',
    reasonCodes: ['high_user_success_rate_gps', 'nearby_offer', 'expires_today', 'above_average_reward'],
    confidence: 0.86,
    urgency: 'medium',
    targetScreen: 'earn',
    requiresPermission: true,
  },
  {
    id: 'rec-2',
    type: 'trust',
    title: 'You are close to Trust Tier 3. Conversion improves after unlock.',
    body: 'Waiting a little longer can improve conversion quality and payout speed.',
    reasonCodes: ['trust_tier_progress_high', 'conversion_rate_unlock'],
    confidence: 0.8,
    urgency: 'medium',
    targetScreen: 'wallet',
    requiresPermission: true,
  },
  {
    id: 'rec-3',
    type: 'earn',
    title: 'Your best earning category this week is GPS check-ins.',
    body: 'You averaged 0.44 iCoins per verified minute in this category.',
    reasonCodes: ['best_category_gps', 'high_time_efficiency'],
    confidence: 0.91,
    urgency: 'low',
    targetScreen: 'earn',
    requiresPermission: false,
  },
  {
    id: 'rec-4',
    type: 'safety',
    title: 'This withdrawal is blocked until identity is verified.',
    body: 'ELO can guide you through verification, then retry the withdrawal flow.',
    reasonCodes: ['identity_blocker', 'wallet_safety'],
    confidence: 0.96,
    urgency: 'high',
    targetScreen: 'wallet',
    requiresPermission: false,
  },
  {
    id: 'rec-5',
    type: 'safety',
    title: 'Your failed verification was caused by incomplete attention.',
    body: 'Short breaks improve pass rates. Try again after a reset.',
    reasonCodes: ['verification_failure_pattern', 'attention_drop'],
    confidence: 0.89,
    urgency: 'medium',
    targetScreen: 'feed',
    requiresPermission: false,
  },
  {
    id: 'rec-6',
    type: 'creator',
    title: 'This creator performs well with your audience.',
    body: 'Save @citybuilds for future campaign drafts and studio inspiration.',
    reasonCodes: ['high_creator_affinity', 'high_conversion_likelihood'],
    confidence: 0.84,
    urgency: 'low',
    targetScreen: 'studio',
    requiresPermission: false,
  },
];

export const mockMessages: EloMessage[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    content: 'Your best move today is a nearby GPS offer worth 5 iCoins before it expires.',
    createdAt: '2026-04-28T10:00:00.000Z',
  },
  {
    id: 'msg-2',
    role: 'user',
    content: 'Why is my withdrawal blocked?',
    createdAt: '2026-04-28T10:01:00.000Z',
  },
  {
    id: 'msg-3',
    role: 'assistant',
    content: 'Identity verification is incomplete. I can walk you through the fastest path now.',
    createdAt: '2026-04-28T10:01:10.000Z',
  },
];

export const mockContextSnapshot: EloContextSnapshot = {
  id: 'ctx-1',
  userId: 'user-1',
  sessionId: 'session-1',
  screen: 'wallet',
  context: {
    currentScreen: 'wallet',
    wallet: mockWalletState,
    trust: mockTrustState,
    activeOfferId: mockNearbyOffer.id,
  },
  createdAt: '2026-04-28T10:03:00.000Z',
};

export const mockNotifications: EloNotification[] = [
  {
    id: 'note-1',
    type: 'opportunity',
    title: 'Nearby verified offer',
    body: '5 iCoins available nearby for the next 2 hours.',
    score: 0.88,
  },
];

