-- Step 9.69 — Build evidence citation and answer engine v2.
-- Runs after 183_admin_security_artifact_search_semantic_index_v2.sql.

create table if not exists admin_security_evidence_answer_sessions (
  id uuid primary key default gen_random_uuid(),
  answer_session_key text not null unique,
  status text not null default 'active',
  answer_scope text not null,
  requester_auth_user_id uuid,
  requester_email text,
  requester_display_name text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  private_room_participant_id uuid references admin_security_private_trust_room_participants(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  auditor_participant_id uuid,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  customer_name text,
  customer_domain text,
  answer_token_hash_sha256 text,
  answer_token_prefix text,
  expires_at timestamptz not null default (now() + interval '60 minutes'),
  question_count integer not null default 0,
  max_questions integer not null default 100,
  allow_uncited_answers boolean not null default false,
  require_exact_citations boolean not null default true,
  allow_partial_answers boolean not null default true,
  ip_address inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_evidence_answer_sessions_status_check
  check (
    status in (
      'active',
      'expired',
      'revoked',
      'completed',
      'archived'
    )
  ),
  constraint admin_security_evidence_answer_sessions_scope_check
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
  constraint admin_security_evidence_answer_sessions_expiry_check
  check (expires_at > created_at),
  constraint admin_security_evidence_answer_sessions_question_count_check
  check (question_count >= 0),
  constraint admin_security_evidence_answer_sessions_max_questions_check
  check (max_questions between 1 and 10000)
);

create index if not exists admin_security_evidence_answer_sessions_token_idx
on admin_security_evidence_answer_sessions (answer_token_hash_sha256);

create index if not exists admin_security_evidence_answer_sessions_scope_idx
on admin_security_evidence_answer_sessions (answer_scope, status);

create index if not exists admin_security_evidence_answer_sessions_private_room_idx
on admin_security_evidence_answer_sessions (private_room_id, private_room_participant_id, status);

create index if not exists admin_security_evidence_answer_sessions_expiry_idx
on admin_security_evidence_answer_sessions (status, expires_at);

drop trigger if exists admin_security_evidence_answer_sessions_set_updated_at
on admin_security_evidence_answer_sessions;

create trigger admin_security_evidence_answer_sessions_set_updated_at
before update on admin_security_evidence_answer_sessions
for each row
execute function set_updated_at();

create table if not exists admin_security_evidence_answer_requests (
  id uuid primary key default gen_random_uuid(),
  answer_request_key text not null unique,
  answer_session_id uuid
    references admin_security_evidence_answer_sessions(id)
    on delete set null,
  status text not null default 'pending',
  answer_scope text not null,
  question_text text not null,
  normalized_question text not null,
  answer_text text,
  answer_format text not null default 'plain_text',
  answer_status text not null default 'not_answered',
  non_answer_reason text,
  confidence_score numeric(5, 4),
  evidence_score numeric(5, 4),
  retrieved_chunk_count integer not null default 0,
  cited_chunk_count integer not null default 0,
  latency_ms integer,
  requester_auth_user_id uuid,
  requester_email text,
  private_room_id uuid,
  private_room_participant_id uuid,
  auditor_portal_id uuid,
  auditor_participant_id uuid,
  enterprise_review_room_id uuid,
  customer_name text,
  customer_domain text,
  ip_address inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint admin_security_evidence_answer_requests_status_check
  check (
    status in (
      'pending',
      'retrieving',
      'answered',
      'partially_answered',
      'not_answered',
      'failed',
      'denied',
      'expired',
      'rate_limited'
    )
  ),
  constraint admin_security_evidence_answer_requests_scope_check
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
  constraint admin_security_evidence_answer_requests_answer_status_check
  check (
    answer_status in (
      'answered',
      'partially_answered',
      'not_answered',
      'blocked',
      'failed'
    )
  ),
  constraint admin_security_evidence_answer_requests_format_check
  check (
    answer_format in (
      'plain_text',
      'markdown',
      'json'
    )
  ),
  constraint admin_security_evidence_answer_requests_question_check
  check (length(trim(question_text)) > 0)
);

create index if not exists admin_security_evidence_answer_requests_session_idx
on admin_security_evidence_answer_requests (answer_session_id, created_at desc);

create index if not exists admin_security_evidence_answer_requests_scope_idx
on admin_security_evidence_answer_requests (answer_scope, created_at desc);

create index if not exists admin_security_evidence_answer_requests_private_room_idx
on admin_security_evidence_answer_requests (private_room_id, created_at desc);

create index if not exists admin_security_evidence_answer_requests_status_idx
on admin_security_evidence_answer_requests (status, created_at desc);

create table if not exists admin_security_evidence_answer_retrieved_chunks (
  id uuid primary key default gen_random_uuid(),
  answer_request_id uuid not null
    references admin_security_evidence_answer_requests(id)
    on delete cascade,
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
  source_type text,
  source_id uuid,
  artifact_type text,
  artifact_key text,
  title text,
  summary text,
  evidence_text text not null,
  page_number integer,
  section_key text,
  section_title text,
  rank_score numeric(12, 6) not null default 0,
  keyword_score numeric(12, 6),
  semantic_score numeric(12, 6),
  evidence_order integer not null default 0,
  selected_for_answer boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_security_evidence_answer_retrieved_chunks_request_idx
on admin_security_evidence_answer_retrieved_chunks (answer_request_id, evidence_order);

create index if not exists admin_security_evidence_answer_retrieved_chunks_chunk_idx
on admin_security_evidence_answer_retrieved_chunks (search_chunk_id);

create table if not exists admin_security_evidence_answer_citations (
  id uuid primary key default gen_random_uuid(),
  answer_request_id uuid not null
    references admin_security_evidence_answer_requests(id)
    on delete cascade,
  retrieved_chunk_id uuid
    references admin_security_evidence_answer_retrieved_chunks(id)
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
  citation_order integer not null default 0,
  confidence_score numeric(5, 4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (answer_request_id, citation_key)
);

create index if not exists admin_security_evidence_answer_citations_request_idx
on admin_security_evidence_answer_citations (answer_request_id, citation_order);

create index if not exists admin_security_evidence_answer_citations_chunk_idx
on admin_security_evidence_answer_citations (search_chunk_id);

create table if not exists admin_security_evidence_answer_guardrails (
  id uuid primary key default gen_random_uuid(),
  guardrail_key text not null unique,
  status text not null default 'active',
  guardrail_type text not null,
  severity text not null default 'medium',
  title text not null,
  description text not null,
  pattern text,
  blocked_answer_message text,
  applies_to_scope text not null default 'all',
  require_citation boolean not null default true,
  block_if_no_evidence boolean not null default true,
  block_if_scope_ambiguous boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_evidence_answer_guardrails_status_check
  check (status in ('active', 'paused', 'archived')),
  constraint admin_security_evidence_answer_guardrails_type_check
  check (
    guardrail_type in (
      'no_evidence',
      'scope_boundary',
      'legal_claim',
      'security_claim',
      'compliance_claim',
      'financial_claim',
      'medical_claim',
      'personal_data',
      'internal_metadata',
      'raw_artifact',
      'custom'
    )
  ),
  constraint admin_security_evidence_answer_guardrails_severity_check
  check (severity in ('low', 'medium', 'high', 'critical')),
  constraint admin_security_evidence_answer_guardrails_scope_check
  check (
    applies_to_scope in (
      'all',
      'public',
      'customer',
      'private_room',
      'auditor_portal',
      'enterprise_review_room',
      'admin'
    )
  ),
  constraint admin_security_evidence_answer_guardrails_title_check
  check (length(trim(title)) > 0),
  constraint admin_security_evidence_answer_guardrails_description_check
  check (length(trim(description)) > 0)
);

create index if not exists admin_security_evidence_answer_guardrails_status_idx
on admin_security_evidence_answer_guardrails (status, guardrail_type);

drop trigger if exists admin_security_evidence_answer_guardrails_set_updated_at
on admin_security_evidence_answer_guardrails;

create trigger admin_security_evidence_answer_guardrails_set_updated_at
before update on admin_security_evidence_answer_guardrails
for each row
execute function set_updated_at();

insert into admin_security_evidence_answer_guardrails (
  guardrail_key,
  guardrail_type,
  severity,
  title,
  description,
  blocked_answer_message,
  applies_to_scope,
  require_citation,
  block_if_no_evidence,
  block_if_scope_ambiguous,
  metadata
)
values
  (
    'answer_guardrail:no_evidence_no_answer',
    'no_evidence',
    'critical',
    'No evidence, no answer',
    'The system must not answer trust/security questions without scoped evidence.',
    'I do not have enough scoped evidence to answer that.',
    'all',
    true,
    true,
    true,
    '{}'::jsonb
  ),
  (
    'answer_guardrail:no_cross_scope_answering',
    'scope_boundary',
    'critical',
    'No cross-scope answering',
    'The system must not use evidence outside the requester scope.',
    'I cannot answer that from this scope.',
    'all',
    true,
    true,
    true,
    '{}'::jsonb
  ),
  (
    'answer_guardrail:cite_security_claims',
    'security_claim',
    'high',
    'Cite security claims',
    'Security claims require exact citations.',
    'I can only make security claims with exact evidence citations.',
    'all',
    true,
    true,
    true,
    '{}'::jsonb
  )
on conflict (guardrail_key)
do update set
  status = excluded.status,
  guardrail_type = excluded.guardrail_type,
  severity = excluded.severity,
  title = excluded.title,
  description = excluded.description,
  blocked_answer_message = excluded.blocked_answer_message,
  applies_to_scope = excluded.applies_to_scope,
  require_citation = excluded.require_citation,
  block_if_no_evidence = excluded.block_if_no_evidence,
  block_if_scope_ambiguous = excluded.block_if_scope_ambiguous,
  metadata = admin_security_evidence_answer_guardrails.metadata || excluded.metadata,
  updated_at = now();

create or replace function create_admin_security_evidence_answer_session(
  p_answer_scope text,
  p_requester_auth_user_id uuid default null,
  p_requester_email text default null,
  p_requester_display_name text default null,
  p_private_room_id uuid default null,
  p_private_room_participant_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_auditor_participant_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_expires_in_minutes integer default 60,
  p_max_questions integer default 100,
  p_allow_uncited_answers boolean default false,
  p_require_exact_citations boolean default true,
  p_allow_partial_answers boolean default true,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_session_id uuid;
  v_session_key text;
  v_raw_token text;
  v_hash text;
  v_prefix text;
  v_expires_at timestamptz;
begin
  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_raw_token, 'sha256'), 'hex');
  v_prefix := substr(v_raw_token, 1, 12);
  v_expires_at := now() + make_interval(mins => coalesce(p_expires_in_minutes, 60));

  v_session_key :=
    'evidence_answer_session:' ||
    p_answer_scope || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_evidence_answer_sessions (
    answer_session_key,
    status,
    answer_scope,
    requester_auth_user_id,
    requester_email,
    requester_display_name,
    private_room_id,
    private_room_participant_id,
    auditor_portal_id,
    auditor_participant_id,
    enterprise_review_room_id,
    customer_name,
    customer_domain,
    answer_token_hash_sha256,
    answer_token_prefix,
    expires_at,
    max_questions,
    allow_uncited_answers,
    require_exact_citations,
    allow_partial_answers,
    ip_address,
    user_agent,
    request_id,
    metadata
  )
  values (
    v_session_key,
    'active',
    p_answer_scope,
    p_requester_auth_user_id,
    lower(trim(p_requester_email)),
    p_requester_display_name,
    p_private_room_id,
    p_private_room_participant_id,
    p_auditor_portal_id,
    p_auditor_participant_id,
    p_enterprise_review_room_id,
    p_customer_name,
    p_customer_domain,
    v_hash,
    v_prefix,
    v_expires_at,
    coalesce(p_max_questions, 100),
    coalesce(p_allow_uncited_answers, false),
    coalesce(p_require_exact_citations, true),
    coalesce(p_allow_partial_answers, true),
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_session_id;

  return jsonb_build_object(
    'answerSessionId', v_session_id,
    'answerSessionKey', v_session_key,
    'answerToken', v_raw_token,
    'tokenPrefix', v_prefix,
    'answerScope', p_answer_scope,
    'expiresAt', v_expires_at
  );
end;
$$;

create or replace function create_private_room_evidence_answer_session(
  p_auth_user_id uuid,
  p_private_room_key text,
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
begin
  v_participant := get_active_private_trust_room_participant(
    p_auth_user_id,
    p_private_room_key
  );

  select *
  into v_room
  from admin_security_private_trust_rooms
  where id = v_participant.private_room_id;

  return create_admin_security_evidence_answer_session(
    'private_room',
    p_auth_user_id,
    v_participant.email,
    v_participant.display_name,
    v_room.id,
    v_participant.id,
    null,
    null,
    v_room.enterprise_review_room_id,
    v_room.customer_name,
    v_room.customer_domain,
    60,
    100,
    false,
    true,
    true,
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'source',
      'private_room_evidence_answer_session'
    )
  );
end;
$$;

create or replace function resolve_admin_security_evidence_answer_session(
  p_answer_token text,
  p_auth_user_id uuid default null
)
returns admin_security_evidence_answer_sessions
language plpgsql
as $$
declare
  v_hash text;
  v_session admin_security_evidence_answer_sessions%rowtype;
begin
  if p_answer_token is null or length(trim(p_answer_token)) < 32 then
    raise exception 'answer token is required';
  end if;

  v_hash := encode(digest(p_answer_token, 'sha256'), 'hex');

  select *
  into v_session
  from admin_security_evidence_answer_sessions
  where answer_token_hash_sha256 = v_hash
  for update;

  if v_session.id is null then
    raise exception 'answer token invalid';
  end if;

  if v_session.status = 'revoked' then
    raise exception 'answer session revoked';
  end if;

  if v_session.expires_at <= now() then
    raise exception 'answer session expired';
  end if;

  if v_session.question_count >= v_session.max_questions then
    raise exception 'answer session question limit reached';
  end if;

  if v_session.requester_auth_user_id is not null
    and p_auth_user_id is distinct from v_session.requester_auth_user_id
  then
    raise exception 'answer session authentication mismatch';
  end if;

  return v_session;
end;
$$;

create or replace function retrieve_admin_security_evidence_for_answer(
  p_answer_request_id uuid,
  p_answer_scope text,
  p_question_text text,
  p_limit integer default 8,
  p_private_room_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_customer_name text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_normalized text;
  v_count integer;
begin
  if p_question_text is null or length(trim(p_question_text)) = 0 then
    raise exception 'answer question text is required';
  end if;

  if p_limit <= 0 or p_limit > 25 then
    raise exception 'answer evidence limit must be between 1 and 25';
  end if;

  v_normalized := lower(trim(regexp_replace(p_question_text, '\s+', ' ', 'g')));

  insert into admin_security_evidence_answer_retrieved_chunks (
    answer_request_id,
    search_document_id,
    search_chunk_id,
    viewer_subject_id,
    viewer_item_id,
    source_type,
    source_id,
    artifact_type,
    artifact_key,
    title,
    summary,
    evidence_text,
    page_number,
    section_key,
    section_title,
    rank_score,
    keyword_score,
    semantic_score,
    evidence_order,
    selected_for_answer,
    metadata
  )
  select
    p_answer_request_id,
    d.id,
    c.id,
    c.viewer_subject_id,
    c.viewer_item_id,
    c.source_type,
    c.source_id,
    c.artifact_type,
    c.artifact_key,
    coalesce(c.title, d.title),
    coalesce(c.summary, d.summary),
    c.content_text,
    c.page_number,
    c.section_key,
    c.section_title,
    ts_rank_cd(c.search_tsv, plainto_tsquery('english', v_normalized))::numeric(12, 6),
    ts_rank_cd(c.search_tsv, plainto_tsquery('english', v_normalized))::numeric(12, 6),
    null,
    row_number() over (
      order by ts_rank_cd(c.search_tsv, plainto_tsquery('english', v_normalized)) desc, c.sort_order asc
    ),
    true,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'retrievalType',
      'keyword'
    )
  from admin_security_artifact_search_chunks c
  join admin_security_artifact_search_documents d
    on d.id = c.search_document_id
  where d.status = 'ready'
    and c.search_tsv @@ plainto_tsquery('english', v_normalized)
    and (
      d.expires_at is null
      or d.expires_at > now()
    )
    and (
      (
        p_answer_scope = 'public'
        and d.search_scope = 'public'
        and d.visibility = 'public'
      )
      or (
        p_answer_scope = 'customer'
        and d.search_scope in ('customer', 'public')
        and d.customer_name = p_customer_name
      )
      or (
        p_answer_scope = 'private_room'
        and d.search_scope in ('private_room', 'customer', 'public')
        and (
          d.private_room_id = p_private_room_id
          or (
            d.private_room_id is null
            and d.customer_name = p_customer_name
          )
        )
      )
      or (
        p_answer_scope = 'auditor_portal'
        and d.search_scope in ('auditor_portal', 'customer', 'public')
        and (
          d.auditor_portal_id = p_auditor_portal_id
          or (
            d.auditor_portal_id is null
            and d.customer_name = p_customer_name
          )
        )
      )
      or (
        p_answer_scope = 'enterprise_review_room'
        and d.search_scope in ('enterprise_review_room', 'customer', 'public')
        and (
          d.enterprise_review_room_id = p_enterprise_review_room_id
          or (
            d.enterprise_review_room_id is null
            and d.customer_name = p_customer_name
          )
        )
      )
      or p_answer_scope = 'admin'
    )
  order by ts_rank_cd(c.search_tsv, plainto_tsquery('english', v_normalized)) desc, c.sort_order asc
  limit p_limit;

  get diagnostics v_count = row_count;

  return v_count;
end;
$$;

create or replace function generate_admin_security_evidence_answer(
  p_answer_token text,
  p_question_text text,
  p_limit integer default 8,
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
  v_started_at timestamptz := clock_timestamp();
  v_session admin_security_evidence_answer_sessions%rowtype;
  v_answer_request_id uuid;
  v_request_key text;
  v_normalized text;
  v_retrieved_count integer := 0;
  v_cited_count integer := 0;
  v_answer_text text;
  v_answer_status text := 'not_answered';
  v_non_answer_reason text;
  v_confidence numeric(5, 4) := 0;
  v_citations jsonb;
  v_evidence jsonb;
begin
  if p_question_text is null or length(trim(p_question_text)) = 0 then
    raise exception 'answer question text is required';
  end if;

  if p_limit <= 0 or p_limit > 25 then
    raise exception 'answer evidence limit must be between 1 and 25';
  end if;

  v_session := resolve_admin_security_evidence_answer_session(
    p_answer_token,
    p_auth_user_id
  );

  v_normalized := lower(trim(regexp_replace(p_question_text, '\s+', ' ', 'g')));

  v_request_key :=
    'evidence_answer_request:' ||
    v_session.answer_session_key || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_evidence_answer_requests (
    answer_request_key,
    answer_session_id,
    status,
    answer_scope,
    question_text,
    normalized_question,
    requester_auth_user_id,
    requester_email,
    private_room_id,
    private_room_participant_id,
    auditor_portal_id,
    auditor_participant_id,
    enterprise_review_room_id,
    customer_name,
    customer_domain,
    ip_address,
    user_agent,
    request_id,
    metadata
  )
  values (
    v_request_key,
    v_session.id,
    'retrieving',
    v_session.answer_scope,
    p_question_text,
    v_normalized,
    p_auth_user_id,
    v_session.requester_email,
    v_session.private_room_id,
    v_session.private_room_participant_id,
    v_session.auditor_portal_id,
    v_session.auditor_participant_id,
    v_session.enterprise_review_room_id,
    v_session.customer_name,
    v_session.customer_domain,
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_answer_request_id;

  v_retrieved_count := retrieve_admin_security_evidence_for_answer(
    v_answer_request_id,
    v_session.answer_scope,
    p_question_text,
    p_limit,
    v_session.private_room_id,
    v_session.auditor_portal_id,
    v_session.enterprise_review_room_id,
    v_session.customer_name,
    coalesce(p_metadata, '{}'::jsonb)
  );

  if v_retrieved_count = 0 then
    v_answer_status := 'not_answered';
    v_non_answer_reason := 'No scoped evidence found.';
    v_answer_text := 'I do not have enough scoped evidence to answer that.';
    v_confidence := 0;
  else
    insert into admin_security_evidence_answer_citations (
      answer_request_id,
      retrieved_chunk_id,
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
      citation_order,
      confidence_score,
      metadata
    )
    select
      v_answer_request_id,
      r.id,
      r.search_document_id,
      r.search_chunk_id,
      r.viewer_subject_id,
      r.viewer_item_id,
      'C' || r.evidence_order::text,
      r.source_type,
      r.source_id,
      r.artifact_type,
      r.artifact_key,
      r.title,
      r.section_title,
      r.page_number,
      r.section_key,
      left(r.evidence_text, 1000),
      r.evidence_order,
      least(0.95, greatest(0.10, r.rank_score))::numeric(5, 4),
      jsonb_build_object('citationType', 'retrieved_chunk')
    from admin_security_evidence_answer_retrieved_chunks r
    where r.answer_request_id = v_answer_request_id
      and r.selected_for_answer is true
    order by r.evidence_order asc
    limit least(v_retrieved_count, 5);

    get diagnostics v_cited_count = row_count;

    v_answer_status := case
      when v_cited_count > 0 then 'answered'
      else 'not_answered'
    end;

    if v_cited_count = 0 then
      v_non_answer_reason := 'Retrieved evidence could not be cited.';
      v_answer_text := 'I found related scoped evidence, but not enough citable evidence to answer safely.';
      v_confidence := 0.20;
    else
      select string_agg(
        '- ' ||
        coalesce(c.title, 'Evidence') ||
        case when c.section_title is not null then ' / ' || c.section_title else '' end ||
        case when c.page_number is not null then ' / page ' || c.page_number::text else '' end ||
        ': ' || left(regexp_replace(c.cited_text, '\s+', ' ', 'g'), 350) ||
        ' [' || c.citation_key || ']',
        E'\n'
        order by c.citation_order asc
      )
      into v_answer_text
      from admin_security_evidence_answer_citations c
      where c.answer_request_id = v_answer_request_id;

      v_answer_text := 'Based on the scoped evidence I found:' || E'\n' || v_answer_text;

      select least(0.95, greatest(0.30, avg(confidence_score)))::numeric(5, 4)
      into v_confidence
      from admin_security_evidence_answer_citations
      where answer_request_id = v_answer_request_id;
    end if;
  end if;

  update admin_security_evidence_answer_requests
  set
    status = case
      when v_answer_status = 'answered' then 'answered'
      when v_answer_status = 'partially_answered' then 'partially_answered'
      else 'not_answered'
    end,
    answer_status = v_answer_status,
    answer_text = v_answer_text,
    non_answer_reason = v_non_answer_reason,
    confidence_score = v_confidence,
    evidence_score = v_confidence,
    retrieved_chunk_count = v_retrieved_count,
    cited_chunk_count = v_cited_count,
    latency_ms = greatest(1, floor(extract(epoch from (clock_timestamp() - v_started_at)) * 1000)::integer),
    completed_at = now()
  where id = v_answer_request_id;

  update admin_security_evidence_answer_sessions
  set
    question_count = question_count + 1,
    updated_at = now()
  where id = v_session.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'citationKey', c.citation_key,
        'artifactKey', c.artifact_key,
        'artifactType', c.artifact_type,
        'title', c.title,
        'sectionTitle', c.section_title,
        'pageNumber', c.page_number,
        'sectionKey', c.section_key,
        'citedText', c.cited_text,
        'confidenceScore', c.confidence_score,
        'viewerSubjectId', c.viewer_subject_id,
        'viewerItemId', c.viewer_item_id
      )
      order by c.citation_order asc
    ),
    '[]'::jsonb
  )
  into v_citations
  from admin_security_evidence_answer_citations c
  where c.answer_request_id = v_answer_request_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'artifactKey', r.artifact_key,
        'artifactType', r.artifact_type,
        'title', r.title,
        'summary', r.summary,
        'evidenceText', left(r.evidence_text, 500),
        'pageNumber', r.page_number,
        'sectionKey', r.section_key,
        'sectionTitle', r.section_title,
        'rankScore', r.rank_score,
        'selectedForAnswer', r.selected_for_answer
      )
      order by r.evidence_order asc
    ),
    '[]'::jsonb
  )
  into v_evidence
  from admin_security_evidence_answer_retrieved_chunks r
  where r.answer_request_id = v_answer_request_id;

  return jsonb_build_object(
    'answerRequestId', v_answer_request_id,
    'answerSessionId', v_session.id,
    'questionText', p_question_text,
    'answerStatus', v_answer_status,
    'answerText', v_answer_text,
    'nonAnswerReason', v_non_answer_reason,
    'confidenceScore', v_confidence,
    'retrievedChunkCount', v_retrieved_count,
    'citedChunkCount', v_cited_count,
    'citations', v_citations,
    'evidence', v_evidence
  );
