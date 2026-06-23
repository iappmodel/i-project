/* ─── [ i ] Investor Demo — deterministic mock data ─────────────────────────
 * All data here is simulated. No real money, no real wallets, no real users.
 * ─────────────────────────────────────────────────────────────────────────── */

export type InvestorView =
  | 'splash'
  | 'feed'
  | 'offerDetail'
  | 'watchVerify'
  | 'reward'
  | 'wallet'
  | 'convert'
  | 'tip'
  | 'pay'
  | 'withdraw'
  | 'promo'
  | 'connectPlatforms'
  | 'campaignPreview'
  | 'studioPreview'
  | 'unifiedProfile'
  | 'acoins'
  | 'popLive'

export interface FeedItem {
  id: string
  type: 'organic' | 'sponsored'
  brand: string
  creatorHandle: string
  platform: string
  caption: string
  rewardAmount: number | null
  rewardCurrency: 'iCoins' | null
  duration: number | null
  requirements: string[]
  bgGradient: string
  avatarColor: string
  avatarInitials: string
  earnLabel: string | null
}

export interface VerificationGate {
  id: string
  label: string
  sublabel: string
  completesAtProgress: number
  completed: boolean
}

export interface InvestorTransaction {
  id: string
  source: string
  timeLabel: string
  amountDisplay: string
  kind: 'positive' | 'negative' | 'pending' | 'neutral'
  txType?: 'reward' | 'convert' | 'withdraw' | 'tip' | 'pay' | 'promo'
}

export interface PresenterStep {
  index: number
  view: InvestorView
  title: string
  bullets: string[]
}

// ─── Feed items (3: 1 organic, 2 sponsored) ───────────────────────────────

export const FEED_ITEMS: FeedItem[] = [
  {
    id: 'organic-melodymae',
    type: 'organic',
    brand: 'Melody Mae',
    creatorHandle: '@melodymae',
    platform: 'YouTube',
    caption: 'New acoustic cover dropping this weekend 🎸 Come hang in the livestream',
    rewardAmount: null,
    rewardCurrency: null,
    duration: null,
    requirements: [],
    bgGradient: 'linear-gradient(160deg, #0a1c17 0%, #061210 55%, #050d0a 100%)',
    avatarColor: '#1D9E75',
    avatarInitials: 'MM',
    earnLabel: null,
  },
  {
    id: 'sponsored-nike',
    type: 'sponsored',
    brand: 'Nike',
    creatorHandle: '@runwithkai',
    platform: 'Instagram',
    caption: 'Air Max 2025 launch — watch 6 seconds and earn your reward',
    rewardAmount: 0.25,
    rewardCurrency: 'iCoins',
    duration: 6,
    requirements: [
      'Watch 6 seconds of content',
      'Verified attention (5 gates)',
      'No fraud signals detected',
    ],
    bgGradient: 'linear-gradient(160deg, #0d1a2e 0%, #091020 55%, #060a18 100%)',
    avatarColor: '#ff4d6d',
    avatarInitials: 'NK',
    earnLabel: '0.25 iCoins',
  },
  {
    id: 'sponsored-marios',
    type: 'sponsored',
    brand: "Mario's Pizza",
    creatorHandle: '@mariospizza',
    platform: 'TikTok',
    caption: 'Free Truffle Margherita — check in at any location to claim your slice 🍕',
    rewardAmount: 1.0,
    rewardCurrency: 'iCoins',
    duration: 10,
    requirements: [
      'Watch 10 seconds of content',
      'GPS check-in at location',
      'Verified attention',
    ],
    bgGradient: 'linear-gradient(160deg, #1a0d04 0%, #120800 55%, #090400 100%)',
    avatarColor: '#f59e0b',
    avatarInitials: 'MP',
    earnLabel: '1.00 iCoins',
  },
]

// ─── Verification gates (5) ────────────────────────────────────────────────

/** Default sponsored offer for presenter jumps and demo loop */
export const DEFAULT_DEMO_OFFER_ID = 'sponsored-nike'

export const INITIAL_GATES: Omit<VerificationGate, 'completed'>[] = [
  {
    id: 'face',
    label: 'Face present',
    sublabel: 'Biometric signal detected',
    completesAtProgress: 0.12,
  },
  {
    id: 'eyes',
    label: 'Eyes open',
    sublabel: 'Gaze active & unobstructed',
    completesAtProgress: 0.28,
  },
  {
    id: 'gaze',
    label: 'Gaze forward',
    sublabel: 'On-screen attention locked',
    completesAtProgress: 0.44,
  },
  {
    id: 'time',
    label: 'Time watched',
    sublabel: 'Minimum view duration met',
    completesAtProgress: 0.62,
  },
  {
    id: 'fraud',
    label: 'Fraud check',
    sublabel: 'Session integrity verified',
    completesAtProgress: 0.82,
  },
]

export function freshGates(): VerificationGate[] {
  return INITIAL_GATES.map((g) => ({ ...g, completed: false }))
}

// ─── Seed transactions ─────────────────────────────────────────────────────

export const SEED_TRANSACTIONS: InvestorTransaction[] = [
  {
    id: 'tx-seed-3',
    source: 'Spotify · Audio Ad',
    timeLabel: '2h ago',
    amountDisplay: '+0.15 iCoins',
    kind: 'positive',
  },
  {
    id: 'tx-seed-2',
    source: 'Duolingo · App Offer',
    timeLabel: 'Yesterday',
    amountDisplay: '+0.50 iCoins',
    kind: 'positive',
  },
  {
    id: 'tx-seed-1',
    source: 'Withdraw preview · Simulated',
    timeLabel: '3 days ago',
    amountDisplay: '−0.50 iCoins',
    kind: 'negative',
  },
]

