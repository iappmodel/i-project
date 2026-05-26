# Stripe promotion — Phase 2 prep

**Status:** Documented, not promoted (requires `STRIPE_SECRET_KEY` from owner)

---

## Canonical source

`eye-earn-sparkle-archive` on GitHub (`iappmodel` org):

- `supabase/functions/stripe-webhook/`
- `supabase/functions/create-checkout/`
- `supabase/functions/customer-portal/`
- `supabase/functions/request-payout/`

See `docs/technical/SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md` § Payments.

---

## Promotion steps (when keys available)

1. Owner adds to `.env.local.stack` or Supabase secrets:
   - `STRIPE_SECRET_KEY` (test mode `sk_test_…`)
   - `STRIPE_WEBHOOK_SECRET`
2. Run promotion script (Phase 3): copy edge functions → `app/supabase/functions/`
3. `./scripts/smoke_stripe_webhook.sh` (Phase 3)
4. Wire `WithdrawPreviewScreen` to test-mode checkout (not mock ACH copy only)

---

## Phase 2 scope

- Withdraw preview remains **demo UX** (ACH preview copy)
- Ledger settle path is live via POP validator — independent of Stripe
- No Stripe keys required for Loop 1 spine
