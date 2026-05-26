# [ i ] Development Log

Chronological record of archaeology, promotion, and implementation work.  
**Newest entries first.** Add a dated section when significant work completes.

---

## 2026-05-26 — Phase 5 autonomous queue complete

### Delivered
- **Flutter return path** — `WalletDeepLink` + `WALLET_APP_URL` → logcat `WALLET_DEEP_LINK`
- **Bridge UX** — Earn + WatchVerify show live proof-events status
- **Stripe client** — `stripeCheckout.ts` for subscription checkout when keys live
- **Smokes** — `smoke_flutter_seal_prep.sh`, `open_wallet_deep_link.sh`
- **Capacitor** — prep doc (install deferred)

### Deferred Phase 6
- Capacitor `cap init`, Android device tap, Stripe deploy

---

## 2026-05-26 — Phase 4 autonomous queue complete

### Delivered
- **Deep links** — `?proofSession=` opens wallet with flash banner
- **Wallet UX** — proof flash on seal; auto-nav on Flutter proof; Elo status strip
- **SSE filter** — `localUserRef` query param on proof-events stream
- **Stripe UX** — readiness banner on withdraw; `deploy_stripe_functions_local.sh`
- **Smokes** — `smoke_full_loop.sh` chains wallet + proof-events

### Deferred Phase 5
- Capacitor shell, Android device tap, Stripe live deploy

---

## 2026-05-26 — Phase 3 autonomous queue complete

### Delivered
- **Proof-events SSE** — validator broadcasts `proof-sealed`; React `useProofEvents` + Elo live status
- **Stripe scaffold** — `promote_stripe_functions.sh`, `smoke_stripe_webhook.sh` (skip without keys)
- **CI / smokes** — `smoke_proof_events.sh` in CI + `run_all_tests.sh`
- **Roadmap** — spine phases aligned with migration queue

### Deferred Phase 4
- Capacitor in-process bridge, Stripe edge deploy, Android device tap

---

## 2026-05-26 — Phase 2 autonomous queue complete

### Delivered
- **P0 chat 104/104** — batches 10–11 (ranks 91–104)
- **Supabase Auth** — `@supabase/supabase-js`, auto demo sign-in, settle uses session user id
- **Elo** — Profile companion card (entity teaser, ADR-013)
- **Docs** — `REACT_FLUTTER_BRIDGE.md`, `STRIPE_PHASE2.md`, `smoke_auth_demo.sh`
- **`dev_stack.sh`** — appends `VITE_SUPABASE_URL` + anon key to `.env.local`

### Deferred Phase 3
- Capacitor/WebSocket React↔Flutter bridge
- Stripe edge function promotion (owner keys)
- Android Seal Proof device tap

---

## 2026-05-26 — Autonomous queue (30 steps) complete

### Delivered
- **CORS** on POP validator — fixes browser wallet "Failed to fetch"
- **`scripts/dev_stack.sh`** — one-command Supabase + validator + app
- **Wallet UX** — reconnect messaging, `VITE_AUTO_SETTLE`, reward sealing spinner
- **Docs** — `RUNBOOK_LOCAL.md`, `WIRING_STATUS.md`, `ANDROID_SEAL_PROOF_RUNBOOK.md`
- **CI** — `.github/workflows/ci.yml` + `run_all_tests.sh` + smoke scripts
- **Chat** — P0 batches 08–09 (90/104 extracted)
- **MASTER_BRAIN** — post-P1 audit §14, SEAL_PROOF wire status updates

### Smokes
- `./scripts/smoke_pop_wallet_loop.sh` — PASS
- `./scripts/smoke_pop_wallet_loop_supabase.sh` — PASS (prior session)

### Next (device)
- Flutter Seal Proof on Android per runbook

---

## 2026-05-25 — P1 Supabase settlement wire

### Delivered
- **`20260525220000_pop_pending_holds.sql`** — `pop_pending_holds` table + `settle_pop_pending_hold` RPC → `wallet_ledger`
- **Validator** — upserts holds when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set
- **`POST /v1/pending-holds/:sessionId/settle`** — releases hold to ledger (idempotent)
- **`GET /v1/pending-holds/:sessionId`** — read hold status
- Promotion script preserves `*pop_*.sql` migrations on re-promote

### Next
1. `./scripts/start_local_stack.sh --reset` once Docker engine is running
2. Real Supabase Auth sign-in (replace demo UUID)

---

## 2026-05-25 — Docker / Supabase local stack prep

### Delivered
- **`app/supabase/seed.sql`** — demo user `00000000-0000-4000-8000-000000000001`
- **`scripts/start_local_stack.sh`** — start Supabase + print validator/app env
- **`scripts/smoke_pop_wallet_loop_supabase.sh`** — ledger settle smoke (needs Docker engine)

### Blocker observed
Docker Desktop UI open but CLI could not reach daemon — restart Docker Desktop until `docker info` works.

---

## 2026-05-25 — Wallet settle UX + demo auth config

