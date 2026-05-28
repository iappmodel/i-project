# [ i ] App — Feature Bible
> Master checklist of every feature in the [ i ] app.
> Claude Code reads this at the start of each session to understand build state.
> Update status as features are built: [ ] = not started, [~] = in progress, [x] = complete.

---

## Build Tracks

Two parallel tracks. Same design system, separate codebases.

| Track | Purpose | Backend | Status |
|---|---|---|---|
| **DEMO** | Investor pitch + personal testing | Mock + optional live spine | 🟢 Loop 1 + immersive shell shipped locally |
| **PRODUCTION** | Full platform build | Supabase cloud (owner) | 🟡 Local spine complete; cloud cutover checklist ready |

---

## Section 01 — Design System

**Track:** Both (shared)
**Priority:** P0 — must complete before any UI work

### Tokens & Variables
- [ ] CSS custom properties (colors, spacing, radius, shadows)
- [ ] Tailwind config extension
- [ ] Dark theme only — no light mode toggle in production

### Typography
- [ ] Syne font loaded and applied to headings
- [ ] DM Sans loaded and applied to body/UI
- [ ] JetBrains Mono loaded and applied to all numbers/amounts
- [ ] Type scale implemented as utility classes

### Components — Primitives
- [~] Neumorphic button (legacy presenter paths; immersive uses glass)
- [~] Neumorphic circular button (toolbar style)
- [~] Card (surface, elevated variants)
- [x] Glass overlay / bottom sheet — `ImmersiveGlassSheet` on immersive feed
- [x] Currency chip (iCoins variant) — wallet sheet + reward badge
- [x] Currency chip (vCoins variant) — wallet sheet
- [x] Earn progress bar
- [x] Attention score ring (SVG animated) — watch-verify
- [x] Badge / pill — vision source badge, reward states
- [~] Avatar (with gradient ring for unseen story)

### Motion
- [ ] Spring easing constants
- [ ] Button press animation
- [ ] Reward moment animation (scale + glow)
- [ ] Coin unlock animation
- [ ] Screen transition system
- [ ] prefers-reduced-motion wrapper

---

## Section 02 — Navigation Architecture

**Track:** Both

### 5-Screen Cross-Navigation
- [ ] Center screen (main feed)
- [ ] Top screen (previous / discover)
- [ ] Bottom screen (next / trending)
- [ ] Left screen (friends content)
- [ ] Right screen (promos / earn)
- [ ] Swipe gesture detection
- [ ] Directional transition animation (slides from swipe direction)
- [ ] Remote control triggers (eye/voice/gesture)

### Bottom Tab Bar
- [x] Feed tab — immersive default (`ImmersiveBottomNav`)
- [x] Earn tab — promo slot + earn flow
- [x] Wallet tab — glass sheet + full wallet escape hatch
- [x] Profile tab — glass sheet + full profile escape hatch
- [~] Safe area clearance (iOS home indicator)
- [x] Active state with indicator
- [ ] Badge for unread notifications

### Full-Screen Content Mode
- [ ] All UI hidden when content is playing
- [ ] Reveal on edge-touch
- [ ] Reveal on long-press
- [ ] Reveal on remote command
- [ ] Auto-hide after 3s of inactivity

---

## Section 03 — Content Feed

**Track:** Both (DEMO = mocked content)

### Stories Bar
- [ ] Horizontal scroll row
- [ ] Circular avatar with gradient ring (unseen state)
- [ ] Seen state (gray ring)
- [ ] Brand verified badge
- [ ] User's own story (+) button
- [ ] Ghost-bubble mode (story bubble appears over currently-watching video)
- [ ] Story viewer (full-screen, tap to advance)

### Topic Filter Bar
- [ ] Horizontal scroll pill row
- [ ] Pills: Friends, Promo, Favorites, Saved, Partial, For You, Explore, iGo, Trending, Music
- [ ] Multi-select: active pills combine feed
- [ ] Active = inner glow, inactive = neutral
- [ ] Drag to reorder
- [ ] Edit mode (remove/add pills)
- [ ] Theme change per active topic (card borders, badge colors, orb bg)

### Mood Sessions
- [ ] Mood selector UI (relaxing, positivity, world news, music, events, recommended, personalized, distressing)
- [ ] Session start flow
- [ ] Mood affects algorithm and visual atmosphere
- [ ] User-created mood option
- [ ] Community mood/playlist discovery