// ─── Presenter steps ───────────────────────────────────────────────────────

export const PRESENTER_STEPS: PresenterStep[] = [
  {
    index: 0,
    view: 'splash',
    title: 'The premise',
    bullets: [
      'Attention is a trillion-dollar economy that has never had a ledger.',
      '[ i ] is the ledger — verified attention becomes usable wallet value.',
      'No ad fraud. No estimated impressions. Only cryptographic proof.',
    ],
  },
  {
    index: 1,
    view: 'feed',
    title: 'Attention starts inside media',
    bullets: [
      'The feed is immersive — full-bleed media with sponsored offers embedded naturally.',
      "The wallet chip shows the user's live balance at all times.",
      'The reward badge signals: your attention has a price here.',
    ],
  },
  {
    index: 2,
    view: 'offerDetail',
    title: 'The user sees the value before the task',
    bullets: [
      'The offer is explicit: watch this, earn this amount.',
      'Requirements are transparent — duration, gates, verification.',
      'Trust is built before the user commits any attention.',
    ],
  },
  {
    index: 3,
    view: 'watchVerify',
    title: 'POP converts attention into proof',
    bullets: [
      'POP (Proof of Presence) runs 5 gates: face, eyes, gaze, time, fraud.',
      'This demo simulates gaze — no camera access required here.',
      'All 5 gates must pass. Any failure voids the reward.',
    ],
  },
  {
    index: 4,
    view: 'reward',
    title: 'The reward moment closes the loop',
    bullets: [
      'Verified attention is converted to wallet value — instantly.',
      'The reward reveal is the emotional payoff of Loop 1.',
      "Every completion strengthens the user's trust tier and limits.",
    ],
  },
  {
    index: 5,
    view: 'wallet',
    title: 'Verified value becomes usable balance',
    bullets: [
      'The wallet is the economic hub: verified iCoins, pending, and lifetime earnings.',
      'Investors see balances update in real time as attention is verified.',
      'Convert, withdraw, pay, and tip all start from here.',
    ],
  },
  {
    index: 6,
    view: 'convert',
    title: 'Convert verified attention',
    bullets: [
      'Verified iCoins become usable wallet value.',
      'Conversion is simulated here; no real financial movement.',
      'This proves the bridge from attention proof to spendable utility.',
    ],
  },
  {
    index: 7,
    view: 'wallet',
    title: 'Spendable utility unlocked',
    bullets: [
      'After conversion, usable balance is ready for in-app spend.',
      'Loop 1 is complete: Watch → Verify → Reward → Wallet → Convert.',
      'Withdraw, pay, and tip extend the story in the full walkthrough.',
    ],
  },
]

// ─── Baseline wallet values ────────────────────────────────────────────────

export const BASELINE_WALLET = {
  walletBalance: 3.65,
  usableBalance: 1.20,
  pendingBalance: 2.25,
  lifetimeEarned: 14.2,
} as const

/** Demo conversion: 1 verified iCoin → 1 usable iCoin, zero fee */
export const CONVERT_RATE = 1
export const CONVERT_FEE_RATE = 0
export const CONVERT_TRUST_TIER = 'Tier 2'
export const CONVERT_TRUST_MULTIPLIER = 1

/** Default creator for tip flow (from organic feed) */
export const DEFAULT_TIP_CREATOR = {
  name: 'Melody Mae',
  handle: '@melodymae',
  initials: 'MM',
  color: '#1D9E75',
  platform: 'YouTube',
} as const

/** Preset tip amounts in iCoins */
export const TIP_PRESETS = [0.1, 0.25, 0.5, 1.0] as const

export const TIP_FEE_RATE = 0

// ─── Pay & Withdraw ──────────────────────────────────────────────────────────

export type PayMode = 'tap' | 'qr' | 'link'
export type WithdrawMethod = 'standard' | 'fast' | 'external'

export const DEFAULT_PAY_MERCHANT = {
  name: "Mario's Pizza",
  subtitle: 'Local merchant · simulated',
  initials: 'MP',
  color: '#ffb300',
} as const

export const PAY_MODE_OPTIONS: { id: PayMode; label: string; icon: string }[] = [
  { id: 'tap', label: 'Tap', icon: '◎' },
  { id: 'qr', label: 'QR', icon: '▦' },
  { id: 'link', label: 'Link', icon: '↗' },
]

export const WITHDRAW_METHOD_OPTIONS: {
  id: WithdrawMethod
  label: string
  sublabel: string
}[] = [
  { id: 'standard', label: 'Standard', sublabel: 'No fee · simulated' },
  { id: 'fast', label: 'Fast', sublabel: '0.02 iC fee' },
  { id: 'external', label: 'External wallet', sublabel: '0.01 iC fee' },
]

export const PAY_PRESETS = [0.5, 1.0, 2.5, 5.0] as const
export const WITHDRAW_PRESETS = [0.25, 0.5, 1.0, 2.0] as const

export function withdrawFee(method: WithdrawMethod): number {
  switch (method) {
    case 'standard':
      return 0
    case 'fast':
      return 0.02
    case 'external':
      return 0.01
  }
}

