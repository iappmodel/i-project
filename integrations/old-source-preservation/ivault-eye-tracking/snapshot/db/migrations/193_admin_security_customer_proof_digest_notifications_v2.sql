-- Step 9.78 — Build customer proof digest and notification system v2
-- Runs after 192_admin_security_proof_qr_deeplink_system_v2.sql

create table if not exists admin_security_proof_digest_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscription_key text not null unique,
  status text not null default 'active',
  subscription_scope text not null,
  recipient_type text not null,
  recipient_auth_user_id uuid,
  recipient_admin_user_id uuid references admin_users(id) on delete set null,
  recipient_email text not null,
  recipient_display_name text,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete cascade,
  private_room_participant_id uuid references admin_security_private_trust_room_participants(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete cascade,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete cascade,
  digest_frequency text not null default 'daily',
  digest_channel text not null default 'email',
  timezone text not null default 'UTC',
  include_artifacts boolean not null default true,
  include_answers boolean not null default true,
  include_receipts boolean not null default true,
  include_reports boolean not null default true,
  include_downloads boolean not null default true,
  include_timeline boolean not null default true,
  include_crypto boolean not null default true,
  include_public_verification boolean not null default true,
  include_qr_links boolean not null default true,
  alert_on_failed_verification boolean not null default true,
  alert_on_hash_mismatch boolean not null default true,
  alert_on_revoked_proof boolean not null default true,
  alert_on_expiring_link boolean not null default true,
  alert_on_report_ready boolean not null default true,
  alert_on_unusual_download_activity boolean not null default true,
  last_digest_at timestamptz,
  next_digest_at timestamptz,
  muted_until timestamptz,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_proof_digest_subscriptions_status_check
    check (status in ('active', 'paused', 'muted', 'revoked', 'unsubscribed', 'archived')),
  constraint admin_security_proof_digest_subscriptions_scope_check
    check (subscription_scope in ('global_admin', 'customer', 'private_room', 'auditor_portal', 'enterprise_review_room')),
  constraint admin_security_proof_digest_subscriptions_recipient_type_check
    check (recipient_type in ('admin', 'customer', 'auditor', 'security_reviewer', 'legal', 'owner', 'system')),
  constraint admin_security_proof_digest_subscriptions_frequency_check
    check (digest_frequency in ('immediate', 'hourly', 'daily', 'weekly', 'manual')),
  constraint admin_security_proof_digest_subscriptions_channel_check
    check (digest_channel in ('email', 'in_app', 'webhook', 'slack', 'system')),
  constraint admin_security_proof_digest_subscriptions_email_check
    check (position('@' in recipient_email) > 1)
);

create index if not exists admin_security_proof_digest_subscriptions_status_idx
  on admin_security_proof_digest_subscriptions (status, next_digest_at);
create index if not exists admin_security_proof_digest_subscriptions_private_room_idx
  on admin_security_proof_digest_subscriptions (private_room_id, status);
create index if not exists admin_security_proof_digest_subscriptions_customer_idx
  on admin_security_proof_digest_subscriptions (customer_name, customer_domain, status);
create index if not exists admin_security_proof_digest_subscriptions_recipient_idx
  on admin_security_proof_digest_subscriptions (recipient_email, status);

drop trigger if exists admin_security_proof_digest_subscriptions_set_updated_at
on admin_security_proof_digest_subscriptions;
create trigger admin_security_proof_digest_subscriptions_set_updated_at
before update on admin_security_proof_digest_subscriptions
for each row
execute function set_updated_at();

