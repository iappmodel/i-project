-- Step 9.59 — Build external auditor portal.
-- Runs after 173_admin_security_external_trust_portal_timeline.sql.

create table if not exists admin_security_auditor_portals (
  id uuid primary key default gen_random_uuid(),

  portal_key text not null unique,

  status text not null default 'draft',

  portal_type text not null default 'external_audit',

  auditor_name text not null,
  auditor_domain text,
  auditor_firm text,

  customer_name text,
  customer_domain text,

  audit_type text not null default 'security_review',
  audit_scope text not null,

  title text not null,
  summary text not null,

  enterprise_review_room_id uuid
    references admin_security_enterprise_review_rooms(id)
    on delete set null,

  audit_period_id uuid
    references admin_security_audit_periods(id)
    on delete set null,

  access_starts_at timestamptz not null default now(),
  access_expires_at timestamptz not null,

  require_acknowledgement boolean not null default true,
  allow_downloads boolean not null default true,
  allow_questions boolean not null default true,
  allow_timeline_access boolean not null default true,

  published_at timestamptz,
  published_by_auth_user_id uuid,
  published_by_admin_user_id uuid references admin_users(id),

  revoked_at timestamptz,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id),
  revoke_reason text,

  created_by_auth_user_id uuid not null,
  created_by_admin_user_id uuid references admin_users(id),

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_auditor_portals_status_check
  check (
    status in (
      'draft',
      'published',
      'expired',
      'revoked',
      'archived'
    )
  ),

  constraint admin_security_auditor_portals_type_check
  check (
    portal_type in (
      'external_audit',
      'customer_audit',
      'regulator_review',
      'vendor_review',
      'internal_readonly_review'
    )
  ),

  constraint admin_security_auditor_portals_audit_type_check
  check (
    audit_type in (
      'security_review',
      'soc2',
      'iso27001',
      'privacy',
      'ai_security',
      'vendor_risk',
      'regulatory',
      'custom'
    )
  ),

  constraint admin_security_auditor_portals_auditor_check
  check (length(trim(auditor_name)) > 0),

  constraint admin_security_auditor_portals_scope_check
  check (length(trim(audit_scope)) > 0),

  constraint admin_security_auditor_portals_title_check
  check (length(trim(title)) > 0),

  constraint admin_security_auditor_portals_summary_check
  check (length(trim(summary)) > 0),

  constraint admin_security_auditor_portals_access_check
  check (access_expires_at > access_starts_at)
);

create index if not exists admin_security_auditor_portals_status_idx
on admin_security_auditor_portals (status, access_expires_at);

create index if not exists admin_security_auditor_portals_auditor_idx
on admin_security_auditor_portals (auditor_name, auditor_domain);

create index if not exists admin_security_auditor_portals_customer_idx
on admin_security_auditor_portals (customer_name, customer_domain);

drop trigger if exists admin_security_auditor_portals_set_updated_at
on admin_security_auditor_portals;

create trigger admin_security_auditor_portals_set_updated_at
before update on admin_security_auditor_portals
for each row
execute function set_updated_at();

create table if not exists admin_security_auditor_portal_participants (
  id uuid primary key default gen_random_uuid(),

  auditor_portal_id uuid not null
    references admin_security_auditor_portals(id)
    on delete cascade,

  status text not null default 'invited',

  participant_role text not null default 'auditor',

  auth_user_id uuid,
  email text not null,
  display_name text,

  organization_name text,

  invited_by_auth_user_id uuid not null,
  invited_by_admin_user_id uuid references admin_users(id),

  invited_at timestamptz not null default now(),
  accepted_at timestamptz,

  last_accessed_at timestamptz,
  access_count integer not null default 0,

  revoked_at timestamptz,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id),
  revoke_reason text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (auditor_portal_id, email),

  constraint admin_security_auditor_portal_participants_status_check
  check (
    status in (
      'invited',
      'active',
      'suspended',
      'revoked',
      'expired'
    )
  ),

  constraint admin_security_auditor_portal_participants_role_check
  check (
    participant_role in (
      'lead_auditor',
      'auditor',
      'observer',
      'regulator',
      'customer_observer'
    )
  ),

  constraint admin_security_auditor_portal_participants_email_check
  check (position('@' in email) > 1)
);

create index if not exists admin_security_auditor_portal_participants_portal_idx
on admin_security_auditor_portal_participants (auditor_portal_id, status);

create index if not exists admin_security_auditor_portal_participants_auth_idx
on admin_security_auditor_portal_participants (auth_user_id, status);

drop trigger if exists admin_security_auditor_portal_participants_set_updated_at
on admin_security_auditor_portal_participants;

create trigger admin_security_auditor_portal_participants_set_updated_at
before update on admin_security_auditor_portal_participants
for each row
execute function set_updated_at();

create table if not exists admin_security_auditor_evidence_packets (
  id uuid primary key default gen_random_uuid(),

  auditor_portal_id uuid not null
    references admin_security_auditor_portals(id)
    on delete cascade,

  packet_key text not null unique,

  status text not null default 'draft',

  packet_type text not null default 'evidence_packet',

  title text not null,
  summary text not null,

  scope text not null,

  disclosure_package_id uuid
    references admin_security_disclosure_packages(id)
    on delete set null,

  compliance_report_request_id uuid
    references admin_security_compliance_report_requests(id)
    on delete set null,

  questionnaire_export_id uuid
    references admin_security_questionnaire_exports(id)
    on delete set null,

  audit_period_export_request_id uuid
    references admin_security_audit_period_export_requests(id)
    on delete set null,

  checksum_sha256 text,
  signature text,
  signed_at timestamptz,

  item_count integer not null default 0,

  allow_download boolean not null default true,
  require_acknowledgement boolean not null default true,

  published_at timestamptz,

  created_by_auth_user_id uuid not null,
  created_by_admin_user_id uuid references admin_users(id),

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_auditor_evidence_packets_status_check
  check (
    status in (
      'draft',
      'published',
      'revoked',
      'expired',
      'archived'
    )
  ),

  constraint admin_security_auditor_evidence_packets_type_check
  check (
    packet_type in (
      'evidence_packet',
      'report_packet',
      'questionnaire_packet',
      'audit_period_packet',
      'disclosure_package_packet',
      'custom'
    )
  ),

  constraint admin_security_auditor_evidence_packets_title_check
  check (length(trim(title)) > 0),

  constraint admin_security_auditor_evidence_packets_summary_check
  check (length(trim(summary)) > 0),

  constraint admin_security_auditor_evidence_packets_scope_check
  check (length(trim(scope)) > 0)
);

create index if not exists admin_security_auditor_evidence_packets_portal_idx
on admin_security_auditor_evidence_packets (auditor_portal_id, status);

create index if not exists admin_security_auditor_evidence_packets_package_idx
on admin_security_auditor_evidence_packets (disclosure_package_id);

