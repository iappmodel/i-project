-- Step 9.33 — Build external security notification channels for critical admin events.
-- Runs after 147_admin_security_command_center.sql.

create table if not exists admin_security_notification_channels (
  id uuid primary key default gen_random_uuid(),

  channel_key text not null unique,
  channel_type text not null,

  status text not null default 'active',

  display_name text not null,

  destination text not null,
  secret_ref text,

  min_severity text not null default 'critical',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_notification_channels_type_check
  check (
    channel_type in (
      'slack',
      'email',
      'webhook',
      'siem_stub'
    )
  ),

  constraint admin_security_notification_channels_status_check
  check (
    status in (
      'active',
      'paused',
      'archived'
    )
  ),

  constraint admin_security_notification_channels_severity_check
  check (
    min_severity in (
      'medium',
      'high',
      'critical'
    )
  )
);

create index if not exists admin_security_notification_channels_status_idx
on admin_security_notification_channels (status, channel_type);

drop trigger if exists admin_security_notification_channels_set_updated_at
on admin_security_notification_channels;

create trigger admin_security_notification_channels_set_updated_at
before update on admin_security_notification_channels
for each row
execute function set_updated_at();

insert into admin_security_notification_channels (
  channel_key,
  channel_type,
  status,
  display_name,
  destination,
  secret_ref,
  min_severity,
  metadata
)
values
  (
    'security_slack_primary',
    'slack',
    'paused',
    'Primary Security Slack',
    'slack://security-alerts',
    'ADMIN_SECURITY_SLACK_WEBHOOK_URL',
    'critical',
    '{"meaning": "primary Slack channel for critical admin security events"}'::jsonb
  ),
  (
    'security_email_primary',
    'email',
    'paused',
    'Primary Security Email',
    'security@example.com',
    'ADMIN_SECURITY_EMAIL_PROVIDER',
    'critical',
    '{"meaning": "primary email route for critical admin security events"}'::jsonb
  ),
  (
    'security_webhook_primary',
    'webhook',
    'paused',
    'Primary Security Webhook',
    'https://example.com/security-webhook',
    'ADMIN_SECURITY_WEBHOOK_SECRET',
    'critical',
    '{"meaning": "generic webhook route for security automation"}'::jsonb
  )
on conflict (channel_key)
do nothing;

create table if not exists admin_security_notification_rules (
  id uuid primary key default gen_random_uuid(),

  rule_key text not null unique,

  status text not null default 'active',

  channel_id uuid not null references admin_security_notification_channels(id) on delete cascade,

  source_type text not null,
  event_key_pattern text,

  min_severity text not null default 'critical',

  include_alerts boolean not null default true,
  include_incidents boolean not null default true,
  include_break_glass boolean not null default true,
  include_corrective_actions boolean not null default true,
  include_sessions boolean not null default true,
  include_devices boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_notification_rules_status_check
  check (
    status in (
      'active',
      'paused',
      'archived'
    )
  ),

  constraint admin_security_notification_rules_source_type_check
  check (
    source_type in (
      'any',
      'admin_security_alert_event',
      'admin_incident_review',
      'admin_incident_corrective_action',
      'admin_break_glass_request',
      'admin_session_control',
      'admin_device'
    )
  ),

  constraint admin_security_notification_rules_severity_check
  check (
    min_severity in (
      'medium',
      'high',
      'critical'
    )
  )
);

create index if not exists admin_security_notification_rules_status_idx
on admin_security_notification_rules (status, source_type);

drop trigger if exists admin_security_notification_rules_set_updated_at
on admin_security_notification_rules;

create trigger admin_security_notification_rules_set_updated_at
before update on admin_security_notification_rules
for each row
execute function set_updated_at();

insert into admin_security_notification_rules (
  rule_key,
  status,
  channel_id,
  source_type,
  event_key_pattern,
  min_severity,
  metadata
)
select
  c.channel_key || '_critical_rule',
  'active',
  c.id,
  'any',
  null,
  'critical',
  '{"meaning": "send all critical admin security events to this channel"}'::jsonb
from admin_security_notification_channels c
where c.channel_key in (
  'security_slack_primary',
  'security_email_primary',
  'security_webhook_primary'
)
on conflict (rule_key)
do nothing;

