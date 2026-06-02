import { getSupabaseClient } from '../lib/supabaseClient'

export type TransferDirection = 'icoin_to_vicoin' | 'vicoin_to_icoin'

export interface TransferCoinsLimits {
  min: number
  max: number
  sourceCurrency: 'icoin' | 'vicoin'
  targetCurrency: 'vicoin' | 'icoin'
}

export interface TransferCoinsSuccess {
  success: true
  direction: TransferDirection
  source_spent: number
  target_received: number
  new_icoin_balance: number
  new_vicoin_balance: number
  exchange_rate: number
  transfer_id?: string
}

export interface TransferCoinsFailure {
  success: false
  error?: string
  code?: string
  limits?: TransferCoinsLimits
}

export type TransferCoinsResult = TransferCoinsSuccess | TransferCoinsFailure

const EXCHANGE_RATE = 10

export function transferLimits(direction: TransferDirection): TransferCoinsLimits {
  if (direction === 'icoin_to_vicoin') {
    return { min: 100, max: 100000, sourceCurrency: 'icoin', targetCurrency: 'vicoin' }
  }
  return { min: 1, max: 10000, sourceCurrency: 'vicoin', targetCurrency: 'icoin' }
}

export function previewTransfer(
  direction: TransferDirection,
  amount: number,
): { received: number; valid: boolean; hint?: string } {
  const limits = transferLimits(direction)
  if (!Number.isFinite(amount) || amount < limits.min || amount > limits.max) {
    return { received: 0, valid: false, hint: `Amount must be ${limits.min}–${limits.max}` }
  }
  if (direction === 'icoin_to_vicoin' && amount % EXCHANGE_RATE !== 0) {
    return { received: 0, valid: false, hint: `Icoins must be divisible by ${EXCHANGE_RATE}` }
  }
  const received =
    direction === 'icoin_to_vicoin'
      ? Math.floor(amount / EXCHANGE_RATE)
      : amount * EXCHANGE_RATE
  return { received, valid: true }
}

export async function transferCoins(
  direction: TransferDirection,
  amount: number,
): Promise<TransferCoinsResult> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  const { data, error } = await supabase.functions.invoke('transfer-coins', {
    body: { direction, amount },
  })

  if (error) {
    const payload = data as TransferCoinsFailure | null
    return {
      success: false,
      error: payload?.error ?? error.message,
      code: payload?.code,
      limits: payload?.limits,
    }
  }

  const payload = data as TransferCoinsSuccess | TransferCoinsFailure
  if (!payload?.success) {
    return {
      success: false,
      error: payload?.error ?? 'Transfer failed',
      code: (payload as TransferCoinsFailure).code,
      limits: (payload as TransferCoinsFailure).limits,
    }
  }

  return payload
}

/** Local demo when edge unavailable — mirrors archive 10:1 rules */
export async function transferCoinsDemo(
  direction: TransferDirection,
  amount: number,
  balances: { icoin: number; vicoin: number },
): Promise<TransferCoinsResult> {
  await new Promise((r) => setTimeout(r, 700))
  const preview = previewTransfer(direction, amount)
  if (!preview.valid) {
    return { success: false, error: preview.hint ?? 'Invalid amount' }
  }
  if (direction === 'icoin_to_vicoin') {
    if (balances.icoin < amount) {
      return { success: false, error: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' }
    }
    const received = preview.received
    return {
      success: true,
      direction,
      source_spent: amount,
      target_received: received,
      new_icoin_balance: balances.icoin - amount,
      new_vicoin_balance: balances.vicoin + received,
      exchange_rate: EXCHANGE_RATE,
      transfer_id: `demo_${Date.now()}`,
    }
  }
  if (balances.vicoin < amount) {
    return { success: false, error: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' }
  }
  const received = preview.received
  return {
    success: true,
    direction,
    source_spent: amount,
    target_received: received,
    new_vicoin_balance: balances.vicoin - amount,
    new_icoin_balance: balances.icoin + received,
    exchange_rate: EXCHANGE_RATE,
    transfer_id: `demo_${Date.now()}`,
  }
}
