/* ─── [ i ] Investor Demo — centralized state hook ──────────────────────────
 * Fully local, deterministic, no Supabase, no camera, no real money.
 * ─────────────────────────────────────────────────────────────────────────── */

import { createContext, useCallback, useContext, useReducer } from 'react'
import {
  BASELINE_WALLET,
  DEFAULT_DEMO_OFFER_ID,
  FEED_ITEMS,
  PRESENTER_STEPS,
  SEED_TRANSACTIONS,
  freshGates,
  baselineProfileFilter,
  baselineACoinsTab,
  baselineAlphabetUnit,
  baselinePOPLiveSignals,
  baselinePOPLiveTab,
  baselinePOPLiveScore,
  baselinePOPLiveEligibility,
  baselinePOPLiveDriftState,
  baselinePOPLiveFrame,
  baselinePopTrackingMode,
  baselineWebGazerStatus,
  POPLIVE_CALIBRATION_TOTAL,
  baselineSelectedLoop,
  baselineCreatorDashboardTab,
  baselineCreatorPlatformFilter,
  baselineBrandDashboardTab,
  baselineBrandCta,
  baselineMoneyMapTab,
  baselineMoneyNode,
  cloneBaselinePlatforms,
  cloneBaselineCampaign,
  cloneBaselineStudio,
  cloneBaselinePromoStatus,
  connectPlatformHandle,
  getPromoOffer,
  gatesForStrictness,
  studioCtaToCampaign,
  withdrawFee,
  type CampaignAction,
  type CampaignGateId,
  type CampaignPreviewState,
  type PayMode,
  type PlatformConnection,
  type PromoStatus,
  type StudioCta,
  type StudioFormat,
  type StudioPreviewState,
  type ProfilePlatformFilter,
  type ACoinsTab,
  type AlphabetUnitId,
  type POPLiveTab,
  type POPLiveSignalId,
  type POPLiveSignalState,
  type POPLiveFrame,
  type POPLiveEligibility,
  type POPLiveDriftState,
  type POPTrackingMode,
  type POPWebGazerStatus,
  type VerificationStrictness,
  type WithdrawMethod,
  type InvestorTransaction,
  type InvestorView,
  type VerificationGate,
  type ThreeLoopId,
  type CreatorDashboardTab,
  type CreatorPlatformFilter,
  type BrandDashboardTab,
  type MoneyMapTab,
  baselineWalletTab,
  type WalletTab,
  baselineClickEarnMode,
  baselineClickEarnAmount,
  clampClickEarnAmount,
  type ClickEarnMode,
  baselineProductMapNode,
  type ProductMapNodeId,
  baselineDemoMode,
  demoModeToastLabel,
  type DemoMode,
  baselineAnalyticsView,
  baselineAnalyticsRange,
  type AnalyticsView,
  type AnalyticsRange,
  type AnalyticsInsightId,
  baselineRemoteMode,
  baselineRemoteTarget,
  baselineRemoteCursor,
  remoteTargetView,
  type RemoteMode,
  type RemoteTargetId,
  type RemoteCursorPosition,
  type RemoteCommandLogEntry,
  baselineEloMode,
  baselineEloPrompt,
  buildEloResponse,
  type EloMode,
  type EloPromptId,
  baselineOnboardingStep,
  baselineOnboardingMode,
  baselineOnboardingPlatforms,
  baselineOnboardingInterests,
  type OnboardingMode,
  type OnboardingPlatformId,
  type OnboardingInterestId,
  type OnboardingFinishDestination,
} from './investorDemoData'

// ─── State shape ───────────────────────────────────────────────────────────

export interface InvestorDemoState {
  currentView: InvestorView
  currentFeedIndex: number
  selectedOfferId: string | null
  /** Verified iCoins available to convert */
  walletBalance: number
  /** Spendable usable balance after conversion */
  usableBalance: number
  pendingBalance: number
  lifetimeEarned: number
  /** iCoins earned since demo load / last reset */
  sessionEarned: number
  transactions: InvestorTransaction[]
  verificationGates: VerificationGate[]
  watchProgress: number
  /** Increments each watch session — remounts timer in WatchVerify */
  verificationSession: number
  /** Prevents double-credit on repeated Claim clicks */
  rewardClaimed: boolean
  /** Convert flow — confirmation shown, blocks double-submit */
  convertConfirmed: boolean
  /** Last confirmed convert amount (for confirmation card) */
  lastConvertAmount: number
  convertSession: number
  /** Tip flow — confirmation shown, blocks double-submit */
  tipConfirmed: boolean
  lastTipAmount: number
  lastTipMessage: string
  tipSession: number
  payAmount: number
  payMode: PayMode
  payConfirmed: boolean
  lastPayAmount: number
  paySession: number
  withdrawAmount: number
  withdrawMethod: WithdrawMethod
  withdrawConfirmed: boolean
  lastWithdrawAmount: number
  lastWithdrawFee: number
  withdrawSession: number
  platformConnections: PlatformConnection[]
  campaign: CampaignPreviewState
  studio: StudioPreviewState
  promoStatus: Record<string, PromoStatus>
  claimedPromoIds: string[]
  selectedPromoId: string | null
  promoVerificationStep: number
  promoClaimConfirmed: boolean
  lastClaimedPromoId: string | null
  promoSession: number
  selectedProfilePlatformFilter: ProfilePlatformFilter
  selectedProfileContentId: string | null
  selectedACoinsTab: ACoinsTab
  selectedAlphabetUnit: AlphabetUnitId
  popLiveRunning: boolean
  popLiveTab: POPLiveTab
  popLiveSignals: POPLiveSignalState
  popLiveScore: number
  popLiveEligibility: POPLiveEligibility
  popLiveDriftState: POPLiveDriftState
  popLiveFrame: POPLiveFrame
  popLiveSimTick: number
  popTrackingMode: POPTrackingMode
  popWebGazerStatus: POPWebGazerStatus
  popWebGazerError: string | null
  popCalibrationStep: number
  popCalibrationVisited: number[]
  selectedLoopId: ThreeLoopId
  creatorDashboardTab: CreatorDashboardTab
  selectedCreatorPlatform: CreatorPlatformFilter
  selectedCreatorContentId: string | null
  brandDashboardTab: BrandDashboardTab
  selectedBrandCta: CampaignAction
  moneyMapTab: MoneyMapTab
  selectedMoneyNode: string
  // ─── Wallet tabs
  walletTab: WalletTab
  // ─── Receipt
  selectedReceiptId: string | null
  receiptReturnView: InvestorView
  // ─── Click-and-Earn
  clickEarnMode: ClickEarnMode
  clickEarnAmount: number
  clickEarnHolding: boolean
  clickEarnMeter: number
  clickEarnMessage: string
  clickEarnSession: number
  // ─── Product Map
  selectedProductMapNode: ProductMapNodeId
  // ─── Demo Mode
  activeDemoMode: DemoMode
  // ─── Attention Analytics
  analyticsView: AnalyticsView
  analyticsRange: AnalyticsRange
  selectedAnalyticsInsight: AnalyticsInsightId | null
  // ─── Remote Control
  remoteRunning: boolean
  remoteMode: RemoteMode
  selectedRemoteTarget: RemoteTargetId
  remoteCursorPosition: RemoteCursorPosition
  remoteActivationProgress: number
  remoteCommandLog: RemoteCommandLogEntry[]
  // ─── ELO
  eloMode: EloMode
  selectedEloPrompt: EloPromptId
  eloResponseId: string
  // ─── Onboarding
  onboardingStep: number
  onboardingMode: OnboardingMode
  onboardingConnectedPlatforms: OnboardingPlatformId[]
  onboardingInterests: OnboardingInterestId[]
  likedContentIds: string[]
  savedContentIds: string[]
  toast: string | null
  presenterStepIndex: number
}

// ─── Actions ───────────────────────────────────────────────────────────────

