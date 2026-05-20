-- Step 9.64 — Build public trust center API and signed customer-facing manifests.
-- Runs after 178_admin_security_trust_subscriptions_notifications.sql.

create table if not exists admin_security_trust_center_profiles (
  id uuid primary key default gen_random_uuid(),
  trust_center_key text not null unique,
  status text not null default 'draft',
  visibility text not null default 'public',
  organization_name text not null,
  organization_domain text,
  organization_logo_url text,
  title text not null,
  summary text not null,
  public_url text,
  support_email text,
  security_contact_email text,
  show_public_timeline boolean not null default true,
  show_active_disclosures boolean not null default true,
  show_revocations boolean not null default true,
  show_verification_tools boolean not null default true,
  show_expiry_dates boolean not null default true,
  manifest_enabled boolean not null default true,
  manifest_refresh_minutes integer not null default 60,
  published_at timestamptz,
  published_by_auth_user_id uuid,
  published_by_admin_user_id uuid references admin_users(id),
  archived_at timestamptz,
  archived_by_auth_user_id uuid,
  archived_by_admin_user_id uuid references admin_users(id),
  created_by_auth_user_id uuid not null,
  created_by_admin_user_id uuid references admin_users(id),
  request_id text,
  public_metadata jsonb not null default '{}'::jsonb,
  internal_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_trust_center_profiles_status_check
  check (
    status in (
      'draft',
      'published',
      'paused',
      'archived'
    )
  ),
  constraint admin_security_trust_center_profiles_visibility_check
  check (
    visibility in (
      'public',
      'customer_only',
      'admin_only'
    )
  ),
  constraint admin_security_trust_center_profiles_refresh_check
  check (manifest_refresh_minutes between 5 and 1440),
  constraint admin_security_trust_center_profiles_org_check
  check (length(trim(organization_name)) > 0),
  constraint admin_security_trust_center_profiles_title_check
  check (length(trim(title)) > 0),
  constraint admin_security_trust_center_profiles_summary_check
  check (length(trim(summary)) > 0)
);

create index if not exists admin_security_trust_center_profiles_status_idx
on admin_security_trust_center_profiles (status, visibility);

create index if not exists admin_security_trust_center_profiles_domain_idx
on admin_security_trust_center_profiles (organization_domain);

drop trigger if exists admin_security_trust_center_profiles_set_updated_at
on admin_security_trust_center_profiles;

create trigger admin_security_trust_center_profiles_set_updated_at
before update on admin_security_trust_center_profiles
for each row
execute function set_updated_at();

insert into admin_security_trust_center_profiles (
  trust_center_key,
  status,
  visibility,
  organization_name,
  organization_domain,
  title,
  summary,
  support_email,
  security_contact_email,
  created_by_auth_user_id,
  public_metadata,
  internal_metadata
)
values (
  'default',
  'published',
  'public',
  'i',
  null,
  'Security Trust Center',
  'Public security, compliance, disclosure, revocation, and verification information.',
  null,
  null,
  gen_random_uuid(),
  '{}'::jsonb,
  '{"seeded": true}'::jsonb
)
on conflict (trust_center_key)
do nothing;

create table if not exists admin_security_trust_center_manifests (
  id uuid primary key default gen_random_uuid(),
  manifest_key text not null unique,
  status text not null default 'pending',
  trust_center_profile_id uuid not null
    references admin_security_trust_center_profiles(id)
    on delete cascade,
  trust_center_key text not null,
  manifest_type text not null default 'public_trust_center_manifest',
  manifest_version integer not null default 1,
  schema_version text not null default 'trust-center-manifest-v1',
  visibility text not null default 'public',
  title text not null,
  summary text not null,
  organization_name text not null,
  organization_domain text,
  manifest_json jsonb not null default '{}'::jsonb,
  public_timeline_count integer not null default 0,
  active_disclosure_count integer not null default 0,
  active_revocation_count integer not null default 0,
  expiring_artifact_count integer not null default 0,
  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  signed_at timestamptz,
  watermark text,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null default (now() + interval '24 hours'),
  generated_by_worker_id text,
  generated_at timestamptz,
  last_error text,
  request_id text,
  public_metadata jsonb not null default '{}'::jsonb,
  internal_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_trust_center_manifests_status_check
  check (
    status in (
      'pending',
      'generating',
      'ready',
      'failed',
      'expired',
      'revoked',
      'archived'
    )
  ),
  constraint admin_security_trust_center_manifests_type_check
  check (
    manifest_type in (
      'public_trust_center_manifest',
      'customer_trust_center_manifest',
      'auditor_trust_center_manifest',
      'custom'
    )
  ),
  constraint admin_security_trust_center_manifests_visibility_check
  check (
    visibility in (
      'public',
      'customer_only',
      'auditor_only',
      'admin_only'
    )
  ),
  constraint admin_security_trust_center_manifests_title_check
  check (length(trim(title)) > 0),
  constraint admin_security_trust_center_manifests_summary_check
  check (length(trim(summary)) > 0),
  constraint admin_security_trust_center_manifests_validity_check
  check (valid_until > valid_from)
);

create index if not exists admin_security_trust_center_manifests_profile_idx
on admin_security_trust_center_manifests (
  trust_center_profile_id,
  status,
  created_at desc
);

create index if not exists admin_security_trust_center_manifests_ready_idx
on admin_security_trust_center_manifests (
  trust_center_key,
  status,
  valid_until desc
);

