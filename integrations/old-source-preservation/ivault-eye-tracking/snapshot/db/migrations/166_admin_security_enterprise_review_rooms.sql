-- Step 9.51 — Build enterprise security review rooms.
-- Runs after 165_admin_security_compliance_trust_center.sql.

create table if not exists admin_security_enterprise_review_rooms (
  id uuid primary key default gen_random_uuid(),
  room_key text not null unique,
  status text not null default 'draft',
  customer_name text not null,
  customer_domain text,
  customer_external_id text,
  room_title text not null,
  room_summary text not null,
  review_type text not null default 'enterprise_security_review',
  sales_owner_auth_user_id uuid,
  security_owner_auth_user_id uuid,
  access_starts_at timestamptz not null default now(),
  access_expires_at timestamptz not null,
  require_nda boolean not null default true,
  require_email_domain_match boolean not null default false,
  published_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  created_by_auth_user_id uuid not null,
  created_by_admin_user_id uuid references admin_users(id),
  updated_by_auth_user_id uuid,
  updated_by_admin_user_id uuid references admin_users(id),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_enterprise_review_rooms_status_check
    check (status in ('draft', 'published', 'expired', 'revoked', 'archived')),
  constraint admin_security_enterprise_review_rooms_review_type_check
    check (
      review_type in (
        'enterprise_security_review',
        'vendor_security_review',
        'procurement_review',
        'compliance_review',
        'security_questionnaire',
        'strategic_customer_review'
      )
    ),
  constraint admin_security_enterprise_review_rooms_access_window_check
    check (access_expires_at > access_starts_at),
  constraint admin_security_enterprise_review_rooms_customer_check
    check (length(trim(customer_name)) > 0),
  constraint admin_security_enterprise_review_rooms_title_check
    check (length(trim(room_title)) > 0),
  constraint admin_security_enterprise_review_rooms_summary_check
    check (length(trim(room_summary)) > 0)
);

create index if not exists admin_security_enterprise_review_rooms_status_idx
on admin_security_enterprise_review_rooms (status, access_expires_at);

create index if not exists admin_security_enterprise_review_rooms_customer_idx
on admin_security_enterprise_review_rooms (customer_name, status);

drop trigger if exists admin_security_enterprise_review_rooms_set_updated_at
on admin_security_enterprise_review_rooms;

create trigger admin_security_enterprise_review_rooms_set_updated_at
before update on admin_security_enterprise_review_rooms
for each row
execute function set_updated_at();

create table if not exists admin_security_enterprise_review_room_participants (
  id uuid primary key default gen_random_uuid(),
  review_room_id uuid not null
    references admin_security_enterprise_review_rooms(id)
    on delete cascade,
  status text not null default 'invited',
  participant_type text not null default 'customer_reviewer',
  auth_user_id uuid,
  email text not null,
  display_name text,
  organization_name text,
  role_title text,
  invitation_token_hash text,
  invited_at timestamptz not null default now(),
  invited_by_auth_user_id uuid,
  invited_by_admin_user_id uuid references admin_users(id),
  accepted_at timestamptz,
  last_seen_at timestamptz,
  nda_status text not null default 'not_required',
  nda_accepted_at timestamptz,
  nda_version text,
  nda_ip_address inet,
  nda_user_agent text,
  revoked_at timestamptz,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id),
  revoke_reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (review_room_id, email),
  constraint admin_security_enterprise_review_room_participants_status_check
    check (status in ('invited', 'active', 'suspended', 'revoked', 'expired')),
  constraint admin_security_enterprise_review_room_participants_type_check
    check (
      participant_type in (
        'customer_reviewer',
        'customer_admin',
        'procurement',
        'legal',
        'security',
        'sales_owner',
        'internal_security_owner',
        'external_auditor'
      )
    ),
  constraint admin_security_enterprise_review_room_participants_nda_check
    check (nda_status in ('not_required', 'pending', 'accepted', 'rejected', 'expired')),
  constraint admin_security_enterprise_review_room_participants_email_check
    check (position('@' in email) > 1)
);

create index if not exists admin_security_enterprise_review_room_participants_room_idx
on admin_security_enterprise_review_room_participants (review_room_id, status);

create index if not exists admin_security_enterprise_review_room_participants_email_idx
on admin_security_enterprise_review_room_participants (email, status);

drop trigger if exists admin_security_enterprise_review_room_participants_set_updated_at
on admin_security_enterprise_review_room_participants;

create trigger admin_security_enterprise_review_room_participants_set_updated_at
before update on admin_security_enterprise_review_room_participants
for each row
execute function set_updated_at();

create table if not exists admin_security_enterprise_review_room_document_grants (
  id uuid primary key default gen_random_uuid(),
  review_room_id uuid not null
    references admin_security_enterprise_review_rooms(id)
    on delete cascade,
  status text not null default 'active',
  document_type text not null,
  compliance_report_request_id uuid
    references admin_security_compliance_report_requests(id)
    on delete set null,
  audit_period_export_request_id uuid
    references admin_security_audit_period_export_requests(id)
    on delete set null,
  trust_center_report_id uuid
    references admin_security_trust_center_reports(id)
    on delete set null,
  display_title text not null,
  display_summary text not null,
  visibility text not null default 'room_only',
  allow_download boolean not null default true,
  allow_public_verification boolean not null default true,
  access_starts_at timestamptz not null default now(),
  access_expires_at timestamptz,
  sort_order integer not null default 0,
  granted_by_auth_user_id uuid not null,
  granted_by_admin_user_id uuid references admin_users(id),
  revoked_at timestamptz,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id),
  revoke_reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_enterprise_review_room_document_grants_status_check
    check (status in ('active', 'revoked', 'expired')),
  constraint admin_security_enterprise_review_room_document_grants_type_check
    check (
      document_type in (
        'compliance_report',
        'audit_period_export',
        'trust_center_report',
        'security_overview',
        'penetration_test_summary',
        'questionnaire_response',
        'other'
      )
    ),
  constraint admin_security_enterprise_review_room_document_grants_visibility_check
    check (visibility in ('room_only', 'participant_specific', 'download_disabled')),
  constraint admin_security_enterprise_review_room_document_grants_title_check
    check (length(trim(display_title)) > 0),
  constraint admin_security_enterprise_review_room_document_grants_summary_check
    check (length(trim(display_summary)) > 0),
  constraint admin_security_enterprise_review_room_document_grants_shape_check
    check (
      compliance_report_request_id is not null
      or audit_period_export_request_id is not null
      or trust_center_report_id is not null
      or document_type in (
        'security_overview',
        'penetration_test_summary',
        'questionnaire_response',
        'other'
      )
    )
);

create index if not exists admin_security_enterprise_review_room_document_grants_room_idx
on admin_security_enterprise_review_room_document_grants (review_room_id, status, sort_order);

