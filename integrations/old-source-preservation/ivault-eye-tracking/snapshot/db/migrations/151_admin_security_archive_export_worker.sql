-- Step 9.36 — Build real archive export worker for security archives.
-- Runs after 150_admin_security_retention_archival.sql.

create table if not exists admin_security_archive_export_jobs (
  id uuid primary key default gen_random_uuid(),
  archive_manifest_id uuid not null references admin_security_archive_manifests(id) on delete cascade,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz not null default now(),
  claimed_by_worker_id text,
  claimed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  storage_provider text not null default 'local_file',
  storage_uri text,
  checksum_sha256 text,
  record_count bigint not null default 0,
  payload_bytes bigint not null default 0,
  last_error text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (archive_manifest_id),
  constraint admin_security_archive_export_jobs_status_check
  check (
    status in (
      'pending',
      'claimed',
      'running',
      'completed',
      'failed',
      'abandoned'
    )
  )
);

create index if not exists admin_security_archive_export_jobs_status_idx
on admin_security_archive_export_jobs (status, next_attempt_at asc);

create index if not exists admin_security_archive_export_jobs_manifest_idx
on admin_security_archive_export_jobs (archive_manifest_id);

drop trigger if exists admin_security_archive_export_jobs_set_updated_at
on admin_security_archive_export_jobs;

create trigger admin_security_archive_export_jobs_set_updated_at
before update on admin_security_archive_export_jobs
for each row
execute function set_updated_at();

