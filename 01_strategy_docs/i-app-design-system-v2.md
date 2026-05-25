# [ i ] App — Design System v2
> The single source of truth for every visual decision in the [ i ] app.
> Claude Code must read this file at the start of any UI session.
> No token, color, font, or component pattern should be invented — reference this file.

---

## 1. Identity

**App name:** `[ i ]` — always written with brackets and spaces. Never `iApp`, never `i-app`, never `I`.
**Logo:** The official logo is a 3D gradient lowercase `i` — rounded pill body + sphere dot, cyan-to-pink gradient with depth/specular highlights. Use the uploaded logo asset (image 7) everywhere a logo is needed. The text `[ i ]` is for text-only contexts (headings, labels, documentation). The 3D logo is for splash screens, app icons, branding moments.
**Tagline:** Attention Wallet & Media Marketplace
**Design personality:** Invisible glass platform. Content-first. The platform is a transparent layer that holds and frames media — it should never feel heavier or more important than the content it displays. Grounded, neutral, media-focused. Tactile depth only where the user interacts (buttons, controls). Everywhere else: glass, transparency, subtlety.
**Anti-patterns:** No fintech dashboards. No dark card grids. No balance-forward layouts. No Inter font. No flat Material-style cards. No generic AI aesthetics. No purple gradients on white. The platform must never visually compete with the content.

### Core Philosophy: The Invisible Platform

The [ i ] platform is like a glass remote control floating over full-screen content. The content IS the experience. The platform is the invisible infrastructure that:
- Frames content edge-to-edge, no padding, no cards
- Overlays controls as glassmorphic floating elements
- Lets users customize every button's position, size, shape, color, transparency, and texture
- Recedes completely during content consumption
- Only becomes visible when the user needs controls

**The content must always feel more important than the platform.**

---

## 2. Color System

### Base Palette (CSS Variables)

```css
:root {
  /* Backgrounds — content is the background, these are for settings/panels only */
  --bg-void:     #070709;   /* splash screen only */
  --bg-deep:     #0a0a0f;   /* settings screens background */
  --bg-surface:  #111118;   /* settings card surfaces */
  --bg-panel:    #16161f;   /* settings panels, modals */
  --bg-raised:   #1c1c28;   /* neumorphic elements in settings only */

  /* Glass — the primary surface treatment for content overlay */
  --glass-light:   rgba(255,255,255,0.08);   /* light glass on dark content */
  --glass-mid:     rgba(255,255,255,0.12);   /* medium glass */
  --glass-heavy:   rgba(255,255,255,0.18);   /* heavier glass, more visible */
  --glass-dark:    rgba(0,0,0,0.40);         /* dark glass on light content */
  --glass-blur:    20px;                      /* default backdrop blur */
  --glass-blur-light: 8px;                   /* subtle blur */
  --glass-blur-heavy: 40px;                  /* heavy frosted glass */

  /* Borders */
  --border-glass:   rgba(255,255,255,0.10);  /* glass element borders */
  --border-subtle:  rgba(255,255,255,0.05);
  --border-mid:     rgba(255,255,255,0.09);
  --border-active:  rgba(255,255,255,0.18);

  /* Text */
  --text-primary:   #f0ede8;
  --text-secondary: #9997a0;
  --text-muted:     #4a4858;
  --text-inverse:   #070709;

  /* Currency — iCoins (cash value) */
  --icoin-primary:   #4ade80;   /* mint green */
  --icoin-glow:      rgba(74,222,128,0.20);
  --icoin-dim:       rgba(74,222,128,0.08);

  /* Currency — vCoins / Vicoins (utility) */
  --vcoin-primary:   #f59e0b;   /* warm amber/gold */
  --vcoin-glow:      rgba(245,158,11,0.20);
  --vcoin-dim:       rgba(245,158,11,0.08);

  /* Accents */
  --accent-cyan:     #00e5ff;   /* eye-tracking, live, active states */
  --accent-cyan-dim: rgba(0,229,255,0.12);
  --accent-lime:     #b4ff47;   /* earn accent, CTAs */
  --accent-lime-dim: rgba(180,255,71,0.12);
  --accent-amber:    #ffb300;   /* attention, biometric, warning */
  --accent-rose:     #ff4d6d;   /* alerts, errors, negative */

  /* Neumorphic shadows — SETTINGS/EDITOR SCREENS ONLY */
  --neu-shadow-out:
    -4px -4px 10px rgba(255,255,255,0.03),
     4px  4px 12px rgba(0,0,0,0.6);
  --neu-shadow-in:
    inset -2px -2px 6px rgba(255,255,255,0.03),
    inset  2px  2px 8px rgba(0,0,0,0.5);

  /* Neumorphic shadows — LIGHT MODE (settings panels like images 9/10) */
  --neu-light-out:
    -6px -6px 16px rgba(255,255,255,0.8),
     6px  6px 16px rgba(0,0,0,0.08);
  --neu-light-in:
    inset -4px -4px 8px rgba(255,255,255,0.6),
    inset  4px  4px 8px rgba(0,0,0,0.06);
  --neu-light-bg: #e8ecf1;  /* light neumorphic surface */

  /* Glows */
  --glow-cyan:   0 0 20px rgba(0,229,255,0.35), 0 0 60px rgba(0,229,255,0.10);
  --glow-lime:   0 0 20px rgba(180,255,71,0.35), 0 0 60px rgba(180,255,71,0.10);
  --glow-amber:  0 0 20px rgba(255,179,0,0.35),  0 0 60px rgba(255,179,0,0.10);
  --glow-icoin:  0 0 16px rgba(74,222,128,0.30), 0 0 40px rgba(74,222,128,0.10);
  --glow-vcoin:  0 0 16px rgba(245,158,11,0.30), 0 0 40px rgba(245,158,11,0.10);
}
```

