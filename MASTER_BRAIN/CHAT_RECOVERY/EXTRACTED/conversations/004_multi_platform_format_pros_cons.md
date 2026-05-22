# P0-004: Multi-Platform Format Pros and Cons

**Extraction batch:** P0 Batch 01  
**Extracted:** 2026-05-21

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `80be7e6b-edf4-4960-9036-9890328056e0` |
| Title | Multi-platform format pros and cons |
| Date created | 2026-03-29 |
| Date updated | 2026-04-07 |
| Raw path | `…/conversations.json#80be7e6b-edf4-4960-9036-9890328056e0` |
| Messages | 9 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 175 | P0 | Cross-platform, Creator Economy, Economy, Trust |

---

## 3. Project-Specific Summary

Strategic brainstorm on **[ i ] as "platform for all platforms"** — aggregating attention and content from Instagram, TikTok, YouTube, etc. rather than requiring users to abandon existing networks. Thread expands into **native creator vs imported content** economics and produces **creator-facing** and **user-facing** pitch/onboarding artifacts (5 sections each).

---

## 4. Extracted Decisions

| ID | Decision |
|----|----------|
| D-004-01 | Cross-platform import solves **cold start** but creates **API dependency risk** |
| D-004-02 | Smart path: use import as **launch accelerator**, incentivize **native content** so dependency shrinks |
| D-004-03 | **oCoins** tag native vs imported provenance; native content earns more |
| D-004-04 | **Native creators** are co-owners of attention marketplace; importers are passive users |
| D-004-05 | Creator tier based on **quality engagement score** — follower count explicitly excluded |
| D-004-06 | Tips: **zero platform cut** (100% to creator) — platform takes 10% from attention, not generosity |
| D-004-07 | xCoins (cross-platform reputation bridge) unlock at Trust Tier 4 |

---

## 5. Extracted Feature/System Concepts

**Platform-for-all-platforms pros**
- Massive content supply day one
- Users don't have to choose between apps
- Moat = attention layer (trust, coins, 5-gate engine), not content library
- Easier cold start (viewers only, content exists elsewhere)
- Brands get multi-platform reach from single buy
- xCoins as loyalty differentiator at T4

**Platform-for-all-platforms cons**
- API dependency existential risk (IG/TikTok/YouTube history of killing access)
- Content provenance legal gray zone without creator consent framework
- Revenue split complexity for imported content (who gets 60%?)
- Trust score hard to seed for cross-platform social proof
- Hostile platform response risk as [ i ] scales
- Onboarding complexity if 26 coins + 5 gates exposed early

**Native creator advantages**
- 60/30/10 split vs ~45% platform take elsewhere
- Quality engagement score: completion, return viewers, eye-verified attention, comment ratio
- Audience attention feeds creator quality score and tier
- Trust score compounds: T4 → instant payout, multipliers, xCoins, governance
- Direct campaign marketplace access by trust tier
- Flywheel: viewer rewards → audience retention → creator tier → higher cut

---

## 6. Extracted UX/Design Ideas

**Creator pitch artifact (5 sections)**
1. Revenue — 60/30/10 vs competitor bars  
2. Recognition — quality signals + tier multipliers  
3. Flywheel — viewer earnings → creator quality score diagram  
4. Comparison table — 8 rows × 4 platforms  
5. Trust as asset — Day 1 → T4 timeline with coin unlocks  
Manifesto: supplier vs co-owner

**User pitch artifact (5 sections)**
1. Truth — $0/hr elsewhere vs up to $5/verified view  
2. How you earn — 5 routes with coin types and ranges  
3. Wheel — up=vCoins, down=iCoins, heart=both  
4. Wallet preview — Alex Rivera mock balances + live ticker  
5. Trust tiers — perks per tier  
Manifesto: "attention is their product" vs "your attention is your asset"

---

## 7. Extracted Technical Architecture Ideas

- Cross-platform import pipeline (Section 13 referenced in feature bible)
- oCoins for external provenance tagging
- xCoins bridge gated at T4 for portable reputation

---

## 8. Extracted Economy/Currency Ideas

- 60/30/10 baseline split reinforced
- xCoins as cross-platform bridge coin
- oCoins for imported/native provenance distinction
- Tier multipliers: 1.0× → 2.0× by creator tier

---

## 9. Extracted Investor/Demo Ideas

- Creator and user pitch pages usable as landing/onboarding or leave-behind
- Brand/advertiser pitch version suggested as next artifact

---

## 10. Conflicts with Current Masterbrain

| Topic | Chat | SoT | Verdict |
|-------|------|-----|---------|
| oCoins role | Imported content provenance | Origin currency — imported value | **Aligns** |
| Revenue split | 60/30/10 for native | 60% Creator · 30% Viewer · 10% Platform | **Aligns** |
| Platform positioning | Primary growth = aggregator | Attention wallet + marketplace (content source agnostic) | **Strategic tension** — SoT doesn't mandate aggregator-first |
| xCoins at T4 | Cross-platform reputation | xCoins not in SoT MVP table | **Expansion** — needs owner decision |

---

## 11. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| Native vs imported creator taxonomy | `CREATOR_ECONOMY/STUDIO_AND_CAMPAIGNS.md` |
| Platform-for-all-platforms pros/cons matrix | `RESEARCH/` strategy note |
| Quality engagement score signals (4 metrics) | Trust/creator tier criteria |
| Creator + user pitch section outlines | `INVESTOR_DEMO/` narrative |

---

## 12. Preserve-Only Notes

- Interactive HTML artifact builds (creator onboarding page) — locate in IVAULT if exported

---

## 13. Obsolete Notes

- None

---

## 14. Follow-Up Extraction Targets

- Conv `214eb465` — unified social media identity platform
- OpenAI `Alphabet Currency System` / cross-platform threads
- Legal/consent framework for imported content — **evidence gap**
