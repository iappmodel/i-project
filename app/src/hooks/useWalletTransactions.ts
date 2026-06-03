import { useCallback, useEffect, useState } from 'react'
import { fetchWalletTransactions } from '../services/transactions.service'
import type { Transaction } from '../state/types'
import { useDemo } from '../state/useDemo'

export function useWalletTransactions(options?: { limit?: number; enabled?: boolean }) {
  const limit = options?.limit ?? 20
  const enabled = options?.enabled ?? true
  const { transactions: demoTx, walletBackend, authUserId } = useDemo()
  const [liveTx, setLiveTx] = useState<Transaction[] | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled || walletBackend !== 'live' || !authUserId) {
      setLiveTx(null)
      return
    }
    setLoading(true)
    try {
      const rows = await fetchWalletTransactions(limit)
      setLiveTx(rows.length > 0 ? rows : null)
    } finally {
      setLoading(false)
    }
  }, [authUserId, enabled, limit, walletBackend])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const items = liveTx ?? demoTx

  return { items, loading, refresh, isLive: liveTx !== null }
}