export function withdrawMethodLabel(method: WithdrawMethod): string {
  switch (method) {
    case 'standard':
      return 'Standard'
    case 'fast':
      return 'Fast'
    case 'external':
      return 'External wallet'
  }
}

export function payModeLabel(mode: PayMode): string {
  switch (mode) {
    case 'tap':
      return 'Tap'
    case 'qr':
      return 'QR'
    case 'link':
      return 'Link'
  }
}

// ─── Promo / iGo ─────────────────────────────────────────────────────────────

export type PromoStatus = 'available' | 'started' | 'verified' | 'claimed'

export interface PromoOffer {
  id: string
  merchantName: string
  actionType: string
  rewardAmount: number
  distanceLabel: string
  instruction: string
  initials: string
  color: string
}

export const PROMO_OFFERS: PromoOffer[] = [
  {
    id: 'marios-pizza',
    merchantName: "Mario's Pizza",
    actionType: 'Check in',
    rewardAmount: 0.4,
    distanceLabel: '0.2 mi · simulated',
    instruction: 'Tap start, then confirm you are at the venue · demo only',
    initials: 'MP',
    color: '#ff4d6d',
  },
  {
    id: 'nova-gym',
    merchantName: 'Nova Gym',
    actionType: 'Visit',
    rewardAmount: 0.65,
    distanceLabel: '0.5 mi · simulated',
    instruction: 'Complete a simulated visit window · no GPS used',
    initials: 'NG',
    color: '#378ADD',
  },
  {
    id: 'bloom-coffee',
    merchantName: 'Bloom Coffee',
    actionType: 'Scan receipt',
    rewardAmount: 0.3,
    distanceLabel: '0.1 mi · simulated',
    instruction: 'Receipt scan is mocked — no camera or merchant API',
    initials: 'BC',
    color: '#1D9E75',
  },
  {
    id: 'studiopop',
    merchantName: 'StudioPop',
    actionType: 'Attend',
    rewardAmount: 1.2,
    distanceLabel: '0.8 mi · simulated',
    instruction: 'Simulated event attendance check · investor preview',
    initials: 'SP',
    color: '#EF9F27',
  },
]

export const PROMO_VERIFICATION_CHECKS = [
  { id: 'presence', label: 'Presence window', sublabel: 'Simulated proximity' },
  { id: 'action', label: 'Action matched', sublabel: 'Demo action type' },
  { id: 'fraud', label: 'Fraud screen', sublabel: 'Mock integrity pass' },
  { id: 'eligible', label: 'Reward eligible', sublabel: 'Ready to claim' },
] as const

export function baselinePromoStatus(): Record<string, PromoStatus> {
  return Object.fromEntries(PROMO_OFFERS.map((o) => [o.id, 'available' as PromoStatus]))
}

export function cloneBaselinePromoStatus(): Record<string, PromoStatus> {
  return { ...baselinePromoStatus() }
}

export function getPromoOffer(promoId: string): PromoOffer | undefined {
  return PROMO_OFFERS.find((o) => o.id === promoId)
}

export function promoStatusLabel(status: PromoStatus): string {
  switch (status) {
    case 'available':
      return 'Available'
    case 'started':
      return 'In progress'
    case 'verified':
      return 'Verified'
    case 'claimed':
      return 'Claimed'
  }
}

// ─── Connect Platforms ─────────────────────────────────────────────────────

export interface PlatformConnection {
  id: string
  name: string
  initials: string
  color: string
  /** Demo handle when connected */
  handle: string | null
  connected: boolean
  contentCount: number
}

const PLATFORM_HANDLES: Record<string, string> = {
  youtube: '@melodymae',
  tiktok: '@melodymae',
  instagram: '@melodymae',
  twitch: '@melodymae_live',
}

export function baselinePlatforms(): PlatformConnection[] {
  return [
    {
      id: 'youtube',
      name: 'YouTube',
      initials: 'YT',
      color: '#cc0000',
      handle: PLATFORM_HANDLES.youtube,
      connected: true,
      contentCount: 24,
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      initials: 'TT',
      color: '#111118',
      handle: null,
      connected: false,
      contentCount: 0,
    },
    {
      id: 'instagram',
      name: 'Instagram',
      initials: 'IG',
      color: '#c13584',
      handle: null,
      connected: false,
      contentCount: 0,
    },
    {
      id: 'twitch',
      name: 'Twitch',
      initials: 'TW',
      color: '#9146ff',
      handle: null,
      connected: false,
      contentCount: 0,
    },
  ]
}

export function connectPlatformHandle(platformId: string): string {
  return PLATFORM_HANDLES[platformId] ?? `@${platformId}_demo`
}

export function cloneBaselinePlatforms(): PlatformConnection[] {
  return baselinePlatforms().map((p) => ({ ...p }))
}

// ─── Unified Creator Profile ─────────────────────────────────────────────────

export type ProfilePlatformFilter = 'all' | 'youtube' | 'tiktok' | 'instagram' | 'twitch'
export type ProfilePlatformId = Exclude<ProfilePlatformFilter, 'all'>

export interface UnifiedProfileContent {
  id: string
  platformId: ProfilePlatformId
  title: string
  viewsLabel: string
  rewardReady: boolean
  gradient: string
}

export const UNIFIED_PROFILE_CREATOR = {
  ...DEFAULT_TIP_CREATOR,
  bio: 'Acoustic creator · cross-platform rewards · demo profile',
} as const

