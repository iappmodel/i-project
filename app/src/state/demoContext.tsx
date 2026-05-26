import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_SPONSORED_OFFER,
  initialTransactions,
  WALLET_INITIAL,
} from '../data/demoData'
import { buildDemoProofPacket } from '../lib/demoProofPacket'
import { isAutoSettleEnabled } from '../lib/settlementConfig'
import { submitProofPacket } from '../lib/popValidator'
import {
  canIssueAttentionReward,
  canValidateSession,
  createAttentionSession,
} from './attentionSession'
import { useDeepLinkProofSession } from './useDeepLinkProofSession'
import { useLiveWalletSync } from './useLiveWalletSync'
import { useProofEvents, type ProofSealedEvent } from './useProofEvents'
import { useSupabaseAuth } from './useSupabaseAuth'
import type {
  DemoContextValue,
  DemoScreenId,
  DemoState,
  Offer,
  ProductTabId,
  Transaction,
} from './types'

const TAB_SCREENS: Record<ProductTabId, DemoScreenId> = {
  feed: 'feed',
  earn: 'earn',
  wallet: 'wallet',
  profile: 'profile',
}

function tabForScreen(screen: DemoScreenId): ProductTabId | null {
  if (screen === 'feed' || screen === 'earn' || screen === 'wallet' || screen === 'profile') {
    return screen
  }
  if (screen === 'convert' || screen === 'withdraw-preview' || screen === 'creator-economics') {
    return 'wallet'
  }
  if (screen === 'proof-layer' || screen === 'roadmap') {
    return 'profile'
  }
  return null
}

function withScreen(prev: DemoState, screen: DemoScreenId): DemoState {
  const next: DemoState = { ...prev, currentScreen: screen }
  const tab = tabForScreen(screen)
  if (tab) {
    next.activeTab = tab
  }
  if (screen === 'watch-verify' && prev.verificationStatus !== 'verifying') {
    next.verificationStatus = 'watching'
  }
  return next
}

const defaultState = (): DemoState => ({
  currentScreen: 'splash',
  appMode: 'product',
  activeTab: 'feed',
  walletBalance: WALLET_INITIAL.walletBalanceUsd,
  pendingBalance: WALLET_INITIAL.pendingBalance,
  aCoins: WALLET_INITIAL.aCoins,
  iCoins: WALLET_INITIAL.iCoins,
  iCoinsPending: WALLET_INITIAL.iCoinsPending,
  transactions: initialTransactions(),
  selectedOffer: null,
  verificationStatus: 'idle',
  attentionSession: null,
  walletBackend: 'mock',
  settlementMode: null,
  popHolds: [],
  walletSyncError: null,
  walletSyncing: false,
  settlingSessionId: null,
  proofSubmitting: false,
  proofFlash: null,
})