### Two Visual Modes

The app has TWO distinct visual treatments depending on context:

| Context | Visual Mode | Description |
|---|---|---|
| **Content experience** (feed, watching, browsing) | Glass overlay | Full-screen content, glassmorphic floating controls, transparent buttons, no dark backgrounds visible |
| **Settings & editors** (button customizer, preferences, wallet details) | Light neumorphic | Light gray background (#e8ecf1), soft extruded/intruded shadows, teal accent color, like images 9/10 |

**Hard rule:** Never use the dark fintech card style on content screens. Content screens = glass over full-screen media. Settings screens = light neumorphic panels.

### Semantic Color Rules

| Context | Color | Variable |
|---|---|---|
| iCoins balance | Mint green | `--icoin-primary` |
| vCoins / Vicoins balance | Amber gold | `--vcoin-primary` |
| Live / active / eye-tracking | Cyan | `--accent-cyan` |
| Earn CTA / reward moment | Lime | `--accent-lime` |
| Attention score / biometric | Amber | `--accent-amber` |
| Error / negative / alert | Rose | `--accent-rose` |
| Pending state | `--text-secondary` + italic | — |
| Restricted / locked | `--text-muted` + lock icon | — |

**Hard rule:** iCoins and vCoins colors must never be swapped, combined, or displayed ambiguously. Every balance display must show which currency it represents, labeled and color-coded.

---

## 3. Typography

### Font Stack

```css
/* Load via Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=JetBrains+Mono:wght@300;400;500&display=swap');

:root {
  --font-display: 'Syne', sans-serif;         /* headings, logo, section titles */
  --font-body:    'DM Sans', sans-serif;       /* UI labels, descriptions, body */
  --font-mono:    'JetBrains Mono', monospace; /* numbers, amounts, coin values, code */
}
```

### Type Scale

| Role | Font | Size | Weight | Line-height |
|---|---|---|---|---|
| App logo `[ i ]` | Syne | 28px | 700 | 1 |
| Screen title | Syne | 22px | 600 | 1.2 |
| Section heading | Syne | 18px | 600 | 1.3 |
| Card title | Syne | 15px | 500 | 1.3 |
| Body / description | DM Sans | 14px | 400 | 1.6 |
| Label / caption | DM Sans | 12px | 400 | 1.4 |
| Micro / badge | DM Sans | 10px | 500 | 1 |
| Currency amount | JetBrains Mono | 24px | 500 | 1 |
| Currency label | JetBrains Mono | 11px | 400 | 1 |
| Data / stat | JetBrains Mono | 16px | 400 | 1.2 |

**Rules:**
- Currency amounts always use `--font-mono`. No exceptions.
- Never use Inter, Roboto, Arial, or system fonts.
- Letter spacing: display fonts get `letter-spacing: -0.02em`. Mono gets `letter-spacing: 0.04em`.

---

## 4. Spacing & Layout

### Content-First Layout Rules

The primary layout is **full-screen content with floating glass overlays**. NOT a traditional app shell with header + content + tab bar.

```
┌──────────────────────────────┐
│                              │
│    FULL-SCREEN CONTENT       │  ← Video, image, or content grid fills 100%
│    (no padding, no chrome)   │
│                              │
│  ┌──┐                  ┌──┐  │  ← Floating glass buttons (user-positioned)
│  │♡ │                  │⬡ │  │
│  └──┘                  └──┘  │
│                              │
│         ┌──────────┐         │  ← Glass overlays appear contextually
│         │  EARN +1 │         │
│         └──────────┘         │
│                              │
└──────────────────────────────┘
```

### Content Grid Layouts (user-selectable)

Users can change how many content tiles are visible at once:

| Layout | Grid | Description |
|---|---|---|
| **Immersive** | 1 | Single content fills entire screen (default for watching) |
| **4-tile** | 2×2 | Four pieces of content visible (browsing mode) |
| **8-tile** | 2×4 | Eight pieces (discovery mode) |
| **16-tile** | 4×4 | Sixteen pieces (overview/exploration) |
| **32-tile** | 4×8 | Thirty-two pieces (maximum density) |

Content tiles are edge-to-edge with 1-2px gap. No borders. No rounded corners on the grid. Content fills its cell completely.

### Multi-Directional Navigation

Content navigation is 4-directional:
- **Swipe left** → Promo content / brand campaigns
- **Swipe right** → Friends' content / social
- **Swipe up** → Next content (traditional feed scroll)
- **Swipe down** → Previous content / discovery

Each direction slides the entire content view, revealing a new full-screen experience. Transition is a direct slide in the swipe direction.

### Spacing Values

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  --radius-sm:   6px;
  --radius-md:   12px;
  --radius-lg:   20px;
  --radius-xl:   28px;
  --radius-full: 9999px;

  --screen-max:    430px;   /* mobile canvas width */
  --safe-bottom:   34px;    /* iOS home indicator clearance */
}
```

**Layout rules:**
- Mobile-first. Design for 390×844px (iPhone 14 / modern Android). Scale up.
- Content screens: ZERO padding. Content fills viewport edge-to-edge.
- Settings screens: 16px horizontal padding.
- No persistent tab bar on content screens. Navigation is through floating buttons and gestures.

---

## 5. Component Patterns

### 5.1 Glass Floating Button (Primary interactive element)

The signature control. Floats over content. User-customizable.

```css
.glass-button {
  /* Default state — user can customize all of these */
  width: 48px;
  height: 48px;
  border-radius: 50%;                          /* 100% = circle (default) */
  background: rgba(255,255,255,0.10);          /* glass transparency */
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--border-glass);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: fixed;                             /* floats over content */
  z-index: 50;
  transition: all 0.2s ease;
}

