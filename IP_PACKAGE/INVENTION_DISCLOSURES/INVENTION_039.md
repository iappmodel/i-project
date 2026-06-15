# INVENTION_039 — Out-Profile Creator Chip Pattern

**Inventor:** Marcelo Silva
**Category:** Design Patent
**Family:** Immersive UI Design
**Date:** 2026-06-15

## Problem Solved
Immersive media feeds (TikTok, Reels, Shorts) display creator identity as a byline or small overlay that serves no economic function beyond navigation to a profile page. In attention-monetization platforms, creator identity is supply-side infrastructure — it needs to connect content attribution to campaign routing, tip flows, and revenue share mechanics without breaking the full-screen experience. Existing platforms conflate the creator's identity, the viewer's own profile, and any AI/assistant presence into overlapping UI zones.

## Current Industry Approach
TikTok places the creator handle at the bottom-left with a follow button. Instagram Reels shows username and caption at the bottom. YouTube Shorts displays a circular avatar and channel name at the bottom-right. In all cases, tapping the creator identity navigates to a separate profile page — a full context switch that breaks immersion. None of these platforms use the creator chip as a routing point for sponsored offers or monetized interactions. None architecturally separate creator identity (content attribution) from viewer identity (account profile) from companion presence (AI assistant).

## How [ i ] Solves It
The [ i ] platform introduces the Out-Profile — a floating glass chip anchored at the bottom-left of every immersive media card, showing the creator's avatar, name, and location. The Out-Profile is architecturally distinct from two other identity zones: Elo (the AI companion, center-positioned) and the In-Profile tab (the user's own account and trust identity). Tapping the Out-Profile routes through `outProfileTapAction`: if the content has a `sponsoredOfferId`, the tap opens a consent-first sponsored watch flow (offer sheet → session → verify → reward); if no sponsor is attached, the tap opens the creator's content catalog. Long-pressing triggers the "Hold Love" gesture — a monetized connection action that tips or subscribes. The chip uses Picture 2's glass design language (`rgba(7,7,9,0.42)`, `backdrop-filter: blur(10px)`) to remain visible without competing with media content.

## System Description
The Out-Profile chip is implemented as the `OutProfileChip` React component (`OutProfileChip.tsx`), accepting props for `name`, `location`, `avatarInitials`, `avatarUrl`, `onPress`, `isFollowing`, `followLoading`, `onFollowToggle`, and `showFollow`. The chip renders as either a `<button>` (when `onPress` is provided) or a `<div>`, always positioned absolutely at `bottom: 82px; left: 16px` within the immersive screen. The chip contains a circular avatar (36px, with fallback to initials), creator name in semibold 11px, location in 9px muted text, and an optional sponsor badge ("Sponsored · [Brand]") that appears for campaign-linked content. The `outProfileEngine.ts` module handles tap routing logic: it inspects the current content item's metadata for `sponsoredOfferId` and routes accordingly. The sponsored path opens an offer sheet (bottom drawer) showing campaign name, requirements, and a CTA to start the watch session — this routes directly into Loop 1 without a page navigation. The organic path opens a creator teaser card (dashed-border overlay) previewing the creator's catalog, with full creator feed as a roadmap feature. The identity triad principle is enforced at the design-system level: Elo occupies the center zone, Out-Profile occupies bottom-left, and In-Profile occupies the Profile tab — these three identity surfaces are never conflated or co-positioned. The Out-Profile chip supports a follow toggle button that appears contextually, with `aria-pressed` state and loading indicator.

## Technical Components
- `OutProfileChip.tsx` React component with typed Props interface
- Glass capsule styling: `background: rgba(7,7,9,0.42)`, `backdrop-filter: blur(10px)`, `border: 0.5px solid rgba(255,255,255,0.14)`, `border-radius: 16px`
- Avatar: 36px circle with image or initials fallback
- Name: 11px semibold, `letter-spacing: 0.04em`
- Location: 9px muted text
- Sponsor badge: conditional amber badge with `rgba(245,158,11,0.12)` background
- Tap action engine (`outProfileEngine.ts`): routes to sponsored offer sheet or creator catalog based on content metadata
- Offer sheet: bottom-drawer UI with campaign name, description, and CTA button
- Hold Love gesture: long-press handler for monetized creator connection (tip/subscribe)
- Follow toggle: `aria-pressed` button with loading state, `stopPropagation` on click
- Identity triad enforcement: positional constraints (bottom-left for Out-Profile, center for Elo, tab for In-Profile)
- Ring animation: outer ring with `border: 2px solid` and opacity transition on tap interaction
- Dim layer: full-screen overlay with `rgba(0,0,0,0.35)` that activates on context/tap states

## Data Flow
1. Immersive feed loads media item → Out-Profile chip renders with creator data from content metadata
2. Content metadata checked for `sponsoredOfferId` → chip conditionally shows sponsor badge
3. User taps Out-Profile → `outProfileTapAction` resolves routing based on `sponsoredOfferId` presence
4. **Sponsored path:** Offer sheet slides up → user taps CTA → watch session begins → Loop 1 spine (verify → reward → wallet)
5. **Organic path:** Creator teaser card appears → user can preview creator catalog (full feed is roadmap)
6. User long-presses Out-Profile → Hold Love gesture fires → tip or subscribe action initiated → hCoins credited to creator
7. Creator attribution data feeds 60/30/10 revenue split — Out-Profile is the visible link between content and creator economics
8. Follow toggle updates follow graph → subscription creates notification channel for Loop 2 re-engagement

