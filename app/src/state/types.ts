export type DemoScreenId =
  | 'splash'
  | 'feed'
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
  resetDemo: () => void
  jumpFeed: () => void
  jumpWallet: () => void
  selectOffer: (o: Offer) => void
  startWatchFlow: () => void
  completeVerification: () => void
  claimReward: () => void
  finishRewardToWallet: () => void
}
