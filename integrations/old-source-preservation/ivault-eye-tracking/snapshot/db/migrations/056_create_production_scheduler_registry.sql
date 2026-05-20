-- Step 6.10 — Production cron / job scheduler definitions
-- Critical money/trust jobs must be scheduled, idempotent, observable, and safe to retry.

create table if not exists scheduled_jobs (
  id uuid primary key default gen_random_uuid(),

  job_key text not null unique,
  job_name text not null,

  job_group text not null,

  enabled boolean not null default true,

  schedule_cron text not null,
  timezone text not null default 'UTC',

  function_name text not null,
  function_args jsonb not null default '{}'::jsonb,

  max_runtime_seconds integer not null default 300,
  retry_limit integer not null default 3,
  retry_backoff_seconds integer not null default 60,

  lock_ttl_seconds integer not null default 600,

  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_failed_at timestamptz,

  last_status text,
  last_run_id uuid,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint scheduled_jobs_group_check
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
      'maintenance'
    )
  ),

  constraint scheduled_jobs_last_status_check
  check (
    last_status is null
    or last_status in (
      'started',
      'completed',
      'failed',
      'skipped_locked',
      'disabled'
    )
  )
);

create index if not exists scheduled_jobs_enabled_idx
on scheduled_jobs (enabled, job_group);

create index if not exists scheduled_jobs_last_started_idx
on scheduled_jobs (last_started_at desc);

create table if not exists scheduled_job_runs (
  id uuid primary key default gen_random_uuid(),

  scheduled_job_id uuid references scheduled_jobs(id),
  job_key text not null,
  job_group text not null,

  status text not null default 'started',

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  runtime_ms integer,

  attempt_number integer not null default 1,

  result jsonb not null default '{}'::jsonb,
  error_message text,

  metadata jsonb not null default '{}'::jsonb,

  constraint scheduled_job_runs_status_check
  check (
    status in (
      'started',
      'completed',
      'failed',
      'skipped_locked',
      'disabled'
    )
  )
);

create index if not exists scheduled_job_runs_job_idx
on scheduled_job_runs (job_key, started_at desc);

create index if not exists scheduled_job_runs_status_idx
on scheduled_job_runs (status, started_at desc);

create index if not exists scheduled_job_runs_group_idx
on scheduled_job_runs (job_group, started_at desc);

create table if not exists scheduled_job_locks (
  job_key text primary key,

  locked_by text,
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null,

  metadata jsonb not null default '{}'::jsonb
);

create index if not exists scheduled_job_locks_expires_idx
on scheduled_job_locks (expires_at);

