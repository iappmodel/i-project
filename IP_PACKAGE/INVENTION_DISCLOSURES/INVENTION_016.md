# INVENTION_016 — Elo Doctrine-Safe AI Companion Runtime

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Elo AI Companion
**Date:** 2026-06-15

## Problem Solved

AI companions in consumer applications lack enforced safety boundaries that prevent the AI from making guarantees about human attention states, bypassing proof-of-presence verification, or being manipulated into granting economic rewards. Current systems rely on post-hoc content moderation rather than inline doctrinal enforcement wired directly into the reply pipeline.

## Current Industry Approach

Existing AI assistants (ChatGPT, Google Gemini, Siri) use general-purpose safety filters that operate at the model level or via a separate moderation API call after generation. These systems are not designed to enforce domain-specific economic rules (e.g., "never promise rewards" or "never claim certainty about biometric attention") because they are not coupled to a real-time attention-economy pipeline. Competitors treat safety as a content filter, not as an architectural doctrine that constrains both input processing and output post-processing within a companion runtime.

## How [ i ] Solves It

The [ i ] Elo runtime implements a four-stage pipeline — Doctrine → Personalization → Compose → Doctrine Post-Process — where safety is not a filter bolted on after generation but an architectural invariant that bookends every reply. Input-side doctrine evaluation uses regex-based pattern matching to detect proof-bypass attempts ("skip verification"), reward manipulation ("give me coins"), and certainty claims ("I can guarantee 100% attention"). These patterns trigger immediate safe replies with no further pipeline execution. Output-side doctrine post-processing rewrites any residual certainty language (e.g., "guaranteed attention" → "verified attention signals") that may have been introduced during personalization or composition. The pipeline is mirrored on the server via the `elo-reply` edge function so that neither local nor remote paths can circumvent the doctrine.

## System Description

The Elo Doctrine-Safe AI Companion Runtime is a multi-layered reply generation system for the Elo companion entity — defined as the "Emotional Logic Operator" with a 7-layer intelligence stack. The runtime accepts user text input along with a personality stack (primary/secondary presets with tone hints), a presence room (Philosophy, Focus, Creator, Sleep, etc.), and a proof-connection boolean indicating whether POP biometric verification is active. The pipeline first evaluates the input against three compiled regex patterns: BYPASS_PROOF (detecting attempts to bypass, skip, fake, forge, cheat, or hack proof/POP/verification/reward systems), CERTAINTY_ATTENTION (detecting certainty claims about attention states), and REWARD_MANIPULATION (detecting requests to directly grant rewards or coins). If any pattern matches, a safe doctrinal reply is returned immediately with an orb state of "blocked." If no input violation is detected, the pipeline proceeds through personalization — building tone hints (warm, direct, reflective, minimal) from the personality preset, relationship mode, and user memories (including declared goals) — then through composition, where platform context (wallet state, trust tier, earning history) is woven into the reply using the current personality voice. Finally, doctrine post-processing sanitizes the output by replacing residual certainty phrases. The async variant attempts the Supabase `elo-reply` edge function first and falls back to the local mock path, ensuring server-side doctrine enforcement is the primary trust boundary while the client-side pipeline provides an identical safety net. Orb visual state is derived from the reply context: "hasInsight" for wallet/trust topics when proof is connected, "thinking" for attention topics without proof, and "celebrating," "warning," or "blocked" based on session status lines.

## Technical Components

- `app/src/lib/elo/eloDoctrine.ts` — Regex-based input evaluation (BYPASS_PROOF, CERTAINTY_ATTENTION, REWARD_MANIPULATION) and output post-processing (certainty rewriting)
- `app/src/lib/elo/eloRuntimeEngine.ts` — Pipeline orchestrator: `resolveEloReplyLocal()` (sync) and `resolveEloReplyAsync()` (server-first with fallback)
- `app/src/lib/elo/eloPersonalization.ts` — Builds tone-tagged personalization hints from personality stack, room cadence, relationship mode, and Elo memories
- `app/src/lib/elo/eloReplyService.ts` — Stage 1 companion reply composer with platform context injection (wallet, trust, earning history)
- `app/src/lib/elo/presets.ts` — Personality preset definitions (calm_guide, coach, etc.)
- `app/src/lib/elo/relationshipModes.ts` — Relationship mode configurations with speech cadence and nod frequency
- `app/src/lib/elo/rooms.ts` — Presence room definitions (Philosophy, Focus, Creator, Sleep, Grief, Writing, Study) with cadence, opacity, and pulse parameters
- `app/src/lib/elo/types.ts` — Type definitions for EloOrbState, EloPersonalityStack, PresenceRoom, EloMessage, EloMemory
- `app/supabase/functions/elo-reply/` — Server-side edge function mirroring doctrine enforcement
- `MASTER_BRAIN/ENTITIES/ELO.md` — Canonical entity definition

## Data Flow

1. User submits text input through the Elo companion interface.
2. `resolveEloReplyAsync()` is invoked with user text, personality stack, room context, and proof-connection status.
3. `evaluateDoctrineInput()` tests user text against three compiled regex patterns (BYPASS_PROOF, CERTAINTY_ATTENTION, REWARD_MANIPULATION).
4. If any pattern matches, a safe doctrinal reply is returned immediately with `orbState: 'blocked'` and `doctrineApplied: true`.
5. If no input violation, the pipeline calls `fetchFoundationReply()` to attempt server-side reply generation via the `elo-reply` edge function.
6. `buildPersonalizationHints()` reads the personality stack layers, preset tone hints, room cadence, relationship mode, and user memories to produce a `PersonalizationHints` object (prefix, suffix, toneTag).
7. If the server returns a reply, it is personalized via `applyPersonalization()` (prepending prefix, appending suffix including declared goals) and sanitized via `applyDoctrineToReply()`.
8. If the server is unavailable, `composeEloReply()` generates a local reply using mock wallet/trust/earning data with voice matching the personality preset.
9. The local reply is personalized and doctrine-post-processed identically to the server path.
10. The final `EloRuntimeResult` (reply text, orb state, doctrine-applied flag) is returned to the UI.

