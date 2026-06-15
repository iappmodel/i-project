# INVENTION_017 — Elo Expression Engine (Biometric-to-Emotion Mapping)

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Elo AI Companion
**Date:** 2026-06-15

## Problem Solved

AI companions typically display static avatars or pre-canned animations that do not reflect the user's real-time biometric state. There is no established system for mapping live head pose, eye openness, and computed attention scores from a biometric sensor pipeline into a continuous, parameterized visual expression state for an AI companion entity — one that simultaneously responds to personality configuration, presence room context, and operating mode.

## Current Industry Approach

Consumer AI assistants (Siri, Alexa, Google Assistant) use fixed animations or simple state machines for visual feedback. Virtual avatar platforms (Replika, Character.AI) offer facial expressions driven by sentiment analysis of text, not by live biometric input from the user. Apple's Memoji maps face tracking to a user-controlled avatar but does not drive a separate AI companion's expressions. No existing system fuses biometric attention data, personality presets, operating modes, and room-context parameters into a single continuous expression computation for an AI companion entity.

## How [ i ] Solves It

The Elo Expression Engine computes a real-time `EloExpressionState` from a rich set of biometric and contextual inputs: face detection status, head yaw/pitch, eye openness, attention score, speech energy, orb state, personality stack (including operating mode and relationship mode), and presence room parameters. The engine produces continuous opacity, tilt, blink, pulse, glow color, nod phase, emergence, and micro-expression scale values that drive the Elo face membrane — a transparent glass contour rendered as SVG. When the user's camera is active, Elo subtly mirrors the user's head movements and eye state; when the camera is inactive, Elo generates gentle idle animations. The relationship mode modulates nod frequency (creating a "listening" behavior), attention scores shift nod phase (positive reinforcement for high attention), and room context scales opacity, micro-expression intensity, and line color.

## System Description

The Expression Engine accepts an `ExpressionInput` object containing: `hasFace` (boolean, whether camera detects a face), `headYaw` and `headPitch` (floats from POP vision landmarks), `eyeOpenness` (float 0–1), `orbState` (one of idle, hasInsight, celebrating, warning, blocked, thinking, muted), `room` (a PresenceRoom with opacityScale, microExpressionScale, pulseSpeed, and lineColor), `stack` (EloPersonalityStack with layers, operatingMode, and relationshipMode), `activated` and `evoked` (presence flags), `emergence` (float, transition progress), `attentionScore` (optional float 0–1 from POP), `idlePhase` (float, animation clock), and `speechEnergy` (optional float). The engine first retrieves operating-mode modifiers (opacity and intensity scaling) and orb-glow parameters (color and boost for each of 7 orb states). Room-level opacity and micro-expression scales are combined with operating-mode modifiers. Face detection adds a boost (+0.06) or penalty (-0.04) to opacity. Eye openness is clamped (0.15–1.0) for blink scale. Head yaw and pitch are mapped to tilt values — 35% of yaw and 25% of pitch when a face is detected, or sinusoidal idle motion when no face is present. The relationship mode's nod frequency drives a sinusoidal nod phase, which is further modulated by the attention score (boosted above 0.75, reduced below 0.4). Speech energy contributes an additional micro-expression-scaled boost. The final `EloExpressionState` contains: opacity (clamped 0.48–0.88 when evoked, 0 otherwise), tiltY and tiltX (incorporating nod phase), blinkScale, pulseSpeed, lineColor (room default or orb-state glow color), nodPhase, emergence, and microExpressionScale. A separate `deriveOrbState` function maps proof-connection status, Elo status lines, face detection, verification watching, and attention score into the appropriate orb state.

## Technical Components

- `app/src/lib/elo/expressionEngine.ts` — Core `computeExpression()` function and `deriveOrbState()` helper
- `app/src/lib/elo/visualForms.ts` — Visual form configurations (lineFace/Glass face, lightForm, abstract, symbol)
- `app/src/lib/elo/operatingModes.ts` — Operating mode definitions with opacityScale and intensityScale
- `app/src/lib/elo/relationshipModes.ts` — Relationship mode definitions with nodFrequency and speechCadence
- `app/src/lib/elo/rooms.ts` — Presence room definitions with opacityScale, microExpressionScale, pulseSpeed, lineColor
- `app/src/lib/elo/types.ts` — EloExpressionState, EloOrbState, ExpressionInput, EloVisualForm type definitions
- `app/src/components/elo/EloPresenceLayer.tsx` — React component consuming expression state for rendering
- `app/src/components/elo/EloFaceMembrane.tsx` — SVG membrane renderer driven by expression parameters

## Data Flow

1. POP biometric sensor pipeline produces raw face detection, head pose (yaw, pitch), eye openness, and attention score values per frame.
2. The immersive feed screen gathers these biometric values along with the current orb state, presence room, personality stack, speech energy, and animation clock phase.
3. `deriveOrbState()` maps proof connection, status lines, face detection, and attention score into an orb state (idle, hasInsight, celebrating, warning, blocked, thinking, muted).
4. `computeExpression()` is called with the full `ExpressionInput` composite.
5. Operating mode modifiers (opacity, intensity) are retrieved from the personality stack's operating mode.
6. Orb glow parameters (color, boost) are looked up from the orb state.
7. Room-level scales and operating-mode scales are combined multiplicatively.
8. Face boost, blink scale, tilt values, nod phase, and speech boost are computed.
9. Attention score modulates nod phase (±0.02 based on attention threshold).
10. Final `EloExpressionState` is returned and applied to the EloFaceMembrane SVG renderer.

