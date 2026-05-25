# [ i ] App — Economy Rules
> The law of the [ i ] economy. Claude Code must treat these rules as immutable constraints.
> Never invent currency logic. Never simplify or merge these rules for convenience.
> All currency mutations go through Edge Functions — never client-side direct DB writes.

---

## 1. The Two Core Currencies

These are the only currencies exposed to the user at the wallet level.
All other coins are internal mechanisms that feed into these two.

| Currency | Symbol | Type | Real-world value | Color |
|---|---|---|---|---|
| **iCoins** | `i⬡` | Cash-equivalent | Yes — withdrawable to USD | Mint green `#4ade80` |
| **vCoins** | `v◈` | Internal utility | No — platform credits only | Amber gold `#f59e0b` |

**Immutable rule:** iCoins and vCoins are separate ledgers. They are never interchangeable in the UI, never displayed as a combined balance, and never transferred between each other directly without going through the rCoins conversion pipeline.

---

## 2. The Full Coin Taxonomy (26 + ω)

### Tier 1 — Core Value
| Coin | Full name | Purpose |
|---|---|---|
| **aCoins** | Attention | Earned by verified watching. The raw attention unit. |
| **iCoins** | Individual | Cash-equivalent. The end destination of all earning. |
| **vCoins** | Victory | Utility credits. Spent on platform features, boosts, unlocks. |

### Tier 2 — Earning Coins
| Coin | Full name | Purpose |
|---|---|---|
| **eCoins** | Engagement | Earned by active interaction (likes, comments, shares). |
| **fCoins** | Focus | Earned by eye-tracking verified deep attention. |
| **wCoins** | Watch | Earned by video completion (non-eye-tracked). |
| **kCoins** | Knowledge | Earned by completing surveys, quizzes, learning tasks. |
| **sCoins** | Streak | Earned by maintaining daily engagement streaks. |

### Tier 3 — Spending / Utility
| Coin | Full name | Purpose |
|---|---|---|
| **bCoins** | Boost | Amplify content reach. Spent to promote posts. |
| **mCoins** | Market | Marketplace currency. Used in the earn marketplace. |
| **uCoins** | Unlock | Gates premium features, content vaults, tools. |
| **pCoins** | Power | Special capability credits (Creator Mode, advanced tools). |

### Tier 4 — Social
| Coin | Full name | Purpose |
|---|---|---|
| **cCoins** | Creator | Earned by content creators from their content performance. |
| **dCoins** | Discovery | Earned when your content is discovered by new users. |
| **hCoins** | Heart | Earned and given through tipping / likes. |
| **lCoins** | Loyalty | Earned by long-term consistent platform use. |
| **nCoins** | Network | Earned by referrals and growing your network. |

### Tier 5 — System / Governance
| Coin | Full name | Purpose |
|---|---|---|
| **gCoins** | Governance | Voting rights. Never tradeable. |
| **tCoins** | Trust | Trust score representation. Never tradeable. |
| **rCoins** | Reward | The conversion hub. All earning flows through here. |
| **qCoins** | Quality | Content quality signal. Affects creator tier. |
| **oCoins** | Origin | Native content provenance tag. |

### Tier 6 — Special / Rare
| Coin | Full name | Purpose |
|---|---|---|
| **zCoins** | Zenith | Highest achievement. Seasonal, never convert. |
| **jCoins** | Jubilee | Event-based celebration rewards. |
| **yCoins** | Yield | Staking / long-term hold rewards. |

### Tier 7 — External
| Coin | Full name | Purpose |
|---|---|---|
| **xCoins** | eXternal | Cross-platform bridge. Unlocked at Trust Tier 4 only. |
| **ωCoins** | Omega / Platform rep | External platform reputation score. Read-only. |

---

## 3. The Conversion Pipeline (Immutable)

**Rule:** All earning coins must pass through rCoins before reaching spendable currencies. There is no direct earning-to-cash path.

```
Earning coins (a/e/f/w/k/s/c/d/h/l/n)
         ↓
    [ rCoins — Reward Pool ]
         ↓
  ┌──────┼──────────┐
  ↓      ↓          ↓
iCoins  mCoins   uCoins
(cash)  (market) (unlock)
```

### Conversion Rates (Base — Trust Tier 1)

| From | To | Rate | Notes |
|---|---|---|---|
| rCoins → iCoins | 100:1 | Base rate. Improves at higher trust tiers. |
| rCoins → mCoins | 60:1 | Market credits. |
| rCoins → uCoins | 50:1 | Unlock credits. |
| iCoins → bCoins | 1:100 | One-way burn. Permanent. Cannot reverse. |

### Trust Tier Conversion Bonuses

| Trust Tier | rCoins → iCoins Rate | Cash-out speed |
|---|---|---|
| Tier 1 (0–25) | 100:1 | 14 days |
| Tier 2 (26–50) | 95:1 | 7 days |
| Tier 3 (51–75) | 88:1 | 3 days |
| Tier 4 (76–100) | 80:1 | Instant |

### Coins That NEVER Convert
`gCoins`, `tCoins`, `zCoins` — these have no conversion path. Never add one.

### xCoins Gate
`xCoins` access requires Trust Tier 4 minimum. Cross-platform conversion rates per platform:
- Instagram: 1.2× base rate
- TikTok: 1.0× base rate
- YouTube: 1.4× base rate (longer-form attention premium)

---

## 4. The Wheel Button — Core Earning Mechanic

The physical interaction at the heart of earning.

| Direction | Earns | Concept |
|---|---|---|
| Scroll **up** | vCoins (Victory) | Outward / giving / social energy |
| Scroll **down** | iCoins (Individual) | Inward / receiving / personal value |
| Heart tap | +1 both types | Genuine appreciation = dual reward |

