import type { AttentionSession } from './attentionSession'
import type { PopPendingHold } from '../lib/popValidator'
import type { ProofSealedEvent } from './useProofEvents'

export type WalletBackend = 'mock' | 'live'

export type ProductTabId = 'feed' | 'earn' | 'wallet' | 'profile'

export type AppMode = 'product' | 'presenter'

export type DemoScreenId =
  | 'splash'
  | 'feed'
  | 'immersive-feed'
  | 'earn'
  | 'profile'
  | 'offer-detail'
  | 'consent-camera-gate'
  | 'watch-verify'
  | 'verification-result'
  | 'reward-reveal'
  | 'wallet'
  | 'saved'
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
  demoMode: string
  flutterRuntime: string
  androidSmokeTest: string
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
  walletBackend: WalletBackend
  settlementMode: 'supabase' | 'local-json' | null
  popHolds: PopPendingHold[]
  walletSyncError: string | null
  walletSyncing: boolean
  settlingSessionId: string | null
  proofSubmitting: boolean
  proofFlash: string | null
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
  beginImmersiveWatch: (o: Offer) => void
  startWatchFlow: () => void
  acceptConsentAndBeginSession: () => void
  completeVerification: () => void
  recordWatchAttention: (score: number) => void
  claimReward: () => void
  finishRewardToWallet: () => void
  refreshPendingHolds: () => Promise<void>
  settlePopHold: (sessionId: string) => Promise<void>
  canCollectReward: boolean
  canRedeemReward: boolean
  supabaseAuthEnabled: boolean
  authUserEmail: string | null
  authUserId: string | null
  authLoading: boolean
  authError: string | null
  signInDemo: () => Promise<void>
  signOutDemo: () => Promise<void>
  proofEventsConnected: boolean
  eloStatusLine: string
  lastProofEvent: ProofSealedEvent | null
  proofFlash: string | null
  isNativeShell: boolean
  nativePlatform: string
}
