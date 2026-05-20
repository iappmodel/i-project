-- Step 9.84 — Trust transparency portal v2 (public / customer trust surface)
-- Depends on: 218 (proof retention), 219 (audit packages), 194 (incidents), 192 (verification links),
--             195 (health signals), 191 (public verification), 170 (error taxonomy).

-- ---------------------------------------------------------------------------
-- 0) Extend incident + customer notice columns for sync compatibility
-- ---------------------------------------------------------------------------

alter table admin_security_trust_incidents
  add column if not exists proof_key text,
  add column if not exists primary_source_key text;

alter table admin_security_trust_incident_customer_notices
  add column if not exists summary text,
  add column if not exists notice_type text not null default 'customer_update',
  add column if not exists public_severity text not null default 'notice',
  add column if not exists customer_name text,
  add column if not exists customer_domain text,
  add column if not exists proof_type text,
  add column if not exists proof_key text,
  add column if not exists proof_hash_sha256 text,
  add column if not exists include_proof_key boolean not null default false,
  add column if not exists include_hash boolean not null default false,
  add column if not exists include_resolution boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists sent_at timestamptz;

alter table admin_security_trust_incident_customer_notices
  drop constraint if exists admin_security_trust_incident_customer_notices_notice_type_check;

alter table admin_security_trust_incident_customer_notices
  add constraint admin_security_trust_incident_customer_notices_notice_type_check
  check (
    notice_type in (
      'customer_update',
      'customer_resolution',
      'legal_notice',
      'maintenance',
      'other'
    )
  );

alter table admin_security_trust_incident_customer_notices
  drop constraint if exists admin_security_trust_incident_customer_notices_public_severity_check;

alter table admin_security_trust_incident_customer_notices
  add constraint admin_security_trust_incident_customer_notices_public_severity_check
  check (
    public_severity in (
      'info',
      'notice',
      'warning',
      'critical'
    )
  );

-- ---------------------------------------------------------------------------
-- 1) Transparency portals
-- ---------------------------------------------------------------------------

create table if not exists admin_security_trust_transparency_portals (
  id uuid primary key default gen_random_uuid(),

  transparency_portal_key text not null unique,

  status text not null default 'draft',

  portal_type text not null default 'customer_trust_center',
  visibility text not null default 'private',

  slug text not null unique,

  title text not null,
  subtitle text,
  description text,

  customer_name text,
  customer_domain text,

  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,

  show_platform_health boolean not null default true,
  show_proof_status boolean not null default true,
  show_public_notices boolean not null default true,
  show_customer_notices boolean not null default true,
  show_verification_links boolean not null default true,
  show_audit_packages boolean not null default false,
  show_policies boolean not null default true,
  show_incident_history boolean not null default true,
  show_lifecycle_summary boolean not null default false,

  require_auth boolean not null default true,
  allow_public_verification boolean not null default true,
  allow_package_access_request boolean not null default false,

  public_url text,
  custom_domain text,

  brand_payload jsonb not null default '{}'::jsonb,
  content_payload jsonb not null default '{}'::jsonb,

  published_at timestamptz,
  unpublished_at timestamptz,

  created_by_auth_user_id uuid,
  created_by_admin_user_id uuid references admin_users(id) on delete set null,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_transparency_portals_status_check
  check (
    status in (
      'draft',
      'published',
      'unpublished',
      'archived'
    )
  ),

  constraint admin_security_trust_transparency_portals_type_check
  check (
    portal_type in (
      'public_trust_center',
      'customer_trust_center',
      'auditor_trust_center',
      'regulator_trust_center',
      'incident_status_page',
      'other'
    )
  ),

  constraint admin_security_trust_transparency_portals_visibility_check
  check (
    visibility in (
      'public',
      'private',
      'restricted',
      'invite_only'
    )
  ),

  constraint admin_security_trust_transparency_portals_title_check
  check (length(trim(title)) > 0),

  constraint admin_security_trust_transparency_portals_slug_check
  check (slug ~ '^[a-z0-9][a-z0-9-]{2,120}$')
);

create index if not exists admin_security_trust_transparency_portals_status_idx
on admin_security_trust_transparency_portals (status, visibility, created_at desc);

create index if not exists admin_security_trust_transparency_portals_customer_idx
on admin_security_trust_transparency_portals (customer_name, customer_domain, status);

create index if not exists admin_security_trust_transparency_portals_private_room_idx
on admin_security_trust_transparency_portals (private_room_id, status);

drop trigger if exists admin_security_trust_transparency_portals_set_updated_at
on admin_security_trust_transparency_portals;

create trigger admin_security_trust_transparency_portals_set_updated_at
before update on admin_security_trust_transparency_portals
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Portal sections
-- ---------------------------------------------------------------------------

create table if not exists admin_security_trust_transparency_portal_sections (
  id uuid primary key default gen_random_uuid(),

  section_key text not null unique,

  transparency_portal_id uuid not null
    references admin_security_trust_transparency_portals(id)
    on delete cascade,

  status text not null default 'active',

  section_type text not null,
  title text not null,
  summary text,
  body text,

  sort_order integer not null default 0,

  visible_to_public boolean not null default false,
  visible_to_customer boolean not null default true,
  visible_to_auditor boolean not null default true,
  visible_to_regulator boolean not null default true,

  source_type text,
  source_id uuid,
  source_key text,

  content_payload jsonb not null default '{}'::jsonb,

  published_at timestamptz,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_transparency_portal_sections_status_check
  check (
    status in (
      'active',
      'hidden',
      'archived'
    )
  ),

  constraint admin_security_trust_transparency_portal_sections_type_check
  check (
    section_type in (
      'overview',
      'platform_health',
      'proof_status',
      'verification',
      'trust_notices',
      'incident_history',
      'audit_packages',
      'policies',
      'lifecycle_summary',
      'contact',
      'faq',
      'custom'
    )
  ),

  constraint admin_security_trust_transparency_portal_sections_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_trust_transparency_portal_sections_portal_idx
on admin_security_trust_transparency_portal_sections (transparency_portal_id, status, sort_order);

drop trigger if exists admin_security_trust_transparency_portal_sections_set_updated_at
on admin_security_trust_transparency_portal_sections;

create trigger admin_security_trust_transparency_portal_sections_set_updated_at
before update on admin_security_trust_transparency_portal_sections
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) Published trust notices
-- ---------------------------------------------------------------------------

create table if not exists admin_security_published_trust_notices (
  id uuid primary key default gen_random_uuid(),

  published_notice_key text not null unique,

  status text not null default 'draft',

  notice_type text not null,
  notice_scope text not null default 'customer',

  transparency_portal_id uuid
    references admin_security_trust_transparency_portals(id)
    on delete cascade,

  title text not null,
  summary text not null,
  body text,

  public_severity text not null default 'notice',

  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,

  incident_id uuid references admin_security_trust_incidents(id) on delete set null,
  incident_customer_notice_id uuid references admin_security_trust_incident_customer_notices(id) on delete set null,
  proof_health_signal_id uuid references admin_security_proof_health_signals(id) on delete set null,
  governance_violation_id uuid references admin_security_proof_governance_violations(id) on delete set null,

  proof_type text,
  proof_key text,
  proof_hash_sha256 text,

  customer_visible boolean not null default true,
  public_visible boolean not null default false,
  auditor_visible boolean not null default true,
  regulator_visible boolean not null default true,

  published_at timestamptz,
  expires_at timestamptz,

  approved_by_auth_user_id uuid,
  approved_by_admin_user_id uuid references admin_users(id) on delete set null,
  approved_at timestamptz,

  notice_payload jsonb not null default '{}'::jsonb,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_published_trust_notices_status_check
  check (
    status in (
      'draft',
      'approved',
      'published',
      'expired',
      'revoked',
      'archived'
    )
  ),

  constraint admin_security_published_trust_notices_type_check
  check (
    notice_type in (
      'platform_update',
      'proof_issue',
      'incident_update',
      'incident_resolution',
      'policy_update',
      'health_update',
      'audit_package_available',
      'verification_update',
      'legal_notice',
      'other'
    )
  ),

  constraint admin_security_published_trust_notices_scope_check
  check (
    notice_scope in (
      'global_public',
      'customer',
      'private_room',
      'auditor_portal',
      'regulator',
      'incident'
    )
  ),

  constraint admin_security_published_trust_notices_public_severity_check
  check (
    public_severity in (
      'info',
      'notice',
      'warning',
      'critical'
    )
  ),

  constraint admin_security_published_trust_notices_title_check
  check (length(trim(title)) > 0),

  constraint admin_security_published_trust_notices_summary_check
  check (length(trim(summary)) > 0)
);

