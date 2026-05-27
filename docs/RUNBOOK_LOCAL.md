# Local development runbook — [ i ] Attention Wallet

**Workspace:** `i_project_migration_archive`  
**One command:** `./scripts/dev_stack.sh`

---

## Prerequisites

1. **Docker Desktop** — Engine running (`docker info` succeeds)
2. **Node.js** — for validator + app
3. **Optional:** Flutter SDK for native proof path

Use Docker.app binary if `/usr/local/bin/docker` is broken:

```bash
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
```

---

## Quick start (full loop)

```bash
cd ~/Desktop/IVAULT/i-project-rescue/i_project_migration_archive
./scripts/dev_stack.sh --reset   # first time or after migration changes
./scripts/dev_stack.sh           # subsequent starts
```

Open **http://localhost:5173** → Earn → Loop 1 → Wallet → Settle.

**Deep link (Flutter return path):** `http://localhost:5173/?proofSession=sess_…` opens Wallet tab.

```bash
./scripts/open_wallet_deep_link.sh sess_test123   # manual browser test
./scripts/smoke_flutter_seal_prep.sh              # flutter tests + validator check
./scripts/smoke_capacitor_prep.sh                 # capacitor deps + build
./scripts/setup_capacitor_shell.sh --add          # generate android/ios locally
./scripts/smoke_android_env.sh                   # toolchain check
./scripts/run_android_dev_loop.sh                # device loop cheat sheet
./scripts/run_android_device_test.sh             # one-shot USB deploy + logcat
./scripts/open_wallet_on_device.sh sess_…        # open wallet on Android after seal
./scripts/smoke_production_readiness.sh          # pre-deploy checklist
./scripts/smoke_stripe_webhook.sh                # signed local Stripe webhook smoke
./scripts/smoke_validator_docker.sh              # validator container smoke
./scripts/build_production_artifacts.sh          # produce deploy artifacts
```

| Service | URL |
|---------|-----|
| App | http://localhost:5173 |
| POP validator | http://127.0.0.1:8787 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |

Demo user (seed): `00000000-0000-4000-8000-000000000001`

---

## Smoke tests

```bash
# Local-json only (no Docker)
./scripts/smoke_pop_wallet_loop.sh

# Wallet + proof-events SSE
./scripts/smoke_full_loop.sh

# Full Supabase ledger (needs Docker)
./scripts/smoke_pop_wallet_loop_supabase.sh

# All unit/type tests
./scripts/run_all_tests.sh

# Full organism spine (local-json + Supabase if Docker running)
./scripts/smoke_organism_spine.sh

# Stripe live (when keys in .env.local.stack)
./scripts/enable_stripe_live_env.sh
./scripts/deploy_stripe_functions_local.sh
```

---

## Stripe (optional)

Functions promoted from archive — deploy when owner provides keys:

```bash
./scripts/promote_stripe_functions.sh   # already run in Phase 3
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...
./scripts/deploy_stripe_functions_local.sh
./scripts/smoke_stripe_webhook.sh
```

---

## Manual start (three terminals)

```bash
# 1 — Supabase
cd app && supabase start && supabase status -o env > ../.env.local.stack

# 2 — Validator
source .env.local.stack
export SUPABASE_URL="$API_URL" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
cd integrations/pop-core/validator && npm start

# 3 — App
cd app && npm run dev
```

`app/.env.local`:

```
VITE_POP_VALIDATOR_URL=http://127.0.0.1:8787
VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001
VITE_AUTO_SETTLE=true   # optional — skip manual Settle tap
```

---

## Android Seal Proof (Flutter)

See `docs/technical/ANDROID_SEAL_PROOF_RUNBOOK.md`.

**Physical USB (recommended):**

```bash
./scripts/run_android_device_test.sh
```

**Emulator:**

```bash
./scripts/run_android_dev_loop.sh   # prints 10.0.2.2 URLs
```

Post-tap verify: `./scripts/smoke_android_seal_postcheck.sh`

Open wallet on device: `./scripts/open_wallet_on_device.sh <session_id>`

---

## Production deploy

See `docs/technical/PRODUCTION_DEPLOY_RUNBOOK.md`.

Pre-deploy smoke: `./scripts/smoke_production_readiness.sh`

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Wallet "Failed to fetch" | Validator not running — `./scripts/dev_stack.sh` |
| `supabase db reset` 502 | Wait 10s, run `supabase start`, retry reset |
| CORS errors in browser | Restart validator (CORS enabled for `:5173`) |
| Settle fails `ledger_append` | Run `supabase db reset` to apply latest migrations |

---

## Knowledge map

Before architecture questions, read:

1. `MASTER_BRAIN/WIRING_STATUS.md`
2. `MASTER_BRAIN/RELATIONSHIPS/UNIVERSE_MAP.md`
3. `MASTER_BRAIN/TRUST_SYSTEM/SEAL_PROOF.md`
