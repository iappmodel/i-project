export type DemoScreenId =
  | 'splash'
  | 'feed'
  | 'offer-detail'
  | 'watch-verify'
  | 'verification-result'
  | 'reward-reveal'
  | 'wallet'
  | 'convert'
  | 'withdraw-preview'
  | 'creator-economics'
  | 'roadmap'

export type VerificationStatus = 'idle' | 'watching' | 'verifying' | 'complete'

export interface Offer {
  id: string
  brand: string
  title: string
  description: string
  platform: string
  /** Credits applied in demo when reward is settled */
  rewardICoins: number
  sponsorLabel: string
  thumbnailGradient: string
  /** e.g. YT / IG — `iapp_loop1_watch_verify_earn (5).html` offer-platform */
  platformCode?: string
  /** Thumb duration label */
  watchDuration?: string
  /** Shown on verification / reward breakdown */
  attentionScoreDisplay?: string
  /** Offer detail subtitle — `iapp_loop1_watch_verify_earn (5).html` */
  campaignTagline?: string
  /** Feed card creator line — e.g. "Brand · Watch to earn" */
  creatorHandle?: string
  /** Appended caption tags — e.g. "#Nike #running" (`iapp_feed_screen (1).html`) */
  captionTags?: string
}

export interface Transaction {
  id: string
  source: string
  timeLabel: string
  amountDisplay: string
  kind: 'positive' | 'negative' | 'pending'
}

export interface DemoState {
  currentScreen: DemoScreenId
  /** Mock ledger value in USD (Wallet hero) */
  walletBalance: number
  pendingBalance: number
  aCoins: number
  iCoins: number
  transactions: Transaction[]
  selectedOffer: Offer | null
  verificationStatus: VerificationStatus
}

export interface DemoContextValue extends DemoState {
  setScreen: (s: DemoScreenId) => void
  goPrev: () => void
  goNext: () => void
  resetDemo: () => void
  jumpFeed: () => void
  jumpWatch: () => void
  jumpWallet: () => void
  jumpEconomics: () => void
  jumpRoadmap: () => void
  selectOffer: (o: Offer) => void
  startWatchFlow: () => void
  completeVerification: () => void
  claimReward: () => void
  finishRewardToWallet: () => void
}
