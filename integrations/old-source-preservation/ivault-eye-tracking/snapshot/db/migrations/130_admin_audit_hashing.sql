-- Step 9.12 — Hash admin audit logs + privileged action events into audit chain.
-- Runs after 129_admin_privileged_action_execution.sql.

create or replace function hash_admin_action_audit_log(
  p_admin_action_audit_log_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_log admin_action_audit_log%rowtype;
  v_payload jsonb;
begin
  select *
  into v_log
  from admin_action_audit_log
  where id = p_admin_action_audit_log_id;

  if v_log.id is null then
    raise exception 'admin action audit log not found: %', p_admin_action_audit_log_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'admin_action_audit_log',
    'source_id', v_log.id,
    'admin_user_id', v_log.admin_user_id,
    'admin_auth_user_id', v_log.admin_auth_user_id,
    'action_key', v_log.action_key,
    'permission_key', v_log.permission_key,
    'target_type', v_log.target_type,
    'target_id', v_log.target_id,
    'request_id', v_log.request_id,
    'endpoint', v_log.endpoint,
    'method', v_log.method,
    'decision', v_log.decision,
    'reason', v_log.reason,
    'occurred_at', v_log.occurred_at,
    'created_at', v_log.created_at
  );

  return append_audit_hash_chain_entry(
    'admin_action_audit_log',
    v_log.id,
    v_payload,
    'global_audit_chain',
    p_metadata
  );
end;
$$;

create or replace function hash_admin_privileged_action_request(
  p_privileged_action_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_privileged_action_requests%rowtype;
  v_payload jsonb;
begin
  select *
  into v_request
  from admin_privileged_action_requests
  where id = p_privileged_action_request_id;

  if v_request.id is null then
    raise exception 'admin privileged action request not found: %', p_privileged_action_request_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'admin_privileged_action_request',
    'source_id', v_request.id,
    'requested_by_auth_user_id', v_request.requested_by_auth_user_id,
    'requested_by_admin_user_id', v_request.requested_by_admin_user_id,
    'action_key', v_request.action_key,
    'target_auth_user_id', v_request.target_auth_user_id,
    'target_admin_user_id', v_request.target_admin_user_id,
    'target_role_key', v_request.target_role_key,
    'target_permission_key', v_request.target_permission_key,
    'status', v_request.status,
    'reason', v_request.reason,
    'approved_by_auth_user_id', v_request.approved_by_auth_user_id,
    'approved_by_admin_user_id', v_request.approved_by_admin_user_id,
    'approved_at', v_request.approved_at,
    'rejected_by_auth_user_id', v_request.rejected_by_auth_user_id,
    'rejected_by_admin_user_id', v_request.rejected_by_admin_user_id,
    'rejected_at', v_request.rejected_at,
    'rejection_reason', v_request.rejection_reason,
    'executed_at', v_request.executed_at,
    'execution_result', v_request.execution_result,
    'expires_at', v_request.expires_at,
    'created_at', v_request.created_at,
    'updated_at', v_request.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_privileged_action_request',
    v_request.id,
    v_payload,
    'global_audit_chain',
    p_metadata
  );
end;
$$;

create or replace function hash_admin_security_alert_event(
  p_admin_security_alert_event_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_alert admin_security_alert_events%rowtype;
  v_payload jsonb;
begin
  select *
  into v_alert
  from admin_security_alert_events
  where id = p_admin_security_alert_event_id;

  if v_alert.id is null then
    raise exception 'admin security alert event not found: %', p_admin_security_alert_event_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_alert_event',
    'source_id', v_alert.id,
    'alert_key', v_alert.alert_key,
    'severity', v_alert.severity,
    'actor_auth_user_id', v_alert.actor_auth_user_id,
    'actor_admin_user_id', v_alert.actor_admin_user_id,
    'target_auth_user_id', v_alert.target_auth_user_id,
    'target_admin_user_id', v_alert.target_admin_user_id,
    'action_key', v_alert.action_key,
    'privileged_action_request_id', v_alert.privileged_action_request_id,
    'status', v_alert.status,
    'message', v_alert.message,
    'acknowledged_by_auth_user_id', v_alert.acknowledged_by_auth_user_id,
    'acknowledged_at', v_alert.acknowledged_at,
    'resolved_by_auth_user_id', v_alert.resolved_by_auth_user_id,
    'resolved_at', v_alert.resolved_at,
    'resolution_note', v_alert.resolution_note,
    'created_at', v_alert.created_at,
    'updated_at', v_alert.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_alert_event',
    v_alert.id,
    v_payload,
    'global_audit_chain',
    p_metadata
  );
