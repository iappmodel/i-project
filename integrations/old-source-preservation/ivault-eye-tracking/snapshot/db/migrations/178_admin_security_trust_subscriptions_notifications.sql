-- Step 9.63 — Build customer trust subscriptions and notifications.
-- Runs after 177_admin_security_trust_artifact_dependency_graph.sql.

create table if not exists admin_security_trust_notification_subscribers (
  id uuid primary key default gen_random_uuid(),
  subscriber_key text not null unique,
  status text not null default 'active',
  subscriber_type text not null,
  auth_user_id uuid,
  email text not null,
  display_name text,
  organization_name text,
  organization_domain text,
  customer_name text,
  customer_domain text,
  enterprise_review_room_id uuid
    references admin_security_enterprise_review_rooms(id)
    on delete set null,
  auditor_portal_id uuid
    references admin_security_auditor_portals(id)
    on delete set null,
  participant_id uuid,
  preferred_channel text not null default 'email',
  verified_at timestamptz,
  unsubscribed_at timestamptz,
  unsubscribe_reason text,
  created_by_auth_user_id uuid,
  created_by_admin_user_id uuid references admin_users(id),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, subscriber_type, enterprise_review_room_id, auditor_portal_id),
  constraint admin_security_trust_notification_subscribers_status_check
  check (
    status in (
      'active',
      'pending_verification',
      'paused',
      'unsubscribed',
      'bounced',
      'revoked',
      'archived'
    )
  ),
  constraint admin_security_trust_notification_subscribers_type_check
  check (
    subscriber_type in (
      'customer_admin',
      'customer_security',
      'auditor',
      'regulator',
      'internal_observer',
      'public_trust_subscriber',
      'other'
    )
  ),
  constraint admin_security_trust_notification_subscribers_channel_check
  check (preferred_channel in ('email', 'webhook', 'in_app', 'digest_only')),
  constraint admin_security_trust_notification_subscribers_email_check
  check (position('@' in email) > 1)
);

create index if not exists admin_security_trust_notification_subscribers_status_idx
on admin_security_trust_notification_subscribers (status, subscriber_type);
create index if not exists admin_security_trust_notification_subscribers_customer_idx
on admin_security_trust_notification_subscribers (customer_name, customer_domain);
create index if not exists admin_security_trust_notification_subscribers_room_idx
on admin_security_trust_notification_subscribers (enterprise_review_room_id, status);
create index if not exists admin_security_trust_notification_subscribers_auditor_idx
on admin_security_trust_notification_subscribers (auditor_portal_id, status);

drop trigger if exists admin_security_trust_notification_subscribers_set_updated_at
on admin_security_trust_notification_subscribers;
create trigger admin_security_trust_notification_subscribers_set_updated_at
before update on admin_security_trust_notification_subscribers
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_notification_topics (
  id uuid primary key default gen_random_uuid(),
  topic_key text not null unique,
  status text not null default 'active',
  topic_type text not null,
  visibility text not null default 'customer_scoped',
  title text not null,
  description text not null,
  default_enabled boolean not null default true,
  requires_explicit_opt_in boolean not null default false,
  severity_floor text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_trust_notification_topics_status_check
  check (status in ('active', 'disabled', 'archived')),
  constraint admin_security_trust_notification_topics_type_check
  check (
    topic_type in (
      'trust_timeline',
      'revocation',
      'expiry_warning',
      'disclosure_package',
      'auditor_packet',
      'auditor_question',
      'verification_failure',
      'retention_notice',
      'legal_hold_notice',
      'system_notice',
      'other'
    )
  ),
  constraint admin_security_trust_notification_topics_visibility_check
  check (visibility in ('public', 'customer_scoped', 'room_scoped', 'auditor_scoped', 'admin_only')),
  constraint admin_security_trust_notification_topics_severity_floor_check
  check (severity_floor in ('info', 'notice', 'warning', 'critical')),
  constraint admin_security_trust_notification_topics_title_check
  check (length(trim(title)) > 0),
  constraint admin_security_trust_notification_topics_description_check
  check (length(trim(description)) > 0)
);

create index if not exists admin_security_trust_notification_topics_status_idx
on admin_security_trust_notification_topics (status, topic_type);
drop trigger if exists admin_security_trust_notification_topics_set_updated_at
on admin_security_trust_notification_topics;
create trigger admin_security_trust_notification_topics_set_updated_at
before update on admin_security_trust_notification_topics
for each row
execute function set_updated_at();

insert into admin_security_trust_notification_topics (
  topic_key,
  status,
  topic_type,
  visibility,
  title,
  description,
  default_enabled,
  requires_explicit_opt_in,
  severity_floor,
  metadata
)
values
  (
    'trust_timeline_updates',
    'active',
    'trust_timeline',
    'customer_scoped',
    'Trust timeline updates',
    'Notifications for customer-safe trust timeline events.',
    true,
    false,
    'info',
    '{}'::jsonb
  ),
  (
    'security_artifact_revocations',
    'active',
    'revocation',
    'customer_scoped',
    'Security artifact revocations',
    'Notifications when trust artifacts are revoked or expired.',
    true,
    false,
    'warning',
    '{}'::jsonb
  ),
  (
    'disclosure_package_changes',
    'active',
    'disclosure_package',
    'customer_scoped',
    'Disclosure package changes',
    'Notifications for disclosure package publication, revocation, expiry, or supersession.',
    true,
    false,
    'notice',
    '{}'::jsonb
  ),
  (
    'auditor_packet_updates',
    'active',
    'auditor_packet',
    'auditor_scoped',
    'Auditor packet updates',
    'Notifications for auditor packet publication, manifests, downloads, and updates.',
    true,
    false,
    'info',
    '{}'::jsonb
  ),
  (
    'auditor_questions',
    'active',
    'auditor_question',
    'auditor_scoped',
    'Auditor questions',
    'Notifications for auditor questions and answers.',
    true,
    false,
    'info',
    '{}'::jsonb
  ),
  (
    'artifact_expiry_warnings',
    'active',
    'expiry_warning',
    'customer_scoped',
    'Artifact expiry warnings',
    'Warnings before customer-facing trust artifacts expire.',
    true,
    false,
    'notice',
    '{}'::jsonb
  ),
  (
    'verification_failures',
    'active',
    'verification_failure',
    'customer_scoped',
    'Verification failures',
    'Notifications for suspicious public verification failure spikes.',
    false,
    true,
    'warning',
    '{}'::jsonb
  )
on conflict (topic_key)
do update set
  status = excluded.status,
  topic_type = excluded.topic_type,
  visibility = excluded.visibility,
  title = excluded.title,
  description = excluded.description,
  default_enabled = excluded.default_enabled,
  requires_explicit_opt_in = excluded.requires_explicit_opt_in,
  severity_floor = excluded.severity_floor,
  metadata = admin_security_trust_notification_topics.metadata || excluded.metadata,
  updated_at = now();

