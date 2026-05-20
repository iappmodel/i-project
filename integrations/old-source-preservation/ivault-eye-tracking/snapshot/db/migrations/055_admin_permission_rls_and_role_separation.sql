-- Step 6.8 — Admin permission RLS policies + API service role separation
-- Establish explicit trust boundaries across app, admin, worker, and audit roles.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_api_role') then
    create role app_api_role;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'admin_api_role') then
    create role admin_api_role;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'worker_role') then
    create role worker_role;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'finance_worker_role') then
    create role finance_worker_role;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'ml_worker_role') then
    create role ml_worker_role;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'readonly_audit_role') then
    create role readonly_audit_role;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'migration_owner') then
    create role migration_owner;
  end if;
end
$$;

revoke all on schema public from public;
revoke all on all tables in schema public from public;
revoke all on all sequences in schema public from public;
revoke all on all functions in schema public from public;

do $$
declare
  v_role text;
begin
  foreach v_role in array array[
    'authenticated',
    'app_api_role',
    'admin_api_role',
    'worker_role',
    'finance_worker_role',
    'ml_worker_role',
    'readonly_audit_role'
  ]
  loop
    if exists (select 1 from pg_roles where rolname = v_role) then
      execute format('grant usage on schema public to %I', v_role);
    end if;
  end loop;
end
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'wallets',
    'wallet_balance_projections',
    'wallet_value_lots',
    'wallet_ledger_entries',
    'reward_issuance_groups',
    'attention_verification_sessions',
    'attention_verification_events',
    'attention_frame_summaries',
    'attention_fraud_signals',
    'attention_evidence_artifacts',
    'attention_evidence_legal_holds',
    'trust_score_subjects',
    'trust_score_current',
    'trust_signal_events',
    'trust_score_override_events',
    'identity_graph_nodes',
    'identity_graph_edges',
    'identity_graph_observations',
    'admin_users',
    'admin_roles',
    'admin_user_roles',
    'admin_permissions',
    'admin_role_permissions',
    'admin_action_requests',
    'admin_audit_log',
    'accounting_accounts',
    'accounting_journal_entries',
    'accounting_journal_lines',
    'external_payout_records',
    'external_payout_events',
    'payout_reconciliation_issues',
    'campaign_invoices',
    'campaign_invoice_lines',
    'campaign_invoice_payments',
    'audit_hash_chain_entries',
    'audit_hash_chain_anchors'
  ]
  loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('alter table %I enable row level security', v_table);
    end if;
  end loop;
end
$$;

-- Authenticated user wallet access: own read only.
drop policy if exists wallets_user_read_own on wallets;
create policy wallets_user_read_own
on wallets
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists wallets_no_user_insert on wallets;
create policy wallets_no_user_insert
on wallets
for insert
to authenticated
with check (false);

drop policy if exists wallets_no_user_update on wallets;
create policy wallets_no_user_update
on wallets
for update
to authenticated
using (false)
with check (false);

drop policy if exists wallets_no_user_delete on wallets;
create policy wallets_no_user_delete
on wallets
for delete
to authenticated
using (false);

drop policy if exists wallet_balance_projections_user_read_own on wallet_balance_projections;
create policy wallet_balance_projections_user_read_own
on wallet_balance_projections
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists wallet_balance_projections_no_user_write on wallet_balance_projections;
create policy wallet_balance_projections_no_user_write
on wallet_balance_projections
for all
to authenticated
using (false)
with check (false);

drop policy if exists wallet_value_lots_user_read_own on wallet_value_lots;
create policy wallet_value_lots_user_read_own
on wallet_value_lots
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists wallet_ledger_entries_user_read_own on wallet_ledger_entries;
create policy wallet_ledger_entries_user_read_own
on wallet_ledger_entries
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists wallet_value_lots_no_user_write on wallet_value_lots;
create policy wallet_value_lots_no_user_write
on wallet_value_lots
for all
to authenticated
using (false)
with check (false);

drop policy if exists wallet_ledger_entries_no_user_write on wallet_ledger_entries;
create policy wallet_ledger_entries_no_user_write
on wallet_ledger_entries
for all
to authenticated
using (false)
with check (false);

