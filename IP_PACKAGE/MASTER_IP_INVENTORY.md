# Master IP Inventory — [ i ] Project

**CONFIDENTIAL — ATTORNEY-CLIENT PRIVILEGED WORK PRODUCT**

| Field | Value |
|-------|-------|
| **Inventory ID** | IP-AUDIT-2026-001 |
| **Date** | 2026-06-15 |
| **Scope** | Full repository (`i_project_migration_archive`) + canonical Desktop archive references |
| **Inventor** | Marcelo Silva |
| **Assignee (proposed)** | [ i ] Project / IVAULT — entity TBD by counsel |

---

## Executive Summary

The [ i ] ecosystem contains **40 distinct inventions** across **10 patent families**, **35+ trademark candidates**, **28 trade secret assets**, and **58+ copyrightable works**. The IP spans multimodal attention verification, AI companion safety, autonomous gaze-driven interfaces, a 26-letter virtual currency taxonomy, immersive commerce UX, and creator economy infrastructure.

**Existing IP coverage:** 4 legal documents already cover the POP patent family (8 applications, P1-P8). This inventory extends coverage to the remaining 9 families and 32+ new inventions.

| Category | Count |
|----------|-------|
| Total inventions identified | 40 |
| Patent candidates (utility) | 32 |
| Patent candidates (design) | 3 |
| Trademark candidates | 35+ |
| Trade secrets | 28 |
| Copyright assets (code + prototypes) | 58+ |
| Already documented (POP family) | 8 applications |
| New inventions requiring disclosure | 32 |

---

## Inventory by Domain

### Domain 1: POP / Proof / Settlement (EXISTING — docs/legal/)

8 inventions already fully documented in `POP_PATENT_FAMILY.md` (POP-FAM-2026-001).

| ID | Invention | Patent | Status |
|----|-----------|--------|--------|
| INV-001 | Six-Layer POPS Scoring Engine | P1 | Filed-ready |
| INV-002 | Proof Packet v0 Sealed Artifact | P1 | Filed-ready |
| INV-003 | Verification Stability Layer (VSL) | P1 | Filed-ready |
| INV-004 | Delayed Server-Gated Settlement | P2 | Filed-ready |
| INV-005 | Campaign Eligibility Scoring | P3 | Filed-ready |
| INV-006 | Trust-Tier-Modulated Release Delays | P7 | Filed-ready |
| INV-007 | Multi-Currency Layer-Mapped Minting | P8 | Filed-ready |
| INV-008 | Privacy-Gated Derived-Signal Emission | P1 | Filed-ready |

**Reference:** `docs/legal/POP_INVENTION_DISCLOSURE.md`, `docs/legal/POP_PATENT_FAMILY.md`

---

### Domain 2: Attention & Vision (NEW)

| ID | Invention | Category | Priority | Patentability |
|----|-----------|----------|----------|---------------|
| INV-009 | Time-Weighted Attention Scoring Ledger | Patent | 9/10 | 8/10 |
| INV-010 | Adaptive Gaze Calibration with Polynomial Residual Model | Patent | 8/10 | 9/10 |
| INV-011 | Y-Plane Luminance Transport Optimization | Patent | 6/10 | 7/10 |
| INV-032 | Signal Stale Policy with Backpressure Safety | Patent | 5/10 | 6/10 |
| INV-033 | Headless Replay Regression Harness | Patent/Trade Secret | 6/10 | 7/10 |

**Key source files:**
- `app/src/lib/attentionScoring.ts`
- `app/src/lib/visionCalibration/calibrationFit.ts`, `residualModel.ts`
- `integrations/eye-tracking/flutter-runtime/lib/features/vision/y_plane_frame_codec.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/pop/signal_stale_policy.dart`
- `integrations/eye-tracking/flutter-runtime/lib/replay/pop_replay_driver.dart`

---

### Domain 3: Intent OS / Autonomous Kernel (NEW)

| ID | Invention | Category | Priority | Patentability |
|----|-----------|----------|----------|---------------|
| INV-012 | Autonomous Execution Kernel with Ordered Gate Chain | Patent | 10/10 | 9/10 |
| INV-013 | Governance Kernel Safety Stack | Patent | 9/10 | 9/10 |
| INV-014 | Multimodal Command Engine (Voice + Gaze Fusion) | Patent | 8/10 | 8/10 |
| INV-015 | Digital Twin Adaptive Learning Engine | Patent | 9/10 | 8/10 |

