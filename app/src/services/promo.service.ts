import { getSupabaseClient, isSupabaseAuthEnabled } from '../lib/supabaseClient'
import type { PromoOffer } from '../data/promoOffers'

export type NearbyPromotionRow = {
  id: string
  title?: string
  business_name?: string
  description?: string
  reward_amount?: number
  reward_type?: string
  distance_km?: number
  category?: string
}

const DEFAULT_LAT = -33.9249
const DEFAULT_LNG = 18.4241

export async function fetchNearbyPromotions(opts?: {
  latitude?: number
  longitude?: number
  radiusKm?: number
}): Promise<NearbyPromotionRow[]> {
  const supabase = getSupabaseClient()
  if (!supabase || !isSupabaseAuthEnabled()) return []

  const { data, error } = await supabase.functions.invoke('get-nearby-promotions', {
    body: {
      latitude: opts?.latitude ?? DEFAULT_LAT,
      longitude: opts?.longitude ?? DEFAULT_LNG,
      radiusKm: opts?.radiusKm ?? 25,
      limit: 24,
    },
  })

  if (error) return []
  const rows = (data as { promotions?: NearbyPromotionRow[] })?.promotions
  return rows ?? []
}

export function mapNearbyToPromoOffer(row: NearbyPromotionRow): PromoOffer {
  const reward = Math.max(1, Math.round(row.reward_amount ?? 2))
  const dist = row.distance_km != null ? `${row.distance_km.toFixed(1)} km` : undefined
  return {
    id: row.id,
    brand: row.business_name ?? 'Sponsor',
    title: row.title ?? 'Nearby promo',
    description: row.description ?? 'Watch · verify · earn',
    platform: 'Nearby',
    rewardICoins: reward,
    sponsorLabel: 'Promo',
    platformCode: 'NB',
    watchDuration: '0:45',
    thumbnailGradient: 'linear-gradient(160deg,#102030,#0a1520,#1a3040)',
    kind: 'local',
    distanceLabel: dist,
  }
}

export async function submitPromotionReview(input: {
  promotionId: string
  rating: number
  comment?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient()
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  const { data, error } = await supabase.functions.invoke('submit-promotion-review', {
    body: input,
  })

  if (error) return { success: false, error: error.message }
  const payload = data as { success?: boolean; error?: string }
  if (payload?.error) return { success: false, error: payload.error }
  return { success: Boolean(payload?.success ?? true) }
}
