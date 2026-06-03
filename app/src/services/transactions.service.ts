import { getSupabaseClient } from '../lib/supabaseClient'
import type { Transaction } from '../state/types'

export interface DbTransactionRow {
  id: string
  type: string
  coin_type: string
  amount: number
  description: string
  created_at: string
}

function relativeTimeLabel(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function coinSuffix(coinType: string): string {
  return coinType === 'vicoin' ? 'v' : 'i'
}

function mapRow(row: DbTransactionRow): Transaction {
  const negative = row.type === 'spent' || row.type === 'sent' || row.type === 'withdrawn'
  const pending = row.description.toLowerCase().includes('pending')
  const sign = negative ? '−' : '+'
  return {
    id: row.id,
    source: row.description,
    timeLabel: relativeTimeLabel(row.created_at),
    amountDisplay: `${sign}${row.amount} ${coinSuffix(row.coin_type)}`,
    kind: pending ? 'pending' : negative ? 'negative' : 'positive',
  }
}

export async function fetchWalletTransactions(limit = 20): Promise<Transaction[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('transactions')
    .select('id, type, coin_type, amount, description, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return (data as DbTransactionRow[]).map(mapRow)
}