create or replace function acquire_scheduled_job_lock(
  p_job_key text,
  p_locked_by text default 'scheduler',
  p_lock_ttl_seconds integer default 600,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
as $$
declare
  v_row_count integer := 0;
begin
  if p_job_key is null or length(trim(p_job_key)) = 0 then
    raise exception 'job key is required';
  end if;

  if p_lock_ttl_seconds <= 0 then
    raise exception 'lock ttl must be positive';
  end if;

  insert into scheduled_job_locks (
    job_key,
    locked_by,
    locked_at,
    expires_at,
    metadata
  )
  values (
    p_job_key,
    p_locked_by,
    now(),
    now() + make_interval(secs => p_lock_ttl_seconds),
    p_metadata
  )
  on conflict (job_key)
  do update set
    locked_by = excluded.locked_by,
    locked_at = excluded.locked_at,
    expires_at = excluded.expires_at,
    metadata = scheduled_job_locks.metadata || excluded.metadata
  where scheduled_job_locks.expires_at <= now();

  get diagnostics v_row_count = row_count;

  return v_row_count > 0;
end;
$$;

create or replace function release_scheduled_job_lock(
  p_job_key text
)
returns void
language sql
as $$
  delete from scheduled_job_locks
  where job_key = p_job_key;
$$;

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
values
  (
    'reward_issuance_every_minute',
    'Run reward issuance',
    'reward',
    true,
    '* * * * *',
    'run_reward_issuance_job',
    '{"batch_size": 500}'::jsonb,
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
values
  (
    'trust_decay_every_6_hours',
    'Run trust decay and wallet policy sync',
    'trust',
    true,
    '0 */6 * * *',
    'run_trust_decay_and_policy_sync_job',
    '{"batch_size": 1000}'::jsonb,
    600,
    900,
    '{"priority": "medium"}'::jsonb
  ),
  (
    'trust_override_expiration_hourly',
    'Expire trust overrides',
    'trust',
    true,
    '0 * * * *',
    'run_trust_override_expiration_job',
    '{"batch_size": 1000}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
  )
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_args = excluded.function_args,
  updated_at = now();

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
values
  (
    'identity_graph_risk_hourly',
    'Run identity graph risk job',
    'identity_graph',
    true,
    '15 * * * *',
    'run_identity_graph_risk_job',
    '{}'::jsonb,
    600,
    900,
    '{"priority": "medium"}'::jsonb
  )
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_args = excluded.function_args,
  updated_at = now();

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
values
  (
    'attention_evidence_retention_daily',
    'Run attention evidence retention',
    'attention',
    true,
    '30 3 * * *',
    'run_attention_evidence_retention_job',
    '{"batch_size": 1000}'::jsonb,
    900,
    1200,
    '{"priority": "low"}'::jsonb
  )
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_args = excluded.function_args,
  updated_at = now();

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
values
  (
    'accounting_mirror_every_minute',
    'Run accounting mirror',
    'accounting',
    true,
    '* * * * *',
    'run_accounting_mirror_job',
    '{"batch_size": 500}'::jsonb,
    180,
    300,
    '{"priority": "high"}'::jsonb
  ),
  (
    'campaign_invoice_accounting_mirror_every_5_minutes',
    'Run campaign invoice accounting mirror',
    'accounting',
    true,
    '*/5 * * * *',
    'run_campaign_invoice_accounting_mirror_job',
    '{"batch_size": 500}'::jsonb,
    180,
    300,
    '{"priority": "medium"}'::jsonb
  )
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_args = excluded.function_args,
  updated_at = now();

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
values
  (
    'audit_hash_backfill_hourly',
    'Run audit hash backfill',
    'audit',
    true,
    '5 * * * *',
    'run_audit_hash_backfill_job',
    '{"batch_size": 1000}'::jsonb,
    600,
    900,
    '{"priority": "high"}'::jsonb
  ),
  (
    'audit_hash_verify_daily',
    'Verify audit hash chain',
    'audit',
    true,
    '0 4 * * *',
    'verify_audit_hash_chain',
    '{"chain_key": "global_audit_chain", "batch_size": 100000}'::jsonb,
    1800,
    2400,
    '{"priority": "high"}'::jsonb
  )
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_args = excluded.function_args,
  updated_at = now();

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
values
  (
    'payout_provider_event_processing_every_minute',
    'Process payout provider events',
    'payout',
    true,
    '* * * * *',
    'run_payout_provider_event_processing_job',
    '{"batch_size": 500}'::jsonb,
    120,
    180,
    '{"priority": "critical"}'::jsonb
  ),
  (
    'payout_reconciliation_hourly',
    'Run payout reconciliation',
    'payout',
    true,
    '20 * * * *',
    'run_payout_reconciliation_job',
    '{"provider_key": null, "batch_size": 1000}'::jsonb,
    600,
    900,
    '{"priority": "high"}'::jsonb
  )
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_args = excluded.function_args,
  updated_at = now();

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
values
  (
    'withdrawal_reversal_detection_hourly',
    'Detect reversed withdrawals',
    'withdrawal',
    true,
    '25 * * * *',
    'run_withdrawal_reversal_detection_job',
    '{"batch_size": 500}'::jsonb,
    600,
    900,
    '{"priority": "high"}'::jsonb
  ),
  (
    'withdrawal_maintenance_hourly',
    'Run withdrawal maintenance',
    'withdrawal',
    true,
    '35 * * * *',
    'run_withdrawal_maintenance_job',
    '{"batch_size": 500}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
  )
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_args = excluded.function_args,
  updated_at = now();

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
values
  (
    'campaign_invoice_reconciliation_daily',
    'Run campaign invoice reconciliation',
    'campaign',
    true,
    '45 2 * * *',
    'run_campaign_invoice_reconciliation_job',
    '{"campaign_id": null, "advertiser_id": null, "batch_size": 1000}'::jsonb,
    900,
    1200,
    '{"priority": "medium"}'::jsonb
  )
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_args = excluded.function_args,
  updated_at = now();

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
values
  (
    'attention_rollout_metrics_hourly',
    'Compute attention rollout metrics',
    'model',
    true,
    '10 * * * *',
    'compute_attention_rollout_metrics',
    '{"bucket": "previous_hour"}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
  ),
  (
    'attention_rollout_guardrail_hourly',
    'Auto-pause risky attention rollouts',
    'model',
    true,
    '12 * * * *',
    'auto_pause_risky_attention_rollouts',
    '{}'::jsonb,
    120,
    300,
    '{"priority": "high"}'::jsonb
  )
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_args = excluded.function_args,
  updated_at = now();

create or replace function run_scheduled_job(
  p_job_key text,
  p_locked_by text default 'scheduler',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_job scheduled_jobs%rowtype;
  v_run_id uuid;
  v_lock_acquired boolean;

  v_started_at timestamptz;
  v_result jsonb := '{}'::jsonb;

  v_uuid_result uuid;
  v_int_result integer;
begin
  if p_job_key is null or length(trim(p_job_key)) = 0 then
    raise exception 'job key is required';
  end if;

  select *
  into v_job
  from scheduled_jobs
  where job_key = p_job_key;

  if v_job.id is null then
    raise exception 'scheduled job not found: %', p_job_key;
  end if;

  if v_job.enabled is false then
    insert into scheduled_job_runs (
      scheduled_job_id,
      job_key,
      job_group,
      status,
      metadata
    )
    values (
      v_job.id,
      v_job.job_key,
      v_job.job_group,
      'disabled',
      p_metadata
    )
    returning id into v_run_id;

    update scheduled_jobs
    set
      last_status = 'disabled',
      last_run_id = v_run_id,
      updated_at = now()
    where id = v_job.id;

    return v_run_id;
  end if;

  v_lock_acquired := acquire_scheduled_job_lock(
    v_job.job_key,
    p_locked_by,
    v_job.lock_ttl_seconds,
    p_metadata
  );

  if v_lock_acquired is false then
    insert into scheduled_job_runs (
      scheduled_job_id,
      job_key,
      job_group,
      status,
      metadata
    )
    values (
      v_job.id,
      v_job.job_key,
      v_job.job_group,
      'skipped_locked',
      p_metadata
    )
    returning id into v_run_id;

    update scheduled_jobs
    set
      last_status = 'skipped_locked',
      last_run_id = v_run_id,
      updated_at = now()
    where id = v_job.id;

    return v_run_id;
  end if;

  v_started_at := now();

  insert into scheduled_job_runs (
    scheduled_job_id,
    job_key,
    job_group,
    status,
    started_at,
    metadata
  )
  values (
    v_job.id,
    v_job.job_key,
    v_job.job_group,
    'started',
    v_started_at,
    p_metadata
  )
  returning id into v_run_id;

  update scheduled_jobs
  set
    last_started_at = v_started_at,
    last_status = 'started',
    last_run_id = v_run_id,
    updated_at = now()
  where id = v_job.id;

  if v_job.function_name = 'run_reward_issuance_job' then
    execute
      'select run_reward_issuance_job($1, $2)'
    into v_uuid_result
    using
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_trust_decay_and_policy_sync_job' then
    execute
      'select run_trust_decay_and_policy_sync_job($1, $2)'
    into v_uuid_result
    using
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_trust_override_expiration_job' then
    execute
      'select run_trust_override_expiration_job($1, $2)'
    into v_uuid_result
    using
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_identity_graph_risk_job' then
    execute
      'select run_identity_graph_risk_job($1)'
    into v_uuid_result
    using
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_attention_evidence_retention_job' then
    execute
      'select run_attention_evidence_retention_job($1, $2)'
    into v_uuid_result
    using
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_accounting_mirror_job' then
    execute
      'select run_accounting_mirror_job($1, $2)'
    into v_uuid_result
    using
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_campaign_invoice_accounting_mirror_job' then
    execute
      'select run_campaign_invoice_accounting_mirror_job($1, $2)'
    into v_int_result
    using
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('mirrored_count', v_int_result);

  elsif v_job.function_name = 'run_audit_hash_backfill_job' then
    execute
      'select run_audit_hash_backfill_job($1, $2)'
    into v_uuid_result
    using
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'verify_audit_hash_chain' then
    execute
      'select verify_audit_hash_chain($1, $2, $3)'
    into v_uuid_result
    using
      coalesce(v_job.function_args->>'chain_key', 'global_audit_chain'),
      coalesce((v_job.function_args->>'batch_size')::integer, 100000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_payout_provider_event_processing_job' then
    execute
      'select run_payout_provider_event_processing_job($1, $2)'
    into v_int_result
    using
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('processed_count', v_int_result);

  elsif v_job.function_name = 'run_payout_reconciliation_job' then
    execute
      'select run_payout_reconciliation_job($1, $2, $3)'
    into v_uuid_result
    using
      v_job.function_args->>'provider_key',
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_withdrawal_reversal_detection_job' then
    execute
      'select run_withdrawal_reversal_detection_job($1, $2)'
    into v_uuid_result
    using
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_withdrawal_maintenance_job' then
    execute
      'select run_withdrawal_maintenance_job($1, $2)'
    into v_uuid_result
    using
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_campaign_invoice_reconciliation_job' then
    execute
      'select run_campaign_invoice_reconciliation_job($1, $2, $3, $4)'
    into v_uuid_result
    using
      nullif(v_job.function_args->>'campaign_id', '')::uuid,
      nullif(v_job.function_args->>'advertiser_id', '')::uuid,
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'compute_attention_rollout_metrics' then
    execute
      'select compute_attention_rollout_metrics($1, $2, $3)'
    into v_int_result
    using
      date_trunc('hour', now() - interval '1 hour'),
      date_trunc('hour', now()),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('inserted_count', v_int_result);

  elsif v_job.function_name = 'auto_pause_risky_attention_rollouts' then
    execute
      'select auto_pause_risky_attention_rollouts($1)'
    into v_int_result
    using
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('paused_count', v_int_result);

  elsif v_job.function_name = 'run_observability_snapshot_job' then
    execute
      'select run_observability_snapshot_job($1)'
    into v_uuid_result
    using
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id);

    v_result := jsonb_build_object('run_id', v_uuid_result);

  else
    raise exception 'scheduled function not allowlisted: %', v_job.function_name;
  end if;

  update scheduled_job_runs
  set
    status = 'completed',
    completed_at = now(),
    runtime_ms = (extract(epoch from (now() - v_started_at)) * 1000)::integer,
    result = v_result
  where id = v_run_id;

  update scheduled_jobs
  set
    last_completed_at = now(),
    last_status = 'completed',
    last_run_id = v_run_id,
    updated_at = now()
  where id = v_job.id;

  perform release_scheduled_job_lock(v_job.job_key);

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update scheduled_job_runs
      set
        status = 'failed',
        failed_at = now(),
        runtime_ms = (extract(epoch from (now() - v_started_at)) * 1000)::integer,
        error_message = sqlerrm
      where id = v_run_id;
    end if;

    update scheduled_jobs
    set
      last_failed_at = now(),
      last_status = 'failed',
      last_run_id = v_run_id,
      updated_at = now()
    where job_key = p_job_key;

    perform release_scheduled_job_lock(p_job_key);

    raise;
end;
$$;

create or replace view scheduled_job_dashboard as
select
  j.id as scheduled_job_id,
  j.job_key,
  j.job_name,
  j.job_group,
  j.enabled,
  j.schedule_cron,
  j.timezone,
  j.function_name,
  j.function_args,
  j.max_runtime_seconds,
  j.retry_limit,
  j.lock_ttl_seconds,
  j.last_started_at,
  j.last_completed_at,
  j.last_failed_at,
  j.last_status,
  j.last_run_id,

  l.locked_by,
  l.locked_at,
  l.expires_at as lock_expires_at,

  case
    when l.job_key is not null and l.expires_at > now()
    then true
    else false
  end as currently_locked,

  (
    select count(*)
    from scheduled_job_runs r
    where r.job_key = j.job_key
      and r.status = 'failed'
      and r.started_at >= now() - interval '24 hours'
  ) as failed_runs_24h,

  (
    select count(*)
    from scheduled_job_runs r
    where r.job_key = j.job_key
      and r.status = 'completed'
      and r.started_at >= now() - interval '24 hours'
  ) as completed_runs_24h,

  (
    select avg(runtime_ms)::integer
    from scheduled_job_runs r
    where r.job_key = j.job_key
      and r.status = 'completed'
      and r.started_at >= now() - interval '24 hours'
  ) as avg_runtime_ms_24h

from scheduled_jobs j
left join scheduled_job_locks l
  on l.job_key = j.job_key;

create or replace view scheduled_job_alerts as
select
  j.job_key,
  j.job_name,
  j.job_group,
  j.enabled,
  j.last_status,
  j.last_failed_at,
  j.last_completed_at,

  case
    when j.enabled is true
      and j.last_status = 'failed'
    then 'last_run_failed'

    when j.enabled is true
      and j.last_completed_at is null
      and j.created_at < now() - interval '1 hour'
    then 'job_never_completed'

    when j.enabled is true
      and j.job_key like '%every_minute%'
      and j.last_completed_at < now() - interval '10 minutes'
    then 'minute_job_stale'

    when j.enabled is true
      and j.job_key like '%hourly%'
      and j.last_completed_at < now() - interval '2 hours'
    then 'hourly_job_stale'

    when j.enabled is true
      and j.job_key like '%daily%'
      and j.last_completed_at < now() - interval '36 hours'
    then 'daily_job_stale'

    else null
  end as alert_type

from scheduled_jobs j
where j.enabled is true
  and (
    j.last_status = 'failed'
    or (
      j.last_completed_at is null
      and j.created_at < now() - interval '1 hour'
    )
    or (
      j.job_key like '%every_minute%'
      and j.last_completed_at < now() - interval '10 minutes'
    )
    or (
      j.job_key like '%hourly%'
      and j.last_completed_at < now() - interval '2 hours'
    )
    or (
      j.job_key like '%daily%'
      and j.last_completed_at < now() - interval '36 hours'
    )
  );

-- Restrict scheduler execution to worker roles only.
revoke all on table scheduled_jobs from public;
revoke all on table scheduled_job_runs from public;
revoke all on table scheduled_job_locks from public;

revoke execute on function acquire_scheduled_job_lock(text, text, integer, jsonb) from public;
revoke execute on function release_scheduled_job_lock(text) from public;
revoke execute on function run_scheduled_job(text, text, jsonb) from public;

do $$
declare
  v_role text;
begin
  foreach v_role in array array[
    'worker_role',
    'finance_worker_role',
    'ml_worker_role'
  ]
  loop
    if exists (select 1 from pg_roles where rolname = v_role) then
      execute format(
        'grant execute on function run_scheduled_job(text, text, jsonb) to %I',
        v_role
      );
      execute format(
        'grant execute on function acquire_scheduled_job_lock(text, text, integer, jsonb) to %I',
        v_role
      );
      execute format(
        'grant execute on function release_scheduled_job_lock(text) to %I',
        v_role
      );
      execute format('grant select on scheduled_job_dashboard to %I', v_role);
      execute format('grant select on scheduled_job_alerts to %I', v_role);
      execute format('grant select on scheduled_job_runs to %I', v_role);
      execute format('grant select on scheduled_jobs to %I', v_role);
    end if;
  end loop;

  if exists (select 1 from pg_roles where rolname = 'readonly_audit_role') then
    grant select on scheduled_job_dashboard to readonly_audit_role;
    grant select on scheduled_job_alerts to readonly_audit_role;
    grant select on scheduled_job_runs to readonly_audit_role;
    grant select on scheduled_jobs to readonly_audit_role;
  end if;
end
$$;