drop trigger if exists admin_security_trust_center_manifests_set_updated_at
on admin_security_trust_center_manifests;

create trigger admin_security_trust_center_manifests_set_updated_at
before update on admin_security_trust_center_manifests
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_center_manifest_items (
  id uuid primary key default gen_random_uuid(),
  manifest_id uuid not null
    references admin_security_trust_center_manifests(id)
    on delete cascade,
  item_type text not null,
  source_type text not null,
  source_id uuid,
  item_key text,
  title text not null,
  summary text not null,
  status text,
  verification_status text,
  artifact_key text,
  package_key text,
  revocation_key text,
  event_key text,
  checksum_sha256 text,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  issued_at timestamptz,
  disclosed_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  public_url text,
  sort_time timestamptz,
  sort_order integer not null default 0,
  public_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_trust_center_manifest_items_type_check
  check (
    item_type in (
      'timeline_event',
      'disclosure_package',
      'revocation',
      'compliance_report',
      'questionnaire_response',
      'verification_tool',
      'expiry_warning',
      'contact',
      'other'
    )
  ),
  constraint admin_security_trust_center_manifest_items_title_check
  check (length(trim(title)) > 0),
  constraint admin_security_trust_center_manifest_items_summary_check
  check (length(trim(summary)) > 0)
);

create index if not exists admin_security_trust_center_manifest_items_manifest_idx
on admin_security_trust_center_manifest_items (manifest_id, sort_order, sort_time desc);

create index if not exists admin_security_trust_center_manifest_items_source_idx
on admin_security_trust_center_manifest_items (source_type, source_id);

create table if not exists admin_security_trust_center_signing_keys (
  id uuid primary key default gen_random_uuid(),
  key_version text not null unique,
  status text not null default 'active',
  algorithm text not null default 'HMAC-SHA256',
  description text not null,
  activated_at timestamptz not null default now(),
  retired_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_trust_center_signing_keys_status_check
  check (
    status in (
      'active',
      'retired',
      'revoked'
    )
  ),
  constraint admin_security_trust_center_signing_keys_algorithm_check
  check (
    algorithm in (
      'HMAC-SHA256',
      'ED25519',
      'RSA-PSS-SHA256'
    )
  )
);

create index if not exists admin_security_trust_center_signing_keys_status_idx
on admin_security_trust_center_signing_keys (status, activated_at desc);

drop trigger if exists admin_security_trust_center_signing_keys_set_updated_at
on admin_security_trust_center_signing_keys;

create trigger admin_security_trust_center_signing_keys_set_updated_at
before update on admin_security_trust_center_signing_keys
for each row
execute function set_updated_at();

insert into admin_security_trust_center_signing_keys (
  key_version,
  status,
  algorithm,
  description,
  metadata
)
values (
  'trust-center-signing-v1',
  'active',
  'HMAC-SHA256',
  'MVP trust center manifest signing key metadata. Secret material is stored outside the database.',
  '{"secret_location": "TRUST_CENTER_SIGNING_SECRET"}'::jsonb
)
on conflict (key_version)
do update set
  status = excluded.status,
  algorithm = excluded.algorithm,
  description = excluded.description,
  metadata = admin_security_trust_center_signing_keys.metadata || excluded.metadata,
  updated_at = now();

create table if not exists admin_security_trust_center_manifest_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  manifest_key text,
  checksum_sha256 text,
  signature text,
  verification_status text not null,
  manifest_found boolean not null default false,
  checksum_match boolean not null default false,
  signature_match boolean not null default false,
  manifest_valid_state boolean not null default false,
  profile_valid_state boolean not null default false,
  failure_reason text,
  requester_ip inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_trust_center_manifest_verification_status_check
  check (
    verification_status in (
      'verified',
      'failed',
      'not_found',
      'expired',
      'revoked',
      'invalid_input'
    )
  )
);

create index if not exists admin_security_trust_center_manifest_verification_manifest_idx
on admin_security_trust_center_manifest_verification_attempts (manifest_key, created_at desc);

create index if not exists admin_security_trust_center_manifest_verification_status_idx
on admin_security_trust_center_manifest_verification_attempts (verification_status, created_at desc);

create or replace view admin_security_public_trust_center_profile as
select
  p.id as trust_center_profile_id,
  p.trust_center_key,
  p.status,
  p.visibility,
  p.organization_name,
  p.organization_domain,
  p.organization_logo_url,
  p.title,
  p.summary,
  p.public_url,
  p.support_email,
  p.security_contact_email,
  p.show_public_timeline,
  p.show_active_disclosures,
  p.show_revocations,
  p.show_verification_tools,
  p.show_expiry_dates,
  p.manifest_enabled,
  p.manifest_refresh_minutes,
  p.public_metadata,
  p.published_at,
  p.updated_at
from admin_security_trust_center_profiles p
where p.status = 'published'
  and p.visibility in ('public', 'customer_only');

create or replace view admin_security_public_trust_center_manifest_verification as
select
  m.id as trust_center_manifest_id,
  m.manifest_key,
  m.status,
  m.trust_center_profile_id,
  p.trust_center_key,
  p.status as profile_status,
  p.visibility as profile_visibility,
  m.manifest_type,
  m.manifest_version,
  m.schema_version,
  m.visibility,
  m.title,
  m.summary,
  m.organization_name,
  m.organization_domain,
  m.public_timeline_count,
  m.active_disclosure_count,
  m.active_revocation_count,
  m.expiring_artifact_count,
  m.checksum_sha256,
  m.payload_bytes,
  m.signature_algorithm,
  m.signing_key_version,
  m.signature,
  m.signed_at,
  m.watermark,
  m.valid_from,
  m.valid_until,
  m.generated_at,
  m.created_at
