-- Step 7.10 — Observability command center
-- Platform event index, health snapshots, dashboards, alert rules/evaluation,
-- and scheduler integration. Supersedes narrower 058 definitions for the
-- objects replaced below (emit_platform_event target, system_health_snapshots,
-- observability job pipeline, money_integrity_dashboard).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tear-down / replace layered objects (order matters)
-- ---------------------------------------------------------------------------

drop view if exists operations_dashboard cascade;
drop view if exists platform_operations_dashboard cascade;
drop view if exists alert_dashboard cascade;
drop view if exists reward_operations_dashboard cascade;
drop view if exists attention_operations_dashboard cascade;
drop view if exists wallet_operations_dashboard cascade;
drop view if exists audit_operations_dashboard cascade;

drop function if exists run_observability_snapshot_job(jsonb) cascade;
drop function if exists evaluate_alert_rules(jsonb) cascade;
drop function if exists create_system_health_snapshot(text, jsonb) cascade;
drop function if exists acknowledge_alert_event(uuid, uuid, jsonb) cascade;
drop function if exists resolve_alert_event(uuid, uuid, text, jsonb) cascade;
drop function if exists acknowledge_alert_event(uuid, jsonb) cascade;
drop function if exists resolve_alert_event(uuid, text, jsonb) cascade;

drop table if exists observability_runs cascade;
drop table if exists alert_events cascade;
drop table if exists system_health_snapshots cascade;

-- ---------------------------------------------------------------------------
-- 1) Platform event stream (operational index, not source of truth)
-- ---------------------------------------------------------------------------

create table if not exists platform_events (
  id uuid primary key default gen_random_uuid(),

  event_type text not null,
  event_category text not null,

  severity text not null default 'info',

  source text not null,

  user_id uuid,
  wallet_id uuid references wallets(id),
  campaign_id uuid,

  related_entity_type text,
  related_entity_id uuid,

  request_id text,
  idempotency_key text,

  message text,

  metrics jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint platform_events_category_check
  check (
    event_category in (
      'wallet',
      'attention',
      'reward',
      'campaign',
      'accounting',
      'audit',
      'scheduler',
      'error',
      'system',
      'withdrawal',
      'payout'
    )
  ),

  constraint platform_events_severity_check
  check (
    severity in (
      'debug',
      'info',
      'warning',
      'high',
      'critical'
    )
  )
);

create index if not exists platform_events_category_idx
on platform_events (event_category, occurred_at desc);

create index if not exists platform_events_type_idx
on platform_events (event_type, occurred_at desc);

create index if not exists platform_events_wallet_idx
on platform_events (wallet_id, occurred_at desc);

create index if not exists platform_events_campaign_idx
on platform_events (campaign_id, occurred_at desc);

create index if not exists platform_events_severity_idx
on platform_events (severity, occurred_at desc);

-- ---------------------------------------------------------------------------
-- 2) emit_platform_event — canonical 14-arg + legacy 16-arg (058 triggers)
-- ---------------------------------------------------------------------------