-- Attention visibility: own summaries only, no fraud/evidence internals.
drop policy if exists attention_sessions_user_read_own on attention_verification_sessions;
create policy attention_sessions_user_read_own
on attention_verification_sessions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists attention_events_user_read_own on attention_verification_events;
create policy attention_events_user_read_own
on attention_verification_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists attention_frame_summaries_no_user_access on attention_frame_summaries;
create policy attention_frame_summaries_no_user_access
on attention_frame_summaries
for all
to authenticated
using (false)
with check (false);

drop policy if exists attention_fraud_signals_no_user_access on attention_fraud_signals;
create policy attention_fraud_signals_no_user_access
on attention_fraud_signals
for all
to authenticated
using (false)
with check (false);

drop policy if exists attention_evidence_artifacts_no_user_access on attention_evidence_artifacts;
create policy attention_evidence_artifacts_no_user_access
on attention_evidence_artifacts
for all
to authenticated
using (false)
with check (false);

drop policy if exists attention_evidence_legal_holds_no_user_access on attention_evidence_legal_holds;
create policy attention_evidence_legal_holds_no_user_access
on attention_evidence_legal_holds
for all
to authenticated
using (false)
with check (false);

-- Trust internals blocked from normal users.
drop policy if exists trust_score_subjects_no_user_access on trust_score_subjects;
create policy trust_score_subjects_no_user_access
on trust_score_subjects
for all
to authenticated
using (false)
with check (false);

drop policy if exists trust_score_current_no_user_access on trust_score_current;
create policy trust_score_current_no_user_access
on trust_score_current
for all
to authenticated
using (false)
with check (false);

drop policy if exists trust_signal_events_no_user_access on trust_signal_events;
create policy trust_signal_events_no_user_access
on trust_signal_events
for all
to authenticated
using (false)
with check (false);

drop policy if exists trust_score_override_events_no_user_access on trust_score_override_events;
create policy trust_score_override_events_no_user_access
on trust_score_override_events
for all
to authenticated
using (false)
with check (false);

create or replace view user_wallet_summary as
select
  w.id as wallet_id,
  w.user_id,
  p.currency_code,
  p.available_balance_minor,
  p.pending_balance_minor,
  p.locked_balance_minor,
  (
    p.available_balance_minor
    + p.pending_balance_minor
    + p.locked_balance_minor
  )::bigint as total_balance_minor,
  w.status,
  w.created_at,
  w.updated_at
from wallets w
left join wallet_balance_projections p
  on p.wallet_id = w.id
  and p.user_id = w.user_id;

grant select on user_wallet_summary to authenticated;

do $$
begin
  begin
    execute 'alter view user_wallet_summary set (security_invoker = true)';
  exception
    when others then
      null;
  end;
end
$$;

create or replace function current_admin_user_id()
returns uuid
language sql
stable
as $$
  select id
  from admin_users
  where user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

-- Admin API read permissions.
drop policy if exists admin_api_read_admin_users on admin_users;
create policy admin_api_read_admin_users
on admin_users
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_admin_roles on admin_roles;
create policy admin_api_read_admin_roles
on admin_roles
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_admin_permissions on admin_permissions;
create policy admin_api_read_admin_permissions
on admin_permissions
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_admin_action_requests on admin_action_requests;
create policy admin_api_read_admin_action_requests
on admin_action_requests
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_admin_audit_log on admin_audit_log;
create policy admin_api_read_admin_audit_log
on admin_audit_log
for select
to admin_api_role
using (true);

drop policy if exists admin_api_no_direct_admin_audit_write on admin_audit_log;
create policy admin_api_no_direct_admin_audit_write
on admin_audit_log
for insert
to admin_api_role
with check (false);

drop policy if exists admin_api_read_wallets on wallets;
create policy admin_api_read_wallets
on wallets
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_wallet_lots on wallet_value_lots;
create policy admin_api_read_wallet_lots
on wallet_value_lots
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_wallet_ledger on wallet_ledger_entries;
create policy admin_api_read_wallet_ledger
on wallet_ledger_entries
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_attention_events on attention_verification_events;
create policy admin_api_read_attention_events
on attention_verification_events
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_attention_sessions on attention_verification_sessions;
create policy admin_api_read_attention_sessions
on attention_verification_sessions
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_trust_current on trust_score_current;
create policy admin_api_read_trust_current
on trust_score_current
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_trust_signals on trust_signal_events;
create policy admin_api_read_trust_signals
on trust_signal_events
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_identity_graph_nodes on identity_graph_nodes;
create policy admin_api_read_identity_graph_nodes
on identity_graph_nodes
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_identity_graph_edges on identity_graph_edges;
create policy admin_api_read_identity_graph_edges
on identity_graph_edges
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_evidence_artifacts on attention_evidence_artifacts;
create policy admin_api_read_evidence_artifacts
on attention_evidence_artifacts
for select
to admin_api_role
using (
  admin_has_permission(current_admin_user_id(), 'evidence.read')
);

