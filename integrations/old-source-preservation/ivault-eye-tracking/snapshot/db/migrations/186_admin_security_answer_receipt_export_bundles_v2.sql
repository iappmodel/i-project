-- Step 9.71 — Build answer receipt export bundles v2
-- Runs after 185_admin_security_signed_answer_receipts_v2.sql

create table if not exists admin_security_answer_receipt_export_bundles (
  id uuid primary key default gen_random_uuid(),
  bundle_key text not null unique,
  status text not null default 'pending',
  answer_receipt_id uuid not null references admin_security_answer_receipts(id) on delete cascade,
  answer_request_id uuid references admin_security_evidence_answer_requests(id) on delete set null,
  answer_session_id uuid references admin_security_evidence_answer_sessions(id) on delete set null,
  answer_scope text not null,
  bundle_type text not null default 'receipt_export',
  export_format text not null default 'json',
  title text not null,
  summary text,
  include_receipt_payload boolean not null default true,
  include_citations boolean not null default true,
  include_verification_manifest boolean not null default true,
  include_pdf_summary boolean not null default false,
  include_raw_artifacts boolean not null default false,
  requester_auth_user_id uuid,
  requester_email text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  private_room_participant_id uuid references admin_security_private_trust_room_participants(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  auditor_participant_id uuid,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  customer_name text,
  customer_domain text,
  bundle_storage_uri text,
  bundle_checksum_sha256 text,
  bundle_payload_bytes bigint,
  manifest_json jsonb not null default '{}'::jsonb,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  signed_at timestamptz,
  expires_at timestamptz default (now() + interval '30 days'),
  revoked_at timestamptz,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id),
  revocation_reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_answer_receipt_export_bundles_status_check
  check (status in ('pending', 'building', 'ready', 'failed', 'revoked', 'expired', 'archived')),
  constraint admin_security_answer_receipt_export_bundles_scope_check
  check (answer_scope in ('public', 'customer', 'private_room', 'auditor_portal', 'enterprise_review_room', 'admin')),
  constraint admin_security_answer_receipt_export_bundles_type_check
  check (bundle_type in ('receipt_export', 'auditor_receipt_bundle', 'customer_receipt_bundle', 'legal_receipt_bundle', 'admin_receipt_bundle')),
  constraint admin_security_answer_receipt_export_bundles_format_check
  check (export_format in ('json', 'zip', 'pdf', 'json_and_pdf', 'zip_with_pdf')),
  constraint admin_security_answer_receipt_export_bundles_no_raw_artifacts_check
  check (include_raw_artifacts is false),
  constraint admin_security_answer_receipt_export_bundles_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_answer_receipt_export_bundles_receipt_idx
on admin_security_answer_receipt_export_bundles (answer_receipt_id, status);
create index if not exists admin_security_answer_receipt_export_bundles_status_idx
on admin_security_answer_receipt_export_bundles (status, created_at desc);
create index if not exists admin_security_answer_receipt_export_bundles_private_room_idx
on admin_security_answer_receipt_export_bundles (private_room_id, status, created_at desc);
create index if not exists admin_security_answer_receipt_export_bundles_customer_idx
on admin_security_answer_receipt_export_bundles (customer_name, customer_domain);

drop trigger if exists admin_security_answer_receipt_export_bundles_set_updated_at
on admin_security_answer_receipt_export_bundles;
create trigger admin_security_answer_receipt_export_bundles_set_updated_at
before update on admin_security_answer_receipt_export_bundles
for each row
execute function set_updated_at();

create table if not exists admin_security_answer_receipt_export_bundle_items (
  id uuid primary key default gen_random_uuid(),
  export_bundle_id uuid not null references admin_security_answer_receipt_export_bundles(id) on delete cascade,
  item_key text not null,
  item_type text not null,
  title text not null,
  summary text,
  source_type text,
  source_id uuid,
  answer_receipt_id uuid references admin_security_answer_receipts(id) on delete set null,
  receipt_citation_id uuid references admin_security_answer_receipt_citations(id) on delete set null,
  artifact_type text,
  artifact_key text,
  content_json jsonb,
  content_text text,
  content_markdown text,
  content_hash_sha256 text,
  payload_bytes bigint,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (export_bundle_id, item_key),
  constraint admin_security_answer_receipt_export_bundle_items_type_check
  check (item_type in ('receipt_payload', 'receipt_summary', 'citation', 'verification_manifest', 'artifact_reference', 'signature_metadata', 'pdf_summary', 'other')),
  constraint admin_security_answer_receipt_export_bundle_items_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_answer_receipt_export_bundle_items_bundle_idx
on admin_security_answer_receipt_export_bundle_items (export_bundle_id, sort_order);
create index if not exists admin_security_answer_receipt_export_bundle_items_receipt_idx
on admin_security_answer_receipt_export_bundle_items (answer_receipt_id);
create index if not exists admin_security_answer_receipt_export_bundle_items_citation_idx
on admin_security_answer_receipt_export_bundle_items (receipt_citation_id);

create table if not exists admin_security_answer_receipt_export_bundle_files (
  id uuid primary key default gen_random_uuid(),
  export_bundle_id uuid not null references admin_security_answer_receipt_export_bundles(id) on delete cascade,
  file_key text not null,
  file_type text not null,
  filename text not null,
  content_type text not null,
  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  signed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (export_bundle_id, file_key),
  constraint admin_security_answer_receipt_export_bundle_files_type_check
  check (file_type in ('receipt_json', 'manifest_json', 'citations_json', 'summary_markdown', 'summary_pdf', 'bundle_zip', 'other')),
  constraint admin_security_answer_receipt_export_bundle_files_filename_check
  check (length(trim(filename)) > 0)
);

create index if not exists admin_security_answer_receipt_export_bundle_files_bundle_idx
on admin_security_answer_receipt_export_bundle_files (export_bundle_id);

create table if not exists admin_security_answer_receipt_export_bundle_jobs (
  id uuid primary key default gen_random_uuid(),
  build_job_key text not null unique,
  status text not null default 'pending',
  export_bundle_id uuid not null references admin_security_answer_receipt_export_bundles(id) on delete cascade,
  answer_receipt_id uuid not null references admin_security_answer_receipts(id) on delete cascade,
  export_format text not null,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  worker_id text,
  last_error text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_answer_receipt_export_bundle_jobs_status_check
  check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled', 'archived')),
  constraint admin_security_answer_receipt_export_bundle_jobs_format_check
  check (export_format in ('json', 'zip', 'pdf', 'json_and_pdf', 'zip_with_pdf'))
);

create index if not exists admin_security_answer_receipt_export_bundle_jobs_status_idx
on admin_security_answer_receipt_export_bundle_jobs (status, created_at);
create index if not exists admin_security_answer_receipt_export_bundle_jobs_bundle_idx
on admin_security_answer_receipt_export_bundle_jobs (export_bundle_id, status);

drop trigger if exists admin_security_answer_receipt_export_bundle_jobs_set_updated_at
on admin_security_answer_receipt_export_bundle_jobs;
create trigger admin_security_answer_receipt_export_bundle_jobs_set_updated_at
before update on admin_security_answer_receipt_export_bundle_jobs
for each row
execute function set_updated_at();

create or replace function create_admin_security_answer_receipt_export_bundle(
  p_answer_receipt_id uuid,
  p_bundle_type text default 'receipt_export',
  p_export_format text default 'json',
  p_include_pdf_summary boolean default false,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_receipt admin_security_answer_receipts%rowtype;
  v_bundle_id uuid;
  v_bundle_key text;
  v_title text;
begin
  select * into v_receipt from admin_security_answer_receipts where id = p_answer_receipt_id;
  if v_receipt.id is null then
    raise exception 'answer receipt not found: %', p_answer_receipt_id;
  end if;
  if v_receipt.status <> 'signed' then
    raise exception 'only signed answer receipts can be exported: %', v_receipt.status;
  end if;

  v_bundle_key :=
    'answer_receipt_export_bundle:' || v_receipt.answer_scope || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);
  v_title := 'Answer Receipt Export — ' || v_receipt.receipt_key;

  insert into admin_security_answer_receipt_export_bundles (
    bundle_key, status, answer_receipt_id, answer_request_id, answer_session_id, answer_scope,
    bundle_type, export_format, title, summary, include_receipt_payload, include_citations,
    include_verification_manifest, include_pdf_summary, include_raw_artifacts,
    requester_auth_user_id, requester_email, private_room_id, private_room_participant_id,
    auditor_portal_id, auditor_participant_id, enterprise_review_room_id,
    customer_name, customer_domain, request_id, metadata
  )
  values (
    v_bundle_key, 'pending', v_receipt.id, v_receipt.answer_request_id, v_receipt.answer_session_id,
    v_receipt.answer_scope, coalesce(p_bundle_type, 'receipt_export'), coalesce(p_export_format, 'json'),
    v_title, 'Portable signed answer receipt export bundle.',
    true, true, true, coalesce(p_include_pdf_summary, false), false,
    v_receipt.requester_auth_user_id, v_receipt.requester_email, v_receipt.private_room_id,
    v_receipt.private_room_participant_id, v_receipt.auditor_portal_id, v_receipt.auditor_participant_id,
    v_receipt.enterprise_review_room_id, v_receipt.customer_name, v_receipt.customer_domain,
    p_request_id, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_bundle_id;

  insert into admin_security_answer_receipt_export_bundle_jobs (
    build_job_key, status, export_bundle_id, answer_receipt_id, export_format, request_id, metadata
  )
  values (
    'answer_receipt_export_bundle_job:' || v_bundle_key || ':' ||
      substr(encode(gen_random_bytes(8), 'hex'), 1, 16),
    'pending', v_bundle_id, v_receipt.id, coalesce(p_export_format, 'json'),
    p_request_id, coalesce(p_metadata, '{}'::jsonb)
  );

  return v_bundle_id;
end;
$$;

create or replace function claim_admin_security_answer_receipt_export_bundle_jobs(
  p_batch_size integer default 10,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  build_job_id uuid,
  build_job_key text,
  export_bundle_id uuid,
  answer_receipt_id uuid,
  export_format text,
  bundle_key text,
  receipt_key text,
  receipt_payload jsonb
)
language plpgsql
as $$
begin
  if p_batch_size <= 0 or p_batch_size > 100 then
    raise exception 'batch size must be between 1 and 100';
  end if;

  return query
  with candidates as (
    select j.id
    from admin_security_answer_receipt_export_bundle_jobs j
    join admin_security_answer_receipt_export_bundles b on b.id = j.export_bundle_id
    join admin_security_answer_receipts r on r.id = j.answer_receipt_id
    where j.status in ('pending', 'failed')
      and b.status in ('pending', 'failed')
      and r.status = 'signed'
    order by j.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated_jobs as (
    update admin_security_answer_receipt_export_bundle_jobs j
    set
      status = 'processing',
      started_at = now(),
      worker_id = p_worker_id,
      last_error = null,
      metadata = j.metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
    from candidates
    where j.id = candidates.id
    returning j.*
  ),
  updated_bundles as (
    update admin_security_answer_receipt_export_bundles b
    set
      status = 'building',
      metadata = b.metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
    from updated_jobs uj
    where b.id = uj.export_bundle_id
    returning b.*
  )
  select
    uj.id,
    uj.build_job_key,
    uj.export_bundle_id,
    uj.answer_receipt_id,
    uj.export_format,
    b.bundle_key,
    r.receipt_key,
    r.receipt_payload
  from updated_jobs uj
  join admin_security_answer_receipt_export_bundles b on b.id = uj.export_bundle_id
  join admin_security_answer_receipts r on r.id = uj.answer_receipt_id;
end;
$$;

create or replace function upsert_admin_security_answer_receipt_export_bundle_item(
  p_export_bundle_id uuid,
  p_item_key text,
  p_item_type text,
  p_title text,
  p_summary text default null,
  p_source_type text default null,
  p_source_id uuid default null,
  p_answer_receipt_id uuid default null,
  p_receipt_citation_id uuid default null,
  p_artifact_type text default null,
  p_artifact_key text default null,
  p_content_json jsonb default null,
  p_content_text text default null,
  p_content_markdown text default null,
  p_sort_order integer default 0,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_item_id uuid;
  v_body text;
  v_hash text;
  v_bytes bigint;
begin
  if p_export_bundle_id is null then
    raise exception 'answer receipt export bundle id is required';
  end if;
  if p_item_key is null or length(trim(p_item_key)) = 0 then
    raise exception 'answer receipt export bundle item key is required';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'answer receipt export bundle item title is required';
  end if;

  v_body := coalesce(p_content_json::text, '') || coalesce(p_content_text, '') || coalesce(p_content_markdown, '');
  v_hash := encode(digest(v_body, 'sha256'), 'hex');
  v_bytes := length(v_body::bytea);

  insert into admin_security_answer_receipt_export_bundle_items (
    export_bundle_id, item_key, item_type, title, summary, source_type, source_id,
    answer_receipt_id, receipt_citation_id, artifact_type, artifact_key,
    content_json, content_text, content_markdown, content_hash_sha256, payload_bytes,
    sort_order, metadata
  )
  values (
    p_export_bundle_id, p_item_key, p_item_type, p_title, p_summary, p_source_type, p_source_id,
    p_answer_receipt_id, p_receipt_citation_id, p_artifact_type, p_artifact_key,
    p_content_json, p_content_text, p_content_markdown, v_hash, v_bytes,
    coalesce(p_sort_order, 0), coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (export_bundle_id, item_key)
  do update set
    item_type = excluded.item_type,
    title = excluded.title,
    summary = excluded.summary,
    source_type = excluded.source_type,
    source_id = excluded.source_id,
    answer_receipt_id = excluded.answer_receipt_id,
    receipt_citation_id = excluded.receipt_citation_id,
    artifact_type = excluded.artifact_type,
    artifact_key = excluded.artifact_key,
    content_json = excluded.content_json,
    content_text = excluded.content_text,
    content_markdown = excluded.content_markdown,
    content_hash_sha256 = excluded.content_hash_sha256,
    payload_bytes = excluded.payload_bytes,
    sort_order = excluded.sort_order,
    metadata = admin_security_answer_receipt_export_bundle_items.metadata || excluded.metadata
  returning id into v_item_id;

  return v_item_id;
end;
$$;

create or replace function upsert_admin_security_answer_receipt_export_bundle_file(
  p_export_bundle_id uuid,
  p_file_key text,
  p_file_type text,
  p_filename text,
  p_content_type text,
  p_storage_uri text,
  p_checksum_sha256 text,
  p_payload_bytes bigint,
  p_signature_algorithm text default null,
  p_signing_key_version text default null,
  p_signature text default null,
  p_signed_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_file_id uuid;
begin
  if p_export_bundle_id is null then
    raise exception 'answer receipt export bundle id is required';
  end if;
  if p_file_key is null or length(trim(p_file_key)) = 0 then
    raise exception 'answer receipt export bundle file key is required';
  end if;
  if p_filename is null or length(trim(p_filename)) = 0 then
    raise exception 'answer receipt export bundle filename is required';
  end if;

  insert into admin_security_answer_receipt_export_bundle_files (
    export_bundle_id, file_key, file_type, filename, content_type, storage_uri,
    checksum_sha256, payload_bytes, signature_algorithm, signing_key_version, signature, signed_at, metadata
  )
  values (
    p_export_bundle_id, p_file_key, p_file_type, p_filename, p_content_type, p_storage_uri,
    p_checksum_sha256, p_payload_bytes, p_signature_algorithm, p_signing_key_version,
    p_signature, p_signed_at, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (export_bundle_id, file_key)
  do update set
    file_type = excluded.file_type,
    filename = excluded.filename,
    content_type = excluded.content_type,
    storage_uri = excluded.storage_uri,
    checksum_sha256 = excluded.checksum_sha256,
    payload_bytes = excluded.payload_bytes,
    signature_algorithm = excluded.signature_algorithm,
    signing_key_version = excluded.signing_key_version,
    signature = excluded.signature,
    signed_at = excluded.signed_at,
    metadata = admin_security_answer_receipt_export_bundle_files.metadata || excluded.metadata
  returning id into v_file_id;

  return v_file_id;
end;
$$;

create or replace function complete_admin_security_answer_receipt_export_bundle_build(
  p_export_bundle_id uuid,
  p_build_job_id uuid,
  p_bundle_storage_uri text,
  p_bundle_checksum_sha256 text,
  p_bundle_payload_bytes bigint,
  p_manifest_json jsonb,
  p_signature text default null,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_bundle admin_security_answer_receipt_export_bundles%rowtype;
  v_receipt admin_security_answer_receipts%rowtype;
begin
  select * into v_bundle
  from admin_security_answer_receipt_export_bundles
  where id = p_export_bundle_id
  for update;

  if v_bundle.id is null then
    raise exception 'answer receipt export bundle not found: %', p_export_bundle_id;
  end if;
  if v_bundle.status <> 'building' then
    raise exception 'answer receipt export bundle cannot complete from status: %', v_bundle.status;
  end if;

  select * into v_receipt
  from admin_security_answer_receipts
  where id = v_bundle.answer_receipt_id;

  update admin_security_answer_receipt_export_bundles
  set
    status = 'ready',
    bundle_storage_uri = p_bundle_storage_uri,
    bundle_checksum_sha256 = p_bundle_checksum_sha256,
    bundle_payload_bytes = p_bundle_payload_bytes,
    manifest_json = coalesce(p_manifest_json, '{}'::jsonb),
    signature_algorithm = v_receipt.signature_algorithm,
    signing_key_version = v_receipt.signing_key_version,
    signature = coalesce(p_signature, v_receipt.signature),
    signed_at = now(),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('built_by_worker', p_worker_id),
    updated_at = now()
  where id = v_bundle.id;

  update admin_security_answer_receipt_export_bundle_jobs
  set
    status = 'completed',
    completed_at = now(),
    worker_id = p_worker_id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_build_job_id;

  return v_bundle.id;
end;
$$;

create or replace function fail_admin_security_answer_receipt_export_bundle_build(
  p_export_bundle_id uuid,
  p_build_job_id uuid,
  p_error text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'answer receipt export bundle build error is required';
  end if;

  update admin_security_answer_receipt_export_bundles
  set
    status = 'failed',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'build_error', p_error, 'worker_id', p_worker_id, 'failed_at', now()
    ),
    updated_at = now()
  where id = p_export_bundle_id;

  if not found then
    raise exception 'answer receipt export bundle not found: %', p_export_bundle_id;
  end if;

  update admin_security_answer_receipt_export_bundle_jobs
  set
    status = 'failed',
    failed_at = now(),
    last_error = p_error,
    worker_id = p_worker_id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_build_job_id;

  return p_export_bundle_id;
end;
$$;

create or replace function revoke_admin_security_answer_receipt_export_bundle(
  p_admin_auth_user_id uuid,
  p_export_bundle_id uuid,
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
    raise exception 'answer receipt export bundle revocation reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_answer_receipt_export_bundles
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoked_by_admin_user_id = v_admin.id,
    revocation_reason = p_reason,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_export_bundle_id
    and status in ('pending', 'building', 'ready', 'failed');

  if not found then
    raise exception 'answer receipt export bundle not found: %', p_export_bundle_id;
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'revoke_admin_security_answer_receipt_export_bundle',
    'admin.write',
    'admin_security_answer_receipt_export_bundle',
    p_export_bundle_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return p_export_bundle_id;
end;
$$;

create or replace function expire_admin_security_answer_receipt_export_bundles(
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

  update admin_security_answer_receipt_export_bundles
  set
    status = 'expired',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'expired_by_worker', p_worker_id, 'answer_receipt_export_bundle_expiry_run_id', v_run_id
    ),
    updated_at = now()
  where id in (
    select id
    from admin_security_answer_receipt_export_bundles
    where status in ('pending', 'building', 'ready', 'failed')
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  return v_run_id;
end;
$$;

create or replace function register_answer_receipt_export_bundle_download_subject(
  p_export_bundle_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_bundle admin_security_answer_receipt_export_bundles%rowtype;
  v_subject_id uuid;
begin
  select * into v_bundle
  from admin_security_answer_receipt_export_bundles
  where id = p_export_bundle_id;

  if v_bundle.id is null then
    raise exception 'answer receipt export bundle not found: %', p_export_bundle_id;
  end if;
  if v_bundle.status <> 'ready' then
    raise exception 'answer receipt export bundle is not ready: %', v_bundle.status;
  end if;

  v_subject_id := register_admin_security_artifact_download_subject(
    'admin_security_answer_receipt_export_bundle',
    v_bundle.id,
    'security_document',
    v_bundle.bundle_key,
    v_bundle.title,
    v_bundle.summary,
    v_bundle.bundle_storage_uri,
    v_bundle.bundle_checksum_sha256,
    v_bundle.bundle_payload_bytes,
    v_bundle.signature_algorithm,
    v_bundle.signing_key_version,
    v_bundle.signature,
    v_bundle.signed_at,
    case
      when v_bundle.answer_scope = 'public' then 'public'
      when v_bundle.answer_scope = 'private_room' then 'private_room_scoped'
      when v_bundle.answer_scope = 'auditor_portal' then 'auditor_scoped'
      when v_bundle.answer_scope = 'enterprise_review_room' then 'enterprise_review_room'
      when v_bundle.answer_scope = 'customer' then 'customer_scoped'
      else 'admin_only'
    end,
    case when v_bundle.answer_scope = 'public' then 'public' else 'customer_confidential' end,
    true,
    true,
    v_bundle.answer_scope <> 'public',
    v_bundle.answer_scope = 'public',
    v_bundle.expires_at,
    v_bundle.customer_name,
    v_bundle.customer_domain,
    v_bundle.private_room_id,
    v_bundle.auditor_portal_id,
    v_bundle.enterprise_review_room_id,
    p_request_id,
    '{}'::jsonb,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'answer_receipt_export_bundle')
  );

  return v_subject_id;
end;
$$;

create or replace view admin_security_answer_receipt_export_bundle_dashboard as
select
  b.id as admin_security_answer_receipt_export_bundle_id,
  b.bundle_key,
  b.status,
  b.answer_receipt_id,
  r.receipt_key,
  b.answer_request_id,
  ar.answer_request_key,
  b.answer_session_id,
  s.answer_session_key,
  b.answer_scope,
  b.bundle_type,
  b.export_format,
  b.title,
  b.summary,
  b.include_receipt_payload,
  b.include_citations,
  b.include_verification_manifest,
  b.include_pdf_summary,
  b.include_raw_artifacts,
  b.requester_auth_user_id,
  b.requester_email,
  b.private_room_id,
  pr.private_room_key,
  b.private_room_participant_id,
  p.email as private_room_participant_email,
  b.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  b.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  b.customer_name,
  b.customer_domain,
  b.bundle_storage_uri,
  b.bundle_checksum_sha256,
  b.bundle_payload_bytes,
  b.signature_algorithm,
  b.signing_key_version,
  b.signature,
  b.signed_at,
  b.expires_at,
  b.revoked_at,
  revoker.email as revoked_by_email,
  b.revocation_reason,
  (select count(*) from admin_security_answer_receipt_export_bundle_items i where i.export_bundle_id = b.id) as item_count,
  (select count(*) from admin_security_answer_receipt_export_bundle_files f where f.export_bundle_id = b.id) as file_count,
  b.created_at,
  b.updated_at,
  b.metadata
from admin_security_answer_receipt_export_bundles b
join admin_security_answer_receipts r on r.id = b.answer_receipt_id
left join admin_security_evidence_answer_requests ar on ar.id = b.answer_request_id
left join admin_security_evidence_answer_sessions s on s.id = b.answer_session_id
left join admin_security_private_trust_rooms pr on pr.id = b.private_room_id
left join admin_security_private_trust_room_participants p on p.id = b.private_room_participant_id
left join admin_security_auditor_portals ap on ap.id = b.auditor_portal_id
left join admin_security_enterprise_review_rooms er on er.id = b.enterprise_review_room_id
left join admin_users revoker on revoker.id = b.revoked_by_admin_user_id
order by b.created_at desc;

create or replace view admin_security_answer_receipt_export_bundle_item_dashboard as
select
  i.id as admin_security_answer_receipt_export_bundle_item_id,
  i.export_bundle_id,
  b.bundle_key,
  i.item_key,
  i.item_type,
  i.title,
  i.summary,
  i.source_type,
  i.source_id,
  i.answer_receipt_id,
  r.receipt_key,
  i.receipt_citation_id,
  c.citation_key,
  i.artifact_type,
  i.artifact_key,
  left(coalesce(i.content_text, i.content_markdown, i.content_json::text), 1000) as content_preview,
  i.content_hash_sha256,
  i.payload_bytes,
  i.sort_order,
  i.created_at,
  i.metadata
from admin_security_answer_receipt_export_bundle_items i
join admin_security_answer_receipt_export_bundles b on b.id = i.export_bundle_id
left join admin_security_answer_receipts r on r.id = i.answer_receipt_id
left join admin_security_answer_receipt_citations c on c.id = i.receipt_citation_id
order by i.created_at desc;

create or replace view admin_security_answer_receipt_export_bundle_file_dashboard as
select
  f.id as admin_security_answer_receipt_export_bundle_file_id,
  f.export_bundle_id,
  b.bundle_key,
  f.file_key,
  f.file_type,
  f.filename,
  f.content_type,
  f.storage_uri,
  f.checksum_sha256,
  f.payload_bytes,
  f.signature_algorithm,
  f.signing_key_version,
  f.signature,
  f.signed_at,
  f.created_at,
  f.metadata
from admin_security_answer_receipt_export_bundle_files f
join admin_security_answer_receipt_export_bundles b on b.id = f.export_bundle_id
order by f.created_at desc;

create or replace view admin_security_answer_receipt_export_bundle_job_dashboard as
select
  j.id as admin_security_answer_receipt_export_bundle_job_id,
  j.build_job_key,
  j.status,
  j.export_bundle_id,
  b.bundle_key,
  j.answer_receipt_id,
  r.receipt_key,
  j.export_format,
  j.started_at,
  j.completed_at,
  j.failed_at,
  j.worker_id,
  j.last_error,
  j.created_at,
  j.updated_at,
  j.metadata
from admin_security_answer_receipt_export_bundle_jobs j
join admin_security_answer_receipt_export_bundles b on b.id = j.export_bundle_id
join admin_security_answer_receipts r on r.id = j.answer_receipt_id
order by j.created_at desc;

create or replace view admin_security_answer_receipt_export_bundle_integrity as
select
  (select count(*) from admin_security_answer_receipt_export_bundles where status = 'pending') as pending_bundle_count,
  (select count(*) from admin_security_answer_receipt_export_bundles where status = 'building') as building_bundle_count,
  (select count(*) from admin_security_answer_receipt_export_bundles where status = 'ready') as ready_bundle_count,
  (select count(*) from admin_security_answer_receipt_export_bundles where status = 'failed') as failed_bundle_count,
  (select count(*) from admin_security_answer_receipt_export_bundles where include_raw_artifacts is true) as unsafe_raw_artifact_bundle_count,
  (select count(*) from admin_security_answer_receipt_export_bundles where status = 'ready' and bundle_checksum_sha256 is null) as ready_missing_checksum_count,
  (select count(*) from admin_security_answer_receipt_export_bundles where status = 'ready' and bundle_storage_uri is null) as ready_missing_storage_uri_count,
  (select count(*) from admin_security_answer_receipt_export_bundle_jobs where status = 'failed' and created_at >= now() - interval '1 hour') as failed_build_job_count_1h,
  now() as checked_at;

grant select on admin_security_answer_receipt_export_bundle_dashboard to admin_api_role;
grant select on admin_security_answer_receipt_export_bundle_item_dashboard to admin_api_role;
grant select on admin_security_answer_receipt_export_bundle_file_dashboard to admin_api_role;
grant select on admin_security_answer_receipt_export_bundle_job_dashboard to admin_api_role;
grant select on admin_security_answer_receipt_export_bundle_integrity to admin_api_role;

insert into scheduled_jobs (
  job_key, job_name, job_group, enabled, schedule_cron, function_name,
  function_args, max_runtime_seconds, lock_ttl_seconds, metadata
)
values
  (
    'admin_security_answer_receipt_export_bundle_expiry_every_5m',
    'Expire answer receipt export bundles',
    'admin',
    true,
    '*/5 * * * *',
    'expire_admin_security_answer_receipt_export_bundles',
    '{"batch_size": 1000}'::jsonb,
    120,
    300,
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

alter table admin_security_answer_receipt_export_bundles enable row level security;
alter table admin_security_answer_receipt_export_bundle_items enable row level security;
alter table admin_security_answer_receipt_export_bundle_files enable row level security;
alter table admin_security_answer_receipt_export_bundle_jobs enable row level security;

create policy admin_security_answer_receipt_export_bundles_no_user_direct_access
on admin_security_answer_receipt_export_bundles
for all to authenticated using (false) with check (false);
create policy admin_security_answer_receipt_export_bundle_items_no_user_direct_access
on admin_security_answer_receipt_export_bundle_items
for all to authenticated using (false) with check (false);
create policy admin_security_answer_receipt_export_bundle_files_no_user_direct_access
on admin_security_answer_receipt_export_bundle_files
for all to authenticated using (false) with check (false);
create policy admin_security_answer_receipt_export_bundle_jobs_no_user_direct_access
on admin_security_answer_receipt_export_bundle_jobs
for all to authenticated using (false) with check (false);

create policy admin_api_all_answer_receipt_export_bundles
on admin_security_answer_receipt_export_bundles
for all to admin_api_role using (true) with check (true);
create policy admin_api_all_answer_receipt_export_bundle_items
on admin_security_answer_receipt_export_bundle_items
for all to admin_api_role using (true) with check (true);
create policy admin_api_all_answer_receipt_export_bundle_files
on admin_security_answer_receipt_export_bundle_files
for all to admin_api_role using (true) with check (true);
create policy admin_api_all_answer_receipt_export_bundle_jobs
on admin_security_answer_receipt_export_bundle_jobs
for all to admin_api_role using (true) with check (true);

create policy worker_all_answer_receipt_export_bundles
on admin_security_answer_receipt_export_bundles
for all to worker_role using (true) with check (true);
create policy worker_all_answer_receipt_export_bundle_items
on admin_security_answer_receipt_export_bundle_items
for all to worker_role using (true) with check (true);
create policy worker_all_answer_receipt_export_bundle_files
on admin_security_answer_receipt_export_bundle_files
for all to worker_role using (true) with check (true);
create policy worker_all_answer_receipt_export_bundle_jobs
on admin_security_answer_receipt_export_bundle_jobs
for all to worker_role using (true) with check (true);

grant execute on function create_admin_security_answer_receipt_export_bundle(uuid, text, text, boolean, text, jsonb) to admin_api_role;
grant execute on function claim_admin_security_answer_receipt_export_bundle_jobs(integer, text, jsonb) to worker_role;
grant execute on function upsert_admin_security_answer_receipt_export_bundle_item(uuid, text, text, text, text, text, uuid, uuid, uuid, text, text, jsonb, text, text, integer, jsonb) to worker_role, admin_api_role;
grant execute on function upsert_admin_security_answer_receipt_export_bundle_file(uuid, text, text, text, text, text, text, bigint, text, text, text, timestamptz, jsonb) to worker_role, admin_api_role;
grant execute on function complete_admin_security_answer_receipt_export_bundle_build(uuid, uuid, text, text, bigint, jsonb, text, text, jsonb) to worker_role, admin_api_role;
grant execute on function fail_admin_security_answer_receipt_export_bundle_build(uuid, uuid, text, text, jsonb) to worker_role, admin_api_role;
grant execute on function revoke_admin_security_answer_receipt_export_bundle(uuid, uuid, text, text, jsonb) to admin_api_role;
grant execute on function expire_admin_security_answer_receipt_export_bundles(integer, text, jsonb) to admin_api_role, worker_role;
grant execute on function register_answer_receipt_export_bundle_download_subject(uuid, text, jsonb) to admin_api_role, worker_role;

alter function create_admin_security_answer_receipt_export_bundle(uuid, text, text, boolean, text, jsonb) security definer;
alter function create_admin_security_answer_receipt_export_bundle(uuid, text, text, boolean, text, jsonb) set search_path = public;
alter function claim_admin_security_answer_receipt_export_bundle_jobs(integer, text, jsonb) security definer;
alter function claim_admin_security_answer_receipt_export_bundle_jobs(integer, text, jsonb) set search_path = public;
alter function upsert_admin_security_answer_receipt_export_bundle_item(uuid, text, text, text, text, text, uuid, uuid, uuid, text, text, jsonb, text, text, integer, jsonb) security definer;
alter function upsert_admin_security_answer_receipt_export_bundle_item(uuid, text, text, text, text, text, uuid, uuid, uuid, text, text, jsonb, text, text, integer, jsonb) set search_path = public;
alter function upsert_admin_security_answer_receipt_export_bundle_file(uuid, text, text, text, text, text, text, bigint, text, text, text, timestamptz, jsonb) security definer;
alter function upsert_admin_security_answer_receipt_export_bundle_file(uuid, text, text, text, text, text, text, bigint, text, text, text, timestamptz, jsonb) set search_path = public;
alter function complete_admin_security_answer_receipt_export_bundle_build(uuid, uuid, text, text, bigint, jsonb, text, text, jsonb) security definer;
alter function complete_admin_security_answer_receipt_export_bundle_build(uuid, uuid, text, text, bigint, jsonb, text, text, jsonb) set search_path = public;
alter function fail_admin_security_answer_receipt_export_bundle_build(uuid, uuid, text, text, jsonb) security definer;
alter function fail_admin_security_answer_receipt_export_bundle_build(uuid, uuid, text, text, jsonb) set search_path = public;
alter function revoke_admin_security_answer_receipt_export_bundle(uuid, uuid, text, text, jsonb) security definer;
alter function revoke_admin_security_answer_receipt_export_bundle(uuid, uuid, text, text, jsonb) set search_path = public;
alter function expire_admin_security_answer_receipt_export_bundles(integer, text, jsonb) security definer;
alter function expire_admin_security_answer_receipt_export_bundles(integer, text, jsonb) set search_path = public;
alter function register_answer_receipt_export_bundle_download_subject(uuid, text, jsonb) security definer;
alter function register_answer_receipt_export_bundle_download_subject(uuid, text, jsonb) set search_path = public;

insert into error_catalog (
  error_code, category, severity, http_status, retryable, user_visible,
  user_message, internal_message, owner_team
)
values
  ('ANSWER_RECEIPT_EXPORT_NOT_FOUND', 'validation', 'medium', 404, false, true, 'Answer receipt export bundle not found.', 'Answer receipt export bundle not found.', 'platform'),
  ('ANSWER_RECEIPT_EXPORT_INVALID_STATE', 'validation', 'medium', 409, true, true, 'Answer receipt export bundle is not ready.', 'Answer receipt export bundle invalid state.', 'platform'),
  ('ANSWER_RECEIPT_EXPORT_REQUIRED_FIELDS', 'validation', 'medium', 400, false, true, 'Answer receipt export request requires complete fields.', 'Answer receipt export required fields missing.', 'platform')
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
  ('answer receipt export bundle not found', 'ANSWER_RECEIPT_EXPORT_NOT_FOUND', 5, '{}'),
  ('only signed answer receipts can be exported', 'ANSWER_RECEIPT_EXPORT_INVALID_STATE', 5, '{}'),
  ('answer receipt export bundle cannot complete from status', 'ANSWER_RECEIPT_EXPORT_INVALID_STATE', 5, '{}'),
  ('answer receipt export bundle is not ready', 'ANSWER_RECEIPT_EXPORT_INVALID_STATE', 5, '{}'),
  ('answer receipt export bundle build error is required', 'ANSWER_RECEIPT_EXPORT_REQUIRED_FIELDS', 5, '{}'),
  ('answer receipt export bundle id is required', 'ANSWER_RECEIPT_EXPORT_REQUIRED_FIELDS', 5, '{}'),
  ('answer receipt export bundle item key is required', 'ANSWER_RECEIPT_EXPORT_REQUIRED_FIELDS', 5, '{}'),
  ('answer receipt export bundle item title is required', 'ANSWER_RECEIPT_EXPORT_REQUIRED_FIELDS', 5, '{}'),
  ('answer receipt export bundle file key is required', 'ANSWER_RECEIPT_EXPORT_REQUIRED_FIELDS', 5, '{}'),
  ('answer receipt export bundle filename is required', 'ANSWER_RECEIPT_EXPORT_REQUIRED_FIELDS', 5, '{}'),
  ('answer receipt export bundle revocation reason is required', 'ANSWER_RECEIPT_EXPORT_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