export const PROFILE_PLATFORM_FILTERS: { id: ProfilePlatformFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'twitch', label: 'Twitch' },
]

const PLATFORM_META: Record<
  ProfilePlatformId,
  { initials: string; color: string; name: string }
> = {
  youtube: { initials: 'YT', color: '#cc0000', name: 'YouTube' },
  tiktok: { initials: 'TT', color: '#111118', name: 'TikTok' },
  instagram: { initials: 'IG', color: '#c13584', name: 'Instagram' },
  twitch: { initials: 'TW', color: '#9146ff', name: 'Twitch' },
}

export function profilePlatformMeta(platformId: ProfilePlatformId) {
  return PLATFORM_META[platformId]
}

export const UNIFIED_PROFILE_CONTENT: UnifiedProfileContent[] = [
  {
    id: 'yt-live-session',
    platformId: 'youtube',
    title: 'Live acoustic set',
    viewsLabel: '24.1K',
    rewardReady: true,
    gradient: 'linear-gradient(160deg, #1a0a0a 0%, #2d1515 100%)',
  },
  {
    id: 'yt-cover-vlog',
    platformId: 'youtube',
    title: 'Sunday cover vlog',
    viewsLabel: '18.6K',
    rewardReady: true,
    gradient: 'linear-gradient(160deg, #0d1a2e 0%, #091020 100%)',
  },
  {
    id: 'yt-studio-clip',
    platformId: 'youtube',
    title: 'Studio warm-up',
    viewsLabel: '9.2K',
    rewardReady: false,
    gradient: 'linear-gradient(160deg, #0a1c17 0%, #061210 100%)',
  },
  {
    id: 'tt-hook-01',
    platformId: 'tiktok',
    title: 'Hook · earn loop',
    viewsLabel: '142K',
    rewardReady: true,
    gradient: 'linear-gradient(160deg, #12121a 0%, #1a1028 100%)',
  },
  {
    id: 'tt-duet',
    platformId: 'tiktok',
    title: 'Duet challenge',
    viewsLabel: '88K',
    rewardReady: true,
    gradient: 'linear-gradient(160deg, #0f1419 0%, #0a1018 100%)',
  },
  {
    id: 'tt-bts',
    platformId: 'tiktok',
    title: 'Behind the scenes',
    viewsLabel: '31K',
    rewardReady: false,
    gradient: 'linear-gradient(160deg, #181818 0%, #101010 100%)',
  },
  {
    id: 'ig-reel-promo',
    platformId: 'instagram',
    title: 'Reel · brand fit',
    viewsLabel: '12.4K',
    rewardReady: true,
    gradient: 'linear-gradient(160deg, #2a1020 0%, #1a0818 100%)',
  },
  {
    id: 'ig-story',
    platformId: 'instagram',
    title: 'Story highlights',
    viewsLabel: '6.8K',
    rewardReady: false,
    gradient: 'linear-gradient(160deg, #1f1530 0%, #120d20 100%)',
  },
  {
    id: 'ig-carousel',
    platformId: 'instagram',
    title: 'Tour carousel',
    viewsLabel: '4.1K',
    rewardReady: true,
    gradient: 'linear-gradient(160deg, #201a10 0%, #141008 100%)',
  },
  {
    id: 'tw-stream',
    platformId: 'twitch',
    title: 'Stream highlight',
    viewsLabel: '3.2K',
    rewardReady: true,
    gradient: 'linear-gradient(160deg, #1a1030 0%, #100820 100%)',
  },
  {
    id: 'tw-clip',
    platformId: 'twitch',
    title: 'Chat reaction clip',
    viewsLabel: '1.9K',
    rewardReady: false,
    gradient: 'linear-gradient(160deg, #141428 0%, #0c0c18 100%)',
  },
  {
    id: 'tw-vod',
    platformId: 'twitch',
    title: 'VOD segment',
    viewsLabel: '980',
    rewardReady: true,
    gradient: 'linear-gradient(160deg, #18122a 0%, #0e0a16 100%)',
  },
]

export interface UnifiedProfileStats {
  connectedCount: number
  importedPosts: number
  attentionValue: number
}

export function computeUnifiedProfileStats(
  connections: PlatformConnection[],
  content: UnifiedProfileContent[],
): UnifiedProfileStats {
  const connectedIds = new Set(
    connections.filter((p) => p.connected).map((p) => p.id as ProfilePlatformId),
  )
  const connectedCount = connectedIds.size
  const importedPosts = connections
    .filter((p) => p.connected)
    .reduce((sum, p) => sum + p.contentCount, 0)
  const unlocked = content.filter((c) => connectedIds.has(c.platformId))
  const rewardReady = unlocked.filter((c) => c.rewardReady).length
  const attentionValue = +(rewardReady * 0.35 + unlocked.length * 0.08).toFixed(2)
  return { connectedCount, importedPosts, attentionValue }
}

export function filterUnifiedProfileContent(
  content: UnifiedProfileContent[],
  filter: ProfilePlatformFilter,
): UnifiedProfileContent[] {
  if (filter === 'all') return content
  return content.filter((c) => c.platformId === filter)
}

export function isProfileContentLocked(
  platformId: ProfilePlatformId,
  connections: PlatformConnection[],
): boolean {
  return !connections.some((p) => p.id === platformId && p.connected)
}