create table if not exists admin_security_trust_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references admin_security_trust_notification_subscribers(id) on delete cascade,
  topic_id uuid not null references admin_security_trust_notification_topics(id) on delete cascade,
  status text not null default 'enabled',
  delivery_channel text not null default 'email',
  frequency text not null default 'immediate',
  min_severity text not null default 'info',
  muted_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscriber_id, topic_id),
  constraint admin_security_trust_notification_preferences_status_check
  check (status in ('enabled', 'disabled', 'muted', 'archived')),
  constraint admin_security_trust_notification_preferences_channel_check
  check (delivery_channel in ('email', 'webhook', 'in_app', 'digest_only')),
  constraint admin_security_trust_notification_preferences_frequency_check
  check (frequency in ('immediate', 'hourly_digest', 'daily_digest', 'weekly_digest', 'digest_only')),
  constraint admin_security_trust_notification_preferences_severity_check
  check (min_severity in ('info', 'notice', 'warning', 'critical'))
);

create index if not exists admin_security_trust_notification_preferences_subscriber_idx
on admin_security_trust_notification_preferences (subscriber_id, status);
create index if not exists admin_security_trust_notification_preferences_topic_idx
on admin_security_trust_notification_preferences (topic_id, status);
drop trigger if exists admin_security_trust_notification_preferences_set_updated_at
on admin_security_trust_notification_preferences;
create trigger admin_security_trust_notification_preferences_set_updated_at
before update on admin_security_trust_notification_preferences
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_notification_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  status text not null default 'queued',
  topic_id uuid references admin_security_trust_notification_topics(id) on delete set null,
  topic_key text not null,
  topic_type text not null,
  event_type text not null,
  event_severity text not null default 'info',
  visibility text not null default 'customer_scoped',
  source_type text not null,
  source_id uuid not null,
  source_artifact_key text,
  customer_name text,
  customer_domain text,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  title text not null,
  summary text not null,
  body_markdown text,
  action_url text,
  public_safe boolean not null default true,
  fanout_started_at timestamptz,
  fanout_completed_at timestamptz,
  recipient_count integer not null default 0,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_trust_notification_events_status_check
  check (status in ('queued', 'fanout_processing', 'fanout_completed', 'cancelled', 'failed', 'archived')),
  constraint admin_security_trust_notification_events_topic_type_check
  check (
    topic_type in (
      'trust_timeline',
      'revocation',
      'expiry_warning',
      'disclosure_package',
      'auditor_packet',
      'auditor_question',
      'verification_failure',
      'retention_notice',
      'legal_hold_notice',
      'system_notice',
      'other'
    )
  ),
  constraint admin_security_trust_notification_events_severity_check
  check (event_severity in ('info', 'notice', 'warning', 'critical')),
  constraint admin_security_trust_notification_events_visibility_check
  check (visibility in ('public', 'customer_scoped', 'room_scoped', 'auditor_scoped', 'admin_only')),
  constraint admin_security_trust_notification_events_title_check
  check (length(trim(title)) > 0),
  constraint admin_security_trust_notification_events_summary_check
  check (length(trim(summary)) > 0)
);

create index if not exists admin_security_trust_notification_events_status_idx
on admin_security_trust_notification_events (status, created_at);
create index if not exists admin_security_trust_notification_events_source_idx
on admin_security_trust_notification_events (source_type, source_id, created_at desc);
create index if not exists admin_security_trust_notification_events_customer_idx
on admin_security_trust_notification_events (customer_name, customer_domain, created_at desc);
create index if not exists admin_security_trust_notification_events_room_idx
on admin_security_trust_notification_events (enterprise_review_room_id, created_at desc);
create index if not exists admin_security_trust_notification_events_auditor_idx
on admin_security_trust_notification_events (auditor_portal_id, created_at desc);
drop trigger if exists admin_security_trust_notification_events_set_updated_at
on admin_security_trust_notification_events;
create trigger admin_security_trust_notification_events_set_updated_at
before update on admin_security_trust_notification_events
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  delivery_key text not null unique,
  status text not null default 'pending',
  notification_event_id uuid not null references admin_security_trust_notification_events(id) on delete cascade,
  subscriber_id uuid not null references admin_security_trust_notification_subscribers(id) on delete cascade,
  topic_id uuid references admin_security_trust_notification_topics(id) on delete set null,
  delivery_channel text not null default 'email',
  frequency text not null default 'immediate',
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  body_text text not null,
  body_markdown text,
  source_type text not null,
  source_id uuid not null,
  event_severity text not null default 'info',
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  last_error text,
  provider_message_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_event_id, subscriber_id),
  constraint admin_security_trust_notification_deliveries_status_check
  check (status in ('pending', 'scheduled', 'sending', 'sent', 'failed', 'cancelled', 'suppressed', 'digest_queued')),
  constraint admin_security_trust_notification_deliveries_channel_check
  check (delivery_channel in ('email', 'webhook', 'in_app', 'digest_only')),
  constraint admin_security_trust_notification_deliveries_frequency_check
  check (frequency in ('immediate', 'hourly_digest', 'daily_digest', 'weekly_digest', 'digest_only')),
  constraint admin_security_trust_notification_deliveries_severity_check
  check (event_severity in ('info', 'notice', 'warning', 'critical')),
  constraint admin_security_trust_notification_deliveries_email_check
  check (position('@' in recipient_email) > 1)
);

create index if not exists admin_security_trust_notification_deliveries_status_idx
on admin_security_trust_notification_deliveries (status, scheduled_for);
create index if not exists admin_security_trust_notification_deliveries_subscriber_idx
on admin_security_trust_notification_deliveries (subscriber_id, created_at desc);
create index if not exists admin_security_trust_notification_deliveries_event_idx
on admin_security_trust_notification_deliveries (notification_event_id);
drop trigger if exists admin_security_trust_notification_deliveries_set_updated_at
on admin_security_trust_notification_deliveries;
create trigger admin_security_trust_notification_deliveries_set_updated_at
before update on admin_security_trust_notification_deliveries
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references admin_security_trust_notification_deliveries(id) on delete cascade,
  attempt_status text not null,
  provider text,
  provider_message_id text,
  error_code text,
  error_message text,
  attempted_at timestamptz not null default now(),
  worker_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  constraint admin_security_trust_notification_delivery_attempts_status_check
  check (attempt_status in ('sent', 'failed', 'suppressed', 'cancelled'))
);
create index if not exists admin_security_trust_notification_delivery_attempts_delivery_idx
on admin_security_trust_notification_delivery_attempts (delivery_id, attempted_at desc);

create or replace function admin_security_trust_notification_severity_rank(p_severity text)
returns integer
language sql
immutable
as $$
  select case p_severity
    when 'info' then 1
    when 'notice' then 2
    when 'warning' then 3
    when 'critical' then 4
    else 1
  end;
$$;