end;
$$;

create or replace view audit_hash_missing_records as
select
  'wallet_ledger_entry'::text as source_type,
  wle.id as source_id,
  wle.created_at
from wallet_ledger_entries wle
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'wallet_ledger_entry'
    and ahc.source_id = wle.id
)

union all

select
  'accounting_journal_entry'::text as source_type,
  aje.id as source_id,
  aje.created_at
from accounting_journal_entries aje
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'accounting_journal_entry'
    and ahc.source_id = aje.id
)

union all

select
  'reward_issuance_group'::text as source_type,
  rig.id as source_id,
  rig.created_at
from reward_issuance_groups rig
where rig.status = 'completed'
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'reward_issuance_group'
      and ahc.source_id = rig.id
  )

union all

select
  'attention_verification_event'::text as source_type,
  ave.id as source_id,
  ave.created_at
from attention_verification_events ave
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'attention_verification_event'
    and ahc.source_id = ave.id
)

union all

select
  'withdrawal_request'::text as source_type,
  wr.id as source_id,
  wr.created_at
from withdrawal_requests wr
where wr.status in ('reserved', 'submitted', 'processing', 'paid', 'failed', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'withdrawal_request'
      and ahc.source_id = wr.id
  )

union all

select
  'external_payout'::text as source_type,
  ep.id as source_id,
  ep.created_at
from external_payouts ep
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'external_payout'
    and ahc.source_id = ep.id
)

union all

select
  'admin_action_audit_log'::text as source_type,
  aal.id as source_id,
  aal.created_at
from admin_action_audit_log aal
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'admin_action_audit_log'
    and ahc.source_id = aal.id
)

union all

select
  'admin_privileged_action_request'::text as source_type,
  apar.id as source_id,
  apar.created_at
from admin_privileged_action_requests apar
where apar.status in ('approved', 'rejected', 'expired', 'executed', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_privileged_action_request'
      and ahc.source_id = apar.id
  )

union all

select
  'admin_security_alert_event'::text as source_type,
  asae.id as source_id,
  asae.created_at
from admin_security_alert_events asae
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'admin_security_alert_event'
    and ahc.source_id = asae.id
);