create table if not exists admin_security_proof_notification_events (
  id uuid primary key default gen_random_uuid(),
  notification_event_key text not null unique,
  status text not null default 'pending',
  event_scope text not null,
  event_type text not null,
  severity text not null default 'info',
  title text not null,
  summary text,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  private_room_participant_id uuid references admin_security_private_trust_room_participants(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  source_type text not null,
  source_id uuid,
  source_key text,
  proof_type text,
  proof_key text,
  proof_hash_sha256 text,
  related_url text,
  occurred_at timestamptz not null default now(),
  dedupe_key text,
  expires_at timestamptz default (now() + interval '30 days'),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (dedupe_key),
  constraint admin_security_proof_notification_events_status_check
    check (status in ('pending', 'included', 'sent', 'suppressed', 'expired', 'archived')),
  constraint admin_security_proof_notification_events_scope_check
    check (event_scope in ('global_admin', 'customer', 'private_room', 'auditor_portal', 'enterprise_review_room')),
  constraint admin_security_proof_notification_events_type_check
    check (event_type in (
      'artifact_ready', 'answer_generated', 'receipt_created', 'export_ready', 'report_ready',
      'download_completed', 'timeline_event_recorded', 'crypto_checkpoint_created', 'merkle_batch_ready',
      'anchor_created', 'public_verification_verified', 'public_verification_failed', 'hash_mismatch_detected',
      'signature_mismatch_detected', 'proof_revoked', 'proof_expired', 'verification_link_created',
      'verification_link_expiring', 'verification_link_expired', 'qr_code_ready', 'unusual_download_activity',
      'system_alert', 'other'
    )),
  constraint admin_security_proof_notification_events_severity_check
    check (severity in ('info', 'notice', 'warning', 'critical')),
  constraint admin_security_proof_notification_events_title_check
    check (length(trim(title)) > 0)
);

create index if not exists admin_security_proof_notification_events_status_idx
  on admin_security_proof_notification_events (status, occurred_at desc);
create index if not exists admin_security_proof_notification_events_private_room_idx
  on admin_security_proof_notification_events (private_room_id, occurred_at desc);
create index if not exists admin_security_proof_notification_events_customer_idx
  on admin_security_proof_notification_events (customer_name, customer_domain, occurred_at desc);
create index if not exists admin_security_proof_notification_events_type_idx
  on admin_security_proof_notification_events (event_type, severity, occurred_at desc);
create index if not exists admin_security_proof_notification_events_source_idx
  on admin_security_proof_notification_events (source_type, source_id);

create table if not exists admin_security_proof_digest_runs (
  id uuid primary key default gen_random_uuid(),
  digest_run_key text not null unique,
  status text not null default 'pending',
  subscription_id uuid not null references admin_security_proof_digest_subscriptions(id) on delete cascade,
  recipient_email text not null,
  recipient_display_name text,
  recipient_type text not null,
  digest_scope text not null,
  digest_frequency text not null,
  digest_channel text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  title text not null,
  summary text,
  event_count integer not null default 0,
  critical_count integer not null default 0,
  warning_count integer not null default 0,
  info_count integer not null default 0,
  digest_payload jsonb not null default '{}'::jsonb,
  digest_html text,
  digest_text text,
  digest_hash_sha256 text,
  payload_bytes bigint,
  delivery_status text not null default 'not_sent',
  delivery_provider text,
  delivery_reference text,
  delivered_at timestamptz,
  failed_at timestamptz,
  last_error text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_proof_digest_runs_status_check
    check (status in ('pending', 'building', 'ready', 'sent', 'failed', 'cancelled', 'archived')),
  constraint admin_security_proof_digest_runs_delivery_status_check
    check (delivery_status in ('not_sent', 'queued', 'sent', 'delivered', 'failed', 'suppressed')),
  constraint admin_security_proof_digest_runs_period_check
    check (period_end > period_start),
  constraint admin_security_proof_digest_runs_title_check
    check (length(trim(title)) > 0)
);

create index if not exists admin_security_proof_digest_runs_subscription_idx
  on admin_security_proof_digest_runs (subscription_id, created_at desc);
create index if not exists admin_security_proof_digest_runs_status_idx
  on admin_security_proof_digest_runs (status, created_at);
create index if not exists admin_security_proof_digest_runs_delivery_idx
  on admin_security_proof_digest_runs (delivery_status, created_at);

drop trigger if exists admin_security_proof_digest_runs_set_updated_at
on admin_security_proof_digest_runs;
create trigger admin_security_proof_digest_runs_set_updated_at
before update on admin_security_proof_digest_runs
for each row
execute function set_updated_at();

create table if not exists admin_security_proof_digest_items (
  id uuid primary key default gen_random_uuid(),
  digest_run_id uuid not null references admin_security_proof_digest_runs(id) on delete cascade,
  notification_event_id uuid not null references admin_security_proof_notification_events(id) on delete cascade,
  item_key text not null,
  item_type text not null,
  severity text not null,
  title text not null,
  summary text,
  source_type text not null,
  source_id uuid,
  source_key text,
  proof_type text,
  proof_key text,
  proof_hash_sha256 text,
  related_url text,
  occurred_at timestamptz not null,
  content_json jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (digest_run_id, notification_event_id),
  unique (digest_run_id, item_key),
  constraint admin_security_proof_digest_items_severity_check
    check (severity in ('info', 'notice', 'warning', 'critical')),
  constraint admin_security_proof_digest_items_title_check
    check (length(trim(title)) > 0)
);

create index if not exists admin_security_proof_digest_items_run_idx
  on admin_security_proof_digest_items (digest_run_id, sort_order);
create index if not exists admin_security_proof_digest_items_event_idx
  on admin_security_proof_digest_items (notification_event_id);

create or replace function upsert_private_room_proof_digest_subscription(
  p_auth_user_id uuid,
  p_private_room_key text,
  p_recipient_email text,
  p_recipient_display_name text default null,
  p_digest_frequency text default 'daily',
  p_digest_channel text default 'email',
  p_timezone text default 'UTC',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_participant admin_security_private_trust_room_participants%rowtype;
  v_room admin_security_private_trust_rooms%rowtype;
  v_subscription_id uuid;
  v_key text;
  v_next timestamptz;
begin
  v_participant := get_active_private_trust_room_participant(
    p_auth_user_id,
    p_private_room_key
  );

  select *
  into v_room
  from admin_security_private_trust_rooms
  where id = v_participant.private_room_id;

  v_key := 'proof_digest_subscription:private_room:' || v_room.private_room_key || ':' || lower(trim(p_recipient_email));
  v_next :=
    case
      when p_digest_frequency = 'immediate' then now()
      when p_digest_frequency = 'hourly' then date_trunc('hour', now()) + interval '1 hour'
      when p_digest_frequency = 'weekly' then date_trunc('week', now()) + interval '1 week'
      when p_digest_frequency = 'manual' then null
      else date_trunc('day', now()) + interval '1 day'
    end;

  insert into admin_security_proof_digest_subscriptions (
    subscription_key, status, subscription_scope, recipient_type, recipient_auth_user_id,
    recipient_email, recipient_display_name, customer_name, customer_domain, private_room_id,
    private_room_participant_id, digest_frequency, digest_channel, timezone, next_digest_at,
    request_id, metadata
  )
  values (
    v_key, 'active', 'private_room', 'customer', p_auth_user_id, lower(trim(p_recipient_email)),
    coalesce(p_recipient_display_name, v_participant.display_name), v_room.customer_name, v_room.customer_domain,
    v_room.id, v_participant.id, coalesce(p_digest_frequency, 'daily'), coalesce(p_digest_channel, 'email'),
    coalesce(p_timezone, 'UTC'), v_next, p_request_id, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (subscription_key)
  do update set
    status = 'active',
    recipient_display_name = excluded.recipient_display_name,
    digest_frequency = excluded.digest_frequency,
    digest_channel = excluded.digest_channel,
    timezone = excluded.timezone,
    next_digest_at = excluded.next_digest_at,
    metadata = admin_security_proof_digest_subscriptions.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_subscription_id;

  return v_subscription_id;
end;
$$;

create or replace function upsert_admin_proof_digest_subscription(
  p_admin_auth_user_id uuid,
  p_recipient_email text,
  p_recipient_display_name text default null,
  p_digest_frequency text default 'daily',
  p_digest_channel text default 'email',
  p_timezone text default 'UTC',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_subscription_id uuid;
  v_key text;
  v_next timestamptz;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.read') is not true then
    raise exception 'missing required permission: admin.read';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);
  v_key := 'proof_digest_subscription:global_admin:' || lower(trim(p_recipient_email));
  v_next :=
    case
      when p_digest_frequency = 'immediate' then now()
      when p_digest_frequency = 'hourly' then date_trunc('hour', now()) + interval '1 hour'
      when p_digest_frequency = 'weekly' then date_trunc('week', now()) + interval '1 week'
      when p_digest_frequency = 'manual' then null
      else date_trunc('day', now()) + interval '1 day'
    end;

  insert into admin_security_proof_digest_subscriptions (
    subscription_key, status, subscription_scope, recipient_type, recipient_auth_user_id,
    recipient_admin_user_id, recipient_email, recipient_display_name, digest_frequency, digest_channel,
    timezone, next_digest_at, request_id, metadata
  )
  values (
    v_key, 'active', 'global_admin', 'admin', p_admin_auth_user_id, v_admin.id, lower(trim(p_recipient_email)),
    coalesce(p_recipient_display_name, v_admin.display_name), coalesce(p_digest_frequency, 'daily'),
    coalesce(p_digest_channel, 'email'), coalesce(p_timezone, 'UTC'), v_next, p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (subscription_key)
  do update set
    status = 'active',
    recipient_display_name = excluded.recipient_display_name,
    digest_frequency = excluded.digest_frequency,
    digest_channel = excluded.digest_channel,
    timezone = excluded.timezone,
    next_digest_at = excluded.next_digest_at,
    metadata = admin_security_proof_digest_subscriptions.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_subscription_id;

  return v_subscription_id;
end;
$$;

create or replace function record_admin_security_proof_notification_event(
  p_event_scope text,
  p_event_type text,
  p_severity text,
  p_title text,
  p_summary text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_private_room_id uuid default null,
  p_private_room_participant_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_source_type text default 'system',
  p_source_id uuid default null,
  p_source_key text default null,
  p_proof_type text default null,
  p_proof_key text default null,
  p_proof_hash_sha256 text default null,
  p_related_url text default null,
  p_occurred_at timestamptz default now(),
  p_dedupe_key text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event_id uuid;
  v_event_key text;
  v_dedupe text;
begin
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'proof notification event title is required';
  end if;

  v_event_key := 'proof_notification_event:' || p_event_type || ':' || substr(encode(gen_random_bytes(12), 'hex'), 1, 24);
  v_dedupe := coalesce(
    p_dedupe_key,
    p_event_type || ':' || coalesce(p_source_type, '') || ':' || coalesce(p_source_id::text, '') || ':' ||
    coalesce(p_source_key, '') || ':' || date_trunc('hour', coalesce(p_occurred_at, now()))::text
  );

  insert into admin_security_proof_notification_events (
    notification_event_key, status, event_scope, event_type, severity, title, summary, customer_name, customer_domain,
    private_room_id, private_room_participant_id, auditor_portal_id, enterprise_review_room_id, source_type, source_id, source_key,
    proof_type, proof_key, proof_hash_sha256, related_url, occurred_at, dedupe_key, request_id, metadata
  )
  values (
    v_event_key, 'pending', p_event_scope, p_event_type, coalesce(p_severity, 'info'), p_title, p_summary, p_customer_name, p_customer_domain,
    p_private_room_id, p_private_room_participant_id, p_auditor_portal_id, p_enterprise_review_room_id, coalesce(p_source_type, 'system'),
    p_source_id, p_source_key, p_proof_type, p_proof_key, p_proof_hash_sha256, p_related_url, coalesce(p_occurred_at, now()),
    v_dedupe, p_request_id, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (dedupe_key)
  do update set
    summary = coalesce(excluded.summary, admin_security_proof_notification_events.summary),
    metadata = admin_security_proof_notification_events.metadata || excluded.metadata
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function sync_admin_security_proof_notification_events(
  p_batch_size integer default 1000,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_row record;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_row in
    select *
    from admin_security_trust_proof_reports r
    where r.status = 'ready'
      and r.generated_at >= now() - interval '7 days'
    order by r.generated_at desc
    limit p_batch_size
  loop
    perform record_admin_security_proof_notification_event(
      case when v_row.private_room_id is not null then 'private_room' else 'global_admin' end,
      'report_ready',
      'notice',
      'Trust proof report ready',
      v_row.title,
      v_row.customer_name,
      v_row.customer_domain,
      v_row.private_room_id,
      v_row.private_room_participant_id,
      v_row.auditor_portal_id,
      v_row.enterprise_review_room_id,
      'admin_security_trust_proof_report',
      v_row.id,
      v_row.report_key,
      'trust_proof_report',
      v_row.report_key,
      v_row.report_hash_sha256,
      null,
      v_row.generated_at,
      'report_ready:' || v_row.id::text,
      null,
      jsonb_build_object('sync_run_id', v_run_id, 'worker_id', p_worker_id)
    );
  end loop;

  for v_row in
    select *
    from admin_security_public_verification_result_dashboard r
    where r.created_at >= now() - interval '7 days'
      and (
        r.verification_status = 'failed'
        or r.hash_match is false
        or r.signature_match is false
      )
    order by r.created_at desc
    limit p_batch_size
  loop
    perform record_admin_security_proof_notification_event(
      'global_admin',
      case
        when v_row.hash_match is false then 'hash_mismatch_detected'
        when v_row.signature_match is false then 'signature_mismatch_detected'
        else 'public_verification_failed'
      end,
      case
        when v_row.hash_match is false then 'critical'
        when v_row.signature_match is false then 'critical'
        else 'warning'
      end,
      'Proof verification failed',
      coalesce(v_row.failure_reason, 'Public proof verification failed.'),
      null,
      null,
      null,
      null,
      null,
      null,
      'admin_security_public_verification_result',
      v_row.admin_security_public_verification_result_id,
      v_row.result_key,
      v_row.subject_type,
      v_row.subject_key,
      null,
      null,
      v_row.created_at,
      'public_verification_failed:' || v_row.admin_security_public_verification_result_id::text,
      null,
      jsonb_build_object('sync_run_id', v_run_id, 'worker_id', p_worker_id)
    );
  end loop;

  for v_row in
    select *
    from admin_security_proof_verification_links l
    where l.status = 'active'
      and l.expires_at is not null
      and l.expires_at > now()
      and l.expires_at <= now() + interval '7 days'
    order by l.expires_at asc
    limit p_batch_size
  loop
    perform record_admin_security_proof_notification_event(
      case when v_row.private_room_id is not null then 'private_room' else 'global_admin' end,
      'verification_link_expiring',
      'warning',
      'Proof verification link expiring soon',
      v_row.title,
      v_row.customer_name,
      v_row.customer_domain,
      v_row.private_room_id,
      null,
      v_row.auditor_portal_id,
      v_row.enterprise_review_room_id,
      'admin_security_proof_verification_link',
      v_row.id,
      v_row.verification_link_key,
      v_row.proof_type,
      v_row.proof_key,
      v_row.proof_hash_sha256,
      v_row.verification_url,
      now(),
      'verification_link_expiring:' || v_row.id::text || ':' || date_trunc('day', now())::text,
      null,
      jsonb_build_object('expires_at', v_row.expires_at, 'sync_run_id', v_run_id, 'worker_id', p_worker_id)
    );
  end loop;

  for v_row in
    select *
    from admin_security_proof_qr_code_dashboard q
    where q.status = 'ready'
      and q.generated_at >= now() - interval '7 days'
    order by q.generated_at desc
    limit p_batch_size
  loop
    perform record_admin_security_proof_notification_event(
      'global_admin',
      'qr_code_ready',
      'info',
      'Proof QR code ready',
      v_row.title,
      null,
      null,
      null,
      null,
      null,
      null,
      'admin_security_proof_qr_code',
      v_row.admin_security_proof_qr_code_id,
      v_row.qr_code_key,
      v_row.proof_type,
      v_row.proof_key,
      v_row.image_checksum_sha256,
      v_row.image_storage_uri,
      v_row.generated_at,
      'qr_code_ready:' || v_row.admin_security_proof_qr_code_id::text,
      null,
      jsonb_build_object('sync_run_id', v_run_id, 'worker_id', p_worker_id)
    );
  end loop;

  for v_row in
    select *
    from admin_security_trust_timeline_event_dashboard e
    where e.status = 'active'
      and e.created_at >= now() - interval '7 days'
      and e.risk_level in ('warning', 'critical', 'high')
    order by e.created_at desc
    limit p_batch_size
  loop
    perform record_admin_security_proof_notification_event(
      case when v_row.private_room_id is not null then 'private_room' else 'global_admin' end,
      'timeline_event_recorded',
      case
        when v_row.risk_level in ('critical', 'high') then 'critical'
        when v_row.risk_level = 'warning' then 'warning'
        else 'info'
      end,
      v_row.title,
      v_row.summary,
      v_row.customer_name,
      v_row.customer_domain,
      v_row.private_room_id,
      null,
      v_row.auditor_portal_id,
      v_row.enterprise_review_room_id,
      'admin_security_trust_timeline_event',
      v_row.admin_security_trust_timeline_event_id,
      v_row.timeline_event_key,
      v_row.artifact_type,
      v_row.artifact_key,
      v_row.immutable_hash_sha256,
      null,
      v_row.event_time,
      'timeline_event_recorded:' || v_row.admin_security_trust_timeline_event_id::text,
      null,
      jsonb_build_object('sync_run_id', v_run_id, 'worker_id', p_worker_id)
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function claim_admin_security_proof_digest_subscriptions(
  p_batch_size integer default 100,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  subscription_id uuid,
  subscription_key text,
  subscription_scope text,
  recipient_type text,
  recipient_email text,
  recipient_display_name text,
  digest_frequency text,
  digest_channel text,
  period_start timestamptz,
  period_end timestamptz,
  private_room_id uuid,
  customer_name text,
  customer_domain text
)
language plpgsql
as $$
begin
  if p_batch_size <= 0 or p_batch_size > 500 then
    raise exception 'batch size must be between 1 and 500';
  end if;

  return query
  with due as (
    select s.id
    from admin_security_proof_digest_subscriptions s
    where s.status = 'active'
      and s.digest_frequency <> 'manual'
      and s.next_digest_at is not null
      and s.next_digest_at <= now()
      and (s.muted_until is null or s.muted_until <= now())
    order by s.next_digest_at asc
    limit p_batch_size
    for update skip locked
  ),
  claimed as (
    update admin_security_proof_digest_subscriptions s
    set
      status = 'active',
      metadata = s.metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'claimed_by_worker', p_worker_id, 'claimed_at', now()
      ),
      updated_at = now()
    from due
    where s.id = due.id
    returning s.*
  )
  select
    c.id,
    c.subscription_key,
    c.subscription_scope,
    c.recipient_type,
    c.recipient_email,
    c.recipient_display_name,
    c.digest_frequency,
    c.digest_channel,
    coalesce(c.last_digest_at, c.created_at),
    now(),
    c.private_room_id,
    c.customer_name,
    c.customer_domain
  from claimed c;
end;
$$;

create or replace function build_admin_security_proof_digest_run(
  p_subscription_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_sub admin_security_proof_digest_subscriptions%rowtype;
  v_run_id uuid;
  v_run_key text;
  v_event_count integer := 0;
  v_critical_count integer := 0;
  v_warning_count integer := 0;
  v_info_count integer := 0;
  v_payload jsonb;
  v_html text;
  v_text text;
  v_hash text;
  v_bytes bigint;
begin
  select * into v_sub
  from admin_security_proof_digest_subscriptions
  where id = p_subscription_id
  for update;

  if v_sub.id is null then
    raise exception 'proof digest subscription not found: %', p_subscription_id;
  end if;

  if v_sub.status <> 'active' then
    raise exception 'proof digest subscription is not active: %', v_sub.status;
  end if;

  v_run_key := 'proof_digest_run:' || v_sub.subscription_key || ':' || substr(encode(gen_random_bytes(10), 'hex'), 1, 20);

  insert into admin_security_proof_digest_runs (
    digest_run_key, status, subscription_id, recipient_email, recipient_display_name, recipient_type,
    digest_scope, digest_frequency, digest_channel, period_start, period_end, title, summary, request_id, metadata
  )
  values (
    v_run_key, 'building', v_sub.id, v_sub.recipient_email, v_sub.recipient_display_name, v_sub.recipient_type,
    v_sub.subscription_scope, v_sub.digest_frequency, v_sub.digest_channel, p_period_start, p_period_end,
    'Trust proof digest', 'Summary of proof activity and alerts.', p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('worker_id', p_worker_id)
  )
  returning id into v_run_id;

  insert into admin_security_proof_digest_items (
    digest_run_id, notification_event_id, item_key, item_type, severity, title, summary, source_type, source_id, source_key,
    proof_type, proof_key, proof_hash_sha256, related_url, occurred_at, content_json, sort_order, metadata
  )
  select
    v_run_id,
    e.id,
    'proof_digest_item:' || e.notification_event_key,
    e.event_type,
    e.severity,
    e.title,
    e.summary,
    e.source_type,
    e.source_id,
    e.source_key,
    e.proof_type,
    e.proof_key,
    e.proof_hash_sha256,
    e.related_url,
    e.occurred_at,
    jsonb_build_object(
      'eventKey', e.notification_event_key,
      'eventType', e.event_type,
      'severity', e.severity,
      'proofType', e.proof_type,
      'proofKey', e.proof_key,
      'sourceType', e.source_type,
      'sourceKey', e.source_key
    ),
    row_number() over (
      order by
        case e.severity
          when 'critical' then 1
          when 'warning' then 2
          when 'notice' then 3
          else 4
        end,
        e.occurred_at desc
    )::integer,
    '{}'::jsonb
  from admin_security_proof_notification_events e
  where e.status = 'pending'
    and e.occurred_at >= p_period_start
    and e.occurred_at < p_period_end
    and (
      v_sub.subscription_scope = 'global_admin'
      or (v_sub.subscription_scope = 'private_room' and e.private_room_id = v_sub.private_room_id)
      or (v_sub.subscription_scope = 'customer' and e.customer_name = v_sub.customer_name)
      or (v_sub.subscription_scope = 'auditor_portal' and e.auditor_portal_id = v_sub.auditor_portal_id)
      or (v_sub.subscription_scope = 'enterprise_review_room' and e.enterprise_review_room_id = v_sub.enterprise_review_room_id)
    )
    and (
      (v_sub.include_reports is true and e.event_type = 'report_ready')
      or (v_sub.include_qr_links is true and e.event_type in ('verification_link_created', 'verification_link_expiring', 'verification_link_expired', 'qr_code_ready'))
      or (v_sub.include_public_verification is true and e.event_type in ('public_verification_verified', 'public_verification_failed', 'hash_mismatch_detected', 'signature_mismatch_detected'))
      or (v_sub.include_timeline is true and e.event_type = 'timeline_event_recorded')
      or (v_sub.include_crypto is true and e.event_type in ('crypto_checkpoint_created', 'merkle_batch_ready', 'anchor_created'))
      or (v_sub.include_downloads is true and e.event_type in ('download_completed', 'unusual_download_activity'))
      or (v_sub.include_artifacts is true and e.event_type = 'artifact_ready')
      or (v_sub.include_answers is true and e.event_type = 'answer_generated')
      or (v_sub.include_receipts is true and e.event_type = 'receipt_created')
      or e.severity in ('critical', 'warning')
    );

  get diagnostics v_event_count = row_count;

  select
    count(*) filter (where severity = 'critical'),
    count(*) filter (where severity = 'warning'),
    count(*) filter (where severity in ('info', 'notice'))
  into
    v_critical_count,
    v_warning_count,
    v_info_count
  from admin_security_proof_digest_items
  where digest_run_id = v_run_id;

  select jsonb_build_object(
    'schemaVersion', 'proof-digest-v1',
    'digestRunKey', v_run_key,
    'subscriptionKey', v_sub.subscription_key,
    'recipientEmail', v_sub.recipient_email,
    'scope', v_sub.subscription_scope,
    'periodStart', p_period_start,
    'periodEnd', p_period_end,
    'counts', jsonb_build_object(
      'total', v_event_count,
      'critical', coalesce(v_critical_count, 0),
      'warning', coalesce(v_warning_count, 0),
      'info', coalesce(v_info_count, 0)
    ),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'itemType', item_type,
            'severity', severity,
            'title', title,
            'summary', summary,
            'sourceType', source_type,
            'sourceKey', source_key,
            'proofType', proof_type,
            'proofKey', proof_key,
            'proofHashSha256', proof_hash_sha256,
            'relatedUrl', related_url,
            'occurredAt', occurred_at
          )
          order by sort_order asc
        )
        from admin_security_proof_digest_items
        where digest_run_id = v_run_id
      ),
      '[]'::jsonb
    )
  )
  into v_payload;

  v_text :=
    'Trust proof digest' || chr(10) ||
    'Period: ' || p_period_start::text || ' to ' || p_period_end::text || chr(10) ||
    'Total events: ' || v_event_count::text || chr(10) ||
    'Critical: ' || coalesce(v_critical_count, 0)::text || chr(10) ||
    'Warnings: ' || coalesce(v_warning_count, 0)::text || chr(10);

  v_html :=
    '<h1>Trust proof digest</h1>' ||
    '<p>Period: ' || p_period_start::text || ' to ' || p_period_end::text || '</p>' ||
    '<p>Total events: ' || v_event_count::text || '</p>' ||
    '<p>Critical: ' || coalesce(v_critical_count, 0)::text || '</p>' ||
    '<p>Warnings: ' || coalesce(v_warning_count, 0)::text || '</p>';

  v_hash := encode(digest(v_payload::text, 'sha256'), 'hex');
  v_bytes := length(v_payload::text::bytea);

  update admin_security_proof_digest_runs
  set
    status = case when v_event_count = 0 then 'cancelled' else 'ready' end,
    event_count = v_event_count,
    critical_count = coalesce(v_critical_count, 0),
    warning_count = coalesce(v_warning_count, 0),
    info_count = coalesce(v_info_count, 0),
    digest_payload = v_payload,
    digest_html = v_html,
    digest_text = v_text,
    digest_hash_sha256 = v_hash,
    payload_bytes = v_bytes,
    delivery_status = case when v_event_count = 0 then 'suppressed' else 'queued' end,
    updated_at = now()
  where id = v_run_id;

  update admin_security_proof_notification_events
  set status = 'included'
  where id in (
    select notification_event_id
    from admin_security_proof_digest_items
    where digest_run_id = v_run_id
  );

  update admin_security_proof_digest_subscriptions
  set
    last_digest_at = p_period_end,
    next_digest_at = case
      when digest_frequency = 'immediate' then now() + interval '5 minutes'
      when digest_frequency = 'hourly' then date_trunc('hour', now()) + interval '1 hour'
      when digest_frequency = 'weekly' then date_trunc('week', now()) + interval '1 week'
      when digest_frequency = 'manual' then null
      else date_trunc('day', now()) + interval '1 day'
    end,
    updated_at = now()
  where id = v_sub.id;

  return v_run_id;
exception
  when others then
    update admin_security_proof_digest_runs
    set
      status = 'failed',
      delivery_status = 'failed',
      failed_at = now(),
      last_error = sqlerrm,
      updated_at = now()
    where id = v_run_id;
    raise;
end;
$$;

create or replace function mark_admin_security_proof_digest_delivered(
  p_digest_run_id uuid,
  p_delivery_provider text,
  p_delivery_reference text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run admin_security_proof_digest_runs%rowtype;
begin
  select * into v_run
  from admin_security_proof_digest_runs
  where id = p_digest_run_id
  for update;

  if v_run.id is null then
    raise exception 'proof digest run not found: %', p_digest_run_id;
  end if;

  if v_run.status <> 'ready' then
    raise exception 'proof digest run is not ready: %', v_run.status;
  end if;

  update admin_security_proof_digest_runs
  set
    status = 'sent',
    delivery_status = 'sent',
    delivery_provider = p_delivery_provider,
    delivery_reference = p_delivery_reference,
    delivered_at = now(),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('delivered_by_worker', p_worker_id),
    updated_at = now()
  where id = v_run.id;

  update admin_security_proof_notification_events
  set status = 'sent'
  where id in (
    select notification_event_id
    from admin_security_proof_digest_items
    where digest_run_id = v_run.id
  );

  return v_run.id;
end;
$$;

create or replace function fail_admin_security_proof_digest_delivery(
  p_digest_run_id uuid,
  p_error text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'proof digest delivery error is required';
  end if;

  update admin_security_proof_digest_runs
  set
    status = 'failed',
    delivery_status = 'failed',
    failed_at = now(),
    last_error = p_error,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('failed_by_worker', p_worker_id),
    updated_at = now()
  where id = p_digest_run_id;

  if not found then
    raise exception 'proof digest run not found: %', p_digest_run_id;
  end if;

  return p_digest_run_id;
end;
$$;

create or replace function process_due_admin_security_proof_digests(
  p_batch_size integer default 100,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_sync_run_id uuid;
  v_claimed integer := 0;
  v_built integer := 0;
  v_row record;
  v_run_id uuid;
begin
  v_sync_run_id := sync_admin_security_proof_notification_events(1000, p_worker_id, coalesce(p_metadata, '{}'::jsonb));

  for v_row in
    select *
    from claim_admin_security_proof_digest_subscriptions(
      p_batch_size,
      p_worker_id,
      coalesce(p_metadata, '{}'::jsonb)
    )
  loop
    v_claimed := v_claimed + 1;
    v_run_id := build_admin_security_proof_digest_run(
      v_row.subscription_id,
      v_row.period_start,
      v_row.period_end,
      p_worker_id,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('sync_run_id', v_sync_run_id)
    );
    v_built := v_built + 1;
  end loop;

  return jsonb_build_object(
    'syncRunId', v_sync_run_id,
    'claimed', v_claimed,
    'built', v_built
  );
end;
$$;

create or replace function expire_admin_security_proof_notification_events(
  p_batch_size integer default 5000,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
begin
  if p_batch_size <= 0 or p_batch_size > 10000 then
    raise exception 'batch size must be between 1 and 10000';
  end if;

  update admin_security_proof_notification_events
  set
    status = 'expired',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'expired_by_worker', p_worker_id,
      'notification_event_expiry_run_id', v_run_id
    )
  where id in (
    select id
    from admin_security_proof_notification_events
    where status in ('pending', 'included')
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  return v_run_id;
end;
$$;

create or replace view admin_security_proof_digest_subscription_dashboard as
select
  s.id as admin_security_proof_digest_subscription_id,
  s.subscription_key,
  s.status,
  s.subscription_scope,
  s.recipient_type,
  s.recipient_auth_user_id,
  s.recipient_admin_user_id,
  au.email as admin_email,
  s.recipient_email,
  s.recipient_display_name,
  s.customer_name,
  s.customer_domain,
  s.private_room_id,
  pr.private_room_key,
  s.private_room_participant_id,
  prp.email as private_room_participant_email,
  s.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  s.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  s.digest_frequency,
  s.digest_channel,
  s.timezone,
  s.include_artifacts,
  s.include_answers,
  s.include_receipts,
  s.include_reports,
  s.include_downloads,
  s.include_timeline,
  s.include_crypto,
  s.include_public_verification,
  s.include_qr_links,
  s.alert_on_failed_verification,
  s.alert_on_hash_mismatch,
  s.alert_on_revoked_proof,
  s.alert_on_expiring_link,
  s.alert_on_report_ready,
  s.alert_on_unusual_download_activity,
  s.last_digest_at,
  s.next_digest_at,
  s.muted_until,
  (
    select count(*)
    from admin_security_proof_digest_runs r
    where r.subscription_id = s.id
  ) as digest_run_count,
  s.created_at,
  s.updated_at,
  s.metadata
from admin_security_proof_digest_subscriptions s
left join admin_users au on au.id = s.recipient_admin_user_id
left join admin_security_private_trust_rooms pr on pr.id = s.private_room_id
left join admin_security_private_trust_room_participants prp on prp.id = s.private_room_participant_id
left join admin_security_auditor_portals ap on ap.id = s.auditor_portal_id
left join admin_security_enterprise_review_rooms er on er.id = s.enterprise_review_room_id
order by s.created_at desc;

create or replace view admin_security_proof_notification_event_dashboard as
select
  e.id as admin_security_proof_notification_event_id,
  e.notification_event_key,
  e.status,
  e.event_scope,
  e.event_type,
  e.severity,
  e.title,
  e.summary,
  e.customer_name,
  e.customer_domain,
  e.private_room_id,
  pr.private_room_key,
  e.private_room_participant_id,
  prp.email as private_room_participant_email,
  e.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  e.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  e.source_type,
  e.source_id,
  e.source_key,
  e.proof_type,
  e.proof_key,
  e.proof_hash_sha256,
  e.related_url,
  e.occurred_at,
  e.dedupe_key,
  e.expires_at,
  e.created_at,
  e.metadata
from admin_security_proof_notification_events e
left join admin_security_private_trust_rooms pr on pr.id = e.private_room_id
left join admin_security_private_trust_room_participants prp on prp.id = e.private_room_participant_id
left join admin_security_auditor_portals ap on ap.id = e.auditor_portal_id
left join admin_security_enterprise_review_rooms er on er.id = e.enterprise_review_room_id
order by e.occurred_at desc;

create or replace view admin_security_proof_digest_run_dashboard as
select
  r.id as admin_security_proof_digest_run_id,
  r.digest_run_key,
  r.status,
  r.subscription_id,
  s.subscription_key,
  r.recipient_email,
  r.recipient_display_name,
  r.recipient_type,
  r.digest_scope,
  r.digest_frequency,
  r.digest_channel,
  r.period_start,
  r.period_end,
  r.title,
  r.summary,
  r.event_count,
  r.critical_count,
  r.warning_count,
  r.info_count,
  r.digest_hash_sha256,
  r.payload_bytes,
  r.delivery_status,
  r.delivery_provider,
  r.delivery_reference,
  r.delivered_at,
  r.failed_at,
  r.last_error,
  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_proof_digest_runs r
join admin_security_proof_digest_subscriptions s on s.id = r.subscription_id
order by r.created_at desc;

create or replace view admin_security_proof_digest_item_dashboard as
select
  i.id as admin_security_proof_digest_item_id,
  i.digest_run_id,
  r.digest_run_key,
  i.notification_event_id,
  e.notification_event_key,
  i.item_key,
  i.item_type,
  i.severity,
  i.title,
  i.summary,
  i.source_type,
  i.source_id,
  i.source_key,
  i.proof_type,
  i.proof_key,
  i.proof_hash_sha256,
  i.related_url,
  i.occurred_at,
  i.sort_order,
  i.created_at,
  i.metadata
from admin_security_proof_digest_items i
join admin_security_proof_digest_runs r on r.id = i.digest_run_id
join admin_security_proof_notification_events e on e.id = i.notification_event_id
order by i.created_at desc;

create or replace view admin_security_proof_digest_integrity as
select
  (
    select count(*)
    from admin_security_proof_digest_subscriptions
    where status = 'active'
  ) as active_subscription_count,
  (
    select count(*)
    from admin_security_proof_digest_subscriptions
    where status = 'active'
      and next_digest_at is not null
      and next_digest_at <= now()
  ) as due_subscription_count,
  (
    select count(*)
    from admin_security_proof_notification_events
    where status = 'pending'
  ) as pending_notification_event_count,
  (
    select count(*)
    from admin_security_proof_notification_events
    where severity = 'critical'
      and status = 'pending'
  ) as pending_critical_event_count,
  (
    select count(*)
    from admin_security_proof_digest_runs
    where status = 'ready'
      and delivery_status = 'queued'
  ) as queued_digest_count,
  (
    select count(*)
    from admin_security_proof_digest_runs
    where status = 'failed'
      and created_at >= now() - interval '1 hour'
  ) as failed_digest_count_1h,
  (
    select count(*)
    from admin_security_proof_digest_runs
    where status = 'sent'
      and delivered_at >= now() - interval '24 hours'
  ) as sent_digest_count_24h,
  now() as checked_at;

grant select on admin_security_proof_digest_subscription_dashboard to admin_api_role;
grant select on admin_security_proof_notification_event_dashboard to admin_api_role;
grant select on admin_security_proof_digest_run_dashboard to admin_api_role;
grant select on admin_security_proof_digest_item_dashboard to admin_api_role;
grant select on admin_security_proof_digest_integrity to admin_api_role;

insert into scheduled_jobs (
  job_key, job_name, job_group, enabled, schedule_cron, function_name, function_args,
  max_runtime_seconds, lock_ttl_seconds, metadata
)
values
  (
    'admin_security_proof_digest_process_every_15m',
    'Process proof digests',
    'admin',
    true,
    '*/15 * * * *',
    'process_due_admin_security_proof_digests',
    '{"batch_size": 100}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
  ),
  (
    'admin_security_proof_notification_event_expiry_daily',
    'Expire proof notification events',
    'admin',
    true,
    '15 3 * * *',
    'expire_admin_security_proof_notification_events',
    '{"batch_size": 5000}'::jsonb,
    300,
    600,
    '{"priority": "low"}'::jsonb
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
  v_json_result jsonb;
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

  v_lock_acquired := acquire_scheduled_job_lock(v_job.job_key, p_locked_by, v_job.lock_ttl_seconds, p_metadata);

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

  insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, started_at, metadata)
  values (v_job.id, v_job.job_key, v_job.job_group, 'started', v_started_at, p_metadata)
  returning id into v_run_id;

  update scheduled_jobs
  set last_started_at = v_started_at, last_status = 'started', last_run_id = v_run_id, updated_at = now()
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

  elsif v_job.function_name = 'expire_admin_security_evidence_answer_sessions' then
    v_uuid_result := expire_admin_security_evidence_answer_sessions(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'expire_admin_security_answer_receipt_export_bundles' then
    v_uuid_result := expire_admin_security_answer_receipt_export_bundles(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_due_admin_security_proof_digests' then
    v_json_result := process_due_admin_security_proof_digests(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := v_json_result;

  elsif v_job.function_name = 'expire_admin_security_proof_notification_events' then
    v_uuid_result := expire_admin_security_proof_notification_events(
      coalesce((v_job.function_args->>'batch_size')::integer, 5000),
      'scheduled-job',
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

alter table admin_security_proof_digest_subscriptions enable row level security;
alter table admin_security_proof_notification_events enable row level security;
alter table admin_security_proof_digest_runs enable row level security;
alter table admin_security_proof_digest_items enable row level security;

create policy admin_security_proof_digest_subscriptions_no_user_direct_access
on admin_security_proof_digest_subscriptions
for all
to authenticated
using (false)
with check (false);

create policy admin_security_proof_notification_events_no_user_direct_access
on admin_security_proof_notification_events
for all
to authenticated
using (false)
with check (false);

create policy admin_security_proof_digest_runs_no_user_direct_access
on admin_security_proof_digest_runs
for all
to authenticated
using (false)
with check (false);

create policy admin_security_proof_digest_items_no_user_direct_access
on admin_security_proof_digest_items
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_proof_digest_subscriptions
on admin_security_proof_digest_subscriptions
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_proof_notification_events
on admin_security_proof_notification_events
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_proof_digest_runs
on admin_security_proof_digest_runs
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_proof_digest_items
on admin_security_proof_digest_items
for all
to admin_api_role
using (true)
with check (true);

create policy worker_all_proof_digest_subscriptions
on admin_security_proof_digest_subscriptions
for all
to worker_role
using (true)
with check (true);

create policy worker_all_proof_notification_events
on admin_security_proof_notification_events
for all
to worker_role
using (true)
with check (true);

create policy worker_all_proof_digest_runs
on admin_security_proof_digest_runs
for all
to worker_role
using (true)
with check (true);

create policy worker_all_proof_digest_items
on admin_security_proof_digest_items
for all
to worker_role
using (true)
with check (true);

grant execute on function upsert_private_room_proof_digest_subscription(
  uuid, text, text, text, text, text, text, text, jsonb
) to admin_api_role;

grant execute on function upsert_admin_proof_digest_subscription(
  uuid, text, text, text, text, text, text, jsonb
) to admin_api_role;

grant execute on function record_admin_security_proof_notification_event(
  text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, text, uuid, text, text, text, text, text, timestamptz, text, text, jsonb
) to admin_api_role, worker_role;

grant execute on function sync_admin_security_proof_notification_events(integer, text, jsonb)
to admin_api_role, worker_role;

grant execute on function claim_admin_security_proof_digest_subscriptions(integer, text, jsonb)
to worker_role, admin_api_role;

grant execute on function build_admin_security_proof_digest_run(
  uuid, timestamptz, timestamptz, text, text, jsonb
) to worker_role, admin_api_role;

grant execute on function mark_admin_security_proof_digest_delivered(uuid, text, text, text, jsonb)
to worker_role, admin_api_role;

grant execute on function fail_admin_security_proof_digest_delivery(uuid, text, text, jsonb)
to worker_role, admin_api_role;

grant execute on function process_due_admin_security_proof_digests(integer, text, text, jsonb)
to worker_role, admin_api_role;

grant execute on function expire_admin_security_proof_notification_events(integer, text, jsonb)
to worker_role, admin_api_role;

alter function upsert_private_room_proof_digest_subscription(
  uuid, text, text, text, text, text, text, text, jsonb
) security definer;
alter function upsert_private_room_proof_digest_subscription(
  uuid, text, text, text, text, text, text, text, jsonb
) set search_path = public;

alter function upsert_admin_proof_digest_subscription(
  uuid, text, text, text, text, text, text, jsonb
) security definer;
alter function upsert_admin_proof_digest_subscription(
  uuid, text, text, text, text, text, text, jsonb
) set search_path = public;

alter function record_admin_security_proof_notification_event(
  text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, text, uuid, text, text, text, text, text, timestamptz, text, text, jsonb
) security definer;
alter function record_admin_security_proof_notification_event(
  text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, text, uuid, text, text, text, text, text, timestamptz, text, text, jsonb
) set search_path = public;

alter function sync_admin_security_proof_notification_events(integer, text, jsonb) security definer;
alter function sync_admin_security_proof_notification_events(integer, text, jsonb) set search_path = public;

alter function claim_admin_security_proof_digest_subscriptions(integer, text, jsonb) security definer;
alter function claim_admin_security_proof_digest_subscriptions(integer, text, jsonb) set search_path = public;

alter function build_admin_security_proof_digest_run(uuid, timestamptz, timestamptz, text, text, jsonb) security definer;
alter function build_admin_security_proof_digest_run(uuid, timestamptz, timestamptz, text, text, jsonb) set search_path = public;

alter function mark_admin_security_proof_digest_delivered(uuid, text, text, text, jsonb) security definer;
alter function mark_admin_security_proof_digest_delivered(uuid, text, text, text, jsonb) set search_path = public;

alter function fail_admin_security_proof_digest_delivery(uuid, text, text, jsonb) security definer;
alter function fail_admin_security_proof_digest_delivery(uuid, text, text, jsonb) set search_path = public;

alter function process_due_admin_security_proof_digests(integer, text, text, jsonb) security definer;
alter function process_due_admin_security_proof_digests(integer, text, text, jsonb) set search_path = public;

alter function expire_admin_security_proof_notification_events(integer, text, jsonb) security definer;
alter function expire_admin_security_proof_notification_events(integer, text, jsonb) set search_path = public;

insert into error_catalog (
  error_code, category, severity, http_status, retryable, user_visible, user_message, internal_message, owner_team
)
values
  (
    'PROOF_DIGEST_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Proof digest record not found.',
    'Proof digest record not found.',
    'platform'
  ),
  (
    'PROOF_DIGEST_INVALID_STATE',
    'validation',
    'medium',
    409,
    true,
    true,
    'Proof digest record is not in a valid state.',
    'Proof digest invalid state.',
    'platform'
  ),
  (
    'PROOF_DIGEST_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Proof digest request requires complete fields.',
    'Proof digest required fields missing.',
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
  ('proof digest subscription not found', 'PROOF_DIGEST_NOT_FOUND', 5, '{}'),
  ('proof digest run not found', 'PROOF_DIGEST_NOT_FOUND', 5, '{}'),
  ('proof digest subscription is not active', 'PROOF_DIGEST_INVALID_STATE', 5, '{}'),
  ('proof digest run is not ready', 'PROOF_DIGEST_INVALID_STATE', 5, '{}'),
  ('proof notification event title is required', 'PROOF_DIGEST_REQUIRED_FIELDS', 5, '{}'),
  ('proof digest delivery error is required', 'PROOF_DIGEST_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