create or replace function emit_platform_event(
  p_event_type text,
  p_event_category text,
  p_severity text default 'info',
  p_source text default 'system',
  p_user_id uuid default null,
  p_wallet_id uuid default null,
  p_campaign_id uuid default null,
  p_related_entity_type text default null,
  p_related_entity_id uuid default null,
  p_request_id text default null,
  p_idempotency_key text default null,
  p_message text default null,
  p_metrics jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event_id uuid;
begin
  if p_event_type is null or length(trim(p_event_type)) = 0 then
    raise exception 'event type is required';
  end if;

  if p_event_category is null or length(trim(p_event_category)) = 0 then
    raise exception 'event category is required';
  end if;

  insert into platform_events (
    event_type,
    event_category,
    severity,
    source,
    user_id,
    wallet_id,
    campaign_id,
    related_entity_type,
    related_entity_id,
    request_id,
    idempotency_key,
    message,
    metrics,
    metadata
  )
  values (
    p_event_type,
    p_event_category,
    coalesce(p_severity, 'info'),
    coalesce(p_source, 'system'),
    p_user_id,
    p_wallet_id,
    p_campaign_id,
    p_related_entity_type,
    p_related_entity_id,
    p_request_id,
    p_idempotency_key,
    p_message,
    coalesce(p_metrics, '{}'::jsonb),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

-- Legacy signature used by reward / withdrawal / audit triggers from 058.
create or replace function emit_platform_event(
  p_event_type text,
  p_category text,
  p_severity text,
  p_source text,
  p_user_id uuid default null,
  p_wallet_id uuid default null,
  p_campaign_id uuid default null,
  p_admin_user_id uuid default null,
  p_session_id uuid default null,
  p_subject_type text default 'system',
  p_subject_id uuid default null,
  p_correlation_id uuid default null,
  p_idempotency_key text default null,
  p_title text default null,
  p_payload jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_merged_metadata jsonb;
begin
  v_merged_metadata :=
    coalesce(p_metadata, '{}'::jsonb)
    || jsonb_strip_nulls(
      jsonb_build_object(
        'admin_user_id', p_admin_user_id,
        'session_id', p_session_id,
        'correlation_id', p_correlation_id
      )
    );

  return emit_platform_event(
    p_event_type,
    p_category,
    coalesce(p_severity, 'info'),
    coalesce(p_source, 'system'),
    p_user_id,
    p_wallet_id,
    p_campaign_id,
    coalesce(p_subject_type, 'system'),
    p_subject_id,
    null::text,
    p_idempotency_key,
    coalesce(p_title, p_event_type),
    coalesce(p_payload, '{}'::jsonb),
    v_merged_metadata
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Money integrity view (restore 090-style metrics; 058 had narrowed it)
-- ---------------------------------------------------------------------------

create or replace view money_integrity_dashboard as
select
  (
    select count(*)
    from accounting_unbalanced_journals
  ) as unbalanced_journal_count,

  (
    select count(*)
    from accounting_missing_reward_mirrors
  ) as missing_reward_mirror_count,

  (
    select coalesce(sum(balance_minor), 0)
    from accounting_account_balances
    where account_key = 'user_wallet_liability_usd'
  ) as accounting_user_wallet_liability_minor,

  (
    select coalesce(sum(total_balance_minor), 0)
    from wallets
  ) as wallet_total_balance_minor,

  (
    (
      select coalesce(sum(balance_minor), 0)
      from accounting_account_balances
      where account_key = 'user_wallet_liability_usd'
    )
    -
    (
      select coalesce(sum(total_balance_minor), 0)
      from wallets
    )
  ) as wallet_vs_accounting_delta_minor,

  now() as checked_at;

-- ---------------------------------------------------------------------------
-- 4) system_health_snapshots
-- ---------------------------------------------------------------------------

create table if not exists system_health_snapshots (
  id uuid primary key default gen_random_uuid(),

  snapshot_type text not null default 'scheduled',

  status text not null default 'healthy',

  wallet_count bigint not null default 0,
  active_wallet_count bigint not null default 0,

  total_available_balance_minor bigint not null default 0,
  total_pending_balance_minor bigint not null default 0,
  total_locked_balance_minor bigint not null default 0,
  total_wallet_balance_minor bigint not null default 0,

  reward_pending_count bigint not null default 0,
  reward_completed_count_24h bigint not null default 0,
  reward_failed_count_24h bigint not null default 0,

  attention_event_count_1h bigint not null default 0,
  attention_passed_count_1h bigint not null default 0,
  attention_fraud_suspected_count_1h bigint not null default 0,

  unbalanced_journal_count bigint not null default 0,
  missing_reward_mirror_count bigint not null default 0,
  wallet_accounting_delta_minor bigint not null default 0,

  audit_missing_hash_record_count bigint not null default 0,
  audit_broken_verification_count_24h bigint not null default 0,

  failed_scheduled_job_count_24h bigint not null default 0,
  critical_error_count_1h bigint not null default 0,
  high_error_count_1h bigint not null default 0,

  metrics jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint system_health_snapshots_status_check
  check (
    status in (
      'healthy',
      'warning',
      'degraded',
      'critical'
    )
  )
);

create index if not exists system_health_snapshots_created_idx
on system_health_snapshots (created_at desc);

create index if not exists system_health_snapshots_status_idx
on system_health_snapshots (status, created_at desc);

-- ---------------------------------------------------------------------------
-- 5) create_system_health_snapshot
-- ---------------------------------------------------------------------------

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

  v_status :=
    case
      when v_unbalanced_journals > 0
        or v_wallet_accounting_delta <> 0
        or v_audit_broken_24h > 0
        or v_critical_errors_1h > 0
      then 'critical'

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

    jsonb_build_object(
      'attention_pass_rate_1h',
      v_attention_pass_rate_1h,
      'attention_fraud_rate_1h',
      v_attention_fraud_rate_1h
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
      'critical_error_count_1h', v_critical_errors_1h
    ),
    p_metadata
  );

  return v_snapshot_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) observability_runs
