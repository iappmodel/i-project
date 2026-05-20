-- Step 9.33 — Admin security snapshots and report exports.
-- Runs after 148_admin_security_notification_channels.sql.

create or replace view admin_security_notification_integrity as
select
  (
    select count(*)
    from admin_security_alert_delivery_channels
    where status = 'active'
  ) as active_channel_count,
  (
    select count(*)
    from admin_security_alert_deliveries
    where status in ('queued', 'locked')
  ) as pending_delivery_count,
  (
    select count(*)
    from admin_security_alert_deliveries
    where status = 'failed'
  ) as failed_delivery_count,
  (
    select count(*)
    from admin_security_alert_deliveries
    where status = 'cancelled'
  ) as abandoned_delivery_count,
  (
    select count(*)
    from admin_security_alert_deliveries
    where status = 'delivered'
      and delivered_at >= now() - interval '24 hours'
  ) as sent_delivery_count_24h,
  now() as checked_at;

create table if not exists admin_security_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null unique,
  status text not null,
  checked_at timestamptz not null default now(),
  open_alert_count bigint not null default 0,
  open_critical_alert_count bigint not null default 0,
  alert_escalation_count_24h bigint not null default 0,
  open_incident_review_count bigint not null default 0,
  overdue_incident_review_count bigint not null default 0,
  open_corrective_action_count bigint not null default 0,
  overdue_corrective_action_count bigint not null default 0,
  active_session_count bigint not null default 0,
  reauth_required_session_count bigint not null default 0,
  revoked_session_count_24h bigint not null default 0,
  unknown_device_count bigint not null default 0,
  suspicious_device_count bigint not null default 0,
  blocked_or_revoked_device_count bigint not null default 0,
  super_admin_without_active_mfa_count bigint not null default 0,
  active_recovery_code_count bigint not null default 0,
  open_break_glass_request_count bigint not null default 0,
  active_break_glass_access_count bigint not null default 0,
  audit_hash_missing_count bigint not null default 0,
  active_notification_channel_count bigint not null default 0,
  pending_notification_delivery_count bigint not null default 0,
  failed_notification_delivery_count bigint not null default 0,
  abandoned_notification_delivery_count bigint not null default 0,
  sent_notification_delivery_count_24h bigint not null default 0,
  posture_checks jsonb not null default '[]'::jsonb,
  priority_queue_sample jsonb not null default '[]'::jsonb,
  actor_rollup_sample jsonb not null default '[]'::jsonb,
  report_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_daily_snapshots_status_check
  check (status in ('healthy', 'warning', 'critical'))
);

create index if not exists admin_security_daily_snapshots_status_idx
on admin_security_daily_snapshots (status, snapshot_date desc);

drop trigger if exists admin_security_daily_snapshots_set_updated_at
on admin_security_daily_snapshots;

create trigger admin_security_daily_snapshots_set_updated_at
before update on admin_security_daily_snapshots
for each row
execute function set_updated_at();

create table if not exists admin_security_report_exports (
  id uuid primary key default gen_random_uuid(),
  report_key text not null unique,
  report_type text not null,
  status text not null default 'generated',
  period_start date not null,
  period_end date not null,
  title text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  generated_by_auth_user_id uuid,
  generated_by_admin_user_id uuid references admin_users(id),
  exported_at timestamptz,
  export_format text,
  export_url text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_report_exports_report_type_check
  check (report_type in ('daily', 'weekly', 'monthly', 'incident', 'audit')),
  constraint admin_security_report_exports_status_check
  check (status in ('generated', 'exported', 'archived')),
  constraint admin_security_report_exports_format_check
  check (
    export_format is null
    or export_format in ('json', 'csv', 'pdf', 'markdown')
  ),
  constraint admin_security_report_exports_period_check
  check (period_end >= period_start)
);

create index if not exists admin_security_report_exports_period_idx
on admin_security_report_exports (period_start desc, period_end desc);

create index if not exists admin_security_report_exports_type_status_idx
on admin_security_report_exports (report_type, status, created_at desc);

drop trigger if exists admin_security_report_exports_set_updated_at
on admin_security_report_exports;

create trigger admin_security_report_exports_set_updated_at
before update on admin_security_report_exports
for each row
execute function set_updated_at();

