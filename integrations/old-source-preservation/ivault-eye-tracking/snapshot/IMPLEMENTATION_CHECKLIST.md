# Step 6.19 - Implementation Checklist

This is the execution bridge from architecture to build work.

Core rule: architecture is only complete when it compiles into ordered migrations, callable APIs, passing smoke tests, and visible dashboards.

## Phase order

1. Database foundation
2. Core money loop
3. Attention -> reward loop
4. Trust + admin controls
5. Withdrawal / payout
6. Accounting / reconciliation / audit
7. Scheduler / observability
8. API layer
9. Admin console
10. Staging hardening

Fastest path: make one complete money loop work correctly before expanding scope.

## Required execution artifacts

- `db/smoke_test_core.sql`
- `db/security_rls_smoke_test.sql`
- `db/reconciliation_invariants_smoke_test.sql`
- API contract smoke tests in `backend/api/implementationChecklist.smoke.test.ts`

## Immediate build order (next session)

1. Create migration files in canonical order.
2. Implement only Phase 1 + Phase 2.
3. Reset local DB.
4. Run migrations.
5. Create one wallet and one value lot.
6. Post one ledger entry.
7. Verify wallet summary.
8. Add accounting only after wallet ledger is correct.

## MVP backend scope

The current MVP backend target is:

- Wallet ledger
- Campaign budget
- Attention verification
- Reward issuance
- Withdrawal request
- Accounting mirror
- Admin permission
- Basic scheduler
- Basic observability
- RLS
- API DTO mapping
# Implementation Checklist (Step 6.19)

Now we stop designing and turn the system into build work.

Core rule:

Architecture is useless until it becomes ordered migrations, callable APIs, passing smoke tests, and visible dashboards.

This checklist is the execution bridge.

## 1) Implementation phases

Do not build everything at once.

Use this sequence:

1. Phase 1 -- Database foundation
2. Phase 2 -- Core money loop
3. Phase 3 -- Attention -> reward loop
4. Phase 4 -- Trust + admin controls
5. Phase 5 -- Payout / withdrawal
6. Phase 6 -- Accounting / reconciliation / audit
7. Phase 7 -- Scheduler / observability
8. Phase 8 -- API layer
9. Phase 9 -- Admin console
10. Phase 10 -- Staging hardening

The fastest path is not "build all features."

The fastest path is:

make one complete money loop work correctly

## 2) Phase 1 -- Database foundation

Build:

- extensions
- wallet tables
- wallet ledger
- wallet value lots
- campaign budgets
- attention runtime tables
- attention sessions/events
- reward issuance tables
- trust base tables
- admin permission base tables
- accounting base tables

Minimum acceptance:

```sql
select gen_random_uuid();

select *
from wallets
limit 1;

select *
from accounting_accounts
limit 5;
```

Pass condition:

- all base tables exist
- all enum/check constraints compile
- all FK references resolve
- no missing table/function errors

## 3) Phase 2 -- Core wallet money loop

Build and test:

- wallet creation
- value lot creation
- ledger entry creation
- pending/available/locked logic
- admin credit
- admin debit
- wallet summary view

Smoke test:

```sql
-- create wallet
-- create available value lot
-- post ledger credit
-- confirm wallet total equals lots/ledger
```

Expected:

- available balance increases
- wallet ledger has posted entry
- wallet value lot exists
- wallet summary returns clean user-safe result

Hard fail if:

- wallet total goes negative
- ledger entry posts without wallet balance change
- wallet balance changes without ledger entry

## 4) Phase 3 -- Attention -> reward loop

Build:

- attention runtime versions
- attention session start
- attention event complete
- reward issuance group
- campaign budget reserve
- wallet reward lot
- wallet ledger reward entry

Test happy path:

- passed attention event
- reward eligible true
- campaign has budget
- reward issuance job runs
- wallet pending balance increases
- campaign issued amount increases

Expected chain:

```text
attention_event
  -> reward_issuance_group
  -> campaign_budget_reservation
  -> wallet_value_lot
  -> wallet_ledger_entry
```

Hard fail if:

- client can directly credit wallet
- reward can issue twice for same attention event
- campaign budget can go below zero
- reward issued without wallet ledger entry

## 5) Phase 4 -- Trust + admin controls

Build:

- trust signal events
- trust score current
- trust calculation
- trust gate
- wallet policy sync
- admin users
- admin roles
- admin permissions
- admin action requests
- admin audit log
- gated admin wrappers

Test:

- record positive trust signal
- record negative trust signal
- calculate trust score
- evaluate withdrawal trust gate
- request admin action
- approve admin action
- execute gated trust override

Expected:

- trust score updates
- wallet policy updates
- admin action requires permission
- critical action requires approval/case/MFA
- admin audit log records decision

Hard fail if:

- admin can override trust without audit
- admin can execute critical action without approval
- trust gate can be bypassed by direct table write

## 6) Phase 5 -- Withdrawal / payout loop

Build:

