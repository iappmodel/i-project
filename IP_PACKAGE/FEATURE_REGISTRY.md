# Feature Registry — [ i ] Project

**Registry ID:** IP-FEAT-2026-001  
**Date:** 2026-06-15  
**Inventor:** Marcelo Silva  

Every entry below is a **structured feature invention** — documented as a complete system specification, not a hypothesis. Unbuilt features are defined with full technical architecture so they fortify the [ i ] concept for investors and filing.

**Status key:** `SHIPPED` = testable in repo today | `SPECIFIED` = architecture + prototype documented, implementation in progress | `ARCHITECTED` = full system design, build queued

---

## Core Loop Features

### F-001 — Loop 1: Watch → Verify → Earn
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (82%) |
| **Invention** | INV-001–008 (POP family), INV-019 |
| **Description** | User watches full-bleed media; attention session captures multimodal evidence; proof packet seals on device; server validates via POPS; reward enters pending hold; settlement releases to wallet. |
| **Components** | `ImmersiveFeedScreen`, `attentionSession.ts`, `demoProofPacket.ts`, `validate-attention`, `issue-reward`, POP validator |
| **Economic rule** | CR-01: no reward without validated attention session |

### F-002 — Loop 2: Browse → Save → Return
| Field | Value |
|-------|-------|
| **Status** | SPECIFIED (45%) |
| **Invention** | INV-037 |
| **Description** | User discovers content, saves to personal library, returns via notification/reminder. Habit loop separate from earning loop. |
| **Components** | `saved` screen, localStorage model, feed save action |
| **Build next** | Production save sync, push notifications, return analytics |

### F-003 — Loop 3: Balance → Convert → Use
| Field | Value |
|-------|-------|
| **Status** | SPECIFIED (55%) |
| **Invention** | INV-036, INV-018 |
| **Description** | User converts earning coins through rCoins hub to spendable iCoins/vCoins; spends on boosts, tips, unlocks, merchant checkout. |
| **Components** | `ConvertScreen`, `transfer-coins` edge, economy rules §3 |
| **Build next** | Trust-tier conversion UI, full 26+w coin wallet |

---

## POP / Verification Features

### F-010 — Seal Proof (Device)
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (88%) |
| **Invention** | INV-002 |
| **Description** | Flutter runtime seals Proof Packet v0 from live gaze session; POSTs to validator; triggers wallet deep link. |
| **Components** | `flutter-runtime`, `pop_replay_driver`, Android USB E2E verified |

### F-011 — POPS Six-Layer Scoring
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (82%) |
| **Invention** | INV-001 |
| **Description** | Independent proof dimensions: Presence, Participation, Perception, Signal, Session Integrity, Reward Eligibility. |
| **Components** | `pops-scoring.service.ts`, `pops-decision.service.ts` |

### F-012 — Verification Stability Layer
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (85%) |
| **Invention** | INV-003 |
| **Description** | On-device rolling window smoothing; confidence bands POOR→WARMING→USABLE→STRONG. |
| **Components** | `verification_stability_layer.dart` |

### F-013 — Trust Tier Settlement
| Field | Value |
|-------|-------|
| **Status** | SPECIFIED (70%) |
| **Invention** | INV-006 |
| **Description** | t0_new (4h delay), t1_established (1h), t2_trusted (instant). Tier modulates settlement speed and conversion rates. |
| **Components** | `trust-tier.ts`, `settlement-amount-policy.ts` |

---

## Attention & Vision Features

### F-020 — Multimodal Attention Scoring
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (75%) |
| **Invention** | INV-009 |
| **Description** | Rolling EMA fuses face, eyes, gaze, pose signals into session attention score. |
| **Components** | `attentionScoring.ts` |

### F-021 — Adaptive Gaze Calibration
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (80%) |
| **Invention** | INV-010 |
| **Description** | Affine fit + degree-2 polynomial residual correction; per-device profiles. |
| **Components** | `calibrationFit.ts`, `residualModel.ts`, `CalibrationProfileStore` |

