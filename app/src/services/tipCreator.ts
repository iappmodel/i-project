import { getSupabaseClient } from '../lib/supabaseClient'
import type { CoinType } from '../lib/gestureButtons/types'

export interface TipCreatorRequest {
  contentId: string
  creatorId: string
  amount: number
  coinType: CoinType
  idempotencyKey?: string
}

export interface TipCreatorResult {
  success: boolean
  tip_id?: string
  amount?: number
  coin_type?: CoinType
  new_balance?: number
  error?: string
}

export async function sendTipToCreator(
  request: TipCreatorRequest,
): Promise<TipCreatorResult> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  const { data, error } = await supabase.functions.invoke('tip-creator', {
    body: {
      contentId: request.contentId,
      creatorId: request.creatorId,
      amount: request.amount,
      coinType: request.coinType,
      idempotencyKey: request.idempotencyKey,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const payload = data as TipCreatorResult & { success?: boolean }
  if (!payload?.success) {
    return { success: false, error: payload?.error ?? 'Tip failed' }
  }

  return payload
}

/** Demo settle when backend unavailable — does not mutate real balances */
export async function sendTipDemo(request: TipCreatorRequest): Promise<TipCreatorResult> {
  await new Promise((r) => setTimeout(r, 900))
  return {
    success: true,
    tip_id: `demo_${request.idempotencyKey ?? Date.now()}`,
    amount: request.amount,
    coin_type: request.coinType,
  }
}
