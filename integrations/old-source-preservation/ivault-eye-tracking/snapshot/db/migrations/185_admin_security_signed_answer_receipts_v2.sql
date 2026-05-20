-- Step 9.70 — Build signed answer receipts v2.
-- Runs after 184_admin_security_evidence_answer_engine_v2.sql.

create table if not exists admin_security_answer_receipt_signing_keys (
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
  constraint admin_security_answer_receipt_signing_keys_status_check
  check (status in ('active', 'retired', 'revoked')),
  constraint admin_security_answer_receipt_signing_keys_algorithm_check
  check (
    algorithm in (
      'HMAC-SHA256',
      'ED25519',
      'RSA-PSS-SHA256'
    )
  )
);

create index if not exists admin_security_answer_receipt_signing_keys_status_idx
on admin_security_answer_receipt_signing_keys (status, activated_at desc);

drop trigger if exists admin_security_answer_receipt_signing_keys_set_updated_at
on admin_security_answer_receipt_signing_keys;

create trigger admin_security_answer_receipt_signing_keys_set_updated_at
before update on admin_security_answer_receipt_signing_keys
for each row
execute function set_updated_at();

insert into admin_security_answer_receipt_signing_keys (
  key_version,
  status,
  algorithm,
  description,
  metadata
)
values (
  'answer-receipt-signing-v1',
  'active',
  'HMAC-SHA256',
  'MVP answer receipt signing key metadata. Secret material is stored outside the database.',
  '{"secret_location": "ANSWER_RECEIPT_SIGNING_SECRET"}'::jsonb
)
on conflict (key_version)
do update set
  status = excluded.status,
  algorithm = excluded.algorithm,
  description = excluded.description,
  metadata = admin_security_answer_receipt_signing_keys.metadata || excluded.metadata,
  updated_at = now();

create table if not exists admin_security_answer_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_key text not null unique,
  status text not null default 'pending',
  answer_request_id uuid not null
    references admin_security_evidence_answer_requests(id)
    on delete cascade,
  answer_session_id uuid
    references admin_security_evidence_answer_sessions(id)
    on delete set null,
  answer_scope text not null,
  question_text text not null,
  normalized_question text not null,
  answer_text text,
  answer_status text not null,
  non_answer_reason text,
  confidence_score numeric(5,4),
  evidence_score numeric(5,4),
  retrieved_chunk_count integer not null default 0,
  cited_chunk_count integer not null default 0,
  requester_auth_user_id uuid,
  requester_email text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  private_room_participant_id uuid references admin_security_private_trust_room_participants(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  auditor_participant_id uuid,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  customer_name text,
  customer_domain text,
  receipt_schema_version text not null default 'answer-receipt-v1',
  receipt_payload jsonb not null default '{}'::jsonb,
  receipt_hash_sha256 text,
  payload_bytes bigint,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  signed_at timestamptz,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id),
  revocation_reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_answer_receipts_status_check
  check (
    status in (
      'pending',
      'signed',
      'failed',
      'revoked',
      'expired',
      'archived'
    )
  ),
  constraint admin_security_answer_receipts_scope_check
  check (
    answer_scope in (
      'public',
      'customer',
      'private_room',
      'auditor_portal',
      'enterprise_review_room',
      'admin'
    )
  ),
  constraint admin_security_answer_receipts_answer_status_check
  check (
    answer_status in (
      'answered',
      'partially_answered',
      'not_answered',
      'blocked',
      'failed'
    )
  ),
  constraint admin_security_answer_receipts_question_check
  check (length(trim(question_text)) > 0),
  constraint admin_security_answer_receipts_answer_request_unique unique (answer_request_id)
);

create index if not exists admin_security_answer_receipts_request_idx
on admin_security_answer_receipts (answer_request_id);

create index if not exists admin_security_answer_receipts_session_idx
on admin_security_answer_receipts (answer_session_id, created_at desc);

create index if not exists admin_security_answer_receipts_status_idx
on admin_security_answer_receipts (status, created_at desc);

create index if not exists admin_security_answer_receipts_private_room_idx
on admin_security_answer_receipts (private_room_id, status, created_at desc);