### Video Card
- [ ] Full-screen immersive playback
- [ ] Tap to play/pause
- [ ] Duration badge
- [ ] Live viewer count with red dot
- [ ] Earn progress bar (sponsored only)
- [ ] Zoom / minimize mode
- [ ] Scroll-snap between videos

### Organic Video Interactions
- [x] Configurable gesture buttons (tap/multi-tap/hold/swipe) — see `MASTER_BRAIN/UX/USER_GESTURE_BUTTONS.md`
- [ ] Reactions bar (🔥 😂 😮 👏) with live counts
- [ ] Bookmark button
- [ ] Comments bottom sheet (slide up)
- [ ] Share sheet (grid of destinations)

### Sponsored Video Overlay
- [ ] Watch & earn badge
- [ ] Eye-tracking active indicator (camera icon)
- [ ] Progress ring / bar
- [ ] Ghost action button (appears after watch threshold)
- [ ] Reward reveal animation on completion

### Streak Banner
- [ ] Daily streak counter
- [ ] Streak at risk warning
- [ ] Streak break / reset state

### Feed Polls & Quizzes
- [ ] Poll card with animated percentage bars on vote
- [ ] Quiz card with correct/incorrect reveal

---

## Section 04 — Eye-Tracking & Remote Control

**Track:** DEMO (simulated) / PRODUCTION (native)

### Simulation Layer (DEMO)
- [ ] Simulated gaze cursor
- [ ] Attention score oscillation (realistic, not perfect)
- [ ] 6-stage depth classification display
- [ ] Dwell progress ring
- [ ] Remote control command grid (tap to trigger)

### Native Layer (PRODUCTION)
- [ ] iOS: ARKit face tracking integration
- [ ] iOS: JSI bridge to React Native
- [ ] Android: MediaPipe face mesh integration
- [ ] Android: Kotlin TurboModule
- [ ] On-device only — no gaze data transmitted
- [ ] Consent UI (transparent camera notice before activation)
- [ ] Dwell threshold calibration per content type

### Attention Score Engine
- [ ] Composite score calculation (gaze + dwell + facial + interaction)
- [ ] Score → reward eligibility mapping
- [ ] Per-impression score stored for advertiser reporting
- [ ] Attention timeline (rolling chart)

### Remote Control Commands
- [ ] Gaze dwell command mapping
- [ ] Eye gesture shortcuts
- [ ] Voice command integration ("say 'reels mode'")
- [ ] Face gesture triggers
- [ ] Toolbar reveal/hide via remote command

---

## Section 05 — Currency System

**Track:** DEMO (visual only) / PRODUCTION (full logic)

### Wallet State (4-state model)
- [ ] Available balance display (iCoins)
- [ ] Available balance display (vCoins)
- [ ] Pending balance display
- [ ] Restricted balance display
- [ ] Lifetime earned display (read-only)

### Coin Unlock Flow
- [ ] Day 1 coins shown (aCoins, iCoins, vCoins)
- [ ] Progressive unlock trigger system
- [ ] Coin unlock micro-interaction (scale + glow + tagline + "Later" skip)
- [ ] Coin collection display (all unlocked coins grid)

### The Wheel Button
- [ ] Scroll up → vCoins earn animation
- [ ] Scroll down → iCoins earn animation
- [ ] Heart tap → dual coin earn
- [ ] Inertia physics on scroll
- [ ] Fraud detection integration (mechanical scroll flag)
- [ ] Coin counter animation (+1 pop)

### Conversion Interface
- [ ] rCoins → iCoins conversion UI
- [ ] Rate display (trust-tier-adjusted)
- [ ] Confirmation step before conversion
- [ ] iCoins → bCoins burn UI (irreversible warning)

---

## Section 06 — Wallet

**Track:** Both

### Dashboard
- [ ] iCoins balance card (primary)
- [ ] vCoins balance card (secondary)
- [ ] Pending balance indicator
- [ ] Total lifetime earned (read-only)
- [ ] Balance ring chart (available vs pending)

### Quick Actions
- [ ] Withdraw button → payout flow
- [ ] Transfer button → send to another user
- [ ] Exchange button → conversion UI
- [ ] Promote button → boost content with vCoins

