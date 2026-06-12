# Abacus AI — Short Build Prompt for [ i ] (~2K words)

**Use when:** Abacus has a character limit. Paste this single block.  
**Full spec:** `ABACUS_AI_BUILD_PROMPT.md` · **Phased builds:** `ABACUS_AI_BUILD_PROMPT_PHASES.md`

---

```text
BUILD "[ i ]" — a mobile-first Attention Wallet and Media Marketplace prototype.

WHAT IT IS:
[i] turns verified human attention into rewardable value. Users watch sponsored content, pass attention verification, earn iCoins (cash-equivalent), and withdraw/convert/spend. Creators earn 60% of ad value. Viewers get 30% via reward pool. Platform takes 10%. Tagline: "Your attention has value."

CORE LOOP (must work end-to-end):
Watch → Verify → Reward → Wallet → Convert/Withdraw → Repeat

VISUAL LAW — NON-NEGOTIABLE:
DO NOT build a fintech dashboard home. Build Picture 2: full-bleed photo/video with glass overlays.

Phone layout zones:
- CENTER: ELO — frosted glass AI face membrane (companion, not chatbot card)
- TOP: 2px timer progress line
- TOP-RIGHT: REWARD glass pill ("50ic" / "Validating…")
- RIGHT RAIL: 40px glass circles — LIKE, MESSAGE, SHARE, CONTROLS
- BOTTOM-LEFT: OUT-PROFILE chip — creator avatar + "RAFAELO" + "Cape Town"
- BOTTOM: 5-tab dock — FEED · PROMO · CREATE(+) · WALLET · IN-PROFILE

Glass style: rgba(7,7,9,0.42), blur(10px), 0.5px white borders. Dark void #070709.

Fonts: Syne (headings), DM Sans (body), JetBrains Mono (numbers/coins). Dark only.
Colors: iCoins mint #4ade80, vCoins amber #f59e0b.

DEFAULT HOME = Immersive Feed (not wallet dashboard). Wallet opens as glass bottom sheet.

GESTURE BUTTONS (on LIKE):
- Tap = like · Double-tap = save · Triple-tap = boost toast
- Hold 500ms = offer mode · Hold+swipe up = tip vCoins · Hold+swipe down = tip iCoins
- Offer flow: ramp → review sheet → validating pill → settled

CURRENCIES:
- iCoins (i⬡) = cash-equivalent, withdrawable — mint green
- vCoins (v◈) = utility only — amber
- aCoins = attention earned from verified watching
- Show separate ledgers. Never combine i+v in one balance.
- Rewards go PENDING VALIDATION first, not instant available (honesty for investors).

5-GATE VERIFICATION (animated ~550ms each, all must pass):
1 Device valid · 2 Dwell met · 3 Attention ≥70 · 4 Completion · 5 Fraud clean
Then: reward reveal → wallet pending balance updates.

EYE-TRACKING (simulate only):
Consent screen → simulated gaze cursor + attention ring 0–100 → skip option 0.5× reward.
Copy: "Processing stays on your device."

ELO COMPANION:
"Say ELO" pill → tap → mic → face manifests center → glass panel on tap.
Do not replace OUT-PROFILE creator chip.

SCREENS TO BUILD (Phase A — investor demo order):
1 Splash — [ i ] logo, "Your attention has value", tap to continue
2 Immersive Feed — default home, 3–4 clips, swipe up/down, Nike sponsored +2.00ic badge
3 Offer Detail — Nike Pegasus 41, 4:30 watch, +2.00 iCoins, 60/30/10 split preview
4 Camera Consent — allow or skip eye-tracking
5 Active Watch — timer, attention ring ~78, earn counter, gaze cursor sim
6 Verification — 5 gates pass sequentially
7 Reward Reveal — +2.00 iCoins, status PENDING VALIDATION
8 Wallet — iCoins 847, vCoins 1240, pending +2, tx history, Withdraw/Convert CTAs
9 Convert — rCoins→iCoins at trust-tier rate
10 Withdraw Preview — 849ic = $8.49, bank free / instant 1.5%
11 Creator Economics — 60% creator / 30% viewer / 10% platform visual
12 Roadmap — POP proof layer narrative (optional)

MOCK DATA:
User trust tier 2. Creator RAFAELO, Cape Town. Nike Pegasus 41 +2.00 iCoins.
Transactions: pending Nike earn, past survey +5ic, boost -10vc.

TECH:
React+TS+Vite or Next.js. No backend. localStorage for settings. iPhone 375×812.
?presenter=1 = prev/next tour. Banner: "Demo · Mocked data".

DO NOT BUILD:
Real payments, Supabase, live camera, OAuth imports, 26-coin grid, dashboard home, light mode, neumorphic 3D buttons.

SUCCESS: Investor taps through feed → Nike watch → gates → pending reward → wallet → economics in under 3 minutes on iPhone Safari.

Start with Phase A screens 1–8 fully wired. Mobile-first. Immersive glass. Loop 1 complete.
```