create or replace function enqueue_admin_security_archive_export_job(
  p_archive_manifest_id uuid,
  p_storage_provider text default 'local_file',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_manifest admin_security_archive_manifests%rowtype;
  v_job_id uuid;
begin
  if p_archive_manifest_id is null then
    raise exception 'archive manifest id is required';
  end if;

  select *
  into v_manifest
  from admin_security_archive_manifests
  where id = p_archive_manifest_id;

  if v_manifest.id is null then
    raise exception 'admin security archive manifest not found: %', p_archive_manifest_id;
  end if;

  if v_manifest.status in ('sealed', 'verified') then
    raise exception 'archive manifest is already sealed or verified';
  end if;

  insert into admin_security_archive_export_jobs (
    archive_manifest_id,
    status,
    next_attempt_at,
    storage_provider,
    record_count,
    request_id,
    metadata
  )
  values (
    p_archive_manifest_id,
    'pending',
    now(),
    coalesce(p_storage_provider, 'local_file'),
    v_manifest.record_count,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (archive_manifest_id)
  do update set
    status =
      case
        when admin_security_archive_export_jobs.status in ('completed', 'running', 'claimed')
        then admin_security_archive_export_jobs.status
        else 'pending'
      end,
    next_attempt_at = now(),
    storage_provider = excluded.storage_provider,
    metadata = admin_security_archive_export_jobs.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_job_id;

  return v_job_id;
end;
$$;

create or replace function enqueue_pending_admin_security_archive_exports(
  p_batch_size integer default 100,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_manifest record;
begin
  if p_batch_size <= 0 or p_batch_size > 1000 then
    raise exception 'batch size must be between 1 and 1000';
  end if;

  for v_manifest in
    select m.*
    from admin_security_archive_manifests m
    where m.status in ('created', 'exported')
      and not exists (
        select 1
        from admin_security_archive_export_jobs j
        where j.archive_manifest_id = m.id
          and j.status in ('pending', 'claimed', 'running', 'completed')
      )
    order by m.created_at asc
    limit p_batch_size
  loop
    perform enqueue_admin_security_archive_export_job(
      v_manifest.id,
      v_manifest.storage_provider,
      null,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'run_id',
        v_run_id,
        'source',
        'enqueue_pending_admin_security_archive_exports'
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function claim_admin_security_archive_export_jobs(
  p_batch_size integer default 10,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  job_id uuid,
  archive_manifest_id uuid,
  source_type text,
  period_start timestamptz,
  period_end timestamptz,
  storage_provider text,
  record_count bigint
)
language plpgsql
as $$
begin
  if p_batch_size <= 0 or p_batch_size > 50 then
    raise exception 'batch size must be between 1 and 50';
  end if;

  return query
  with claimed as (
    select j.id
    from admin_security_archive_export_jobs j
    where j.status in ('pending', 'failed')
      and j.next_attempt_at <= now()
      and j.attempt_count < j.max_attempts
    order by j.next_attempt_at asc, j.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated as (
    update admin_security_archive_export_jobs j
    set
      status = 'claimed',
      attempt_count = j.attempt_count + 1,
      claimed_by_worker_id = p_worker_id,
      claimed_at = now(),
      metadata = j.metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
    from claimed
    where j.id = claimed.id
    returning j.*
  )
  select
    u.id as job_id,
    m.id as archive_manifest_id,
    m.source_type,
    m.period_start,
    m.period_end,
    u.storage_provider,
    m.record_count
  from updated u
  join admin_security_archive_manifests m
    on m.id = u.archive_manifest_id;
end;
$$;

create or replace function mark_admin_security_archive_export_running(
  p_job_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_job_id is null then
    raise exception 'archive export job id is required';
  end if;

  update admin_security_archive_export_jobs
  set
    status = 'running',
    started_at = coalesce(started_at, now()),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_job_id
    and status in ('claimed', 'pending', 'failed');

  if not found then
    raise exception 'archive export job not found or not runnable: %', p_job_id;
  end if;

  return p_job_id;
end;
$$;

create or replace function complete_admin_security_archive_export_job(
  p_job_id uuid,
  p_storage_uri text,
  p_checksum_sha256 text,
  p_payload_bytes bigint,
  p_record_count bigint,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_job admin_security_archive_export_jobs%rowtype;
begin
  if p_job_id is null then
    raise exception 'archive export job id is required';
  end if;

  if p_storage_uri is null or length(trim(p_storage_uri)) = 0 then
    raise exception 'archive storage uri is required';
  end if;

  if p_checksum_sha256 is null or length(trim(p_checksum_sha256)) = 0 then
    raise exception 'archive checksum is required';
  end if;

  select *
  into v_job
  from admin_security_archive_export_jobs
  where id = p_job_id
  for update;

  if v_job.id is null then
    raise exception 'archive export job not found: %', p_job_id;
  end if;

  update admin_security_archive_export_jobs
  set
    status = 'completed',
    completed_at = now(),
    storage_uri = p_storage_uri,
    checksum_sha256 = p_checksum_sha256,
    payload_bytes = greatest(coalesce(p_payload_bytes, 0), 0),
    record_count = greatest(coalesce(p_record_count, 0), 0),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_job_id;

  update admin_security_archive_manifests
  set
    status = 'sealed',
    storage_uri = p_storage_uri,
    checksum_sha256 = p_checksum_sha256,
    record_count = greatest(coalesce(p_record_count, record_count), 0),
    sealed_at = now(),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'sealed_by_archive_export_job_id',
      p_job_id
    ),
    updated_at = now()
  where id = v_job.archive_manifest_id;

  perform hash_admin_security_archive_manifest(
    v_job.archive_manifest_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'source',
      'complete_admin_security_archive_export_job'
    )
  );

  return v_job.archive_manifest_id;
end;
$$;

create or replace function fail_admin_security_archive_export_job(
  p_job_id uuid,
  p_error text,
  p_retry_seconds integer default 900,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_job admin_security_archive_export_jobs%rowtype;
begin
  if p_job_id is null then
    raise exception 'archive export job id is required';
  end if;

  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'archive export error is required';
  end if;

  select *
  into v_job
  from admin_security_archive_export_jobs
  where id = p_job_id
  for update;

  if v_job.id is null then
    raise exception 'archive export job not found: %', p_job_id;
  end if;

  if v_job.attempt_count >= v_job.max_attempts then
    update admin_security_archive_export_jobs
    set
      status = 'abandoned',
      failed_at = now(),
      last_error = p_error,
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'abandoned_at',
        now()
      ),
      updated_at = now()
    where id = p_job_id;

    update admin_security_archive_manifests
    set
      status = 'failed',
      metadata = metadata || jsonb_build_object(
        'failed_export_job_id',
        p_job_id,
        'last_error',
        p_error
      ),
      updated_at = now()
    where id = v_job.archive_manifest_id;
  else
    update admin_security_archive_export_jobs
    set
      status = 'failed',
      failed_at = now(),
      last_error = p_error,
      next_attempt_at = now() + make_interval(secs => greatest(p_retry_seconds, 60)),
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
    where id = p_job_id;
  end if;

  return p_job_id;
end;
$$;

create or replace function build_admin_security_archive_payload(
  p_archive_manifest_id uuid
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_manifest admin_security_archive_manifests%rowtype;
  v_records jsonb := '[]'::jsonb;
begin
  if p_archive_manifest_id is null then
    raise exception 'archive manifest id is required';
  end if;

  select *
  into v_manifest
  from admin_security_archive_manifests
  where id = p_archive_manifest_id;

  if v_manifest.id is null then
    raise exception 'admin security archive manifest not found: %', p_archive_manifest_id;
  end if;

  if v_manifest.source_type = 'admin_security_alert_event' then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at asc), '[]'::jsonb)
    into v_records
    from (
      select *
      from admin_security_alert_events
      where created_at between v_manifest.period_start and v_manifest.period_end
    ) x;
  elsif v_manifest.source_type = 'admin_incident_review' then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at asc), '[]'::jsonb)
    into v_records
    from (
      select *
      from admin_incident_reviews
      where created_at between v_manifest.period_start and v_manifest.period_end
    ) x;
  elsif v_manifest.source_type = 'admin_incident_corrective_action' then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at asc), '[]'::jsonb)
    into v_records
    from (
      select *
      from admin_incident_corrective_actions
      where created_at between v_manifest.period_start and v_manifest.period_end
    ) x;
  elsif v_manifest.source_type = 'admin_break_glass_request' then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at asc), '[]'::jsonb)
    into v_records
    from (
      select *
      from admin_break_glass_requests
      where created_at between v_manifest.period_start and v_manifest.period_end
    ) x;
  elsif v_manifest.source_type = 'admin_session_control' then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at asc), '[]'::jsonb)
    into v_records
    from (
      select *
      from admin_session_controls
      where created_at between v_manifest.period_start and v_manifest.period_end
    ) x;
  elsif v_manifest.source_type = 'admin_action_risk_evaluation' then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at asc), '[]'::jsonb)
    into v_records
    from (
      select *
      from admin_action_risk_evaluations
      where created_at between v_manifest.period_start and v_manifest.period_end
    ) x;
  elsif v_manifest.source_type = 'admin_security_daily_snapshot' then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at asc), '[]'::jsonb)
    into v_records
    from (
      select *
      from admin_security_daily_snapshots
      where created_at between v_manifest.period_start and v_manifest.period_end
    ) x;
  elsif v_manifest.source_type = 'admin_security_report_export' then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at asc), '[]'::jsonb)
    into v_records
    from (
      select *
      from admin_security_report_exports
      where created_at between v_manifest.period_start and v_manifest.period_end
    ) x;
  elsif v_manifest.source_type = 'admin_security_notification_delivery' then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at asc), '[]'::jsonb)
    into v_records
    from (
      select *
      from admin_security_notification_deliveries
      where created_at between v_manifest.period_start and v_manifest.period_end
    ) x;
  elsif v_manifest.source_type = 'audit_hash_chain_entry' then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at asc), '[]'::jsonb)
    into v_records
    from (
      select *
      from audit_hash_chain_entries
      where created_at between v_manifest.period_start and v_manifest.period_end
    ) x;
  else
    raise exception 'unsupported archive source type: %', v_manifest.source_type;
  end if;

  return jsonb_build_object(
    'archive_manifest_id', v_manifest.id,
    'archive_key', v_manifest.archive_key,
    'source_type', v_manifest.source_type,
    'period_start', v_manifest.period_start,
    'period_end', v_manifest.period_end,
    'record_count', jsonb_array_length(v_records),
    'generated_at', now(),
    'records', v_records
  );