type Action =
  | { type: 'GO_VIEW'; view: InvestorView }
  | { type: 'SET_FEED_INDEX'; index: number }
  | { type: 'SELECT_OFFER'; offerId: string }
  | { type: 'START_VERIFICATION' }
  | { type: 'BEGIN_WATCH_FROM_OFFER' }
  | { type: 'SET_WATCH_PROGRESS'; progress: number }
  | { type: 'COMPLETE_GATE'; gateId: string }
  | { type: 'CLAIM_REWARD'; offerId: string }
  | { type: 'LIKE_TOGGLE'; contentId: string }
  | { type: 'SAVE_TOGGLE'; contentId: string }
  | { type: 'SHOW_TOAST'; message: string }
  | { type: 'CLEAR_TOAST' }
  | { type: 'SET_PRESENTER_STEP'; index: number }
  | { type: 'OPEN_CONVERT' }
  | { type: 'CONFIRM_CONVERT'; amount: number }
  | { type: 'OPEN_TIP' }
  | { type: 'CONFIRM_TIP'; amount: number; message: string }
  | { type: 'OPEN_PAY' }
  | { type: 'SET_PAY_AMOUNT'; amount: number }
  | { type: 'SET_PAY_MODE'; mode: PayMode }
  | { type: 'CONFIRM_PAY' }
  | { type: 'OPEN_WITHDRAW' }
  | { type: 'SET_WITHDRAW_AMOUNT'; amount: number }
  | { type: 'SET_WITHDRAW_METHOD'; method: WithdrawMethod }
  | { type: 'CONFIRM_WITHDRAW' }
  | { type: 'OPEN_CONNECT_PLATFORMS' }
  | { type: 'TOGGLE_PLATFORM'; platformId: string }
  | { type: 'OPEN_CAMPAIGN_PREVIEW' }
  | { type: 'SET_CAMPAIGN_ACTION'; action: CampaignAction; customLabel?: string }
  | { type: 'SET_CAMPAIGN_REWARD'; amount: number }
  | { type: 'SET_CAMPAIGN_STRICTNESS'; strictness: VerificationStrictness }
  | { type: 'TOGGLE_CAMPAIGN_GATE'; gateId: CampaignGateId }
  | { type: 'PUBLISH_CAMPAIGN_PREVIEW' }
  | { type: 'OPEN_STUDIO_PREVIEW' }
  | { type: 'SET_STUDIO_CLIP'; clipId: string }
  | { type: 'TOGGLE_STUDIO_CAPTIONS' }
  | { type: 'TOGGLE_STUDIO_REWARD_OVERLAY' }
  | { type: 'SET_STUDIO_CTA'; cta: StudioCta }
  | { type: 'SET_STUDIO_FORMAT'; format: StudioFormat }
  | { type: 'GENERATE_STUDIO_PREVIEW' }
  | { type: 'SEND_STUDIO_TO_CAMPAIGN' }
  | { type: 'OPEN_PROMO' }
  | { type: 'SELECT_PROMO'; promoId: string | null }
  | { type: 'START_PROMO'; promoId: string }
  | { type: 'VERIFY_PROMO' }
  | { type: 'CLAIM_PROMO_REWARD' }
  | { type: 'DISMISS_PROMO_CLAIM' }
  | { type: 'OPEN_UNIFIED_PROFILE' }
  | { type: 'SET_PROFILE_PLATFORM_FILTER'; filter: ProfilePlatformFilter }
  | { type: 'SELECT_PROFILE_CONTENT'; contentId: string | null }
  | { type: 'OPEN_ACOINS' }
  | { type: 'SET_ACOINS_TAB'; tab: ACoinsTab }
  | { type: 'SELECT_ALPHABET_UNIT'; unitId: AlphabetUnitId }
  | { type: 'OPEN_POP_LIVE' }
  | { type: 'START_POP_LIVE' }
  | { type: 'PAUSE_POP_LIVE' }
  | { type: 'RESET_POP_LIVE' }
  | { type: 'SET_POP_LIVE_TAB'; tab: POPLiveTab }
  | { type: 'TOGGLE_POP_LIVE_SIGNAL'; signalId: POPLiveSignalId }
  | {
      type: 'UPDATE_POP_LIVE_FRAME'
      frame: POPLiveFrame
      score: number
      eligibility: POPLiveEligibility
      driftState: POPLiveDriftState
      simTick?: number
    }
  | { type: 'SET_POP_TRACKING_MODE'; mode: POPTrackingMode }
  | {
      type: 'SET_WEBGAZER_STATUS'
      status: POPWebGazerStatus
      error?: string | null
    }
  | { type: 'REGISTER_CALIBRATION_POINT'; pointId: number }
  | { type: 'WEBGAZER_FALLBACK_SIMULATED'; error?: string | null }
  | { type: 'OPEN_THREE_LOOPS' }
  | { type: 'SET_SELECTED_LOOP'; loopId: ThreeLoopId }
  | { type: 'OPEN_CREATOR_DASHBOARD' }
  | { type: 'SET_CREATOR_DASHBOARD_TAB'; tab: CreatorDashboardTab }
  | { type: 'SET_CREATOR_PLATFORM_FILTER'; platform: CreatorPlatformFilter }
  | { type: 'SELECT_CREATOR_CONTENT'; contentId: string | null }
  | { type: 'OPEN_BRAND_DASHBOARD' }
  | { type: 'SET_BRAND_DASHBOARD_TAB'; tab: BrandDashboardTab }
  | { type: 'SET_BRAND_CTA'; cta: CampaignAction }
  | { type: 'OPEN_MONEY_MAP' }
  | { type: 'SET_MONEY_MAP_TAB'; tab: MoneyMapTab }
  | { type: 'SELECT_MONEY_NODE'; nodeId: string }
  // ─── Wallet tabs
  | { type: 'SET_WALLET_TAB'; tab: WalletTab }
  // ─── Receipt
  | { type: 'OPEN_RECEIPT'; receiptId: string; returnView?: InvestorView }
  | { type: 'SET_SELECTED_RECEIPT'; receiptId: string | null }
  | { type: 'RETURN_FROM_RECEIPT' }
  // ─── Click-and-Earn
  | { type: 'OPEN_CLICK_EARN' }
  | { type: 'TAP_CLICK_EARN_LIKE' }
  | { type: 'START_CLICK_EARN_HOLD' }
  | { type: 'UPDATE_CLICK_EARN_AMOUNT'; amount: number; meter: number }
  | { type: 'RELEASE_CLICK_EARN' }
  | { type: 'CONFIRM_CLICK_EARN' }
  | { type: 'CANCEL_CLICK_EARN' }
  | { type: 'RESET_CLICK_EARN' }
  // ─── Product Map
  | { type: 'OPEN_PRODUCT_MAP' }
  | { type: 'SELECT_PRODUCT_MAP_NODE'; nodeId: ProductMapNodeId }
  // ─── Demo Mode
  | { type: 'SET_DEMO_MODE'; mode: DemoMode }
  // ─── Attention Analytics
  | { type: 'OPEN_ATTENTION_ANALYTICS' }
  | { type: 'SET_ANALYTICS_VIEW'; view: AnalyticsView }
  | { type: 'SET_ANALYTICS_RANGE'; range: AnalyticsRange }
  | { type: 'SELECT_ANALYTICS_INSIGHT'; insightId: AnalyticsInsightId | null }
  // ─── Remote Control
  | { type: 'OPEN_REMOTE_CONTROL' }
  | { type: 'START_REMOTE_SIM' }
  | { type: 'PAUSE_REMOTE_SIM' }
  | { type: 'RESET_REMOTE_SIM' }
  | { type: 'SET_REMOTE_MODE'; mode: RemoteMode }
  | { type: 'SELECT_REMOTE_TARGET'; targetId: RemoteTargetId }
  | { type: 'UPDATE_REMOTE_FRAME'; cursor: RemoteCursorPosition; activationProgress: number; selectedTarget?: RemoteTargetId; logEntry?: RemoteCommandLogEntry }
  | { type: 'OPEN_REMOTE_TARGET' }
  // ─── ELO
  | { type: 'OPEN_ELO' }
  | { type: 'SET_ELO_MODE'; mode: EloMode }
  | { type: 'SELECT_ELO_PROMPT'; promptId: EloPromptId }
  // ─── Onboarding
  | { type: 'OPEN_ONBOARDING' }
  | { type: 'SET_ONBOARDING_STEP'; step: number }
  | { type: 'SET_ONBOARDING_MODE'; mode: OnboardingMode }
  | { type: 'TOGGLE_ONBOARDING_PLATFORM'; platformId: OnboardingPlatformId }
  | { type: 'TOGGLE_ONBOARDING_INTEREST'; interestId: OnboardingInterestId }
  | { type: 'FINISH_ONBOARDING'; destination: OnboardingFinishDestination }
  | { type: 'RESET' }

function cloneSeedTransactions(): InvestorTransaction[] {
  return SEED_TRANSACTIONS.map((tx) => ({ ...tx }))
}

/** Total spendable for tips: usable first, then verified fallback */
export function tipSpendableBalance(usable: number, verified: number): number {
  return +(usable + verified).toFixed(2)
}

function debitSpendable(
  usableBalance: number,
  walletBalance: number,
  amount: number,
): { usableBalance: number; walletBalance: number } | null {
  if (amount <= 0) return null
  const total = tipSpendableBalance(usableBalance, walletBalance)
  if (amount > total) return null

  let remaining = amount
  const fromUsable = Math.min(remaining, usableBalance)
  const newUsable = +(usableBalance - fromUsable).toFixed(2)
  remaining = +(remaining - fromUsable).toFixed(2)

  const fromWallet = Math.min(remaining, walletBalance)
  const newWallet = +(walletBalance - fromWallet).toFixed(2)
  remaining = +(remaining - fromWallet).toFixed(2)

  if (remaining > 0.001) return null
  return { usableBalance: newUsable, walletBalance: newWallet }
}