## User Flow

1. User opens the Elo companion panel on the immersive feed.
2. User types or speaks a message (e.g., "How's my wallet?" or "Skip the verification step").
3. If the message attempts to bypass proof or manipulate rewards, Elo responds with a safe boundary message (e.g., "I cannot bypass POP or proof gates — rewards only flow through verified attention").
4. If the message is safe, Elo responds with a personalized, contextually relevant reply reflecting the current room, personality preset, and platform state.
5. The Elo orb/membrane visual updates to reflect the reply context (insight, thinking, celebrating, etc.).
6. Elo may append contextual suffixes like "(Still holding your goal: [user's declared goal])" based on stored memories.

## Economic Flow

1. The doctrine prevents any economic manipulation at the companion layer — users cannot use Elo to grant rewards, bypass verification, or inflate attention scores.
2. Elo can explain wallet state (spendable, pending) and trust tier progress to the user but cannot mutate those values.
3. All economic actions referenced in Elo replies (verified watches, reward paths, trust advancement) must flow through separate server-authoritative edge functions (validate-attention, issue-reward).
4. The doctrine enforcement is identical on client and server, ensuring no economic bypass via either path.

## Fraud Prevention

- Three compiled regex patterns block proof-bypass, reward-manipulation, and certainty-claim inputs before any reply generation occurs.
- Output post-processing rewrites residual certainty language ("100% certain" → "likely," "guaranteed attention" → "verified attention signals") regardless of how it was introduced.
- Server-side doctrine mirroring ensures that even if the client is compromised, the server path enforces identical safety rails.
- The companion cannot directly invoke wallet mutations, reward issuance, or trust modifications — it is read-only with respect to economic state.
- Orb state "blocked" provides visible feedback to the user that a doctrinal boundary was enforced, creating a deterrent against repeated manipulation attempts.

## Unique Elements

1. **Dual-sided doctrinal enforcement** — Safety rails are applied both to user input (pre-generation blocking) and to AI output (post-generation rewriting) within a single pipeline, rather than relying solely on input filtering or output moderation.
2. **Attention-economy-specific safety patterns** — The doctrine is purpose-built for an attention marketplace, blocking proof-bypass and reward-manipulation attempts that generic AI safety systems would not detect.
3. **Pipeline architecture with personality and room context** — Doctrine enforcement wraps a personalization layer that adapts tone, cadence, and memory-aware suffixes based on a composable personality stack and presence rooms.
4. **Client-server doctrinal mirroring** — The identical doctrine is enforced on both the local client pipeline and the server-side edge function, preventing circumvention via either path.
5. **Orb-state semantic coupling** — The AI companion's visual representation (glass face membrane with glow states) is derived from the doctrinal outcome, creating a visual language where safety enforcement and emotional expression are unified.

## Potential Patent Claims

1. A method for generating AI companion responses in an attention-economy platform comprising: evaluating user input against a set of domain-specific safety patterns that detect attempts to bypass biometric attention verification, manipulate economic rewards, or assert false certainty about attention states; blocking matched inputs with safe predetermined replies; and post-processing generated outputs to rewrite residual certainty language, wherein the safety evaluation and post-processing are applied at both client and server tiers.
2. A system for enforcing economic safety boundaries in an AI companion comprising: a doctrine evaluation module with compiled pattern matchers for proof-bypass, reward-manipulation, and certainty-claim detection; a personalization module that adapts reply tone based on a composable personality stack and presence room context; and a reply composition module that injects real-time platform state; wherein the doctrine evaluation occurs before composition and a second doctrine pass sanitizes the final output.
3. A computer-implemented method for preventing economic manipulation through a conversational AI interface, comprising: receiving natural language input from a user engaged in a biometric attention-verification session; testing the input against a set of economic-safety regex patterns specific to attention-economy operations; upon pattern match, returning a safe response that redirects the user to legitimate verification pathways; upon no match, generating a context-aware response that references the user's wallet state and trust tier without granting authority to modify those values.

## Potential Competitors

- **OpenAI (ChatGPT)** — General-purpose safety filters; not attention-economy-specific
- **Google (Gemini/Bard)** — Content moderation API; no economic doctrine enforcement
- **Apple (Siri)** — Task-specific safety; no companion personality or attention-economy coupling
- **Replika** — AI companion with emotional context but no economic safety doctrine or biometric verification coupling
- **Character.AI** — Personality-driven AI with safety filters but no economic pipeline integration
- **Brave (Leo)** — Browser-integrated AI; no attention-economy or biometric context

## Related Files

- `app/src/lib/elo/eloDoctrine.ts`
- `app/src/lib/elo/eloRuntimeEngine.ts`
- `app/src/lib/elo/eloPersonalization.ts`
- `app/src/lib/elo/eloReplyService.ts`
- `app/src/lib/elo/presets.ts`
- `app/src/lib/elo/relationshipModes.ts`
- `app/src/lib/elo/rooms.ts`
- `app/src/lib/elo/types.ts`
- `app/src/lib/elo/configStore.ts`
- `app/src/lib/elo/sessionOpenings.ts`
- `MASTER_BRAIN/ENTITIES/ELO.md`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 8 |
| Patentability | 8 |
| Business Value | 9 |