create or replace function run_audit_hash_backfill_job(
  p_batch_size integer default 1000,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_row record;

  v_scanned integer := 0;
  v_hashed integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into audit_hash_backfill_runs (
    status,
    metadata
  )
  values (
    'processing',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_run_id;

  for v_row in
    select *
    from audit_hash_missing_records
    order by created_at asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;

    begin
      if v_row.source_type = 'wallet_ledger_entry' then
        perform hash_wallet_ledger_entry(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'accounting_journal_entry' then
        perform hash_accounting_journal_entry(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'reward_issuance_group' then
        perform hash_reward_issuance_group(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'attention_verification_event' then
        perform hash_attention_verification_event(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'withdrawal_request' then
        perform hash_withdrawal_request(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'external_payout' then
        perform hash_external_payout(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'admin_action_audit_log' then
        perform hash_admin_action_audit_log(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'admin_privileged_action_request' then
        perform hash_admin_privileged_action_request(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'admin_security_alert_event' then
        perform hash_admin_security_alert_event(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      end if;

      v_hashed := v_hashed + 1;

    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update audit_hash_backfill_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_count = v_scanned,
    hashed_count = v_hashed,
    failed_count = v_failed
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update audit_hash_backfill_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace view admin_audit_hash_integrity as
select
  (
    select count(*)
    from admin_action_audit_log aal
    where not exists (
      select 1
      from audit_hash_chain_entries ahc
      where ahc.source_type = 'admin_action_audit_log'
        and ahc.source_id = aal.id
    )
  ) as missing_admin_action_hash_count,
  (
    select count(*)
    from admin_privileged_action_requests apar
    where apar.status in ('approved', 'rejected', 'expired', 'executed', 'cancelled')
      and not exists (
        select 1
        from audit_hash_chain_entries ahc
        where ahc.source_type = 'admin_privileged_action_request'
          and ahc.source_id = apar.id
      )
  ) as missing_privileged_action_hash_count,
  (
    select count(*)
    from admin_security_alert_events asae
    where not exists (
      select 1
      from audit_hash_chain_entries ahc
      where ahc.source_type = 'admin_security_alert_event'
        and ahc.source_id = asae.id
    )
  ) as missing_admin_security_alert_hash_count,
  now() as checked_at;

grant select on admin_audit_hash_integrity to admin_api_role, readonly_audit_role;

alter table system_health_snapshots
add column if not exists missing_admin_action_hash_count bigint not null default 0,
add column if not exists missing_privileged_action_hash_count bigint not null default 0,
add column if not exists missing_admin_security_alert_hash_count bigint not null default 0,
add column if not exists open_admin_security_alert_count bigint not null default 0,
add column if not exists critical_admin_security_alert_count bigint not null default 0,
add column if not exists pending_privileged_action_count bigint not null default 0;

create or replace function create_system_health_snapshot(
  p_snapshot_type text default 'scheduled',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_snapshot_id uuid;

  v_wallet_count bigint := 0;
  v_active_wallet_count bigint := 0;
  v_available bigint := 0;
  v_pending bigint := 0;
  v_locked bigint := 0;
  v_total bigint := 0;

  v_reward_pending bigint := 0;
  v_reward_completed_24h bigint := 0;
  v_reward_failed_24h bigint := 0;

  v_attention_events_1h bigint := 0;
  v_attention_passed_1h bigint := 0;
  v_attention_fraud_1h bigint := 0;

  v_unbalanced_journals bigint := 0;
  v_missing_reward_mirrors bigint := 0;
  v_wallet_accounting_delta bigint := 0;

  v_audit_missing bigint := 0;
  v_audit_broken_24h bigint := 0;

  v_failed_jobs_24h bigint := 0;
  v_critical_errors_1h bigint := 0;
  v_high_errors_1h bigint := 0;

  v_withdrawal_requested bigint := 0;
  v_withdrawal_reserved bigint := 0;
  v_withdrawal_submitted bigint := 0;
  v_withdrawal_paid_24h bigint := 0;
  v_withdrawal_failed_24h bigint := 0;
  v_withdrawal_integrity_issues bigint := 0;

  v_missing_admin_action_hash_count bigint := 0;
  v_missing_privileged_action_hash_count bigint := 0;
  v_missing_admin_security_alert_hash_count bigint := 0;
  v_open_admin_security_alert_count bigint := 0;
  v_critical_admin_security_alert_count bigint := 0;
  v_pending_privileged_action_count bigint := 0;

  v_attention_pass_rate_1h numeric := 0;
  v_attention_fraud_rate_1h numeric := 0;

  v_status text := 'healthy';
begin
  select
    count(*),
    count(*) filter (where status = 'active'),
    coalesce(sum(available_balance_minor), 0),
    coalesce(sum(pending_balance_minor), 0),
    coalesce(sum(locked_balance_minor), 0),
    coalesce(sum(total_balance_minor), 0)
  into
    v_wallet_count,
    v_active_wallet_count,
    v_available,
    v_pending,
    v_locked,
    v_total
  from wallets;

  select
    count(*) filter (where status in ('pending', 'processing')),
    count(*) filter (
      where status = 'completed'
        and completed_at >= now() - interval '24 hours'
    ),
    count(*) filter (
      where status = 'failed'
        and failed_at >= now() - interval '24 hours'
    )
  into
    v_reward_pending,
    v_reward_completed_24h,
    v_reward_failed_24h
  from reward_issuance_groups;

  select
    count(*),
    count(*) filter (where decision = 'passed'),
    count(*) filter (where decision = 'fraud_suspected')
  into
    v_attention_events_1h,
    v_attention_passed_1h,
    v_attention_fraud_1h
  from attention_verification_events
  where occurred_at >= now() - interval '1 hour';

  v_attention_pass_rate_1h :=
    case
      when v_attention_events_1h > 0
      then v_attention_passed_1h::numeric / v_attention_events_1h
      else 0
    end;

  v_attention_fraud_rate_1h :=
    case
      when v_attention_events_1h > 0
      then v_attention_fraud_1h::numeric / v_attention_events_1h
      else 0
    end;

  select count(*)
  into v_unbalanced_journals
  from accounting_unbalanced_journals;

  select count(*)
  into v_missing_reward_mirrors
  from accounting_missing_reward_mirrors;

  select coalesce(wallet_vs_accounting_delta_minor, 0)
  into v_wallet_accounting_delta
  from money_integrity_dashboard
  limit 1;

  select count(*)
  into v_audit_missing
  from audit_hash_missing_records;

  select count(*)
  into v_audit_broken_24h
  from audit_hash_chain_verification_runs
  where status = 'completed'
    and broken_entry_count > 0
    and started_at >= now() - interval '24 hours';

  select count(*)
  into v_failed_jobs_24h
  from scheduled_job_runs
  where status = 'failed'
    and started_at >= now() - interval '24 hours';

  select
    count(*) filter (where severity = 'critical'),
    count(*) filter (where severity = 'high')
  into
    v_critical_errors_1h,
    v_high_errors_1h
  from error_events
  where occurred_at >= now() - interval '1 hour';

  select
    count(*) filter (where status = 'approved'),
    count(*) filter (where status = 'reserved'),
    count(*) filter (where status in ('submitted', 'processing')),
    count(*) filter (where status = 'paid' and paid_at >= now() - interval '24 hours'),
    count(*) filter (where status = 'failed' and failed_at >= now() - interval '24 hours')
  into
    v_withdrawal_requested,
    v_withdrawal_reserved,
    v_withdrawal_submitted,
    v_withdrawal_paid_24h,
    v_withdrawal_failed_24h
  from withdrawal_requests;

  select count(*)
  into v_withdrawal_integrity_issues
  from withdrawal_integrity_check
  where has_integrity_issue is true;

  select
    missing_admin_action_hash_count,
    missing_privileged_action_hash_count,
    missing_admin_security_alert_hash_count
  into
    v_missing_admin_action_hash_count,
    v_missing_privileged_action_hash_count,
    v_missing_admin_security_alert_hash_count
  from admin_audit_hash_integrity;

  select
    count(*) filter (where status = 'open'),
    count(*) filter (where status = 'open' and severity = 'critical')
  into
    v_open_admin_security_alert_count,
    v_critical_admin_security_alert_count
  from admin_security_alert_events;

  select count(*)
  into v_pending_privileged_action_count
  from admin_privileged_action_requests
  where status = 'pending'
    and expires_at > now();

  v_status :=
    case
      when v_unbalanced_journals > 0
        or v_wallet_accounting_delta <> 0
        or v_audit_broken_24h > 0
        or v_critical_errors_1h > 0
        or v_withdrawal_integrity_issues > 0
        or v_critical_admin_security_alert_count > 0
      then 'critical'

      when v_missing_admin_action_hash_count > 0
        or v_missing_privileged_action_hash_count > 0
        or v_missing_admin_security_alert_hash_count > 0
      then 'warning'

      when v_missing_reward_mirrors > 0
        or v_audit_missing > 0
        or v_failed_jobs_24h >= 3
        or v_high_errors_1h >= 5
      then 'degraded'

      when v_reward_failed_24h > 0
        or v_failed_jobs_24h > 0
        or v_attention_fraud_rate_1h >= 0.10
      then 'warning'

      else 'healthy'
    end;

  insert into system_health_snapshots (
    snapshot_type,
    status,
    wallet_count,
    active_wallet_count,
    total_available_balance_minor,
    total_pending_balance_minor,
    total_locked_balance_minor,
    total_wallet_balance_minor,
    reward_pending_count,
    reward_completed_count_24h,
    reward_failed_count_24h,
    attention_event_count_1h,
    attention_passed_count_1h,
    attention_fraud_suspected_count_1h,
    unbalanced_journal_count,
    missing_reward_mirror_count,
    wallet_accounting_delta_minor,
    audit_missing_hash_record_count,
    audit_broken_verification_count_24h,
    failed_scheduled_job_count_24h,
    critical_error_count_1h,
    high_error_count_1h,
    withdrawal_requested_count,
    withdrawal_reserved_count,
    withdrawal_submitted_count,
    withdrawal_paid_count_24h,
    withdrawal_failed_count_24h,
    withdrawal_integrity_issue_count,
    missing_admin_action_hash_count,
    missing_privileged_action_hash_count,
    missing_admin_security_alert_hash_count,
    open_admin_security_alert_count,
    critical_admin_security_alert_count,
    pending_privileged_action_count,
    metrics,
    metadata
  )
  values (
    coalesce(p_snapshot_type, 'scheduled'),
    v_status,
    v_wallet_count,
    v_active_wallet_count,
    v_available,
    v_pending,
    v_locked,
    v_total,
    v_reward_pending,
    v_reward_completed_24h,
    v_reward_failed_24h,
    v_attention_events_1h,
    v_attention_passed_1h,
    v_attention_fraud_1h,
    v_unbalanced_journals,
    v_missing_reward_mirrors,
    v_wallet_accounting_delta,
    v_audit_missing,
    v_audit_broken_24h,
    v_failed_jobs_24h,
    v_critical_errors_1h,
    v_high_errors_1h,
    v_withdrawal_requested,
    v_withdrawal_reserved,
    v_withdrawal_submitted,
    v_withdrawal_paid_24h,
    v_withdrawal_failed_24h,
    v_withdrawal_integrity_issues,
    v_missing_admin_action_hash_count,
    v_missing_privileged_action_hash_count,
    v_missing_admin_security_alert_hash_count,
    v_open_admin_security_alert_count,
    v_critical_admin_security_alert_count,
    v_pending_privileged_action_count,
    jsonb_build_object(
      'attention_pass_rate_1h', v_attention_pass_rate_1h,
      'attention_fraud_rate_1h', v_attention_fraud_rate_1h
    ),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_snapshot_id;

  perform emit_platform_event(
    'system_health_snapshot_created',
    'system',
    case
      when v_status = 'critical' then 'critical'
      when v_status = 'degraded' then 'high'
      when v_status = 'warning' then 'warning'
      else 'info'
    end,
    'observability_engine',
    null,
    null,
    null,
    'system_health_snapshot',
    v_snapshot_id,
    null,
    null,
    'System health snapshot created',
    jsonb_build_object(
      'status', v_status,
      'wallet_accounting_delta_minor', v_wallet_accounting_delta,
      'unbalanced_journal_count', v_unbalanced_journals,
      'audit_missing_hash_record_count', v_audit_missing,
      'failed_scheduled_job_count_24h', v_failed_jobs_24h,
      'critical_error_count_1h', v_critical_errors_1h,
      'withdrawal_integrity_issue_count', v_withdrawal_integrity_issues,
      'missing_admin_action_hash_count', v_missing_admin_action_hash_count,
      'missing_privileged_action_hash_count', v_missing_privileged_action_hash_count,
      'missing_admin_security_alert_hash_count', v_missing_admin_security_alert_hash_count,
      'open_admin_security_alert_count', v_open_admin_security_alert_count,
      'critical_admin_security_alert_count', v_critical_admin_security_alert_count,
      'pending_privileged_action_count', v_pending_privileged_action_count
    ),
    p_metadata
  );

  return v_snapshot_id;
end;
$$;

create or replace view admin_system_command_center as
select
  shs.id as latest_snapshot_id,
  shs.status as system_status,
  shs.created_at as snapshot_at,
  shs.wallet_count,
  shs.active_wallet_count,
  shs.total_available_balance_minor,
  shs.total_pending_balance_minor,
  shs.total_locked_balance_minor,
  shs.total_wallet_balance_minor,
  shs.reward_pending_count,
  shs.reward_completed_count_24h,
  shs.reward_failed_count_24h,
  shs.attention_event_count_1h,
  shs.attention_passed_count_1h,
  shs.attention_fraud_suspected_count_1h,
  shs.unbalanced_journal_count,
  shs.missing_reward_mirror_count,
  shs.wallet_accounting_delta_minor,
  shs.audit_missing_hash_record_count,
  shs.audit_broken_verification_count_24h,
  shs.failed_scheduled_job_count_24h,
  shs.critical_error_count_1h,
  shs.high_error_count_1h,
  shs.withdrawal_requested_count,
  shs.withdrawal_reserved_count,
  shs.withdrawal_submitted_count,
  shs.withdrawal_paid_count_24h,
  shs.withdrawal_failed_count_24h,
  shs.withdrawal_integrity_issue_count,
  shs.missing_admin_action_hash_count,
  shs.missing_privileged_action_hash_count,
  shs.missing_admin_security_alert_hash_count,
  shs.open_admin_security_alert_count,
  shs.critical_admin_security_alert_count,
  shs.pending_privileged_action_count,
  shs.metrics,
  (
    select jsonb_agg(
      jsonb_build_object(
        'job_key', job_key,
        'job_name', job_name,
        'job_group', job_group,
        'last_status', last_status,
        'last_failed_at', last_failed_at,
        'last_completed_at', last_completed_at,
        'alert_type', alert_type
      )
      order by last_failed_at desc nulls last
    )
    from scheduled_job_alerts
  ) as job_alerts,
  (
    select jsonb_agg(
      jsonb_build_object(
        'error_code', error_code,
        'category', category,
        'severity', severity,
        'owner_team', owner_team,
        'count_1h', count_1h,
        'count_24h', count_24h,
        'last_seen_at', last_seen_at
      )
      order by
        case severity
          when 'critical' then 1
          when 'high' then 2
          when 'medium' then 3
          else 4
        end,
        count_1h desc,
        count_24h desc
    )
    from error_event_dashboard
    where count_1h > 0
       or count_24h > 0
  ) as error_summary,
  (
    select jsonb_agg(
      jsonb_build_object(
        'alert_event_id', alert_event_id,
        'alert_key', alert_key,
        'alert_name', alert_name,
        'category', category,
        'severity', severity,
        'status', status,
        'metric_name', metric_name,
        'metric_value', metric_value,
        'threshold', threshold,
        'message', message,
        'created_at', created_at
      )
      order by
        case severity
          when 'critical' then 1
          when 'high' then 2
          else 3
        end,
        created_at desc
    )
    from alert_dashboard
    where status in ('open', 'acknowledged')
  ) as active_alerts
from system_health_snapshots shs
order by shs.created_at desc
limit 1;

grant execute on function hash_admin_action_audit_log(uuid, jsonb)
to worker_role, admin_api_role;

grant execute on function hash_admin_privileged_action_request(uuid, jsonb)
to worker_role, admin_api_role;

grant execute on function hash_admin_security_alert_event(uuid, jsonb)
to worker_role, admin_api_role;

alter function hash_admin_action_audit_log(uuid, jsonb) security definer;
alter function hash_admin_action_audit_log(uuid, jsonb) set search_path = public;

alter function hash_admin_privileged_action_request(uuid, jsonb) security definer;
alter function hash_admin_privileged_action_request(uuid, jsonb) set search_path = public;

alter function hash_admin_security_alert_event(uuid, jsonb) security definer;
alter function hash_admin_security_alert_event(uuid, jsonb) set search_path = public;

insert into error_catalog (
  error_code,
  category,
  severity,
  http_status,
  retryable,
  user_visible,
  user_message,
  internal_message,
  owner_team
)
values
  (
    'ADMIN_AUDIT_HASH_MISSING',
    'audit',
    'high',
    500,
    true,
    false,
    'An audit integrity issue was detected.',
    'Admin audit record missing hash chain entry.',
    'platform'
  ),
  (
    'ADMIN_AUDIT_HASH_FAILED',
    'audit',
    'critical',
    500,
    false,
    false,
    'An audit integrity issue was detected.',
    'Admin audit hash failed.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_mapping_rules (
  match_pattern,
  error_code,
  priority,
  metadata
)
values
  ('admin action audit log not found', 'ADMIN_AUDIT_HASH_FAILED', 5, '{}'),
  ('admin privileged action request not found', 'ADMIN_AUDIT_HASH_FAILED', 5, '{}'),
  ('admin security alert event not found', 'ADMIN_AUDIT_HASH_FAILED', 5, '{}')
on conflict do nothing;