drop trigger if exists admin_security_auditor_evidence_packets_set_updated_at
on admin_security_auditor_evidence_packets;

create trigger admin_security_auditor_evidence_packets_set_updated_at
before update on admin_security_auditor_evidence_packets
for each row
execute function set_updated_at();

create table if not exists admin_security_auditor_evidence_packet_items (
  id uuid primary key default gen_random_uuid(),

  evidence_packet_id uuid not null
    references admin_security_auditor_evidence_packets(id)
    on delete cascade,

  auditor_portal_id uuid not null
    references admin_security_auditor_portals(id)
    on delete cascade,

  item_type text not null,

  source_type text not null,
  source_id uuid,

  item_key text,
  display_title text not null,
  display_summary text not null,

  control_key text,
  framework_key text,

  checksum_sha256 text,
  signature text,
  signed_at timestamptz,

  public_safe boolean not null default true,
  auditor_safe boolean not null default true,

  allow_download boolean not null default false,

  sort_order integer not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_auditor_evidence_packet_items_type_check
  check (
    item_type in (
      'control_summary',
      'policy_summary',
      'signed_report',
      'questionnaire_response',
      'audit_export',
      'disclosure_package',
      'timeline_event',
      'revocation_record',
      'manual_reference',
      'other'
    )
  ),

  constraint admin_security_auditor_evidence_packet_items_title_check
  check (length(trim(display_title)) > 0),

  constraint admin_security_auditor_evidence_packet_items_summary_check
  check (length(trim(display_summary)) > 0)
);

create index if not exists admin_security_auditor_evidence_packet_items_packet_idx
on admin_security_auditor_evidence_packet_items (evidence_packet_id, sort_order);

create index if not exists admin_security_auditor_evidence_packet_items_portal_idx
on admin_security_auditor_evidence_packet_items (auditor_portal_id);

create index if not exists admin_security_auditor_evidence_packet_items_source_idx
on admin_security_auditor_evidence_packet_items (source_type, source_id);

