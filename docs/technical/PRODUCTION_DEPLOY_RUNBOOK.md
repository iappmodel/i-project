# Production deploy runbook — [ i ] Attention Wallet

**Status:** Phase 10 prep (local spine verified; production is owner-operated)  
**Local parity:** `./scripts/dev_stack.sh` + `./scripts/smoke_production_readiness.sh`

---

## Architecture (production)

```
┌─────────────────┐     POST validate      ┌──────────────────┐
│ Flutter (device)│ ─────────────────────► │ POP validator    │
│ React web/app   │                        │ (Node, :8787)    │
└────────┬────────┘                        └────────┬─────────┘
         │ deep link ?proofSession=                 │
         ▼                                          ▼
┌─────────────────┐                        ┌──────────────────┐
│ Static web /    │ ◄── SSE proof-events ──│ Supabase         │
│ Capacitor shell │                        │ Auth + holds +   │
└─────────────────┘                        │ wallet_ledger    │
                                           └──────────────────┘
```

---

## Components

| Component | Local | Production target |
|-----------|-------|-------------------|
| React app | Vite `:5173` | Static host (Vercel, Netlify, S3+CDN) or Capacitor bundle |
| POP validator | Node `:8787` | Container (Fly.io, Render, Railway) or VM |
| Supabase | Docker `:54321` | Supabase Cloud project |
| Stripe | Edge functions (optional) | Same project, live/test keys |
| Flutter | USB debug | Play Store / sideload APK |

---

## Environment variables

### App (`app/.env` or host secrets)

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_POP_VALIDATOR_URL` | Yes | Public HTTPS URL of validator |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Anon key (browser-safe) |
| `VITE_APP_BASE_URL` | Recommended | Deep link base for Flutter return path |
| `VITE_AUTO_SETTLE` | Optional | Dev/demo only — omit in prod or gate by env |
| `VITE_STRIPE_CHECKOUT_URL` | Optional | Supabase function URL when Stripe live |

See `app/.env.example`.

### POP validator

| Variable | Required | Notes |
|----------|----------|-------|
| `POP_VALIDATOR_PORT` | Optional | Default `8787` |
| `SUPABASE_URL` | Yes (prod) | Service can reach Supabase API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (prod) | **Server only** — never in app bundle |

Validator CORS must allow your app origin (`integrations/pop-core/validator/src/cors.ts`).

### Stack secrets (`.env.local.stack` locally)

| Variable | Required | Notes |
|----------|----------|-------|
| `STRIPE_SECRET_KEY` | Stripe only | `sk_test_…` or live |
| `STRIPE_WEBHOOK_SECRET` | Stripe only | From Stripe dashboard webhook |

See `.env.local.stack.example`.

---

## Deploy sequence (recommended order)

### 1. Supabase Cloud

1. Create project; run migrations from `app/supabase/migrations/`
2. Apply seed or production seed strategy (demo user optional)
3. Note `API_URL`, `anon` key, `service_role` key
4. Deploy edge functions when Stripe ready:
   ```bash
   ./scripts/promote_stripe_functions.sh   # if not already in app/supabase/functions
   supabase functions deploy --project-ref <ref>
   ```

### 2. POP validator

1. Build/deploy `integrations/pop-core/validator/` as a long-running Node service
2. Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
3. Expose HTTPS (reverse proxy or platform TLS)
4. Smoke:
   ```bash
   curl https://validator.example.com/health
   curl -X POST https://validator.example.com/v1/proof-packets/validate ...
   ```

Local container smoke before deploy:

```bash
./scripts/smoke_validator_docker.sh
```

### 3. React web app

1. Set production env vars on host
2. Build:
   ```bash
   cd app && npm ci && npm run build
   ```
3. Deploy `app/dist/` to static host **or** sync into Capacitor:
   ```bash
   ./scripts/setup_capacitor_shell.sh --add
   npx cap sync
   ```

### 4. Flutter (Android)

1. Build release APK/AAB with production dart-defines:
   ```bash
   flutter build apk \
     --dart-define=POP_VALIDATOR_URL=https://validator.example.com \
     --dart-define=WALLET_APP_URL=https://app.example.com
   ```
2. Physical device dev uses USB `adb reverse` locally — production uses public HTTPS URLs

### 5. Stripe (optional)

1. Add keys to stack secrets
2. `./scripts/enable_stripe_live_env.sh`
3. `./scripts/deploy_stripe_functions_local.sh` (adapt for remote Supabase)
4. `./scripts/smoke_stripe_webhook.sh`

See `docs/technical/STRIPE_PHASE2.md`.

---

## Pre-deploy checklist

Run locally before any production push:

```bash
./scripts/smoke_production_readiness.sh
./scripts/run_all_tests.sh
```

With device attached (optional):

```bash
./scripts/run_android_device_test.sh
./scripts/smoke_android_seal_postcheck.sh <session_id>
./scripts/open_wallet_on_device.sh <session_id>
```

---

## Health checks

| Check | Command |
|-------|---------|
| Validator | `GET /health` → `{ ok: true, settlement: "supabase" }` |
| Pending holds | `GET /v1/pending-holds?localUserRef=…` |
| App | Loads wallet; demo auth or real sign-in |
| SSE | `GET /v1/proof-events/stream?localUserRef=…` |
| Android E2E | logcat: `PROOF_VALIDATED` + `WALLET_DEEP_LINK` |

---

## Rollback

| Layer | Action |
|-------|--------|
| App static | Redeploy previous `dist` artifact |
| Validator | Redeploy previous container image; holds in Supabase persist |
| Supabase | Migrations are forward-only — restore from backup if needed |
| Flutter | Ship previous APK version |

---

## Owner gates (still manual)

- Stripe live keys and webhook endpoint registration
- App Store / Play Store signing and review
- Production domain + TLS certificates
- MediaPipe web promote (`22cabd3`) — separate vision phase

---

## Related docs

- Local dev: `docs/RUNBOOK_LOCAL.md`
- Android Seal Proof: `docs/technical/ANDROID_SEAL_PROOF_RUNBOOK.md`
- Wiring truth: `MASTER_BRAIN/WIRING_STATUS.md`
- Stripe: `docs/technical/STRIPE_PHASE2.md`