function createBaselineState(): InvestorDemoState {
  return {
    currentView: 'splash',
    currentFeedIndex: 1,
    selectedOfferId: null,
    walletBalance: BASELINE_WALLET.walletBalance,
    usableBalance: BASELINE_WALLET.usableBalance,
    pendingBalance: BASELINE_WALLET.pendingBalance,
    lifetimeEarned: BASELINE_WALLET.lifetimeEarned,
    sessionEarned: 0,
    transactions: cloneSeedTransactions(),
    verificationGates: freshGates(),
    watchProgress: 0,
    verificationSession: 0,
    rewardClaimed: false,
    convertConfirmed: false,
    lastConvertAmount: 0,
    convertSession: 0,
    tipConfirmed: false,
    lastTipAmount: 0,
    lastTipMessage: '',
    tipSession: 0,
    payAmount: 0,
    payMode: 'tap',
    payConfirmed: false,
    lastPayAmount: 0,
    paySession: 0,
    withdrawAmount: 0,
    withdrawMethod: 'standard',
    withdrawConfirmed: false,
    lastWithdrawAmount: 0,
    lastWithdrawFee: 0,
    withdrawSession: 0,
    platformConnections: cloneBaselinePlatforms(),
    campaign: cloneBaselineCampaign(),
    studio: cloneBaselineStudio(),
    promoStatus: cloneBaselinePromoStatus(),
    claimedPromoIds: [],
    selectedPromoId: null,
    promoVerificationStep: 0,
    promoClaimConfirmed: false,
    lastClaimedPromoId: null,
    promoSession: 0,
    selectedProfilePlatformFilter: baselineProfileFilter(),
    selectedProfileContentId: null,
    selectedACoinsTab: baselineACoinsTab(),
    selectedAlphabetUnit: baselineAlphabetUnit(),
    popLiveRunning: false,
    popLiveTab: baselinePOPLiveTab(),
    popLiveSignals: baselinePOPLiveSignals(),
    popLiveScore: baselinePOPLiveScore(),
    popLiveEligibility: baselinePOPLiveEligibility(),
    popLiveDriftState: baselinePOPLiveDriftState(),
    popLiveFrame: baselinePOPLiveFrame(),
    popLiveSimTick: 0,
    popTrackingMode: baselinePopTrackingMode(),
    popWebGazerStatus: baselineWebGazerStatus(),
    popWebGazerError: null,
    popCalibrationStep: 0,
    popCalibrationVisited: [],
    selectedLoopId: baselineSelectedLoop(),
    creatorDashboardTab: baselineCreatorDashboardTab(),
    selectedCreatorPlatform: baselineCreatorPlatformFilter(),
    selectedCreatorContentId: null,
    brandDashboardTab: baselineBrandDashboardTab(),
    selectedBrandCta: baselineBrandCta(),
    moneyMapTab: baselineMoneyMapTab(),
    selectedMoneyNode: baselineMoneyNode(),
    // ─── Wallet tabs
    walletTab: baselineWalletTab(),
    // ─── Receipt
    selectedReceiptId: null,
    receiptReturnView: 'wallet' as InvestorView,
    // ─── Click-and-Earn
    clickEarnMode: baselineClickEarnMode(),
    clickEarnAmount: baselineClickEarnAmount(),
    clickEarnHolding: false,
    clickEarnMeter: 0,
    clickEarnMessage: '',
    clickEarnSession: 0,
    // ─── Product Map
    selectedProductMapNode: baselineProductMapNode(),
    // ─── Demo Mode
    activeDemoMode: baselineDemoMode(),
    // ─── Attention Analytics
    analyticsView: baselineAnalyticsView(),
    analyticsRange: baselineAnalyticsRange(),
    selectedAnalyticsInsight: null,
    // ─── Remote Control
    remoteRunning: false,
    remoteMode: baselineRemoteMode(),
    selectedRemoteTarget: baselineRemoteTarget(),
    remoteCursorPosition: baselineRemoteCursor(),
    remoteActivationProgress: 0,
    remoteCommandLog: [],
    // ─── ELO
    eloMode: baselineEloMode(),
    selectedEloPrompt: baselineEloPrompt(),
    eloResponseId: buildEloResponse(baselineEloPrompt(), baselineEloMode(), BASELINE_WALLET.walletBalance, BASELINE_WALLET.usableBalance).id,
    // ─── Onboarding
    onboardingStep: baselineOnboardingStep(),
    onboardingMode: baselineOnboardingMode(),
    onboardingConnectedPlatforms: baselineOnboardingPlatforms(),
    onboardingInterests: baselineOnboardingInterests(),
    likedContentIds: [],
    savedContentIds: [],
    toast: null,
    presenterStepIndex: 0,
  }
}

// ─── Reducer ───────────────────────────────────────────────────────────────

