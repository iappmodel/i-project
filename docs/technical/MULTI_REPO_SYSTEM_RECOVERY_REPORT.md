# Multi-Repo System Recovery Report

**Date:** 2026-05-20  
**Audit type:** Archaeological inspection — read-only, no merges, no rewrites  
**Root audit directory:** `~/Desktop/i-project-rescue/github-source-repos`  
**Primary integration repo:** `~/Desktop/i-project-rescue/i_project_migration_archive`  
**Status:** Initial full sweep complete  
**Branch audits (2026-05-20):**
- `eye_tracking_app/feature/evidence-vault-v2-hardening` — [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md)
- `eye-earn-sparkle-archive/codex/vision-unified-pipeline` — [`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md)
- `eye-earn-sparkle-archive/codex/investor-demo-mode-v2` — [`INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md`](INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md)

---

## Table of Contents

1. [Repository Inventory](#1-repository-inventory)
2. [Per-Repo Deep Analysis](#2-per-repo-deep-analysis)
3. [Keyword Search Findings](#3-keyword-search-findings)
4. [Subsystem Recovery Sections](#4-subsystem-recovery-sections)
5. [Canonical vs. Dead-End Assessment](#5-canonical-vs-dead-end-assessment)
6. [Repo Priority Ranking](#6-repo-priority-ranking)
7. [Branches Requiring Deep Inspection](#7-branches-requiring-deep-inspection)
8. [Promotion Candidates into Canonical i-project](#8-promotion-candidates-into-canonical-i-project)
9. [Systems at Risk of Duplication / Rewrite Waste](#9-systems-at-risk-of-duplication--rewrite-waste)
10. [Recommended Canonical Architecture Direction](#10-recommended-canonical-architecture-direction)
11. [Audit Summary](#11-audit-summary)

---

## 1. Repository Inventory

**Total cloned repos found:** 11  
**Repos with actual code (git history present):** 8  
**Empty stubs (no git, no files):** 3

| # | Repo Name | Status | Stack | Primary Purpose |
|---|-----------|--------|-------|-----------------|
| 1 | `eye-earn-sparkle` | Active (reduced) | React/Vite/Capacitor/Supabase | v1 consumer app — coin rewards, check-in, referral |
| 2 | `eye-earn-sparkle-56c8e614` | **EMPTY STUB** | — | Unknown — no files, no git |
| 3 | `eye-earn-sparkle-56c8e614l` | **EMPTY STUB** | — | Unknown — no files, no git |
| 4 | `eye-earn-sparkle-archive` | **Most Complete** | React/Vite/Capacitor/Supabase/Stripe | Full platform — feed, wallet, creator, studio, admin, merchant checkout |
| 5 | `eye-earn-sparkle-v2` | Active | React/Vite/Capacitor/Supabase | Parallel evolution of archive — gaze adapters, AI edge functions |
| 6 | `eye_tracking_app` | **Most Advanced ET** | Flutter/Dart + Android Native | Eye tracking OS — gaze, blink, intent, governance, learning |
| 7 | `i-initial-structures` | Advanced Architecture | Next.js/TypeScript/Supabase | Admin/platform layer — ELO system, trust engine, studio types |
| 8 | `i-project` | Architecture Hub | React/Vite (prototype) + Docs | Strategy docs, POPS architecture, proof packets, HTML prototypes |
| 9 | `i-the-app` | **PLACEHOLDER** | — | Only README.md, no code |
| 10 | `iview` | **EMPTY STUB** | — | No files, no git |
| 11 | `up-next-queue` | Separate Product | React/Vite/Supabase | Walk-in queue system for car dealership — NOT part of [ i ] |

---

## 2. Per-Repo Deep Analysis

---

### 2.1 `eye-earn-sparkle` — v1 Consumer App (Reduced)

**Stack:** React 18 / Vite / TypeScript / Tailwind / shadcn/ui / Capacitor (iOS+Android) / Supabase / MediaPipe (face_detection only)

**Branches:**
- `main` (active)
- `remotes/origin/demo-investor`
- `remotes/origin/main`

**Recent commits:**
```
9b99f03 Remove eye tracking UI
0b65768 Changes
4507583 Safe haptics integration
4611658 Changes
599e39c Disable eye tracking UI
```

**Key observations:**
- Eye tracking UI was **deliberately removed** from commits — this is the initial consumer-facing shell, stripped of the tracking layer
- Contains: `AccessibilitySettings`, `ActiveSessionsManager`, `CheckInHistory`, `CoinPurchaseSheet`, `ReferralDashboard`, `TaskCenter`
- Supabase integration present: auth, types
- Only `@mediapipe/camera_utils` and `@mediapipe/face_detection` — basic face detection, no gaze or mesh
- Has `usePushNotifications` hook — iOS/Android push implemented

**Purpose:** The public-facing consumer shell before full gaze integration was activated. Useful as a clean baseline for UX patterns.

**Major systems present:** Check-in, coin purchase, referral, task center, accessibility, push notifications, basic auth

**Signs of advanced/unfinished work:** Eye tracking actively removed — indicates a deliberate staging strategy (ship consumer shell first, reintegrate tracking later)

---

### 2.2 `eye-earn-sparkle-archive` — Full Platform (Most Complete Web App)

**Stack:** React 18 / Vite / TypeScript / Tailwind / shadcn/ui / Capacitor (iOS+Android) / Supabase / Stripe / MediaPipe (face_detection + face_mesh + tasks-vision) / Deno (edge functions)

**Branches:**
- `main` (active)
- `remotes/origin/codex/investor-demo-mode`
- `remotes/origin/codex/investor-demo-mode-v2`
- `remotes/origin/codex/vision-unified-pipeline`

**Recent commits:**
```
b041361 Align Supabase config project ID with deployed project
b8f0ac9 Commit remaining app and demo updates
0b68585 Add checkout events, payment status, and idempotency backend
ce4a8a5 Add admin checkout funnel analytics tabs and scope support
189d8a6 codex
```

**Scope (from full Platform Audit Report, dated 2026-02-07):**

This repo is the most feature-complete version of the platform. As of the audit date, the following were **fully implemented**:

| Domain | Implemented Features |
|--------|---------------------|
| Auth | Email/password, Google OAuth, Phone/SMS, biometric login, password reset, email verification |
| Feed | Main feed (user_content + promotions), friends feed, promo videos, personalized feed, unified content feed, scheduling, pull-to-refresh |
| Engagement | Content likes, comments (sort/delete/realtime), share tracking, feedback (more/less) |
| Tips | Creator tipping (atomic), self-tip prevention, coin type support (Vicoin/Icoin), tip amount clamp |
| Follow | Follow/unfollow, batch status check, offline queue, shell mode |
| Wallet | Balance display (Vicoin/Icoin), transaction history, coin transfer, reward issuance, daily limits, subscription tiers, payout/withdraw, coin gifting |
| Creator Revenue | Total earnings (tips + rewards), daily chart, period-over-period trend |
| Merchant Checkout | Draft → confirm → resolve lifecycle, tip, payment status, funnel analytics, idempotency |
| Stripe | Webhook handler, checkout session, customer portal, subscription tiers |
| Studio | Media upload, content editor, content manager, scheduling, studio page (AI sound, subtitles, voiceover, video editor, filters, text, timeline) |
| Admin | Dashboard, analytics panel, content moderation, KYC review, user management, wallet reconciliation, feature flags, actions log |
| Eye tracking (web) | EyeBlinkCalibration, EyeMovementTracking, EyeTrackingIndicator, BlinkRemoteControl, VisionContext, FacialExpressionScanning, AttentionHeatmap, AttentionProgressBar |
| Gamification | Achievement center, badges, daily spin wheel, check-in streak, confetti, earning goals, EarningBreakdownChart |
| Social | Chat, group chat, comments panel, block/mute manager, discovery map |
| Infrastructure | Supabase edge functions (20+), RLS, realtime, storage, migrations (50+ files Dec 2025–Feb 2026), idempotency layer, rate limiting, admin audit logging |

**Supabase edge functions present:**
`admin-users`, `ai-content-analyzer`, `analyze-video`, `check-subscription`, `create-checkout`, `customer-portal`, `export-user-data`, `extract-media-metadata`, `generate-imoji`, `generate-music`, `generate-reply`, `generate-sfx`, `generate-subtitles`, `generate-text-style`, `generate-voiceover`, `get-mapbox-token`, `get-nearby-promotions`, `get-personalized-feed`, `issue-reward`, `kyc-review`, `manage-referral`, `merchant-checkout-confirm`, `merchant-checkout-draft`, `merchant-checkout-event`, `merchant-checkout-funnel`, `merchant-checkout-payment-status`, `merchant-checkout-preferences`, `merchant-checkout-resolve`, `merchant-checkout-tip`, `request-payout`, `send-coin-gift`, `send-notification-email`, `stripe-webhook`, `submit-promotion-review`, `sync-user-tasks`, `tip-creator`, `track-interaction-health`, `wallet-reconciliation`

**Key atomic migrations:**
- `atomic_convert_coins.sql`
- `atomic_tip_creator.sql`
- `atomic_request_payout.sql`
- `atomic_update_balance.sql`
- `wallet_ledger.sql` + `wallet_ledger_audit.sql`
- `atomic_send_coin_gift.sql`
- `redeem_attention_reward_enforce_session_expiry.sql`
- `finalize_promotion_checkin_reward_atomic.sql`

**Assessment:** This is the **most complete realized implementation** of the full platform. It contains working backend, frontend, and Stripe integration. The investor-demo branches likely contain demo-mode polish.

**Subscriptions:** Only placeholder (0 — "Coming soon") — no creator subscription model yet

---

### 2.3 `eye-earn-sparkle-v2` — Parallel Platform Evolution

**Stack:** React 18 / Vite / TypeScript / Tailwind / shadcn/ui / Capacitor / Supabase / MediaPipe / AI edge functions

**Branches:**
- `main` (active)
- `remotes/origin/archive/unified-vision-2025-02-07` — **critical snapshot**
- `remotes/origin/main`

**Recent commits:**
```
ec2ba2d chore: save latest updates - env example, AI edge functions, media bucket, gaze adapters
5919cbf Add Targets editor and overlay
a6cb07c Changes
860b79f Updated plan file
893f902 Cap watchDuration clamp
dc3a85f Changes
0355e89 Wire eye-control wiring
```

**Key observations:**
- Has `workers/` directory — web workers for heavy processing
- Has `gaze adapters` — indicates architectural evolution toward cleaner gaze abstraction
- Has `Targets editor and overlay` — direct gaze target calibration in the web app
- `AI edge functions` and `media bucket` wiring — infrastructure extension beyond archive
- Branch `archive/unified-vision-2025-02-07` is a **snapshot** that aligns with the archive's audit date — likely captures state at time of architecture decision

**Components matching archive:** Nearly identical component set (both ~150+ components, same names). The v2 adds `attention_mediapipe/` directory at the repo root — a standalone MediaPipe attention module.

**Assessment:** A forward evolution from the archive, focused on eye-control wiring and gaze adapter abstraction. The `attention_mediapipe/` module may contain valuable standalone gaze processing code.

---

### 2.4 `eye_tracking_app` — Flutter Eye Tracking OS (Most Advanced)

**Stack:** Flutter/Dart / Google ML Kit face detection / Android native (Kotlin/JNI + MediaPipe) / camera package / speech_to_text

**Branches:**
- `main` (active)
- `remotes/origin/add-claude-github-actions`
- `remotes/origin/checkpoint/pre-composer-cleanup` — **critical snapshot**
- `remotes/origin/claude/issue-2-20260507-0033`
- `remotes/origin/claude/issue-5-20260507-1835`
- `remotes/origin/cursor/dev-environment-setup-4f71`
- `remotes/origin/cursor/v1-autonomy-4f71`
- `remotes/origin/cursor/v1-safety-4f71`
- `remotes/origin/cursor/v1-signal-4f71`
- `remotes/origin/dev`
- `remotes/origin/feature/evidence-vault-v2-hardening` — **critical**
- `remotes/origin/integration/studio-routing-audit`
- `remotes/origin/main`

**Recent commits (T-series stabilization work):**
```
36d685f Sync roadmap after T-10 blink helpers
a30584a Extract finite mean EAR helper
47b3d67 Extract mean EAR blink predicate helper
2dd1761 Sync roadmap after T-09 helper slices
de5fff0 Reuse zone dwell progress ratio helper
```

**Architecture (from ai/system-map.md, generated 2026-05-07):**

| Subsystem | Status |
|-----------|--------|
| App shell + camera | Active, over-centralized in `main.dart` |
| Native Android vision bridge | Active (Kotlin MediaPipe) |
| Gaze signal pipeline (`GazePipeline`) | Canonical signal authority |
| Blink detection | Active, split between detector and UI loop |
| Intent OS (`IntentEngine`) | Active, canonical resolver for dwell/blink commits |
| Autonomous agent + execution kernel | Active, sole side-effect gate |
| Governance kernel | Critical — confidence/risk/fixation/rate gate |
| Safety kernel | Critical — sanity/twin-risk/anomaly gate |
| Digital twin engine | Active, advisory |
| Learning loop (LearningEngine) | Active, in-memory only — no persistence |
| Voice intent | Present, **not wired** |
| Perception service abstraction | Present, **not used** by active camera path |
| POPS integration | **Absent** — integration readiness: LOW |

**T-series stabilization progress (as of 2026-05-11):**
- T-02 through T-08d: **Complete** (FrameCodec, VisionFrame, bridge, camera session, calibration micro-slices, gaze helpers)
- T-09 (dwell/zone coordinator): **Partial** — helpers done, full coordinator deferred
- T-10 (blink/confirmation coordinator): **Partial** — helpers done, full coordinator deferred
- Full GazeFrameCoordinator: **Deferred**

**Key dart files (lib root):**
`attention_kernel.dart`, `blink_detector.dart`, `gaze_buffer.dart`, `gaze_dead_zone.dart`, `gaze_filter.dart`, `gaze_filter_stack.dart`, `gaze_fixation.dart`, `gaze_normalize.dart`, `gaze_processing_pipeline.dart`, `gaze_quality.dart`, `ear_calibration.dart`, `ear_normalize.dart`

**Intent OS subsystem (lib/core/intent_os/):**
Autonomous action/agent, action pipeline kernel, governance kernel, safety kernel, execution kernel, intent engine, learning (behavior_profile, collective_memory, digital_twin_engine, learning_engine, ui_evolution_engine), signal router, state memory

**Assessment:** The most architecturally mature eye tracking implementation. Kernel gates (governance, safety, autonomous execution) are production-quality and unit-tested. The integration nexus (`main.dart`) is over-centralized but safe extraction phases are documented. **POPS product layer is explicitly absent and needed.**

---

### 2.5 `i-initial-structures` — Admin & Platform Architecture Layer

**Stack:** Next.js / TypeScript / Supabase / React

**Branches:**
- `main` (active)
- `remotes/origin/dev`
- `remotes/origin/investor-demo-mvp-night-build` — **critical**
- `remotes/origin/main`

**Single commit:**
```
a5b15d4 Initial project structure
```

**Key systems discovered:**

**ELO System (`src/elo/`):**
- `EloAppShell.tsx` — shell for ELO-based recommendation
- `eloActionService.ts` — action recording
- `eloContextService.ts` — context resolution
- `eloMemoryService.ts` — memory/history
- `eloPermissionService.ts` — permission model
- `eloRecommendationService.ts` — **recommendation engine using ELO scoring**
- `eloSafetyService.ts` — safety layer for ELO decisions

**Trust System (`src/types/alphabet/trust.types.ts`):**
- `TrustImpactRule` with: `trustDelta`, `fraudRiskDelta`, `safetyRiskDelta`, `paymentRiskDelta`, `reputationDelta`, `verificationDelta`
- Wallet freeze capabilities: `canFreezeWallet`, `canFreezeWithdrawals`, `canFreezeCampaigns`
- Severity levels: `positive_small`, `negative_small` + extensible

**Safe Action Execution Engine (`src/lib/alphabet/safe-action-execution/`):**
- `safe-action-engine.ts` — execution gate
- `safe-action-errors.ts` — error taxonomy
- `safe-action-normalizers.ts` — input normalization

**Studio System (`src/screens/studio/`):**
Full studio architecture: collaboration engine (`studioCollabEvents`, `studioPermissionEngine`, `studioPresenceEngine`, `studioReviewEngine`, `studioVersionEngine`), media handling (`studioMediaAdapter`, `studioMediaContracts`, `studioMediaEvents`, `studioMediaStoragePaths`, `studioMediaTypes`, `studioMediaValidation`, `studioMediaWorkerContracts`, `studioMockMediaAdapter`), rendering (`studioRenderManifest`, `studioRenderQueue`, `studioRenderTypes`), artifacts (`studioCaptionArtifacts`, `studioMagicMaskArtifacts`), thumbnail engine, Supabase storage adapter

**U-Value System (`src/types/alphabet/u-value.types.ts`):** Trust delta impact rules for U-value (unique value / user value metric)

**Database types (`src/types/alphabet/database.types.ts`):** Full Supabase schema type definitions

**Assessment:** Contains **hidden mature architecture** — the ELO recommendation engine, trust rule engine, and studio collab system are production-quality TypeScript, likely pre-dating the archive's implementation. The `investor-demo-mvp-night-build` branch warrants deep inspection.

---

### 2.6 `i-project` — Architecture Hub & Documentation Nexus

**Stack:** Documentation + React/Vite prototype app + HTML prototypes + Flutter runtime (promoted)

**Branches:**
- `main` (active)
- `remotes/origin/main`

**Recent commits (significant):**
```
5453e45 Define proof packet schema v0
e3d1524 Add GitHub repo recovery audit plan
37a3f36 Define POPS multi-signal validation architecture
47b6d2d Add Android runtime test hygiene checklist
a2977a7 Add Y-plane transport experiment
dfaa5c9 Set Android NDK version for Flutter runtime
8429c1f Add pipeline performance instrumentation v1
e10f08c Add verification stability layer tests
```

**Structure:**
```
00_README/          → CURSOR_BOOTSTRAP_PROMPT, MANIFEST, MIGRATION_PLAN, PROJECT_TIMELINE
01_strategy_docs/   → i-app-masterplan.md (full build plan, 6 stages)
02_clickable_prototypes/
03_pitch_pages/
04_wallet_payments/ → 10+ HTML wallet/payment prototypes
05_creator_campaigns/
06_feed_earning_loops/ → Feed, Loop1 (Watch→Verify→Earn), immersive feed HTML
07_currency_system/ → acoins_earning_system.html, alphabet-currency.html
08_raw_originals/
app/                → React investor demo (same screens: Feed, Watch/Verify, Wallet, Creator Economics)
docs/               → APP_AUDIT_REPORT, MVP_CANONICAL_FLOW, technical/ docs
integrations/       → Flutter runtime, investor demos, old source stashes, prototypes
masterbrain/
prototype-app/      → Static launcher index.html
```

**Technical docs in `docs/technical/`:**
- `POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` — 6-layer proof system (Presence, Participation, Perception, Signal, Session Integrity, Reward Eligibility)
- `PROOF_PACKET_SCHEMA_V0.md` — Full JSON contract: runtime → POPS → pending reward
- `VERIFICATION_STABILITY_LAYER_V1.md` — Rolling window confidence bands (POOR → WARMING → USABLE → STRONG)
- `ADAPTIVE_CALIBRATION_SYSTEM.md`
- `CALIBRATION_TUNING_PLAN.md`
- `Y_PLANE_TRANSPORT_EXPERIMENT.md` — Frame pipeline optimization
- `EYE_TRACKING_RUNTIME_RECOVERY_REPORT.md`
- `FLUTTER_RUNTIME_PROMOTION_REPORT.md`
- `ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md` — Physical device smoke test (Samsung SM-S928U) PASSED
- `PIPELINE_PERFORMANCE_INSTRUMENTATION_V1.md`
- `OLD_SOURCE_PRESERVATION_REPORT.md`
- `ITRACK_DIRTY_RUNTIME_REVIEW.md`

**Flutter runtime promoted:** `integrations/eye-tracking/flutter-runtime/` — contains promoted dart files from `eye_tracking_app` including `lib/proof/proof_packet_v0.dart`

**Old source stashes:** `integrations/old-source-preservation/ivault-eye-tracking-stashes/patches/` — git stash patches (stash-0 through stash-10+) preserving historical eye tracking code

**Assessment:** This repo is the **integration conscience** of the project. It holds the authoritative architecture decisions, the POPS system design, proof packet schemas, and the promoted flutter runtime. It is the synthesis point — not a deployable app, but the map for what gets built.

---

### 2.7 `i-initial-structures` — (covered in 2.5 above)

---

### 2.8 `i-the-app` — Placeholder

Single commit. Only `README.md`. No code. Likely a reserved namespace.

---

### 2.9 `up-next-queue` — Unrelated Product

**Stack:** React/Vite/TypeScript/Tailwind/shadcn/ui/Supabase/Bun

A fully-implemented real-time walk-in customer rotation queue for **Yonkers Automall** car dealership. Features: GPS geofence check-in, salesperson queue management, realtime updates, admin panel, avatar uploads, PWA support.

**Assessment:** **Not part of the [ i ] project.** Shares the same React+Supabase boilerplate stack. May have been built by the same developer as a separate commercial project. Useful for pattern reference (realtime queue, GPS geofence, PWA). **Do not promote code into i-project.**

---

## 3. Keyword Search Findings

All source file searches across the 8 active repos (`.ts`, `.tsx`, `.dart`, `.md`, `.html`):

### 3.1 POPS

**Files/locations:**
- `i-project/docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` — **canonical architecture** (fully documented, 6 layers, delayed validation model, fraud resistance, MVP path)
- `i-project/docs/technical/PROOF_PACKET_SCHEMA_V0.md` — **canonical schema**
- `eye_tracking_app/ai/system-map.md` — "POPS product integration: LOW readiness — no session/reward/wallet layer yet"
- `eye_tracking_app/ai/stabilization-roadmap.md` — "POPS product layer: Absent"
- `i-project/integrations/eye-tracking/flutter-runtime/lib/proof/proof_packet_v0.dart` — Dart types for schema

**Assessment:** POPS architecture is fully designed in i-project docs. Implementation is NOT yet wired. The Flutter runtime can produce signals but does not yet emit packets.

### 3.2 Proof / Verification

**Files/locations:**
- `i-project/docs/technical/PROOF_PACKET_SCHEMA_V0.md` — packet schema
- `i-project/docs/technical/VERIFICATION_STABILITY_LAYER_V1.md` — stability bands
- `i-project/app/src/components/VerificationGate.tsx` — demo UI
- `i-project/app/src/screens/ProofLayerScreen.tsx` — demo screen
- `i-project/app/src/screens/VerificationResultScreen.tsx` — demo screen
- `i-project/app/src/screens/WatchVerifyScreen.tsx` — demo screen
- `i-initial-structures/src/types/alphabet/trust.types.ts` — trust deltas, fraud risk, verification delta

### 3.3 Trust

**Files/locations:**
- `i-initial-structures/src/types/alphabet/trust.types.ts` — `TrustImpactRule`, `TrustImpactEvent`, trust/fraud/safety/payment/reputation/verification deltas, wallet freeze flags
- `i-initial-structures/src/data/alphabet/trust-impact-rules.ts` — **trust rule definitions**
- `i-initial-structures/src/lib/alphabet/trust-event-factory.ts` — event creation

### 3.4 Wallet / Payment

**Densest in `eye-earn-sparkle-archive`:**
- `supabase/migrations/20260218100002_wallet_ledger.sql` — ledger schema
- `supabase/migrations/20260218120000_wallet_ledger_audit.sql` — audit trail
- `supabase/migrations/20260207092312_atomic_request_payout.sql` — atomic payout
- `supabase/functions/wallet-reconciliation/index.ts` — reconciliation
- `supabase/functions/request-payout/index.ts` (+ tests)
- `supabase/functions/send-coin-gift/index.ts` (+ tests)
- `supabase/functions/stripe-webhook/index.ts` (+ tests + tier.ts)
- `supabase/functions/merchant-checkout-*` (7 functions)
- `src/components/WalletScreen.tsx`
- `src/features/merchantCheckout/MerchantCheckoutSheet.tsx`

**In `i-project`:**
- `04_wallet_payments/` — 10 HTML wallet prototypes (dashboard, pay, convert, withdraw, tip, payment architecture, pending tab)
- `app/src/screens/WalletScreen.tsx`
- `app/src/screens/ConvertScreen.tsx`
- `app/src/screens/WithdrawPreviewScreen.tsx`

**In `i-initial-structures`:**
- `trust.types.ts` — `canFreezeWallet`, `canFreezeWithdrawals`

### 3.5 Reward / Earnings / ELO / Scoring

**`eye-earn-sparkle-archive`:**
- `supabase/functions/issue-reward/index.ts` (+ tests)
- `supabase/migrations/20260218110001_attention_reward_2step.sql`
- `supabase/migrations/20260224115000_redeem_attention_reward_enforce_session_expiry.sql`
- `supabase/migrations/20260224140000_finalize_promotion_checkin_reward_atomic.sql`
- `src/components/EarningBreakdownChart.tsx`, `EarningGoals.tsx`, `RewardAnimation3D.tsx`, `RewardBadge.tsx`, `RewardButtons.tsx`, `RewardNotification.tsx`

**`i-initial-structures`:**
- `src/elo/` — Full ELO recommendation service (action, context, memory, permission, recommendation, safety services)
- `src/data/alphabet/u-value-impact-rules.ts` — U-value scoring rules

### 3.6 Attention / Feed

**`eye-earn-sparkle-archive`:**
- `src/components/AttentionAchievements.tsx`, `AttentionHeatmap.tsx`, `AttentionProgressBar.tsx`
- `supabase/functions/get-personalized-feed/index.ts`
- `src/components/FriendsPostsFeed.tsx`, `PromoVideosFeed.tsx`
- `attention_mediapipe/` directory at repo root

**`eye_tracking_app`:**
- `lib/attention_kernel.dart` — attention scoring engine

**`i-project`:**
- `06_feed_earning_loops/` — 5+ HTML feed prototypes
- `app/src/screens/FeedScreen.tsx`

### 3.7 Gaze / Blink / Eye Tracking / Calibration / Anti-Spoof / Liveness

**`eye_tracking_app` (most concentrated):**
- `lib/blink_detector.dart` — blink detection with EAR (Eye Aspect Ratio)
- `lib/gaze_processing_pipeline.dart` — canonical gaze pipeline
- `lib/calibration/adaptive_calibration_profile.dart`
- `lib/core/intent_os/` — full intent kernel chain
- Android native bridge (Kotlin + MediaPipe)
- `feature/evidence-vault-v2-hardening` branch — **liveness/anti-spoof hardening**

**`eye-earn-sparkle-archive`:**
- `src/components/EyeBlinkCalibration.tsx` — web calibration UI
- `src/components/EyeMovementTracking.tsx` — web gaze tracking
- `src/components/BlinkRemoteControl.tsx` — blink-as-remote-control UI
- `src/components/RemoteControlDebugOverlay.tsx`, `RemoteControlTutorial.tsx`
- `src/components/SlowBlinkTraining.tsx` — liveness training
- `src/contexts/VisionContext.tsx` — web vision state
- `attention_mediapipe/` — standalone MediaPipe module

**`eye-earn-sparkle-v2`:**
- `src/components/EyeBlinkCalibration.tsx`, `EyeMovementTracking.tsx`, `BlinkRemoteControl.tsx`
- `attention_mediapipe/` — same or evolved module

**`i-project/docs/technical/`:**
- `ADAPTIVE_CALIBRATION_SYSTEM.md` — calibration architecture
- `CALIBRATION_TUNING_PLAN.md`
- `VERIFICATION_STABILITY_LAYER_V1.md` — stability bands for proof confidence

### 3.8 Campaign / Creator / Studio / Moderation

**`eye-earn-sparkle-archive`:**
- `src/components/studio/` — 18 files: AIVideoEditor, AISubtitleGenerator, AIVoiceoverGenerator, AISoundGenerator, VideoTimeline, FacetuneBeautyEditor, TextDesigner, DrawingCanvas, MediaBlurEditor, VideoPreviewFilters, etc.
- `src/components/admin/ContentModeration.tsx` — moderation UI
- `src/components/admin/KYCReviewPanel.tsx` — KYC review
- `supabase/functions/submit-promotion-review/index.ts` (+ tests)
- `supabase/functions/ai-content-analyzer/index.ts`
- `supabase/functions/analyze-video/index.ts`
- `src/components/CreatorToolsSheet.tsx`
- `src/components/ContentReportFlow.tsx`, `UserReportFlow.tsx`

**`i-initial-structures`:**
- `src/screens/studio/` — **full studio type system** (collab, media, render pipeline, caption artifacts, magic mask, version engine, review engine, render queue, storage paths)

**`i-project/05_creator_campaigns/`:** HTML creator campaign prototypes

### 3.9 Queue / Recommendation

**`i-initial-structures`:**
- `src/elo/services/eloRecommendationService.ts` — ELO-based recommendation
- `src/screens/studio/media/studioRenderQueue.ts` — studio render queue

**`up-next-queue`:** Separate product, walk-in rotation queue (not i-project)

**`eye-earn-sparkle-archive`:**
- `supabase/functions/get-personalized-feed/index.ts` — personalized feed generation

---

## 4. Subsystem Recovery Sections

---

### 4.1 Eye Tracking

| Source | Maturity | Notes |
|--------|----------|-------|
| `eye_tracking_app/lib/` (Flutter) | **High** | Canonical Android runtime — gaze pipeline, blink, fixation, intent OS, governance/safety kernels, calibration. Smoke-tested on Samsung SM-S928U. |
| `i-project/integrations/eye-tracking/flutter-runtime/` | **High (promoted)** | Promoted copy of eye_tracking_app runtime; also has `proof_packet_v0.dart` |
| `eye-earn-sparkle-archive/attention_mediapipe/` | Medium | Standalone web MediaPipe module |
| `eye-earn-sparkle-v2/attention_mediapipe/` | Medium | Same or evolved web module |
| `eye-earn-sparkle-archive/src/components/EyeMovementTracking.tsx` | Medium | Web gaze UI |
| `eye-earn-sparkle-archive/src/contexts/VisionContext.tsx` | Medium | Web vision state management |
| `i-project/integrations/old-source-preservation/ivault-eye-tracking-stashes/` | Unknown | Stash patches stash-0 through stash-10+ — may contain older implementations |

**Status:** Android/Flutter runtime is working and most mature. Web (MediaPipe browser) implementation exists but is UI-only. Key gap: POPS packet emission not yet wired into any runtime.

### 4.2 POPS Verification

| Source | Maturity | Notes |
|--------|----------|-------|
| `i-project/docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` | **Architecture complete** | 6 layers defined, delayed validation model, fraud patterns, MVP path |
| `i-project/docs/technical/PROOF_PACKET_SCHEMA_V0.md` | **Schema complete** | Full JSON contract, privacy principles, lifecycle, MVP subset |
| `i-project/integrations/eye-tracking/flutter-runtime/lib/proof/proof_packet_v0.dart` | **Types defined** | Dart mirror types for schema |
| `i-initial-structures/src/types/alphabet/trust.types.ts` | **Trust engine defined** | Rules with trust/fraud/payment/verification deltas |
| `eye_tracking_app` runtime | **Signal producer** | Does not yet emit proof packets |

**Status:** Architecture and schema are fully designed. **Nothing emits packets yet.** This is the #1 engineering gap.

### 4.3 Reward Systems

| Source | Maturity | Notes |
|--------|----------|-------|
| `eye-earn-sparkle-archive/supabase/functions/issue-reward/` | **Production-ready** | Full atomic reward issuance with tests |
| `eye-earn-sparkle-archive/supabase/migrations/*_attention_reward*.sql` | **Production-ready** | 2-step attention reward, session expiry enforcement |
| `eye-earn-sparkle-archive/supabase/migrations/*_finalize_promotion_checkin_reward_atomic.sql` | **Production-ready** | Atomic promotion reward |
| `eye-earn-sparkle-archive/src/components/RewardAnimation3D.tsx` | **Implemented** | 3D reward animation |
| `i-project/app/src/screens/RewardRevealScreen.tsx` | Demo | Investor demo reward reveal |
| `i-project/04_wallet_payments/` | Prototype | HTML reward prototypes |

**Status:** Backend reward issuance is working and battle-hardened in the archive. The pending validation flow (POPS → pending → approved) is designed but not wired end-to-end.

### 4.4 Feed Systems

| Source | Maturity | Notes |
|--------|----------|-------|
| `eye-earn-sparkle-archive/supabase/functions/get-personalized-feed/` | **Implemented** | Edge function for personalized feed |
| `eye-earn-sparkle-archive/src/pages/Index.tsx` | **Implemented** | Main feed page (user_content + promotions) |
| `eye-earn-sparkle-archive/src/components/FriendsPostsFeed.tsx` | **Implemented** | Friends feed |
| `eye-earn-sparkle-archive/src/components/PromoVideosFeed.tsx` | **Implemented** | Promotional videos feed |
| `i-initial-structures/src/elo/services/eloRecommendationService.ts` | **Architecture** | ELO-based recommendation engine |
| `i-project/06_feed_earning_loops/` | Prototype | HTML feed + Loop1 prototypes |
| `i-project/app/src/screens/FeedScreen.tsx` | Demo | Investor demo feed screen |

**Status:** Feed implementation is working in archive. ELO-based recommendation exists architecturally in i-initial-structures. The two systems have not been integrated.

### 4.5 Creator Economy

| Source | Maturity | Notes |
|--------|----------|-------|
| `eye-earn-sparkle-archive/supabase/functions/tip-creator/` | **Production** | Atomic tip with tests |
| `eye-earn-sparkle-archive/supabase/functions/request-payout/` | **Production** | Atomic payout with tests |
| `eye-earn-sparkle-archive/src/components/EarningBreakdownChart.tsx` | **Implemented** | Real earnings data |
| `eye-earn-sparkle-archive/src/components/CreatorToolsSheet.tsx` | **Implemented** | Creator tools UX |
| `i-project/app/src/screens/CreatorEconomicsScreen.tsx` | Demo | Revenue split breakdown |
| `i-project/05_creator_campaigns/` | Prototype | HTML campaign prototypes |

**Status:** Core creator economy (tips, payouts, analytics) is working. Creator subscription model is explicitly a placeholder. Duet/stitch creator tools exist in archive.

### 4.6 Wallet / Payments

| Source | Maturity | Notes |
|--------|----------|-------|
| `eye-earn-sparkle-archive/supabase/migrations/wallet_ledger.sql` | **Production** | Double-entry ledger |
| `eye-earn-sparkle-archive/supabase/migrations/wallet_ledger_audit.sql` | **Production** | Audit trail |
| `eye-earn-sparkle-archive/supabase/functions/wallet-reconciliation/` | **Production** | Reconciliation |
| `eye-earn-sparkle-archive/supabase/functions/stripe-webhook/` | **Production** | Stripe with tests + tier logic |
| `eye-earn-sparkle-archive/supabase/functions/merchant-checkout-*/` (7) | **Production** | Full merchant checkout lifecycle |
| `eye-earn-sparkle-archive/supabase/migrations/atomic_*.sql` (4) | **Production** | Atomic financial operations |
| `i-project/04_wallet_payments/` (10 HTML files) | Prototype | UI design reference |
| `i-initial-structures/src/types/alphabet/trust.types.ts` | Architecture | Wallet freeze flags in trust rules |

**Status:** The most complete subsystem. Atomic wallet operations, Stripe, merchant checkout, payout, reconciliation all working in the archive. The "pending validation" wallet state (POPS→pending→approved) is designed but not yet wired.

### 4.7 Attention Scoring

| Source | Maturity | Notes |
|--------|----------|-------|
| `eye_tracking_app/lib/attention_kernel.dart` | **Implemented** | Native attention scoring kernel |
| `eye-earn-sparkle-archive/src/components/AttentionHeatmap.tsx` | **Implemented** | Heatmap visualization |
| `eye-earn-sparkle-archive/src/components/AttentionProgressBar.tsx` | **Implemented** | Progress indicator |
| `eye-earn-sparkle-archive/src/components/AttentionAchievements.tsx` | **Implemented** | Achievement system |
| `eye-earn-sparkle-archive/supabase/migrations/20260218110001_attention_reward_2step.sql` | **Production** | 2-step attention reward gate |
| `i-project/docs/technical/VERIFICATION_STABILITY_LAYER_V1.md` | **Architecture** | Confidence bands (POOR→STRONG) for attention proof |

**Status:** Attention scoring exists both natively (Flutter kernel) and in web UI. The confidence band system (verification stability layer) provides the bridge between raw attention signals and proof-of-perception scores.

### 4.8 Calibration Systems

| Source | Maturity | Notes |
|--------|----------|-------|
| `eye_tracking_app/lib/calibration/adaptive_calibration_profile.dart` | **Implemented** | Adaptive EAR baseline calibration |
| `eye_tracking_app/lib/ear_calibration.dart`, `ear_normalize.dart` | **Implemented** | EAR calibration primitives |
| `i-project/docs/technical/ADAPTIVE_CALIBRATION_SYSTEM.md` | **Architecture** | Adaptive calibration design |
| `i-project/docs/technical/CALIBRATION_TUNING_PLAN.md` | **Architecture** | Tuning parameters |
| `eye-earn-sparkle-archive/src/components/EyeBlinkCalibration.tsx` | **Implemented** | Web blink calibration UI |
| `eye-earn-sparkle-archive/src/components/VoiceCalibration.tsx` | **Implemented** | Voice calibration |

**Status:** Adaptive calibration fully implemented in Flutter runtime. Web calibration UI exists. Architecture documented. T-07 micro-stabilization in eye_tracking_app is complete enough.

### 4.9 AI / Moderation

| Source | Maturity | Notes |
|--------|----------|-------|
| `eye-earn-sparkle-archive/supabase/functions/ai-content-analyzer/` | **Production** | AI content analysis edge function |
| `eye-earn-sparkle-archive/supabase/functions/analyze-video/` | **Production** | Video analysis edge function |
| `eye-earn-sparkle-archive/supabase/functions/submit-promotion-review/` | **Production** (+ tests) | Promotion review workflow |
| `eye-earn-sparkle-archive/src/components/admin/ContentModeration.tsx` | **Implemented** | Moderation UI |
| `eye-earn-sparkle-archive/src/components/admin/KYCReviewPanel.tsx` | **Implemented** | KYC review panel |
| `eye-earn-sparkle-archive/src/components/ContentReportFlow.tsx` | **Implemented** | User content reporting |
| `eye-earn-sparkle-archive/src/components/UserReportFlow.tsx` | **Implemented** | User-to-user reporting |
| `eye-earn-sparkle-archive/src/components/studio/AIVideoEditor.tsx` | **Implemented** | AI video editing |
| `eye-earn-sparkle-archive/supabase/functions/generate-*/` (6) | **Production** | AI generation: music, SFX, subtitles, voiceover, text-style, reply |

**Status:** Rich AI tooling in the archive — both moderation and generative AI are implemented. No dedicated fraud detection / anti-spoof beyond what's in trust rules.

### 4.10 Queue / Recommendation Systems

| Source | Maturity | Notes |
|--------|----------|-------|
| `i-initial-structures/src/elo/services/eloRecommendationService.ts` | **Architecture** | ELO-based ranking/recommendation |
| `i-initial-structures/src/elo/services/eloMemoryService.ts` | **Architecture** | Memory/history for ELO |
| `eye-earn-sparkle-archive/supabase/functions/get-personalized-feed/` | **Production** | Personalized feed generation |
| `eye-earn-sparkle-archive/src/components/studio/` → `studioRenderQueue.ts` | **Architecture** | Studio render queue |
| `eye_tracking_app/lib/core/intent_os/learning/collective_memory.dart` | **Implemented** | Collective zone stats for behavioral learning |
| `eye_tracking_app/lib/core/intent_os/learning/ui_evolution_engine.dart` | **Implemented** | UI evolution based on gaze learning |

**Status:** Two distinct recommendation approaches exist: ELO scoring (i-initial-structures, architecture only) and personalized feed (archive, production). They need unification.

### 4.11 UI Prototypes

| Source | Maturity | Notes |
|--------|----------|-------|
| `i-project/integrations/eye-tracking/demos/investor-demo/` | **Runnable** | React investor demo (npm install + npm run dev) |
| `i-project/integrations/eye-tracking/demos/investor-demo-candidates/from-ivault-investor-demo/` | Runnable | Alternate investor demo variant |
| `i-project/app/` | Runnable | React prototype with full screen sequence |
| `i-project/prototype-app/index.html` | Static | Launcher linking to all HTML prototypes |
| `i-project/06_feed_earning_loops/iapp_loop1_watch_verify_earn.html` | Static | 8-step clickable loop (canonical demo flow) |
| `i-project/04_wallet_payments/` | Static | 10 wallet/payment HTML screens |
| `eye-earn-sparkle-archive/src/components/studio/` | **Production-quality** | Full studio UI |

**Canonical investor demo screen order:**
`splash → feed → offer-detail → watch-verify → verification-result → reward-reveal → wallet → convert → withdraw-preview → creator-economics → roadmap`

### 4.12 Infrastructure / Backend

| Source | Maturity | Notes |
|--------|----------|-------|
| `eye-earn-sparkle-archive/supabase/` | **Production** | 50+ migrations, 35+ edge functions, RLS, realtime, storage |
| `eye-earn-sparkle-archive/supabase/functions/_shared/` | **Production** | Shared: idempotency, rate limiting, admin audit, CORS |
| `eye-earn-sparkle-v2/supabase/` | Unknown | Likely diverged from archive |
| `i-initial-structures/src/lib/alphabet/` | **Architecture** | DB client, repositories, safe action engine |
| `eye_tracking_app/` | **Android** | Native Kotlin bridge, no Supabase |
| `i-project/integrations/old-source-preservation/` | Stashes | Historical eye tracking code preserved as patches |

---

## 5. Canonical vs. Dead-End Assessment

### 5.1 Canonical Implementations (DO promote)

| System | Canonical Source | Reason |
|--------|-----------------|--------|
| **Wallet/ledger** | `eye-earn-sparkle-archive/supabase/migrations/wallet_ledger*.sql` + atomic migrations | Battle-hardened, atomic, audited |
| **Reward issuance** | `eye-earn-sparkle-archive/supabase/functions/issue-reward/` | Has tests, session expiry enforcement |
| **Merchant checkout** | `eye-earn-sparkle-archive/supabase/functions/merchant-checkout-*/` (7) | Full lifecycle, idempotency |
| **Stripe integration** | `eye-earn-sparkle-archive/supabase/functions/stripe-webhook/` | Has tests + tier logic |
| **Payout/withdraw** | `eye-earn-sparkle-archive/supabase/functions/request-payout/` | Atomic, tested |
| **Flutter gaze runtime** | `eye_tracking_app/lib/` (via `i-project/integrations/flutter-runtime/`) | Smoke-tested on device, governance kernels |
| **POPS architecture** | `i-project/docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` | Authoritative design |
| **Proof packet schema** | `i-project/docs/technical/PROOF_PACKET_SCHEMA_V0.md` | Authoritative contract |
| **Trust rule engine** | `i-initial-structures/src/types/alphabet/trust.types.ts` + rules | Comprehensive trust model |
| **ELO recommendation** | `i-initial-structures/src/elo/services/` | Sophisticated architecture |
| **Studio type system** | `i-initial-structures/src/screens/studio/` | Mature types + collab engine |
| **AI edge functions** | `eye-earn-sparkle-archive/supabase/functions/generate-*/` | Production-ready AI tooling |
| **Admin panel** | `eye-earn-sparkle-archive/src/components/admin/` | Complete: moderation, KYC, analytics, reconciliation |
| **Investor demo** | `i-project/integrations/eye-tracking/demos/investor-demo/` | Runnable, canonical screen order |

### 5.2 Experimental Dead Ends (DO NOT promote without review)

| Artifact | Reason |
|----------|--------|
| `eye-earn-sparkle-56c8e614` | Empty stub — unknown origin |
| `eye-earn-sparkle-56c8e614l` | Empty stub — unknown origin |
| `iview` | Empty — no code |
| `i-the-app` | Placeholder only |
| `up-next-queue` | Unrelated commercial product |
| Eye tracking UI in `eye-earn-sparkle` (v1) | Deliberately removed — do not re-add to this repo |

### 5.3 Hidden Mature Work (requires extraction)

| System | Location | Why Hidden |
|--------|----------|------------|
| **ELO recommendation engine** | `i-initial-structures/src/elo/` | Entire repo has 1 commit — architecture may predate git tracking |
| **Trust rule engine** | `i-initial-structures/src/types/alphabet/trust.types.ts` | Advanced model buried in types-only file |
| **Studio collab engine** | `i-initial-structures/src/screens/studio/collab/` | Full collab/presence/review/version engines not surfaced anywhere else |
| **Studio render queue** | `i-initial-structures/src/screens/studio/media/studioRenderQueue.ts` | Sophisticated but isolated |
| **Web vision context** | `eye-earn-sparkle-archive/src/contexts/VisionContext.tsx` | Wires MediaPipe to app state — not promoted to i-project |
| **Governance/safety kernels** | `eye_tracking_app/lib/core/intent_os/governance_kernel.dart`, `safety_kernel.dart` | Production-quality gate chain, not yet linked to any product layer |
| **Digital twin engine** | `eye_tracking_app/lib/core/intent_os/learning/digital_twin_engine.dart` | Sophisticated adaptive learning — in-memory only, no persistence |
| **Old stash patches** | `i-project/integrations/old-source-preservation/ivault-eye-tracking-stashes/patches/stash-0..10+` | May contain working implementations lost in branch cleanup |
| **Evidence vault hardening** | `eye_tracking_app/feature/evidence-vault-v2-hardening` | Reviewed — admin custody SQL + backend POPS; not mobile liveness; see branch audit |
| **Y-plane transport experiment** | `i-project/docs/technical/Y_PLANE_TRANSPORT_EXPERIMENT.md` | Pipeline optimization ready to implement |

### 5.4 Reusable Components (extract for shared library)

| Component | Source | Value |
|-----------|--------|-------|
| Idempotency middleware | `eye-earn-sparkle-archive/supabase/functions/_shared/idempotency.ts` | Financial idempotency pattern |
| Rate limiting | `eye-earn-sparkle-archive/supabase/functions/_shared/rateLimit.ts` | Generic rate limit for edge functions |
| Admin audit logging | `eye-earn-sparkle-archive/supabase/functions/_shared/adminAudit.ts` | Reusable audit trail |
| Merchant checkout shared | `eye-earn-sparkle-archive/supabase/functions/_shared/merchant_checkout.ts` (+ tests) | Checkout logic |
| Verification stability layer | `eye_tracking_app/lib/` + `i-project/docs/technical/VERIFICATION_STABILITY_LAYER_V1.md` | Confidence band system |
| Adaptive calibration profile | `eye_tracking_app/lib/calibration/adaptive_calibration_profile.dart` | Per-user gaze calibration |
| `VerificationGate.tsx` | `i-project/app/src/components/VerificationGate.tsx` | Reusable proof gate UI |
| Coin animation system | `eye-earn-sparkle-archive/src/components/CoinFlyAnimation.tsx`, `CoinSlideAnimation.tsx` | Polished coin UX |
| 3D reward animation | `eye-earn-sparkle-archive/src/components/RewardAnimation3D.tsx` | Reward moment UX |
| Attention ring | `i-project/01_strategy_docs/i-app-masterplan.md` (defined) | SVG animated ring (cyan/amber/rose) |

---

## 6. Repo Priority Ranking

Ranked by value to canonical i-project build:

| Rank | Repo | Why |
|------|------|-----|
| **1** | `eye-earn-sparkle-archive` | Most complete working platform — backend, frontend, Stripe, AI, admin, 50+ migrations |
| **2** | `i-project` | Architecture hub — POPS, proof packets, verification, calibration docs + promoted Flutter runtime + investor demos |
| **3** | `eye_tracking_app` | Most advanced eye tracking — governance/safety kernels, intent OS, calibration — smoke-tested on device |
| **4** | `i-initial-structures` | Hidden mature architecture — ELO engine, trust rules, studio type system, safe action engine |
| **5** | `eye-earn-sparkle-v2` | Gaze adapter evolution, AI edge function wiring, attention_mediapipe module |
| **6** | `eye-earn-sparkle` | v1 baseline — clean consumer shell, push notifications, check-in |
| **7** | `up-next-queue` | Reference only — realtime queue patterns; not i-project code |
| **8** | `i-the-app` | Placeholder — no code value |
| **9–11** | Stubs / Empty | No value until identified |

---

## 7. Branches Requiring Deep Inspection

| Priority | Repo | Branch | Why |
|----------|------|--------|-----|
| ~~**CRITICAL**~~ **DONE** | `eye_tracking_app` | `feature/evidence-vault-v2-hardening` | Audited 2026-05-20 — platform checkpoint + admin Evidence Vault v2 SQL; native anti-spoof already on `main`; see [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md) |
| ~~**CRITICAL**~~ **DONE** | `eye-earn-sparkle-archive` | `codex/vision-unified-pipeline` | Audited 2026-05-20 — web calibration unification + client liveness + hand fusion; cherry-pick commit `22cabd3` only; see [`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md) |
| ~~**CRITICAL**~~ **DONE** | `eye-earn-sparkle-archive` | `codex/investor-demo-mode-v2` | Audited 2026-05-20 — full-app demo overlay, pending wallet UX, HeroEntry/tour; v1 superseded; see [`INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md`](INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md) |
| **LOW** | `eye-earn-sparkle-archive` | `codex/investor-demo-mode` | v1 subset of v2 (commit `0b260c6` only) — no separate audit needed |
| **HIGH** | `i-initial-structures` | `investor-demo-mvp-night-build` | Night build — may contain last working state of MVP integration |
| **HIGH** | `eye-earn-sparkle-v2` | `archive/unified-vision-2025-02-07` | Snapshot at time of platform audit — captures state at a known milestone |
| **HIGH** | `eye_tracking_app` | `checkpoint/pre-composer-cleanup` | Pre-cleanup checkpoint — may preserve code removed during stabilization |
| **HIGH** | `eye_tracking_app` | `integration/studio-routing-audit` | Studio routing in eye tracking context — architecture decision |
| **MEDIUM** | `eye_tracking_app` | `cursor/v1-autonomy-4f71` | Autonomy v1 — may have different execution path |
| **MEDIUM** | `eye_tracking_app` | `cursor/v1-safety-4f71` | Safety v1 — alternative safety kernel |
| **MEDIUM** | `eye_tracking_app` | `cursor/v1-signal-4f71` | Signal v1 — gaze signal pipeline variant |
| **MEDIUM** | `i-initial-structures` | `dev` | May contain work-in-progress beyond the single main commit |
| **LOW** | `eye-earn-sparkle` | `demo-investor` | v1 investor demo — likely superseded |

