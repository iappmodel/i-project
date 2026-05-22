# P0-007: Expanding iApp Currency Ecosystem with Alphabetic Coin Types

**Extraction batch:** P0 Batch 01  
**Extracted:** 2026-05-21

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `8c47af33-8c6a-49fd-b2af-08dfbb599bfa` |
| Title | Expanding iapp currency ecosystem with alphabetic coin types |
| Date created | 2026-03-21 |
| Date updated | 2026-05-12 |
| Raw path | `…/conversations.json#8c47af33-8c6a-49fd-b2af-08dfbb599bfa` |
| Messages | 65 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 159 | P0 | Economy, Wallet, Creator Economy, Campaigns, Payments |

---

## 3. Project-Specific Summary

Deep design session building the **full A–Z coin taxonomy** (26 letter-coins), **tiered reveal UX**, **rcoins conversion hub**, **creator and brand economy layers**, **wallet/convert UI**, and **payment system** (withdraw, tip, NFC/QR/pay-link). Eight standalone HTML UI artifacts saved (`iapp_wallet_ui`, convert, unlock moment, withdraw, tip, pay, payment architecture, payment confirmation).

Later messages design **cross-platform feed** and **connect platforms** screens with immersive interaction model.

---

## 4. Extracted Decisions

| ID | Decision |
|----|----------|
| D-007-01 | **iCoins remain cash anchor** ("i" = me = my money); bCoins = fractional (satoshi-like) |
| D-007-02 | One letter + "coins" naming; **avoid user-facing compound coins** (use tiers/modifiers internally) |
| D-007-03 | **Tiered coin reveal** tied to trust level, not time alone |
| D-007-04 | **All earning coins → rcoins pool → spendable outputs**; no direct acoins→icoins shortcut |
| D-007-05 | tcoins, gcoins, zcoins **never convert** (reputation, non-transferable) |
| D-007-06 | xCoins gate **cross-chain exit** at Trust Tier 4 |
| D-007-07 | Conversion rates from pool: icoins 100:1 (80:1 at T4), mcoins 60:1, ucoins 50:1 |
| D-007-08 | Tier multipliers: T1 1×, T2 1.15×, T3 1.3×, T4 1.5× |
| D-007-09 | **Tips: zero platform cut** |
| D-007-10 | **60/30/10** creator/viewer/platform split in creator simulator |
| D-007-11 | Brands pay **per verified second** — verification layer is the product |
| D-007-12 | Wallet UI: **iCoins only as headline number**; sparklines for momentum |
| D-007-13 | NFC pay: signed token, 60s nonce, 30-second reversal window |
| D-007-14 | Trust tier expands spending limits — **KYC by behavior** not paperwork |
| D-007-15 | Feed immersion: minimal persistent anchors; deeper controls on tap |

---

## 5. Extracted Feature/System Concepts

### A–Z coin taxonomy (by category)

**Core value (purple):** icoins, bcoins, rcoins, vcoins, xcoins  
**Earning (teal):** acoins, dcoins, fcoins, hcoins, jcoins, kcoins, wcoins  
**Spending (blue):** mcoins, ocoins  
**Social (amber):** scoins, ncoins, lcoins  
**System (gray):** ccoins, ecoins, pcoins, qcoins, ucoins (ucoins maps to Vicoins concept)  
**Special (pink):** gcoins, tcoins, ycoins, zcoins — non-fungible in spirit  

### Tiered reveal (UX backbone)

- Tier 1: 3–5 coin types visible — functional earn/spend only  
- Progressive unlock through trust engagement  
- Special coins (zcoins etc.) via cultural/milestone events — not day-one  
- Contextual coins (qcoins) appear only when relevant  

### Coin unlock moment design

- Expanding ring pulse, coin drop animation, second-person taglines  
- Permanent color identity per coin  
- Skippable reveal ("Later" button)  
- Dot row signals series of discoveries  

### acoins earning system

- Attention verification: dwell + scroll velocity + interaction signals  
- 3× featured hour window for appointment engagement  
- Daily soft cap rises with trust tier  

### Creator economy

