# Figure Index — [ i ] Project IP Package

**Index ID:** IP-FIG-2026-001  
**Date:** 2026-06-15  
**Status:** Placeholders only — no images embedded in package (add at filing time)

---

## Purpose

This index maps every recommended patent figure to its source file. When filing via AI platforms, capture screenshots or export diagrams and attach as FIG. 1, FIG. 2, etc.

**Recommended format:** PNG or PDF, 300 DPI minimum, labeled with figure number and brief caption.

---

## Family 01 — POP Core

| Fig ID | Caption | Source | Type |
|--------|---------|--------|------|
| F-001 | System architecture: device sensing → proof packet → server scoring → settlement | `SYSTEM_DIAGRAMS/README.md` POP pipeline | Diagram |
| F-002 | Proof Packet v0 JSON structure (derived metrics only) | `integrations/pop-core/fixtures/PP-000001.json` | Schema screenshot |
| F-003 | POPS six-layer scoring dimensions | `docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` | Diagram |
| F-004 | VSL confidence band state machine (POOR→STRONG) | `docs/technical/VERIFICATION_STABILITY_LAYER_V1.md` | Flowchart |
| F-005 | Delayed settlement timeline (pending → approved/rejected) | `04_wallet_payments/wallet_pending_tab.html` | UI screenshot |
| F-006 | Trust tier settlement delay comparison (t0/t1/t2) | `docs/POP_TRUST_TIERS_V2.md` | Table screenshot |
| F-007 | Privacy boundary: what is emitted vs. never transmitted | `integrations/eye-tracking/flutter-runtime/POP_PRIVACY_BOUNDARIES.md` | Diagram |
| F-008 | POP patent family dependency tree (P1-P8) | `docs/legal/POP_PATENT_FAMILY.md` | Diagram |

---

## Family 02 — Attention Verification

| Fig ID | Caption | Source | Type |
|--------|---------|--------|------|
| F-020 | Multimodal attention scoring weight fusion (face/eyes/gaze/pose) | `app/src/lib/attentionScoring.ts` | Code + diagram |
| F-021 | Gaze calibration: affine fit + polynomial residual correction | `app/src/lib/visionCalibration/calibrationFit.ts` | Diagram |
| F-022 | Y-plane luminance transport path (native→Dart, no JPEG) | `y_plane_frame_codec.dart` | Architecture diagram |
| F-023 | Signal stale policy: frame gap → state reset | `signal_stale_policy.dart` | Flowchart |
| F-024 | Replay harness golden milestone output | `pop_replay_driver.dart` + fixture output | Screenshot |

---

## Family 03 — Intent OS

| Fig ID | Caption | Source | Type |
|--------|---------|--------|------|
| F-030 | Ordered safety gate chain (7 gates) | `SYSTEM_DIAGRAMS/README.md` Intent OS diagram | Diagram |
| F-031 | Governance kernel threshold parameters | `governance_kernel.dart` | Code excerpt |
| F-032 | Multimodal command: voice rule + gaze target fusion | `multimodal_command_engine.dart` | Flowchart |
| F-033 | Digital twin learning module map (19 files) | `core/intent_os/learning/` directory | Architecture diagram |
| F-034 | Blink Remote lite panel with combo builder | `VisionBlinkRemoteLite` in app | UI screenshot |

---

## Family 04 — Elo AI

| Fig ID | Caption | Source | Type |
|--------|---------|--------|------|
| F-040 | Elo runtime pipeline: Doctrine → Personalization → Compose → Post-process | `eloRuntimeEngine.ts` | Flowchart |
| F-041 | Doctrine blocked phrase categories | `eloDoctrine.ts` | Table |
| F-042 | Expression engine: biometric inputs → expression states | `expressionEngine.ts` | Diagram |
| F-043 | Elo presence membrane with speech energy halo | `EloFaceMembrane.tsx` in app | UI screenshot |

---

## Family 05 — Wallet & Settlement