.glass-button:active {
  transform: scale(0.92);
  background: rgba(255,255,255,0.18);
}
```

**User-customizable properties (via Button Editor):**
| Property | Range | Description |
|---|---|---|
| **Color** | Full spectrum (black → colors → white) | Tint color of the glass |
| **Extrusion** | 1%–100% | 100% = fully extruded bubble floating off screen. 50% = neutral. 1% = fully intruded/inset |
| **Size** | 1%–100% | 100% = 96px large button. 1% = 16px minimal dot |
| **Transparency** | 1%–100% | 100% = fully visible. 1% = barely visible ghost |
| **Texture** | 1%–100% | 100% = glossy/shiny glass. 1% = heavy frosted blur |
| **Structure** | 1%–100% | 100% = perfect circle. 1% = star/minimal line shape |
| **Position** | Drag anywhere | User places button wherever their thumb naturally rests |

**Extrusion behavior detail:**
- **100%**: Full bubble — extruded circle floating off the surface, cast shadow underneath, feels like a physical button you could press
- **50%**: Neutral flat glass — neither extruded nor intruded
- **30%**: Starting to intrude — shape approaches circle outline, function icon centered
- **1%**: Fully intruded — minimal fine lines showing just the outline, nearly invisible but still tappable

### 5.2 Glass Overlay / Bottom Sheet

```css
.glass-overlay {
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-xl);
}

