# POP / POPS

**Classification:** Canonical candidate (architecture) · Experimental (full wiring)  
**Confidence:** High (design) · Medium (runtime)  
**Also known as:** Presence Layer, Proof of Presence System, "the senses of Elo"

---

## One-sentence definition

**POP is the multimodal sensing and validation layer** that turns human-device signals into confidence scores, session integrity, and reward eligibility — not "eye tracking alone."

---

## Core meaning (recovered)

From chat **Presence Layer Development** (rank 108) and technical docs:

> The phone becomes a **presence-sensing surface**. Human signal crosses the screen → phone captures multimodal traces → system compares against behavioral patterns → confidence scores → session meaning updated → reward / trust / flow decisions.

**POP is not:**
- Eye open = engaged / eye closed = not engaged
- Single-signal surveillance
- Client-trusted reward issuance

**POP is:**
- Sensor fusion (visual, motion, touch, audio context, session integrity)
- Probabilistic qualification — *attention probability*, not certainty
- Server-gated reward eligibility

---

## Relationship to Elo

From owner ChatGPT threads (cross-chat memory discussion):

```
Elo (entity — companion / continuity / understanding)
  └── POP / POPS (senses — perception, validation, proof)
        └── Attention sessions → Proof packets → Wallet
```

POP does not replace Elo. POP **feeds** Elo with verified signal about what the user actually did and whether it qualified.

---

## Six-layer model (authoritative design)

Per `docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`:

| Layer | Question |
|-------|----------|
| Proof of Presence | Was a plausible human present? |
| Proof of Participation | Did required interaction occur? |
| Proof of Perception | Did attention align with content? |
| Proof of Signal | Are device/session signals consistent? |
| Proof of Session Integrity | Was the session continuous? |
| Proof of Reward Eligibility | Does session qualify under campaign rules? |

---

## Signal channels (Presence Layer chat)

| Channel | Examples |
|---------|----------|
| Visual presence | Face, head pose, gaze (optional), blink |
| Motion | Device movement, stability |
| Touch / interaction | Scroll, tap, completion |
| Temporal | Dwell, pauses, session duration |
| Context | Geofence (iGO), campaign rules |
| Integrity | Anti-spoof, impossible behavior |

Eye tracking is **one channel inside POP**, not the whole system.

---

## Implementation map

| Layer | Location | Status |
|-------|----------|--------|
| Design doc | `POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` | Canonical candidate |
| Backend scoring | IVAULT snapshot `services/api/src/pops/` | Reference — not promoted |
| Flutter VSL | `flutter-runtime/lib/verification/` | Implemented v1 |
| Proof Packet v0 | `proof_packet_v0.dart` + Seal Proof | Schema + local seal |
| Web path | `validate-attention` edge fn | Promo path — not full POPS |
| React demo | `app/` 5-gate overlay | **Mock narrative** |

---

## Critical invariant (CR-01)

**No reward without validated attention session.** Seal Proof throws if no active session. Client must not bypass server gate.

Status: **Resolved in app + sparkle-archive** (2026-05-25) — verify end-to-end when POPS wired.

---

## Evidence sources

| Source | Rank | ID |
|--------|------|-----|
| Presence Layer Development | 108 | `69ee44a7` |
| Eye-Tracking and Facial Control | 39 | `699979ee` |
| Eye-tracking system audit | 17 | Claude `a26669ba` |
| P0 synthesis batches 01–04 | — | CR-01 flagged |
| Desktop extraction | — | `chatGPT/0108_presence_layer_development_69ee44a7.md` |

---

## Open questions

- User-facing name: **POP**, **Presence**, or hidden infrastructure only?
- Does POP brand appear in investor demo ProofLayerScreen?
- Full packet ingestion into POPS backend — promotion timeline?

See [`../RELATIONSHIPS/Elo_POP.md`](../RELATIONSHIPS/Elo_POP.md), [`../SYSTEMS/ProofAndSeal.md`](../SYSTEMS/ProofAndSeal.md).
