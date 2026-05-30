# Elo

**Classification:** **Accepted** — owner confirmed 2026-05-25 (ADR-013)  
**Status:** Canonical entity — ELO UI mock is implementation surface, not separate product  
**Updated:** 2026-05-27 (presence layer wired)

---

## One-sentence definition (merged candidate)

**Elo** is the **persistent companion entity** in [ i ] — continuity, memory, personalized guidance — whose **senses** are POP/POPS and whose **economic footprint** flows through Wallet and the three product loops.

---

## Critical distinction — entity vs implementation

| Layer | Meaning |
|-------|---------|
| **Elo (entity)** | Canonical companion — philosophy, role, POP relationship |
| **ELO (UI mock)** | Stage 1 shell in i-initial-structures — **same product**, not a fork |

**Owner decision ENT-01 (2026-05-25):** Entity and mock are one product line.

**NOT "LO":** Chat AI incorrectly inferred "LO = intelligence layer" when Elo context was missing.

---

## Relationship to POP

> **POP is the senses of Elo.**

```
Elo (companion / continuity / understanding)
  └── POP / POPS (perception — multimodal validation)
        └── Sessions → Proof → Wallet
```

See [`../RELATIONSHIPS/Elo_POP.md`](../RELATIONSHIPS/Elo_POP.md)

---

## Product role (from rank 143 chat — ELO Personal Intelligence Companion)

| Capability | Description |
|------------|-------------|
| Identity memory | Knows user context across sessions |
| Guidance | Suggests actions, personalized messages |
| Orchestration | Can invoke platform capabilities (with permissions) |
| 24/7 companion | "Virtual friend" — not a mascot |
| Safety rails | Permissions, emotional boundaries, no manipulation |

**Mythic framing** (rank 144 — Elo as Personal Myth): narrative/brand layer — separate from technical spec.

---

## Presence layer (2026-05-27)

ELO on immersive surfaces is a **transparent face membrane** — not the legacy orb mock.

| Concept | Implementation |
|---------|----------------|
| Visual | Procedural glass contour membrane — `EloFaceMembrane` SVG + `useEloFaceMirror` |
| Mirroring | POP vision landmarks + head pose when camera active |
| Personality stack | Primary/secondary presets, relationship + operating modes |
| Rooms | Philosophy, Focus, Creator, Sleep, Grief, Writing, Study |
| Onboarding | “Who do you want beside you?” |
| Panel | Glass sheet: chat, insights, stack, rooms, marketplace scaffold |

See [`../UX/ELO_PRESENCE_LAYER.md`](../UX/ELO_PRESENCE_LAYER.md).

---

## Evidence map

| Source | Rank | Path |
|--------|------|------|
| ELO Personal Intelligence Companion | 143 | [`CHAT_RECOVERY/EXTRACTED/conversations/143_elo_personal_intelligence_companion.md`](../CHAT_RECOVERY/EXTRACTED/conversations/143_elo_personal_intelligence_companion.md) |
| Elo as Personal Myth | 144 | Desktop `chatGPT/0144_*` |
| Cross-chat Elo↔POP thread | — | User pasted ChatGPT history |
| ELO Stage 1 shell | — | `PROTOTYPES/INDEX.md`, i-initial-structures |
| Brand assets | — | `~/Desktop/IVAULT/LOGO/ELO.*` |
| Remote Control Feature Dev | 129 | ELO/iVatar cluster |

---

## Connections

| System/Entity | Relationship |
|---------------|--------------|
| POP | Senses / validation input |
| iAM | Separate entity (ENT-05) — identity OS; may share memory APIs later |
| Wallet | Economic state Elo may explain to user |
| Studio | Creation assistant persona |
| Remote Control | Device extension of Elo presence |
| MASTER_BRAIN | Knowledge continuity Elo was meant to provide in-product |

---

## Gaps & owner decisions

| ID | Question | Status |
|----|----------|--------|
| ENT-01 | Entity vs mock | **Resolved** — same product |
| ENT-05 | vs iAM | **Resolved** — separate |
| ENT-06 | Loop 1 investor demo appearance | Open — Elo UI post Loop 1 spine |

**Implementation:** Extend ELO mock toward entity spec; do not fork a second "Elo product."
