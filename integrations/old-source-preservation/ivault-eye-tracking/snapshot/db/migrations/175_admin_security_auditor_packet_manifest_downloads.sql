-- Step 9.60 — Build evidence packet manifest signing and download pipeline.
-- Runs after 174_admin_security_external_auditor_portal.sql.

create table if not exists admin_security_auditor_packet_manifests (
  id uuid primary key default gen_random_uuid(),

  manifest_key text not null unique,

  status text not null default 'pending',

  auditor_portal_id uuid not null
    references admin_security_auditor_portals(id)
    on delete cascade,

  evidence_packet_id uuid not null
    references admin_security_auditor_evidence_packets(id)
    on delete cascade,

  participant_id uuid
    references admin_security_auditor_portal_participants(id)
    on delete set null,

  manifest_type text not null default 'participant_packet_manifest',

  export_format text not null default 'json',

  title text not null,
  summary text not null,

  packet_key text not null,
  portal_key text not null,

  auditor_name text,
  auditor_email text,
  auditor_firm text,

  customer_name text,
  customer_domain text,

  item_count integer not null default 0,

  manifest_json jsonb not null default '{}'::jsonb,

  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,

  signature_algorithm text,
  signing_key_version text,
  signature text,
  signed_at timestamptz,

  watermark text,

  expires_at timestamptz not null default (now() + interval '14 days'),

  download_count integer not null default 0,
  last_downloaded_at timestamptz,

  requested_by_auth_user_id uuid,
  requested_by_participant_id uuid
    references admin_security_auditor_portal_participants(id)
    on delete set null,

  generated_by_worker_id text,
  generated_at timestamptz,

  last_error text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_auditor_packet_manifests_status_check
  check (
    status in (
      'pending',
      'generating',
      'ready',
      'failed',
      'expired',
      'revoked'
    )
  ),

  constraint admin_security_auditor_packet_manifests_type_check
  check (
    manifest_type in (
      'packet_manifest',
      'participant_packet_manifest',
      'portal_manifest',
      'custom'
    )
  ),

  constraint admin_security_auditor_packet_manifests_format_check
  check (
    export_format in (
      'json',
      'markdown',
      'pdf',
      'zip'
    )
  ),

  constraint admin_security_auditor_packet_manifests_title_check
  check (length(trim(title)) > 0),

  constraint admin_security_auditor_packet_manifests_summary_check
  check (length(trim(summary)) > 0)
);

create index if not exists admin_security_auditor_packet_manifests_packet_idx
on admin_security_auditor_packet_manifests (evidence_packet_id, created_at desc);

create index if not exists admin_security_auditor_packet_manifests_participant_idx
on admin_security_auditor_packet_manifests (participant_id, created_at desc);

create index if not exists admin_security_auditor_packet_manifests_status_idx
on admin_security_auditor_packet_manifests (status, created_at asc);

drop trigger if exists admin_security_auditor_packet_manifests_set_updated_at
on admin_security_auditor_packet_manifests;

create trigger admin_security_auditor_packet_manifests_set_updated_at
before update on admin_security_auditor_packet_manifests
for each row
execute function set_updated_at();

create table if not exists admin_security_auditor_packet_manifest_items (
  id uuid primary key default gen_random_uuid(),

  manifest_id uuid not null
    references admin_security_auditor_packet_manifests(id)
    on delete cascade,

  evidence_packet_item_id uuid
    references admin_security_auditor_evidence_packet_items(id)
    on delete set null,

  item_type text not null,

  source_type text not null,
  source_id uuid,

  item_key text,
  display_title text not null,
  display_summary text not null,

  checksum_sha256 text,
  signature text,
  signed_at timestamptz,

  downloadable boolean not null default false,

  watermark text,

  sort_order integer not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_auditor_packet_manifest_items_title_check
  check (length(trim(display_title)) > 0),

  constraint admin_security_auditor_packet_manifest_items_summary_check
  check (length(trim(display_summary)) > 0)
);

create index if not exists admin_security_auditor_packet_manifest_items_manifest_idx
on admin_security_auditor_packet_manifest_items (manifest_id, sort_order);

create index if not exists admin_security_auditor_packet_manifest_items_source_idx
on admin_security_auditor_packet_manifest_items (source_type, source_id);