export function baselineProfileFilter(): ProfilePlatformFilter {
  return 'all'
}

// ─── Campaign Builder Preview ────────────────────────────────────────────────

export type CampaignAction = 'follow' | 'visit' | 'shop' | 'custom'
export type CampaignStatus = 'draft' | 'published'
export type VerificationStrictness = 'light' | 'standard' | 'strict'

export interface CampaignGates {
  watchTime: boolean
  gazeForward: boolean
  fraudCheck: boolean
  actionConfirmation: boolean
}

export type CampaignGateId = keyof CampaignGates

export interface CampaignPreviewState {
  campaignStatus: CampaignStatus
  selectedAction: CampaignAction
  customActionLabel: string
  selectedReward: number
  budgetCap: number
  verificationStrictness: VerificationStrictness
  enabledGates: CampaignGates
}

export const CAMPAIGN_ACTION_PRESETS: {
  id: CampaignAction
  label: string
  hint: string
  color: string
}[] = [
  { id: 'follow', label: 'Follow', hint: 'creator', color: '#1D9E75' },
  { id: 'visit', label: 'Visit', hint: 'location', color: '#EF9F27' },
  { id: 'shop', label: 'Shop', hint: 'purchase', color: '#378ADD' },
  { id: 'custom', label: 'Custom', hint: 'write it', color: 'rgba(255,255,255,0.38)' },
]

export const CAMPAIGN_REWARD_PRESETS = [0.15, 0.25, 0.5, 1.0] as const

export const CAMPAIGN_STRICTNESS_OPTIONS: {
  id: VerificationStrictness
  label: string
  sublabel: string
}[] = [
  { id: 'light', label: 'Light', sublabel: 'watch + action' },
  { id: 'standard', label: 'Standard', sublabel: 'recommended' },
  { id: 'strict', label: 'Strict', sublabel: 'full POP stack' },
]

export const CAMPAIGN_GATE_DEFS: {
  id: CampaignGateId
  label: string
  sublabel: string
}[] = [
  { id: 'watchTime', label: 'Watch time', sublabel: 'Minimum view duration' },
  { id: 'gazeForward', label: 'Gaze forward', sublabel: 'Eyes on screen' },
  { id: 'fraudCheck', label: 'Fraud check', sublabel: 'Bot / replay screening' },
  { id: 'actionConfirmation', label: 'Action confirmation', sublabel: 'CTA tap verified' },
]

export function gatesForStrictness(strictness: VerificationStrictness): CampaignGates {
  switch (strictness) {
    case 'light':
      return {
        watchTime: true,
        gazeForward: false,
        fraudCheck: false,
        actionConfirmation: true,
      }
    case 'standard':
      return {
        watchTime: true,
        gazeForward: true,
        fraudCheck: true,
        actionConfirmation: true,
      }
    case 'strict':
      return {
        watchTime: true,
        gazeForward: true,
        fraudCheck: true,
        actionConfirmation: true,
      }
  }
}

export function baselineCampaign(): CampaignPreviewState {
  return {
    campaignStatus: 'draft',
    selectedAction: 'follow',
    customActionLabel: '',
    selectedReward: 0.25,
    budgetCap: 50,
    verificationStrictness: 'standard',
    enabledGates: gatesForStrictness('standard'),
  }
}

export function cloneBaselineCampaign(): CampaignPreviewState {
  const base = baselineCampaign()
  return { ...base, enabledGates: { ...base.enabledGates } }
}

export function campaignActionLabel(
  action: CampaignAction,
  customLabel: string,
): string {
  switch (action) {
    case 'follow':
      return 'Follow'
    case 'visit':
      return 'Visit'
    case 'shop':
      return 'Shop Now'
    case 'custom':
      return customLabel.trim() || 'Custom action'
  }
}

export interface CampaignEconomics {
  viewerReward: number
  creatorShare: number
  platformFee: number
  estimatedVerifiedViews: number
}

/** Deterministic mock economics — no real ad spend. */
export function computeCampaignEconomics(
  reward: number,
  budgetCap: number,
): CampaignEconomics {
  const viewerReward = reward
  const creatorShare = +(reward * 0.15).toFixed(3)
  const platformFee = +(reward * 0.05).toFixed(3)
  const costPerView = +(viewerReward + creatorShare + platformFee).toFixed(3)
  const estimatedVerifiedViews = Math.max(
    1,
    Math.floor(budgetCap / Math.max(costPerView, 0.01)),
  )
  return { viewerReward, creatorShare, platformFee, estimatedVerifiedViews }
}

// ─── Studio Preview ──────────────────────────────────────────────────────────

export type StudioFormat = '9:16' | '1:1' | '16:9'
export type StudioCta = 'follow' | 'visit' | 'shop' | 'learn'
export type StudioStatus = 'draft' | 'preview_ready'

export interface StudioClip {
  id: string
  label: string
  duration: string
  color: string
  startPct: number
  widthPct: number
}

export interface StudioPreviewState {
  selectedClipId: string
  captionsEnabled: boolean
  rewardOverlayEnabled: boolean
  studioCta: StudioCta
  studioFormat: StudioFormat
  studioStatus: StudioStatus
}

