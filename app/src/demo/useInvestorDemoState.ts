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
  type VerificationStrictness,
  type WithdrawMethod,
  type InvestorTransaction,
  type InvestorView,
  type VerificationGate,
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
