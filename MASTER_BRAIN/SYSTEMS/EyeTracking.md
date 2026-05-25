# Eye Tracking System

**Classification:** Canonical candidate (mobile signals) · One channel inside POP  
**Confidence:** High (flutter-runtime promoted)  
**Supersedes detail in:** `ATTENTION_SYSTEM/VERIFICATION_AND_VISION.md`

---

## One-sentence definition

**Eye tracking** is the **native gaze signal channel** for attention qualification on mobile — optional, not mandatory for all rewards, and **never the whole verification story**.

---

## Position in stack

```
POP (multimodal presence)
  └── Eye Tracking (visual/perception channel)
        └── Gaze → VSL → Proof Packet samples
```

From rank 108 (Presence Layer): *"Eye-tracking is only one sensor channel."*

---

## Canonical implementation

| Component | Path | Status |
|-----------|------|--------|
| Flutter runtime | `integrations/eye-tracking/flutter-runtime/` | **Promoted** — Android smoke PASS |
| Intent OS / T-series gaze | Same | Active development |
| VSL | `lib/verification/verification_stability_layer.dart` | v1 |
| Adaptive calibration | `lib/calibration/` | v1 |
| Y-plane transport | Android experiment | Experimental |
| Proof Packet types | `lib/proof/proof_packet_v0.dart` | Schema |
| Seal Proof | `proof_packet_emitter.dart` | Local seal + bus event |

---

## Web stack (separate lineage)

| Component | Status |
|-----------|--------|
| vision-unified-pipeline @ 22cabd3 | Canonical **candidate** for web |
| useVisionEngine + calibration v2 | Implemented on branch |
| attention_mediapipe (v2 archive) | Obsolete for promotion |

**Do not interchange** web calibration profiles with Dart/native without mapping doc.

---

## Investor demo surfaces

| Surface | Role |
|---------|------|
| `app/WatchVerifyScreen` | Mock 5-gate narrative |
| `app/ProofLayerScreen` | Explains flutter-runtime promotion |
| Flutter debug HUD | Real device testing |
| HTML prototypes | Design archaeology |

---

## Key chats (Desktop extraction)

| Rank | Title |
|------|-------|
| 3 | Camera-based gaze tracking with attention scoring |
| 16 | Eye-tracking attention interface |
| 17 | Eye-tracking system audit |
| 31 | Eye Tracking Explained |
| 39 | Eye-Tracking and Facial Control |
| 70 | i App Development Roadmap |
| 82 | MVP Demo Development Plan |
| 108 | Presence Layer (POP superset) |

---

## Non-goals

- Surveillance framing — constitution says **qualification, not surveillance**
- Gaze-only reward — requires POP fusion + session integrity
- Demo camera on all paths — selective verification only