exception
  when others then
    if v_answer_request_id is not null then
      update admin_security_evidence_answer_requests
      set
        status = 'failed',
        answer_status = 'failed',
        non_answer_reason = sqlerrm,
        latency_ms = greatest(1, floor(extract(epoch from (clock_timestamp() - v_started_at)) * 1000)::integer),
        completed_at = now()
      where id = v_answer_request_id;
    end if;

    raise;
end;
$$;

create or replace function expire_admin_security_evidence_answer_sessions(
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

  update admin_security_evidence_answer_sessions
  set
    status = 'expired',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'expired_by_worker',
      p_worker_id,
      'answer_session_expiry_run_id',
      v_run_id
    ),
    updated_at = now()
  where id in (
    select id
    from admin_security_evidence_answer_sessions
    where status = 'active'
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  return v_run_id;
end;
$$;

create or replace view admin_security_evidence_answer_session_dashboard as
select
  s.id as admin_security_evidence_answer_session_id,
  s.answer_session_key,
  s.status,
  s.answer_scope,
  s.requester_auth_user_id,
  s.requester_email,
  s.requester_display_name,
  s.private_room_id,
  r.private_room_key,
  s.private_room_participant_id,
  p.email as private_room_participant_email,
  s.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  s.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  s.customer_name,
  s.customer_domain,
  s.answer_token_prefix,
  s.expires_at,
  s.question_count,
  s.max_questions,
  s.allow_uncited_answers,
  s.require_exact_citations,
  s.allow_partial_answers,
  s.ip_address,
  s.user_agent,
  s.created_at,
  s.updated_at,
  s.metadata
from admin_security_evidence_answer_sessions s
left join admin_security_private_trust_rooms r
  on r.id = s.private_room_id
left join admin_security_private_trust_room_participants p
  on p.id = s.private_room_participant_id
left join admin_security_auditor_portals ap
  on ap.id = s.auditor_portal_id
left join admin_security_enterprise_review_rooms er
  on er.id = s.enterprise_review_room_id
order by s.created_at desc;

create or replace view admin_security_evidence_answer_request_dashboard as
select
  q.id as admin_security_evidence_answer_request_id,
  q.answer_request_key,
  q.answer_session_id,
  s.answer_session_key,
  q.status,
  q.answer_scope,
  q.question_text,
  q.normalized_question,
  q.answer_text,
  q.answer_status,
  q.non_answer_reason,
  q.confidence_score,
  q.evidence_score,
  q.retrieved_chunk_count,
  q.cited_chunk_count,
  q.latency_ms,
  q.requester_auth_user_id,
  q.requester_email,
  q.private_room_id,
  r.private_room_key,
  q.private_room_participant_id,
  p.email as private_room_participant_email,
  q.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  q.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  q.customer_name,
  q.customer_domain,
  q.ip_address,
  q.user_agent,
  q.created_at,
  q.completed_at,
  q.metadata
from admin_security_evidence_answer_requests q
left join admin_security_evidence_answer_sessions s
  on s.id = q.answer_session_id
left join admin_security_private_trust_rooms r
  on r.id = q.private_room_id
left join admin_security_private_trust_room_participants p
  on p.id = q.private_room_participant_id
left join admin_security_auditor_portals ap
  on ap.id = q.auditor_portal_id
left join admin_security_enterprise_review_rooms er
  on er.id = q.enterprise_review_room_id
order by q.created_at desc;

create or replace view admin_security_evidence_answer_citation_dashboard as
select
  c.id as admin_security_evidence_answer_citation_id,
  c.answer_request_id,
  q.answer_request_key,
  c.citation_key,
  c.search_document_id,
  d.search_document_key,
  c.search_chunk_id,
  c.viewer_subject_id,
  vs.viewer_subject_key,
  c.viewer_item_id,
  vi.item_key as viewer_item_key,
  c.source_type,
  c.source_id,
  c.artifact_type,
  c.artifact_key,
  c.title,
  c.section_title,
  c.page_number,
  c.section_key,
  c.cited_text,
  c.citation_order,
  c.confidence_score,
  c.created_at,
  c.metadata
from admin_security_evidence_answer_citations c
join admin_security_evidence_answer_requests q
  on q.id = c.answer_request_id
left join admin_security_artifact_search_documents d
  on d.id = c.search_document_id
left join admin_security_artifact_viewer_subjects vs
  on vs.id = c.viewer_subject_id
left join admin_security_artifact_viewer_items vi
  on vi.id = c.viewer_item_id
order by c.created_at desc;

create or replace view admin_security_evidence_answer_integrity as
select
  (
    select count(*)
    from admin_security_evidence_answer_sessions
    where status = 'active'
  ) as active_answer_session_count,
  (
    select count(*)
    from admin_security_evidence_answer_sessions
    where status = 'active'
      and expires_at <= now()
  ) as overdue_expired_answer_session_count,
  (
    select count(*)
    from admin_security_evidence_answer_requests
    where created_at >= now() - interval '24 hours'
  ) as answer_request_count_24h,
  (
    select count(*)
    from admin_security_evidence_answer_requests
    where answer_status = 'answered'
      and created_at >= now() - interval '24 hours'
  ) as answered_count_24h,
  (
    select count(*)
    from admin_security_evidence_answer_requests
    where answer_status = 'not_answered'
      and created_at >= now() - interval '24 hours'
  ) as not_answered_count_24h,
  (
    select count(*)
    from admin_security_evidence_answer_requests
    where answer_status = 'answered'
      and cited_chunk_count = 0
  ) as unsafe_uncited_answer_count,
  (
    select count(*)
    from admin_security_evidence_answer_requests
    where status = 'failed'
      and created_at >= now() - interval '1 hour'
  ) as failed_answer_request_count_1h,
  now() as checked_at;

grant select on admin_security_evidence_answer_session_dashboard to admin_api_role;
grant select on admin_security_evidence_answer_request_dashboard to admin_api_role;
grant select on admin_security_evidence_answer_citation_dashboard to admin_api_role;
grant select on admin_security_evidence_answer_integrity to admin_api_role;

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
    'admin_security_evidence_answer_session_expiry_every_5m',
    'Expire evidence answer sessions',
    'admin',
    true,
    '*/5 * * * *',
    'expire_admin_security_evidence_answer_sessions',
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

alter table admin_security_evidence_answer_sessions enable row level security;
alter table admin_security_evidence_answer_requests enable row level security;
alter table admin_security_evidence_answer_retrieved_chunks enable row level security;
alter table admin_security_evidence_answer_citations enable row level security;
alter table admin_security_evidence_answer_guardrails enable row level security;

create policy admin_security_evidence_answer_sessions_no_user_direct_access
on admin_security_evidence_answer_sessions
for all
to authenticated
using (false)
with check (false);

create policy admin_security_evidence_answer_requests_no_user_direct_access
on admin_security_evidence_answer_requests
for all
to authenticated
using (false)
with check (false);

create policy admin_security_evidence_answer_retrieved_chunks_no_user_direct_access
on admin_security_evidence_answer_retrieved_chunks
for all
to authenticated
using (false)
with check (false);

create policy admin_security_evidence_answer_citations_no_user_direct_access
on admin_security_evidence_answer_citations
for all
to authenticated
using (false)
with check (false);

create policy admin_security_evidence_answer_guardrails_no_user_direct_access
on admin_security_evidence_answer_guardrails
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_admin_security_evidence_answer_sessions
on admin_security_evidence_answer_sessions
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_evidence_answer_requests
on admin_security_evidence_answer_requests
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_evidence_answer_retrieved_chunks
on admin_security_evidence_answer_retrieved_chunks
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_evidence_answer_citations
on admin_security_evidence_answer_citations
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_read_admin_security_evidence_answer_guardrails
on admin_security_evidence_answer_guardrails
for select
to admin_api_role
using (true);

grant execute on function create_admin_security_evidence_answer_session(
  text,
  uuid,
  text,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  integer,
  integer,
  boolean,
  boolean,
  boolean,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function create_private_room_evidence_answer_session(
  uuid,
  text,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function resolve_admin_security_evidence_answer_session(text, uuid)
to admin_api_role;

grant execute on function retrieve_admin_security_evidence_for_answer(
  uuid,
  text,
  text,
  integer,
  uuid,
  uuid,
  uuid,
  text,
  jsonb
) to admin_api_role;

grant execute on function generate_admin_security_evidence_answer(
  text,
  text,
  integer,
  uuid,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function expire_admin_security_evidence_answer_sessions(integer, text, jsonb)
to admin_api_role, worker_role;

alter function create_admin_security_evidence_answer_session(
  text,
  uuid,
  text,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  integer,
  integer,
  boolean,
  boolean,
  boolean,
  inet,
  text,
  text,
  jsonb
) security definer;
alter function create_admin_security_evidence_answer_session(
  text,
  uuid,
  text,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  integer,
  integer,
  boolean,
  boolean,
  boolean,
  inet,
  text,
  text,
  jsonb
) set search_path = public;

alter function create_private_room_evidence_answer_session(uuid, text, inet, text, text, jsonb) security definer;
alter function create_private_room_evidence_answer_session(uuid, text, inet, text, text, jsonb) set search_path = public;

alter function resolve_admin_security_evidence_answer_session(text, uuid) security definer;
alter function resolve_admin_security_evidence_answer_session(text, uuid) set search_path = public;

alter function retrieve_admin_security_evidence_for_answer(
  uuid,
  text,
  text,
  integer,
  uuid,
  uuid,
  uuid,
  text,
  jsonb
) security definer;
alter function retrieve_admin_security_evidence_for_answer(
  uuid,
  text,
  text,
  integer,
  uuid,
  uuid,
  uuid,
  text,
  jsonb
) set search_path = public;

alter function generate_admin_security_evidence_answer(
  text,
  text,
  integer,
  uuid,
  inet,
  text,
  text,
  jsonb
) security definer;
alter function generate_admin_security_evidence_answer(
  text,
  text,
  integer,
  uuid,
  inet,
  text,
  text,
  jsonb
) set search_path = public;

alter function expire_admin_security_evidence_answer_sessions(integer, text, jsonb) security definer;
alter function expire_admin_security_evidence_answer_sessions(integer, text, jsonb) set search_path = public;

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
    'ANSWER_SESSION_INVALID',
    'permission',
    'high',
    403,
    false,
    true,
    'Answer session is invalid.',
    'Answer token invalid.',
    'platform'
  ),
  (
    'ANSWER_SESSION_EXPIRED',
    'permission',
    'medium',
    410,
    false,
    true,
    'Answer session has expired.',
    'Answer session expired.',
    'platform'
  ),
  (
    'ANSWER_SESSION_LIMIT_REACHED',
    'permission',
    'medium',
    429,
    false,
    true,
    'Answer session question limit reached.',
    'Answer session question limit reached.',
    'platform'
  ),
  (
    'ANSWER_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Answer request requires complete fields.',
    'Answer required fields missing.',
    'platform'
  ),
  (
    'ANSWER_NO_EVIDENCE',
    'validation',
    'medium',
    200,
    false,
    true,
    'No scoped evidence was found.',
    'No scoped evidence found.',
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
  ('answer token is required', 'ANSWER_REQUIRED_FIELDS', 5, '{}'),
  ('answer question text is required', 'ANSWER_REQUIRED_FIELDS', 5, '{}'),
  ('answer evidence limit must be between 1 and 25', 'ANSWER_REQUIRED_FIELDS', 5, '{}'),
  ('answer token invalid', 'ANSWER_SESSION_INVALID', 5, '{}'),
  ('answer session revoked', 'ANSWER_SESSION_INVALID', 5, '{}'),
  ('answer session expired', 'ANSWER_SESSION_EXPIRED', 5, '{}'),
  ('answer session question limit reached', 'ANSWER_SESSION_LIMIT_REACHED', 5, '{}'),
  ('answer session authentication mismatch', 'ANSWER_SESSION_INVALID', 5, '{}'),
  ('No scoped evidence found', 'ANSWER_NO_EVIDENCE', 5, '{}')
on conflict do nothing;
