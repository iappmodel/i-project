import { useCallback, useState } from 'react'
import {
  demoPaymentMethods,
  fetchPaymentMethods,
  fetchPayoutRequests,
  requestPayout,
  requestPayoutDemo,
  type PaymentMethodRow,
  type PayoutRequestRow,
  type RequestPayoutParams,
  type RequestPayoutResult,
} from '../services/payout.service'

type UsePayoutOptions = {
  coinType?: 'icoin' | 'vicoin'
  balances: { icoin: number; vicoin: number }
  walletBackend: 'mock' | 'live'
}

export function usePayout({ coinType = 'icoin', balances, walletBackend }: UsePayoutOptions) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([])
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequestRow[]>([])
  const [loadingMethods, setLoadingMethods] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadPaymentMethods = useCallback(async () => {
    setLoadingMethods(true)
    try {
      const list = walletBackend === 'live' ? await fetchPaymentMethods() : demoPaymentMethods()
      setPaymentMethods(list)
    } finally {
      setLoadingMethods(false)
    }
  }, [walletBackend])

  const loadPayoutHistory = useCallback(async () => {
    if (walletBackend !== 'live') return
    setLoadingHistory(true)
    try {
      setPayoutHistory(await fetchPayoutRequests(8))
    } finally {
      setLoadingHistory(false)
    }
  }, [walletBackend])

  const submitPayout = useCallback(
    async (params: Omit<RequestPayoutParams, 'coinType'> & { coinType?: 'icoin' | 'vicoin' }): Promise<RequestPayoutResult> => {
      setSubmitting(true)
      try {
        const full: RequestPayoutParams = { ...params, coinType: params.coinType ?? coinType }
        return walletBackend === 'live'
          ? await requestPayout(full)
          : await requestPayoutDemo(full, balances)
      } finally {
        setSubmitting(false)
      }
    },
    [balances, coinType, walletBackend],
  )

  return {
    paymentMethods,
    payoutHistory,
    loadingMethods,
    loadingHistory,
    submitting,
    loadPaymentMethods,
    loadPayoutHistory,
    submitPayout,
  }
}
