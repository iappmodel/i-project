# Production Cutover Checklist (Owner-Gated)

**Status:** Prepare-only — no secrets in repo  
**Phase:** 40  
**Pairs with:** [`PRODUCTION_DEPLOY_RUNBOOK.md`](PRODUCTION_DEPLOY_RUNBOOK.md), [`smoke_production_readiness.sh`](../scripts/smoke_production_readiness.sh)

---

## Before cutover

- [ ] `./scripts/run_all_tests.sh` passes locally
- [ ] `./scripts/smoke_production_readiness.sh` passes with production env templates filled
- [ ] `MASTER_BRAIN/WIRING_STATUS.md` reflects hosted URLs (not localhost)

---

## Supabase (cloud)

- [ ] Create hosted Supabase project (owner account)
- [ ] Apply migrations from `integrations/` / app schema paths per runbook
- [ ] Set `VITE_SUPABASE_URL` + anon key in hosting env (never commit)
- [ ] Verify RLS + Edge Functions for wallet mutations
- [ ] Smoke: auth demo against hosted URL

---

## POP validator (hosted)

- [ ] Deploy validator container or service (TLS + domain)
- [ ] Set `VITE_POP_VALIDATOR_URL` in app hosting env
- [ ] Register webhook / SSE endpoints if using live proof bridge
- [ ] Smoke: `./scripts/smoke_organism_spine.sh` against hosted validator

---

## Stripe (live)

- [ ] Switch from test to live keys in Stripe Dashboard (owner only)
- [ ] Register production webhook URL in Stripe Dashboard
- [ ] Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` in server env
- [ ] Smoke: `./scripts/smoke_stripe_webhook.sh` with live endpoint (careful — real charges)

---

## App hosting (web)

- [ ] Build: `./scripts/build_production_artifacts.sh`
- [ ] Deploy `app/dist` to Vercel/Netlify/Cloudflare per runbook
- [ ] Set `VITE_VISION_ENGINE=0` for default product unless operator demo
- [ ] Verify default route → `immersive-feed` (Picture 2)

---

## Native store (optional MVP+)

- [ ] `./scripts/setup_capacitor_shell.sh --add` if not done
- [ ] iOS signing + App Store Connect (owner certificates)
- [ ] Android signing keystore + Play Console (owner)
- [ ] Device smoke: `./scripts/run_android_device_test.sh`

---

## Post-cutover verification

- [ ] Loop 1: immersive → consent → watch → earn → wallet settle
- [ ] Flutter Seal Proof deep link still resolves on device
- [ ] ELO presence + gesture rail on immersive feed
- [ ] Vision flag (`VITE_VISION_ENGINE=1`) on staging only if needed

---

## Rollback

- [ ] Keep previous hosting deployment tagged
- [ ] Revert env vars to last known-good validator + Supabase URLs
- [ ] Document incident in `MASTER_BRAIN/DEVELOPMENT_LOG.md`
