-- Step 9.77 — Build proof QR / deep-link system v2
-- Runs after 191_admin_security_public_verification_center_v2.sql

create table if not exists admin_security_proof_verification_links (
  id uuid primary key default gen_random_uuid(),
  verification_link_key text not null unique,
  status text not null default 'active',
  proof_type text not null,
  proof_id uuid,
  proof_key text not null,
  proof_hash_sha256 text,
  proof_signature text,
  verification_type text not null,
  title text not null,
  summary text,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  visibility text not null default 'public',
  sensitivity text not null default 'customer_confidential',
  verification_url text,
  short_code text not null unique,
  token_hash_sha256 text not null,
  token_prefix text not null,
  allow_anonymous_verification boolean not null default true,
  require_hash_input boolean not null default false,
  auto_submit_verification boolean not null default true,
  max_uses integer,
  use_count integer not null default 0,
  expires_at timestamptz default (now() + interval '180 days'),
  revoked_at timestamptz,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id),
  revocation_reason text,
  last_used_at timestamptz,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_proof_verification_links_status_check
    check (status in ('active','paused','expired','revoked','exhausted','archived')),
  constraint admin_security_proof_verification_links_type_check
    check (proof_type in ('answer_receipt','answer_receipt_export_bundle','trust_proof_report','trust_timeline_snapshot','timeline_chain_checkpoint','timeline_merkle_batch','timeline_anchor','timeline_chain','other')),
  constraint admin_security_proof_verification_links_verification_type_check
    check (verification_type in ('answer_receipt','answer_receipt_export_bundle','trust_proof_report','trust_timeline_snapshot','timeline_chain_checkpoint','timeline_merkle_batch','timeline_anchor','timeline_chain','unknown')),
  constraint admin_security_proof_verification_links_visibility_check
    check (visibility in ('public','customer_scoped','private_room_scoped','auditor_scoped','enterprise_review_room','admin_only')),
  constraint admin_security_proof_verification_links_sensitivity_check
    check (sensitivity in ('public','customer_confidential','restricted','legal_sensitive','security_sensitive')),
  constraint admin_security_proof_verification_links_title_check
    check (length(trim(title)) > 0)
);

create index if not exists admin_security_proof_verification_links_proof_idx
on admin_security_proof_verification_links (proof_type, proof_id);
create index if not exists admin_security_proof_verification_links_key_idx
on admin_security_proof_verification_links (proof_key);
create index if not exists admin_security_proof_verification_links_status_idx
on admin_security_proof_verification_links (status, expires_at);
create index if not exists admin_security_proof_verification_links_short_code_idx
on admin_security_proof_verification_links (short_code);
create index if not exists admin_security_proof_verification_links_private_room_idx
on admin_security_proof_verification_links (private_room_id, status);

drop trigger if exists admin_security_proof_verification_links_set_updated_at
on admin_security_proof_verification_links;
create trigger admin_security_proof_verification_links_set_updated_at
before update on admin_security_proof_verification_links
for each row
execute function set_updated_at();

create table if not exists admin_security_proof_qr_codes (
  id uuid primary key default gen_random_uuid(),
  qr_code_key text not null unique,
  status text not null default 'pending',
  verification_link_id uuid not null references admin_security_proof_verification_links(id) on delete cascade,
  proof_type text not null,
  proof_key text not null,
  qr_format text not null default 'svg',
  title text not null,
  summary text,
  qr_payload text not null,
  qr_payload_hash_sha256 text not null,
  image_storage_uri text,
  image_checksum_sha256 text,
  image_payload_bytes bigint,
  size_px integer not null default 512,
  foreground_color text default '#000000',
  background_color text default '#ffffff',
  include_logo boolean not null default false,
  generated_at timestamptz,
  failed_at timestamptz,
  last_error text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_proof_qr_codes_status_check
    check (status in ('pending','generating','ready','failed','revoked','expired','archived')),
  constraint admin_security_proof_qr_codes_format_check
    check (qr_format in ('svg','png','webp','pdf','json')),
  constraint admin_security_proof_qr_codes_title_check
    check (length(trim(title)) > 0)
);

create index if not exists admin_security_proof_qr_codes_link_idx
on admin_security_proof_qr_codes (verification_link_id, status);
create index if not exists admin_security_proof_qr_codes_proof_idx
on admin_security_proof_qr_codes (proof_type, proof_key);
create index if not exists admin_security_proof_qr_codes_status_idx
on admin_security_proof_qr_codes (status, created_at);

drop trigger if exists admin_security_proof_qr_codes_set_updated_at
on admin_security_proof_qr_codes;
create trigger admin_security_proof_qr_codes_set_updated_at
before update on admin_security_proof_qr_codes
for each row
execute function set_updated_at();

create table if not exists admin_security_proof_qr_code_jobs (
  id uuid primary key default gen_random_uuid(),
  qr_job_key text not null unique,
  status text not null default 'pending',
  qr_code_id uuid not null references admin_security_proof_qr_codes(id) on delete cascade,
  verification_link_id uuid not null references admin_security_proof_verification_links(id) on delete cascade,
  qr_format text not null default 'svg',
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  worker_id text,
  last_error text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_proof_qr_code_jobs_status_check
    check (status in ('pending','processing','completed','failed','cancelled','archived'))
);

create index if not exists admin_security_proof_qr_code_jobs_status_idx
on admin_security_proof_qr_code_jobs (status, created_at);
create index if not exists admin_security_proof_qr_code_jobs_qr_idx
on admin_security_proof_qr_code_jobs (qr_code_id, status);

drop trigger if exists admin_security_proof_qr_code_jobs_set_updated_at
on admin_security_proof_qr_code_jobs;
create trigger admin_security_proof_qr_code_jobs_set_updated_at
before update on admin_security_proof_qr_code_jobs
for each row
execute function set_updated_at();