export const STUDIO_CLIPS: StudioClip[] = [
  { id: 'intro', label: 'Intro', duration: '0:06', color: '#378ADD', startPct: 0, widthPct: 22 },
  { id: 'hook', label: 'Hook', duration: '0:12', color: '#EF9F27', startPct: 24, widthPct: 38 },
  { id: 'cta', label: 'CTA', duration: '0:06', color: '#1D9E75', startPct: 66, widthPct: 28 },
]

export const STUDIO_CTA_OPTIONS: { id: StudioCta; label: string }[] = [
  { id: 'follow', label: 'Follow' },
  { id: 'visit', label: 'Visit' },
  { id: 'shop', label: 'Shop' },
  { id: 'learn', label: 'Learn More' },
]

export const STUDIO_FORMAT_OPTIONS: { id: StudioFormat; label: string }[] = [
  { id: '9:16', label: '9:16' },
  { id: '1:1', label: '1:1' },
  { id: '16:9', label: '16:9' },
]

export function baselineStudio(): StudioPreviewState {
  return {
    selectedClipId: 'hook',
    captionsEnabled: true,
    rewardOverlayEnabled: true,
    studioCta: 'follow',
    studioFormat: '9:16',
    studioStatus: 'draft',
  }
}

export function cloneBaselineStudio(): StudioPreviewState {
  return { ...baselineStudio() }
}

export function studioCtaLabel(cta: StudioCta): string {
  return STUDIO_CTA_OPTIONS.find((o) => o.id === cta)?.label ?? cta
}

export function studioStatusLabel(status: StudioStatus): string {
  return status === 'preview_ready' ? 'Preview ready · Simulated' : 'Draft · Simulated'
}

/** Map studio CTA selection into campaign builder action fields. */
export function studioCtaToCampaign(cta: StudioCta): {
  action: CampaignAction
  customLabel: string
} {
  switch (cta) {
    case 'follow':
      return { action: 'follow', customLabel: '' }
    case 'visit':
      return { action: 'visit', customLabel: '' }
    case 'shop':
      return { action: 'shop', customLabel: '' }
    case 'learn':
      return { action: 'custom', customLabel: 'Learn More' }
  }
}

export function studioFormatAspect(format: StudioFormat): string {
  switch (format) {
    case '9:16':
      return '9 / 16'
    case '1:1':
      return '1 / 1'
    case '16:9':
      return '16 / 9'
  }
}

// ─── ACoins / Alphabet Currency ──────────────────────────────────────────────

export type ACoinsTab = 'overview' | 'flow' | 'ledger' | 'rules'

export type AlphabetUnitId =
  | 'attention'
  | 'creator'
  | 'icoin'
  | 'presence'
  | 'verified'
  | 'wallet'

export const ACOINS_TABS: { id: ACoinsTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'flow', label: 'Flow' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'rules', label: 'Rules' },
]

export const ALPHABET_UNITS: {
  id: AlphabetUnitId
  letter: string
  name: string
  description: string
  color: string
}[] = [
  {
    id: 'attention',
    letter: 'A',
    name: 'Attention',
    description: 'Verified human focus — the root value unit in demo',
    color: '#c8a84b',
  },
  {
    id: 'creator',
    letter: 'C',
    name: 'Creator',
    description: 'Supply-side participation and campaign funding layer',
    color: '#d46bb5',
  },
  {
    id: 'icoin',
    letter: 'I',
    name: 'iCoin',
    description: 'Platform value unit holding verified attention · simulated',
    color: '#4ade80',
  },
  {
    id: 'presence',
    letter: 'P',
    name: 'Presence',
    description: 'Location and action proofs in iGo · simulated',
    color: '#EF9F27',
  },
  {
    id: 'verified',
    letter: 'V',
    name: 'Verified',
    description: 'POP gates confirm attention before value moves',
    color: '#378ADD',
  },
  {
    id: 'wallet',
    letter: 'W',
    name: 'Wallet',
    description: 'Internal balance routes for pay, tip, withdraw previews',
    color: '#00e5ff',
  },
]

export const ACOINS_FLOW_STEPS = [
  { icon: '▶', label: 'Watch / Visit / Create', sub: 'Earn loops & creator supply' },
  { icon: '◎', label: 'POP verifies attention', sub: 'Simulated proof stack' },
  { icon: 'A', label: 'ACoins are generated', sub: 'Attention value units · demo' },
  { icon: 'iC', label: 'iCoins hold platform value', sub: 'Internal ledger layer' },
  { icon: '⇄', label: 'Convert unlocks usable', sub: 'Demo conversion · 1:1' },
  { icon: '→', label: 'Pay / Tip / Withdraw', sub: 'Spend routes · simulated' },
] as const

export const ACOINS_RULES = [
  'ACoins represent verified attention units in this demo — not real currency.',
  'iCoins are internal platform value units with no cash equivalent.',
  'POP verification is simulated; no blockchain or token is involved.',
  'Convert moves verified iCoins to usable balance at a demo 1:1 rate.',
  'Pay, Tip, and Withdraw only affect local simulated balances.',
  'No exchange rate, investment return, or guaranteed monetary value.',
] as const

export interface ACoinsSummary {
  verifiedAttention: number
  acoinsEarned: number
  icoinsAvailable: number
  usableBalance: number
}

export function computeACoinsSummary(
  walletBalance: number,
  usableBalance: number,
  lifetimeEarned: number,
): ACoinsSummary {
  return {
    verifiedAttention: walletBalance,
    acoinsEarned: lifetimeEarned,
    icoinsAvailable: walletBalance,
    usableBalance,
  }
}