### Transaction History
- [ ] Chronological list
- [ ] Filter chips (All, Earned, Spent, Pending)
- [ ] Transaction type icons
- [ ] Status tags (complete, pending, restricted, failed)
- [ ] Load more pagination

### Payout Flow
- [ ] Method selection (Bank, PayPal, Gift Card, Crypto)
- [ ] Amount entry
- [ ] Fee breakdown
- [ ] KYC gate (if first payout)
- [ ] Confirmation
- [ ] Success state

### Analytics Panel
- [ ] Weekly earnings bar chart
- [ ] Earning by source breakdown
- [ ] Top earning content list
- [ ] Campaign progress trackers
- [ ] Streak multiplier display

---

## Section 07 — Earn Marketplace

**Track:** Both

### Marketplace Feed
- [ ] Balance strip (iCoins / pending / vCoins)
- [ ] Featured hero offer card
- [ ] Category filter pills
- [ ] Offer card list (tiered: instant vs conditional)

### Offer Types
- [ ] Watch & verify (sponsored video)
- [ ] Survey / quiz task
- [ ] GPS check-in campaign
- [ ] Follow / action task (instant reward)
- [ ] Follow / action task (conditional / pending reward)
- [ ] Community playlist (earn route)

### 5-Gate Watch Flow
- [ ] Offer detail screen
- [ ] Consent screen (camera notice for eye-tracked offers)
- [ ] Active video with progress tracking
- [ ] Reward tick-up animation
- [ ] Wallet confirmation screen

### GPS Campaign Flow
- [ ] Map view with campaign markers
- [ ] Location pulse animation
- [ ] Check-in verification
- [ ] Verified state
- [ ] Reward release → wallet

### Pending Hold Cards (Wallet)
- [ ] Expandable step-by-step hold card
- [ ] Urgency timer
- [ ] Status per step
- [ ] Claim button when ready

### Earning Routes
- [ ] Community-created best routes
- [ ] Route detail (ordered step list)
- [ ] Estimated earnings display
- [ ] "Best route for $100/day" style curation

---

## Section 08 — Creator Economy

**Track:** PRODUCTION only

### Creator Profile
- [ ] Tier badge (Newcomer / Rising / Established / Signature)
- [ ] Quality engagement score display
- [ ] Lifetime earnings breakdown
- [ ] Audience stats (engaged, not follower count)

### Revenue Dashboard
- [ ] Ad revenue share (CPM display)
- [ ] Direct tips received
- [ ] Subscription revenue
- [ ] Brand deal earnings

### Tipping Flow
- [ ] Tip button on content
- [ ] Tier selection (Coffee / Support / Super Fan / Custom)
- [ ] Confirmation
- [ ] Creator notification

### Subscription Badges
- [ ] Fan tier ($)
- [ ] Super Fan tier ($$)
- [ ] Patron tier ($$$)
- [ ] Subscriber badge next to name in comments

---

## Section 09 — Campaign Builder (Brand Side)

**Track:** PRODUCTION only