-- Block direct admin mutations on dangerous tables.
drop policy if exists admin_api_no_direct_wallet_write on wallets;
create policy admin_api_no_direct_wallet_write
on wallets
for all
to admin_api_role
using (false)
with check (false);

drop policy if exists admin_api_no_direct_wallet_lot_write on wallet_value_lots;
create policy admin_api_no_direct_wallet_lot_write
on wallet_value_lots
for all
to admin_api_role
using (false)
with check (false);

drop policy if exists admin_api_no_direct_wallet_ledger_write on wallet_ledger_entries;
create policy admin_api_no_direct_wallet_ledger_write
on wallet_ledger_entries
for all
to admin_api_role
using (false)
with check (false);

drop policy if exists admin_api_no_direct_trust_current_write on trust_score_current;
create policy admin_api_no_direct_trust_current_write
on trust_score_current
for all
to admin_api_role
using (false)
with check (false);

drop policy if exists admin_api_no_direct_accounting_write on accounting_journal_entries;
create policy admin_api_no_direct_accounting_write
on accounting_journal_entries
for all
to admin_api_role
using (false)
with check (false);

-- Function execution tracing for high-risk wrappers.
create table if not exists admin_function_execution_log (
  id uuid primary key default gen_random_uuid(),

  admin_user_id uuid references admin_users(id),

  function_name text not null,
  permission_key text,

  admin_action_request_id uuid references admin_action_requests(id),
  admin_case_id uuid,

  target_type text,
  target_id uuid,
  wallet_id uuid references wallets(id),
  user_id uuid,
  campaign_id uuid,

  status text not null,

  error_message text,

  metadata jsonb not null default '{}'::jsonb,

  started_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint admin_function_execution_log_status_check
  check (
    status in (
      'started',
      'completed',
      'failed'
    )
  )
);

create index if not exists admin_function_execution_log_admin_idx
on admin_function_execution_log (admin_user_id, started_at desc);

create index if not exists admin_function_execution_log_function_idx
on admin_function_execution_log (function_name, started_at desc);

do $$
declare
  v_sig text;