create table if not exists admin_security_proof_verification_link_events (
  id uuid primary key default gen_random_uuid(),
  verification_link_event_key text not null unique,
  verification_link_id uuid references admin_security_proof_verification_links(id) on delete set null,
  qr_code_id uuid references admin_security_proof_qr_codes(id) on delete set null,
  event_type text not null,
  event_action text not null,
  status text not null default 'recorded',
  short_code text,
  proof_type text,
  proof_key text,
  requester_auth_user_id uuid,
  requester_email text,
  requester_ip inet,
  user_agent text,
  referrer text,
  resolved_url text,
  public_verification_submission_id uuid references admin_security_public_verification_submissions(id) on delete set null,
  public_verification_result_id uuid references admin_security_public_verification_results(id) on delete set null,
  verification_status text,
  verified boolean,
  failure_reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_proof_verification_link_events_type_check
    check (event_type in ('link_created','qr_created','qr_generated','link_opened','link_resolved','verification_started','verification_completed','verification_failed','link_revoked','link_expired','rate_limited','error','other')),
  constraint admin_security_proof_verification_link_events_status_check
    check (status in ('recorded','allowed','denied','failed','archived'))
);

create index if not exists admin_security_proof_verification_link_events_link_idx
on admin_security_proof_verification_link_events (verification_link_id, created_at desc);
create index if not exists admin_security_proof_verification_link_events_short_code_idx
on admin_security_proof_verification_link_events (short_code, created_at desc);
create index if not exists admin_security_proof_verification_link_events_result_idx
on admin_security_proof_verification_link_events (public_verification_result_id);

