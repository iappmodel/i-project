# ELO Presence Layer — UX Law

**Status:** Canonical (ELO visual + interaction)  
**Pairs with:** [`IMMERSIVE_UI_DESIGN_LAW.md`](../CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md), [`ENTITIES/ELO.md`](../ENTITIES/ELO.md)

---

## What ELO is on screen

ELO is a **living presence membrane** — not an orb, not a chatbot chrome, not a dashboard card.

- Almost-transparent **face contour lines** (profile entering water)
- Center-weighted over full-bleed media
- Adaptive mirroring when POP vision is active (head tilt, blink)
- Procedural idle animation when camera is off
- Tap center hit zone → glass presence panel

**Human → Presence → Relationship** — feed is secondary.

---

## Zone map (Picture 2)

| Zone | Element | Owner |
|------|---------|-------|
| Center | ELO face membrane | User companion |
| Bottom-left | OUT-PROFILE chip | Creator (RAFAELO) |
| Top-right | REWARD pill | Economy |
| Right rail | Gesture buttons | Actions |

ELO must **not** replace OUT-PROFILE.

---

## Z-index (inside immersive)

1. Media background  
2. Scrims  
3. **ELO membrane** (`z-index: 4` in feed; global overlay `z-index: 45`)  
4. Timer, reward, out-profile, gesture rail  
5. Bottom nav  
6. ELO panel / onboarding (`z-index: 80+`)

---

## Activation

1. Enter immersive feed → **Say “ELO”** (voice wake) or tap **Evoke ELO**
2. Face membrane emerges (1.2s line draw)
3. First visit → onboarding sheet: “I heard you” — choose personality stack
4. Returning session → say ELO again to evoke (session-scoped)
5. Presenter mode → ELO hidden

---

## Personality stack

- **Primary + optional secondary** preset layers  
- **Relationship mode** (mentor, companion, muse, …)  
- **Operating mode** (Founder, Monk, Artist) — modulates opacity, intensity, challenge  
- **Presence room** — ambient line color, pulse, micro-expression scale  

Persisted in `localStorage` key `i-elo-presence-config-v1`.

---

## POP boundary

- **Vision input:** `VisionContext` landmarks, head yaw/pitch, blink  
- **Proof input:** `eloStatusLine`, proof-events connection → orb glow states  
- ELO reacts to POP; it does not bypass proof gates

---

## Implementation paths

| Area | Path |
|------|------|
| Layer | `app/src/components/elo/EloPresenceLayer.tsx` |
| Membrane | `app/src/components/elo/EloFaceMembrane.tsx` |
| State | `app/src/state/eloContext.tsx` |
| Types / stack | `app/src/lib/elo/` |
| Styles | `app/src/styles/elo-presence.css` |

---

## Rejected for ELO primary UI

- Fixed bottom-right orb (integrations mock)  
- Filled avatar mesh / VTuber rig as default  
- Wallet dashboard cards as ELO home  

Those remain utility or legacy presenter surfaces only.
