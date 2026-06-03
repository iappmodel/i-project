import { getSupabaseClient } from '../lib/supabaseClient'

export type PayoutMethod = 'paypal' | 'bank' | 'crypto'
export type PayoutCoinType = 'vicoin' | 'icoin'

export const MIN_PAYOUT_VICOIN = 500
export const MIN_PAYOUT_ICOIN = 1000
export const MIN_PAYOUT_ICOIN_DEMO = 50
export const MAX_PAYOUT_VICOIN = 500_000
export const MAX_PAYOUT_ICOIN = 1_000_000

export const ESTIMATED_ARRIVAL: Record<PayoutMethod, string> = {
  paypal: '1–3 business days',
  bank: '3–5 business days',
  crypto: '24–48 hours',
}

/** Matches `request-payout` edge: 2% fee, min 10, max 500 coins */
export function getPayoutFee(amount: number): { fee: number; netAmount: number } {
  const rawFee = Math.floor((amount * 2) / 100)
  const fee = Math.min(500, Math.max(10, rawFee))
  const netAmount = Math.max(0, amount - fee)
  return { fee, netAmount }
}

export function getPayoutErrorMessage(raw: string | undefined): string {
  if (!raw) return 'Payout request failed. Please try again.'
  const lower = raw.toLowerCase()
  if (lower.includes('kyc') || lower.includes('verification required')) {
    return 'Identity verification (KYC) is required before requesting a payout.'
  }
  if (lower.includes('insufficient balance')) {
    return 'Insufficient balance. Please check your wallet and try again.'
  }
  if (lower.includes('invalid') && lower.includes('payment method')) {
    return 'Invalid or unauthorized payment method. Select a valid payout destination.'
  }
  if (lower.includes('unauthorized')) return 'Session may have expired. Sign in and retry.'
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Connection issue. Check your internet and try again.'
  }
  return raw.length > 120 ? 'Something went wrong. Please try again.' : raw
}

export interface RequestPayoutParams {
  amount: number
  coinType: PayoutCoinType
  method: PayoutMethod
  paymentMethodId?: string | null
}

export interface RequestPayoutSuccess {
  success: true
  payout_request_id?: string | null
  transaction_id?: string
  amount: number
  coin_type: string
  method: string
  fee: number
  net_amount: number
  status?: string
  reference_id?: string
  estimated_arrival?: string
  new_balance?: number
}

export interface RequestPayoutFailure {
  success: false
  error: string
}

export type RequestPayoutResult = RequestPayoutSuccess | RequestPayoutFailure

export interface PayoutRequestRow {
  id: string
  amount: number
  coin_type: string
  status: string
  fee: number | null
  net_amount: number | null
  reference_id: string | null
  created_at: string
}

export interface PaymentMethodRow {
  id: string
  method_type: string
  is_default: boolean
  nickname: string | null
  details: {
    account_last4?: string
    email?: string
    wallet_address?: string
    bank_name?: string
  }
}

function minPayout(coinType: PayoutCoinType, demo: boolean): number {
  if (coinType === 'vicoin') return MIN_PAYOUT_VICOIN
  return demo ? MIN_PAYOUT_ICOIN_DEMO : MIN_PAYOUT_ICOIN
}

function maxPayout(coinType: PayoutCoinType): number {
  return coinType === 'vicoin' ? MAX_PAYOUT_VICOIN : MAX_PAYOUT_ICOIN
}

export function validatePayoutAmount(
  amount: number,
  coinType: PayoutCoinType,
  balance: number,
  demo: boolean,
): { valid: boolean; hint?: string } {
  const min = minPayout(coinType, demo)
  const max = maxPayout(coinType)
  if (!Number.isFinite(amount) || amount < min) {
    return { valid: false, hint: `Minimum payout is ${min.toLocaleString()} ${coinType}s` }
  }
  if (amount > max) {
    return { valid: false, hint: `Maximum payout is ${max.toLocaleString()} ${coinType}s` }
  }
  if (balance < amount) {
    return { valid: false, hint: 'Insufficient balance' }
  }
  return { valid: true }
}