-- ---------------------------------------------------------------------------

create table if not exists observability_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  snapshot_id uuid references system_health_snapshots(id),

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  constraint observability_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists observability_runs_started_idx
on observability_runs (started_at desc);

-- ---------------------------------------------------------------------------
-- 7) Dashboard views
-- ---------------------------------------------------------------------------

create or replace view platform_operations_dashboard as
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
  ) as error_summary

from system_health_snapshots shs
order by shs.created_at desc
limit 1;

create or replace view reward_operations_dashboard as
select
  date_trunc('hour', rig.created_at) as bucket_hour,

  count(*) as reward_group_count,

  count(*) filter (where rig.status = 'pending') as pending_count,
  count(*) filter (where rig.status = 'processing') as processing_count,
  count(*) filter (where rig.status = 'completed') as completed_count,
  count(*) filter (where rig.status = 'failed') as failed_count,

  coalesce(sum(rig.reward_amount_minor), 0)::bigint as total_reward_amount_minor,

  coalesce(sum(rig.reward_amount_minor) filter (where rig.status = 'completed'), 0)::bigint
    as completed_reward_amount_minor,

  (
    count(*) filter (where rig.status = 'failed')::numeric
    / greatest(count(*), 1)
  )::numeric(8, 6) as failure_rate

from reward_issuance_groups rig
where rig.created_at >= now() - interval '7 days'
group by date_trunc('hour', rig.created_at)
order by bucket_hour desc;

create or replace view attention_operations_dashboard as
select
  date_trunc('hour', ave.occurred_at) as bucket_hour,

  count(*) as event_count,

  count(*) filter (where ave.decision = 'passed') as passed_count,
  count(*) filter (where ave.decision = 'failed') as failed_count,
  count(*) filter (where ave.decision = 'fraud_suspected') as fraud_suspected_count,
  count(*) filter (where ave.decision = 'inconclusive') as inconclusive_count,

  count(*) filter (where ave.reward_eligible is true) as reward_eligible_count,
  count(*) filter (where ave.reward_issued is true) as reward_issued_count,

  (
    count(*) filter (where ave.decision = 'passed')::numeric
    / greatest(count(*), 1)
  )::numeric(8, 6) as pass_rate,

  (
    count(*) filter (where ave.decision = 'fraud_suspected')::numeric
    / greatest(count(*), 1)
  )::numeric(8, 6) as fraud_suspected_rate,

  avg(ave.attention_score)::numeric(8, 6) as avg_attention_score,
  avg(ave.confidence_score)::numeric(8, 6) as avg_confidence_score,
  avg(ave.fraud_risk_score)::numeric(8, 6) as avg_fraud_risk_score,
  avg(ave.quality_score)::numeric(8, 6) as avg_quality_score,

  (
    sum(ave.no_face_frame_count)::numeric
    / greatest(sum(ave.valid_frame_count + ave.invalid_frame_count), 1)
  )::numeric(8, 6) as no_face_rate,

  (
    sum(ave.gaze_invalid_frame_count)::numeric
    / greatest(sum(ave.valid_frame_count + ave.invalid_frame_count), 1)
  )::numeric(8, 6) as gaze_invalid_rate

from attention_verification_events ave
where ave.occurred_at >= now() - interval '7 days'
group by date_trunc('hour', ave.occurred_at)
order by bucket_hour desc;

create or replace view wallet_operations_dashboard as
select
  count(*) as wallet_count,

  count(*) filter (where status = 'active') as active_wallet_count,
  count(*) filter (where status = 'restricted') as restricted_wallet_count,
  count(*) filter (where status = 'locked') as locked_wallet_count,
  count(*) filter (where status = 'fraud_locked') as fraud_locked_wallet_count,
  count(*) filter (where status = 'closed') as closed_wallet_count,

  coalesce(sum(available_balance_minor), 0)::bigint as total_available_balance_minor,
  coalesce(sum(pending_balance_minor), 0)::bigint as total_pending_balance_minor,
  coalesce(sum(locked_balance_minor), 0)::bigint as total_locked_balance_minor,
  coalesce(sum(total_balance_minor), 0)::bigint as total_wallet_balance_minor,

  (
    select count(*)
    from wallet_integrity_check
    where total_balance_delta_minor <> 0
       or available_vs_ledger_delta_minor <> 0
       or pending_vs_ledger_delta_minor <> 0
       or locked_vs_ledger_delta_minor <> 0
  ) as wallet_integrity_issue_count,

  now() as checked_at