---

## 8. Promotion Candidates into Canonical i-project

These are specific artifacts ready for promotion (copy-in, not merge) into `i_project_migration_archive`:

### Immediate Candidates (Tier 1 — High confidence, ready now)

| Artifact | Source Path | Target Path | Notes |
|----------|------------|-------------|-------|
| Wallet ledger migrations | `eye-earn-sparkle-archive/supabase/migrations/wallet_ledger*.sql` + `atomic_*.sql` | `app/supabase/migrations/` | Foundation of financial system |
| Issue-reward edge function | `eye-earn-sparkle-archive/supabase/functions/issue-reward/` | `app/supabase/functions/issue-reward/` | With tests |
| Merchant checkout lifecycle | `eye-earn-sparkle-archive/supabase/functions/merchant-checkout-*/` | `app/supabase/functions/` | 7 functions |
| Stripe webhook | `eye-earn-sparkle-archive/supabase/functions/stripe-webhook/` | `app/supabase/functions/stripe-webhook/` | With tests + tiers |
| Shared infra middleware | `eye-earn-sparkle-archive/supabase/functions/_shared/` | `app/supabase/functions/_shared/` | idempotency, rateLimit, adminAudit |
| Admin panel | `eye-earn-sparkle-archive/src/components/admin/` | `app/src/components/admin/` | Full admin suite |
| Studio components | `eye-earn-sparkle-archive/src/components/studio/` | `app/src/components/studio/` | AI video editor + tools |
| proof_packet_v0.dart | `i-project/integrations/flutter-runtime/lib/proof/proof_packet_v0.dart` | Keep in place | Dart type mirror of proof schema |

