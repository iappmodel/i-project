/** Stripe checkout readiness — functions promoted; keys enable live mode. */

export type StripeReadiness = 'demo' | 'functions-ready' | 'live'

export function getStripeReadiness(): StripeReadiness {
  const checkoutUrl = import.meta.env.VITE_STRIPE_CHECKOUT_URL?.trim()
  if (checkoutUrl) return 'live'

  const flagged = import.meta.env.VITE_STRIPE_FUNCTIONS_READY?.trim().toLowerCase()
  if (flagged === '1' || flagged === 'true' || flagged === 'yes') {
    return 'functions-ready'
  }

  // Edge functions promoted in repo (Phase 3) — default to functions-ready in dev.
  if (import.meta.env.DEV) return 'functions-ready'

  return 'demo'
}

export function stripeReadinessLabel(readiness: StripeReadiness): string {
  switch (readiness) {
    case 'live':
      return 'Stripe checkout enabled (test mode)'
    case 'functions-ready':
      return 'Stripe functions promoted — add STRIPE_SECRET_KEY to deploy'
    default:
      return 'Demo withdraw preview only'
  }
}
