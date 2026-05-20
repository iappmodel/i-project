-- Step 9.14 — Provider adapter boundary for admin alert delivery.
-- SQL owns durable state; API worker owns external delivery.

create or replace function claim_admin_security_alert_deliveries(
  p_batch_size integer default 100,
  p_locked_by text default 'api_alert_delivery_worker',
  p_lock_ttl_seconds integer default 300,
  p_metadata jsonb default '{}'::jsonb
)
returns setof admin_security_alert_deliveries
language plpgsql
as $$
begin
  if p_batch_size <= 0 or p_batch_size > 500 then
    raise exception 'batch size must be between 1 and 500';
  end if;

  if p_locked_by is null or length(trim(p_locked_by)) = 0 then
    raise exception 'locked_by is required';
  end if;

  return query
  with candidates as (
    select id
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
  )
  update admin_security_alert_deliveries d
  set
    status = 'locked',
    locked_by = p_locked_by,
    locked_at = now(),
    lock_expires_at = now() + make_interval(secs => p_lock_ttl_seconds),
    attempt_count = d.attempt_count + 1,
    metadata = d.metadata || p_metadata,
    updated_at = now()
  from candidates c
  where d.id = c.id
  returning d.*;
end;
$$;

create or replace function mark_admin_security_alert_delivery_delivered(
  p_delivery_id uuid,
  p_provider_response jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_delivery admin_security_alert_deliveries%rowtype;
begin
  if p_delivery_id is null then
    raise exception 'delivery id is required';
  end if;

  select *
  into v_delivery
  from admin_security_alert_deliveries
  where id = p_delivery_id
  for update;

  if v_delivery.id is null then
    raise exception 'admin security alert delivery not found: %', p_delivery_id;
  end if;

  if v_delivery.status = 'delivered' then
    return v_delivery.id;
  end if;

  update admin_security_alert_deliveries
  set
    status = 'delivered',
    delivered_at = now(),
    failed_at = null,
    failure_reason = null,
    locked_by = null,
    locked_at = null,
    lock_expires_at = null,
    provider_response = provider_response || coalesce(p_provider_response, '{}'::jsonb),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_delivery.id;

  return v_delivery.id;
end;
$$;

create or replace function mark_admin_security_alert_delivery_failed(
  p_delivery_id uuid,
  p_failure_reason text,
  p_provider_response jsonb default '{}'::jsonb,
  p_retry_delay_seconds integer default 900,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_delivery admin_security_alert_deliveries%rowtype;
  v_final_failed boolean;
begin
  if p_delivery_id is null then
    raise exception 'delivery id is required';
  end if;

  if p_failure_reason is null or length(trim(p_failure_reason)) = 0 then
    raise exception 'failure reason is required';
  end if;

  select *
  into v_delivery
  from admin_security_alert_deliveries
  where id = p_delivery_id
  for update;

  if v_delivery.id is null then
    raise exception 'admin security alert delivery not found: %', p_delivery_id;
  end if;

  v_final_failed := v_delivery.attempt_count >= v_delivery.max_attempts;

  update admin_security_alert_deliveries
  set
    status = case when v_final_failed then 'failed' else 'queued' end,
    failed_at = case when v_final_failed then now() else failed_at end,
    failure_reason = p_failure_reason,
    next_attempt_at = now() + make_interval(secs => greatest(p_retry_delay_seconds, 60)),
    locked_by = null,
    locked_at = null,
    lock_expires_at = null,
    provider_response = provider_response || coalesce(p_provider_response, '{}'::jsonb),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_delivery.id;

  return v_delivery.id;
end;
$$;

grant execute on function claim_admin_security_alert_deliveries(
  integer,
  text,
  integer,
  jsonb
) to worker_role;

grant execute on function mark_admin_security_alert_delivery_delivered(
  uuid,
  jsonb,
  jsonb
) to worker_role;

grant execute on function mark_admin_security_alert_delivery_failed(
  uuid,
  text,
  jsonb,
  integer,
  jsonb
) to worker_role;

alter function claim_admin_security_alert_deliveries(integer, text, integer, jsonb) security definer;
alter function claim_admin_security_alert_deliveries(integer, text, integer, jsonb) set search_path = public;

alter function mark_admin_security_alert_delivery_delivered(uuid, jsonb, jsonb) security definer;
alter function mark_admin_security_alert_delivery_delivered(uuid, jsonb, jsonb) set search_path = public;

alter function mark_admin_security_alert_delivery_failed(uuid, text, jsonb, integer, jsonb) security definer;
alter function mark_admin_security_alert_delivery_failed(uuid, text, jsonb, integer, jsonb) set search_path = public;

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
  'admin_security_alert_provider_delivery_every_minute',
  'Deliver admin security alerts through provider adapters',
  'admin',
  true,
  '* * * * *',
  'api_worker:admin_security_alert_provider_delivery',
  '{"batch_size": 100}'::jsonb,
  180,
  300,
  '{"priority": "critical", "runtime": "api"}'::jsonb
)
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_name = excluded.function_name,
  function_args = excluded.function_args,
  metadata = scheduled_jobs.metadata || excluded.metadata,
  updated_at = now();