create index if not exists admin_security_answer_receipts_customer_idx
on admin_security_answer_receipts (customer_name, customer_domain);

drop trigger if exists admin_security_answer_receipts_set_updated_at
on admin_security_answer_receipts;

create trigger admin_security_answer_receipts_set_updated_at
before update on admin_security_answer_receipts
for each row
execute function set_updated_at();

create table if not exists admin_security_answer_receipt_citations (
  id uuid primary key default gen_random_uuid(),
  answer_receipt_id uuid not null
    references admin_security_answer_receipts(id)
    on delete cascade,
  answer_citation_id uuid
    references admin_security_evidence_answer_citations(id)
    on delete set null,
  search_document_id uuid
    references admin_security_artifact_search_documents(id)
    on delete set null,
  search_chunk_id uuid
    references admin_security_artifact_search_chunks(id)
    on delete set null,
  viewer_subject_id uuid
    references admin_security_artifact_viewer_subjects(id)
    on delete set null,
  viewer_item_id uuid
    references admin_security_artifact_viewer_items(id)
    on delete set null,
  citation_key text not null,
  source_type text,
  source_id uuid,
  artifact_type text,
  artifact_key text,
  title text,
  section_title text,
  page_number integer,
  section_key text,
  cited_text text not null,
  cited_text_hash_sha256 text,
  citation_order integer not null default 0,
  confidence_score numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (answer_receipt_id, citation_key)
);

create index if not exists admin_security_answer_receipt_citations_receipt_idx
on admin_security_answer_receipt_citations (answer_receipt_id, citation_order);

create index if not exists admin_security_answer_receipt_citations_chunk_idx
on admin_security_answer_receipt_citations (search_chunk_id);

create table if not exists admin_security_answer_receipt_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  receipt_key text,
  receipt_hash_sha256 text,
  signature text,
  verification_status text not null,
  receipt_found boolean not null default false,
  hash_match boolean not null default false,
  signature_match boolean not null default false,
  receipt_valid_state boolean not null default false,
  scope_valid_state boolean not null default false,
  failure_reason text,
  requester_auth_user_id uuid,
  requester_email text,
  requester_ip inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_answer_receipt_verification_status_check
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

create index if not exists admin_security_answer_receipt_verification_receipt_idx
on admin_security_answer_receipt_verification_attempts (receipt_key, created_at desc);

create index if not exists admin_security_answer_receipt_verification_status_idx
on admin_security_answer_receipt_verification_attempts (verification_status, created_at desc);

