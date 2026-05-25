import { useCallback, useEffect, useRef, useState } from 'react'
import {
  countPendingAttestations,
  mergeHoldTransactions,
  sumPendingIcoins,
} from '../lib/walletHoldMerge'
import { fetchPendingHolds, type PopPendingHold } from '../lib/popValidator'
import { isLiveWalletEnabled } from '../lib/settlementConfig'
import type { DemoState } from '../state/types'

export interface LiveWalletSyncState {
  walletBackend: 'mock' | 'live'
  popHolds: PopPendingHold[]
  syncError: string | null
  isSyncing: boolean
  refreshPendingHolds: () => Promise<void>
  applyHoldSync: (prev: DemoState, holds: PopPendingHold[]) => DemoState
  resetLiveWallet: () => void
}

export function useLiveWalletSync(): LiveWalletSyncState {
  const live = isLiveWalletEnabled()
  const [popHolds, setPopHolds] = useState<PopPendingHold[]>([])
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const creditedSessionsRef = useRef<Set<string>>(new Set())

  const resetLiveWallet = useCallback(() => {
    creditedSessionsRef.current.clear()
    setPopHolds([])
    setSyncError(null)
  }, [])

  const applyHoldSync = useCallback((prev: DemoState, holds: PopPendingHold[]): DemoState => {
    let iCoins = prev.iCoins
    for (const hold of holds) {
      if (
        hold.holdStatus === 'settled' &&
        hold.currency === 'icoin' &&
        !creditedSessionsRef.current.has(hold.sessionId)
      ) {
        creditedSessionsRef.current.add(hold.sessionId)
        iCoins += hold.amount
      }
    }

    const iCoinsPending = live ? sumPendingIcoins(holds) : prev.iCoinsPending
    const pendingBalance = live ? countPendingAttestations(holds) : prev.pendingBalance
    const transactions = live ? mergeHoldTransactions(prev.transactions, holds) : prev.transactions

    return {
      ...prev,
      iCoins,
      iCoinsPending,
      pendingBalance,
      transactions,
      walletBalance: live
        ? prev.walletBalance + (iCoins - prev.iCoins) * 0.11
        : prev.walletBalance,
    }
  }, [live])

  const refreshPendingHolds = useCallback(async () => {
    if (!live) return
    setIsSyncing(true)
    try {
      const holds = await fetchPendingHolds()
      setPopHolds(holds)
      setSyncError(null)
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }, [live])

  useEffect(() => {
    if (!live) return
    void refreshPendingHolds()
    const id = window.setInterval(() => {
      void refreshPendingHolds()
    }, 4000)
    return () => window.clearInterval(id)
  }, [live, refreshPendingHolds])

  return {
    walletBackend: live ? 'live' : 'mock',
    popHolds,
    syncError,
    isSyncing,
    refreshPendingHolds,
    applyHoldSync,
    resetLiveWallet,
  }
}
