-- Step 9.66 — Build artifact download registry v2.
-- Runs after 180_admin_security_private_trust_rooms_v2.sql.

create table if not exists admin_security_artifact_download_subjects (
  id uuid primary key default gen_random_uuid(),
  subject_key text not null unique,
  status text not null default 'active',
  source_type text not null,
  source_id uuid not null,
  artifact_type text not null,
  artifact_key text,
  title text not null,
  summary text,
  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  signed_at timestamptz,
  default_visibility text not null default 'admin_only',
  default_sensitivity text not null default 'restricted',
  downloadable boolean not null default true,
  requires_watermark boolean not null default true,
  requires_authenticated_access boolean not null default true,
  allow_public_download boolean not null default false,
  expires_at timestamptz,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  request_id text,
  public_metadata jsonb not null default '{}'::jsonb,
  internal_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id),
  constraint admin_security_artifact_download_subjects_status_check
  check (
    status in (
      'active',
      'expired',
      'revoked',
      'superseded',
      'deleted',
      'archived'
    )
  ),
  constraint admin_security_artifact_download_subjects_artifact_type_check
  check (
    artifact_type in (
      'compliance_report',
      'questionnaire_export',
      'disclosure_package',
      'auditor_packet_manifest',
      'auditor_evidence_packet',
      'public_trust_center_manifest',
      'private_trust_room_manifest',
      'private_trust_room_artifact',
      'security_document',
      'revocation_notice',
      'other'
    )
  ),
  constraint admin_security_artifact_download_subjects_visibility_check
  check (
    default_visibility in (
      'public',
      'customer_scoped',
      'private_room_scoped',
      'auditor_scoped',
      'admin_only'
    )
  ),
  constraint admin_security_artifact_download_subjects_sensitivity_check
  check (
    default_sensitivity in (
      'public',
      'customer_confidential',
      'restricted',
      'legal_sensitive',
      'security_sensitive'
    )
  ),
  constraint admin_security_artifact_download_subjects_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_artifact_download_subjects_source_idx
on admin_security_artifact_download_subjects (source_type, source_id);

create index if not exists admin_security_artifact_download_subjects_status_idx
on admin_security_artifact_download_subjects (status, artifact_type);

create index if not exists admin_security_artifact_download_subjects_customer_idx
on admin_security_artifact_download_subjects (customer_name, customer_domain);

create index if not exists admin_security_artifact_download_subjects_private_room_idx
on admin_security_artifact_download_subjects (private_room_id, status);

create index if not exists admin_security_artifact_download_subjects_auditor_idx
on admin_security_artifact_download_subjects (auditor_portal_id, status);

drop trigger if exists admin_security_artifact_download_subjects_set_updated_at
on admin_security_artifact_download_subjects;

create trigger admin_security_artifact_download_subjects_set_updated_at
before update on admin_security_artifact_download_subjects
for each row
execute function set_updated_at();

create table if not exists admin_security_artifact_download_grants (
  id uuid primary key default gen_random_uuid(),
  grant_key text not null unique,
  status text not null default 'active',
  download_subject_id uuid not null
    references admin_security_artifact_download_subjects(id)
    on delete cascade,
  source_type text not null,
  source_id uuid not null,
  artifact_type text not null,
  grant_scope text not null,
  granted_to_auth_user_id uuid,
  granted_to_email text,
  granted_to_display_name text,
  granted_to_participant_id uuid,
  granted_to_admin_user_id uuid references admin_users(id),
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  private_room_participant_id uuid references admin_security_private_trust_room_participants(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  auditor_participant_id uuid,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  customer_name text,
  customer_domain text,
  max_downloads integer not null default 3,
  download_count integer not null default 0,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  requires_authentication boolean not null default true,
  requires_watermark boolean not null default true,
  watermark text,
  watermark_payload jsonb not null default '{}'::jsonb,
  signed_url text,
  signed_url_expires_at timestamptz,
  token_hash_sha256 text,
  token_prefix text,
  ip_allowlist inet[],
  user_agent_hint text,
  granted_by_auth_user_id uuid,
  granted_by_admin_user_id uuid references admin_users(id),
  revoked_at timestamptz,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id),
  revocation_reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_artifact_download_grants_status_check
  check (
    status in (
      'active',
      'used',
      'expired',
      'revoked',
      'failed',
      'archived'
    )
  ),
  constraint admin_security_artifact_download_grants_scope_check
  check (
    grant_scope in (
      'public',
      'customer',
      'private_room',
      'auditor_portal',
      'enterprise_review_room',
      'admin',
      'worker',
      'system'
    )
  ),
  constraint admin_security_artifact_download_grants_max_check
  check (max_downloads between 1 and 100),
  constraint admin_security_artifact_download_grants_count_check
  check (download_count >= 0),
  constraint admin_security_artifact_download_grants_expiry_check
  check (expires_at > created_at)
);

create index if not exists admin_security_artifact_download_grants_subject_idx
on admin_security_artifact_download_grants (download_subject_id, status);

create index if not exists admin_security_artifact_download_grants_token_idx
on admin_security_artifact_download_grants (token_hash_sha256);

create index if not exists admin_security_artifact_download_grants_auth_user_idx
on admin_security_artifact_download_grants (granted_to_auth_user_id, status, created_at desc);

create index if not exists admin_security_artifact_download_grants_private_room_idx
on admin_security_artifact_download_grants (private_room_id, private_room_participant_id, status);

create index if not exists admin_security_artifact_download_grants_expiry_idx
on admin_security_artifact_download_grants (status, expires_at);

drop trigger if exists admin_security_artifact_download_grants_set_updated_at
on admin_security_artifact_download_grants;

create trigger admin_security_artifact_download_grants_set_updated_at
before update on admin_security_artifact_download_grants
for each row
execute function set_updated_at();