**Key source files:**
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/autonomous_execution_kernel.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/governance_kernel.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/safety_kernel.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/commands/multimodal_command_engine.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/learning/` (19 files)

---

### Domain 4: Elo AI Companion (NEW)

| ID | Invention | Category | Priority | Patentability |
|----|-----------|----------|----------|---------------|
| INV-016 | Elo Doctrine-Safe AI Companion Runtime | Patent | 9/10 | 8/10 |
| INV-017 | Elo Expression Engine (Biometric-to-Emotion Mapping) | Patent | 7/10 | 7/10 |

**Key source files:**
- `app/src/lib/elo/eloRuntimeEngine.ts`, `eloDoctrine.ts`, `eloPersonalization.ts`
- `app/src/lib/elo/expressionEngine.ts`
- `MASTER_BRAIN/ENTITIES/ELO.md`
- `MASTER_BRAIN/CHAT_RECOVERY/EXTRACTED/conversations/143_elo_personal_intelligence_companion.md`

---

### Domain 5: Wallet & Settlement Infrastructure (NEW)

| ID | Invention | Category | Priority | Patentability |
|----|-----------|----------|----------|---------------|
| INV-018 | Append-Only Wallet Ledger with Value Lots and Invariant Rules | Patent | 9/10 | 8/10 |
| INV-019 | Two-Step Server-Recomputed Attention Reward | Patent | 9/10 | 9/10 |
| INV-035 | Interaction Abuse Controls (Nonce/Overrun/Cooldown Stack) | Patent/Trade Secret | 7/10 | 7/10 |

**Key source files:**
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/lib/wallet_ledger_engine.dart`
- `app/supabase/functions/validate-attention/index.ts`
- `app/supabase/functions/issue-reward/index.ts`
- `app/supabase/functions/track-interaction/index.ts`
- `app/supabase/migrations/20260218100002_wallet_ledger.sql`

---

### Domain 6: Attention Economy UX (NEW)

| ID | Invention | Category | Priority | Patentability |
|----|-----------|----------|----------|---------------|
| INV-020 | Fibonacci Offer Ramp Curves | Patent | 7/10 | 7/10 |
| INV-021 | Composable Gesture Economy Buttons | Patent | 8/10 | 8/10 |
| INV-027 | Gesture Vocabulary Mapped to Economy Actions | Patent/Design | 8/10 | 7/10 |
| INV-028 | Pending-First Wallet Settlement UX | Design Patent | 7/10 | 7/10 |

**Key source files:**
- `app/src/lib/gestureButtons/ramp.ts`
- `app/src/lib/gestureButtons/` (types, offerService, configStore, layoutStore, presets)
- `MASTER_BRAIN/UX/USER_GESTURE_BUTTONS.md`
- `04_wallet_payments/wallet_pending_tab.html`

---

### Domain 7: Marketplace & Commerce (NEW)

| ID | Invention | Category | Priority | Patentability |
|----|-----------|----------|----------|---------------|
| INV-022 | Geo-Verified Promotion Check-In with Streak Bonus Ladder | Patent | 8/10 | 8/10 |
| INV-023 | Merchant Checkout Funnel with Attention Wallet | Patent | 7/10 | 7/10 |
| INV-024 | Feed Personalization with Attention Scoring Integration | Patent | 7/10 | 6/10 |
| INV-025 | Platform Aggregation Attention Layer | Patent | 8/10 | 7/10 |
| INV-031 | Multi-Stop Promo Route Builder | Patent | 6/10 | 6/10 |

**Key source files:**
- `app/supabase/functions/verify-checkin/index.ts`
- `app/supabase/functions/merchant-checkout-*/index.ts`
- `app/supabase/functions/get-personalized-feed/index.ts`
- `02_clickable_prototypes/iapp_connect_platforms.html`
- `app/src/components/immersive/ImmersiveRouteBuilderSheet.tsx`

---

### Domain 8: Creator Tools (NEW)

| ID | Invention | Category | Priority | Patentability |
|----|-----------|----------|----------|---------------|
| INV-029 | Studio with POP Gate Template Binding | Patent | 7/10 | 7/10 |
| INV-030 | Campaign Builder with Condition Rows and Live Preview | Patent | 6/10 | 6/10 |

