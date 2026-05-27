# Autonomous master backlog — unattended execution contract

**Created:** 2026-05-27  
**Phases complete:** 1–10  
**Purpose:** Bundles you can leave running without `GO`, approval, or chat interaction.

---

## Autonomous ceiling (honest summary)

| Horizon | Phases | ~Effort | Outcome |
|---------|--------|---------|---------|
| **A — Spine hardening** | 11–14 | 4 phases | Capacitor shell, web vision promote, mock→real bridge prep, prod packaging |
| **B — Knowledge & docs** | parallel | ongoing | P1 chat extraction, integration maps, runbooks |
| **C — UX depth (safe)** | 15–17 | 3 phases | Elo expansion, Loop 2 scaffold, investor-demo utilities (no MP4 binary dump) |
| **D — Ops hardening** | 18–19 | 2 phases | Validator Dockerfile, CI matrix, deploy templates |
| **Maximum unattended** | **~12–14 phases** | weeks at agent pace | Loop 1 production-*ready* locally; prod *deploy* still blocked |

**Hard stops (need you):** Stripe live keys, cloud account/TLS/domains, store signing certs, coin/economy canonical decisions, “ship to App Store/Play”, deleting/restructuring product scope.

---

## What runs without you

### ✅ Autonomous (start → finish → commit → push)

- Code, tests, smokes, CI, runbooks inside this repo
- Cherry-pick from **local** `github-source-repos/eye-earn-sparkle-archive` (read-only source, no merge wholesale)
- `setup_capacitor_shell.sh --add` if Android SDK / Xcode present on machine
- Flutter unit tests; Android scripts (device optional — skip if unplugged)
- P1 chat extraction → `MASTER_BRAIN/CHAT_RECOVERY/EXTRACTED/`
- Feature flags / prep paths that default **off** until you enable
- Documentation synthesis (`WIRING_STATUS`, `ORGANISM_STATUS`, phase queue index)

### ⏸ Prepare only (scripts/docs ready; blocked on secrets)

- Stripe live checkout end-to-end
- Supabase Cloud project + migration apply
- Validator/app hosting on real URLs
- Webhook registration in Stripe dashboard

### ❌ Will not do unattended

- Spend money / create cloud accounts
- Force push, hard reset, skip hooks
- Canonical coin glossary (26-letter vs MVP) — design decision
- Merge investor-demo MP4 assets or Tobii hardware path without decision
- Treat client liveness as POPS truth without schema ADR

---

## Bundle A — Capacitor native shell (Phase 11)

**Goal:** WebView shell wraps `app/dist`; dev loop documented; smoke passes.

| Step | Deliverable |
|------|-------------|
| 1 | Run `setup_capacitor_shell.sh --add` (android; ios if xcodebuild ok) |
| 2 | `smoke_capacitor_native_prep.sh` — sync + config checks |
| 3 | Capacitor dev runbook with `android_device_urls.sh` |
| 4 | Feed/Profile “native shell ready” badge when `android/` exists |
| 5 | Phase queue + wiring update |

**Done when:** `cap sync` clean; smoke pass; runbook complete.  
**Not done:** Store upload, signing, review.

---

## Bundle B — Web vision cherry-pick (Phase 12)

**Goal:** Promote commit `22cabd3` vision files from local archive — **not** full branch merge.

| Step | Deliverable |
|------|-------------|
| 1 | `scripts/cherry_pick_vision_unified.sh` — copies 13 audited files |
| 2 | `@mediapipe/tasks-vision` deps + feature flag `VITE_VISION_ENGINE` |
| 3 | `UnifiedVisionCalibrationWizard` behind flag (Settings or dev menu) |
| 4 | `smoke_vision_prep.sh` — typecheck + unit tests for profile.ts |
| 5 | `EYE_TRACKING_INTEGRATION_MAP.md` web section updated |

**Done when:** Build passes; wizard loads with flag on; default off.  
**Not done:** Wire liveness to settlement; POPS emission from web.

---

## Bundle C — Mock gaze → proof bridge prep (Phase 13)

**Goal:** Architecture seam for real web signals without changing settlement rules.

| Step | Deliverable |
|------|-------------|
| 1 | `app/src/lib/visionProofBridge.ts` — maps vision metrics → demo packet hints |
| 2 | Extend `demoProofPacket.ts` to accept optional `eyeTracking` hints |
| 3 | Earn screen shows “mock | vision” source badge |
| 4 | `smoke_vision_proof_bridge.sh` |
| 5 | ADR note: client liveness ≠ POPS truth |

**Done when:** Flag on uses vision hints in packet; validator unchanged contract.

---

## Bundle D — P1 chat extraction (parallel tracks)

**Goal:** Knowledge for your design work — no product scope commits.

| Track | Source priority | Output |
|-------|-----------------|--------|
| D1 | P1 design/demo chats (OpenAI queue ranks 14–30) | `EXTRACTED/conversations/1xx_*.md` |
| D2 | Claude investor demo threads | Demo utility inventory |
| D3 | Economy conflicts (alphabet vs MVP) | `CONFLICTS_AND_DUPLICATES` update — **no canonical pick** |
| D4 | Remote control + gaze threads | `MASTER_BRAIN/TRUST_SYSTEM/` cross-links |

**Done when:** Batch log TSV updated; synthesis doc §next actions.  
**Not done:** Declaring winning coin model.

---

## Bundle E — Elo companion depth (Phase 14)

**Goal:** Expand within ADR-013 teaser scope — not full companion product.

| Step | Deliverable |
|------|-------------|
| 1 | `EloCompanionCard` — session history list (last 5 seals) |
| 2 | Wallet tab jump + proof flash already wired — add “last seal time” |
| 3 | Profile strip: validator SSE status + last artifact id |
| 4 | Unit tests for card props |