create table if not exists admin_security_notification_deliveries (
  id uuid primary key default gen_random_uuid(),

  rule_id uuid references admin_security_notification_rules(id),
  channel_id uuid references admin_security_notification_channels(id),

  source_type text not null,
  source_id uuid not null,

  event_key text not null,
  severity text not null,

  status text not null default 'pending',

  attempt_count integer not null default 0,
  max_attempts integer not null default 5,

  next_attempt_at timestamptz not null default now(),

  sent_at timestamptz,
  failed_at timestamptz,

  last_error text,

  destination_snapshot text,
  payload jsonb not null,

  provider_response jsonb not null default '{}'::jsonb,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_notification_deliveries_status_check
  check (
    status in (
      'pending',
      'sending',
      'sent',
      'failed',
      'abandoned',
      'skipped'
    )
  ),

  constraint admin_security_notification_deliveries_severity_check
  check (
    severity in (
      'medium',
      'high',
      'critical'
    )
  ),

  unique (channel_id, source_type, source_id, event_key)
);

create index if not exists admin_security_notification_deliveries_status_idx
on admin_security_notification_deliveries (status, next_attempt_at asc);

create index if not exists admin_security_notification_deliveries_source_idx
on admin_security_notification_deliveries (source_type, source_id);

create index if not exists admin_security_notification_deliveries_channel_idx
on admin_security_notification_deliveries (channel_id, created_at desc);

drop trigger if exists admin_security_notification_deliveries_set_updated_at
on admin_security_notification_deliveries;

create trigger admin_security_notification_deliveries_set_updated_at
before update on admin_security_notification_deliveries
for each row
execute function set_updated_at();

create or replace function admin_security_severity_rank(
  p_severity text
)
returns integer
language plpgsql
immutable
as $$
begin
  return case p_severity
    when 'medium' then 1
    when 'high' then 2
    when 'critical' then 3
    else 0
  end;
end;
$$;

