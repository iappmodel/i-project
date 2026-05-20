# Stage 25 — P.O.P.S Launch MVP

This document defines the minimum viable production launch scope for P.O.P.S in the `[ i ]` app and maps it to current implementation status plus remaining tasks.

## 1) MVP Scope Checklist

### 1.1 Core outcomes

- [x] Sponsored watch-and-earn flow exists (`SPONSORED_WATCH` sessions + reward decision + wallet intent).
- [x] Basic Earn marketplace offer hooks exist in domain surfaces (`src/features/earn/pops/*`).
- [x] Wallet pending reward intent path exists (`pops_wallet_reward_intents` + reward decision linkage).
- [x] Privacy receipt model/service exists (`pops_privacy_receipts`, privacy service, API route).
- [x] Basic fraud hold path exists (`HELD_FOR_REVIEW`/hold reasons, device-integrity risk handling).
- [x] Admin review queue exists (`pops_admin_review_queue`, admin actions, dashboard surfaces).
- [ ] No visual presence by default (currently available as a signal and visual features exist; must be feature-flag-disabled by default).
- [x] No raw camera/audio persistence policy path exists (`raw_camera_stored`, `raw_audio_stored` flags and privacy receipt policy).
- [ ] No emotion inference in MVP (must be explicitly enforced/blocked in ingest and scoring paths).
- [ ] No advanced ML in MVP (must pin to Scoring Model V1 and block advanced model routing).

### 1.2 MVP enabled signals (must be accepted and scored in MVP)

- [x] Screen active
- [x] App foreground/background
- [x] Content progress
- [x] Session duration
- [x] Pause/resume
- [x] Tap/scroll/swipe
- [x] Basic device integrity
- [x] Account continuity
- [x] Notification interruption
- [ ] Campaign requirements explicitly enforced at ingest/checkpoint and decision time (surfaces exist; enforce in launch gate tests)

### 1.3 MVP disabled by default (must be gated off)

- [ ] Visual presence
- [ ] Audio features
- [ ] Emotion vector
- [ ] Precise location
- [ ] Wearable signals
- [ ] Advanced personalization

### 1.4 MVP proof levels (allowed)

- [x] `LEVEL_1_SESSION`
- [x] `LEVEL_2_ATTENTION`
- [x] `LEVEL_3_INTENT` only for CTA campaigns
- [ ] Enforce deny/reject when `LEVEL_3_INTENT` is requested outside CTA campaign requirements

### 1.5 MVP session types (allowed)

- [x] `SPONSORED_WATCH`
- [x] `BRAND_CAMPAIGN`
- [x] `CREATOR_CONTENT`
- [x] `SURVEY`
- [x] `PURCHASE_INTENT`

### 1.6 MVP decisions (required canonical statuses)

- [ ] `APPROVED_FULL`
- [ ] `APPROVED_PARTIAL`
- [ ] `PENDING_REVIEW`
- [x] `HELD`
- [ ] `DENIED_LOW_CONFIDENCE`
- [ ] `DENIED_FRAUD_RISK`
- [ ] `DENIED_INELIGIBLE`
- [ ] `DENIED_DUPLICATE`

Note: Current implementation uses adjacent statuses (`ELIGIBLE_FULL`, `ELIGIBLE_PARTIAL`, `HELD_FOR_REVIEW`, `DENIED`, `fraud_*` reason codes). Stage 25 requires either:
- a canonical enum migration to the Stage 25 decision statuses, or
- a stable translation layer at API boundaries plus analytics/storage normalization.

### 1.7 MVP user-facing statuses (required copy)

- [ ] `Presence forming`
- [ ] `Moment confidence rising`
- [ ] `Moment verified`
- [ ] `Reward pending`
- [ ] `Reward under review`
- [ ] `Moment not verified`

### 1.8 MVP backend endpoints (required contract)

- [x] session start
- [x] events ingest
- [x] signal batch ingest
- [x] checkpoint
- [x] complete
- [x] status
- [x] privacy receipt

### 1.9 MVP database tables (required)

- [x] `pops_sessions`
- [x] `pops_events`
- [x] `pops_signal_batches`
- [x] `pops_session_aggregates`
- [x] `pops_judgments`
- [x] `pops_reward_decisions`
- [x] `pops_wallet_reward_intents`
- [x] `pops_privacy_receipts`
- [x] `pops_admin_review_queue`
- [x] `pops_audit_log`

## 2) Stage 25 Implementation Tasks (Build Order)

Use this exact order for launch hardening:

1. **Schema alignment migration**
   - Add/normalize decision status enum set to Stage 25 canonical values.
   - Add duplicate-resolution fields (`duplicate_key`, `duplicate_of_decision_id`) in `pops_reward_decisions`.
   - Add campaign requirement enforcement columns on session/decision as needed.

2. **Domain type alignment**
   - Update TypeScript decision/status types to Stage 25 canonical values.
   - Add strict allowlists for enabled and disabled signals.
   - Add proof-level gating helper: `LEVEL_3_INTENT` only when campaign CTA requirement is true.

3. **Ingestion policy guardrails**
   - Enforce idempotency for both events and signal batches (already largely present; add explicit duplicate-decision guard).
   - Reject or strip disabled-by-default signals at ingestion when feature flags are off.
   - Block raw camera/audio payload fields in validators.

4. **Scoring Model V1 lock**
   - Explicitly route all MVP scoring to V1 only.
   - Add hard check to prevent advanced model/version execution when MVP flag is active.

