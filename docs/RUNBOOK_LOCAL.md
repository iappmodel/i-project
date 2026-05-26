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

```bash
cd integrations/eye-tracking/flutter-runtime
flutter run --dart-define=POP_VALIDATOR_URL=http://10.0.2.2:8787
```

Host machine must run validator on `:8787`. Emulator uses `10.0.2.2` to reach host localhost.

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