### F-022 — Y-Plane Luminance Transport
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (88%) |
| **Invention** | INV-011 |
| **Description** | Native→Dart luminance-only frame path; skips JPEG encode bottleneck. |
| **Components** | `y_plane_frame_codec.dart`, `y_plane_buffer_pool.dart` |

---

## Intent OS Features

### F-030 — Autonomous Execution Kernel
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (72%) |
| **Invention** | INV-012 |
| **Description** | Ordered gate chain: emergency → prefilter → OS policy → high-risk → governance → safety → execute. |
| **Components** | `autonomous_execution_kernel.dart`, `pop_action_executor.dart` |

### F-031 — Governance + Safety Stack
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (80%) |
| **Invention** | INV-013 |
| **Description** | Confidence >0.85, risk caps, fixation+dwell, rate limit >600ms, reversibility. Gaze-only never triggers financial/OS actions. |
| **Components** | `governance_kernel.dart`, `safety_kernel.dart`, `high_risk_action_lane.dart` |

### F-032 — Multimodal Voice + Gaze Commands
| Field | Value |
|-------|-------|
| **Status** | SPECIFIED (55%) |
| **Invention** | INV-014 |
| **Description** | Voice defines action rule; gaze defines spatial target; blink/dwell triggers compound command. |
| **Components** | `multimodal_command_engine.dart`, `voice_engine.dart` |

### F-033 — Digital Twin Learning Engine
| Field | Value |
|-------|-------|
| **Status** | SPECIFIED (60%) |
| **Invention** | INV-015 |
| **Description** | 19 on-device learning modules: twin engine, zone stats, UI evolution, memory compressor, behavior profiles. No cloud upload by default. |
| **Components** | `core/intent_os/learning/` (19 files) |

### F-034 — Blink Remote Control System
| Field | Value |
|-------|-------|
| **Status** | SPECIFIED (50%) |
| **Invention** | INV-041 |
| **Description** | Gaze-zone dwell + blink commits remote actions across device sessions. Lite version shipped; full archive UI ports combo builder, import/export, cross-device binding. |
| **Components** | `VisionBlinkRemoteLite`, `gestureComboStore.ts`, `GestureComboBuilderSheet` |

---

## Elo AI Features

### F-040 — Elo Doctrine-Safe Companion
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (75%) |
| **Invention** | INV-016 |
| **Description** | Pipeline: Doctrine → Personalization → Compose → Post-process. Blocks proof bypass, reward manipulation, certainty claims. |
| **Components** | `eloRuntimeEngine.ts`, `eloDoctrine.ts`, `elo-reply` edge |

### F-041 — Elo Expression Engine
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (70%) |
| **Invention** | INV-017 |
| **Description** | Head pose + eye openness + attention score → orb/face expression states. |
| **Components** | `expressionEngine.ts`, `EloPresenceLayer.tsx`, `EloFaceMembrane.tsx` |

### F-042 — Elo Presence Membrane
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (78%) |
| **Invention** | INV-017 |
| **Description** | Floating glass membrane with procedural SVG contours, speech energy halo, zone interactions. |
| **Components** | `pulseSpeech`, `EloStackEditor` |

---

## Wallet & Economy Features

### F-050 — Append-Only Wallet Ledger
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (85%) |
| **Invention** | INV-018 |
| **Description** | Value lots, Rule 2/4/8 invariants, balance as projection. No manual balance edits. |
| **Components** | `wallet_ledger_engine.dart`, `20260218100002_wallet_ledger.sql` |

### F-051 — Two-Step Attention Reward
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (80%) |
| **Invention** | INV-019 |
| **Description** | Server recomputes attention score; client never sends amounts; single-use reward token. |
| **Components** | `validate-attention`, `issue-reward` |

### F-052 — Fibonacci Offer Ramp
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (85%) |
| **Invention** | INV-020 |
| **Description** | Escalating tip/reward amounts during active offering window (gentle/standard/aggressive profiles). |
| **Components** | `gestureButtons/ramp.ts` |

### F-053 — Composable Gesture Economy Buttons
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (75%) |
| **Invention** | INV-021 |
| **Description** | User-configurable gesture buttons mapped to economy actions; offer lifecycle draft→offering→accepted→completed. |
| **Components** | `gestureButtons/`, `MediaActionRail.tsx`, `GestureButtonBuilderSheet.tsx` |