/* Dark glass variant (for light content backgrounds) */
.glass-overlay-dark {
  background: rgba(0,0,0,0.40);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-xl);
}
```

### 5.3 Neumorphic Panel (Settings/Editor ONLY)

Used exclusively in settings screens, button editor, wallet detail, and function controls. Light background. Soft shadows. Like images 9/10.

```css
.neu-panel {
  background: var(--neu-light-bg);  /* #e8ecf1 */
  border-radius: var(--radius-lg);
  box-shadow: var(--neu-light-out);
  padding: var(--space-5);
}

.neu-panel-inset {
  background: var(--neu-light-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--neu-light-in);
  padding: var(--space-4);
}

/* Neumorphic button in settings */
.neu-settings-button {
  background: var(--neu-light-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--neu-light-out);
  border: none;
  padding: 12px 24px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: box-shadow 0.15s ease, transform 0.1s ease;
}

.neu-settings-button:active {
  box-shadow: var(--neu-light-in);
  transform: scale(0.97);
}

/* Active/selected neumorphic button with accent */
.neu-settings-button.active {
  background: var(--accent-cyan);
  color: white;
  box-shadow: var(--neu-light-out);
}
```

### 5.4 Currency Display

**Hard rules — enforced always:**
- iCoins: mint green `--icoin-primary`, always labeled "iCoins" or "i⬡"
- vCoins: amber `--vcoin-primary`, always labeled "vCoins" or "v◈"
- Never show a merged "total balance" combining both
- Amounts always in `--font-mono`
- On content screens: currency displays are glass chips floating over content
- On settings screens: currency displays use neumorphic panels

```css
/* Glass currency chip (on content screens) */
.currency-chip-glass {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(0,0,0,0.40);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-full);
}

.currency-chip-glass .currency-amount {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.currency-chip-glass.icoin .currency-amount { color: var(--icoin-primary); }
.currency-chip-glass.vcoin .currency-amount { color: var(--vcoin-primary); }
```

### 5.5 Earn Progress Bar

```css
.earn-progress {
  height: 3px;
  background: rgba(255,255,255,0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.earn-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-lime), var(--icoin-primary));
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}
```

### 5.6 Content Tile

Content tiles have NO chrome. The content IS the tile.

```css
.content-tile {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  /* NO border, NO border-radius, NO padding, NO background */
  /* Content image/video fills 100% */
}

