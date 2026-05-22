# P0-023: aCoin Specification (OpenAI)

**Extraction batch:** P0 Batch 03  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | OpenAI |
| Conversation ID | `69eda026-4a58-83ea-a523-b6f592ae7329` |
| Title | aCoin Specification |
| Date created | 2026-04-26 |
| Date updated | 2026-04-26 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CHATGPT/gpt chats/conversations-004.json#69eda026-4a58-83ea-a523-b6f592ae7329` |
| Messages | 29 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 105 | P0 | Economy, Attention, Trust, Wallet |

---

## 3. Project-Specific Summary

Owner requests **LETTER A only** from the Alphabet Currency System. OpenAI delivers a **production-ready aCoin canonical spec** anchored to existing wallet, Watch→Verify→Earn, and alphabet docs.

**aCoin = verified human attention quality** — not likes, views, or watch time alone. Earned through the flagship attention loop with verification gates. Default conversion path: **aCoins → rCoins → iCoins** (not direct a→i).

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-023-01 | **A = Attention**; aCoin = raw proof-of-attention currency | High |
| D-023-02 | Integer units at launch; optional micro_acoin later | High |
| D-023-03 | Default pipeline: **aCoins → rCoins → iCoins** (keep rCoins as control layer) | High |
| D-023-04 | Conversion: **100 aCoins → 100 rCoins gross → 100 rCoins = 1 iCoin** (with trust/quality multipliers and fees) | High |
| D-023-05 | `acoin_to_rcoin_rate` default **1:1**; `rcoin_to_icoin_rate` default **100:1** | High |
| D-023-06 | aCoins are **not directly withdrawable** — must pass conversion pipeline | High |
| D-023-07 | Rollout phases: Demo → Closed beta → Public MVP → Full economy | High |

---

## 5. Extracted Feature/System Concepts

### What aCoin measures (6 dimensions)

1. Presence (foreground, not backgrounded)
2. Viewing quality (pixel visibility, progress thresholds)
3. Focus (behavioral + optional eye/face verification)
4. Honest engagement (anti-bot patterns)
5. Attention depth (time to understand)
6. Session integrity (one user/device/session/impression)

### Earning paths

- Sponsored watch, creator campaigns, brand offers, learning modules, earn marketplace
- Passive + active attention (dwell, scroll velocity per cited alphabet docs)
- Daily soft caps; tier multipliers

### Ledger events

- `acoin_earned`, `acoin_converted_to_rcoin`, `rcoin_converted_to_icoin`
- Fraud holds; pending states before conversion

---

## 6. Extracted UX/Design Ideas

- User-facing label always **aCoins**; schema code **ACOIN**
- Wallet shows aCoin balance separate from spendable iCoins

---

## 7. Extracted Technical Architecture Ideas

- Supabase ledger enums; Edge Function mutations
- Attention verification engine integration (filecite to project docs)
- Rate tables governed quarterly; tied to ad revenue (cited)

---

## 8. Extracted Economy/Currency Ideas

```
Watch → Verify → Earn aCoins → (trust/quality) → rCoins → iCoins
```

| Parameter | Default |
|-----------|---------|
| aCoin → rCoin | 1:1 |
| rCoin → iCoin | 100:1 |
| Conversion fee | ~5% (example in spec) |
| Trust multiplier | up to 1.15× (example) |

**aCoin is foundation input** — aligns with SoT "attention currency — foundation."

---

## 9. Extracted Investor/Demo Ideas

- Phase 0 demo: show aCoin earning without full conversion backend
- Example math block suitable for investor appendix

---

## 10. Conflicts with Current Masterbrain

| Topic | Spec | SoT | Verdict |
|-------|------|-----|---------|
| aCoin role | Attention foundation | aCoins = attention foundation | **Strong align** |
| Conversion | Requires rCoins hub | SoT silent on rCoins | **Gap in SoT** |
| iCoin output | Via rCoin pipeline | iCoins = direct cash-value | **Pipeline adds layer** |
| vCoin | Not primary in aCoin spec | vCoins = utility | No direct conflict |

---

## 11. Conflicts with P0 Batch 1 and 2

| Topic | Prior | This spec |
|-------|-------|-----------|
| rcoins hub | Conv 007: clearing pool → icoins/mcoins/ucoins | rCoins → iCoins 100:1 only in output table | **Partial align** — 007 adds mcoins/ucoins outputs |
| Vicoin/Icoin chat | Icoins from sponsored only | iCoins via rCoin conversion from all behavior coins | **Broader iCoin mint path** |
| vCoin guide (020) | a→i→v pipeline | a→r→i here; vCoin separate | **Pipeline fork** |
| Alphabet A–Z (015) | Alpha registry per letter | aCoin canonical spec | **Compatible** if A matches |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B03-01 | aCoin = verified attention quality (6 dimensions) | A |
| CC-B03-02 | aCoins → rCoins → iCoins default pipeline | B — needs rCoin role lock |
| CC-B03-03 | 100:1 rCoin→iCoin default rate | C — owner lock |
| CC-B03-04 | aCoins not directly withdrawable | A |

---

## 13. Preserve-Only Notes

- HTML wallet mock CSS in thread — UI reference
- filecite references to unverified upload docs

---

## 14. Obsolete Notes

- Direct aCoin → iCoin shortcut (spec recommends against)

---

## 15. Follow-Up Extraction Targets

- Cross-read `i-app-economy-rules.md` for aCoin rates
- Reconcile rCoin role with conv 028 (Reputation vs hub)
