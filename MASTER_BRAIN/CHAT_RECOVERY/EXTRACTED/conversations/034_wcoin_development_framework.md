# P0-034: wCoin Development Framework (OpenAI)

**Extraction batch:** P0 Batch 04  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | OpenAI |
| Conversation ID | `69edab01-0480-83ea-b184-b4f362bab71b` |
| Title | wCoin Development Framework |
| Date created | 2026-04-26 |
| Date updated | 2026-04-26 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CHATGPT/gpt chats/conversations-004.json#69edab01-0480-83ea-b184-b4f362bab71b` |
| Messages | 6 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 85 | P0 | Economy, Creator Economy, Trust |

---

## 3. Project-Specific Summary

Owner requests **LETTER W only**. OpenAI defines **wCoin = Work** — verified useful **task completion**, not time spent or busy-work. Covers campaigns, gigs, missions, bounties, surveys, reviews, moderation, creator tasks, learning tasks, local/service work.

**Canonical rule:** wCoin earned only when defined task produces **verified value outcome** with proof. Integrates pending/available wallet logic, Trust Score, U Value, and existing Earn Marketplace patterns.

**Not in SoT MVP 5-coin set** — post-MVP / A–Z expansion coin.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-034-01 | **W = Work**; wCoin = verified task completion primitive | High |
| D-034-02 | Work ≠ time spent, effort claimed, or mechanical clicking | High |
| D-034-03 | Task must have: defined scope, proof of completion, value outcome | High |
| D-034-04 | Uses **pending → available** wallet release after verification | High |
| D-034-05 | Labor-rights-aware: no exploited/unsafe/child labor tasks | Medium |
| D-034-06 | Compatible with gCoins (growth), lCoins (learning), qCoins (quality) | Medium |

---

## 5. Extracted Feature/System Concepts

### Task types

Campaign tasks, gigs, missions, bounties, creator tasks, learning tasks, surveys, reviews, moderation, local tasks, GPS/check-in offers, brand-assigned actions, marketplace work.

### Verification

Proof upload, GPS check-in, completion signals, quality review, fulfillment accuracy tracking.

### What wCoin does NOT measure

Screen time, idle presence, fake productivity, tasks without proof, unpaid hidden labor.

---

## 6. Extracted UX/Design Ideas

- Earn Marketplace UI for task discovery and completion
- Pending balance UX for work awaiting verification
- Creator/brand task assignment interfaces

---

## 7. Extracted Technical Architecture Ideas

- Events: `wcoin_earned`, `task_completed`, `task_verified`, `task_rejected`
- Backend tables: tasks, proofs, fulfillment records, work quality scores
- Integration with campaign engine and atomic wallet updates

---

## 8. Extracted Economy/Currency Ideas

| Aspect | Detail |
|--------|--------|
| Position | "Completion layer" above attention/engagement |
| Conversion | To iCoins via standard hub — rates in spec |
| Trust | Work fraud reduces Trust; reliability over time tracked |
| vCoin link | Compatible with Value/vCoins per alphabet cross-refs |

---

## 9. Extracted Investor/Demo Ideas

- "Verified work marketplace" — gig economy + attention platform crossover
- Local business task flows (ties to GPS offers in demos)

---

## 10. Conflicts with Current Masterbrain

| Topic | This thread | SoT | Verdict |
|-------|-------------|-----|---------|
| wCoin in MVP | Full W spec | **Not in MVP 5 coins** | **Post-MVP** |
| Earn Marketplace | Assumed exists | SoT mentions earn paths | **Align conceptually** |
| Pending wallet | Explicit | SoT wallet mentions pending | **Align** |

---

## 11. Conflicts with P0 Batches 1–3

| Topic | Prior | This thread |
|-------|-------|-------------|
| Alphabet scope (028) | W as Work letter | **Confirm vs any prior W definition** |
| Local GPS (024, 030 demos) | Physical rewards | wCoin formalizes task layer — **complements** |
| gCoin (040) | Growth vs Go | wCoin = completion; gCoin = improvement — **distinct layers** |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B04-11 | wCoin = verified task completion (not time) | B — post-MVP |
| CC-B04-12 | Pending/available release for work rewards | B |
| CC-B04-13 | Earn Marketplace as wCoin primary surface | C |
| CC-B04-14 | Labor-rights + age-aware task gating | B |

---

## 13. Preserve-Only Notes

- Full 22-field spec body in chat — paste into `ECONOMY/` when W letter owner-locked
- References to lCoins, mCoins, nCoins — future letters

---

## 14. Obsolete Notes

- "Busy coin" or time-based work rewards — explicitly rejected

---

## 15. Follow-Up Extraction Targets

- Map wCoin tasks to existing Supabase campaign/offer tables
- Cross-link with gCoin Go flows (040) for physical visit tasks
- Owner decision: include W in MVP or defer to A–Z phase 2
