# [ i ] Wiring Status

**Updated:** 2026-05-27  
**Workspace:** `i_project_migration_archive`

One-page truth for what's wired vs mocked.

---

## Spine (Loop 1 → Wallet)

```mermaid
flowchart LR
  A[app/ React demo] -->|buildDemoProofPacket| V[POP validator :8787]
  F[Flutter Seal Proof] -->|ProofPacketV0| V
  V -->|pop_pending_holds| S[(Supabase local)]
  S -->|settle_pop_pending_hold| L[wallet_ledger]
  A -->|Wallet UI| V
```

| Step | Status | Path |
|------|--------|------|
| Loop 1 UX (mock gaze) | ✅ | `app/src/screens/*` |
| CR-01 session gate | ✅ | `app/src/state/attentionSession.ts` |
| Proof packet submit (web) | ✅ | `app/src/lib/demoProofPacket.ts` |
| Seal Proof (Flutter) | ✅ device | `flutter-runtime` + USB reverse E2E verified |
| Validator HTTP | ✅ | `integrations/pop-core/validator/` |
| Pending holds | ✅ | `app/supabase/migrations/20260525220000_pop_pending_holds.sql` |
| Ledger settle | ✅ | `settle_pop_pending_hold` → `ledger_append` |
| App live wallet sync | ✅ | `app/src/state/useLiveWalletSync.ts` |
| Auto-settle (optional) | ✅ | `VITE_AUTO_SETTLE=true` |
| CORS (browser → validator) | ✅ | `validator/src/cors.ts` |

---

## Smokes (automated)

| Script | What |
|--------|------|
| `./scripts/smoke_pop_wallet_loop.sh` | local-json validate → settle |
| `./scripts/smoke_pop_wallet_loop_supabase.sh` | full Supabase ledger |
| `./scripts/smoke_full_loop.sh` | unified entry |
| `./scripts/run_all_tests.sh` | validator + app + flutter |
| `./scripts/smoke_auth_demo.sh` | Supabase demo user sign-in |
| `./scripts/smoke_proof_events.sh` | SSE proof-sealed on validate |
| `./scripts/smoke_flutter_seal_prep.sh` | Flutter deep link + bridge tests |
| `./scripts/smoke_capacitor_prep.sh` | Capacitor deps + web build |
| `./scripts/setup_capacitor_shell.sh` | Cap sync / `--add` native |
| `./scripts/smoke_android_env.sh` | Flutter + adb toolchain check |
| `./scripts/run_android_device_test.sh` | One-shot USB deploy + logcat |
| `./scripts/smoke_android_seal_postcheck.sh` | Verify pending hold after Seal Proof |
| `./scripts/open_wallet_on_device.sh` | Open wallet deep link on Android device |
| `./scripts/android_device_urls.sh` | Resolve POP/WALLET URLs for device mode |
| `./scripts/smoke_production_readiness.sh` | Pre-deploy builds + spine + templates |
| `./scripts/smoke_organism_spine.sh` | Full spine (local + optional Supabase) |
| `./scripts/enable_stripe_live_env.sh` | Stripe checkout env when keys in stack |

---

| `./scripts/dev_stack.sh` | start everything |

**Phase index:** `MASTER_BRAIN/PHASE_QUEUE_INDEX.md`

---

## Phase 2 (2026-05-26)

| Item | Status |
|------|--------|
| P0 chat extraction | **104/104** complete |
| Supabase Auth in app | ✅ Auto demo sign-in |
| Elo Profile teaser | ✅ Companion card |
| React↔Flutter bridge | Design only — Phase 3 |
| Stripe checkout | Prep doc — owner keys needed |

---

## Phase 3 (2026-05-26)

| Item | Status |
|------|--------|
| Proof-events SSE relay | ✅ `GET /v1/proof-events/stream` |
| React `useProofEvents` | ✅ Profile Elo live status |
| Stripe function promotion script | ✅ `promote_stripe_functions.sh` |
| Stripe deploy / webhook smoke | ⏸ Owner keys required |
| Capacitor in-process bridge | Deferred Phase 4 |
| Android device E2E | Deferred — runbook only |

---

## Phase 4 (2026-05-26)