from wallets;

create or replace view audit_operations_dashboard as
select
  (
    select count(*)
    from audit_hash_missing_records
  ) as missing_hash_record_count,

  (
    select count(*)
    from audit_hash_chain_entries
    where status = 'active'
  ) as hash_chain_entry_count,

  (
    select max(sequence_number)
    from audit_hash_chain_entries
    where status = 'active'
      and chain_key = 'global_audit_chain'
  ) as latest_sequence_number,

  (
    select chain_hash
    from audit_hash_chain_entries
    where status = 'active'
      and chain_key = 'global_audit_chain'
    order by sequence_number desc
    limit 1
  ) as latest_chain_hash,

  (
    select count(*)
    from audit_hash_chain_verification_runs
    where status = 'completed'
      and broken_entry_count > 0
      and started_at >= now() - interval '24 hours'
  ) as broken_verification_runs_24h,

  (
    select max(completed_at)
    from audit_hash_chain_verification_runs
    where status = 'completed'
  ) as latest_verification_completed_at,

  now() as checked_at;

-- ---------------------------------------------------------------------------
-- 8) alert_rules (table may exist from 058 — ensure shape + trigger)
-- ---------------------------------------------------------------------------

create table if not exists alert_rules (
  id uuid primary key default gen_random_uuid(),

  alert_key text not null unique,
  alert_name text not null,

  category text not null,
  severity text not null default 'warning',

  enabled boolean not null default true,

  metric_name text not null,
  operator text not null,
  threshold numeric(18, 6) not null,

  lookback_minutes integer not null default 60,

  owner_team text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint alert_rules_operator_check
  check (
    operator in (
      'gt',
      'gte',
      'lt',
      'lte',
      'eq',
      'neq'
    )
  ),

  constraint alert_rules_severity_check
  check (
    severity in (
      'warning',
      'high',
      'critical'
    )
  )
);

create index if not exists alert_rules_enabled_idx
on alert_rules (enabled, category);

drop trigger if exists alert_rules_set_updated_at on alert_rules;

create trigger alert_rules_set_updated_at
before update on alert_rules
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 9) alert_events
-- ---------------------------------------------------------------------------

create table if not exists alert_events (
  id uuid primary key default gen_random_uuid(),

  alert_rule_id uuid references alert_rules(id),
  alert_key text not null,

  severity text not null,

  status text not null default 'open',

  metric_name text not null,
  metric_value numeric(18, 6),
  threshold numeric(18, 6),

  message text not null,

  related_entity_type text,
  related_entity_id uuid,

  acknowledged_at timestamptz,
  resolved_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint alert_events_status_check
  check (
    status in (
      'open',
      'acknowledged',
      'resolved',
      'dismissed'
    )
  ),

  constraint alert_events_severity_check
  check (
    severity in (
      'warning',
      'high',
      'critical'
    )
  )
);

create index if not exists alert_events_status_idx
on alert_events (status, severity, created_at desc);

create index if not exists alert_events_key_idx
on alert_events (alert_key, created_at desc);

-- ---------------------------------------------------------------------------
-- 10) Seed V1 alert rules
-- ---------------------------------------------------------------------------