create table if not exists admin_security_auditor_packet_download_requests (
  id uuid primary key default gen_random_uuid(),

  download_key text not null unique,

  status text not null default 'pending',

  auditor_portal_id uuid not null
    references admin_security_auditor_portals(id)
    on delete cascade,

  evidence_packet_id uuid not null
    references admin_security_auditor_evidence_packets(id)
    on delete cascade,

  manifest_id uuid
    references admin_security_auditor_packet_manifests(id)
    on delete set null,

  participant_id uuid not null
    references admin_security_auditor_portal_participants(id)
    on delete cascade,

  auth_user_id uuid not null,

  download_type text not null default 'manifest',

  requested_format text not null default 'json',

  status_reason text,

  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,

  signature_algorithm text,
  signing_key_version text,
  signature text,

  watermark text,

  expires_at timestamptz not null default (now() + interval '1 hour'),

  downloaded_at timestamptz,
  download_count integer not null default 0,

  ip_address inet,
  user_agent text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_auditor_packet_download_requests_status_check
  check (
    status in (
      'pending',
      'ready',
      'denied',
      'expired',
      'revoked',
      'failed'
    )
  ),

  constraint admin_security_auditor_packet_download_requests_type_check
  check (
    download_type in (
      'manifest',
      'packet_export',
      'single_item',
      'zip_bundle'
    )
  ),

  constraint admin_security_auditor_packet_download_requests_format_check
  check (
    requested_format in (
      'json',
      'markdown',
      'pdf',
      'zip'
    )
  )
);

create index if not exists admin_security_auditor_packet_download_requests_participant_idx
on admin_security_auditor_packet_download_requests (participant_id, created_at desc);

create index if not exists admin_security_auditor_packet_download_requests_packet_idx
on admin_security_auditor_packet_download_requests (evidence_packet_id, created_at desc);

create index if not exists admin_security_auditor_packet_download_requests_status_idx
on admin_security_auditor_packet_download_requests (status, expires_at);

drop trigger if exists admin_security_auditor_packet_download_requests_set_updated_at
on admin_security_auditor_packet_download_requests;

create trigger admin_security_auditor_packet_download_requests_set_updated_at
before update on admin_security_auditor_packet_download_requests
for each row
execute function set_updated_at();

create table if not exists admin_security_auditor_packet_signing_keys (
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

  constraint admin_security_auditor_packet_signing_keys_status_check
  check (
    status in (
      'active',
      'retired',
      'revoked'
    )
  ),

  constraint admin_security_auditor_packet_signing_keys_algorithm_check
  check (
    algorithm in (
      'HMAC-SHA256',
      'ED25519',
      'RSA-PSS-SHA256'
    )
  )
);

create index if not exists admin_security_auditor_packet_signing_keys_status_idx
on admin_security_auditor_packet_signing_keys (status, activated_at desc);

drop trigger if exists admin_security_auditor_packet_signing_keys_set_updated_at
on admin_security_auditor_packet_signing_keys;

create trigger admin_security_auditor_packet_signing_keys_set_updated_at
before update on admin_security_auditor_packet_signing_keys
for each row
execute function set_updated_at();

insert into admin_security_auditor_packet_signing_keys (
  key_version,
  status,
  algorithm,
  description,
  metadata
)
values (
  'auditor-packet-signing-v1',
  'active',
  'HMAC-SHA256',
  'MVP auditor packet manifest signing key metadata. Secret material is stored outside the database.',
  '{"secret_location": "AUDITOR_PACKET_SIGNING_SECRET"}'::jsonb
)
on conflict (key_version)
do update set
  status = excluded.status,
  algorithm = excluded.algorithm,
  description = excluded.description,
  metadata = admin_security_auditor_packet_signing_keys.metadata || excluded.metadata,
  updated_at = now();

