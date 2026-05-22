# P0-028: Alphabet Currency System (OpenAI)

**Extraction batch:** P0 Batch 03  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | OpenAI |
| Conversation ID | `69ed9f55-b784-83ea-a89c-672fec5b8002` |
| Title | Alphabet Currency System |
| Date created | 2026-04-26 |
| Date updated | 2026-04-26 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CHATGPT/gpt chats/conversations-004.json#69ed9f55-b784-83ea-a89c-672fec5b8002` |
| Messages | 219 (~4.5M chars — mostly Cursor build prompts) |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 105 | P0 | Economy (master), Trust, Ledger, Backend, Dev workflow |

---

## 3. Project-Specific Summary

**Master A–Z currency architecture** for [ i ] — the largest economy thread in the archive. Contains:

1. **26-letter coin taxonomy** with semantic definitions
2. **Tier system** (Tier 1 core → Tier 4 specialized)
3. **Four engine architecture**: Trust Score, Conversion, Reward Issuance, Saga pipeline
4. **Supabase schema** migrations and Edge Function patterns
5. **26+ Cursor implementation prompts** (preserve as build history, not canon verbatim)

This thread is the **OpenAI-side source of truth** for full alphabet economy — conflicts with SoT 5-coin MVP and chat-era Vicoin/Icoin naming.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-028-01 | Full **A–Z alphabet** is the long-term economy model | High |
| D-028-02 | **Tier 1 core coins**: aCoin, iCoin, vCoin, eCoin, oCoin | High |
| D-028-03 | **aCoin = Attention**; **iCoin = Identity-linked value**; **vCoin = spendable platform value** | High |
| D-028-04 | **eCoin = Engagement**; **oCoin = Offers** | High |
| D-028-05 | **rCoin = Reputation** (behavior coin, Tier 3/4) | High |
| D-028-06 | Conversion engine governs all cross-coin transforms | High |
| D-028-07 | Trust Score engine modulates rates and eligibility | High |
| D-028-08 | Saga pipeline for atomic multi-step earn→convert→mint | High |
| D-028-09 | MVP can ship with Tier 1 only; expand letters post-launch | Medium |

---

## 5. Extracted Feature/System Concepts

### Tier 1 (MVP core — aligns with SoT count)

| Letter | Coin | Role |
|--------|------|------|
| A | aCoin | Verified attention |
| I | iCoin | Identity-linked economic value (withdrawable) |
| V | vCoin | Spendable platform value |
| E | eCoin | Engagement actions |
| O | oCoin | Offers / sponsored |

### Tier 2–4 (selected — full table in master doc)

| Letter | Coin | Role |
|--------|------|------|
| R | rCoin | **Reputation** |
| U | uCoin | User Value (long-term) |
| T | tCoin | Time / session integrity |
| S | sCoin | Social proof |
| … | … | 16+ additional letters defined |

### Engine architecture

```
Earn Event → Reward Issuance → [behavior coin mint]
                                    ↓
                            Conversion Engine ← Trust Score
                                    ↓
                            Target coin (i/v/e/o)
                                    ↓
                            Saga commit (ledger)
```

---

## 6. Extracted UX/Design Ideas

- Wallet groups coins by tier
- Tier 1 prominent; Tier 2+ in "advanced" section
- Conversion UI shows rates + trust multiplier

---

## 7. Extracted Technical Architecture Ideas

- Supabase tables: `coin_balances`, `conversion_rates`, `trust_scores`, `ledger_events`
- Edge Functions: `earn`, `convert`, `withdraw`
- Enum types per coin letter
- Saga pattern for rollback on partial failure
- RLS by user + trust tier

---

## 8. Extracted Economy/Currency Ideas

**Critical rCoin fork within OpenAI corpus itself:**

| Source | rCoin definition |
|--------|------------------|
| This thread (028) master index | **rCoin = Reputation** |
| Conv 023/025 letter specs | **rCoins = conversion hub** (100:1 → iCoin) |
| Batch 01 conv 007 | **rcoins = central clearing pool** |

**Critical i/v semantic fork vs chat era:**

| OpenAI (028) | Chat (batch 1–2) |
|--------------|------------------|
| iCoin = Identity-linked value | Icoins = cash-equivalent |
| vCoin = Spendable platform value | Vicoins = internal utility |

Roles are **inverted at letter level** — economic functions similar but **I↔V assignment swapped**.

---

## 9. Extracted Investor/Demo Ideas

- Tier 1 MVP story for investors (5 coins)
- Full A–Z as Phase 2/3 roadmap slide
- Engine architecture diagram for technical diligence

---

## 10. Conflicts with Current Masterbrain

| Topic | Thread | SoT | Verdict |
|-------|--------|-----|---------|
| Coin count | 26 letters | 5 MVP coins | **Scope fork** — 028 is superset |
| iCoin | Identity-linked | iCoins = cash-value | **Semantic partial align** |
| vCoin | Spendable platform | vCoins = utility | **Align on non-cash utility/spend** |
| rCoin | Reputation | Not in SoT | **SoT gap** |
| uCoin | User Value | Not in SoT | **Post-MVP** |

---

## 11. Conflicts with P0 Batch 1 and 2

| Topic | Prior | This thread |
|-------|-------|-------------|
| Alpha ledger (015) | Claude A–Z registry | OpenAI A–Z master — **cross-vendor alphabet** |
| Vicoin/Icoin (007, 013) | Chat naming | OpenAI letter semantics | **Primary naming conflict** |
| vCoin guide (020) | a→i→v pipeline | Conversion engine multi-path | **Pipeline model fork** |
| aCoin spec (023) | a→r→i pipeline | rCoin also = Reputation here | **rCoin triple definition** |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B03-16 | Tier 1 five-coin set (A/I/V/E/O) | A — aligns SoT letters |
| CC-B03-17 | Four-engine architecture (Trust/Conversion/Reward/Saga) | B |
| CC-B03-18 | OpenAI letter semantics (I=Identity, V=spendable) | A — **owner lock** |
| CC-B03-19 | rCoin = Reputation (028 index) | B — conflicts 023/025 hub |
| CC-B03-20 | MVP ships Tier 1; A–Z expands post-launch | B |

---

## 13. Preserve-Only Notes

- 26+ Cursor prompts — build history, not product canon
- Full Supabase migration SQL — verify against live schema
- Per-letter specs beyond A/I/U extracted in convs 023/025/026

---

## 14. Obsolete Notes

- Any letter definition superseded by per-letter specs (023–026)
- Direct behavior→iCoin shortcuts where pipeline spec says otherwise

---

## 15. Follow-Up Extraction Targets

- Extract remaining letters (B–Z) as separate P1 batch if needed
- Reconcile rCoin: Reputation vs hub vs clearing pool — **owner decision**
- Map 028 Supabase schema to repo migrations
