import { useCallback, useEffect, useRef, useState } from 'react'
import {
  countPendingAttestations,
  mergeHoldTransactions,
  sumPendingIcoins,
} from '../lib/walletHoldMerge'
import { fetchPendingHolds, fetchValidatorHealth, settlePendingHold, type PopPendingHold } from '../lib/popValidator'
import { getPopValidatorBaseUrl, isLiveWalletEnabled } from '../lib/settlementConfig'
import type { DemoState } from '../state/types'

export interface LiveWalletSyncState {
  walletBackend: 'mock' | 'live'
  settlementMode: 'supabase' | 'local-json' | null
  popHolds: PopPendingHold[]
  syncError: string | null
  isSyncing: boolean
  settlingSessionId: string | null
  refreshPendingHolds: () => Promise<void>
  settlePopHold: (sessionId: string) => Promise<void>
  applyHoldSync: (prev: DemoState, holds: PopPendingHold[]) => DemoState
  resetLiveWallet: () => void
}

function formatSyncError(error: unknown): string {
  const base = getPopValidatorBaseUrl() ?? 'validator'
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return `Validator unreachable at ${base} — run ./scripts/dev_stack.sh`
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Sync failed'
}

export function useLiveWalletSync(): LiveWalletSyncState {
  const live = isLiveWalletEnabled()
  const [popHolds, setPopHolds] = useState<PopPendingHold[]>([])
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [settlementMode, setSettlementMode] = useState<'supabase' | 'local-json' | null>(null)
  const [settlingSessionId, setSettlingSessionId] = useState<string | null>(null)
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
      setSyncError(formatSyncError(error))
    } finally {
      setIsSyncing(false)
    }
  }, [live])

  const settlePopHold = useCallback(
    async (sessionId: string) => {
      if (!live) return
      setSettlingSessionId(sessionId)
      try {
        await settlePendingHold(sessionId)
        await refreshPendingHolds()
        setSyncError(null)
      } catch (error) {
        setSyncError(formatSyncError(error))
      } finally {
        setSettlingSessionId(null)
      }
    },
    [live, refreshPendingHolds],
  )

  useEffect(() => {
    if (!live) return
    void fetchValidatorHealth().then((health) => {
      setSettlementMode(health?.settlement ?? null)
    })
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
    settlementMode,
    popHolds,
    syncError,
    isSyncing,
    settlingSessionId,
    refreshPendingHolds,
    settlePopHold,
    applyHoldSync,
    resetLiveWallet,
  }
}
