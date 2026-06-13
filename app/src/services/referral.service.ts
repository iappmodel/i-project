import { getSupabaseClient } from '../lib/supabaseClient'
import { readReferralCode } from '../lib/demoReferralStore'

export async function fetchReferralStats(): Promise<{ code: string; invites: number; earned: number }> {
  const supabase = getSupabaseClient()
  const code = readReferralCode()
  if (!supabase) return { code, invites: 0, earned: 0 }

  const { data, error } = await supabase.functions.invoke('manage-referral', {
    body: { action: 'get' },
  })
  if (error) return { code, invites: 0, earned: 0 }
  const p = data as { code?: string; invites?: number; earned?: number }
  return { code: p.code ?? code, invites: p.invites ?? 0, earned: p.earned ?? 0 }
}
