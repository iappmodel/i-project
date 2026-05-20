# PRIVACY ARCHITECTURE

## Doctrine

- **Processed, not possessed.**
- **Raw human signal is temporary fuel. Economic proof is the only durable output.**
- **Your attention can create value without becoming company property.**

This document defines enforceable backend and product architecture standards for `[ i ]` as an attention wallet + media marketplace.

## Three Data Classes

### 1) Ephemeral Human Signal

Raw sensitive signal exists only to compute verification gates and confidence/fraud outcomes.

Examples:
- camera frames
- face mesh
- gaze vectors
- pupil estimates
- eye-tracking buffers
- raw behavioral or biometric traces

Rules:
- Process locally when possible.
- Never persist server-side by default.
- Delete immediately after interpretation (milliseconds to minutes).
- Never warehouse, log, transmit to third parties, or expose to advertisers.

Implementation:
- `backend/privacy/attentionVerification.ts` consumes raw in-memory buffers.
- `backend/privacy/guard.ts` blocks known raw payload fields and `raw_data_included=true`.
- `db/migrations/037_create_privacy_foundation.sql` creates `raw_signal_processing_sessions` metadata table with `raw_data_persisted=false` constraint.

### 2) User-Controlled Private Intelligence

Derived personal history is optional and user-owned.

Examples:
- personal earning insights
- personal attention timeline
- personal dashboards and AI memory
- accessibility calibration

Rules:
- Opt-in only.
- Encrypted at rest.
- User exportable.
- User deletable.
- Not used for ad targeting or external resale.
- Revocable consent blocks future writes.

Implementation:
- `privacy_consents` and `user_private_vault_settings` store consent and vault controls.
- `backend/privacy/consentVault.ts` enforces enable/disable and revocation behavior.

### 3) Economic / Legal Proof

Minimal durable records required for settlement, payout, trust/fraud controls, and compliance.

Examples:
- reward issuance proof
- wallet ledger settlement references
- campaign completion proof
- payout/compliance records
- trust and fraud score summaries

Rules:
- Store minimum required proof only.
- Never include raw biometric/sensor payloads.
- Every record includes purpose and retention policy.
- Every mutation is auditable and ledger-safe.
- Required financial ledger records are never deleted outside policy.

Implementation:
- `economic_proofs`, `privacy_event_audit`, and `data_retention_policies` tables.
- `backend/privacy/walletCompatibility.ts` provides raw-free proof fanout contracts.

## Storage and Deletion Standard

System flow is mandatory:

`INPUT -> MACHINE INTERPRETS -> MINIMAL PROOF IS CREATED -> RAW DATA IS DELETED BY DEFAULT`

Deletion requirements:
- Explicit disposal of in-memory raw buffers after proof creation.
- `raw_signal_processing_sessions.deletion_confirmed_at` must be populated.
- Retention operations are logged via `retention_policy_applied`.
- Deletion is testable and must not be simulated.

## Attention Verification Without Raw Persistence

`verifyAttentionSession(input)`:
- Accepts raw signal only in-memory.
- Computes gates (`facePresent`, `eyesOpen`, `gazeForward`, `durationMet`, `interactionValid`).
- Returns only derived output:
  - `attentionVerified`
  - `confidenceScore`
  - `fraudScore`
  - `verificationGates`
  - `economicProofPayload` with `rawDataIncluded: false`
- Always disposes raw buffers in a `finally` block.

## Wallet Proof Compatibility

Downstream systems only receive:
- `user_id`
- `campaign_id`
- `reward_amount`
- `proof_id`
- `confidence_score`
- `fraud_score`
- `verification_gate_summary`
- `consent_receipt_id`
- `device_attestation_hash`

Never forward:
- camera frames
- gaze vectors
- biometric traces
- raw session buffers

## Society-Level Analytics

Aggregate analytics must be generated from de-identified derived metrics and economic proof summaries, not raw human traces.

Allowed:
- campaign-level completion rates
- aggregate trust/fraud distributions
- payout timing and settlement reliability

Forbidden:
- replaying or storing user-level raw gaze/camera traces
- ad segmentation from private vault or biometric-like raw inputs

## Forbidden Engineering Patterns

- Persisting raw biometric/sensor data in DB, logs, cache, analytics, or debug snapshots.
- Sending raw gaze/face/camera/GPS traces to analytics pipelines.
- Including raw signal in exception payloads.
- Exposing raw signal to advertisers or campaign operators.
- Using private vault data for campaign targeting.
- Claiming deletion without explicit, auditable deletion logs.
- Deleting required financial ledger records outside legal/retention policy.

## Files Added

- `backend/privacy/types.ts`
- `backend/privacy/events.ts`
- `backend/privacy/errors.ts`
- `backend/privacy/guard.ts`
- `backend/privacy/attentionVerification.ts`
- `backend/privacy/walletCompatibility.ts`
- `backend/privacy/retentionEnforcement.ts`
- `backend/privacy/consentVault.ts`
- `backend/privacy/privacyFoundation.test.ts`
- `db/migrations/037_create_privacy_foundation.sql`