create table if not exists admin_security_artifact_download_attempts (
  id uuid primary key default gen_random_uuid(),
  attempt_key text not null unique,
  download_grant_id uuid
    references admin_security_artifact_download_grants(id)
    on delete set null,
  download_subject_id uuid
    references admin_security_artifact_download_subjects(id)
    on delete set null,
  status text not null,
  failure_reason text,
  source_type text,
  source_id uuid,
  artifact_key text,
  artifact_type text,
  requester_auth_user_id uuid,
  requester_email text,
  private_room_id uuid,
  private_room_participant_id uuid,
  auditor_portal_id uuid,
  auditor_participant_id uuid,
  ip_address inet,
  user_agent text,
  token_prefix text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_artifact_download_attempts_status_check
  check (
    status in (
      'allowed',
      'denied',
      'expired',
      'revoked',
      'rate_limited',
      'token_invalid',
      'subject_unavailable',
      'grant_exhausted',
      'error'
    )
  )
);

create index if not exists admin_security_artifact_download_attempts_grant_idx
on admin_security_artifact_download_attempts (download_grant_id, created_at desc);

create index if not exists admin_security_artifact_download_attempts_subject_idx
on admin_security_artifact_download_attempts (download_subject_id, created_at desc);

create index if not exists admin_security_artifact_download_attempts_status_idx
on admin_security_artifact_download_attempts (status, created_at desc);

create index if not exists admin_security_artifact_download_attempts_requester_idx
on admin_security_artifact_download_attempts (requester_auth_user_id, created_at desc);