end;
$$;

create or replace view admin_security_archive_export_job_dashboard as
select
  j.id as admin_security_archive_export_job_id,
  j.archive_manifest_id,
  m.archive_key,
  m.source_type,
  m.period_start,
  m.period_end,
  j.status,
  j.attempt_count,
  j.max_attempts,
  j.next_attempt_at,
  j.claimed_by_worker_id,
  j.claimed_at,
  j.started_at,
  j.completed_at,
  j.failed_at,
  j.storage_provider,
  j.storage_uri,
  j.checksum_sha256,
  j.record_count,
  j.payload_bytes,
  j.last_error,
  j.created_at,
  j.updated_at,
  j.metadata
from admin_security_archive_export_jobs j
join admin_security_archive_manifests m
  on m.id = j.archive_manifest_id
order by j.created_at desc;

create or replace view admin_security_archive_export_integrity as
select
  (
    select count(*)
    from admin_security_archive_export_jobs
    where status = 'pending'
  ) as pending_export_job_count,
  (
    select count(*)
    from admin_security_archive_export_jobs
    where status in ('claimed', 'running')
  ) as active_export_job_count,
  (
    select count(*)
    from admin_security_archive_export_jobs
    where status = 'failed'
  ) as failed_export_job_count,
  (
    select count(*)
    from admin_security_archive_export_jobs
    where status = 'abandoned'
  ) as abandoned_export_job_count,
  (
    select count(*)
    from admin_security_archive_export_jobs
    where status = 'completed'
      and completed_at >= now() - interval '24 hours'
  ) as completed_export_job_count_24h,
  now() as checked_at;