create index if not exists admin_security_published_trust_notices_status_idx
on admin_security_published_trust_notices (status, public_severity, published_at desc);

create index if not exists admin_security_published_trust_notices_portal_idx
on admin_security_published_trust_notices (transparency_portal_id, status, published_at desc);

create index if not exists admin_security_published_trust_notices_customer_idx
on admin_security_published_trust_notices (customer_name, customer_domain, status);

create index if not exists admin_security_published_trust_notices_incident_idx
on admin_security_published_trust_notices (incident_id, status);

drop trigger if exists admin_security_published_trust_notices_set_updated_at
on admin_security_published_trust_notices;

create trigger admin_security_published_trust_notices_set_updated_at
before update on admin_security_published_trust_notices
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Published proof status
-- ---------------------------------------------------------------------------

create table if not exists admin_security_published_proof_status (
  id uuid primary key default gen_random_uuid(),

  published_proof_status_key text not null unique,

  status text not null default 'published',

  transparency_portal_id uuid
    references admin_security_trust_transparency_portals(id)
    on delete cascade,

  proof_type text not null,
  proof_key text not null,
  proof_title text,
  proof_summary text,

  proof_status text not null default 'available',

  proof_hash_sha256 text,
  verification_url text,
  qr_url text,

  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,

  retention_subject_id uuid references admin_security_proof_retention_subjects(id) on delete set null,
  verification_link_id uuid references admin_security_proof_verification_links(id) on delete set null,
  qr_code_id uuid references admin_security_proof_qr_codes(id) on delete set null,
  audit_package_id uuid references admin_security_audit_packages(id) on delete set null,

  verified_count integer not null default 0,
  failed_verification_count integer not null default 0,
  last_verified_at timestamptz,

  customer_visible boolean not null default true,
  public_visible boolean not null default false,

  redaction_status text not null default 'not_redacted',
  lifecycle_status text,
  retention_summary text,

  published_at timestamptz not null default now(),
  expires_at timestamptz,

  status_payload jsonb not null default '{}'::jsonb,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_published_proof_status_status_check
  check (
    status in (
      'published',
      'hidden',
      'expired',
      'revoked',
      'archived'
    )
  ),

  constraint admin_security_published_proof_status_proof_status_check
  check (
    proof_status in (
      'available',
      'verified',
      'verification_available',
      'verification_failed',
      'expired',
      'revoked',
      'redacted',
      'under_review',
      'incident_open',
      'unavailable'
    )
  ),

  constraint admin_security_published_proof_status_redaction_status_check
  check (
    redaction_status in (
      'not_redacted',
      'redacted',
      'redaction_required',
      'not_applicable'
    )
  )
);

create index if not exists admin_security_published_proof_status_portal_idx
on admin_security_published_proof_status (transparency_portal_id, status, published_at desc);

create index if not exists admin_security_published_proof_status_customer_idx
on admin_security_published_proof_status (customer_name, customer_domain, proof_status);

create index if not exists admin_security_published_proof_status_proof_idx
on admin_security_published_proof_status (proof_type, proof_key);

create index if not exists admin_security_published_proof_status_private_room_idx
on admin_security_published_proof_status (private_room_id, proof_status);

drop trigger if exists admin_security_published_proof_status_set_updated_at
on admin_security_published_proof_status;

create trigger admin_security_published_proof_status_set_updated_at
before update on admin_security_published_proof_status
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) Access grants
-- ---------------------------------------------------------------------------

create table if not exists admin_security_trust_transparency_access_grants (
  id uuid primary key default gen_random_uuid(),

  transparency_access_grant_key text not null unique,

  status text not null default 'active',

  transparency_portal_id uuid not null
    references admin_security_trust_transparency_portals(id)
    on delete cascade,

  grantee_type text not null,
  grantee_email text not null,
  grantee_display_name text,

  grantee_auth_user_id uuid,

  access_level text not null default 'view',

  can_view_notices boolean not null default true,
  can_view_proofs boolean not null default true,
  can_view_packages boolean not null default false,
  can_request_packages boolean not null default false,

  access_token_hash text,
  access_url text,

  max_uses integer,
  use_count integer not null default 0,

  expires_at timestamptz default (now() + interval '90 days'),

  granted_by_auth_user_id uuid,
  granted_by_admin_user_id uuid references admin_users(id) on delete set null,

  revoked_at timestamptz,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id) on delete set null,
  revocation_reason text,

  last_used_at timestamptz,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_transparency_access_grants_status_check
  check (
    status in (
      'active',
      'revoked',
      'expired',
      'exhausted',
      'archived'
    )
  ),

  constraint admin_security_trust_transparency_access_grants_grantee_type_check
  check (
    grantee_type in (
      'customer',
      'auditor',
      'regulator',
      'legal',
      'admin',
      'external_reviewer'
    )
  ),

  constraint admin_security_trust_transparency_access_grants_access_level_check
  check (
    access_level in (
      'view',
      'proofs',
      'packages',
      'admin'
    )
  ),

  constraint admin_security_trust_transparency_access_grants_email_check
  check (position('@' in grantee_email) > 1)
);

create index if not exists admin_security_trust_transparency_access_grants_portal_idx
on admin_security_trust_transparency_access_grants (transparency_portal_id, status);

create index if not exists admin_security_trust_transparency_access_grants_email_idx
on admin_security_trust_transparency_access_grants (grantee_email, status);

create index if not exists admin_security_trust_transparency_access_grants_token_idx
on admin_security_trust_transparency_access_grants (access_token_hash);

drop trigger if exists admin_security_trust_transparency_access_grants_set_updated_at
on admin_security_trust_transparency_access_grants;

create trigger admin_security_trust_transparency_access_grants_set_updated_at
before update on admin_security_trust_transparency_access_grants
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 6) Events (append-only)
-- ---------------------------------------------------------------------------

create table if not exists admin_security_trust_transparency_events (
  id uuid primary key default gen_random_uuid(),

  transparency_event_key text not null unique,

  transparency_portal_id uuid
    references admin_security_trust_transparency_portals(id)
    on delete cascade,

  transparency_access_grant_id uuid
    references admin_security_trust_transparency_access_grants(id)
    on delete set null,

  event_type text not null,
  event_action text not null,

  actor_type text not null default 'system',
  actor_auth_user_id uuid,
  actor_admin_user_id uuid references admin_users(id) on delete set null,
  actor_email text,

  source_type text,
  source_id uuid,
  source_key text,

  title text,
  summary text,

  ip_address inet,
  user_agent text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_trust_transparency_events_type_check
  check (
    event_type in (
      'portal_created',
      'portal_published',
      'portal_unpublished',
      'portal_viewed',
      'section_published',
      'notice_published',
      'notice_viewed',
      'proof_status_published',
      'proof_viewed',
      'verification_started',
      'audit_package_viewed',
      'access_granted',
      'access_used',
      'access_revoked',
      'sync_completed',
      'sync_failed',
      'other'
    )
  ),

  constraint admin_security_trust_transparency_events_actor_type_check
  check (
    actor_type in (
      'admin',
      'customer',
      'auditor',
      'regulator',
      'legal',
      'system',
      'worker',
      'external',
      'anonymous'
    )
  )
);

