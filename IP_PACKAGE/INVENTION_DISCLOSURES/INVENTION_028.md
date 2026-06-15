# INVENTION_028 — Pending-First Wallet Settlement UX

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Attention Economy UX
**Date:** 2026-06-15

## Problem Solved

Attention economy and gig-economy wallets display earnings as instant balances, hiding the complex verification and settlement pipeline behind a single number. Users cannot understand why rewards are delayed, what verification steps remain, or whether a partial rejection occurred. This opacity breeds distrust and support ticket volume. No existing wallet UX treats the "pending" state as a first-class, expandable, step-by-step verification timeline that educates users about the settlement process while they wait.

## Current Industry Approach

Venmo and Cash App show a simple "pending" label on transactions with no detail about why or what happens next. YouTube Creator Studio shows estimated vs. finalized revenue monthly with no per-session breakdown. Gig platforms (Uber, DoorDash) show a pending earnings number that eventually clears, but the verification pipeline is invisible. None provide an expandable per-reward verification timeline with step-by-step progress, expiration countdowns, and actionable next steps.

## How [ i ] Solves It

The [ i ] Pending-First Wallet Settlement UX elevates the pending state from an afterthought label to the primary wallet interaction surface. The wallet displays a Pending tab with badge count as a first-class peer to History and Insights tabs. Each pending reward is rendered as an expandable card with: a visual progress bar showing completed/total verification steps, a reward amount with countdown timer (urgent rewards pulse), and an expandable step-by-step verification timeline. Each step shows its completion status (checkmark or numbered), label, detail text, and timestamp. The lifecycle is fully transparent: earned → pending → approved/partial/rejected. Shimmer loading animations indicate active processing. Action buttons within expanded cards let users cancel holds or navigate to complete location-based steps. The wallet balance card itself separates available, pending, and withdrawn amounts with a ring chart showing the available percentage.

## System Description

The wallet architecture consists of three integrated views: History, Pending, and Insights, accessible through a tab pill selector. The **Pending view** is the primary innovation. Each pending reward from the `pop_pending_holds` table is rendered as a `pending-card` component with collapsed and expanded states. In collapsed state, the card shows: an icon representing the reward source, a title and progress bar (`completedSteps/totalSteps`), the reward amount in gold monospace, and an expiration countdown with urgency coloring (red pulsing for urgent, muted for standard). In expanded state, the card reveals a "STEPS TO RELEASE" timeline: each step is a numbered row with a completion indicator (green checkmark with `rgba(29,158,117)` background for done, grey numbered circle for pending), a label, and detail text explaining what the user must do or what the system confirmed. Steps include actions like "Offer claimed," "Visit the restaurant," "GPS check-in," "Staff confirms order." Action buttons at the bottom of expanded cards offer "Cancel hold" (which removes the pending hold with no charge, updating badge counts and totals) and "Navigate →" (which opens maps for location-based steps). The **Balance card** displays the available balance prominently with a running total of today's earnings, a ring chart showing the ratio of available to total value, and a mini stat row showing pending total, withdrawn total, and active campaign count. The pending total updates dynamically when holds are cancelled. The **History view** shows completed transactions with filter chips (All, Instant, Released, Withdrawn) and color-coded amounts (green for earned, gold for released, muted for withdrawn). The **Insights view** provides weekly earning charts, top earning type breakdowns, and streak tracking with bonus multipliers. The WalletScreen.tsx React implementation adds live POP settlement support with `PendingRewardExplainer` components, real-time proof event connections, and one-click "Settle" buttons on pending holds.

## Technical Components

- `wallet_pending_tab.html` — Full HTML/CSS/JS prototype of the pending-first wallet UX
- `WalletScreen.tsx` — React wallet implementation with POP hold integration
- `PendingRewardExplainer` — React component rendering step-by-step verification timeline
- `pop_pending_holds` table — Backend storage for pending verification holds
- `pending-card` CSS class — Expandable card with collapsed/expanded states and slide-in animation
- `step-row` CSS class — Step-by-step timeline row with reveal animation
- Shimmer loading (`shimmer-line` class) — Active processing indicator
- Ring chart SVG — Visual available/pending/withdrawn ratio display
- Tab pill selector — History/Pending/Insights with badge count
- Action buttons — Cancel hold, Navigate, Settle within pending cards
- Countdown timers with urgency states — Red pulsing for urgent, muted for standard
- Filter chips — Transaction history filtering (All, Instant, Released, Withdrawn)
- Weekly bar chart — Earnings visualization with day-of-week breakdown
- Streak tracker — 7-day streak with bonus multiplier display

## Data Flow

1. User opens Wallet tab from the bottom dock.
2. Balance card loads: available balance, today's earnings delta, ring chart, mini stats.
3. Pending badge shows count of active holds from `pop_pending_holds`.
4. User taps Pending tab.
5. System renders pending cards: each card shows reward source, progress bar, amount, expiration countdown.
6. User taps a pending card to expand.
7. Expanded view reveals "STEPS TO RELEASE" timeline with completed/pending steps.
8. User sees what they've done (green checkmarks) and what remains (numbered steps with instructions).
9. User can tap "Navigate →" to open maps for location-based steps.
10. User can tap "Cancel hold" to release the hold (no charge applied, badge count decrements).
11. When all steps complete, the reward transitions from pending to available with a toast notification.

