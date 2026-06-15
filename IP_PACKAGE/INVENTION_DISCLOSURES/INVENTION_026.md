# INVENTION_026 — Glass Immersive Feed Shell (Design Patent)

**Inventor:** Marcelo Silva
**Category:** Design Patent
**Family:** Immersive UI Design
**Date:** 2026-06-15

## Problem Solved

Mobile media consumption apps face a tension between full-screen immersive content and functional UI controls. Existing approaches either overlay opaque chrome that blocks content (Instagram Stories controls) or hide controls entirely requiring discovery gestures (some video players). No existing design achieves a glass-morphism overlay system that simultaneously displays full-bleed media, floating transparent controls, economy state indicators, and a five-tab navigation dock while maintaining visual hierarchy and content primacy.

## Current Industry Approach

TikTok uses semi-transparent overlays with fixed button positions on a dark-scrim right rail. Instagram Reels uses opaque icon buttons with text labels overlaid on content. YouTube Shorts uses a similar pattern with larger touch targets. None of these platforms integrate an attention economy layer (timer, reward indicator, coin state) into the immersive shell, and none use true glass-morphism with backdrop blur as the primary control surface language. Fintech and wallet apps (Cash App, Venmo) use standard card-based dashboard layouts with no immersive media capability.

## How [ i ] Solves It

The [ i ] Glass Immersive Feed Shell is a distinctive visual design system that treats the entire viewport as a full-bleed media canvas with all controls rendered as glass-morphism floating elements. The design establishes a specific spatial grammar: a timer progress line at top, a reward coin pill at top-right, gesture-mapped action buttons in a right-side vertical stack, an out-profile card at bottom-left, and a five-tab navigation dock at the bottom. Every overlay element uses `rgba(7,7,9,0.42)` with `backdrop-filter: blur(8px)` and thin white borders, creating a cohesive "looking through frosted glass" aesthetic that keeps controls visible without competing with media content. This is the canonical product surface — explicitly NOT the fintech dashboard pattern.

## System Description

The Glass Immersive Feed Shell defines a complete visual architecture for an attention-economy media application. The shell occupies the full device viewport with zero padding on the media layer (`phone-screen--immersive`). Overlaid on the media are five distinct UI zones, each implemented as glass-morphism elements. The **top zone** contains a full-width 2px progress line (TIMER) showing attention session duration, and a glass pill at top-right (REWARD) displaying the current earning state (e.g., "50ic" in idle, mint glow during review, "Validating..." during POP check, fade on settlement). The **right stack** contains 40px glass circles arranged vertically: LIKE/LOVE (with gesture engine integration), MESSAGE, SHARE, and CONTROLS. Each button is a frosted glass circle with thin white border and icon, supporting the gesture vocabulary (tap, double-tap, triple-tap, hold, swipe). The **bottom-left zone** displays the OUT-PROFILE card: the content creator's avatar, name (e.g., "RAFAELO"), and location ("Cape Town") stacked vertically on a glass backdrop. The **bottom dock** is a five-tab bar with a light soft-UI aesthetic and a raised center `+` (CREATE) button: FEED, PROMO, CREATE, WALLET, IN-PROFILE. The center companion presence (ELO) occupies the center of the screen as a transparent face membrane. The glass material specification uses exactly `rgba(7,7,9,0.42)` background with `backdrop-filter: blur(8px)` for all overlay elements, with `rgba(255,255,255,0.08)` borders. Soft scrims replace hard shadows. The design explicitly rejects: AppShell titlebars on immersive routes, SourceEvidence footers on product screens, card-list feeds as home, neumorphic heavy shadows, and fintech dashboard patterns as the primary UX.

## Technical Components

- `IMMERSIVE_UI_DESIGN_LAW.md` — Canonical design specification document
- `app_immersive.html` — Full HTML/CSS prototype of the glass immersive shell
- `ImmersiveFeedScreen.tsx` — React implementation of the full-bleed feed shell
- `gesture-buttons.css` — Glass material styles for the action button rail
- `iapp_immersive_feed.html` — Reference HTML prototype with all five zones
- Glass material token: `rgba(7,7,9,0.42)` + `backdrop-filter: blur(8px)`
- Border token: `rgba(255,255,255,0.08)` thin borders
- 5-tab dock: Feed, Promo, Create (+), Wallet, In-Profile
- Timer line: 2px full-width progress bar
- Reward pill: Glass pill with state transitions (idle → review → validating → settled)
- Out-Profile card: Creator avatar + name + location on glass backdrop
- Right action rail: 40px glass circles in vertical stack