### Second Wave (Tier 2 — Needs integration work)

| Artifact | Source Path | Notes |
|----------|------------|-------|
| ELO recommendation engine | `i-initial-structures/src/elo/` | Need to wire to feed + campaign selection |
| Trust rule engine | `i-initial-structures/src/types/alphabet/trust.types.ts` + rules | Need Supabase table + trigger |
| Studio type system | `i-initial-structures/src/screens/studio/` | Need to integrate with archive studio components |
| Web vision unified pipeline | `eye-earn-sparkle-archive` branch `codex/vision-unified-pipeline` commit `22cabd3` | Cherry-pick: `visionCalibration/profile.ts`, wizard, `useVisionEngine` liveness/hand fusion — see [`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md) |
| Web VisionContext | `eye-earn-sparkle-archive/src/contexts/VisionContext.tsx` | Need to integrate with gaze adapter abstraction |
| Attention mediapipe module | `eye-earn-sparkle-v2/attention_mediapipe/` | Needs standalone review before promotion |
| Evidence vault hardening | `eye_tracking_app/feature/evidence-vault-v2-hardening` | Selective promote: vault SQL 204–209, wiring docs, POPS backend reference — see branch audit |

### Defer / Do Not Promote Yet (Tier 3)

| Artifact | Reason |
|----------|--------|
| Full `eye_tracking_app` main.dart | Monolithic — stabilization in progress; use promoted flutter-runtime instead |
| `eye-earn-sparkle-v2` full src | Too similar to archive — diff first, promote deltas only |
| `up-next-queue` any code | Unrelated product |
| Old stash patches | Needs archaeological extraction — do not apply blindly |

---

## 9. Systems at Risk of Duplication / Rewrite Waste

| Risk | Systems | Evidence |
|------|---------|----------|
| **HIGH** | Wallet/ledger schema | `eye-earn-sparkle-archive` has working migrations; any new wallet work should promote these, not rebuild |
| **HIGH** | Reward issuance | Archive has tested `issue-reward` function; if i-project builds a new one, tests will be lost |
| **HIGH** | Eye tracking gaze pipeline | `eye_tracking_app` has working pipeline; `eye-earn-sparkle-archive` has web version; `eye-earn-sparkle-v2` has gaze adapters — three implementations diverging |
| **HIGH** | Calibration | Two systems: Flutter EAR calibration + web blink calibration UI — risk of building a third |
| **MEDIUM** | Feed personalization | Archive has `get-personalized-feed` edge function; i-initial-structures has ELO recommendation — two approaches, no integration |
| **MEDIUM** | Studio types | `eye-earn-sparkle-archive/src/components/studio/` has implementation; `i-initial-structures/src/screens/studio/` has types — if someone builds a third studio without these, work is wasted |
| **MEDIUM** | Admin panel | Complete in archive — if rebuilt from scratch in i-project app, the moderation/KYC/analytics/reconciliation code is duplicated |
| **MEDIUM** | Merchant checkout | 7 edge functions in archive — all of this would be rebuilt if the payment system is designed from scratch |
| **LOW** | Investor demo | 3 versions exist (archive, demo-investor branch, i-project investor-demo) — coordinate before building v4 |

---

## 10. Recommended Canonical Architecture Direction

Based on full archaeological inspection across all repos, the recommended canonical architecture is:

### 10.1 Platform Layers

```
┌─────────────────────────────────────────────────────┐
│                   UI Layer                          │
│  React/Vite (web) + Capacitor (iOS/Android wrapper) │
│  Source: eye-earn-sparkle-archive (primary)         │
│         + i-project investor demo (canonical demo)  │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│              Application Logic                      │
│  Auth, Feed, Wallet, Creator, Social, Studio        │
│  Source: eye-earn-sparkle-archive                   │
│  Enhance with: ELO (i-initial-structures)           │
│              + Trust rules (i-initial-structures)   │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│            POPS Validation Layer                    │
│  Proof-of-Presence/Participation/Perception/etc.    │
│  Architecture: i-project/docs/technical/POPS_*.md  │
│  Schema: PROOF_PACKET_SCHEMA_V0.md                  │
│  NOT YET IMPLEMENTED — #1 engineering gap           │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│            Eye Tracking Runtime                     │
│  Flutter/Dart + Android Native (Kotlin/MediaPipe)   │
│  Source: eye_tracking_app (primary)                 │
│         promoted to i-project/integrations/         │
│  Web companion: eye-earn-sparkle-archive VisionCtx  │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│             Backend (Supabase)                      │
│  DB: wallet ledger, migrations, RLS, realtime       │
│  Edge Functions: reward, checkout, stripe, payout   │
│  Source: eye-earn-sparkle-archive (canonical)       │
└─────────────────────────────────────────────────────┘
```

### 10.2 Immediate Engineering Priorities (in order)

1. **Wire proof packet emission** — Implement `ProofPacketV0` emission at session end in Flutter runtime; route to pending wallet state. This is the #1 architectural gap blocking the full POPS loop.

2. **Promote wallet/payment backend** — Migrate `eye-earn-sparkle-archive` supabase migrations and edge functions into the canonical repo. Do not rebuild.

3. **Wire pending validation UX** — Connect proof packet `review.status: pending` to wallet pending tab. Demo already shows this; production wiring is needed.

4. **Integrate ELO recommendation** — Extract `i-initial-structures/src/elo/services/` and wire to personalized feed, replacing the current static edge function.

5. ~~**Deep-inspect evidence-vault branch**~~ — **Done** ([`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md)). Next: reconcile backend POPS scoring with Proof Packet v0; stage evidence vault migrations 204–209.