grant select on admin_security_archive_export_job_dashboard to admin_api_role;
grant select on admin_security_archive_export_integrity to admin_api_role, worker_role;

alter table admin_security_archive_export_jobs enable row level security;

drop policy if exists admin_security_archive_export_jobs_no_user_direct_access
on admin_security_archive_export_jobs;
create policy admin_security_archive_export_jobs_no_user_direct_access
on admin_security_archive_export_jobs
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_read_admin_security_archive_export_jobs
on admin_security_archive_export_jobs;
create policy admin_api_read_admin_security_archive_export_jobs
on admin_security_archive_export_jobs
for select
to admin_api_role
using (true);

drop policy if exists worker_all_admin_security_archive_export_jobs
on admin_security_archive_export_jobs;
create policy worker_all_admin_security_archive_export_jobs
on admin_security_archive_export_jobs
for all
to worker_role
using (true)
with check (true);

grant execute on function enqueue_admin_security_archive_export_job(uuid, text, text, jsonb)
to admin_api_role, worker_role;
grant execute on function enqueue_pending_admin_security_archive_exports(integer, jsonb)
to worker_role;
grant execute on function claim_admin_security_archive_export_jobs(integer, text, jsonb)
to worker_role;
grant execute on function mark_admin_security_archive_export_running(uuid, jsonb)
to worker_role;
grant execute on function complete_admin_security_archive_export_job(uuid, text, text, bigint, bigint, jsonb)
to worker_role;
grant execute on function fail_admin_security_archive_export_job(uuid, text, integer, jsonb)
to worker_role;
grant execute on function build_admin_security_archive_payload(uuid)
to worker_role, admin_api_role;

alter function enqueue_admin_security_archive_export_job(uuid, text, text, jsonb) security definer;
alter function enqueue_admin_security_archive_export_job(uuid, text, text, jsonb) set search_path = public;

alter function enqueue_pending_admin_security_archive_exports(integer, jsonb) security definer;
alter function enqueue_pending_admin_security_archive_exports(integer, jsonb) set search_path = public;

alter function claim_admin_security_archive_export_jobs(integer, text, jsonb) security definer;
alter function claim_admin_security_archive_export_jobs(integer, text, jsonb) set search_path = public;