export interface ACoinsLedgerRow {
  id: string
  label: string
  amountDisplay: string
  timeLabel: string
  kind: 'positive' | 'negative' | 'neutral' | 'empty'
}

export function acoinsLedgerPreview(
  transactions: InvestorTransaction[],
): ACoinsLedgerRow[] {
  const defs: {
    id: string
    label: string
    match: (tx: InvestorTransaction) => boolean
  }[] = [
    {
      id: 'watch',
      label: 'Watch reward',
      match: (tx) => tx.kind === 'positive' && tx.txType !== 'promo',
    },
    {
      id: 'igo',
      label: 'iGo reward',
      match: (tx) => tx.txType === 'promo',
    },
    {
      id: 'convert',
      label: 'Convert',
      match: (tx) => tx.txType === 'convert',
    },
    {
      id: 'tip',
      label: 'Tip',
      match: (tx) => tx.txType === 'tip',
    },
    {
      id: 'pay',
      label: 'Pay',
      match: (tx) => tx.txType === 'pay',
    },
    {
      id: 'withdraw',
      label: 'Withdraw',
      match: (tx) => tx.txType === 'withdraw',
    },
  ]

  return defs.map((def) => {
    const tx = transactions.find(def.match)
    if (!tx) {
      return {
        id: def.id,
        label: def.label,
        amountDisplay: '—',
        timeLabel: 'No activity · simulated',
        kind: 'empty',
      }
    }
    return {
      id: def.id,
      label: def.label,
      amountDisplay: tx.amountDisplay,
      timeLabel: tx.timeLabel,
      kind: tx.kind === 'pending' ? 'neutral' : tx.kind,
    }
  })
}

export function baselineACoinsTab(): ACoinsTab {
  return 'overview'
}

export function baselineAlphabetUnit(): AlphabetUnitId {
  return 'attention'
}

// ─── POP Live Tracking Demo ─────────────────────────────────────────────────

export type POPTrackingMode = 'simulated' | 'camera' | 'webgazer'

export type POPLiveTab = 'live' | 'signals' | 'timeline' | 'privacy'

export type POPLiveSignalId =
  | 'presence'
  | 'eyesOpen'
  | 'gazeOnContent'
  | 'headStable'
  | 'watchActive'
  | 'fraudClear'

export interface POPLiveSignalState {
  presence: boolean
  eyesOpen: boolean
  gazeOnContent: boolean
  headStable: boolean
  watchActive: boolean
  fraudClear: boolean
}

export interface POPLiveFrame {
  gazeX: number
  gazeY: number
  inZone: boolean
}

export type POPLiveEligibility = 'eligible' | 'recovering' | 'ineligible'

export type POPLiveDriftState = 'on_content' | 'drifting' | 'recovering'

export const POPLIVE_TABS: { id: POPLiveTab; label: string }[] = [
  { id: 'live', label: 'Live' },
  { id: 'signals', label: 'Signals' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'privacy', label: 'Privacy' },
]

export const POPLIVE_SIGNAL_DEFS: {
  id: POPLiveSignalId
  label: string
  sub: string
  icon: string
}[] = [
  { id: 'presence', label: 'Presence', sub: 'Session integrity · simulated', icon: '◎' },
  { id: 'eyesOpen', label: 'Eyes open', sub: 'Attention confidence · simulated', icon: '◉' },
  { id: 'gazeOnContent', label: 'Gaze on content', sub: 'Gaze estimate · simulated', icon: '◎' },
  { id: 'headStable', label: 'Head stable', sub: 'Pose stability · simulated', icon: '◇' },
  { id: 'watchActive', label: 'Watch active', sub: 'Playback session · simulated', icon: '▶' },
  { id: 'fraudClear', label: 'Fraud screen', sub: 'Integrity check · simulated', icon: '✓' },
]

export const POPLIVE_TIMELINE: {
  id: string
  label: string
  sub: string
}[] = [
  { id: 'offer', label: 'Offer opened', sub: 'Sponsored content context' },
  { id: 'watch', label: 'Watch started', sub: 'Session clock running' },
  { id: 'presence', label: 'Presence confirmed', sub: 'Proof-of-presence layer' },
  { id: 'attention', label: 'Attention maintained', sub: 'Gaze estimate in safe zone' },
  { id: 'action', label: 'Action completed', sub: 'Engagement gate passed' },
  { id: 'reward', label: 'Reward eligible', sub: 'Eligibility preview only' },
]

export const POPLIVE_PRIVACY_RULES: string[] = [
  'This is a simulated POP demo — no camera, biometric processing, or real sensor access.',
  'Gaze dots and signal cards are deterministic animations for investor presentation.',
  'Tracking adapter ready: simulated → camera → WebGazer (not enabled in this build).',
  'Reward eligibility shown here is a preview only — not a real fraud or payout decision.',
  'No face recognition, surveillance, or guaranteed bot prevention is performed.',
]

/** Attention-safe zone bounds (percent of theater) */
export const POPLIVE_SAFE_ZONE = {
  left: 22,
  top: 28,
  width: 56,
  height: 44,
}

export function baselinePOPLiveSignals(): POPLiveSignalState {
  return {
    presence: true,
    eyesOpen: true,
    gazeOnContent: true,
    headStable: true,
    watchActive: true,
    fraudClear: true,
  }
}

export function baselinePOPLiveTab(): POPLiveTab {
  return 'live'
}