create table if not exists admin_security_artifact_download_completions (
  id uuid primary key default gen_random_uuid(),
  completion_key text not null unique,
  download_grant_id uuid not null
    references admin_security_artifact_download_grants(id)
    on delete cascade,
  download_subject_id uuid not null
    references admin_security_artifact_download_subjects(id)
    on delete cascade,
  attempt_id uuid
    references admin_security_artifact_download_attempts(id)
    on delete set null,
  source_type text not null,
  source_id uuid not null,
  artifact_key text,
  artifact_type text,
  requester_auth_user_id uuid,
  requester_email text,
  bytes_served bigint,
  checksum_sha256 text,
  storage_uri text,
  signed_url_used text,
  ip_address inet,
  user_agent text,
  completed_at timestamptz not null default now(),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_security_artifact_download_completions_grant_idx
on admin_security_artifact_download_completions (download_grant_id, created_at desc);

create index if not exists admin_security_artifact_download_completions_subject_idx
on admin_security_artifact_download_completions (download_subject_id, created_at desc);

create index if not exists admin_security_artifact_download_completions_requester_idx
on admin_security_artifact_download_completions (requester_auth_user_id, created_at desc);

create or replace function register_admin_security_artifact_download_subject(
  p_source_type text,
  p_source_id uuid,
  p_artifact_type text,
  p_artifact_key text,
  p_title text,
  p_summary text default null,
  p_storage_uri text default null,
  p_checksum_sha256 text default null,
  p_payload_bytes bigint default null,
  p_signature_algorithm text default null,
  p_signing_key_version text default null,
  p_signature text default null,
  p_signed_at timestamptz default null,
  p_default_visibility text default 'admin_only',
  p_default_sensitivity text default 'restricted',
  p_downloadable boolean default true,
  p_requires_watermark boolean default true,
  p_requires_authenticated_access boolean default true,
  p_allow_public_download boolean default false,
  p_expires_at timestamptz default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_private_room_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_request_id text default null,
  p_public_metadata jsonb default '{}'::jsonb,
  p_internal_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_subject_id uuid;
  v_subject_key text;
begin
  if p_source_id is null then
    raise exception 'download subject source id is required';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'download subject title is required';
  end if;

  v_subject_key := 'download_subject:' || p_source_type || ':' || p_source_id::text;

  insert into admin_security_artifact_download_subjects (
    subject_key,
    status,
    source_type,
    source_id,
    artifact_type,
    artifact_key,
    title,
    summary,
    storage_uri,
    checksum_sha256,
    payload_bytes,
    signature_algorithm,
    signing_key_version,
    signature,
    signed_at,
    default_visibility,
    default_sensitivity,
    downloadable,
    requires_watermark,
    requires_authenticated_access,
    allow_public_download,
    expires_at,
    customer_name,
    customer_domain,
    private_room_id,
    auditor_portal_id,
    enterprise_review_room_id,
    request_id,
    public_metadata,
    internal_metadata
  )
  values (
    v_subject_key,
    'active',
    p_source_type,
    p_source_id,
    p_artifact_type,
    p_artifact_key,
    p_title,
    p_summary,
    p_storage_uri,
    p_checksum_sha256,
    p_payload_bytes,
    p_signature_algorithm,
    p_signing_key_version,
    p_signature,
    p_signed_at,
    coalesce(p_default_visibility, 'admin_only'),
    coalesce(p_default_sensitivity, 'restricted'),
    coalesce(p_downloadable, true),
    coalesce(p_requires_watermark, true),
    coalesce(p_requires_authenticated_access, true),
    coalesce(p_allow_public_download, false),
    p_expires_at,
    p_customer_name,
    p_customer_domain,
    p_private_room_id,
    p_auditor_portal_id,
    p_enterprise_review_room_id,
    p_request_id,
    coalesce(p_public_metadata, '{}'::jsonb),
    coalesce(p_internal_metadata, '{}'::jsonb)
  )
  on conflict (source_type, source_id)
  do update set
    status = 'active',
    artifact_type = excluded.artifact_type,
    artifact_key = coalesce(excluded.artifact_key, admin_security_artifact_download_subjects.artifact_key),
    title = excluded.title,
    summary = coalesce(excluded.summary, admin_security_artifact_download_subjects.summary),
    storage_uri = coalesce(excluded.storage_uri, admin_security_artifact_download_subjects.storage_uri),
    checksum_sha256 = coalesce(excluded.checksum_sha256, admin_security_artifact_download_subjects.checksum_sha256),
    payload_bytes = coalesce(excluded.payload_bytes, admin_security_artifact_download_subjects.payload_bytes),
    signature_algorithm = coalesce(excluded.signature_algorithm, admin_security_artifact_download_subjects.signature_algorithm),
    signing_key_version = coalesce(excluded.signing_key_version, admin_security_artifact_download_subjects.signing_key_version),
    signature = coalesce(excluded.signature, admin_security_artifact_download_subjects.signature),
    signed_at = coalesce(excluded.signed_at, admin_security_artifact_download_subjects.signed_at),
    default_visibility = excluded.default_visibility,
    default_sensitivity = excluded.default_sensitivity,
    downloadable = excluded.downloadable,
    requires_watermark = excluded.requires_watermark,
    requires_authenticated_access = excluded.requires_authenticated_access,
    allow_public_download = excluded.allow_public_download,
    expires_at = coalesce(excluded.expires_at, admin_security_artifact_download_subjects.expires_at),
    customer_name = coalesce(excluded.customer_name, admin_security_artifact_download_subjects.customer_name),
    customer_domain = coalesce(excluded.customer_domain, admin_security_artifact_download_subjects.customer_domain),
    private_room_id = coalesce(excluded.private_room_id, admin_security_artifact_download_subjects.private_room_id),
    auditor_portal_id = coalesce(excluded.auditor_portal_id, admin_security_artifact_download_subjects.auditor_portal_id),
    enterprise_review_room_id = coalesce(excluded.enterprise_review_room_id, admin_security_artifact_download_subjects.enterprise_review_room_id),
    public_metadata = admin_security_artifact_download_subjects.public_metadata || excluded.public_metadata,
    internal_metadata = admin_security_artifact_download_subjects.internal_metadata || excluded.internal_metadata,
    updated_at = now()
  returning id into v_subject_id;

  return v_subject_id;
end;
$$;

create or replace function discover_admin_security_artifact_download_subjects(
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
    select
      'admin_security_disclosure_package'::text as source_type,
      p.id as source_id,
      'disclosure_package'::text as artifact_type,
      p.package_key as artifact_key,
      p.title,
      p.summary,
      p.storage_uri,
      p.checksum_sha256,
      p.payload_bytes,
      p.signature_algorithm,
      p.signing_key_version,
      p.signature,
      p.signed_at,
      case
        when p.publication_target_type = 'trust_center' then 'public'
        when p.enterprise_review_room_id is not null then 'enterprise_review_room'
        else 'customer_scoped'
      end as default_visibility,
      'customer_confidential'::text as default_sensitivity,
      p.expires_at,
      p.customer_name,
      p.customer_domain,
      null::uuid as private_room_id,
      null::uuid as auditor_portal_id,
      p.enterprise_review_room_id
    from admin_security_disclosure_packages p
    where p.status in ('active', 'expired', 'revoked', 'superseded')
      and not exists (
        select 1 from admin_security_artifact_download_subjects s
        where s.source_type = 'admin_security_disclosure_package'
          and s.source_id = p.id
      )

    union all

    select
      'admin_security_questionnaire_export',
      e.id,
      'questionnaire_export',
      e.export_key,
      p.questionnaire_title || ' Export',
      'Security questionnaire export.',
      e.storage_uri,
      e.checksum_sha256,
      e.payload_bytes,
      e.signature_algorithm,
      e.signing_key_version,
      e.signature,
      e.signed_at,
      'customer_scoped',
      'customer_confidential',
      e.expires_at,
      p.customer_name,
      p.customer_domain,
      null,
      null,
      null
    from admin_security_questionnaire_exports e
    join admin_security_questionnaire_projects p
      on p.id = e.questionnaire_project_id
    where e.status in ('ready', 'expired', 'revoked')
      and not exists (
        select 1 from admin_security_artifact_download_subjects s
        where s.source_type = 'admin_security_questionnaire_export'
          and s.source_id = e.id
      )

    union all

    select
      'admin_security_trust_center_manifest',
      m.id,
      'public_trust_center_manifest',
      m.manifest_key,
      m.title,
      m.summary,
      m.storage_uri,
      m.checksum_sha256,
      m.payload_bytes,
      m.signature_algorithm,
      m.signing_key_version,
      m.signature,
      m.signed_at,
      'public',
      'public',
      m.valid_until,
      null,
      null,
      null,
      null,
      null
    from admin_security_trust_center_manifests m
    where m.status = 'ready'
      and m.visibility = 'public'
      and not exists (
        select 1 from admin_security_artifact_download_subjects s
        where s.source_type = 'admin_security_trust_center_manifest'
          and s.source_id = m.id
      )

    union all

    select
      'admin_security_private_trust_room_manifest',
      m.id,
      'private_trust_room_manifest',
      m.manifest_key,
      m.title,
      m.summary,
      m.storage_uri,
      m.checksum_sha256,
      m.payload_bytes,
      m.signature_algorithm,
      m.signing_key_version,
      m.signature,
      m.signed_at,
      'private_room_scoped',
      'customer_confidential',
      m.valid_until,
      m.customer_name,
      m.customer_domain,
      m.private_room_id,
      null,
      null
    from admin_security_private_trust_room_manifests m
    where m.status = 'ready'
      and not exists (
        select 1 from admin_security_artifact_download_subjects s
        where s.source_type = 'admin_security_private_trust_room_manifest'
          and s.source_id = m.id
      )

    union all

    select
      'admin_security_private_trust_room_artifact',
      a.id,
      'private_trust_room_artifact',
      a.artifact_key,
      a.title,
      a.summary,
      null,
      a.checksum_sha256,
      null,
      a.signature_algorithm,
      a.signing_key_version,
      a.signature,
      a.signed_at,
      'private_room_scoped',
      a.sensitivity,
      a.expires_at,
      r.customer_name,
      r.customer_domain,
      a.private_room_id,
      null,
      r.enterprise_review_room_id
    from admin_security_private_trust_room_artifacts a
    join admin_security_private_trust_rooms r
      on r.id = a.private_room_id
    where a.status in ('active', 'expired', 'revoked', 'superseded')
      and not exists (
        select 1 from admin_security_artifact_download_subjects s
        where s.source_type = 'admin_security_private_trust_room_artifact'
          and s.source_id = a.id
      )

    limit p_batch_size
  loop
    perform register_admin_security_artifact_download_subject(
      v_row.source_type,
      v_row.source_id,
      v_row.artifact_type,
      v_row.artifact_key,
      v_row.title,
      v_row.summary,
      v_row.storage_uri,
      v_row.checksum_sha256,
      v_row.payload_bytes,
      v_row.signature_algorithm,
      v_row.signing_key_version,
      v_row.signature,
      v_row.signed_at,
      v_row.default_visibility,
      v_row.default_sensitivity,
      true,
      true,
      v_row.default_visibility <> 'public',
      v_row.default_visibility = 'public',
      v_row.expires_at,
      v_row.customer_name,
      v_row.customer_domain,
      v_row.private_room_id,
      v_row.auditor_portal_id,
      v_row.enterprise_review_room_id,
      null,
      '{}'::jsonb,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'download_subject_discovery_run_id',
        v_run_id,
        'worker_id',
        p_worker_id
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function create_admin_security_artifact_download_grant(
  p_admin_auth_user_id uuid,
  p_download_subject_id uuid,
  p_grant_scope text,
  p_granted_to_auth_user_id uuid default null,
  p_granted_to_email text default null,
  p_granted_to_display_name text default null,
  p_granted_to_participant_id uuid default null,
  p_private_room_id uuid default null,
  p_private_room_participant_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_auditor_participant_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_max_downloads integer default 3,
  p_expires_in_minutes integer default 15,
  p_ip_allowlist inet[] default null,
  p_user_agent_hint text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_subject admin_security_artifact_download_subjects%rowtype;
  v_grant_id uuid;
  v_grant_key text;
  v_raw_token text;
  v_token_hash text;
  v_token_prefix text;
  v_watermark text;
begin
  if p_admin_auth_user_id is not null
    and admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true
  then
    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_subject
  from admin_security_artifact_download_subjects
  where id = p_download_subject_id
  for update;

  if v_subject.id is null then
    raise exception 'download subject not found: %', p_download_subject_id;
  end if;

  if v_subject.status <> 'active' then
    raise exception 'download subject is not active: %', v_subject.status;
  end if;

  if v_subject.downloadable is not true then
    raise exception 'download subject is not downloadable';
  end if;

  if v_subject.expires_at is not null and v_subject.expires_at <= now() then
    raise exception 'download subject is expired';
  end if;

  if p_admin_auth_user_id is not null then
    v_admin := get_active_admin_user(p_admin_auth_user_id);
  end if;

  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');
  v_token_prefix := substr(v_raw_token, 1, 12);

  v_grant_key :=
    'download_grant:' ||
    v_subject.source_type || ':' ||
    v_subject.source_id::text || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  v_watermark :=
    'DOWNLOAD_GRANT=' || v_grant_key ||
    ';SUBJECT=' || v_subject.subject_key ||
    ';EMAIL=' || coalesce(p_granted_to_email, 'unknown') ||
    ';ISSUED_AT=' || now()::text;

  insert into admin_security_artifact_download_grants (
    grant_key,
    status,
    download_subject_id,
    source_type,
    source_id,
    artifact_type,
    grant_scope,
    granted_to_auth_user_id,
    granted_to_email,
    granted_to_display_name,
    granted_to_participant_id,
    private_room_id,
    private_room_participant_id,
    auditor_portal_id,
    auditor_participant_id,
    enterprise_review_room_id,
    customer_name,
    customer_domain,
    max_downloads,
    expires_at,
    requires_authentication,
    requires_watermark,
    watermark,
    watermark_payload,
    token_hash_sha256,
    token_prefix,
    ip_allowlist,
    user_agent_hint,
    granted_by_auth_user_id,
    granted_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_grant_key,
    'active',
    v_subject.id,
    v_subject.source_type,
    v_subject.source_id,
    v_subject.artifact_type,
    p_grant_scope,
    p_granted_to_auth_user_id,
    lower(trim(p_granted_to_email)),
    p_granted_to_display_name,
    p_granted_to_participant_id,
    p_private_room_id,
    p_private_room_participant_id,
    p_auditor_portal_id,
    p_auditor_participant_id,
    p_enterprise_review_room_id,
    v_subject.customer_name,
    v_subject.customer_domain,
    coalesce(p_max_downloads, 3),
    now() + make_interval(mins => coalesce(p_expires_in_minutes, 15)),
    v_subject.requires_authenticated_access,
    v_subject.requires_watermark,
    v_watermark,
    jsonb_build_object(
      'grantKey',
      v_grant_key,
      'subjectKey',
      v_subject.subject_key,
      'artifactKey',
      v_subject.artifact_key,
      'recipientEmail',
      p_granted_to_email,
      'issuedAt',
      now()
    ),
    v_token_hash,
    v_token_prefix,
    p_ip_allowlist,
    p_user_agent_hint,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_grant_id;

  return jsonb_build_object(
    'downloadGrantId', v_grant_id,
    'grantKey', v_grant_key,
    'downloadToken', v_raw_token,
    'tokenPrefix', v_token_prefix,
    'expiresAt', now() + make_interval(mins => coalesce(p_expires_in_minutes, 15)),
    'watermark', v_watermark
  );
end;
$$;

create or replace function create_private_room_artifact_download_grant(
  p_auth_user_id uuid,
  p_private_room_key text,
  p_artifact_key text,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_participant admin_security_private_trust_room_participants%rowtype;
  v_room admin_security_private_trust_rooms%rowtype;
  v_artifact admin_security_private_trust_room_artifacts%rowtype;
  v_subject_id uuid;
  v_grant jsonb;
begin
  v_participant := get_active_private_trust_room_participant(
    p_auth_user_id,
    p_private_room_key
  );

  select *
  into v_room
  from admin_security_private_trust_rooms
  where id = v_participant.private_room_id;

  if v_room.allow_downloads is not true then
    raise exception 'private trust room downloads are disabled';
  end if;

  select *
  into v_artifact
  from admin_security_private_trust_room_artifacts
  where private_room_id = v_room.id
    and artifact_key = p_artifact_key
    and visible_to_customer is true
    and downloadable is true;

  if v_artifact.id is null then
    raise exception 'private trust room artifact not found or not downloadable';
  end if;

  if v_artifact.status <> 'active' then
    raise exception 'private trust room artifact is not active: %', v_artifact.status;
  end if;

  v_subject_id := register_admin_security_artifact_download_subject(
    'admin_security_private_trust_room_artifact',
    v_artifact.id,
    'private_trust_room_artifact',
    v_artifact.artifact_key,
    v_artifact.title,
    v_artifact.summary,
    null,
    v_artifact.checksum_sha256,
    null,
    v_artifact.signature_algorithm,
    v_artifact.signing_key_version,
    v_artifact.signature,
    v_artifact.signed_at,
    'private_room_scoped',
    v_artifact.sensitivity,
    true,
    true,
    true,
    false,
    v_artifact.expires_at,
    v_room.customer_name,
    v_room.customer_domain,
    v_room.id,
    null,
    v_room.enterprise_review_room_id,
    p_request_id,
    v_artifact.public_metadata,
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_grant := create_admin_security_artifact_download_grant(
    null,
    v_subject_id,
    'private_room',
    p_auth_user_id,
    v_participant.email,
    v_participant.display_name,
    v_participant.id,
    v_room.id,
    v_participant.id,
    null,
    null,
    v_room.enterprise_review_room_id,
    3,
    15,
    array[p_ip_address],
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  insert into admin_security_private_trust_room_access_events (
    private_room_id,
    participant_id,
    event_type,
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
    v_room.id,
    v_participant.id,
    'artifact_download_requested',
    'admin_security_private_trust_room_artifact',
    v_artifact.id,
    'Private trust room artifact download requested',
    v_artifact.title,
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'artifact_key',
      p_artifact_key
    )
  );

  return v_grant;
end;
$$;

create or replace function resolve_admin_security_artifact_download_grant(
  p_download_token text,
  p_auth_user_id uuid default null,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_token_hash text;
  v_token_prefix text;
  v_grant admin_security_artifact_download_grants%rowtype;
  v_subject admin_security_artifact_download_subjects%rowtype;
  v_attempt_id uuid;
  v_attempt_key text;
  v_failure text;
  v_status text := 'allowed';
  v_signed_url text;
begin
  if p_download_token is null or length(trim(p_download_token)) < 32 then
    raise exception 'download token is required';
  end if;

  v_token_hash := encode(digest(p_download_token, 'sha256'), 'hex');
  v_token_prefix := substr(p_download_token, 1, 12);

  select *
  into v_grant
  from admin_security_artifact_download_grants
  where token_hash_sha256 = v_token_hash
  for update;

  if v_grant.id is null then
    v_status := 'token_invalid';
    v_failure := 'download token invalid';
  else
    select *
    into v_subject
    from admin_security_artifact_download_subjects
    where id = v_grant.download_subject_id;

    if v_grant.status = 'revoked' then
      v_status := 'revoked';
      v_failure := 'download grant revoked';
    elsif v_grant.expires_at <= now() then
      v_status := 'expired';
      v_failure := 'download grant expired';
    elsif v_grant.download_count >= v_grant.max_downloads then
      v_status := 'grant_exhausted';
      v_failure := 'download grant exhausted';
    elsif v_subject.id is null or v_subject.status <> 'active' then
      v_status := 'subject_unavailable';
      v_failure := 'download subject unavailable';
    elsif v_subject.downloadable is not true then
      v_status := 'subject_unavailable';
      v_failure := 'download subject is not downloadable';
    elsif v_subject.expires_at is not null and v_subject.expires_at <= now() then
      v_status := 'expired';
      v_failure := 'download subject expired';
    elsif v_grant.requires_authentication is true
      and v_grant.granted_to_auth_user_id is not null
      and p_auth_user_id is distinct from v_grant.granted_to_auth_user_id
    then
      v_status := 'denied';
      v_failure := 'download grant authentication mismatch';
    elsif v_grant.ip_allowlist is not null
      and p_ip_address is not null
      and not (p_ip_address = any(v_grant.ip_allowlist))
    then
      v_status := 'denied';
      v_failure := 'download grant ip mismatch';
    end if;
  end if;

  v_attempt_key :=
    'download_attempt:' ||
    coalesce(v_token_prefix, 'unknown') || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_artifact_download_attempts (
    attempt_key,
    download_grant_id,
    download_subject_id,
    status,
    failure_reason,
    source_type,
    source_id,
    artifact_key,
    artifact_type,
    requester_auth_user_id,
    requester_email,
    private_room_id,
    private_room_participant_id,
    auditor_portal_id,
    auditor_participant_id,
    ip_address,
    user_agent,
    token_prefix,
    request_id,
    metadata
  )
  values (
    v_attempt_key,
    v_grant.id,
    v_subject.id,
    v_status,
    v_failure,
    v_grant.source_type,
    v_grant.source_id,
    v_subject.artifact_key,
    v_subject.artifact_type,
    p_auth_user_id,
    v_grant.granted_to_email,
    v_grant.private_room_id,
    v_grant.private_room_participant_id,
    v_grant.auditor_portal_id,
    v_grant.auditor_participant_id,
    p_ip_address,
    p_user_agent,
    v_token_prefix,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_attempt_id;

  if v_status <> 'allowed' then
    raise exception '%', v_failure;
  end if;

  v_signed_url :=
    coalesce(v_subject.storage_uri, 'download://artifact/' || v_subject.id::text) ||
    '?grant=' || v_grant.grant_key;

  update admin_security_artifact_download_grants
  set
    signed_url = v_signed_url,
    signed_url_expires_at = least(v_grant.expires_at, now() + interval '10 minutes'),
    updated_at = now()
  where id = v_grant.id;

  return jsonb_build_object(
    'downloadGrantId', v_grant.id,
    'downloadSubjectId', v_subject.id,
    'attemptId', v_attempt_id,
    'grantKey', v_grant.grant_key,
    'subjectKey', v_subject.subject_key,
    'artifactKey', v_subject.artifact_key,
    'artifactType', v_subject.artifact_type,
    'title', v_subject.title,
    'checksumSha256', v_subject.checksum_sha256,
    'payloadBytes', v_subject.payload_bytes,
    'signatureAlgorithm', v_subject.signature_algorithm,
    'signingKeyVersion', v_subject.signing_key_version,
    'signature', v_subject.signature,
    'watermark', v_grant.watermark,
    'signedUrl', v_signed_url,
    'signedUrlExpiresAt', least(v_grant.expires_at, now() + interval '10 minutes')
  );
end;
$$;

create or replace function complete_admin_security_artifact_download(
  p_download_grant_id uuid,
  p_attempt_id uuid,
  p_bytes_served bigint default null,
  p_checksum_sha256 text default null,
  p_signed_url_used text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_grant admin_security_artifact_download_grants%rowtype;
  v_subject admin_security_artifact_download_subjects%rowtype;
  v_completion_id uuid;
  v_completion_key text;
begin
  select *
  into v_grant
  from admin_security_artifact_download_grants
  where id = p_download_grant_id
  for update;

  if v_grant.id is null then
    raise exception 'download grant not found: %', p_download_grant_id;
  end if;

  select *
  into v_subject
  from admin_security_artifact_download_subjects
  where id = v_grant.download_subject_id;

  v_completion_key :=
    'download_completion:' ||
    v_grant.grant_key || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_artifact_download_completions (
    completion_key,
    download_grant_id,
    download_subject_id,
    attempt_id,
    source_type,
    source_id,
    artifact_key,
    artifact_type,
    requester_auth_user_id,
    requester_email,
    bytes_served,
    checksum_sha256,
    storage_uri,
    signed_url_used,
    request_id,
    metadata
  )
  values (
    v_completion_key,
    v_grant.id,
    v_subject.id,
    p_attempt_id,
    v_subject.source_type,
    v_subject.source_id,
    v_subject.artifact_key,
    v_subject.artifact_type,
    v_grant.granted_to_auth_user_id,
    v_grant.granted_to_email,
    p_bytes_served,
    coalesce(p_checksum_sha256, v_subject.checksum_sha256),
    v_subject.storage_uri,
    p_signed_url_used,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_completion_id;

  update admin_security_artifact_download_grants
  set
    download_count = download_count + 1,
    status = case
      when download_count + 1 >= max_downloads then 'used'
      else status
    end,
    updated_at = now()
  where id = v_grant.id;

  return v_completion_id;
end;
$$;

create or replace function revoke_admin_security_artifact_download_grant(
  p_admin_auth_user_id uuid,
  p_download_grant_id uuid,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'download grant revocation reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_artifact_download_grants
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoked_by_admin_user_id = v_admin.id,
    revocation_reason = p_reason,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_download_grant_id
    and status = 'active';

  if not found then
    raise exception 'active download grant not found: %', p_download_grant_id;
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'revoke_admin_security_artifact_download_grant',
    'admin.write',
    'admin_security_artifact_download_grant',
    p_download_grant_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return p_download_grant_id;
end;
$$;

create or replace function expire_admin_security_artifact_download_grants(
  p_batch_size integer default 1000,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  update admin_security_artifact_download_grants
  set
    status = 'expired',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'expired_by_worker',
      p_worker_id,
      'download_grant_expiry_run_id',
      v_run_id
    ),
    updated_at = now()
  where id in (
    select id
    from admin_security_artifact_download_grants
    where status = 'active'
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  update admin_security_artifact_download_subjects
  set
    status = 'expired',
    updated_at = now()
  where status = 'active'
    and expires_at is not null
    and expires_at <= now();

  return v_run_id;
end;
$$;

create or replace view admin_security_artifact_download_subject_dashboard as
select
  s.id as admin_security_artifact_download_subject_id,
  s.subject_key,
  s.status,
  s.source_type,
  s.source_id,
  s.artifact_type,
  s.artifact_key,
  s.title,
  s.summary,
  s.storage_uri,
  s.checksum_sha256,
  s.payload_bytes,
  s.signature_algorithm,
  s.signing_key_version,
  s.signature,
  s.signed_at,
  s.default_visibility,
  s.default_sensitivity,
  s.downloadable,
  s.requires_watermark,
  s.requires_authenticated_access,
  s.allow_public_download,
  s.expires_at,
  s.customer_name,
  s.customer_domain,
  s.private_room_id,
  r.private_room_key,
  s.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  s.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  (
    select count(*)
    from admin_security_artifact_download_grants g
    where g.download_subject_id = s.id
  ) as grant_count,
  (
    select count(*)
    from admin_security_artifact_download_completions c
    where c.download_subject_id = s.id
  ) as completion_count,
  s.created_at,
  s.updated_at,
  s.public_metadata,
  s.internal_metadata
from admin_security_artifact_download_subjects s
left join admin_security_private_trust_rooms r
  on r.id = s.private_room_id
left join admin_security_auditor_portals ap
  on ap.id = s.auditor_portal_id
left join admin_security_enterprise_review_rooms er
  on er.id = s.enterprise_review_room_id
order by s.created_at desc;

create or replace view admin_security_artifact_download_grant_dashboard as
select
  g.id as admin_security_artifact_download_grant_id,
  g.grant_key,
  g.status,
  g.download_subject_id,
  s.subject_key,
  g.source_type,
  g.source_id,
  g.artifact_type,
  s.artifact_key,
  s.title,
  g.grant_scope,
  g.granted_to_auth_user_id,
  g.granted_to_email,
  g.granted_to_display_name,
  g.private_room_id,
  r.private_room_key,
  g.private_room_participant_id,
  p.email as private_room_participant_email,
  g.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  g.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  g.customer_name,
  g.customer_domain,
  g.max_downloads,
  g.download_count,
  g.expires_at,
  g.requires_authentication,
  g.requires_watermark,
  g.watermark,
  g.signed_url_expires_at,
  g.token_prefix,
  g.revoked_at,
  revoker.email as revoked_by_email,
  g.revocation_reason,
  granter.email as granted_by_email,
  g.created_at,
  g.updated_at,
  g.metadata
from admin_security_artifact_download_grants g
join admin_security_artifact_download_subjects s
  on s.id = g.download_subject_id
left join admin_security_private_trust_rooms r
  on r.id = g.private_room_id
left join admin_security_private_trust_room_participants p
  on p.id = g.private_room_participant_id
left join admin_security_auditor_portals ap
  on ap.id = g.auditor_portal_id
left join admin_security_enterprise_review_rooms er
  on er.id = g.enterprise_review_room_id
left join admin_users granter
  on granter.id = g.granted_by_admin_user_id
left join admin_users revoker
  on revoker.id = g.revoked_by_admin_user_id
order by g.created_at desc;

create or replace view admin_security_artifact_download_attempt_dashboard as
select
  a.id as admin_security_artifact_download_attempt_id,
  a.attempt_key,
  a.status,
  a.failure_reason,
  a.download_grant_id,
  g.grant_key,
  a.download_subject_id,
  s.subject_key,
  a.source_type,
  a.source_id,
  a.artifact_key,
  a.artifact_type,
  a.requester_auth_user_id,
  a.requester_email,
  a.private_room_id,
  a.private_room_participant_id,
  a.auditor_portal_id,
  a.auditor_participant_id,
  a.ip_address,
  a.user_agent,
  a.token_prefix,
  a.created_at,
  a.metadata
from admin_security_artifact_download_attempts a
left join admin_security_artifact_download_grants g
  on g.id = a.download_grant_id
left join admin_security_artifact_download_subjects s
  on s.id = a.download_subject_id
order by a.created_at desc;

create or replace view admin_security_artifact_download_integrity as
select
  (
    select count(*)
    from admin_security_artifact_download_subjects
    where status = 'active'
  ) as active_subject_count,
  (
    select count(*)
    from admin_security_artifact_download_grants
    where status = 'active'
  ) as active_grant_count,
  (
    select count(*)
    from admin_security_artifact_download_grants
    where status = 'active'
      and expires_at <= now()
  ) as overdue_expired_grant_count,
  (
    select count(*)
    from admin_security_artifact_download_attempts
    where status <> 'allowed'
      and created_at >= now() - interval '1 hour'
  ) as denied_attempt_count_1h,
  (
    select count(*)
    from admin_security_artifact_download_completions
    where created_at >= now() - interval '24 hours'
  ) as completed_download_count_24h,
  (
    select count(*)
    from admin_security_artifact_download_grants
    where requires_watermark is true
      and (watermark is null or length(trim(watermark)) = 0)
  ) as missing_watermark_grant_count,
  now() as checked_at;

grant select on admin_security_artifact_download_subject_dashboard to admin_api_role;
grant select on admin_security_artifact_download_grant_dashboard to admin_api_role;
grant select on admin_security_artifact_download_attempt_dashboard to admin_api_role;
grant select on admin_security_artifact_download_integrity to admin_api_role;

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
    'admin_security_artifact_download_subject_discovery_hourly',
    'Discover artifact download subjects',
    'admin',
    true,
    '13 * * * *',
    'discover_admin_security_artifact_download_subjects',
    '{"batch_size": 1000}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
  ),
  (
    'admin_security_artifact_download_grant_expiry_every_5m',
    'Expire artifact download grants',
    'admin',
    true,
    '*/5 * * * *',
    'expire_admin_security_artifact_download_grants',
    '{"batch_size": 1000}'::jsonb,
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
  elsif v_job.function_name = 'queue_admin_security_trust_center_manifest_generation' then
    v_uuid_result := queue_admin_security_trust_center_manifest_generation(
      null,
      coalesce(v_job.function_args->>'trust_center_key', 'default'),
      coalesce(v_job.function_args->>'visibility', 'public'),
      null,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('manifest_id', v_uuid_result);
  elsif v_job.function_name = 'discover_admin_security_artifact_download_subjects' then
    v_uuid_result := discover_admin_security_artifact_download_subjects(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_security_artifact_download_grants' then
    v_uuid_result := expire_admin_security_artifact_download_grants(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
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
          when v_started_at is not null
          then (extract(epoch from (now() - v_started_at)) * 1000)::integer
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

alter table admin_security_artifact_download_subjects enable row level security;
alter table admin_security_artifact_download_grants enable row level security;
alter table admin_security_artifact_download_attempts enable row level security;
alter table admin_security_artifact_download_completions enable row level security;

create policy admin_security_artifact_download_subjects_no_user_direct_access
on admin_security_artifact_download_subjects
for all
to authenticated
using (false)
with check (false);

create policy admin_security_artifact_download_grants_no_user_direct_access
on admin_security_artifact_download_grants
for all
to authenticated
using (false)
with check (false);

create policy admin_security_artifact_download_attempts_no_user_direct_access
on admin_security_artifact_download_attempts
for all
to authenticated
using (false)
with check (false);

create policy admin_security_artifact_download_completions_no_user_direct_access
on admin_security_artifact_download_completions
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_admin_security_artifact_download_subjects
on admin_security_artifact_download_subjects
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_artifact_download_grants
on admin_security_artifact_download_grants
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_artifact_download_attempts
on admin_security_artifact_download_attempts
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_artifact_download_completions
on admin_security_artifact_download_completions
for all
to admin_api_role
using (true)
with check (true);

create policy worker_all_admin_security_artifact_download_subjects
on admin_security_artifact_download_subjects
for all
to worker_role
using (true)
with check (true);

create policy worker_all_admin_security_artifact_download_grants
on admin_security_artifact_download_grants
for all
to worker_role
using (true)
with check (true);

grant execute on function register_admin_security_artifact_download_subject(
  text, uuid, text, text, text, text, text, text, bigint,
  text, text, text, timestamptz, text, text, boolean, boolean,
  boolean, boolean, timestamptz, text, text, uuid, uuid, uuid,
  text, jsonb, jsonb
) to admin_api_role, worker_role;

grant execute on function discover_admin_security_artifact_download_subjects(integer, text, jsonb)
to admin_api_role, worker_role;

grant execute on function create_admin_security_artifact_download_grant(
  uuid, uuid, text, uuid, text, text, uuid, uuid, uuid, uuid, uuid, uuid,
  integer, integer, inet[], text, text, jsonb
) to admin_api_role;

grant execute on function create_private_room_artifact_download_grant(
  uuid, text, text, inet, text, text, jsonb
) to admin_api_role;

grant execute on function resolve_admin_security_artifact_download_grant(
  text, uuid, inet, text, text, jsonb
) to admin_api_role;

grant execute on function complete_admin_security_artifact_download(
  uuid, uuid, bigint, text, text, text, jsonb
) to admin_api_role, worker_role;

grant execute on function revoke_admin_security_artifact_download_grant(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function expire_admin_security_artifact_download_grants(integer, text, jsonb)
to admin_api_role, worker_role;

alter function register_admin_security_artifact_download_subject(
  text, uuid, text, text, text, text, text, text, bigint,
  text, text, text, timestamptz, text, text, boolean, boolean,
  boolean, boolean, timestamptz, text, text, uuid, uuid, uuid,
  text, jsonb, jsonb
) security definer;
alter function register_admin_security_artifact_download_subject(
  text, uuid, text, text, text, text, text, text, bigint,
  text, text, text, timestamptz, text, text, boolean, boolean,
  boolean, boolean, timestamptz, text, text, uuid, uuid, uuid,
  text, jsonb, jsonb
) set search_path = public;

alter function discover_admin_security_artifact_download_subjects(integer, text, jsonb) security definer;
alter function discover_admin_security_artifact_download_subjects(integer, text, jsonb) set search_path = public;

alter function create_admin_security_artifact_download_grant(
  uuid, uuid, text, uuid, text, text, uuid, uuid, uuid, uuid, uuid, uuid,
  integer, integer, inet[], text, text, jsonb
) security definer;
alter function create_admin_security_artifact_download_grant(
  uuid, uuid, text, uuid, text, text, uuid, uuid, uuid, uuid, uuid, uuid,
  integer, integer, inet[], text, text, jsonb
) set search_path = public;

alter function create_private_room_artifact_download_grant(
  uuid, text, text, inet, text, text, jsonb
) security definer;
alter function create_private_room_artifact_download_grant(
  uuid, text, text, inet, text, text, jsonb
) set search_path = public;

alter function resolve_admin_security_artifact_download_grant(
  text, uuid, inet, text, text, jsonb
) security definer;
alter function resolve_admin_security_artifact_download_grant(
  text, uuid, inet, text, text, jsonb
) set search_path = public;

alter function complete_admin_security_artifact_download(
  uuid, uuid, bigint, text, text, text, jsonb
) security definer;
alter function complete_admin_security_artifact_download(
  uuid, uuid, bigint, text, text, text, jsonb
) set search_path = public;

alter function revoke_admin_security_artifact_download_grant(uuid, uuid, text, text, jsonb) security definer;
alter function revoke_admin_security_artifact_download_grant(uuid, uuid, text, text, jsonb) set search_path = public;

alter function expire_admin_security_artifact_download_grants(integer, text, jsonb) security definer;
alter function expire_admin_security_artifact_download_grants(integer, text, jsonb) set search_path = public;

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
    'DOWNLOAD_SUBJECT_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Download artifact not found.',
    'Download subject not found.',
    'platform'
  ),
  (
    'DOWNLOAD_GRANT_INVALID',
    'permission',
    'high',
    403,
    false,
    true,
    'Download link is invalid.',
    'Download token invalid.',
    'platform'
  ),
  (
    'DOWNLOAD_GRANT_EXPIRED',
    'permission',
    'medium',
    410,
    false,
    true,
    'Download link has expired.',
    'Download grant expired.',
    'platform'
  ),
  (
    'DOWNLOAD_GRANT_REVOKED',
    'permission',
    'high',
    403,
    false,
    true,
    'Download link has been revoked.',
    'Download grant revoked.',
    'platform'
  ),
  (
    'DOWNLOAD_GRANT_EXHAUSTED',
    'permission',
    'medium',
    429,
    false,
    true,
    'Download limit reached.',
    'Download grant exhausted.',
    'platform'
  ),
  (
    'DOWNLOAD_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Download request requires complete fields.',
    'Download required fields missing.',
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
  ('download subject not found', 'DOWNLOAD_SUBJECT_NOT_FOUND', 5, '{}'),
  ('download subject source id is required', 'DOWNLOAD_REQUIRED_FIELDS', 5, '{}'),
  ('download subject title is required', 'DOWNLOAD_REQUIRED_FIELDS', 5, '{}'),
  ('download subject is not active', 'DOWNLOAD_GRANT_INVALID', 5, '{}'),
  ('download subject is not downloadable', 'DOWNLOAD_GRANT_INVALID', 5, '{}'),
  ('download subject is expired', 'DOWNLOAD_GRANT_EXPIRED', 5, '{}'),
  ('download token is required', 'DOWNLOAD_REQUIRED_FIELDS', 5, '{}'),
  ('download token invalid', 'DOWNLOAD_GRANT_INVALID', 5, '{}'),
  ('download grant revoked', 'DOWNLOAD_GRANT_REVOKED', 5, '{}'),
  ('download grant expired', 'DOWNLOAD_GRANT_EXPIRED', 5, '{}'),
  ('download grant exhausted', 'DOWNLOAD_GRANT_EXHAUSTED', 5, '{}'),
  ('download grant authentication mismatch', 'DOWNLOAD_GRANT_INVALID', 5, '{}'),
  ('download grant ip mismatch', 'DOWNLOAD_GRANT_INVALID', 5, '{}'),
  ('download grant not found', 'DOWNLOAD_GRANT_INVALID', 5, '{}'),
  ('download grant revocation reason is required', 'DOWNLOAD_REQUIRED_FIELDS', 5, '{}'),
  ('private trust room downloads are disabled', 'PRIVATE_TRUST_ROOM_INVALID_STATE', 5, '{}'),
  ('private trust room artifact not found or not downloadable', 'PRIVATE_TRUST_ROOM_NOT_FOUND', 5, '{}')
on conflict do nothing;
