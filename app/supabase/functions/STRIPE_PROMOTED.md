# Stripe edge functions (promoted)

**Promoted:** 2026-05-26
**Source:** `eye-earn-sparkle-archive` @ `/Users/2023macbookpro/Desktop/IVAULT/DEMOS:REPOS/eye-earn-sparkle-archive`

Functions: `stripe-webhook`, `create-checkout`, `customer-portal`, `request-payout`

## Deploy (owner keys required)

```bash
# Set secrets in Supabase project or local stack
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...

./scripts/smoke_stripe_webhook.sh
```

See `docs/technical/STRIPE_PHASE2.md`.
