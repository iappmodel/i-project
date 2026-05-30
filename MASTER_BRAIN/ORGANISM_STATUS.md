# [ i ] Organism status — one page

**Updated:** 2026-05-30  
**Phases complete:** 1–41 (see [PHASE_QUEUE_INDEX.md](PHASE_QUEUE_INDEX.md))

---

## What works today (no owner action)

| Loop | Path |
|------|------|
| Loop 1 web | Immersive feed → consent → watch → session attention evidence → proof → validator → wallet |
| POP Flutter runtime | Zone commits gated via `PopActionExecutor`; calibrated gaze; Y-plane transport |
| Immersive shell (Picture 2) | Default product entry; glass wallet/profile sheets; OUT-PROFILE tap |
| Immersive promo (Phase 41) | Promo dock → `ImmersivePromoScreen` → consent → watch-verify |
| Ledger | Supabase `pop_pending_holds` → `wallet_ledger` (local Docker) |
| Auth | Demo user auto sign-in |
| Flutter bridge | Seal Proof → validator; SSE + deep link to React wallet |
| Android device E2E | ✅ USB reverse — Seal Proof → validator → pending hold (verified 2026-05-27) |
| Capacitor | Packages installed; `setup_capacitor_shell.sh --add` for native |
| Loop 2 scaffold | ✅ Save/return flow (`saved` screen + localStorage) |
| Validator packaging | ✅ Dockerfile + `smoke_validator_docker.sh` |
| Web vision (flagged) | ✅ operator panel + proof hints bridge when `VITE_VISION_ENGINE=1` |
| Blink Remote lite | ✅ debug gaze panel (full archive UI still deferred) |
| ELO presence | ✅ Membrane + speech energy (`pulseSpeech`); panel voice + optional `elo-reply` |
| Investor explainers | ✅ 15 HTML walkthroughs + index + presenter deck (`investor_presenter_deck.html`) |
| CI | Validator + app + POP finish Flutter + investor explainers + vision smokes |

**One command:** `./scripts/dev_stack.sh`

**Full smoke:** `./scripts/smoke_organism_spine.sh`

**Pre-deploy:** `./scripts/smoke_production_readiness.sh` · runbook: `docs/technical/PRODUCTION_DEPLOY_RUNBOOK.md`  
**Cutover (owner):** `docs/technical/PRODUCTION_CUTOVER_CHECKLIST.md`  
**Artifacts:** `./scripts/build_production_artifacts.sh`

---

## Owner / device gates

| Gate | Unblock with |
|------|----------------|
| Stripe live checkout | Owner cloud Stripe + webhook registration |
| Supabase cloud | Hosted project + migration apply |
| Validator hosting | TLS domain + env vars |
| Capacitor store build | Xcode / Android Studio after `--add` |

**Device test:** `./scripts/run_android_device_test.sh` (USB) · postcheck: `./scripts/smoke_android_seal_postcheck.sh` · open wallet: `./scripts/open_wallet_on_device.sh <session>`

---

## Architecture (spine)

```
Flutter Seal Proof ──POST──► POP validator :8787
React app (session evidence + web vision hints) ──POST──►     │
                                    ├── SSE proof-events ──► Wallet refresh
                                    └── Supabase holds ──► ledger settle
Immersive feed ──► consent ──► watch-verify ──► earn settle
```

---

## Deferred (post Phase 40)

- Full archive `BlinkRemoteControl` parity (voice/Tobii/tutorial tabs)
- Promo marketplace tab + live feed API
- ELO full companion product (MOD-01, iAM entity)
- Production cloud cutover (owner credentials)

See [WIRING_STATUS.md](WIRING_STATUS.md) for file-level truth.
