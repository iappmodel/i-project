# Final Architecture Index (Step 6.18)

This file is the canonical system map for the platform.

It defines:

- what exists
- what owns what
- what connects to what
- what runs automatically
- what must never be bypassed
- what is still not production-complete

Core rule:

The platform is not one app.
It is a financial + attention + trust + campaign operating system.

## 1) Platform spine

User-facing pillars:

- Feed
- Earn
- Wallet
- Profile

Runtime spine:

```text
attention verification
  ↓
reward issuance
  ↓
wallet ledger
  ↓
accounting mirror
  ↓
trust policy
  ↓
payout / withdrawal
  ↓
audit / reconciliation / observability
```

This is the core machine.

## 2) Canonical system modules

01. Wallet Ledger
02. Campaign Budget Engine
03. Attention Runtime Registry
04. Attention Verification Engine
05. Reward Issuance Engine
06. Trust Score Engine
07. Identity Graph Risk Layer
08. Admin Permission System
09. Accounting Mirror
10. Audit Hash Chain
11. External Payout Reconciliation
12. Withdrawal State Machine
13. Campaign Invoice Reconciliation
14. Model Rollout Registry
15. Model Re-evaluation Jobs
16. Scheduler / Cron Layer
17. Error Taxonomy
18. Observability Layer
19. Dev Fixtures
20. RLS / API Role Separation
21. API Contracts / DTOs

These are not optional if the platform handles real money-like value.

## 3) Data flow: verified attention to reward

```text
User watches / engages
  ↓
Attention session starts
  ↓
Runtime assignment chooses model/pipeline/scoring version
  ↓
Attention event completes
  ↓
Decision is stored
  ↓
Reward eligibility checked
  ↓
Reward issuance group created
  ↓
Campaign budget reserved / issued
  ↓
Wallet value lot created
  ↓
Wallet ledger entry posted
  ↓
Accounting journal mirrored
  ↓
Audit hash chain seals critical records
  ↓
Observability emits reward flow metrics
```

Important principle:

Attention event does not directly credit money.
Reward engine credits wallet through controlled issuance.

## 4) Data flow: wallet to withdrawal

```text
User requests withdrawal
  ↓
Trust gate evaluates wallet/user risk
  ↓
Withdrawal request created
  ↓
Finance worker reserves available wallet lots
  ↓
Wallet available decreases
  ↓
Wallet locked increases
  ↓
External payout record created
  ↓
Provider webhook/event arrives
  ↓
External payout state updates
  ↓
Withdrawal state syncs
  ↓
If paid:
      reserved lots consumed
      locked balance decreases
      total balance decreases
      accounting mirror posts
  ↓
If failed:
      reserved lots released
      available balance restored
      accounting mirror reverses payable
  ↓
If reversed after paid:
      reversal group created
      wallet recredit only if money returned
      otherwise admin review
```

Important principle:

Provider truth controls payout settlement.
Wallet state changes only through withdrawal state machine.

## 5) Data flow: campaign money

```text
Advertiser funds campaign / owes invoice
  ↓
Campaign budget tracks funded, reserved, issued, released, refunded
  ↓
Reward engine spends against campaign budget
  ↓
Campaign invoice engine creates invoice lines
  ↓
Invoice payment records advertiser payment
  ↓
Accounting mirrors receivable/revenue/cash
  ↓
Campaign invoice reconciliation checks deltas
```

Financial triangle:

```text
campaign budget engine
  vs
invoice/payment engine
  vs
accounting journal
```

If these disagree, it is a finance issue.

## 6) Data flow: trust and fraud

```text
Attention events
wallet events
withdrawals
payout reversals
identity graph observations
admin actions
model re-evaluations
  ↓
Trust signals
  ↓
Trust score calculation
  ↓
Wallet policy sync
  ↓
Trust gates
  ↓
Reward / withdrawal / admin restrictions
```

Trust is not a single score. It is an operating layer controlling:

- withdrawal eligibility
- reward hold behavior
- fraud lock behavior
- admin review paths
- identity graph risk response

## 7) Data flow: audit integrity

```text
Wallet ledger entry
Accounting journal
Admin audit log
Attention verification event
Reward issuance group
Trust override
  ↓
Canonical event payload
  ↓
Event hash
  ↓
Previous chain hash
  ↓
Current chain hash
  ↓
Verification job
  ↓
External anchor
```

Audit hash chain:

- detects tampering
- does not prevent tampering by itself

Prevention is provided by:

- RLS
- role separation
- limited grants
- service key isolation
- append-only design
- external backups
- external hash anchors

## 8) Runtime / model control

Versioned control dimensions:

- Attention model version
- Pipeline version
- Runtime signal schema version
- Scoring formula version

Control path:

```text
Rollout registry
  ↓
Experiment registry
  ↓
Sticky runtime assignment
  ↓
Attention session
  ↓
Attention event provenance
  ↓
Rollout metrics
  ↓
Guardrail auto-pause
```

No model should go straight to 100%.

Rollout ladder:

- internal
- 1%
- 5%
- 10%
- 25%
- 50%
- 100%

Kill switch purpose:

stop bad model behavior before it damages money/trust.

## 9) Model re-evaluation

Question answered:

Would a newer model have judged old attention events differently?

Hard constraints:

- never overwrite original historical events
- original decision remains canonical
- newer model output is additional evidence only

Required behavior:

- original event remains unchanged
- new model opinion stored separately
- decision deltas go to review queue
- missing reward can be issued after admin review
- possible overreward goes to review, not automatic clawback

Hard rule:

A new model is evidence, not judge/jury/executioner.

## 10) Scheduler layer

Automatic jobs currently include:

- reward issuance
- accounting mirror
- payout provider event processing
- campaign invoice accounting mirror
- trust override expiration
- identity graph risk
- audit hash backfill
- payout reconciliation
- withdrawal reversal detection
- withdrawal maintenance
- attention rollout metrics
- attention rollout guardrails
- trust decay
- campaign invoice reconciliation
- attention evidence retention
- audit hash verification
- observability snapshots

Job requirements:

- registered
- locked
- logged
- allowlisted
- idempotent
- retry-safe
- observable

Hard rule:

No arbitrary SQL execution from scheduler.
Only allowlisted job functions.

## 11) API boundaries

Five API surfaces:

1. App API
   - user wallet
   - attention session
   - withdrawal request
2. Admin API
   - dashboards
   - gated actions
   - reviews
   - overrides
3. Worker API
   - scheduled jobs
   - reconciliation
   - retention
   - rollout metrics
4. Webhook API
   - provider events
5. Audit API
   - audit exports
   - hash verification
   - accounting views

Critical rule:

Clients do not mutate financial tables directly.

Contract:

`client → API → gated RPC/function → tables`

## 12) Role separation

- `authenticated`: normal app user
- `app_api_role`: normal backend product operations
- `admin_api_role`: admin dashboard reads + gated admin functions
- `worker_role`: general scheduled jobs
- `finance_worker_role`: payout, withdrawal, reconciliation, accounting
- `ml_worker_role`: rollout metrics and re-evaluation
- `readonly_audit_role`: compliance/audit read-only
- `migration_owner`: schema changes only

Hard rule:

No mobile/web client gets service-level power.

## 13) Admin action model

Admin action flow:

```text
admin requests action
  ↓
permission checked
  ↓
case ID required if risky
  ↓
MFA required if risky
  ↓
approval required if risky
  ↓
two-person rule if critical
  ↓
gated wrapper executes
  ↓
admin audit log records
  ↓
platform event emits
  ↓
hash chain seals critical records
```

Admins must not directly edit:

- wallet balances
- ledger entries
- trust scores
- withdrawals
- accounting journals
- campaign budgets
- payout records

They request controlled actions through wrappers.

## 14) Observability command center

Required dashboards:

- System Health
- Money Integrity
- Reward Flow
- Attention Health
- Withdrawal / Payout Health
- Trust / Fraud Health
- Campaign Health
- Model Rollout Health
- Admin Activity
- Scheduler Health
- Error Dashboard
- Audit Hash Health

Most important red flags:

- unbalanced journals > 0
- audit hash broken > 0
- wallet/accounting delta unexplained
- failed jobs spike
- payout reconciliation issues spike
- fraud suspected rate spike
- campaign budget/invoice delta
- withdrawals stuck in processing

If these are not visible, the system is not production-ready.

## 15) Error model

Every error must have:

- `error_code`
- `category`
- `severity`
- HTTP status
- retryable flag
- user message
- internal message
- owner team

Policy:

- Public users receive safe errors.
- Internal systems receive exact diagnostics.
- Fraud/accounting/model internals are never leaked to attackers.

## 16) Privacy model

User can see:

- wallet summary
- ledger history
- reward history
- withdrawal status
- attention result summary
- visible status reason

User cannot see:

- fraud internals
- identity graph
- trust calculation internals
- admin notes
- provider raw payloads
- accounting journals
- audit hash chain
- model targeting logic
- evidence artifact URIs

Transparency and exploitability are not the same thing.

## 17) Current complete architecture state

Implemented architecture includes:

- wallet ledger
- value lots
- pending/available/locked balances
- reward issuance
- campaign budget reserve/issue/release/refund
- attention verification
- runtime model provenance
- trust score engine
- identity graph risk layer
- admin permission system
- admin action approval
- double-entry accounting mirror
- audit hash chain
- external payout records
- provider event processing
- payout reconciliation
- withdrawal state machine
- withdrawal reversal handling
- campaign invoice reconciliation
- model rollout registry
- model re-evaluation jobs
- scheduler
- error taxonomy
- observability dashboards
- dev fixtures
- RLS/role separation
- API contracts
- DTO layer

This is a real backend architecture, not app-only tables.

## 18) Remaining implementation checklist

Execution now has a dedicated checklist in:

- [`IMPLEMENTATION_CHECKLIST.md`](IMPLEMENTATION_CHECKLIST.md)

Use that file as the canonical build order, acceptance criteria, hard-fail gates,
smoke tests, security checks, reconciliation invariants, and production readiness gates.

## 19) Critical unresolved risks

Not solved yet:

- real biometric/privacy compliance
- real payout provider compliance
- KYC/AML requirements
- tax reporting
- chargeback/legal disputes
- data retention jurisdiction rules
- raw camera evidence policy
- bank/payment processor review
- security penetration testing
- model bias and false-positive audit
- consumer disclosure wording
- app store privacy disclosures

These are legal/compliance/product risks, not SQL-only problems.

## Non-bypass invariants

These constraints are absolute:

1. Attention does not directly credit money.
2. Wallet mutations flow through controlled issuance and ledgered state transitions.
3. Provider truth governs payout settlement outcomes.
4. Scheduler executes allowlisted jobs only (no arbitrary SQL).
5. Admin writes happen through gated wrappers with full audit trail.
6. Financial/client boundaries are API-gated and role-separated.
7. Audit chain detects tamper; control-plane hardening prevents and contains tamper.