| Fig ID | Caption | Source | Type |
|--------|---------|--------|------|
| F-050 | Append-only ledger: value lots → balance projection | `wallet_ledger_engine.dart` | Diagram |
| F-051 | Two-step reward: validate-attention → issue-reward | `validate-attention` + `issue-reward` edges | Sequence diagram |
| F-052 | Interaction abuse control stack | `track-interaction/index.ts` | Flowchart |

---

## Family 06 — Economy UX

| Fig ID | Caption | Source | Type |
|--------|---------|--------|------|
| F-060 | Fibonacci ramp curves (gentle/standard/aggressive) | `gestureButtons/ramp.ts` | Chart |
| F-061 | Gesture button builder sheet | `GestureButtonBuilderSheet.tsx` | UI screenshot |
| F-062 | Gesture vocabulary map (tap/double/triple/hold/swipe) | `USER_GESTURE_BUTTONS.md` | Table |
| F-063 | Pending wallet with expandable step timeline | `wallet_pending_tab.html` | UI screenshot |
| F-064 | Wheel mechanic: scroll direction → coin type | `FEATURE_REGISTRY.md` F-054 | Diagram |

---

## Family 07 — Marketplace

| Fig ID | Caption | Source | Type |
|--------|---------|--------|------|
| F-070 | Geo check-in: Haversine verification + streak ladder | `verify-checkin/index.ts` | Flowchart |
| F-071 | Merchant checkout funnel (5 steps) | `merchant-checkout-*` edges | Sequence diagram |
| F-072 | Feed personalization scoring (80-item pool) | `get-personalized-feed` | Diagram |
| F-073 | Platform Connect hub (Spotify/YouTube overlay) | `iapp_connect_platforms.html` | UI screenshot |
| F-074 | Multi-stop promo route builder | `ImmersiveRouteBuilderSheet.tsx` | UI screenshot |

---

## Family 08 — Creator Tools

| Fig ID | Caption | Source | Type |
|--------|---------|--------|------|
| F-080 | Studio with POP gate template binding | preservation `studio/` screens | UI screenshot |
| F-081 | Campaign builder with live phone preview | `campaign_builder_owner.html` | UI screenshot |

---

## Family 09 — Immersive UI (Design Patents)

| Fig ID | Caption | Source | Type |
|--------|---------|--------|------|
| F-090 | Glass immersive feed shell — full view | `iapp_immersive_feed.html` | **Design patent figure** |
| F-091 | Timer line + coin pill top chrome | `timer_line_explainer.html` | **Design patent figure** |
| F-092 | Out-Profile creator chip (bottom-left) | `out_profile_explainer.html` | **Design patent figure** |
| F-093 | 5-tab white bottom dock | `ImmersiveBottomNav` in app | **Design patent figure** |

---

## Family 10 — Modules & Identity

| Fig ID | Caption | Source | Type |
|--------|---------|--------|------|
| F-100 | Alphabet currency 26+ω taxonomy (7 tiers) | `alphabet-currency.html` | UI screenshot |
| F-101 | Three-loops framework diagram | `iapp_three_loops.html` | Diagram |
| F-102 | iAM identity dashboard concept | `MASTER_BRAIN/ENTITIES/iAM.md` | Wireframe |
| F-103 | 14 i* module surface map | `FEATURE_REGISTRY.md` F-091 | Architecture diagram |
| F-104 | iVatar avatar embodiment pipeline | `INVENTION_DISCLOSURES/INVENTION_042.md` | Diagram |
| F-105 | Evidence vault consent scope model | `consentVault.ts` | Flowchart |

---

## Capture Instructions

1. Open source file in browser or IDE
2. Screenshot at 390×844 (iPhone viewport) for UI figures
3. Export architecture diagrams from `SYSTEM_DIAGRAMS/` as PNG
4. Label each file: `FIG_[ID]_[short-name].png`
5. Store in `IP_PACKAGE/FIGURES/` (create folder at filing time)
6. Reference figure numbers in provisional specification text

---

*Total figures indexed: 45. Add images when filing — not required for package completeness.*