- withdrawal_requests
- withdrawal_reserved_lots
- withdrawal_status_events
- payout_providers
- external_payouts
- payout_provider_events
- withdrawal reserve
- provider submit
- provider event sync
- mark paid
- mark failed/release
- withdrawal reversal groups
- reversal review queue

Happy path test:

- user requests withdrawal
- trust gate allows
- funds reserved
- external payout created
- provider paid event recorded
- provider event processing job runs
- withdrawal marked paid
- wallet locked decreases
- wallet total decreases

Failure path test:

- withdrawal reserved
- provider failed event recorded
- funds released
- available balance restored
- withdrawal marked failed

Reversal path test:

- paid payout later reversed
- if money returned -> wallet recredited
- if unknown/not returned -> review queue

Hard fail if:

- provider event updates external payout but not withdrawal
- failed payout does not release locked funds
- paid payout does not consume reserved lots
- reversed payout blindly recredits without cash impact confirmation

## 7) Phase 6 -- Accounting / reconciliation / audit

Build:

- double-entry accounting
- accounting mirror jobs
- account balances
- unbalanced journal detection
- audit hash chain
- hash backfill
- hash verification
- payout reconciliation
- campaign invoice reconciliation

Smoke tests:

```sql
select run_accounting_mirror_job(
  500,
  '{"smoke_test": true}'::jsonb
);

select verify_audit_hash_chain(
  'global_audit_chain',
  100000,
  '{"smoke_test": true}'::jsonb
);
```

Expected:

- unbalanced journal count = 0
- audit broken count = 0
- missing mirrors eventually = 0

Hard fail if:

- journal can post unbalanced
- wallet money movement lacks accounting mirror
- critical records are not hash chained
- audit verification breaks after normal operations

## 8) Phase 7 -- Scheduler / observability

Build:

- scheduled_jobs
- scheduled_job_runs
- scheduled_job_locks
- allowlisted dispatcher
- error catalog
- error events
- platform events
- system health snapshots
- alert rules
- alert events
- operations dashboards

Test:

```sql
select run_scheduled_job(
  'reward_issuance_every_minute',
  'manual_smoke_test',
  '{"smoke_test": true}'::jsonb
);

select create_system_health_snapshot(
  'manual',
  '{"smoke_test": true}'::jsonb
);
```

Expected:

- job run logged
- lock acquired/released
- snapshot created
- dashboard returns latest snapshot
- alerts created only when thresholds trigger

Hard fail if:

- scheduler executes arbitrary function names dynamically
- failed jobs disappear without logs
- dashboard hides critical money/audit failures

## 9) Phase 8 -- API layer

Build endpoints in this order:

- `GET  /v1/wallet/summary`
- `GET  /v1/wallet/ledger`
- `POST /v1/attention/assignment`
- `POST /v1/attention/session/start`
- `POST /v1/attention/session/complete`
- `POST /v1/withdrawals`
- `GET  /v1/withdrawals/:id`
- `POST /v1/webhooks/payout/:providerKey`
- `POST /v1/worker/jobs/run`

Then admin endpoints:

- `POST /v1/admin/actions/request`
- `POST /v1/admin/actions/:id/approve`
- `POST /v1/admin/wallets/:id/credit`
- `POST /v1/admin/trust/override`
- `POST /v1/admin/withdrawals/:id/cancel`
- `POST /v1/admin/withdrawals/:id/fail-release`
- `GET  /v1/admin/operations`
- `GET  /v1/admin/money-integrity`
- `GET  /v1/admin/jobs`
- `GET  /v1/admin/alerts`

Hard rules:

- API maps DB rows to DTOs
- API never returns raw DB rows
- API validates metadata size
- API resolves user_id from auth, not client body
- API wraps errors through error taxonomy

## 10) Phase 9 -- Admin console

Build panels in this order:

- System health
- Money integrity
- Wallet lookup
- Withdrawal lookup
- Reward flow
- Attention event detail
- Payout reconciliation
- Campaign finance
- Trust profile
- Admin action queue
- Scheduler
- Alerts
- Audit hash chain

Admin console must support:

- read details
- request action
- approve action
- execute gated action
- resolve review queue
- acknowledge/resolve alerts

Hard fail if:

- admin console directly edits database rows
- admin console hides approval/case requirements
- admin console exposes evidence/fraud internals without permission

## 11) Phase 10 -- Staging hardening

Before production, staging must pass:

- migration from empty DB
- fixture seed
- full attention -> reward flow
- full withdrawal paid flow
- withdrawal failed release flow
- payout reversal review flow
- accounting mirror job
- audit hash verification
- scheduler run
- observability snapshot
- RLS access tests
- admin gated action tests
- webhook idempotency tests

No exceptions.

## 12) Required smoke test script

Create one script called:

`smoke_test_core.sql`

It should run:

```sql
select gen_random_uuid();

select seed_demo_environment(
  'smoke_demo',
  'v1',
  '{"source": "smoke_test"}'::jsonb
);

select run_reward_issuance_job(
  500,
  '{"source": "smoke_test"}'::jsonb
);

select run_accounting_mirror_job(
  500,
  '{"source": "smoke_test"}'::jsonb
);

select run_audit_hash_backfill_job(
  1000,
  '{"source": "smoke_test"}'::jsonb
);

select verify_audit_hash_chain(
  'global_audit_chain',
  100000,
  '{"source": "smoke_test"}'::jsonb
);

select create_system_health_snapshot(
  'manual',
  '{"source": "smoke_test"}'::jsonb
);

select *
from platform_operations_dashboard;

select *
from money_integrity_dashboard;
```

Pass criteria:

- no SQL errors
- system snapshot created
- audit broken count = 0
- unbalanced journal count = 0
- dashboard returns data

## 13) Required API smoke tests

Create API tests:

- wallet summary returns only own wallet
- wallet ledger returns only own entries
- attention assignment returns runtimeAssignmentId
- attention start returns attentionSessionId
- attention complete returns attentionEventId
- withdrawal create returns withdrawalRequestId
- withdrawal detail cannot read another user withdrawal
- admin action request requires permission
- admin critical action requires approval
- worker job endpoint rejects user token
- webhook rejects invalid signature

Hard fail if:

- any user can read another user's wallet/withdrawal
- any client can call worker/admin endpoints
- any admin action executes without audit

## 14) Required security tests

Test RLS:

- authenticated user cannot insert wallet ledger
- authenticated user cannot update wallet
- authenticated user cannot read fraud signals
- authenticated user cannot read identity graph
- authenticated user cannot read accounting journals
- admin_api_role cannot directly mutate wallet ledger
- app_api_role cannot directly mutate withdrawal state
- readonly_audit_role cannot write anything

Test service separation:

- app_api_role cannot run finance reconciliation
- admin_api_role cannot run raw withdrawal mutation
- worker_role cannot execute admin wallet credit
- finance_worker_role can process payouts
- ml_worker_role can compute rollout metrics

## 15) Required reconciliation tests

Test these invariants:

- wallet total = available + pending + locked
- no wallet balance update without ledger entry
- no reward issued twice for same attention event
- campaign budget issued <= funded - refunded
- accounting journals balanced
- withdrawal reserved lots sum equals requested amount while reserved
- failed withdrawal releases exactly reserved amount
- paid withdrawal consumes exactly reserved amount
- audit hash verification returns zero broken entries

These should become automated tests, not manual checks.

## 16) Real provider integration checklist

Before connecting Stripe/PayPal/bank/etc:

- provider idempotency keys mapped to withdrawal_request_id
- webhook signature verification implemented
- provider event IDs deduped
- provider status normalized
- provider amount/currency verified
- provider payout ID stored
- provider failure codes mapped
- provider reversal events tested
- provider sandbox tested
- reconciliation job compares provider truth
- no webhook directly credits wallet

Hard fail if:

- webhook can credit wallet directly
- provider event can be replayed to double-process
- amount mismatch is ignored
- currency mismatch is ignored

## 17) Production readiness gates

Do not go production until:

- RLS enabled and tested
- service keys separated
- admin MFA enforced
- critical admin actions require approval
- audit hash chain running
- accounting mirror running
- observability snapshot running
- scheduled job alerts working
- error taxonomy implemented
- provider webhook signature verification working
- backup/restore tested
- secrets not in repo
- demo fixtures disabled

This is the line between demo and production.

## 18) What to build first tomorrow

Start with this exact order:

1. Create migration files using the migration ordering.
2. Implement only Phase 1 + Phase 2 first.
3. Run local database reset.
4. Run migrations.
5. Create one wallet and one value lot.
6. Post one ledger entry.
7. Verify wallet summary.
8. Add accounting only after wallet ledger works.

Do not start with model rollout, observability, or admin console.

Start with money correctness.

## 19) The real MVP backend

The backend MVP is not all 21 modules.

The true MVP is:

- wallet ledger
- campaign budget
- attention verification
- reward issuance
- withdrawal request
- accounting mirror
- admin permission
- basic scheduler
- basic observability
- RLS
- API DTOs

Everything else can expand after the core loop works.

But do not delete the other architecture. Keep it as the production path.

## 20) Final current state

You now have:

- canonical architecture
- event types
- backend schema
- wallet ledger
- value lots
- reward issuance
- trust score
- campaign lifecycle
- budget reserve
- attention verification connection
- wallet pending/available/withdrawal logic
- admin controls
- accounting mirror
- audit hash chain
- payout reconciliation
- withdrawal reversal
- campaign invoice reconciliation
- model rollout
- model re-evaluation
- RLS/service roles
- withdrawal formalization
- scheduler
- API contracts
- error taxonomy
- observability
- fixtures
- migration ordering
- withdrawal admin wrappers
- DTOs
- final architecture index
- implementation checklist

The design phase is complete enough.