alter function mark_admin_security_archive_export_running(uuid, jsonb) security definer;
alter function mark_admin_security_archive_export_running(uuid, jsonb) set search_path = public;

alter function complete_admin_security_archive_export_job(uuid, text, text, bigint, bigint, jsonb) security definer;
alter function complete_admin_security_archive_export_job(uuid, text, text, bigint, bigint, jsonb) set search_path = public;

alter function fail_admin_security_archive_export_job(uuid, text, integer, jsonb) security definer;
alter function fail_admin_security_archive_export_job(uuid, text, integer, jsonb) set search_path = public;

alter function build_admin_security_archive_payload(uuid) security definer;
alter function build_admin_security_archive_payload(uuid) set search_path = public;

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
  'admin_security_archive_exports_enqueue_hourly',
  'Enqueue admin security archive exports',
  'admin',
  true,
  '17 * * * *',
  'enqueue_pending_admin_security_archive_exports',
  '{"batch_size": 100}'::jsonb,
  180,
  300,
  '{"priority":"medium"}'::jsonb
)
on conflict (job_key)
do update set
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
    insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, metadata)
    values (v_job.id, v_job.job_key, v_job.job_group, 'disabled', p_metadata)
    returning id into v_run_id;

    update scheduled_jobs
    set last_status = 'disabled', last_run_id = v_run_id, updated_at = now()
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
    insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, metadata)
    values (v_job.id, v_job.job_key, v_job.job_group, 'skipped_locked', p_metadata)
    returning id into v_run_id;

    update scheduled_jobs
    set last_status = 'skipped_locked', last_run_id = v_run_id, updated_at = now()
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
  elsif v_job.function_name = 'expire_admin_sessions' then
    v_uuid_result := expire_admin_sessions(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_break_glass_requests' then
    v_uuid_result := expire_admin_break_glass_requests(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_admin_incident_review_creation_job' then
    v_uuid_result := run_admin_incident_review_creation_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'mark_overdue_admin_incident_reviews' then
    v_uuid_result := mark_overdue_admin_incident_reviews(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'mark_overdue_admin_incident_corrective_actions' then
    v_uuid_result := mark_overdue_admin_incident_corrective_actions(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'create_admin_security_daily_snapshot' then
    v_uuid_result := create_admin_security_daily_snapshot(
      current_date,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('snapshot_id', v_uuid_result);
  elsif v_job.function_name = 'enqueue_pending_admin_security_archive_exports' then
    v_uuid_result := enqueue_pending_admin_security_archive_exports(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
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
            when v_started_at is not null then (extract(epoch from (now() - v_started_at)) * 1000)::integer
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
    'ADMIN_SECURITY_ARCHIVE_EXPORT_JOB_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Security archive export job not found.',
    'Admin security archive export job not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_ARCHIVE_EXPORT_FAILED',
    'system',
    'high',
    500,
    true,
    false,
    'Security archive export failed.',
    'Admin security archive export failed.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_ARCHIVE_UNSUPPORTED_SOURCE',
    'validation',
    'medium',
    400,
    false,
    true,
    'Unsupported archive source type.',
    'Unsupported admin security archive source type.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
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
  ('archive export job not found', 'ADMIN_SECURITY_ARCHIVE_EXPORT_JOB_NOT_FOUND', 5, '{}'),
  ('archive export job id is required', 'ADMIN_SECURITY_ARCHIVE_EXPORT_JOB_NOT_FOUND', 5, '{}'),
  ('unsupported archive source type', 'ADMIN_SECURITY_ARCHIVE_UNSUPPORTED_SOURCE', 5, '{}'),
  ('unsupported archive storage provider', 'ADMIN_SECURITY_ARCHIVE_EXPORT_FAILED', 5, '{}'),
  ('S3 archive export is not configured', 'ADMIN_SECURITY_ARCHIVE_EXPORT_FAILED', 5, '{}')
on conflict do nothing;