| Item | Status |
|------|--------|
| Deep link `?proofSession=` | ✅ Opens wallet tab |
| Wallet proof flash | ✅ Flutter seal → banner + auto-nav |
| SSE `localUserRef` filter | ✅ Stream query param |
| Stripe readiness UX | ✅ Withdraw banner + `stripeConfig.ts` |
| Stripe local deploy script | ✅ Skips without keys |
| Capacitor in-process bridge | Deferred Phase 5 |
| Android device E2E | Deferred — runbook only |

---

## Phase 5 (2026-05-26)

| Item | Status |
|------|--------|
| Flutter `WALLET_APP_URL` deep link | ✅ Logs after validate |
| Earn / Watch bridge UX | ✅ Live proof-events status |
| `stripeCheckout.ts` client | ✅ Ready when `VITE_STRIPE_CHECKOUT_URL` set |
| Capacitor shell | Prep doc only — `CAPACITOR_SHELL_PREP.md` |
| Android device E2E | Deferred — runbook + prep smoke |
| Stripe live deploy | Owner keys required |

---

## Phase 6 (2026-05-26)

| Item | Status |
|------|--------|
| Capacitor packages | ✅ `@capacitor/*` in `app/` |
| `capacitor.config.ts` | ✅ |
| Setup script | ✅ `setup_capacitor_shell.sh --add` |
| Native platform dirs | On demand (gitignored) |
| Android device E2E | Deferred — runbook |
| Stripe live deploy | Owner keys — `.env.local.stack.example` |

---

## Phase 7 (2026-05-26)

| Item | Status |
|------|--------|
| `EloCompanionCard` | ✅ Last seal + wallet jump |
| Android env smoke | ✅ `smoke_android_env.sh` |
| Android dev orchestration | ✅ `run_android_dev_loop.sh` |
| Phase queue index | ✅ `PHASE_QUEUE_INDEX.md` |
| Stripe Pro checkout UI | ✅ When `VITE_STRIPE_CHECKOUT_URL` live |
| Device Seal Proof tap | Manual — runbook + smokes |

---

## Still mocked / open

| Item | Notes |
|------|-------|
| React gaze signals | Mocked — Flutter has real pipeline |
| Capacitor native build | `setup_capacitor_shell.sh --add` |
| Production Stripe | `STRIPE_PHASE2.md` — keys deferred |
| Full Elo companion UI | Profile teaser only (ADR-013) |

---

## Phase 8 (2026-05-26)

| Item | Status |
|------|--------|
| `ORGANISM_STATUS.md` | ✅ One-page synthesis |
| `smoke_organism_spine.sh` | ✅ Local + optional Supabase |
| Stripe live env | ✅ `enable_stripe_live_env.sh` |
| Wallet Elo card | ✅ Live wallet tab |
| Device Seal Proof tap | Manual |

---

## Phase 9 (2026-05-27)

| Item | Status |
|------|--------|
| Android Seal Proof E2E | ✅ Samsung SM A146U, USB adb reverse |
| `android_device_urls.sh` | ✅ emulator / USB / LAN resolver |
| `run_android_device_test.sh` | ✅ one-shot deploy |
| `smoke_android_seal_postcheck.sh` | ✅ pending hold verify |
| Vite LAN host | ✅ `host: true` for WiFi fallback |
| Runbook | ✅ USB reverse primary path |

---

## Phase 10 (2026-05-27)

| Item | Status |
|------|--------|
| Production deploy runbook | ✅ `PRODUCTION_DEPLOY_RUNBOOK.md` |
| Pre-deploy smoke | ✅ `smoke_production_readiness.sh` |
| Device wallet deep link | ✅ `open_wallet_on_device.sh` |
| CI consolidation | ✅ production readiness job |

---

## Knowledge map

| Question | Read |
|----------|------|
| Organism overview | `ORGANISM_STATUS.md` |
| What is Seal Proof? | `TRUST_SYSTEM/SEAL_PROOF.md` |
| Elo vs POP | `ENTITIES/ELO.md`, `RELATIONSHIPS/Elo_POP.md` |
| Full organism | `RELATIONSHIPS/UNIVERSE_MAP.md` |
| Local dev | `docs/RUNBOOK_LOCAL.md` |