.content-tile img,
.content-tile video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Overlay info appears on hover/tap — glass style */
.content-tile-info {
  position: absolute;
  bottom: 0;
  left: 0; right: 0;
  padding: 12px;
  background: linear-gradient(transparent, rgba(0,0,0,0.6));
  /* No backdrop-filter needed — gradient overlay is enough */
}
```

---

## 6. Motion & Animation

**Philosophy:** Purposeful, not decorative. Every animation should communicate state, not just look nice. Keep lightweight — this is a consumer attention app, performance matters.

```css
:root {
  --duration-fast:   120ms;
  --duration-base:   200ms;
  --duration-slow:   350ms;
  --duration-enter:  400ms;

  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth:  cubic-bezier(0.4, 0, 0.2, 1);
  --ease-exit:    cubic-bezier(0.4, 0, 1, 1);
  --ease-enter:   cubic-bezier(0, 0, 0.2, 1);
}
```

**Animation rules:**
- Button press: `transform: scale(0.92)` + `--duration-fast` — always
- Content transitions: slide in direction of swipe, 300ms — always
- Reward moment: spring scale + glow pulse — always
- Coin unlock: scale up from 0 + glow + 300ms delay — always
- Content fade: opacity 0→1, 200ms — always
- Glass button appear: scale(0)→scale(1) with spring easing
- Never animate layout properties (width, height, top, left) — use transform only
- Respect `prefers-reduced-motion` — all animations wrap in media query

---

## 7. Iconography

- **Library:** Lucide React (primary), or simple SVG inline icons
- **Size:** 20px standard, 16px compact, 24px featured
- **Stroke width:** 1.5px always (never filled icons for UI chrome)
- **Color:** white with 60-80% opacity on glass buttons. Inherits `currentColor` on settings screens.
- **Custom currency icons:** SVG inline, not icon library

---

## 8. Button Editor (Customizable UI Layer)

The Button Editor is the central customization tool. Users access it via long-press on any floating button.

### Editor UI Style
The editor itself uses the **light neumorphic** style (like images 9/10):
- Light gray background
- Soft extruded panels
- Teal/cyan accent for active states
- Sliders with rounded thumb controls

### Customizable Properties per Button

```
┌─────────────────────────────────────┐
│        Button Customizer            │
│                                     │
│   [Preview button renders live]     │
│                                     │
│   COLOR ────────────────●────       │  ← Hue strip: black → colors → white
│   EXTRUSION ──────●──────────       │  ← Bubble ↔ Flat ↔ Inset
│   SIZE ────────────●─────────       │  ← Dot ↔ Large bubble
│   TRANSPARENCY ─────────●───        │  ← Ghost ↔ Solid
│   TEXTURE ───────●───────────       │  ← Frosted blur ↔ Glossy shiny
│   STRUCTURE ──────────●──────       │  ← Star/minimal ↔ Circle
│                                     │
│            [ Done ]                 │
└─────────────────────────────────────┘
```

### Button Arrangement
- Buttons can be dragged to any screen position
- When placed, button snaps with a subtle "seated" animation
- Buttons can be added or removed via drag-and-hold
- Position persists per user (saved to local storage in demo)
- Design for thumb ergonomics — phone sizes are standard, hands are not

---

## 9. Tailwind Config Extension

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        void:    '#070709',
        deep:    '#0a0a0f',
        surface: '#111118',
        panel:   '#16161f',
        raised:  '#1c1c28',
        icoin:   '#4ade80',
        vcoin:   '#f59e0b',
        cyan:    '#00e5ff',
        lime:    '#b4ff47',
        'neu-light': '#e8ecf1',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'xl2': '20px',
        'xl3': '28px',
      },
      backdropBlur: {
        'glass': '20px',
        'glass-light': '8px',
        'glass-heavy': '40px',
      },
    },
  },
}
```

---

## 10. Do / Don't Quick Reference

| ✅ DO | ❌ DON'T |
|---|---|
| Full-screen content, edge-to-edge | Content inside dark cards with borders |
| Glass floating buttons over content | Neumorphic buttons on dark backgrounds (content screens) |
| Light neumorphic for settings/editors | Dark neumorphic for settings |
| Content is the background | Dark surface is the background |
| Invisible platform — glass controls only | Visible platform chrome competing with content |
| User-positioned floating buttons | Fixed tab bars and headers |
| Multi-directional swipe navigation | Single-axis scroll only |
| 4/8/16/32 tile content grid options | Single-card vertical feed only |
| Syne for headings | Inter, Roboto, system fonts |
| JetBrains Mono for numbers | Sans-serif for currency amounts |
| Label every currency display | Merge iCoins + vCoins into one balance |
| `transform` for animations | `width`/`height`/`top` animations |
| Earn accent in lime `#b4ff47` | Random green shades for earn states |
| Cyan for eye-tracking / live states | Cyan for generic active states |
| 3D gradient logo for branding moments | Flat text `[ i ]` for logo everywhere |
| 390px mobile-first | Desktop-first layout |

---

## 11. Screen Map: Which Visual Mode Where

| Screen | Visual Mode | Notes |
|---|---|---|
| Splash | Dark void + 3D logo | Logo animation, tagline |
| Feed / Browse | Glass over content | Full-screen tiles, floating buttons |
| Watch (single content) | Glass over content | Immersive, all chrome hidden until summoned |
| Earn marketplace | Glass over content | Offers as glass cards floating over ambient bg |
| Wallet overview | Glass over content | Glass balance chips, glass transaction list |
| Wallet detail / payout | Light neumorphic | Settings-style detailed forms |
| Button Editor | Light neumorphic | Sliders, preview, customization controls |
| Settings / Preferences | Light neumorphic | Like images 9/10 |
| Eye tracking active | Glass over camera | Gaze dot, attention ring over live camera feed |
| Trust score | Glass over content | Ring visualization, glass tier cards |
| Economy overview | Glass over content | Coin grid as glass tiles |
| Creator split | Glass over content | Animated glass bars |
| Profile | Glass over content | Glass panel with user info floating over their content |
