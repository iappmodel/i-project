# [ i ] Organism status — one page

**Updated:** 2026-05-26  
**Phases complete:** 1–7 (see [PHASE_QUEUE_INDEX.md](PHASE_QUEUE_INDEX.md))

---

## What works today (no owner action)

| Loop | Path |
|------|------|
| Loop 1 web | Earn → mock gaze → proof → validator → wallet |
| Ledger | Supabase `pop_pending_holds` → `wallet_ledger` (local Docker) |
| Auth | Demo user auto sign-in |
| Flutter bridge | Seal Proof → validator; SSE + deep link to React wallet |
| Capacitor | Packages installed; `setup_capacitor_shell.sh --add` for native |
| CI | Validator + app + smokes on every push |

**One command:** `./scripts/dev_stack.sh`

**Full smoke:** `./scripts/smoke_organism_spine.sh`

---

## Owner / device gates

| Gate | Unblock with |
|------|----------------|
| Stripe live checkout | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` in `.env.local.stack` → `./scripts/enable_stripe_live_env.sh` |
| Android Seal Proof tap | `./scripts/run_android_dev_loop.sh` on device/emulator |
| Capacitor store build | Xcode / Android Studio after `--add` |

---

## Architecture (spine)

```
Flutter Seal Proof ──POST──► POP validator :8787
React app (mock gaze) ──POST──►     │
                                    ├── SSE proof-events ──► Wallet refresh
                                    └── Supabase holds ──► ledger settle
```

---

## Next phase candidates (8+)

- Automated device logcat E2E (requires attached device + tap)
- P1 chat extraction pass
- In-web MediaPipe promote (`22cabd3` cherry-pick)
- Production deploy runbook

See [WIRING_STATUS.md](WIRING_STATUS.md) for file-level truth.