## User Flow

1. User is watching media on the immersive feed with Elo present as a transparent face membrane overlay.
2. When the user's camera is active (POP connected), Elo subtly mirrors the user's head movements — tilting as the user tilts, with dampened (35%/25%) tracking.
3. Elo's opacity, glow color, and pulse respond to the current context: brighter with blue glow during insight moments, green glow when celebrating a sealed proof, amber warning glow when attention drops, purple thinking glow during reflective rooms.
4. When the user maintains high attention (>0.75), Elo nods slightly more — a subtle positive reinforcement behavior.
5. When the user speaks, speech energy adds micro-expression liveliness to the membrane.
6. When the camera is off, Elo gently sways with sinusoidal idle animations, maintaining presence without mirroring.
7. Different presence rooms (Philosophy, Focus, Creator, Sleep) shift Elo's baseline opacity, micro-expression intensity, and line color.

## Economic Flow

1. The Expression Engine itself does not directly process economic transactions, but its attention-score integration creates a visual feedback loop that encourages sustained engagement with reward-eligible content.
2. Higher attention scores → more responsive Elo nod behavior → user perceives active companionship → user maintains attention → higher reward multipliers in the attention validation pipeline.
3. The "celebrating" orb state (green glow, +0.1 boost) activates when a proof session is sealed — visually reinforcing the completion of an economic action (reward earned).
4. The "warning" orb state signals attention degradation, encouraging the user to re-engage before losing reward eligibility.

## Fraud Prevention

- The Expression Engine is read-only with respect to economic state — it consumes attention scores but cannot modify them.
- Biometric input comes from the POP sensor pipeline, which has its own anti-spoofing measures; the expression engine does not validate biometric authenticity.
- Visual feedback (nod reinforcement, celebrating glow) is based on server-validated attention scores, not raw client-side values.
- The engine cannot be manipulated to trigger reward issuance — it only affects visual rendering.

## Unique Elements

1. **Live biometric-to-companion-expression mapping** — Real-time head pose, eye openness, and attention score from a user's camera are mapped to a separate AI companion entity's visual expression, rather than driving a self-avatar.
2. **Multi-context expression modulation** — A single expression computation integrates biometric input, personality presets (with tone hints), operating modes (with intensity scales), relationship modes (with nod frequency), presence rooms (with cadence and color), and real-time orb state into one continuous output.
3. **Attention-score-driven nod behavior** — The companion entity's nod phase is modulated by the user's computed attention score, creating a subtle biofeedback reinforcement loop.
4. **Room-aware expression parameters** — Different virtual presence rooms (Philosophy, Focus, Creator, Sleep, Grief) shift the companion's baseline opacity, micro-expression scale, pulse speed, and line color, creating environmentally responsive companion behavior.
5. **Graceful degradation from mirror to idle** — When biometric input is unavailable (camera off), the engine seamlessly transitions from head-tracking mirror mode to sinusoidal idle animations without state discontinuity.

## Potential Patent Claims

1. A method for computing a visual expression state for an AI companion entity from biometric sensor data, comprising: receiving head pose angles, eye openness measurements, and an attention score from a biometric sensor pipeline; retrieving a personality configuration comprising a personality stack with operating mode and relationship mode; retrieving a presence room configuration comprising opacity scale, micro-expression scale, and line color; computing expression parameters including opacity, tilt, blink scale, nod phase, and glow color by combining the biometric inputs with the personality and room modifiers; and rendering the expression state on a transparent visual membrane overlaid on media content.
2. A system for biofeedback-driven AI companion animation comprising: a biometric sensor module producing real-time head pose and attention scores; an expression engine that modulates a companion entity's nod phase based on the user's attention score, increasing nod frequency when attention exceeds a high threshold and decreasing it when attention falls below a low threshold; and a visual renderer displaying the companion as a glass contour membrane with parameters driven by the expression engine output.
3. A computer-implemented method for context-adaptive AI companion visualization, comprising: mapping an AI companion to one of a plurality of presence rooms, each room defining distinct opacity, micro-expression, pulse, and color parameters; receiving a personality stack configuration comprising a primary preset with tone hint, a relationship mode with nod frequency, and an operating mode with intensity scaling; computing a composite expression state that multiplicatively combines room, personality, and operating-mode modifiers with real-time biometric input or idle animation values; and rendering the composite expression state on a companion visual form.

## Potential Competitors

- **Apple (Memoji/FaceTime)** — Maps face tracking to user's own avatar; does not drive a separate AI companion
- **Meta (Codec Avatars)** — Photorealistic self-avatars; no AI companion expression mapping
- **Replika** — AI companion with text-driven emotional states; no live biometric expression
- **Soul Machines** — Digital humans with emotion simulation; not coupled to attention-economy or POP verification
- **Microsoft (Copilot)** — No visual companion embodiment
- **Samsung (Bixby)** — Minimal visual feedback; no biometric expression integration

## Related Files

- `app/src/lib/elo/expressionEngine.ts`
- `app/src/lib/elo/visualForms.ts`
- `app/src/lib/elo/operatingModes.ts`
- `app/src/lib/elo/relationshipModes.ts`
- `app/src/lib/elo/rooms.ts`
- `app/src/lib/elo/types.ts`
- `app/src/components/elo/EloPresenceLayer.tsx`
- `app/src/components/elo/EloFaceMembrane.tsx`
- `MASTER_BRAIN/ENTITIES/ELO.md`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 7 |
| Patentability | 9 |
| Business Value | 8 |
