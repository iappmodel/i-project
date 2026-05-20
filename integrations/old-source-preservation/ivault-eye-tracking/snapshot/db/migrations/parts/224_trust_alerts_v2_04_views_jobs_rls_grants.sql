-- Step 9.89 — Trust admin alerts v2: views, scheduled jobs, errors, RLS, grants (part 04).

create or replace view admin_security_trust_alert_event_dashboard as
select
  e.id as admin_security_trust_alert_event_id,
  e.alert_event_key,
  e.status,
  e.source_module,
  e.source_event_type,
  e.severity,
  e.alert_priority,
  e.customer_name,
  e.customer_domain,
  e.title,
  e.summary,
  e.source_table,
  e.source_id,
  e.source_key,
  e.command_queue_item_id,
  q.command_queue_item_key,
  e.incident_id,
  i.incident_key,
  e.ai_finding_id,
  f.finding_key,
  e.risk_score_id,
  rs.risk_score_key,
  e.webhook_delivery_id,
  wd.webhook_delivery_key,
  e.billing_account_id,
  ba.billing_account_key,
  e.dedupe_key,
  e.first_seen_at,
  e.last_seen_at,
  e.occurrence_count,
  e.acknowledged_at,
  ack.email as acknowledged_by_email,
  e.resolved_at,
  resolver.email as resolved_by_email,
  e.resolution_note,
  e.escalated,
  e.escalation_level,
  e.next_escalation_at,
  (
    select count(*)
    from admin_security_trust_alert_notifications n
    where n.alert_event_id = e.id
  ) as notification_count,
  (
    select count(*)
    from admin_security_trust_alert_notifications n
    where n.alert_event_id = e.id
      and n.status = 'delivered'
  ) as delivered_notification_count,
  (
    select count(*)
    from admin_security_trust_alert_notifications n
    where n.alert_event_id = e.id
      and n.status = 'failed'
  ) as failed_notification_count,
  e.created_at,
  e.updated_at,
  e.metadata
from admin_security_trust_alert_events e
left join admin_security_trust_command_center_queue q
  on q.id = e.command_queue_item_id
left join admin_security_trust_incidents i
  on i.id = e.incident_id
left join admin_security_trust_ai_findings f
  on f.id = e.ai_finding_id
left join admin_security_customer_trust_risk_scores rs
  on rs.id = e.risk_score_id
left join admin_security_trust_webhook_deliveries wd
  on wd.id = e.webhook_delivery_id
left join admin_security_trust_billing_accounts ba
  on ba.id = e.billing_account_id
left join admin_users ack
  on ack.id = e.acknowledged_by_admin_user_id
left join admin_users resolver
  on resolver.id = e.resolved_by_admin_user_id;

create or replace view admin_security_trust_alert_notification_dashboard as
select
  n.id as admin_security_trust_alert_notification_id,
  n.alert_notification_key,
  n.status,
  n.alert_event_id,
  e.alert_event_key,
  e.source_module,
  e.source_event_type,
  n.alert_policy_id,
  p.alert_policy_key,
  p.policy_name,
  n.alert_channel_id,
  c.alert_channel_key,
  c.channel_name,
  n.alert_recipient_id,
  r.alert_recipient_key,
  n.channel_type,
  n.customer_name,
  n.customer_domain,
  n.recipient_name,
  n.recipient_address,
  n.title,
  n.body,
  n.severity,
  n.alert_priority,
  n.attempt_count,
  n.max_attempts,
  n.next_attempt_at,
  n.last_attempt_at,
  n.delivered_at,
  n.failed_at,
  n.cancelled_at,
  n.response_status,
  n.response_body_preview,
  n.last_error,
  n.created_at,
  n.updated_at,
  n.metadata
from admin_security_trust_alert_notifications n
join admin_security_trust_alert_events e
  on e.id = n.alert_event_id
left join admin_security_trust_alert_policies p
  on p.id = n.alert_policy_id
left join admin_security_trust_alert_channels c
  on c.id = n.alert_channel_id
left join admin_security_trust_alert_recipients r
  on r.id = n.alert_recipient_id;

create or replace view admin_security_trust_alert_policy_dashboard as
select
  p.id as admin_security_trust_alert_policy_id,
  p.alert_policy_key,
  p.status,
  p.policy_name,
  p.policy_description,
  p.policy_scope,
  p.customer_name,
  p.customer_domain,
  p.source_module,
  p.source_event_type,
  p.min_severity,
  p.alert_priority,
  p.enabled,
  p.dedupe_window_minutes,
  p.suppression_window_minutes,
  p.escalation_enabled,
  p.escalation_after_minutes,
  p.max_escalation_level,
  p.create_in_app,
  p.send_email,
  p.send_mobile_push,
  p.send_slack,
  p.send_pagerduty,
  p.send_webhook,
  creator.email as created_by_email,
  (
    select count(*)
    from admin_security_trust_alert_notifications n
    where n.alert_policy_id = p.id
  ) as notification_count,
  p.created_at,
  p.updated_at,
  p.metadata
from admin_security_trust_alert_policies p
left join admin_users creator
  on creator.id = p.created_by_admin_user_id;