create or replace function create_admin_security_answer_receipt(
  p_answer_request_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_security_evidence_answer_requests%rowtype;
  v_receipt_id uuid;
  v_receipt_key text;
  v_payload jsonb;
begin
  select *
  into v_request
  from admin_security_evidence_answer_requests
  where id = p_answer_request_id;

  if v_request.id is null then
    raise exception 'answer request not found: %', p_answer_request_id;
  end if;

  if v_request.status not in ('answered', 'partially_answered', 'not_answered') then
    raise exception 'answer request is not receiptable from status: %', v_request.status;
  end if;

  v_receipt_key :=
    'answer_receipt:' ||
    v_request.answer_scope || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  v_payload := jsonb_build_object(
    'schemaVersion', 'answer-receipt-v1',
    'receiptKey', v_receipt_key,
    'answerRequestId', v_request.id,
    'answerSessionId', v_request.answer_session_id,
    'scope', v_request.answer_scope,
    'questionText', v_request.question_text,
    'normalizedQuestion', v_request.normalized_question,
    'answerText', v_request.answer_text,
    'answerStatus', v_request.answer_status,
    'nonAnswerReason', v_request.non_answer_reason,
    'confidenceScore', v_request.confidence_score,
    'evidenceScore', v_request.evidence_score,
    'retrievedChunkCount', v_request.retrieved_chunk_count,
    'citedChunkCount', v_request.cited_chunk_count,
    'requesterEmail', v_request.requester_email,
    'customerName', v_request.customer_name,
    'customerDomain', v_request.customer_domain,
    'privateRoomId', v_request.private_room_id,
    'privateRoomParticipantId', v_request.private_room_participant_id,
    'auditorPortalId', v_request.auditor_portal_id,
    'enterpriseReviewRoomId', v_request.enterprise_review_room_id,
    'createdAt', now()
  );

  insert into admin_security_answer_receipts (
    receipt_key,
    status,
    answer_request_id,
    answer_session_id,
    answer_scope,
    question_text,
    normalized_question,
    answer_text,
    answer_status,
    non_answer_reason,
    confidence_score,
    evidence_score,
    retrieved_chunk_count,
    cited_chunk_count,
    requester_auth_user_id,
    requester_email,
    private_room_id,
    private_room_participant_id,
    auditor_portal_id,
    auditor_participant_id,
    enterprise_review_room_id,
    customer_name,
    customer_domain,
    receipt_schema_version,
    receipt_payload,
    valid_from,
    valid_until,
    request_id,
    metadata
  )
  values (
    v_receipt_key,
    'pending',
    v_request.id,
    v_request.answer_session_id,
    v_request.answer_scope,
    v_request.question_text,
    v_request.normalized_question,
    v_request.answer_text,
    v_request.answer_status,
    v_request.non_answer_reason,
    v_request.confidence_score,
    v_request.evidence_score,
    v_request.retrieved_chunk_count,
    v_request.cited_chunk_count,
    v_request.requester_auth_user_id,
    v_request.requester_email,
    v_request.private_room_id,
    v_request.private_room_participant_id,
    v_request.auditor_portal_id,
    v_request.auditor_participant_id,
    v_request.enterprise_review_room_id,
    v_request.customer_name,
    v_request.customer_domain,
    'answer-receipt-v1',
    v_payload,
    now(),
    now() + interval '365 days',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (answer_request_id)
  do update set
    metadata = admin_security_answer_receipts.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_receipt_id;

  insert into admin_security_answer_receipt_citations (
    answer_receipt_id,
    answer_citation_id,
    search_document_id,
    search_chunk_id,
    viewer_subject_id,
    viewer_item_id,
    citation_key,
    source_type,
    source_id,
    artifact_type,
    artifact_key,
    title,
    section_title,
    page_number,
    section_key,
    cited_text,
    cited_text_hash_sha256,
    citation_order,
    confidence_score,
    metadata
  )
  select
    v_receipt_id,
    c.id,
    c.search_document_id,
    c.search_chunk_id,
    c.viewer_subject_id,
    c.viewer_item_id,
    c.citation_key,
    c.source_type,
    c.source_id,
    c.artifact_type,
    c.artifact_key,
    c.title,
    c.section_title,
    c.page_number,
    c.section_key,
    c.cited_text,
    encode(digest(c.cited_text, 'sha256'), 'hex'),
    c.citation_order,
    c.confidence_score,
    c.metadata
  from admin_security_evidence_answer_citations c
  where c.answer_request_id = v_request.id
  on conflict (answer_receipt_id, citation_key)
  do update set
    cited_text = excluded.cited_text,
    cited_text_hash_sha256 = excluded.cited_text_hash_sha256,
    confidence_score = excluded.confidence_score,
    metadata = admin_security_answer_receipt_citations.metadata || excluded.metadata;

  return v_receipt_id;
end;
$$;

create or replace function claim_admin_security_answer_receipts_for_signing(
  p_batch_size integer default 25,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  answer_receipt_id uuid,
  receipt_key text,
  answer_request_id uuid,
  answer_scope text,
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
    select r.id
    from admin_security_answer_receipts r
    where r.status in ('pending', 'failed')
    order by r.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated as (
    update admin_security_answer_receipts r
    set
      status = 'pending',
      metadata = r.metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'worker_id',
        p_worker_id
      ),
      updated_at = now()
    from candidates
    where r.id = candidates.id
    returning r.*
  )
  select
    u.id,
    u.receipt_key,
    u.answer_request_id,
    u.answer_scope,
    u.receipt_payload
  from updated u;
end;
$$;

create or replace function complete_admin_security_answer_receipt_signing(
  p_answer_receipt_id uuid,
  p_receipt_payload jsonb,
  p_receipt_hash_sha256 text,
  p_payload_bytes bigint,
  p_signature text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_receipt admin_security_answer_receipts%rowtype;
  v_key admin_security_answer_receipt_signing_keys%rowtype;
begin
  if p_receipt_payload is null then
    raise exception 'answer receipt payload is required';
  end if;

  if p_receipt_hash_sha256 is null or length(trim(p_receipt_hash_sha256)) = 0 then
    raise exception 'answer receipt hash is required';
  end if;

  if p_signature is null or length(trim(p_signature)) = 0 then
    raise exception 'answer receipt signature is required';
  end if;

  select *
  into v_receipt
  from admin_security_answer_receipts
  where id = p_answer_receipt_id
  for update;

  if v_receipt.id is null then
    raise exception 'answer receipt not found: %', p_answer_receipt_id;
  end if;

  if v_receipt.status not in ('pending', 'failed') then
    raise exception 'answer receipt cannot be signed from status: %', v_receipt.status;
  end if;

  select *
  into v_key
  from admin_security_answer_receipt_signing_keys
  where status = 'active'
  order by activated_at desc
  limit 1;

  if v_key.id is null then
    raise exception 'active answer receipt signing key not found';
  end if;

  update admin_security_answer_receipts
  set
    status = 'signed',
    receipt_payload = p_receipt_payload,
    receipt_hash_sha256 = p_receipt_hash_sha256,
    payload_bytes = p_payload_bytes,
    signature_algorithm = v_key.algorithm,
    signing_key_version = v_key.key_version,
    signature = p_signature,
    signed_at = now(),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'signed_by_worker',
      p_worker_id
    ),
    updated_at = now()
  where id = v_receipt.id;

  return v_receipt.id;
end;
$$;

create or replace function fail_admin_security_answer_receipt_signing(
  p_answer_receipt_id uuid,
  p_error text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'answer receipt signing error is required';
  end if;

  update admin_security_answer_receipts
  set
    status = 'failed',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'signing_error',
      p_error,
      'worker_id',
      p_worker_id,
      'failed_at',
      now()
    ),
    updated_at = now()
  where id = p_answer_receipt_id;

  if not found then
    raise exception 'answer receipt not found: %', p_answer_receipt_id;
  end if;

  return p_answer_receipt_id;
end;
$$;

create or replace function verify_admin_security_answer_receipt(
  p_receipt_key text,
  p_receipt_hash_sha256 text,
  p_signature text,
  p_signature_match boolean default false,
  p_auth_user_id uuid default null,
  p_requester_email text default null,
  p_requester_ip inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_receipt admin_security_answer_receipts%rowtype;

  v_receipt_found boolean := false;
  v_hash_match boolean := false;
  v_signature_match_state boolean := false;
  v_receipt_valid_state boolean := false;
  v_scope_valid_state boolean := true;

  v_status text := 'failed';
  v_failure_reason text;
begin
  if p_receipt_key is null or length(trim(p_receipt_key)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'answer receipt key is required';
  elsif p_receipt_hash_sha256 is null or length(trim(p_receipt_hash_sha256)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'answer receipt hash is required';
  elsif p_signature is null or length(trim(p_signature)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'answer receipt signature is required';
  else
    select *
    into v_receipt
    from admin_security_answer_receipts
    where receipt_key = p_receipt_key;

    if v_receipt.id is null then
      v_status := 'not_found';
      v_failure_reason := 'answer receipt not found';
    else
      v_receipt_found := true;

      v_hash_match := v_receipt.receipt_hash_sha256 = p_receipt_hash_sha256;
      v_signature_match_state := coalesce(p_signature_match, false)
        and v_receipt.signature = p_signature;

      v_receipt_valid_state :=
        v_receipt.status = 'signed'
        and v_receipt.signed_at is not null
        and v_receipt.valid_from <= now()
        and (
          v_receipt.valid_until is null
          or v_receipt.valid_until > now()
        );

      if v_receipt.status = 'revoked' then
        v_status := 'revoked';
        v_failure_reason := 'answer receipt revoked';
      elsif v_receipt.status = 'expired'
        or (
          v_receipt.valid_until is not null
          and v_receipt.valid_until <= now()
        )
      then
        v_status := 'expired';
        v_failure_reason := 'answer receipt expired';
      elsif v_hash_match
        and v_signature_match_state
        and v_receipt_valid_state
        and v_scope_valid_state
      then
        v_status := 'verified';
        v_failure_reason := null;
      else
        v_status := 'failed';
        v_failure_reason :=
          case
            when v_hash_match is not true then 'receipt hash mismatch'
            when v_signature_match_state is not true then 'receipt signature mismatch'
            when v_receipt_valid_state is not true then 'receipt invalid state'
            when v_scope_valid_state is not true then 'scope invalid state'
            else 'answer receipt verification failed'
          end;
      end if;
    end if;
  end if;

  insert into admin_security_answer_receipt_verification_attempts (
    receipt_key,
    receipt_hash_sha256,
    signature,
    verification_status,
    receipt_found,
    hash_match,
    signature_match,
    receipt_valid_state,
    scope_valid_state,
    failure_reason,
    requester_auth_user_id,
    requester_email,
    requester_ip,
    user_agent,
    request_id,
    metadata
  )
  values (
    p_receipt_key,
    p_receipt_hash_sha256,
    p_signature,
    v_status,
    v_receipt_found,
    v_hash_match,
    v_signature_match_state,
    v_receipt_valid_state,
    v_scope_valid_state,
    v_failure_reason,
    p_auth_user_id,
    p_requester_email,
    p_requester_ip,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'verificationStatus', v_status,
    'verified', v_status = 'verified',
    'failureReason', v_failure_reason,
    'checks', jsonb_build_object(
      'receiptFound', v_receipt_found,
      'hashMatch', v_hash_match,
      'signatureMatch', v_signature_match_state,
      'receiptValidState', v_receipt_valid_state,
      'scopeValidState', v_scope_valid_state
    ),
    'receipt', case
      when v_receipt_found then jsonb_build_object(
        'receiptKey', v_receipt.receipt_key,
        'answerScope', v_receipt.answer_scope,
        'questionText', v_receipt.question_text,
        'answerStatus', v_receipt.answer_status,
        'confidenceScore', v_receipt.confidence_score,
        'citedChunkCount', v_receipt.cited_chunk_count,
        'receiptHashSha256', v_receipt.receipt_hash_sha256,
        'signatureAlgorithm', v_receipt.signature_algorithm,
        'signingKeyVersion', v_receipt.signing_key_version,
        'signature', v_receipt.signature,
        'signedAt', v_receipt.signed_at,
        'validFrom', v_receipt.valid_from,
        'validUntil', v_receipt.valid_until
      )
      else null
    end
  );
end;
$$;

create or replace function revoke_admin_security_answer_receipt(
  p_admin_auth_user_id uuid,
  p_answer_receipt_id uuid,
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
    raise exception 'answer receipt revocation reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_answer_receipts
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoked_by_admin_user_id = v_admin.id,
    revocation_reason = p_reason,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_answer_receipt_id
    and status = 'signed';

  if not found then
    raise exception 'signed answer receipt not found: %', p_answer_receipt_id;
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'revoke_admin_security_answer_receipt',
    'admin.write',
    'admin_security_answer_receipt',
    p_answer_receipt_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return p_answer_receipt_id;
end;
$$;

create or replace function expire_admin_security_answer_receipts(
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

  update admin_security_answer_receipts
  set
    status = 'expired',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'expired_by_worker',
      p_worker_id,
      'answer_receipt_expiry_run_id',
      v_run_id
    ),
    updated_at = now()
  where id in (
    select id
    from admin_security_answer_receipts
    where status = 'signed'
      and valid_until is not null
      and valid_until <= now()
    order by valid_until asc
    limit p_batch_size
    for update skip locked
  );

  return v_run_id;
end;
$$;

create or replace view admin_security_answer_receipt_dashboard as
select
  r.id as admin_security_answer_receipt_id,
  r.receipt_key,
  r.status,
  r.answer_request_id,
  ar.answer_request_key,
  r.answer_session_id,
  s.answer_session_key,
  r.answer_scope,
  r.question_text,
  r.answer_text,
  r.answer_status,
  r.non_answer_reason,
  r.confidence_score,
  r.evidence_score,
  r.retrieved_chunk_count,
  r.cited_chunk_count,
  r.requester_auth_user_id,
  r.requester_email,
  r.private_room_id,
  pr.private_room_key,
  r.private_room_participant_id,
  p.email as private_room_participant_email,
  r.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  r.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  r.customer_name,
  r.customer_domain,
  r.receipt_schema_version,
  r.receipt_hash_sha256,
  r.payload_bytes,
  r.signature_algorithm,
  r.signing_key_version,
  r.signature,
  r.signed_at,
  r.valid_from,
  r.valid_until,
  r.revoked_at,
  revoker.email as revoked_by_email,
  r.revocation_reason,
  (
    select count(*)
    from admin_security_answer_receipt_citations c
    where c.answer_receipt_id = r.id
  ) as receipt_citation_count,
  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_answer_receipts r
left join admin_security_evidence_answer_requests ar
  on ar.id = r.answer_request_id
left join admin_security_evidence_answer_sessions s
  on s.id = r.answer_session_id
left join admin_security_private_trust_rooms pr
  on pr.id = r.private_room_id
left join admin_security_private_trust_room_participants p
  on p.id = r.private_room_participant_id
left join admin_security_auditor_portals ap
  on ap.id = r.auditor_portal_id
left join admin_security_enterprise_review_rooms er
  on er.id = r.enterprise_review_room_id
left join admin_users revoker
  on revoker.id = r.revoked_by_admin_user_id
order by r.created_at desc;

create or replace view admin_security_answer_receipt_citation_dashboard as
select
  c.id as admin_security_answer_receipt_citation_id,
  c.answer_receipt_id,
  r.receipt_key,
  c.answer_citation_id,
  c.search_document_id,
  d.search_document_key,
  c.search_chunk_id,
  c.viewer_subject_id,
  vs.viewer_subject_key,
  c.viewer_item_id,
  vi.item_key as viewer_item_key,
  c.citation_key,
  c.source_type,
  c.source_id,
  c.artifact_type,
  c.artifact_key,
  c.title,
  c.section_title,
  c.page_number,
  c.section_key,
  c.cited_text,
  c.cited_text_hash_sha256,
  c.citation_order,
  c.confidence_score,
  c.created_at,
  c.metadata
from admin_security_answer_receipt_citations c
join admin_security_answer_receipts r
  on r.id = c.answer_receipt_id
left join admin_security_artifact_search_documents d
  on d.id = c.search_document_id
left join admin_security_artifact_viewer_subjects vs
  on vs.id = c.viewer_subject_id
left join admin_security_artifact_viewer_items vi
  on vi.id = c.viewer_item_id
order by c.created_at desc;

create or replace view admin_security_answer_receipt_verification_dashboard as
select
  v.id as admin_security_answer_receipt_verification_attempt_id,
  v.receipt_key,
  v.receipt_hash_sha256,
  v.signature,
  v.verification_status,
  v.receipt_found,
  v.hash_match,
  v.signature_match,
  v.receipt_valid_state,
  v.scope_valid_state,
  v.failure_reason,
  v.requester_auth_user_id,
  v.requester_email,
  v.requester_ip,
  v.user_agent,
  v.created_at,
  v.metadata
from admin_security_answer_receipt_verification_attempts v
order by v.created_at desc;

create or replace view admin_security_answer_receipt_integrity as
select
  (
    select count(*)
    from admin_security_answer_receipts
    where status = 'pending'
  ) as pending_receipt_count,
  (
    select count(*)
    from admin_security_answer_receipts
    where status = 'signed'
  ) as signed_receipt_count,
  (
    select count(*)
    from admin_security_answer_receipts
    where status = 'failed'
  ) as failed_receipt_count,
  (
    select count(*)
    from admin_security_answer_receipts
    where status = 'signed'
      and signature is null
  ) as signed_missing_signature_count,
  (
    select count(*)
    from admin_security_answer_receipts
    where status = 'signed'
      and receipt_hash_sha256 is null
  ) as signed_missing_hash_count,
  (
    select count(*)
    from admin_security_answer_receipts
    where answer_status = 'answered'
      and cited_chunk_count = 0
  ) as unsafe_uncited_signed_answer_count,
  (
    select count(*)
    from admin_security_answer_receipt_verification_attempts
    where created_at >= now() - interval '24 hours'
  ) as verification_attempt_count_24h,
  (
    select count(*)
    from admin_security_answer_receipt_verification_attempts
    where verification_status = 'verified'
      and created_at >= now() - interval '24 hours'
  ) as verified_attempt_count_24h,
  now() as checked_at;

grant select on admin_security_answer_receipt_dashboard to admin_api_role;
grant select on admin_security_answer_receipt_citation_dashboard to admin_api_role;
grant select on admin_security_answer_receipt_verification_dashboard to admin_api_role;
grant select on admin_security_answer_receipt_integrity to admin_api_role;

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
    'admin_security_answer_receipt_expiry_every_5m',
    'Expire signed answer receipts',
    'admin',
    true,
    '*/5 * * * *',
    'expire_admin_security_answer_receipts',
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

  elsif v_job.function_name = 'expire_admin_security_answer_receipts' then
    v_uuid_result := expire_admin_security_answer_receipts(
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

alter table admin_security_answer_receipt_signing_keys enable row level security;
alter table admin_security_answer_receipts enable row level security;
alter table admin_security_answer_receipt_citations enable row level security;
alter table admin_security_answer_receipt_verification_attempts enable row level security;

create policy admin_security_answer_receipt_signing_keys_no_user_direct_access
on admin_security_answer_receipt_signing_keys
for all
to authenticated
using (false)
with check (false);

create policy admin_security_answer_receipts_no_user_direct_access
on admin_security_answer_receipts
for all
to authenticated
using (false)
with check (false);

create policy admin_security_answer_receipt_citations_no_user_direct_access
on admin_security_answer_receipt_citations
for all
to authenticated
using (false)
with check (false);

create policy admin_security_answer_receipt_verification_no_user_direct_access
on admin_security_answer_receipt_verification_attempts
for all
to authenticated
using (false)
with check (false);

create policy admin_api_read_answer_receipt_signing_keys
on admin_security_answer_receipt_signing_keys
for select
to admin_api_role
using (true);

create policy admin_api_all_answer_receipts
on admin_security_answer_receipts
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_answer_receipt_citations
on admin_security_answer_receipt_citations
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_answer_receipt_verifications
on admin_security_answer_receipt_verification_attempts
for all
to admin_api_role
using (true)
with check (true);

create policy worker_all_answer_receipts
on admin_security_answer_receipts
for all
to worker_role
using (true)
with check (true);

create policy worker_all_answer_receipt_citations
on admin_security_answer_receipt_citations
for all
to worker_role
using (true)
with check (true);

create policy worker_read_answer_receipt_signing_keys
on admin_security_answer_receipt_signing_keys
for select
to worker_role
using (true);

grant execute on function create_admin_security_answer_receipt(uuid, text, jsonb)
to admin_api_role;

grant execute on function claim_admin_security_answer_receipts_for_signing(integer, text, jsonb)
to worker_role;

grant execute on function complete_admin_security_answer_receipt_signing(
  uuid,
  jsonb,
  text,
  bigint,
  text,
  text,
  jsonb
) to worker_role;

grant execute on function fail_admin_security_answer_receipt_signing(uuid, text, text, jsonb)
to worker_role;

grant execute on function verify_admin_security_answer_receipt(
  text,
  text,
  text,
  boolean,
  uuid,
  text,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function revoke_admin_security_answer_receipt(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function expire_admin_security_answer_receipts(integer, text, jsonb)
to admin_api_role, worker_role;

alter function create_admin_security_answer_receipt(uuid, text, jsonb) security definer;
alter function create_admin_security_answer_receipt(uuid, text, jsonb) set search_path = public;

alter function claim_admin_security_answer_receipts_for_signing(integer, text, jsonb) security definer;
alter function claim_admin_security_answer_receipts_for_signing(integer, text, jsonb) set search_path = public;

alter function complete_admin_security_answer_receipt_signing(
  uuid,
  jsonb,
  text,
  bigint,
  text,
  text,
  jsonb
) security definer;
alter function complete_admin_security_answer_receipt_signing(
  uuid,
  jsonb,
  text,
  bigint,
  text,
  text,
  jsonb
) set search_path = public;

alter function fail_admin_security_answer_receipt_signing(uuid, text, text, jsonb) security definer;
alter function fail_admin_security_answer_receipt_signing(uuid, text, text, jsonb) set search_path = public;

alter function verify_admin_security_answer_receipt(
  text,
  text,
  text,
  boolean,
  uuid,
  text,
  inet,
  text,
  text,
  jsonb
) security definer;
alter function verify_admin_security_answer_receipt(
  text,
  text,
  text,
  boolean,
  uuid,
  text,
  inet,
  text,
  text,
  jsonb
) set search_path = public;

alter function revoke_admin_security_answer_receipt(uuid, uuid, text, text, jsonb) security definer;
alter function revoke_admin_security_answer_receipt(uuid, uuid, text, text, jsonb) set search_path = public;

alter function expire_admin_security_answer_receipts(integer, text, jsonb) security definer;
alter function expire_admin_security_answer_receipts(integer, text, jsonb) set search_path = public;

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
    'ANSWER_RECEIPT_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Answer receipt not found.',
    'Answer receipt not found.',
    'platform'
  ),
  (
    'ANSWER_RECEIPT_INVALID',
    'validation',
    'high',
    400,
    false,
    true,
    'Answer receipt is invalid.',
    'Answer receipt invalid.',
    'platform'
  ),
  (
    'ANSWER_RECEIPT_REVOKED',
    'permission',
    'high',
    403,
    false,
    true,
    'Answer receipt has been revoked.',
    'Answer receipt revoked.',
    'platform'
  ),
  (
    'ANSWER_RECEIPT_EXPIRED',
    'permission',
    'medium',
    410,
    false,
    true,
    'Answer receipt has expired.',
    'Answer receipt expired.',
    'platform'
  ),
  (
    'ANSWER_RECEIPT_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Answer receipt request requires complete fields.',
    'Answer receipt required fields missing.',
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
  ('answer request not found', 'ANSWER_RECEIPT_NOT_FOUND', 5, '{}'),
  ('answer receipt not found', 'ANSWER_RECEIPT_NOT_FOUND', 5, '{}'),
  ('answer request is not receiptable', 'ANSWER_RECEIPT_INVALID', 5, '{}'),
  ('answer receipt cannot be signed from status', 'ANSWER_RECEIPT_INVALID', 5, '{}'),
  ('answer receipt key is required', 'ANSWER_RECEIPT_REQUIRED_FIELDS', 5, '{}'),
  ('answer receipt hash is required', 'ANSWER_RECEIPT_REQUIRED_FIELDS', 5, '{}'),
  ('answer receipt signature is required', 'ANSWER_RECEIPT_REQUIRED_FIELDS', 5, '{}'),
  ('answer receipt payload is required', 'ANSWER_RECEIPT_REQUIRED_FIELDS', 5, '{}'),
  ('answer receipt signing error is required', 'ANSWER_RECEIPT_REQUIRED_FIELDS', 5, '{}'),
  ('answer receipt revocation reason is required', 'ANSWER_RECEIPT_REQUIRED_FIELDS', 5, '{}'),
  ('answer receipt revoked', 'ANSWER_RECEIPT_REVOKED', 5, '{}'),
  ('answer receipt expired', 'ANSWER_RECEIPT_EXPIRED', 5, '{}'),
  ('receipt hash mismatch', 'ANSWER_RECEIPT_INVALID', 5, '{}'),
  ('receipt signature mismatch', 'ANSWER_RECEIPT_INVALID', 5, '{}'),
  ('receipt invalid state', 'ANSWER_RECEIPT_INVALID', 5, '{}'),
  ('active answer receipt signing key not found', 'ANSWER_RECEIPT_INVALID', 5, '{}')
on conflict do nothing;