from admin_security_trust_center_manifests m
join admin_security_trust_center_profiles p
  on p.id = m.trust_center_profile_id
where m.status in ('ready', 'expired', 'revoked')
  and m.visibility in ('public', 'customer_only');

grant select on admin_security_public_trust_center_profile to admin_api_role;
grant select on admin_security_public_trust_center_manifest_verification to admin_api_role;

create or replace function queue_admin_security_trust_center_manifest_generation(
  p_admin_auth_user_id uuid,
  p_trust_center_key text default 'default',
  p_visibility text default 'public',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_profile admin_security_trust_center_profiles%rowtype;
  v_manifest_id uuid;
  v_manifest_key text;
begin
  if p_admin_auth_user_id is not null
    and admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true
  then
    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_profile
  from admin_security_trust_center_profiles
  where trust_center_key = coalesce(p_trust_center_key, 'default');

  if v_profile.id is null then
    raise exception 'trust center profile not found: %', p_trust_center_key;
  end if;

  if v_profile.status <> 'published' then
    raise exception 'trust center profile is not published: %', v_profile.status;
  end if;

  if v_profile.manifest_enabled is not true then
    raise exception 'trust center manifest generation is disabled';
  end if;

  if p_admin_auth_user_id is not null then
    v_admin := get_active_admin_user(p_admin_auth_user_id);
  end if;

  v_manifest_key :=
    'trust_center_manifest:' ||
    v_profile.trust_center_key || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_trust_center_manifests (
    manifest_key,
    status,
    trust_center_profile_id,
    trust_center_key,
    manifest_type,
    manifest_version,
    schema_version,
    visibility,
    title,
    summary,
    organization_name,
    organization_domain,
    valid_from,
    valid_until,
    watermark,
    request_id,
    public_metadata,
    internal_metadata
  )
  values (
    v_manifest_key,
    'pending',
    v_profile.id,
    v_profile.trust_center_key,
    case
      when coalesce(p_visibility, 'public') = 'public'
        then 'public_trust_center_manifest'
      else 'customer_trust_center_manifest'
    end,
    1,
    'trust-center-manifest-v1',
    coalesce(p_visibility, 'public'),
    v_profile.title,
    v_profile.summary,
    v_profile.organization_name,
    v_profile.organization_domain,
    now(),
    now() + make_interval(mins => v_profile.manifest_refresh_minutes),
    'TRUST_CENTER=' || v_profile.trust_center_key || ';ISSUED_AT=' || now()::text,
    p_request_id,
    v_profile.public_metadata,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'queued_by_auth_user_id',
      p_admin_auth_user_id,
      'queued_by_admin_user_id',
      v_admin.id
    )
  )
  returning id into v_manifest_id;

  if p_admin_auth_user_id is not null then
    perform record_admin_action(
      p_admin_auth_user_id,
      'queue_admin_security_trust_center_manifest_generation',
      'admin.write',
      'admin_security_trust_center_manifest',
      v_manifest_id,
      p_request_id,
      null,
      null,
      'allowed',
      'trust center manifest generation queued',
      coalesce(p_metadata, '{}'::jsonb)
    );
  end if;

  return v_manifest_id;
end;
$$;

