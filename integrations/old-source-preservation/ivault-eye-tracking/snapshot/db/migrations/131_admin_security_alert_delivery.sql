-- Step 9.13 — External admin security alert delivery skeleton.
-- Runs after 130_admin_audit_hashing.sql.

create table if not exists admin_security_alert_delivery_channels (
  id uuid primary key default gen_random_uuid(),

  channel_key text not null unique,
  channel_type text not null,
  status text not null default 'active',

  display_name text not null,
  target text,
  provider_key text not null default 'manual_demo',
  min_severity text not null default 'high',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_alert_delivery_channels_type_check
  check (
    channel_type in (
      'email',
      'slack',
      'webhook',
      'console'
    )
  ),

  constraint admin_security_alert_delivery_channels_status_check
  check (
    status in (
      'active',
      'paused',
      'archived'
    )
  ),

  constraint admin_security_alert_delivery_channels_severity_check
  check (
    min_severity in (
      'low',
      'medium',
      'high',
      'critical'
    )
  )
);

create index if not exists admin_security_alert_delivery_channels_status_idx
on admin_security_alert_delivery_channels (status, channel_type);

drop trigger if exists admin_security_alert_delivery_channels_set_updated_at
on admin_security_alert_delivery_channels;

create trigger admin_security_alert_delivery_channels_set_updated_at
before update on admin_security_alert_delivery_channels
for each row
execute function set_updated_at();

insert into admin_security_alert_delivery_channels (
  channel_key,
  channel_type,
  status,
  display_name,
  target,
  provider_key,
  min_severity,
  metadata
)
values
  (
    'console_all_admin_security_alerts',
    'console',
    'active',
    'Console Admin Security Alerts',
    null,
    'internal_console',
    'low',
    '{"meaning": "always visible in admin console"}'::jsonb
  ),
  (
    'email_security_critical_stub',
    'email',
    'active',
    'Security Email Critical Stub',
    'security@example.com',
    'manual_demo',
    'critical',
    '{"meaning": "replace target before production"}'::jsonb
  ),
  (
    'slack_security_high_stub',
    'slack',
    'paused',
    'Security Slack High Stub',
    '#security-alerts',
    'manual_demo',
    'high',
    '{"meaning": "paused until Slack integration exists"}'::jsonb
  ),
  (
    'webhook_security_critical_stub',
    'webhook',
    'paused',
    'Security Webhook Critical Stub',
    'https://hooks.yourdomain.com/i/admin-security-alerts',
    'generic_webhook',
    'critical',
    '{"provider_boundary": "typescript_generic_webhook_adapter"}'::jsonb
  )
on conflict (channel_key)
do update set
  status = excluded.status,
  channel_type = excluded.channel_type,
  display_name = excluded.display_name,
  target = excluded.target,
  provider_key = excluded.provider_key,
  min_severity = excluded.min_severity,
  metadata = admin_security_alert_delivery_channels.metadata || excluded.metadata,
  updated_at = now();

create table if not exists admin_security_alert_deliveries (
  id uuid primary key default gen_random_uuid(),

  admin_security_alert_event_id uuid not null references admin_security_alert_events(id),
  delivery_channel_id uuid not null references admin_security_alert_delivery_channels(id),

  channel_key text not null,
  channel_type text not null,
  provider_key text not null,

  target text,
  status text not null default 'queued',

  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz not null default now(),

  locked_by text,
  locked_at timestamptz,
  lock_expires_at timestamptz,

  delivered_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,

  failure_reason text,

  payload jsonb not null default '{}'::jsonb,
  provider_response jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_alert_deliveries_status_check
  check (
    status in (
      'queued',
      'locked',
      'delivered',
      'failed',
      'cancelled'
    )
  ),

  constraint admin_security_alert_deliveries_channel_type_check
  check (
    channel_type in (
      'email',
      'slack',
      'webhook',
      'console'
    )
  ),

  unique (admin_security_alert_event_id, delivery_channel_id)
);

create index if not exists admin_security_alert_deliveries_status_idx
on admin_security_alert_deliveries (status, next_attempt_at asc);

create index if not exists admin_security_alert_deliveries_alert_idx
on admin_security_alert_deliveries (admin_security_alert_event_id, created_at desc);

