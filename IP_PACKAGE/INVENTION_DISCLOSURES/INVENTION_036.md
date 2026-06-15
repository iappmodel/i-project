# INVENTION_036 — Alphabet Currency UX System (26+ω Interactive Taxonomy)

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Platform Modules & Identity
**Date:** 2026-06-15

## Problem Solved
Digital platforms with internal currencies typically expose a single token or at most two (premium vs free), which collapses all user behavior into one undifferentiated reward signal. This makes it impossible for the platform to distinguish attention from engagement, loyalty from virality, or governance from spending — forcing crude anti-abuse rules and flat conversion economics that punish power users and bore casual ones.

## Current Industry Approach
Existing platforms (YouTube Super Chat, Twitch Bits, TikTok Coins) use one or two purchasable token types that serve as tipping or unlock mechanisms with no behavioral taxonomy. Loyalty programs like airline miles differentiate earn channels but unify into a single spend currency. No consumer platform maps a full alphabet of behavior-specific micro-currencies organized into functional tiers with immutable conversion pipelines and non-convertible governance classes.

## How [ i ] Solves It
The [ i ] platform defines 26 letter-named coins (aCoins through zCoins) plus one omega token (ωCoins), organized across 7 functional tiers: Core Value, Earning, Spending/Utility, Social, System/Governance, Special/Rare, and External. Each coin maps to a distinct behavioral trigger — aCoins for verified attention, fCoins for eye-tracking focus, sCoins for streaks, gCoins for governance, etc. All earning-tier coins must pass through rCoins (the Reward conversion hub) before reaching spendable currencies, enforcing a single auditable conversion pipeline. Specific coins (gCoins, tCoins, zCoins) are permanently non-convertible, preserving governance and achievement integrity. Conversion rates between rCoins and output currencies are modulated by the user's trust tier (0–100 score, 4 tiers), creating a dynamic rate table that rewards long-term trustworthy behavior.

## System Description
The Alphabet Currency system is a multi-token economy where each of 27 currencies has a distinct earning mechanic, visual identity, color code, and rule set. Tier 1 (Core) contains aCoins (Attention — the raw attention unit), iCoins (Individual — the cash-equivalent destination), and vCoins (Victory — platform utility credits). Tier 2 (Earning) contains eCoins, fCoins, wCoins, kCoins, and sCoins, each earned by a specific verified user behavior. Tier 3 (Spending) contains bCoins, mCoins, uCoins, and pCoins for boost, market, unlock, and power capabilities. Tier 4 (Social) covers creator, discovery, heart, loyalty, and network coins. Tier 5 (System) includes gCoins (governance, never tradeable), tCoins (trust score, never tradeable), rCoins (the conversion hub), qCoins (quality signal), and oCoins (provenance). Tier 6 (Special) contains seasonal and event-based rewards (zCoins, jCoins, yCoins). Tier 7 (External) includes xCoins for cross-platform bridging (gated to Trust Tier 4) and ωCoins for external reputation (read-only). All currency mutations are enforced server-side via Edge Functions — never client-side direct DB writes. Anti-inflation controls tie coin supply to ad revenue, seasonal burns remove vCoins from circulation, and auto-adjustments trigger when circulating iCoins exceed 120% of the 90-day average.

## Technical Components
- 27-token ledger schema (26 alphabetic + ω) with per-coin metadata (symbol, color, tier, convertibility flag)
- 7-tier classification engine (Core, Earning, Spending, Social, System, Special, External)
- rCoins conversion hub — single-funnel pipeline from all earning coins to spendable currencies
- Trust-tier-modulated conversion rate table (Tier 1: 100:1, Tier 2: 95:1, Tier 3: 88:1, Tier 4: 80:1 for rCoins→iCoins)
- Non-convertible coin class enforcement (gCoins, tCoins, zCoins permanently locked)
- Edge Function mutation layer — all coin credit/debit operations are server-authoritative
- Daily soft cap engine per trust tier (500/1000/2500/unlimited aCoins)
- Anti-inflation controller: supply tied to ad revenue, seasonal burn events, 120% auto-adjust
- Coin unlock timeline engine: progressive coin availability from Day 1 through Trust Tier 4
- Interactive taxonomy UI: `alphabet-currency.html` visualization with tier grouping, coin cards, and conversion flow diagrams
- xCoins cross-platform bridge with per-platform conversion premiums (Instagram 1.2×, TikTok 1.0×, YouTube 1.4×)

## Data Flow
1. User performs a behavior (watch, engage, focus, streak, create, discover, tip, refer, etc.)
2. Behavior is classified by the earning engine into the appropriate earning coin type (a/e/f/w/k/s/c/d/h/l/n)
3. Earning coin amount is calculated with applicable multipliers (focus 2.0×, streak 1.5×, featured 3.0×, new genre 1.25×)
4. Daily soft cap is checked against user's trust tier; earning rate drops to 10% if exceeded
5. Earned coins are deposited into the user's earning-tier ledger via Edge Function
6. When user initiates conversion, earning coins flow into rCoins (Reward Pool)
7. rCoins are converted to output currency (iCoins/mCoins/uCoins) at the user's trust-tier rate
8. Output currency is credited to spendable ledger; iCoins are withdrawable to USD
9. Non-convertible coins (g/t/z) are credited directly and permanently locked from conversion
10. Anti-inflation controller monitors circulating supply and adjusts earning rates if threshold is breached