## Data Flow

1. App launches → routes to `immersive-feed` (not card feed or wallet dashboard).
2. Full-bleed media loads as background layer; all UI elements render as glass overlays.
3. Timer line begins tracking attention session duration.
4. Reward pill displays current earning potential based on content reward configuration.
5. User interacts with glass action buttons (like, share, message, controls) via gesture vocabulary.
6. Out-Profile card displays the current content creator's identity.
7. Bottom dock enables navigation between Feed, Promo, Create, Wallet, and Profile.
8. Wallet opens as an overlay/sheet from the dock — not as a full-screen dashboard replacement.
9. POP verification state transitions are reflected in the reward pill's visual states.

## User Flow

The user opens [ i ] and immediately sees a full-screen piece of media content — a video or image that fills the entire viewport. Floating on top of this content, they see glass-frosted controls: a subtle timer line at the top tracking their attention session, a small coin indicator showing what they can earn, action buttons on the right side for liking/sharing/messaging, the content creator's name and location at the bottom-left, and a clean five-tab navigation bar at the bottom. Everything feels like looking through frosted glass at the content beneath. The user taps the heart button (glass circle, 40px) to like, holds to enter offer mode, or taps the bottom dock to navigate. The Wallet tab opens as a glass sheet overlay rather than navigating away from the immersive context.

## Economic Flow

The glass shell integrates economy state directly into the immersive experience through the reward pill and timer line. The reward pill shows earning potential in real-time (e.g., "50ic"), creating constant awareness of attention value without interrupting content consumption. The timer line visualizes the attention session that the POP system is verifying, making the earning process transparent. Gesture buttons (like, boost, tip) trigger economy actions through the same glass interface. This integration means the user never leaves the immersive content experience to interact with the attention economy — earning and spending happen within the glass overlay layer.

## Fraud Prevention

- Glass overlay design keeps all economy indicators visible, preventing UI spoofing through hidden elements.
- Timer line is driven by server-side POP session state, not client-side timers.
- Reward pill states (idle → review → validating → settled) reflect actual backend verification pipeline states.
- The explicit rejection of SourceEvidence footers on product screens prevents debug/developer UI from being exposed to users.
- Mode separation (product vs. presenter vs. dev) ensures glass UI integrity in production.

## Unique Elements

1. Complete glass-morphism overlay system for a media consumption + attention economy application, with specific material specification (`rgba(7,7,9,0.42)` + `blur(8px)`) applied consistently across all control surfaces.
2. Spatial grammar placing five distinct functional zones (timer, reward, actions, out-profile, dock) as floating glass elements over full-bleed media content.
3. Reward pill UI component with four visual states (idle, review, validating, settled) that mirrors backend verification pipeline state in real-time.
4. Five-tab dock with raised center CREATE button using light soft-UI aesthetic, distinct from both iOS tab bars and Material bottom navigation.
5. Out-Profile card as a glass-backed creator identity display positioned at bottom-left, introducing a content-creator presence that lives within the immersive shell rather than in a separate screen.

## Potential Patent Claims

1. An ornamental design for a mobile application user interface comprising: a full-bleed media display with a translucent glass-morphism timer bar at the top; a translucent coin reward indicator at the top-right; a vertical stack of translucent circular action buttons on the right side; a translucent creator identity card at the bottom-left; and a five-tab navigation dock with a raised center create button at the bottom.
2. An ornamental design for a glass-morphism control overlay system for a mobile media application, as shown and described.
3. An ornamental design for a reward state indicator comprising a translucent pill-shaped element with four distinct visual states overlaid on media content, as shown and described.

## Potential Competitors

- TikTok (full-screen feed with opaque overlays)
- Instagram Reels (full-screen feed with standard button overlays)
- YouTube Shorts (full-screen vertical video with card-style overlays)
- Snapchat Spotlight (full-screen media with minimal overlays)
- Cash App / Venmo (fintech dashboards, no immersive media)

## Related Files

- `MASTER_BRAIN/CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md`
- `06_feed_earning_loops/app_immersive.html`
- `06_feed_earning_loops/iapp_immersive_feed.html`
- `app/src/screens/ImmersiveFeedScreen.tsx`
- `app/src/styles/gesture-buttons.css`
- `assets/REWARD-*.png`
- `assets/phone-*.png`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 10 |
| Patentability | 9 |
| Business Value | 10 |
