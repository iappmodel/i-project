# Module Alphabet (`i*` Modules)

**Classification:** Candidate — rich ChatGPT specs, **post-MVP** for most  
**Confidence:** Medium (definitions) · Low (implementation)  
**Scope note:** 26+ω currency taxonomy deferred per ADR-001; modules are **product surfaces**, not all MVP.

---

## What are `i*` modules?

Named **capability modules** in the [ i ] alphabet — each answers a distinct user job. Developed heavily in OpenAI chats ranks 73–154 (May 2026 module sprint).

**Pattern:** `i` + VERB = "I [verb] through this platform"

---

## Core modules (P0 extracted)

| Module | One-line role | Rank | Desktop chat |
|--------|---------------|------|--------------|
| **iAM** | Self/future identity OS | 100 | `0100_iam_*` |
| **iGET** | Claim & receive rewards | 73–74 | `0073–0074_iget_*` |
| **iHEAR** | Audio, music, voice, listening | 75 | `0075_ihear_*` |
| **iMAP** | Location / discovery map layer | 77 | `0077_imap_*` |
| **iOWN** | Ownership of assets | 78 | `0078_iown_*` |
| **iMAKE** | Creation / build | 90 | `0090_imake_*` |
| **iGO** | Movement / proof-of-action / geofence | 112, 126 | `0112_igo_*`, `0126_*` |
| **iBUY** | Marketplace purchase | 154 | `0154_ibuy_*` |
| **iTIP** | Creator tipping | 148 | `0148_itip_*` |

---

## iGO (expanded — rank 112)

> **iGO is the proof-of-action layer** where users discover places, go there, verify presence, earn, pay, tip, redeem, and build real-world credibility.

| Phase | Event |
|-------|-------|
| Discover | Local offers, missions, events |
| Decide | Reward, distance, proof requirements |
| Go | `IGO_INTENT_CREATED` |
| Verify | GPS, geofence, QR/NFC, POP presence |
| Reward | iCoins / aCoins / GO-specific coin |

**Not maps alone** — movement + verification + wallet.

**Related:** iACTION (external/community action) vs iGO (internal self-improvement) — rank 180 brainstorm.

---

## iGET (expanded — rank 73)

> **iGET is the claim and reward-receiving layer** — unlock, redeem, pick up value earned or qualified for.

Distinguishes: **pending vs verified vs claimable vs released vs paid** — prevents wallet confusion.

Connects: iEARN (qualify) → iGET (receive) → Wallet.

---

## iHEAR (expanded — rank 75)

Audio/music/voice/listening layer — discover, sponsored listening, tip artists, voice commands, audio identity.

---

## Module ↔ currency matrix (declared in chats)

| Module | Primary coins touched |
|--------|----------------------|
| iGET | a, i, v, g, r |
| iGO | a, i, g |
| iAM | g, uValue, Trust |
| iHEAR | tips, sponsored listen rewards |

Full 26-letter coin specs: ranks 20–63 (aCoin through zCoin) — see `ECONOMY/CURRENCY_ECOSYSTEM.md`.

---

## MVP boundary (constitution + ADR-001)

**In Loop 1 MVP:** Wallet, Watch/Verify/Earn surfaces — module names may appear in narrative only.

**Post-MVP:** Full module alphabet + 26+ω coins.

**Owner decision MOD-01:** Which modules appear in investor demo roadmap screen?

---

## iGO vs IGO folder on Desktop

`~/Desktop/IVAULT/IGO` — visual assets (15 files). Not the same as **iGO module** spec — related branding only.

---

## Cross-links

- Entity: [iAM](../ENTITIES/iAM.md)
- Systems: [Wallet](./Wallet.md), [CreatorEconomy](./CreatorEconomy.md)
- Relationships: [Modules_Currency.md](../RELATIONSHIPS/Modules_Currency.md)
