# Attention Verification System

**Classification:** Mixed — multiple parallel stacks  
**Confidence:** Medium

## Canonical Intent

Qualify attention via dwell, interaction quality, navigation, completion, device signals, optional eye tracking, behavioral patterns. Quality over raw views.

## Native Stack (Canonical for Mobile Signals)

| Component | Location | Status |
|-----------|----------|--------|
| Flutter runtime | `integrations/eye-tracking/flutter-runtime/` | **Canonical** — Intent OS, T-series gaze, VSL |
| VisionProcessor.kt | android native | Anti-spoof heuristics, MediaPipe |
| Proof Packet v0 types | `proof_packet_v0.dart` (audit reference) | Schema target — **no verified emission** |

## Web Stack (Canonical for Browser/Capacitor)

| Component | Location | Status |
|-----------|----------|--------|
| vision-unified-pipeline @ 22cabd3 | eye-earn-sparkle-archive branch | **Canonical candidate** for web promotion |
| useVisionEngine + calibration v2 | Same branch | Implemented |
| validate-attention edge fn | Supabase (audit reference) | **Authoritative for promo scoring per audits**; not full POPS authority |
| v2 archive unified-vision | eye-earn-sparkle-v2 | **Obsolete** for web promotion (historical) |
| attention_mediapipe plugin | v2 archive only | **Experimental** parallel native path |

## Verification Stability Layer (VSL)

Operator confidence bands in promoted flutter-runtime. Not on IVAULT checkpoint branches. Aligns with POPS narratively but not payout authority.

## Non-Unified Calibration

Web `VisionCalibrationProfile` v2 (TS) ≠ Dart adaptive calibration ≠ native EAR baselines. **Do not interchange** without field mapping doc.

**Sources:** VISION_UNIFIED_PIPELINE audit; EYE_EARN_SPARKLE_V2 audit; PRE_COMPOSER audit; constitution