create or replace function create_admin_security_daily_snapshot(
  p_snapshot_date date default current_date,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_summary admin_security_command_center_summary%rowtype;
  v_notification admin_security_notification_integrity%rowtype;
  v_posture_checks jsonb := '[]'::jsonb;
  v_priority_queue_sample jsonb := '[]'::jsonb;
  v_actor_rollup_sample jsonb := '[]'::jsonb;
  v_report_payload jsonb;
  v_snapshot_id uuid;
begin
  if p_snapshot_date is null then
    p_snapshot_date := current_date;
  end if;

  select *
  into v_summary
  from admin_security_command_center_summary
  limit 1;

  select *
  into v_notification
  from admin_security_notification_integrity
  limit 1;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  into v_posture_checks
  from (
    select *
    from admin_security_posture_checks
    order by
      case status
        when 'fail' then 0
        when 'warn' then 1
        else 2
      end,
      check_key
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  into v_priority_queue_sample
  from (
    select *
    from admin_security_priority_queue
    order by priority_score desc, created_at asc
    limit 25
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  into v_actor_rollup_sample
  from (
    select *
    from admin_security_actor_rollup
    order by
      case posture_status
        when 'critical' then 0
        when 'warning' then 1
        else 2
      end,
      email
    limit 50
  ) x;

  v_report_payload := jsonb_build_object(
    'snapshot_date', p_snapshot_date,
    'security_status', v_summary.security_status,
    'checked_at', now(),
    'summary', to_jsonb(v_summary),
    'notifications', to_jsonb(v_notification),
    'posture_checks', v_posture_checks,
    'priority_queue_sample', v_priority_queue_sample,
    'actor_rollup_sample', v_actor_rollup_sample
  );

  insert into admin_security_daily_snapshots (
    snapshot_date,
    status,
    checked_at,
    open_alert_count,
    open_critical_alert_count,
    alert_escalation_count_24h,
    open_incident_review_count,
    overdue_incident_review_count,
    open_corrective_action_count,
    overdue_corrective_action_count,
    active_session_count,
    reauth_required_session_count,
    revoked_session_count_24h,
    unknown_device_count,
    suspicious_device_count,
    blocked_or_revoked_device_count,
    super_admin_without_active_mfa_count,
    active_recovery_code_count,
    open_break_glass_request_count,
    active_break_glass_access_count,
    audit_hash_missing_count,
    active_notification_channel_count,
    pending_notification_delivery_count,
    failed_notification_delivery_count,
    abandoned_notification_delivery_count,
    sent_notification_delivery_count_24h,
    posture_checks,
    priority_queue_sample,
    actor_rollup_sample,
    report_payload,
    metadata
  )
  values (
    p_snapshot_date,
    v_summary.security_status,
    now(),
    v_summary.open_alert_count,
    v_summary.open_critical_alert_count,
    v_summary.alert_escalation_count_24h,
    v_summary.open_incident_review_count,
    v_summary.overdue_incident_review_count,
    v_summary.open_corrective_action_count,
    v_summary.overdue_corrective_action_count,
    v_summary.active_session_count,
    v_summary.reauth_required_session_count,
    v_summary.revoked_session_count_24h,
    v_summary.unknown_device_count,
    v_summary.suspicious_device_count,
    v_summary.blocked_or_revoked_device_count,
    v_summary.super_admin_without_active_mfa_count,
    v_summary.active_recovery_code_count,
    v_summary.open_break_glass_request_count,
    v_summary.active_break_glass_access_count,
    v_summary.audit_hash_missing_count,
    coalesce(v_notification.active_channel_count, 0),
    coalesce(v_notification.pending_delivery_count, 0),
    coalesce(v_notification.failed_delivery_count, 0),
    coalesce(v_notification.abandoned_delivery_count, 0),
    coalesce(v_notification.sent_delivery_count_24h, 0),
    v_posture_checks,
    v_priority_queue_sample,
    v_actor_rollup_sample,
    v_report_payload,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (snapshot_date)
  do update set
    status = excluded.status,
    checked_at = excluded.checked_at,
    open_alert_count = excluded.open_alert_count,
    open_critical_alert_count = excluded.open_critical_alert_count,
    alert_escalation_count_24h = excluded.alert_escalation_count_24h,
    open_incident_review_count = excluded.open_incident_review_count,
    overdue_incident_review_count = excluded.overdue_incident_review_count,
    open_corrective_action_count = excluded.open_corrective_action_count,
    overdue_corrective_action_count = excluded.overdue_corrective_action_count,
    active_session_count = excluded.active_session_count,
    reauth_required_session_count = excluded.reauth_required_session_count,
    revoked_session_count_24h = excluded.revoked_session_count_24h,
    unknown_device_count = excluded.unknown_device_count,
    suspicious_device_count = excluded.suspicious_device_count,
    blocked_or_revoked_device_count = excluded.blocked_or_revoked_device_count,
    super_admin_without_active_mfa_count = excluded.super_admin_without_active_mfa_count,
    active_recovery_code_count = excluded.active_recovery_code_count,
    open_break_glass_request_count = excluded.open_break_glass_request_count,
    active_break_glass_access_count = excluded.active_break_glass_access_count,
    audit_hash_missing_count = excluded.audit_hash_missing_count,
    active_notification_channel_count = excluded.active_notification_channel_count,
    pending_notification_delivery_count = excluded.pending_notification_delivery_count,
    failed_notification_delivery_count = excluded.failed_notification_delivery_count,
    abandoned_notification_delivery_count = excluded.abandoned_notification_delivery_count,
    sent_notification_delivery_count_24h = excluded.sent_notification_delivery_count_24h,
    posture_checks = excluded.posture_checks,
    priority_queue_sample = excluded.priority_queue_sample,
    actor_rollup_sample = excluded.actor_rollup_sample,
    report_payload = excluded.report_payload,
    metadata = admin_security_daily_snapshots.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_snapshot_id;

  return v_snapshot_id;
end;
$$;

create or replace function generate_admin_security_report(
  p_report_type text,
  p_period_start date,
  p_period_end date,
  p_generated_by_auth_user_id uuid default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_report_id uuid;
  v_report_key text;
  v_snapshots jsonb := '[]'::jsonb;
  v_critical_days bigint := 0;
  v_warning_days bigint := 0;
  v_healthy_days bigint := 0;
  v_summary text;
  v_title text;
begin
  if p_report_type not in ('daily', 'weekly', 'monthly', 'incident', 'audit') then
    raise exception 'invalid security report type: %', p_report_type;
  end if;

  if p_period_start is null or p_period_end is null then
    raise exception 'report period is required';
  end if;

  if p_period_end < p_period_start then
    raise exception 'report period end cannot be before start';
  end if;

  if p_generated_by_auth_user_id is not null then
    if admin_has_permission(p_generated_by_auth_user_id, 'admin.read') is not true then
      raise exception 'missing required permission: admin.read';
    end if;

    v_admin := get_active_admin_user(p_generated_by_auth_user_id);
  end if;

  select coalesce(jsonb_agg(to_jsonb(s) order by s.snapshot_date asc), '[]'::jsonb)
  into v_snapshots
  from admin_security_daily_snapshots s
  where s.snapshot_date between p_period_start and p_period_end;

  select
    count(*) filter (where status = 'critical'),
    count(*) filter (where status = 'warning'),
    count(*) filter (where status = 'healthy')
  into
    v_critical_days,
    v_warning_days,
    v_healthy_days
  from admin_security_daily_snapshots
  where snapshot_date between p_period_start and p_period_end;

  v_title := 'Admin security report: '
    || p_report_type
    || ' '
    || p_period_start::text
    || ' to '
    || p_period_end::text;

  v_summary :=
    'Security report covering '
    || p_period_start::text
    || ' to '
    || p_period_end::text
    || '. Critical days: '
    || v_critical_days::text
    || '. Warning days: '
    || v_warning_days::text
    || '. Healthy days: '
    || v_healthy_days::text
    || '.';

  v_report_key := p_report_type || ':' || p_period_start::text || ':' || p_period_end::text;

  insert into admin_security_report_exports (
    report_key,
    report_type,
    status,
    period_start,
    period_end,
    title,
    summary,
    payload,
    generated_by_auth_user_id,
    generated_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_report_key,
    p_report_type,
    'generated',
    p_period_start,
    p_period_end,
    v_title,
    v_summary,
    jsonb_build_object(
      'report_type', p_report_type,
      'period_start', p_period_start,
      'period_end', p_period_end,
      'critical_days', v_critical_days,
      'warning_days', v_warning_days,
      'healthy_days', v_healthy_days,
      'snapshots', v_snapshots
    ),
    p_generated_by_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (report_key)
  do update set
    title = excluded.title,
    summary = excluded.summary,
    payload = excluded.payload,
    generated_by_auth_user_id = excluded.generated_by_auth_user_id,
    generated_by_admin_user_id = excluded.generated_by_admin_user_id,
    request_id = excluded.request_id,
    metadata = admin_security_report_exports.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_report_id;

  if p_generated_by_auth_user_id is not null then
    perform record_admin_action(
      p_generated_by_auth_user_id,
      'generate_admin_security_report',
      'admin.read',
      'admin_security_report_export',
      v_report_id,
      p_request_id,
      null,
      null,
      'allowed',
      v_summary,
      p_metadata || jsonb_build_object(
        'report_type', p_report_type,
        'period_start', p_period_start,
        'period_end', p_period_end
      )
    );
  end if;

  return v_report_id;
end;
$$;

create or replace function mark_admin_security_report_exported(
  p_admin_auth_user_id uuid,
  p_report_id uuid,
  p_export_format text,
  p_export_url text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_report_id is null then
    raise exception 'security report id is required';
  end if;

  if p_export_format not in ('json', 'csv', 'pdf', 'markdown') then
    raise exception 'invalid security report export format: %', p_export_format;
  end if;

  update admin_security_report_exports
  set
    status = 'exported',
    exported_at = now(),
    export_format = p_export_format,
    export_url = p_export_url,
    metadata = metadata || p_metadata || jsonb_build_object(
      'export_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = p_report_id;

  if not found then
    raise exception 'admin security report not found: %', p_report_id;
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'mark_admin_security_report_exported',
    'admin.write',
    'admin_security_report_export',
    p_report_id,
    p_request_id,
    null,
    null,
    'allowed',
    'security report exported',
    p_metadata || jsonb_build_object(
      'export_format',
      p_export_format,
      'export_url_present',
      p_export_url is not null
    )
  );

  return p_report_id;
end;
$$;

create or replace view admin_security_daily_snapshot_dashboard as
select
  s.id as admin_security_daily_snapshot_id,
  s.snapshot_date,
  s.status,
  s.checked_at,
  s.open_alert_count,
  s.open_critical_alert_count,
  s.alert_escalation_count_24h,
  s.open_incident_review_count,
  s.overdue_incident_review_count,
  s.open_corrective_action_count,
  s.overdue_corrective_action_count,
  s.active_session_count,
  s.reauth_required_session_count,
  s.revoked_session_count_24h,
  s.unknown_device_count,
  s.suspicious_device_count,
  s.blocked_or_revoked_device_count,
  s.super_admin_without_active_mfa_count,
  s.active_recovery_code_count,
  s.open_break_glass_request_count,
  s.active_break_glass_access_count,
  s.audit_hash_missing_count,
  s.active_notification_channel_count,
  s.pending_notification_delivery_count,
  s.failed_notification_delivery_count,
  s.abandoned_notification_delivery_count,
  s.sent_notification_delivery_count_24h,
  s.created_at,
  s.updated_at,
  s.metadata
from admin_security_daily_snapshots s
order by s.snapshot_date desc;

create or replace view admin_security_report_export_dashboard as
select
  r.id as admin_security_report_export_id,
  r.report_key,
  r.report_type,
  r.status,
  r.period_start,
  r.period_end,
  r.title,
  r.summary,
  r.generated_by_auth_user_id,
  au.email as generated_by_email,
  au.display_name as generated_by_display_name,
  r.exported_at,
  r.export_format,
  r.export_url,
  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_report_exports r
left join admin_users au
  on au.id = r.generated_by_admin_user_id
order by r.created_at desc;

create or replace view admin_security_snapshot_integrity as
select
  (
    select count(*)
    from admin_security_daily_snapshots
    where snapshot_date >= (current_date - interval '30 days')::date
  ) as snapshot_count_30d,
  (
    select count(*)
    from admin_security_daily_snapshots
    where snapshot_date >= (current_date - interval '30 days')::date
      and status = 'critical'
  ) as critical_snapshot_count_30d,
  (
    select count(*)
    from admin_security_report_exports
    where created_at >= now() - interval '30 days'
  ) as report_count_30d,
  (
    select max(snapshot_date)
    from admin_security_daily_snapshots
  ) as latest_snapshot_date,
  (
    select max(created_at)
    from admin_security_report_exports
  ) as latest_report_created_at,
  now() as checked_at;

grant select on admin_security_daily_snapshot_dashboard to admin_api_role;
grant select on admin_security_report_export_dashboard to admin_api_role;
grant select on admin_security_snapshot_integrity to admin_api_role;
grant select on admin_security_notification_integrity to admin_api_role;

create or replace function hash_admin_security_daily_snapshot(
  p_admin_security_daily_snapshot_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_snapshot admin_security_daily_snapshots%rowtype;
  v_payload jsonb;
begin
  select *
  into v_snapshot
  from admin_security_daily_snapshots
  where id = p_admin_security_daily_snapshot_id;

  if v_snapshot.id is null then
    raise exception 'admin security daily snapshot not found: %', p_admin_security_daily_snapshot_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_daily_snapshot',
    'source_id', v_snapshot.id,
    'snapshot_date', v_snapshot.snapshot_date,
    'status', v_snapshot.status,
    'checked_at', v_snapshot.checked_at,
    'open_alert_count', v_snapshot.open_alert_count,
    'open_critical_alert_count', v_snapshot.open_critical_alert_count,
    'open_incident_review_count', v_snapshot.open_incident_review_count,
    'overdue_incident_review_count', v_snapshot.overdue_incident_review_count,
    'open_corrective_action_count', v_snapshot.open_corrective_action_count,
    'overdue_corrective_action_count', v_snapshot.overdue_corrective_action_count,
    'active_break_glass_access_count', v_snapshot.active_break_glass_access_count,
    'audit_hash_missing_count', v_snapshot.audit_hash_missing_count,
    'created_at', v_snapshot.created_at,
    'updated_at', v_snapshot.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_daily_snapshot',
    v_snapshot.id,
    v_payload,
    'global_audit_chain',
    p_metadata
  );
end;
$$;

create or replace function hash_admin_security_report_export(
  p_admin_security_report_export_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_report admin_security_report_exports%rowtype;
  v_payload jsonb;
begin
  select *
  into v_report
  from admin_security_report_exports
  where id = p_admin_security_report_export_id;

  if v_report.id is null then
    raise exception 'admin security report not found: %', p_admin_security_report_export_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_report_export',
    'source_id', v_report.id,
    'report_key', v_report.report_key,
    'report_type', v_report.report_type,
    'status', v_report.status,
    'period_start', v_report.period_start,
    'period_end', v_report.period_end,
    'title', v_report.title,
    'summary', v_report.summary,
    'generated_by_auth_user_id', v_report.generated_by_auth_user_id,
    'exported_at', v_report.exported_at,
    'export_format', v_report.export_format,
    'created_at', v_report.created_at,
    'updated_at', v_report.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_report_export',
    v_report.id,
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
  'admin_incident_review'::text as source_type,
  r.id as source_id,
  r.created_at
from admin_incident_reviews r
where r.status in ('closed', 'dismissed')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_incident_review'
      and ahc.source_id = r.id
  )
union all
select
  'admin_incident_corrective_action'::text as source_type,
  ca.id as source_id,
  ca.created_at
from admin_incident_corrective_actions ca
where ca.status in ('completed', 'dismissed')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_incident_corrective_action'
      and ahc.source_id = ca.id
  )
union all
select
  'admin_security_daily_snapshot'::text as source_type,
  s.id as source_id,
  s.created_at
from admin_security_daily_snapshots s
where s.snapshot_date < current_date
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_daily_snapshot'
      and ahc.source_id = s.id
  )
union all
select
  'admin_security_report_export'::text as source_type,
  r.id as source_id,
  r.created_at
from admin_security_report_exports r
where r.status in ('generated', 'exported', 'archived')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_report_export'
      and ahc.source_id = r.id
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

  insert into audit_hash_backfill_runs (status, metadata)
  values ('processing', coalesce(p_metadata, '{}'::jsonb))
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
        perform hash_wallet_ledger_entry(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'accounting_journal_entry' then
        perform hash_accounting_journal_entry(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'reward_issuance_group' then
        perform hash_reward_issuance_group(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'attention_verification_event' then
        perform hash_attention_verification_event(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'withdrawal_request' then
        perform hash_withdrawal_request(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'external_payout' then
        perform hash_external_payout(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_incident_review' then
        perform hash_admin_incident_review(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_incident_corrective_action' then
        perform hash_admin_incident_corrective_action(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_daily_snapshot' then
        perform hash_admin_security_daily_snapshot(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_report_export' then
        perform hash_admin_security_report_export(
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
  'admin_security_daily_snapshot_every_day',
  'Create admin security daily snapshot',
  'admin',
  true,
  '5 0 * * *',
  'create_admin_security_daily_snapshot',
  '{}'::jsonb,
  180,
  300,
  '{"priority":"high"}'::jsonb
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

alter table admin_security_daily_snapshots enable row level security;
alter table admin_security_report_exports enable row level security;

drop policy if exists admin_security_daily_snapshots_no_user_direct_access
on admin_security_daily_snapshots;
create policy admin_security_daily_snapshots_no_user_direct_access
on admin_security_daily_snapshots
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_report_exports_no_user_direct_access
on admin_security_report_exports;
create policy admin_security_report_exports_no_user_direct_access
on admin_security_report_exports
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_daily_snapshots
on admin_security_daily_snapshots;
create policy admin_api_all_admin_security_daily_snapshots
on admin_security_daily_snapshots
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_report_exports
on admin_security_report_exports;
create policy admin_api_all_admin_security_report_exports
on admin_security_report_exports
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_daily_snapshots
on admin_security_daily_snapshots;
create policy worker_all_admin_security_daily_snapshots
on admin_security_daily_snapshots
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_report_exports
on admin_security_report_exports;
create policy worker_all_admin_security_report_exports
on admin_security_report_exports
for all
to worker_role
using (true)
with check (true);

grant execute on function create_admin_security_daily_snapshot(date, jsonb)
to admin_api_role, worker_role;

grant execute on function generate_admin_security_report(text, date, date, uuid, text, jsonb)
to admin_api_role, worker_role;

grant execute on function mark_admin_security_report_exported(uuid, uuid, text, text, text, jsonb)
to admin_api_role;

grant execute on function hash_admin_security_daily_snapshot(uuid, jsonb)
to worker_role, admin_api_role;

grant execute on function hash_admin_security_report_export(uuid, jsonb)
to worker_role, admin_api_role;

alter function create_admin_security_daily_snapshot(date, jsonb) security definer;
alter function create_admin_security_daily_snapshot(date, jsonb) set search_path = public;

alter function generate_admin_security_report(text, date, date, uuid, text, jsonb) security definer;
alter function generate_admin_security_report(text, date, date, uuid, text, jsonb) set search_path = public;

alter function mark_admin_security_report_exported(uuid, uuid, text, text, text, jsonb) security definer;
alter function mark_admin_security_report_exported(uuid, uuid, text, text, text, jsonb) set search_path = public;

alter function hash_admin_security_daily_snapshot(uuid, jsonb) security definer;
alter function hash_admin_security_daily_snapshot(uuid, jsonb) set search_path = public;

alter function hash_admin_security_report_export(uuid, jsonb) security definer;
alter function hash_admin_security_report_export(uuid, jsonb) set search_path = public;

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
    'ADMIN_SECURITY_SNAPSHOT_FAILED',
    'system',
    'high',
    500,
    true,
    false,
    'Security snapshot failed.',
    'Admin security daily snapshot creation failed.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_REPORT_FAILED',
    'system',
    'high',
    500,
    true,
    false,
    'Security report failed.',
    'Admin security report generation failed.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_REPORT_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Security report not found.',
    'Admin security report not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_REPORT_INVALID_PERIOD',
    'validation',
    'medium',
    400,
    false,
    true,
    'Invalid report period.',
    'Security report period invalid.',
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
  ('admin security daily snapshot not found', 'ADMIN_SECURITY_SNAPSHOT_FAILED', 5, '{}'),
  ('admin security report not found', 'ADMIN_SECURITY_REPORT_NOT_FOUND', 5, '{}'),
  ('invalid security report type', 'ADMIN_SECURITY_REPORT_FAILED', 5, '{}'),
  ('report period end cannot be before start', 'ADMIN_SECURITY_REPORT_INVALID_PERIOD', 5, '{}'),
  ('report period is required', 'ADMIN_SECURITY_REPORT_INVALID_PERIOD', 5, '{}')
on conflict do nothing;