export const DemoContext = createContext<DemoContextValue | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(defaultState)
  const liveWallet = useLiveWalletSync()
  const supabaseAuth = useSupabaseAuth()
  const authUserId = supabaseAuth.user?.id ?? null

  const navigateTo = useCallback((screen: DemoScreenId) => {
    setState((prev) => withScreen(prev, screen))
  }, [])

  const onProofSealed = useCallback(
    (event: ProofSealedEvent) => {
      void liveWallet.refreshPendingHolds()
      const label =
        event.source === 'flutter'
          ? `Flutter proof sealed · ${event.sessionId.slice(0, 12)}…`
          : `Proof sealed · ${event.reviewStatus}`
      setState((prev) => {
        const next = { ...prev, proofFlash: label }
        return event.source === 'flutter' ? withScreen(next, 'wallet') : next
      })
      window.setTimeout(() => {
        setState((prev) => (prev.proofFlash === label ? { ...prev, proofFlash: null } : prev))
      }, 6000)
    },
    [liveWallet.refreshPendingHolds],
  )

  const proofEvents = useProofEvents(onProofSealed)

  useDeepLinkProofSession(navigateTo, (sessionId) => {
    setState((prev) => ({
      ...prev,
      proofFlash: `Deep link · ${sessionId.slice(0, 12)}…`,
    }))
  })

  useEffect(() => {
    if (liveWallet.walletBackend !== 'live' || liveWallet.popHolds.length === 0) return
    setState((prev) => liveWallet.applyHoldSync(prev, liveWallet.popHolds))
  }, [liveWallet.popHolds, liveWallet.applyHoldSync, liveWallet.walletBackend])

  const setActiveTab = useCallback((tab: ProductTabId) => {
    setState((prev) => ({
      ...prev,
      appMode: 'product',
      activeTab: tab,
      currentScreen: TAB_SCREENS[tab],
    }))
  }, [])

  const startPresenterTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      appMode: 'presenter',
      currentScreen: 'splash',
      activeTab: 'feed',
    }))
  }, [])

  const exitPresenter = useCallback(() => {
    setState((prev) => ({
      ...prev,
      appMode: 'product',
      activeTab: 'feed',
      currentScreen: 'feed',
    }))
  }, [])

  const enterProduct = useCallback(() => {
    setState((prev) => ({
      ...prev,
      appMode: 'product',
      activeTab: 'feed',
      currentScreen: 'feed',
    }))
  }, [])

  const resetDemo = useCallback(() => {
    liveWallet.resetLiveWallet()
    setState(defaultState())
  }, [liveWallet])

  const selectOffer = useCallback((offer: Offer) => {
    setState((prev) => ({
      ...prev,
      selectedOffer: offer,
      currentScreen: 'offer-detail',
      activeTab: 'earn',
      attentionSession: null,
      verificationStatus: 'idle',
    }))
  }, [])

  const startWatchFlow = useCallback(() => {
    navigateTo('consent-camera-gate')
  }, [navigateTo])

  const acceptConsentAndBeginSession = useCallback(() => {
    setState((prev) => {
      const offerId = prev.selectedOffer?.id ?? DEFAULT_SPONSORED_OFFER.id
      return {
        ...prev,
        attentionSession: createAttentionSession(offerId),
        verificationStatus: 'watching',
        currentScreen: 'watch-verify',
        activeTab: 'earn',
      }
    })
  }, [])

  const completeVerification = useCallback(() => {
    setState((prev) => {
      if (!canValidateSession(prev.attentionSession)) {
        return prev
      }
      if (prev.verificationStatus !== 'watching') {
        return {
          ...prev,
          attentionSession: { ...prev.attentionSession, status: 'failed' },
        }
      }
      return {
        ...prev,
        verificationStatus: 'verifying',
        currentScreen: 'verification-result',
        activeTab: 'earn',
        attentionSession: {
          ...prev.attentionSession,
          status: 'validated',
          validatedAt: Date.now(),
          acsScore: 80,
        },
      }
    })
  }, [])

  const claimReward = useCallback(() => {
    setState((prev) => {
      if (!canIssueAttentionReward(prev.attentionSession)) {
        return prev
      }
      return {
        ...prev,
        currentScreen: 'reward-reveal',
        activeTab: 'earn',
      }
    })
  }, [])

  const finishRewardMock = useCallback(() => {
    setState((prev) => {
      if (!canIssueAttentionReward(prev.attentionSession)) {
        return prev
      }

      const add =
        prev.selectedOffer?.rewardICoins ?? DEFAULT_SPONSORED_OFFER.rewardICoins
      const brand = prev.selectedOffer?.brand ?? 'Campaign'
      const tx: Transaction = {
        id: `tx-${Date.now()}`,
        source: brand === 'Nike Running' ? 'Nike campaign' : `${brand}`,
        timeLabel: 'Settling…',
        amountDisplay: `+${add.toFixed(2)} i pending`,
        kind: 'pending',
      }
      return {
        ...prev,
        iCoinsPending: prev.iCoinsPending + add,
        transactions: [tx, ...prev.transactions],
        verificationStatus: 'idle',
        currentScreen: 'wallet',
        activeTab: 'wallet',
        attentionSession: {
          ...prev.attentionSession,
          status: 'redeemed',
          redeemedAt: Date.now(),
        },
      }
    })

    window.setTimeout(() => {
      setState((prev) => {
        if (prev.attentionSession?.status !== 'redeemed') return prev
        const pendingTx = prev.transactions.find(
          (t) => t.kind === 'pending' && t.timeLabel === 'Settling…',
        )
        if (!pendingTx) return prev
        const match = pendingTx.amountDisplay.match(/\+([\d.]+)/)
        const add = match ? parseFloat(match[1]) : 0
        if (add <= 0) return prev
        return {
          ...prev,
          iCoins: prev.iCoins + add,
          iCoinsPending: Math.max(0, prev.iCoinsPending - add),
          walletBalance: prev.walletBalance + add * 0.11,
          attentionSession: null,
          transactions: prev.transactions.map((t) =>
            t.id === pendingTx.id
              ? {
                  ...t,
                  timeLabel: 'Just now',
                  amountDisplay: t.amountDisplay.replace(' pending', ''),
                  kind: 'positive' as const,
                }
              : t,
          ),
        }
      })
    }, 1200)
  }, [])

  const finishRewardToWallet = useCallback(() => {
    if (liveWallet.walletBackend !== 'live') {
      finishRewardMock()
      return
    }

    setState((prev) => {
      if (!canIssueAttentionReward(prev.attentionSession)) {
        return prev
      }
      const offer = prev.selectedOffer ?? DEFAULT_SPONSORED_OFFER
      const session = prev.attentionSession

      void (async () => {
        setState((inner) => ({ ...inner, proofSubmitting: true }))
        try {
          const packet = buildDemoProofPacket({ session, offer })
          const result = await submitProofPacket(packet, `WEB-${session.id.slice(0, 8)}`)
          await liveWallet.refreshPendingHolds()
          if (isAutoSettleEnabled() && result.sessionId) {
            await liveWallet.settlePopHold(result.sessionId, authUserId)
          }
          setState((inner) => ({ ...inner, proofSubmitting: false, walletSyncError: null }))
        } catch (error) {
          setState((inner) => ({
            ...inner,
            proofSubmitting: false,
            walletSyncError:
              error instanceof Error ? error.message : 'Proof submission failed',
          }))
        }
      })()

      return {
        ...prev,
        verificationStatus: 'idle',
        currentScreen: 'wallet',
        activeTab: 'wallet',
        attentionSession: {
          ...prev.attentionSession,
          status: 'redeemed',
          redeemedAt: Date.now(),
        },
      }
    })

    window.setTimeout(() => {
      setState((prev) =>
        prev.attentionSession?.status === 'redeemed'
          ? { ...prev, attentionSession: null }
          : prev,
      )
    }, 500)
  }, [finishRewardMock, liveWallet, authUserId])

  const settlePopHoldWithAuth = useCallback(
    (sessionId: string) => liveWallet.settlePopHold(sessionId, authUserId),
    [liveWallet, authUserId],
  )

  const canCollectReward = canIssueAttentionReward(state.attentionSession)
  const canRedeemReward = canIssueAttentionReward(state.attentionSession)

  const value = useMemo<DemoContextValue>(
    () => ({
      ...state,
      walletBackend: liveWallet.walletBackend,
      settlementMode: liveWallet.settlementMode,
      popHolds: liveWallet.popHolds,
      walletSyncError: liveWallet.syncError ?? state.walletSyncError,
      walletSyncing: liveWallet.isSyncing || state.proofSubmitting,
      settlingSessionId: liveWallet.settlingSessionId,
      proofSubmitting: state.proofSubmitting,
      setScreen: navigateTo,
      setActiveTab,
      startPresenterTour,
      exitPresenter,
      enterProduct,
      resetDemo,
      jumpFeed: () => setActiveTab('feed'),
      jumpEarn: () => setActiveTab('earn'),
      jumpWallet: () => setActiveTab('wallet'),
      jumpProfile: () => setActiveTab('profile'),
      selectOffer,
      startWatchFlow,
      acceptConsentAndBeginSession,
      completeVerification,
      claimReward,
      finishRewardToWallet,
      refreshPendingHolds: liveWallet.refreshPendingHolds,
      settlePopHold: settlePopHoldWithAuth,
      canCollectReward,
      canRedeemReward,
      supabaseAuthEnabled: supabaseAuth.enabled,
      authUserEmail: supabaseAuth.user?.email ?? null,
      authUserId: authUserId,
      authLoading: supabaseAuth.loading,
      authError: supabaseAuth.authError,
      signInDemo: supabaseAuth.signInDemo,
      signOutDemo: supabaseAuth.signOut,
      proofEventsConnected: proofEvents.connected,
      eloStatusLine: proofEvents.eloStatusLine,
      lastProofEvent: proofEvents.lastEvent,
      proofFlash: state.proofFlash,
    }),
    [
      state,
      liveWallet,
      supabaseAuth,
      authUserId,
      proofEvents.connected,
      proofEvents.eloStatusLine,
      proofEvents.lastEvent,
      settlePopHoldWithAuth,
      navigateTo,
      setActiveTab,
      startPresenterTour,
      exitPresenter,
      enterProduct,
      resetDemo,
      selectOffer,
      startWatchFlow,
      acceptConsentAndBeginSession,
      completeVerification,
      claimReward,
      finishRewardToWallet,
      canCollectReward,
      canRedeemReward,
    ],
  )

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}
