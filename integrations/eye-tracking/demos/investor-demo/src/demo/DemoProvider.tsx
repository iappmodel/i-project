import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AttentionDemoContext } from './attentionDemoContext'
import { DEFAULT_SPONSORED_OFFER, initialTransactions } from './mockData'
import { DEMO_SCREEN_FLOW, flowIndex } from './screensOrder'
import type { DemoContextValue, DemoScreenId, DemoState, Offer, Transaction } from './types'

function withScreen(prev: DemoState, screen: DemoScreenId): DemoState {
  const next: DemoState = { ...prev, currentScreen: screen }
  if (screen === 'watch-verify' && prev.verificationStatus !== 'verifying') {
    next.verificationStatus = 'watching'
  }
  return next
}

const defaultState = (): DemoState => ({
  currentScreen: 'splash',
  walletBalance: 142.06,
  pendingBalance: 38,
  aCoins: 1840,
  iCoins: 847,
  transactions: initialTransactions(),
  selectedOffer: null,
  verificationStatus: 'idle',
})

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(defaultState)

  const navigateTo = useCallback((screen: DemoScreenId) => {
    setState((prev) => withScreen(prev, screen))
  }, [])

  const goPrev = useCallback(() => {
    setState((prev) => {
      const i = flowIndex(prev.currentScreen)
      const idx = i <= 0 ? DEMO_SCREEN_FLOW.length - 1 : i - 1
      return withScreen(prev, DEMO_SCREEN_FLOW[idx]!)
    })
  }, [])

  const goNext = useCallback(() => {
    setState((prev) => {
      const i = flowIndex(prev.currentScreen)
      const idx = i < 0 ? 0 : (i + 1) % DEMO_SCREEN_FLOW.length
      return withScreen(prev, DEMO_SCREEN_FLOW[idx]!)
    })
  }, [])

  const resetDemo = useCallback(() => {
    setState(defaultState())
  }, [])

  const selectOffer = useCallback((offer: Offer) => {
    setState((prev) => ({
      ...prev,
      selectedOffer: offer,
      currentScreen: 'offer-detail',
    }))
  }, [])

  const startWatchFlow = useCallback(() => {
    navigateTo('watch-verify')
  }, [navigateTo])

  /** Hand off to five-gate screen (`iapp_loop1_watch_verify_earn (5).html` step 5). */
  const completeVerification = useCallback(() => {
    setState((prev) => ({
      ...prev,
      verificationStatus: 'verifying',
      currentScreen: 'verification-result',
    }))
  }, [])

  const claimReward = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentScreen: 'reward-reveal',
    }))
  }, [])

  const finishRewardToWallet = useCallback(() => {
    setState((prev) => {
      const add =
        prev.selectedOffer?.rewardICoins ?? DEFAULT_SPONSORED_OFFER.rewardICoins
      const nextICoins = prev.iCoins + add
      const nextPending = Math.max(0, prev.pendingBalance - Math.min(prev.pendingBalance, 12))
      const nextUsd = prev.walletBalance + add * 0.11
      const brand = prev.selectedOffer?.brand ?? 'Campaign'
      const tx: Transaction = {
        id: `tx-${Date.now()}`,
        source: brand === 'Nike Running' ? 'Nike campaign' : `${brand}`,
        timeLabel: 'Just now',
        amountDisplay: `+${add.toFixed(2)} i · just now`,
        kind: 'positive',
      }
      return {
        ...prev,
        iCoins: nextICoins,
        pendingBalance: nextPending,
        walletBalance: nextUsd,
        transactions: [tx, ...prev.transactions],
        verificationStatus: 'idle',
        currentScreen: 'wallet',
      }
    })
  }, [])

  const value = useMemo<DemoContextValue>(
    () => ({
      ...state,
      setScreen: navigateTo,
      goPrev,
      goNext,
      resetDemo,
      jumpFeed: () => navigateTo('feed'),
      jumpWatch: () => navigateTo('watch-verify'),
      jumpWallet: () => navigateTo('wallet'),
      jumpEconomics: () => navigateTo('creator-economics'),
      jumpRoadmap: () => navigateTo('roadmap'),
      selectOffer,
      startWatchFlow,
      completeVerification,
      claimReward,
      finishRewardToWallet,
    }),
    [
      state,
      navigateTo,
      goPrev,
      goNext,
      resetDemo,
      selectOffer,
      startWatchFlow,
      completeVerification,
      claimReward,
      finishRewardToWallet,
    ],
  )

  return (
    <AttentionDemoContext.Provider value={value}>{children}</AttentionDemoContext.Provider>
  )
}