create or replace view admin_security_trust_alert_integrity as
select
  (
    select count(*)
    from admin_security_trust_alert_events
    where status = 'open'
  ) as open_alert_event_count,

  (
    select count(*)
    from admin_security_trust_alert_events
    where status = 'open'
      and alert_priority = 'critical'
  ) as open_critical_alert_count,

  (
    select count(*)
    from admin_security_trust_alert_events
    where status = 'open'
      and alert_priority = 'high'
  ) as open_high_alert_count,

  (
    select count(*)
    from admin_security_trust_alert_notifications
    where status in ('pending', 'retry_scheduled')
      and next_attempt_at <= now()
  ) as due_notification_count,

  (
    select count(*)
    from admin_security_trust_alert_notifications
    where status = 'failed'
      and created_at >= now() - interval '24 hours'
  ) as failed_notification_count_24h,

  (
    select count(*)
    from admin_security_trust_alert_events
    where status = 'open'
      and next_escalation_at <= now()
  ) as due_escalation_count,

  (
    select count(*)
    from admin_security_trust_alert_channels
    where status = 'active'
      and enabled is true
  ) as active_channel_count,

  (
    select count(*)
    from admin_security_trust_alert_recipients
    where status = 'active'
      and enabled is true
  ) as active_recipient_count,

  now() as checked_at;