export async function requestPayout(params: RequestPayoutParams): Promise<RequestPayoutResult> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  const { data, error } = await supabase.functions.invoke('request-payout', {
    body: {
      amount: params.amount,
      coinType: params.coinType,
      method: params.method,
      paymentMethodId: params.paymentMethodId ?? null,
    },
  })

  if (error) {
    const payload = data as { error?: string } | null
    return {
      success: false,
      error: getPayoutErrorMessage(payload?.error ?? error.message),
    }
  }

  const payload = data as RequestPayoutSuccess & { success?: boolean; error?: string }
  if (!payload?.success) {
    return {
      success: false,
      error: getPayoutErrorMessage(payload?.error ?? 'Payout request failed'),
    }
  }

  return {
    success: true,
    payout_request_id: payload.payout_request_id,
    transaction_id: payload.transaction_id,
    amount: payload.amount ?? params.amount,
    coin_type: payload.coin_type ?? params.coinType,
    method: payload.method ?? params.method,
    fee: payload.fee ?? getPayoutFee(params.amount).fee,
    net_amount: payload.net_amount ?? getPayoutFee(params.amount).netAmount,
    status: payload.status,
    reference_id: payload.reference_id,
    estimated_arrival: payload.estimated_arrival,
    new_balance: payload.new_balance,
  }
}

export async function requestPayoutDemo(
  params: RequestPayoutParams,
  balances: { icoin: number; vicoin: number },
): Promise<RequestPayoutResult> {
  await new Promise((r) => setTimeout(r, 800))
  const balance = params.coinType === 'vicoin' ? balances.vicoin : balances.icoin
  const check = validatePayoutAmount(params.amount, params.coinType, balance, true)
  if (!check.valid) {
    return { success: false, error: getPayoutErrorMessage(check.hint) }
  }

  const { fee, netAmount } = getPayoutFee(params.amount)
  const newIcoin =
    params.coinType === 'icoin' ? balances.icoin - params.amount : balances.icoin
  const newVicoin =
    params.coinType === 'vicoin' ? balances.vicoin - params.amount : balances.vicoin

  return {
    success: true,
    payout_request_id: `demo_payout_${Date.now()}`,
    transaction_id: `demo_tx_${Date.now()}`,
    amount: params.amount,
    coin_type: params.coinType,
    method: params.method,
    fee,
    net_amount: netAmount,
    status: 'pending',
    reference_id: `demo_ref_${Date.now()}`,
    estimated_arrival: ESTIMATED_ARRIVAL[params.method],
    new_balance: params.coinType === 'icoin' ? newIcoin : newVicoin,
  }
}

export async function fetchPayoutRequests(limit = 10): Promise<PayoutRequestRow[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return []

  const { data, error } = await supabase
    .from('payout_requests')
    .select('id, amount, coin_type, status, fee, net_amount, reference_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[Payout] fetchPayoutRequests:', error)
    return []
  }
  return (data ?? []) as PayoutRequestRow[]
}

export async function fetchPaymentMethods(): Promise<PaymentMethodRow[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return demoPaymentMethods()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return demoPaymentMethods()

  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, method_type, is_default, nickname, details')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })

  if (error) {
    console.error('[Payout] fetchPaymentMethods:', error)
    return demoPaymentMethods()
  }
  return (data?.length ? data : demoPaymentMethods()) as PaymentMethodRow[]
}

export function demoPaymentMethods(): PaymentMethodRow[] {
  return [
    {
      id: 'demo-bank',
      method_type: 'bank',
      is_default: true,
      nickname: 'Bank **** 9021',
      details: { account_last4: '9021', bank_name: 'Demo National Bank' },
    },
    {
      id: 'demo-paypal',
      method_type: 'paypal',
      is_default: false,
      nickname: 'PayPal',
      details: { email: 'investor.demo@iview.local' },
    },
    {
      id: 'demo-crypto',
      method_type: 'crypto',
      is_default: false,
      nickname: 'External wallet',
      details: { wallet_address: '0x…demo' },
    },
  ]
}
