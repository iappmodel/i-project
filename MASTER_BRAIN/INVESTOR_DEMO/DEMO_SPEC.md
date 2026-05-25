# [ i ] App — Investor Demo Spec
> The complete specification for the investor-facing demo build.
> This is a separate product from the production app.
> No backend. No auth. No Supabase. Fully mocked. Instantly deployable.

---

## 1. Purpose

The investor demo serves three audiences:

1. **Investors** — see the product vision, feel the UX, understand the business model
2. **Personal testing** — validate design decisions before building in production
3. **Design iteration** — fast feedback loop, change anything without breaking real data

---

## 2. Technical Constraints

| Constraint | Rule |
|---|---|
| Backend | None. Zero. All data hardcoded. |
| Auth | Mocked. Pre-signed-in as "Alex Rivera" |
| Currency | Hardcoded balances that animate on interaction |
| Loading states | Forbidden. All transitions instant. |
| Crashes | Forbidden. Every tap must resolve. |
| Dependencies | Minimal. React + Tailwind + Framer Motion. No Supabase, no API calls. |
| Deploy | Single command. Static build to Vercel or Netlify. |
| Mobile | Must work perfectly on iPhone 14 / modern Android in browser. |

---

## 3. Mocked User Profile

```js
const DEMO_USER = {
  name: "Alex Rivera",
  handle: "@alexrivera",
  avatar: null, // use generated gradient avatar
  verified: true,
  trustTier: 3,
  trustScore: 74,
  memberSince: "March 2025",
  streak: 23, // days

  // Wallet state
  iCoins: {
    available: 1247.50,
    pending: 83.20,
    restricted: 0,
    lifetime: 4891.00,
  },
  vCoins: {
    available: 8340,
    pending: 250,
    lifetime: 31200,
  },

  // Creator stats
  creatorTier: "Rising",
  totalViews: 142000,
  engagementScore: 71,
}
```

---

## 4. Demo Narrative — Presenter Mode

The guided flow for walking an investor through the product.
Each step has a screen, a talking point, and a key interaction to demonstrate.

### Step 1 — Identity & Hook (Splash)
**Screen:** `[ i ]` logo splash
**Talking point:** "This is [ i ] — the world's first attention wallet. We pay users for their genuine attention. Not clicks. Not likes. Real, verified, human attention."
**Key interaction:** Tap to enter → logo animates in, tagline fades up

---

### Step 2 — The Feed (Why it's different)
**Screen:** Main feed with 3 content cards
**Talking point:** "The feed looks familiar — but look at this card. That's a sponsored video with a real dollar amount attached. Watch it fully, pass the eye-tracking check, earn the reward. This is how attention becomes currency."
**Key interaction:** Scroll through cards, sponsored card shows earn badge and progress bar

**Mocked content:**
```js
const DEMO_FEED = [
  {
    id: 1,
    type: 'organic',
    creator: '@maya.creates',
    creatorVerified: true,
    caption: 'New collection dropping this weekend ✨',
    likes: 4821,
    comments: 203,
    thumbnail: 'gradient-purple', // generated gradient
  },
  {
    id: 2,
    type: 'sponsored',
    brand: 'Oura Ring',
    campaign: 'Sleep Better. Live More.',
    reward: { amount: 1.50, currency: 'iCoins' },
    watchRequired: 30, // seconds
    eyeTrackingRequired: true,
    thumbnail: 'gradient-teal',
  },
  {
    id: 3,
    type: 'organic',
    creator: '@chef.kai',
    creatorVerified: false,
    caption: 'The ramen recipe you\'ve been asking for',
    likes: 9102,
    comments: 876,
    thumbnail: 'gradient-amber',
  },
  {
    id: 4,
    type: 'sponsored',
    brand: 'Notion',
    campaign: 'Your second brain, organized.',
    reward: { amount: 320, currency: 'vCoins' },
    watchRequired: 20,
    eyeTrackingRequired: false,
    thumbnail: 'gradient-slate',
  },
]
```

---

### Step 3 — The Watch & Earn Flow (The core loop)
**Screen:** Sponsored video → eye-tracking → reward
**Talking point:** "Here's what happens when you tap on a sponsored video. The camera activates — with explicit consent — and we verify whether the user is actually watching. Not just scrolling past. Actually watching. When they complete the video with sufficient attention: they earn."
**Key interaction:** Tap sponsored card → watch flow → attention ring fills → reward animation

**Flow screens:**
1. Offer detail (brand, reward amount, watch time required, consent toggle)
2. Active video (camera icon active, attention score animating, progress bar filling)
3. Reward reveal (coin burst animation, "+$1.50 iCoins" counter animation)
4. Wallet update (balance increments with glow)

---

### Step 4 — The Wallet (The business model)
**Screen:** Wallet tab
**Talking point:** "Every dollar of attention earned lives here. iCoins are real — they're withdrawable to your bank account. vCoins are platform credits you spend on features. Two separate economies, one seamless wallet."
**Key interaction:** Show iCoins balance, tap Withdraw, show payout method selection

**Demo wallet animations:**
- iCoins balance pulses softly with `--glow-icoin`
- Pending balance shows "83.20 pending" with amber indicator
- Tap transaction → slide up detail sheet

---

### Step 5 — The Earn Marketplace (Scale of opportunity)
**Screen:** Earn tab
**Talking point:** "Beyond the feed, there's an earn marketplace. Surveys. Location-based campaigns. Brand challenges. We're not competing with social media — we're building the layer underneath it, where attention is priced and rewarded."
**Key interaction:** Show 3 offer types, tap GPS campaign to show location pulse animation

