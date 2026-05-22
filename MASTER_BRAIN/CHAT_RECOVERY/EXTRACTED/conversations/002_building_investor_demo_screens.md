# P0-002: Building Investor Demo Screens

**Extraction batch:** P0 Batch 01  
**Extracted:** 2026-05-21

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `92aa5e9e-5852-4056-873f-2955dfd2651f` |
| Title | Building investor demo screens |
| Date created | 2026-04-08 |
| Date updated | 2026-04-09 |
| Raw path | `…/conversations.json#92aa5e9e-5852-4056-873f-2955dfd2651f` |
| Messages | 4 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 201 | P0 | Investor Demo, Economy, Attention, Wallet, Trust |

---

## 3. Project-Specific Summary

Continuation thread building **real content** into an investor demo shell that already had navigation, "Investor Preview" badge, and placeholder stubs. Claude implemented all four primary tabs (Feed, Watch Flow, Earn, Wallet, Profile) as a **single-file HTML artifact**, then extended with deploy packaging (`vercel.json`, mobile viewport, wheel button, expanded coin grid).

---

## 4. Extracted Decisions

| ID | Decision |
|----|----------|
| D-002-01 | Investor demo = **4 bottom tabs**: Feed, Earn, Wallet, Profile |
| D-002-02 | Reward flow ends by **auto-switching to Wallet tab** so investors see balance update |
| D-002-03 | Watch flow: **30-second simulated watch**, attention score ring, **5 verification gates** |
| D-002-04 | Profile shows **9-coin grid** (a/i/v/f/e/s/b/c + xCoins locked at T4) |
| D-002-05 | Revenue visualization: **60/30/10 split** with competitor comparison copy |
| D-002-06 | Deploy via Vercel CLI or Netlify Drop — single `public/` folder |

---

## 5. Extracted Feature/System Concepts

**Feed**
- Stories bar, topic pills
- 2 organic + 2 sponsored cards (Oura earn badge, Notion vCoins reward)
- "Watch & Earn" triggers full watch flow

**Watch Flow**
- Eye-tracking active indicator
- Attention score ring (0–100, real-time animation)
- Progress bar over ~30 simulated seconds
- Reward counter to ~$1.50 (iCoins)
- Reward reveal screen

**Earn**
- Balance strip (iCoins + vCoins separate)
- 4 offer types: Watch, Survey, GPS, Watch (duplicate label in export)
- GPS card with pulsing location animation
- Featured Spotify offer

**Wallet**
- iCoins and vCoins cards with glow
- Quick actions: Withdraw / Transfer / Exchange
- Transaction history (7–8 entries): earn, spend, pending, withdraw states
- Filter chips on history

**Profile**
- Tier 3 badge, 23-day streak, verified
- Trust score bar with tier progression
- 60/30/10 revenue split visualization
- Coin grid: 5 unlocked, xCoins locked at T4 (later extended to 9 coins)

**Wheel button**
- Tap counter animation on Feed; wheelCount persists, resets after 2s

**Verification gates (reward overlay)**
- Device / Dwell / Gaze / Complete / Fraud

---

## 6. Extracted UX/Design Ideas

- Sticky headers, 52px top padding for notch clearance
- `<meta viewport>` — no pinch-zoom, iPhone-first
- Creator comparison copy: "6× more than Instagram, 4× more than TikTok"
- Glass effect on Investor Preview badge

---

## 7. Extracted Technical Architecture Ideas

- Single-file HTML, zero build step, Vercel-ready
- `vercel.json` for SPA routing
- No backend; all balances mocked client-side

---

## 8. Extracted Economy/Currency Ideas

- Dual display: iCoins (cash) + vCoins (utility) always separate
- Sponsored actions earn iCoins; organic may earn vCoins
- xCoins gated at Trust Tier 4

---

## 9. Extracted Investor/Demo Ideas

- Pre-signed demo user; instant interactions
- QR → mobile Safari demo path referenced in related threads
- Presenter can screenshot any screen for follow-up

---

## 10. Conflicts with Current Masterbrain

| Topic | Chat | SoT | Verdict |
|-------|------|-----|---------|
| Instant balance credit | Reward flow auto-updates wallet instantly | Wallet should show pending/restricted states | **Demo simplification** — conflicts with POPS pending narrative |
| Coin names in grid | a/i/v/f/e/s/b/c + xCoins | aCoins, iCoins, vCoins, eCoins, oCoins | **Partial alignment** — letter coins match alphabet taxonomy, not SoT 5-currency MVP |
| 5 gates | Device/Dwell/Gaze/Complete/Fraud | Verification may use dwell, interaction, device, eye-tracking, behavioral | **Aligns conceptually** |

---

## 11. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| 4-tab investor demo screen map | `INVESTOR_DEMO/DEMO_PATHS_AND_FLOWS.md` |
| 5-gate verification overlay labels | `ATTENTION_SYSTEM/VERIFICATION_AND_VISION.md` |
| Watch flow timing (30s sim) | Demo spec appendix |
| Post-reward wallet tab switch | Investor demo UX pattern |

---

## 12. Preserve-Only Notes

- Deploy command examples (`vercel deploy public/ --prod`)
- Netlify Drop drag-and-drop workflow

---

## 13. Obsolete Notes

- None significant — short, focused thread

---

## 14. Follow-Up Extraction Targets

- Conv `657f7995` — extends to 9-step presenter flow
- Conv `bc45f099` — "Building a functional investor demo with core features" (P0 rank 30)
- Locate deployed artifact matching this build at IVAULT demos or Vercel
