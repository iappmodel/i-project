# INVENTION_037 — Three-Loops Product Framework

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Platform Modules & Identity
**Date:** 2026-06-15

## Problem Solved
Consumer attention platforms generate engagement but fail to structure that engagement into separable, reinforcing economic loops. Users scroll passively, creators post speculatively, and advertisers pay for impressions with no feedback into retention or value realization. The result is a single undifferentiated activity stream where monetization, discovery, and spending are tangled together, making it impossible to optimize any one without degrading the others.

## Current Industry Approach
Social media platforms (TikTok, Instagram, YouTube) operate on a single-loop model: users consume content, the platform sells ads against that consumption, and creators receive a share of ad revenue. There is no structural separation between the attention-earning activity, the content-discovery/retention mechanism, and the value-realization/spending layer. Fintech apps (Venmo, Cash App) handle the spending side but have no attention or discovery loop. No platform architecturally separates product behavior into three distinct, named, and individually optimizable loops.

## How [ i ] Solves It
The [ i ] platform defines three named product loops, each with its own entry point, mechanics, economic model, and retention driver. Loop 1 (Watch → Verify → Earn) is the money loop — attention is verified through the 5-gate POP engine and converted to coins. Loop 2 (Browse → Save → Return) is the habit loop — content discovery feeds saves, notifications, and return visits that re-enter Loop 1. Loop 3 (Balance → Convert → Use) is the value loop — earned coins are converted at trust-tier rates and spent, withdrawn, or reinvested. Each loop maps to a specific tab in the 4-tab navigation (Earn, Feed, Wallet, Profile) and to specific coin types. The framework provides a diagnostic filter: if a feature does not strengthen one of the three loops, it is noise and should not ship.

## System Description
Loop 1 is the MVP spine and flagship revenue engine. The user opens the Earn tab, browses available campaign offers, taps an offer to see reward amount and duration, completes the watch/survey/GPS task, passes the 5-gate verification engine (device signal, dwell threshold, attention score, completion event, fraud check), and receives coins to their wallet. This loop is the only loop that directly generates revenue (via the 60/30/10 ad revenue split). Loop 2 drives retention by enabling content discovery through the Feed tab, saving creators and offers to boards, receiving notifications about new offers from saved creators, and returning to pick up where they left off — feeding back into Loop 1. Loop 2 generates no direct revenue but enables Loop 1 repeat engagement and creator value accumulation. Loop 3 closes the value cycle through the Wallet tab: the user sees their growing balance, initiates conversion (earning coins → rCoins → iCoins at trust-tier rate), and withdraws or spends. Trust deepens with consistent use, improving conversion rates and payout speed, which creates sunk-cost retention. The three loops share the same UI shell (immersive glass feed per Picture 2 design law) but target different user intents and measure different KPIs.

## Technical Components
- Loop 1 spine: Feed → Watch → POP 5-gate verification → Pending reward → Wallet → iGET claim UX
- Loop 2 engine: Feed algorithm → Bookmark/save system → Notification pipeline → Re-engagement hooks → Loop 1 re-entry
- Loop 3 engine: Wallet 4-state view → rCoins conversion pipeline → Trust-tier rate table → Payout methods (bank, PayPal, gift card, crypto, reinvest)
- 4-tab navigation architecture (Feed, Earn, Wallet, Profile) with each tab mapped to a primary loop
- Loop diagnostic filter: feature acceptance criteria requiring explicit loop assignment
- Cross-loop instrumentation: analytics events tagged by originating loop for per-loop optimization
- Revenue attribution per loop: Loop 1 = direct ad revenue, Loop 2 = indirect retention value, Loop 3 = conversion/withdrawal fees
- Trust score integration: Loop 3 conversion rates and payout speed improve with trust tier (0–100, 4 tiers)

## Data Flow
1. **Loop 1 entry:** User navigates to Earn tab → browses marketplace offers → selects campaign
2. **Loop 1 execution:** User watches/completes task → POP 5-gate engine verifies → reward minted via Edge Function → coins credited to wallet (pending)
3. **Loop 1 exit → Loop 2 seed:** Completed campaign triggers save prompt for creator → user bookmarks creator → notification subscription created
4. **Loop 2 cycle:** New offer from saved creator → push notification → user returns → opens Feed → re-enters Loop 1
5. **Loop 1 accumulation → Loop 3 entry:** Wallet balance grows → user navigates to Wallet tab → views 4-state balance (pending, available, converting, withdrawn)
6. **Loop 3 execution:** User initiates conversion → earning coins flow through rCoins hub → output at trust-tier rate → iCoins available for withdrawal
7. **Loop 3 retention:** Trust tier increases with consistent use → better rates and faster payouts → user returns to Loop 1 to earn more
8. **Cross-loop feedback:** Loop 3 trust improvements unlock Loop 1 earning caps and Loop 2 notification privileges