**Rules:**
- Wheel input goes through the attention verification layer before any coin is credited
- Rapid or mechanical scroll patterns trigger fraud detection
- The wheel is the primary UI for the 60/30/10 revenue split interaction (Creator / Viewer pool / Platform)

---

## 5. Earning Mechanics

### aCoins (Attention) — Primary Earning

| Trigger | aCoins earned |
|---|---|
| Passive watching (unverified) | 1× base |
| Eye-tracking verified watch | 2× base |
| Session completion | +10% bonus |
| Discovery bonus (new genre/creator) | +15% bonus |
| New genre explored | +25% bonus |

### Multipliers (stack multiplicatively)

| Multiplier | Value | Trigger |
|---|---|---|
| Focus mode | 2.0× | Eye-tracking confirmed deep attention |
| Streak | 1.5× | Active daily streak |
| Featured hour | 3.0× | Platform-designated high-value time window |
| New genre | 1.25× | First content from unexplored category |

### Daily Soft Cap (by trust tier)

| Trust Tier | Daily aCoins soft cap |
|---|---|
| Tier 1 | 500 aCoins |
| Tier 2 | 1,000 aCoins |
| Tier 3 | 2,500 aCoins |
| Tier 4 | Unlimited |

Above the soft cap, earning rate drops to 10% until midnight reset.

---

## 6. The 60/30/10 Revenue Split

Every dollar generated by a sponsored impression is split:

```
Ad impression revenue
        ↓
  60% → Creator
  30% → Viewer reward pool (funds viewer iCoins)
  10% → Platform
```

**Rules:**
- Zero platform cut on direct tips between users
- The viewer reward pool is funded by ad revenue — not platform profit
- Creator split is based on **engaged audience quality**, not raw follower count

---

## 7. Creator Tier System

| Tier | Name | Multiplier | Unlocked by |
|---|---|---|---|
| 1 | Newcomer | 1.0× | Default |
| 2 | Rising | 1.25× | Quality engagement score > 60 |
| 3 | Established | 1.5× | Quality engagement score > 80 |
| 4 | Signature | 2.0× | Quality engagement score > 95 + invite |

**Quality engagement score** is calculated from: avg watch completion rate, comment-to-view ratio, return viewer rate, eye-tracking verified view rate. Follower count is NOT a factor.

---

## 8. The 5-Gate Reward Qualification Engine

Before any reward is disbursed, all 5 gates must pass:

```
Gate 1: Device signal valid (on-device, not emulated)
Gate 2: Dwell threshold met (minimum watch time for content type)
Gate 3: Attention score sufficient (eye-tracking score ≥ threshold)
Gate 4: Completion event received (video end or survey submit)
Gate 5: Fraud check passed (behavioral fingerprint clean)
         ↓
    Reward disbursed via Edge Function
```

If any gate fails: no reward. Partial rewards are never given — only full or nothing.

---

## 9. Trust Score System

Every account has a Trust Score (0–100). Affects everything.

### Score Changes

| Event | Delta |
|---|---|
| New account | Start: 50 |
| Identity verified (KYC) | +20 |
| Consistent behavior (30 days) | +15 |
| Long-term loyalty (per year) | +10 |
| Flagged action | -10 |
| Abuse confirmed | -40 |
| Permanent ban | Score → 0, frozen |

### Score Effects

| Score | Tier | Effects |
|---|---|---|
| 0–25 | Tier 1 | Basic earning, slowest conversion, no cash-out |
| 26–50 | Tier 2 | Standard earning, 7-day payouts |
| 51–75 | Tier 3 | Enhanced earning, 3-day payouts, brand deals access |
| 76–100 | Tier 4 | Max earning, instant payouts, xCoins access, governance |

---

## 10. Anti-Inflation Controls

- Coin supply is tied to ad revenue. No revenue = no new coins minted.
- Seasonal burn events: limited-time items permanently remove vCoins from circulation.
- Conversion rates reviewed quarterly based on platform health metrics.
- If total circulating iCoins exceeds 120% of 90-day average: earning rates auto-adjust down 15%.

---

## 11. Payout Rules

| Method | Minimum | Fee | Processing |
|---|---|---|---|
| Bank transfer | $10 | Standard | By trust tier |
| PayPal / Wise | $5 | Small platform cut | By trust tier |
| Gift cards | $1 | 0% | Instant |
| Crypto | $20 | Network fee | By trust tier |
| Reinvest as ads | $0 | 0% | Immediate |

**KYC gates:**
- First cash-out ever: ID verification required
- Earning > $100/month: Tax form required
- Suspicious activity flag: Manual review before next payout

---

## 12. Coin Unlock Timeline

| Stage | Coins unlocked | Trigger |
|---|---|---|
| Day 1 | aCoins, iCoins, vCoins | Account creation |
| Week 1 | eCoins, wCoins, sCoins | First 7 days of activity |
| Month 1 | fCoins, kCoins, bCoins, mCoins, uCoins | 30 days consistent use |
| Month 2 | cCoins, dCoins, hCoins, lCoins, nCoins | Creator or social activity |
| Month 3+ | gCoins, tCoins, rCoins (visible), pCoins | Advanced user milestone |
| Special | zCoins, jCoins, yCoins | Seasonal or event-based |
| Trust Tier 4 | xCoins, ωCoins | Trust score ≥ 76 |

Each unlock is a micro-interaction moment:
- Scale up from 0 with spring easing
- Coin-specific glow in its unique color
- Second-person tagline: "You've unlocked Focus earning."
- "Later" skip button always visible — never forced