### F-054 — Wheel Mechanic (Scroll Earns)
| Field | Value |
|-------|-------|
| **Status** | ARCHITECTED (30%) |
| **Invention** | INV-044 |
| **Description** | Scroll direction and velocity earn distinct coin types: upward scroll earns vCoins (utility), downward earns iCoins (cash-equivalent). Wheel gesture detected via immersive feed scroll physics; settlement gated by POP session. |
| **Components** | Economy rules §4.2, `iapp_immersive_feed.html` scroll handler spec |
| **Architecture** | Scroll delta → attention session sample → direction classifier → coin type mapper → `issue-reward` with wheel source tag |

### F-055 — Alphabet Currency System (26+ω)
| Field | Value |
|-------|-------|
| **Status** | SPECIFIED (45%) |
| **Invention** | INV-036 |
| **Description** | 26 letter-named coins + omega in 7 tiers; rCoins conversion hub; non-convertible classes (gCoins, tCoins, zCoins). |
| **Components** | `i-app-economy-rules.md`, `alphabet-currency.html` |

---

## Marketplace Features

### F-060 — Geo-Verified Check-In
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (78%) |
| **Invention** | INV-022 |
| **Description** | Haversine server verification; streak bonus ladder 2d=5%, 3d=10%, 5d=15%. |
| **Components** | `verify-checkin` edge |

### F-061 — Merchant Checkout Funnel
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (70%) |
| **Invention** | INV-023 |
| **Description** | draft → resolve → confirm (FACE_ID/PIN) → tip → status. Idempotent. Pays from attention wallet. |
| **Components** | `merchant-checkout-*` edges (5 functions) |

### F-062 — Feed Personalization Engine
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (72%) |
| **Invention** | INV-024 |
| **Description** | 80-item pool; relevance scoring; cold-start fallback. |
| **Components** | `get-personalized-feed`, `feed.service.ts` |

### F-063 — Platform Connect Hub
| Field | Value |
|-------|-------|
| **Status** | ARCHITECTED (35%) |
| **Invention** | INV-025 |
| **Description** | [ i ] as attention verification layer atop Spotify, YouTube, TikTok, etc. Cross-platform identity + earnings attribution. |
| **Components** | `iapp_connect_platforms.html`, conversations 064/069 |
| **Architecture** | OAuth bridge → session listener → POP overlay → earnings attribution → wallet credit |

### F-064 — Multi-Stop Promo Route Builder
| Field | Value |
|-------|-------|
| **Status** | SPECIFIED (55%) |
| **Invention** | INV-031 |
| **Description** | User composes route through multiple promo locations; per-stop POP verification; optimized ordering. |
| **Components** | `ImmersiveRouteBuilderSheet.tsx`, `promo_routes` tables |

---

## Creator Features

### F-070 — Studio with POP Gate Binding
| Field | Value |
|-------|-------|
| **Status** | SPECIFIED (50%) |
| **Invention** | INV-029 |
| **Description** | Creator publishes offer inheriting POP gate template; studio simulates POPS layers before publish. |
| **Components** | preservation `studio/`, `studioPOPS.ts` |

### F-071 — Campaign Builder + Live Preview
| Field | Value |
|-------|-------|
| **Status** | SPECIFIED (40%) |
| **Invention** | INV-030 |
| **Description** | Visual rule builder: media → targeting → budget → conditions → live phone preview. |
| **Components** | `campaign_builder_owner.html` |

### F-072 — Creator Economy 60/30/10 Split
| Field | Value |
|-------|-------|
| **Status** | ARCHITECTED (35%) |
| **Invention** | POP P5 (family 01) |
| **Description** | 60% creator, 30% platform, 10% attention pool on verified engagement revenue. |
| **Components** | `i-app-economy-rules.md` §6 |

---

## Immersive UI Features

### F-080 — Glass Immersive Feed Shell
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (82%) |
| **Invention** | INV-026 |
| **Description** | Full-bleed media, glass floating controls, 5-tab white dock. Canonical product surface. |
| **Components** | `ImmersiveFeedScreen.tsx`, `IMMERSIVE_UI_DESIGN_LAW.md` |

