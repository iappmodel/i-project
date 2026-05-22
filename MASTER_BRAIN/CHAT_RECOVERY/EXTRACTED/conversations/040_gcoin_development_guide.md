# P0-040: gCoin Development Guide (OpenAI)

**Extraction batch:** P0 Batch 04  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | OpenAI |
| Conversation ID | `69eda334-7698-83ea-a910-d93850d33f8b` |
| Title | gCoin Development Guide |
| Date created | 2026-04-26 |
| Date updated | 2026-05-01 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CHATGPT/gpt chats/conversations-004.json#69eda334-7698-83ea-a910-d93850d33f8b` |
| Messages | 14 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 77 | P0 | Economy, UX (Go flows), Creator Economy |

---

## 3. Project-Specific Summary

Two-phase thread: (1) Owner requests **LETTER G = Growth** — verified personal improvement over time, not activity noise; (2) Owner notes **"Go coins"** development elsewhere and asks to reconcile **Go + Growth** under gCoin.

**Resolution: gCoin = Go/Growth** — dual-layer coin:
- **gCoin-Go:** immediate verified forward action (I'm Going, GPS check-in, challenge start, location attendance) — low immediate value, creates pending/eligibility/proof
- **gCoin-Growth:** verified improvement delta over baseline — higher value, long-term identity asset

Prior currency file had **G = Governance** — thread explicitly rejects standalone governance coin (governance = permissions from Trust/U Value).

Cites live prototype patterns: Mario's Pizza local Go flow, Blue Bottle GPS nearby offer, pending release after verified arrival.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-040-01 | **gCoin = Go/Growth** (not Growth-only, not Go-only) | High |
| D-040-02 | Go layer alone pays **low value** — creates proof/eligibility/pending | High |
| D-040-03 | Growth layer requires **verified improvement delta** baseline→later | High |
| D-040-04 | **G ≠ Governance coin** — governance derived from Trust/U Value/age | High |
| D-040-05 | gCoin rewards **delta, not noise** — no fake streaks/volume | High |
| D-040-06 | Integrates Iearn, practice sessions, achievement systems | Medium |
| D-040-07 | Compatible with A, E, I, O, U prior coins | Medium |

---

## 5. Extracted Feature/System Concepts

### gCoin-Go actions

Tap "I'm Going", accept challenge, start practice, attend class, visit business, GPS check-in, arrive at location, move intention→execution.

### gCoin-Growth signals

Learning progression, skill improvement, practice discipline, improved accuracy/retention/quality, long-term trajectory — requires verified baseline comparison.

### Prototype evidence (filecite)

- Local offer flow: watch promo → I'm Going → simulate arrival → pending reward
- Wallet dashboard nearby GPS pattern ("Blue Bottle nearby — 5.00 icoins")

---

## 6. Extracted UX/Design Ideas

- "I'm Going" CTA on local/offer cards
- Pending state UX before GPS/arrival verification releases reward
- Growth visualized as progression arcs, not streak counters

---

## 7. Extracted Technical Architecture Ideas

- Events: `gcoin_go_started`, `gcoin_go_verified`, `gcoin_growth_detected`
- Baseline snapshots for improvement comparison
- GPS verification integration with wCoin task layer (034)
- Backend tables for practice sessions, location proofs, growth deltas

---

## 8. Extracted Economy/Currency Ideas

| Layer | Economic role |
|-------|-----------------|
| gCoin-Go | Action proof, pending rewards, eligibility |
| gCoin-Growth | Long-term identity asset, scholarships/grants/boosts future |
| vs Governance | Eliminated as separate coin |

Not paid for: passive watching, attendance-only, fake streaks, pay-to-progress.

---

## 9. Extracted Investor/Demo Ideas

- Local business Go flow as physical-world attention marketplace bridge
- "Forward movement that becomes growth" narrative

---

## 10. Conflicts with Current Masterbrain

| Topic | This thread | SoT | Verdict |
|-------|-------------|-----|---------|
| gCoin in MVP | Full G spec | **g not in MVP 5** — wait, SoT has no gCoin | **Post-MVP / A–Z** |
| oCoin | O = Origin in SoT | G thread refs O among prior coins | **O aligns SoT** |
| Governance | Rejected as G coin | SoT trust/governance separate | **Align rejection** |

**Note:** SoT MVP coins are a/i/v/e/o — **gCoin is expansion letter**, distinct from oCoin (Origin).

---

## 11. Conflicts with P0 Batches 1–3

| Topic | Prior | This thread |
|-------|-------|-------------|
| Alphabet 028 | G listed — check prior G=Governance | **G semantics changed to Go/Growth** |
| wCoin 034 | Work = task completion | gCoin-Go overlaps GPS/local — **coordinate layers** |
| Streak bar 012 | Removed | gCoin rejects fake streaks — **align** |
| Demos 024/030 | Local map in 035 roadmap | Go flow in prototype — **complements** |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B04-35 | gCoin = Go/Growth dual-layer model | B — post-MVP |
| CC-B04-36 | G ≠ Governance (permissions from Trust) | B |
| CC-B04-37 | I'm Going + GPS check-in → pending → release pattern | B |
| CC-B04-38 | Growth = verified delta not activity volume | B |
| CC-B04-39 | gCoin-Go low immediate value / proof-only rule | B |

---

## 13. Preserve-Only Notes

- Original Growth-only spec (msg 2) superseded by Go/Growth merge (msg 6)
- Mario's Pizza / Blue Bottle as prototype placeholders

---

## 14. Obsolete Notes

- **G = Governance** assignment in prior currency file — explicitly deprecated
- gCoin = Growth-only if owner accepts Go/Growth merge

---

## 15. Follow-Up Extraction Targets

- Read prior "Go coins" chat development referenced by owner
- Map gCoin-Go to existing GPS offer components in eye-earn-sparkle
- Update alphabet index (028) G definition on owner lock
- Coordinate gCoin/wCoin for local task completion
