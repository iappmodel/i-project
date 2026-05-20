-- Step 9.19 — Admin security alert escalation rules.
-- Runs after 133_admin_security_alert_lifecycle.sql.

create table if not exists admin_security_alert_escalation_policies (
  id uuid primary key default gen_random_uuid(),

  policy_key text not null unique,
  status text not null default 'active',

  open_critical_after_seconds integer not null default 900,
  open_high_after_seconds integer not null default 3600,
  acknowledged_after_seconds integer not null default 7200,

  failed_delivery_after_seconds integer not null default 1800,
  privileged_action_expiring_within_seconds integer not null default 3600,

  max_escalations_per_alert integer not null default 5,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_alert_escalation_policies_status_check
  check (status in ('active', 'paused', 'archived')),

  constraint admin_security_alert_escalation_policies_seconds_check
  check (
    open_critical_after_seconds > 0
    and open_high_after_seconds > 0
    and acknowledged_after_seconds > 0
    and failed_delivery_after_seconds > 0
    and privileged_action_expiring_within_seconds > 0
    and max_escalations_per_alert > 0
  )
);

create index if not exists admin_security_alert_escalation_policies_status_idx
on admin_security_alert_escalation_policies (status);

drop trigger if exists admin_security_alert_escalation_policies_set_updated_at
on admin_security_alert_escalation_policies;

create trigger admin_security_alert_escalation_policies_set_updated_at
before update on admin_security_alert_escalation_policies
for each row
execute function set_updated_at();

insert into admin_security_alert_escalation_policies (
  policy_key,
  status,
  open_critical_after_seconds,
  open_high_after_seconds,
  acknowledged_after_seconds,
  failed_delivery_after_seconds,
  privileged_action_expiring_within_seconds,
  max_escalations_per_alert,
  metadata
)
values (
  'default_admin_security_alert_escalation_v1',
  'active',
  900,
  3600,
  7200,
  1800,
  3600,
  5,
  '{"meaning": "default admin security alert escalation policy"}'::jsonb
)
on conflict (policy_key)
do update set
  status = excluded.status,
  open_critical_after_seconds = excluded.open_critical_after_seconds,
  open_high_after_seconds = excluded.open_high_after_seconds,
  acknowledged_after_seconds = excluded.acknowledged_after_seconds,
  failed_delivery_after_seconds = excluded.failed_delivery_after_seconds,
  privileged_action_expiring_within_seconds = excluded.privileged_action_expiring_within_seconds,
  max_escalations_per_alert = excluded.max_escalations_per_alert,
  metadata = admin_security_alert_escalation_policies.metadata || excluded.metadata,
  updated_at = now();

create table if not exists admin_security_alert_escalation_events (
  id uuid primary key default gen_random_uuid(),

  admin_security_alert_event_id uuid references admin_security_alert_events(id),
  admin_security_alert_delivery_id uuid references admin_security_alert_deliveries(id),
  privileged_action_request_id uuid references admin_privileged_action_requests(id),

  escalation_key text not null,
  severity text not null default 'high',

  status text not null default 'created',

  reason_code text not null,
  reason_message text not null,

  escalation_count integer not null default 1,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_alert_escalation_events_severity_check
  check (severity in ('low', 'medium', 'high', 'critical')),

  constraint admin_security_alert_escalation_events_status_check
  check (status in ('created', 'notified', 'suppressed')),

  constraint admin_security_alert_escalation_events_target_check
  check (
    admin_security_alert_event_id is not null
    or admin_security_alert_delivery_id is not null
    or privileged_action_request_id is not null
  )
);

create index if not exists admin_security_alert_escalation_events_alert_idx
on admin_security_alert_escalation_events (admin_security_alert_event_id, created_at desc);

create index if not exists admin_security_alert_escalation_events_delivery_idx
on admin_security_alert_escalation_events (admin_security_alert_delivery_id, created_at desc);

