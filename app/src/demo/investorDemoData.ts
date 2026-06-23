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
  | 'connectPlatforms'
  | 'campaignPreview'

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
  txType?: 'reward' | 'convert' | 'withdraw' | 'tip'
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
