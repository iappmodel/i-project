# Relationship: Modules ↔ Currency

**Classification:** Candidate — ADR-001 working default for MVP  
**Confidence:** Medium — 26+ω deferred

---

## MVP currencies (constitution + ADR-001)

| Coin | Role | Primary modules |
|------|------|-----------------|
| **aCoins** | Verified attention | Loop 1, iGET, iGO (presence missions) |
| **iCoins** | Cash-value | Wallet, iGET, iPAY, iBUY, withdraw |
| **vCoins** | Utility boosts | Features, not withdrawable |
| **eCoins** | Engagement above attention | Social actions, completion |
| **oCoins** | External provenance | Import, bridge |

---

## Module ↔ coin touchpoints

| Module | Earns | Spends | Holds |
|--------|-------|--------|-------|
| **iGET** | — | — | Claims all qualified types |
| **iGO** | a, i, g | v | Mission escrow |
| **iHEAR** | a, tips | i | — |
| **iAM** | — | premium? | g, uValue |
| **iTIP** | — | i | Creator receive |
| **iBUY** | — | i | — |
| **iSAVE** | — | — | i, escrow |

---

## Pipeline (chat 023, 028 — candidate)

```
aCoins (attention verified)
  → rCoins (clearing — CONFLICT: triple definition)
  → iCoins (withdrawable)
```

**Blocked:** rCoin semantics — owner decision CR-02–06.

---

## Post-MVP alphabet (ranks 20–63)

Full a–z coin specs exist in ChatGPT extractions — each letter encodes a **behavioral dimension** (trust, belonging, mastery, growth…).

**Not Loop 1 scope** per ADR-001.

| Examples | Chat rank |
|----------|-----------|
| tCoin Trust | 46 |
| bCoin Belonging | 49 |
| gCoin Growth/Go | 40, 112 |
| wCoin Work | 34 |

---

## Vicoin / Icoin fork (archive UI)

| Archive name | Maps to (ADR-001) |
|--------------|-------------------|
| Vicoin | vCoins (utility) or legacy dual-card |
| Icoin | iCoins (cash-value) |

Presentation-layer mapping only until archive merge.

---

## iGET prevents confusion

Explicit states: pending · verified · claimable · released · paid

Without iGET, Wallet alone blurs qualification vs possession.

**Evidence:** ranks 73–74, 23, 28, 29; `DECISIONS/CURRENCY_NAMING_ADR.md`