insert into alert_rules (
  alert_key,
  alert_name,
  category,
  severity,
  metric_name,
  operator,
  threshold,
  lookback_minutes,
  owner_team,
  metadata
)
values
  (
    'money_integrity_failed',
    'Money integrity failed',
    'accounting',
    'critical',
    'wallet_accounting_delta_minor',
    'neq',
    0,
    60,
    'finance',
    '{}'
  ),
  (
    'unbalanced_journals_present',
    'Unbalanced journals present',
    'accounting',
    'critical',
    'unbalanced_journal_count',
    'gt',
    0,
    60,
    'finance',
    '{}'
  ),
  (
    'audit_hash_missing_records',
    'Audit hash missing records',
    'audit',
    'high',
    'audit_missing_hash_record_count',
    'gt',
    0,
    60,
    'security',
    '{}'
  ),
  (
    'audit_hash_broken',
    'Audit hash chain broken',
    'audit',
    'critical',
    'audit_broken_verification_count_24h',
    'gt',
    0,
    1440,
    'security',
    '{}'
  ),
  (
    'failed_jobs_spike',
    'Failed scheduled jobs spike',
    'scheduler',
    'high',
    'failed_scheduled_job_count_24h',
    'gte',
    3,
    1440,
    'platform',
    '{}'
  ),
  (
    'critical_errors_present',
    'Critical errors present',
    'error',
    'critical',
    'critical_error_count_1h',
    'gt',
    0,
    60,
    'platform',
    '{}'
  ),
  (
    'attention_fraud_rate_spike',
    'Attention fraud suspected rate spike',
    'attention',
    'high',
    'attention_fraud_rate_1h',
    'gte',
    0.100000,
    60,
    'trust',
    '{}'
  )
on conflict (alert_key)
do update set
  alert_name = excluded.alert_name,
  category = excluded.category,
  severity = excluded.severity,
  metric_name = excluded.metric_name,
  operator = excluded.operator,
  threshold = excluded.threshold,
  owner_team = excluded.owner_team,
  enabled = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 11) evaluate_alert_rules
-- ---------------------------------------------------------------------------

create or replace function evaluate_alert_rules(
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_snapshot system_health_snapshots%rowtype;
  v_rule alert_rules%rowtype;

  v_metric_value numeric;
  v_triggered boolean;
  v_created integer := 0;
begin
  select *
  into v_snapshot
  from system_health_snapshots
  order by created_at desc
  limit 1;

  if v_snapshot.id is null then
    raise exception 'no system health snapshot available';
  end if;

  for v_rule in
    select *
    from alert_rules
    where enabled is true
  loop
    v_metric_value :=
      case v_rule.metric_name
        when 'wallet_accounting_delta_minor'
        then v_snapshot.wallet_accounting_delta_minor::numeric

        when 'unbalanced_journal_count'
        then v_snapshot.unbalanced_journal_count::numeric

        when 'audit_missing_hash_record_count'
        then v_snapshot.audit_missing_hash_record_count::numeric

        when 'audit_broken_verification_count_24h'
        then v_snapshot.audit_broken_verification_count_24h::numeric

        when 'failed_scheduled_job_count_24h'
        then v_snapshot.failed_scheduled_job_count_24h::numeric

        when 'critical_error_count_1h'
        then v_snapshot.critical_error_count_1h::numeric

        when 'attention_fraud_rate_1h'
        then coalesce((v_snapshot.metrics->>'attention_fraud_rate_1h')::numeric, 0)

        else null
      end;

    if v_metric_value is null then
      continue;
    end if;

    v_triggered :=
      case v_rule.operator
        when 'gt' then v_metric_value > v_rule.threshold
        when 'gte' then v_metric_value >= v_rule.threshold
        when 'lt' then v_metric_value < v_rule.threshold
        when 'lte' then v_metric_value <= v_rule.threshold
        when 'eq' then v_metric_value = v_rule.threshold
        when 'neq' then v_metric_value <> v_rule.threshold
        else false
      end;

    if v_triggered is true then
      if not exists (
        select 1
        from alert_events
        where alert_key = v_rule.alert_key
          and status in ('open', 'acknowledged')
          and created_at >= now() - make_interval(mins => v_rule.lookback_minutes)
      ) then
        insert into alert_events (
          alert_rule_id,
          alert_key,
          severity,
          metric_name,
          metric_value,
          threshold,
          message,
          related_entity_type,
          related_entity_id,
          metadata
        )
        values (
          v_rule.id,
          v_rule.alert_key,
          v_rule.severity,
          v_rule.metric_name,
          v_metric_value,
          v_rule.threshold,
          v_rule.alert_name || ' triggered',
          'system_health_snapshot',
          v_snapshot.id,
          p_metadata || jsonb_build_object(
            'snapshot_id',
            v_snapshot.id
          )
        );

        perform emit_platform_event(
          'alert_triggered',
          'system',
          case
            when v_rule.severity = 'critical' then 'critical'
            when v_rule.severity = 'high' then 'high'
            else 'warning'
          end,
          'alert_engine',
          null,
          null,
          null,
          'alert_rule',
          v_rule.id,
          null,
          null,
          v_rule.alert_name || ' triggered',
          jsonb_build_object(
            'metric_name', v_rule.metric_name,
            'metric_value', v_metric_value,
            'threshold', v_rule.threshold
          ),
          p_metadata
        );

        v_created := v_created + 1;
      end if;
    end if;
  end loop;

  return v_created;
end;
$$;

-- ---------------------------------------------------------------------------
-- 12) run_observability_snapshot_job
-- ---------------------------------------------------------------------------