## User Flow

The user finishes watching a promotional video and earns a pending reward. They open their wallet and see a badge "3" on the Pending tab. They tap it and see three pending reward cards. The first card shows "Sakura Sushi — free appetizer" with 1/4 steps complete, $1.50 reward, and "5h 22m" countdown pulsing in red. They tap the card to expand it and see four steps: (1) "Offer claimed" with a green checkmark and timestamp, (2) "Visit the restaurant" with instructions, (3) "GPS check-in" explaining auto-detection within 50m, (4) "Staff confirms order" explaining the final unlock step. They tap "Navigate →" to open maps to the restaurant. After visiting and checking in, steps 2 and 3 gain green checkmarks. Staff confirmation completes step 4, and the $1.50 moves from pending to available with a celebratory toast.

## Economic Flow

Pending holds represent verified attention value that has been earned but not yet fully settled. The wallet makes the settlement pipeline economically transparent: users can see exactly how much value is pending, what verification steps gate release, and when holds expire. This transparency serves multiple economic functions. For users: it builds trust by showing the system is working, not withholding funds arbitrarily. For the platform: it reduces support costs by self-explaining delays. For advertisers: it ensures rewards only release when all campaign conditions are verifiably met (visit, purchase, engagement completion). The cancel-hold mechanism allows users to abandon incomplete campaigns without penalty, maintaining user autonomy while protecting advertiser budgets from unearned payouts. The withdrawal system supports Bank (1-2 days), PayPal (instant), Crypto (~1 hour), and Gift Card (instant) destinations.

## Fraud Prevention

- Pending holds are created and managed server-side via `pop_pending_holds`; users cannot self-approve pending rewards.
- Each step in the verification timeline requires server-side confirmation (GPS check-in, staff QR scan, completion detection).
- Expiration timers prevent indefinite holds — if conditions aren't met within the window, the hold expires.
- Cancel-hold explicitly records the cancellation with "no charge applied" rather than silently removing the entry.
- The wallet balance clearly separates available (withdrawable) from pending (not withdrawable), enforcing Rule 4 (no withdrawal from pending value).
- Ring chart and mini stats provide at-a-glance fraud awareness — if pending significantly exceeds available, it may indicate verification issues.
- History filter chips allow users to audit their own transaction patterns for anomalies.

## Unique Elements

1. Pending state as a first-class wallet tab with badge count, rather than a footnote label on an available balance.
2. Expandable step-by-step verification timeline per pending reward, showing completed steps (with timestamps) and remaining steps (with instructions) — transforming opaque "pending" into an actionable checklist.
3. Urgency-aware expiration countdowns with visual differentiation (red pulsing for urgent, muted for standard) that create time-pressure awareness without alarm fatigue.
4. In-card action buttons (Cancel hold, Navigate) that let users take immediate action on pending rewards without leaving the wallet context.
5. Transparent lifecycle states (earned → pending → approved/partial/rejected) with shimmer loading indicating active server-side processing.

## Potential Patent Claims

1. A wallet user interface for an attention economy comprising: a pending rewards tab displaying verification hold cards with expandable step-by-step settlement timelines; each step showing completion status, descriptive label, and instructional detail; and in-card action controls enabling users to navigate to complete physical verification steps or cancel holds without penalty.
2. A method for displaying attention reward settlement status comprising: rendering pending rewards as expandable cards with progress indicators; displaying a multi-step verification timeline within each card showing server-side verification stages; providing urgency-aware countdown timers with visual differentiation; and dynamically updating step completion status as verification events are received.
3. A wallet balance display system comprising: simultaneous presentation of available, pending, and withdrawn balances; a ring chart visualizing the ratio of available to total value; and a badge-counted pending tab that surfaces unresolved verification holds as the primary wallet interaction.
4. A method for transparent attention economy settlement comprising: creating server-side verification holds for attention rewards; exposing each hold's multi-step verification requirements through a user-facing timeline interface; enabling users to proactively complete remaining verification steps through action buttons; and transitioning rewards from pending to available upon server-confirmed completion of all steps.

## Potential Competitors

- Venmo / Cash App (simple pending labels, no verification timeline)
- YouTube Creator Studio (monthly estimated vs. finalized, no per-session detail)
- Uber / DoorDash (earnings pending without verification visibility)
- Brave Rewards (monthly ad earnings, no pending detail)
- PayPal (hold system, no expandable verification timeline)

## Related Files

- `04_wallet_payments/wallet_pending_tab.html`
- `app/src/screens/WalletScreen.tsx`
- `app/src/components/PendingRewardExplainer.tsx`
- `app/supabase/migrations/20260525220000_pop_pending_holds.sql`
- `04_wallet_payments/iapp_wallet_dashboard.html`
- `04_wallet_payments/iapp_wallet_ui (1).html`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 8 |
| Patentability | 8 |
| Business Value | 9 |
