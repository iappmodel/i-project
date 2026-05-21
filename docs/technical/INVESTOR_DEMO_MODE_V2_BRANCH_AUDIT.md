# Investor Demo Mode v2 Branch Audit

**Date:** 2026-05-20  
**Audit type:** Read-only branch recovery — no merges, no source-repo modifications  
**Source repo:** `~/Desktop/i-project-rescue/github-source-repos/eye-earn-sparkle-archive`  
**Target branch:** `origin/codex/investor-demo-mode-v2`  
**Comparison base:** `origin/main` (`b041361`)  
**Integration repo:** `~/Desktop/i-project-rescue/i_project_migration_archive`  
**Related docs:** [`MULTI_REPO_SYSTEM_RECOVERY_REPORT.md`](MULTI_REPO_SYSTEM_RECOVERY_REPORT.md), [`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md), [`APP_AUDIT_REPORT.md`](../APP_AUDIT_REPORT.md), [`MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md), [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md)

---

## 1. Executive verdict

**The branch delivers a production-scale demo-mode overlay on the full archive app — not a linear Loop 1 investor spine like `i_project_migration_archive/app/`.**

`codex/investor-demo-mode-v2` is **7 commits ahead of `main`, 0 behind** (**129 files**, ~7,083 insertions, ~858 deletions). It is the **superset of `codex/investor-demo-mode` (v1)** — v1 contains only commit `0b260c6`; v2 adds six more commits including the full investor-ready flow (`f0bd31f`), vision unification (`22cabd3`), Tobii WebSocket gaze, and 39 mockup MP4 assets.

**What is real and reusable:**

| System | Status |
|--------|--------|
| Demo mode gate (`VITE_APP_MODE=demo`, `npm run demo`) | **Implemented** |
| localStorage demo ledger with pending / verification states | **Implemented** |
| Hero entry + scenario selector + guided investor tour | **Implemented** |
| Presenter controls (reward mode, verification delay, checkout outcome) | **Implemented** |
| Fintech-style wallet (Available / Pending segmentation, status pills) | **Implemented** — demo + production UI mixed |
| Service-layer demo guards (`rewards`, `payout`, `subscription`, `AuthContext`) | **Implemented** |
| Promo reward → pending → auto-settle simulation | **Implemented** — maps to POPS pending UX narratively |
| Region scenarios (US earner, Brazil Pix shopper, wallet explorer) | **Implemented** |

**What is NOT on this branch (strict):**

| Gap | Notes |
|-----|-------|
| POPS / Proof Packet v0 | **Zero references** — no packet emission, no schema wiring |
| Linear Loop 1 screen router | Uses embedded full app (`Index.tsx`), not `app/` screen IDs |
| Proof layer / creator economics / roadmap closer screens | **Absent** — i-project `app/` has these; branch does not |
| Consent / camera gate screen | Uses immersive feed + optional vision simulation toggle |
| Supabase edge function / migration changes | **Zero** in branch diff |
| Real settlement pipeline | All wallet mutations are localStorage or existing production paths gated by `isDemoMode` |

**Relative to `codex/vision-unified-pipeline`:** Commits `0b260c6` and `22cabd3` are **shared**. Vision calibration, liveness heuristics, and blink remote control belong to the vision audit — **cherry-pick separately**, not as part of investor-demo promotion.

**Relative to canonical i-project `app/`:** The archive branch is the **“full product in demo clothes”** path; `app/` is the **“guided Loop 1 spine with proof narrative”** path. They complement each other — reconcile **pending validation UX and copy**, not merge architectures wholesale.