create index if not exists admin_security_enterprise_review_room_document_grants_report_idx
on admin_security_enterprise_review_room_document_grants (compliance_report_request_id);

create index if not exists admin_security_enterprise_review_room_document_grants_export_idx
on admin_security_enterprise_review_room_document_grants (audit_period_export_request_id);

drop trigger if exists admin_security_enterprise_review_room_document_grants_set_updated_at
on admin_security_enterprise_review_room_document_grants;

create trigger admin_security_enterprise_review_room_document_grants_set_updated_at
before update on admin_security_enterprise_review_room_document_grants
for each row
execute function set_updated_at();

create table if not exists admin_security_enterprise_review_room_access_events (
  id uuid primary key default gen_random_uuid(),
  review_room_id uuid
    references admin_security_enterprise_review_rooms(id)
    on delete set null,
  participant_id uuid
    references admin_security_enterprise_review_room_participants(id)
    on delete set null,
  auth_user_id uuid,
  email text,
  event_key text not null,
  severity text not null default 'medium',
  document_grant_id uuid
    references admin_security_enterprise_review_room_document_grants(id)
    on delete set null,
  source_type text,
  source_id uuid,
  allowed boolean not null default true,
  reason text,
  ip_address inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_enterprise_review_room_access_events_severity_check
    check (severity in ('low', 'medium', 'high', 'critical'))
);

create index if not exists admin_security_enterprise_review_room_access_events_room_idx
on admin_security_enterprise_review_room_access_events (review_room_id, created_at desc);

create index if not exists admin_security_enterprise_review_room_access_events_participant_idx
on admin_security_enterprise_review_room_access_events (participant_id, created_at desc);

create index if not exists admin_security_enterprise_review_room_access_events_key_idx
on admin_security_enterprise_review_room_access_events (event_key, created_at desc);