create or replace function claim_admin_security_trust_center_manifests(
  p_batch_size integer default 5,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  manifest_id uuid,
  manifest_key text,
  trust_center_profile_id uuid,
  trust_center_key text,
  visibility text,
  title text,
  summary text,
  organization_name text,
  organization_domain text,
  watermark text
)
language plpgsql
as $$
begin
  if p_batch_size <= 0 or p_batch_size > 25 then
    raise exception 'batch size must be between 1 and 25';
  end if;

  return query
  with candidates as (
    select m.id
    from admin_security_trust_center_manifests m
    join admin_security_trust_center_profiles p
      on p.id = m.trust_center_profile_id
    where m.status in ('pending', 'failed')
      and p.status = 'published'
      and m.valid_until > now()
    order by m.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated as (
    update admin_security_trust_center_manifests m
    set
      status = 'generating',
      generated_by_worker_id = p_worker_id,
      last_error = null,
      internal_metadata = m.internal_metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
    from candidates
    where m.id = candidates.id
    returning m.*
  )
  select
    u.id,
    u.manifest_key,
    u.trust_center_profile_id,
    u.trust_center_key,
    u.visibility,
    u.title,
    u.summary,
    u.organization_name,
    u.organization_domain,
    u.watermark
  from updated u;
end;
$$;

create or replace function complete_admin_security_trust_center_manifest(
  p_manifest_id uuid,
  p_manifest_json jsonb,
  p_storage_uri text,
  p_checksum_sha256 text,
  p_payload_bytes bigint,
  p_signature text,
  p_public_timeline_count integer default 0,
  p_active_disclosure_count integer default 0,
  p_active_revocation_count integer default 0,
  p_expiring_artifact_count integer default 0,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_manifest admin_security_trust_center_manifests%rowtype;
  v_key admin_security_trust_center_signing_keys%rowtype;
begin
  if p_manifest_json is null then
    raise exception 'trust center manifest json is required';
  end if;

  if p_checksum_sha256 is null or length(trim(p_checksum_sha256)) = 0 then
    raise exception 'trust center manifest checksum is required';
  end if;

  if p_signature is null or length(trim(p_signature)) = 0 then
    raise exception 'trust center manifest signature is required';
  end if;

  select *
  into v_manifest
  from admin_security_trust_center_manifests
  where id = p_manifest_id
  for update;

  if v_manifest.id is null then
    raise exception 'trust center manifest not found: %', p_manifest_id;
  end if;

  if v_manifest.status <> 'generating' then
    raise exception 'trust center manifest cannot complete from status: %', v_manifest.status;
  end if;

  select *
  into v_key
  from admin_security_trust_center_signing_keys
  where status = 'active'
  order by activated_at desc
  limit 1;

  if v_key.id is null then
    raise exception 'active trust center signing key not found';
  end if;

  update admin_security_trust_center_manifests
  set
    status = 'ready',
    manifest_json = p_manifest_json,
    storage_uri = p_storage_uri,
    checksum_sha256 = p_checksum_sha256,
    payload_bytes = p_payload_bytes,
    signature_algorithm = v_key.algorithm,
    signing_key_version = v_key.key_version,
    signature = p_signature,
    signed_at = now(),
    public_timeline_count = coalesce(p_public_timeline_count, 0),
    active_disclosure_count = coalesce(p_active_disclosure_count, 0),
    active_revocation_count = coalesce(p_active_revocation_count, 0),
    expiring_artifact_count = coalesce(p_expiring_artifact_count, 0),
    generated_by_worker_id = p_worker_id,
    generated_at = now(),
    internal_metadata = internal_metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_manifest.id;

  return v_manifest.id;
end;
$$;

create or replace function fail_admin_security_trust_center_manifest(
  p_manifest_id uuid,
  p_error text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_manifest admin_security_trust_center_manifests%rowtype;
begin
  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'trust center manifest error is required';
  end if;

  select *
  into v_manifest
  from admin_security_trust_center_manifests
  where id = p_manifest_id
  for update;

  if v_manifest.id is null then
    raise exception 'trust center manifest not found: %', p_manifest_id;
  end if;

  update admin_security_trust_center_manifests
  set
    status = 'failed',
    last_error = p_error,
    generated_by_worker_id = p_worker_id,
    internal_metadata = internal_metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'failed_at',
      now()
    ),
    updated_at = now()
  where id = v_manifest.id;

  return v_manifest.id;
end;
$$;

create or replace function get_public_trust_center(
  p_trust_center_key text default 'default',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_profile admin_security_public_trust_center_profile%rowtype;
  v_latest_manifest admin_security_trust_center_manifests%rowtype;
begin
  select *
  into v_profile
  from admin_security_public_trust_center_profile
  where trust_center_key = coalesce(p_trust_center_key, 'default')
    and visibility = 'public';

  if v_profile.trust_center_profile_id is null then
    raise exception 'public trust center not found: %', p_trust_center_key;
  end if;

  select *
  into v_latest_manifest
  from admin_security_trust_center_manifests
  where trust_center_profile_id = v_profile.trust_center_profile_id
    and status = 'ready'
    and visibility = 'public'
    and valid_until > now()
  order by generated_at desc nulls last, created_at desc
  limit 1;

  return jsonb_build_object(
    'trustCenter', jsonb_build_object(
      'trustCenterKey', v_profile.trust_center_key,
      'organizationName', v_profile.organization_name,
      'organizationDomain', v_profile.organization_domain,
      'organizationLogoUrl', v_profile.organization_logo_url,
      'title', v_profile.title,
      'summary', v_profile.summary,
      'publicUrl', v_profile.public_url,
      'supportEmail', v_profile.support_email,
      'securityContactEmail', v_profile.security_contact_email,
      'showPublicTimeline', v_profile.show_public_timeline,
      'showActiveDisclosures', v_profile.show_active_disclosures,
      'showRevocations', v_profile.show_revocations,
      'showVerificationTools', v_profile.show_verification_tools,
      'showExpiryDates', v_profile.show_expiry_dates,
      'publishedAt', v_profile.published_at,
      'updatedAt', v_profile.updated_at,
      'publicMetadata', v_profile.public_metadata
    ),
    'latestManifest', case
      when v_latest_manifest.id is not null then jsonb_build_object(
        'manifestKey', v_latest_manifest.manifest_key,
        'schemaVersion', v_latest_manifest.schema_version,
        'checksumSha256', v_latest_manifest.checksum_sha256,
        'payloadBytes', v_latest_manifest.payload_bytes,
        'signatureAlgorithm', v_latest_manifest.signature_algorithm,
        'signingKeyVersion', v_latest_manifest.signing_key_version,
        'signature', v_latest_manifest.signature,
        'signedAt', v_latest_manifest.signed_at,
        'validFrom', v_latest_manifest.valid_from,
        'validUntil', v_latest_manifest.valid_until,
        'publicTimelineCount', v_latest_manifest.public_timeline_count,
        'activeDisclosureCount', v_latest_manifest.active_disclosure_count,
        'activeRevocationCount', v_latest_manifest.active_revocation_count,
        'expiringArtifactCount', v_latest_manifest.expiring_artifact_count
      )
      else null
    end
  );
end;
$$;

create or replace function list_public_trust_center_active_disclosures(
  p_limit integer default 100,
  p_trust_center_key text default 'default',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_items jsonb;
begin
  if p_limit <= 0 or p_limit > 250 then
    raise exception 'public trust center disclosure limit must be between 1 and 250';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'packageKey', p.package_key,
        'title', p.title,
        'summary', p.summary,
        'sourceType', p.source_type,
        'sourceId', p.source_id,
        'artifactKey', p.artifact_key,
        'artifactFormat', p.artifact_format,
        'checksumSha256', p.checksum_sha256,
        'signatureAlgorithm', p.signature_algorithm,
        'signingKeyVersion', p.signing_key_version,
        'signature', p.signature,
        'watermark', p.watermark,
        'disclosedAt', p.disclosed_at,
        'expiresAt', p.expires_at,
        'revocationStatusAtDisclosure', p.revocation_status_at_disclosure,
        'publicMetadata', p.public_metadata
      )
      order by p.disclosed_at desc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select *
    from admin_security_disclosure_packages
    where status = 'active'
      and publication_target_type = 'trust_center'
      and (
        expires_at is null
        or expires_at > now()
      )
    order by disclosed_at desc
    limit p_limit
  ) p;

  return jsonb_build_object(
    'items', v_items,
    'limit', p_limit
  );
end;
$$;

create or replace function list_public_trust_center_revocations(
  p_limit integer default 100,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_items jsonb;
begin
  if p_limit <= 0 or p_limit > 250 then
    raise exception 'public trust center revocation limit must be between 1 and 250';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'revocationKey', r.revocation_key,
        'sourceType', r.source_type,
        'sourceId', r.source_id,
        'revocationType', r.revocation_type,
        'severity', r.severity,
        'reasonCode', r.reason_code,
        'publicReason', coalesce(r.public_reason, r.reason),
        'effectiveAt', r.effective_at,
        'createdAt', r.created_at
      )
      order by r.effective_at desc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select *
    from admin_security_revocation_records
    where status = 'active'
      and public_reason is not null
    order by effective_at desc
    limit p_limit
  ) r;

  return jsonb_build_object(
    'items', v_items,
    'limit', p_limit
  );
end;
$$;

create or replace function get_latest_public_trust_center_manifest(
  p_trust_center_key text default 'default',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_manifest admin_security_trust_center_manifests%rowtype;
begin
  select *
  into v_manifest
  from admin_security_trust_center_manifests
  where trust_center_key = coalesce(p_trust_center_key, 'default')
    and status = 'ready'
    and visibility = 'public'
    and valid_until > now()
  order by generated_at desc nulls last, created_at desc
  limit 1;

  if v_manifest.id is null then
    raise exception 'ready public trust center manifest not found: %', p_trust_center_key;
  end if;

  return jsonb_build_object(
    'manifestKey', v_manifest.manifest_key,
    'manifest', v_manifest.manifest_json,
    'checksumSha256', v_manifest.checksum_sha256,
    'payloadBytes', v_manifest.payload_bytes,
    'signatureAlgorithm', v_manifest.signature_algorithm,
    'signingKeyVersion', v_manifest.signing_key_version,
    'signature', v_manifest.signature,
    'signedAt', v_manifest.signed_at,
    'validFrom', v_manifest.valid_from,
    'validUntil', v_manifest.valid_until
  );
end;
$$;

create or replace function verify_public_trust_center_manifest(
  p_manifest_key text,
  p_checksum_sha256 text,
  p_signature text,
  p_signature_match boolean default false,
  p_requester_ip inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_manifest admin_security_public_trust_center_manifest_verification%rowtype;
  v_manifest_found boolean := false;
  v_checksum_match boolean := false;
  v_signature_match boolean := false;
  v_manifest_valid_state boolean := false;
  v_profile_valid_state boolean := false;
  v_status text := 'failed';
  v_failure_reason text;
begin
  if p_manifest_key is null or length(trim(p_manifest_key)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'trust center manifest key is required';
  elsif p_checksum_sha256 is null or length(trim(p_checksum_sha256)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'trust center manifest checksum is required';
  elsif p_signature is null or length(trim(p_signature)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'trust center manifest signature is required';
  else
    select *
    into v_manifest
    from admin_security_public_trust_center_manifest_verification
    where manifest_key = p_manifest_key;

    if v_manifest.manifest_key is null then
      v_status := 'not_found';
      v_failure_reason := 'trust center manifest not found';
    else
      v_manifest_found := true;
      v_checksum_match := v_manifest.checksum_sha256 = p_checksum_sha256;
      v_signature_match := coalesce(p_signature_match, false)
        and v_manifest.signature = p_signature;
      v_manifest_valid_state :=
        v_manifest.status = 'ready'
        and v_manifest.signed_at is not null
        and v_manifest.valid_from <= now()
        and v_manifest.valid_until > now();
      v_profile_valid_state :=
        v_manifest.profile_status = 'published'
        and v_manifest.profile_visibility in ('public', 'customer_only');

      if v_manifest.status = 'revoked' then
        v_status := 'revoked';
        v_failure_reason := 'trust center manifest revoked';
      elsif v_manifest.status = 'expired'
        or v_manifest.valid_until <= now()
      then
        v_status := 'expired';
        v_failure_reason := 'trust center manifest expired';
      elsif v_checksum_match
        and v_signature_match
        and v_manifest_valid_state
        and v_profile_valid_state
      then
        v_status := 'verified';
        v_failure_reason := null;
      else
        v_status := 'failed';
        v_failure_reason :=
          case
            when v_checksum_match is not true then 'checksum mismatch'
            when v_signature_match is not true then 'signature mismatch'
            when v_manifest_valid_state is not true then 'manifest invalid state'
            when v_profile_valid_state is not true then 'profile invalid state'
            else 'verification failed'
          end;
      end if;
    end if;
  end if;

  insert into admin_security_trust_center_manifest_verification_attempts (
    manifest_key,
    checksum_sha256,
    signature,
    verification_status,
    manifest_found,
    checksum_match,
    signature_match,
    manifest_valid_state,
    profile_valid_state,
    failure_reason,
    requester_ip,
    user_agent,
    request_id,
    metadata
  )
  values (
    p_manifest_key,
    p_checksum_sha256,
    p_signature,
    v_status,
    v_manifest_found,
    v_checksum_match,
    v_signature_match,
    v_manifest_valid_state,
    v_profile_valid_state,
    v_failure_reason,
    p_requester_ip,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'verificationStatus', v_status,
    'verified', v_status = 'verified',
    'failureReason', v_failure_reason,
    'manifest', case
      when v_manifest_found then jsonb_build_object(
        'manifestKey', v_manifest.manifest_key,
        'trustCenterKey', v_manifest.trust_center_key,
        'manifestType', v_manifest.manifest_type,
        'schemaVersion', v_manifest.schema_version,
        'title', v_manifest.title,
        'summary', v_manifest.summary,
        'organizationName', v_manifest.organization_name,
        'organizationDomain', v_manifest.organization_domain,
        'publicTimelineCount', v_manifest.public_timeline_count,
        'activeDisclosureCount', v_manifest.active_disclosure_count,
        'activeRevocationCount', v_manifest.active_revocation_count,
        'expiringArtifactCount', v_manifest.expiring_artifact_count,
        'checksumSha256', v_manifest.checksum_sha256,
        'payloadBytes', v_manifest.payload_bytes,
        'signatureAlgorithm', v_manifest.signature_algorithm,
        'signingKeyVersion', v_manifest.signing_key_version,
        'signature', v_manifest.signature,
        'signedAt', v_manifest.signed_at,
        'watermark', v_manifest.watermark,
        'validFrom', v_manifest.valid_from,
        'validUntil', v_manifest.valid_until,
        'generatedAt', v_manifest.generated_at
      )
      else null
    end,
    'checks', jsonb_build_object(
      'manifestFound', v_manifest_found,
      'checksumMatch', v_checksum_match,
      'signatureMatch', v_signature_match,
      'manifestValidState', v_manifest_valid_state,
      'profileValidState', v_profile_valid_state
    )
  );
end;
$$;

create or replace view admin_security_trust_center_profile_dashboard as
select
  p.id as admin_security_trust_center_profile_id,
  p.trust_center_key,
  p.status,
  p.visibility,
  p.organization_name,
  p.organization_domain,
  p.organization_logo_url,
  p.title,
  p.summary,
  p.public_url,
  p.support_email,
  p.security_contact_email,
  p.show_public_timeline,
  p.show_active_disclosures,
  p.show_revocations,
  p.show_verification_tools,
  p.show_expiry_dates,
  p.manifest_enabled,
  p.manifest_refresh_minutes,
  p.published_at,
  publisher.email as published_by_email,
  p.archived_at,
  archiver.email as archived_by_email,
  creator.email as created_by_email,
  (
    select count(*)
    from admin_security_trust_center_manifests m
    where m.trust_center_profile_id = p.id
  ) as manifest_count,
  (
    select count(*)
    from admin_security_trust_center_manifests m
    where m.trust_center_profile_id = p.id
      and m.status = 'ready'
      and m.valid_until > now()
  ) as valid_manifest_count,
  p.created_at,
  p.updated_at,
  p.public_metadata,
  p.internal_metadata
from admin_security_trust_center_profiles p
left join admin_users publisher
  on publisher.id = p.published_by_admin_user_id
left join admin_users archiver
  on archiver.id = p.archived_by_admin_user_id
left join admin_users creator
  on creator.id = p.created_by_admin_user_id
order by p.created_at desc;

create or replace view admin_security_trust_center_manifest_dashboard as
select
  m.id as admin_security_trust_center_manifest_id,
  m.manifest_key,
  m.status,
  m.trust_center_profile_id,
  p.trust_center_key,
  m.manifest_type,
  m.manifest_version,
  m.schema_version,
  m.visibility,
  m.title,
  m.summary,
  m.organization_name,
  m.organization_domain,
  m.public_timeline_count,
  m.active_disclosure_count,
  m.active_revocation_count,
  m.expiring_artifact_count,
  m.storage_uri,
  m.checksum_sha256,
  m.payload_bytes,
  m.signature_algorithm,
  m.signing_key_version,
  m.signature,
  m.signed_at,
  m.watermark,
  m.valid_from,
  m.valid_until,
  m.generated_by_worker_id,
  m.generated_at,
  m.last_error,
  m.created_at,
  m.updated_at,
  m.public_metadata,
  m.internal_metadata
from admin_security_trust_center_manifests m
join admin_security_trust_center_profiles p
  on p.id = m.trust_center_profile_id
order by m.created_at desc;

create or replace view admin_security_trust_center_integrity as
select
  (
    select count(*)
    from admin_security_trust_center_profiles
    where status = 'published'
  ) as published_profile_count,
  (
    select count(*)
    from admin_security_trust_center_manifests
    where status = 'pending'
  ) as pending_manifest_count,
  (
    select count(*)
    from admin_security_trust_center_manifests
    where status = 'failed'
  ) as failed_manifest_count,
  (
    select count(*)
    from admin_security_trust_center_manifests
    where status = 'ready'
      and signature is null
  ) as ready_unsigned_manifest_count,
  (
    select count(*)
    from admin_security_trust_center_manifests
    where status = 'ready'
      and valid_until <= now()
  ) as expired_ready_manifest_count,
  (
    select count(*)
    from admin_security_trust_center_manifest_verification_attempts
    where created_at >= now() - interval '24 hours'
  ) as verification_attempt_count_24h,
  (
    select count(*)
    from admin_security_trust_center_manifest_verification_attempts
    where verification_status = 'verified'
      and created_at >= now() - interval '24 hours'
  ) as verified_manifest_count_24h,
  (
    select count(*)
    from admin_security_trust_center_manifest_verification_attempts
    where verification_status in ('failed', 'not_found', 'invalid_input')
      and created_at >= now() - interval '1 hour'
  ) as suspicious_verification_count_1h,
  now() as checked_at;

grant select on admin_security_trust_center_profile_dashboard to admin_api_role;
grant select on admin_security_trust_center_manifest_dashboard to admin_api_role;
grant select on admin_security_trust_center_integrity to admin_api_role;

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
    'admin_security_trust_center_manifest_refresh_hourly',
    'Refresh public trust center manifest',
    'admin',
    true,
    '7 * * * *',
    'queue_admin_security_trust_center_manifest_generation',
    '{"trust_center_key": "default", "visibility": "public"}'::jsonb,
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

alter table admin_security_trust_center_profiles enable row level security;
alter table admin_security_trust_center_manifests enable row level security;
alter table admin_security_trust_center_manifest_items enable row level security;
alter table admin_security_trust_center_signing_keys enable row level security;
alter table admin_security_trust_center_manifest_verification_attempts enable row level security;

drop policy if exists admin_security_trust_center_profiles_no_user_direct_access
on admin_security_trust_center_profiles;
create policy admin_security_trust_center_profiles_no_user_direct_access
on admin_security_trust_center_profiles
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_trust_center_manifests_no_user_direct_access
on admin_security_trust_center_manifests;
create policy admin_security_trust_center_manifests_no_user_direct_access
on admin_security_trust_center_manifests
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_trust_center_manifest_items_no_user_direct_access
on admin_security_trust_center_manifest_items;
create policy admin_security_trust_center_manifest_items_no_user_direct_access
on admin_security_trust_center_manifest_items
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_trust_center_signing_keys_no_user_direct_access
on admin_security_trust_center_signing_keys;
create policy admin_security_trust_center_signing_keys_no_user_direct_access
on admin_security_trust_center_signing_keys
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_trust_center_manifest_verification_no_user_direct_access
on admin_security_trust_center_manifest_verification_attempts;
create policy admin_security_trust_center_manifest_verification_no_user_direct_access
on admin_security_trust_center_manifest_verification_attempts
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_trust_center_profiles
on admin_security_trust_center_profiles;
create policy admin_api_all_admin_security_trust_center_profiles
on admin_security_trust_center_profiles
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_trust_center_manifests
on admin_security_trust_center_manifests;
create policy admin_api_all_admin_security_trust_center_manifests
on admin_security_trust_center_manifests
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_trust_center_manifest_items
on admin_security_trust_center_manifest_items;
create policy admin_api_all_admin_security_trust_center_manifest_items
on admin_security_trust_center_manifest_items
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_read_admin_security_trust_center_signing_keys
on admin_security_trust_center_signing_keys;
create policy admin_api_read_admin_security_trust_center_signing_keys
on admin_security_trust_center_signing_keys
for select
to admin_api_role
using (true);

drop policy if exists admin_api_all_admin_security_trust_center_manifest_verification
on admin_security_trust_center_manifest_verification_attempts;
create policy admin_api_all_admin_security_trust_center_manifest_verification
on admin_security_trust_center_manifest_verification_attempts
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_trust_center_manifests
on admin_security_trust_center_manifests;
create policy worker_all_admin_security_trust_center_manifests
on admin_security_trust_center_manifests
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_trust_center_manifest_items
on admin_security_trust_center_manifest_items;
create policy worker_all_admin_security_trust_center_manifest_items
on admin_security_trust_center_manifest_items
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_read_admin_security_trust_center_profiles
on admin_security_trust_center_profiles;
create policy worker_read_admin_security_trust_center_profiles
on admin_security_trust_center_profiles
for select
to worker_role
using (true);

drop policy if exists worker_read_admin_security_trust_center_signing_keys
on admin_security_trust_center_signing_keys;
create policy worker_read_admin_security_trust_center_signing_keys
on admin_security_trust_center_signing_keys
for select
to worker_role
using (true);

grant execute on function queue_admin_security_trust_center_manifest_generation(
  uuid,
  text,
  text,
  text,
  jsonb
) to admin_api_role, worker_role;

grant execute on function claim_admin_security_trust_center_manifests(integer, text, jsonb)
to worker_role;

grant execute on function complete_admin_security_trust_center_manifest(
  uuid,
  jsonb,
  text,
  text,
  bigint,
  text,
  integer,
  integer,
  integer,
  integer,
  text,
  jsonb
) to worker_role;

grant execute on function fail_admin_security_trust_center_manifest(uuid, text, text, jsonb)
to worker_role;

grant execute on function get_public_trust_center(text, text, jsonb)
to admin_api_role;

grant execute on function list_public_trust_center_active_disclosures(integer, text, text, jsonb)
to admin_api_role;

grant execute on function list_public_trust_center_revocations(integer, text, jsonb)
to admin_api_role;

grant execute on function get_latest_public_trust_center_manifest(text, text, jsonb)
to admin_api_role;

grant execute on function verify_public_trust_center_manifest(
  text,
  text,
  text,
  boolean,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

alter function queue_admin_security_trust_center_manifest_generation(
  uuid,
  text,
  text,
  text,
  jsonb
) security definer;
alter function queue_admin_security_trust_center_manifest_generation(
  uuid,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function claim_admin_security_trust_center_manifests(integer, text, jsonb) security definer;
alter function claim_admin_security_trust_center_manifests(integer, text, jsonb) set search_path = public;

alter function complete_admin_security_trust_center_manifest(
  uuid,
  jsonb,
  text,
  text,
  bigint,
  text,
  integer,
  integer,
  integer,
  integer,
  text,
  jsonb
) security definer;
alter function complete_admin_security_trust_center_manifest(
  uuid,
  jsonb,
  text,
  text,
  bigint,
  text,
  integer,
  integer,
  integer,
  integer,
  text,
  jsonb
) set search_path = public;

alter function fail_admin_security_trust_center_manifest(uuid, text, text, jsonb) security definer;
alter function fail_admin_security_trust_center_manifest(uuid, text, text, jsonb) set search_path = public;

alter function get_public_trust_center(text, text, jsonb) security definer;
alter function get_public_trust_center(text, text, jsonb) set search_path = public;

alter function list_public_trust_center_active_disclosures(integer, text, text, jsonb) security definer;
alter function list_public_trust_center_active_disclosures(integer, text, text, jsonb) set search_path = public;

alter function list_public_trust_center_revocations(integer, text, jsonb) security definer;
alter function list_public_trust_center_revocations(integer, text, jsonb) set search_path = public;

alter function get_latest_public_trust_center_manifest(text, text, jsonb) security definer;
alter function get_latest_public_trust_center_manifest(text, text, jsonb) set search_path = public;

alter function verify_public_trust_center_manifest(
  text,
  text,
  text,
  boolean,
  inet,
  text,
  text,
  jsonb
) security definer;
alter function verify_public_trust_center_manifest(
  text,
  text,
  text,
  boolean,
  inet,
  text,
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
    'TRUST_CENTER_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Trust center not found.',
    'Trust center profile not found.',
    'platform'
  ),
  (
    'TRUST_CENTER_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Trust center cannot be used from its current state.',
    'Trust center invalid state.',
    'platform'
  ),
  (
    'TRUST_CENTER_MANIFEST_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Trust center manifest not found.',
    'Trust center manifest not found.',
    'platform'
  ),
  (
    'TRUST_CENTER_MANIFEST_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Trust center manifest request requires complete fields.',
    'Trust center manifest required fields missing.',
    'platform'
  ),
  (
    'TRUST_CENTER_MANIFEST_VERIFICATION_FAILED',
    'validation',
    'medium',
    200,
    false,
    true,
    'Trust center manifest verification failed.',
    'Trust center manifest verification failed.',
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
  ('trust center profile not found', 'TRUST_CENTER_NOT_FOUND', 5, '{}'),
  ('public trust center not found', 'TRUST_CENTER_NOT_FOUND', 5, '{}'),
  ('trust center profile is not published', 'TRUST_CENTER_INVALID_STATE', 5, '{}'),
  ('trust center manifest generation is disabled', 'TRUST_CENTER_INVALID_STATE', 5, '{}'),
  ('trust center manifest not found', 'TRUST_CENTER_MANIFEST_NOT_FOUND', 5, '{}'),
  ('ready public trust center manifest not found', 'TRUST_CENTER_MANIFEST_NOT_FOUND', 5, '{}'),
  ('trust center manifest cannot complete from status', 'TRUST_CENTER_INVALID_STATE', 5, '{}'),
  ('trust center manifest json is required', 'TRUST_CENTER_MANIFEST_REQUIRED_FIELDS', 5, '{}'),
  ('trust center manifest checksum is required', 'TRUST_CENTER_MANIFEST_REQUIRED_FIELDS', 5, '{}'),
  ('trust center manifest signature is required', 'TRUST_CENTER_MANIFEST_REQUIRED_FIELDS', 5, '{}'),
  ('trust center manifest key is required', 'TRUST_CENTER_MANIFEST_REQUIRED_FIELDS', 5, '{}'),
  ('active trust center signing key not found', 'TRUST_CENTER_INVALID_STATE', 5, '{}'),
  ('public trust center disclosure limit must be between 1 and 250', 'TRUST_CENTER_MANIFEST_REQUIRED_FIELDS', 5, '{}'),
  ('public trust center revocation limit must be between 1 and 250', 'TRUST_CENTER_MANIFEST_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