create index if not exists admin_security_alert_escalation_events_privileged_idx
on admin_security_alert_escalation_events (privileged_action_request_id, created_at desc);

create index if not exists admin_security_alert_escalation_events_key_idx
on admin_security_alert_escalation_events (escalation_key, created_at desc);

create or replace function get_active_admin_security_alert_escalation_policy()
returns admin_security_alert_escalation_policies
language plpgsql
stable
as $$
declare
  v_policy admin_security_alert_escalation_policies%rowtype;
begin
  select *
  into v_policy
  from admin_security_alert_escalation_policies
  where status = 'active'
  order by updated_at desc
  limit 1;

  if v_policy.id is null then
    raise exception 'no active admin security alert escalation policy found';
  end if;

  return v_policy;
end;
$$;

create or replace function create_admin_security_alert_escalation_event(
  p_admin_security_alert_event_id uuid default null,
  p_admin_security_alert_delivery_id uuid default null,
  p_privileged_action_request_id uuid default null,
  p_escalation_key text default null,
  p_severity text default 'high',
  p_reason_code text default null,
  p_reason_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event_id uuid;
  v_existing_count integer := 0;
begin
  if p_escalation_key is null or length(trim(p_escalation_key)) = 0 then
    raise exception 'escalation key is required';
  end if;

  if p_reason_code is null or length(trim(p_reason_code)) = 0 then
    raise exception 'reason code is required';
  end if;

  if p_reason_message is null or length(trim(p_reason_message)) = 0 then
    raise exception 'reason message is required';
  end if;

  select count(*)
  into v_existing_count
  from admin_security_alert_escalation_events
  where escalation_key = p_escalation_key
    and coalesce(admin_security_alert_event_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(p_admin_security_alert_event_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and coalesce(admin_security_alert_delivery_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(p_admin_security_alert_delivery_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and coalesce(privileged_action_request_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(p_privileged_action_request_id, '00000000-0000-0000-0000-000000000000'::uuid);

  insert into admin_security_alert_escalation_events (
    admin_security_alert_event_id,
    admin_security_alert_delivery_id,
    privileged_action_request_id,
    escalation_key,
    severity,
    status,
    reason_code,
    reason_message,
    escalation_count,
    metadata
  )
  values (
    p_admin_security_alert_event_id,
    p_admin_security_alert_delivery_id,
    p_privileged_action_request_id,
    p_escalation_key,
    p_severity,
    'created',
    p_reason_code,
    p_reason_message,
    v_existing_count + 1,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function run_admin_security_alert_escalation_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_policy admin_security_alert_escalation_policies%rowtype;
  v_row record;
  v_escalation_id uuid;
  v_escalation_count integer;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  v_policy := get_active_admin_security_alert_escalation_policy();

  for v_row in
    select *
    from admin_security_alert_events ase
    where ase.status = 'open'
      and ase.severity = 'critical'
      and ase.created_at <= now() - make_interval(secs => v_policy.open_critical_after_seconds)
    order by ase.created_at asc
    limit p_batch_size
  loop
    select count(*)
    into v_escalation_count
    from admin_security_alert_escalation_events
    where admin_security_alert_event_id = v_row.id
      and escalation_key = 'open_critical_alert_stale';

    if v_escalation_count < v_policy.max_escalations_per_alert then
      v_escalation_id := create_admin_security_alert_escalation_event(
        v_row.id,
        null,
        null,
        'open_critical_alert_stale',
        'critical',
        'open_critical_alert_stale',
        'Critical admin security alert is still open.',
        p_metadata || jsonb_build_object('run_id', v_run_id)
      );

      perform create_admin_security_alert(
        'escalation_open_critical_alert_stale',
        'critical',
        null,
        v_row.target_auth_user_id,
        v_row.action_key,
        v_row.privileged_action_request_id,
        'Escalation: critical admin security alert is still open.',
        p_metadata || jsonb_build_object(
          'run_id', v_run_id,
          'source_alert_id', v_row.id,
          'escalation_event_id', v_escalation_id
        )
      );
    end if;
  end loop;

  for v_row in
    select *
    from admin_security_alert_events ase
    where ase.status = 'open'
      and ase.severity = 'high'
      and ase.created_at <= now() - make_interval(secs => v_policy.open_high_after_seconds)
    order by ase.created_at asc
    limit p_batch_size
  loop
    select count(*)
    into v_escalation_count
    from admin_security_alert_escalation_events
    where admin_security_alert_event_id = v_row.id
      and escalation_key = 'open_high_alert_stale';

    if v_escalation_count < v_policy.max_escalations_per_alert then
      v_escalation_id := create_admin_security_alert_escalation_event(
        v_row.id,
        null,
        null,
        'open_high_alert_stale',
        'high',
        'open_high_alert_stale',
        'High admin security alert is still open.',
        p_metadata || jsonb_build_object('run_id', v_run_id)
      );

      perform create_admin_security_alert(
        'escalation_open_high_alert_stale',
        'high',
        null,
        v_row.target_auth_user_id,
        v_row.action_key,
        v_row.privileged_action_request_id,
        'Escalation: high admin security alert is still open.',
        p_metadata || jsonb_build_object(
          'run_id', v_run_id,
          'source_alert_id', v_row.id,
          'escalation_event_id', v_escalation_id
        )
      );
    end if;
  end loop;

  for v_row in
    select *
    from admin_security_alert_events ase
    where ase.status = 'acknowledged'
      and ase.acknowledged_at <= now() - make_interval(secs => v_policy.acknowledged_after_seconds)
    order by ase.acknowledged_at asc
    limit p_batch_size
  loop
    select count(*)
    into v_escalation_count
    from admin_security_alert_escalation_events
    where admin_security_alert_event_id = v_row.id
      and escalation_key = 'acknowledged_alert_unresolved';

    if v_escalation_count < v_policy.max_escalations_per_alert then
      v_escalation_id := create_admin_security_alert_escalation_event(
        v_row.id,
        null,
        null,
        'acknowledged_alert_unresolved',
        v_row.severity,
        'acknowledged_alert_unresolved',
        'Acknowledged admin security alert remains unresolved.',
        p_metadata || jsonb_build_object('run_id', v_run_id)
      );

      perform create_admin_security_alert(
        'escalation_acknowledged_alert_unresolved',
        v_row.severity,
        null,
        v_row.target_auth_user_id,
        v_row.action_key,
        v_row.privileged_action_request_id,
        'Escalation: acknowledged admin security alert remains unresolved.',
        p_metadata || jsonb_build_object(
          'run_id', v_run_id,
          'source_alert_id', v_row.id,
          'escalation_event_id', v_escalation_id
        )
      );
    end if;
  end loop;

  for v_row in
    select d.*, ase.target_auth_user_id, ase.action_key, ase.privileged_action_request_id
    from admin_security_alert_deliveries d
    join admin_security_alert_events ase
      on ase.id = d.admin_security_alert_event_id
    where d.status = 'failed'
      and d.failed_at <= now() - make_interval(secs => v_policy.failed_delivery_after_seconds)
    order by d.failed_at asc
    limit p_batch_size
  loop
    select count(*)
    into v_escalation_count
    from admin_security_alert_escalation_events
    where admin_security_alert_delivery_id = v_row.id
      and escalation_key = 'admin_alert_delivery_failed';

    if v_escalation_count < v_policy.max_escalations_per_alert then
      v_escalation_id := create_admin_security_alert_escalation_event(
        null,
        v_row.id,
        null,
        'admin_alert_delivery_failed',
        'high',
        'admin_alert_delivery_failed',
        'Admin security alert delivery failed.',
        p_metadata || jsonb_build_object('run_id', v_run_id)
      );

      perform create_admin_security_alert(
        'escalation_admin_alert_delivery_failed',
        'high',
        null,
        v_row.target_auth_user_id,
        v_row.action_key,
        v_row.privileged_action_request_id,
        'Escalation: admin security alert delivery failed.',
        p_metadata || jsonb_build_object(
          'run_id', v_run_id,
          'source_delivery_id', v_row.id,
          'escalation_event_id', v_escalation_id
        )
      );
    end if;
  end loop;

  for v_row in
    select *
    from admin_privileged_action_requests par
    where par.status = 'pending'
      and par.expires_at > now()
      and par.expires_at <= now() + make_interval(secs => v_policy.privileged_action_expiring_within_seconds)
    order by par.expires_at asc
    limit p_batch_size
  loop
    select count(*)
    into v_escalation_count
    from admin_security_alert_escalation_events
    where privileged_action_request_id = v_row.id
      and escalation_key = 'privileged_action_expiring_soon';

    if v_escalation_count < v_policy.max_escalations_per_alert then
      v_escalation_id := create_admin_security_alert_escalation_event(
        null,
        null,
        v_row.id,
        'privileged_action_expiring_soon',
        'high',
        'privileged_action_expiring_soon',
        'Privileged admin action request is close to expiration.',
        p_metadata || jsonb_build_object('run_id', v_run_id)
      );

      perform create_admin_security_alert(
        'escalation_privileged_action_expiring_soon',
        'high',
        null,
        v_row.target_auth_user_id,
        v_row.action_key,
        v_row.id,
        'Escalation: privileged admin action request is close to expiration.',
        p_metadata || jsonb_build_object(
          'run_id', v_run_id,
          'privileged_action_request_id', v_row.id,
          'escalation_event_id', v_escalation_id
        )
      );
    end if;
  end loop;

  return v_run_id;
end;
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
values (
  'admin_security_alert_escalation_every_5_minutes',
  'Escalate stale admin security alerts',
  'admin',
  true,
  '*/5 * * * *',
  'run_admin_security_alert_escalation_job',
  '{"batch_size": 500}'::jsonb,
  180,
  300,
  '{"priority": "critical"}'::jsonb
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

  elsif v_job.function_name = 'run_payout_provider_event_processing_job' then
    v_uuid_result := run_payout_provider_event_processing_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'expire_admin_privileged_action_requests' then
    v_uuid_result := expire_admin_privileged_action_requests(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_admin_security_alert_delivery_enqueue_job' then
    v_uuid_result := run_admin_security_alert_delivery_enqueue_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_admin_security_alert_delivery_job' then
    v_uuid_result := run_admin_security_alert_delivery_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_locked_by,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_admin_security_alert_escalation_job' then
    v_uuid_result := run_admin_security_alert_escalation_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
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

create or replace view admin_security_alert_escalation_dashboard as
select
  e.id as admin_security_alert_escalation_event_id,

  e.admin_security_alert_event_id,
  ase.alert_key as source_alert_key,
  ase.status as source_alert_status,

  e.admin_security_alert_delivery_id,
  d.channel_key,
  d.channel_type,
  d.status as delivery_status,

  e.privileged_action_request_id,
  par.action_key as privileged_action_key,
  par.status as privileged_action_status,

  e.escalation_key,
  e.severity,
  e.status,
  e.reason_code,
  e.reason_message,
  e.escalation_count,

  e.created_at,
  e.metadata
from admin_security_alert_escalation_events e
left join admin_security_alert_events ase
  on ase.id = e.admin_security_alert_event_id
left join admin_security_alert_deliveries d
  on d.id = e.admin_security_alert_delivery_id
left join admin_privileged_action_requests par
  on par.id = e.privileged_action_request_id
order by e.created_at desc;

grant select on admin_security_alert_escalation_dashboard to admin_api_role;

create or replace view admin_security_alert_escalation_integrity as
select
  (
    select count(*)
    from admin_security_alert_events
    where status = 'open'
      and severity = 'critical'
      and created_at <= now() - interval '15 minutes'
  ) as stale_open_critical_count,

  (
    select count(*)
    from admin_security_alert_events
    where status = 'open'
      and severity = 'high'
      and created_at <= now() - interval '1 hour'
  ) as stale_open_high_count,

  (
    select count(*)
    from admin_security_alert_events
    where status = 'acknowledged'
      and acknowledged_at <= now() - interval '2 hours'
  ) as stale_acknowledged_count,

  (
    select count(*)
    from admin_security_alert_deliveries
    where status = 'failed'
  ) as failed_delivery_count,

  (
    select count(*)
    from admin_privileged_action_requests
    where status = 'pending'
      and expires_at > now()
      and expires_at <= now() + interval '1 hour'
  ) as privileged_actions_expiring_soon_count,

  (
    select count(*)
    from admin_security_alert_escalation_events
    where created_at >= now() - interval '24 hours'
  ) as escalation_count_24h,

  now() as checked_at;

grant select on admin_security_alert_escalation_integrity to admin_api_role;

create or replace function hash_admin_security_alert_escalation_event(
  p_admin_security_alert_escalation_event_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event admin_security_alert_escalation_events%rowtype;
  v_payload jsonb;
begin
  select *
  into v_event
  from admin_security_alert_escalation_events
  where id = p_admin_security_alert_escalation_event_id;

  if v_event.id is null then
    raise exception 'admin security alert escalation event not found: %', p_admin_security_alert_escalation_event_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_alert_escalation_event',
    'source_id', v_event.id,
    'admin_security_alert_event_id', v_event.admin_security_alert_event_id,
    'admin_security_alert_delivery_id', v_event.admin_security_alert_delivery_id,
    'privileged_action_request_id', v_event.privileged_action_request_id,
    'escalation_key', v_event.escalation_key,
    'severity', v_event.severity,
    'status', v_event.status,
    'reason_code', v_event.reason_code,
    'reason_message', v_event.reason_message,
    'escalation_count', v_event.escalation_count,
    'created_at', v_event.created_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_alert_escalation_event',
    v_event.id,
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
where asae.status in ('resolved', 'dismissed')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_alert_event'
      and ahc.source_id = asae.id
  )

union all

select
  'admin_security_alert_delivery'::text as source_type,
  d.id as source_id,
  d.created_at
from admin_security_alert_deliveries d
where d.status in ('delivered', 'failed', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_alert_delivery'
      and ahc.source_id = d.id
  )

union all

select
  'admin_security_alert_escalation_event'::text as source_type,
  e.id as source_id,
  e.created_at
from admin_security_alert_escalation_events e
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'admin_security_alert_escalation_event'
    and ahc.source_id = e.id
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

      elsif v_row.source_type = 'admin_security_alert_delivery' then
        perform hash_admin_security_alert_delivery(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'admin_security_alert_escalation_event' then
        perform hash_admin_security_alert_escalation_event(
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

alter table system_health_snapshots
add column if not exists stale_open_critical_alert_count bigint not null default 0,
add column if not exists stale_open_high_alert_count bigint not null default 0,
add column if not exists stale_acknowledged_alert_count bigint not null default 0,
add column if not exists privileged_actions_expiring_soon_count bigint not null default 0,
add column if not exists admin_security_escalation_count_24h bigint not null default 0;

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

  v_stale_open_critical_alert_count bigint := 0;
  v_stale_open_high_alert_count bigint := 0;
  v_stale_acknowledged_alert_count bigint := 0;
  v_privileged_actions_expiring_soon_count bigint := 0;
  v_admin_security_escalation_count_24h bigint := 0;

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

  select
    stale_open_critical_count,
    stale_open_high_count,
    stale_acknowledged_count,
    privileged_actions_expiring_soon_count,
    escalation_count_24h
  into
    v_stale_open_critical_alert_count,
    v_stale_open_high_alert_count,
    v_stale_acknowledged_alert_count,
    v_privileged_actions_expiring_soon_count,
    v_admin_security_escalation_count_24h
  from admin_security_alert_escalation_integrity;

  v_status :=
    case
      when v_unbalanced_journals > 0
        or v_wallet_accounting_delta <> 0
        or v_audit_broken_24h > 0
        or v_critical_errors_1h > 0
        or v_withdrawal_integrity_issues > 0
        or v_stale_open_critical_alert_count > 0
      then 'critical'

      when v_missing_admin_action_hash_count > 0
        or v_missing_privileged_action_hash_count > 0
        or v_missing_admin_security_alert_hash_count > 0
      then 'warning'

      when v_stale_open_high_alert_count > 0
        or v_stale_acknowledged_alert_count > 0
        or v_privileged_actions_expiring_soon_count > 0
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
    stale_open_critical_alert_count,
    stale_open_high_alert_count,
    stale_acknowledged_alert_count,
    privileged_actions_expiring_soon_count,
    admin_security_escalation_count_24h,
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
    v_stale_open_critical_alert_count,
    v_stale_open_high_alert_count,
    v_stale_acknowledged_alert_count,
    v_privileged_actions_expiring_soon_count,
    v_admin_security_escalation_count_24h,
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
      'pending_privileged_action_count', v_pending_privileged_action_count,
      'stale_open_critical_alert_count', v_stale_open_critical_alert_count,
      'stale_open_high_alert_count', v_stale_open_high_alert_count,
      'stale_acknowledged_alert_count', v_stale_acknowledged_alert_count,
      'privileged_actions_expiring_soon_count', v_privileged_actions_expiring_soon_count,
      'admin_security_escalation_count_24h', v_admin_security_escalation_count_24h
    ),
    p_metadata
  );

  return v_snapshot_id;
end;
$$;

create or replace view admin_system_command_center as
select
  pod.latest_snapshot_id,
  pod.system_status,
  pod.snapshot_at,
  pod.wallet_count,
  pod.active_wallet_count,
  pod.total_available_balance_minor,
  pod.total_pending_balance_minor,
  pod.total_locked_balance_minor,
  pod.total_wallet_balance_minor,
  pod.reward_pending_count,
  pod.reward_completed_count_24h,
  pod.reward_failed_count_24h,
  pod.attention_event_count_1h,
  pod.attention_passed_count_1h,
  pod.attention_fraud_suspected_count_1h,
  pod.unbalanced_journal_count,
  pod.missing_reward_mirror_count,
  pod.wallet_accounting_delta_minor,
  pod.audit_missing_hash_record_count,
  pod.audit_broken_verification_count_24h,
  pod.failed_scheduled_job_count_24h,
  pod.critical_error_count_1h,
  pod.high_error_count_1h,
  shs.missing_admin_action_hash_count,
  shs.missing_privileged_action_hash_count,
  shs.missing_admin_security_alert_hash_count,
  shs.open_admin_security_alert_count,
  shs.critical_admin_security_alert_count,
  shs.pending_privileged_action_count,
  shs.stale_open_critical_alert_count,
  shs.stale_open_high_alert_count,
  shs.stale_acknowledged_alert_count,
  shs.privileged_actions_expiring_soon_count,
  shs.admin_security_escalation_count_24h,
  pod.metrics,
  pod.job_alerts,
  pod.error_summary,
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
from platform_operations_dashboard pod
join system_health_snapshots shs
  on shs.id = pod.latest_snapshot_id;

create or replace function dismiss_admin_security_alert(
  p_admin_auth_user_id uuid,
  p_admin_security_alert_event_id uuid,
  p_dismissal_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_alert admin_security_alert_events%rowtype;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_admin_security_alert_event_id is null then
    raise exception 'admin security alert event id is required';
  end if;

  if p_dismissal_reason is null or length(trim(p_dismissal_reason)) = 0 then
    raise exception 'dismissal reason is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'dismiss_admin_security_alert',
      'admin.write',
      'admin_security_alert_event',
      p_admin_security_alert_event_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_alert
  from admin_security_alert_events
  where id = p_admin_security_alert_event_id
  for update;

  if v_alert.id is null then
    raise exception 'admin security alert event not found: %', p_admin_security_alert_event_id;
  end if;

  if v_alert.alert_key like 'escalation_%' then
    raise exception 'escalation alerts cannot be dismissed; resolve with a resolution note';
  end if;

  if v_alert.status not in ('open', 'acknowledged') then
    raise exception 'admin security alert cannot be dismissed from status: %', v_alert.status;
  end if;

  update admin_security_alert_events
  set
    status = 'dismissed',
    resolved_by_auth_user_id = p_admin_auth_user_id,
    resolved_at = now(),
    resolution_note = p_dismissal_reason,
    metadata = metadata || p_metadata || jsonb_build_object(
      'dismissal_reason',
      p_dismissal_reason,
      'request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_alert.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'dismiss_admin_security_alert',
    'admin.write',
    'admin_security_alert_event',
    v_alert.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_dismissal_reason,
    p_metadata || jsonb_build_object(
      'alert_key',
      v_alert.alert_key,
      'severity',
      v_alert.severity
    )
  );

  return v_alert.id;
end;
$$;

alter table admin_security_alert_escalation_policies enable row level security;
alter table admin_security_alert_escalation_events enable row level security;

create policy admin_security_alert_escalation_policies_no_user_direct_access
on admin_security_alert_escalation_policies
for all
to authenticated
using (false)
with check (false);

create policy admin_security_alert_escalation_events_no_user_direct_access
on admin_security_alert_escalation_events
for all
to authenticated
using (false)
with check (false);

create policy admin_api_read_admin_security_alert_escalation_policies
on admin_security_alert_escalation_policies
for select
to admin_api_role
using (true);

create policy admin_api_read_admin_security_alert_escalation_events
on admin_security_alert_escalation_events
for select
to admin_api_role
using (true);

create policy worker_all_admin_security_alert_escalation_events
on admin_security_alert_escalation_events
for all
to worker_role
using (true)
with check (true);

grant execute on function get_active_admin_security_alert_escalation_policy()
to worker_role, admin_api_role;

grant execute on function create_admin_security_alert_escalation_event(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) to worker_role, admin_api_role;

grant execute on function run_admin_security_alert_escalation_job(integer, jsonb)
to worker_role;

grant execute on function hash_admin_security_alert_escalation_event(uuid, jsonb)
to worker_role, admin_api_role;

alter function get_active_admin_security_alert_escalation_policy() security definer;
alter function get_active_admin_security_alert_escalation_policy() set search_path = public;

alter function create_admin_security_alert_escalation_event(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) security definer;

alter function create_admin_security_alert_escalation_event(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function run_admin_security_alert_escalation_job(integer, jsonb) security definer;
alter function run_admin_security_alert_escalation_job(integer, jsonb) set search_path = public;

alter function hash_admin_security_alert_escalation_event(uuid, jsonb) security definer;
alter function hash_admin_security_alert_escalation_event(uuid, jsonb) set search_path = public;

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
    'ADMIN_SECURITY_ESCALATION_POLICY_MISSING',
    'system',
    'critical',
    500,
    false,
    false,
    'Security escalation policy is unavailable.',
    'No active admin security alert escalation policy found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_ESCALATION_FAILED',
    'system',
    'high',
    500,
    true,
    false,
    'Security alert escalation failed.',
    'Admin security alert escalation job failed.',
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
  ('no active admin security alert escalation policy found', 'ADMIN_SECURITY_ESCALATION_POLICY_MISSING', 5, '{}'),
  ('escalation key is required', 'ADMIN_SECURITY_ESCALATION_FAILED', 5, '{}'),
  ('admin security alert escalation event not found', 'ADMIN_SECURITY_ESCALATION_FAILED', 5, '{}')
on conflict do nothing;