### Delivered
- **`VITE_DEMO_USER_ID`** — optional UUID for Supabase ledger settle
- **Wallet Settle button** on each pending POP hold (local-json or Supabase auto-detect via `/health`)
- **`settlePopHold(sessionId)`** in demo context — no manual curl

---

## 2026-05-25 — E2E smoke + local-json settlement (no Docker)

### Delivered
- **Local-json fallback** — validator lists/settles holds from JSON files when Supabase unavailable
- **`POST /v1/pending-holds/:sessionId/settle-demo`** — dev settle without UUID
- **`scripts/smoke_pop_wallet_loop.sh`** — automated smoke (7 validator tests + validate → list → settle → PASS)
- Smoke verified on this machine (Docker not installed; Supabase local blocked)

### Run smoke
```bash
./scripts/smoke_pop_wallet_loop.sh
```

### Run app live wallet (no Docker)
```bash
cd integrations/pop-core/validator && npm start
cd app && echo 'VITE_POP_VALIDATOR_URL=http://127.0.0.1:8787' > .env.local && npm run dev
```

---

## 2026-05-25 — P1b app wallet ↔ POP pending holds

### Delivered
- **`VITE_POP_VALIDATOR_URL`** — live wallet mode polls `GET /v1/pending-holds?localUserRef=demo-user-001`
- **Loop 1** `finishRewardToWallet` POSTs demo proof packet to validator when live
- **WalletScreen** — live banner, pending hold cards, refresh control
- **Validator** — list holds endpoint for demo user ref

---

## 2026-05-25 — P0 wiring slice (validator + Supabase promote)

### Delivered
- **`integrations/pop-core/validator/`** — HTTP stub `POST /v1/proof-packets/validate` (pending + full modes); tests pass
- **`app/supabase/`** — 103 migrations + `issue-reward`, `validate-attention`, `_shared` from sparkle-archive
- **`scripts/promote_supabase_financial_core.sh`** — repeatable promotion
- **flutter-runtime** — `ProofValidatorBridge` POSTs sealed packets when `POP_VALIDATOR_URL` is set

### Next
1. Merge feature branch → `main`
2. Wire validator pending holds → Supabase ledger (P1)

---

## 2026-05-25 — Phase 2 integration readiness audit

### Delivered
- **`INTEGRATION_READINESS_AUDIT_2026-05-25.md`** — built vs wired vs designed; 30/60/90 day alive definition; ordered build queue
- Runtime verification: `app/` ✅ · flutter-runtime **211 tests** ✅ · vision-v2 ✅ (after npm install)
- Repo sweep: all 11 `iappmodel` repos cloned; feature branch 19 commits ahead of main

### Next engineering (P0)
1. Merge `reliability/wire-proof-collector-live-loop` → `main`
2. ~~Promote archive Supabase financial core~~ ✅
3. ~~POPS validator stub~~ ✅ — Supabase settlement wire remains P1

---

## 2026-05-25 — 4-tab product shell (ADR-014)

### Implemented
- **BottomNav:** Feed · Earn · Wallet · Profile
- **EarnScreen** — Loop 1 entry under Earn tab
- **ProfileScreen** — trust mock, vision categories (MOD-01 deferred), presenter toggle
- **Dual mode:** `product` (tabs) vs `presenter` (linear pitch)
- `npm run typecheck` + `npm run build` — clean

### Run
```bash
cd app && npm run dev
```

---

## 2026-05-25 — Owner decision session + ENTITIES map

### Owner confirmed
| ID | Decision |
|----|----------|
| ENT-01 | **Elo entity** — same product as ELO UI mock (ADR-013) |
| ENT-05 | **Elo and iAM separate** — sibling entities, not merged |
| CR-02–06 | **Build Tier 1 a/i/v/e/o as-is** — 26+ω deferred; concepts can change later (ADR-001) |
| HI-01/02 | **Delegated** — ADR-014: `app/` linear pitch + 4-tab product law |
| MOD-01 | **Deferred** — roadmap module list not defined yet |

### Agent completed
- ENTITIES / SYSTEMS / RELATIONSHIPS map (22 files)
- Desktop chat extraction: 189 threads, 292 attachments
- ADRs: `ENTITY_ADR.md`, `DEMO_IA_ADR.md`, currency ADR owner-confirmed

### Next build (per ADR-014)
- Add 4-tab `BottomNav` to `app/` (Loop 1 under **Earn** tab)
- Keep linear presenter mode for investor pitch
- RoadmapScreen: vision categories only until MOD-01

---

## 2026-05-25 — Batch 07 + sparkle CR-01 + security

### Completed
- Chat batch 07 (ranks 61–70) — **70/104 P0**
- sparkle-archive CR-01: `Index.tsx` requires `attentionSessionId`; `MediaCard` no longer passes eligible without backend validation
- Deleted exposed Firebase adminsdk JSON from `DEMOS:REPOS/` — **rotate key in Firebase console**
- Loop 1 app dev server started (`app/`)

---

## 2026-05-25 — CR-01 fix + vision-v2 + chat batch 06

**Agent:** Cursor