create index if not exists admin_security_trust_transparency_events_portal_idx
on admin_security_trust_transparency_events (transparency_portal_id, created_at desc);

create index if not exists admin_security_trust_transparency_events_type_idx
on admin_security_trust_transparency_events (event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- 7) Functions
-- ---------------------------------------------------------------------------

create or replace function record_admin_security_trust_transparency_event(
  p_event_type text,
  p_event_action text,
  p_transparency_portal_id uuid default null,
  p_transparency_access_grant_id uuid default null,
  p_actor_type text default 'system',
  p_actor_auth_user_id uuid default null,
  p_actor_admin_user_id uuid default null,
  p_actor_email text default null,
  p_source_type text default null,
  p_source_id uuid default null,
  p_source_key text default null,
  p_title text default null,
  p_summary text default null,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_key text;
begin
  v_key :=
    'trust_transparency_event:' ||
    p_event_type || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  insert into admin_security_trust_transparency_events (
    transparency_event_key,
    transparency_portal_id,
    transparency_access_grant_id,
    event_type,
    event_action,
    actor_type,
    actor_auth_user_id,
    actor_admin_user_id,
    actor_email,
    source_type,
    source_id,
    source_key,
    title,
    summary,
    ip_address,
    user_agent,
    request_id,
    metadata
  )
  values (
    v_key,
    p_transparency_portal_id,
    p_transparency_access_grant_id,
    p_event_type,
    p_event_action,
    coalesce(p_actor_type, 'system'),
    p_actor_auth_user_id,
    p_actor_admin_user_id,
    p_actor_email,
    p_source_type,
    p_source_id,
    p_source_key,
    p_title,
    p_summary,
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function create_admin_security_trust_transparency_portal(
  p_admin_auth_user_id uuid,
  p_portal_type text,
  p_visibility text,
  p_slug text,
  p_title text,
  p_subtitle text default null,
  p_description text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_private_room_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_require_auth boolean default true,
  p_allow_public_verification boolean default true,
  p_allow_package_access_request boolean default false,
  p_brand_payload jsonb default '{}'::jsonb,
  p_content_payload jsonb default '{}'::jsonb,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_id uuid;
  v_key text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{2,120}$' then
    raise exception 'invalid transparency portal slug';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'transparency portal title is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  v_key :=
    'trust_transparency_portal:' ||
    p_slug || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_trust_transparency_portals (
    transparency_portal_key,
    status,
    portal_type,
    visibility,
    slug,
    title,
    subtitle,
    description,
    customer_name,
    customer_domain,
    private_room_id,
    auditor_portal_id,
    enterprise_review_room_id,
    require_auth,
    allow_public_verification,
    allow_package_access_request,
    public_url,
    brand_payload,
    content_payload,
    created_by_auth_user_id,
    created_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_key,
    'draft',
    coalesce(p_portal_type, 'customer_trust_center'),
    coalesce(p_visibility, 'private'),
    lower(trim(p_slug)),
    p_title,
    p_subtitle,
    p_description,
    p_customer_name,
    p_customer_domain,
    p_private_room_id,
    p_auditor_portal_id,
    p_enterprise_review_room_id,
    coalesce(p_require_auth, true),
    coalesce(p_allow_public_verification, true),
    coalesce(p_allow_package_access_request, false),
    '/trust/' || lower(trim(p_slug)),
    coalesce(p_brand_payload, '{}'::jsonb),
    coalesce(p_content_payload, '{}'::jsonb),
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  perform record_admin_security_trust_transparency_event(
    'portal_created',
    'created',
    v_id,
    null,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'admin_security_trust_transparency_portal',
    v_id,
    v_key,
    'Transparency portal created',
    p_title,
    null,
    null,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_id;
end;
$$;

create or replace function publish_admin_security_trust_transparency_portal(
  p_admin_auth_user_id uuid,
  p_transparency_portal_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_portal admin_security_trust_transparency_portals%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_portal
  from admin_security_trust_transparency_portals
  where id = p_transparency_portal_id;

  if v_portal.id is null then
    raise exception 'transparency portal not found: %', p_transparency_portal_id;
  end if;

  update admin_security_trust_transparency_portals
  set
    status = 'published',
    published_at = coalesce(admin_security_trust_transparency_portals.published_at, now()),
    unpublished_at = null,
    updated_at = now(),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb)
  where id = p_transparency_portal_id
  returning * into v_portal;

  perform record_admin_security_trust_transparency_event(
    'portal_published',
    'published',
    v_portal.id,
    null,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'admin_security_trust_transparency_portal',
    v_portal.id,
    v_portal.transparency_portal_key,
    'Transparency portal published',
    v_portal.title,
    null,
    null,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_portal.id;
end;
$$;

create or replace function seed_admin_security_trust_transparency_portal_sections(
  p_transparency_portal_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_portal admin_security_trust_transparency_portals%rowtype;
  v_count integer := 0;
begin
  select *
  into v_portal
  from admin_security_trust_transparency_portals
  where id = p_transparency_portal_id;

  if v_portal.id is null then
    raise exception 'transparency portal not found: %', p_transparency_portal_id;
  end if;

  insert into admin_security_trust_transparency_portal_sections (
    section_key,
    transparency_portal_id,
    status,
    section_type,
    title,
    summary,
    sort_order,
    visible_to_public,
    visible_to_customer,
    visible_to_auditor,
    visible_to_regulator,
    published_at,
    request_id,
    metadata
  )
  values
    (
      'trust_transparency_section:' || v_portal.transparency_portal_key || ':overview',
      v_portal.id,
      'active',
      'overview',
      'Overview',
      'Customer-safe trust overview.',
      10,
      v_portal.visibility = 'public',
      true,
      true,
      true,
      now(),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_transparency_section:' || v_portal.transparency_portal_key || ':proof_status',
      v_portal.id,
      case when v_portal.show_proof_status then 'active' else 'hidden' end,
      'proof_status',
      'Proof status',
      'Published proof artifacts and verification status.',
      20,
      v_portal.visibility = 'public',
      true,
      true,
      true,
      now(),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_transparency_section:' || v_portal.transparency_portal_key || ':trust_notices',
      v_portal.id,
      case when v_portal.show_public_notices or v_portal.show_customer_notices then 'active' else 'hidden' end,
      'trust_notices',
      'Trust notices',
      'Published trust notices, proof issues, and customer-safe incident updates.',
      30,
      v_portal.visibility = 'public',
      true,
      true,
      true,
      now(),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_transparency_section:' || v_portal.transparency_portal_key || ':verification',
      v_portal.id,
      case when v_portal.show_verification_links then 'active' else 'hidden' end,
      'verification',
      'Verification',
      'Ways to verify proof artifacts.',
      40,
      v_portal.visibility = 'public',
      true,
      true,
      true,
      now(),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_transparency_section:' || v_portal.transparency_portal_key || ':audit_packages',
      v_portal.id,
      case when v_portal.show_audit_packages then 'active' else 'hidden' end,
      'audit_packages',
      'Audit packages',
      'Published audit evidence packages.',
      50,
      false,
      true,
      true,
      true,
      now(),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    )
  on conflict (section_key)
  do update set
    status = excluded.status,
    title = excluded.title,
    summary = excluded.summary,
    sort_order = excluded.sort_order,
    updated_at = now();

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'transparencyPortalId',
    v_portal.id,
    'sectionsSeeded',
    v_count
  );
end;
$$;

create or replace function sync_admin_security_published_proof_status(
  p_transparency_portal_id uuid,
  p_batch_size integer default 1000,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_portal admin_security_trust_transparency_portals%rowtype;
  v_count integer := 0;
  v_row record;
  v_key text;
  v_proof_status text;
  v_match_key text;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  select *
  into v_portal
  from admin_security_trust_transparency_portals
  where id = p_transparency_portal_id;

  if v_portal.id is null then
    raise exception 'transparency portal not found: %', p_transparency_portal_id;
  end if;

  for v_row in
    select *
    from admin_security_proof_retention_subjects s
    where s.status <> 'deleted'
      and s.data_classification = 'proof_artifact'
      and (
        v_portal.private_room_id is null
        or s.private_room_id = v_portal.private_room_id
      )
      and (
        v_portal.customer_name is null
        or s.customer_name = v_portal.customer_name
      )
    order by s.created_at desc
    limit p_batch_size
  loop
    v_match_key := coalesce(nullif(v_row.proof_key, ''), nullif(v_row.subject_key, ''));

    v_key :=
      'published_proof_status:' ||
      v_portal.transparency_portal_key || ':' ||
      v_row.retention_subject_key;

    v_proof_status :=
      case
        when v_row.status = 'redacted' then 'redacted'
        when v_row.legal_hold_active is true then 'under_review'
        when exists (
          select 1
          from admin_security_trust_incidents i
          where i.status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating')
            and (
              (v_row.proof_key is not null and i.proof_key = v_row.proof_key)
              or (v_row.subject_key is not null and i.primary_source_key = v_row.subject_key)
            )
        ) then 'incident_open'
        when v_match_key is not null and exists (
          select 1
          from admin_security_public_verification_results r
          where r.subject_key = v_match_key
            and r.verified is true
        ) then 'verified'
        else 'verification_available'
      end;

    insert into admin_security_published_proof_status (
      published_proof_status_key,
      status,
      transparency_portal_id,
      proof_type,
      proof_key,
      proof_title,
      proof_summary,
      proof_status,
      proof_hash_sha256,
      verification_url,
      customer_name,
      customer_domain,
      private_room_id,
      retention_subject_id,
      verified_count,
      failed_verification_count,
      last_verified_at,
      customer_visible,
      public_visible,
      redaction_status,
      lifecycle_status,
      retention_summary,
      status_payload,
      request_id,
      metadata
    )
    values (
      v_key,
      'published',
      v_portal.id,
      coalesce(v_row.proof_type, v_row.subject_type),
      coalesce(v_row.proof_key, v_row.subject_key),
      initcap(replace(v_row.subject_type, '_', ' ')),
      'Published proof artifact status.',
      v_proof_status,
      v_row.proof_hash_sha256,
      '/verify?proofKey=' || coalesce(v_row.proof_key, v_row.subject_key),
      v_row.customer_name,
      v_row.customer_domain,
      v_row.private_room_id,
      v_row.id,
      case
        when v_match_key is null then 0
        else coalesce((
          select count(*)
          from admin_security_public_verification_results r
          where r.subject_key = v_match_key
            and r.verified is true
        ), 0)
      end,
      case
        when v_match_key is null then 0
        else coalesce((
          select count(*)
          from admin_security_public_verification_results r
          where r.subject_key = v_match_key
            and r.verification_status = 'failed'
        ), 0)
      end,
      case
        when v_match_key is null then null
        else (
          select max(created_at)
          from admin_security_public_verification_results r
          where r.subject_key = v_match_key
        )
      end,
      true,
      v_portal.visibility = 'public',
      case
        when v_row.redacted_at is not null then 'redacted'
        when v_row.redaction_required is true then 'redaction_required'
        else 'not_redacted'
      end,
      v_row.status,
      case
        when v_row.retain_until is not null then 'Retained until ' || v_row.retain_until::text
        else null
      end,
      jsonb_build_object(
        'retentionSubjectKey',
        v_row.retention_subject_key,
        'lifecycleStatus',
        v_row.status,
        'legalHoldActive',
        v_row.legal_hold_active,
        'dataClassification',
        v_row.data_classification
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('worker_id', p_worker_id)
    )
    on conflict (published_proof_status_key)
    do update set
      proof_status = excluded.proof_status,
      proof_hash_sha256 = excluded.proof_hash_sha256,
      verified_count = excluded.verified_count,
      failed_verification_count = excluded.failed_verification_count,
      last_verified_at = excluded.last_verified_at,
      redaction_status = excluded.redaction_status,
      lifecycle_status = excluded.lifecycle_status,
      retention_summary = excluded.retention_summary,
      status_payload = excluded.status_payload,
      metadata = admin_security_published_proof_status.metadata || excluded.metadata,
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  perform record_admin_security_trust_transparency_event(
    'proof_status_published',
    'synced',
    v_portal.id,
    null,
    'worker',
    null,
    null,
    null,
    'admin_security_published_proof_status',
    null,
    null,
    'Published proof status synced',
    v_count::text || ' proof status record(s) synced.',
    null,
    null,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'transparencyPortalId',
    v_portal.id,
    'synced',
    v_count
  );
end;
$$;

create or replace function sync_admin_security_published_trust_notices(
  p_transparency_portal_id uuid,
  p_batch_size integer default 1000,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_portal admin_security_trust_transparency_portals%rowtype;
  v_count integer := 0;
  v_row record;
  v_key text;
  v_summary text;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  select *
  into v_portal
  from admin_security_trust_transparency_portals
  where id = p_transparency_portal_id;

  if v_portal.id is null then
    raise exception 'transparency portal not found: %', p_transparency_portal_id;
  end if;

  for v_row in
    select n.*, i.customer_name as incident_customer_name, i.customer_domain as incident_customer_domain
    from admin_security_trust_incident_customer_notices n
    left join admin_security_trust_incidents i on i.id = n.incident_id
    where n.status in ('approved', 'published', 'sent')
      and (
        v_portal.private_room_id is null
        or n.private_room_id = v_portal.private_room_id
      )
      and (
        v_portal.customer_name is null
        or coalesce(n.customer_name, i.customer_name) = v_portal.customer_name
      )
    order by n.created_at desc
    limit p_batch_size
  loop
    v_key :=
      'published_trust_notice:' ||
      v_portal.transparency_portal_key || ':' ||
      v_row.notice_key;

    v_summary :=
      coalesce(
        nullif(trim(v_row.summary), ''),
        nullif(trim(v_row.body), ''),
        left(trim(v_row.title), 500)
      );
    v_summary := coalesce(v_summary, 'Trust notice');

    insert into admin_security_published_trust_notices (
      published_notice_key,
      status,
      notice_type,
      notice_scope,
      transparency_portal_id,
      title,
      summary,
      body,
      public_severity,
      customer_name,
      customer_domain,
      private_room_id,
      incident_id,
      incident_customer_notice_id,
      proof_type,
      proof_key,
      proof_hash_sha256,
      customer_visible,
      public_visible,
      auditor_visible,
      regulator_visible,
      published_at,
      notice_payload,
      request_id,
      metadata
    )
    values (
      v_key,
      'published',
      case
        when v_row.notice_type = 'customer_resolution' then 'incident_resolution'
        when v_row.notice_type = 'legal_notice' then 'legal_notice'
        else 'incident_update'
      end,
      case
        when v_portal.visibility = 'public' then 'global_public'
        when v_row.private_room_id is not null then 'private_room'
        else 'customer'
      end,
      v_portal.id,
      v_row.title,
      v_summary,
      v_row.body,
      coalesce(v_row.public_severity, 'notice'),
      coalesce(v_row.customer_name, v_row.incident_customer_name),
      coalesce(v_row.customer_domain, v_row.incident_customer_domain),
      v_row.private_room_id,
      v_row.incident_id,
      v_row.id,
      v_row.proof_type,
      v_row.proof_key,
      case when v_row.include_hash then v_row.proof_hash_sha256 else null end,
      true,
      v_portal.visibility = 'public',
      true,
      true,
      coalesce(v_row.published_at, v_row.sent_at, now()),
      jsonb_build_object(
        'noticeKey',
        v_row.notice_key,
        'noticeType',
        v_row.notice_type,
        'includeProofKey',
        v_row.include_proof_key,
        'includeHash',
        v_row.include_hash,
        'includeResolution',
        v_row.include_resolution
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('worker_id', p_worker_id)
    )
    on conflict (published_notice_key)
    do update set
      status = excluded.status,
      title = excluded.title,
      summary = excluded.summary,
      body = excluded.body,
      public_severity = excluded.public_severity,
      proof_hash_sha256 = excluded.proof_hash_sha256,
      notice_payload = excluded.notice_payload,
      metadata = admin_security_published_trust_notices.metadata || excluded.metadata,
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  perform record_admin_security_trust_transparency_event(
    'notice_published',
    'synced',
    v_portal.id,
    null,
    'worker',
    null,
    null,
    null,
    'admin_security_published_trust_notices',
    null,
    null,
    'Published trust notices synced',
    v_count::text || ' trust notice(s) synced.',
    null,
    null,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'transparencyPortalId',
    v_portal.id,
    'synced',
    v_count
  );
end;
$$;

create or replace function sync_admin_security_trust_transparency_portal(
  p_transparency_portal_id uuid,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_sections jsonb;
  v_proofs jsonb;
  v_notices jsonb;
begin
  v_sections := seed_admin_security_trust_transparency_portal_sections(
    p_transparency_portal_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_proofs := sync_admin_security_published_proof_status(
    p_transparency_portal_id,
    1000,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_notices := sync_admin_security_published_trust_notices(
    p_transparency_portal_id,
    1000,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  perform record_admin_security_trust_transparency_event(
    'sync_completed',
    'synced',
    p_transparency_portal_id,
    null,
    'worker',
    null,
    null,
    null,
    'admin_security_trust_transparency_portal',
    p_transparency_portal_id,
    null,
    'Transparency portal synced',
    null,
    null,
    null,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'sections',
    v_sections,
    'proofs',
    v_proofs,
    'notices',
    v_notices
  );
exception
  when others then
    perform record_admin_security_trust_transparency_event(
      'sync_failed',
      'failed',
      p_transparency_portal_id,
      null,
      'worker',
      null,
      null,
      null,
      'admin_security_trust_transparency_portal',
      p_transparency_portal_id,
      null,
      'Transparency portal sync failed',
      sqlerrm,
      null,
      null,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    raise;
end;
$$;

create or replace function process_admin_security_trust_transparency_portals(
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_count integer := 0;
  v_row record;
begin
  if p_batch_size <= 0 or p_batch_size > 1000 then
    raise exception 'batch size must be between 1 and 1000';
  end if;

  for v_row in
    select id
    from admin_security_trust_transparency_portals
    where status = 'published'
    order by updated_at asc
    limit p_batch_size
    for update skip locked
  loop
    perform sync_admin_security_trust_transparency_portal(
      v_row.id,
      p_worker_id,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'transparency_process_run_id',
        v_run_id
      )
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'runId',
    v_run_id,
    'processed',
    v_count
  );
end;
$$;

create or replace function grant_admin_security_trust_transparency_access(
  p_admin_auth_user_id uuid,
  p_transparency_portal_id uuid,
  p_grantee_type text,
  p_grantee_email text,
  p_grantee_display_name text default null,
  p_access_level text default 'view',
  p_can_view_notices boolean default true,
  p_can_view_proofs boolean default true,
  p_can_view_packages boolean default false,
  p_can_request_packages boolean default false,
  p_max_uses integer default null,
  p_expires_at timestamptz default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_portal admin_security_trust_transparency_portals%rowtype;
  v_grant_id uuid;
  v_key text;
  v_token text;
  v_hash text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_grantee_email is null or position('@' in p_grantee_email) <= 1 then
    raise exception 'transparency portal grantee email is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_portal
  from admin_security_trust_transparency_portals
  where id = p_transparency_portal_id;

  if v_portal.id is null then
    raise exception 'transparency portal not found: %', p_transparency_portal_id;
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  v_key :=
    'trust_transparency_access:' ||
    v_portal.transparency_portal_key || ':' ||
    lower(trim(p_grantee_email));

  insert into admin_security_trust_transparency_access_grants (
    transparency_access_grant_key,
    status,
    transparency_portal_id,
    grantee_type,
    grantee_email,
    grantee_display_name,
    access_level,
    can_view_notices,
    can_view_proofs,
    can_view_packages,
    can_request_packages,
    access_token_hash,
    access_url,
    max_uses,
    expires_at,
    granted_by_auth_user_id,
    granted_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_key,
    'active',
    v_portal.id,
    p_grantee_type,
    lower(trim(p_grantee_email)),
    p_grantee_display_name,
    coalesce(p_access_level, 'view'),
    coalesce(p_can_view_notices, true),
    coalesce(p_can_view_proofs, true),
    coalesce(p_can_view_packages, false),
    coalesce(p_can_request_packages, false),
    v_hash,
    '/trust/access/' || v_token,
    p_max_uses,
    coalesce(p_expires_at, now() + interval '90 days'),
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (transparency_access_grant_key)
  do update set
    status = 'active',
    grantee_display_name = excluded.grantee_display_name,
    access_level = excluded.access_level,
    can_view_notices = excluded.can_view_notices,
    can_view_proofs = excluded.can_view_proofs,
    can_view_packages = excluded.can_view_packages,
    can_request_packages = excluded.can_request_packages,
    access_token_hash = excluded.access_token_hash,
    access_url = excluded.access_url,
    max_uses = excluded.max_uses,
    expires_at = excluded.expires_at,
    metadata = admin_security_trust_transparency_access_grants.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_grant_id;

  perform record_admin_security_trust_transparency_event(
    'access_granted',
    'granted',
    v_portal.id,
    v_grant_id,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'admin_security_trust_transparency_access_grant',
    v_grant_id,
    v_key,
    'Transparency portal access granted',
    'Access granted to ' || lower(trim(p_grantee_email)),
    null,
    null,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_grant_id;
end;
$$;

create or replace function resolve_admin_security_trust_transparency_access_token(
  p_access_token text,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null
)
returns table (
  transparency_portal_id uuid,
  transparency_portal_key text,
  slug text,
  access_grant_id uuid,
  grantee_email text,
  access_level text,
  can_view_notices boolean,
  can_view_proofs boolean,
  can_view_packages boolean,
  can_request_packages boolean
)
language plpgsql
as $$
declare
  v_hash text;
  v_grant admin_security_trust_transparency_access_grants%rowtype;
  v_portal admin_security_trust_transparency_portals%rowtype;
begin
  if p_access_token is null or length(trim(p_access_token)) < 32 then
    raise exception 'invalid transparency portal access token';
  end if;

  v_hash := encode(digest(p_access_token, 'sha256'), 'hex');

  select *
  into v_grant
  from admin_security_trust_transparency_access_grants
  where access_token_hash = v_hash
  for update;

  if v_grant.id is null then
    raise exception 'transparency portal access grant not found';
  end if;

  if v_grant.status <> 'active' then
    raise exception 'transparency portal access grant is not active: %', v_grant.status;
  end if;

  if v_grant.expires_at is not null and v_grant.expires_at <= now() then
    update admin_security_trust_transparency_access_grants
    set status = 'expired', updated_at = now()
    where id = v_grant.id;

    raise exception 'transparency portal access grant expired';
  end if;

  if v_grant.max_uses is not null and v_grant.use_count >= v_grant.max_uses then
    update admin_security_trust_transparency_access_grants
    set status = 'exhausted', updated_at = now()
    where id = v_grant.id;

    raise exception 'transparency portal access grant exhausted';
  end if;

  select *
  into v_portal
  from admin_security_trust_transparency_portals
  where id = v_grant.transparency_portal_id;

  if v_portal.status <> 'published' then
    raise exception 'transparency portal is not published: %', v_portal.status;
  end if;

  update admin_security_trust_transparency_access_grants
  set
    use_count = use_count + 1,
    last_used_at = now(),
    updated_at = now()
  where id = v_grant.id;

  perform record_admin_security_trust_transparency_event(
    'access_used',
    'used',
    v_portal.id,
    v_grant.id,
    v_grant.grantee_type,
    v_grant.grantee_auth_user_id,
    null,
    v_grant.grantee_email,
    'admin_security_trust_transparency_access_grant',
    v_grant.id,
    v_grant.transparency_access_grant_key,
    'Transparency portal access used',
    null,
    p_ip_address,
    p_user_agent,
    p_request_id,
    '{}'::jsonb
  );

  return query
  select
    v_portal.id,
    v_portal.transparency_portal_key,
    v_portal.slug,
    v_grant.id,
    v_grant.grantee_email,
    v_grant.access_level,
    v_grant.can_view_notices,
    v_grant.can_view_proofs,
    v_grant.can_view_packages,
    v_grant.can_request_packages;
end;
$$;

create or replace function expire_admin_security_trust_transparency_records(
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

  update admin_security_trust_transparency_access_grants
  set
    status = 'expired',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'expired_by_worker',
      p_worker_id,
      'expiry_run_id',
      v_run_id
    ),
    updated_at = now()
  where id in (
    select id
    from admin_security_trust_transparency_access_grants
    where status = 'active'
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  update admin_security_published_trust_notices
  set status = 'expired', updated_at = now()
  where id in (
    select id
    from admin_security_published_trust_notices
    where status = 'published'
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  update admin_security_published_proof_status
  set status = 'expired', updated_at = now()
  where id in (
    select id
    from admin_security_published_proof_status
    where status = 'published'
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  return v_run_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) Dashboard + public views
-- ---------------------------------------------------------------------------

create or replace view admin_security_trust_transparency_portal_dashboard as
select
  p.id as admin_security_trust_transparency_portal_id,
  p.transparency_portal_key,
  p.status,
  p.portal_type,
  p.visibility,
  p.slug,
  p.title,
  p.subtitle,
  p.description,
  p.customer_name,
  p.customer_domain,
  p.private_room_id,
  pr.private_room_key,
  p.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  p.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  p.show_platform_health,
  p.show_proof_status,
  p.show_public_notices,
  p.show_customer_notices,
  p.show_verification_links,
  p.show_audit_packages,
  p.show_policies,
  p.show_incident_history,
  p.show_lifecycle_summary,
  p.require_auth,
  p.allow_public_verification,
  p.allow_package_access_request,
  p.public_url,
  p.custom_domain,
  p.published_at,
  p.unpublished_at,
  creator.email as created_by_email,
  (
    select count(*)
    from admin_security_trust_transparency_portal_sections s
    where s.transparency_portal_id = p.id
      and s.status = 'active'
  ) as active_section_count,
  (
    select count(*)
    from admin_security_published_trust_notices n
    where n.transparency_portal_id = p.id
      and n.status = 'published'
  ) as published_notice_count,
  (
    select count(*)
    from admin_security_published_proof_status ps
    where ps.transparency_portal_id = p.id
      and ps.status = 'published'
  ) as published_proof_count,
  (
    select count(*)
    from admin_security_trust_transparency_access_grants g
    where g.transparency_portal_id = p.id
      and g.status = 'active'
  ) as active_access_grant_count,
  p.created_at,
  p.updated_at,
  p.metadata
from admin_security_trust_transparency_portals p
left join admin_security_private_trust_rooms pr
  on pr.id = p.private_room_id
left join admin_security_auditor_portals ap
  on ap.id = p.auditor_portal_id
left join admin_security_enterprise_review_rooms er
  on er.id = p.enterprise_review_room_id
left join admin_users creator
  on creator.id = p.created_by_admin_user_id
order by p.created_at desc;

create or replace view admin_security_trust_transparency_portal_public_view as
select
  p.id as admin_security_trust_transparency_portal_id,
  p.transparency_portal_key,
  p.status,
  p.portal_type,
  p.visibility,
  p.slug,
  p.title,
  p.subtitle,
  p.description,
  p.customer_name,
  p.customer_domain,
  p.public_url,
  p.brand_payload,
  p.content_payload,
  p.show_platform_health,
  p.show_proof_status,
  p.show_public_notices,
  p.show_customer_notices,
  p.show_verification_links,
  p.show_audit_packages,
  p.show_policies,
  p.show_incident_history,
  p.allow_public_verification,
  p.allow_package_access_request,
  p.published_at,
  p.updated_at
from admin_security_trust_transparency_portals p
where p.status = 'published';

create or replace view admin_security_trust_transparency_section_dashboard as
select
  s.id as admin_security_trust_transparency_portal_section_id,
  s.section_key,
  s.transparency_portal_id,
  p.transparency_portal_key,
  p.slug,
  s.status,
  s.section_type,
  s.title,
  s.summary,
  s.body,
  s.sort_order,
  s.visible_to_public,
  s.visible_to_customer,
  s.visible_to_auditor,
  s.visible_to_regulator,
  s.source_type,
  s.source_id,
  s.source_key,
  s.content_payload,
  s.published_at,
  s.created_at,
  s.updated_at,
  s.metadata
from admin_security_trust_transparency_portal_sections s
join admin_security_trust_transparency_portals p
  on p.id = s.transparency_portal_id
order by s.transparency_portal_id, s.sort_order;

create or replace view admin_security_published_trust_notice_dashboard as
select
  n.id as admin_security_published_trust_notice_id,
  n.published_notice_key,
  n.status,
  n.notice_type,
  n.notice_scope,
  n.transparency_portal_id,
  p.transparency_portal_key,
  p.slug,
  n.title,
  n.summary,
  n.body,
  n.public_severity,
  n.customer_name,
  n.customer_domain,
  n.private_room_id,
  pr.private_room_key,
  n.incident_id,
  i.incident_key,
  n.incident_customer_notice_id,
  cn.notice_key as incident_customer_notice_key,
  n.proof_health_signal_id,
  hs.signal_key as proof_health_signal_key,
  n.governance_violation_id,
  gv.violation_key as governance_violation_key,
  n.proof_type,
  n.proof_key,
  n.proof_hash_sha256,
  n.customer_visible,
  n.public_visible,
  n.auditor_visible,
  n.regulator_visible,
  n.published_at,
  n.expires_at,
  approver.email as approved_by_email,
  n.approved_at,
  n.created_at,
  n.updated_at,
  n.metadata
from admin_security_published_trust_notices n
left join admin_security_trust_transparency_portals p
  on p.id = n.transparency_portal_id
left join admin_security_private_trust_rooms pr
  on pr.id = n.private_room_id
left join admin_security_trust_incidents i
  on i.id = n.incident_id
left join admin_security_trust_incident_customer_notices cn
  on cn.id = n.incident_customer_notice_id
left join admin_security_proof_health_signals hs
  on hs.id = n.proof_health_signal_id
left join admin_security_proof_governance_violations gv
  on gv.id = n.governance_violation_id
left join admin_users approver
  on approver.id = n.approved_by_admin_user_id
order by n.published_at desc nulls last, n.created_at desc;

create or replace view admin_security_published_proof_status_dashboard as
select
  ps.id as admin_security_published_proof_status_id,
  ps.published_proof_status_key,
  ps.status,
  ps.transparency_portal_id,
  p.transparency_portal_key,
  p.slug,
  ps.proof_type,
  ps.proof_key,
  ps.proof_title,
  ps.proof_summary,
  ps.proof_status,
  ps.proof_hash_sha256,
  ps.verification_url,
  ps.qr_url,
  ps.customer_name,
  ps.customer_domain,
  ps.private_room_id,
  pr.private_room_key,
  ps.retention_subject_id,
  rs.retention_subject_key,
  ps.verification_link_id,
  vl.verification_link_key,
  ps.qr_code_id,
  qc.qr_code_key,
  ps.audit_package_id,
  apkg.audit_package_key,
  ps.verified_count,
  ps.failed_verification_count,
  ps.last_verified_at,
  ps.customer_visible,
  ps.public_visible,
  ps.redaction_status,
  ps.lifecycle_status,
  ps.retention_summary,
  ps.published_at,
  ps.expires_at,
  ps.created_at,
  ps.updated_at,
  ps.metadata
from admin_security_published_proof_status ps
left join admin_security_trust_transparency_portals p
  on p.id = ps.transparency_portal_id
left join admin_security_private_trust_rooms pr
  on pr.id = ps.private_room_id
left join admin_security_proof_retention_subjects rs
  on rs.id = ps.retention_subject_id
left join admin_security_proof_verification_links vl
  on vl.id = ps.verification_link_id
left join admin_security_proof_qr_codes qc
  on qc.id = ps.qr_code_id
left join admin_security_audit_packages apkg
  on apkg.id = ps.audit_package_id
order by ps.published_at desc;

create or replace view admin_security_trust_transparency_access_grant_dashboard as
select
  g.id as admin_security_trust_transparency_access_grant_id,
  g.transparency_access_grant_key,
  g.status,
  g.transparency_portal_id,
  p.transparency_portal_key,
  p.slug,
  p.title as portal_title,
  g.grantee_type,
  g.grantee_email,
  g.grantee_display_name,
  g.grantee_auth_user_id,
  g.access_level,
  g.can_view_notices,
  g.can_view_proofs,
  g.can_view_packages,
  g.can_request_packages,
  g.access_url,
  g.max_uses,
  g.use_count,
  g.expires_at,
  granter.email as granted_by_email,
  g.revoked_at,
  revoker.email as revoked_by_email,
  g.revocation_reason,
  g.last_used_at,
  g.created_at,
  g.updated_at,
  g.metadata
from admin_security_trust_transparency_access_grants g
join admin_security_trust_transparency_portals p
  on p.id = g.transparency_portal_id
left join admin_users granter
  on granter.id = g.granted_by_admin_user_id
left join admin_users revoker
  on revoker.id = g.revoked_by_admin_user_id
order by g.created_at desc;

create or replace view admin_security_trust_transparency_integrity as
select
  (
    select count(*)
    from admin_security_trust_transparency_portals
    where status = 'published'
  ) as published_portal_count,

  (
    select count(*)
    from admin_security_trust_transparency_portals p
    where p.status = 'published'
      and not exists (
        select 1
        from admin_security_trust_transparency_portal_sections s
        where s.transparency_portal_id = p.id
          and s.status = 'active'
      )
  ) as published_portal_missing_sections_count,

  (
    select count(*)
    from admin_security_published_trust_notices
    where status = 'published'
  ) as published_notice_count,

  (
    select count(*)
    from admin_security_published_trust_notices
    where status = 'published'
      and public_severity = 'critical'
  ) as published_critical_notice_count,

  (
    select count(*)
    from admin_security_published_proof_status
    where status = 'published'
  ) as published_proof_status_count,

  (
    select count(*)
    from admin_security_published_proof_status
    where status = 'published'
      and proof_status in ('verification_failed', 'incident_open', 'under_review')
  ) as published_risky_proof_status_count,

  (
    select count(*)
    from admin_security_trust_transparency_access_grants
    where status = 'active'
  ) as active_access_grant_count,

  (
    select count(*)
    from admin_security_trust_transparency_access_grants
    where status = 'active'
      and expires_at is not null
      and expires_at <= now()
  ) as expired_active_access_grant_count,

  now() as checked_at;

grant select on admin_security_trust_transparency_portal_dashboard to admin_api_role;
grant select on admin_security_trust_transparency_portal_public_view to admin_api_role;
grant select on admin_security_trust_transparency_section_dashboard to admin_api_role;
grant select on admin_security_published_trust_notice_dashboard to admin_api_role;
grant select on admin_security_published_proof_status_dashboard to admin_api_role;
grant select on admin_security_trust_transparency_access_grant_dashboard to admin_api_role;
grant select on admin_security_trust_transparency_integrity to admin_api_role;

-- ---------------------------------------------------------------------------
-- 9) Scheduled jobs
-- ---------------------------------------------------------------------------

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
    'admin_security_trust_transparency_process_every_15m',
    'Process trust transparency portals',
    'admin',
    true,
    '*/15 * * * *',
    'process_admin_security_trust_transparency_portals',
    '{"batch_size": 500}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
  ),
  (
    'admin_security_trust_transparency_expiry_daily',
    'Expire trust transparency records',
    'admin',
    true,
    '50 3 * * *',
    'expire_admin_security_trust_transparency_records',
    '{"batch_size": 5000}'::jsonb,
    180,
    300,
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

-- ---------------------------------------------------------------------------
-- 10) Error taxonomy
-- ---------------------------------------------------------------------------

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
    'TRUST_TRANSPARENCY_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Trust transparency portal not found.',
    'Trust transparency portal not found.',
    'platform'
  ),
  (
    'TRUST_TRANSPARENCY_INVALID_STATE',
    'validation',
    'medium',
    409,
    true,
    true,
    'Trust transparency portal is not in a valid state.',
    'Trust transparency invalid state.',
    'platform'
  ),
  (
    'TRUST_TRANSPARENCY_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Trust transparency request requires complete fields.',
    'Trust transparency required fields missing.',
    'platform'
  ),
  (
    'TRUST_TRANSPARENCY_ACCESS_DENIED',
    'permission',
    'high',
    403,
    false,
    true,
    'Trust transparency access is not available.',
    'Trust transparency access denied.',
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
  ('transparency portal not found', 'TRUST_TRANSPARENCY_NOT_FOUND', 5, '{}'::jsonb),
  ('transparency portal is not published', 'TRUST_TRANSPARENCY_INVALID_STATE', 5, '{}'::jsonb),
  ('transparency portal requires access token', 'TRUST_TRANSPARENCY_ACCESS_DENIED', 5, '{}'::jsonb),
  ('transparency portal access grant not found', 'TRUST_TRANSPARENCY_ACCESS_DENIED', 5, '{}'::jsonb),
  ('transparency portal access grant is not active', 'TRUST_TRANSPARENCY_ACCESS_DENIED', 5, '{}'::jsonb),
  ('transparency portal access grant expired', 'TRUST_TRANSPARENCY_ACCESS_DENIED', 5, '{}'::jsonb),
  ('transparency portal access grant exhausted', 'TRUST_TRANSPARENCY_ACCESS_DENIED', 5, '{}'::jsonb),
  ('invalid transparency portal slug', 'TRUST_TRANSPARENCY_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('transparency portal title is required', 'TRUST_TRANSPARENCY_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('transparency portal grantee email is required', 'TRUST_TRANSPARENCY_REQUIRED_FIELDS', 5, '{}'::jsonb)
on conflict (match_pattern)
do update set
  error_code = excluded.error_code,
  priority = excluded.priority,
  metadata = excluded.metadata;

-- ---------------------------------------------------------------------------
-- 11) RLS + grants
-- ---------------------------------------------------------------------------

alter table admin_security_trust_transparency_portals enable row level security;
alter table admin_security_trust_transparency_portal_sections enable row level security;
alter table admin_security_published_trust_notices enable row level security;
alter table admin_security_published_proof_status enable row level security;
alter table admin_security_trust_transparency_access_grants enable row level security;
alter table admin_security_trust_transparency_events enable row level security;

create policy admin_api_all_trust_transparency_portals
on admin_security_trust_transparency_portals
for all to admin_api_role
using (true)
with check (true);

create policy admin_api_all_trust_transparency_portal_sections
on admin_security_trust_transparency_portal_sections
for all to admin_api_role
using (true)
with check (true);

create policy admin_api_all_published_trust_notices
on admin_security_published_trust_notices
for all to admin_api_role
using (true)
with check (true);

create policy admin_api_all_published_proof_status
on admin_security_published_proof_status
for all to admin_api_role
using (true)
with check (true);

create policy admin_api_all_trust_transparency_access_grants
on admin_security_trust_transparency_access_grants
for all to admin_api_role
using (true)
with check (true);

create policy admin_api_all_trust_transparency_events
on admin_security_trust_transparency_events
for all to admin_api_role
using (true)
with check (true);

create policy worker_all_trust_transparency_portals
on admin_security_trust_transparency_portals
for all to worker_role
using (true)
with check (true);

create policy worker_all_trust_transparency_portal_sections
on admin_security_trust_transparency_portal_sections
for all to worker_role
using (true)
with check (true);

create policy worker_all_published_trust_notices
on admin_security_published_trust_notices
for all to worker_role
using (true)
with check (true);

create policy worker_all_published_proof_status
on admin_security_published_proof_status
for all to worker_role
using (true)
with check (true);

create policy worker_all_trust_transparency_access_grants
on admin_security_trust_transparency_access_grants
for all to worker_role
using (true)
with check (true);

create policy worker_all_trust_transparency_events
on admin_security_trust_transparency_events
for all to worker_role
using (true)
with check (true);

grant execute on function record_admin_security_trust_transparency_event(
  text,text,uuid,uuid,text,uuid,uuid,text,text,uuid,text,text,text,inet,text,text,jsonb
) to admin_api_role, worker_role;

grant execute on function create_admin_security_trust_transparency_portal(
  uuid,text,text,text,text,text,text,text,text,uuid,uuid,uuid,boolean,boolean,boolean,jsonb,jsonb,text,jsonb
) to admin_api_role;

grant execute on function publish_admin_security_trust_transparency_portal(uuid,uuid,text,jsonb)
to admin_api_role;

grant execute on function seed_admin_security_trust_transparency_portal_sections(uuid,text,jsonb)
to admin_api_role, worker_role;

grant execute on function sync_admin_security_published_proof_status(uuid,integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function sync_admin_security_published_trust_notices(uuid,integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function sync_admin_security_trust_transparency_portal(uuid,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function process_admin_security_trust_transparency_portals(integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function grant_admin_security_trust_transparency_access(
  uuid,uuid,text,text,text,text,boolean,boolean,boolean,boolean,integer,timestamptz,text,jsonb
) to admin_api_role;

grant execute on function resolve_admin_security_trust_transparency_access_token(text,inet,text,text)
to admin_api_role, worker_role;

grant execute on function expire_admin_security_trust_transparency_records(integer,text,jsonb)
to admin_api_role, worker_role;

alter function create_admin_security_trust_transparency_portal(
  uuid,text,text,text,text,text,text,text,text,uuid,uuid,uuid,boolean,boolean,boolean,jsonb,jsonb,text,jsonb
) security definer;
alter function create_admin_security_trust_transparency_portal(
  uuid,text,text,text,text,text,text,text,text,uuid,uuid,uuid,boolean,boolean,boolean,jsonb,jsonb,text,jsonb
) set search_path = public;

alter function publish_admin_security_trust_transparency_portal(uuid,uuid,text,jsonb) security definer;
alter function publish_admin_security_trust_transparency_portal(uuid,uuid,text,jsonb) set search_path = public;

alter function sync_admin_security_trust_transparency_portal(uuid,text,text,jsonb) security definer;
alter function sync_admin_security_trust_transparency_portal(uuid,text,text,jsonb) set search_path = public;

alter function process_admin_security_trust_transparency_portals(integer,text,text,jsonb) security definer;
alter function process_admin_security_trust_transparency_portals(integer,text,text,jsonb) set search_path = public;

alter function grant_admin_security_trust_transparency_access(
  uuid,uuid,text,text,text,text,boolean,boolean,boolean,boolean,integer,timestamptz,text,jsonb
) security definer;
alter function grant_admin_security_trust_transparency_access(
  uuid,uuid,text,text,text,text,boolean,boolean,boolean,boolean,integer,timestamptz,text,jsonb
) set search_path = public;

alter function resolve_admin_security_trust_transparency_access_token(text,inet,text,text) security definer;
alter function resolve_admin_security_trust_transparency_access_token(text,inet,text,text) set search_path = public;

alter function expire_admin_security_trust_transparency_records(integer,text,jsonb) security definer;
alter function expire_admin_security_trust_transparency_records(integer,text,jsonb) set search_path = public;

-- ---------------------------------------------------------------------------
-- 20) run_scheduled_job — extend allowlist for trust transparency portal v2
-- ---------------------------------------------------------------------------
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
    v_result := process_due_admin_security_proof_digests(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'expire_admin_security_proof_notification_events' then
    v_uuid_result := expire_admin_security_proof_notification_events(
      coalesce((v_job.function_args->>'batch_size')::integer, 5000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_admin_security_proof_observability_cycle' then
    v_result := process_admin_security_proof_observability_cycle(
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'expire_admin_security_proof_observability_records' then
    v_uuid_result := expire_admin_security_proof_observability_records(
      coalesce((v_job.function_args->>'batch_size')::integer, 5000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_approved_admin_security_audit_package_requests' then
    v_result := process_approved_admin_security_audit_package_requests(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'expire_admin_security_audit_packages' then
    v_uuid_result := expire_admin_security_audit_packages(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_admin_security_trust_transparency_portals' then
    v_result := process_admin_security_trust_transparency_portals(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'expire_admin_security_trust_transparency_records' then
    v_uuid_result := expire_admin_security_trust_transparency_records(
      coalesce((v_job.function_args->>'batch_size')::integer, 5000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_admin_security_trust_billing_cycle' then
    v_result := process_admin_security_trust_billing_cycle(
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'refresh_admin_security_trust_usage_rollups' then
    v_result := refresh_admin_security_trust_usage_rollups(
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month',
      5000,
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

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
