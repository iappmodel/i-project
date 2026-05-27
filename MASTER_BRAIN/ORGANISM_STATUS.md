# [ i ] Organism status — one page

**Updated:** 2026-05-27  
**Phases complete:** 1–17 (see [PHASE_QUEUE_INDEX.md](PHASE_QUEUE_INDEX.md))

---

## What works today (no owner action)

| Loop | Path |
|------|------|
| Loop 1 web | Earn → mock gaze → proof → validator → wallet |
| Ledger | Supabase `pop_pending_holds` → `wallet_ledger` (local Docker) |
| Auth | Demo user auto sign-in |
| Flutter bridge | Seal Proof → validator; SSE + deep link to React wallet |
| Android device E2E | ✅ USB reverse — Seal Proof → validator → pending hold (verified 2026-05-27) |
| Capacitor | Packages installed; `setup_capacitor_shell.sh --add` for native |
| Loop 2 scaffold | ✅ Save/return flow (`saved` screen + localStorage) |
| Validator packaging | ✅ Dockerfile + `smoke_validator_docker.sh` |
| CI | Validator + app + readiness + vision + artifact upload |

**One command:** `./scripts/dev_stack.sh`

**Full smoke:** `./scripts/smoke_organism_spine.sh`

**Pre-deploy:** `./scripts/smoke_production_readiness.sh` · runbook: `docs/technical/PRODUCTION_DEPLOY_RUNBOOK.md`  
**Artifacts:** `./scripts/build_production_artifacts.sh`

---

## Owner / device gates

| Gate | Unblock with |
|------|----------------|
| Stripe live checkout | ✅ local test-mode webhook E2E; live deploy still needs owner cloud Stripe wiring |
| Capacitor store build | Xcode / Android Studio after `--add` |

**Device test:** `./scripts/run_android_device_test.sh` (USB) · postcheck: `./scripts/smoke_android_seal_postcheck.sh` · open wallet: `./scripts/open_wallet_on_device.sh <session>`

---

## Architecture (spine)

```
Flutter Seal Proof ──POST──► POP validator :8787
React app (mock gaze) ──POST──►     │
                                    ├── SSE proof-events ──► Wallet refresh
                                    └── Supabase holds ──► ledger settle
```

---

## Next phase candidates (18+)

- P1 chat extraction pass
- Vercel/Render production cutover (owner credentials/domain)
- Capacitor store build
- Optional deeper web vision promotion (`22cabd3` full subset)

See [WIRING_STATUS.md](WIRING_STATUS.md) for file-level truth.