### Completed
- **CR-01:** Attention session gating in `app/src/state/attentionSession.ts` — no consent session → no collect/redeem
- **vision-v2** promoted to `integrations/eye-tracking/vision-v2/` (providers, calibration, remote control)
- **Chat batch 06:** ranks 51–60 (60/104 P0 total)

### Next
- Chat batch 07 (61–70)
- Wire vision-v2 providers into proof layer (future)
- Harden sparkle-archive dual reward paths (MediaCard vs PromoVideosFeed)

---

## 2026-05-25 — P0 promotion + batch 05 + wallet alignment

**Agent:** Cursor  
**Scope:** Execute PROMOTION_AND_DISCARD_QUEUE P0 items

### Completed
- Fetched `demo-investor` branch in `github-source-repos/eye-earn-sparkle` (@ 5652c1a)
- Fetched `codex/investor-demo-mode-v2` in `github-source-repos/eye-earn-sparkle-archive` (@ 6391b06)
- Populated `github-source-repos/iview/` from DEMOS investor demo (rsync)
- **ADR-001:** `DECISIONS/CURRENCY_NAMING_ADR.md` — MVP a/i/v/e/o + deferred 26+ω
- **Chat batch 05:** ranks 41–50 extracted (50/104 P0 total)
- **Loop 1 wallet:** pending-first iCoin flow in `app/` (mirrors demo-investor)
- Report: `docs/technical/DEMOS_PROMOTION_REPORT_2026-05-25.md`

### Next
- Chat batch 06 (ranks 51–60)
- Cherry-pick reward engine from demo-investor if needed
- Owner: confirm ADR-001; rotate Firebase key in DEMOS
- CR-01 session bypass fix (still blocked)

---

## 2026-05-25 — IVAULT full audit + critical doc promotion

**Agent:** Cursor  
**Scope:** Entire `~/Desktop/IVAULT` (~56 GB) synthesis

### Completed
- Full audit document: [`IVAULT_FULL_AUDIT_2026-05-25.md`](IVAULT_FULL_AUDIT_2026-05-25.md)
- Promotion queue: [`PROMOTION_AND_DISCARD_QUEUE.md`](PROMOTION_AND_DISCARD_QUEUE.md)
- Cursor project rule: [`.cursor/rules/i-project.mdc`](../.cursor/rules/i-project.mdc)
- **Promoted to MASTER_BRAIN:**
  - `PAYMENT SYSTEM/i-app-economy-rules.md` → `ECONOMY/i-app-economy-rules.md`
  - `REMOTE CONTROL/...master_brief.md` → `ATTENTION_SYSTEM/REMOTE_CONTROL_MASTER_BRIEF.md`
  - `MASTER_BRAIN/i-app-feature-bible.md` → `CANONICAL/FEATURE_BIBLE.md`
  - `MASTER_BRAIN/i-app-demo-spec.md` → `INVESTOR_DEMO/DEMO_SPEC.md`
  - Design guide + dev guide → `01_strategy_docs/`
- **Promoted prototypes:** 7 HTML files → `02_clickable_prototypes/recent_may2026/`

### Key findings
- Canonical workspace confirmed: `i-project-rescue/i_project_migration_archive/`
- ~46 GB is reference libs + duplicate demos (not product code)
- Highest-value unpromoted code: `eye-earn-sparkle` `demo-investor` branch, archive investor-demo commits, iview investor demo
- 6 currency blockers + 1 attention-session bypass still block final canonicalization
- Chat extraction: 40/104 P0 threads done

### Next
- Owner decisions on CR-01 through CR-06 (see DUPLICATES_AND_CONFLICTS.md)
- Promote demo-investor wallet branch
- Chat extraction batch 05 (ranks 41–50)

---

## 2026-05-22 — P0 chat extraction batch 4

**Scope:** Chat ranks 31–40

- Extracted 10 conversations to `CHAT_RECOVERY/EXTRACTED/conversations/`
- Updated `P0_BATCH_04_SUMMARY.md`, conflicts register, canonical candidates
- Synthesis: `P0_BATCHES_01_04_SYNTHESIS.md` (40 threads total)

---

## 2026-05-21 — Global intake census + MASTER_BRAIN v1.0

**Scope:** Migration archive archaeology + IVAULT desktop census

### Completed
- `MASTER_BRAIN/` corpus created (102 files)
- `scripts/ivault_global_intake.py` — 80,959 file census TSV
- `scripts/chat_export_triage.py` — 648 conversations scored
- 31 technical branch audits in `docs/technical/`
- Loop 1 React MVP in `app/` (13 screens)
- Flutter runtime promoted to `integrations/eye-tracking/flutter-runtime/`
- pop-core proof contract scaffold

### Artifacts
- `GLOBAL_INTAKE/IVAULT_GLOBAL_INVENTORY.md`
- `CANONICAL/i_SOURCE_OF_TRUTH.md`
- `REPOSITORY_MAP.md`, `KNOWLEDGE_GRAPH.md`, `DUPLICATES_AND_CONFLICTS.md`

---

## Template — add new entries above this line

```markdown
## YYYY-MM-DD — Short title

**Agent / human:**  
**Scope:**

### Completed
-

### Decisions
-

### Blockers
-

### Next
-
```
