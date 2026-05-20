# API Boundary Contract (Step 6.11)

This module defines the API boundary so clients do not call arbitrary SQL directly.

## Core rule

- Clients talk to APIs.
- APIs call approved RPC functions.
- RPC functions mutate the system.
- Tables remain protected behind role and RLS boundaries.

## API surfaces

- `app` API: user-safe reads and attention/withdrawal flows.
- `admin` API: permissioned actions, approvals, and gated mutations.
- `worker` API: scheduled jobs and background processing.
- `webhook` API: provider event ingestion with signature verification.
- `audit` API: read-only integrity and accounting visibility.

## Roles

- Mobile/web app: user JWT only; no direct money mutation.
- App backend: `app_api_role`.
- Admin backend: `admin_api_role`.
- Worker backend: `worker_role`, `finance_worker_role`, `ml_worker_role`.
- Audit backend: `readonly_audit_role`.
- Webhooks: provider secret verification (not user JWT).

Never expose DB service keys to clients.

## Envelope contract

All endpoints should use:

- request context: `requestId`, `idempotencyKey`, `clientTimestamp`, bounded `metadata`.
- success response:
  - `ok: true`
  - `data: {...}`
  - `error: null`
  - `requestId`
- error response:
  - `ok: false`
  - `data: null`
  - `error: { code, message, retryable, details }`
  - `requestId`

Use `buildSuccessResponse` and `buildErrorResponse` from `contracts.ts`.

## Validation policy (edge first)

Validate before RPC:

- UUID formats
- score ranges (0..1)
- non-negative frame counts
- positive amount minor values
- idempotency key presence/length
- metadata size (`<= 16KB`)

Do not pass unbounded metadata to DB functions.

## Idempotency

Deterministic keys only for financial and trust mutations, for example:

- `attention_complete:{attentionSessionId}`
- `withdrawal_request:{walletId}:{clientRequestId}`
- `admin_credit:{adminCaseId}:{walletId}:{amountMinor}`
- `provider_event:{providerKey}:{providerEventId}`

Do not use random idempotency keys for economic mutations.

## Retry policy

Safe to retry with same idempotency context:

- attention assignment/start/complete
- withdrawal create
- provider event record
- scheduled job run

Guarded (no blind retries):

- admin credit/debit
- campaign clawback
- external withdrawal submission
- invoice payment recording

## Privacy filtering

App responses must exclude internal fields such as:

- identity graph internals
- admin notes
- legal hold details
- evidence artifact URIs
- processor raw payloads
- accounting journals
- hash chain internals

Use `sanitizeForAppResponse` in app-facing handlers.

## Endpoint map

Endpoint and role/RPC mapping lives in `ENDPOINT_CONTRACTS` in `contracts.ts`.