5. **Reward Decision Service canonicalization**
   - Map scoring outputs to Stage 25 decisions only.
   - Ensure `DENIED_DUPLICATE` is emitted for duplicate sessions/events.
   - Ensure `DENIED_FRAUD_RISK` and `DENIED_LOW_CONFIDENCE` are distinct outcomes.

6. **Wallet pending interface hardening**
   - Keep judgment and settlement separated.
   - Ensure wallet receives pending intent only; never direct available release from P.O.P.S path.
   - Ensure held/denied intents surface in pending/review tab views.

7. **Privacy receipt enforcement**
   - Make privacy receipt creation mandatory before any wallet release-eligible transition.
   - Fail closed if privacy receipt creation fails.

8. **Feed/Earn launch integration**
   - Require Feed sponsored content and Earn offer starts to create P.O.P.S session IDs.
   - Persist source linkage (`offer_id`, `campaign_id`, content id) for audit and duplicate checks.

9. **Admin review queue resolution flow**
   - Implement approve/deny review action endpoints with audited override reason.
   - Keep fraud internals hidden from user-facing messages.

10. **Feature flags (required for MVP policy)**
    - Add `pops_mvp_enabled`.
    - Add `pops_visual_presence_enabled` default `false`.
    - Add `pops_audio_features_enabled` default `false`.
    - Add `pops_location_precise_enabled` default `false`.
    - Add `pops_wearables_enabled` default `false`.
    - Add `pops_advanced_personalization_enabled` default `false`.
    - Add `pops_advanced_ml_enabled` default `false`.

11. **Observability**
    - Counters: sessions started/completed, held, denied, duplicate-denied, privacy-receipt-fail.
    - SLOs: ingestion success rate, decision latency, privacy receipt latency, queue resolution time.
    - Alerts: privacy receipt failures, missing audit records, duplicate reward leakage.

12. **Test suite completion**
    - Add/expand unit, integration, and invariants tests from Section 4.

## 3) Acceptance Criteria

Stage 25 is accepted only when all criteria below pass:

1. Sponsored watch-and-earn and basic Earn offers both produce valid P.O.P.S sessions and decisions.
2. Wallet pending intents are created only after decision generation and never as direct available credit.
3. Privacy receipt is created for every money-affecting session before wallet release eligibility.
4. Held/denied outcomes are visible in pending/review wallet UX surfaces.
5. Admin review can approve/deny held rewards, and every override is audited.
6. Disabled-by-default signals remain off unless explicit feature flag enablement.
7. No raw camera/audio data is persisted in MVP storage paths.
8. Duplicate reward attempts are denied with canonical duplicate outcome.
9. Event and batch ingestion is idempotent under replay.
10. No fraud internals leak to user-facing status/copy.

## 4) Test Criteria

### 4.1 Unit tests

- Decision mapping tests for all canonical Stage 25 decision outputs.
- Proof-level enforcement tests (`LEVEL_3_INTENT` CTA-only).
- Feature-flag signal allowlist/denylist tests.
- Privacy receipt generation tests for all money-affecting paths.
- Duplicate detection tests for event replay and decision replay.

### 4.2 Integration tests

- End-to-end: Earn offer -> session -> events/batches -> complete -> decision -> wallet pending intent.
- End-to-end: Sponsored feed -> same chain as above.
- Held flow: reward held -> appears in admin queue -> admin approve -> wallet status transitions.
- Denied flow: low confidence/fraud/ineligible/duplicate each map to correct user-visible status.
- Idempotency: same payload replay does not create duplicate event/batch/decision/intent.

### 4.3 Invariant tests (non-negotiable rules)

1. No available wallet reward without P.O.P.S decision or approved fallback.
2. Every money-affecting P.O.P.S action writes audit records.
3. Every money-affecting P.O.P.S session has a privacy receipt.
4. No raw camera/audio persistence.
5. User copy never exposes exact fraud details.
6. Admin overrides always audited.
7. Duplicate rewards blocked.
8. Ingestion idempotent.
9. Wallet movement separated from judgment.
10. P.O.P.S validates; wallet settles.

## 5) Launch Gate Criteria (Go/No-Go)

All must be green:

- **Schema gate**: migrations applied cleanly in a fresh environment.
- **Contract gate**: API contract tests pass for required backend endpoints.
- **Policy gate**: disabled-by-default flags verified off in production config.
- **Privacy gate**: zero failing privacy receipt writes in pre-launch soak.
- **Fraud gate**: held/denied reason families tested; no user-facing fraud detail leakage.
- **Idempotency gate**: replay tests produce no duplicate decisions/intents.
- **Audit gate**: audit trail coverage at 100% for money-affecting actions.
- **Wallet gate**: no direct available credit path from P.O.P.S judgment.
- **Admin gate**: review queue approve/deny actions fully audited and permission-checked.
- **Observability gate**: dashboards/alerts live for ingestion, decisions, receipts, holds, denials, and queue SLA.

If any gate fails, launch is **NO-GO**.

## 6) Immediate Next Sprint Slice (Recommended)

1. Canonical decision status migration + type updates.
2. Feature flags for disabled-by-default signals and advanced ML lockout.
3. Proof-level CTA enforcement and duplicate decision denial.
4. Privacy-receipt-before-release hard guard.
5. Final integration/invariant test pass and launch-gate runbook execution.