create index if not exists admin_security_alert_deliveries_channel_idx
on admin_security_alert_deliveries (channel_key, created_at desc);

drop trigger if exists admin_security_alert_deliveries_set_updated_at
on admin_security_alert_deliveries;

create trigger admin_security_alert_deliveries_set_updated_at
before update on admin_security_alert_deliveries
for each row
execute function set_updated_at();

create or replace function severity_rank(
  p_severity text
)
returns integer
language sql
immutable
as $$
  select case p_severity
    when 'low' then 1
    when 'medium' then 2
    when 'high' then 3
    when 'critical' then 4
    else 0
  end;
$$;

create or replace function build_admin_security_alert_delivery_payload(
  p_admin_security_alert_event_id uuid
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_alert admin_security_alert_events%rowtype;
begin
  select *
  into v_alert
  from admin_security_alert_events
  where id = p_admin_security_alert_event_id;

  if v_alert.id is null then
    raise exception 'admin security alert event not found: %', p_admin_security_alert_event_id;
  end if;

  return jsonb_build_object(
    'alertId', v_alert.id,
    'alertKey', v_alert.alert_key,
    'severity', v_alert.severity,
    'status', v_alert.status,
    'message', v_alert.message,
    'actorAuthUserId', v_alert.actor_auth_user_id,
    'targetAuthUserId', v_alert.target_auth_user_id,
    'actionKey', v_alert.action_key,
    'privilegedActionRequestId', v_alert.privileged_action_request_id,
    'createdAt', v_alert.created_at
  );
end;
$$;

create or replace function enqueue_admin_security_alert_deliveries(
  p_admin_security_alert_event_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_alert admin_security_alert_events%rowtype;
  v_channel record;
  v_payload jsonb;
  v_count integer := 0;
  v_inserted integer;
begin
  select *
  into v_alert
  from admin_security_alert_events
  where id = p_admin_security_alert_event_id;

  if v_alert.id is null then
    raise exception 'admin security alert event not found: %', p_admin_security_alert_event_id;
  end if;

  v_payload := build_admin_security_alert_delivery_payload(v_alert.id);

  for v_channel in
    select *
    from admin_security_alert_delivery_channels
    where status = 'active'
      and severity_rank(v_alert.severity) >= severity_rank(min_severity)
  loop
    insert into admin_security_alert_deliveries (
      admin_security_alert_event_id,
      delivery_channel_id,
      channel_key,
      channel_type,
      provider_key,
      target,
      status,
      payload,
      metadata
    )
    values (
      v_alert.id,
      v_channel.id,
      v_channel.channel_key,
      v_channel.channel_type,
      v_channel.provider_key,
      v_channel.target,
      'queued',
      v_payload,
      p_metadata
    )
    on conflict (admin_security_alert_event_id, delivery_channel_id)
    do nothing;

    get diagnostics v_inserted = row_count;
    v_count := v_count + coalesce(v_inserted, 0);
  end loop;

  return v_count;
end;
$$;

create or replace function run_admin_security_alert_delivery_enqueue_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_alert record;
begin
  for v_alert in
    select ase.id
    from admin_security_alert_events ase
    where ase.status in ('open', 'acknowledged')
      and exists (
        select 1
        from admin_security_alert_delivery_channels c
        where c.status = 'active'
          and severity_rank(ase.severity) >= severity_rank(c.min_severity)
          and not exists (
            select 1
            from admin_security_alert_deliveries d
            where d.admin_security_alert_event_id = ase.id
              and d.delivery_channel_id = c.id
          )
      )
    order by ase.created_at asc
    limit p_batch_size
    for update skip locked
  loop
    perform enqueue_admin_security_alert_deliveries(
      v_alert.id,
      p_metadata || jsonb_build_object(
        'enqueue_run_id',
        v_run_id
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function run_admin_security_alert_delivery_job(
  p_batch_size integer default 500,
  p_locked_by text default 'admin_security_alert_delivery_worker',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_delivery record;
  v_should_fail boolean := false;
begin
  for v_delivery in
    select *
    from admin_security_alert_deliveries
    where status in ('queued', 'failed')
      and next_attempt_at <= now()
      and attempt_count < max_attempts
      and (
        lock_expires_at is null
        or lock_expires_at <= now()
      )
    order by next_attempt_at asc, created_at asc
    limit p_batch_size
    for update skip locked
  loop
    update admin_security_alert_deliveries
    set
      status = 'locked',
      locked_by = p_locked_by,
      locked_at = now(),
      lock_expires_at = now() + interval '5 minutes',
      attempt_count = attempt_count + 1,
      metadata = metadata || p_metadata || jsonb_build_object(
        'delivery_run_id',
        v_run_id
      )
    where id = v_delivery.id;

    v_should_fail := v_delivery.provider_key not in (
      'manual_demo',
      'internal_console'
    );

    if v_should_fail then
      update admin_security_alert_deliveries
      set
        status =
          case
            when attempt_count >= max_attempts then 'failed'
            else 'queued'
          end,
        failure_reason = 'unsupported alert delivery provider: ' || v_delivery.provider_key,
        next_attempt_at = now() + interval '15 minutes',
        locked_by = null,
        locked_at = null,
        lock_expires_at = null,
        failed_at =
          case
            when attempt_count >= max_attempts then now()
            else failed_at
          end,
        provider_response = provider_response || jsonb_build_object(
          'simulated',
          true,
          'success',
          false,
          'provider_key',
          v_delivery.provider_key
        ),
        updated_at = now()
      where id = v_delivery.id;
    else
      update admin_security_alert_deliveries
      set
        status = 'delivered',
        delivered_at = now(),
        locked_by = null,
        locked_at = null,
        lock_expires_at = null,
        failure_reason = null,
        provider_response = provider_response || jsonb_build_object(
          'simulated',
          true,
          'success',
          true,
          'provider_key',
          v_delivery.provider_key,
          'channel_type',
          v_delivery.channel_type,
          'delivered_at',
          now()
        ),
        updated_at = now()
      where id = v_delivery.id;
    end if;
  end loop;

  return v_run_id;
end;
$$;

create or replace function create_admin_security_alert(
  p_alert_key text,
  p_severity text,
  p_actor_auth_user_id uuid default null,
  p_target_auth_user_id uuid default null,
  p_action_key text default null,
  p_privileged_action_request_id uuid default null,
  p_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_actor_admin admin_users%rowtype;
  v_target_admin admin_users%rowtype;
  v_alert_id uuid;
begin
  if p_alert_key is null or length(trim(p_alert_key)) = 0 then
    raise exception 'alert key is required';
  end if;

  if p_message is null or length(trim(p_message)) = 0 then
    raise exception 'alert message is required';
  end if;

  if p_actor_auth_user_id is not null then
    v_actor_admin := get_active_admin_user(p_actor_auth_user_id);
  end if;

  if p_target_auth_user_id is not null then
    select *
    into v_target_admin
    from admin_users
    where user_id = p_target_auth_user_id
    order by created_at desc
    limit 1;
  end if;

  insert into admin_security_alert_events (
    alert_key,
    severity,
    actor_auth_user_id,
    actor_admin_user_id,
    target_auth_user_id,
    target_admin_user_id,
    action_key,
    privileged_action_request_id,
    status,
    message,
    metadata
  )
  values (
    p_alert_key,
    coalesce(p_severity, 'high'),
    p_actor_auth_user_id,
    v_actor_admin.id,
    p_target_auth_user_id,
    v_target_admin.id,
    p_action_key,
    p_privileged_action_request_id,
    'open',
    p_message,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_alert_id;

  perform enqueue_admin_security_alert_deliveries(
    v_alert_id,
    p_metadata || jsonb_build_object(
      'source',
      'create_admin_security_alert'
    )
  );

  return v_alert_id;
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
values
  (
    'admin_security_alert_enqueue_every_5_minutes',
    'Enqueue admin security alert deliveries',
    'admin',
    true,
    '*/5 * * * *',
    'run_admin_security_alert_delivery_enqueue_job',
    '{"batch_size": 500}'::jsonb,
    120,
    180,
    '{"priority": "high"}'::jsonb
  ),
  (
    'admin_security_alert_delivery_every_minute',
    'Deliver admin security alerts',
    'admin',
    true,
    '* * * * *',
    'run_admin_security_alert_delivery_job',
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

create or replace view admin_security_alert_delivery_dashboard as
select
  d.id as admin_security_alert_delivery_id,
  d.admin_security_alert_event_id,
  ase.alert_key,
  ase.severity,
  ase.message,
  ase.status as alert_status,
  d.channel_key,
  d.channel_type,
  d.provider_key,
  d.target,
  d.status as delivery_status,
  d.attempt_count,
  d.max_attempts,
  d.next_attempt_at,
  d.delivered_at,
  d.failed_at,
  d.cancelled_at,
  d.failure_reason,
  d.created_at,
  d.updated_at,
  d.provider_response,
  d.metadata
from admin_security_alert_deliveries d
join admin_security_alert_events ase
  on ase.id = d.admin_security_alert_event_id
order by d.created_at desc;

grant select on admin_security_alert_delivery_dashboard to admin_api_role;

create or replace view admin_security_alert_delivery_integrity as
select
  (
    select count(*)
    from admin_security_alert_events ase
    where ase.status = 'open'
      and ase.severity in ('high', 'critical')
      and not exists (
        select 1
        from admin_security_alert_deliveries d
        where d.admin_security_alert_event_id = ase.id
      )
  ) as high_alerts_without_delivery_count,
  (
    select count(*)
    from admin_security_alert_deliveries
    where status in ('queued', 'locked')
      and created_at <= now() - interval '15 minutes'
  ) as stale_delivery_count,
  (
    select count(*)
    from admin_security_alert_deliveries
    where status = 'failed'
  ) as failed_delivery_count,
  (
    select count(*)
    from admin_security_alert_deliveries
    where status = 'delivered'
      and delivered_at >= now() - interval '24 hours'
  ) as delivered_count_24h,
  now() as checked_at;

grant select on admin_security_alert_delivery_integrity to admin_api_role;

alter table system_health_snapshots
add column if not exists admin_alert_high_without_delivery_count bigint not null default 0,
add column if not exists admin_alert_stale_delivery_count bigint not null default 0,
add column if not exists admin_alert_failed_delivery_count bigint not null default 0,
add column if not exists admin_alert_delivered_count_24h bigint not null default 0;

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

  v_admin_alert_high_without_delivery_count bigint := 0;
  v_admin_alert_stale_delivery_count bigint := 0;
  v_admin_alert_failed_delivery_count bigint := 0;
  v_admin_alert_delivered_count_24h bigint := 0;

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
    high_alerts_without_delivery_count,
    stale_delivery_count,
    failed_delivery_count,
    delivered_count_24h
  into
    v_admin_alert_high_without_delivery_count,
    v_admin_alert_stale_delivery_count,
    v_admin_alert_failed_delivery_count,
    v_admin_alert_delivered_count_24h
  from admin_security_alert_delivery_integrity;

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
        or v_admin_alert_high_without_delivery_count > 0
        or v_admin_alert_failed_delivery_count > 0
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
    admin_alert_high_without_delivery_count,
    admin_alert_stale_delivery_count,
    admin_alert_failed_delivery_count,
    admin_alert_delivered_count_24h,
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
    v_admin_alert_high_without_delivery_count,
    v_admin_alert_stale_delivery_count,
    v_admin_alert_failed_delivery_count,
    v_admin_alert_delivered_count_24h,
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
      'admin_alert_high_without_delivery_count', v_admin_alert_high_without_delivery_count,
      'admin_alert_stale_delivery_count', v_admin_alert_stale_delivery_count,
      'admin_alert_failed_delivery_count', v_admin_alert_failed_delivery_count,
      'admin_alert_delivered_count_24h', v_admin_alert_delivered_count_24h
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
  shs.admin_alert_high_without_delivery_count,
  shs.admin_alert_stale_delivery_count,
  shs.admin_alert_failed_delivery_count,
  shs.admin_alert_delivered_count_24h,
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

create or replace function hash_admin_security_alert_delivery(
  p_admin_security_alert_delivery_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_delivery admin_security_alert_deliveries%rowtype;
  v_payload jsonb;
begin
  select *
  into v_delivery
  from admin_security_alert_deliveries
  where id = p_admin_security_alert_delivery_id;

  if v_delivery.id is null then
    raise exception 'admin security alert delivery not found: %', p_admin_security_alert_delivery_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_alert_delivery',
    'source_id', v_delivery.id,
    'admin_security_alert_event_id', v_delivery.admin_security_alert_event_id,
    'delivery_channel_id', v_delivery.delivery_channel_id,
    'channel_key', v_delivery.channel_key,
    'channel_type', v_delivery.channel_type,
    'provider_key', v_delivery.provider_key,
    'target', v_delivery.target,
    'status', v_delivery.status,
    'attempt_count', v_delivery.attempt_count,
    'max_attempts', v_delivery.max_attempts,
    'delivered_at', v_delivery.delivered_at,
    'failed_at', v_delivery.failed_at,
    'cancelled_at', v_delivery.cancelled_at,
    'failure_reason', v_delivery.failure_reason,
    'created_at', v_delivery.created_at,
    'updated_at', v_delivery.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_alert_delivery',
    v_delivery.id,
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

alter table admin_security_alert_delivery_channels enable row level security;
alter table admin_security_alert_deliveries enable row level security;

drop policy if exists admin_security_alert_delivery_channels_no_user_direct_access
on admin_security_alert_delivery_channels;
create policy admin_security_alert_delivery_channels_no_user_direct_access
on admin_security_alert_delivery_channels
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_alert_deliveries_no_user_direct_access
on admin_security_alert_deliveries;
create policy admin_security_alert_deliveries_no_user_direct_access
on admin_security_alert_deliveries
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_read_admin_security_alert_delivery_channels
on admin_security_alert_delivery_channels;
create policy admin_api_read_admin_security_alert_delivery_channels
on admin_security_alert_delivery_channels
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_admin_security_alert_deliveries
on admin_security_alert_deliveries;
create policy admin_api_read_admin_security_alert_deliveries
on admin_security_alert_deliveries
for select
to admin_api_role
using (true);

drop policy if exists worker_all_admin_security_alert_delivery_channels
on admin_security_alert_delivery_channels;
create policy worker_all_admin_security_alert_delivery_channels
on admin_security_alert_delivery_channels
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_alert_deliveries
on admin_security_alert_deliveries;
create policy worker_all_admin_security_alert_deliveries
on admin_security_alert_deliveries
for all
to worker_role
using (true)
with check (true);

grant execute on function severity_rank(text)
to admin_api_role, worker_role;

grant execute on function build_admin_security_alert_delivery_payload(uuid)
to admin_api_role, worker_role;

grant execute on function enqueue_admin_security_alert_deliveries(uuid, jsonb)
to admin_api_role, worker_role;

grant execute on function run_admin_security_alert_delivery_enqueue_job(integer, jsonb)
to worker_role;

grant execute on function run_admin_security_alert_delivery_job(integer, text, jsonb)
to worker_role;

grant execute on function hash_admin_security_alert_delivery(uuid, jsonb)
to worker_role, admin_api_role;

alter function enqueue_admin_security_alert_deliveries(uuid, jsonb) security definer;
alter function enqueue_admin_security_alert_deliveries(uuid, jsonb) set search_path = public;

alter function run_admin_security_alert_delivery_enqueue_job(integer, jsonb) security definer;
alter function run_admin_security_alert_delivery_enqueue_job(integer, jsonb) set search_path = public;

alter function run_admin_security_alert_delivery_job(integer, text, jsonb) security definer;
alter function run_admin_security_alert_delivery_job(integer, text, jsonb) set search_path = public;

alter function hash_admin_security_alert_delivery(uuid, jsonb) security definer;
alter function hash_admin_security_alert_delivery(uuid, jsonb) set search_path = public;

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
    'ADMIN_ALERT_DELIVERY_FAILED',
    'system',
    'high',
    500,
    true,
    false,
    'Security alert delivery failed.',
    'Admin security alert delivery failed.',
    'platform'
  ),
  (
    'ADMIN_ALERT_DELIVERY_INTEGRITY_FAILED',
    'audit',
    'high',
    500,
    true,
    false,
    'Security alert delivery integrity failed.',
    'Admin security alert delivery integrity failed.',
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
  ('admin security alert delivery not found', 'ADMIN_ALERT_DELIVERY_FAILED', 5, '{}'),
  ('unsupported alert delivery provider', 'ADMIN_ALERT_DELIVERY_FAILED', 5, '{}')
on conflict do nothing;
