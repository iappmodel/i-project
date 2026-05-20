import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_SPONSORED_OFFER,
  initialTransactions,
  WALLET_INITIAL,
} from '../data/demoData'
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
  walletBalance: WALLET_INITIAL.walletBalanceUsd,
  pendingBalance: WALLET_INITIAL.pendingBalance,
  aCoins: WALLET_INITIAL.aCoins,
  iCoins: WALLET_INITIAL.iCoins,
  transactions: initialTransactions(),
  selectedOffer: null,
  verificationStatus: 'idle',
})

export const DemoContext = createContext<DemoContextValue | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(defaultState)

  const navigateTo = useCallback((screen: DemoScreenId) => {
    setState((prev) => withScreen(prev, screen))
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
      resetDemo,
      jumpFeed: () => navigateTo('feed'),
      jumpWallet: () => navigateTo('wallet'),
      selectOffer,
      startWatchFlow,
      completeVerification,
      claimReward,
      finishRewardToWallet,
    }),
    [
      state,
      navigateTo,
      resetDemo,
      selectOffer,
      startWatchFlow,
      completeVerification,
      claimReward,
      finishRewardToWallet,
    ],
  )

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}
