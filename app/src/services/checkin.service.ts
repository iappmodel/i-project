import { getSupabaseClient, isSupabaseAuthEnabled } from '../lib/supabaseClient'
import { readDemoCheckIn, recordDemoCheckIn, type CheckInState } from '../lib/demoCheckInStore'

export type VerifyCheckInInput = {
  promotionId?: string | null
  userLat: number
  userLng: number
  standalone?: boolean
}

export type VerifyCheckInResult = {
  success: boolean
  streakDays?: number
  bonusPercent?: number
  error?: string
}

export async function verifyCheckIn(input: VerifyCheckInInput): Promise<VerifyCheckInResult> {
  const supabase = getSupabaseClient()
  if (!supabase || !isSupabaseAuthEnabled()) {
    const state = recordDemoCheckIn()
    return { success: true, streakDays: state.streakDays, bonusPercent: 5 }
  }

  const { data, error } = await supabase.functions.invoke('verify-checkin', {
    body: {
      promotionId: input.promotionId ?? null,
      userLat: input.userLat,
      userLng: input.userLng,
      standalone: input.standalone ?? false,
    },
  })

  if (error) {
    const state = recordDemoCheckIn()
    return { success: true, streakDays: state.streakDays, bonusPercent: 5, error: error.message }
  }

  const payload = data as VerifyCheckInResult
  return payload?.success
    ? payload
    : { success: false, error: payload?.error ?? 'Check-in failed' }
}

export async function fetchCheckInStreak(): Promise<CheckInState> {
  const supabase = getSupabaseClient()
  if (!supabase || !isSupabaseAuthEnabled()) return readDemoCheckIn()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return readDemoCheckIn()

  const { data } = await supabase
    .from('user_levels')
    .select('streak_days, longest_streak')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return readDemoCheckIn()
  return {
    streakDays: data.streak_days ?? 0,
    longestStreak: data.longest_streak ?? 0,
    lastCheckInAt: null,
  }
}