### Campaign Creation Flow (5 steps)
- [ ] Step 1: Media upload / Studio editor trigger
- [ ] Step 2: Action button config (Follow / I'm Going! / Shop Now / Custom)
- [ ] Step 3: Reward type + amount + currency
- [ ] Step 4: Watch threshold slider
- [ ] Step 5: Schedule + budget

### Conditions Engine
- [ ] Visual block-based condition builder
- [ ] Drag-to-reorder condition blocks
- [ ] Condition types: watch duration, GPS, action click, survey complete
- [ ] Preview of user-side hold card

### Live Preview Panel
- [ ] Feed card preview
- [ ] In-video ghost button preview
- [ ] Reward confirmation preview

### Studio Editor
- [ ] Multi-layer timeline
- [ ] Bottom toolbar: Trim, Split, Filter, Text, Sticker, Music, Speed, Transition, Voiceover, Crop, Captions
- [ ] Live preview window
- [ ] Export → routes back to campaign builder

---

## Section 10 — Customizable UI Layer

**Track:** Both

### Floating Action Buttons
- [ ] 6 buttons: Wallet, Profile, Like, Comment, Share, Settings
- [ ] Hidden by default
- [ ] Reveal triggers: edge-touch, long-press, remote command
- [ ] Drag to reposition (any screen position)
- [ ] Position persistence per user

### Toolbar / Filter Bar
- [ ] Drag to any corner
- [ ] Horizontal / vertical orientation toggle
- [ ] Hide completely option
- [ ] Reveal via voice / eye / gesture

### Creator Mode Feed Builder
- [ ] Step 1: Name + icon picker
- [ ] Step 2: Block selector (drag to reorder, 8 block types)
- [ ] Step 3: Live feed preview
- [ ] Step 4: Publish with privacy options (public / friends / private)
- [ ] Shareable link generation

### Reels View
- [ ] Full-screen toggle from toolbar
- [ ] Scroll-snap navigation
- [ ] Side action rail (like, reply, save, share, view count)
- [ ] Progress bars at top
- [ ] Keyboard navigation (↑↓, Escape)
- [ ] Grid-to-reels transition

---

## Section 11 — Trust & Anti-Abuse

**Track:** PRODUCTION only

### Trust Score
- [ ] Score display in profile (hidden from other users)
- [ ] Score history chart
- [ ] Tier indicator

### Behavioral Fingerprinting
- [ ] Scroll pattern analysis
- [ ] Tap timing analysis
- [ ] Eye movement pattern baseline

### Enforcement
- [ ] Strike 1: Warning + 24hr reward freeze
- [ ] Strike 2: 7-day suspension + forfeiture
- [ ] Strike 3: Permanent ban + device blacklist
- [ ] Appeals flow

### KYC Integration
- [ ] ID verification gate (first payout)
- [ ] Tax form gate ($100+/month)
- [ ] Phone + email gate (Level 4+ creator)

---

## Section 12 — Onboarding

**Track:** Both

### Progressive Trust Flow
- [ ] Welcome screen ([ i ] identity, value proposition)
- [ ] Account creation (Supabase Auth in PROD, mocked in DEMO)
- [ ] First 3 coins introduction (aCoins, iCoins, vCoins)
- [ ] Wheel button tutorial
- [ ] First earn moment (guided)
- [ ] Trust score introduction
- [ ] Eye-tracking consent (optional, skippable)
- [ ] Profile setup

---

## Section 13 — Cross-Platform Integration

**Track:** PRODUCTION only

- [ ] Instagram content import
- [ ] TikTok content import
- [ ] YouTube content import
- [ ] Tiered reward mapping (imported vs native)
- [ ] Content ownership verification
- [ ] oCoins provenance tagging
- [ ] xCoins bridge UI (Trust Tier 4 gate)
- [ ] ωCoins external reputation display

---

## Section 14 — Analytics & Reporting

**Track:** PRODUCTION only

### User-facing
- [ ] Attention timeline (rolling chart)
- [ ] Earning insights dashboard
- [ ] Content performance stats

### Advertiser-facing
- [ ] Impression quality score
- [ ] Attention depth distribution
- [ ] Campaign ROI dashboard
- [ ] CSV export

---

## Section 15 — Investor Demo Spec

**Track:** DEMO only
**Purpose:** Show investors + personal testing. No backend, fully mocked.

### Demo Narrative Flow (order matters)

1. **Splash / identity** — `[ i ]` logo, tagline, dark luxury aesthetic
2. **Feed** — 3–4 mocked content cards, one sponsored with earn badge
3. **Sponsored watch flow** — eye-tracking simulation, attention score, reward reveal
4. **Wallet** — iCoins + vCoins balances, pending holds, transaction history
5. **Earn marketplace** — 3 offer types visible (watch, survey, GPS)
6. **The wheel button** — interactive demo of scroll mechanic
7. **Currency overview** — visual of the coin ecosystem (top 6 coins)
8. **Creator economy** — revenue split visualization
9. **Trust score** — brief trust tier display

### Demo Requirements
- [ ] Zero backend dependencies
- [ ] All data hardcoded / mocked with realistic values
- [ ] Deployable to Vercel/Netlify as static site in < 5 minutes
- [ ] Works on iPhone (investor might want to tap through on their phone)
- [ ] Demo mode banner (subtle — "investor preview")
- [ ] Presenter mode: guided flow with next/back navigation
- [ ] Free exploration mode: full app navigation available
- [ ] Never crashes, never shows loading states (all instant)