function reducer(state: InvestorDemoState, action: Action): InvestorDemoState {
  switch (action.type) {
    case 'GO_VIEW':
      return { ...state, currentView: action.view }

    case 'SET_FEED_INDEX':
      return { ...state, currentFeedIndex: action.index }

    case 'SELECT_OFFER':
      return { ...state, selectedOfferId: action.offerId }

    case 'START_VERIFICATION':
      return {
        ...state,
        watchProgress: 0,
        verificationGates: freshGates(),
        verificationSession: state.verificationSession + 1,
      }

    case 'BEGIN_WATCH_FROM_OFFER':
      return {
        ...state,
        watchProgress: 0,
        verificationGates: freshGates(),
        verificationSession: state.verificationSession + 1,
        rewardClaimed: false,
      }

    case 'SET_WATCH_PROGRESS':
      return { ...state, watchProgress: action.progress }

    case 'COMPLETE_GATE':
      return {
        ...state,
        verificationGates: state.verificationGates.map((g) =>
          g.id === action.gateId ? { ...g, completed: true } : g,
        ),
      }

    case 'CLAIM_REWARD': {
      if (state.rewardClaimed) return state

      const offer = FEED_ITEMS.find((f) => f.id === action.offerId)
      const amount = offer?.rewardAmount ?? 0.25
      const newTx: InvestorTransaction = {
        id: `tx-reward-${state.verificationSession}`,
        source: `${offer?.brand ?? 'Sponsored offer'} · Verified attention`,
        timeLabel: 'Just now',
        amountDisplay: `+${amount.toFixed(2)} iCoins`,
        kind: 'positive',
      }
      return {
        ...state,
        rewardClaimed: true,
        currentView: 'reward',
        walletBalance: +(state.walletBalance + amount).toFixed(2),
        lifetimeEarned: +(state.lifetimeEarned + amount).toFixed(2),
        sessionEarned: +(state.sessionEarned + amount).toFixed(2),
        transactions: [newTx, ...state.transactions],
      }
    }

    case 'LIKE_TOGGLE':
      return {
        ...state,
        likedContentIds: state.likedContentIds.includes(action.contentId)
          ? state.likedContentIds.filter((id) => id !== action.contentId)
          : [...state.likedContentIds, action.contentId],
      }

    case 'SAVE_TOGGLE':
      return {
        ...state,
        savedContentIds: state.savedContentIds.includes(action.contentId)
          ? state.savedContentIds.filter((id) => id !== action.contentId)
          : [...state.savedContentIds, action.contentId],
      }

    case 'SHOW_TOAST':
      return { ...state, toast: action.message }

    case 'CLEAR_TOAST':
      return { ...state, toast: null }

    case 'SET_PRESENTER_STEP':
      return { ...state, presenterStepIndex: action.index }

    case 'OPEN_CONVERT':
      return {
        ...state,
        currentView: 'convert',
        convertConfirmed: false,
        lastConvertAmount: 0,
      }

    case 'CONFIRM_CONVERT': {
      const amount = +action.amount.toFixed(2)
      if (state.convertConfirmed) return state
      if (amount <= 0 || amount > state.walletBalance) return state

      const received = +(amount * 1).toFixed(2) // CONVERT_RATE = 1, fee = 0
      const newTx: InvestorTransaction = {
        id: `tx-convert-${state.convertSession + 1}`,
        source: 'Convert preview · Simulated',
        timeLabel: 'Just now',
        amountDisplay: `⇄ ${amount.toFixed(2)} iC → usable`,
        kind: 'neutral',
        txType: 'convert',
      }
      return {
        ...state,
        convertConfirmed: true,
        lastConvertAmount: amount,
        convertSession: state.convertSession + 1,
        walletBalance: +(state.walletBalance - amount).toFixed(2),
        usableBalance: +(state.usableBalance + received).toFixed(2),
        transactions: [newTx, ...state.transactions],
      }
    }

    case 'OPEN_TIP':
      return {
        ...state,
        currentView: 'tip',
        tipConfirmed: false,
        lastTipAmount: 0,
        lastTipMessage: '',
      }

    case 'CONFIRM_TIP': {
      const amount = +action.amount.toFixed(2)
      if (state.tipConfirmed) return state
      if (amount <= 0) return state

      const debited = debitSpendable(state.usableBalance, state.walletBalance, amount)
      if (!debited) return state

      const newTx: InvestorTransaction = {
        id: `tx-tip-${state.tipSession + 1}`,
        source: 'Creator tip · Simulated',
        timeLabel: 'Just now',
        amountDisplay: `−${amount.toFixed(2)} iC`,
        kind: 'negative',
        txType: 'tip',
      }
      return {
        ...state,
        tipConfirmed: true,
        lastTipAmount: amount,
        lastTipMessage: action.message.trim(),
        tipSession: state.tipSession + 1,
        usableBalance: debited.usableBalance,
        walletBalance: debited.walletBalance,
        transactions: [newTx, ...state.transactions],
      }
    }

    case 'OPEN_PAY':
      return {
        ...state,
        currentView: 'pay',
        payAmount: 0,
        payMode: 'tap',
        payConfirmed: false,
        lastPayAmount: 0,
      }

    case 'SET_PAY_AMOUNT':
      return {
        ...state,
        payAmount: Math.max(0, +action.amount.toFixed(2)),
      }

    case 'SET_PAY_MODE':
      return {
        ...state,
        payMode: action.mode,
      }

    case 'CONFIRM_PAY': {
      const amount = +state.payAmount.toFixed(2)
      if (state.payConfirmed) return state
      if (amount <= 0) return state

      const debited = debitSpendable(state.usableBalance, state.walletBalance, amount)
      if (!debited) return state

      const newTx: InvestorTransaction = {
        id: `tx-pay-${state.paySession + 1}`,
        source: 'Merchant payment · Simulated',
        timeLabel: 'Just now',
        amountDisplay: `−${amount.toFixed(2)} iC`,
        kind: 'negative',
        txType: 'pay',
      }
      return {
        ...state,
        payConfirmed: true,
        lastPayAmount: amount,
        paySession: state.paySession + 1,
        usableBalance: debited.usableBalance,
        walletBalance: debited.walletBalance,
        transactions: [newTx, ...state.transactions],
      }
    }

    case 'OPEN_WITHDRAW':
      return {
        ...state,
        currentView: 'withdraw',
        withdrawAmount: 0,
        withdrawMethod: 'standard',
        withdrawConfirmed: false,
        lastWithdrawAmount: 0,
        lastWithdrawFee: 0,
      }

    case 'SET_WITHDRAW_AMOUNT':
      return {
        ...state,
        withdrawAmount: Math.max(0, +action.amount.toFixed(2)),
      }

    case 'SET_WITHDRAW_METHOD':
      return {
        ...state,
        withdrawMethod: action.method,
      }

    case 'CONFIRM_WITHDRAW': {
      const amount = +state.withdrawAmount.toFixed(2)
      const fee = withdrawFee(state.withdrawMethod)
      const totalDebit = +(amount + fee).toFixed(2)
      if (state.withdrawConfirmed) return state
      if (amount <= 0) return state

      const debited = debitSpendable(state.usableBalance, state.walletBalance, totalDebit)
      if (!debited) return state

      const feeSuffix = fee > 0 ? ` (incl. ${fee.toFixed(2)} fee)` : ''
      const newTx: InvestorTransaction = {
        id: `tx-withdraw-${state.withdrawSession + 1}`,
        source: 'Withdrawal preview · Simulated',
        timeLabel: 'Just now',
        amountDisplay: `−${totalDebit.toFixed(2)} iC${feeSuffix}`,
        kind: 'negative',
        txType: 'withdraw',
      }
      return {
        ...state,
        withdrawConfirmed: true,
        lastWithdrawAmount: amount,
        lastWithdrawFee: fee,
        withdrawSession: state.withdrawSession + 1,
        usableBalance: debited.usableBalance,
        walletBalance: debited.walletBalance,
        transactions: [newTx, ...state.transactions],
      }
    }

    case 'OPEN_CONNECT_PLATFORMS':
      return { ...state, currentView: 'connectPlatforms' }

    case 'TOGGLE_PLATFORM':
      return {
        ...state,
        platformConnections: state.platformConnections.map((p) => {
          if (p.id !== action.platformId) return p
          const nextConnected = !p.connected
          return {
            ...p,
            connected: nextConnected,
            handle: nextConnected ? connectPlatformHandle(p.id) : null,
            contentCount: nextConnected ? (p.contentCount > 0 ? p.contentCount : 12) : 0,
          }
        }),
      }

    case 'OPEN_CAMPAIGN_PREVIEW':
      return { ...state, currentView: 'campaignPreview' }

    case 'SET_CAMPAIGN_ACTION':
      return {
        ...state,
        selectedBrandCta: action.action,
        campaign: {
          ...state.campaign,
          selectedAction: action.action,
          customActionLabel:
            action.customLabel !== undefined
              ? action.customLabel
              : state.campaign.customActionLabel,
        },
      }

    case 'SET_CAMPAIGN_REWARD':
      return {
        ...state,
        campaign: {
          ...state.campaign,
          selectedReward: action.amount,
        },
      }

    case 'SET_CAMPAIGN_STRICTNESS':
      return {
        ...state,
        campaign: {
          ...state.campaign,
          verificationStrictness: action.strictness,
          enabledGates: gatesForStrictness(action.strictness),
        },
      }

    case 'TOGGLE_CAMPAIGN_GATE':
      return {
        ...state,
        campaign: {
          ...state.campaign,
          enabledGates: {
            ...state.campaign.enabledGates,
            [action.gateId]: !state.campaign.enabledGates[action.gateId],
          },
        },
      }

    case 'PUBLISH_CAMPAIGN_PREVIEW':
      if (state.campaign.campaignStatus === 'published') return state
      return {
        ...state,
        campaign: {
          ...state.campaign,
          campaignStatus: 'published',
        },
      }

    case 'OPEN_STUDIO_PREVIEW':
      return { ...state, currentView: 'studioPreview' }

    case 'SET_STUDIO_CLIP':
      return {
        ...state,
        studio: { ...state.studio, selectedClipId: action.clipId },
      }

    case 'TOGGLE_STUDIO_CAPTIONS':
      return {
        ...state,
        studio: {
          ...state.studio,
          captionsEnabled: !state.studio.captionsEnabled,
        },
      }

    case 'TOGGLE_STUDIO_REWARD_OVERLAY':
      return {
        ...state,
        studio: {
          ...state.studio,
          rewardOverlayEnabled: !state.studio.rewardOverlayEnabled,
        },
      }

    case 'SET_STUDIO_CTA':
      return {
        ...state,
        studio: { ...state.studio, studioCta: action.cta },
      }

    case 'SET_STUDIO_FORMAT':
      return {
        ...state,
        studio: { ...state.studio, studioFormat: action.format },
      }

    case 'GENERATE_STUDIO_PREVIEW':
      return {
        ...state,
        studio: { ...state.studio, studioStatus: 'preview_ready' },
      }

    case 'SEND_STUDIO_TO_CAMPAIGN': {
      const mapped = studioCtaToCampaign(state.studio.studioCta)
      return {
        ...state,
        currentView: 'campaignPreview',
        campaign: {
          ...state.campaign,
          selectedAction: mapped.action,
          customActionLabel: mapped.customLabel,
        },
      }
    }

    case 'OPEN_PROMO':
      return {
        ...state,
        currentView: 'promo',
        selectedPromoId: null,
        promoVerificationStep: 0,
        promoClaimConfirmed: false,
      }

    case 'SELECT_PROMO':
      return {
        ...state,
        selectedPromoId: action.promoId,
        promoVerificationStep: 0,
        promoClaimConfirmed: false,
      }

    case 'START_PROMO': {
      const status = state.promoStatus[action.promoId]
      if (!status || status === 'claimed' || status === 'verified') return state
      return {
        ...state,
        selectedPromoId: action.promoId,
        promoStatus: { ...state.promoStatus, [action.promoId]: 'started' },
        promoVerificationStep: 0,
      }
    }

    case 'VERIFY_PROMO': {
      const id = state.selectedPromoId
      if (!id) return state
      if (state.promoStatus[id] !== 'started') return state
      return {
        ...state,
        promoStatus: { ...state.promoStatus, [id]: 'verified' },
        promoVerificationStep: 4,
      }
    }

    case 'CLAIM_PROMO_REWARD': {
      const id = state.selectedPromoId
      if (!id) return state
      if (state.claimedPromoIds.includes(id)) return state
      if (state.promoStatus[id] !== 'verified') return state

      const offer = getPromoOffer(id)
      if (!offer) return state

      const amount = offer.rewardAmount
      const newTx: InvestorTransaction = {
        id: `tx-promo-${state.promoSession + 1}`,
        source: 'iGo reward · Simulated',
        timeLabel: 'Just now',
        amountDisplay: `+${amount.toFixed(2)} iC`,
        kind: 'positive',
        txType: 'promo',
      }
      return {
        ...state,
        promoStatus: { ...state.promoStatus, [id]: 'claimed' },
        claimedPromoIds: [...state.claimedPromoIds, id],
        promoClaimConfirmed: true,
        lastClaimedPromoId: id,
        promoSession: state.promoSession + 1,
        walletBalance: +(state.walletBalance + amount).toFixed(2),
        lifetimeEarned: +(state.lifetimeEarned + amount).toFixed(2),
        sessionEarned: +(state.sessionEarned + amount).toFixed(2),
        transactions: [newTx, ...state.transactions],
      }
    }

    case 'DISMISS_PROMO_CLAIM':
      return {
        ...state,
        promoClaimConfirmed: false,
        selectedPromoId: null,
      }

    case 'OPEN_UNIFIED_PROFILE':
      return {
        ...state,
        currentView: 'unifiedProfile',
        selectedProfileContentId: null,
      }

    case 'SET_PROFILE_PLATFORM_FILTER':
      return {
        ...state,
        selectedProfilePlatformFilter: action.filter,
        selectedProfileContentId: null,
      }

    case 'SELECT_PROFILE_CONTENT':
      return {
        ...state,
        selectedProfileContentId: action.contentId,
      }

    case 'OPEN_ACOINS':
      return { ...state, currentView: 'acoins' }

    case 'SET_ACOINS_TAB':
      return { ...state, selectedACoinsTab: action.tab }

    case 'SELECT_ALPHABET_UNIT':
      return { ...state, selectedAlphabetUnit: action.unitId }

    case 'OPEN_POP_LIVE':
      return { ...state, currentView: 'popLive' }

    case 'START_POP_LIVE':
      return { ...state, popLiveRunning: true }

    case 'PAUSE_POP_LIVE':
      return { ...state, popLiveRunning: false }

    case 'RESET_POP_LIVE':
      return {
        ...state,
        popLiveRunning: false,
        popLiveTab: baselinePOPLiveTab(),
        popLiveSignals: baselinePOPLiveSignals(),
        popLiveScore: baselinePOPLiveScore(),
        popLiveEligibility: baselinePOPLiveEligibility(),
        popLiveDriftState: baselinePOPLiveDriftState(),
        popLiveFrame: baselinePOPLiveFrame(),
        popLiveSimTick: 0,
        popTrackingMode: baselinePopTrackingMode(),
        popWebGazerStatus: baselineWebGazerStatus(),
        popWebGazerError: null,
        popCalibrationStep: 0,
        popCalibrationVisited: [],
      }

    case 'SET_POP_LIVE_TAB':
      return { ...state, popLiveTab: action.tab }

    case 'TOGGLE_POP_LIVE_SIGNAL': {
      const key = action.signalId
      return {
        ...state,
        popLiveSignals: {
          ...state.popLiveSignals,
          [key]: !state.popLiveSignals[key],
        },
      }
    }

    case 'UPDATE_POP_LIVE_FRAME': {
      const signals =
        state.popTrackingMode === 'webgazer'
          ? { ...state.popLiveSignals, gazeOnContent: action.frame.inZone }
          : state.popLiveSignals
      return {
        ...state,
        popLiveFrame: action.frame,
        popLiveScore: action.score,
        popLiveEligibility: action.eligibility,
        popLiveDriftState: action.driftState,
        popLiveSignals: signals,
        popLiveSimTick: action.simTick ?? state.popLiveSimTick,
      }
    }

    case 'SET_POP_TRACKING_MODE':
      return { ...state, popTrackingMode: action.mode }

    case 'SET_WEBGAZER_STATUS':
      return {
        ...state,
        popWebGazerStatus: action.status,
        popWebGazerError: action.error ?? null,
      }

    case 'REGISTER_CALIBRATION_POINT': {
      if (state.popCalibrationVisited.includes(action.pointId)) {
        return state
      }
      const visited = [...state.popCalibrationVisited, action.pointId]
      const step = Math.min(visited.length, POPLIVE_CALIBRATION_TOTAL)
      const done = step >= POPLIVE_CALIBRATION_TOTAL
      return {
        ...state,
        popCalibrationVisited: visited,
        popCalibrationStep: step,
        popWebGazerStatus: done ? 'running' : 'calibrating',
        popTrackingMode: done ? 'webgazer' : state.popTrackingMode,
        popLiveRunning: done ? false : state.popLiveRunning,
      }
    }

    case 'WEBGAZER_FALLBACK_SIMULATED':
      return {
        ...state,
        popTrackingMode: baselinePopTrackingMode(),
        popWebGazerStatus:
          action.error && /denied/i.test(action.error) ? 'denied' : 'failed',
        popWebGazerError: action.error ?? null,
        popCalibrationStep: 0,
        popCalibrationVisited: [],
      }

    case 'OPEN_THREE_LOOPS':
      return { ...state, currentView: 'threeLoops' }

    case 'SET_SELECTED_LOOP':
      return { ...state, selectedLoopId: action.loopId }

    case 'OPEN_CREATOR_DASHBOARD':
      return { ...state, currentView: 'creatorDashboard' }

    case 'SET_CREATOR_DASHBOARD_TAB':
      return { ...state, creatorDashboardTab: action.tab }

    case 'SET_CREATOR_PLATFORM_FILTER':
      return {
        ...state,
        selectedCreatorPlatform: action.platform,
        selectedCreatorContentId: null,
      }

    case 'SELECT_CREATOR_CONTENT':
      return { ...state, selectedCreatorContentId: action.contentId }

    case 'OPEN_BRAND_DASHBOARD':
      return {
        ...state,
        currentView: 'brandDashboard',
        brandDashboardTab: 'overview',
        selectedBrandCta: state.campaign.selectedAction,
      }

    case 'SET_BRAND_DASHBOARD_TAB':
      return { ...state, brandDashboardTab: action.tab }

    case 'SET_BRAND_CTA':
      return {
        ...state,
        selectedBrandCta: action.cta,
        campaign: {
          ...state.campaign,
          selectedAction: action.cta,
        },
      }

    case 'OPEN_MONEY_MAP':
      return {
        ...state,
        currentView: 'moneyMap',
        moneyMapTab: 'map',
        selectedMoneyNode: baselineMoneyNode(),
      }

    case 'SET_MONEY_MAP_TAB':
      return { ...state, moneyMapTab: action.tab }

    case 'SELECT_MONEY_NODE':
      return { ...state, selectedMoneyNode: action.nodeId }

    case 'SET_WALLET_TAB':
      return { ...state, walletTab: action.tab }

    case 'OPEN_RECEIPT':
      return {
        ...state,
        currentView: 'receipt',
        selectedReceiptId: action.receiptId,
        receiptReturnView: action.returnView ?? state.currentView,
      }

    case 'SET_SELECTED_RECEIPT':
      return { ...state, selectedReceiptId: action.receiptId }

    case 'RETURN_FROM_RECEIPT':
      return {
        ...state,
        currentView: state.receiptReturnView,
        selectedReceiptId: null,
      }

    case 'OPEN_CLICK_EARN':
      return {
        ...state,
        currentView: 'clickEarn',
        clickEarnMode: 'idle',
        clickEarnAmount: baselineClickEarnAmount(),
        clickEarnHolding: false,
        clickEarnMeter: 0,
        clickEarnMessage: '',
      }

    case 'TAP_CLICK_EARN_LIKE':
      return {
        ...state,
        clickEarnMode: 'liked',
        clickEarnHolding: false,
        clickEarnMessage: 'Liked · no value moved',
      }

    case 'START_CLICK_EARN_HOLD':
      return {
        ...state,
        clickEarnMode: 'holding',
        clickEarnHolding: true,
        clickEarnMessage: '',
        clickEarnAmount: baselineClickEarnAmount(),
        clickEarnMeter: 8,
      }

    case 'UPDATE_CLICK_EARN_AMOUNT':
      return {
        ...state,
        clickEarnAmount: clampClickEarnAmount(action.amount),
        clickEarnMeter: Math.min(100, Math.max(0, action.meter)),
      }

    case 'RELEASE_CLICK_EARN':
      return {
        ...state,
        clickEarnHolding: false,
        clickEarnMode: state.clickEarnAmount > 0 ? 'preview' : 'idle',
      }

    case 'CONFIRM_CLICK_EARN': {
      if (state.clickEarnMode !== 'preview') return state
      const amount = clampClickEarnAmount(state.clickEarnAmount)
      const debited = debitSpendable(state.usableBalance, state.walletBalance, amount)
      if (!debited) return state

      const newTx: InvestorTransaction = {
        id: `tx-clickearn-${state.clickEarnSession + 1}`,
        source: 'Hold-to-value creator offer · Simulated',
        timeLabel: 'Just now',
        amountDisplay: `−${amount.toFixed(2)} iC`,
        kind: 'negative',
        txType: 'clickEarn',
      }
      return {
        ...state,
        clickEarnMode: 'confirmed',
        clickEarnSession: state.clickEarnSession + 1,
        usableBalance: debited.usableBalance,
        walletBalance: debited.walletBalance,
        transactions: [newTx, ...state.transactions],
        clickEarnMessage: 'Simulated creator value action · preview complete',
      }
    }

    case 'CANCEL_CLICK_EARN':

    case 'RESET_CLICK_EARN':
      return {
        ...state,
        clickEarnMode: 'idle',
        clickEarnAmount: baselineClickEarnAmount(),
        clickEarnHolding: false,
        clickEarnMeter: 0,
        clickEarnMessage: '',
      }

    case 'OPEN_PRODUCT_MAP':
      return { ...state, currentView: 'productMap' }

    case 'SELECT_PRODUCT_MAP_NODE':
      return { ...state, selectedProductMapNode: action.nodeId }

    case 'SET_DEMO_MODE':
      return { ...state, activeDemoMode: action.mode }

    case 'OPEN_ATTENTION_ANALYTICS':
      return { ...state, currentView: 'attentionAnalytics' }

    case 'SET_ANALYTICS_VIEW':
      return { ...state, analyticsView: action.view }

    case 'SET_ANALYTICS_RANGE':
      return { ...state, analyticsRange: action.range }

    case 'SELECT_ANALYTICS_INSIGHT':
      return { ...state, selectedAnalyticsInsight: action.insightId }

    case 'OPEN_REMOTE_CONTROL':
      return { ...state, currentView: 'remoteControl' }

    case 'START_REMOTE_SIM':
      return { ...state, remoteRunning: true }

    case 'PAUSE_REMOTE_SIM':
      return { ...state, remoteRunning: false }

    case 'RESET_REMOTE_SIM':
      return {
        ...state,
        remoteRunning: false,
        remoteMode: baselineRemoteMode(),
        selectedRemoteTarget: baselineRemoteTarget(),
        remoteCursorPosition: baselineRemoteCursor(),
        remoteActivationProgress: 0,
        remoteCommandLog: [],
      }

    case 'SET_REMOTE_MODE':
      return {
        ...state,
        remoteMode: action.mode,
        remoteActivationProgress: 0,
      }

    case 'SELECT_REMOTE_TARGET':
      return {
        ...state,
        selectedRemoteTarget: action.targetId,
        remoteActivationProgress: 0,
        remoteCommandLog: [
          {
            id: `remote-manual-${action.targetId}-${Date.now()}`,
            timeLabel: 'Now',
            message: `Manual select · ${action.targetId} target highlighted`,
          },
          ...state.remoteCommandLog,
        ].slice(0, 12),
      }

    case 'UPDATE_REMOTE_FRAME': {
      const nextLog = action.logEntry
        ? [action.logEntry, ...state.remoteCommandLog].slice(0, 12)
        : state.remoteCommandLog
      return {
        ...state,
        remoteCursorPosition: action.cursor,
        remoteActivationProgress: action.activationProgress,
        selectedRemoteTarget: action.selectedTarget ?? state.selectedRemoteTarget,
        remoteCommandLog: nextLog,
      }
    }

    case 'OPEN_REMOTE_TARGET':
      return {
        ...state,
        currentView: remoteTargetView(state.selectedRemoteTarget),
        remoteRunning: false,
      }

    case 'OPEN_ELO':
      return { ...state, currentView: 'eloOverlay' }

    case 'SET_ELO_MODE': {
      const response = buildEloResponse(
        state.selectedEloPrompt,
        action.mode,
        state.walletBalance,
        state.usableBalance,
      )
      return {
        ...state,
        eloMode: action.mode,
        eloResponseId: response.id,
      }
    }

    case 'SELECT_ELO_PROMPT': {
      const response = buildEloResponse(
        action.promptId,
        state.eloMode,
        state.walletBalance,
        state.usableBalance,
      )
      return {
        ...state,
        selectedEloPrompt: action.promptId,
        eloResponseId: response.id,
      }
    }

    case 'OPEN_ONBOARDING':
      return {
        ...state,
        currentView: 'onboarding',
        onboardingStep: baselineOnboardingStep(),
      }

    case 'SET_ONBOARDING_STEP':
      return {
        ...state,
        onboardingStep: Math.min(Math.max(action.step, 1), 6),
      }

    case 'SET_ONBOARDING_MODE':
      return { ...state, onboardingMode: action.mode }

    case 'TOGGLE_ONBOARDING_PLATFORM': {
      const connected = state.onboardingConnectedPlatforms.includes(action.platformId)
      return {
        ...state,
        onboardingConnectedPlatforms: connected
          ? state.onboardingConnectedPlatforms.filter((id) => id !== action.platformId)
          : [...state.onboardingConnectedPlatforms, action.platformId],
      }
    }

    case 'TOGGLE_ONBOARDING_INTEREST': {
      const selected = state.onboardingInterests.includes(action.interestId)
      return {
        ...state,
        onboardingInterests: selected
          ? state.onboardingInterests.filter((id) => id !== action.interestId)
          : [...state.onboardingInterests, action.interestId],
      }
    }

    case 'FINISH_ONBOARDING': {
      const platformConnections = state.platformConnections.map((platform) => {
        if (!state.onboardingConnectedPlatforms.includes(platform.id as OnboardingPlatformId)) {
          return platform
        }
        return {
          ...platform,
          connected: true,
          handle: platform.handle ?? connectPlatformHandle(platform.id),
          contentCount: platform.contentCount > 0 ? platform.contentCount : 12,
        }
      })

      if (action.destination === 'offer') {
        return {
          ...state,
          platformConnections,
          currentView: 'offerDetail',
          selectedOfferId: DEFAULT_DEMO_OFFER_ID,
          presenterStepIndex: 2,
        }
      }
      if (action.destination === 'wallet') {
        return {
          ...state,
          platformConnections,
          currentView: 'wallet',
          presenterStepIndex: 5,
        }
      }
      if (action.destination === 'connect') {
        return {
          ...state,
          platformConnections,
          currentView: 'connectPlatforms',
          presenterStepIndex: 4,
        }
      }
      return {
        ...state,
        platformConnections,
        currentView: 'feed',
        presenterStepIndex: 1,
      }
    }

    case 'RESET':
      return createBaselineState()

    default:
      return state
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export type InvestorDemoActions = ReturnType<typeof useInvestorDemoState>

export function useInvestorDemoState() {
  const [state, dispatch] = useReducer(reducer, undefined, createBaselineState)

  const goView = useCallback(
    (view: InvestorView) => dispatch({ type: 'GO_VIEW', view }),
    [],
  )

  const setFeedIndex = useCallback(
    (index: number) => dispatch({ type: 'SET_FEED_INDEX', index }),
    [],
  )

  const selectOffer = useCallback(
    (offerId: string) => {
      dispatch({ type: 'SELECT_OFFER', offerId })
      dispatch({ type: 'GO_VIEW', view: 'offerDetail' })
    },
    [],
  )

  const startVerification = useCallback(() => {
    dispatch({ type: 'BEGIN_WATCH_FROM_OFFER' })
    dispatch({ type: 'GO_VIEW', view: 'watchVerify' })
  }, [])

  const setWatchProgress = useCallback(
    (progress: number) => dispatch({ type: 'SET_WATCH_PROGRESS', progress }),
    [],
  )

  const completeGate = useCallback(
    (gateId: string) => dispatch({ type: 'COMPLETE_GATE', gateId }),
    [],
  )

  /** Atomically credit once and navigate to reward reveal. */
  const claimReward = useCallback((offerId: string) => {
    dispatch({ type: 'CLAIM_REWARD', offerId })
  }, [])

  const likeToggle = useCallback(
    (contentId: string) => dispatch({ type: 'LIKE_TOGGLE', contentId }),
    [],
  )

  const saveToggle = useCallback(
    (contentId: string) => dispatch({ type: 'SAVE_TOGGLE', contentId }),
    [],
  )

  const toastTimerRef = { current: 0 as ReturnType<typeof setTimeout> }

  const showToast = useCallback((message: string) => {
    dispatch({ type: 'SHOW_TOAST', message })
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(
      () => dispatch({ type: 'CLEAR_TOAST' }),
      2200,
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setPresenterStep = useCallback(
    (index: number) => dispatch({ type: 'SET_PRESENTER_STEP', index }),
    [],
  )

  /** Jump presenter to a step and ensure offer context for post-feed views. */
  const goPresenterStep = useCallback((index: number) => {
    const step = PRESENTER_STEPS[index]
    if (!step) return

    dispatch({ type: 'SET_PRESENTER_STEP', index })

    const needsOffer = step.view === 'offerDetail' || step.view === 'watchVerify' || step.view === 'reward'
    if (needsOffer) {
      dispatch({ type: 'SELECT_OFFER', offerId: DEFAULT_DEMO_OFFER_ID })
    }

    if (step.view === 'watchVerify') {
      dispatch({ type: 'START_VERIFICATION' })
      dispatch({ type: 'GO_VIEW', view: step.view })
      return
    }

    if (step.view === 'convert') {
      // Open convert form only — never auto-convert balances
      dispatch({ type: 'OPEN_CONVERT' })
      return
    }

    dispatch({ type: 'GO_VIEW', view: step.view })
  }, [])

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  const openConvert = useCallback(() => {
    dispatch({ type: 'OPEN_CONVERT' })
  }, [])

  const confirmConvert = useCallback((amount: number) => {
    dispatch({ type: 'CONFIRM_CONVERT', amount })
  }, [])

  const openTip = useCallback(() => {
    dispatch({ type: 'OPEN_TIP' })
  }, [])

  const confirmTip = useCallback((amount: number, message: string) => {
    dispatch({ type: 'CONFIRM_TIP', amount, message })
  }, [])

  const openPay = useCallback(() => {
    dispatch({ type: 'OPEN_PAY' })
  }, [])

  const setPayAmount = useCallback((amount: number) => {
    dispatch({ type: 'SET_PAY_AMOUNT', amount })
  }, [])

  const setPayMode = useCallback((mode: PayMode) => {
    dispatch({ type: 'SET_PAY_MODE', mode })
  }, [])

  const confirmPay = useCallback(() => {
    dispatch({ type: 'CONFIRM_PAY' })
  }, [])

  const openWithdraw = useCallback(() => {
    dispatch({ type: 'OPEN_WITHDRAW' })
  }, [])

  const setWithdrawAmount = useCallback((amount: number) => {
    dispatch({ type: 'SET_WITHDRAW_AMOUNT', amount })
  }, [])

  const setWithdrawMethod = useCallback((method: WithdrawMethod) => {
    dispatch({ type: 'SET_WITHDRAW_METHOD', method })
  }, [])

  const confirmWithdraw = useCallback(() => {
    dispatch({ type: 'CONFIRM_WITHDRAW' })
  }, [])

  const openConnectPlatforms = useCallback(() => {
    dispatch({ type: 'OPEN_CONNECT_PLATFORMS' })
  }, [])

  const togglePlatform = useCallback((platformId: string) => {
    dispatch({ type: 'TOGGLE_PLATFORM', platformId })
  }, [])

  const openCampaignPreview = useCallback(() => {
    dispatch({ type: 'OPEN_CAMPAIGN_PREVIEW' })
  }, [])

  const setCampaignAction = useCallback((action: CampaignAction, customLabel?: string) => {
    dispatch({ type: 'SET_CAMPAIGN_ACTION', action, customLabel })
  }, [])

  const setCampaignReward = useCallback((amount: number) => {
    dispatch({ type: 'SET_CAMPAIGN_REWARD', amount })
  }, [])

  const setCampaignStrictness = useCallback((strictness: VerificationStrictness) => {
    dispatch({ type: 'SET_CAMPAIGN_STRICTNESS', strictness })
  }, [])

  const toggleCampaignGate = useCallback((gateId: CampaignGateId) => {
    dispatch({ type: 'TOGGLE_CAMPAIGN_GATE', gateId })
  }, [])

  const publishCampaignPreview = useCallback(() => {
    dispatch({ type: 'PUBLISH_CAMPAIGN_PREVIEW' })
  }, [])

  const openStudioPreview = useCallback(() => {
    dispatch({ type: 'OPEN_STUDIO_PREVIEW' })
  }, [])

  const setStudioClip = useCallback((clipId: string) => {
    dispatch({ type: 'SET_STUDIO_CLIP', clipId })
  }, [])

  const toggleStudioCaptions = useCallback(() => {
    dispatch({ type: 'TOGGLE_STUDIO_CAPTIONS' })
  }, [])

  const toggleStudioRewardOverlay = useCallback(() => {
    dispatch({ type: 'TOGGLE_STUDIO_REWARD_OVERLAY' })
  }, [])

  const setStudioCta = useCallback((cta: StudioCta) => {
    dispatch({ type: 'SET_STUDIO_CTA', cta })
  }, [])

  const setStudioFormat = useCallback((format: StudioFormat) => {
    dispatch({ type: 'SET_STUDIO_FORMAT', format })
  }, [])

  const generateStudioPreview = useCallback(() => {
    dispatch({ type: 'GENERATE_STUDIO_PREVIEW' })
  }, [])

  const sendStudioToCampaign = useCallback(() => {
    dispatch({ type: 'SEND_STUDIO_TO_CAMPAIGN' })
  }, [])

  const openPromo = useCallback(() => {
    dispatch({ type: 'OPEN_PROMO' })
  }, [])

  const selectPromo = useCallback((promoId: string | null) => {
    dispatch({ type: 'SELECT_PROMO', promoId })
  }, [])

  const startPromo = useCallback((promoId: string) => {
    dispatch({ type: 'START_PROMO', promoId })
  }, [])

  const verifyPromo = useCallback(() => {
    dispatch({ type: 'VERIFY_PROMO' })
  }, [])

  const claimPromoReward = useCallback(() => {
    dispatch({ type: 'CLAIM_PROMO_REWARD' })
  }, [])

  const dismissPromoClaim = useCallback(() => {
    dispatch({ type: 'DISMISS_PROMO_CLAIM' })
  }, [])

  const openUnifiedProfile = useCallback(() => {
    dispatch({ type: 'OPEN_UNIFIED_PROFILE' })
  }, [])

  const setProfilePlatformFilter = useCallback((filter: ProfilePlatformFilter) => {
    dispatch({ type: 'SET_PROFILE_PLATFORM_FILTER', filter })
  }, [])

  const selectProfileContent = useCallback((contentId: string | null) => {
    dispatch({ type: 'SELECT_PROFILE_CONTENT', contentId })
  }, [])

  const openACoins = useCallback(() => {
    dispatch({ type: 'OPEN_ACOINS' })
  }, [])

  const setACoinsTab = useCallback((tab: ACoinsTab) => {
    dispatch({ type: 'SET_ACOINS_TAB', tab })
  }, [])

  const selectAlphabetUnit = useCallback((unitId: AlphabetUnitId) => {
    dispatch({ type: 'SELECT_ALPHABET_UNIT', unitId })
  }, [])

  const openPOPLive = useCallback(() => {
    dispatch({ type: 'OPEN_POP_LIVE' })
  }, [])

  const startPOPLive = useCallback(() => {
    dispatch({ type: 'START_POP_LIVE' })
  }, [])

  const pausePOPLive = useCallback(() => {
    dispatch({ type: 'PAUSE_POP_LIVE' })
  }, [])

  const resetPOPLive = useCallback(() => {
    dispatch({ type: 'RESET_POP_LIVE' })
  }, [])

  const setPOPLiveTab = useCallback((tab: POPLiveTab) => {
    dispatch({ type: 'SET_POP_LIVE_TAB', tab })
  }, [])

  const togglePOPLiveSignal = useCallback((signalId: POPLiveSignalId) => {
    dispatch({ type: 'TOGGLE_POP_LIVE_SIGNAL', signalId })
  }, [])

  const updatePOPLiveFrame = useCallback(
    (payload: {
      frame: POPLiveFrame
      score: number
      eligibility: POPLiveEligibility
      driftState: POPLiveDriftState
      simTick?: number
    }) => {
      dispatch({ type: 'UPDATE_POP_LIVE_FRAME', ...payload })
    },
    [],
  )

  const setPopTrackingMode = useCallback((mode: POPTrackingMode) => {
    dispatch({ type: 'SET_POP_TRACKING_MODE', mode })
  }, [])

  const setWebGazerStatus = useCallback(
    (status: POPWebGazerStatus, error?: string | null) => {
      dispatch({ type: 'SET_WEBGAZER_STATUS', status, error })
    },
    [],
  )

  const registerCalibrationPoint = useCallback((pointId: number) => {
    dispatch({ type: 'REGISTER_CALIBRATION_POINT', pointId })
  }, [])

  const webGazerFallbackSimulated = useCallback((error?: string | null) => {
    dispatch({ type: 'WEBGAZER_FALLBACK_SIMULATED', error })
  }, [])

  const openThreeLoops = useCallback(() => {
    dispatch({ type: 'OPEN_THREE_LOOPS' })
  }, [])

  const setSelectedLoop = useCallback((loopId: ThreeLoopId) => {
    dispatch({ type: 'SET_SELECTED_LOOP', loopId })
  }, [])

  const openCreatorDashboard = useCallback(() => {
    dispatch({ type: 'OPEN_CREATOR_DASHBOARD' })
  }, [])

  const setCreatorDashboardTab = useCallback((tab: CreatorDashboardTab) => {
    dispatch({ type: 'SET_CREATOR_DASHBOARD_TAB', tab })
  }, [])

  const setCreatorPlatformFilter = useCallback((platform: CreatorPlatformFilter) => {
    dispatch({ type: 'SET_CREATOR_PLATFORM_FILTER', platform })
  }, [])

  const selectCreatorContent = useCallback((contentId: string | null) => {
    dispatch({ type: 'SELECT_CREATOR_CONTENT', contentId })
  }, [])

  const openBrandDashboard = useCallback(() => {
    dispatch({ type: 'OPEN_BRAND_DASHBOARD' })
  }, [])

  const setBrandDashboardTab = useCallback((tab: BrandDashboardTab) => {
    dispatch({ type: 'SET_BRAND_DASHBOARD_TAB', tab })
  }, [])

  const setBrandCta = useCallback((cta: CampaignAction) => {
    dispatch({ type: 'SET_BRAND_CTA', cta })
  }, [])

  const openMoneyMap = useCallback(() => {
    dispatch({ type: 'OPEN_MONEY_MAP' })
  }, [])

  const setMoneyMapTab = useCallback((tab: MoneyMapTab) => {
    dispatch({ type: 'SET_MONEY_MAP_TAB', tab })
  }, [])

  const selectMoneyNode = useCallback((nodeId: string) => {
    dispatch({ type: 'SELECT_MONEY_NODE', nodeId })
  }, [])

  const presenterNext = useCallback(() => {
    const nextIndex = Math.min(
      state.presenterStepIndex + 1,
      PRESENTER_STEPS.length - 1,
    )
    goPresenterStep(nextIndex)
  }, [state.presenterStepIndex, goPresenterStep])

  const presenterBack = useCallback(() => {
    const prevIndex = Math.max(state.presenterStepIndex - 1, 0)
    goPresenterStep(prevIndex)
  }, [state.presenterStepIndex, goPresenterStep])

  const setWalletTab = useCallback((tab: WalletTab) => {
    dispatch({ type: 'SET_WALLET_TAB', tab })
  }, [])

  const openReceipt = useCallback((receiptId: string, returnView?: InvestorView) => {
    dispatch({ type: 'OPEN_RECEIPT', receiptId, returnView })
  }, [])

  const setSelectedReceipt = useCallback((receiptId: string | null) => {
    dispatch({ type: 'SET_SELECTED_RECEIPT', receiptId })
  }, [])

  const returnFromReceipt = useCallback(() => {
    dispatch({ type: 'RETURN_FROM_RECEIPT' })
  }, [])

  const openClickEarn = useCallback(() => {
    dispatch({ type: 'OPEN_CLICK_EARN' })
  }, [])

  const tapClickEarnLike = useCallback(() => {
    dispatch({ type: 'TAP_CLICK_EARN_LIKE' })
  }, [])

  const startClickEarnHold = useCallback(() => {
    dispatch({ type: 'START_CLICK_EARN_HOLD' })
  }, [])

  const updateClickEarnAmount = useCallback((amount: number, meter: number) => {
    dispatch({ type: 'UPDATE_CLICK_EARN_AMOUNT', amount, meter })
  }, [])

  const releaseClickEarn = useCallback(() => {
    dispatch({ type: 'RELEASE_CLICK_EARN' })
  }, [])

  const confirmClickEarn = useCallback(() => {
    dispatch({ type: 'CONFIRM_CLICK_EARN' })
  }, [])

  const cancelClickEarn = useCallback(() => {
    dispatch({ type: 'CANCEL_CLICK_EARN' })
  }, [])

  const resetClickEarn = useCallback(() => {
    dispatch({ type: 'RESET_CLICK_EARN' })
  }, [])

  const openProductMap = useCallback(() => {
    dispatch({ type: 'OPEN_PRODUCT_MAP' })
  }, [])

  const selectProductMapNode = useCallback((nodeId: ProductMapNodeId) => {
    dispatch({ type: 'SELECT_PRODUCT_MAP_NODE', nodeId })
  }, [])

  const setDemoMode = useCallback(
    (mode: DemoMode) => {
      dispatch({ type: 'SET_DEMO_MODE', mode })
      dispatch({ type: 'SHOW_TOAST', message: demoModeToastLabel(mode) })

      if (mode === 'user') {
        dispatch({ type: 'SET_PRESENTER_STEP', index: 1 })
        dispatch({ type: 'GO_VIEW', view: 'feed' })
        return
      }
      if (mode === 'creator') {
        dispatch({ type: 'OPEN_CREATOR_DASHBOARD' })
        return
      }
      if (mode === 'brand') {
        dispatch({ type: 'OPEN_BRAND_DASHBOARD' })
        return
      }
      dispatch({ type: 'OPEN_PROMO' })
    },
    [],
  )

  const openAttentionAnalytics = useCallback(() => {
    dispatch({ type: 'OPEN_ATTENTION_ANALYTICS' })
  }, [])

  const setAnalyticsView = useCallback((view: AnalyticsView) => {
    dispatch({ type: 'SET_ANALYTICS_VIEW', view })
  }, [])

  const setAnalyticsRange = useCallback((range: AnalyticsRange) => {
    dispatch({ type: 'SET_ANALYTICS_RANGE', range })
  }, [])

  const selectAnalyticsInsight = useCallback((insightId: AnalyticsInsightId | null) => {
    dispatch({ type: 'SELECT_ANALYTICS_INSIGHT', insightId })
  }, [])

  const openRemoteControl = useCallback(() => {
    dispatch({ type: 'OPEN_REMOTE_CONTROL' })
  }, [])

  const startRemoteSim = useCallback(() => {
    dispatch({ type: 'START_REMOTE_SIM' })
  }, [])

  const pauseRemoteSim = useCallback(() => {
    dispatch({ type: 'PAUSE_REMOTE_SIM' })
  }, [])

  const resetRemoteSim = useCallback(() => {
    dispatch({ type: 'RESET_REMOTE_SIM' })
  }, [])

  const setRemoteMode = useCallback((mode: RemoteMode) => {
    dispatch({ type: 'SET_REMOTE_MODE', mode })
  }, [])

  const selectRemoteTarget = useCallback((targetId: RemoteTargetId) => {
    dispatch({ type: 'SELECT_REMOTE_TARGET', targetId })
  }, [])

  const updateRemoteFrame = useCallback(
    (payload: {
      cursor: RemoteCursorPosition
      activationProgress: number
      selectedTarget?: RemoteTargetId
      logEntry?: RemoteCommandLogEntry
    }) => {
      dispatch({ type: 'UPDATE_REMOTE_FRAME', ...payload })
    },
    [],
  )

  const openRemoteTarget = useCallback(() => {
    dispatch({ type: 'OPEN_REMOTE_TARGET' })
  }, [])

  const openElo = useCallback(() => {
    dispatch({ type: 'OPEN_ELO' })
  }, [])

  const setEloMode = useCallback((mode: EloMode) => {
    dispatch({ type: 'SET_ELO_MODE', mode })
  }, [])

  const selectEloPrompt = useCallback((promptId: EloPromptId) => {
    dispatch({ type: 'SELECT_ELO_PROMPT', promptId })
  }, [])

  const openOnboarding = useCallback(() => {
    dispatch({ type: 'OPEN_ONBOARDING' })
  }, [])

  const setOnboardingStep = useCallback((step: number) => {
    dispatch({ type: 'SET_ONBOARDING_STEP', step })
  }, [])

  const setOnboardingMode = useCallback((mode: OnboardingMode) => {
    dispatch({ type: 'SET_ONBOARDING_MODE', mode })
  }, [])

  const toggleOnboardingPlatform = useCallback((platformId: OnboardingPlatformId) => {
    dispatch({ type: 'TOGGLE_ONBOARDING_PLATFORM', platformId })
  }, [])

  const toggleOnboardingInterest = useCallback((interestId: OnboardingInterestId) => {
    dispatch({ type: 'TOGGLE_ONBOARDING_INTEREST', interestId })
  }, [])

  const finishOnboarding = useCallback((destination: OnboardingFinishDestination) => {
    dispatch({ type: 'FINISH_ONBOARDING', destination })
  }, [])

  return {
    state,
    goView,
    setFeedIndex,
    selectOffer,
    startVerification,
    setWatchProgress,
    completeGate,
    claimReward,
    likeToggle,
    saveToggle,
    showToast,
    setPresenterStep,
    goPresenterStep,
    presenterNext,
    presenterBack,
    reset,
    openConvert,
    confirmConvert,
    openTip,
    confirmTip,
    openPay,
    setPayAmount,
    setPayMode,
    confirmPay,
    openWithdraw,
    setWithdrawAmount,
    setWithdrawMethod,
    confirmWithdraw,
    openConnectPlatforms,
    togglePlatform,
    openCampaignPreview,
    setCampaignAction,
    setCampaignReward,
    setCampaignStrictness,
    toggleCampaignGate,
    publishCampaignPreview,
    openStudioPreview,
    setStudioClip,
    toggleStudioCaptions,
    toggleStudioRewardOverlay,
    setStudioCta,
    setStudioFormat,
    generateStudioPreview,
    sendStudioToCampaign,
    openPromo,
    selectPromo,
    startPromo,
    verifyPromo,
    claimPromoReward,
    dismissPromoClaim,
    openUnifiedProfile,
    setProfilePlatformFilter,
    selectProfileContent,
    openACoins,
    setACoinsTab,
    selectAlphabetUnit,
    openPOPLive,
    startPOPLive,
    pausePOPLive,
    resetPOPLive,
    setPOPLiveTab,
    togglePOPLiveSignal,
    updatePOPLiveFrame,
    setPopTrackingMode,
    setWebGazerStatus,
    registerCalibrationPoint,
    webGazerFallbackSimulated,
    openThreeLoops,
    setSelectedLoop,
    openCreatorDashboard,
    setCreatorDashboardTab,
    setCreatorPlatformFilter,
    selectCreatorContent,
    openBrandDashboard,
    setBrandDashboardTab,
    setBrandCta,
    openMoneyMap,
    setMoneyMapTab,
    selectMoneyNode,
    setWalletTab,
    openReceipt,
    setSelectedReceipt,
    returnFromReceipt,
    openClickEarn,
    tapClickEarnLike,
    startClickEarnHold,
    updateClickEarnAmount,
    releaseClickEarn,
    confirmClickEarn,
    cancelClickEarn,
    resetClickEarn,
    openProductMap,
    selectProductMapNode,
    setDemoMode,
    openAttentionAnalytics,
    setAnalyticsView,
    setAnalyticsRange,
    selectAnalyticsInsight,
    openRemoteControl,
    startRemoteSim,
    pauseRemoteSim,
    resetRemoteSim,
    setRemoteMode,
    selectRemoteTarget,
    updateRemoteFrame,
    openRemoteTarget,
    openElo,
    setEloMode,
    selectEloPrompt,
    openOnboarding,
    setOnboardingStep,
    setOnboardingMode,
    toggleOnboardingPlatform,
    toggleOnboardingInterest,
    finishOnboarding,
  }
}

// ─── Context ───────────────────────────────────────────────────────────────

export const InvestorDemoContext = createContext<ReturnType<typeof useInvestorDemoState> | null>(
  null,
)

export function useInvestorDemo() {
  const ctx = useContext(InvestorDemoContext)
  if (!ctx) {
    throw new Error('useInvestorDemo must be used inside InvestorDemoScreen')
  }
  return ctx
}