create table if not exists admin_security_auditor_questions (
  id uuid primary key default gen_random_uuid(),

  auditor_portal_id uuid not null
    references admin_security_auditor_portals(id)
    on delete cascade,

  participant_id uuid
    references admin_security_auditor_portal_participants(id)
    on delete set null,

  question_key text not null,

  status text not null default 'open',

  priority text not null default 'medium',

  category text,

  subject text not null,
  question_text text not null,

  related_source_type text,
  related_source_id uuid,

  answer_text text,
  answered_by_auth_user_id uuid,
  answered_by_admin_user_id uuid references admin_users(id),
  answered_at timestamptz,

  internal_note text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (auditor_portal_id, question_key),

  constraint admin_security_auditor_questions_status_check
  check (
    status in (
      'open',
      'answered',
      'closed',
      'rejected',
      'archived'
    )
  ),

  constraint admin_security_auditor_questions_priority_check
  check (
    priority in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_auditor_questions_subject_check
  check (length(trim(subject)) > 0),

  constraint admin_security_auditor_questions_text_check
  check (length(trim(question_text)) > 0)
);

create index if not exists admin_security_auditor_questions_portal_idx
on admin_security_auditor_questions (auditor_portal_id, status, created_at desc);

create index if not exists admin_security_auditor_questions_participant_idx
on admin_security_auditor_questions (participant_id, created_at desc);

drop trigger if exists admin_security_auditor_questions_set_updated_at
on admin_security_auditor_questions;

create trigger admin_security_auditor_questions_set_updated_at
before update on admin_security_auditor_questions
for each row
execute function set_updated_at();

create table if not exists admin_security_auditor_acknowledgements (
  id uuid primary key default gen_random_uuid(),

  auditor_portal_id uuid not null
    references admin_security_auditor_portals(id)
    on delete cascade,

  participant_id uuid not null
    references admin_security_auditor_portal_participants(id)
    on delete cascade,

  acknowledgement_type text not null,

  source_type text not null,
  source_id uuid not null,

  statement text not null,

  accepted boolean not null default true,

  acknowledged_at timestamptz not null default now(),

  ip_address inet,
  user_agent text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (participant_id, acknowledgement_type, source_type, source_id),

  constraint admin_security_auditor_acknowledgements_type_check
  check (
    acknowledgement_type in (
      'portal_terms',
      'confidentiality_notice',
      'evidence_packet_viewed',
      'artifact_downloaded',
      'timeline_reviewed',
      'question_answer_received'
    )
  ),

  constraint admin_security_auditor_acknowledgements_statement_check
  check (length(trim(statement)) > 0)
);

create index if not exists admin_security_auditor_acknowledgements_portal_idx
on admin_security_auditor_acknowledgements (auditor_portal_id, acknowledged_at desc);

create index if not exists admin_security_auditor_acknowledgements_participant_idx
on admin_security_auditor_acknowledgements (participant_id, acknowledged_at desc);

create table if not exists admin_security_auditor_portal_activity_events (
  id uuid primary key default gen_random_uuid(),

  auditor_portal_id uuid not null
    references admin_security_auditor_portals(id)
    on delete cascade,

  participant_id uuid
    references admin_security_auditor_portal_participants(id)
    on delete set null,

  activity_type text not null,

  source_type text,
  source_id uuid,

  title text not null,
  summary text,

  ip_address inet,
  user_agent text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_auditor_portal_activity_events_type_check
  check (
    activity_type in (
      'portal_opened',
      'packet_viewed',
      'item_viewed',
      'artifact_download_requested',
      'timeline_viewed',
      'question_submitted',
      'question_answer_viewed',
      'acknowledgement_created',
      'access_denied',
      'other'
    )
  ),

  constraint admin_security_auditor_portal_activity_events_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_auditor_portal_activity_events_portal_idx
on admin_security_auditor_portal_activity_events (auditor_portal_id, created_at desc);

create index if not exists admin_security_auditor_portal_activity_events_participant_idx
on admin_security_auditor_portal_activity_events (participant_id, created_at desc);

create or replace function create_admin_security_auditor_portal(
  p_admin_auth_user_id uuid,
  p_auditor_name text,
  p_auditor_domain text,
  p_auditor_firm text,
  p_customer_name text,
  p_customer_domain text,
  p_audit_type text,
  p_audit_scope text,
  p_title text,
  p_summary text,
  p_enterprise_review_room_id uuid default null,
  p_audit_period_id uuid default null,
  p_access_starts_at timestamptz default null,
  p_access_expires_at timestamptz default null,
  p_require_acknowledgement boolean default true,
  p_allow_downloads boolean default true,
  p_allow_questions boolean default true,
  p_allow_timeline_access boolean default true,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_portal_id uuid;
  v_portal_key text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_auditor_name is null or length(trim(p_auditor_name)) = 0 then
    raise exception 'auditor name is required';
  end if;

  if p_audit_scope is null or length(trim(p_audit_scope)) = 0 then
    raise exception 'auditor portal audit scope is required';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'auditor portal title is required';
  end if;

  if p_summary is null or length(trim(p_summary)) = 0 then
    raise exception 'auditor portal summary is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  v_portal_key :=
    'auditor_portal:' ||
    regexp_replace(lower(p_auditor_name), '[^a-z0-9]+', '-', 'g') ||
    ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_auditor_portals (
    portal_key,
    status,
    auditor_name,
    auditor_domain,
    auditor_firm,
    customer_name,
    customer_domain,
    audit_type,
    audit_scope,
    title,
    summary,
    enterprise_review_room_id,
    audit_period_id,
    access_starts_at,
    access_expires_at,
    require_acknowledgement,
    allow_downloads,
    allow_questions,
    allow_timeline_access,
    created_by_auth_user_id,
    created_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_portal_key,
    'draft',
    p_auditor_name,
    p_auditor_domain,
    p_auditor_firm,
    p_customer_name,
    p_customer_domain,
    coalesce(p_audit_type, 'security_review'),
    p_audit_scope,
    p_title,
    p_summary,
    p_enterprise_review_room_id,
    p_audit_period_id,
    coalesce(p_access_starts_at, now()),
    coalesce(p_access_expires_at, now() + interval '30 days'),
    coalesce(p_require_acknowledgement, true),
    coalesce(p_allow_downloads, true),
    coalesce(p_allow_questions, true),
    coalesce(p_allow_timeline_access, true),
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_portal_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_security_auditor_portal',
    'admin.write',
    'admin_security_auditor_portal',
    v_portal_id,
    p_request_id,
    null,
    null,
    'allowed',
    'auditor portal created',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'auditor_name',
      p_auditor_name,
      'customer_name',
      p_customer_name
    )
  );

  return v_portal_id;
end;
$$;

create or replace function invite_admin_security_auditor_portal_participant(
  p_admin_auth_user_id uuid,
  p_auditor_portal_id uuid,
  p_email text,
  p_display_name text default null,
  p_participant_role text default 'auditor',
  p_auth_user_id uuid default null,
  p_organization_name text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_portal admin_security_auditor_portals%rowtype;
  v_participant_id uuid;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_portal
  from admin_security_auditor_portals
  where id = p_auditor_portal_id;

  if v_portal.id is null then
    raise exception 'auditor portal not found: %', p_auditor_portal_id;
  end if;

  if v_portal.status not in ('draft', 'published') then
    raise exception 'cannot invite participant to auditor portal status: %', v_portal.status;
  end if;

  if p_email is null or position('@' in p_email) <= 1 then
    raise exception 'valid auditor participant email is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  insert into admin_security_auditor_portal_participants (
    auditor_portal_id,
    status,
    participant_role,
    auth_user_id,
    email,
    display_name,
    organization_name,
    invited_by_auth_user_id,
    invited_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_portal.id,
    'invited',
    coalesce(p_participant_role, 'auditor'),
    p_auth_user_id,
    lower(trim(p_email)),
    p_display_name,
    p_organization_name,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (auditor_portal_id, email)
  do update set
    status = case
      when admin_security_auditor_portal_participants.status in ('revoked', 'expired') then 'invited'
      else admin_security_auditor_portal_participants.status
    end,
    participant_role = excluded.participant_role,
    auth_user_id = coalesce(excluded.auth_user_id, admin_security_auditor_portal_participants.auth_user_id),
    display_name = coalesce(excluded.display_name, admin_security_auditor_portal_participants.display_name),
    organization_name = coalesce(excluded.organization_name, admin_security_auditor_portal_participants.organization_name),
    metadata = admin_security_auditor_portal_participants.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_participant_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'invite_admin_security_auditor_portal_participant',
    'admin.write',
    'admin_security_auditor_portal_participant',
    v_participant_id,
    p_request_id,
    null,
    null,
    'allowed',
    'auditor portal participant invited',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'auditor_portal_id',
      v_portal.id,
      'email',
      lower(trim(p_email))
    )
  );

  return v_participant_id;
end;
$$;

create or replace function publish_admin_security_auditor_portal(
  p_admin_auth_user_id uuid,
  p_auditor_portal_id uuid,
  p_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_portal admin_security_auditor_portals%rowtype;
  v_participant_count integer;
  v_packet_count integer;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'action_key',
      'publish_admin_security_auditor_portal',
      'auditor_portal_id',
      p_auditor_portal_id
    )
  );

  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'auditor portal publish note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_portal
  from admin_security_auditor_portals
  where id = p_auditor_portal_id
  for update;

  if v_portal.id is null then
    raise exception 'auditor portal not found: %', p_auditor_portal_id;
  end if;

  if v_portal.status not in ('draft', 'published') then
    raise exception 'cannot publish auditor portal status: %', v_portal.status;
  end if;

  select count(*)
  into v_participant_count
  from admin_security_auditor_portal_participants
  where auditor_portal_id = v_portal.id
    and status in ('invited', 'active');

  if v_participant_count = 0 then
    raise exception 'auditor portal requires at least one participant before publishing';
  end if;

  select count(*)
  into v_packet_count
  from admin_security_auditor_evidence_packets
  where auditor_portal_id = v_portal.id
    and status in ('published', 'draft');

  if v_packet_count = 0 then
    raise exception 'auditor portal requires at least one evidence packet before publishing';
  end if;

  update admin_security_auditor_portals
  set
    status = 'published',
    published_at = now(),
    published_by_auth_user_id = p_admin_auth_user_id,
    published_by_admin_user_id = v_admin.id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'publish_note',
      p_note
    ),
    updated_at = now()
  where id = v_portal.id;

  update admin_security_auditor_portal_participants
  set
    status = case when status = 'invited' then 'active' else status end,
    updated_at = now()
  where auditor_portal_id = v_portal.id
    and status = 'invited';

  perform record_admin_action(
    p_admin_auth_user_id,
    'publish_admin_security_auditor_portal',
    'admin.write',
    'admin_security_auditor_portal',
    v_portal.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_note,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'participant_count',
      v_participant_count,
      'packet_count',
      v_packet_count
    )
  );

  return v_portal.id;
end;
$$;

