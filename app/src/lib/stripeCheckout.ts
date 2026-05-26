import { getSupabaseClient } from './supabaseClient'
import { getStripeReadiness } from './stripeConfig'

export type SubscriptionTier = 'pro' | 'creator'

export interface CheckoutSessionResult {
  url: string
}

/** Create Stripe subscription checkout via Supabase edge function (test mode). */
export async function createSubscriptionCheckout(
  tier: SubscriptionTier,
): Promise<CheckoutSessionResult> {
  if (getStripeReadiness() !== 'live') {
    throw new Error('Stripe checkout not configured — set VITE_STRIPE_CHECKOUT_URL')
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not configured')
  }

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { tier },
  })

  if (error) {
    throw new Error(error.message)
  }

  const url = (data as { url?: string })?.url
  if (!url) {
    throw new Error('Checkout session missing url')
  }

  return { url }
}
