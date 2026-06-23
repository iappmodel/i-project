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
  | { type: 'RESET' }

function cloneSeedTransactions(): InvestorTransaction[] {
  return SEED_TRANSACTIONS.map((tx) => ({ ...tx }))
}

/** Total spendable for tips: usable first, then verified fallback */
export function tipSpendableBalance(usable: number, verified: number): number {
  return +(usable + verified).toFixed(2)
}

function debitForTip(
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

      const debited = debitForTip(state.usableBalance, state.walletBalance, amount)
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
