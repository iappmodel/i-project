# System Promotion Source of Truth

**Date:** 2026-05-21  
**Status:** Active — ownership reconciliation (post-archaeology)  
**Primary integration repo:** `~/Desktop/i-project-rescue/i_project_migration_archive`  
**Cloned evidence repos:** `~/Desktop/i-project-rescue/github-source-repos/`  
**Supersedes:** Branch-by-branch discovery; use this doc for build/promotion decisions.

**Audit inputs (complete):**  
[`GITHUB_REPO_RECOVERY_AUDIT_PLAN.md`](GITHUB_REPO_RECOVERY_AUDIT_PLAN.md) · [`FULL_REPO_SOURCE_RECOVERY_AUDIT.md`](FULL_REPO_SOURCE_RECOVERY_AUDIT.md) · [`MULTI_REPO_SYSTEM_RECOVERY_REPORT.md`](MULTI_REPO_SYSTEM_RECOVERY_REPORT.md) · [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md) · [`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md) · [`INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md`](INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md) · [`I_INITIAL_STRUCTURES_MVP_BRANCH_AUDIT.md`](I_INITIAL_STRUCTURES_MVP_BRANCH_AUDIT.md) · [`EYE_EARN_SPARKLE_V2_UNIFIED_VISION_ARCHIVE_AUDIT.md`](EYE_EARN_SPARKLE_V2_UNIFIED_VISION_ARCHIVE_AUDIT.md) · [`EYE_TRACKING_PRE_COMPOSER_CLEANUP_BRANCH_AUDIT.md`](EYE_TRACKING_PRE_COMPOSER_CLEANUP_BRANCH_AUDIT.md) · [`STUDIO_ROUTING_AUDIT_BRANCH_AUDIT.md`](STUDIO_ROUTING_AUDIT_BRANCH_AUDIT.md) · [`CURSOR_V1_KERNEL_BRANCHES_AUDIT.md`](CURSOR_V1_KERNEL_BRANCHES_AUDIT.md) · [`CURSOR_DEV_ENVIRONMENT_SETUP_BRANCH_AUDIT.md`](CURSOR_DEV_ENVIRONMENT_SETUP_BRANCH_AUDIT.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Canonical Repositories](#2-canonical-repositories)
3. [Canonical Systems Table](#3-canonical-systems-table)
4. [Systems Still Missing](#4-systems-still-missing)
5. [Systems Requiring Reconciliation](#5-systems-requiring-reconciliation)
6. [Systems Safe To Build On](#6-systems-safe-to-build-on)
7. [Audit Conclusions](#7-audit-conclusions)
8. [Recommended Development Order](#8-recommended-development-order)
9. [Immediate Next Build Targets](#9-immediate-next-build-targets)

---

## 1. Executive Summary

**What is the current source of truth for every major i platform subsystem?**

The i ecosystem is **not one repo**. It is a **layered platform** with a single **integration conscience** (`i_project_migration_archive`) and **production implementations** spread across three implementation families:

| Layer | Canonical home | Role |
|-------|----------------|------|
| **Integration & contracts** | `i_project_migration_archive` | POPS design, proof packet schema, promoted Flutter runtime, investor Loop 1 demo, masterbrain inventory |
| **Production web + Supabase** | `github-source-repos/eye-earn-sparkle-archive` @ `main` | Wallet, rewards, feed, admin, Stripe, merchant checkout, web vision UI, studio components |
| **Native eye-tracking OS** | `github-source-repos/eye_tracking_app` @ `main` → promoted `integrations/eye-tracking/flutter-runtime/` | Gaze, blink, calibration, governance/safety kernels |
| **Platform types & policy** | `i-initial-structures` @ `main` → mirrored `integrations/eye-tracking/source/` | ELO, trust/alphabet types, safe-action engine, studio collab/media types |

**Archaeology is complete.** All critical branches listed in the recovery plan have dedicated audits. **Future work is promotion and wiring**, not branch discovery.

**#1 platform gap:** POPS end-to-end — architecture and proof schema exist; **no runtime emits proof packets** and **pending-validation wallet is not wired to production**.

**Canonical build stance:** Promote financial/backend from archive; extend integration repo for contracts and native runtime; reconcile Studio and web vision selectively; **do not rebuild** wallet, Stripe, merchant checkout, or Flutter gaze pipeline.

---

## 2. Canonical Repositories

| Repo | Path | Canonical branch | Role in ecosystem |
|------|------|------------------|-------------------|
| **i_project_migration_archive** | `~/Desktop/i-project-rescue/i_project_migration_archive` | `main` | **Master reconciliation repo** — docs, promoted runtime, `app/`, `integrations/`, HTML prototypes |
| **eye-earn-sparkle-archive** | `github-source-repos/eye-earn-sparkle-archive` | `main` | **Production web platform** — Supabase, React app, payments, feed, admin |
| **eye_tracking_app** | `github-source-repos/eye_tracking_app` | `main` | **Native ET upstream** — Flutter/Kotlin; promote deltas into flutter-runtime |
| **i-initial-structures** | `github-source-repos/i-initial-structures` | `main` | **Policy & studio types** — ELO, alphabet/trust, safe-action (mirrored under `integrations/eye-tracking/source/`) |
| **eye-earn-sparkle-v2** | `github-source-repos/eye-earn-sparkle-v2` | `main` / `archive/unified-vision-2025-02-07` | **Preserve** — gaze adapters, `attention_mediapipe`; diff before any promote |
| **eye-earn-sparkle** | `github-source-repos/eye-earn-sparkle` | `main` | **Preserve** — v1 consumer shell; ET UI deliberately removed |
| **i-project** (remote origin) | Same as migration archive | `main` | Historical name; migration archive is the working copy |
| **i-the-app**, **iview**, **eye-earn-sparkle-56c8e614*** | — | — | **Archive** — empty or placeholder |
| **up-next-queue** | `github-source-repos/up-next-queue` | `main` | **Archive** — unrelated product; pattern reference only |

**Branch bookmarks (do not treat as canonical tips):**  
`eye_tracking_app` cursor/v1-* @ `4980581` (stale); `feature/evidence-vault-v2-hardening` (selective reference); `codex/vision-unified-pipeline` commit `22cabd3` (cherry-pick only); `codex/investor-demo-mode-v2` (UX reference).

---

## 3. Canonical Systems Table

Columns: **Canonical Source** (repo · branch · path) · **Evidence** · **Promotion Status** · **Risk** · **Next Action**

| # | System | Canonical Source | Evidence | Promotion Status | Risk | Next Action |
|---|--------|------------------|----------|------------------|------|-------------|
| 1 | **Android Eye Tracking Runtime** | `eye_tracking_app` · `main` · `lib/` + `android/` → **`i_project_migration_archive`** · `main` · `integrations/eye-tracking/flutter-runtime/` | Smoke test passed ([`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md)); T-series on upstream `main`; promoted copy includes VSL + proof types; [`CURSOR_V1_KERNEL_BRANCHES_AUDIT.md`](CURSOR_V1_KERNEL_BRANCHES_AUDIT.md) | **Canonical** (integration copy) | **Low** if building on flutter-runtime | Sync promoted runtime from `eye_tracking_app/main` on a schedule; do not bulk-promote checkpoint/cursor branches |
| 2 | **Web Vision Runtime** | `eye-earn-sparkle-archive` · `main` · `src/contexts/VisionContext.tsx`, `src/components/EyeMovementTracking.tsx`, `attention_mediapipe/`; selective: branch `codex/vision-unified-pipeline` commit `22cabd3` | [`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md); [`EYE_EARN_SPARKLE_V2_UNIFIED_VISION_ARCHIVE_AUDIT.md`](EYE_EARN_SPARKLE_V2_UNIFIED_VISION_ARCHIVE_AUDIT.md) | **Promote Selectively** | **High** (3 web/native paths) | Cherry-pick `visionCalibration/profile.ts`, wizard, `useVisionEngine` when web shell lands; map liveness to proof packet hints only |
| 3 | **Calibration System** | Native: **`flutter-runtime`** · `lib/ear_calibration.dart`, `lib/features/calibration/`; Web: `eye-earn-sparkle-archive` · `main` · `src/components/EyeBlinkCalibration.tsx`; Docs: **`i_project_migration_archive`** · `docs/technical/CALIBRATION_TUNING_PLAN.md` | [`ADAPTIVE_CALIBRATION_SYSTEM.md`](ADAPTIVE_CALIBRATION_SYSTEM.md); multi-repo §4.8 | **Canonical** (native); **Promote Selectively** (web) | **Medium** | Keep native calibration authoritative; promote web profile from vision branch `22cabd3` only |
| 4 | **Adaptive Calibration** | **`i_project_migration_archive`** · `integrations/eye-tracking/flutter-runtime/lib/calibration/adaptive_calibration_profile.dart` + [`ADAPTIVE_CALIBRATION_SYSTEM.md`](ADAPTIVE_CALIBRATION_SYSTEM.md) | Implemented in promoted runtime; architecture in migration docs | **Canonical** | **Low** | Tune per [`CALIBRATION_TUNING_PLAN.md`](CALIBRATION_TUNING_PLAN.md); avoid third calibration implementation |
| 5 | **Verification Stability Layer** | **`i_project_migration_archive`** · `integrations/eye-tracking/flutter-runtime/lib/verification/verification_stability_layer.dart` + [`VERIFICATION_STABILITY_LAYER_V1.md`](VERIFICATION_STABILITY_LAYER_V1.md) | Authored post-promotion; tests in flutter-runtime; **not** on ET branch tips | **Canonical** | **Low** | Wire VSL output into `ProofPacketV0` confidence fields when emission ships |
| 6 | **POPS Validation System** | **`i_project_migration_archive`** · `docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`; reference impl: `eye_tracking_app` · `feature/evidence-vault-v2-hardening` · `services/api/src/lib/pops/` | Multi-repo §4.2; [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md) §6 | **Canonical** (design); **Promote Selectively** (backend reference) | **Critical** (unbuilt product loop) | Implement validator service against schema; reconcile branch POPS scoring with doc; **do not** treat web `livenessScore` as POPS truth |
| 7 | **Proof Packet System** | **`i_project_migration_archive`** · `docs/technical/PROOF_PACKET_SCHEMA_V0.md` · `integrations/eye-tracking/flutter-runtime/lib/proof/proof_packet_v0.dart` | Schema + Dart mirror; demo UI `app/src/screens/ProofLayerScreen.tsx` | **Canonical** | **Critical** until emission | **P0:** Emit `ProofPacketV0` at session end from flutter-runtime |
| 8 | **Evidence Vault** | Design/SQL ref: `eye_tracking_app` · `feature/evidence-vault-v2-hardening` · `supabase/migrations/204–209`, `docs/source-of-truth-ownership-contract.md`; Client: migration archive proof schema | [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md) | **Promote Selectively** | **Medium** | Stage vault SQL + ownership docs; reconcile with proof v0; do not merge ET branch wholesale |
| 9 | **Wallet Ledger** | `eye-earn-sparkle-archive` · `main` · `supabase/migrations/*wallet_ledger*.sql`, `atomic_*.sql` | Multi-repo §4.6, §5.1; atomic ops + audit trail | **Canonical** (source repo); **Promote** into migration `app/supabase/` | **High** if rebuilt | Copy migrations + shared middleware to canonical app tree; never rewrite ledger |
| 10 | **Pending Validation Wallet** | UX ref: `eye-earn-sparkle-archive` · `codex/investor-demo-mode-v2`; Contract: **`PROOF_PACKET_SCHEMA_V0.md`** (`review.status: pending`); Demo: `app/`, `04_wallet_payments/` HTML | [`INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md`](INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md); POPS delayed validation model | **Promote Selectively** | **High** | Wire pending tab to proof packet lifecycle; import v2 pending UX copy/components, not full archive merge |
| 11 | **Rewards Engine** | `eye-earn-sparkle-archive` · `main` · `supabase/functions/issue-reward/`, `*_attention_reward*.sql`, `finalize_promotion_checkin_reward_atomic.sql` | Tested edge functions; multi-repo §4.3 | **Canonical** (source); promote to migration | **High** if duplicated | Promote `issue-reward` + migrations; gate settlement on POPS approval |
| 12 | **Campaign Engine** | `eye-earn-sparkle-archive` · `main` · promotions feed, check-in, `get-nearby-promotions`, `submit-promotion-review` | Platform audit; promotion review tests | **Canonical** (source) | **Medium** | Promote with feed; connect to ELO when unified |
| 13 | **Creator Economy** | `eye-earn-sparkle-archive` · `main` · `tip-creator`, `request-payout`, `EarningBreakdownChart`, `CreatorToolsSheet` | Multi-repo §4.5 | **Canonical** (source) | **Medium** | Promote functions + UI; subscriptions still placeholder |
| 14 | **Feed Architecture** | `eye-earn-sparkle-archive` · `main` · `get-personalized-feed`, `Index.tsx`, `FriendsPostsFeed`, `PromoVideosFeed` | Production edge function + components | **Canonical** (source) | **Medium** | Promote backend + feed components; plan ELO integration separately |
| 15 | **Attention Verification** | Native: `flutter-runtime/lib/attention_kernel.dart` (from ET); Web: archive `AttentionProgressBar`, `AttentionHeatmap`; Backend: `redeem_attention_reward_enforce_session_expiry.sql` | Multi-repo §4.7; vision audit §7 | **Promote Selectively** | **High** | Unify scoring semantics with VSL + POPS; deprecate instant web settle where POPS requires pending |
| 16 | **Trust System** | `i-initial-structures` · `main` → **`integrations/eye-tracking/source/src/types/alphabet/trust.types.ts`**, `trust-impact-rules.ts` | [`I_INITIAL_STRUCTURES_MVP_BRANCH_AUDIT.md`](I_INITIAL_STRUCTURES_MVP_BRANCH_AUDIT.md); evidence branch API trust-fraud-review as reference | **Canonical** (types); **Promote Selectively** (persistence) | **Medium** | Deploy trust tables + triggers; wire safe-action outcomes |
| 17 | **Fraud/Risk Layer** | Types: `integrations/eye-tracking/source/` alphabet trust; Runtime gates: `flutter-runtime/lib/core/intent_os/governance_kernel.dart`, `safety_kernel.dart`; Ref: evidence branch `trust-fraud-review` | [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md) §7; v1 kernel audit | **Promote Selectively** | **Medium** | Multi-signal POPS + trust rules; on-device gates stay advisory until packet emission |
| 18 | **Governance Layer** | **`integrations/eye-tracking/flutter-runtime/lib/core/intent_os/governance_kernel.dart`** (upstream `eye_tracking_app/main`) | Production-quality unit tests; Intent OS on ET | **Canonical** | **Low** (mobile ET) | Link governance telemetry to proof packet audit fields when defined |
| 19 | **Studio Architecture** | Types/collab: **`integrations/eye-tracking/source/src/screens/studio/`**; UI/AI: `eye-earn-sparkle-archive` · `main` · `src/components/studio/` | [`STUDIO_ROUTING_AUDIT_BRANCH_AUDIT.md`](STUDIO_ROUTING_AUDIT_BRANCH_AUDIT.md); multi-repo §4.8 | **Promote Selectively** | **High** | Three-way reconcile: source types + archive AI UI + IVAULT publish mocks (preservation) — target migration web shell |
| 20 | **Studio Routing** | Target: **`i_project_migration_archive`** web integration; Reference: `eye_tracking_app` · `integration/studio-routing-audit` · `src/App.tsx` routes | Studio routing audit — identical tip to evidence branch; **do not** merge into ET `main` | **Preserve** (reference) | **Medium** | Map `/dev/i-command`, publish/wallet routes to canonical `app/` screen IDs |
| 21 | **Studio Review System** | **`integrations/eye-tracking/source/src/screens/studio/collab/studioReviewEngine.ts`** | Promoted from i-initial-structures; not wired to archive UI | **Canonical** (types/engine) | **Medium** | Wire review engine to archive studio + Supabase |
| 22 | **Studio Versioning** | **`integrations/eye-tracking/source/src/screens/studio/collab/studioVersionEngine.ts`** (with `studioPermissionEngine`, `studioPresenceEngine`) | Same as review | **Canonical** (types/engine) | **Medium** | Integrate with render queue + storage adapter |
| 23 | **Investor Demo** | Loop 1 spine: **`i_project_migration_archive`** · `app/` + `integrations/eye-tracking/demos/investor-demo/`; Full-product demo UX: `eye-earn-sparkle-archive` · `codex/investor-demo-mode-v2` | [`INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md`](INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md); [`MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md) | **Canonical** (Loop 1); **Preserve** (archive v2 overlay) | **Low** | Reconcile pending-wallet UX from v2 into `app/`; do not build demo v4 |
| 24 | **MVP Canonical Flow** | **`i_project_migration_archive`** · `docs/MVP_CANONICAL_FLOW.md` · screen order `integrations/eye-tracking/demos/investor-demo/src/demo/screensOrder.ts` | [`I_INITIAL_STRUCTURES_MVP_BRANCH_AUDIT.md`](I_INITIAL_STRUCTURES_MVP_BRANCH_AUDIT.md) confirms alignment | **Canonical** | **Low** | Close gaps in MVP doc (live feed API, consent gate in React) per step table |
| 25 | **Alphabet Currency System** | Product/docs: **`i_project_migration_archive`** · `07_currency_system/alphabet-currency.html`, `acoins_earning_system.html`; Types: **`integrations/eye-tracking/source/src/types/alphabet/`** | Multi-repo §2.5; MVP doc coin naming note | **Canonical** (docs/types); **Preserve** (HTML depth) | **Low** | Document iCoins/Vicoin/Icoin mapping in MVP doc; implement ledger coins in Supabase from archive |
| 26 | **ELO System** | **`integrations/eye-tracking/source/src/elo/`** (from `i-initial-structures/main`) | ELO services + `EloAppShell`; not integrated with archive feed | **Promote Selectively** | **Medium** | Wire `eloRecommendationService` to `get-personalized-feed` or replace static ranking |
| 27 | **iVatar System** | **No production canonical.** Closest: `integrations/old-source-preservation/ivault-eye-tracking/snapshot/src/screens/ivatar/`; routes in stash-0 / studio-routing snapshot | [`I_INITIAL_STRUCTURES_MVP_BRANCH_AUDIT.md`](I_INITIAL_STRUCTURES_MVP_BRANCH_AUDIT.md) §5 — absent in i-initial-structures | **Unknown** | **Medium** | Inventory IVAULT snapshot; decide promote vs greenfield; update `masterbrain/04_elo_ivatar/` when found |
| 28 | **Remote Control** | Web: `eye-earn-sparkle-archive` · `main` · `BlinkRemoteControl.tsx`, `useBlinkRemoteControl`; Native checkpoint: `eye_tracking_app` · `checkpoint/pre-composer-cleanup` · `lib/features/remote/` | Pre-composer audit §9; v2 unified vision audit | **Promote Selectively** | **Medium** | Product spec: web RC vs native `features/remote`; map blink patterns to intent OS |
| 29 | **Admin Platform** | `eye-earn-sparkle-archive` · `main` · `src/components/admin/` + admin edge functions | Moderation, KYC, analytics, wallet reconciliation — multi-repo §4.9 | **Canonical** (source); promote to migration | **High** if rebuilt | Promote admin suite with Supabase backend |
| 30 | **Database/Migrations** | `eye-earn-sparkle-archive` · `main` · `supabase/migrations/` (50+); Supplement: `integrations/eye-tracking/source/supabase/migrations/0018_safe_action_execution.sql` | Richest migration history; RLS + atomic SQL | **Canonical** (archive); **Promote Selectively** (safe-action) | **Critical** if forked | Single migration stream into `app/supabase/`; merge safe-action migration with trust tables |
| 31 | **Analytics** | `eye-earn-sparkle-archive` · `main` · admin analytics, `merchant-checkout-funnel`, `track-interaction-health` | Checkout funnel + admin panels in platform audit | **Canonical** (source) | **Low** | Promote with admin; extend for POPS validation metrics |
| 32 | **Payments** | `eye-earn-sparkle-archive` · `main` · `stripe-webhook`, `create-checkout`, `customer-portal`, `request-payout` | Tests on webhook; tier logic | **Canonical** (source) | **High** if rebuilt | Promote Stripe functions + secrets contract |
| 33 | **Merchant/Checkout** | `eye-earn-sparkle-archive` · `main` · `merchant-checkout-*` (7 functions) + `_shared/merchant_checkout.ts` | Idempotency + funnel — multi-repo §4.6 | **Canonical** (source) | **High** if rebuilt | Promote as atomic unit with wallet ledger |
| 34 | **Documentation Source** | **`i_project_migration_archive`** · `docs/technical/`, `docs/MVP_CANONICAL_FLOW.md`, `00_README/`, `01_strategy_docs/` | This document + POPS/proof/VSL specs; recovery reports | **Canonical** | **Low** | Mark branch audits **historical**; update only this SoT + MVP doc on decisions |
| 35 | **OpenAI Export Knowledge Base** | **`i_project_migration_archive`** · `masterbrain/01_chat_inventory/` (`CHAT_LEDGER.md`, ingestion template) | Category stubs `masterbrain/00_INDEX.md`; not ingested content | **Preserve** | **Low** | Ingest exports into ledger when available; link decisions to SoT sections |

### Promotion status legend

| Status | Meaning |
|--------|---------|
| **Canonical** | Build here; other copies are reference or upstream only |
| **Promote Selectively** | Copy defined artifacts only; no wholesale branch merge |
| **Preserve** | Keep in source repo or preservation folder; do not merge |
| **Archive** | Dead-end or unrelated; do not use for i platform |
| **Unknown** | Insufficient implemented source; discovery closed, implementation TBD |

### Owner source legend

| Owner source | Systems primarily owned |
|--------------|-------------------------|
| **Migration archive** | POPS, proof packet, VSL, adaptive calibration docs, flutter-runtime promotion, MVP flow, documentation, masterbrain |
| **eye-earn-sparkle-archive** | Wallet, payments, feed, rewards, campaigns, creator economy, admin, web vision UI, studio AI components, analytics |
| **eye_tracking_app → flutter-runtime** | Android ET, governance/safety, native attention, calibration runtime |
| **i-initial-structures → integrations/source** | ELO, alphabet/trust types, safe-action, studio collab/version/review engines |
| **Preservation / branch refs** | iVatar snapshot, studio-routing monolith, evidence-vault backend reference, investor-demo v2 overlay |

---

## 4. Systems Still Missing

| System | Gap | Canonical direction |
|--------|-----|---------------------|
| **POPS runtime loop** | No emitter, no validator service, no pending→approved settlement | Implement per [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md) |
| **Proof packet emission** | Dart types only | Session-end emission in flutter-runtime → API |
| **Pending validation wallet (production)** | Designed; demo partial | Wire `review.status` to wallet UI + ledger holds |
| **iVatar** | No canonical implementation | IVAULT preservation snapshot or new build |
| **Creator subscriptions** | Placeholder in archive | Explicitly out of MVP; do not block Loop 1 |
| **ELO ↔ feed integration** | Two recommendation paths | Single ranking owner after promotion |
| **Unified web+native vision** | Three implementations | Native authoritative for mobile; web cherry-pick `22cabd3` |
| **POPS product layer on ET** | `eye_tracking_app` reports LOW readiness | Packet emission + Supabase hooks |

---

## 5. Systems Requiring Reconciliation

| System | Conflicting sources | Reconciliation rule |
|--------|---------------------|---------------------|
| **Studio** | `integrations/eye-tracking/source/` types vs archive `src/components/studio/` vs IVAULT publish mocks (preservation) | Types-first from source; AI UI from archive; routing from studio audit — **all in migration web shell**, ET supplies signals only |
| **Web vision vs native runtime** | archive `VisionContext`, v2 `attention_mediapipe`, flutter-runtime | Native canonical for Capacitor shell signal; web pipeline selective promote |
| **Reward timing** | Archive instant `validate-attention`/`issue-reward` vs POPS delayed | **Lock async settlement**; demote instant path for MVP |
| **Trust/fraud** | i-initial-structures types vs evidence-branch API | Single rule catalog; API from branch as reference only |
| **Investor demo economics** | `app/` 60/30/10 vs archive campaign variability | Canonical economics in `app/`; v2 for presentation overlays |
| **Coin naming** | iCoins/aCoins vs Vicoin/Icoin | Document mapping in [`MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md) |
| **Evidence vault vs proof v0** | Branch SQL vs migration schema | Align migrations to `PROOF_PACKET_SCHEMA_V0` before deploy |

---

## 6. Systems Safe To Build On

Treat these as **frozen foundations** — extend, do not rewrite:

1. **`integrations/eye-tracking/flutter-runtime/`** — gaze pipeline, governance/safety, VSL, adaptive calibration, proof types  
2. **`docs/technical/POPS_*` + `PROOF_PACKET_SCHEMA_V0.md`** — product validation contract  
3. **`eye-earn-sparkle-archive` financial stack** — wallet ledger, atomic SQL, Stripe, merchant checkout, `issue-reward`  
4. **`integrations/eye-tracking/source/`** — ELO, trust/alphabet, safe-action, studio collab/version/review  
5. **`docs/MVP_CANONICAL_FLOW.md` + `app/` + `integrations/eye-tracking/demos/investor-demo/`** — Loop 1 narrative  
6. **`eye-earn-sparkle-archive` admin panel** — moderation, KYC, reconciliation  
7. **Shared edge middleware** — idempotency, rate limit, admin audit (`_shared/`)

---

## 7. Audit Conclusions

1. **Archaeology phase is complete** for all branches listed in [`MULTI_REPO_SYSTEM_RECOVERY_REPORT.md`](MULTI_REPO_SYSTEM_RECOVERY_REPORT.md) §7–§11.  
2. **Production platform code** lives primarily in **`eye-earn-sparkle-archive`**, not yet fully copied into the migration archive.  
3. **Architecture and native ET** live in **`i_project_migration_archive`** (docs + flutter-runtime).  
4. **Policy/studio types** live in **`integrations/eye-tracking/source/`** (from i-initial-structures).  
5. **No further branch discovery** is required for MVP; remaining risk is **integration and promotion**, not missing repos.  
6. **Cursor v1 kernel branches** and **dev-environment-setup** are stale bookmarks — closed.  
7. **Evidence-vault** and **studio-routing** branches are **platform checkpoints** — selective artifact promote only.  
8. **`FULL_REPO_SOURCE_RECOVERY_AUDIT.md`** placeholder is superseded by this document for ownership; GitHub org sweep is done at cloned-repo scope.

---

## 8. Recommended Development Order

| Phase | Work | Depends on |
|-------|------|------------|
| **P0** | Proof packet emission (flutter-runtime) | Proof schema |
| **P0** | Promote wallet ledger + `issue-reward` + shared `_shared/` | Archive migrations |
| **P0** | POPS validator stub + pending wallet UX | Proof emission |
| **P1** | Pending validation wallet production wiring | P0 |
| **P1** | Promote Stripe + merchant checkout + admin | P0 ledger |
| **P1** | Cherry-pick web vision `22cabd3` when Capacitor shell promotes | Web shell decision |
| **P2** | Trust/safe-action Supabase tables + triggers | Ledger |
| **P2** | ELO → feed integration | Feed promoted |
| **P2** | Studio three-way merge (types + archive AI + routes) | P1 web shell |
| **P2** | Evidence vault SQL staged + reconciled to proof v0 | POPS |
| **P3** | Y-plane transport per experiment doc | Runtime stable |
| **P3** | iVatar decision + snapshot promote or greenfield | Product call |
| **P3** | Native `features/remote` vs web BlinkRemoteControl spec | ET roadmap |

---

## 9. Immediate Next Build Targets

| Priority | Target | Why now |
|----------|--------|---------|
| **1** | **Proof packet emission** in `integrations/eye-tracking/flutter-runtime/` | Unblocks POPS, pending wallet, evidence vault, and attention verification |
| **2** | **Promote `eye-earn-sparkle-archive` Supabase financial core** into `app/supabase/` | Avoids rewrite; enables real settlement |
| **3** | **Pending validation wallet UX** from `codex/investor-demo-mode-v2` into canonical `app/` | Demos exist; production wiring is the gap |
| **4** | **POPS validator service** (minimal) accepting `ProofPacketV0` | Closes architecture–implementation gap |
| **5** | **Studio reconciliation plan execution** (types + archive UI) | Highest remaining cross-repo duplication risk |

---

## Appendix — Per-system detail (canonical path quick reference)

| System | Repo | Branch | Path |
|--------|------|--------|------|
| Android ET Runtime | `i_project_migration_archive` | `main` | `integrations/eye-tracking/flutter-runtime/` |
| Web Vision | `eye-earn-sparkle-archive` | `main` / `codex/vision-unified-pipeline` | `src/contexts/VisionContext.tsx`, `attention_mediapipe/` |
| Calibration (native) | `i_project_migration_archive` | `main` | `integrations/eye-tracking/flutter-runtime/lib/calibration/` |
| VSL | `i_project_migration_archive` | `main` | `integrations/eye-tracking/flutter-runtime/lib/verification/` |
| POPS (design) | `i_project_migration_archive` | `main` | `docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` |
| Proof packet | `i_project_migration_archive` | `main` | `docs/technical/PROOF_PACKET_SCHEMA_V0.md`, `.../lib/proof/proof_packet_v0.dart` |
| Wallet / payments | `eye-earn-sparkle-archive` | `main` | `supabase/migrations/`, `supabase/functions/` |
| Feed / rewards | `eye-earn-sparkle-archive` | `main` | `supabase/functions/get-personalized-feed/`, `issue-reward/` |
| ELO / trust / studio types | `i_project_migration_archive` | `main` | `integrations/eye-tracking/source/src/` |
| Investor / MVP demo | `i_project_migration_archive` | `main` | `app/`, `integrations/eye-tracking/demos/investor-demo/` |
| iVatar (preservation) | `i_project_migration_archive` | — | `integrations/old-source-preservation/ivault-eye-tracking/snapshot/src/screens/ivatar/` |

---

*Document owner: platform integration. Update this file when promotion decisions change; do not reopen branch archaeology without new remote evidence.*