create or replace function create_admin_security_auditor_evidence_packet(
  p_admin_auth_user_id uuid,
  p_auditor_portal_id uuid,
  p_packet_type text,
  p_title text,
  p_summary text,
  p_scope text,
  p_disclosure_package_id uuid default null,
  p_compliance_report_request_id uuid default null,
  p_questionnaire_export_id uuid default null,
  p_audit_period_export_request_id uuid default null,
  p_allow_download boolean default true,
  p_require_acknowledgement boolean default true,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_portal admin_security_auditor_portals%rowtype;
  v_packet_id uuid;
  v_packet_key text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_portal
  from admin_security_auditor_portals
  where id = p_auditor_portal_id;

  if v_portal.id is null then
    raise exception 'auditor portal not found: %', p_auditor_portal_id;
  end if;

  if v_portal.status not in ('draft', 'published') then
    raise exception 'cannot create evidence packet for auditor portal status: %', v_portal.status;
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'auditor evidence packet title is required';
  end if;

  if p_summary is null or length(trim(p_summary)) = 0 then
    raise exception 'auditor evidence packet summary is required';
  end if;

  if p_scope is null or length(trim(p_scope)) = 0 then
    raise exception 'auditor evidence packet scope is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  v_packet_key :=
    'auditor_packet:' ||
    v_portal.portal_key || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_auditor_evidence_packets (
    auditor_portal_id,
    packet_key,
    status,
    packet_type,
    title,
    summary,
    scope,
    disclosure_package_id,
    compliance_report_request_id,
    questionnaire_export_id,
    audit_period_export_request_id,
    allow_download,
    require_acknowledgement,
    created_by_auth_user_id,
    created_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_portal.id,
    v_packet_key,
    'draft',
    coalesce(p_packet_type, 'evidence_packet'),
    p_title,
    p_summary,
    p_scope,
    p_disclosure_package_id,
    p_compliance_report_request_id,
    p_questionnaire_export_id,
    p_audit_period_export_request_id,
    coalesce(p_allow_download, true),
    coalesce(p_require_acknowledgement, true),
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_packet_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_security_auditor_evidence_packet',
    'admin.write',
    'admin_security_auditor_evidence_packet',
    v_packet_id,
    p_request_id,
    null,
    null,
    'allowed',
    'auditor evidence packet created',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'auditor_portal_id',
      v_portal.id,
      'packet_type',
      p_packet_type
    )
  );

  return v_packet_id;
end;
$$;

create or replace function add_admin_security_auditor_evidence_packet_item(
  p_admin_auth_user_id uuid,
  p_evidence_packet_id uuid,
  p_item_type text,
  p_source_type text,
  p_source_id uuid,
  p_display_title text,
  p_display_summary text,
  p_item_key text default null,
  p_control_key text default null,
  p_framework_key text default null,
  p_checksum_sha256 text default null,
  p_signature text default null,
  p_signed_at timestamptz default null,
  p_public_safe boolean default true,
  p_auditor_safe boolean default true,
  p_allow_download boolean default false,
  p_sort_order integer default 0,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_packet admin_security_auditor_evidence_packets%rowtype;
  v_item_id uuid;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_packet
  from admin_security_auditor_evidence_packets
  where id = p_evidence_packet_id
  for update;

  if v_packet.id is null then
    raise exception 'auditor evidence packet not found: %', p_evidence_packet_id;
  end if;

  if v_packet.status not in ('draft', 'published') then
    raise exception 'cannot add item to auditor evidence packet status: %', v_packet.status;
  end if;

  if p_display_title is null or length(trim(p_display_title)) = 0 then
    raise exception 'auditor evidence packet item title is required';
  end if;

  if p_display_summary is null or length(trim(p_display_summary)) = 0 then
    raise exception 'auditor evidence packet item summary is required';
  end if;

  insert into admin_security_auditor_evidence_packet_items (
    evidence_packet_id,
    auditor_portal_id,
    item_type,
    source_type,
    source_id,
    item_key,
    display_title,
    display_summary,
    control_key,
    framework_key,
    checksum_sha256,
    signature,
    signed_at,
    public_safe,
    auditor_safe,
    allow_download,
    sort_order,
    metadata
  )
  values (
    v_packet.id,
    v_packet.auditor_portal_id,
    p_item_type,
    p_source_type,
    p_source_id,
    p_item_key,
    p_display_title,
    p_display_summary,
    p_control_key,
    p_framework_key,
    p_checksum_sha256,
    p_signature,
    p_signed_at,
    coalesce(p_public_safe, true),
    coalesce(p_auditor_safe, true),
    coalesce(p_allow_download, false),
    coalesce(p_sort_order, 0),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_item_id;

  update admin_security_auditor_evidence_packets
  set
    item_count = (
      select count(*)
      from admin_security_auditor_evidence_packet_items
      where evidence_packet_id = v_packet.id
    ),
    updated_at = now()
  where id = v_packet.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'add_admin_security_auditor_evidence_packet_item',
    'admin.write',
    'admin_security_auditor_evidence_packet_item',
    v_item_id,
    null,
    null,
    null,
    'allowed',
    'auditor evidence packet item added',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'evidence_packet_id',
      v_packet.id,
      'item_type',
      p_item_type
    )
  );

  return v_item_id;
end;
$$;

create or replace function publish_admin_security_auditor_evidence_packet(
  p_admin_auth_user_id uuid,
  p_evidence_packet_id uuid,
  p_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_packet admin_security_auditor_evidence_packets%rowtype;
  v_item_count integer;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'auditor evidence packet publish note is required';
  end if;

  select *
  into v_packet
  from admin_security_auditor_evidence_packets
  where id = p_evidence_packet_id
  for update;

  if v_packet.id is null then
    raise exception 'auditor evidence packet not found: %', p_evidence_packet_id;
  end if;

  if v_packet.status not in ('draft', 'published') then
    raise exception 'cannot publish auditor evidence packet status: %', v_packet.status;
  end if;

  select count(*)
  into v_item_count
  from admin_security_auditor_evidence_packet_items
  where evidence_packet_id = v_packet.id
    and auditor_safe is true;

  if v_item_count = 0 then
    raise exception 'auditor evidence packet requires at least one auditor-safe item';
  end if;

  update admin_security_auditor_evidence_packets
  set
    status = 'published',
    published_at = now(),
    item_count = v_item_count,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'publish_note',
      p_note
    ),
    updated_at = now()
  where id = v_packet.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'publish_admin_security_auditor_evidence_packet',
    'admin.write',
    'admin_security_auditor_evidence_packet',
    v_packet.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_note,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'item_count',
      v_item_count
    )
  );

  return v_packet.id;
end;
$$;

create or replace function get_active_auditor_portal_participant(
  p_auth_user_id uuid,
  p_portal_key text
)
returns admin_security_auditor_portal_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_portal admin_security_auditor_portals%rowtype;
  v_participant admin_security_auditor_portal_participants%rowtype;
begin
  select *
  into v_portal
  from admin_security_auditor_portals
  where portal_key = p_portal_key;

  if v_portal.id is null then
    raise exception 'auditor portal not found: %', p_portal_key;
  end if;

  if v_portal.status <> 'published'
    or v_portal.access_starts_at > now()
    or v_portal.access_expires_at <= now()
  then
    raise exception 'auditor portal is not available';
  end if;

  select *
  into v_participant
  from admin_security_auditor_portal_participants
  where auditor_portal_id = v_portal.id
    and auth_user_id = p_auth_user_id
    and status = 'active';

  if v_participant.id is null then
    raise exception 'auditor portal participant access denied';
  end if;

  update admin_security_auditor_portal_participants
  set
    last_accessed_at = now(),
    access_count = access_count + 1,
    updated_at = now()
  where id = v_participant.id;

  return v_participant;