**Recommendation:** **Preserve and selectively extract** — promote `demoState.ts` transaction status model, pending-balance UX patterns, HeroEntry copy, and presenter-control semantics into `app/` or a shared demo utilities layer. **Do not merge the branch.** **Do not promote** 39 MP4 binaries or Tobii WS without a separate hardware decision. Treat vision commit `22cabd3` per [`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md).

---

## 2. Branch metadata

| Field | Value |
|-------|--------|
| **Branch name** | `codex/investor-demo-mode-v2` |
| **Remote ref** | `remotes/origin/codex/investor-demo-mode-v2` |
| **HEAD** | `6391b06` — *Organize mockup videos* (2026-03-11) |
| **Merge base with `main`** | `b041361` — *Align Supabase config project ID with deployed project* |
| **Commits ahead of `main`** | 7 |
| **Commits behind `main`** | 0 |
| **Diff vs `main` (three-dot)** | **129 files**, **7,083 insertions**, **858 deletions** |
| **Relation to `main`** | Strict superset (fast-forwardable). All production backend on `main` unchanged. |
| **Relation to `codex/investor-demo-mode` (v1)** | v2 = v1 + 6 commits (v1 is obsolete for demo work) |
| **Relation to `codex/vision-unified-pipeline`** | Shares commits `0b260c6`, `22cabd3`; v2 adds demo polish + Tobii + videos |

### Commit breakdown (chronological)

| Commit | Date | Scope |
|--------|------|-------|
| `0b260c6` | 2026-03-07 | Demo foundation: `appMode.ts`, initial `demoState.ts`, `DEMO_README.md`, `HARDENING_DEPLOY_RUNBOOK.md`, AuthContext demo session, hook guards, rewards/payout demo paths |
| `22cabd3` | 2026-03-08 | **Vision unification** (see vision audit — not investor-demo core) |
| `f0bd31f` | 2026-03-08 | **Investor-ready flow:** `HeroEntry`, scenario wiring, `GuidedInvestorTour`, wallet refactor start, `demoState` expansion, `Index.tsx` reward queue |
| `86ceede` | 2026-03-08 | Workspace snapshot (UI tokens, feed hooks, layout) |
| `94a9ad8` | 2026-03-08 | Tobii WebSocket gaze backend + bridge status |
| `e8eae94` | 2026-03-08 | Test WS button for Tobii URL |
| `6391b06` | 2026-03-11 | 39 mockup MP4 videos + `mockupVideos.ts` |

### Changed file buckets

| Bucket | Count (approx.) | Notes |
|--------|-----------------|-------|
| `src/` TypeScript/TSX | 90 | Demo, wallet, feed, vision, services |
| `public/videos/**/*.mp4` | 39 | ~500MB+ presenter assets — ignore for code promotion |
| `docs/` | 2 | Runbook + implementation plan |
| Root config | 5 | `package.json` (`demo` script), `.env.example`, `.gitignore` |
| `supabase/functions` | **0** | Unchanged |

---

## 3. High-value demo systems found

| System | Location | Implementation | Production-safe? |
|--------|----------|----------------|------------------|
| **App mode gate** | `src/lib/appMode.ts` | `VITE_APP_MODE=demo` or Vite `--mode demo` | Yes — env-gated |
| **Demo ledger state** | `src/lib/demoState.ts` (382 lines) | localStorage balances, transactions, pending aggregation, status lifecycle | Demo-only |
| **Demo runtime checks** | `src/lib/demoRuntime.ts` | Camera HTTPS, Supabase/Mapbox env detection | Shared utility |
| **Hero entry** | `src/components/demo/HeroEntry.tsx` | Investor landing, 5-tap presenter panel | Demo-only UI |
| **Scenario selector** | `src/components/demo/DemoScenarioSelector.tsx` | US / Brazil / wallet scenarios | Demo-only UI |
| **Guided tour** | `src/components/demo/GuidedInvestorTour.tsx` | Overlay steps with spotlight targets + actions | Demo-only UI |
| **Presenter controls** | `src/components/demo/DemoControlsSheet.tsx` | Reward mode, verification delay, checkout outcome, locale | Demo-only UI |
| **Demo mode badge** | `src/components/demo/DemoModeBadge.tsx` | Pill on verification-heavy screens | Demo-only UI |
| **Auth demo session** | `src/contexts/AuthContext.tsx` | Deterministic demo user/profile/subscription | Demo-only injection |
| **Rewards demo path** | `src/services/rewards.service.ts` (+364 lines delta) | `isDemoMode` branches for balances, tx list, pending summary | Service guard pattern |
| **Payout demo path** | `src/services/payout.service.ts` (+136 lines) | Mock payout with outcome from demo controls | Service guard pattern |
| **Subscription demo path** | `src/services/subscription.service.ts` | Tier simulation from localStorage | Service guard pattern |
| **Reward queue simulation** | `src/pages/Index.tsx` | `queueDemoReward`: earn → `verification_required` → settle after delay | Demo-only behavior |
| **Fintech wallet UI** | `src/components/WalletScreen.tsx` (+681 lines delta) | Available/Pending chips, status pills, receipt sheets | Mixed — production shell + demo data |
| **Merchant checkout polish** | `src/features/merchantCheckout/MerchantCheckoutSheet.tsx` | 4-step checkout skeleton, demo outcome timeline | Mixed |
| **Mock feed videos** | `src/lib/mockupVideos.ts`, `public/videos/**` | Curated MP4 sets for friends/main/promos/favorites | Demo assets only |
| **Walkthrough doc** | `DEMO_README.md` | 3–5 min investor script | Documentation |

---

## 4. Investor narrative / pitch flow findings

### Entry narrative (implemented)

**HeroEntry** copy:

- Headline: *“Verified attention becomes usable value”*
- Subheadline: *“A new media and rewards platform built for immersive viewing and instant financial utility.”*
- CTAs: **Enter Demo** → scenario selector; **Investor Walkthrough** → scenario selector with guided tour hint
- Footer: **Demo Mode** badge; 5-tap logo → presenter panel

This aligns with MVP Step 10 proof narrative more than production feed copy on `main`, but **does not include** i-project’s dedicated `ProofLayerScreen` or flutter-runtime doc links.

### Scenario flows (implemented)

| Scenario ID | Region | Pitch spine | Guided tour |
|-------------|--------|-------------|-------------|
| `us-earner` | US | Promo → Earn → Convert → Withdraw → Checkout receipt | 5-step overlay |
| `brazil-shopper` | BRAZIL | Promo → Earn → Pay (Pix) | Region-specific steps |
| `wallet-explorer` | US/BRAZIL | Dashboard + status pills + checkout states | Wallet-trust walkthrough |

### DEMO_README walkthrough (3–5 min)

1. Feed swipe → promo reward  
2. Wallet balances + history  
3. Convert + payout simulation  
4. Discovery map + check-in  
5. Checkout receipt timeline (`completed` / `pending` / `reversed` via demo controls)

### vs canonical i-project `app/` spine

| Element | `app/` (migration archive) | Archive v2 branch |
|---------|---------------------------|-------------------|
| Architecture | Linear 13-screen router | Full app shell + demo overlay |
| Entry | Splash tap | HeroEntry + scenario selector |
| Loop 1 order | Explicit screen IDs | Immersive feed + wallet panel |
| Proof layer screen | **Yes** (`proof-layer`) | **No** |
| Creator economics screen | **Yes** (60/30/10) | Partial — promo/split in feed, no dedicated screen |
| Roadmap closer | **Yes** | **No** (StreakBonuses has unrelated “tier roadmap”) |
| Consent gate | **Yes** (`consent-camera-gate`) | **No** — vision sim toggle in demo controls |
| Presenter Prev/Next | No (state router only) | Guided tour + demo controls sheet |

**Verdict:** v2 optimizes for **“this is the real app, running safely in demo”** investor pitches. `app/` optimizes for **“here is the canonical Loop 1 story with proof documentation.”** Both are valid; they should not be conflated.

---

## 5. UX / screens / interaction findings

### Implemented (code)

- **Immersive media home:** full-screen `MediaCard` feed with swipe navigation, reward chip, coin slide animation
- **Floating controls:** tap zones, long-press move mode, reduced-motion paths
- **Wallet fintech layout:** total balance, Available/Pending segment control, dual asset cards (Vicoin/Icoin), Withdraw/Convert/Pay CTAs
- **Transaction status UX:** pills for Pending / Completed / Reversed / Verification required; tap → explanation sheet with `statusDetail`, `nextStep`, `etaLabel`
- **Unified checkout steps:** Amount → Destination → Review → Confirm (convert, withdraw, pay paths in `WalletScreen` + `MerchantCheckoutSheet`)
- **Discovery map + check-in:** demo-guarded hooks; map fallback when no Mapbox token
- **Favorites video feed:** new `FavoritesVideosFeed.tsx` using mockup videos
- **Accessibility pass:** 44×44 targets, AA contrast notes in plan doc; `useReducedMotion` hooks referenced

### Demo-only / mock behavior (strict)

- Feed content from `mockupVideos.ts` + local MP4s when in demo mode (not live Supabase feed)
- `simulateVisionInput` default **true** in demo controls — gaze/attention can be faked
- `rewardMode`: `always_pass` / `always_fail` overrides real attention outcome
- `verificationDelayMs`: presenter-controlled pending duration (0 / 2s / 5s)
- `checkoutOutcome`: forces merchant receipt timeline state
- Demo user injected — no real auth flow in demo mode

### vs `APP_AUDIT_REPORT.md` findings

| i-project `app/` issue | Present on v2 branch? |
|------------------------|----------------------|
| Discover tab → roadmap | N/A — different nav model |
| Pay → convert label mismatch | Likely similar — Pay CTA exists in wallet; verify on promote |
| Ghost stories/filters | Full app has real feed tabs; demo uses mock videos |
| Consent gate before watch | **Not implemented** — gap vs i-project fix |

---

## 6. Wallet / reward / pending validation findings

### Transaction status model (`demoState.ts`) — **high value**

```typescript
type DemoTransactionStatus =
  | 'pending'
  | 'completed'
  | 'reversed'
  | 'verification_required';

type DemoStatusReason =
  | 'verification'
  | 'cooldown'
  | 'processing_window'
  | 'compliance_review'
  | 'fraud_review'
  | 'retry_available';
```

Seed data includes:

- Earn tx in `verification_required` with eye-tracking copy  
- Completed spend/convert/withdraw samples  
- Reversed withdraw with retry narrative  

This is the **closest implemented UX** to POPS “pending validation” in any web repo — but it is **localStorage simulation**, not proof-packet-driven.

### Reward flow (`Index.tsx` → `queueDemoReward`)

1. User completes promo / tour triggers simulate  
2. `pushDemoTransaction` with `status: 'verification_required'`, `statusReason: 'verification'`  
3. Toast: *“Reward added as pending”*  
4. After `verificationDelayMs` (2–5s): status → `completed`, balance credited via `addDemoBalance`  
5. Coin slide animation fires on earn  

**Strict:** No call to `issue-reward` edge function in demo mode. No proof packet. Delay is `setTimeout`, not POPS review SLA.

### Wallet pending aggregation

- `getDemoPendingBalances()` sums credit txs in `pending` or `verification_required`  
- `WalletScreen` shows Available vs Pending segment with USD-equivalent rollup  
- `rewards.service.ts` `getBalanceSummary()` returns `pending_vicoin` / `pending_icoin` from demo state when `isDemoMode`

### vs POPS architecture ([`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md))

| POPS concept | v2 branch |
|--------------|-----------|
| Proof packet emission | **Absent** |
| pending validation wallet state | **UX simulated** via `verification_required` |
| Multi-signal review | **Absent** — single delay timer |
| Available vs pending vs lifetime earned | **Partial** — available/pending split only |
| Transparent status timeline | **Present** in transaction detail sheets |

### vs i-project `app/demoContext.tsx`

| Feature | `app/` | v2 branch |
|---------|--------|-----------|
| Pending balance strip | Simple numeric strip | Full segment UI + tx-level reasons |
| Reward → wallet | Instant credit on `finishRewardToWallet` | Pending first, then settle |
| Transaction types | Basic positive/negative | earned/spent/received/sent/withdrawn + status machine |
| External tx IDs | No | `PRM-`, `WDL-`, `CNV-`, `PAY-` prefixes |

**Reconciliation opportunity:** i-project `app/` should adopt v2’s **pending-first earn flow** to match POPS narrative — currently credits immediately per `APP_AUDIT_REPORT.md` / MVP Step 5 gap.

---

## 7. Creator / campaign / economics findings

### Demo campaigns (`demoState.ts`)

| ID | Brand | Duration | Reward |
|----|-------|----------|--------|
| `cmp-freshfizz-2026` | FreshFizz | 24s | 1 iCoin |
| `cmp-bluecup-bonus` | Blue Cup Coffee | 18s | 0.75 iCoin |
| `cmp-wavepay-us` | WavePay | 20s | 1.2 iCoin |

Used in promo reward simulation and seed transaction references.

### Production paths (unchanged on branch, available when not demo)

- `tip-creator`, `request-payout`, `issue-reward` edge functions on `main`  
- Creator tools sheet, studio, earning breakdown chart — present in app tree, not in guided tour  
- Merchant checkout lifecycle — demo-outcome overlay added in branch  

### vs i-project creator economics

- **`app/CreatorEconomicsScreen`:** explicit 60/30/10 split with source evidence — **not replicated** on v2 branch as a dedicated screen  
- v2 focuses on **spender/earner fintech** flows, not creator/advertiser education slide  

**Strict:** Campaign economics narration is **weaker** on v2 than on `app/` for investor Step 8.

---

## 8. POPS / verification / proof findings

| Search term | Hits in branch delta (`src/`, `docs/`) | Assessment |
|-------------|------------------------------------------|------------|
| `POPS` | **0** | Not implemented |
| `proof` | 4 (mostly marketing: “reward proof”, “Wallet Proof” tour step) | Narrative only |
| `verification` | 168 | UI status + KYC paths; not proof packets |
| `attention` | 749 | Scoring UI + vision commit — client-side |
| `gaze` / `blink` / `remote` | 1017 / 1026 / 431 | Vision commit `22cabd3` — see vision audit |

### Verification behavior (strict)

| Layer | v2 branch | Authoritative? |
|-------|-----------|----------------|
| Client liveness heuristic | `useVisionEngine` (commit `22cabd3`) | No — UI gate |
| `validate-attention` edge fn | Unchanged on `main` | Yes for production promo_view |
| Demo `rewardMode` override | `DemoControlsSheet` | **Demo-only** — can force pass/fail |
| `verification_required` tx status | `demoState.ts` | **Demo-only** — timer-based settle |

**No proof packet schema references.** No integration with [`PROOF_PACKET_SCHEMA_V0.md`](PROOF_PACKET_SCHEMA_V0.md) or flutter-runtime `proof_packet_v0.dart`.

---

## 9. Code worth promoting

Extract/copy patterns into integration archive — **do not merge branch**.

| Priority | Artifact | Source path | Target suggestion | Notes |
|----------|----------|-------------|-------------------|-------|
| **P0** | Transaction status + reason types | `src/lib/demoState.ts` | `app/src/state/types.ts` + `demoContext.tsx` | Align pending-first earn with POPS |
| **P0** | Pending balance aggregation | `getDemoPendingBalances()`, settle helper | `app/src/state/demoContext.tsx` | Replace instant credit on reward |
| **P0** | HeroEntry headline/copy | `src/components/demo/HeroEntry.tsx` | `app/src/screens/SplashScreen.tsx` or new entry | Stronger investor opener |
| **P1** | Presenter controls semantics | `src/components/demo/DemoControlsSheet.tsx` | `app/` presenter strip (new) | verification delay, checkout outcome |
| **P1** | Guided tour step definitions | `src/components/demo/GuidedInvestorTour.tsx` | Map to `app/` screen IDs | Adapt overlay → router jumps |
| **P1** | Service-layer `isDemoMode` guard pattern | `src/services/rewards.service.ts` (demo branches) | Future production app services | Pattern for safe demo/production split |
| **P1** | DEMO_README walkthrough script | `DEMO_README.md` | `docs/MVP_CANONICAL_FLOW.md` appendix | Presenter script for full-app demo |
| **P1** | Implementation plan | `docs/plans/2025-03-08-investor-demo-mode.md` | Archive reference | UX spec for wallet/checkout |
| **P2** | Wallet status pill + receipt sheet UX | `src/components/WalletScreen.tsx` (extract components) | `app/src/screens/WalletScreen.tsx` | Large file — extract slices only |
| **Separate** | Vision commit `22cabd3` | per vision audit | Web shell promotion | Not investor-demo scope |

---

## 10. Demo-only code to preserve but not promote

| Artifact | Reason |
|----------|--------|
| `AuthContext` demo user/session factories | Full-app injection — wrong shape for `app/` router |
| `Index.tsx` demo orchestration (~500 lines delta) | Tightly coupled to production feed shell |
| `mockupVideos.ts` + 39 MP4 files | Presenter assets; ~500MB+; host separately if needed |
| `TobiiWebSocketAdapter.ts` + gaze bridge test UI | Hardware-specific; experimental |
| `eye-earn-vision-v2` gitlink | Submodule pointer — unclear maintenance status |
| `npm run demo` + `.env.demo` mode | Promote **pattern**, not vite config wholesale |
| `rewardMode: always_fail` | Presenter sabotage — keep in demo tooling only |
| `HARDENING_DEPLOY_RUNBOOK.md` | Ops doc for deployed archive — reference only |

---

## 11. Files to ignore

| Category | Paths | Reason |
|----------|-------|--------|
| Binary video assets | `public/videos/{friends,main,promos,favorites}/**/*.mp4` (39 files) | Size, no code value |
| Lockfile churn | `package-lock.json` (+611 lines) | Transitive; reproduce via `npm install` |
| Service worker cache | `dev-dist/sw.js` | Build artifact |
| Vision bundle | `src/lib/visionCalibration/*`, `UnifiedVisionCalibrationWizard.tsx`, `useVisionEngine.ts` delta | Covered by vision audit |
| UI token tweaks | `src/components/ui/*.tsx` (11 files) | shadcn styling deltas — low signal |
| Submodule | `eye-earn-vision-v2` | Empty/link-only in diff |

---

## 12. Conflicts with current i-project React app

| Conflict | Detail | Resolution |
|----------|--------|------------|
| **Architecture** | Screen router vs embedded full app | Keep both; share state models and copy |
| **Entry flow** | Splash vs HeroEntry + scenarios | Optional HeroEntry before splash in `app/` |
| **Pending earn** | `app/` credits instantly; v2 pending-first | **Adopt v2 pattern in `app/`** (P0) |
| **Proof layer** | `app/` has screen; v2 lacks | Keep `app/` as proof narrative authority |
| **Creator economics** | `app/` has 60/30/10 screen; v2 lacks | Keep `app/` screen; don’t drop for v2 wallet |
| **Consent gate** | `app/` has it; v2 does not | Keep `app/` gate; don’t regress |
| **Coin naming** | `app/` uses aCoins/iCoins + USD estimate; v2 uses Vicoin/Icoin + exchange | Document mapping; don’t merge blindly |
| **Economics** | `app/` fixed 60/30/10; v2 promo campaigns vary | Canonical economics stays in `app/` |
| **Navigation** | `app/` bottom nav issues (Discover→roadmap) | Independent — v2 uses different chrome |
| **Vision coupling** | v2 bundles vision in same branch | Cherry-pick vision separately per vision audit |
| **Scale** | v2 `WalletScreen` +681 lines | Too large to drop into `app/` — extract patterns |

---

## 13. Promotion priority

### P0 — promote / reconcile immediately

1. **Pending-first reward flow** — port `verification_required` → delayed `completed` from `demoState.ts` / `queueDemoReward` into `app/src/state/demoContext.tsx` to align with POPS and MVP Step 5–6.  
2. **Transaction status vocabulary** — `statusReason`, `statusDetail`, `nextStep`, `etaLabel` fields for wallet activity rows in `app/`.  
3. **HeroEntry narrative copy** — reconcile splash/roadmap opener with *“Verified attention becomes usable value”* line.

### P1 — preserve and map

1. Full `demoState.ts` as reference implementation for demo ledger.  
2. `DemoControlsSheet` presenter knobs → future `app/` presenter mode.  
3. `GuidedInvestorTour` step scripts → map to `app/` screen sequence.  
4. `DEMO_README.md` + `docs/plans/2025-03-08-investor-demo-mode.md` as UX spec archive.  
5. Wallet Available/Pending segment UI — extract when `app/` wallet screen matures.  
6. Service-layer `isDemoMode` guard pattern for future Supabase-connected shell.

### P2 — archive

1. 39 mockup MP4 videos (store externally if needed for full-app demo rehearsals).  
2. Tobii WebSocket adapter + test button.  
3. `codex/investor-demo-mode` (v1) — superseded by v2.  
4. Commit `86ceede` snapshot noise — no standalone promotion.  
5. Vision files — per [`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md).

---

## 14. Exact recommended next action

1. **In `i_project_migration_archive/app/`** — implement pending-first earn using v2 `demoState.ts` status machine (no merge from source repo; manual port). Update `RewardRevealScreen` and `WalletScreen` copy to show “validating” before available credit.  
2. **Document dual-demo strategy** — `app/` = Loop 1 + proof spine; archive `npm run demo` = full-product fintech walkthrough. Add cross-links in `MVP_CANONICAL_FLOW.md`.  
3. **Do not merge `codex/investor-demo-mode-v2`** into migration archive or source `main`.  
4. **Close v1 branch audit** — `codex/investor-demo-mode` is a subset; no separate audit required.  
5. **Next branch audit** — `i-initial-structures/investor-demo-mvp-night-build` (hidden MVP integration) or `eye-earn-sparkle-v2/archive/unified-vision-2025-02-07` (vision snapshot diff).

---

*Audit generated: 2026-05-20*  
*Audit status: Read-only — no merges, no source-repo modifications, no deletions*
