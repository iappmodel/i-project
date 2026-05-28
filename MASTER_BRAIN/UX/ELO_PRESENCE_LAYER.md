# ELO Presence Layer — UX Law

**Status:** Canonical (ELO visual + interaction)  
**Pairs with:** [`IMMERSIVE_UI_DESIGN_LAW.md`](../CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md), [`ENTITIES/ELO.md`](../ENTITIES/ELO.md)

---

## What ELO is on screen

ELO is a **large translucent 3D glass face mask** — not wireframe lines, not an orb, not a chatbot card.

- Sculptural frosted-glass surface with hollow eye sockets
- Soft nose ridge, subtle mouth depression, forehead highlight
- Centered over full-bleed media (~90% width); background visible through mask
- Emerges when user says **ELO** or taps **Evoke ELO**
- Head tilt / blink mirroring when POP vision is active
- Tap mask → glass presence panel

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

1. Enter immersive feed — feed stays full-bleed; small **Say “ELO”** pill (non-blocking)
2. Tap pill → mic arms → user says **“ELO”**
3. Mask **manifests from the right rail to center** (~1.5s simple emergence)
4. First visit → onboarding sheet after manifestation: “I heard you”
5. Returning visit → **“I'm here. Tap to talk.”** greeting; tap face or greeting → presence panel
6. Presenter mode → ELO hidden

Voice wake is **opt-in** — mic does not start until user taps the hint pill.

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
