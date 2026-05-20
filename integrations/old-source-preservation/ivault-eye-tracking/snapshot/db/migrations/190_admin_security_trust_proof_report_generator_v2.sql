-- Step 9.75 — Build trust proof report generator v2
-- Runs after 189_admin_security_customer_trust_proof_portal_v2.sql

create table if not exists admin_security_trust_proof_reports (
  id uuid primary key default gen_random_uuid(),
  report_key text not null unique,
  status text not null default 'pending',
  report_scope text not null,
  report_type text not null default 'customer_security_review',
  report_format text not null default 'html',
  title text not null,
  subtitle text,
  executive_summary text,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  private_room_participant_id uuid references admin_security_private_trust_room_participants(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  auditor_participant_id uuid,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  requester_auth_user_id uuid,
  requester_email text,
  requester_display_name text,
  include_artifacts boolean not null default true,
  include_searches boolean not null default true,
  include_answers boolean not null default true,
  include_receipts boolean not null default true,
  include_exports boolean not null default true,
  include_downloads boolean not null default true,
  include_timeline boolean not null default true,
  include_crypto_status boolean not null default true,
  include_verification_status boolean not null default true,
  include_raw_artifacts boolean not null default false,
  include_internal_metadata boolean not null default false,
  start_time timestamptz,
  end_time timestamptz,
  artifact_count integer not null default 0,
  answer_count integer not null default 0,
  receipt_count integer not null default 0,
  export_count integer not null default 0,
  download_count integer not null default 0,
  timeline_event_count integer not null default 0,
  report_payload jsonb not null default '{}'::jsonb,
  report_hash_sha256 text,
  payload_bytes bigint,
  html_storage_uri text,
  pdf_storage_uri text,
  json_storage_uri text,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  signed_at timestamptz,
  generated_at timestamptz,
  expires_at timestamptz default (now() + interval '90 days'),
  revoked_at timestamptz,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id),
  revocation_reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_trust_proof_reports_status_check
  check (status in ('pending','building','ready','failed','revoked','expired','archived')),
  constraint admin_security_trust_proof_reports_scope_check
  check (report_scope in ('public','customer','private_room','auditor_portal','enterprise_review_room','admin')),
  constraint admin_security_trust_proof_reports_type_check
  check (report_type in ('customer_security_review','auditor_review','trust_center_summary','private_room_summary','proof_timeline_report','answer_receipt_report','legal_archive','admin_internal')),
  constraint admin_security_trust_proof_reports_format_check
  check (report_format in ('html','pdf','json','html_and_pdf','zip')),
  constraint admin_security_trust_proof_reports_no_raw_artifacts_check
  check (include_raw_artifacts is false),
  constraint admin_security_trust_proof_reports_no_internal_metadata_check
  check (include_internal_metadata is false),
  constraint admin_security_trust_proof_reports_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_trust_proof_reports_status_idx
on admin_security_trust_proof_reports (status, created_at desc);

create index if not exists admin_security_trust_proof_reports_private_room_idx
on admin_security_trust_proof_reports (private_room_id, status, created_at desc);

create index if not exists admin_security_trust_proof_reports_customer_idx
on admin_security_trust_proof_reports (customer_name, customer_domain);

create index if not exists admin_security_trust_proof_reports_hash_idx
on admin_security_trust_proof_reports (report_hash_sha256);

drop trigger if exists admin_security_trust_proof_reports_set_updated_at
on admin_security_trust_proof_reports;

create trigger admin_security_trust_proof_reports_set_updated_at
before update on admin_security_trust_proof_reports
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_proof_report_sections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references admin_security_trust_proof_reports(id) on delete cascade,
  section_key text not null,
  section_type text not null,
  title text not null,
  subtitle text,
  summary text,
  content_json jsonb not null default '{}'::jsonb,
  content_markdown text,
  content_html text,
  item_count integer not null default 0,
  content_hash_sha256 text,
  payload_bytes bigint,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (report_id, section_key),
  constraint admin_security_trust_proof_report_sections_type_check
  check (section_type in ('cover','executive_summary','scope','artifacts','searches','answers','receipts','exports','downloads','timeline','crypto_status','verification_status','appendix','other')),
  constraint admin_security_trust_proof_report_sections_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_trust_proof_report_sections_report_idx
on admin_security_trust_proof_report_sections (report_id, sort_order);

create table if not exists admin_security_trust_proof_report_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references admin_security_trust_proof_reports(id) on delete cascade,
  report_section_id uuid references admin_security_trust_proof_report_sections(id) on delete cascade,
  item_key text not null,
  item_type text not null,
  title text not null,
  summary text,
  source_type text,
  source_id uuid,
  source_key text,
  artifact_type text,
  artifact_key text,
  receipt_key text,
  bundle_key text,
  timeline_event_key text,
  content_json jsonb not null default '{}'::jsonb,
  content_text text,
  content_hash_sha256 text,
  payload_bytes bigint,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (report_id, item_key),
  constraint admin_security_trust_proof_report_items_type_check
  check (item_type in ('artifact','search','answer','citation','receipt','export_bundle','download','timeline_event','crypto_checkpoint','crypto_merkle_root','crypto_anchor','verification','metric','other')),
  constraint admin_security_trust_proof_report_items_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_trust_proof_report_items_report_idx
on admin_security_trust_proof_report_items (report_id, sort_order);

create index if not exists admin_security_trust_proof_report_items_section_idx
on admin_security_trust_proof_report_items (report_section_id, sort_order);

create index if not exists admin_security_trust_proof_report_items_source_idx
on admin_security_trust_proof_report_items (source_type, source_id);

create table if not exists admin_security_trust_proof_report_files (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references admin_security_trust_proof_reports(id) on delete cascade,
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
  unique (report_id, file_key),
  constraint admin_security_trust_proof_report_files_type_check
  check (file_type in ('report_html','report_pdf','report_json','report_markdown','report_zip','other')),
  constraint admin_security_trust_proof_report_files_filename_check
  check (length(trim(filename)) > 0)
);

create index if not exists admin_security_trust_proof_report_files_report_idx
on admin_security_trust_proof_report_files (report_id);

create table if not exists admin_security_trust_proof_report_jobs (
  id uuid primary key default gen_random_uuid(),
  report_job_key text not null unique,
  status text not null default 'pending',
  report_id uuid not null references admin_security_trust_proof_reports(id) on delete cascade,
  report_format text not null,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  worker_id text,
  last_error text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_trust_proof_report_jobs_status_check
  check (status in ('pending','processing','completed','failed','cancelled','archived')),
  constraint admin_security_trust_proof_report_jobs_format_check
  check (report_format in ('html','pdf','json','html_and_pdf','zip'))
);

create index if not exists admin_security_trust_proof_report_jobs_status_idx
on admin_security_trust_proof_report_jobs (status, created_at);

create index if not exists admin_security_trust_proof_report_jobs_report_idx
on admin_security_trust_proof_report_jobs (report_id, status);

drop trigger if exists admin_security_trust_proof_report_jobs_set_updated_at
on admin_security_trust_proof_report_jobs;

create trigger admin_security_trust_proof_report_jobs_set_updated_at
before update on admin_security_trust_proof_report_jobs
for each row
execute function set_updated_at();

create or replace function create_admin_security_trust_proof_report(
  p_report_scope text,
  p_report_type text default 'customer_security_review',
  p_report_format text default 'html',
  p_title text default null,
  p_subtitle text default null,
  p_executive_summary text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_private_room_id uuid default null,
  p_private_room_participant_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_auditor_participant_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_requester_auth_user_id uuid default null,
  p_requester_email text default null,
  p_requester_display_name text default null,
  p_start_time timestamptz default null,
  p_end_time timestamptz default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_report_id uuid;
  v_report_key text;
  v_title text;
begin
  v_report_key :=
    'trust_proof_report:' ||
    p_report_scope || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  v_title := coalesce(
    p_title,
    case
      when p_report_scope = 'private_room' then 'Trust Proof Report'
      when p_report_scope = 'auditor_portal' then 'Auditor Trust Proof Report'
      when p_report_scope = 'customer' then 'Customer Trust Proof Report'
      else 'Trust Proof Report'
    end
  );

  insert into admin_security_trust_proof_reports (
    report_key,status,report_scope,report_type,report_format,title,subtitle,executive_summary,
    customer_name,customer_domain,private_room_id,private_room_participant_id,auditor_portal_id,
    auditor_participant_id,enterprise_review_room_id,requester_auth_user_id,requester_email,
    requester_display_name,include_artifacts,include_searches,include_answers,include_receipts,
    include_exports,include_downloads,include_timeline,include_crypto_status,include_verification_status,
    include_raw_artifacts,include_internal_metadata,start_time,end_time,request_id,metadata
  )
  values (
    v_report_key,'pending',p_report_scope,coalesce(p_report_type, 'customer_security_review'),
    coalesce(p_report_format, 'html'),v_title,p_subtitle,p_executive_summary,p_customer_name,p_customer_domain,
    p_private_room_id,p_private_room_participant_id,p_auditor_portal_id,p_auditor_participant_id,
    p_enterprise_review_room_id,p_requester_auth_user_id,lower(trim(p_requester_email)),p_requester_display_name,
    true,true,true,true,true,true,true,true,true,false,false,p_start_time,p_end_time,p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_report_id;

  insert into admin_security_trust_proof_report_jobs (
    report_job_key,status,report_id,report_format,request_id,metadata
  )
  values (
    'trust_proof_report_job:' || v_report_key || ':' || substr(encode(gen_random_bytes(8), 'hex'), 1, 16),
    'pending',
    v_report_id,
    coalesce(p_report_format, 'html'),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_report_id;
end;
$$;

create or replace function create_private_room_trust_proof_report(
  p_auth_user_id uuid,
  p_private_room_key text,
  p_report_format text default 'html',
  p_start_time timestamptz default null,
  p_end_time timestamptz default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_participant admin_security_private_trust_room_participants%rowtype;
  v_room admin_security_private_trust_rooms%rowtype;
  v_report_id uuid;
begin
  v_participant := get_active_private_trust_room_participant(p_auth_user_id, p_private_room_key);

  select * into v_room
  from admin_security_private_trust_rooms
  where id = v_participant.private_room_id;

  v_report_id := create_admin_security_trust_proof_report(
    'private_room',
    'private_room_summary',
    coalesce(p_report_format, 'html'),
    'Trust Proof Report — ' || v_room.title,
    v_room.customer_name,
    'This report summarizes shared artifacts, evidence answers, signed receipts, exports, downloads, timeline events, and cryptographic proof for this private trust room.',
    v_room.customer_name,
    v_room.customer_domain,
    v_room.id,
    v_participant.id,
    null,
    null,
    v_room.enterprise_review_room_id,
    p_auth_user_id,
    v_participant.email,
    v_participant.display_name,
    p_start_time,
    p_end_time,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'source','private_room_trust_proof_report',
      'participant_id',v_participant.id
    )
  );

  return v_report_id;
end;
$$;

create or replace function claim_admin_security_trust_proof_report_jobs(
  p_batch_size integer default 10,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  report_job_id uuid,
  report_job_key text,
  report_id uuid,
  report_key text,
  report_scope text,
  report_type text,
  report_format text,
  private_room_id uuid,
  customer_name text,
  customer_domain text
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
    from admin_security_trust_proof_report_jobs j
    join admin_security_trust_proof_reports r on r.id = j.report_id
    where j.status in ('pending', 'failed')
      and r.status in ('pending', 'failed')
    order by j.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated_jobs as (
    update admin_security_trust_proof_report_jobs j
    set status = 'processing',
        started_at = now(),
        worker_id = p_worker_id,
        last_error = null,
        metadata = j.metadata || coalesce(p_metadata, '{}'::jsonb),
        updated_at = now()
    from candidates
    where j.id = candidates.id
    returning j.*
  )
  update admin_security_trust_proof_reports r
  set status = 'building',
      metadata = r.metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
  from updated_jobs uj
  where r.id = uj.report_id
  returning
    uj.id,
    uj.report_job_key,
    r.id,
    r.report_key,
    r.report_scope,
    r.report_type,
    r.report_format,
    r.private_room_id,
    r.customer_name,
    r.customer_domain;
end;
$$;

create or replace function upsert_admin_security_trust_proof_report_section(
  p_report_id uuid,
  p_section_key text,
  p_section_type text,
  p_title text,
  p_subtitle text default null,
  p_summary text default null,
  p_content_json jsonb default '{}'::jsonb,
  p_content_markdown text default null,
  p_content_html text default null,
  p_item_count integer default 0,
  p_sort_order integer default 0,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_section_id uuid;
  v_body text;
  v_hash text;
  v_bytes bigint;
begin
  if p_report_id is null then
    raise exception 'trust proof report id is required';
  end if;

  if p_section_key is null or length(trim(p_section_key)) = 0 then
    raise exception 'trust proof report section key is required';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'trust proof report section title is required';
  end if;

  v_body := coalesce(p_content_json::text, '') || coalesce(p_content_markdown, '') || coalesce(p_content_html, '');
  v_hash := encode(digest(v_body, 'sha256'), 'hex');
  v_bytes := length(v_body::bytea);

  insert into admin_security_trust_proof_report_sections (
    report_id,section_key,section_type,title,subtitle,summary,content_json,content_markdown,content_html,item_count,
    content_hash_sha256,payload_bytes,sort_order,metadata
  )
  values (
    p_report_id,p_section_key,p_section_type,p_title,p_subtitle,p_summary,coalesce(p_content_json, '{}'::jsonb),
    p_content_markdown,p_content_html,coalesce(p_item_count, 0),v_hash,v_bytes,coalesce(p_sort_order, 0),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (report_id, section_key)
  do update set
    section_type = excluded.section_type,
    title = excluded.title,
    subtitle = excluded.subtitle,
    summary = excluded.summary,
    content_json = excluded.content_json,
    content_markdown = excluded.content_markdown,
    content_html = excluded.content_html,
    item_count = excluded.item_count,
    content_hash_sha256 = excluded.content_hash_sha256,
    payload_bytes = excluded.payload_bytes,
    sort_order = excluded.sort_order,
    metadata = admin_security_trust_proof_report_sections.metadata || excluded.metadata
  returning id into v_section_id;

  return v_section_id;
end;
$$;

create or replace function upsert_admin_security_trust_proof_report_item(
  p_report_id uuid,
  p_report_section_id uuid,
  p_item_key text,
  p_item_type text,
  p_title text,
  p_summary text default null,
  p_source_type text default null,
  p_source_id uuid default null,
  p_source_key text default null,
  p_artifact_type text default null,
  p_artifact_key text default null,
  p_receipt_key text default null,
  p_bundle_key text default null,
  p_timeline_event_key text default null,
  p_content_json jsonb default '{}'::jsonb,
  p_content_text text default null,
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
  if p_report_id is null then
    raise exception 'trust proof report id is required';
  end if;

  if p_item_key is null or length(trim(p_item_key)) = 0 then
    raise exception 'trust proof report item key is required';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'trust proof report item title is required';
  end if;

  v_body := coalesce(p_content_json::text, '') || coalesce(p_content_text, '');
  v_hash := encode(digest(v_body, 'sha256'), 'hex');
  v_bytes := length(v_body::bytea);

  insert into admin_security_trust_proof_report_items (
    report_id,report_section_id,item_key,item_type,title,summary,source_type,source_id,source_key,artifact_type,artifact_key,
    receipt_key,bundle_key,timeline_event_key,content_json,content_text,content_hash_sha256,payload_bytes,sort_order,metadata
  )
  values (
    p_report_id,p_report_section_id,p_item_key,p_item_type,p_title,p_summary,p_source_type,p_source_id,p_source_key,
    p_artifact_type,p_artifact_key,p_receipt_key,p_bundle_key,p_timeline_event_key,coalesce(p_content_json, '{}'::jsonb),
    p_content_text,v_hash,v_bytes,coalesce(p_sort_order, 0),coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (report_id, item_key)
  do update set
    report_section_id = excluded.report_section_id,
    item_type = excluded.item_type,
    title = excluded.title,
    summary = excluded.summary,
    source_type = excluded.source_type,
    source_id = excluded.source_id,
    source_key = excluded.source_key,
    artifact_type = excluded.artifact_type,
    artifact_key = excluded.artifact_key,
    receipt_key = excluded.receipt_key,
    bundle_key = excluded.bundle_key,
    timeline_event_key = excluded.timeline_event_key,
    content_json = excluded.content_json,
    content_text = excluded.content_text,
    content_hash_sha256 = excluded.content_hash_sha256,
    payload_bytes = excluded.payload_bytes,
    sort_order = excluded.sort_order,
    metadata = admin_security_trust_proof_report_items.metadata || excluded.metadata
  returning id into v_item_id;

  return v_item_id;
end;
$$;

create or replace function upsert_admin_security_trust_proof_report_file(
  p_report_id uuid,
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
  if p_report_id is null then
    raise exception 'trust proof report id is required';
  end if;
  if p_file_key is null or length(trim(p_file_key)) = 0 then
    raise exception 'trust proof report file key is required';
  end if;
  if p_filename is null or length(trim(p_filename)) = 0 then
    raise exception 'trust proof report filename is required';
  end if;

  insert into admin_security_trust_proof_report_files (
    report_id,file_key,file_type,filename,content_type,storage_uri,checksum_sha256,payload_bytes,
    signature_algorithm,signing_key_version,signature,signed_at,metadata
  )
  values (
    p_report_id,p_file_key,p_file_type,p_filename,p_content_type,p_storage_uri,p_checksum_sha256,p_payload_bytes,
    p_signature_algorithm,p_signing_key_version,p_signature,p_signed_at,coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (report_id, file_key)
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
    metadata = admin_security_trust_proof_report_files.metadata || excluded.metadata
  returning id into v_file_id;

  return v_file_id;
end;
$$;

create or replace function complete_admin_security_trust_proof_report_build(
  p_report_id uuid,
  p_report_job_id uuid,
  p_report_payload jsonb,
  p_report_hash_sha256 text,
  p_payload_bytes bigint,
  p_html_storage_uri text default null,
  p_pdf_storage_uri text default null,
  p_json_storage_uri text default null,
  p_signature text default null,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_report admin_security_trust_proof_reports%rowtype;
begin
  if p_report_payload is null then
    raise exception 'trust proof report payload is required';
  end if;
  if p_report_hash_sha256 is null or length(trim(p_report_hash_sha256)) = 0 then
    raise exception 'trust proof report hash is required';
  end if;

  select * into v_report
  from admin_security_trust_proof_reports
  where id = p_report_id
  for update;

  if v_report.id is null then
    raise exception 'trust proof report not found: %', p_report_id;
  end if;
  if v_report.status <> 'building' then
    raise exception 'trust proof report cannot complete from status: %', v_report.status;
  end if;

  update admin_security_trust_proof_reports
  set
    status = 'ready',
    report_payload = p_report_payload,
    report_hash_sha256 = p_report_hash_sha256,
    payload_bytes = p_payload_bytes,
    html_storage_uri = p_html_storage_uri,
    pdf_storage_uri = p_pdf_storage_uri,
    json_storage_uri = p_json_storage_uri,
    signature_algorithm = 'HMAC-SHA256',
    signing_key_version = 'trust-proof-report-signing-v1',
    signature = coalesce(p_signature, encode(digest(p_report_hash_sha256 || ':' || report_key, 'sha256'), 'hex')),
    signed_at = now(),
    generated_at = now(),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('built_by_worker', p_worker_id),
    updated_at = now()
  where id = v_report.id;

  update admin_security_trust_proof_report_jobs
  set status = 'completed',
      completed_at = now(),
      worker_id = p_worker_id,
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
  where id = p_report_job_id;

  return v_report.id;
end;
$$;

create or replace function fail_admin_security_trust_proof_report_build(
  p_report_id uuid,
  p_report_job_id uuid,
  p_error text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'trust proof report build error is required';
  end if;

  update admin_security_trust_proof_reports
  set status = 'failed',
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'build_error', p_error,
        'worker_id', p_worker_id,
        'failed_at', now()
      ),
      updated_at = now()
  where id = p_report_id;

  if not found then
    raise exception 'trust proof report not found: %', p_report_id;
  end if;

  update admin_security_trust_proof_report_jobs
  set status = 'failed',
      failed_at = now(),
      last_error = p_error,
      worker_id = p_worker_id,
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
  where id = p_report_job_id;

  return p_report_id;
end;
$$;

create or replace function revoke_admin_security_trust_proof_report(
  p_admin_auth_user_id uuid,
  p_report_id uuid,
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
    raise exception 'trust proof report revocation reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_trust_proof_reports
  set status = 'revoked',
      revoked_at = now(),
      revoked_by_auth_user_id = p_admin_auth_user_id,
      revoked_by_admin_user_id = v_admin.id,
      revocation_reason = p_reason,
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
  where id = p_report_id
    and status in ('pending', 'building', 'ready', 'failed');

  if not found then
    raise exception 'trust proof report not found: %', p_report_id;
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'revoke_admin_security_trust_proof_report',
    'admin.write',
    'admin_security_trust_proof_report',
    p_report_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return p_report_id;
end;
$$;

create or replace function expire_admin_security_trust_proof_reports(
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

  update admin_security_trust_proof_reports
  set status = 'expired',
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'expired_by_worker', p_worker_id,
        'trust_proof_report_expiry_run_id', v_run_id
      ),
      updated_at = now()
  where id in (
    select id
    from admin_security_trust_proof_reports
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

create or replace function register_trust_proof_report_download_subject(
  p_report_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_report admin_security_trust_proof_reports%rowtype;
  v_subject_id uuid;
  v_storage_uri text;
begin
  select * into v_report
  from admin_security_trust_proof_reports
  where id = p_report_id;

  if v_report.id is null then
    raise exception 'trust proof report not found: %', p_report_id;
  end if;
  if v_report.status <> 'ready' then
    raise exception 'trust proof report is not ready: %', v_report.status;
  end if;

  v_storage_uri := coalesce(v_report.pdf_storage_uri, v_report.html_storage_uri, v_report.json_storage_uri);
  if v_storage_uri is null then
    raise exception 'trust proof report has no storage uri';
  end if;

  v_subject_id := register_admin_security_artifact_download_subject(
    'admin_security_trust_proof_report',
    v_report.id,
    'security_document',
    v_report.report_key,
    v_report.title,
    v_report.executive_summary,
    v_storage_uri,
    v_report.report_hash_sha256,
    v_report.payload_bytes,
    v_report.signature_algorithm,
    v_report.signing_key_version,
    v_report.signature,
    v_report.signed_at,
    case
      when v_report.report_scope = 'public' then 'public'
      when v_report.report_scope = 'private_room' then 'private_room_scoped'
      when v_report.report_scope = 'auditor_portal' then 'auditor_scoped'
      when v_report.report_scope = 'enterprise_review_room' then 'enterprise_review_room'
      when v_report.report_scope = 'customer' then 'customer_scoped'
      else 'admin_only'
    end,
    case when v_report.report_scope = 'public' then 'public' else 'customer_confidential' end,
    true,
    true,
    v_report.report_scope <> 'public',
    v_report.report_scope = 'public',
    v_report.expires_at,
    v_report.customer_name,
    v_report.customer_domain,
    v_report.private_room_id,
    v_report.auditor_portal_id,
    v_report.enterprise_review_room_id,
    p_request_id,
    '{}'::jsonb,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'trust_proof_report')
  );

  return v_subject_id;
end;
$$;

create or replace view admin_security_trust_proof_report_dashboard as
select
  r.id as admin_security_trust_proof_report_id,
  r.report_key,r.status,r.report_scope,r.report_type,r.report_format,r.title,r.subtitle,r.executive_summary,
  r.customer_name,r.customer_domain,r.private_room_id,pr.private_room_key,r.private_room_participant_id,
  p.email as private_room_participant_email,r.auditor_portal_id,ap.portal_key as auditor_portal_key,
  r.enterprise_review_room_id,er.room_key as enterprise_review_room_key,r.requester_auth_user_id,
  r.requester_email,r.requester_display_name,r.artifact_count,r.answer_count,r.receipt_count,r.export_count,
  r.download_count,r.timeline_event_count,r.report_hash_sha256,r.payload_bytes,r.html_storage_uri,r.pdf_storage_uri,
  r.json_storage_uri,r.signature_algorithm,r.signing_key_version,r.signature,r.signed_at,r.generated_at,r.expires_at,
  r.revoked_at,revoker.email as revoked_by_email,r.revocation_reason,
  (select count(*) from admin_security_trust_proof_report_sections s where s.report_id = r.id) as section_count,
  (select count(*) from admin_security_trust_proof_report_items i where i.report_id = r.id) as item_count,
  (select count(*) from admin_security_trust_proof_report_files f where f.report_id = r.id) as file_count,
  r.created_at,r.updated_at,r.metadata
from admin_security_trust_proof_reports r
left join admin_security_private_trust_rooms pr on pr.id = r.private_room_id
left join admin_security_private_trust_room_participants p on p.id = r.private_room_participant_id
left join admin_security_auditor_portals ap on ap.id = r.auditor_portal_id
left join admin_security_enterprise_review_rooms er on er.id = r.enterprise_review_room_id
left join admin_users revoker on revoker.id = r.revoked_by_admin_user_id
order by r.created_at desc;

create or replace view admin_security_trust_proof_report_section_dashboard as
select
  s.id as admin_security_trust_proof_report_section_id,
  s.report_id,r.report_key,s.section_key,s.section_type,s.title,s.subtitle,s.summary,
  left(coalesce(s.content_markdown, s.content_html, s.content_json::text), 1000) as content_preview,
  s.item_count,s.content_hash_sha256,s.payload_bytes,s.sort_order,s.created_at,s.metadata
from admin_security_trust_proof_report_sections s
join admin_security_trust_proof_reports r on r.id = s.report_id
order by s.created_at desc;

create or replace view admin_security_trust_proof_report_item_dashboard as
select
  i.id as admin_security_trust_proof_report_item_id,
  i.report_id,r.report_key,i.report_section_id,s.section_key,i.item_key,i.item_type,i.title,i.summary,
  i.source_type,i.source_id,i.source_key,i.artifact_type,i.artifact_key,i.receipt_key,i.bundle_key,i.timeline_event_key,
  left(coalesce(i.content_text, i.content_json::text), 1000) as content_preview,
  i.content_hash_sha256,i.payload_bytes,i.sort_order,i.created_at,i.metadata
from admin_security_trust_proof_report_items i
join admin_security_trust_proof_reports r on r.id = i.report_id
left join admin_security_trust_proof_report_sections s on s.id = i.report_section_id
order by i.created_at desc;

create or replace view admin_security_trust_proof_report_file_dashboard as
select
  f.id as admin_security_trust_proof_report_file_id,f.report_id,r.report_key,f.file_key,f.file_type,f.filename,f.content_type,
  f.storage_uri,f.checksum_sha256,f.payload_bytes,f.signature_algorithm,f.signing_key_version,f.signature,f.signed_at,f.created_at,f.metadata
from admin_security_trust_proof_report_files f
join admin_security_trust_proof_reports r on r.id = f.report_id
order by f.created_at desc;

create or replace view admin_security_trust_proof_report_job_dashboard as
select
  j.id as admin_security_trust_proof_report_job_id,j.report_job_key,j.status,j.report_id,r.report_key,r.report_scope,r.report_type,
  j.report_format,j.started_at,j.completed_at,j.failed_at,j.worker_id,j.last_error,j.created_at,j.updated_at,j.metadata
from admin_security_trust_proof_report_jobs j
join admin_security_trust_proof_reports r on r.id = j.report_id
order by j.created_at desc;

create or replace view admin_security_trust_proof_report_integrity as
select
  (select count(*) from admin_security_trust_proof_reports where status = 'pending') as pending_report_count,
  (select count(*) from admin_security_trust_proof_reports where status = 'building') as building_report_count,
  (select count(*) from admin_security_trust_proof_reports where status = 'ready') as ready_report_count,
  (select count(*) from admin_security_trust_proof_reports where status = 'failed') as failed_report_count,
  (select count(*) from admin_security_trust_proof_reports where include_raw_artifacts is true) as unsafe_raw_artifact_report_count,
  (select count(*) from admin_security_trust_proof_reports where include_internal_metadata is true) as unsafe_internal_metadata_report_count,
  (select count(*) from admin_security_trust_proof_reports where status = 'ready' and report_hash_sha256 is null) as ready_missing_hash_count,
  (select count(*) from admin_security_trust_proof_reports where status = 'ready' and coalesce(html_storage_uri, pdf_storage_uri, json_storage_uri) is null) as ready_missing_storage_uri_count,
  (select count(*) from admin_security_trust_proof_report_jobs where status = 'failed' and created_at >= now() - interval '1 hour') as failed_report_job_count_1h,
  now() as checked_at;

grant select on admin_security_trust_proof_report_dashboard to admin_api_role;
grant select on admin_security_trust_proof_report_section_dashboard to admin_api_role;
grant select on admin_security_trust_proof_report_item_dashboard to admin_api_role;
grant select on admin_security_trust_proof_report_file_dashboard to admin_api_role;
grant select on admin_security_trust_proof_report_job_dashboard to admin_api_role;
grant select on admin_security_trust_proof_report_integrity to admin_api_role;

insert into scheduled_jobs (
  job_key,job_name,job_group,enabled,schedule_cron,function_name,function_args,max_runtime_seconds,lock_ttl_seconds,metadata
)
values (
  'admin_security_trust_proof_report_expiry_every_5m',
  'Expire trust proof reports',
  'admin',
  true,
  '*/5 * * * *',
  'expire_admin_security_trust_proof_reports',
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
    update scheduled_jobs set last_status = 'disabled', last_run_id = v_run_id, updated_at = now() where id = v_job.id;
    return v_run_id;
  end if;

  v_lock_acquired := acquire_scheduled_job_lock(v_job.job_key, p_locked_by, v_job.lock_ttl_seconds, p_metadata);
  if v_lock_acquired is false then
    insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, metadata)
    values (v_job.id, v_job.job_key, v_job.job_group, 'skipped_locked', p_metadata)
    returning id into v_run_id;
    update scheduled_jobs set last_status = 'skipped_locked', last_run_id = v_run_id, updated_at = now() where id = v_job.id;
    return v_run_id;
  end if;

  v_started_at := now();
  insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, started_at, metadata)
  values (v_job.id, v_job.job_key, v_job.job_group, 'started', v_started_at, p_metadata)
  returning id into v_run_id;
  update scheduled_jobs set last_started_at = v_started_at, last_status = 'started', last_run_id = v_run_id, updated_at = now() where id = v_job.id;

  if v_job.function_name = 'run_reward_issuance_job' then
    v_uuid_result := run_reward_issuance_job(coalesce((v_job.function_args->>'batch_size')::integer, 500), p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id));
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'release_mature_reward_lots' then
    v_uuid_result := release_mature_reward_lots(coalesce((v_job.function_args->>'batch_size')::integer, 500), p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id));
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_accounting_mirror_job' then
    v_uuid_result := run_accounting_mirror_job(coalesce((v_job.function_args->>'batch_size')::integer, 500), p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id));
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_withdrawal_reserve_job' then
    v_uuid_result := run_withdrawal_reserve_job(coalesce((v_job.function_args->>'batch_size')::integer, 100), p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id));
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_audit_hash_backfill_job' then
    v_uuid_result := run_audit_hash_backfill_job(coalesce((v_job.function_args->>'batch_size')::integer, 1000), p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id));
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'verify_audit_hash_chain' then
    v_uuid_result := verify_audit_hash_chain(coalesce(v_job.function_args->>'chain_key', 'global_audit_chain'), coalesce((v_job.function_args->>'batch_size')::integer, 100000), p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id));
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_observability_snapshot_job' then
    v_uuid_result := run_observability_snapshot_job(p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id));
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_payout_provider_event_processing_job' then
    v_uuid_result := run_payout_provider_event_processing_job(coalesce((v_job.function_args->>'batch_size')::integer, 500), p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id));
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_security_evidence_answer_sessions' then
    v_uuid_result := expire_admin_security_evidence_answer_sessions(coalesce((v_job.function_args->>'batch_size')::integer, 1000), 'scheduled-job', p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id));
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_security_answer_receipt_export_bundles' then
    v_uuid_result := expire_admin_security_answer_receipt_export_bundles(coalesce((v_job.function_args->>'batch_size')::integer, 1000), 'scheduled-job', p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id));
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'chain_admin_security_trust_timeline_events' then
    v_uuid_result := chain_admin_security_trust_timeline_events(coalesce((v_job.function_args->>'batch_size')::integer, 1000), 'scheduled-job', p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id));
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_customer_trust_proof_portal_sessions' then
    v_uuid_result := expire_customer_trust_proof_portal_sessions(coalesce((v_job.function_args->>'batch_size')::integer, 1000), 'scheduled-job', p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id));
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_security_trust_proof_reports' then
    v_uuid_result := expire_admin_security_trust_proof_reports(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  else
    raise exception 'scheduled function not allowlisted: %', v_job.function_name;
  end if;

  update scheduled_job_runs
  set status = 'completed',
      completed_at = now(),
      runtime_ms = (extract(epoch from (now() - v_started_at)) * 1000)::integer,
      result = v_result
  where id = v_run_id;

  update scheduled_jobs
  set last_completed_at = now(), last_status = 'completed', last_run_id = v_run_id, updated_at = now()
  where id = v_job.id;

  perform release_scheduled_job_lock(v_job.job_key);
  return v_run_id;
exception
  when others then
    if v_run_id is not null then
      update scheduled_job_runs
      set status = 'failed',
          failed_at = now(),
          runtime_ms = case when v_started_at is not null then (extract(epoch from (now() - v_started_at)) * 1000)::integer else null end,
          error_message = sqlerrm
      where id = v_run_id;
    end if;

    update scheduled_jobs
    set last_failed_at = now(), last_status = 'failed', last_run_id = v_run_id, updated_at = now()
    where job_key = p_job_key;

    perform release_scheduled_job_lock(p_job_key);
    raise;
end;
$$;

alter table admin_security_trust_proof_reports enable row level security;
alter table admin_security_trust_proof_report_sections enable row level security;
alter table admin_security_trust_proof_report_items enable row level security;
alter table admin_security_trust_proof_report_files enable row level security;
alter table admin_security_trust_proof_report_jobs enable row level security;

create policy admin_security_trust_proof_reports_no_user_direct_access on admin_security_trust_proof_reports for all to authenticated using (false) with check (false);
create policy admin_security_trust_proof_report_sections_no_user_direct_access on admin_security_trust_proof_report_sections for all to authenticated using (false) with check (false);
create policy admin_security_trust_proof_report_items_no_user_direct_access on admin_security_trust_proof_report_items for all to authenticated using (false) with check (false);
create policy admin_security_trust_proof_report_files_no_user_direct_access on admin_security_trust_proof_report_files for all to authenticated using (false) with check (false);
create policy admin_security_trust_proof_report_jobs_no_user_direct_access on admin_security_trust_proof_report_jobs for all to authenticated using (false) with check (false);

create policy admin_api_all_trust_proof_reports on admin_security_trust_proof_reports for all to admin_api_role using (true) with check (true);
create policy admin_api_all_trust_proof_report_sections on admin_security_trust_proof_report_sections for all to admin_api_role using (true) with check (true);
create policy admin_api_all_trust_proof_report_items on admin_security_trust_proof_report_items for all to admin_api_role using (true) with check (true);
create policy admin_api_all_trust_proof_report_files on admin_security_trust_proof_report_files for all to admin_api_role using (true) with check (true);
create policy admin_api_all_trust_proof_report_jobs on admin_security_trust_proof_report_jobs for all to admin_api_role using (true) with check (true);

create policy worker_all_trust_proof_reports on admin_security_trust_proof_reports for all to worker_role using (true) with check (true);
create policy worker_all_trust_proof_report_sections on admin_security_trust_proof_report_sections for all to worker_role using (true) with check (true);
create policy worker_all_trust_proof_report_items on admin_security_trust_proof_report_items for all to worker_role using (true) with check (true);
create policy worker_all_trust_proof_report_files on admin_security_trust_proof_report_files for all to worker_role using (true) with check (true);
create policy worker_all_trust_proof_report_jobs on admin_security_trust_proof_report_jobs for all to worker_role using (true) with check (true);

grant execute on function create_admin_security_trust_proof_report(text,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,timestamptz,text,jsonb) to admin_api_role;
grant execute on function create_private_room_trust_proof_report(uuid,text,text,timestamptz,timestamptz,text,jsonb) to admin_api_role;
grant execute on function claim_admin_security_trust_proof_report_jobs(integer,text,jsonb) to worker_role;
grant execute on function upsert_admin_security_trust_proof_report_section(uuid,text,text,text,text,text,jsonb,text,text,integer,integer,jsonb) to worker_role, admin_api_role;
grant execute on function upsert_admin_security_trust_proof_report_item(uuid,uuid,text,text,text,text,text,uuid,text,text,text,text,text,text,jsonb,text,integer,jsonb) to worker_role, admin_api_role;
grant execute on function upsert_admin_security_trust_proof_report_file(uuid,text,text,text,text,text,text,bigint,text,text,text,timestamptz,jsonb) to worker_role, admin_api_role;
grant execute on function complete_admin_security_trust_proof_report_build(uuid,uuid,jsonb,text,bigint,text,text,text,text,text,jsonb) to worker_role, admin_api_role;
grant execute on function fail_admin_security_trust_proof_report_build(uuid,uuid,text,text,jsonb) to worker_role, admin_api_role;
grant execute on function revoke_admin_security_trust_proof_report(uuid,uuid,text,text,jsonb) to admin_api_role;
grant execute on function expire_admin_security_trust_proof_reports(integer,text,jsonb) to admin_api_role, worker_role;
grant execute on function register_trust_proof_report_download_subject(uuid,text,jsonb) to admin_api_role, worker_role;

alter function create_admin_security_trust_proof_report(text,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,timestamptz,text,jsonb) security definer;
alter function create_admin_security_trust_proof_report(text,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,timestamptz,text,jsonb) set search_path = public;
alter function create_private_room_trust_proof_report(uuid,text,text,timestamptz,timestamptz,text,jsonb) security definer;
alter function create_private_room_trust_proof_report(uuid,text,text,timestamptz,timestamptz,text,jsonb) set search_path = public;
alter function claim_admin_security_trust_proof_report_jobs(integer,text,jsonb) security definer;
alter function claim_admin_security_trust_proof_report_jobs(integer,text,jsonb) set search_path = public;
alter function complete_admin_security_trust_proof_report_build(uuid,uuid,jsonb,text,bigint,text,text,text,text,text,jsonb) security definer;
alter function complete_admin_security_trust_proof_report_build(uuid,uuid,jsonb,text,bigint,text,text,text,text,text,jsonb) set search_path = public;
alter function fail_admin_security_trust_proof_report_build(uuid,uuid,text,text,jsonb) security definer;
alter function fail_admin_security_trust_proof_report_build(uuid,uuid,text,text,jsonb) set search_path = public;
alter function revoke_admin_security_trust_proof_report(uuid,uuid,text,text,jsonb) security definer;
alter function revoke_admin_security_trust_proof_report(uuid,uuid,text,text,jsonb) set search_path = public;
alter function expire_admin_security_trust_proof_reports(integer,text,jsonb) security definer;
alter function expire_admin_security_trust_proof_reports(integer,text,jsonb) set search_path = public;
alter function register_trust_proof_report_download_subject(uuid,text,jsonb) security definer;
alter function register_trust_proof_report_download_subject(uuid,text,jsonb) set search_path = public;

insert into error_catalog (
  error_code,category,severity,http_status,retryable,user_visible,user_message,internal_message,owner_team
)
values
  ('TRUST_PROOF_REPORT_NOT_FOUND','validation','medium',404,false,true,'Trust proof report not found.','Trust proof report not found.','platform'),
  ('TRUST_PROOF_REPORT_INVALID_STATE','validation','medium',409,true,true,'Trust proof report is not in a valid state.','Trust proof report invalid state.','platform'),
  ('TRUST_PROOF_REPORT_REQUIRED_FIELDS','validation','medium',400,false,true,'Trust proof report request requires complete fields.','Trust proof report required fields missing.','platform')
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

insert into error_mapping_rules (match_pattern,error_code,priority,metadata)
values
  ('trust proof report not found', 'TRUST_PROOF_REPORT_NOT_FOUND', 5, '{}'::jsonb),
  ('trust proof report cannot complete from status', 'TRUST_PROOF_REPORT_INVALID_STATE', 5, '{}'::jsonb),
  ('trust proof report is not ready', 'TRUST_PROOF_REPORT_INVALID_STATE', 5, '{}'::jsonb),
  ('trust proof report has no storage uri', 'TRUST_PROOF_REPORT_INVALID_STATE', 5, '{}'::jsonb),
  ('trust proof report id is required', 'TRUST_PROOF_REPORT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust proof report section key is required', 'TRUST_PROOF_REPORT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust proof report section title is required', 'TRUST_PROOF_REPORT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust proof report item key is required', 'TRUST_PROOF_REPORT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust proof report item title is required', 'TRUST_PROOF_REPORT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust proof report file key is required', 'TRUST_PROOF_REPORT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust proof report filename is required', 'TRUST_PROOF_REPORT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust proof report payload is required', 'TRUST_PROOF_REPORT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust proof report hash is required', 'TRUST_PROOF_REPORT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust proof report build error is required', 'TRUST_PROOF_REPORT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust proof report revocation reason is required', 'TRUST_PROOF_REPORT_REQUIRED_FIELDS', 5, '{}'::jsonb)
on conflict do nothing;
