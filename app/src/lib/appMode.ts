import { isSupabaseAuthEnabled } from './supabaseClient'

/** Honest demo framing when checkout edges are not live. */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_ENABLE_MERCHANT_CHECKOUT_EDGE !== 'true' || !isSupabaseAuthEnabled()
}