- Quality engagement multiplier beats follower count  
- Creator pool uses same rcoins mechanics as users  
- Brand campaigns: pay-per-verified-second model  
- ocoins as targeted conversion instruments for brands  

### Payment system

- Withdraw (bank/card/external), Tip (bcoins/mcoins/icoins, 0% cut), Pay (NFC/QR/pay-link)  
- Pay link as viral spread mechanism — no app install for payer  
- Spending limits by trust tier  

### Cross-platform feed (later in thread)

- Connect platforms screen: IG, YT, TikTok, Twitch, Snapchat, Facebook, X, Kik, Pinterest  
- Platform badges on imported content cards  
- Immersive feed states: organic / sponsored-earning / tap-revealed overlay  

---

## 6. Extracted UX/Design Ideas

- Wallet: dark void palette, Syne headings, JetBrains Mono numbers  
- Convert screen: percentage shortcuts primary; fee breakdown before confirm  
- Soft depth on wallet/earn cards; not on transaction tables/compliance  
- Feed: Jakob's Law, Fitts's Law, Nielsen visibility heuristic cited for persistent UI  
- Persistent on content: creator, reward badge, mute, like/save/share, progress (sponsored only), wallet chip  

---

## 7. Extracted Technical Architecture Ideas

- NFC payload: user ID, amount, coin type, timestamp, one-time nonce — no raw wallet data broadcast  
- Escrow hold 30s before permanent transfer  
- Merchant sees amount + confirmation ID only  
- Internal modifiers like `acoins:focus` vs user-facing single letter names  

---

## 8. Extracted Economy/Currency Ideas

*(See Section 5 — this thread is the richest economy source in Batch 01)*

Key reconciliation note: **ucoins ↔ Vicoins** mapping explicit in thread.

---

## 9. Extracted Investor/Demo Ideas

- Eight saved HTML artifacts usable as standalone investor screen demos  
- Campaign simulator: $5K spend → 562,500 verified seconds example  
- Live viewer badges, sponsored shimmer on tiles  

---

## 10. Conflicts with Current Masterbrain

| Topic | Chat | SoT | Verdict |
|-------|------|-----|---------|
| Coin count | 26 A–Z coins | 5 MVP currencies | **Major expansion** — experimental until owner maps A–Z → canonical 5 |
| ucoins/Vicoins | ucoins = utility, maps to Vicoins | vCoins = utility | **Naming overlap** — reconcile ucoins vs vCoins vs Vicoin |
| rcoins hub | Central clearing pool | Not in SoT MVP table | **Architectural addition** |
| iCoins headline only | Wallet shows icoins as sole headline | Wallet stores all balance types | **UX policy** — compatible with SoT |
| Pay/NFC full system | Complete payment rails designed | SoT mentions wallet withdraw/spend | **Future scope** — not evidenced in repo |

---

## 11. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| rcoins clearing hub rule | `ECONOMY/CURRENCY_ECOSYSTEM.md` (if promoted) |
| Conversion rate table + tier multipliers | Economy docs |
| Non-convertible reputation coins (t/g/z) | Trust system |
| Tiered coin reveal UX | Economy + onboarding |
| 60/30/10 + zero tip cut | `CANONICAL/REVENUE_MODEL.md` (reinforces) |
| Pay-per-verified-second brand model | Creator/advertiser docs |
| Immersive feed interaction model | Attention/UX |

---

## 12. Preserve-Only Notes

- HTML artifact filenames: `iapp_wallet_ui.html` through `iapp_payment_confirmation.html`
- Simulator drag interactions described but not in export

---

## 13. Obsolete Notes

- Owner-proposed ecoins/bcoins/ccoins examples superseded by full A–Z taxonomy
- Compound coin names (`afcoins`) explicitly rejected for user-facing use

---

## 14. Follow-Up Extraction Targets

- OpenAI threads: `vCoin Development Guide`, `aCoin Specification`, `Alphabet Currency System` (P0 ranks 20–28)
- Map A–Z taxonomy → canonical a/i/v/e/o coins
- Conv `d4c38603` — Alphabet currency coin system development