**Key source files:**
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/src/screens/studio/`
- `05_creator_campaigns/campaign_builder_owner.html`
- `MASTER_BRAIN/CREATOR_ECONOMY/STUDIO_AND_CAMPAIGNS.md`

---

### Domain 9: Immersive UI Design (NEW)

| ID | Invention | Category | Priority | Patentability |
|----|-----------|----------|----------|---------------|
| INV-026 | Glass Immersive Feed Shell (Picture 2) | Design Patent | 8/10 | 8/10 |
| INV-038 | Timer Line + Coin Pill Top Chrome | Design Patent | 6/10 | 7/10 |
| INV-039 | Out-Profile Creator Chip Pattern | Design Patent | 5/10 | 6/10 |

**Key source files:**
- `MASTER_BRAIN/CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md`
- `06_feed_earning_loops/app_immersive.html`, `iapp_immersive_feed.html`
- `app/src/screens/ImmersiveFeedScreen.tsx`
- `app/src/components/immersive/OutProfileChip.tsx`

---

### Domain 10: Platform Modules & Identity (NEW — Future)

| ID | Invention | Category | Priority | Patentability |
|----|-----------|----------|----------|---------------|
| INV-034 | Evidence Vault with Consent-Scoped Storage | Patent | 6/10 | 7/10 |
| INV-036 | Alphabet Currency UX System (26+w Interactive Taxonomy) | Patent | 7/10 | 6/10 |
| INV-037 | Three-Loops Product Framework | Trade Secret | 5/10 | 4/10 |
| INV-040 | iAM Identity / Future-Self Layer | Patent (conceptual) | 6/10 | 5/10 |

**Key source files:**
- `integrations/old-source-preservation/.../consentVault.ts`
- `07_currency_system/alphabet-currency.html`
- `06_feed_earning_loops/iapp_three_loops.html`
- `MASTER_BRAIN/ENTITIES/iAM.md`
- `MASTER_BRAIN/SYSTEMS/ModuleAlphabet.md`

---

## Source File Census

| Area | Files scanned | IP-relevant files |
|------|---------------|-------------------|
| MASTER_BRAIN/ | 249 | 249 (all canonical knowledge) |
| integrations/pop-core/ | 157 source | 80+ (scoring, decisions, settlement, contracts) |
| integrations/eye-tracking/flutter-runtime/ | 274 source | 133 Dart + native (all novel) |
| app/src/ | ~423 | 180+ (screens, lib, services, components) |
| app/supabase/migrations/ | 107 | 40+ (economy, wallet, POP, promo schemas) |
| app/supabase/functions/ | 30+ entrypoints | 20+ (economy edges) |
| docs/ | 56 | 30+ (architecture, technical, legal) |
| HTML prototypes (02-07) | 58 | 58 (all UI IP) |
| old-source-preservation/ | ~2,719 | 100+ (Studio, wallet, evidence vault, POPS) |
| scripts/ | 68 | 15+ (smoke tests as enablement evidence) |
| **Total** | **~9,500+** | **~900+** |

---

## Cross-Reference to IP Package Documents

| Document | Content |
|----------|---------|
| `PATENT_CANDIDATES.md` | All 35 utility + 3 design patent candidates ranked |
| `TRADEMARK_CANDIDATES.md` | 35+ brandable marks with filing classes |
| `COPYRIGHT_ASSETS.md` | Source code, prototypes, documents, visual designs |
| `TRADE_SECRETS.md` | 28 proprietary elements classified Critical/High/Medium/Low |
| `PATENT_FAMILY_MAP.md` | 10 patent families with dependency and continuation map |
| `OWNERSHIP_CHAIN.md` | Inventorship, assignee, employment, and contribution chain |
| `PRIOR_ART_RESEARCH_TARGETS.md` | Per-family prior art search terms and known competitors |
| `INVESTOR_IP_SUMMARY.md` | Investor-facing IP moat narrative |
| `FILING_PRIORITY.md` | Priority 1/2/3 ranked filing schedule |
| `INVENTION_DISCLOSURES/` | 40 individual invention disclosure forms |
| `SYSTEM_DIAGRAMS/` | Architecture diagrams per patent family |

---

*Generated from full repository audit. All file references verified against canonical workspace.*