export function baselinePOPLiveScore(): number {
  return 72
}

export function baselinePOPLiveEligibility(): POPLiveEligibility {
  return 'ineligible'
}

export function baselinePOPLiveDriftState(): POPLiveDriftState {
  return 'on_content'
}

export function baselinePOPLiveFrame(): POPLiveFrame {
  return { gazeX: 50, gazeY: 48, inZone: true }
}

export function isGazeInSafeZone(x: number, y: number): boolean {
  const z = POPLIVE_SAFE_ZONE
  return (
    x >= z.left &&
    x <= z.left + z.width &&
    y >= z.top &&
    y <= z.top + z.height
  )
}

/** Deterministic gaze path — mostly in zone, periodic drift, then recovery */
export function simulateGazeAtTick(tick: number): POPLiveFrame {
  const cycleLen = 140
  const cycle = (tick % cycleLen) / cycleLen
  const t = tick * 0.07

  if (cycle < 0.68) {
    const x = 50 + Math.sin(t) * 11 + Math.cos(t * 0.65) * 7
    const y = 48 + Math.cos(t * 1.05) * 9 + Math.sin(t * 0.48) * 5
    return { gazeX: x, gazeY: y, inZone: true }
  }

  if (cycle < 0.84) {
    const drift = (cycle - 0.68) / 0.16
    const x = 50 + Math.sin(t) * 11 + drift * 38
    const y = 48 + Math.cos(t) * 9 + drift * 28
    return { gazeX: x, gazeY: y, inZone: isGazeInSafeZone(x, y) }
  }

  const recover = (cycle - 0.84) / 0.16
  const edgeX = 50 + Math.sin(t) * 11 + 38
  const edgeY = 48 + Math.cos(t) * 9 + 28
  const x = edgeX + (50 - edgeX) * recover
  const y = edgeY + (48 - edgeY) * recover
  return { gazeX: x, gazeY: y, inZone: recover > 0.55 || isGazeInSafeZone(x, y) }
}

function signalsValid(signals: POPLiveSignalState): boolean {
  return (
    signals.presence &&
    signals.eyesOpen &&
    signals.gazeOnContent &&
    signals.headStable &&
    signals.watchActive &&
    signals.fraudClear
  )
}

export function computePOPLiveMetrics(
  frame: POPLiveFrame,
  signals: POPLiveSignalState,
  prevDrift: POPLiveDriftState,
  prevScore: number,
): {
  score: number
  eligibility: POPLiveEligibility
  driftState: POPLiveDriftState
} {
  const inZone = frame.inZone && signals.gazeOnContent
  let driftState: POPLiveDriftState

  if (inZone) {
    driftState = prevDrift === 'drifting' || prevDrift === 'recovering' ? 'recovering' : 'on_content'
  } else {
    driftState = 'drifting'
  }

  const targetHigh = signalsValid(signals) ? 92 : 84
  const targetLow = signals.fraudClear ? 52 : 38

  let score: number
  if (inZone) {
    const rise = driftState === 'recovering' ? 0.04 : 0.08
    score = Math.min(targetHigh, prevScore + rise * (targetHigh - prevScore) * 0.15 + 0.6)
    if (prevScore < 70) score = Math.max(score, 72)
  } else {
    const fall = 0.12
    score = Math.max(targetLow, prevScore - fall * (prevScore - targetLow) * 0.2 - 1.2)
    score = Math.min(score, 58)
  }

  score = Math.round(Math.max(38, Math.min(96, score)))

  let eligibility: POPLiveEligibility
  if (inZone && signalsValid(signals) && score >= 85 && driftState === 'on_content') {
    eligibility = 'eligible'
  } else if (driftState === 'recovering' || (inZone && score >= 78)) {
    eligibility = 'recovering'
  } else {
    eligibility = 'ineligible'
  }

  if (driftState === 'recovering' && score >= 88 && signalsValid(signals)) {
    driftState = 'on_content'
    eligibility = 'eligible'
  }

  return { score, eligibility, driftState }
}

export function popLiveRiskLabel(score: number): string {
  if (score >= 85) return 'Low'
  if (score >= 65) return 'Moderate'
  return 'Elevated'
}

export function popLiveAttentionLabel(drift: POPLiveDriftState): string {
  if (drift === 'on_content') return 'On content'
  if (drift === 'recovering') return 'Recovering'
  return 'Attention drift'
}

export type POPLiveTimelineStatus = 'done' | 'active' | 'drift' | 'pending'

export function popLiveTimelineStatuses(
  tick: number,
  driftState: POPLiveDriftState,
  eligibility: POPLiveEligibility,
): POPLiveTimelineStatus[] {
  const progress = Math.min(tick / 80, 1)
  const statuses: POPLiveTimelineStatus[] = []

  for (let i = 0; i < POPLIVE_TIMELINE.length; i++) {
    const threshold = (i + 1) / POPLIVE_TIMELINE.length
    if (progress < threshold - 0.34) {
      statuses.push('pending')
    } else if (i === 3 && driftState === 'drifting') {
      statuses.push('drift')
    } else if (i === POPLIVE_TIMELINE.length - 1) {
      statuses.push(
        eligibility === 'eligible' ? 'active' : eligibility === 'recovering' ? 'drift' : 'pending',
      )
    } else if (progress >= threshold) {
      statuses.push('done')
    } else {
      statuses.push('active')
    }
  }

  return statuses
}