create or replace function enqueue_admin_security_notification(
  p_source_type text,
  p_source_id uuid,
  p_event_key text,
  p_severity text,
  p_payload jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
  v_rule record;
begin
  if p_source_type is null or length(trim(p_source_type)) = 0 then
    raise exception 'notification source type is required';
  end if;

  if p_source_id is null then
    raise exception 'notification source id is required';
  end if;

  if p_event_key is null or length(trim(p_event_key)) = 0 then
    raise exception 'notification event key is required';
  end if;

  if p_severity not in ('medium', 'high', 'critical') then
    raise exception 'invalid notification severity: %', p_severity;
  end if;

  for v_rule in
    select
      r.id as rule_id,
      r.source_type,
      r.event_key_pattern,
      r.min_severity,
      c.id as channel_id,
      c.channel_key,
      c.channel_type,
      c.status as channel_status,
      c.destination,
      c.min_severity as channel_min_severity
    from admin_security_notification_rules r
    join admin_security_notification_channels c
      on c.id = r.channel_id
    where r.status = 'active'
      and c.status = 'active'
      and (r.source_type = 'any' or r.source_type = p_source_type)
      and (
        r.event_key_pattern is null
        or p_event_key like r.event_key_pattern
      )
      and admin_security_severity_rank(p_severity) >= admin_security_severity_rank(r.min_severity)
      and admin_security_severity_rank(p_severity) >= admin_security_severity_rank(c.min_severity)
  loop
    insert into admin_security_notification_deliveries (
      rule_id,
      channel_id,
      source_type,
      source_id,
      event_key,
      severity,
      status,
      next_attempt_at,
      destination_snapshot,
      payload,
      metadata
    )
    values (
      v_rule.rule_id,
      v_rule.channel_id,
      p_source_type,
      p_source_id,
      p_event_key,
      p_severity,
      'pending',
      now(),
      v_rule.destination,
      p_payload || jsonb_build_object(
        'channel_type',
        v_rule.channel_type,
        'channel_key',
        v_rule.channel_key
      ),
      coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (channel_id, source_type, source_id, event_key)
    do nothing;

    if found then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

create or replace function enqueue_notifications_from_security_alerts(
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
    select *
    from admin_security_alert_events ase
    where ase.severity in ('high', 'critical')
      and not exists (
        select 1
        from admin_security_notification_deliveries d
        where d.source_type = 'admin_security_alert_event'
          and d.source_id = ase.id
      )
    order by ase.created_at asc
    limit p_batch_size
  loop
    perform enqueue_admin_security_notification(
      'admin_security_alert_event',
      v_alert.id,
      v_alert.alert_key,
      v_alert.severity,
      jsonb_build_object(
        'type', 'admin_security_alert',
        'alert_id', v_alert.id,
        'alert_key', v_alert.alert_key,
        'severity', v_alert.severity,
        'message', v_alert.message,
        'actor_auth_user_id', v_alert.actor_auth_user_id,
        'target_auth_user_id', v_alert.target_auth_user_id,
        'action_key', v_alert.action_key,
        'created_at', v_alert.created_at
      ),
      p_metadata || jsonb_build_object(
        'run_id',
        v_run_id
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function enqueue_notifications_from_break_glass(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_request record;
begin
  for v_request in
    select *
    from admin_break_glass_requests bgr
    where bgr.status in ('pending', 'approved', 'executed', 'revoked', 'expired')
      and not exists (
        select 1
        from admin_security_notification_deliveries d
        where d.source_type = 'admin_break_glass_request'
          and d.source_id = bgr.id
      )
    order by bgr.created_at asc
    limit p_batch_size
  loop
    perform enqueue_admin_security_notification(
      'admin_break_glass_request',
      v_request.id,
      'admin_break_glass_' || v_request.status,
      'critical',
      jsonb_build_object(
        'type', 'admin_break_glass',
        'break_glass_request_id', v_request.id,
        'status', v_request.status,
        'reason', v_request.reason,
        'requested_by_auth_user_id', v_request.requested_by_auth_user_id,
        'target_auth_user_id', v_request.target_auth_user_id,
        'expires_at', v_request.expires_at,
        'created_at', v_request.created_at
      ),
      p_metadata || jsonb_build_object(
        'run_id',
        v_run_id
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function run_admin_security_notification_enqueue_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_alert_run_id uuid;
  v_break_glass_run_id uuid;
begin
  v_alert_run_id := enqueue_notifications_from_security_alerts(
    p_batch_size,
    p_metadata || jsonb_build_object(
      'notification_enqueue_run_id',
      v_run_id,
      'source',
      'security_alerts'
    )
  );

  v_break_glass_run_id := enqueue_notifications_from_break_glass(
    p_batch_size,
    p_metadata || jsonb_build_object(
      'notification_enqueue_run_id',
      v_run_id,
      'source',
      'break_glass'
    )
  );

  return v_run_id;
end;
$$;

create or replace function claim_admin_security_notification_deliveries(
  p_batch_size integer default 50,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  delivery_id uuid,
  channel_id uuid,
  channel_key text,
  channel_type text,
  destination text,
  secret_ref text,
  event_key text,
  severity text,
  payload jsonb,
  attempt_count integer
)
language plpgsql
as $$
begin
  if p_batch_size <= 0 or p_batch_size > 250 then
    raise exception 'batch size must be between 1 and 250';
  end if;

  return query
  with claimed as (
    select d.id
    from admin_security_notification_deliveries d
    where d.status in ('pending', 'failed')
      and d.next_attempt_at <= now()
      and d.attempt_count < d.max_attempts
    order by d.next_attempt_at asc, d.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated as (
    update admin_security_notification_deliveries d
    set
      status = 'sending',
      attempt_count = d.attempt_count + 1,
      metadata = d.metadata || p_metadata || jsonb_build_object(
        'claimed_by_worker_id',
        p_worker_id,
        'claimed_at',
        now()
      ),
      updated_at = now()
    from claimed
    where d.id = claimed.id
    returning d.*
  )
  select
    u.id as delivery_id,
    c.id as channel_id,
    c.channel_key,
    c.channel_type,
    c.destination,
    c.secret_ref,
    u.event_key,
    u.severity,
    u.payload,
    u.attempt_count
  from updated u
  join admin_security_notification_channels c
    on c.id = u.channel_id;
end;
$$;

create or replace function mark_admin_security_notification_delivery_sent(
  p_delivery_id uuid,
  p_provider_response jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_delivery_id is null then
    raise exception 'notification delivery id is required';
  end if;

  update admin_security_notification_deliveries
  set
    status = 'sent',
    sent_at = now(),
    provider_response = coalesce(p_provider_response, '{}'::jsonb),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_delivery_id;

  if not found then
    raise exception 'notification delivery not found: %', p_delivery_id;
  end if;

  return p_delivery_id;
end;
$$;

create or replace function mark_admin_security_notification_delivery_failed(
  p_delivery_id uuid,
  p_error text,
  p_retry_seconds integer default 300,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_delivery admin_security_notification_deliveries%rowtype;
begin
  if p_delivery_id is null then
    raise exception 'notification delivery id is required';
  end if;

  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'notification delivery error is required';
  end if;

  select *
  into v_delivery
  from admin_security_notification_deliveries
  where id = p_delivery_id
  for update;

  if v_delivery.id is null then
    raise exception 'notification delivery not found: %', p_delivery_id;
  end if;

  if v_delivery.attempt_count >= v_delivery.max_attempts then
    update admin_security_notification_deliveries
    set
      status = 'abandoned',
      failed_at = now(),
      last_error = p_error,
      metadata = metadata || p_metadata || jsonb_build_object(
        'abandoned_at',
        now()
      ),
      updated_at = now()
    where id = p_delivery_id;
  else
    update admin_security_notification_deliveries
    set
      status = 'failed',
      failed_at = now(),
      last_error = p_error,
      next_attempt_at = now() + make_interval(secs => greatest(p_retry_seconds, 30)),
      metadata = metadata || p_metadata,
      updated_at = now()
    where id = p_delivery_id;
  end if;

  return p_delivery_id;
end;
$$;

create or replace view admin_security_notification_channel_dashboard as
select
  c.id as admin_security_notification_channel_id,
  c.channel_key,
  c.channel_type,
  c.status,
  c.display_name,
  c.destination,
  c.secret_ref,
  c.min_severity,

  (
    select count(*)
    from admin_security_notification_deliveries d
    where d.channel_id = c.id
      and d.status = 'pending'
  ) as pending_delivery_count,

  (
    select count(*)
    from admin_security_notification_deliveries d
    where d.channel_id = c.id
      and d.status = 'sent'
      and d.sent_at >= now() - interval '24 hours'
  ) as sent_delivery_count_24h,

  (
    select count(*)
    from admin_security_notification_deliveries d
    where d.channel_id = c.id
      and d.status in ('failed', 'abandoned')
      and d.updated_at >= now() - interval '24 hours'
  ) as failed_delivery_count_24h,

  c.created_at,
  c.updated_at,
  c.metadata
from admin_security_notification_channels c
order by c.channel_type, c.channel_key;

create or replace view admin_security_notification_delivery_dashboard as
select
  d.id as admin_security_notification_delivery_id,
  d.source_type,
  d.source_id,
  d.event_key,
  d.severity,

  c.channel_key,
  c.channel_type,
  c.display_name,

  d.status,
  d.attempt_count,
  d.max_attempts,
  d.next_attempt_at,
  d.sent_at,
  d.failed_at,
  d.last_error,

  d.destination_snapshot,

  d.created_at,
  d.updated_at,
  d.metadata
from admin_security_notification_deliveries d
left join admin_security_notification_channels c
  on c.id = d.channel_id
order by d.created_at desc;

create or replace view admin_security_notification_integrity as
select
  (
    select count(*)
    from admin_security_notification_channels
    where status = 'active'
  ) as active_channel_count,

  (
    select count(*)
    from admin_security_notification_deliveries
    where status = 'pending'
  ) as pending_delivery_count,

  (
    select count(*)
    from admin_security_notification_deliveries
    where status = 'failed'
  ) as failed_delivery_count,

  (
    select count(*)
    from admin_security_notification_deliveries
    where status = 'abandoned'
  ) as abandoned_delivery_count,

  (
    select count(*)
    from admin_security_notification_deliveries
    where status = 'sent'
      and sent_at >= now() - interval '24 hours'
  ) as sent_delivery_count_24h,

  now() as checked_at;

grant select on admin_security_notification_channel_dashboard to admin_api_role;
grant select on admin_security_notification_delivery_dashboard to admin_api_role;
grant select on admin_security_notification_integrity to admin_api_role;

alter table admin_security_notification_channels enable row level security;
alter table admin_security_notification_rules enable row level security;
alter table admin_security_notification_deliveries enable row level security;

drop policy if exists admin_security_notification_channels_no_user_direct_access
on admin_security_notification_channels;
create policy admin_security_notification_channels_no_user_direct_access
on admin_security_notification_channels
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_notification_rules_no_user_direct_access
on admin_security_notification_rules;
create policy admin_security_notification_rules_no_user_direct_access
on admin_security_notification_rules
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_notification_deliveries_no_user_direct_access
on admin_security_notification_deliveries;
create policy admin_security_notification_deliveries_no_user_direct_access
on admin_security_notification_deliveries
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_notification_channels
on admin_security_notification_channels;
create policy admin_api_all_admin_security_notification_channels
on admin_security_notification_channels
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_notification_rules
on admin_security_notification_rules;
create policy admin_api_all_admin_security_notification_rules
on admin_security_notification_rules
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_read_admin_security_notification_deliveries
on admin_security_notification_deliveries;
create policy admin_api_read_admin_security_notification_deliveries
on admin_security_notification_deliveries
for select
to admin_api_role
using (true);

drop policy if exists worker_all_admin_security_notification_channels
on admin_security_notification_channels;
create policy worker_all_admin_security_notification_channels
on admin_security_notification_channels
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_notification_rules
on admin_security_notification_rules;
create policy worker_all_admin_security_notification_rules
on admin_security_notification_rules
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_notification_deliveries
on admin_security_notification_deliveries;
create policy worker_all_admin_security_notification_deliveries
on admin_security_notification_deliveries
for all
to worker_role
using (true)
with check (true);

grant execute on function admin_security_severity_rank(text)
to admin_api_role, worker_role;

grant execute on function enqueue_admin_security_notification(
  text,
  uuid,
  text,
  text,
  jsonb,
  jsonb
) to worker_role, admin_api_role;

grant execute on function enqueue_notifications_from_security_alerts(integer, jsonb)
to worker_role;

grant execute on function enqueue_notifications_from_break_glass(integer, jsonb)
to worker_role;

grant execute on function run_admin_security_notification_enqueue_job(integer, jsonb)
to worker_role;

grant execute on function claim_admin_security_notification_deliveries(integer, text, jsonb)
to worker_role;

grant execute on function mark_admin_security_notification_delivery_sent(uuid, jsonb, jsonb)
to worker_role;

grant execute on function mark_admin_security_notification_delivery_failed(uuid, text, integer, jsonb)
to worker_role;

alter function enqueue_admin_security_notification(text, uuid, text, text, jsonb, jsonb) security definer;
alter function enqueue_admin_security_notification(text, uuid, text, text, jsonb, jsonb) set search_path = public;

alter function enqueue_notifications_from_security_alerts(integer, jsonb) security definer;
alter function enqueue_notifications_from_security_alerts(integer, jsonb) set search_path = public;

alter function enqueue_notifications_from_break_glass(integer, jsonb) security definer;
alter function enqueue_notifications_from_break_glass(integer, jsonb) set search_path = public;

alter function run_admin_security_notification_enqueue_job(integer, jsonb) security definer;
alter function run_admin_security_notification_enqueue_job(integer, jsonb) set search_path = public;

alter function claim_admin_security_notification_deliveries(integer, text, jsonb) security definer;
alter function claim_admin_security_notification_deliveries(integer, text, jsonb) set search_path = public;

alter function mark_admin_security_notification_delivery_sent(uuid, jsonb, jsonb) security definer;
alter function mark_admin_security_notification_delivery_sent(uuid, jsonb, jsonb) set search_path = public;

alter function mark_admin_security_notification_delivery_failed(uuid, text, integer, jsonb) security definer;
alter function mark_admin_security_notification_delivery_failed(uuid, text, integer, jsonb) set search_path = public;

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
  'admin_security_notifications_enqueue_every_minute',
  'Enqueue admin security notifications',
  'admin',
  true,
  '* * * * *',
  'run_admin_security_notification_enqueue_job',
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

  elsif v_job.function_name = 'run_admin_security_notification_enqueue_job' then
    v_uuid_result := run_admin_security_notification_enqueue_job(
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
    'ADMIN_SECURITY_NOTIFICATION_FAILED',
    'system',
    'high',
    500,
    true,
    false,
    'Security notification failed.',
    'Admin security notification delivery failed.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_NOTIFICATION_CHANNEL_INVALID',
    'validation',
    'medium',
    400,
    false,
    true,
    'Invalid notification channel.',
    'Admin security notification channel invalid.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_NOTIFICATION_DELIVERY_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Notification delivery not found.',
    'Admin security notification delivery not found.',
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
  ('notification delivery not found', 'ADMIN_SECURITY_NOTIFICATION_DELIVERY_NOT_FOUND', 5, '{}'),
  ('invalid notification severity', 'ADMIN_SECURITY_NOTIFICATION_CHANNEL_INVALID', 5, '{}'),
  ('unsupported notification channel type', 'ADMIN_SECURITY_NOTIFICATION_CHANNEL_INVALID', 5, '{}'),
  ('missing Slack webhook secret', 'ADMIN_SECURITY_NOTIFICATION_FAILED', 5, '{}'),
  ('Slack delivery failed', 'ADMIN_SECURITY_NOTIFICATION_FAILED', 5, '{}'),
  ('Webhook delivery failed', 'ADMIN_SECURITY_NOTIFICATION_FAILED', 5, '{}')
on conflict do nothing;
