# Proof-of-Presence Engine (Phase 1)

Official engine: `Proof-of-Presence Engine`  
Product: `P.O.P.S`  
Internal: `The Membrane`

Phase 1 scope implemented in this repo is strictly foundational:
- screen active
- watch/content progress
- touch events
- device motion
- simple face present/missing
- app foreground/background
- session duration
- basic fraud risk
- reward decision object

## Canonical TypeScript Interfaces

Implemented in:
- `services/api/src/types/alphabet/pops.types.ts`

Includes:
- `PresenceSessionState` (canonical states)
- `PresencePhase1SignalBatch`
- `PresenceJudgment`
- `PresenceRewardDecision`
- `PresenceWalletPendingInstruction`
- `PresenceTrustEvent`
- `PresencePrivacyReceipt`

## Event Names (Phase 1)

Implemented as constants in:
- `services/api/src/lib/alphabet/pops-engine.ts`

Canonical event names:
- `presence.session.started`
- `presence.signal.batch`
- `presence.screen.active`
- `presence.screen.inactive`
- `presence.touch.activity`
- `presence.motion.activity`
- `presence.face.present`
- `presence.face.missing`
- `presence.app.foreground`
- `presence.app.background`
- `presence.judgment.immediate`
- `presence.judgment.near_time`
- `presence.reward.decision.created`
- `presence.reward.wallet_pending_created`
- `presence.trust.event.created`
- `presence.privacy.receipt.created`
- `presence.session.completed`

## Session State Machine

Implemented in:
- `services/api/src/lib/alphabet/pops-engine.ts`

Key capabilities:
- canonical state transition map
- transition validator helper: `canTransitionPresenceSessionState(from, to)`

Terminal states:
- `reward_approved`
- `reward_denied`

## Reward Decision Logic

Implemented in:
- `services/api/src/lib/alphabet/pops-engine.ts`

Core function:
- `buildPresenceRewardDecision(...)`

Formula:
- `reward_quality` weighted from presence, attention, intent, completion, and fraud penalty.

Decision mapping:
- `approved`
- `partial`
- `pending_review`
- `held`
- `denied`
- `fraud_blocked`

## Wallet Pending Integration

Implemented in:
- `services/api/src/lib/alphabet/pops-engine.ts`

Core function:
- `buildWalletPendingInstruction(decision)`

Behavior:
- never issues direct available reward from UI/session.
- creates pending wallet instruction only for non-denied/non-fraud-blocked outcomes.
- carries hold flags and rationale for downstream settlement logic.

## Trust Score Integration

Implemented in:
- `services/api/src/lib/alphabet/pops-engine.ts`

Core function:
- `buildTrustEventFromDecision(decision)`

Produces:
- positive trust signal for verified sessions
- negative trust signal for held/fraud-blocked sessions
- reasoned confidence for auditability

## Privacy Receipt Structure

Implemented in:
- `services/api/src/lib/alphabet/pops-engine.ts`

Core function:
- `buildPrivacyReceipt(signalBatch)`

Behavior:
- tracks raw-storage flags
- records local-processing mode
- stamps `rawDataDeletedAt` for default discard paths
- emits user-visible summary text

## Backend Table Schema

Implemented migration:
- `db/migrations/183_proof_of_presence_engine_phase1.sql`

Creates:
- `presence_sessions`
- `presence_events`
- `presence_judgments`
- `presence_reward_decisions`
- `presence_privacy_receipts`

## MVP Implementation Plan (Execution)

1. Client signal batching
- emit `PresencePhase1SignalBatch` from app runtime.
- send at low-latency cadence for immediate layer and session close for near-time layer.

2. Backend immediate judgment
- run `buildPhase1PresenceJudgment(...)` per batch.
- update session state machine and recommended action.

3. Near-time reward decision
- on checkpoint/close, run `buildPresenceRewardDecision(...)`.
- persist decision and publish reward/trust events.

4. Wallet pending write
- map decision to `buildWalletPendingInstruction(...)`.
- create pending lot/transaction only (no direct available credit).

5. Trust write
- map decision to `buildTrustEventFromDecision(...)`.
- push event into existing trust update pipeline.

6. Privacy receipt write
- issue `buildPrivacyReceipt(...)` at session close.
- expose receipt data in user-visible history endpoints.

7. Deferred intelligence (Phase 2+)
- keep event/judgment records structured for future attention/intent/emotion upgrades.

## Tests

Implemented tests:
- `services/api/src/lib/alphabet/__tests__/pops-engine.test.ts`

Coverage:
- clean-session judgment
- fraud-likely judgment
- reward decision behavior
- wallet pending behavior
- trust event generation
- privacy receipt defaults
- state transition validation