6. ~~**Deep-inspect vision-unified-pipeline branch**~~ — **Done** ([`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md)). Next: cherry-pick vision commit `22cabd3` when web shell promotes; map web liveness to Proof Packet v0 presence hints.

7. **Extract and promote Y-plane transport** — Implement the `Y_PLANE_TRANSPORT_EXPERIMENT.md` optimization to improve signal quality and pipeline performance.

8. **Unify studio type system** — Merge `i-initial-structures/src/screens/studio/` types with `eye-earn-sparkle-archive/src/components/studio/` implementations.

### 10.3 Architecture Decisions to Lock In Now

| Decision | Direction | Rationale |
|----------|-----------|-----------|
| Reward settlement timing | **Async/delayed (POPS model)** | Designed and documented; resist instant payout pressure |
| Eye tracking role | **Signal contributor** (not sole validator) | POPS architecture is explicit: "truth should not come from one measurement" |
| Backend | **Supabase** | All repos converge here; extensive migration history |
| Web framework | **React/Vite + Capacitor** | Consistent across all web repos |
| Native runtime | **Flutter + Android (Kotlin/MediaPipe)** | Smoke-tested, most advanced |
| Studio architecture | **Type-first** (i-initial-structures types + archive components) | Types are cleanest; implementations are richest |
| Recommendation | **ELO-based** (i-initial-structures) | More sophisticated than ad-hoc; integrate with feed |
| Trust/fraud | **Multi-signal rules** (trust.types.ts) | Wallet freeze, verification delta, fraud risk delta all modeled |

### 10.4 Do Not Rebuild

The following systems exist in a working state and **must not be rebuilt from scratch**:

- Atomic wallet operations (4 SQL stored procedures)
- Stripe webhook integration
- Merchant checkout lifecycle (7 edge functions)
- Flutter gaze pipeline (T-02 through T-08d stabilization)
- Admin panel (moderation, KYC, analytics, reconciliation)
- Issue-reward + payout edge functions with tests
- Investor demo screen order and UX flow

---

## 11. Audit Summary

### Repos Inspected

| Metric | Count |
|--------|-------|
| Total repos found | 11 |
| Repos with code | 8 |
| Empty stubs | 3 |
| Stacks represented | React/Vite, Flutter/Dart, Next.js, static HTML |
| Total branches across all repos | 28+ |
| Supabase migrations (archive) | 50+ |
| Supabase edge functions (archive) | 35+ |
| Dart source files (eye_tracking_app) | 80+ |
| TypeScript/TSX source files (archive) | 200+ |

### Highest-Value Discoveries

1. **`eye-earn-sparkle-archive`** is a fully-deployed platform with production-quality financial infrastructure, AI tooling, and a complete admin layer that has NOT been fully reflected in the canonical migration archive.

2. **POPS architecture** is completely designed and documented in `i-project` but **zero implementation exists** that emits proof packets — this is the single most valuable unbuilt system.

3. **`i-initial-structures`** contains a sophisticated ELO recommendation engine and trust rule system with wallet freeze capabilities that appears to have been built in isolation and not integrated anywhere.

4. **`eye_tracking_app`** has production-quality governance and safety kernels for autonomous eye-control that are under-appreciated — they represent significant engineering effort in behavioral safety that could apply beyond the eye tracking domain.

5. **`feature/evidence-vault-v2-hardening`** branch in `eye_tracking_app` has been inspected — it is a platform checkpoint (backend POPS, admin Evidence Vault v2 SQL, simulation layers); native anti-spoof heuristics are shared with `main`. See [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md).

6. **Old stash patches** (`stash-0` through `stash-10+`) in `i-project/integrations/old-source-preservation/` may preserve working implementations of features that were removed in branch cleanups.

### Branches Needing Dedicated Recovery Passes

| Branch | Repo | Urgency |
|--------|------|---------|
| ~~`feature/evidence-vault-v2-hardening`~~ | `eye_tracking_app` | **Done** — see branch audit |
| ~~`codex/vision-unified-pipeline`~~ | `eye-earn-sparkle-archive` | **Done** — see [`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md) |
| ~~`codex/investor-demo-mode-v2`~~ | `eye-earn-sparkle-archive` | **Done** — see [`INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md`](INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md) |
| `investor-demo-mvp-night-build` | `i-initial-structures` | **Immediate** |
| `archive/unified-vision-2025-02-07` | `eye-earn-sparkle-v2` | **High** |
| `checkpoint/pre-composer-cleanup` | `eye_tracking_app` | **High** |
| `integration/studio-routing-audit` | `eye_tracking_app` | **Medium** |

### Immediate Next Recommended Audit Target

**Target:** `i-initial-structures/investor-demo-mvp-night-build`

**Why:** The investor-demo-mode-v2 audit (2026-05-20) confirmed the archive branch is a full-app demo overlay with strong pending-wallet UX but no POPS/proof layer. The i-initial-structures night-build branch may hold the last integrated MVP state (ELO, trust engine, studio types) not yet compared to canonical `app/`.

**Completed branch audits:**
- `eye_tracking_app/feature/evidence-vault-v2-hardening` — [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md)
- `eye-earn-sparkle-archive/codex/vision-unified-pipeline` — [`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md)
- `eye-earn-sparkle-archive/codex/investor-demo-mode-v2` — [`INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md`](INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md)

**Secondary target:** `eye-earn-sparkle-v2/archive/unified-vision-2025-02-07` — Feb 2026 vision snapshot for diff against archive branch deltas.

---

*Report generated: 2026-05-20*  
*Audit status: Read-only archaeological inspection — no merges, no rewrites, no deletions performed*  
*Evidence preserved: All repositories intact at audit path*
