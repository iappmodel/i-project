-- Phase 15: required reconciliation invariants.
-- This script is intentionally read-only and can run repeatedly in staging.

-- Invariant 1: wallet total = available + pending + locked
select
  count(*) as wallet_balance_mismatch_count
from wallets w
where w.total_balance_minor <> (
  w.available_balance_minor + w.pending_balance_minor + w.locked_balance_minor
);

-- Invariant 2: no reward issued twice for same attention event
select
  attention_event_id,
  count(*) as duplicate_issuance_count
from reward_issuance_groups
where attention_event_id is not null
group by attention_event_id
having count(*) > 1;

-- Invariant 3: campaign issued <= funded - refunded
select
  cba.campaign_id,
  cba.funded_minor,
  cba.spent_minor,
  coalesce(cba.released_minor, 0) as refunded_minor
from campaign_budget_accounts cba
where cba.spent_minor > (cba.funded_minor - coalesce(cba.released_minor, 0));

-- Invariant 4: accounting journals balanced
select
  journal_id,
  sum(debit_minor) as total_debit_minor,
  sum(credit_minor) as total_credit_minor
from accounting_journal_entries
group by journal_id
having sum(debit_minor) <> sum(credit_minor);

-- Invariant 5: audit hash integrity
select *
from verify_audit_hash_chain(
  'global_audit_chain',
  100000,
  '{"source":"reconciliation_invariants_smoke_test"}'::jsonb
);
