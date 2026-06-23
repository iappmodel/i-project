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
  txType?: 'reward' | 'convert' | 'withdraw'
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
      'The wallet is the economic hub: iCoins, pending, and lifetime earnings.',
      'Users convert, withdraw to bank, pay merchants, or tip creators.',
      'Loop 1 → Wallet → Loop 3: Balance → Convert → Use.',
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