end;
$$;

create or replace function list_auditor_portal_for_participant(
  p_auth_user_id uuid,
  p_portal_key text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_participant admin_security_auditor_portal_participants%rowtype;
  v_portal admin_security_auditor_portals%rowtype;
  v_packets jsonb;
  v_timeline jsonb;
begin
  v_participant := get_active_auditor_portal_participant(
    p_auth_user_id,
    p_portal_key
  );

  select *
  into v_portal
  from admin_security_auditor_portals
  where id = v_participant.auditor_portal_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'packetKey', p.packet_key,
        'packetType', p.packet_type,
        'title', p.title,
        'summary', p.summary,
        'scope', p.scope,
        'itemCount', p.item_count,
        'allowDownload', p.allow_download,
        'requireAcknowledgement', p.require_acknowledgement,
        'publishedAt', p.published_at,
        'checksumSha256', p.checksum_sha256,
        'signature', p.signature,
        'signedAt', p.signed_at
      )
      order by p.created_at asc
    ),
    '[]'::jsonb
  )
  into v_packets
  from admin_security_auditor_evidence_packets p
  where p.auditor_portal_id = v_portal.id
    and p.status = 'published';

  if v_portal.allow_timeline_access is true then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'eventKey', e.event_key,
          'eventType', e.event_type,
          'eventSeverity', e.event_severity,
          'title', e.title,
          'summary', e.summary,
          'artifactKey', e.artifact_key,
          'artifactType', e.artifact_type,
          'artifactFormat', e.artifact_format,
          'verificationStatus', e.verification_status,
          'checksumSha256', e.checksum_sha256,
          'signatureAlgorithm', e.signature_algorithm,
          'signingKeyVersion', e.signing_key_version,
          'signature', e.signature,
          'disclosurePackageKey', e.disclosure_package_key,
          'revocationKey', e.revocation_key,
          'issuedAt', e.issued_at,
          'disclosedAt', e.disclosed_at,
          'revokedAt', e.revoked_at,
          'expiresAt', e.expires_at,
          'sortTime', e.sort_time
        )
        order by e.sort_time desc
      ),
      '[]'::jsonb
    )
    into v_timeline
    from (
      select *
      from admin_security_external_trust_timeline_public e
      where (
        e.enterprise_review_room_id = v_portal.enterprise_review_room_id
        or (
          v_portal.customer_name is not null
          and e.customer_name = v_portal.customer_name
        )
      )
        and e.visibility in ('room_only', 'customer_only', 'auditor_only')
        and e.status in ('published', 'superseded', 'revoked')
      order by e.sort_time desc
      limit 100
    ) e;
  else
    v_timeline := '[]'::jsonb;
  end if;

  insert into admin_security_auditor_portal_activity_events (
    auditor_portal_id,
    participant_id,
    activity_type,
    title,
    summary,
    request_id,
    metadata
  )
  values (
    v_portal.id,
    v_participant.id,
    'portal_opened',
    'Auditor portal opened',
    'Auditor participant opened the portal.',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'portal', jsonb_build_object(
      'portalKey', v_portal.portal_key,
      'portalType', v_portal.portal_type,
      'auditorName', v_portal.auditor_name,
      'auditorFirm', v_portal.auditor_firm,
      'customerName', v_portal.customer_name,
      'customerDomain', v_portal.customer_domain,
      'auditType', v_portal.audit_type,
      'auditScope', v_portal.audit_scope,
      'title', v_portal.title,
      'summary', v_portal.summary,
      'accessExpiresAt', v_portal.access_expires_at,
      'requireAcknowledgement', v_portal.require_acknowledgement,
      'allowDownloads', v_portal.allow_downloads,
      'allowQuestions', v_portal.allow_questions,
      'allowTimelineAccess', v_portal.allow_timeline_access
    ),
    'participant', jsonb_build_object(
      'email', v_participant.email,
      'displayName', v_participant.display_name,
      'role', v_participant.participant_role
    ),
    'evidencePackets', v_packets,
    'timeline', v_timeline
  );
end;
$$;

create or replace function list_auditor_evidence_packet_for_participant(
  p_auth_user_id uuid,
  p_portal_key text,
  p_packet_key text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_participant admin_security_auditor_portal_participants%rowtype;
  v_portal admin_security_auditor_portals%rowtype;
  v_packet admin_security_auditor_evidence_packets%rowtype;
  v_items jsonb;
begin
  v_participant := get_active_auditor_portal_participant(
    p_auth_user_id,
    p_portal_key
  );

  select *
  into v_portal
  from admin_security_auditor_portals
  where id = v_participant.auditor_portal_id;

  select *
  into v_packet
  from admin_security_auditor_evidence_packets
  where auditor_portal_id = v_portal.id
    and packet_key = p_packet_key
    and status = 'published';

  if v_packet.id is null then
    raise exception 'auditor evidence packet not found: %', p_packet_key;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'itemType', i.item_type,
        'itemKey', i.item_key,
        'displayTitle', i.display_title,
        'displaySummary', i.display_summary,
        'controlKey', i.control_key,
        'frameworkKey', i.framework_key,
        'checksumSha256', i.checksum_sha256,
        'signature', i.signature,
        'signedAt', i.signed_at,
        'allowDownload', i.allow_download,
        'sortOrder', i.sort_order
      )
      order by i.sort_order asc, i.created_at asc
    ),
    '[]'::jsonb
  )
  into v_items
  from admin_security_auditor_evidence_packet_items i
  where i.evidence_packet_id = v_packet.id
    and i.auditor_safe is true;

  insert into admin_security_auditor_portal_activity_events (
    auditor_portal_id,
    participant_id,
    activity_type,
    source_type,
    source_id,
    title,
    summary,
    request_id,
    metadata
  )
  values (
    v_portal.id,
    v_participant.id,
    'packet_viewed',
    'admin_security_auditor_evidence_packet',
    v_packet.id,
    'Auditor evidence packet viewed',
    v_packet.title,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'packet', jsonb_build_object(
      'packetKey', v_packet.packet_key,
      'packetType', v_packet.packet_type,
      'title', v_packet.title,
      'summary', v_packet.summary,
      'scope', v_packet.scope,
      'itemCount', v_packet.item_count,
      'allowDownload', v_packet.allow_download,
      'requireAcknowledgement', v_packet.require_acknowledgement,
      'checksumSha256', v_packet.checksum_sha256,
      'signature', v_packet.signature,
      'signedAt', v_packet.signed_at,
      'publishedAt', v_packet.published_at
    ),
    'items', v_items
  );
