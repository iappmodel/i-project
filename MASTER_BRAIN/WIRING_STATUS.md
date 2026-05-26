# [ i ] Wiring Status

**Updated:** 2026-05-26  
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
| Seal Proof (Flutter) | ✅ local | `flutter-runtime/lib/proof/proof_packet_emitter.dart` |
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

---

| `./scripts/dev_stack.sh` | start everything |

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

## Still mocked / open

| Item | Notes |
|------|-------|
| React gaze signals | Mocked — Flutter has real pipeline |
| Capacitor / in-process bridge | Phase 4 — SSE relay live today |
| Android device E2E | Deferred — runbook only |
| Production Stripe | `STRIPE_PHASE2.md` — keys deferred |
| Full Elo companion UI | Profile teaser only (ADR-013) |

---

## Knowledge map

| Question | Read |
|----------|------|
| What is Seal Proof? | `TRUST_SYSTEM/SEAL_PROOF.md` |
| Elo vs POP | `ENTITIES/ELO.md`, `RELATIONSHIPS/Elo_POP.md` |
| Full organism | `RELATIONSHIPS/UNIVERSE_MAP.md` |
| Local dev | `docs/RUNBOOK_LOCAL.md` |