grant select on admin_security_trust_alert_event_dashboard to admin_api_role;
grant select on admin_security_trust_alert_notification_dashboard to admin_api_role;
grant select on admin_security_trust_alert_policy_dashboard to admin_api_role;
grant select on admin_security_trust_alert_integrity to admin_api_role;

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
    'admin_security_trust_alert_sync_every_minute',
    'Sync trust alert events',
    'admin',
    true,
    '* * * * *',
    'sync_admin_security_trust_alert_events',
    '{"batch_size": 500}'::jsonb,
    180,
    300,
    '{"priority": "high"}'::jsonb
  ),
  (
    'admin_security_trust_alert_build_notifications_every_minute',
    'Build trust alert notifications',
    'admin',
    true,
    '* * * * *',
    'build_admin_security_trust_alert_notifications',
    '{"batch_size": 500}'::jsonb,
    180,
    300,
    '{"priority": "high"}'::jsonb
  ),
  (
    'admin_security_trust_alert_lease_notifications_every_minute',
    'Lease trust alert notifications',
    'admin',
    true,
    '* * * * *',
    'lease_due_admin_security_trust_alert_notifications',
    '{"batch_size": 100}'::jsonb,
    120,
    180,
    '{"priority": "high"}'::jsonb
  ),
  (
    'admin_security_trust_alert_escalate_every_5m',
    'Escalate due trust alerts',
    'admin',
    true,
    '*/5 * * * *',
    'escalate_due_admin_security_trust_alert_events',
    '{"batch_size": 200}'::jsonb,
    180,
    300,
    '{"priority": "high"}'::jsonb
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
    'TRUST_ALERT_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Trust alert record not found.',
    'Trust alert record not found.',
    'platform'
  ),
  (
    'TRUST_ALERT_INVALID_STATE',
    'validation',
    'medium',
    409,
    true,
    true,
    'Trust alert record is not in a valid state.',
    'Trust alert invalid state.',
    'platform'
  ),
  (
    'TRUST_ALERT_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Trust alert request requires complete fields.',
    'Trust alert required fields missing.',
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
  ('trust alert title is required', 'TRUST_ALERT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust alert summary is required', 'TRUST_ALERT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust alert notification not found', 'TRUST_ALERT_NOT_FOUND', 5, '{}'::jsonb),
  ('trust alert event not found or not open', 'TRUST_ALERT_INVALID_STATE', 5, '{}'::jsonb),
  ('trust alert event not found or not resolvable', 'TRUST_ALERT_INVALID_STATE', 5, '{}'::jsonb),
  ('trust alert resolution note is required', 'TRUST_ALERT_REQUIRED_FIELDS', 5, '{}'::jsonb)
on conflict (match_pattern)
do update set
  error_code = excluded.error_code,
  priority = excluded.priority,
  metadata = excluded.metadata,
  active = true;

alter table admin_security_trust_alert_channels enable row level security;
alter table admin_security_trust_alert_recipients enable row level security;
alter table admin_security_trust_alert_policies enable row level security;
alter table admin_security_trust_alert_events enable row level security;
alter table admin_security_trust_alert_notifications enable row level security;
alter table admin_security_trust_alert_delivery_attempts enable row level security;
alter table admin_security_trust_alert_audit_events enable row level security;

drop policy if exists admin_api_all_trust_alert_channels on admin_security_trust_alert_channels;
create policy admin_api_all_trust_alert_channels
on admin_security_trust_alert_channels
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_alert_recipients on admin_security_trust_alert_recipients;
create policy admin_api_all_trust_alert_recipients
on admin_security_trust_alert_recipients
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_alert_policies on admin_security_trust_alert_policies;
create policy admin_api_all_trust_alert_policies
on admin_security_trust_alert_policies
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_alert_events on admin_security_trust_alert_events;
create policy admin_api_all_trust_alert_events
on admin_security_trust_alert_events
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_alert_notifications on admin_security_trust_alert_notifications;
create policy admin_api_all_trust_alert_notifications
on admin_security_trust_alert_notifications
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_alert_delivery_attempts on admin_security_trust_alert_delivery_attempts;
create policy admin_api_all_trust_alert_delivery_attempts
on admin_security_trust_alert_delivery_attempts
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_alert_audit_events on admin_security_trust_alert_audit_events;
create policy admin_api_all_trust_alert_audit_events
on admin_security_trust_alert_audit_events
for all to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_trust_alert_channels on admin_security_trust_alert_channels;
create policy worker_all_trust_alert_channels
on admin_security_trust_alert_channels
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_alert_recipients on admin_security_trust_alert_recipients;
create policy worker_all_trust_alert_recipients
on admin_security_trust_alert_recipients
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_alert_policies on admin_security_trust_alert_policies;
create policy worker_all_trust_alert_policies
on admin_security_trust_alert_policies
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_alert_events on admin_security_trust_alert_events;
create policy worker_all_trust_alert_events
on admin_security_trust_alert_events
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_alert_notifications on admin_security_trust_alert_notifications;
create policy worker_all_trust_alert_notifications
on admin_security_trust_alert_notifications
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_alert_delivery_attempts on admin_security_trust_alert_delivery_attempts;
create policy worker_all_trust_alert_delivery_attempts
on admin_security_trust_alert_delivery_attempts
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_alert_audit_events on admin_security_trust_alert_audit_events;
create policy worker_all_trust_alert_audit_events
on admin_security_trust_alert_audit_events
for all to worker_role
using (true)
with check (true);

grant execute on function record_admin_security_trust_alert_audit_event(
  text,text,uuid,uuid,uuid,uuid,uuid,text,text,text,uuid,uuid,text,text,text,text,jsonb
) to admin_api_role, worker_role;

grant execute on function admin_security_alert_severity_rank(text)
to admin_api_role, worker_role;

grant execute on function create_admin_security_trust_alert_event(
  text,text,text,text,text,text,text,text,text,uuid,text,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,text,jsonb
) to admin_api_role, worker_role;

grant execute on function build_admin_security_trust_alert_notifications(integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function lease_due_admin_security_trust_alert_notifications(integer,text,integer,jsonb)
to admin_api_role, worker_role;

grant execute on function record_admin_security_trust_alert_notification_result(
  uuid,boolean,integer,text,text,text,integer,text,text,jsonb
) to admin_api_role, worker_role;

grant execute on function sync_admin_security_trust_alert_events_from_command_center(integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function sync_admin_security_trust_alert_events_from_ai_findings(integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function sync_admin_security_trust_alert_events_from_incidents(integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function sync_admin_security_trust_alert_events_from_integrations_and_billing(integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function sync_admin_security_trust_alert_events(integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function escalate_due_admin_security_trust_alert_events(integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function acknowledge_admin_security_trust_alert_event(uuid,uuid,text,jsonb)
to admin_api_role;

grant execute on function resolve_admin_security_trust_alert_event(uuid,uuid,text,text,jsonb)
to admin_api_role;

alter function create_admin_security_trust_alert_event(
  text,text,text,text,text,text,text,text,text,uuid,text,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,text,jsonb
) security definer;
alter function create_admin_security_trust_alert_event(
  text,text,text,text,text,text,text,text,text,uuid,text,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,text,jsonb
) set search_path = public;

alter function build_admin_security_trust_alert_notifications(integer,text,text,jsonb) security definer;
alter function build_admin_security_trust_alert_notifications(integer,text,text,jsonb) set search_path = public;

alter function lease_due_admin_security_trust_alert_notifications(integer,text,integer,jsonb) security definer;
alter function lease_due_admin_security_trust_alert_notifications(integer,text,integer,jsonb) set search_path = public;

alter function record_admin_security_trust_alert_notification_result(
  uuid,boolean,integer,text,text,text,integer,text,text,jsonb
) security definer;
alter function record_admin_security_trust_alert_notification_result(
  uuid,boolean,integer,text,text,text,integer,text,text,jsonb
) set search_path = public;

alter function sync_admin_security_trust_alert_events(integer,text,text,jsonb) security definer;
alter function sync_admin_security_trust_alert_events(integer,text,text,jsonb) set search_path = public;

alter function escalate_due_admin_security_trust_alert_events(integer,text,text,jsonb) security definer;
alter function escalate_due_admin_security_trust_alert_events(integer,text,text,jsonb) set search_path = public;

alter function acknowledge_admin_security_trust_alert_event(uuid,uuid,text,jsonb) security definer;
alter function acknowledge_admin_security_trust_alert_event(uuid,uuid,text,jsonb) set search_path = public;

alter function resolve_admin_security_trust_alert_event(uuid,uuid,text,text,jsonb) security definer;
alter function resolve_admin_security_trust_alert_event(uuid,uuid,text,text,jsonb) set search_path = public;