## User Flow
While scrolling the immersive feed, the user sees full-bleed media with a small glass chip at the bottom-left showing the creator's name and location. On sponsored content, an amber "Sponsored · Nike" badge appears on the chip. Tapping the chip on a sponsored clip opens a slide-up offer sheet: "Nike Running · Pegasus 41" with requirements and a "Start watch session" button — one tap into Loop 1, no page change. Tapping the chip on organic content shows a creator preview card. Long-pressing triggers a hold-to-love gesture with haptic feedback. The creator chip is always visible, always non-intrusive, and always leads to either economic action (sponsored) or discovery (organic).

## Economic Flow
The Out-Profile is the visible supply-side attribution for every piece of content. When a user taps through a sponsored Out-Profile into a watch session, the full Loop 1 economic pipeline activates: the advertiser's campaign budget funds the 60/30/10 split (60% to the creator identified by the Out-Profile, 30% to the viewer reward pool, 10% to the platform). The Hold Love gesture initiates direct creator tipping (hCoins) with zero platform cut. Follow actions feed Loop 2 retention, which indirectly increases Loop 1 frequency. Creator attribution via Out-Profile also feeds the creator tier system — engagement quality through the chip contributes to the creator's quality score.

## Fraud Prevention
- Tap routing is server-validated: `sponsoredOfferId` mapping is verified server-side before offer sheet presentation
- Hold Love gesture has rate limits and minimum account age requirements to prevent tip-farming
- Follow toggle has bot-detection on rapid follow/unfollow patterns
- Sponsored badge cannot be spoofed client-side — sponsor status comes from campaign metadata delivered by Edge Functions
- Creator identity on the chip is immutable per content item — cannot be changed after publish
- Offer sheet CTA initiates a server-tracked session — completion requires full 5-gate POP verification

## Unique Elements
1. Persistent creator identity chip anchored at a fixed position (bottom-left) on every immersive media card, serving as both attribution and economic entry point
2. Context-aware tap routing: same chip action routes to sponsored offer flow or creator catalog based on content metadata
3. Identity triad architecture: three distinct identity zones (Out-Profile = creator, Elo = AI companion, In-Profile = user) that are never conflated
4. Hold Love long-press gesture on the creator chip initiating a monetized connection action (tip/subscribe)
5. Glass-capsule design language preserving full-bleed immersion while maintaining persistent creator credit
6. Sponsor badge as conditional overlay on the creator chip — transparent attribution of paid content at the point of consumption
7. One-tap path from supply-side attribution directly into the attention monetization pipeline (Loop 1)

## Potential Patent Claims
1. An ornamental design for a mobile device display interface comprising a full-bleed media viewport with a floating glass-effect capsule element anchored at the bottom-left, the capsule containing a circular avatar, creator name, location text, and a conditional sponsor attribution badge.
2. A computer-implemented method for routing user interactions with a creator identity element in an immersive media interface, comprising displaying a persistent creator chip over full-screen media, detecting a tap interaction, determining whether the underlying content has an associated sponsored campaign identifier, and routing the interaction to either a sponsored offer presentation or a creator content catalog based on the determination.
3. A graphical user interface for a mobile application comprising three architecturally separated identity zones rendered simultaneously: a creator attribution chip at a first position, an AI companion presence at a second position, and a user profile access point at a third position, wherein the three zones are positionally constrained to never overlap or be confused.
4. A method for initiating a monetized creator connection from an immersive media interface, comprising detecting a long-press gesture on a creator identity element overlaying full-screen media, presenting a monetized action sheet without navigating away from the media viewport, and executing a direct tip or subscription transaction credited to the creator identified by the element.
5. A design patent for a creator identity chip pattern comprising a translucent capsule with backdrop blur, circular avatar, text labels, and conditional badge, positioned in the lower-left quadrant of a full-bleed media viewport.

## Potential Competitors
- TikTok (bottom-left creator handle — navigation only, no economic routing)
- Instagram Reels (bottom-left username — profile navigation only)
- YouTube Shorts (bottom-right avatar — channel page navigation)
- Twitch (top-left streamer name — no immersive media integration)
- Cameo (creator marketplace — but separate app, not in-feed attribution)

## Related Files
- `06_feed_earning_loops/out_profile_explainer.html` — Interactive Out-Profile explainer
- `app/src/components/immersive/OutProfileChip.tsx` — React component implementation
- `06_feed_earning_loops/love_hold_creator_offer_explainer.html` — Hold Love gesture explainer
- `MASTER_BRAIN/CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md` — Picture 2 design law (identity zones)
- `06_feed_earning_loops/iapp_immersive_feed.html` — Full immersive feed prototype
- `06_feed_earning_loops/iapp_feed_screen.html` — Feed screen prototype

## Scores
| Metric | Score (1-10) |
|--------|-------------|
| Priority | 7 |
| Patentability | 8 |
| Business Value | 7 |