### F-081 — Timer Line + Coin Pill
| Field | Value |
|-------|-------|
| **Status** | SPECIFIED (75%) |
| **Invention** | INV-038 |
| **Description** | Top chrome: thin progress bar tied to attention session + floating earned-value capsule. |
| **Components** | `timer_line_explainer.html`, `reward_feature_explainer.html` |

### F-082 — Out-Profile Creator Chip
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (78%) |
| **Invention** | INV-039 |
| **Description** | Bottom-left floating creator identity; tap for context; Hold Love monetized connection. |
| **Components** | `OutProfileChip.tsx`, `outProfileEngine.ts` |

### F-083 — Gesture Vocabulary
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (75%) |
| **Invention** | INV-027 |
| **Description** | Tap=Like, Double=Save, Triple=Boost(vCoin), Hold=Love/Offer, Swipe=Share. Each gated by POP session. |
| **Components** | `USER_GESTURE_BUTTONS.md`, `MediaActionRail.tsx` |

### F-084 — Pending-First Wallet UX
| Field | Value |
|-------|-------|
| **Status** | SPECIFIED (72%) |
| **Invention** | INV-028 |
| **Description** | Pending tab as first-class state; expandable step-by-step verification timeline per reward. |
| **Components** | `wallet_pending_tab.html`, `PendingRewardExplainer` |

---

## Identity & Module Features

### F-090 — iAM Identity Layer
| Field | Value |
|-------|-------|
| **Status** | ARCHITECTED (25%) |
| **Invention** | INV-040 |
| **Description** | Aspirational/future-self identity OS: Emotional Vault, Future Call, Routes, Identity Score feeding Trust. |
| **Components** | `MASTER_BRAIN/ENTITIES/iAM.md` |
| **V1 scope** | Emotional Vault + Routes + Future Call with simulation disclosure |

### F-091 — i* Module Surface System (14 modules)
| Field | Value |
|-------|-------|
| **Status** | ARCHITECTED (20%) |
| **Invention** | INV-045 |
| **Description** | 14 capability domains as first-class platform surfaces, each with economy binding. |
| **Modules** | iSEE, iMAKE, iGO, iHEAR, iLEARN, iMAP, iOWN, iSAVE, iDO, iEARN, iASK, iGET, iAM, iOmega |
| **Architecture** | Module registry → capability API → economy binding → trust feed → route integration |

### F-092 — iVatar Avatar Embodiment
| Field | Value |
|-------|-------|
| **Status** | ARCHITECTED (15%) |
| **Invention** | INV-042 |
| **Description** | User avatar embodiment layer: biometric-driven expression, attention-verified presence, creator/viewer modes. Distinct from Elo (companion) and In-Profile (account). |
| **Components** | `MASTER_BRAIN/ENTITIES/iVatar.md` (if exists), conversation archives |
| **Architecture** | Avatar mesh → expression driver (shared with Elo engine) → POP-gated interactions → marketplace listing |

### F-093 — Evidence Vault
| Field | Value |
|-------|-------|
| **Status** | SPECIFIED (40%) |
| **Invention** | INV-034 |
| **Description** | Consent-scoped private storage; admin legal custody vault; zero-knowledge target. |
| **Components** | `consentVault.ts`, migrations 204-209 |

### F-094 — Interaction Abuse Controls
| Field | Value |
|-------|-------|
| **Status** | SHIPPED (82%) |
| **Invention** | INV-035 |
| **Description** | Nonce dedup, 2x overrun ratio cap, action cooldowns, per-user+IP rate limits, 24h idempotency. |
| **Components** | `track-interaction`, `_shared/rateLimit.ts` |

---

## Feature Count Summary

| Status | Count |
|--------|-------|
| SHIPPED (testable today) | 28 |
| SPECIFIED (prototype + partial code) | 18 |
| ARCHITECTED (full system design) | 8 |
| **Total features registered** | **54** |

---

*Each feature maps to one or more invention disclosures in `INVENTION_DISCLOSURES/`. Cross-reference via Invention ID.*