create or replace function run_observability_snapshot_job(
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_snapshot_id uuid;
begin
  insert into observability_runs (
    run_type,
    status,
    metadata
  )
  values (
    'scheduled',
    'processing',
    p_metadata
  )
  returning id into v_run_id;

  v_snapshot_id := create_system_health_snapshot(
    'scheduled',
    p_metadata || jsonb_build_object(
      'observability_run_id',
      v_run_id
    )
  );

  perform evaluate_alert_rules(
    p_metadata || jsonb_build_object(
      'observability_run_id',
      v_run_id,
      'snapshot_id',
      v_snapshot_id
    )
  );

  update observability_runs
  set
    status = 'completed',
    completed_at = now(),
    snapshot_id = v_snapshot_id
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update observability_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    perform record_error_event(
      'SCHEDULED_JOB_FAILED',
      null,
      null,
      'worker',
      null,
      null,
      null,
      'observability',
      null,
      'run_observability_snapshot_job',
      'Observability snapshot job failed',
      sqlerrm,
      'observability_run',
      v_run_id,
      p_metadata
    );

    raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- 13) alert_dashboard + lifecycle helpers
-- ---------------------------------------------------------------------------

create or replace view alert_dashboard as
select
  ae.id as alert_event_id,
  ae.alert_key,
  ar.alert_name,
  ar.category,
  ae.severity,
  ae.status,
  ae.metric_name,
  ae.metric_value,
  ae.threshold,
  ae.message,
  ar.owner_team,
  ae.related_entity_type,
  ae.related_entity_id,
  ae.acknowledged_at,
  ae.resolved_at,
  ae.created_at,
  ae.metadata
from alert_events ae
left join alert_rules ar
  on ar.id = ae.alert_rule_id
order by
  case ae.severity
    when 'critical' then 1
    when 'high' then 2
    else 3
  end,
  ae.created_at desc;

create or replace function acknowledge_alert_event(
  p_alert_event_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  update alert_events
  set
    status = 'acknowledged',
    acknowledged_at = now(),
    metadata = metadata || p_metadata
  where id = p_alert_event_id
    and status = 'open';

  if not found then
    raise exception 'open alert not found: %', p_alert_event_id;
  end if;

  return p_alert_event_id;
end;
$$;

create or replace function resolve_alert_event(
  p_alert_event_id uuid,
  p_resolution_note text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_resolution_note is null or length(trim(p_resolution_note)) = 0 then
    raise exception 'resolution note is required';
  end if;

  update alert_events
  set
    status = 'resolved',
    resolved_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'resolution_note',
      p_resolution_note
    )
  where id = p_alert_event_id
    and status in ('open', 'acknowledged');

  if not found then
    raise exception 'active alert not found: %', p_alert_event_id;
  end if;

  return p_alert_event_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 14) Register observability scheduled job
-- ---------------------------------------------------------------------------

insert into scheduled_jobs (
  job_key,
  job_name,
  job_group,
  enabled,
  schedule_cron,
  function_name,
  function_args,
  max_runtime_seconds,
  lock_ttl_seconds,
  metadata
)
values (
  'observability_snapshot_every_5_minutes',
  'Create observability snapshot',
  'system',
  true,
  '*/5 * * * *',
  'run_observability_snapshot_job',
  '{}'::jsonb,
  120,
  180,
  '{"priority": "high"}'::jsonb
)
on conflict (job_key)
do update set
  job_name = excluded.job_name,
  job_group = excluded.job_group,
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_name = excluded.function_name,
  function_args = excluded.function_args,
  max_runtime_seconds = excluded.max_runtime_seconds,
  lock_ttl_seconds = excluded.lock_ttl_seconds,
  metadata = scheduled_jobs.metadata || excluded.metadata,
  updated_at = now();
