-- Step 6.13 — Observability, alerts, and operations dashboards
-- Adds system snapshots, alerting, dashboard views, and scheduler integration.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Platform event emitter (backed by system_events)
-- ---------------------------------------------------------------------------

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
  v_event_id uuid;
begin
  insert into system_events (
    event_type,
    event_version,
    actor_type,
    actor_id,
    subject_type,
    subject_id,
    user_id,
    campaign_id,
    session_id,
    payload,
    idempotency_key,
    correlation_id
  )
  values (
    p_event_type,
    1,
    coalesce(p_source, 'system'),
    p_admin_user_id,
    coalesce(p_subject_type, 'system'),
    coalesce(p_subject_id, gen_random_uuid()),
    p_user_id,
    p_campaign_id,
    p_session_id,
    coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
      'category', p_category,
      'severity', p_severity,
      'source', p_source,
      'title', p_title,
      'wallet_id', p_wallet_id,
      'admin_user_id', p_admin_user_id,
      'metadata', coalesce(p_metadata, '{}'::jsonb)
    ),
    p_idempotency_key,
    p_correlation_id
  )
  on conflict (idempotency_key) do update
  set payload = system_events.payload || excluded.payload
  returning id into v_event_id;

  return v_event_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Health snapshot + core dashboards
-- ---------------------------------------------------------------------------

create table if not exists system_health_snapshots (
  id uuid primary key default gen_random_uuid(),

  snapshot_type text not null default 'scheduled',
  status text not null default 'ok',

  audit_hash_broken_count integer not null default 0,
  critical_error_count_1h integer not null default 0,
  failed_scheduled_job_count_24h integer not null default 0,
  open_reconciliation_issue_count integer not null default 0,

  metrics jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint system_health_snapshots_status_check
  check (status in ('ok', 'warning', 'critical'))
);

create index if not exists system_health_snapshots_created_idx
on system_health_snapshots (created_at desc);

