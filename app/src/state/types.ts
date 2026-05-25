import type { AttentionSession } from './attentionSession'

export type ProductTabId = 'feed' | 'earn' | 'wallet' | 'profile'

export type AppMode = 'product' | 'presenter'

export type DemoScreenId =
  | 'splash'
  | 'feed'
  | 'earn'
  | 'profile'
  | 'offer-detail'
  | 'consent-camera-gate'
  | 'watch-verify'
  | 'verification-result'
  | 'reward-reveal'
  | 'wallet'
  | 'convert'
  | 'withdraw-preview'
  | 'creator-economics'
  | 'proof-layer'
  | 'roadmap'

export type VerificationStatus = 'idle' | 'watching' | 'verifying' | 'complete'

export interface Offer {
  id: string
  brand: string
  title: string
  description: string
  platform: string
  rewardICoins: number
  sponsorLabel: string
  thumbnailGradient: string
  platformCode?: string
  watchDuration?: string
  attentionScoreDisplay?: string
  campaignTagline?: string
  creatorHandle?: string
  captionTags?: string
}

export interface Transaction {
  id: string
  source: string
  timeLabel: string
  amountDisplay: string
  kind: 'positive' | 'negative' | 'pending'
}

export interface CreatorCampaign {
  id: string
  name: string
  brand: string
  budgetICoins: number
  cpm: number
  status: 'live' | 'draft'
}

export interface VerificationGateDef {
  id: string
  name: string
  pendingLabel: string
  passLabel: string
}

export interface EconomicSplit {
  creatorPct: number
  viewerPct: number
  platformPct: number
}

export interface ProofLayerStatus {
  demoMode: 'mocked-gaze'
  flutterRuntime: 'promoted-not-wired'
  androidSmokeTest: 'planned'
  signalPath: string[]
  governanceKernelPresent: boolean
}

export interface DemoState {
  currentScreen: DemoScreenId
  appMode: AppMode
  activeTab: ProductTabId
  walletBalance: number
  pendingBalance: number
  aCoins: number
  /** Settled, spendable iCoins (canonical i ledger) */
  iCoins: number
  /** Pending iCoins awaiting attestation settlement */
  iCoinsPending: number
  transactions: Transaction[]
  selectedOffer: Offer | null
  verificationStatus: VerificationStatus
  /** Gate for attention-backed rewards — null until consent accepted */
  attentionSession: AttentionSession | null
}

export interface DemoContextValue extends DemoState {
  setScreen: (s: DemoScreenId) => void
  setActiveTab: (tab: ProductTabId) => void
  startPresenterTour: () => void
  exitPresenter: () => void
  enterProduct: () => void
  resetDemo: () => void
  jumpFeed: () => void
  jumpEarn: () => void
  jumpWallet: () => void
  jumpProfile: () => void
  selectOffer: (o: Offer) => void
  startWatchFlow: () => void
  acceptConsentAndBeginSession: () => void
  completeVerification: () => void
  claimReward: () => void
  finishRewardToWallet: () => void
  canCollectReward: boolean
  canRedeemReward: boolean
}