create or replace function create_admin_security_trust_notification_subscriber(
  p_admin_auth_user_id uuid,
  p_subscriber_type text,
  p_email text,
  p_display_name text default null,
  p_auth_user_id uuid default null,
  p_organization_name text default null,
  p_organization_domain text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_enterprise_review_room_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_participant_id uuid default null,
  p_preferred_channel text default 'email',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_subscriber_id uuid;
  v_subscriber_key text;
  v_topic admin_security_trust_notification_topics%rowtype;
begin
  if p_admin_auth_user_id is not null and admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_email is null or position('@' in p_email) <= 1 then
    raise exception 'valid trust notification subscriber email is required';
  end if;

  if p_admin_auth_user_id is not null then
    v_admin := get_active_admin_user(p_admin_auth_user_id);
  end if;

  v_subscriber_key :=
    'trust_subscriber:' ||
    lower(trim(p_email)) || ':' ||
    p_subscriber_type || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_trust_notification_subscribers (
    subscriber_key,
    status,
    subscriber_type,
    auth_user_id,
    email,
    display_name,
    organization_name,
    organization_domain,
    customer_name,
    customer_domain,
    enterprise_review_room_id,
    auditor_portal_id,
    participant_id,
    preferred_channel,
    verified_at,
    created_by_auth_user_id,
    created_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_subscriber_key,
    'active',
    p_subscriber_type,
    p_auth_user_id,
    lower(trim(p_email)),
    p_display_name,
    p_organization_name,
    p_organization_domain,
    p_customer_name,
    p_customer_domain,
    p_enterprise_review_room_id,
    p_auditor_portal_id,
    p_participant_id,
    coalesce(p_preferred_channel, 'email'),
    now(),
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (email, subscriber_type, enterprise_review_room_id, auditor_portal_id)
  do update set
    status = case
      when admin_security_trust_notification_subscribers.status = 'unsubscribed' then 'active'
      else admin_security_trust_notification_subscribers.status
    end,
    auth_user_id = coalesce(excluded.auth_user_id, admin_security_trust_notification_subscribers.auth_user_id),
    display_name = coalesce(excluded.display_name, admin_security_trust_notification_subscribers.display_name),
    organization_name = coalesce(excluded.organization_name, admin_security_trust_notification_subscribers.organization_name),
    organization_domain = coalesce(excluded.organization_domain, admin_security_trust_notification_subscribers.organization_domain),
    customer_name = coalesce(excluded.customer_name, admin_security_trust_notification_subscribers.customer_name),
    customer_domain = coalesce(excluded.customer_domain, admin_security_trust_notification_subscribers.customer_domain),
    participant_id = coalesce(excluded.participant_id, admin_security_trust_notification_subscribers.participant_id),
    preferred_channel = excluded.preferred_channel,
    metadata = admin_security_trust_notification_subscribers.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_subscriber_id;

  for v_topic in
    select *
    from admin_security_trust_notification_topics
    where status = 'active'
      and default_enabled is true
      and requires_explicit_opt_in is false
  loop
    insert into admin_security_trust_notification_preferences (
      subscriber_id,
      topic_id,
      status,
      delivery_channel,
      frequency,
      min_severity,
      metadata
    )
    values (
      v_subscriber_id,
      v_topic.id,
      'enabled',
      coalesce(p_preferred_channel, 'email'),
      case
        when coalesce(p_preferred_channel, 'email') = 'digest_only' then 'daily_digest'
        else 'immediate'
      end,
      v_topic.severity_floor,
      '{}'::jsonb
    )
    on conflict (subscriber_id, topic_id)
    do nothing;
  end loop;

  if p_admin_auth_user_id is not null then
    perform record_admin_action(
      p_admin_auth_user_id,
      'create_admin_security_trust_notification_subscriber',
      'admin.write',
      'admin_security_trust_notification_subscriber',
      v_subscriber_id,
      p_request_id,
      null,
      null,
      'allowed',
      'trust notification subscriber created',
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'email', lower(trim(p_email)),
        'subscriber_type', p_subscriber_type
      )
    );
  end if;

  return v_subscriber_id;
end;
$$;

create or replace function sync_enterprise_room_trust_notification_subscribers(
  p_admin_auth_user_id uuid,
  p_enterprise_review_room_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_room admin_security_enterprise_review_rooms%rowtype;
  v_participant record;
  v_count integer := 0;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  select * into v_room
  from admin_security_enterprise_review_rooms
  where id = p_enterprise_review_room_id;

  if v_room.id is null then
    raise exception 'enterprise review room not found: %', p_enterprise_review_room_id;
  end if;

  for v_participant in
    select *
    from admin_security_enterprise_review_room_participants
    where review_room_id = v_room.id
      and status = 'active'
      and email is not null
  loop
    perform create_admin_security_trust_notification_subscriber(
      p_admin_auth_user_id,
      'customer_security',
      v_participant.email,
      v_participant.display_name,
      v_participant.auth_user_id,
      v_room.customer_name,
      v_room.customer_domain,
      v_room.customer_name,
      v_room.customer_domain,
      v_room.id,
      null,
      v_participant.id,
      'email',
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'enterprise_room_sync')
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function sync_auditor_portal_trust_notification_subscribers(
  p_admin_auth_user_id uuid,
  p_auditor_portal_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_portal admin_security_auditor_portals%rowtype;
  v_participant record;
  v_count integer := 0;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  select * into v_portal
  from admin_security_auditor_portals
  where id = p_auditor_portal_id;

  if v_portal.id is null then
    raise exception 'auditor portal not found: %', p_auditor_portal_id;
  end if;

  for v_participant in
    select *
    from admin_security_auditor_portal_participants
    where auditor_portal_id = v_portal.id
      and status = 'active'
  loop
    perform create_admin_security_trust_notification_subscriber(
      p_admin_auth_user_id,
      'auditor',
      v_participant.email,
      v_participant.display_name,
      v_participant.auth_user_id,
      v_portal.auditor_firm,
      v_portal.auditor_domain,
      v_portal.customer_name,
      v_portal.customer_domain,
      v_portal.enterprise_review_room_id,
      v_portal.id,
      v_participant.id,
      'email',
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'auditor_portal_sync')
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function create_admin_security_trust_notification_event(
  p_topic_key text,
  p_event_type text,
  p_event_severity text,
  p_visibility text,
  p_source_type text,
  p_source_id uuid,
  p_title text,
  p_summary text,
  p_body_markdown text default null,
  p_source_artifact_key text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_enterprise_review_room_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_action_url text default null,
  p_public_safe boolean default true,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_topic admin_security_trust_notification_topics%rowtype;
  v_event_id uuid;
  v_event_key text;
begin
  select * into v_topic
  from admin_security_trust_notification_topics
  where topic_key = p_topic_key
    and status = 'active';

  if v_topic.id is null then
    raise exception 'trust notification topic not found: %', p_topic_key;
  end if;
  if p_source_id is null then
    raise exception 'trust notification source id is required';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'trust notification title is required';
  end if;
  if p_summary is null or length(trim(p_summary)) = 0 then
    raise exception 'trust notification summary is required';
  end if;

  if admin_security_trust_notification_severity_rank(coalesce(p_event_severity, 'info'))
    < admin_security_trust_notification_severity_rank(v_topic.severity_floor) then
    return null;
  end if;

  v_event_key :=
    'trust_notification:' ||
    p_topic_key || ':' ||
    p_source_type || ':' ||
    p_source_id::text || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_trust_notification_events (
    event_key,
    status,
    topic_id,
    topic_key,
    topic_type,
    event_type,
    event_severity,
    visibility,
    source_type,
    source_id,
    source_artifact_key,
    customer_name,
    customer_domain,
    enterprise_review_room_id,
    auditor_portal_id,
    title,
    summary,
    body_markdown,
    action_url,
    public_safe,
    request_id,
    metadata
  )
  values (
    v_event_key,
    'queued',
    v_topic.id,
    v_topic.topic_key,
    v_topic.topic_type,
    p_event_type,
    coalesce(p_event_severity, 'info'),
    coalesce(p_visibility, v_topic.visibility),
    p_source_type,
    p_source_id,
    p_source_artifact_key,
    p_customer_name,
    p_customer_domain,
    p_enterprise_review_room_id,
    p_auditor_portal_id,
    p_title,
    p_summary,
    p_body_markdown,
    p_action_url,
    coalesce(p_public_safe, true),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function fanout_admin_security_trust_notification_event(
  p_notification_event_id uuid,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_event admin_security_trust_notification_events%rowtype;
  v_sub record;
  v_count integer := 0;
  v_delivery_key text;
  v_scheduled_for timestamptz;
  v_delivery_status text;
begin
  select * into v_event
  from admin_security_trust_notification_events
  where id = p_notification_event_id
  for update;

  if v_event.id is null then
    raise exception 'trust notification event not found: %', p_notification_event_id;
  end if;
  if v_event.status not in ('queued', 'failed') then
    raise exception 'trust notification event cannot fanout from status: %', v_event.status;
  end if;

  update admin_security_trust_notification_events
  set
    status = 'fanout_processing',
    fanout_started_at = now(),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_event.id;

  for v_sub in
    select
      s.id as subscriber_id,
      s.email,
      s.display_name,
      pref.delivery_channel,
      pref.frequency,
      pref.min_severity,
      pref.status as preference_status,
      pref.muted_until,
      t.id as topic_id
    from admin_security_trust_notification_subscribers s
    join admin_security_trust_notification_preferences pref on pref.subscriber_id = s.id
    join admin_security_trust_notification_topics t on t.id = pref.topic_id
    where t.id = v_event.topic_id
      and s.status = 'active'
      and pref.status in ('enabled', 'muted')
      and (pref.muted_until is null or pref.muted_until <= now())
      and admin_security_trust_notification_severity_rank(v_event.event_severity)
        >= admin_security_trust_notification_severity_rank(pref.min_severity)
      and (
        v_event.visibility = 'public'
        or (
          v_event.visibility = 'customer_scoped'
          and v_event.customer_name is not null
          and s.customer_name = v_event.customer_name
        )
        or (
          v_event.visibility = 'room_scoped'
          and v_event.enterprise_review_room_id is not null
          and s.enterprise_review_room_id = v_event.enterprise_review_room_id
        )
        or (
          v_event.visibility = 'auditor_scoped'
          and v_event.auditor_portal_id is not null
          and s.auditor_portal_id = v_event.auditor_portal_id
        )
      )
  loop
    v_delivery_key := 'trust_delivery:' || v_event.event_key || ':' || v_sub.subscriber_id::text;
    v_scheduled_for := case
      when v_sub.frequency = 'hourly_digest' then date_trunc('hour', now()) + interval '1 hour'
      when v_sub.frequency = 'daily_digest' then date_trunc('day', now()) + interval '1 day'
      when v_sub.frequency = 'weekly_digest' then date_trunc('week', now()) + interval '1 week'
      when v_sub.frequency = 'digest_only' then date_trunc('day', now()) + interval '1 day'
      else now()
    end;
    v_delivery_status := case
      when v_sub.frequency in ('hourly_digest', 'daily_digest', 'weekly_digest', 'digest_only')
        then 'digest_queued'
      else 'pending'
    end;

    insert into admin_security_trust_notification_deliveries (
      delivery_key,
      status,
      notification_event_id,
      subscriber_id,
      topic_id,
      delivery_channel,
      frequency,
      recipient_email,
      recipient_name,
      subject,
      body_text,
      body_markdown,
      source_type,
      source_id,
      event_severity,
      scheduled_for,
      request_id,
      metadata
    )
    values (
      v_delivery_key,
      v_delivery_status,
      v_event.id,
      v_sub.subscriber_id,
      v_sub.topic_id,
      v_sub.delivery_channel,
      v_sub.frequency,
      v_sub.email,
      v_sub.display_name,
      v_event.title,
      v_event.summary,
      coalesce(v_event.body_markdown, v_event.summary),
      v_event.source_type,
      v_event.source_id,
      v_event.event_severity,
      v_scheduled_for,
      v_event.request_id,
      coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (notification_event_id, subscriber_id)
    do nothing;

    v_count := v_count + 1;
  end loop;

  update admin_security_trust_notification_events
  set
    status = 'fanout_completed',
    fanout_completed_at = now(),
    recipient_count = v_count,
    updated_at = now()
  where id = v_event.id;

  return v_count;
end;
$$;

create or replace function claim_admin_security_trust_notification_deliveries(
  p_batch_size integer default 50,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  delivery_id uuid,
  delivery_key text,
  delivery_channel text,
  recipient_email text,
  recipient_name text,
  subject text,
  body_text text,
  body_markdown text,
  source_type text,
  source_id uuid,
  event_severity text
)
language plpgsql
as $$
begin
  if p_batch_size <= 0 or p_batch_size > 250 then
    raise exception 'batch size must be between 1 and 250';
  end if;

  return query
  with candidates as (
    select d.id
    from admin_security_trust_notification_deliveries d
    join admin_security_trust_notification_subscribers s on s.id = d.subscriber_id
    where d.status in ('pending', 'scheduled', 'failed')
      and d.scheduled_for <= now()
      and d.attempt_count < 5
      and s.status = 'active'
    order by d.scheduled_for asc, d.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated as (
    update admin_security_trust_notification_deliveries d
    set
      status = 'sending',
      attempt_count = attempt_count + 1,
      last_attempt_at = now(),
      metadata = d.metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('worker_id', p_worker_id),
      updated_at = now()
    from candidates
    where d.id = candidates.id
    returning d.*
  )
  select
    u.id, u.delivery_key, u.delivery_channel, u.recipient_email, u.recipient_name, u.subject,
    u.body_text, u.body_markdown, u.source_type, u.source_id, u.event_severity
  from updated u;
end;
$$;

create or replace function complete_admin_security_trust_notification_delivery(
  p_delivery_id uuid,
  p_provider text,
  p_provider_message_id text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  update admin_security_trust_notification_deliveries
  set
    status = 'sent',
    sent_at = now(),
    provider_message_id = p_provider_message_id,
    last_error = null,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_delivery_id;

  insert into admin_security_trust_notification_delivery_attempts (
    delivery_id,
    attempt_status,
    provider,
    provider_message_id,
    worker_id,
    metadata
  )
  values (
    p_delivery_id,
    'sent',
    p_provider,
    p_provider_message_id,
    p_worker_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return p_delivery_id;
end;
$$;

create or replace function fail_admin_security_trust_notification_delivery(
  p_delivery_id uuid,
  p_error_message text,
  p_error_code text default null,
  p_provider text default null,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_attempt_count integer;
begin
  select attempt_count
  into v_attempt_count
  from admin_security_trust_notification_deliveries
  where id = p_delivery_id;

  update admin_security_trust_notification_deliveries
  set
    status = case when coalesce(v_attempt_count, 0) >= 5 then 'failed' else 'pending' end,
    failed_at = case when coalesce(v_attempt_count, 0) >= 5 then now() else failed_at end,
    last_error = p_error_message,
    scheduled_for = case when coalesce(v_attempt_count, 0) >= 5 then scheduled_for else now() + interval '10 minutes' end,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_delivery_id;

  insert into admin_security_trust_notification_delivery_attempts (
    delivery_id,
    attempt_status,
    provider,
    error_code,
    error_message,
    worker_id,
    metadata
  )
  values (
    p_delivery_id,
    'failed',
    p_provider,
    p_error_code,
    p_error_message,
    p_worker_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return p_delivery_id;
end;
$$;

create or replace function process_admin_security_trust_notification_fanout_queue(
  p_batch_size integer default 100,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_event admin_security_trust_notification_events%rowtype;
begin
  if p_batch_size <= 0 or p_batch_size > 500 then
    raise exception 'batch size must be between 1 and 500';
  end if;

  for v_event in
    select *
    from admin_security_trust_notification_events
    where status in ('queued', 'failed')
    order by created_at asc
    limit p_batch_size
    for update skip locked
  loop
    begin
      perform fanout_admin_security_trust_notification_event(
        v_event.id,
        p_worker_id,
        coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('fanout_run_id', v_run_id)
      );
    exception
      when others then
        update admin_security_trust_notification_events
        set
          status = 'failed',
          metadata = metadata || jsonb_build_object('last_fanout_error', sqlerrm, 'fanout_run_id', v_run_id),
          updated_at = now()
        where id = v_event.id;
    end;
  end loop;

  return v_run_id;
end;
$$;

create or replace function create_trust_notification_from_timeline_event(
  p_timeline_event_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event admin_security_external_trust_timeline_events%rowtype;
begin
  select * into v_event
  from admin_security_external_trust_timeline_events
  where id = p_timeline_event_id;

  if v_event.id is null then
    raise exception 'trust timeline event not found: %', p_timeline_event_id;
  end if;
  if v_event.visibility = 'admin_only' then
    return null;
  end if;

  return create_admin_security_trust_notification_event(
    'trust_timeline_updates',
    v_event.event_type,
    v_event.event_severity,
    case
      when v_event.visibility = 'public' then 'public'
      when v_event.enterprise_review_room_id is not null then 'room_scoped'
      else 'customer_scoped'
    end,
    'admin_security_external_trust_timeline_event',
    v_event.id,
    v_event.title,
    v_event.summary,
    v_event.public_body_markdown,
    v_event.artifact_key,
    v_event.customer_name,
    v_event.customer_domain,
    v_event.enterprise_review_room_id,
    null,
    null,
    true,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('created_from', 'trust_timeline_event')
  );
end;
$$;

create or replace function create_trust_notification_from_revocation(
  p_revocation_record_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_revocation admin_security_revocation_records%rowtype;
begin
  select * into v_revocation
  from admin_security_revocation_records
  where id = p_revocation_record_id;

  if v_revocation.id is null then
    raise exception 'revocation record not found: %', p_revocation_record_id;
  end if;

  return create_admin_security_trust_notification_event(
    'security_artifact_revocations',
    case
      when v_revocation.revocation_type = 'forced_expiry' then 'artifact_expired'
      else 'artifact_revoked'
    end,
    case
      when v_revocation.severity = 'critical' then 'critical'
      else 'warning'
    end,
    case
      when v_revocation.affected_room_id is not null then 'room_scoped'
      else 'customer_scoped'
    end,
    'admin_security_revocation_record',
    v_revocation.id,
    case
      when v_revocation.revocation_type = 'forced_expiry' then 'Security artifact expired'
      else 'Security artifact revoked'
    end,
    coalesce(v_revocation.public_reason, 'A customer-facing security artifact has been revoked or expired.'),
    coalesce(v_revocation.public_reason, v_revocation.reason),
    v_revocation.revocation_key,
    v_revocation.affected_customer_name,
    null,
    v_revocation.affected_room_id,
    null,
    null,
    true,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'created_from', 'revocation_record',
      'revocation_key', v_revocation.revocation_key
    )
  );
end;
$$;

create or replace function create_trust_notification_from_auditor_question(
  p_auditor_question_id uuid,
  p_event_type text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_question admin_security_auditor_questions%rowtype;
  v_portal admin_security_auditor_portals%rowtype;
begin
  select * into v_question
  from admin_security_auditor_questions
  where id = p_auditor_question_id;

  if v_question.id is null then
    raise exception 'auditor question not found: %', p_auditor_question_id;
  end if;

  select * into v_portal
  from admin_security_auditor_portals
  where id = v_question.auditor_portal_id;

  return create_admin_security_trust_notification_event(
    'auditor_questions',
    p_event_type,
    'info',
    'auditor_scoped',
    'admin_security_auditor_question',
    v_question.id,
    case
      when p_event_type = 'auditor_question_answered' then 'Auditor question answered'
      else 'Auditor question submitted'
    end,
    v_question.subject,
    case
      when p_event_type = 'auditor_question_answered' then v_question.answer_text
      else v_question.question_text
    end,
    v_question.question_key,
    v_portal.customer_name,
    v_portal.customer_domain,
    v_portal.enterprise_review_room_id,
    v_portal.id,
    null,
    true,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('created_from', 'auditor_question')
  );
end;
$$;

create or replace function queue_admin_security_trust_expiry_warning_notifications(
  p_days_before integer default 14,
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_pkg record;
begin
  if p_days_before <= 0 or p_days_before > 180 then
    raise exception 'expiry warning days before must be between 1 and 180';
  end if;
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_pkg in
    select *
    from admin_security_disclosure_packages p
    where p.status = 'active'
      and p.expires_at is not null
      and p.expires_at > now()
      and p.expires_at <= now() + make_interval(days => p_days_before)
      and not exists (
        select 1
        from admin_security_trust_notification_events e
        where e.topic_key = 'artifact_expiry_warnings'
          and e.source_type = 'admin_security_disclosure_package'
          and e.source_id = p.id
          and e.created_at >= now() - interval '7 days'
      )
    order by p.expires_at asc
    limit p_batch_size
  loop
    perform create_admin_security_trust_notification_event(
      'artifact_expiry_warnings',
      'artifact_expiry_warning',
      'notice',
      case
        when v_pkg.enterprise_review_room_id is not null then 'room_scoped'
        else 'customer_scoped'
      end,
      'admin_security_disclosure_package',
      v_pkg.id,
      'Security artifact expiring soon',
      v_pkg.title || ' expires on ' || v_pkg.expires_at::date::text || '.',
      'A disclosed trust artifact is approaching expiry. Review or replace it before expiration.',
      v_pkg.package_key,
      v_pkg.customer_name,
      v_pkg.customer_domain,
      v_pkg.enterprise_review_room_id,
      null,
      null,
      true,
      null,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'expiry_warning_run_id', v_run_id,
        'worker_id', p_worker_id,
        'expires_at', v_pkg.expires_at
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function on_admin_security_trust_timeline_notification_insert()
returns trigger
language plpgsql
as $$
begin
  perform create_trust_notification_from_timeline_event(
    new.id,
    null,
    coalesce(new.internal_metadata, '{}'::jsonb) || jsonb_build_object('autoCreated', true)
  );
  return new;
end;
$$;

drop trigger if exists admin_security_trust_timeline_auto_notification_trigger
on admin_security_external_trust_timeline_events;
create trigger admin_security_trust_timeline_auto_notification_trigger
after insert on admin_security_external_trust_timeline_events
for each row
execute function on_admin_security_trust_timeline_notification_insert();

create or replace function on_admin_security_revocation_notification_insert()
returns trigger
language plpgsql
as $$
begin
  perform create_trust_notification_from_revocation(
    new.id,
    new.request_id,
    coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object('autoCreated', true)
  );
  return new;
end;
$$;

drop trigger if exists admin_security_revocation_auto_notification_trigger
on admin_security_revocation_records;
create trigger admin_security_revocation_auto_notification_trigger
after insert on admin_security_revocation_records
for each row
execute function on_admin_security_revocation_notification_insert();

create or replace function on_admin_security_auditor_question_notification_upsert()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform create_trust_notification_from_auditor_question(
      new.id,
      'auditor_question_submitted',
      new.request_id,
      coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object('autoCreated', true)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and new.answer_text is distinct from old.answer_text and new.answer_text is not null then
    perform create_trust_notification_from_auditor_question(
      new.id,
      'auditor_question_answered',
      new.request_id,
      coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object('autoCreated', true)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists admin_security_auditor_question_auto_notification_insert_trigger
on admin_security_auditor_questions;
create trigger admin_security_auditor_question_auto_notification_insert_trigger
after insert on admin_security_auditor_questions
for each row
execute function on_admin_security_auditor_question_notification_upsert();

drop trigger if exists admin_security_auditor_question_auto_notification_update_trigger
on admin_security_auditor_questions;
create trigger admin_security_auditor_question_auto_notification_update_trigger
after update on admin_security_auditor_questions
for each row
execute function on_admin_security_auditor_question_notification_upsert();

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
    'admin_security_trust_notification_fanout_every_5m',
    'Fan out trust notification events',
    'admin',
    true,
    '*/5 * * * *',
    'process_admin_security_trust_notification_fanout_queue',
    '{"batch_size": 100}'::jsonb,
    300,
    600,
    '{"priority": "high"}'::jsonb
  ),
  (
    'admin_security_trust_expiry_warnings_daily',
    'Queue trust expiry warning notifications',
    'admin',
    true,
    '23 3 * * *',
    'queue_admin_security_trust_expiry_warning_notifications',
    '{"days_before": 14, "batch_size": 500}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
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

  select * into v_job from scheduled_jobs where job_key = p_job_key;
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
  elsif v_job.function_name = 'discover_admin_security_retention_subjects' then
    v_uuid_result := discover_admin_security_retention_subjects(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_admin_security_retention_lifecycle_job' then
    v_uuid_result := run_admin_security_retention_lifecycle_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'discover_admin_security_trust_artifact_dependencies' then
    v_uuid_result := discover_admin_security_trust_artifact_dependencies(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'process_admin_security_trust_artifact_propagation_events' then
    v_uuid_result := process_admin_security_trust_artifact_propagation_events(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'process_admin_security_trust_notification_fanout_queue' then
    v_uuid_result := process_admin_security_trust_notification_fanout_queue(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'queue_admin_security_trust_expiry_warning_notifications' then
    v_uuid_result := queue_admin_security_trust_expiry_warning_notifications(
      coalesce((v_job.function_args->>'days_before')::integer, 14),
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
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
        runtime_ms = case
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

create or replace view admin_security_trust_notification_subscriber_dashboard as
select
  s.id as admin_security_trust_notification_subscriber_id,
  s.subscriber_key,
  s.status,
  s.subscriber_type,
  s.auth_user_id,
  s.email,
  s.display_name,
  s.organization_name,
  s.organization_domain,
  s.customer_name,
  s.customer_domain,
  s.enterprise_review_room_id,
  r.room_key as enterprise_review_room_key,
  s.auditor_portal_id,
  p.portal_key as auditor_portal_key,
  s.participant_id,
  s.preferred_channel,
  s.verified_at,
  s.unsubscribed_at,
  s.unsubscribe_reason,
  (
    select count(*)
    from admin_security_trust_notification_preferences pref
    where pref.subscriber_id = s.id
      and pref.status = 'enabled'
  ) as enabled_topic_count,
  (
    select count(*)
    from admin_security_trust_notification_deliveries d
    where d.subscriber_id = s.id
  ) as delivery_count,
  s.created_at,
  s.updated_at,
  s.metadata
from admin_security_trust_notification_subscribers s
left join admin_security_enterprise_review_rooms r on r.id = s.enterprise_review_room_id
left join admin_security_auditor_portals p on p.id = s.auditor_portal_id
order by s.created_at desc;

create or replace view admin_security_trust_notification_event_dashboard as
select
  e.id as admin_security_trust_notification_event_id,
  e.event_key,
  e.status,
  e.topic_key,
  e.topic_type,
  e.event_type,
  e.event_severity,
  e.visibility,
  e.source_type,
  e.source_id,
  e.source_artifact_key,
  e.customer_name,
  e.customer_domain,
  e.enterprise_review_room_id,
  r.room_key as enterprise_review_room_key,
  e.auditor_portal_id,
  p.portal_key as auditor_portal_key,
  e.title,
  e.summary,
  e.action_url,
  e.public_safe,
  e.fanout_started_at,
  e.fanout_completed_at,
  e.recipient_count,
  e.created_at,
  e.updated_at,
  e.metadata
from admin_security_trust_notification_events e
left join admin_security_enterprise_review_rooms r on r.id = e.enterprise_review_room_id
left join admin_security_auditor_portals p on p.id = e.auditor_portal_id
order by e.created_at desc;

create or replace view admin_security_trust_notification_delivery_dashboard as
select
  d.id as admin_security_trust_notification_delivery_id,
  d.delivery_key,
  d.status,
  d.delivery_channel,
  d.frequency,
  d.recipient_email,
  d.recipient_name,
  d.subject,
  d.source_type,
  d.source_id,
  d.event_severity,
  d.scheduled_for,
  d.sent_at,
  d.failed_at,
  d.cancelled_at,
  d.attempt_count,
  d.last_attempt_at,
  d.last_error,
  d.provider_message_id,
  e.event_key,
  e.topic_key,
  e.event_type,
  s.subscriber_key,
  s.subscriber_type,
  d.created_at,
  d.updated_at,
  d.metadata
from admin_security_trust_notification_deliveries d
join admin_security_trust_notification_events e on e.id = d.notification_event_id
join admin_security_trust_notification_subscribers s on s.id = d.subscriber_id
order by d.created_at desc;

create or replace view admin_security_trust_notification_integrity as
select
  (select count(*) from admin_security_trust_notification_subscribers where status = 'active') as active_subscriber_count,
  (select count(*) from admin_security_trust_notification_events where status = 'queued') as queued_event_count,
  (select count(*) from admin_security_trust_notification_events where status = 'failed') as failed_event_count,
  (select count(*) from admin_security_trust_notification_deliveries where status in ('pending', 'scheduled')) as pending_delivery_count,
  (select count(*) from admin_security_trust_notification_deliveries where status = 'failed') as failed_delivery_count,
  (
    select count(*)
    from admin_security_trust_notification_deliveries
    where status = 'sent'
      and sent_at >= now() - interval '24 hours'
  ) as sent_delivery_count_24h,
  (
    select count(*)
    from admin_security_trust_notification_events
    where status = 'fanout_completed'
      and recipient_count = 0
      and created_at >= now() - interval '24 hours'
  ) as zero_recipient_event_count_24h,
  now() as checked_at;

grant select on admin_security_trust_notification_subscriber_dashboard to admin_api_role;
grant select on admin_security_trust_notification_event_dashboard to admin_api_role;
grant select on admin_security_trust_notification_delivery_dashboard to admin_api_role;
grant select on admin_security_trust_notification_integrity to admin_api_role;

alter table admin_security_trust_notification_subscribers enable row level security;
alter table admin_security_trust_notification_topics enable row level security;
alter table admin_security_trust_notification_preferences enable row level security;
alter table admin_security_trust_notification_events enable row level security;
alter table admin_security_trust_notification_deliveries enable row level security;
alter table admin_security_trust_notification_delivery_attempts enable row level security;

drop policy if exists admin_security_trust_notification_subscribers_no_user_direct_access on admin_security_trust_notification_subscribers;
create policy admin_security_trust_notification_subscribers_no_user_direct_access
on admin_security_trust_notification_subscribers for all to authenticated using (false) with check (false);
drop policy if exists admin_security_trust_notification_topics_no_user_direct_access on admin_security_trust_notification_topics;
create policy admin_security_trust_notification_topics_no_user_direct_access
on admin_security_trust_notification_topics for all to authenticated using (false) with check (false);
drop policy if exists admin_security_trust_notification_preferences_no_user_direct_access on admin_security_trust_notification_preferences;
create policy admin_security_trust_notification_preferences_no_user_direct_access
on admin_security_trust_notification_preferences for all to authenticated using (false) with check (false);
drop policy if exists admin_security_trust_notification_events_no_user_direct_access on admin_security_trust_notification_events;
create policy admin_security_trust_notification_events_no_user_direct_access
on admin_security_trust_notification_events for all to authenticated using (false) with check (false);
drop policy if exists admin_security_trust_notification_deliveries_no_user_direct_access on admin_security_trust_notification_deliveries;
create policy admin_security_trust_notification_deliveries_no_user_direct_access
on admin_security_trust_notification_deliveries for all to authenticated using (false) with check (false);
drop policy if exists admin_security_trust_notification_delivery_attempts_no_user_direct_access on admin_security_trust_notification_delivery_attempts;
create policy admin_security_trust_notification_delivery_attempts_no_user_direct_access
on admin_security_trust_notification_delivery_attempts for all to authenticated using (false) with check (false);

drop policy if exists admin_api_all_admin_security_trust_notification_subscribers on admin_security_trust_notification_subscribers;
create policy admin_api_all_admin_security_trust_notification_subscribers
on admin_security_trust_notification_subscribers for all to admin_api_role using (true) with check (true);
drop policy if exists admin_api_all_admin_security_trust_notification_topics on admin_security_trust_notification_topics;
create policy admin_api_all_admin_security_trust_notification_topics
on admin_security_trust_notification_topics for all to admin_api_role using (true) with check (true);
drop policy if exists admin_api_all_admin_security_trust_notification_preferences on admin_security_trust_notification_preferences;
create policy admin_api_all_admin_security_trust_notification_preferences
on admin_security_trust_notification_preferences for all to admin_api_role using (true) with check (true);
drop policy if exists admin_api_all_admin_security_trust_notification_events on admin_security_trust_notification_events;
create policy admin_api_all_admin_security_trust_notification_events
on admin_security_trust_notification_events for all to admin_api_role using (true) with check (true);
drop policy if exists admin_api_all_admin_security_trust_notification_deliveries on admin_security_trust_notification_deliveries;
create policy admin_api_all_admin_security_trust_notification_deliveries
on admin_security_trust_notification_deliveries for all to admin_api_role using (true) with check (true);
drop policy if exists admin_api_all_admin_security_trust_notification_delivery_attempts on admin_security_trust_notification_delivery_attempts;
create policy admin_api_all_admin_security_trust_notification_delivery_attempts
on admin_security_trust_notification_delivery_attempts for all to admin_api_role using (true) with check (true);

drop policy if exists worker_all_admin_security_trust_notification_events on admin_security_trust_notification_events;
create policy worker_all_admin_security_trust_notification_events
on admin_security_trust_notification_events for all to worker_role using (true) with check (true);
drop policy if exists worker_all_admin_security_trust_notification_deliveries on admin_security_trust_notification_deliveries;
create policy worker_all_admin_security_trust_notification_deliveries
on admin_security_trust_notification_deliveries for all to worker_role using (true) with check (true);
drop policy if exists worker_insert_admin_security_trust_notification_delivery_attempts on admin_security_trust_notification_delivery_attempts;
create policy worker_insert_admin_security_trust_notification_delivery_attempts
on admin_security_trust_notification_delivery_attempts for insert to worker_role with check (true);

grant execute on function admin_security_trust_notification_severity_rank(text) to admin_api_role, worker_role;
grant execute on function create_admin_security_trust_notification_subscriber(uuid, text, text, text, uuid, text, text, text, text, uuid, uuid, uuid, text, text, jsonb) to admin_api_role;
grant execute on function sync_enterprise_room_trust_notification_subscribers(uuid, uuid, text, jsonb) to admin_api_role;
grant execute on function sync_auditor_portal_trust_notification_subscribers(uuid, uuid, text, jsonb) to admin_api_role;
grant execute on function create_admin_security_trust_notification_event(text, text, text, text, text, uuid, text, text, text, text, text, text, uuid, uuid, text, boolean, text, jsonb) to admin_api_role, worker_role;
grant execute on function fanout_admin_security_trust_notification_event(uuid, text, jsonb) to admin_api_role, worker_role;
grant execute on function claim_admin_security_trust_notification_deliveries(integer, text, jsonb) to worker_role;
grant execute on function complete_admin_security_trust_notification_delivery(uuid, text, text, text, jsonb) to worker_role;
grant execute on function fail_admin_security_trust_notification_delivery(uuid, text, text, text, text, jsonb) to worker_role;
grant execute on function process_admin_security_trust_notification_fanout_queue(integer, text, jsonb) to admin_api_role, worker_role;
grant execute on function create_trust_notification_from_timeline_event(uuid, text, jsonb) to admin_api_role, worker_role;
grant execute on function create_trust_notification_from_revocation(uuid, text, jsonb) to admin_api_role, worker_role;
grant execute on function create_trust_notification_from_auditor_question(uuid, text, text, jsonb) to admin_api_role, worker_role;
grant execute on function queue_admin_security_trust_expiry_warning_notifications(integer, integer, text, jsonb) to admin_api_role, worker_role;

alter function create_admin_security_trust_notification_subscriber(uuid, text, text, text, uuid, text, text, text, text, uuid, uuid, uuid, text, text, jsonb) security definer;
alter function create_admin_security_trust_notification_subscriber(uuid, text, text, text, uuid, text, text, text, text, uuid, uuid, uuid, text, text, jsonb) set search_path = public;
alter function sync_enterprise_room_trust_notification_subscribers(uuid, uuid, text, jsonb) security definer;
alter function sync_enterprise_room_trust_notification_subscribers(uuid, uuid, text, jsonb) set search_path = public;
alter function sync_auditor_portal_trust_notification_subscribers(uuid, uuid, text, jsonb) security definer;
alter function sync_auditor_portal_trust_notification_subscribers(uuid, uuid, text, jsonb) set search_path = public;
alter function create_admin_security_trust_notification_event(text, text, text, text, text, uuid, text, text, text, text, text, text, uuid, uuid, text, boolean, text, jsonb) security definer;
alter function create_admin_security_trust_notification_event(text, text, text, text, text, uuid, text, text, text, text, text, text, uuid, uuid, text, boolean, text, jsonb) set search_path = public;
alter function fanout_admin_security_trust_notification_event(uuid, text, jsonb) security definer;
alter function fanout_admin_security_trust_notification_event(uuid, text, jsonb) set search_path = public;
alter function claim_admin_security_trust_notification_deliveries(integer, text, jsonb) security definer;
alter function claim_admin_security_trust_notification_deliveries(integer, text, jsonb) set search_path = public;
alter function complete_admin_security_trust_notification_delivery(uuid, text, text, text, jsonb) security definer;
alter function complete_admin_security_trust_notification_delivery(uuid, text, text, text, jsonb) set search_path = public;
alter function fail_admin_security_trust_notification_delivery(uuid, text, text, text, text, jsonb) security definer;
alter function fail_admin_security_trust_notification_delivery(uuid, text, text, text, text, jsonb) set search_path = public;
alter function process_admin_security_trust_notification_fanout_queue(integer, text, jsonb) security definer;
alter function process_admin_security_trust_notification_fanout_queue(integer, text, jsonb) set search_path = public;
alter function create_trust_notification_from_timeline_event(uuid, text, jsonb) security definer;
alter function create_trust_notification_from_timeline_event(uuid, text, jsonb) set search_path = public;
alter function create_trust_notification_from_revocation(uuid, text, jsonb) security definer;
alter function create_trust_notification_from_revocation(uuid, text, jsonb) set search_path = public;
alter function create_trust_notification_from_auditor_question(uuid, text, text, jsonb) security definer;
alter function create_trust_notification_from_auditor_question(uuid, text, text, jsonb) set search_path = public;
alter function queue_admin_security_trust_expiry_warning_notifications(integer, integer, text, jsonb) security definer;
alter function queue_admin_security_trust_expiry_warning_notifications(integer, integer, text, jsonb) set search_path = public;

insert into error_catalog (
  error_code, category, severity, http_status, retryable, user_visible, user_message, internal_message, owner_team
)
values
  ('TRUST_NOTIFICATION_TOPIC_NOT_FOUND', 'validation', 'medium', 404, false, true, 'Trust notification topic not found.', 'Trust notification topic not found.', 'platform'),
  ('TRUST_NOTIFICATION_REQUIRED_FIELDS', 'validation', 'medium', 400, false, true, 'Trust notification request requires complete fields.', 'Trust notification required fields missing.', 'platform'),
  ('TRUST_NOTIFICATION_INVALID_STATE', 'validation', 'medium', 409, false, true, 'Trust notification cannot be used from its current state.', 'Trust notification invalid state.', 'platform'),
  ('TRUST_NOTIFICATION_DELIVERY_FAILED', 'external', 'medium', 502, true, false, 'Trust notification delivery failed.', 'Trust notification delivery failed.', 'platform')
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

insert into error_mapping_rules (match_pattern, error_code, priority, metadata)
values
  ('trust notification topic not found', 'TRUST_NOTIFICATION_TOPIC_NOT_FOUND', 5, '{}'),
  ('valid trust notification subscriber email is required', 'TRUST_NOTIFICATION_REQUIRED_FIELDS', 5, '{}'),
  ('trust notification source id is required', 'TRUST_NOTIFICATION_REQUIRED_FIELDS', 5, '{}'),
  ('trust notification title is required', 'TRUST_NOTIFICATION_REQUIRED_FIELDS', 5, '{}'),
  ('trust notification summary is required', 'TRUST_NOTIFICATION_REQUIRED_FIELDS', 5, '{}'),
  ('trust notification event not found', 'TRUST_NOTIFICATION_TOPIC_NOT_FOUND', 5, '{}'),
  ('trust notification event cannot fanout from status', 'TRUST_NOTIFICATION_INVALID_STATE', 5, '{}'),
  ('batch size must be between 1 and 250', 'TRUST_NOTIFICATION_REQUIRED_FIELDS', 5, '{}'),
  ('batch size must be between 1 and 500', 'TRUST_NOTIFICATION_REQUIRED_FIELDS', 5, '{}'),
  ('batch size must be between 1 and 5000', 'TRUST_NOTIFICATION_REQUIRED_FIELDS', 5, '{}'),
  ('expiry warning days before must be between 1 and 180', 'TRUST_NOTIFICATION_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