create or replace function create_system_health_snapshot(
  p_snapshot_type text default 'scheduled',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_audit_hash_broken_count integer := 0;
  v_critical_error_count_1h integer := 0;
  v_failed_scheduled_job_count_24h integer := 0;
  v_open_reconciliation_issue_count integer := 0;

  v_attention_fraud_rate_1h numeric := 0;
  v_unbalanced_journal_count integer := 0;
  v_missing_mirror_count integer := 0;
  v_wallet_vs_accounting_delta_minor bigint := 0;

  v_status text := 'ok';
begin
  select coalesce(broken_entry_count, 0)
  into v_audit_hash_broken_count
  from audit_hash_chain_verification_runs
  order by started_at desc
  limit 1;

  select count(*)
  into v_critical_error_count_1h
  from error_events
  where severity = 'critical'
    and occurred_at >= now() - interval '1 hour';

  select count(*)
  into v_failed_scheduled_job_count_24h
  from scheduled_job_runs
  where status = 'failed'
    and started_at >= now() - interval '24 hours';

  select count(*)
  into v_open_reconciliation_issue_count
  from payout_reconciliation_issues
  where status in ('open', 'acknowledged');

  select coalesce(
    (
      count(*) filter (where decision = 'fraud_suspected')::numeric
      / greatest(count(*), 1)
    ),
    0
  )
  into v_attention_fraud_rate_1h
  from attention_verification_events
  where occurred_at >= now() - interval '1 hour';

  select count(*) into v_unbalanced_journal_count
  from accounting_unbalanced_journals;

  select count(*) into v_missing_mirror_count
  from accounting_missing_mirrors;

  select coalesce(sum(total_delta_minor), 0)::bigint
  into v_wallet_vs_accounting_delta_minor
  from wallet_balance_reconciliation_diffs;

  if v_audit_hash_broken_count > 0 or v_critical_error_count_1h > 0 then
    v_status := 'critical';
  elsif v_failed_scheduled_job_count_24h >= 3
    or v_open_reconciliation_issue_count >= 10 then
    v_status := 'warning';
  else
    v_status := 'ok';
  end if;

  insert into system_health_snapshots (
    snapshot_type,
    status,
    audit_hash_broken_count,
    critical_error_count_1h,
    failed_scheduled_job_count_24h,
    open_reconciliation_issue_count,
    metrics,
    metadata
  )
  values (
    coalesce(p_snapshot_type, 'scheduled'),
    v_status,
    v_audit_hash_broken_count,
    v_critical_error_count_1h,
    v_failed_scheduled_job_count_24h,
    v_open_reconciliation_issue_count,
    jsonb_build_object(
      'attention_fraud_rate_1h', v_attention_fraud_rate_1h,
      'unbalanced_journal_count', v_unbalanced_journal_count,
      'missing_mirror_count', v_missing_mirror_count,
      'wallet_vs_accounting_delta_minor', v_wallet_vs_accounting_delta_minor
    ),
    p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace view operations_dashboard as
select
  s.id as snapshot_id,
  s.created_at as snapshot_at,
  s.status,
  s.audit_hash_broken_count,
  s.critical_error_count_1h,
  s.failed_scheduled_job_count_24h,
  s.open_reconciliation_issue_count,
  s.metrics
from system_health_snapshots s
order by s.created_at desc
limit 1;

create or replace view money_integrity_dashboard as
select
  now() as checked_at,
  (select count(*) from accounting_unbalanced_journals) as unbalanced_journal_count,
  (select count(*) from accounting_missing_mirrors) as missing_mirror_count,
  (
    select coalesce(sum(total_delta_minor), 0)::bigint
    from wallet_balance_reconciliation_diffs
  ) as wallet_vs_accounting_delta_minor;

create or replace view attention_health_dashboard as
select
  date_trunc('hour', occurred_at) as bucket_hour,

  count(*) as event_count,

  count(*) filter (where decision = 'passed') as passed_count,
  count(*) filter (where decision = 'failed') as failed_count,
  count(*) filter (where decision = 'fraud_suspected') as fraud_suspected_count,
  count(*) filter (where reward_eligible is true) as reward_eligible_count,
  count(*) filter (where reward_issued is true) as reward_issued_count,

  (
    count(*) filter (where decision = 'passed')::numeric
    / greatest(count(*), 1)
  )::numeric(8, 6) as pass_rate,

  (
    count(*) filter (where decision = 'fraud_suspected')::numeric
    / greatest(count(*), 1)
  )::numeric(8, 6) as fraud_suspected_rate,

  avg(attention_score)::numeric(8, 6) as avg_attention_score,
  avg(confidence_score)::numeric(8, 6) as avg_confidence_score,
  avg(fraud_risk_score)::numeric(8, 6) as avg_fraud_risk_score,
  avg(quality_score)::numeric(8, 6) as avg_quality_score,

  (
    sum(no_face_frame_count)::numeric
    / greatest(sum(valid_frame_count + invalid_frame_count), 1)
  )::numeric(8, 6) as no_face_rate,

  (
    sum(gaze_invalid_frame_count)::numeric
    / greatest(sum(valid_frame_count + invalid_frame_count), 1)
  )::numeric(8, 6) as gaze_invalid_rate

from attention_verification_events
where occurred_at >= now() - interval '7 days'
group by date_trunc('hour', occurred_at)
order by bucket_hour desc;

create or replace view reward_flow_dashboard as
select
  date_trunc('hour', created_at) as bucket_hour,

  count(*) as reward_group_count,

  count(*) filter (where status = 'pending') as pending_count,
  count(*) filter (where status = 'processing') as processing_count,
  count(*) filter (where status = 'completed') as completed_count,
  count(*) filter (where status = 'failed') as failed_count,
  count(*) filter (where status = 'cancelled') as cancelled_count,

  coalesce(sum(reward_amount_minor), 0)::bigint as reward_amount_minor,

  coalesce(sum(reward_amount_minor) filter (where status = 'completed'), 0)::bigint
    as completed_reward_amount_minor,

  (
    count(*) filter (where status = 'failed')::numeric
    / greatest(count(*), 1)
  )::numeric(8, 6) as failure_rate

from reward_issuance_groups
where created_at >= now() - interval '7 days'
group by date_trunc('hour', created_at)
order by bucket_hour desc;

create or replace view withdrawal_payout_health_dashboard as
select
  date_trunc('hour', wr.created_at) as bucket_hour,

  count(*) as withdrawal_count,

  count(*) filter (where wr.status = 'requested') as requested_count,
  count(*) filter (where wr.status = 'approved') as approved_count,
  count(*) filter (where wr.status = 'reserved') as reserved_count,
  count(*) filter (where wr.status in ('submitted', 'processing')) as processing_count,
  count(*) filter (where wr.status = 'paid') as paid_count,
  count(*) filter (where wr.status = 'failed') as failed_count,
  count(*) filter (where wr.status in ('reversed', 'partially_reversed')) as reversed_count,

  coalesce(sum(wr.requested_amount_minor), 0)::bigint as requested_amount_minor,
  coalesce(sum(wr.requested_amount_minor) filter (where wr.status = 'paid'), 0)::bigint
    as paid_amount_minor,

  (
    count(*) filter (where wr.status = 'failed')::numeric
    / greatest(count(*), 1)
  )::numeric(8, 6) as failure_rate,

  (
    count(*) filter (where wr.status in ('reversed', 'partially_reversed'))::numeric
    / greatest(count(*), 1)
  )::numeric(8, 6) as reversal_rate

from withdrawal_requests wr
where wr.created_at >= now() - interval '7 days'
group by date_trunc('hour', wr.created_at)
order by bucket_hour desc;

create or replace view trust_fraud_dashboard as
select
  bucket_hour,

  sum(signal_count)::bigint as trust_signal_count,

  sum(positive_signal_count)::bigint as positive_signal_count,
  sum(negative_signal_count)::bigint as negative_signal_count,

  sum(critical_signal_count)::bigint as critical_signal_count,
  sum(high_signal_count)::bigint as high_signal_count,

  jsonb_object_agg(signal_type, signal_count) as signal_type_counts

from (
  select
    date_trunc('hour', created_at) as bucket_hour,
    signal_type,

    count(*) as signal_count,

    count(*) filter (where direction = 'positive') as positive_signal_count,
    count(*) filter (where direction = 'negative') as negative_signal_count,

    count(*) filter (where severity = 'critical') as critical_signal_count,
    count(*) filter (where severity = 'high') as high_signal_count

  from trust_signal_events
  where created_at >= now() - interval '7 days'
  group by date_trunc('hour', created_at), signal_type
) x
group by bucket_hour
order by bucket_hour desc;

create or replace view admin_activity_dashboard as
select
  bucket_hour,

  sum(action_count)::bigint as audit_event_count,

  sum(denied_count)::bigint as denied_count,
  sum(allowed_count)::bigint as allowed_count,
  sum(executed_count)::bigint as executed_count,
  sum(failed_count)::bigint as failed_count,

  jsonb_object_agg(action, action_count) as action_counts

from (
  select
    date_trunc('hour', created_at) as bucket_hour,
    action,

    count(*) as action_count,

    count(*) filter (where decision = 'denied') as denied_count,
    count(*) filter (where decision = 'allowed') as allowed_count,
    count(*) filter (where decision = 'executed') as executed_count,
    count(*) filter (where decision = 'failed') as failed_count

  from admin_audit_log
  where created_at >= now() - interval '7 days'
  group by date_trunc('hour', created_at), action
) x
group by bucket_hour
order by bucket_hour desc;

create or replace view campaign_health_dashboard as
select
  cfs.campaign_id,
  cfs.advertiser_id,

  cfs.currency_code,

  cfs.funded_amount_minor,
  cfs.reserved_amount_minor,
  cfs.issued_amount_minor,
  cfs.released_amount_minor,
  cfs.expired_amount_minor,
  cfs.refunded_amount_minor,

  cfs.invoiced_amount_minor,
  cfs.invoice_paid_amount_minor,
  cfs.invoice_outstanding_amount_minor,

  cfs.issued_vs_invoiced_reward_delta_minor,
  cfs.has_reward_invoice_delta,

  (
    select count(*)
    from campaign_invoice_reconciliation_issues i
    where i.campaign_id = cfs.campaign_id
      and i.status = 'open'
  ) as open_invoice_issue_count,

  (
    select count(*)
    from reward_issuance_groups rig
    where rig.campaign_id = cfs.campaign_id
      and rig.status = 'failed'
      and rig.created_at >= now() - interval '24 hours'
  ) as failed_reward_count_24h,

  now() as checked_at

from campaign_financial_summary cfs;

create or replace view model_rollout_health_dashboard as
select
  r.rollout_id,
  r.rollout_key,
  r.rollout_name,
  r.status,
  r.rollout_type,
  r.rollout_percentage,
  r.kill_switch_enabled,

  r.model_version,
  r.model_status,
  r.pipeline_version,
  r.pipeline_status,

  r.event_count,
  r.pass_rate,
  r.fraud_suspected_rate,
  r.avg_attention_score,
  r.avg_fraud_risk_score,
  r.should_pause,

  case
    when r.kill_switch_enabled is true then 'kill_switch_enabled'
    when r.should_pause is true then 'guardrail_should_pause'
    when r.model_status <> 'active' then 'model_not_active'
    when r.pipeline_status <> 'active' then 'pipeline_not_active'
    else 'ok'
  end as health_status,

  r.created_at,
  r.updated_at

from attention_rollout_dashboard r;

-- ---------------------------------------------------------------------------
-- 3) Event emissions for critical flows
-- ---------------------------------------------------------------------------

create or replace function emit_reward_issued_event_from_group()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed'
     and (old.status is distinct from new.status) then
    perform emit_platform_event(
      'reward_issued',
      'reward',
      'info',
      'reward_engine',
      new.user_id,
      new.wallet_id,
      new.campaign_id,
      null,
      null,
      'reward_issuance_group',
      new.id,
      null,
      'reward_issued:' || new.id::text,
      'Reward issued',
      jsonb_build_object(
        'reward_amount_minor', new.reward_amount_minor,
        'currency_code', new.currency_code
      ),
      coalesce(new.metadata, '{}'::jsonb)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_emit_reward_issued_event
on reward_issuance_groups;

create trigger trg_emit_reward_issued_event
after update on reward_issuance_groups
for each row
execute function emit_reward_issued_event_from_group();

create or replace function emit_withdrawal_paid_event_from_request()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'paid'
     and (old.status is distinct from new.status) then
    perform emit_platform_event(
      'withdrawal_paid',
      'withdrawal',
      'info',
      'withdrawal_engine',
      new.user_id,
      new.wallet_id,
      null,
      null,
      null,
      'withdrawal_request',
      new.id,
      null,
      'withdrawal_paid:' || new.id::text,
      'Withdrawal paid',
      jsonb_build_object(
        'requested_amount_minor', new.requested_amount_minor,
        'currency_code', new.currency_code
      ),
      coalesce(new.metadata, '{}'::jsonb)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_emit_withdrawal_paid_event
on withdrawal_requests;

create trigger trg_emit_withdrawal_paid_event
after update on withdrawal_requests
for each row
execute function emit_withdrawal_paid_event_from_request();

create or replace function emit_payout_reconciliation_issue_event()
returns trigger
language plpgsql
as $$
begin
  perform emit_platform_event(
    'payout_reconciliation_issue_detected',
    'payout',
    case
      when new.issue_type in ('unknown_provider_status', 'stale_processing_payout')
      then 'warning'
      else 'high'
    end,
    'payout_reconciliation_engine',
    new.user_id,
    new.wallet_id,
    null,
    null,
    null,
    'payout_reconciliation_issue',
    new.id,
    null,
    'payout_reconciliation_issue:' || new.id::text,
    'Payout reconciliation issue detected',
    jsonb_build_object(
      'issue_type', new.issue_type,
      'amount_minor', coalesce(new.external_amount_minor, new.internal_amount_minor)
    ),
    coalesce(new.metadata, '{}'::jsonb)
  );

  return new;
end;
$$;

drop trigger if exists trg_emit_payout_reconciliation_issue_event
on payout_reconciliation_issues;

create trigger trg_emit_payout_reconciliation_issue_event
after insert on payout_reconciliation_issues
for each row
execute function emit_payout_reconciliation_issue_event();

create or replace function emit_audit_hash_broken_event_from_run()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed'
     and coalesce(new.broken_entry_count, 0) > 0 then
    perform emit_platform_event(
      'audit_hash_chain_broken',
      'audit',
      'critical',
      'audit_hash_chain',
      null,
      null,
      null,
      null,
      null,
      'audit_hash_chain_verification_run',
      new.id,
      null,
      'audit_hash_chain_broken:' || new.id::text,
      'Audit hash chain verification failed',
      jsonb_build_object(
        'broken_entry_count', new.broken_entry_count,
        'first_broken_sequence_number', new.first_broken_sequence_number
      ),
      coalesce(new.metadata, '{}'::jsonb)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_emit_audit_hash_broken_event
on audit_hash_chain_verification_runs;

create trigger trg_emit_audit_hash_broken_event
after insert or update on audit_hash_chain_verification_runs
for each row
execute function emit_audit_hash_broken_event_from_run();

-- ---------------------------------------------------------------------------
-- 4) Observability run + alerts
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

  acknowledged_by_admin_id uuid references admin_users(id),
  resolved_by_admin_id uuid references admin_users(id),

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
    'audit_hash_broken',
    'Audit hash chain broken',
    'audit',
    'critical',
    'audit_hash_broken_count',
    'gt',
    0,
    1440,
    'security',
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
    'open_reconciliation_issues_spike',
    'Open reconciliation issues spike',
    'finance',
    'high',
    'open_reconciliation_issue_count',
    'gte',
    10,
    60,
    'finance',
    '{}'
  ),
  (
    'attention_fraud_rate_spike',
    'Attention fraud suspected rate spike',
    'attention',
    'high',
    'attention_fraud_rate_1h',
    'gte',
    0.10,
    60,
    'trust',
    '{}'
  )
on conflict (alert_key)
do update set
  enabled = true,
  threshold = excluded.threshold,
  severity = excluded.severity,
  updated_at = now();

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
        when 'audit_hash_broken_count'
        then v_snapshot.audit_hash_broken_count::numeric

        when 'critical_error_count_1h'
        then v_snapshot.critical_error_count_1h::numeric

        when 'failed_scheduled_job_count_24h'
        then v_snapshot.failed_scheduled_job_count_24h::numeric

        when 'open_reconciliation_issue_count'
        then v_snapshot.open_reconciliation_issue_count::numeric

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

    raise;
end;
$$;

create or replace view alert_dashboard as
select
  ae.id as alert_event_id,
  ae.alert_key,
  ar.alert_name,
  ae.severity,
  ae.status,
  ae.metric_name,
  ae.metric_value,
  ae.threshold,
  ae.message,
  ar.owner_team,
  ae.related_entity_type,
  ae.related_entity_id,
  ae.acknowledged_by_admin_id,
  ae.resolved_by_admin_id,
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
  p_admin_user_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  update alert_events
  set
    status = 'acknowledged',
    acknowledged_by_admin_id = p_admin_user_id,
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
  p_admin_user_id uuid,
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
    resolved_by_admin_id = p_admin_user_id,
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
-- 5) Scheduler updates (group + new job + allowlist branch)
-- ---------------------------------------------------------------------------

alter table scheduled_jobs
drop constraint if exists scheduled_jobs_group_check;

alter table scheduled_jobs
add constraint scheduled_jobs_group_check
check (
  job_group in (
    'wallet',
    'reward',
    'trust',
    'identity_graph',
    'attention',
    'accounting',
    'audit',
    'payout',
    'withdrawal',
    'campaign',
    'model',
    'maintenance',
    'system'
  )
);

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
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_args = excluded.function_args,
  updated_at = now();
