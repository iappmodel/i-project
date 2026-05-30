# ELO Presence Layer — UX Law

**Status:** Canonical (ELO visual + interaction)  
**Pairs with:** [`IMMERSIVE_UI_DESIGN_LAW.md`](../CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md), [`ENTITIES/ELO.md`](../ENTITIES/ELO.md)

---

## What ELO is on screen

ELO is a **living presence membrane** — procedural glass face contours over full-bleed media, not a static image, not an orb, not a chatbot card.

- Semi-transparent frosted contour lines (jaw, brows, eyes, nose, lips)
- Soft radial glass fill — background visible through the membrane
- Centered over full-bleed media (~62% width); adapts to POP vision landmarks when camera active
- Idle breathe + head tilt when camera off
- Emerges when user says **ELO** (voice evoke)
- Tap membrane → glass presence panel

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
3. Mask **manifests at center** (~1.35s emergence draw + fade)
4. First visit → onboarding sheet after manifestation: “I heard you”
5. Returning user (onboarding done) → **presence panel opens** ~0.7s after manifest for interactive session
6. Leaving immersive surfaces → session dismissed; **evoke again** on next feed/watch visit
7. Presenter mode → ELO hidden

Voice wake is **opt-in** — mic does not start until user taps the hint pill.

---

## Personality stack

- **Primary + optional secondary** preset layers  
- **Relationship mode** (mentor, companion, muse, …)  
- **Operating mode** (Founder, Monk, Artist) — modulates opacity, intensity, challenge  
- **Presence room** — ambient line color, pulse, micro-expression scale  

Persisted in `localStorage` key `i-elo-presence-config-v1`.

**Companion law:** rank 143 extract — `MASTER_BRAIN/CHAT_RECOVERY/EXTRACTED/conversations/143_elo_personal_intelligence_companion.md`

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
| Session scope | `app/src/components/elo/EloSessionScope.tsx` — dismiss on leave immersive surfaces |
| Membrane | `app/src/components/elo/EloFaceMembrane.tsx` |
| Panel replies | `app/src/lib/elo/eloReplyService.ts` — contextual mock session (wallet/watch/trust) |
| State | `app/src/state/eloContext.tsx` |
| Types / stack | `app/src/lib/elo/` |
| Styles | `app/src/styles/elo-presence.css` |

---

## Rejected for ELO primary UI

- Fixed bottom-right orb (integrations mock)  
- Filled avatar mesh / VTuber rig as default  
- Wallet dashboard cards as ELO home  

Those remain utility or legacy presenter surfaces only.