create table if not exists admin_security_auditor_packet_manifest_verification_attempts (
  id uuid primary key default gen_random_uuid(),

  manifest_key text,
  checksum_sha256 text,
  signature text,

  verification_status text not null,

  manifest_found boolean not null default false,
  checksum_match boolean not null default false,
  signature_match boolean not null default false,
  manifest_valid_state boolean not null default false,
  packet_valid_state boolean not null default false,
  portal_valid_state boolean not null default false,

  failure_reason text,

  requester_ip inet,
  user_agent text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_auditor_packet_manifest_verification_status_check
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

create index if not exists admin_security_auditor_packet_manifest_verification_manifest_idx
on admin_security_auditor_packet_manifest_verification_attempts (manifest_key, created_at desc);

create index if not exists admin_security_auditor_packet_manifest_verification_status_idx
on admin_security_auditor_packet_manifest_verification_attempts (verification_status, created_at desc);

create or replace view admin_security_auditor_packet_manifest_public_verification as
select
  m.id as auditor_packet_manifest_id,
  m.manifest_key,
  m.status,
  m.manifest_type,
  m.export_format,

  m.auditor_portal_id,
  p.portal_key,
  p.status as portal_status,
  p.auditor_name,
  p.auditor_domain,
  p.auditor_firm,
  p.customer_name,
  p.customer_domain,
  p.access_starts_at as portal_access_starts_at,
  p.access_expires_at as portal_access_expires_at,

  m.evidence_packet_id,
  ep.packet_key,
  ep.status as packet_status,
  ep.packet_type,
  ep.title,
  ep.summary,
  ep.scope,

  m.participant_id,
  part.email as participant_email,
  part.participant_role,

  m.item_count,
  m.checksum_sha256,
  m.payload_bytes,

  m.signature_algorithm,
  m.signing_key_version,
  m.signature,
  m.signed_at,
  m.watermark,
  m.expires_at,
  m.generated_at,
  m.created_at

from admin_security_auditor_packet_manifests m
join admin_security_auditor_portals p
  on p.id = m.auditor_portal_id
join admin_security_auditor_evidence_packets ep
  on ep.id = m.evidence_packet_id
left join admin_security_auditor_portal_participants part
  on part.id = m.participant_id
where m.status in ('ready', 'expired', 'revoked');

grant select on admin_security_auditor_packet_manifest_public_verification
to admin_api_role;

create or replace function request_auditor_packet_manifest_for_participant(
  p_auth_user_id uuid,
  p_portal_key text,
  p_packet_key text,
  p_export_format text default 'json',
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
  v_packet admin_security_auditor_evidence_packets%rowtype;
  v_manifest_id uuid;
  v_manifest_key text;
  v_watermark text;
begin
  v_participant := get_active_auditor_portal_participant(
    p_auth_user_id,
    p_portal_key
  );

  select *
  into v_portal
  from admin_security_auditor_portals
  where id = v_participant.auditor_portal_id;

  if v_portal.allow_downloads is not true then
    raise exception 'auditor portal does not allow downloads';
  end if;

  select *
  into v_packet
  from admin_security_auditor_evidence_packets
  where auditor_portal_id = v_portal.id
    and packet_key = p_packet_key
    and status = 'published';

  if v_packet.id is null then
    raise exception 'auditor evidence packet not found: %', p_packet_key;
  end if;

  if v_packet.allow_download is not true then
    raise exception 'auditor evidence packet does not allow download';
  end if;

  if p_export_format not in ('json', 'markdown', 'pdf', 'zip') then
    raise exception 'invalid auditor packet manifest export format: %', p_export_format;
  end if;

  v_manifest_key :=
    'auditor_manifest:' ||
    v_packet.packet_key || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  v_watermark :=
    'AUDITOR_PACKET=' || v_packet.packet_key ||
    ';PORTAL=' || v_portal.portal_key ||
    ';AUDITOR=' || v_participant.email ||
    ';REQUEST=' || coalesce(p_request_id, '') ||
    ';ISSUED_AT=' || now()::text;

  insert into admin_security_auditor_packet_manifests (
    manifest_key,
    status,
    auditor_portal_id,
    evidence_packet_id,
    participant_id,
    manifest_type,
    export_format,
    title,
    summary,
    packet_key,
    portal_key,
    auditor_name,
    auditor_email,
    auditor_firm,
    customer_name,
    customer_domain,
    item_count,
    watermark,
    expires_at,
    requested_by_auth_user_id,
    requested_by_participant_id,
    request_id,
    metadata
  )
  values (
    v_manifest_key,
    'pending',
    v_portal.id,
    v_packet.id,
    v_participant.id,
    'participant_packet_manifest',
    p_export_format,
    v_packet.title,
    v_packet.summary,
    v_packet.packet_key,
    v_portal.portal_key,
    coalesce(v_participant.display_name, v_participant.email),
    v_participant.email,
    v_portal.auditor_firm,
    v_portal.customer_name,
    v_portal.customer_domain,
    v_packet.item_count,
    v_watermark,
    least(v_portal.access_expires_at, now() + interval '14 days'),
    p_auth_user_id,
    v_participant.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'ip_address',
      p_ip_address,
      'user_agent',
      p_user_agent
    )
  )
  returning id into v_manifest_id;

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
    'artifact_download_requested',
    'admin_security_auditor_packet_manifest',
    v_manifest_id,
    'Auditor packet manifest requested',
    v_packet.title,
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_manifest_id;
end;
$$;

create or replace function claim_admin_security_auditor_packet_manifests(
  p_batch_size integer default 5,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  manifest_id uuid,
  manifest_key text,
  export_format text,
  auditor_portal_id uuid,
  portal_key text,
  evidence_packet_id uuid,
  packet_key text,
  participant_id uuid,
  auditor_email text,
  title text,
  summary text,
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
    from admin_security_auditor_packet_manifests m
    join admin_security_auditor_portals p
      on p.id = m.auditor_portal_id
    join admin_security_auditor_evidence_packets ep
      on ep.id = m.evidence_packet_id
    where m.status in ('pending', 'failed')
      and p.status = 'published'
      and ep.status = 'published'
      and m.expires_at > now()
    order by m.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated as (
    update admin_security_auditor_packet_manifests m
    set
      status = 'generating',
      generated_by_worker_id = p_worker_id,
      last_error = null,
      metadata = m.metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
    from candidates
    where m.id = candidates.id
    returning m.*
  )
  select
    u.id,
    u.manifest_key,
    u.export_format,
    u.auditor_portal_id,
    u.portal_key,
    u.evidence_packet_id,
    u.packet_key,
    u.participant_id,
    u.auditor_email,
    u.title,
    u.summary,
    u.watermark
  from updated u;
end;
$$;

create or replace function complete_admin_security_auditor_packet_manifest(
  p_manifest_id uuid,
  p_manifest_json jsonb,
  p_storage_uri text,
  p_checksum_sha256 text,
  p_payload_bytes bigint,
  p_signature text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_manifest admin_security_auditor_packet_manifests%rowtype;
  v_key admin_security_auditor_packet_signing_keys%rowtype;
begin
  if p_manifest_json is null then
    raise exception 'auditor packet manifest json is required';
  end if;

  if p_storage_uri is null or length(trim(p_storage_uri)) = 0 then
    raise exception 'auditor packet manifest storage uri is required';
  end if;

  if p_checksum_sha256 is null or length(trim(p_checksum_sha256)) = 0 then
    raise exception 'auditor packet manifest checksum is required';
  end if;

  if p_signature is null or length(trim(p_signature)) = 0 then
    raise exception 'auditor packet manifest signature is required';
  end if;

  select *
  into v_manifest
  from admin_security_auditor_packet_manifests
  where id = p_manifest_id
  for update;

  if v_manifest.id is null then
    raise exception 'auditor packet manifest not found: %', p_manifest_id;
  end if;

  if v_manifest.status <> 'generating' then
    raise exception 'auditor packet manifest cannot complete from status: %', v_manifest.status;
  end if;

  select *
  into v_key
  from admin_security_auditor_packet_signing_keys
  where status = 'active'
  order by activated_at desc
  limit 1;

  if v_key.id is null then
    raise exception 'active auditor packet signing key not found';
  end if;

  update admin_security_auditor_packet_manifests
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
    generated_by_worker_id = p_worker_id,
    generated_at = now(),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_manifest.id;

  return v_manifest.id;
end;
$$;

create or replace function fail_admin_security_auditor_packet_manifest(
  p_manifest_id uuid,
  p_error text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_manifest admin_security_auditor_packet_manifests%rowtype;
begin
  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'auditor packet manifest error is required';
  end if;

  select *
  into v_manifest
  from admin_security_auditor_packet_manifests
  where id = p_manifest_id
  for update;

  if v_manifest.id is null then
    raise exception 'auditor packet manifest not found: %', p_manifest_id;
  end if;

  update admin_security_auditor_packet_manifests
  set
    status = 'failed',
    last_error = p_error,
    generated_by_worker_id = p_worker_id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'failed_at',
      now()
    ),
    updated_at = now()
  where id = v_manifest.id;

  return v_manifest.id;
end;
$$;

create or replace function register_auditor_packet_manifest_download(
  p_auth_user_id uuid,
  p_portal_key text,
  p_manifest_key text,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_participant admin_security_auditor_portal_participants%rowtype;
  v_portal admin_security_auditor_portals%rowtype;
  v_manifest admin_security_auditor_packet_manifests%rowtype;
  v_download_key text;
  v_download_id uuid;
begin
  v_participant := get_active_auditor_portal_participant(
    p_auth_user_id,
    p_portal_key
  );

  select *
  into v_portal
  from admin_security_auditor_portals
  where id = v_participant.auditor_portal_id;

  if v_portal.allow_downloads is not true then
    raise exception 'auditor portal does not allow downloads';
  end if;

  select *
  into v_manifest
  from admin_security_auditor_packet_manifests
  where manifest_key = p_manifest_key
    and auditor_portal_id = v_portal.id
    and participant_id = v_participant.id
  for update;

  if v_manifest.id is null then
    raise exception 'auditor packet manifest not found: %', p_manifest_key;
  end if;

  if v_manifest.status <> 'ready' then
    raise exception 'auditor packet manifest is not ready: %', v_manifest.status;
  end if;

  if v_manifest.expires_at <= now() then
    update admin_security_auditor_packet_manifests
    set status = 'expired', updated_at = now()
    where id = v_manifest.id;

    raise exception 'auditor packet manifest has expired';
  end if;

  v_download_key :=
    'auditor_download:' ||
    v_manifest.manifest_key || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_auditor_packet_download_requests (
    download_key,
    status,
    auditor_portal_id,
    evidence_packet_id,
    manifest_id,
    participant_id,
    auth_user_id,
    download_type,
    requested_format,
    storage_uri,
    checksum_sha256,
    payload_bytes,
    signature_algorithm,
    signing_key_version,
    signature,
    watermark,
    expires_at,
    downloaded_at,
    download_count,
    ip_address,
    user_agent,
    request_id,
    metadata
  )
  values (
    v_download_key,
    'ready',
    v_manifest.auditor_portal_id,
    v_manifest.evidence_packet_id,
    v_manifest.id,
    v_participant.id,
    p_auth_user_id,
    'manifest',
    v_manifest.export_format,
    v_manifest.storage_uri,
    v_manifest.checksum_sha256,
    v_manifest.payload_bytes,
    v_manifest.signature_algorithm,
    v_manifest.signing_key_version,
    v_manifest.signature,
    v_manifest.watermark,
    least(v_manifest.expires_at, now() + interval '1 hour'),
    now(),
    1,
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_download_id;

  update admin_security_auditor_packet_manifests
  set
    download_count = download_count + 1,
    last_downloaded_at = now(),
    updated_at = now()
  where id = v_manifest.id;

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
    'artifact_download_requested',
    'admin_security_auditor_packet_download_request',
    v_download_id,
    'Auditor packet manifest download registered',
    v_manifest.title,
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'manifest_key',
      v_manifest.manifest_key,
      'download_key',
      v_download_key
    )
  );

  return jsonb_build_object(
    'downloadKey',
    v_download_key,
    'manifestKey',
    v_manifest.manifest_key,
    'storageUri', v_manifest.storage_uri,
    'checksumSha256', v_manifest.checksum_sha256,
    'payloadBytes', v_manifest.payload_bytes,
    'signatureAlgorithm', v_manifest.signature_algorithm,
    'signingKeyVersion', v_manifest.signing_key_version,
    'signature', v_manifest.signature,
    'watermark', v_manifest.watermark,
    'expiresAt', least(v_manifest.expires_at, now() + interval '1 hour')
  );
end;
$$;

create or replace function verify_admin_security_auditor_packet_manifest_public(
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
  v_manifest admin_security_auditor_packet_manifest_public_verification%rowtype;

  v_manifest_found boolean := false;
  v_checksum_match boolean := false;
  v_signature_match boolean := false;
  v_manifest_valid_state boolean := false;
  v_packet_valid_state boolean := false;
  v_portal_valid_state boolean := false;

  v_status text := 'failed';
  v_failure_reason text;
begin
  if p_manifest_key is null or length(trim(p_manifest_key)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'auditor packet manifest key is required';
  elsif p_checksum_sha256 is null or length(trim(p_checksum_sha256)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'auditor packet manifest checksum is required';
  elsif p_signature is null or length(trim(p_signature)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'auditor packet manifest signature is required';
  else
    select *
    into v_manifest
    from admin_security_auditor_packet_manifest_public_verification
    where manifest_key = p_manifest_key;

    if v_manifest.manifest_key is null then
      v_status := 'not_found';
      v_failure_reason := 'auditor packet manifest not found';
    else
      v_manifest_found := true;

      v_checksum_match := v_manifest.checksum_sha256 = p_checksum_sha256;
      v_signature_match := coalesce(p_signature_match, false)
        and v_manifest.signature = p_signature;

      v_manifest_valid_state :=
        v_manifest.status = 'ready'
        and v_manifest.signed_at is not null
        and v_manifest.expires_at > now();

      v_packet_valid_state := v_manifest.packet_status = 'published';

      v_portal_valid_state :=
        v_manifest.portal_status = 'published'
        and v_manifest.portal_access_starts_at <= now()
        and v_manifest.portal_access_expires_at > now();

      if v_manifest.status = 'revoked' or v_manifest.portal_status = 'revoked' then
        v_status := 'revoked';
        v_failure_reason := 'auditor packet manifest or portal revoked';
      elsif v_manifest.status = 'expired'
        or v_manifest.expires_at <= now()
        or v_manifest.portal_access_expires_at <= now()
      then
        v_status := 'expired';
        v_failure_reason := 'auditor packet manifest expired';
      elsif v_checksum_match
        and v_signature_match
        and v_manifest_valid_state
        and v_packet_valid_state
        and v_portal_valid_state
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
            when v_packet_valid_state is not true then 'packet invalid state'
            when v_portal_valid_state is not true then 'portal invalid state'
            else 'verification failed'
          end;
      end if;
    end if;
  end if;

  insert into admin_security_auditor_packet_manifest_verification_attempts (
    manifest_key,
    checksum_sha256,
    signature,
    verification_status,
    manifest_found,
    checksum_match,
    signature_match,
    manifest_valid_state,
    packet_valid_state,
    portal_valid_state,
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
    v_packet_valid_state,
    v_portal_valid_state,
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
        'manifestType', v_manifest.manifest_type,
        'exportFormat', v_manifest.export_format,
        'packetKey', v_manifest.packet_key,
        'portalKey', v_manifest.portal_key,
        'title', v_manifest.title,
        'summary', v_manifest.summary,
        'auditorName', v_manifest.auditor_name,
        'auditorFirm', v_manifest.auditor_firm,
        'customerName', v_manifest.customer_name,
        'customerDomain', v_manifest.customer_domain,
        'itemCount', v_manifest.item_count,
        'checksumSha256', v_manifest.checksum_sha256,
        'payloadBytes', v_manifest.payload_bytes,
        'signatureAlgorithm', v_manifest.signature_algorithm,
        'signingKeyVersion', v_manifest.signing_key_version,
        'signature', v_manifest.signature,
        'signedAt', v_manifest.signed_at,
        'watermark', v_manifest.watermark,
        'expiresAt', v_manifest.expires_at,
        'generatedAt', v_manifest.generated_at
      )
      else null
    end,
    'checks', jsonb_build_object(
      'manifestFound', v_manifest_found,
      'checksumMatch', v_checksum_match,
      'signatureMatch', v_signature_match,
      'manifestValidState', v_manifest_valid_state,
      'packetValidState', v_packet_valid_state,
      'portalValidState', v_portal_valid_state
    )
  );
end;
$$;

create or replace view admin_security_auditor_packet_manifest_dashboard as
select
  m.id as admin_security_auditor_packet_manifest_id,
  m.manifest_key,
  m.status,
  m.manifest_type,
  m.export_format,

  m.auditor_portal_id,
  p.portal_key,
  p.auditor_name,
  p.auditor_firm,
  p.customer_name,

  m.evidence_packet_id,
  ep.packet_key,
  ep.title as packet_title,

  m.participant_id,
  part.email as participant_email,
  part.display_name as participant_display_name,

  m.item_count,
  m.storage_uri,
  m.checksum_sha256,
  m.payload_bytes,

  m.signature_algorithm,
  m.signing_key_version,
  m.signature,
  m.signed_at,
  m.watermark,

  m.expires_at,
  m.download_count,
  m.last_downloaded_at,

  m.generated_by_worker_id,
  m.generated_at,
  m.last_error,

  m.created_at,
  m.updated_at,
  m.metadata

from admin_security_auditor_packet_manifests m
join admin_security_auditor_portals p
  on p.id = m.auditor_portal_id
join admin_security_auditor_evidence_packets ep
  on ep.id = m.evidence_packet_id
left join admin_security_auditor_portal_participants part
  on part.id = m.participant_id
order by m.created_at desc;

create or replace view admin_security_auditor_packet_download_dashboard as
select
  d.id as admin_security_auditor_packet_download_request_id,
  d.download_key,
  d.status,
  d.download_type,
  d.requested_format,

  d.auditor_portal_id,
  p.portal_key,
  p.auditor_name,
  p.customer_name,

  d.evidence_packet_id,
  ep.packet_key,

  d.manifest_id,
  m.manifest_key,

  d.participant_id,
  part.email as participant_email,

  d.storage_uri,
  d.checksum_sha256,
  d.payload_bytes,
  d.signature_algorithm,
  d.signing_key_version,
  d.signature,
  d.watermark,

  d.expires_at,
  d.downloaded_at,
  d.download_count,

  d.ip_address,
  d.user_agent,

  d.created_at,
  d.updated_at,
  d.metadata

from admin_security_auditor_packet_download_requests d
join admin_security_auditor_portals p
  on p.id = d.auditor_portal_id
join admin_security_auditor_evidence_packets ep
  on ep.id = d.evidence_packet_id
left join admin_security_auditor_packet_manifests m
  on m.id = d.manifest_id
left join admin_security_auditor_portal_participants part
  on part.id = d.participant_id
order by d.created_at desc;

create or replace view admin_security_auditor_packet_download_integrity as
select
  (
    select count(*)
    from admin_security_auditor_packet_manifests
    where status = 'pending'
  ) as pending_manifest_count,

  (
    select count(*)
    from admin_security_auditor_packet_manifests
    where status = 'failed'
  ) as failed_manifest_count,

  (
    select count(*)
    from admin_security_auditor_packet_manifests
    where status = 'ready'
      and signature is null
  ) as ready_unsigned_manifest_count,

  (
    select count(*)
    from admin_security_auditor_packet_manifests
    where status = 'ready'
      and expires_at <= now()
  ) as expired_ready_manifest_count,

  (
    select count(*)
    from admin_security_auditor_packet_download_requests
    where created_at >= now() - interval '24 hours'
  ) as download_request_count_24h,

  (
    select count(*)
    from admin_security_auditor_packet_manifest_verification_attempts
    where created_at >= now() - interval '24 hours'
  ) as verification_attempt_count_24h,

  (
    select count(*)
    from admin_security_auditor_packet_manifest_verification_attempts
    where verification_status = 'verified'
      and created_at >= now() - interval '24 hours'
  ) as verified_manifest_count_24h,

  (
    select count(*)
    from admin_security_auditor_packet_manifest_verification_attempts
    where verification_status in ('failed', 'not_found', 'invalid_input')
      and created_at >= now() - interval '1 hour'
  ) as suspicious_verification_count_1h,

  now() as checked_at;

grant select on admin_security_auditor_packet_manifest_dashboard to admin_api_role;
grant select on admin_security_auditor_packet_download_dashboard to admin_api_role;
grant select on admin_security_auditor_packet_download_integrity to admin_api_role;

alter table admin_security_auditor_packet_manifests enable row level security;
alter table admin_security_auditor_packet_manifest_items enable row level security;
alter table admin_security_auditor_packet_download_requests enable row level security;
alter table admin_security_auditor_packet_signing_keys enable row level security;
alter table admin_security_auditor_packet_manifest_verification_attempts enable row level security;

drop policy if exists admin_security_auditor_packet_manifests_no_user_direct_access on admin_security_auditor_packet_manifests;
create policy admin_security_auditor_packet_manifests_no_user_direct_access
on admin_security_auditor_packet_manifests
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_packet_manifest_items_no_user_direct_access on admin_security_auditor_packet_manifest_items;
create policy admin_security_auditor_packet_manifest_items_no_user_direct_access
on admin_security_auditor_packet_manifest_items
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_packet_download_requests_no_user_direct_access on admin_security_auditor_packet_download_requests;
create policy admin_security_auditor_packet_download_requests_no_user_direct_access
on admin_security_auditor_packet_download_requests
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_packet_signing_keys_no_user_direct_access on admin_security_auditor_packet_signing_keys;
create policy admin_security_auditor_packet_signing_keys_no_user_direct_access
on admin_security_auditor_packet_signing_keys
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_packet_manifest_verification_attempts_no_user_direct_access on admin_security_auditor_packet_manifest_verification_attempts;
create policy admin_security_auditor_packet_manifest_verification_attempts_no_user_direct_access
on admin_security_auditor_packet_manifest_verification_attempts
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_auditor_packet_manifests on admin_security_auditor_packet_manifests;
create policy admin_api_all_admin_security_auditor_packet_manifests
on admin_security_auditor_packet_manifests
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_auditor_packet_manifest_items on admin_security_auditor_packet_manifest_items;
create policy admin_api_all_admin_security_auditor_packet_manifest_items
on admin_security_auditor_packet_manifest_items
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_auditor_packet_download_requests on admin_security_auditor_packet_download_requests;
create policy admin_api_all_admin_security_auditor_packet_download_requests
on admin_security_auditor_packet_download_requests
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_read_admin_security_auditor_packet_signing_keys on admin_security_auditor_packet_signing_keys;
create policy admin_api_read_admin_security_auditor_packet_signing_keys
on admin_security_auditor_packet_signing_keys
for select
to admin_api_role
using (true);

drop policy if exists worker_all_admin_security_auditor_packet_manifests on admin_security_auditor_packet_manifests;
create policy worker_all_admin_security_auditor_packet_manifests
on admin_security_auditor_packet_manifests
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_auditor_packet_manifest_items on admin_security_auditor_packet_manifest_items;
create policy worker_all_admin_security_auditor_packet_manifest_items
on admin_security_auditor_packet_manifest_items
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_read_admin_security_auditor_packet_signing_keys on admin_security_auditor_packet_signing_keys;
create policy worker_read_admin_security_auditor_packet_signing_keys
on admin_security_auditor_packet_signing_keys
for select
to worker_role
using (true);

drop policy if exists admin_api_all_admin_security_auditor_packet_manifest_verification_attempts on admin_security_auditor_packet_manifest_verification_attempts;
create policy admin_api_all_admin_security_auditor_packet_manifest_verification_attempts
on admin_security_auditor_packet_manifest_verification_attempts
for all
to admin_api_role
using (true)
with check (true);

grant execute on function request_auditor_packet_manifest_for_participant(
  uuid,
  text,
  text,
  text,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function claim_admin_security_auditor_packet_manifests(integer, text, jsonb)
to worker_role;

grant execute on function complete_admin_security_auditor_packet_manifest(
  uuid,
  jsonb,
  text,
  text,
  bigint,
  text,
  text,
  jsonb
) to worker_role;

grant execute on function fail_admin_security_auditor_packet_manifest(uuid, text, text, jsonb)
to worker_role;

grant execute on function register_auditor_packet_manifest_download(
  uuid,
  text,
  text,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function verify_admin_security_auditor_packet_manifest_public(
  text,
  text,
  text,
  boolean,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

alter function request_auditor_packet_manifest_for_participant(
  uuid,
  text,
  text,
  text,
  inet,
  text,
  text,
  jsonb
) security definer;
alter function request_auditor_packet_manifest_for_participant(
  uuid,
  text,
  text,
  text,
  inet,
  text,
  text,
  jsonb
) set search_path = public;

alter function claim_admin_security_auditor_packet_manifests(integer, text, jsonb) security definer;
alter function claim_admin_security_auditor_packet_manifests(integer, text, jsonb) set search_path = public;

alter function complete_admin_security_auditor_packet_manifest(
  uuid,
  jsonb,
  text,
  text,
  bigint,
  text,
  text,
  jsonb
) security definer;
alter function complete_admin_security_auditor_packet_manifest(
  uuid,
  jsonb,
  text,
  text,
  bigint,
  text,
  text,
  jsonb
) set search_path = public;

alter function fail_admin_security_auditor_packet_manifest(uuid, text, text, jsonb) security definer;
alter function fail_admin_security_auditor_packet_manifest(uuid, text, text, jsonb) set search_path = public;

alter function register_auditor_packet_manifest_download(
  uuid,
  text,
  text,
  inet,
  text,
  text,
  jsonb
) security definer;
alter function register_auditor_packet_manifest_download(
  uuid,
  text,
  text,
  inet,
  text,
  text,
  jsonb
) set search_path = public;

alter function verify_admin_security_auditor_packet_manifest_public(
  text,
  text,
  text,
  boolean,
  inet,
  text,
  text,
  jsonb
) security definer;
alter function verify_admin_security_auditor_packet_manifest_public(
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
    'AUDITOR_PACKET_MANIFEST_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Auditor packet manifest not found.',
    'Auditor packet manifest not found.',
    'platform'
  ),
  (
    'AUDITOR_PACKET_MANIFEST_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Auditor packet manifest cannot be used from its current state.',
    'Auditor packet manifest invalid state.',
    'platform'
  ),
  (
    'AUDITOR_PACKET_MANIFEST_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Auditor packet manifest requires complete fields.',
    'Auditor packet manifest required fields missing.',
    'platform'
  ),
  (
    'AUDITOR_PACKET_MANIFEST_VERIFICATION_FAILED',
    'validation',
    'medium',
    200,
    false,
    true,
    'Auditor packet manifest verification failed.',
    'Public auditor packet manifest verification failed.',
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
  ('auditor packet manifest not found', 'AUDITOR_PACKET_MANIFEST_NOT_FOUND', 5, '{}'),
  ('auditor packet manifest is not ready', 'AUDITOR_PACKET_MANIFEST_INVALID_STATE', 5, '{}'),
  ('auditor packet manifest cannot complete from status', 'AUDITOR_PACKET_MANIFEST_INVALID_STATE', 5, '{}'),
  ('auditor packet manifest has expired', 'AUDITOR_PACKET_MANIFEST_INVALID_STATE', 5, '{}'),
  ('auditor portal does not allow downloads', 'AUDITOR_PACKET_MANIFEST_INVALID_STATE', 5, '{}'),
  ('auditor evidence packet does not allow download', 'AUDITOR_PACKET_MANIFEST_INVALID_STATE', 5, '{}'),
  ('invalid auditor packet manifest export format', 'AUDITOR_PACKET_MANIFEST_REQUIRED_FIELDS', 5, '{}'),
  ('auditor packet manifest json is required', 'AUDITOR_PACKET_MANIFEST_REQUIRED_FIELDS', 5, '{}'),
  ('auditor packet manifest storage uri is required', 'AUDITOR_PACKET_MANIFEST_REQUIRED_FIELDS', 5, '{}'),
  ('auditor packet manifest checksum is required', 'AUDITOR_PACKET_MANIFEST_REQUIRED_FIELDS', 5, '{}'),
  ('auditor packet manifest signature is required', 'AUDITOR_PACKET_MANIFEST_REQUIRED_FIELDS', 5, '{}'),
  ('auditor packet manifest key is required', 'AUDITOR_PACKET_MANIFEST_REQUIRED_FIELDS', 5, '{}'),
  ('active auditor packet signing key not found', 'AUDITOR_PACKET_MANIFEST_INVALID_STATE', 5, '{}')
on conflict do nothing;
