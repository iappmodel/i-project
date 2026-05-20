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
      'reward',
      'accounting',
      'audit',
      'wallet',
      'attention',
      'maintenance',
      'system'
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
  ),

  constraint scheduled_jobs_runtime_check
  check (
    max_runtime_seconds > 0
    and retry_limit >= 0
    and retry_backoff_seconds >= 0
    and lock_ttl_seconds > 0
  )
);

create index if not exists scheduled_jobs_enabled_idx
on scheduled_jobs (enabled, job_group);

create index if not exists scheduled_jobs_last_started_idx
on scheduled_jobs (last_started_at desc);

drop trigger if exists scheduled_jobs_set_updated_at on scheduled_jobs;

create trigger scheduled_jobs_set_updated_at
before update on scheduled_jobs
for each row
execute function set_updated_at();

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
  ),

  constraint scheduled_job_runs_attempt_check
  check (attempt_number > 0)
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
  v_changed integer;
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
    coalesce(p_locked_by, 'scheduler'),
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

  get diagnostics v_changed = row_count;

  return v_changed > 0;
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
  ),
  (
    'reward_release_every_5_minutes',
    'Release mature reward lots',
    'reward',
    true,
    '*/5 * * * *',
    'release_mature_reward_lots',
    '{"batch_size": 500}'::jsonb,
    120,
    180,
    '{"priority": "medium"}'::jsonb
  ),
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
    'withdrawal_reserve_every_minute',
    'Reserve approved withdrawals',
    'wallet',
    true,
    '* * * * *',
    'run_withdrawal_reserve_job',
    '{"batch_size": 100}'::jsonb,
    120,
    180,
    '{"priority": "high"}'::jsonb
  ),
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

  v_uuid_result uuid;
  v_result jsonb := '{}'::jsonb;
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

  /*
    Hard allowlist.
    Do not dynamic execute function_name.
  */

  if v_job.function_name = 'run_reward_issuance_job' then
    v_uuid_result := run_reward_issuance_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'release_mature_reward_lots' then
    v_uuid_result := release_mature_reward_lots(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_accounting_mirror_job' then
    v_uuid_result := run_accounting_mirror_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_withdrawal_reserve_job' then
    v_uuid_result := run_withdrawal_reserve_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_audit_hash_backfill_job' then
    v_uuid_result := run_audit_hash_backfill_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'verify_audit_hash_chain' then
    v_uuid_result := verify_audit_hash_chain(
      coalesce(v_job.function_args->>'chain_key', 'global_audit_chain'),
      coalesce((v_job.function_args->>'batch_size')::integer, 100000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_observability_snapshot_job' then
    v_uuid_result := run_observability_snapshot_job(
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

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
        runtime_ms =
          case
            when v_started_at is not null
            then (extract(epoch from (now() - v_started_at)) * 1000)::integer
            else null
          end,
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
    when l.job_key is not null
      and l.expires_at > now()
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