create or replace function record_admin_security_enterprise_review_room_event(
  p_review_room_id uuid,
  p_participant_id uuid,
  p_auth_user_id uuid,
  p_email text,
  p_event_key text,
  p_severity text default 'medium',
  p_document_grant_id uuid default null,
  p_source_type text default null,
  p_source_id uuid default null,
  p_allowed boolean default true,
  p_reason text default null,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event_id uuid;
begin
  if p_event_key is null or length(trim(p_event_key)) = 0 then
    raise exception 'review room event key is required';
  end if;

  insert into admin_security_enterprise_review_room_access_events (
    review_room_id,
    participant_id,
    auth_user_id,
    email,
    event_key,
    severity,
    document_grant_id,
    source_type,
    source_id,
    allowed,
    reason,
    ip_address,
    user_agent,
    request_id,
    metadata
  )
  values (
    p_review_room_id,
    p_participant_id,
    p_auth_user_id,
    p_email,
    p_event_key,
    coalesce(p_severity, 'medium'),
    p_document_grant_id,
    p_source_type,
    p_source_id,
    coalesce(p_allowed, true),
    p_reason,
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function get_active_enterprise_review_room_participant(
  p_auth_user_id uuid,
  p_room_key text
)
returns admin_security_enterprise_review_room_participants
language plpgsql
stable
as $$
declare
  v_participant admin_security_enterprise_review_room_participants%rowtype;
begin
  if p_auth_user_id is null then
    raise exception 'auth user id is required';
  end if;

  if p_room_key is null or length(trim(p_room_key)) = 0 then
    raise exception 'review room key is required';
  end if;

  select p.*
  into v_participant
  from admin_security_enterprise_review_room_participants p
  join admin_security_enterprise_review_rooms r
    on r.id = p.review_room_id
  where r.room_key = p_room_key
    and r.status = 'published'
    and r.access_starts_at <= now()
    and r.access_expires_at > now()
    and p.auth_user_id = p_auth_user_id
    and p.status = 'active'
    and (r.require_nda is false or p.nda_status = 'accepted')
  limit 1;

  if v_participant.id is null then
    raise exception 'active review room participant access not found';
  end if;

  return v_participant;
end;
$$;

create or replace function create_admin_security_enterprise_review_room(
  p_admin_auth_user_id uuid,
  p_customer_name text,
  p_customer_domain text,
  p_customer_external_id text,
  p_room_title text,
  p_room_summary text,
  p_review_type text,
  p_sales_owner_auth_user_id uuid,
  p_security_owner_auth_user_id uuid,
  p_access_starts_at timestamptz,
  p_access_expires_at timestamptz,
  p_require_nda boolean default true,
  p_require_email_domain_match boolean default false,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_room_id uuid;
  v_room_key text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'customer name is required';
  end if;

  if p_room_title is null or length(trim(p_room_title)) = 0 then
    raise exception 'review room title is required';
  end if;

  if p_room_summary is null or length(trim(p_room_summary)) = 0 then
    raise exception 'review room summary is required';
  end if;

  if p_access_expires_at <= coalesce(p_access_starts_at, now()) then
    raise exception 'review room expiry must be after start';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  v_room_key :=
    'review_room:' ||
    regexp_replace(lower(p_customer_name), '[^a-z0-9]+', '-', 'g') ||
    ':' ||
    substr(encode(gen_random_bytes(6), 'hex'), 1, 12);

  insert into admin_security_enterprise_review_rooms (
    room_key,
    status,
    customer_name,
    customer_domain,
    customer_external_id,
    room_title,
    room_summary,
    review_type,
    sales_owner_auth_user_id,
    security_owner_auth_user_id,
    access_starts_at,
    access_expires_at,
    require_nda,
    require_email_domain_match,
    created_by_auth_user_id,
    created_by_admin_user_id,
    updated_by_auth_user_id,
    updated_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_room_key,
    'draft',
    p_customer_name,
    p_customer_domain,
    p_customer_external_id,
    p_room_title,
    p_room_summary,
    coalesce(p_review_type, 'enterprise_security_review'),
    p_sales_owner_auth_user_id,
    p_security_owner_auth_user_id,
    coalesce(p_access_starts_at, now()),
    p_access_expires_at,
    coalesce(p_require_nda, true),
    coalesce(p_require_email_domain_match, false),
    p_admin_auth_user_id,
    v_admin.id,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_room_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_security_enterprise_review_room',
    'admin.write',
    'admin_security_enterprise_review_room',
    v_room_id,
    p_request_id,
    null,
    null,
    'allowed',
    'enterprise security review room created',
    p_metadata || jsonb_build_object(
      'customer_name',
      p_customer_name,
      'review_type',
      p_review_type
    )
  );

  return v_room_id;
end;
$$;

create or replace function publish_admin_security_enterprise_review_room(
  p_admin_auth_user_id uuid,
  p_review_room_id uuid,
  p_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_room admin_security_enterprise_review_rooms%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'review room publish note is required';
  end if;

  select *
  into v_room
  from admin_security_enterprise_review_rooms
  where id = p_review_room_id
  for update;

  if v_room.id is null then
    raise exception 'enterprise review room not found: %', p_review_room_id;
  end if;

  if v_room.status <> 'draft' then
    raise exception 'review room cannot be published from status: %', v_room.status;
  end if;

  if not exists (
    select 1
    from admin_security_enterprise_review_room_document_grants
    where review_room_id = v_room.id
      and status = 'active'
  ) then
    raise exception 'review room requires at least one active document grant before publishing';
  end if;

  update admin_security_enterprise_review_rooms
  set
    status = 'published',
    published_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'publish_note',
      p_note,
      'publish_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_room.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'publish_admin_security_enterprise_review_room',
    'admin.write',
    'admin_security_enterprise_review_room',
    v_room.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_note,
    p_metadata
  );

  return v_room.id;
end;
$$;

create or replace function invite_admin_security_enterprise_review_room_participant(
  p_admin_auth_user_id uuid,
  p_review_room_id uuid,
  p_email text,
  p_display_name text,
  p_organization_name text,
  p_participant_type text default 'customer_reviewer',
  p_role_title text default null,
  p_auth_user_id uuid default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_room admin_security_enterprise_review_rooms%rowtype;
  v_participant_id uuid;
  v_token text;
  v_token_hash text;
  v_domain text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_email is null or position('@' in p_email) <= 1 then
    raise exception 'valid participant email is required';
  end if;

  select *
  into v_room
  from admin_security_enterprise_review_rooms
  where id = p_review_room_id;

  if v_room.id is null then
    raise exception 'enterprise review room not found: %', p_review_room_id;
  end if;

  if v_room.status not in ('draft', 'published') then
    raise exception 'cannot invite participant to review room status: %', v_room.status;
  end if;

  if v_room.require_email_domain_match is true and v_room.customer_domain is not null then
    v_domain := split_part(lower(p_email), '@', 2);

    if v_domain <> lower(v_room.customer_domain) then
      raise exception 'participant email domain does not match customer domain';
    end if;
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into admin_security_enterprise_review_room_participants (
    review_room_id,
    status,
    participant_type,
    auth_user_id,
    email,
    display_name,
    organization_name,
    role_title,
    invitation_token_hash,
    invited_at,
    invited_by_auth_user_id,
    invited_by_admin_user_id,
    nda_status,
    request_id,
    metadata
  )
  values (
    v_room.id,
    case when p_auth_user_id is not null then 'active' else 'invited' end,
    coalesce(p_participant_type, 'customer_reviewer'),
    p_auth_user_id,
    lower(p_email),
    p_display_name,
    coalesce(p_organization_name, v_room.customer_name),
    p_role_title,
    v_token_hash,
    now(),
    p_admin_auth_user_id,
    v_admin.id,
    case when v_room.require_nda then 'pending' else 'not_required' end,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'invitation_token_preview',
      substr(v_token, 1, 8)
    )
  )
  on conflict (review_room_id, email)
  do update set
    status = case when p_auth_user_id is not null then 'active' else 'invited' end,
    participant_type = excluded.participant_type,
    auth_user_id = coalesce(excluded.auth_user_id, admin_security_enterprise_review_room_participants.auth_user_id),
    display_name = excluded.display_name,
    organization_name = excluded.organization_name,
    role_title = excluded.role_title,
    invitation_token_hash = excluded.invitation_token_hash,
    invited_at = now(),
    invited_by_auth_user_id = p_admin_auth_user_id,
    invited_by_admin_user_id = v_admin.id,
    nda_status = excluded.nda_status,
    metadata = admin_security_enterprise_review_room_participants.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_participant_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'invite_admin_security_enterprise_review_room_participant',
    'admin.write',
    'admin_security_enterprise_review_room_participant',
    v_participant_id,
    p_request_id,
    null,
    p_auth_user_id,
    'allowed',
    'review room participant invited',
    p_metadata || jsonb_build_object(
      'review_room_id',
      v_room.id,
      'email',
      lower(p_email)
    )
  );

  return v_participant_id;
end;
$$;

create or replace function accept_enterprise_review_room_nda(
  p_auth_user_id uuid,
  p_room_key text,
  p_email text,
  p_nda_version text,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_room admin_security_enterprise_review_rooms%rowtype;
  v_participant admin_security_enterprise_review_room_participants%rowtype;
begin
  if p_auth_user_id is null then
    raise exception 'auth user id is required';
  end if;

  if p_email is null or position('@' in p_email) <= 1 then
    raise exception 'valid participant email is required';
  end if;

  select *
  into v_room
  from admin_security_enterprise_review_rooms
  where room_key = p_room_key
    and status = 'published'
    and access_starts_at <= now()
    and access_expires_at > now();

  if v_room.id is null then
    raise exception 'active enterprise review room not found';
  end if;

  select *
  into v_participant
  from admin_security_enterprise_review_room_participants
  where review_room_id = v_room.id
    and lower(email) = lower(p_email)
    and status in ('invited', 'active')
  for update;

  if v_participant.id is null then
    raise exception 'review room participant not found';
  end if;

  if v_participant.auth_user_id is not null and v_participant.auth_user_id <> p_auth_user_id then
    raise exception 'review room participant auth mismatch';
  end if;

  update admin_security_enterprise_review_room_participants
  set
    status = 'active',
    auth_user_id = p_auth_user_id,
    accepted_at = coalesce(accepted_at, now()),
    nda_status = case when v_room.require_nda then 'accepted' else 'not_required' end,
    nda_accepted_at = case when v_room.require_nda then now() else nda_accepted_at end,
    nda_version = p_nda_version,
    nda_ip_address = p_ip_address,
    nda_user_agent = p_user_agent,
    last_seen_at = now(),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_participant.id;

  perform record_admin_security_enterprise_review_room_event(
    v_room.id,
    v_participant.id,
    p_auth_user_id,
    lower(p_email),
    'enterprise_review_room_nda_accepted',
    'high',
    null,
    'admin_security_enterprise_review_room',
    v_room.id,
    true,
    'review room NDA accepted',
    p_ip_address,
    p_user_agent,
    p_request_id,
    p_metadata || jsonb_build_object(
      'nda_version',
      p_nda_version
    )
  );

  return v_participant.id;
end;
$$;

create or replace function grant_admin_security_enterprise_review_room_document(
  p_admin_auth_user_id uuid,
  p_review_room_id uuid,
  p_document_type text,
  p_display_title text,
  p_display_summary text,
  p_compliance_report_request_id uuid default null,
  p_audit_period_export_request_id uuid default null,
  p_trust_center_report_id uuid default null,
  p_visibility text default 'room_only',
  p_allow_download boolean default true,
  p_allow_public_verification boolean default true,
  p_access_starts_at timestamptz default null,
  p_access_expires_at timestamptz default null,
  p_sort_order integer default 0,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_room admin_security_enterprise_review_rooms%rowtype;
  v_report admin_security_compliance_report_requests%rowtype;
  v_export admin_security_audit_period_export_requests%rowtype;
  v_grant_id uuid;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_room
  from admin_security_enterprise_review_rooms
  where id = p_review_room_id;

  if v_room.id is null then
    raise exception 'enterprise review room not found: %', p_review_room_id;
  end if;

  if v_room.status not in ('draft', 'published') then
    raise exception 'cannot grant document to review room status: %', v_room.status;
  end if;

  if p_compliance_report_request_id is not null then
    select *
    into v_report
    from admin_security_compliance_report_requests
    where id = p_compliance_report_request_id;

    if v_report.id is null then
      raise exception 'compliance report request not found: %', p_compliance_report_request_id;
    end if;

    if v_report.status <> 'ready' or v_report.signature is null then
      raise exception 'review room compliance report grant requires ready signed report';
    end if;
  end if;

  if p_audit_period_export_request_id is not null then
    select *
    into v_export
    from admin_security_audit_period_export_requests
    where id = p_audit_period_export_request_id;

    if v_export.id is null then
      raise exception 'audit period export request not found: %', p_audit_period_export_request_id;
    end if;

    if v_export.status <> 'ready' then
      raise exception 'review room audit export grant requires ready export';
    end if;
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  insert into admin_security_enterprise_review_room_document_grants (
    review_room_id,
    status,
    document_type,
    compliance_report_request_id,
    audit_period_export_request_id,
    trust_center_report_id,
    display_title,
    display_summary,
    visibility,
    allow_download,
    allow_public_verification,
    access_starts_at,
    access_expires_at,
    sort_order,
    granted_by_auth_user_id,
    granted_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_room.id,
    'active',
    p_document_type,
    p_compliance_report_request_id,
    p_audit_period_export_request_id,
    p_trust_center_report_id,
    p_display_title,
    p_display_summary,
    coalesce(p_visibility, 'room_only'),
    coalesce(p_allow_download, true),
    coalesce(p_allow_public_verification, true),
    coalesce(p_access_starts_at, now()),
    p_access_expires_at,
    coalesce(p_sort_order, 0),
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_grant_id;

  if p_document_type in ('compliance_report', 'audit_period_export') then
    perform create_admin_security_disclosure_package(
      p_admin_auth_user_id,
      'enterprise_room_publication',
      'high',
      case
        when p_compliance_report_request_id is not null then 'admin_security_compliance_report'
        when p_audit_period_export_request_id is not null then 'admin_security_audit_period_export'
        else 'admin_security_enterprise_review_room_document_grant'
      end,
      coalesce(p_compliance_report_request_id, p_audit_period_export_request_id, v_grant_id),
      'enterprise_review_room',
      v_grant_id,
      p_display_title,
      p_display_summary,
      v_room.customer_name,
      v_room.customer_domain,
      v_room.id,
      p_request_id,
      p_metadata || jsonb_build_object(
        'enterprise_review_room_document_grant_id',
        v_grant_id
      )
    );
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'grant_admin_security_enterprise_review_room_document',
    'admin.write',
    'admin_security_enterprise_review_room_document_grant',
    v_grant_id,
    p_request_id,
    null,
    null,
    'allowed',
    'review room document granted',
    p_metadata || jsonb_build_object(
      'review_room_id',
      v_room.id,
      'document_type',
      p_document_type
    )
  );

  return v_grant_id;
end;
$$;

create or replace function revoke_admin_security_enterprise_review_room(
  p_admin_auth_user_id uuid,
  p_review_room_id uuid,
  p_revoke_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_room admin_security_enterprise_review_rooms%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'revoke_admin_security_enterprise_review_room'
    )
  );

  if p_revoke_reason is null or length(trim(p_revoke_reason)) = 0 then
    raise exception 'review room revoke reason is required';
  end if;

  select *
  into v_room
  from admin_security_enterprise_review_rooms
  where id = p_review_room_id
  for update;

  if v_room.id is null then
    raise exception 'enterprise review room not found: %', p_review_room_id;
  end if;

  update admin_security_enterprise_review_rooms
  set
    status = 'revoked',
    revoked_at = now(),
    revoke_reason = p_revoke_reason,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_room.id;

  update admin_security_enterprise_review_room_participants
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoke_reason = p_revoke_reason,
    updated_at = now()
  where review_room_id = v_room.id
    and status in ('invited', 'active');

  update admin_security_enterprise_review_room_document_grants
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoke_reason = p_revoke_reason,
    updated_at = now()
  where review_room_id = v_room.id
    and status = 'active';

  perform record_admin_action(
    p_admin_auth_user_id,
    'revoke_admin_security_enterprise_review_room',
    'admin.write',
    'admin_security_enterprise_review_room',
    v_room.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_revoke_reason,
    p_metadata
  );

  perform create_admin_security_alert(
    'admin_security_enterprise_review_room_revoked',
    'high',
    p_admin_auth_user_id,
    null,
    'revoke_admin_security_enterprise_review_room',
    null,
    'Enterprise security review room was revoked.',
    p_metadata || jsonb_build_object(
      'review_room_id',
      v_room.id,
      'customer_name',
      v_room.customer_name,
      'reason',
      p_revoke_reason
    )
  );

  return v_room.id;
end;
$$;

create or replace function expire_admin_security_enterprise_review_rooms(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_room record;
begin
  for v_room in
    select *
    from admin_security_enterprise_review_rooms
    where status = 'published'
      and access_expires_at <= now()
    order by access_expires_at asc
    limit p_batch_size
    for update skip locked
  loop
    update admin_security_enterprise_review_rooms
    set
      status = 'expired',
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'expired_at',
        now(),
        'expire_run_id',
        v_run_id
      ),
      updated_at = now()
    where id = v_room.id;

    update admin_security_enterprise_review_room_participants
    set
      status = 'expired',
      updated_at = now()
    where review_room_id = v_room.id
      and status in ('invited', 'active');

    update admin_security_enterprise_review_room_document_grants
    set
      status = 'expired',
      updated_at = now()
    where review_room_id = v_room.id
      and status = 'active';
  end loop;

  return v_run_id;
end;
$$;

create or replace view admin_security_enterprise_review_room_public as
select
  r.id as review_room_id,
  r.room_key,
  r.status,
  r.customer_name,
  r.room_title,
  r.room_summary,
  r.review_type,
  r.access_starts_at,
  r.access_expires_at,
  r.require_nda,
  r.require_email_domain_match,
  r.published_at
from admin_security_enterprise_review_rooms r
where r.status = 'published'
  and r.access_starts_at <= now()
  and r.access_expires_at > now();

create or replace view admin_security_enterprise_review_room_document_public as
select
  g.id as document_grant_id,
  g.review_room_id,
  r.room_key,
  g.document_type,
  g.display_title,
  g.display_summary,
  g.visibility,
  g.allow_download,
  g.allow_public_verification,
  g.compliance_report_request_id,
  cr.report_key,
  cr.report_type,
  cr.report_format,
  cr.checksum_sha256 as report_checksum_sha256,
  cr.signature_algorithm,
  cr.signing_key_version,
  cr.signature,
  cr.signed_at,
  cr.watermark as report_watermark,
  g.audit_period_export_request_id,
  ae.export_key as audit_period_export_key,
  ae.export_type as audit_period_export_type,
  ae.export_format as audit_period_export_format,
  ae.checksum_sha256 as audit_period_export_checksum_sha256,
  ae.watermark as audit_period_export_watermark,
  p.period_key,
  p.period_name,
  p.audit_type,
  p.period_start,
  p.period_end,
  p.seal_checksum_sha256 as period_seal_checksum_sha256,
  g.sort_order,
  g.access_starts_at,
  g.access_expires_at
from admin_security_enterprise_review_room_document_grants g
join admin_security_enterprise_review_rooms r
  on r.id = g.review_room_id
left join admin_security_compliance_report_requests cr
  on cr.id = g.compliance_report_request_id
left join admin_security_audit_period_export_requests ae
  on ae.id = g.audit_period_export_request_id
left join admin_security_audit_periods p
  on p.id = coalesce(cr.audit_period_id, ae.audit_period_id)
where g.status = 'active'
  and g.access_starts_at <= now()
  and (g.access_expires_at is null or g.access_expires_at > now())
  and r.status = 'published'
  and r.access_starts_at <= now()
  and r.access_expires_at > now()
order by g.sort_order asc, g.created_at asc;

grant select on admin_security_enterprise_review_room_public to admin_api_role;
grant select on admin_security_enterprise_review_room_document_public to admin_api_role;

create or replace function list_enterprise_review_room_for_participant(
  p_auth_user_id uuid,
  p_room_key text,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_participant admin_security_enterprise_review_room_participants%rowtype;
  v_room admin_security_enterprise_review_rooms%rowtype;
  v_documents jsonb;
begin
  v_participant := get_active_enterprise_review_room_participant(
    p_auth_user_id,
    p_room_key
  );

  select *
  into v_room
  from admin_security_enterprise_review_rooms
  where id = v_participant.review_room_id;

  update admin_security_enterprise_review_room_participants
  set
    last_seen_at = now(),
    updated_at = now()
  where id = v_participant.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'documentGrantId', d.document_grant_id,
        'documentType', d.document_type,
        'displayTitle', d.display_title,
        'displaySummary', d.display_summary,
        'allowDownload', d.allow_download,
        'allowPublicVerification', d.allow_public_verification,
        'reportKey', d.report_key,
        'reportType', d.report_type,
        'reportFormat', d.report_format,
        'reportChecksumSha256', d.report_checksum_sha256,
        'signatureAlgorithm', d.signature_algorithm,
        'signingKeyVersion', d.signing_key_version,
        'signature', d.signature,
        'signedAt', d.signed_at,
        'auditPeriodExportKey', d.audit_period_export_key,
        'auditPeriodExportType', d.audit_period_export_type,
        'auditPeriodExportFormat', d.audit_period_export_format,
        'auditPeriodExportChecksumSha256', d.audit_period_export_checksum_sha256,
        'periodKey', d.period_key,
        'periodName', d.period_name,
        'auditType', d.audit_type,
        'periodStart', d.period_start,
        'periodEnd', d.period_end,
        'periodSealChecksumSha256', d.period_seal_checksum_sha256
      )
      order by d.sort_order
    ),
    '[]'::jsonb
  )
  into v_documents
  from admin_security_enterprise_review_room_document_public d
  where d.review_room_id = v_room.id;

  perform record_admin_security_enterprise_review_room_event(
    v_room.id,
    v_participant.id,
    p_auth_user_id,
    v_participant.email,
    'enterprise_review_room_viewed',
    'medium',
    null,
    'admin_security_enterprise_review_room',
    v_room.id,
    true,
    'review room viewed',
    p_ip_address,
    p_user_agent,
    p_request_id,
    '{}'::jsonb
  );

  return jsonb_build_object(
    'room', jsonb_build_object(
      'roomKey', v_room.room_key,
      'customerName', v_room.customer_name,
      'roomTitle', v_room.room_title,
      'roomSummary', v_room.room_summary,
      'reviewType', v_room.review_type,
      'accessStartsAt', v_room.access_starts_at,
      'accessExpiresAt', v_room.access_expires_at,
      'requireNda', v_room.require_nda
    ),
    'participant', jsonb_build_object(
      'email', v_participant.email,
      'displayName', v_participant.display_name,
      'organizationName', v_participant.organization_name,
      'participantType', v_participant.participant_type,
      'ndaStatus', v_participant.nda_status
    ),
    'documents', v_documents
  );
end;
$$;

create or replace function register_enterprise_room_compliance_report_download_internal(
  p_compliance_report_request_id uuid,
  p_review_room_id uuid,
  p_participant_id uuid,
  p_auth_user_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  compliance_report_request_id uuid,
  report_key text,
  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  watermark text,
  expires_at timestamptz
)
language plpgsql
as $$
declare
  v_report admin_security_compliance_report_requests%rowtype;
begin
  select *
  into v_report
  from admin_security_compliance_report_requests
  where id = p_compliance_report_request_id
  for update;

  if v_report.id is null then
    raise exception 'compliance report request not found: %', p_compliance_report_request_id;
  end if;

  if v_report.status <> 'ready' then
    raise exception 'compliance report is not ready: %', v_report.status;
  end if;

  if v_report.expires_at is not null and v_report.expires_at <= now() then
    raise exception 'compliance report has expired';
  end if;

  update admin_security_compliance_report_requests
  set
    download_count = download_count + 1,
    last_downloaded_at = now(),
    metadata = metadata || jsonb_build_object(
      'last_enterprise_room_download_request_id',
      p_request_id,
      'last_enterprise_room_id',
      p_review_room_id,
      'last_enterprise_room_participant_id',
      p_participant_id,
      'last_enterprise_room_auth_user_id',
      p_auth_user_id
    ),
    updated_at = now()
  where id = v_report.id;

  return query
  select
    v_report.id,
    v_report.report_key,
    v_report.storage_uri,
    v_report.checksum_sha256,
    v_report.payload_bytes,
    v_report.signature_algorithm,
    v_report.signing_key_version,
    v_report.signature,
    v_report.watermark,
    v_report.expires_at;
end;
$$;

create or replace function register_enterprise_room_audit_period_export_download_internal(
  p_audit_period_export_request_id uuid,
  p_review_room_id uuid,
  p_participant_id uuid,
  p_auth_user_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  export_request_id uuid,
  export_key text,
  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,
  watermark text,
  expires_at timestamptz
)
language plpgsql
as $$
declare
  v_export admin_security_audit_period_export_requests%rowtype;
begin
  select *
  into v_export
  from admin_security_audit_period_export_requests
  where id = p_audit_period_export_request_id
  for update;

  if v_export.id is null then
    raise exception 'audit period export request not found: %', p_audit_period_export_request_id;
  end if;

  if v_export.status <> 'ready' then
    raise exception 'audit period export is not ready: %', v_export.status;
  end if;

  if v_export.expires_at is not null and v_export.expires_at <= now() then
    raise exception 'audit period export has expired';
  end if;

  update admin_security_audit_period_export_requests
  set
    download_count = download_count + 1,
    last_downloaded_at = now(),
    metadata = metadata || jsonb_build_object(
      'last_enterprise_room_download_request_id',
      p_request_id,
      'last_enterprise_room_id',
      p_review_room_id,
      'last_enterprise_room_participant_id',
      p_participant_id,
      'last_enterprise_room_auth_user_id',
      p_auth_user_id
    ),
    updated_at = now()
  where id = v_export.id;

  return query
  select
    v_export.id,
    v_export.export_key,
    v_export.storage_uri,
    v_export.checksum_sha256,
    v_export.payload_bytes,
    v_export.watermark,
    v_export.expires_at;
end;
$$;

create or replace function register_enterprise_review_room_document_download(
  p_auth_user_id uuid,
  p_room_key text,
  p_document_grant_id uuid,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_participant admin_security_enterprise_review_room_participants%rowtype;
  v_room admin_security_enterprise_review_rooms%rowtype;
  v_document admin_security_enterprise_review_room_document_public%rowtype;
  v_download jsonb;
begin
  v_participant := get_active_enterprise_review_room_participant(
    p_auth_user_id,
    p_room_key
  );

  select *
  into v_room
  from admin_security_enterprise_review_rooms
  where id = v_participant.review_room_id;

  select *
  into v_document
  from admin_security_enterprise_review_room_document_public
  where document_grant_id = p_document_grant_id
    and review_room_id = v_room.id;

  if v_document.document_grant_id is null then
    perform record_admin_security_enterprise_review_room_event(
      v_room.id,
      v_participant.id,
      p_auth_user_id,
      v_participant.email,
      'enterprise_review_room_document_download_denied',
      'high',
      p_document_grant_id,
      'admin_security_enterprise_review_room_document_grant',
      p_document_grant_id,
      false,
      'document grant not found or inactive',
      p_ip_address,
      p_user_agent,
      p_request_id,
      p_metadata
    );

    raise exception 'review room document grant not found';
  end if;

  if v_document.allow_download is not true or v_document.visibility = 'download_disabled' then
    perform record_admin_security_enterprise_review_room_event(
      v_room.id,
      v_participant.id,
      p_auth_user_id,
      v_participant.email,
      'enterprise_review_room_document_download_denied',
      'high',
      p_document_grant_id,
      'admin_security_enterprise_review_room_document_grant',
      p_document_grant_id,
      false,
      'document download disabled',
      p_ip_address,
      p_user_agent,
      p_request_id,
      p_metadata
    );

    raise exception 'review room document download disabled';
  end if;

  if v_document.compliance_report_request_id is not null then
    select to_jsonb(x)
    into v_download
    from register_enterprise_room_compliance_report_download_internal(
      v_document.compliance_report_request_id,
      v_room.id,
      v_participant.id,
      p_auth_user_id,
      p_request_id,
      p_metadata
    ) x;
  elsif v_document.audit_period_export_request_id is not null then
    select to_jsonb(x)
    into v_download
    from register_enterprise_room_audit_period_export_download_internal(
      v_document.audit_period_export_request_id,
      v_room.id,
      v_participant.id,
      p_auth_user_id,
      p_request_id,
      p_metadata
    ) x;
  else
    v_download := jsonb_build_object(
      'downloadAvailable',
      false,
      'reason',
      'manual document storage not configured'
    );
  end if;

  perform record_admin_security_enterprise_review_room_event(
    v_room.id,
    v_participant.id,
    p_auth_user_id,
    v_participant.email,
    'enterprise_review_room_document_downloaded',
    'high',
    p_document_grant_id,
    'admin_security_enterprise_review_room_document_grant',
    p_document_grant_id,
    true,
    'review room document downloaded',
    p_ip_address,
    p_user_agent,
    p_request_id,
    p_metadata
  );

  return jsonb_build_object(
    'documentGrantId',
    p_document_grant_id,
    'documentType',
    v_document.document_type,
    'displayTitle',
    v_document.display_title,
    'download',
    v_download
  );
end;
$$;

create or replace view admin_security_enterprise_review_room_dashboard as
select
  r.id as admin_security_enterprise_review_room_id,
  r.room_key,
  r.status,
  r.customer_name,
  r.customer_domain,
  r.customer_external_id,
  r.room_title,
  r.room_summary,
  r.review_type,
  r.sales_owner_auth_user_id,
  r.security_owner_auth_user_id,
  r.access_starts_at,
  r.access_expires_at,
  r.require_nda,
  r.require_email_domain_match,
  r.published_at,
  r.revoked_at,
  r.revoke_reason,
  creator.email as created_by_email,
  (
    select count(*)
    from admin_security_enterprise_review_room_participants p
    where p.review_room_id = r.id
  ) as participant_count,
  (
    select count(*)
    from admin_security_enterprise_review_room_participants p
    where p.review_room_id = r.id
      and p.status = 'active'
  ) as active_participant_count,
  (
    select count(*)
    from admin_security_enterprise_review_room_document_grants g
    where g.review_room_id = r.id
      and g.status = 'active'
  ) as active_document_count,
  (
    select count(*)
    from admin_security_enterprise_review_room_access_events e
    where e.review_room_id = r.id
      and e.created_at >= now() - interval '30 days'
  ) as access_event_count_30d,
  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_enterprise_review_rooms r
left join admin_users creator
  on creator.id = r.created_by_admin_user_id
order by r.created_at desc;

create or replace view admin_security_enterprise_review_room_participant_dashboard as
select
  p.id as admin_security_enterprise_review_room_participant_id,
  p.review_room_id,
  r.room_key,
  r.customer_name,
  p.status,
  p.participant_type,
  p.auth_user_id,
  p.email,
  p.display_name,
  p.organization_name,
  p.role_title,
  p.invited_at,
  inviter.email as invited_by_email,
  p.accepted_at,
  p.last_seen_at,
  p.nda_status,
  p.nda_accepted_at,
  p.nda_version,
  p.revoked_at,
  p.revoke_reason,
  (
    select count(*)
    from admin_security_enterprise_review_room_access_events e
    where e.participant_id = p.id
      and e.created_at >= now() - interval '30 days'
  ) as access_event_count_30d,
  p.created_at,
  p.updated_at,
  p.metadata
from admin_security_enterprise_review_room_participants p
join admin_security_enterprise_review_rooms r
  on r.id = p.review_room_id
left join admin_users inviter
  on inviter.id = p.invited_by_admin_user_id
order by p.created_at desc;

create or replace view admin_security_enterprise_review_room_document_grant_dashboard as
select
  g.id as admin_security_enterprise_review_room_document_grant_id,
  g.review_room_id,
  r.room_key,
  r.customer_name,
  g.status,
  g.document_type,
  g.display_title,
  g.display_summary,
  g.visibility,
  g.allow_download,
  g.allow_public_verification,
  cr.report_key,
  cr.status as report_status,
  cr.checksum_sha256 as report_checksum_sha256,
  ae.export_key as audit_period_export_key,
  ae.status as audit_period_export_status,
  ae.checksum_sha256 as audit_period_export_checksum_sha256,
  tcr.display_title as trust_center_report_title,
  g.access_starts_at,
  g.access_expires_at,
  g.sort_order,
  granter.email as granted_by_email,
  g.revoked_at,
  g.revoke_reason,
  g.created_at,
  g.updated_at,
  g.metadata
from admin_security_enterprise_review_room_document_grants g
join admin_security_enterprise_review_rooms r
  on r.id = g.review_room_id
left join admin_security_compliance_report_requests cr
  on cr.id = g.compliance_report_request_id
left join admin_security_audit_period_export_requests ae
  on ae.id = g.audit_period_export_request_id
left join admin_security_trust_center_reports tcr
  on tcr.id = g.trust_center_report_id
left join admin_users granter
  on granter.id = g.granted_by_admin_user_id
order by g.created_at desc;

create or replace view admin_security_enterprise_review_room_integrity as
select
  (
    select count(*)
    from admin_security_enterprise_review_rooms
    where status = 'published'
  ) as published_room_count,
  (
    select count(*)
    from admin_security_enterprise_review_rooms
    where status = 'published'
      and access_expires_at <= now()
  ) as expired_unprocessed_room_count,
  (
    select count(*)
    from admin_security_enterprise_review_room_participants
    where status = 'active'
  ) as active_participant_count,
  (
    select count(*)
    from admin_security_enterprise_review_room_participants
    where status = 'active'
      and nda_status = 'pending'
  ) as active_participant_pending_nda_count,
  (
    select count(*)
    from admin_security_enterprise_review_room_document_grants
    where status = 'active'
  ) as active_document_grant_count,
  (
    select count(*)
    from admin_security_enterprise_review_room_access_events
    where allowed is false
      and created_at >= now() - interval '24 hours'
  ) as denied_access_count_24h,
  now() as checked_at;

grant select on admin_security_enterprise_review_room_dashboard to admin_api_role;
grant select on admin_security_enterprise_review_room_participant_dashboard to admin_api_role;
grant select on admin_security_enterprise_review_room_document_grant_dashboard to admin_api_role;
grant select on admin_security_enterprise_review_room_integrity to admin_api_role;

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
  'admin_security_enterprise_review_rooms_expire_hourly',
  'Expire enterprise security review rooms',
  'admin',
  true,
  '29 * * * *',
  'expire_admin_security_enterprise_review_rooms',
  '{"batch_size": 500}'::jsonb,
  120,
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
  elsif v_job.function_name = 'expire_admin_security_audit_period_exports' then
    v_uuid_result := expire_admin_security_audit_period_exports(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_security_compliance_reports' then
    v_uuid_result := expire_admin_security_compliance_reports(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_security_enterprise_review_rooms' then
    v_uuid_result := expire_admin_security_enterprise_review_rooms(
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

alter table admin_security_enterprise_review_rooms enable row level security;
alter table admin_security_enterprise_review_room_participants enable row level security;
alter table admin_security_enterprise_review_room_document_grants enable row level security;
alter table admin_security_enterprise_review_room_access_events enable row level security;

create policy admin_security_enterprise_review_rooms_no_user_direct_access
on admin_security_enterprise_review_rooms
for all
to authenticated
using (false)
with check (false);

create policy admin_security_enterprise_review_room_participants_no_user_direct_access
on admin_security_enterprise_review_room_participants
for all
to authenticated
using (false)
with check (false);

create policy admin_security_enterprise_review_room_document_grants_no_user_direct_access
on admin_security_enterprise_review_room_document_grants
for all
to authenticated
using (false)
with check (false);

create policy admin_security_enterprise_review_room_access_events_no_user_direct_access
on admin_security_enterprise_review_room_access_events
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_admin_security_enterprise_review_rooms
on admin_security_enterprise_review_rooms
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_enterprise_review_room_participants
on admin_security_enterprise_review_room_participants
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_enterprise_review_room_document_grants
on admin_security_enterprise_review_room_document_grants
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_enterprise_review_room_access_events
on admin_security_enterprise_review_room_access_events
for all
to admin_api_role
using (true)
with check (true);

create policy worker_read_admin_security_enterprise_review_rooms
on admin_security_enterprise_review_rooms
for select
to worker_role
using (true);

create policy worker_update_admin_security_enterprise_review_rooms
on admin_security_enterprise_review_rooms
for update
to worker_role
using (true)
with check (true);

grant execute on function record_admin_security_enterprise_review_room_event(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  uuid,
  boolean,
  text,
  inet,
  text,
  text,
  jsonb
) to admin_api_role, worker_role;

grant execute on function get_active_enterprise_review_room_participant(uuid, text)
to admin_api_role;

grant execute on function create_admin_security_enterprise_review_room(
  uuid,
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
  text,
  jsonb
) to admin_api_role;

grant execute on function publish_admin_security_enterprise_review_room(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function invite_admin_security_enterprise_review_room_participant(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) to admin_api_role;

grant execute on function accept_enterprise_review_room_nda(
  uuid,
  text,
  text,
  text,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function grant_admin_security_enterprise_review_room_document(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  text,
  boolean,
  boolean,
  timestamptz,
  timestamptz,
  integer,
  text,
  jsonb
) to admin_api_role;

grant execute on function revoke_admin_security_enterprise_review_room(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function expire_admin_security_enterprise_review_rooms(integer, jsonb)
to worker_role;

grant execute on function list_enterprise_review_room_for_participant(uuid, text, inet, text, text)
to admin_api_role;

grant execute on function register_enterprise_review_room_document_download(uuid, text, uuid, inet, text, text, jsonb)
to admin_api_role;

grant execute on function register_enterprise_room_compliance_report_download_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb
) to admin_api_role;

grant execute on function register_enterprise_room_audit_period_export_download_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb
) to admin_api_role;

alter function record_admin_security_enterprise_review_room_event(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  uuid,
  boolean,
  text,
  inet,
  text,
  text,
  jsonb
) security definer;
alter function record_admin_security_enterprise_review_room_event(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  uuid,
  boolean,
  text,
  inet,
  text,
  text,
  jsonb
) set search_path = public;

alter function get_active_enterprise_review_room_participant(uuid, text) security definer;
alter function get_active_enterprise_review_room_participant(uuid, text) set search_path = public;

alter function create_admin_security_enterprise_review_room(
  uuid,
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
  text,
  jsonb
) security definer;
alter function create_admin_security_enterprise_review_room(
  uuid,
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
  text,
  jsonb
) set search_path = public;

alter function publish_admin_security_enterprise_review_room(uuid, uuid, text, text, jsonb) security definer;
alter function publish_admin_security_enterprise_review_room(uuid, uuid, text, text, jsonb) set search_path = public;

alter function invite_admin_security_enterprise_review_room_participant(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) security definer;
alter function invite_admin_security_enterprise_review_room_participant(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) set search_path = public;

alter function accept_enterprise_review_room_nda(
  uuid,
  text,
  text,
  text,
  inet,
  text,
  text,
  jsonb
) security definer;
alter function accept_enterprise_review_room_nda(
  uuid,
  text,
  text,
  text,
  inet,
  text,
  text,
  jsonb
) set search_path = public;

alter function grant_admin_security_enterprise_review_room_document(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  text,
  boolean,
  boolean,
  timestamptz,
  timestamptz,
  integer,
  text,
  jsonb
) security definer;
alter function grant_admin_security_enterprise_review_room_document(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  text,
  boolean,
  boolean,
  timestamptz,
  timestamptz,
  integer,
  text,
  jsonb
) set search_path = public;

alter function revoke_admin_security_enterprise_review_room(uuid, uuid, text, text, jsonb) security definer;
alter function revoke_admin_security_enterprise_review_room(uuid, uuid, text, text, jsonb) set search_path = public;

alter function expire_admin_security_enterprise_review_rooms(integer, jsonb) security definer;
alter function expire_admin_security_enterprise_review_rooms(integer, jsonb) set search_path = public;

alter function list_enterprise_review_room_for_participant(uuid, text, inet, text, text) security definer;
alter function list_enterprise_review_room_for_participant(uuid, text, inet, text, text) set search_path = public;

alter function register_enterprise_review_room_document_download(uuid, text, uuid, inet, text, text, jsonb) security definer;
alter function register_enterprise_review_room_document_download(uuid, text, uuid, inet, text, text, jsonb) set search_path = public;

alter function register_enterprise_room_compliance_report_download_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb
) security definer;
alter function register_enterprise_room_compliance_report_download_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb
) set search_path = public;

alter function register_enterprise_room_audit_period_export_download_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb
) security definer;
alter function register_enterprise_room_audit_period_export_download_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb
) set search_path = public;

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
    'ENTERPRISE_REVIEW_ROOM_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Enterprise review room not found.',
    'Enterprise review room not found.',
    'platform'
  ),
  (
    'ENTERPRISE_REVIEW_ROOM_ACCESS_DENIED',
    'permission',
    'high',
    403,
    false,
    true,
    'Enterprise review room access denied.',
    'Enterprise review room participant access denied.',
    'platform'
  ),
  (
    'ENTERPRISE_REVIEW_ROOM_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Enterprise review room cannot move from its current state.',
    'Enterprise review room invalid lifecycle state.',
    'platform'
  ),
  (
    'ENTERPRISE_REVIEW_ROOM_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Enterprise review room requires complete fields.',
    'Enterprise review room required fields missing.',
    'platform'
  ),
  (
    'ENTERPRISE_REVIEW_ROOM_DOCUMENT_DOWNLOAD_DISABLED',
    'permission',
    'medium',
    403,
    false,
    true,
    'Document download is disabled.',
    'Enterprise review room document download disabled.',
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
  ('enterprise review room not found', 'ENTERPRISE_REVIEW_ROOM_NOT_FOUND', 5, '{}'),
  ('active enterprise review room not found', 'ENTERPRISE_REVIEW_ROOM_NOT_FOUND', 5, '{}'),
  ('active review room participant access not found', 'ENTERPRISE_REVIEW_ROOM_ACCESS_DENIED', 5, '{}'),
  ('review room participant not found', 'ENTERPRISE_REVIEW_ROOM_ACCESS_DENIED', 5, '{}'),
  ('review room participant auth mismatch', 'ENTERPRISE_REVIEW_ROOM_ACCESS_DENIED', 5, '{}'),
  ('participant email domain does not match customer domain', 'ENTERPRISE_REVIEW_ROOM_ACCESS_DENIED', 5, '{}'),
  ('review room cannot be published from status', 'ENTERPRISE_REVIEW_ROOM_INVALID_STATE', 5, '{}'),
  ('review room requires at least one active document grant before publishing', 'ENTERPRISE_REVIEW_ROOM_INVALID_STATE', 5, '{}'),
  ('cannot invite participant to review room status', 'ENTERPRISE_REVIEW_ROOM_INVALID_STATE', 5, '{}'),
  ('cannot grant document to review room status', 'ENTERPRISE_REVIEW_ROOM_INVALID_STATE', 5, '{}'),
  ('review room compliance report grant requires ready signed report', 'ENTERPRISE_REVIEW_ROOM_INVALID_STATE', 5, '{}'),
  ('review room audit export grant requires ready export', 'ENTERPRISE_REVIEW_ROOM_INVALID_STATE', 5, '{}'),
  ('customer name is required', 'ENTERPRISE_REVIEW_ROOM_REQUIRED_FIELDS', 5, '{}'),
  ('review room title is required', 'ENTERPRISE_REVIEW_ROOM_REQUIRED_FIELDS', 5, '{}'),
  ('review room summary is required', 'ENTERPRISE_REVIEW_ROOM_REQUIRED_FIELDS', 5, '{}'),
  ('review room expiry must be after start', 'ENTERPRISE_REVIEW_ROOM_REQUIRED_FIELDS', 5, '{}'),
  ('valid participant email is required', 'ENTERPRISE_REVIEW_ROOM_REQUIRED_FIELDS', 5, '{}'),
  ('review room publish note is required', 'ENTERPRISE_REVIEW_ROOM_REQUIRED_FIELDS', 5, '{}'),
  ('review room revoke reason is required', 'ENTERPRISE_REVIEW_ROOM_REQUIRED_FIELDS', 5, '{}'),
  ('review room document grant not found', 'ENTERPRISE_REVIEW_ROOM_NOT_FOUND', 5, '{}'),
  ('review room document download disabled', 'ENTERPRISE_REVIEW_ROOM_DOCUMENT_DOWNLOAD_DISABLED', 5, '{}')
on conflict do nothing;