## User Flow
The user starts with aCoins, iCoins, and vCoins unlocked on Day 1. Over their first week, eCoins, wCoins, and sCoins unlock automatically. By Month 1, the full earning and spending tiers become available. Each unlock is a micro-interaction: scale-up animation with spring easing, coin-specific color glow, and a second-person tagline ("You've unlocked Focus earning."). The user views their multi-coin balance in the wallet, initiates conversions through the rCoins pipeline, and withdraws iCoins to real money. The interactive taxonomy UI (alphabet-currency.html) provides a visual map of all coins, their tiers, and conversion rules.

## Economic Flow
Ad impression revenue is split 60% Creator / 30% Viewer reward pool / 10% Platform. The viewer reward pool funds viewer iCoins via the conversion pipeline. Earning coins accumulate from verified behaviors, flow through rCoins at trust-tier rates, and output as iCoins (cashable), mCoins (marketplace), or uCoins (unlocks). Some coins burn permanently (iCoins→bCoins at 1:100, one-way). Seasonal burn events remove vCoins from circulation. Quarterly rate reviews adjust conversion economics based on platform health metrics.

## Fraud Prevention
- All coin mutations are server-side Edge Functions — no client-side minting or direct DB writes
- 5-gate reward qualification engine (device signal, dwell threshold, attention score, completion event, fraud check) must pass before any reward is disbursed
- Daily soft caps prevent infinite farming (drops to 10% earning above cap)
- Anti-inflation controller auto-adjusts when supply exceeds 120% of 90-day average
- xCoins gated to Trust Tier 4 (score ≥ 76) — prevents new-account bridge abuse
- Behavioral fingerprint fraud detection on wheel interactions (rapid/mechanical scroll patterns blocked)
- Coin supply is tied to ad revenue — no revenue = no new coins minted (prevents inflation decoupled from real value)
- Non-convertible coins (g/t/z) have no conversion path — prevents governance gaming

## Unique Elements
1. Full 26-letter alphabet + omega token taxonomy where each letter maps to a distinct behavioral signal
2. 7-tier functional classification (Core/Earn/Spend/Social/System/Special/External) creating a complete economic grammar
3. rCoins single-funnel conversion hub — all earning must pass through one auditable pipeline before reaching spendable currencies
4. Trust-tier-modulated conversion rates that dynamically reward long-term trustworthy behavior
5. Non-convertible coin classes (gCoins, tCoins, zCoins) that preserve governance and achievement integrity by design
6. Progressive coin unlock timeline that reveals economy complexity over weeks/months — not all at once
7. Cross-platform conversion premiums (xCoins) with per-platform rate multipliers gated by trust tier
8. Supply-tied-to-revenue anti-inflation architecture with seasonal burn events

## Potential Patent Claims
1. A computer-implemented method for managing a multi-token digital economy comprising 26+ distinct behavior-mapped currency types organized in hierarchical functional tiers, wherein all earning-tier currencies must traverse a single conversion hub currency before reaching spendable currencies, and wherein conversion rates are dynamically modulated by a user trust score.
2. A system for progressive currency capability unlocking in a digital platform, wherein distinct currency types become available to a user account based on temporal milestones and behavioral achievement thresholds, each unlock accompanied by a type-specific visual micro-interaction.
3. A method for anti-inflation control in a multi-currency digital economy, comprising tying aggregate coin supply to verified advertising revenue, enforcing daily per-user earning caps modulated by trust tier, and triggering automatic earning-rate reduction when circulating supply of a cash-equivalent token exceeds a threshold percentage of its rolling average.
4. A digital economy architecture comprising non-convertible token classes coexisting with convertible tokens within a unified ledger, wherein governance tokens and achievement tokens are permanently excluded from conversion pipelines while sharing display and interaction patterns with convertible tokens.
5. A cross-platform currency bridge method gated by a minimum trust tier threshold, wherein conversion rates between an internal platform currency and external platform reputation scores are modulated by per-platform multiplier coefficients.

## Potential Competitors
- TikTok Coins / YouTube Super Chat / Twitch Bits (single token tipping)
- Brave BAT (single attention token)
- Reddit Community Points (single subreddit-scoped token)
- Roblox Robux / Fortnite V-Bucks (single in-app purchase currency)
- Airline/hotel loyalty programs (single-earn, single-spend)
- Web3 multi-token protocols (Axie, Decentraland — different domain, similar multi-token concept)

## Related Files
- `07_currency_system/alphabet-currency.html` — Interactive taxonomy visualization
- `MASTER_BRAIN/ECONOMY/i-app-economy-rules.md` — Canonical economy rules (immutable)
- `MASTER_BRAIN/RELATIONSHIPS/ThreeLoops_Economy.md` — Loop-to-economy mapping
- `app/src/` — React MVP implementation
- `docs/legal/POP_PATENT_FAMILY.md` §10 — P8 Multi-Currency Economy patent
- `IP_PACKAGE/INVENTION_DISCLOSURES/INVENTION_001_008_POP_FAMILY.md` — INV-007 multi-currency layer reference

## Scores
| Metric | Score (1-10) |
|--------|-------------|
| Priority | 9 |
| Patentability | 8 |
| Business Value | 9 |