**Mocked offers:**
```js
const DEMO_OFFERS = [
  {
    id: 1,
    type: 'watch',
    brand: 'Spotify',
    title: 'Discover Weekly – New Feature',
    reward: { amount: 2.00, currency: 'iCoins' },
    timeRequired: '45 sec',
    eyeTracked: true,
  },
  {
    id: 2,
    type: 'survey',
    brand: 'Nike Research',
    title: 'Athletic footwear preferences',
    reward: { amount: 500, currency: 'vCoins' },
    timeRequired: '3 min',
    eyeTracked: false,
  },
  {
    id: 3,
    type: 'gps',
    brand: 'Blue Bottle Coffee',
    title: 'Visit any Blue Bottle today',
    reward: { amount: 5.00, currency: 'iCoins' },
    timeRequired: 'In person',
    eyeTracked: false,
    location: { lat: 40.7128, lng: -74.0060 },
  },
]
```

---

### Step 6 — The Wheel Button (The signature mechanic)
**Screen:** Feed with wheel button visible
**Talking point:** "This is the wheel. Scroll up — earn vCoins. Scroll down — earn iCoins. Tap the heart — earn both. It's an intuitive interaction that makes every moment of engagement feel rewarding."
**Key interaction:** Live wheel interaction with coin counter animation

---

### Step 7 — The Economy (The big picture)
**Screen:** Currency overview visualization
**Talking point:** "The [ i ] economy has 26 coin types organized into tiers. Most users only see 3 at first. More unlock as they earn trust. It's a loyalty system, a governance layer, and a creator economy all at once."
**Key interaction:** Coin grid with tap to expand each coin's description

---

### Step 8 — Creator Split (Why creators choose [ i ])
**Screen:** Creator revenue visualization
**Talking point:** "Every sponsored impression splits automatically: 60% to the creator, 30% to the viewer reward pool, 10% to the platform. We don't take 45% like other platforms. We take 10%. Because an attention marketplace only works if creators stay."
**Key interaction:** Animated pie/flow chart showing the split

---

### Step 9 — Trust Score (The moat)
**Screen:** Trust tier display
**Talking point:** "Every account has a trust score. Higher trust unlocks faster payouts, better conversion rates, and premium features. This is the anti-gaming layer — and it's also the retention layer. Your trust score is your reputation. You don't abandon it."
**Key interaction:** Show tier progression from 1 to 4 with unlocks per tier

---

## 5. Free Exploration Mode

After the guided flow, investors can explore freely. Every screen must be reachable. Every interaction must work. No dead ends.

**Navigation available:**
- All 5 cross-navigation screens (swipe or button)
- All 4 bottom tabs
- Wallet full detail
- Profile screen
- Settings (visual only, no real changes)

---

## 6. Demo UI Requirements

### Demo Mode Banner
```
Position: top-right, absolute
Text: "Investor Preview"
Style: 10px DM Sans, --text-muted color, subtle border, low opacity (0.5)
Behavior: Always visible, never interactive
```

### Presenter Controls (hidden by default)
```
Trigger: Triple-tap the [ i ] logo
Shows: Step navigation (← Step 3 of 9 →) + "Reset Demo" button
Purpose: Presenter can jump to any step during a pitch
```

### Reset Demo Button
```
Returns all balances to initial values
Clears any interaction state
Returns to Step 1 splash
```

---

## 7. Mocked Transactions (Wallet History)

```js
const DEMO_TRANSACTIONS = [
  { id: 1, type: 'earn',    coin: 'iCoins', amount: +1.50, source: 'Oura Ring campaign',      time: '2 min ago',   status: 'complete' },
  { id: 2, type: 'earn',    coin: 'vCoins', amount: +320,  source: 'Notion campaign',          time: '18 min ago',  status: 'complete' },
  { id: 3, type: 'pending', coin: 'iCoins', amount: +5.00, source: 'Blue Bottle GPS check-in', time: '1 hr ago',    status: 'pending'  },
  { id: 4, type: 'earn',    coin: 'iCoins', amount: +2.00, source: 'Spotify survey',            time: '3 hrs ago',   status: 'complete' },
  { id: 5, type: 'spend',   coin: 'vCoins', amount: -200,  source: 'Content boost',             time: 'Yesterday',   status: 'complete' },
  { id: 6, type: 'earn',    coin: 'iCoins', amount: +0.75, source: 'Nike Research survey',      time: 'Yesterday',   status: 'complete' },
  { id: 7, type: 'withdraw',coin: 'iCoins', amount: -50.00,source: 'Bank transfer',             time: '3 days ago',  status: 'complete' },
  { id: 8, type: 'earn',    coin: 'iCoins', amount: +3.25, source: 'Apple campaign',            time: '4 days ago',  status: 'complete' },
]
```

---

## 8. Build Checklist

- [ ] Splash screen with animated `[ i ]` logo
- [ ] Feed with 4 mocked content cards (2 organic, 2 sponsored)
- [ ] Sponsored watch flow (5 screens, fully animated)
- [ ] Wallet tab (balances, transaction history, withdraw modal)
- [ ] Earn marketplace (3 offer types, GPS flow)
- [ ] Wheel button (interactive, coin counter)
- [ ] Currency overview screen (coin grid)
- [ ] Creator split visualization
- [ ] Trust tier progression display
- [ ] Profile screen (mocked user)
- [ ] Presenter mode (step navigation, reset button)
- [ ] Demo mode banner
- [ ] Responsive: works on 390px mobile in browser
- [ ] Deployed to Vercel/Netlify with shareable URL
- [ ] Tested on iPhone (Safari)
- [ ] All interactions feel instant (zero loading states)