end;
$$;

create or replace function acknowledge_auditor_portal_item(
  p_auth_user_id uuid,
  p_portal_key text,
  p_acknowledgement_type text,
  p_source_type text,
  p_source_id uuid,
  p_statement text,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_participant admin_security_auditor_portal_participants%rowtype;
  v_portal admin_security_auditor_portals%rowtype;
  v_ack_id uuid;
begin
  v_participant := get_active_auditor_portal_participant(
    p_auth_user_id,
    p_portal_key
  );

  select *
  into v_portal
  from admin_security_auditor_portals
  where id = v_participant.auditor_portal_id;

  if p_statement is null or length(trim(p_statement)) = 0 then
    raise exception 'auditor acknowledgement statement is required';
  end if;

  insert into admin_security_auditor_acknowledgements (
    auditor_portal_id,
    participant_id,
    acknowledgement_type,
    source_type,
    source_id,
    statement,
    accepted,
    ip_address,
    user_agent,
    request_id,
    metadata
  )
  values (
    v_portal.id,
    v_participant.id,
    p_acknowledgement_type,
    p_source_type,
    p_source_id,
    p_statement,
    true,
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (participant_id, acknowledgement_type, source_type, source_id)
  do update set
    acknowledged_at = now(),
    statement = excluded.statement,
    accepted = true,
    ip_address = excluded.ip_address,
    user_agent = excluded.user_agent,
    request_id = excluded.request_id,
    metadata = admin_security_auditor_acknowledgements.metadata || excluded.metadata
  returning id into v_ack_id;

  insert into admin_security_auditor_portal_activity_events (
    auditor_portal_id,
    participant_id,
    activity_type,
    source_type,
    source_id,
    title,
    summary,
    ip_address,
    user_agent,
    request_id,
    metadata
  )
  values (
    v_portal.id,
    v_participant.id,
    'acknowledgement_created',
    p_source_type,
    p_source_id,
    'Auditor acknowledgement created',
    p_statement,
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_ack_id;
end;
$$;

create or replace function submit_auditor_question(
  p_auth_user_id uuid,
  p_portal_key text,
  p_subject text,
  p_question_text text,
  p_priority text default 'medium',
  p_category text default null,
  p_related_source_type text default null,
  p_related_source_id uuid default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_participant admin_security_auditor_portal_participants%rowtype;
  v_portal admin_security_auditor_portals%rowtype;
  v_question_id uuid;
  v_question_key text;
begin
  v_participant := get_active_auditor_portal_participant(
    p_auth_user_id,
    p_portal_key
  );

  select *
  into v_portal
  from admin_security_auditor_portals
  where id = v_participant.auditor_portal_id;

  if v_portal.allow_questions is not true then
    raise exception 'auditor portal does not allow questions';
  end if;

  if p_subject is null or length(trim(p_subject)) = 0 then
    raise exception 'auditor question subject is required';
  end if;

  if p_question_text is null or length(trim(p_question_text)) = 0 then
    raise exception 'auditor question text is required';
  end if;

  v_question_key :=
    'auditor_question:' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_auditor_questions (
    auditor_portal_id,
    participant_id,
    question_key,
    status,
    priority,
    category,
    subject,
    question_text,
    related_source_type,
    related_source_id,
    request_id,
    metadata
  )
  values (
    v_portal.id,
    v_participant.id,
    v_question_key,
    'open',
    coalesce(p_priority, 'medium'),
    p_category,
    p_subject,
    p_question_text,
    p_related_source_type,
    p_related_source_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_question_id;

  insert into admin_security_auditor_portal_activity_events (
    auditor_portal_id,
    participant_id,
    activity_type,
    source_type,
    source_id,
    title,
    summary,
    request_id,
    metadata
  )
  values (
    v_portal.id,
    v_participant.id,
    'question_submitted',
    'admin_security_auditor_question',
    v_question_id,
    'Auditor question submitted',
    p_subject,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_question_id;
end;
$$;

create or replace function answer_admin_security_auditor_question(
  p_admin_auth_user_id uuid,
  p_auditor_question_id uuid,
  p_answer_text text,
  p_internal_note text default null,
  p_close_question boolean default true,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_question admin_security_auditor_questions%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_answer_text is null or length(trim(p_answer_text)) = 0 then
    raise exception 'auditor question answer text is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_question
  from admin_security_auditor_questions
  where id = p_auditor_question_id
  for update;

  if v_question.id is null then
    raise exception 'auditor question not found: %', p_auditor_question_id;
  end if;

  if v_question.status not in ('open', 'answered') then
    raise exception 'cannot answer auditor question status: %', v_question.status;
  end if;

  update admin_security_auditor_questions
  set
    status = case when coalesce(p_close_question, true) then 'closed' else 'answered' end,
    answer_text = p_answer_text,
    answered_by_auth_user_id = p_admin_auth_user_id,
    answered_by_admin_user_id = v_admin.id,
    answered_at = now(),
    internal_note = p_internal_note,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_question.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'answer_admin_security_auditor_question',
    'admin.write',
    'admin_security_auditor_question',
    v_question.id,
    p_request_id,
    null,
    null,
    'allowed',
    'auditor question answered',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'auditor_portal_id',
      v_question.auditor_portal_id,
      'question_key',
      v_question.question_key
    )
  );

  return v_question.id;
end;
$$;

create or replace view admin_security_auditor_portal_dashboard as
select
  p.id as admin_security_auditor_portal_id,
  p.portal_key,
  p.status,
  p.portal_type,
  p.auditor_name,
  p.auditor_domain,
  p.auditor_firm,
  p.customer_name,
  p.customer_domain,
  p.audit_type,
  p.audit_scope,
  p.title,
  p.summary,
  p.enterprise_review_room_id,
  r.room_key as enterprise_review_room_key,
  p.audit_period_id,
  ap.period_key as audit_period_key,
  p.access_starts_at,
  p.access_expires_at,
  p.require_acknowledgement,
  p.allow_downloads,
  p.allow_questions,
  p.allow_timeline_access,
  p.published_at,
  p.revoked_at,
  creator.email as created_by_email,
  (
    select count(*)
    from admin_security_auditor_portal_participants part
    where part.auditor_portal_id = p.id
      and part.status in ('invited', 'active')
  ) as active_participant_count,
  (
    select count(*)
    from admin_security_auditor_evidence_packets ep
    where ep.auditor_portal_id = p.id
      and ep.status = 'published'
  ) as published_packet_count,
  (
    select count(*)
    from admin_security_auditor_questions q
    where q.auditor_portal_id = p.id
      and q.status = 'open'
  ) as open_question_count,
  (
    select count(*)
    from admin_security_auditor_acknowledgements a
    where a.auditor_portal_id = p.id
  ) as acknowledgement_count,
  p.created_at,
  p.updated_at,
  p.metadata
from admin_security_auditor_portals p
left join admin_security_enterprise_review_rooms r
  on r.id = p.enterprise_review_room_id
left join admin_security_audit_periods ap
  on ap.id = p.audit_period_id
left join admin_users creator
  on creator.id = p.created_by_admin_user_id
order by p.created_at desc;

create or replace view admin_security_auditor_evidence_packet_dashboard as
select
  ep.id as admin_security_auditor_evidence_packet_id,
  ep.auditor_portal_id,
  p.portal_key,
  p.auditor_name,
  p.customer_name,
  ep.packet_key,
  ep.status,
  ep.packet_type,
  ep.title,
  ep.summary,
  ep.scope,
  ep.disclosure_package_id,
  dp.package_key as disclosure_package_key,
  ep.compliance_report_request_id,
  cr.report_key,
  ep.questionnaire_export_id,
  qe.export_key as questionnaire_export_key,
  ep.audit_period_export_request_id,
  ae.export_key as audit_period_export_key,
  ep.checksum_sha256,
  ep.signature,
  ep.signed_at,
  ep.item_count,
  ep.allow_download,
  ep.require_acknowledgement,
  ep.published_at,
  ep.created_at,
  ep.updated_at,
  ep.metadata
from admin_security_auditor_evidence_packets ep
join admin_security_auditor_portals p
  on p.id = ep.auditor_portal_id
left join admin_security_disclosure_packages dp
  on dp.id = ep.disclosure_package_id
left join admin_security_compliance_report_requests cr
  on cr.id = ep.compliance_report_request_id
left join admin_security_questionnaire_exports qe
  on qe.id = ep.questionnaire_export_id
left join admin_security_audit_period_export_requests ae
  on ae.id = ep.audit_period_export_request_id
order by ep.created_at desc;

create or replace view admin_security_auditor_question_dashboard as
select
  q.id as admin_security_auditor_question_id,
  q.auditor_portal_id,
  p.portal_key,
  p.auditor_name,
  p.customer_name,
  q.participant_id,
  part.email as participant_email,
  part.display_name as participant_display_name,
  q.question_key,
  q.status,
  q.priority,
  q.category,
  q.subject,
  q.question_text,
  q.related_source_type,
  q.related_source_id,
  q.answer_text,
  answerer.email as answered_by_email,
  q.answered_at,
  q.created_at,
  q.updated_at,
  q.metadata
from admin_security_auditor_questions q
join admin_security_auditor_portals p
  on p.id = q.auditor_portal_id
left join admin_security_auditor_portal_participants part
  on part.id = q.participant_id
left join admin_users answerer
  on answerer.id = q.answered_by_admin_user_id
order by q.created_at desc;

create or replace view admin_security_auditor_portal_integrity as
select
  (
    select count(*)
    from admin_security_auditor_portals
    where status = 'published'
  ) as published_portal_count,

  (
    select count(*)
    from admin_security_auditor_portals
    where status = 'published'
      and access_expires_at <= now()
  ) as expired_published_portal_count,

  (
    select count(*)
    from admin_security_auditor_portals p
    where p.status = 'published'
      and not exists (
        select 1
        from admin_security_auditor_portal_participants part
        where part.auditor_portal_id = p.id
          and part.status = 'active'
      )
  ) as published_portal_without_active_participant_count,

  (
    select count(*)
    from admin_security_auditor_portals p
    where p.status = 'published'
      and not exists (
        select 1
        from admin_security_auditor_evidence_packets ep
        where ep.auditor_portal_id = p.id
          and ep.status = 'published'
      )
  ) as published_portal_without_packet_count,

  (
    select count(*)
    from admin_security_auditor_questions
    where status = 'open'
  ) as open_auditor_question_count,

  (
    select count(*)
    from admin_security_auditor_portal_activity_events
    where created_at >= now() - interval '24 hours'
  ) as activity_event_count_24h,

  now() as checked_at;

grant select on admin_security_auditor_portal_dashboard to admin_api_role;
grant select on admin_security_auditor_evidence_packet_dashboard to admin_api_role;
grant select on admin_security_auditor_question_dashboard to admin_api_role;
grant select on admin_security_auditor_portal_integrity to admin_api_role;

alter table admin_security_auditor_portals enable row level security;
alter table admin_security_auditor_portal_participants enable row level security;
alter table admin_security_auditor_evidence_packets enable row level security;
alter table admin_security_auditor_evidence_packet_items enable row level security;
alter table admin_security_auditor_questions enable row level security;
alter table admin_security_auditor_acknowledgements enable row level security;
alter table admin_security_auditor_portal_activity_events enable row level security;

drop policy if exists admin_security_auditor_portals_no_user_direct_access on admin_security_auditor_portals;
create policy admin_security_auditor_portals_no_user_direct_access
on admin_security_auditor_portals
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_portal_participants_no_user_direct_access on admin_security_auditor_portal_participants;
create policy admin_security_auditor_portal_participants_no_user_direct_access
on admin_security_auditor_portal_participants
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_evidence_packets_no_user_direct_access on admin_security_auditor_evidence_packets;
create policy admin_security_auditor_evidence_packets_no_user_direct_access
on admin_security_auditor_evidence_packets
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_evidence_packet_items_no_user_direct_access on admin_security_auditor_evidence_packet_items;
create policy admin_security_auditor_evidence_packet_items_no_user_direct_access
on admin_security_auditor_evidence_packet_items
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_questions_no_user_direct_access on admin_security_auditor_questions;
create policy admin_security_auditor_questions_no_user_direct_access
on admin_security_auditor_questions
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_acknowledgements_no_user_direct_access on admin_security_auditor_acknowledgements;
create policy admin_security_auditor_acknowledgements_no_user_direct_access
on admin_security_auditor_acknowledgements
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_portal_activity_events_no_user_direct_access on admin_security_auditor_portal_activity_events;
create policy admin_security_auditor_portal_activity_events_no_user_direct_access
on admin_security_auditor_portal_activity_events
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_auditor_portals on admin_security_auditor_portals;
create policy admin_api_all_admin_security_auditor_portals
on admin_security_auditor_portals
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_auditor_portal_participants on admin_security_auditor_portal_participants;
create policy admin_api_all_admin_security_auditor_portal_participants
on admin_security_auditor_portal_participants
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_auditor_evidence_packets on admin_security_auditor_evidence_packets;
create policy admin_api_all_admin_security_auditor_evidence_packets
on admin_security_auditor_evidence_packets
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_auditor_evidence_packet_items on admin_security_auditor_evidence_packet_items;
create policy admin_api_all_admin_security_auditor_evidence_packet_items
on admin_security_auditor_evidence_packet_items
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_auditor_questions on admin_security_auditor_questions;
create policy admin_api_all_admin_security_auditor_questions
on admin_security_auditor_questions
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_auditor_acknowledgements on admin_security_auditor_acknowledgements;
create policy admin_api_all_admin_security_auditor_acknowledgements
on admin_security_auditor_acknowledgements
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_auditor_portal_activity_events on admin_security_auditor_portal_activity_events;
create policy admin_api_all_admin_security_auditor_portal_activity_events
on admin_security_auditor_portal_activity_events
for all
to admin_api_role
using (true)
with check (true);

grant execute on function create_admin_security_auditor_portal(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  timestamptz,
  timestamptz,
  boolean,
  boolean,
  boolean,
  boolean,
  text,
  jsonb
) to admin_api_role;

grant execute on function invite_admin_security_auditor_portal_participant(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function publish_admin_security_auditor_portal(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function create_admin_security_auditor_evidence_packet(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  boolean,
  boolean,
  text,
  jsonb
) to admin_api_role;

grant execute on function add_admin_security_auditor_evidence_packet_item(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean,
  boolean,
  boolean,
  integer,
  jsonb
) to admin_api_role;

grant execute on function publish_admin_security_auditor_evidence_packet(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function get_active_auditor_portal_participant(uuid, text)
to admin_api_role;

grant execute on function list_auditor_portal_for_participant(uuid, text, text, jsonb)
to admin_api_role;

grant execute on function list_auditor_evidence_packet_for_participant(uuid, text, text, text, jsonb)
to admin_api_role;

grant execute on function acknowledge_auditor_portal_item(uuid, text, text, text, uuid, text, inet, text, text, jsonb)
to admin_api_role;

grant execute on function submit_auditor_question(uuid, text, text, text, text, text, text, uuid, text, jsonb)
to admin_api_role;

grant execute on function answer_admin_security_auditor_question(uuid, uuid, text, text, boolean, text, jsonb)
to admin_api_role;

alter function create_admin_security_auditor_portal(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  timestamptz,
  timestamptz,
  boolean,
  boolean,
  boolean,
  boolean,
  text,
  jsonb
) security definer;
alter function create_admin_security_auditor_portal(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  timestamptz,
  timestamptz,
  boolean,
  boolean,
  boolean,
  boolean,
  text,
  jsonb
) set search_path = public;

alter function invite_admin_security_auditor_portal_participant(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  jsonb
) security definer;
alter function invite_admin_security_auditor_portal_participant(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  jsonb
) set search_path = public;

alter function publish_admin_security_auditor_portal(uuid, uuid, text, text, jsonb) security definer;
alter function publish_admin_security_auditor_portal(uuid, uuid, text, text, jsonb) set search_path = public;

alter function create_admin_security_auditor_evidence_packet(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  boolean,
  boolean,
  text,
  jsonb
) security definer;
alter function create_admin_security_auditor_evidence_packet(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  boolean,
  boolean,
  text,
  jsonb
) set search_path = public;

alter function add_admin_security_auditor_evidence_packet_item(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean,
  boolean,
  boolean,
  integer,
  jsonb
) security definer;
alter function add_admin_security_auditor_evidence_packet_item(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean,
  boolean,
  boolean,
  integer,
  jsonb
) set search_path = public;

alter function publish_admin_security_auditor_evidence_packet(uuid, uuid, text, text, jsonb) security definer;
alter function publish_admin_security_auditor_evidence_packet(uuid, uuid, text, text, jsonb) set search_path = public;

alter function list_auditor_portal_for_participant(uuid, text, text, jsonb) security definer;
alter function list_auditor_portal_for_participant(uuid, text, text, jsonb) set search_path = public;

alter function list_auditor_evidence_packet_for_participant(uuid, text, text, text, jsonb) security definer;
alter function list_auditor_evidence_packet_for_participant(uuid, text, text, text, jsonb) set search_path = public;

alter function acknowledge_auditor_portal_item(uuid, text, text, text, uuid, text, inet, text, text, jsonb) security definer;
alter function acknowledge_auditor_portal_item(uuid, text, text, text, uuid, text, inet, text, text, jsonb) set search_path = public;

alter function submit_auditor_question(uuid, text, text, text, text, text, text, uuid, text, jsonb) security definer;
alter function submit_auditor_question(uuid, text, text, text, text, text, text, uuid, text, jsonb) set search_path = public;

alter function answer_admin_security_auditor_question(uuid, uuid, text, text, boolean, text, jsonb) security definer;
alter function answer_admin_security_auditor_question(uuid, uuid, text, text, boolean, text, jsonb) set search_path = public;

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
    'AUDITOR_PORTAL_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Auditor portal not found.',
    'Auditor portal not found.',
    'platform'
  ),
  (
    'AUDITOR_PORTAL_ACCESS_DENIED',
    'permission',
    'high',
    403,
    false,
    true,
    'You do not have access to this auditor portal.',
    'Auditor portal participant access denied.',
    'platform'
  ),
  (
    'AUDITOR_PORTAL_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Auditor portal cannot be used from its current state.',
    'Auditor portal invalid state.',
    'platform'
  ),
  (
    'AUDITOR_PORTAL_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Auditor portal request requires complete fields.',
    'Auditor portal required fields missing.',
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
  ('auditor portal not found', 'AUDITOR_PORTAL_NOT_FOUND', 5, '{}'),
  ('auditor evidence packet not found', 'AUDITOR_PORTAL_NOT_FOUND', 5, '{}'),
  ('auditor question not found', 'AUDITOR_PORTAL_NOT_FOUND', 5, '{}'),
  ('auditor portal participant access denied', 'AUDITOR_PORTAL_ACCESS_DENIED', 5, '{}'),
  ('auditor portal is not available', 'AUDITOR_PORTAL_INVALID_STATE', 5, '{}'),
  ('cannot invite participant to auditor portal status', 'AUDITOR_PORTAL_INVALID_STATE', 5, '{}'),
  ('cannot publish auditor portal status', 'AUDITOR_PORTAL_INVALID_STATE', 5, '{}'),
  ('cannot create evidence packet for auditor portal status', 'AUDITOR_PORTAL_INVALID_STATE', 5, '{}'),
  ('cannot add item to auditor evidence packet status', 'AUDITOR_PORTAL_INVALID_STATE', 5, '{}'),
  ('cannot publish auditor evidence packet status', 'AUDITOR_PORTAL_INVALID_STATE', 5, '{}'),
  ('cannot answer auditor question status', 'AUDITOR_PORTAL_INVALID_STATE', 5, '{}'),
  ('auditor portal requires at least one participant before publishing', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor portal requires at least one evidence packet before publishing', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor evidence packet requires at least one auditor-safe item', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor name is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor portal audit scope is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor portal title is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor portal summary is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('valid auditor participant email is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor evidence packet title is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor evidence packet summary is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor evidence packet scope is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor evidence packet item title is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor evidence packet item summary is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor acknowledgement statement is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor question subject is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor question text is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}'),
  ('auditor question answer text is required', 'AUDITOR_PORTAL_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
