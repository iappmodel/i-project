# Immersive UI Design Law — [ i ]

**Status:** Canonical (visual experience)  
**Priority:** Equal to product law for all UI implementation  
**Supersedes:** Card-dashboard “Attention Wallet product shell,” neumorphic sparkle chrome, dev `SourceEvidence` footers on user-facing screens

When this document conflicts with older ADRs or demos on **visual presentation**, this document wins. Economy and Loop 1 logic remain in `i_SOURCE_OF_TRUTH.md` and `i-app-economy-rules.md`.

---

## The only primary shell (Picture 2)

The consumer app looks like the **immersive full-bleed media mockup** (wireframe labels):

| Zone | Label | Implementation |
|------|--------|----------------|
| Center | **ELO** | Transparent face membrane — user companion presence |
| Top | **TIMER** | Full-width 2px progress line |
| Top-right | **REWARD** | Glass pill `50ic` (or offer review state) |
| Right stack | **LIKE/LOVE** → **MESSAGE** → **SHARE** → **CONTROLS** | 40px glass circles; Like has gesture engine |
| Bottom-left | **OUT-PROFILE** | Avatar, **RAFAELO**, **Cape Town** stacked |
| Bottom | **FEED · PROMO · CREATE · WALLET · IN-PROFILE** | Light soft-UI bar, raised `+` |

Visual rules:

- Full-screen photo/video inside phone (no padding on `phone-screen--immersive`)
- **Glass** overlays — `rgba(7,7,9,0.42)` + `blur(8px)` — **not** grey dashboard cards
- Soft scrims; **no** desktop “Attention Wallet” header; **no** `SourceEvidence` on product

Reference assets (repo):

- `assets/REWARD-*.png`, `assets/phone-*.png`, `assets/ChatGPT_Image_May_27__*.png`
- `06_feed_earning_loops/iapp_immersive_feed.html`
- `app/src/screens/ImmersiveFeedScreen.tsx`
- `app/public/media/immersive-sunset.svg`

---

## Rejected as primary UX (Picture 1 — do not extend)

Do **not** treat these as the design target for Loop 1 / Feed:

- “PRODUCT SHELL · 4-TAB IA” desktop titlebar above the phone
- Fintech dashboard wallet (ACOIN/ICOIN cards, activity list, convert/withdraw tiles) as the **first** screen
- Dense grey panels, POP validator errors on consumer UI
- Card-list TikTok-style feed with stories row as default home
- Neumorphic 3D stacked I/V/Heart buttons (Lovable sparkle) — patterns only, not visual canon

Those remain **utility / presenter / admin** modes only until restyled to glass overlays.

---

## Information architecture (5-tab dock)

| Tab | Role | Visual |
|-----|------|--------|
| **Feed** | Immersive media home | Full-bleed + rail |
| **Promo** | Sponsor briefs / map | Same glass language |
| **Create** | Studio entry | Center `+`, elevated |
| **Wallet** | Balances | Sheet or overlay from pill — **not** dashboard-first |
| **Profile** | In-Profile | Settings, trust |

Loop 1 (Watch → Verify → Earn) runs **on top of** media, not as a separate app chrome.

---

## Gesture buttons

See `MASTER_BRAIN/UX/USER_GESTURE_BUTTONS.md`. Buttons are glass, configurable, cross-mode for offers.

---

## Implementation checklist for agents

Before shipping UI:

1. Does it look like Picture 2 (immersive), not Picture 1 (dashboard)?  
2. Are controls glass and layered over media?  
3. Is dev evidence hidden on product paths?  
4. Is the AppShell titlebar hidden on immersive routes?  
5. Does Wallet open as overlay/sheet unless explicitly in presenter mode?

---

## Modes

| Mode | Shell |
|------|--------|
| **Product (default)** | Immersive Picture 2 |
| **Presenter** | Linear 13-screen tour allowed; may show legacy screens |
| **Dev** | Evidence footers only behind `?dev=1` or presenter |

Default `enterProduct()` → `immersive-feed`.

---

## Related

- `MASTER_BRAIN/UX/USER_GESTURE_BUTTONS.md`  
- `MASTER_BRAIN/UX/ELO_PRESENCE_LAYER.md` — center membrane, personality stack, rooms  
- `MASTER_BRAIN/CHAT_RECOVERY/EXTRACTED/conversations/009_attention_wallet_media_marketplace_brief.md` (D-009-12: immersive media, soft depth)  
- `MASTER_BRAIN/DECISIONS/DEMO_IA_ADR.md` — tab **names** still valid; **visual** superseded here  