**Done when:** UI reads from existing hooks; no new backend.

---

## Bundle F — Loop 2 scaffold (Phase 15)

**Goal:** Browse → Save → Return **structure only** — mock data, no economy.

| Step | Deliverable |
|------|-------------|
| 1 | `app/src/screens/SavedScreen.tsx` stub + nav tab |
| 2 | `savedItems` state (localStorage) |
| 3 | Feed card “Save” action → Saved list |
| 4 | Deep link `?saved=1` opens Saved tab |
| 5 | Smoke: save/restore item |

**Done when:** UX loop demonstrable with demo feed cards.  
**Not done:** Creator payouts, Loop 2 ledger.

---

## Bundle G — Validator production packaging (Phase 16)

**Goal:** Deployable validator artifact without choosing host.

| Step | Deliverable |
|------|-------------|
| 1 | `integrations/pop-core/validator/Dockerfile` |
| 2 | `POP_VALIDATOR_CORS_ORIGINS` env (comma-separated) |
| 3 | `scripts/smoke_validator_docker.sh` |
| 4 | PRODUCTION_DEPLOY_RUNBOOK §validator updated |

**Done when:** `docker build && docker run` passes health + smoke.

---

## Bundle H — App static + Capacitor production build (Phase 17)

**Goal:** Reproducible production artifacts.

| Step | Deliverable |
|------|-------------|
| 1 | `scripts/build_production_artifacts.sh` — app dist + cap sync |
| 2 | Env validation script (fail fast on missing VITE_*) |
| 3 | `.env.production.example` |
| 4 | CI job: build artifacts (no deploy) |

---

## Bundle I — Stripe prep (Phase 18) — **no keys**

**Goal:** Zero-key path fully documented and tested with skip.

| Step | Deliverable |
|------|-------------|
| 1 | `smoke_stripe_functions_dry_run.sh` — deploy script dry-run |
| 2 | Profile/Withdraw UX: clearer “demo vs live” states |
| 3 | Webhook test harness mock (no Stripe API) |
| 4 | STRIPE_PHASE2.md production section |

**Blocked until:** `STRIPE_SECRET_KEY` in `.env.local.stack`.

---

## Bundle J — Android CI + device optional (Phase 19)

**Goal:** Automate what CI can; document device-only gaps.

| Step | Deliverable |
|------|-------------|
| 1 | CI: Flutter analyze + unit tests (continue-on-error if no flutter) |
| 2 | `smoke_android_wallet_return.sh` — postcheck + open_wallet if device |
| 3 | Logcat parser script for PROOF_* lines → junit/json |
| 4 | ANDROID_SEAL_PROOF_RUNBOOK §CI |

**Not done:** Fully automated Seal Proof tap (needs human or UI test farm).

---

## Bundle K — Investor demo utilities (Phase 20) — selective

**Goal:** Promote **code patterns** from investor-demo audit — not 39 MP4s.

| Step | Deliverable |
|------|-------------|
| 1 | Audit `codex/investor-demo-mode-v2` locally (read-only) |
| 2 | Extract `demoState.ts` transaction status model if compatible |
| 3 | Presenter mode flag `VITE_PRESENTER_MODE` (optional) |
| 4 | Doc: what was rejected (Tobii, MP4 assets) |

---

## Bundle L — Documentation closure (Phase 21)

**Goal:** Single entry point for return from design.

| Step | Deliverable |
|------|-------------|
| 1 | `MASTER_BRAIN/RETURN_FROM_DESIGN.md` — 1-page “what changed while you were away” |
| 2 | Phase queue index 11–21 |
| 3 | ORGANISM_STATUS v2 with % complete matrix |
| 4 | Architecture diagram mermaid in UNIVERSE_MAP ↔ wiring crosswalk |

---

## Suggested execution order (unattended)

```
11 Capacitor shell
12 Web vision cherry-pick (flag off)
13 Vision→proof bridge prep
14 Elo depth
15 Loop 2 scaffold
16 Validator Docker
17 Production artifacts
18 Stripe prep (no keys)
19 Android CI
20 Investor demo utilities (selective)
21 Doc closure
── parallel throughout: Bundle D (P1 extraction)
```

---

## Stop conditions (when to wait for you)

1. **Stripe keys** appear in `.env.local.stack` → run Bundle I live + prod webhook
2. **Production URLs** decided → execute deploy runbook (not just doc)
3. **Coin/glossary decision** documented → update demoData + ledger labels
4. **Design handoff** for Loop 2 UX → replace scaffolds with your specs
5. **Store signing** credentials → Capacitor release build

---

## How to resume after design

1. Read `MASTER_BRAIN/RETURN_FROM_DESIGN.md` (maintained each phase)
2. Read `PHASE_QUEUE_INDEX.md` for completed phase numbers
3. Run `./scripts/smoke_production_readiness.sh`
4. Optional: plug device → `./scripts/run_android_device_test.sh`

No `GO` required for phases marked ✅ autonomous above.

---

## Phase count answer

| Category | Count |
|----------|------:|
| Autonomous implementation phases (11–21) | **11** |
| Parallel knowledge tracks | **4** |
| Owner-blocked phases (deploy, Stripe live, store) | **3–4** |
| Full universe (Loop 2/3 product, iVatar, Studio…) | **15+** *(post-backlog)* |

**Maximum without interaction:** finish **11 implementation bundles** + **P1 extraction** → Loop 1 ~95% locally, production-deploy-ready artifacts, web vision integrated behind flags. You return to keys, domains, and design decisions — not to “does the spine work?”