create or replace function resolve_admin_security_proof_source_for_verification_link(
  p_proof_type text,
  p_proof_id uuid default null,
  p_proof_key text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_receipt admin_security_answer_receipts%rowtype;
  v_bundle admin_security_answer_receipt_export_bundles%rowtype;
  v_report admin_security_trust_proof_reports%rowtype;
  v_snapshot admin_security_trust_timeline_snapshots%rowtype;
  v_checkpoint admin_security_trust_timeline_chain_checkpoints%rowtype;
  v_merkle admin_security_trust_timeline_merkle_batches%rowtype;
  v_anchor admin_security_trust_timeline_anchors%rowtype;
begin
  if p_proof_type = 'answer_receipt' then
    select * into v_receipt from admin_security_answer_receipts
    where (p_proof_id is not null and id = p_proof_id)
       or (p_proof_key is not null and receipt_key = p_proof_key)
    limit 1;
    if v_receipt.id is null then
      raise exception 'proof source not found: %', p_proof_type;
    end if;
    return jsonb_build_object(
      'proofType', 'answer_receipt',
      'verificationType', 'answer_receipt',
      'proofId', v_receipt.id,
      'proofKey', v_receipt.receipt_key,
      'proofHashSha256', v_receipt.receipt_hash_sha256,
      'proofSignature', v_receipt.signature,
      'status', v_receipt.status,
      'title', 'Answer Receipt',
      'summary', left(coalesce(v_receipt.question_text, ''), 500),
      'customerName', v_receipt.customer_name,
      'customerDomain', v_receipt.customer_domain,
      'privateRoomId', v_receipt.private_room_id,
      'auditorPortalId', v_receipt.auditor_portal_id,
      'enterpriseReviewRoomId', v_receipt.enterprise_review_room_id
    );
  end if;

  if p_proof_type = 'answer_receipt_export_bundle' then
    select * into v_bundle from admin_security_answer_receipt_export_bundles
    where (p_proof_id is not null and id = p_proof_id)
       or (p_proof_key is not null and bundle_key = p_proof_key)
    limit 1;
    if v_bundle.id is null then
      raise exception 'proof source not found: %', p_proof_type;
    end if;
    return jsonb_build_object(
      'proofType', 'answer_receipt_export_bundle',
      'verificationType', 'answer_receipt_export_bundle',
      'proofId', v_bundle.id,
      'proofKey', v_bundle.bundle_key,
      'proofHashSha256', v_bundle.bundle_checksum_sha256,
      'proofSignature', v_bundle.signature,
      'status', v_bundle.status,
      'title', v_bundle.title,
      'summary', v_bundle.summary,
      'customerName', v_bundle.customer_name,
      'customerDomain', v_bundle.customer_domain,
      'privateRoomId', v_bundle.private_room_id,
      'auditorPortalId', v_bundle.auditor_portal_id,
      'enterpriseReviewRoomId', v_bundle.enterprise_review_room_id
    );
  end if;

  if p_proof_type = 'trust_proof_report' then
    select * into v_report from admin_security_trust_proof_reports
    where (p_proof_id is not null and id = p_proof_id)
       or (p_proof_key is not null and report_key = p_proof_key)
    limit 1;
    if v_report.id is null then
      raise exception 'proof source not found: %', p_proof_type;
    end if;
    return jsonb_build_object(
      'proofType', 'trust_proof_report',
      'verificationType', 'trust_proof_report',
      'proofId', v_report.id,
      'proofKey', v_report.report_key,
      'proofHashSha256', v_report.report_hash_sha256,
      'proofSignature', v_report.signature,
      'status', v_report.status,
      'title', v_report.title,
      'summary', v_report.executive_summary,
      'customerName', v_report.customer_name,
      'customerDomain', v_report.customer_domain,
      'privateRoomId', v_report.private_room_id,
      'auditorPortalId', v_report.auditor_portal_id,
      'enterpriseReviewRoomId', v_report.enterprise_review_room_id
    );
  end if;

  if p_proof_type = 'trust_timeline_snapshot' then
    select * into v_snapshot from admin_security_trust_timeline_snapshots
    where (p_proof_id is not null and id = p_proof_id)
       or (p_proof_key is not null and snapshot_key = p_proof_key)
    limit 1;
    if v_snapshot.id is null then
      raise exception 'proof source not found: %', p_proof_type;
    end if;
    return jsonb_build_object(
      'proofType', 'trust_timeline_snapshot',
      'verificationType', 'trust_timeline_snapshot',
      'proofId', v_snapshot.id,
      'proofKey', v_snapshot.snapshot_key,
      'proofHashSha256', v_snapshot.snapshot_hash_sha256,
      'proofSignature', v_snapshot.signature,
      'status', v_snapshot.status,
      'title', v_snapshot.title,
      'summary', v_snapshot.summary,
      'customerName', v_snapshot.customer_name,
      'customerDomain', v_snapshot.customer_domain,
      'privateRoomId', v_snapshot.private_room_id,
      'auditorPortalId', v_snapshot.auditor_portal_id,
      'enterpriseReviewRoomId', v_snapshot.enterprise_review_room_id
    );
  end if;

  if p_proof_type = 'timeline_chain_checkpoint' then
    select * into v_checkpoint from admin_security_trust_timeline_chain_checkpoints
    where (p_proof_id is not null and id = p_proof_id)
       or (p_proof_key is not null and checkpoint_key = p_proof_key)
    limit 1;
    if v_checkpoint.id is null then
      raise exception 'proof source not found: %', p_proof_type;
    end if;
    return jsonb_build_object(
      'proofType', 'timeline_chain_checkpoint',
      'verificationType', 'timeline_chain_checkpoint',
      'proofId', v_checkpoint.id,
      'proofKey', v_checkpoint.checkpoint_key,
      'proofHashSha256', v_checkpoint.checkpoint_hash_sha256,
      'proofSignature', v_checkpoint.signature,
      'status', v_checkpoint.status,
      'title', 'Timeline Chain Checkpoint',
      'summary', 'Checkpoint sequence ' || v_checkpoint.sequence_number::text,
      'customerName', null,
      'customerDomain', null,
      'privateRoomId', null,
      'auditorPortalId', null,
      'enterpriseReviewRoomId', null
    );
  end if;

  if p_proof_type = 'timeline_merkle_batch' then
    select * into v_merkle from admin_security_trust_timeline_merkle_batches
    where (p_proof_id is not null and id = p_proof_id)
       or (p_proof_key is not null and merkle_batch_key = p_proof_key)
    limit 1;
    if v_merkle.id is null then
      raise exception 'proof source not found: %', p_proof_type;
    end if;
    return jsonb_build_object(
      'proofType', 'timeline_merkle_batch',
      'verificationType', 'timeline_merkle_batch',
      'proofId', v_merkle.id,
      'proofKey', v_merkle.merkle_batch_key,
      'proofHashSha256', v_merkle.merkle_root_sha256,
      'proofSignature', v_merkle.signature,
      'status', v_merkle.status,
      'title', 'Timeline Merkle Batch',
      'summary', 'Merkle root with ' || v_merkle.leaf_count::text || ' leaves.',
      'customerName', null,
      'customerDomain', null,
      'privateRoomId', null,
      'auditorPortalId', null,
      'enterpriseReviewRoomId', null
    );
  end if;

  if p_proof_type = 'timeline_anchor' then
    select * into v_anchor from admin_security_trust_timeline_anchors
    where (p_proof_id is not null and id = p_proof_id)
       or (p_proof_key is not null and anchor_key = p_proof_key)
    limit 1;
    if v_anchor.id is null then
      raise exception 'proof source not found: %', p_proof_type;
    end if;
    return jsonb_build_object(
      'proofType', 'timeline_anchor',
      'verificationType', 'timeline_anchor',
      'proofId', v_anchor.id,
      'proofKey', v_anchor.anchor_key,
      'proofHashSha256', v_anchor.anchored_hash_sha256,
      'proofSignature', v_anchor.signature,
      'status', v_anchor.status,
      'title', 'Timeline Anchor',
      'summary', 'Anchor type: ' || v_anchor.anchor_type,
      'customerName', null,
      'customerDomain', null,
      'privateRoomId', null,
      'auditorPortalId', null,
      'enterpriseReviewRoomId', null
    );
  end if;

  raise exception 'unsupported proof type for verification link: %', p_proof_type;
end;
$$;

create or replace function record_admin_security_proof_verification_link_event(
  p_verification_link_id uuid,
  p_qr_code_id uuid,
  p_event_type text,
  p_event_action text,
  p_status text default 'recorded',
  p_short_code text default null,
  p_proof_type text default null,
  p_proof_key text default null,
  p_requester_auth_user_id uuid default null,
  p_requester_email text default null,
  p_requester_ip inet default null,
  p_user_agent text default null,
  p_referrer text default null,
  p_resolved_url text default null,
  p_public_verification_submission_id uuid default null,
  p_public_verification_result_id uuid default null,
  p_verification_status text default null,
  p_verified boolean default null,
  p_failure_reason text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event_id uuid;
  v_event_key text;
begin
  v_event_key := 'proof_verification_link_event:' || coalesce(p_event_type, 'event') || ':' || substr(encode(gen_random_bytes(12), 'hex'), 1, 24);
  insert into admin_security_proof_verification_link_events (
    verification_link_event_key,verification_link_id,qr_code_id,event_type,event_action,status,short_code,proof_type,proof_key,
    requester_auth_user_id,requester_email,requester_ip,user_agent,referrer,resolved_url,public_verification_submission_id,
    public_verification_result_id,verification_status,verified,failure_reason,request_id,metadata
  )
  values (
    v_event_key,p_verification_link_id,p_qr_code_id,p_event_type,p_event_action,coalesce(p_status, 'recorded'),
    p_short_code,p_proof_type,p_proof_key,p_requester_auth_user_id,lower(trim(p_requester_email)),p_requester_ip,p_user_agent,
    p_referrer,p_resolved_url,p_public_verification_submission_id,p_public_verification_result_id,p_verification_status,p_verified,
    p_failure_reason,p_request_id,coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;
  return v_event_id;
end;
$$;

create or replace function create_admin_security_proof_verification_link(
  p_proof_type text,
  p_proof_id uuid default null,
  p_proof_key text default null,
  p_title text default null,
  p_summary text default null,
  p_base_url text default 'https://example.com/verify',
  p_expires_at timestamptz default null,
  p_max_uses integer default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_source jsonb;
  v_link_id uuid;
  v_link_key text;
  v_short_code text;
  v_raw_token text;
  v_token_hash text;
  v_token_prefix text;
  v_verification_url text;
begin
  v_source := resolve_admin_security_proof_source_for_verification_link(p_proof_type, p_proof_id, p_proof_key);

  if nullif(v_source->>'proofHashSha256', '') is null then
    raise exception 'proof source missing hash for verification link';
  end if;

  v_short_code := lower(substr(encode(gen_random_bytes(9), 'base64'), 1, 12));
  v_short_code := regexp_replace(v_short_code, '[^a-z0-9]', '', 'g');
  if length(v_short_code) < 8 then
    v_short_code := substr(encode(gen_random_bytes(8), 'hex'), 1, 12);
  end if;

  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');
  v_token_prefix := substr(v_raw_token, 1, 12);
  v_link_key := 'proof_verification_link:' || (v_source->>'proofType') || ':' || substr(encode(gen_random_bytes(12), 'hex'), 1, 24);
  v_verification_url := rtrim(coalesce(p_base_url, 'https://example.com/verify'), '/') || '?code=' || v_short_code || '&token=' || v_raw_token;

  insert into admin_security_proof_verification_links (
    verification_link_key,status,proof_type,proof_id,proof_key,proof_hash_sha256,proof_signature,verification_type,title,summary,
    customer_name,customer_domain,private_room_id,auditor_portal_id,enterprise_review_room_id,visibility,sensitivity,verification_url,
    short_code,token_hash_sha256,token_prefix,allow_anonymous_verification,require_hash_input,auto_submit_verification,max_uses,
    expires_at,request_id,metadata
  )
  values (
    v_link_key,'active',v_source->>'proofType',nullif(v_source->>'proofId', '')::uuid,v_source->>'proofKey',v_source->>'proofHashSha256',
    v_source->>'proofSignature',v_source->>'verificationType',coalesce(p_title, v_source->>'title'),coalesce(p_summary, v_source->>'summary'),
    v_source->>'customerName',v_source->>'customerDomain',nullif(v_source->>'privateRoomId', '')::uuid,nullif(v_source->>'auditorPortalId', '')::uuid,
    nullif(v_source->>'enterpriseReviewRoomId', '')::uuid,
    case when (v_source->>'proofType') in ('timeline_chain_checkpoint','timeline_merkle_batch','timeline_anchor') then 'public' else 'customer_scoped' end,
    case when (v_source->>'proofType') in ('timeline_chain_checkpoint','timeline_merkle_batch','timeline_anchor') then 'public' else 'customer_confidential' end,
    v_verification_url,v_short_code,v_token_hash,v_token_prefix,true,false,true,p_max_uses,coalesce(p_expires_at, now() + interval '180 days'),
    p_request_id,coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_link_id;

  perform record_admin_security_proof_verification_link_event(
    v_link_id,null,'link_created','created','recorded',v_short_code,v_source->>'proofType',v_source->>'proofKey',
    null,null,null,null,null,v_verification_url,null,null,null,null,null,p_request_id,coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'verificationLinkId', v_link_id,
    'verificationLinkKey', v_link_key,
    'shortCode', v_short_code,
    'verificationUrl', v_verification_url,
    'token', v_raw_token,
    'tokenPrefix', v_token_prefix,
    'proofType', v_source->>'proofType',
    'proofKey', v_source->>'proofKey',
    'proofHashSha256', v_source->>'proofHashSha256'
  );
end;
$$;

create or replace function create_admin_security_proof_qr_code(
  p_verification_link_id uuid,
  p_qr_format text default 'svg',
  p_size_px integer default 512,
  p_include_logo boolean default false,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_link admin_security_proof_verification_links%rowtype;
  v_qr_id uuid;
  v_qr_key text;
begin
  select * into v_link from admin_security_proof_verification_links where id = p_verification_link_id;
  if v_link.id is null then
    raise exception 'proof verification link not found: %', p_verification_link_id;
  end if;
  if v_link.status <> 'active' then
    raise exception 'proof verification link is not active: %', v_link.status;
  end if;
  if p_size_px < 128 or p_size_px > 2048 then
    raise exception 'proof qr code size must be between 128 and 2048';
  end if;

  v_qr_key := 'proof_qr_code:' || v_link.short_code || ':' || substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_proof_qr_codes (
    qr_code_key,status,verification_link_id,proof_type,proof_key,qr_format,title,summary,qr_payload,qr_payload_hash_sha256,size_px,
    include_logo,request_id,metadata
  )
  values (
    v_qr_key,'pending',v_link.id,v_link.proof_type,v_link.proof_key,coalesce(p_qr_format, 'svg'),'Verification QR — ' || v_link.title,
    'QR code for public verification link.',v_link.verification_url,encode(digest(v_link.verification_url, 'sha256'), 'hex'),
    coalesce(p_size_px, 512),coalesce(p_include_logo, false),p_request_id,coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_qr_id;

  insert into admin_security_proof_qr_code_jobs (
    qr_job_key,status,qr_code_id,verification_link_id,qr_format,request_id,metadata
  )
  values (
    'proof_qr_code_job:' || v_qr_key || ':' || substr(encode(gen_random_bytes(8), 'hex'), 1, 16),
    'pending',v_qr_id,v_link.id,coalesce(p_qr_format, 'svg'),p_request_id,coalesce(p_metadata, '{}'::jsonb)
  );

  perform record_admin_security_proof_verification_link_event(
    v_link.id,v_qr_id,'qr_created','created','recorded',v_link.short_code,v_link.proof_type,v_link.proof_key,
    null,null,null,null,null,v_link.verification_url,null,null,null,null,null,p_request_id,coalesce(p_metadata, '{}'::jsonb)
  );

  return v_qr_id;
end;
$$;

create or replace function claim_admin_security_proof_qr_code_jobs(
  p_batch_size integer default 10,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  qr_job_id uuid,
  qr_code_id uuid,
  verification_link_id uuid,
  qr_code_key text,
  verification_link_key text,
  qr_format text,
  qr_payload text,
  size_px integer,
  include_logo boolean,
  proof_type text,
  proof_key text
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
    from admin_security_proof_qr_code_jobs j
    join admin_security_proof_qr_codes q on q.id = j.qr_code_id
    join admin_security_proof_verification_links l on l.id = j.verification_link_id
    where j.status in ('pending', 'failed')
      and q.status in ('pending', 'failed')
      and l.status = 'active'
    order by j.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated_jobs as (
    update admin_security_proof_qr_code_jobs j
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
  )
  update admin_security_proof_qr_codes q
  set
    status = 'generating',
    metadata = q.metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  from updated_jobs uj
  where q.id = uj.qr_code_id
  returning
    uj.id,
    q.id,
    uj.verification_link_id,
    q.qr_code_key,
    (select l.verification_link_key from admin_security_proof_verification_links l where l.id = uj.verification_link_id),
    uj.qr_format,
    q.qr_payload,
    q.size_px,
    q.include_logo,
    q.proof_type,
    q.proof_key;
end;
$$;

create or replace function complete_admin_security_proof_qr_code_generation(
  p_qr_code_id uuid,
  p_qr_job_id uuid,
  p_image_storage_uri text,
  p_image_checksum_sha256 text,
  p_image_payload_bytes bigint,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_qr admin_security_proof_qr_codes%rowtype;
begin
  select * into v_qr from admin_security_proof_qr_codes where id = p_qr_code_id for update;
  if v_qr.id is null then
    raise exception 'proof qr code not found: %', p_qr_code_id;
  end if;
  if v_qr.status <> 'generating' then
    raise exception 'proof qr code cannot complete from status: %', v_qr.status;
  end if;

  update admin_security_proof_qr_codes
  set
    status = 'ready',
    image_storage_uri = p_image_storage_uri,
    image_checksum_sha256 = p_image_checksum_sha256,
    image_payload_bytes = p_image_payload_bytes,
    generated_at = now(),
    last_error = null,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('generated_by_worker', p_worker_id),
    updated_at = now()
  where id = v_qr.id;

  update admin_security_proof_qr_code_jobs
  set
    status = 'completed',
    completed_at = now(),
    worker_id = p_worker_id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_qr_job_id;

  perform record_admin_security_proof_verification_link_event(
    v_qr.verification_link_id,v_qr.id,'qr_generated','generated','recorded',null,v_qr.proof_type,v_qr.proof_key,
    null,null,null,null,null,v_qr.qr_payload,null,null,null,null,null,null,coalesce(p_metadata, '{}'::jsonb)
  );

  return v_qr.id;
end;
$$;

create or replace function fail_admin_security_proof_qr_code_generation(
  p_qr_code_id uuid,
  p_qr_job_id uuid,
  p_error text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'proof qr code generation error is required';
  end if;

  update admin_security_proof_qr_codes
  set status = 'failed', failed_at = now(), last_error = p_error, metadata = metadata || coalesce(p_metadata, '{}'::jsonb), updated_at = now()
  where id = p_qr_code_id;
  if not found then
    raise exception 'proof qr code not found: %', p_qr_code_id;
  end if;

  update admin_security_proof_qr_code_jobs
  set status = 'failed', failed_at = now(), last_error = p_error, worker_id = p_worker_id, metadata = metadata || coalesce(p_metadata, '{}'::jsonb), updated_at = now()
  where id = p_qr_job_id;

  return p_qr_code_id;
end;
$$;

create or replace function resolve_public_proof_verification_link(
  p_short_code text,
  p_token text,
  p_requester_ip inet default null,
  p_user_agent text default null,
  p_referrer text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_token_hash text;
  v_link admin_security_proof_verification_links%rowtype;
  v_result jsonb;
  v_result_key text;
  v_submission_key text;
  v_submission_id uuid;
  v_result_id uuid;
begin
  if p_short_code is null or length(trim(p_short_code)) = 0 then
    raise exception 'proof verification short code is required';
  end if;
  if p_token is null or length(trim(p_token)) < 32 then
    raise exception 'proof verification token is required';
  end if;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');
  select * into v_link
  from admin_security_proof_verification_links
  where short_code = p_short_code and token_hash_sha256 = v_token_hash;

  if v_link.id is null then
    perform record_admin_security_proof_verification_link_event(
      null,null,'link_opened','invalid_token','denied',p_short_code,null,null,null,null,p_requester_ip,p_user_agent,p_referrer,null,
      null,null,null,false,'proof verification link invalid',p_request_id,coalesce(p_metadata, '{}'::jsonb)
    );
    raise exception 'proof verification link invalid';
  end if;

  if v_link.status = 'revoked' then raise exception 'proof verification link revoked'; end if;
  if v_link.status = 'paused' then raise exception 'proof verification link paused'; end if;

  if v_link.expires_at is not null and v_link.expires_at <= now() then
    update admin_security_proof_verification_links set status = 'expired', updated_at = now() where id = v_link.id;
    raise exception 'proof verification link expired';
  end if;

  if v_link.max_uses is not null and v_link.use_count >= v_link.max_uses then
    update admin_security_proof_verification_links set status = 'exhausted', updated_at = now() where id = v_link.id;
    raise exception 'proof verification link exhausted';
  end if;

  update admin_security_proof_verification_links
  set use_count = use_count + 1, last_used_at = now(), updated_at = now()
  where id = v_link.id;

  perform record_admin_security_proof_verification_link_event(
    v_link.id,null,'link_opened','resolved','allowed',v_link.short_code,v_link.proof_type,v_link.proof_key,
    null,null,p_requester_ip,p_user_agent,p_referrer,v_link.verification_url,null,null,null,null,null,p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  if v_link.auto_submit_verification is true then
    v_result := public_verify_trust_proof(
      v_link.verification_type,
      v_link.proof_key,
      v_link.proof_hash_sha256,
      v_link.proof_signature,
      jsonb_build_object('source', 'proof_verification_link', 'verificationLinkKey', v_link.verification_link_key),
      null,
      null,
      p_requester_ip,
      p_user_agent,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_submission_key := v_result->>'submissionKey';
    v_result_key := v_result->>'resultKey';
    select id into v_submission_id from admin_security_public_verification_submissions where submission_key = v_submission_key;
    select id into v_result_id from admin_security_public_verification_results where result_key = v_result_key;

    perform record_admin_security_proof_verification_link_event(
      v_link.id,null,
      case when (v_result->>'verified')::boolean then 'verification_completed' else 'verification_failed' end,
      'auto_submitted',
      case when (v_result->>'verified')::boolean then 'allowed' else 'failed' end,
      v_link.short_code,v_link.proof_type,v_link.proof_key,null,null,p_requester_ip,p_user_agent,p_referrer,v_link.verification_url,
      v_submission_id,v_result_id,v_result->>'verificationStatus',(v_result->>'verified')::boolean,v_result->>'failureReason',p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );
  else
    v_result := null;
  end if;

  return jsonb_build_object(
    'verificationLinkKey', v_link.verification_link_key,
    'shortCode', v_link.short_code,
    'proofType', v_link.proof_type,
    'proofKey', v_link.proof_key,
    'proofHashSha256', v_link.proof_hash_sha256,
    'verificationType', v_link.verification_type,
    'title', v_link.title,
    'summary', v_link.summary,
    'customerName', v_link.customer_name,
    'customerDomain', v_link.customer_domain,
    'autoSubmitVerification', v_link.auto_submit_verification,
    'verificationResult', v_result
  );
end;
$$;

create or replace function revoke_admin_security_proof_verification_link(
  p_admin_auth_user_id uuid,
  p_verification_link_id uuid,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_link admin_security_proof_verification_links%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'proof verification link revocation reason is required';
  end if;
  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_proof_verification_links
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoked_by_admin_user_id = v_admin.id,
    revocation_reason = p_reason,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_verification_link_id and status in ('active', 'paused')
  returning * into v_link;

  if v_link.id is null then
    raise exception 'proof verification link not found: %', p_verification_link_id;
  end if;

  update admin_security_proof_qr_codes
  set status = 'revoked', updated_at = now()
  where verification_link_id = v_link.id and status in ('pending', 'generating', 'ready', 'failed');

  perform record_admin_security_proof_verification_link_event(
    v_link.id,null,'link_revoked','revoked','recorded',v_link.short_code,v_link.proof_type,v_link.proof_key,p_admin_auth_user_id,
    v_admin.email,null,null,null,v_link.verification_url,null,null,null,null,p_reason,p_request_id,coalesce(p_metadata, '{}'::jsonb)
  );

  perform record_admin_action(
    p_admin_auth_user_id,'revoke_admin_security_proof_verification_link','admin.write','admin_security_proof_verification_link',v_link.id,
    p_request_id,null,null,'allowed',p_reason,coalesce(p_metadata, '{}'::jsonb)
  );

  return v_link.id;
end;
$$;

create or replace function expire_admin_security_proof_verification_links(
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
    update admin_security_proof_verification_links
    set
      status = case when max_uses is not null and use_count >= max_uses then 'exhausted' else 'expired' end,
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'expired_by_worker', p_worker_id,
        'proof_verification_link_expiry_run_id', v_run_id
      ),
      updated_at = now()
    where id in (
      select id
      from admin_security_proof_verification_links
      where status in ('active', 'paused')
        and (
          (expires_at is not null and expires_at <= now())
          or (max_uses is not null and use_count >= max_uses)
        )
      order by expires_at asc nulls last
      limit p_batch_size
      for update skip locked
    )
    returning *
  loop
    update admin_security_proof_qr_codes
    set status = 'expired', updated_at = now()
    where verification_link_id = v_row.id and status in ('pending', 'generating', 'ready', 'failed');

    perform record_admin_security_proof_verification_link_event(
      v_row.id,null,'link_expired',v_row.status,'recorded',v_row.short_code,v_row.proof_type,v_row.proof_key,
      null,null,null,null,null,v_row.verification_url,null,null,null,null,null,null,
      jsonb_build_object('expiry_run_id', v_run_id, 'worker_id', p_worker_id)
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function register_proof_qr_code_download_subject(
  p_qr_code_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_qr admin_security_proof_qr_codes%rowtype;
  v_link admin_security_proof_verification_links%rowtype;
  v_subject_id uuid;
begin
  select * into v_qr from admin_security_proof_qr_codes where id = p_qr_code_id;
  if v_qr.id is null then
    raise exception 'proof qr code not found: %', p_qr_code_id;
  end if;
  if v_qr.status <> 'ready' then
    raise exception 'proof qr code is not ready: %', v_qr.status;
  end if;

  select * into v_link from admin_security_proof_verification_links where id = v_qr.verification_link_id;

  v_subject_id := register_admin_security_artifact_download_subject(
    'admin_security_proof_qr_code',
    v_qr.id,
    'security_document',
    v_qr.qr_code_key,
    v_qr.title,
    v_qr.summary,
    v_qr.image_storage_uri,
    v_qr.image_checksum_sha256,
    v_qr.image_payload_bytes,
    null,
    null,
    null,
    v_qr.generated_at,
    v_link.visibility,
    v_link.sensitivity,
    true,
    true,
    v_link.visibility <> 'public',
    v_link.visibility = 'public',
    v_link.expires_at,
    v_link.customer_name,
    v_link.customer_domain,
    v_link.private_room_id,
    v_link.auditor_portal_id,
    v_link.enterprise_review_room_id,
    p_request_id,
    '{}'::jsonb,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'proof_qr_code')
  );

  return v_subject_id;
end;
$$;

create or replace view admin_security_proof_verification_link_dashboard as
select
  l.id as admin_security_proof_verification_link_id,
  l.verification_link_key,l.status,l.proof_type,l.proof_id,l.proof_key,l.proof_hash_sha256,l.verification_type,l.title,l.summary,
  l.customer_name,l.customer_domain,l.private_room_id,pr.private_room_key,l.auditor_portal_id,ap.portal_key as auditor_portal_key,
  l.enterprise_review_room_id,er.room_key as enterprise_review_room_key,l.visibility,l.sensitivity,l.verification_url,l.short_code,
  l.token_prefix,l.allow_anonymous_verification,l.require_hash_input,l.auto_submit_verification,l.max_uses,l.use_count,l.expires_at,
  l.revoked_at,revoker.email as revoked_by_email,l.revocation_reason,l.last_used_at,
  (select count(*) from admin_security_proof_qr_codes q where q.verification_link_id = l.id) as qr_code_count,
  (select count(*) from admin_security_proof_verification_link_events e where e.verification_link_id = l.id) as event_count,
  l.created_at,l.updated_at,l.metadata
from admin_security_proof_verification_links l
left join admin_security_private_trust_rooms pr on pr.id = l.private_room_id
left join admin_security_auditor_portals ap on ap.id = l.auditor_portal_id
left join admin_security_enterprise_review_rooms er on er.id = l.enterprise_review_room_id
left join admin_users revoker on revoker.id = l.revoked_by_admin_user_id
order by l.created_at desc;

create or replace view admin_security_proof_qr_code_dashboard as
select
  q.id as admin_security_proof_qr_code_id,q.qr_code_key,q.status,q.verification_link_id,l.verification_link_key,l.short_code,q.proof_type,
  q.proof_key,q.qr_format,q.title,q.summary,q.qr_payload_hash_sha256,q.image_storage_uri,q.image_checksum_sha256,q.image_payload_bytes,
  q.size_px,q.include_logo,q.generated_at,q.failed_at,q.last_error,q.created_at,q.updated_at,q.metadata
from admin_security_proof_qr_codes q
join admin_security_proof_verification_links l on l.id = q.verification_link_id
order by q.created_at desc;

create or replace view admin_security_proof_qr_code_job_dashboard as
select
  j.id as admin_security_proof_qr_code_job_id,j.qr_job_key,j.status,j.qr_code_id,q.qr_code_key,j.verification_link_id,l.verification_link_key,
  j.qr_format,j.started_at,j.completed_at,j.failed_at,j.worker_id,j.last_error,j.created_at,j.updated_at,j.metadata
from admin_security_proof_qr_code_jobs j
join admin_security_proof_qr_codes q on q.id = j.qr_code_id
join admin_security_proof_verification_links l on l.id = j.verification_link_id
order by j.created_at desc;

create or replace view admin_security_proof_verification_link_event_dashboard as
select
  e.id as admin_security_proof_verification_link_event_id,e.verification_link_event_key,e.verification_link_id,l.verification_link_key,e.qr_code_id,
  q.qr_code_key,e.event_type,e.event_action,e.status,e.short_code,e.proof_type,e.proof_key,e.requester_auth_user_id,e.requester_email,e.requester_ip,
  e.user_agent,e.referrer,e.resolved_url,e.public_verification_submission_id,s.submission_key,e.public_verification_result_id,r.result_key,
  e.verification_status,e.verified,e.failure_reason,e.created_at,e.metadata
from admin_security_proof_verification_link_events e
left join admin_security_proof_verification_links l on l.id = e.verification_link_id
left join admin_security_proof_qr_codes q on q.id = e.qr_code_id
left join admin_security_public_verification_submissions s on s.id = e.public_verification_submission_id
left join admin_security_public_verification_results r on r.id = e.public_verification_result_id
order by e.created_at desc;

create or replace view admin_security_proof_qr_deeplink_integrity as
select
  (select count(*) from admin_security_proof_verification_links where status = 'active') as active_link_count,
  (select count(*) from admin_security_proof_verification_links where status = 'active' and expires_at is not null and expires_at <= now()) as overdue_expired_link_count,
  (select count(*) from admin_security_proof_verification_links where status = 'active' and proof_hash_sha256 is null) as active_link_missing_hash_count,
  (select count(*) from admin_security_proof_qr_codes where status = 'ready') as ready_qr_count,
  (select count(*) from admin_security_proof_qr_codes where status = 'ready' and image_storage_uri is null) as ready_qr_missing_storage_count,
  (select count(*) from admin_security_proof_qr_code_jobs where status = 'failed' and created_at >= now() - interval '1 hour') as failed_qr_job_count_1h,
  (select count(*) from admin_security_proof_verification_link_events where event_type in ('verification_failed', 'error') and created_at >= now() - interval '1 hour') as failed_link_event_count_1h,
  now() as checked_at;

grant select on admin_security_proof_verification_link_dashboard to admin_api_role;
grant select on admin_security_proof_qr_code_dashboard to admin_api_role;
grant select on admin_security_proof_qr_code_job_dashboard to admin_api_role;
grant select on admin_security_proof_verification_link_event_dashboard to admin_api_role;
grant select on admin_security_proof_qr_deeplink_integrity to admin_api_role;

insert into scheduled_jobs (
  job_key,job_name,job_group,enabled,schedule_cron,function_name,function_args,max_runtime_seconds,lock_ttl_seconds,metadata
)
values (
  'admin_security_proof_verification_link_expiry_every_5m',
  'Expire proof verification links',
  'admin',
  true,
  '*/5 * * * *',
  'expire_admin_security_proof_verification_links',
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

alter table admin_security_proof_verification_links enable row level security;
alter table admin_security_proof_qr_codes enable row level security;
alter table admin_security_proof_qr_code_jobs enable row level security;
alter table admin_security_proof_verification_link_events enable row level security;

create policy admin_security_proof_verification_links_no_user_direct_access on admin_security_proof_verification_links for all to authenticated using (false) with check (false);
create policy admin_security_proof_qr_codes_no_user_direct_access on admin_security_proof_qr_codes for all to authenticated using (false) with check (false);
create policy admin_security_proof_qr_code_jobs_no_user_direct_access on admin_security_proof_qr_code_jobs for all to authenticated using (false) with check (false);
create policy admin_security_proof_verification_link_events_no_user_direct_access on admin_security_proof_verification_link_events for all to authenticated using (false) with check (false);

create policy admin_api_all_proof_verification_links on admin_security_proof_verification_links for all to admin_api_role using (true) with check (true);
create policy admin_api_all_proof_qr_codes on admin_security_proof_qr_codes for all to admin_api_role using (true) with check (true);
create policy admin_api_all_proof_qr_code_jobs on admin_security_proof_qr_code_jobs for all to admin_api_role using (true) with check (true);
create policy admin_api_all_proof_verification_link_events on admin_security_proof_verification_link_events for all to admin_api_role using (true) with check (true);

create policy worker_all_proof_qr_codes on admin_security_proof_qr_codes for all to worker_role using (true) with check (true);
create policy worker_all_proof_qr_code_jobs on admin_security_proof_qr_code_jobs for all to worker_role using (true) with check (true);
create policy worker_read_proof_verification_links on admin_security_proof_verification_links for select to worker_role using (true);
create policy worker_all_proof_verification_link_events on admin_security_proof_verification_link_events for all to worker_role using (true) with check (true);

grant execute on function resolve_admin_security_proof_source_for_verification_link(text, uuid, text) to admin_api_role, worker_role;
grant execute on function record_admin_security_proof_verification_link_event(uuid,uuid,text,text,text,text,text,text,uuid,text,inet,text,text,text,uuid,uuid,text,boolean,text,text,jsonb) to admin_api_role, worker_role;
grant execute on function create_admin_security_proof_verification_link(text,uuid,text,text,text,text,timestamptz,integer,text,jsonb) to admin_api_role;
grant execute on function create_admin_security_proof_qr_code(uuid,text,integer,boolean,text,jsonb) to admin_api_role;
grant execute on function claim_admin_security_proof_qr_code_jobs(integer,text,jsonb) to worker_role;
grant execute on function complete_admin_security_proof_qr_code_generation(uuid,uuid,text,text,bigint,text,jsonb) to worker_role, admin_api_role;
grant execute on function fail_admin_security_proof_qr_code_generation(uuid,uuid,text,text,jsonb) to worker_role, admin_api_role;
grant execute on function resolve_public_proof_verification_link(text,text,inet,text,text,text,jsonb) to admin_api_role;
grant execute on function revoke_admin_security_proof_verification_link(uuid,uuid,text,text,jsonb) to admin_api_role;
grant execute on function expire_admin_security_proof_verification_links(integer,text,jsonb) to admin_api_role, worker_role;
grant execute on function register_proof_qr_code_download_subject(uuid,text,jsonb) to admin_api_role, worker_role;

alter function resolve_admin_security_proof_source_for_verification_link(text, uuid, text) security definer;
alter function resolve_admin_security_proof_source_for_verification_link(text, uuid, text) set search_path = public;
alter function create_admin_security_proof_verification_link(text,uuid,text,text,text,text,timestamptz,integer,text,jsonb) security definer;
alter function create_admin_security_proof_verification_link(text,uuid,text,text,text,text,timestamptz,integer,text,jsonb) set search_path = public;
alter function create_admin_security_proof_qr_code(uuid,text,integer,boolean,text,jsonb) security definer;
alter function create_admin_security_proof_qr_code(uuid,text,integer,boolean,text,jsonb) set search_path = public;
alter function claim_admin_security_proof_qr_code_jobs(integer,text,jsonb) security definer;
alter function claim_admin_security_proof_qr_code_jobs(integer,text,jsonb) set search_path = public;
alter function complete_admin_security_proof_qr_code_generation(uuid,uuid,text,text,bigint,text,jsonb) security definer;
alter function complete_admin_security_proof_qr_code_generation(uuid,uuid,text,text,bigint,text,jsonb) set search_path = public;
alter function fail_admin_security_proof_qr_code_generation(uuid,uuid,text,text,jsonb) security definer;
alter function fail_admin_security_proof_qr_code_generation(uuid,uuid,text,text,jsonb) set search_path = public;
alter function resolve_public_proof_verification_link(text,text,inet,text,text,text,jsonb) security definer;
alter function resolve_public_proof_verification_link(text,text,inet,text,text,text,jsonb) set search_path = public;
alter function revoke_admin_security_proof_verification_link(uuid,uuid,text,text,jsonb) security definer;
alter function revoke_admin_security_proof_verification_link(uuid,uuid,text,text,jsonb) set search_path = public;
alter function expire_admin_security_proof_verification_links(integer,text,jsonb) security definer;
alter function expire_admin_security_proof_verification_links(integer,text,jsonb) set search_path = public;
alter function register_proof_qr_code_download_subject(uuid,text,jsonb) security definer;
alter function register_proof_qr_code_download_subject(uuid,text,jsonb) set search_path = public;

insert into error_catalog (
  error_code,category,severity,http_status,retryable,user_visible,user_message,internal_message,owner_team
)
values
  ('PROOF_LINK_NOT_FOUND','validation','medium',404,false,true,'Proof verification link not found.','Proof verification link not found.','platform'),
  ('PROOF_LINK_INVALID','permission','medium',403,false,true,'Proof verification link is invalid.','Proof verification link invalid.','platform'),
  ('PROOF_LINK_EXPIRED','permission','medium',410,false,true,'Proof verification link has expired.','Proof verification link expired.','platform'),
  ('PROOF_LINK_REQUIRED_FIELDS','validation','medium',400,false,true,'Proof verification link request requires complete fields.','Proof verification link required fields missing.','platform'),
  ('PROOF_QR_INVALID_STATE','validation','medium',409,true,true,'Proof QR code is not in a valid state.','Proof QR code invalid state.','platform'),
  ('PROOF_QR_REQUIRED_FIELDS','validation','medium',400,false,true,'Proof QR code request requires complete fields.','Proof QR code required fields missing.','platform')
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
  ('proof source not found', 'PROOF_LINK_NOT_FOUND', 5, '{}'),
  ('proof verification link not found', 'PROOF_LINK_NOT_FOUND', 5, '{}'),
  ('proof verification link invalid', 'PROOF_LINK_INVALID', 5, '{}'),
  ('proof verification link revoked', 'PROOF_LINK_INVALID', 5, '{}'),
  ('proof verification link paused', 'PROOF_LINK_INVALID', 5, '{}'),
  ('proof verification link exhausted', 'PROOF_LINK_INVALID', 5, '{}'),
  ('proof verification link expired', 'PROOF_LINK_EXPIRED', 5, '{}'),
  ('proof verification short code is required', 'PROOF_LINK_REQUIRED_FIELDS', 5, '{}'),
  ('proof verification token is required', 'PROOF_LINK_REQUIRED_FIELDS', 5, '{}'),
  ('unsupported proof type for verification link', 'PROOF_LINK_REQUIRED_FIELDS', 5, '{}'),
  ('proof source missing hash for verification link', 'PROOF_LINK_REQUIRED_FIELDS', 5, '{}'),
  ('proof verification link revocation reason is required', 'PROOF_LINK_REQUIRED_FIELDS', 5, '{}'),
  ('proof qr code not found', 'PROOF_LINK_NOT_FOUND', 5, '{}'),
  ('proof qr code is not ready', 'PROOF_QR_INVALID_STATE', 5, '{}'),
  ('proof qr code cannot complete from status', 'PROOF_QR_INVALID_STATE', 5, '{}'),
  ('proof qr code size must be between 128 and 2048', 'PROOF_QR_REQUIRED_FIELDS', 5, '{}'),
  ('proof qr code generation error is required', 'PROOF_QR_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