## User Flow
A new user enters through the Feed (Loop 2), discovers content, and encounters their first earning opportunity — transitioning into Loop 1. They complete a watch session, see coins credited, and are prompted to explore the Wallet (Loop 3). Over days, they save favorite creators (Loop 2), return via notifications (Loop 2 → Loop 1), accumulate balance (Loop 1 → Loop 3), convert and withdraw (Loop 3), and see their trust tier rise — which improves conversion rates and unlocks more earning capacity. Each session naturally crosses loops, but the system can identify which loop initiated the session and optimize accordingly.

## Economic Flow
Loop 1 is the revenue generator: ad impression revenue is split 60% Creator / 30% Viewer reward pool / 10% Platform. The viewer reward pool funds Loop 1 coin payouts. Loop 2 generates no direct revenue but increases Loop 1 frequency through retention mechanics (saved creators, notifications, return visits). Loop 3 captures value through conversion spread (trust-tier-modulated rates) and withdrawal processing fees. The three loops create a self-reinforcing economic flywheel: more Loop 1 activity attracts creators and advertisers → more content feeds Loop 2 → higher balances drive Loop 3 engagement → trust improvements feed back into Loop 1 earning capacity.

## Fraud Prevention
- Loop 1: 5-gate POP engine prevents reward disbursement without verified attention (device signal, dwell, gaze, completion, behavioral fingerprint)
- Loop 1: Daily earning soft caps per trust tier (500/1000/2500/unlimited aCoins)
- Loop 2: Save and notification rate limits prevent bot-driven engagement farming
- Loop 3: KYC gates at first cash-out and at $100/month earning threshold
- Loop 3: Trust-tier-modulated withdrawal delays (14 days Tier 1 → instant Tier 4) create economic friction for fraudsters
- Cross-loop: Trust score degradation (-10 flagged, -40 abuse confirmed) propagates across all three loops simultaneously
- Feature filter: features that don't map to a loop are rejected, preventing attack surface expansion

## Unique Elements
1. Three explicitly named and architecturally separated product loops (Watch→Verify→Earn, Browse→Save→Return, Balance→Convert→Use) as a structural product framework
2. Each loop maps to a distinct user intent (earning, discovering, spending) with its own tab, metrics, and economic model
3. Loop diagnostic filter as a feature acceptance criterion — features must strengthen exactly one loop or be rejected
4. Cross-loop feedback mechanisms where trust improvements in Loop 3 unlock capabilities in Loops 1 and 2
5. Separation of direct revenue generation (Loop 1 only) from retention value (Loop 2) and conversion economics (Loop 3)
6. Self-reinforcing economic flywheel where each loop's output is another loop's input

## Potential Patent Claims
1. A computer-implemented method for structuring a digital platform's user experience into three architecturally separated behavioral loops, each loop comprising a distinct entry point, execution mechanics, economic model, and retention driver, wherein Loop 1 governs attention monetization through verified engagement, Loop 2 governs content discovery and re-engagement, and Loop 3 governs value conversion and realization, and wherein user trust score improvements in Loop 3 dynamically improve capabilities available in Loops 1 and 2.
2. A system for operating a digital attention marketplace comprising three interdependent product loops sharing a unified user interface, wherein only one loop generates direct advertising revenue, a second loop drives user retention through content saving and notification re-engagement, and a third loop manages currency conversion at rates modulated by a behavioral trust score.
3. A method for evaluating digital platform features against a three-loop diagnostic framework, comprising classifying each proposed feature by its primary loop assignment, measuring the feature's impact on loop-specific key performance indicators, and rejecting features that do not demonstrably strengthen at least one of three predefined behavioral loops.
4. A digital platform architecture wherein a user's activity session is instrumented with loop-origin attribution, enabling per-loop optimization of content ranking, offer presentation, and conversion timing without requiring the user to explicitly select an activity mode.

## Potential Competitors
- TikTok / Instagram Reels / YouTube Shorts (single-loop feed + ad model)
- Brave Browser (single-loop attention → BAT)
- Sweatcoin / StepN (single-loop activity → token)
- Cash App / Venmo (single-loop payments, no attention or discovery)
- Pinterest (strong save/return loop but no monetization loop for viewers)
- Shopify (commerce loop but no attention verification)

## Related Files
- `06_feed_earning_loops/iapp_three_loops.html` — Interactive three-loops visualization
- `MASTER_BRAIN/RELATIONSHIPS/ThreeLoops_Economy.md` — Loop-to-economy relationship mapping
- `MASTER_BRAIN/CANONICAL/CORE_LOOP.md` — Core loop definition
- `docs/MVP_CANONICAL_FLOW.md` — MVP flow documentation
- `MASTER_BRAIN/DECISIONS/DEMO_IA_ADR.md` — 4-tab IA architecture decision
- `06_feed_earning_loops/loop1_spine_explainer.html` — Loop 1 spine explainer
- `06_feed_earning_loops/iapp_loop1_watch_verify_earn.html` — Loop 1 interactive prototype

## Scores
| Metric | Score (1-10) |
|--------|-------------|
| Priority | 9 |
| Patentability | 7 |
| Business Value | 9 |