begin
  -- Admin API execute grants (gated wrappers only).
  foreach v_sig in array array[
    'public.request_admin_action(uuid,text,text,uuid,text,uuid,uuid,uuid,uuid,jsonb,jsonb)',
    'public.approve_admin_action(uuid,uuid,text,jsonb)',
    'public.gated_admin_credit_wallet_balance(uuid,uuid,uuid,uuid,bigint,text,text,text,uuid,text,jsonb)',
    'public.gated_apply_trust_score_override(uuid,uuid,text,uuid,uuid,uuid,numeric,numeric,numeric,text,uuid,timestamptz,jsonb)',
    'public.gated_place_attention_evidence_legal_hold(uuid,uuid,uuid,text,text,uuid,timestamptz,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('grant execute on function %s to admin_api_role', v_sig);
    end if;
  end loop;

  -- Revoke dangerous raw functions from admin role.
  foreach v_sig in array array[
    'public.admin_credit_wallet_balance(uuid,uuid,bigint,text,text,text,uuid,uuid,text,jsonb)',
    'public.admin_debit_wallet_balance(uuid,uuid,bigint,text,text,text,uuid,uuid,text,jsonb)',
    'public.apply_trust_score_override(text,uuid,uuid,uuid,numeric,numeric,numeric,text,uuid,uuid,timestamptz,jsonb)',
    'public.clear_trust_score_override(text,uuid,text,uuid,uuid,jsonb)',
    'public.place_attention_evidence_legal_hold(uuid,text,text,uuid,timestamptz,jsonb)',
    'public.revoke_attention_model_version(text,text,uuid,jsonb)',
    'public.run_trust_backfill_job(text,text,text,uuid,uuid,integer,boolean,uuid,uuid,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('revoke execute on function %s from admin_api_role', v_sig);
    end if;
  end loop;

  -- App API grants.
  foreach v_sig in array array[
    'public.resolve_attention_runtime_assignment(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb)',
    'public.start_attention_verification_session_from_assignment(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb)',
    'public.complete_attention_verification_event(uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,integer,integer,integer,integer,integer,integer,uuid,text,text,text,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('grant execute on function %s to app_api_role', v_sig);
    end if;
  end loop;

  foreach v_sig in array array[
    'public.admin_credit_wallet_balance(uuid,uuid,bigint,text,text,text,uuid,uuid,text,jsonb)',
    'public.admin_debit_wallet_balance(uuid,uuid,bigint,text,text,text,uuid,uuid,text,jsonb)',
    'public.apply_trust_score_override(text,uuid,uuid,uuid,numeric,numeric,numeric,text,uuid,uuid,timestamptz,jsonb)',
    'public.gated_admin_credit_wallet_balance(uuid,uuid,uuid,uuid,bigint,text,text,text,uuid,text,jsonb)',
    'public.gated_apply_trust_score_override(uuid,uuid,text,uuid,uuid,uuid,numeric,numeric,numeric,text,uuid,timestamptz,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('revoke execute on function %s from app_api_role', v_sig);
    end if;
  end loop;

  -- Worker role grants.
  foreach v_sig in array array[
    'public.run_reward_issuance_job(integer,jsonb)',
    'public.run_trust_decay_job(integer,jsonb)',
    'public.run_trust_decay_and_policy_sync_job(integer,jsonb)',
    'public.run_identity_graph_risk_job(jsonb)',
    'public.run_attention_evidence_retention_job(integer,jsonb)',
    'public.run_audit_hash_backfill_job(integer,jsonb)',
    'public.verify_audit_hash_chain(text,integer,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('grant execute on function %s to worker_role', v_sig);
    end if;
  end loop;

  foreach v_sig in array array[
    'public.run_accounting_mirror_job(integer,jsonb)',
    'public.run_withdrawal_reversal_detection_job(integer,jsonb)',
    'public.run_campaign_invoice_reconciliation_job(uuid,uuid,integer,jsonb)',
    'public.run_campaign_invoice_accounting_mirror_job(integer,jsonb)',
    'public.run_external_payout_reconciliation_job(integer,text,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('grant execute on function %s to finance_worker_role', v_sig);
    end if;
  end loop;

  foreach v_sig in array array[
    'public.compute_attention_rollout_metrics(timestamptz,timestamptz,jsonb)',
    'public.auto_pause_risky_attention_rollouts(jsonb)',
    'public.run_attention_model_reevaluation_job(text,text,text,text,text,uuid,uuid,uuid,text,text,text,timestamptz,timestamptz,integer,boolean,boolean,uuid,uuid,jsonb)',
    'public.continue_attention_model_reevaluation_job(uuid,integer,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('grant execute on function %s to ml_worker_role', v_sig);
    end if;
  end loop;
end
$$;

-- Read-only audit role: compliance visibility, no write grants.
grant select on audit_hash_chain_entries to readonly_audit_role;
grant select on audit_hash_chain_anchors to readonly_audit_role;
grant select on admin_audit_log to readonly_audit_role;
grant select on trust_score_override_events to readonly_audit_role;
grant select on accounting_journal_entries to readonly_audit_role;
grant select on accounting_journal_lines to readonly_audit_role;

do $$
declare
  v_rel text;
begin
  foreach v_rel in array array[
    'audit_hash_chain_dashboard',
    'audit_hash_chain_verification_dashboard',
    'accounting_account_balances',
    'reward_issuance_details',
    'payout_reconciliation_dashboard',
    'campaign_invoice_details'
  ]
  loop
    if to_regclass(format('public.%I', v_rel)) is not null then
      execute format('grant select on %I to readonly_audit_role', v_rel);
    end if;
  end loop;
end
$$;

-- Gated wrappers: security definer + pinned search_path.
do $$
declare
  v_sig text;
begin
  foreach v_sig in array array[
    'public.gated_admin_credit_wallet_balance(uuid,uuid,uuid,uuid,bigint,text,text,text,uuid,text,jsonb)',
    'public.gated_apply_trust_score_override(uuid,uuid,text,uuid,uuid,uuid,numeric,numeric,numeric,text,uuid,timestamptz,jsonb)',
    'public.gated_place_attention_evidence_legal_hold(uuid,uuid,uuid,text,text,uuid,timestamptz,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('alter function %s security definer', v_sig);
      execute format('alter function %s set search_path = public', v_sig);
    end if;
  end loop;
end
$$;
