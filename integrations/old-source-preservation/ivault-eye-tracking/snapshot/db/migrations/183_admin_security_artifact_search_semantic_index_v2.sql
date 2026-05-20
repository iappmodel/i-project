-- Step 9.68 — Build artifact search and semantic index v2.
-- Runs after 182_admin_security_universal_artifact_viewer_v2.sql.

create table if not exists admin_security_artifact_search_documents (
  id uuid primary key default gen_random_uuid(),
  search_document_key text not null unique,
  status text not null default 'pending',
  viewer_subject_id uuid not null
    references admin_security_artifact_viewer_subjects(id)
    on delete cascade,
  download_subject_id uuid
    references admin_security_artifact_download_subjects(id)
    on delete set null,
  source_type text not null,
  source_id uuid not null,
  artifact_type text not null,
  artifact_key text,
  title text not null,
  summary text,
  search_scope text not null,
  visibility text not null,
  sensitivity text not null,
  redaction_policy text not null default 'none',
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  indexed_item_count integer not null default 0,
  indexed_chunk_count integer not null default 0,
  embedding_model text,
  embedding_version text,
  last_indexed_at timestamptz,
  last_error text,
  expires_at timestamptz,
  request_id text,
  public_metadata jsonb not null default '{}'::jsonb,
  internal_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (viewer_subject_id),
  constraint admin_security_artifact_search_documents_status_check
  check (
    status in (
      'pending',
      'indexing',
      'ready',
      'failed',
      'expired',
      'revoked',
      'archived'
    )
  ),
  constraint admin_security_artifact_search_documents_scope_check
  check (
    search_scope in (
      'public',
      'customer',
      'private_room',
      'auditor_portal',
      'enterprise_review_room',
      'admin'
    )
  ),
  constraint admin_security_artifact_search_documents_visibility_check
  check (
    visibility in (
      'public',
      'customer_scoped',
      'private_room_scoped',
      'auditor_scoped',
      'enterprise_review_room',
      'admin_only'
    )
  ),
  constraint admin_security_artifact_search_documents_sensitivity_check
  check (
    sensitivity in (
      'public',
      'customer_confidential',
      'restricted',
      'legal_sensitive',
      'security_sensitive'
    )
  ),
  constraint admin_security_artifact_search_documents_redaction_policy_check
  check (
    redaction_policy in (
      'none',
      'customer_safe',
      'public_safe',
      'auditor_safe',
      'metadata_only',
      'manual_required'
    )
  ),
  constraint admin_security_artifact_search_documents_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_artifact_search_documents_subject_idx
on admin_security_artifact_search_documents (viewer_subject_id, status);

create index if not exists admin_security_artifact_search_documents_source_idx
on admin_security_artifact_search_documents (source_type, source_id);

create index if not exists admin_security_artifact_search_documents_scope_idx
on admin_security_artifact_search_documents (search_scope, status);

create index if not exists admin_security_artifact_search_documents_private_room_idx
on admin_security_artifact_search_documents (private_room_id, status);

create index if not exists admin_security_artifact_search_documents_customer_idx
on admin_security_artifact_search_documents (customer_name, customer_domain);

drop trigger if exists admin_security_artifact_search_documents_set_updated_at
on admin_security_artifact_search_documents;

create trigger admin_security_artifact_search_documents_set_updated_at
before update on admin_security_artifact_search_documents
for each row
execute function set_updated_at();

create table if not exists admin_security_artifact_search_chunks (
  id uuid primary key default gen_random_uuid(),
  search_document_id uuid not null
    references admin_security_artifact_search_documents(id)
    on delete cascade,
  viewer_subject_id uuid not null
    references admin_security_artifact_viewer_subjects(id)
    on delete cascade,
  viewer_item_id uuid
    references admin_security_artifact_viewer_items(id)
    on delete set null,
  chunk_key text not null,
  chunk_type text not null default 'text',
  source_type text not null,
  source_id uuid not null,
  artifact_type text not null,
  artifact_key text,
  page_number integer,
  section_key text,
  section_title text,
  title text,
  summary text,
  content_text text not null,
  content_hash_sha256 text not null,
  token_count integer not null default 0,
  character_count integer not null default 0,
  search_tsv tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' ||
      coalesce(summary, '') || ' ' ||
      coalesce(content_text, '')
    )
  ) stored,
  embedding_status text not null default 'not_required',
  embedding_model text,
  embedding_version text,
  embedding_vector_id text,
  embedding_dimensions integer,
  embedding_checksum_sha256 text,
  redacted boolean not null default false,
  redaction_summary text,
  sort_order integer not null default 0,
  public_metadata jsonb not null default '{}'::jsonb,
  internal_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (search_document_id, chunk_key),
  constraint admin_security_artifact_search_chunks_type_check
  check (
    chunk_type in (
      'text',
      'page',
      'section',
      'metadata',
      'manifest_section',
      'package_item',
      'table_row',
      'json_node',
      'other'
    )
  ),
  constraint admin_security_artifact_search_chunks_embedding_status_check
  check (
    embedding_status in (
      'not_required',
      'pending',
      'embedded',
      'failed',
      'disabled'
    )
  ),
  constraint admin_security_artifact_search_chunks_content_check
  check (length(trim(content_text)) > 0),
  constraint admin_security_artifact_search_chunks_character_count_check
  check (character_count >= 0),
  constraint admin_security_artifact_search_chunks_token_count_check
  check (token_count >= 0)
);

create index if not exists admin_security_artifact_search_chunks_document_idx
on admin_security_artifact_search_chunks (search_document_id, sort_order);

create index if not exists admin_security_artifact_search_chunks_subject_idx
on admin_security_artifact_search_chunks (viewer_subject_id);

create index if not exists admin_security_artifact_search_chunks_item_idx
on admin_security_artifact_search_chunks (viewer_item_id);

create index if not exists admin_security_artifact_search_chunks_fts_idx
on admin_security_artifact_search_chunks using gin (search_tsv);

create index if not exists admin_security_artifact_search_chunks_embedding_status_idx
on admin_security_artifact_search_chunks (embedding_status, created_at);

create table if not exists admin_security_artifact_search_sessions (
  id uuid primary key default gen_random_uuid(),
  search_session_key text not null unique,
  status text not null default 'active',
  search_scope text not null,
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
  session_token_hash_sha256 text,
  session_token_prefix text,
  expires_at timestamptz not null default (now() + interval '60 minutes'),
  query_count integer not null default 0,
  max_queries integer not null default 100,
  ip_address inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_artifact_search_sessions_status_check
  check (
    status in (
      'active',
      'expired',
      'revoked',
      'completed',
      'archived'
    )
  ),
  constraint admin_security_artifact_search_sessions_scope_check
  check (
    search_scope in (
      'public',
      'customer',
      'private_room',
      'auditor_portal',
      'enterprise_review_room',
      'admin'
    )
  ),
  constraint admin_security_artifact_search_sessions_expiry_check
  check (expires_at > created_at),
  constraint admin_security_artifact_search_sessions_query_count_check
  check (query_count >= 0),
  constraint admin_security_artifact_search_sessions_max_queries_check
  check (max_queries between 1 and 10000)
);

create index if not exists admin_security_artifact_search_sessions_token_idx
on admin_security_artifact_search_sessions (session_token_hash_sha256);

create index if not exists admin_security_artifact_search_sessions_scope_idx
on admin_security_artifact_search_sessions (search_scope, status);

create index if not exists admin_security_artifact_search_sessions_private_room_idx
on admin_security_artifact_search_sessions (private_room_id, private_room_participant_id, status);

create index if not exists admin_security_artifact_search_sessions_expiry_idx
on admin_security_artifact_search_sessions (status, expires_at);

drop trigger if exists admin_security_artifact_search_sessions_set_updated_at
on admin_security_artifact_search_sessions;

create trigger admin_security_artifact_search_sessions_set_updated_at
before update on admin_security_artifact_search_sessions
for each row
execute function set_updated_at();

create table if not exists admin_security_artifact_search_queries (
  id uuid primary key default gen_random_uuid(),
  search_query_key text not null unique,
  search_session_id uuid
    references admin_security_artifact_search_sessions(id)
    on delete set null,
  status text not null default 'completed',
  search_scope text not null,
  query_text text not null,
  normalized_query text not null,
  query_type text not null default 'keyword',
  requester_auth_user_id uuid,
  requester_email text,
  private_room_id uuid,
  private_room_participant_id uuid,
  auditor_portal_id uuid,
  auditor_participant_id uuid,
  enterprise_review_room_id uuid,
  customer_name text,
  customer_domain text,
  result_count integer not null default 0,
  latency_ms integer,
  failure_reason text,
  ip_address inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_artifact_search_queries_status_check
  check (
    status in (
      'completed',
      'failed',
      'denied',
      'expired',
      'rate_limited'
    )
  ),
  constraint admin_security_artifact_search_queries_scope_check
  check (
    search_scope in (
      'public',
      'customer',
      'private_room',
      'auditor_portal',
      'enterprise_review_room',
      'admin'
    )
  ),
  constraint admin_security_artifact_search_queries_type_check
  check (
    query_type in (
      'keyword',
      'semantic',
      'hybrid',
      'filter_only'
    )
  ),
  constraint admin_security_artifact_search_queries_text_check
  check (length(trim(query_text)) > 0)
);

create index if not exists admin_security_artifact_search_queries_session_idx
on admin_security_artifact_search_queries (search_session_id, created_at desc);

create index if not exists admin_security_artifact_search_queries_scope_idx
on admin_security_artifact_search_queries (search_scope, created_at desc);

create index if not exists admin_security_artifact_search_queries_private_room_idx
on admin_security_artifact_search_queries (private_room_id, created_at desc);

create table if not exists admin_security_artifact_search_results (
  id uuid primary key default gen_random_uuid(),
  search_query_id uuid not null
    references admin_security_artifact_search_queries(id)
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
  snippet text,
  page_number integer,
  section_key text,
  section_title text,
  rank_score numeric(12, 6) not null default 0,
  keyword_score numeric(12, 6),
  semantic_score numeric(12, 6),
  result_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_security_artifact_search_results_query_idx
on admin_security_artifact_search_results (search_query_id, result_order);

create index if not exists admin_security_artifact_search_results_document_idx
on admin_security_artifact_search_results (search_document_id);

create index if not exists admin_security_artifact_search_results_chunk_idx
on admin_security_artifact_search_results (search_chunk_id);

create or replace function register_admin_security_artifact_search_document(
  p_viewer_subject_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_subject admin_security_artifact_viewer_subjects%rowtype;
  v_document_id uuid;
  v_document_key text;
  v_scope text;
begin
  select *
  into v_subject
  from admin_security_artifact_viewer_subjects
  where id = p_viewer_subject_id;

  if v_subject.id is null then
    raise exception 'viewer subject not found: %', p_viewer_subject_id;
  end if;

  if v_subject.status <> 'ready' then
    raise exception 'viewer subject must be ready before indexing: %', v_subject.status;
  end if;

  if v_subject.redaction_policy = 'manual_required' then
    raise exception 'viewer subject requires manual redaction before indexing';
  end if;

  v_scope :=
    case
      when v_subject.default_visibility = 'public' then 'public'
      when v_subject.default_visibility = 'private_room_scoped' then 'private_room'
      when v_subject.default_visibility = 'auditor_scoped' then 'auditor_portal'
      when v_subject.default_visibility = 'enterprise_review_room' then 'enterprise_review_room'
      when v_subject.default_visibility = 'customer_scoped' then 'customer'
      else 'admin'
    end;

  v_document_key :=
    'search_document:' ||
    v_subject.source_type || ':' ||
    v_subject.source_id::text;

  insert into admin_security_artifact_search_documents (
    search_document_key,
    status,
    viewer_subject_id,
    download_subject_id,
    source_type,
    source_id,
    artifact_type,
    artifact_key,
    title,
    summary,
    search_scope,
    visibility,
    sensitivity,
    redaction_policy,
    customer_name,
    customer_domain,
    private_room_id,
    auditor_portal_id,
    enterprise_review_room_id,
    embedding_model,
    embedding_version,
    expires_at,
    request_id,
    public_metadata,
    internal_metadata
  )
  values (
    v_document_key,
    'pending',
    v_subject.id,
    v_subject.download_subject_id,
    v_subject.source_type,
    v_subject.source_id,
    v_subject.artifact_type,
    v_subject.artifact_key,
    v_subject.title,
    v_subject.summary,
    v_scope,
    v_subject.default_visibility,
    v_subject.sensitivity,
    v_subject.redaction_policy,
    v_subject.customer_name,
    v_subject.customer_domain,
    v_subject.private_room_id,
    v_subject.auditor_portal_id,
    v_subject.enterprise_review_room_id,
    'local-keyword-placeholder',
    'v1',
    v_subject.expires_at,
    p_request_id,
    v_subject.public_metadata,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (viewer_subject_id)
  do update set
    status = case
      when admin_security_artifact_search_documents.status in ('revoked', 'archived') then admin_security_artifact_search_documents.status
      else 'pending'
    end,
    title = excluded.title,
    summary = excluded.summary,
    search_scope = excluded.search_scope,
    visibility = excluded.visibility,
    sensitivity = excluded.sensitivity,
    redaction_policy = excluded.redaction_policy,
    customer_name = excluded.customer_name,
    customer_domain = excluded.customer_domain,
    private_room_id = excluded.private_room_id,
    auditor_portal_id = excluded.auditor_portal_id,
    enterprise_review_room_id = excluded.enterprise_review_room_id,
    expires_at = excluded.expires_at,
    public_metadata = admin_security_artifact_search_documents.public_metadata || excluded.public_metadata,
    internal_metadata = admin_security_artifact_search_documents.internal_metadata || excluded.internal_metadata,
    updated_at = now()
  returning id into v_document_id;

  return v_document_id;
end;
$$;

create or replace function discover_admin_security_artifact_search_documents(
  p_batch_size integer default 1000,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_subject record;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_subject in
    select s.*
    from admin_security_artifact_viewer_subjects s
    where s.status = 'ready'
      and s.previewable is true
      and s.redaction_policy <> 'manual_required'
      and not exists (
        select 1
        from admin_security_artifact_search_documents d
        where d.viewer_subject_id = s.id
          and d.status in ('pending', 'indexing', 'ready')
      )
    order by s.created_at asc
    limit p_batch_size
  loop
    perform register_admin_security_artifact_search_document(
      v_subject.id,
      null,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'search_document_discovery_run_id',
        v_run_id,
        'worker_id',
        p_worker_id
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function claim_admin_security_artifact_search_documents_for_indexing(
  p_batch_size integer default 25,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  search_document_id uuid,
  search_document_key text,
  viewer_subject_id uuid,
  source_type text,
  source_id uuid,
  artifact_type text,
  artifact_key text,
  title text,
  summary text,
  search_scope text,
  visibility text,
  sensitivity text,
  redaction_policy text
)
language plpgsql
as $$
begin
  if p_batch_size <= 0 or p_batch_size > 100 then
    raise exception 'batch size must be between 1 and 100';
  end if;

  return query
  with candidates as (
    select d.id
    from admin_security_artifact_search_documents d
    join admin_security_artifact_viewer_subjects s
      on s.id = d.viewer_subject_id
    where d.status in ('pending', 'failed')
      and s.status = 'ready'
      and (
        d.expires_at is null
        or d.expires_at > now()
      )
    order by d.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated as (
    update admin_security_artifact_search_documents d
    set
      status = 'indexing',
      last_error = null,
      internal_metadata = d.internal_metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'worker_id',
        p_worker_id
      ),
      updated_at = now()
    from candidates
    where d.id = candidates.id
    returning d.*
  )
  select
    u.id,
    u.search_document_key,
    u.viewer_subject_id,
    u.source_type,
    u.source_id,
    u.artifact_type,
    u.artifact_key,
    u.title,
    u.summary,
    u.search_scope,
    u.visibility,
    u.sensitivity,
    u.redaction_policy
  from updated u;
end;
$$;

create or replace function upsert_admin_security_artifact_search_chunk(
  p_search_document_id uuid,
  p_viewer_subject_id uuid,
  p_viewer_item_id uuid,
  p_chunk_key text,
  p_chunk_type text,
  p_source_type text,
  p_source_id uuid,
  p_artifact_type text,
  p_artifact_key text,
  p_page_number integer default null,
  p_section_key text default null,
  p_section_title text default null,
  p_title text default null,
  p_summary text default null,
  p_content_text text default null,
  p_token_count integer default 0,
  p_character_count integer default null,
  p_embedding_status text default 'not_required',
  p_embedding_model text default null,
  p_embedding_version text default null,
  p_embedding_vector_id text default null,
  p_embedding_dimensions integer default null,
  p_embedding_checksum_sha256 text default null,
  p_redacted boolean default false,
  p_redaction_summary text default null,
  p_sort_order integer default 0,
  p_public_metadata jsonb default '{}'::jsonb,
  p_internal_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_chunk_id uuid;
  v_hash text;
  v_character_count integer;
begin
  if p_search_document_id is null then
    raise exception 'search chunk document id is required';
  end if;

  if p_chunk_key is null or length(trim(p_chunk_key)) = 0 then
    raise exception 'search chunk key is required';
  end if;

  if p_content_text is null or length(trim(p_content_text)) = 0 then
    raise exception 'search chunk content is required';
  end if;

  v_hash := encode(digest(p_content_text, 'sha256'), 'hex');
  v_character_count := coalesce(p_character_count, length(p_content_text));

  insert into admin_security_artifact_search_chunks (
    search_document_id,
    viewer_subject_id,
    viewer_item_id,
    chunk_key,
    chunk_type,
    source_type,
    source_id,
    artifact_type,
    artifact_key,
    page_number,
    section_key,
    section_title,
    title,
    summary,
    content_text,
    content_hash_sha256,
    token_count,
    character_count,
    embedding_status,
    embedding_model,
    embedding_version,
    embedding_vector_id,
    embedding_dimensions,
    embedding_checksum_sha256,
    redacted,
    redaction_summary,
    sort_order,
    public_metadata,
    internal_metadata
  )
  values (
    p_search_document_id,
    p_viewer_subject_id,
    p_viewer_item_id,
    p_chunk_key,
    coalesce(p_chunk_type, 'text'),
    p_source_type,
    p_source_id,
    p_artifact_type,
    p_artifact_key,
    p_page_number,
    p_section_key,
    p_section_title,
    p_title,
    p_summary,
    p_content_text,
    v_hash,
    coalesce(p_token_count, 0),
    v_character_count,
    coalesce(p_embedding_status, 'not_required'),
    p_embedding_model,
    p_embedding_version,
    p_embedding_vector_id,
    p_embedding_dimensions,
    p_embedding_checksum_sha256,
    coalesce(p_redacted, false),
    p_redaction_summary,
    coalesce(p_sort_order, 0),
    coalesce(p_public_metadata, '{}'::jsonb),
    coalesce(p_internal_metadata, '{}'::jsonb)
  )
  on conflict (search_document_id, chunk_key)
  do update set
    viewer_item_id = excluded.viewer_item_id,
    chunk_type = excluded.chunk_type,
    page_number = excluded.page_number,
    section_key = excluded.section_key,
    section_title = excluded.section_title,
    title = excluded.title,
    summary = excluded.summary,
    content_text = excluded.content_text,
    content_hash_sha256 = excluded.content_hash_sha256,
    token_count = excluded.token_count,
    character_count = excluded.character_count,
    embedding_status = excluded.embedding_status,
    embedding_model = excluded.embedding_model,
    embedding_version = excluded.embedding_version,
    embedding_vector_id = excluded.embedding_vector_id,
    embedding_dimensions = excluded.embedding_dimensions,
    embedding_checksum_sha256 = excluded.embedding_checksum_sha256,
    redacted = excluded.redacted,
    redaction_summary = excluded.redaction_summary,
    sort_order = excluded.sort_order,
    public_metadata = admin_security_artifact_search_chunks.public_metadata || excluded.public_metadata,
    internal_metadata = admin_security_artifact_search_chunks.internal_metadata || excluded.internal_metadata
  returning id into v_chunk_id;

  return v_chunk_id;
end;
$$;

create or replace function complete_admin_security_artifact_search_document_indexing(
  p_search_document_id uuid,
  p_indexed_item_count integer default 0,
  p_indexed_chunk_count integer default 0,
  p_embedding_model text default null,
  p_embedding_version text default null,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_document admin_security_artifact_search_documents%rowtype;
begin
  select *
  into v_document
  from admin_security_artifact_search_documents
  where id = p_search_document_id
  for update;

  if v_document.id is null then
    raise exception 'search document not found: %', p_search_document_id;
  end if;

  if v_document.status <> 'indexing' then
    raise exception 'search document cannot complete from status: %', v_document.status;
  end if;

  update admin_security_artifact_search_documents
  set
    status = 'ready',
    indexed_item_count = coalesce(p_indexed_item_count, 0),
    indexed_chunk_count = coalesce(p_indexed_chunk_count, 0),
    embedding_model = coalesce(p_embedding_model, embedding_model),
    embedding_version = coalesce(p_embedding_version, embedding_version),
    last_indexed_at = now(),
    last_error = null,
    internal_metadata = internal_metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'worker_id',
      p_worker_id
    ),
    updated_at = now()
  where id = v_document.id;

  return v_document.id;
end;
$$;

create or replace function fail_admin_security_artifact_search_document_indexing(
  p_search_document_id uuid,
  p_error text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'search indexing error is required';
  end if;

  update admin_security_artifact_search_documents
  set
    status = 'failed',
    last_error = p_error,
    internal_metadata = internal_metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'worker_id',
      p_worker_id,
      'failed_at',
      now()
    ),
    updated_at = now()
  where id = p_search_document_id;

  if not found then
    raise exception 'search document not found: %', p_search_document_id;
  end if;

  return p_search_document_id;
end;
$$;

create or replace function create_admin_security_artifact_search_session(
  p_search_scope text,
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
  p_max_queries integer default 100,
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
    'artifact_search_session:' ||
    p_search_scope || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_artifact_search_sessions (
    search_session_key,
    status,
    search_scope,
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
    session_token_hash_sha256,
    session_token_prefix,
    expires_at,
    max_queries,
    ip_address,
    user_agent,
    request_id,
    metadata
  )
  values (
    v_session_key,
    'active',
    p_search_scope,
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
    coalesce(p_max_queries, 100),
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_session_id;

  return jsonb_build_object(
    'searchSessionId', v_session_id,
    'searchSessionKey', v_session_key,
    'searchToken', v_raw_token,
    'tokenPrefix', v_prefix,
    'searchScope', p_search_scope,
    'expiresAt', v_expires_at
  );
end;
$$;

create or replace function create_private_room_artifact_search_session(
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

  return create_admin_security_artifact_search_session(
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
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'source',
      'private_room_search_session'
    )
  );
end;
$$;

create or replace function resolve_admin_security_artifact_search_session(
  p_search_token text,
  p_auth_user_id uuid default null
)
returns admin_security_artifact_search_sessions
language plpgsql
as $$
declare
  v_hash text;
  v_session admin_security_artifact_search_sessions%rowtype;
begin
  if p_search_token is null or length(trim(p_search_token)) < 32 then
    raise exception 'search token is required';
  end if;

  v_hash := encode(digest(p_search_token, 'sha256'), 'hex');

  select *
  into v_session
  from admin_security_artifact_search_sessions
  where session_token_hash_sha256 = v_hash
  for update;

  if v_session.id is null then
    raise exception 'search token invalid';
  end if;

  if v_session.status = 'revoked' then
    raise exception 'search session revoked';
  end if;

  if v_session.expires_at <= now() then
    raise exception 'search session expired';
  end if;

  if v_session.query_count >= v_session.max_queries then
    raise exception 'search session query limit reached';
  end if;

  if v_session.requester_auth_user_id is not null
    and p_auth_user_id is distinct from v_session.requester_auth_user_id
  then
    raise exception 'search session authentication mismatch';
  end if;

  return v_session;
end;
$$;

create or replace function execute_admin_security_artifact_search(
  p_search_token text,
  p_query_text text,
  p_query_type text default 'keyword',
  p_limit integer default 20,
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
  v_session admin_security_artifact_search_sessions%rowtype;
  v_query_id uuid;
  v_query_key text;
  v_normalized text;
  v_result_count integer := 0;
  v_results jsonb;
begin
  if p_query_text is null or length(trim(p_query_text)) = 0 then
    raise exception 'search query text is required';
  end if;

  if p_limit <= 0 or p_limit > 100 then
    raise exception 'search limit must be between 1 and 100';
  end if;

  v_session := resolve_admin_security_artifact_search_session(
    p_search_token,
    p_auth_user_id
  );

  v_normalized := lower(trim(regexp_replace(p_query_text, '\s+', ' ', 'g')));

  v_query_key :=
    'artifact_search_query:' ||
    v_session.search_session_key || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_artifact_search_queries (
    search_query_key,
    search_session_id,
    status,
    search_scope,
    query_text,
    normalized_query,
    query_type,
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
    v_query_key,
    v_session.id,
    'completed',
    v_session.search_scope,
    p_query_text,
    v_normalized,
    coalesce(p_query_type, 'keyword'),
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
  returning id into v_query_id;

  insert into admin_security_artifact_search_results (
    search_query_id,
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
    snippet,
    page_number,
    section_key,
    section_title,
    rank_score,
    keyword_score,
    semantic_score,
    result_order,
    metadata
  )
  select
    v_query_id,
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
    left(c.content_text, 500),
    c.page_number,
    c.section_key,
    c.section_title,
    ts_rank_cd(c.search_tsv, plainto_tsquery('english', v_normalized))::numeric(12, 6),
    ts_rank_cd(c.search_tsv, plainto_tsquery('english', v_normalized))::numeric(12, 6),
    null,
    row_number() over (
      order by ts_rank_cd(c.search_tsv, plainto_tsquery('english', v_normalized)) desc, c.sort_order asc
    ),
    jsonb_build_object(
      'matchType',
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
        v_session.search_scope = 'public'
        and d.search_scope = 'public'
        and d.visibility = 'public'
      )
      or (
        v_session.search_scope = 'customer'
        and d.search_scope in ('customer', 'public')
        and d.customer_name = v_session.customer_name
      )
      or (
        v_session.search_scope = 'private_room'
        and d.search_scope in ('private_room', 'customer', 'public')
        and (
          d.private_room_id = v_session.private_room_id
          or (
            d.private_room_id is null
            and d.customer_name = v_session.customer_name
          )
        )
      )
      or (
        v_session.search_scope = 'auditor_portal'
        and d.search_scope in ('auditor_portal', 'customer', 'public')
        and (
          d.auditor_portal_id = v_session.auditor_portal_id
          or (
            d.auditor_portal_id is null
            and d.customer_name = v_session.customer_name
          )
        )
      )
      or (
        v_session.search_scope = 'enterprise_review_room'
        and d.search_scope in ('enterprise_review_room', 'customer', 'public')
        and (
          d.enterprise_review_room_id = v_session.enterprise_review_room_id
          or (
            d.enterprise_review_room_id is null
            and d.customer_name = v_session.customer_name
          )
        )
      )
      or v_session.search_scope = 'admin'
    )
  order by ts_rank_cd(c.search_tsv, plainto_tsquery('english', v_normalized)) desc, c.sort_order asc
  limit p_limit;

  get diagnostics v_result_count = row_count;

  update admin_security_artifact_search_queries
  set
    result_count = v_result_count,
    latency_ms = greatest(1, floor(extract(epoch from (clock_timestamp() - v_started_at)) * 1000)::integer)
  where id = v_query_id;

  update admin_security_artifact_search_sessions
  set
    query_count = query_count + 1,
    updated_at = now()
  where id = v_session.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'artifactKey', r.artifact_key,
        'artifactType', r.artifact_type,
        'sourceType', r.source_type,
        'sourceId', r.source_id,
        'title', r.title,
        'summary', r.summary,
        'snippet', r.snippet,
        'pageNumber', r.page_number,
        'sectionKey', r.section_key,
        'sectionTitle', r.section_title,
        'rankScore', r.rank_score,
        'keywordScore', r.keyword_score,
        'semanticScore', r.semantic_score,
        'resultOrder', r.result_order,
        'viewerSubjectId', r.viewer_subject_id,
        'viewerItemId', r.viewer_item_id
      )
      order by r.result_order asc
    ),
    '[]'::jsonb
  )
  into v_results
  from admin_security_artifact_search_results r
  where r.search_query_id = v_query_id;

  return jsonb_build_object(
    'searchQueryId', v_query_id,
    'searchSessionId', v_session.id,
    'queryText', p_query_text,
    'queryType', coalesce(p_query_type, 'keyword'),
    'resultCount', v_result_count,
    'results', v_results
  );
exception
  when others then
    if v_query_id is not null then
      update admin_security_artifact_search_queries
      set
        status = 'failed',
        failure_reason = sqlerrm,
        latency_ms = greatest(1, floor(extract(epoch from (clock_timestamp() - v_started_at)) * 1000)::integer)
      where id = v_query_id;
    end if;
    raise;
end;
$$;

create or replace function expire_admin_security_artifact_search_sessions_and_documents(
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

  update admin_security_artifact_search_sessions
  set
    status = 'expired',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'expired_by_worker',
      p_worker_id,
      'search_expiry_run_id',
      v_run_id
    ),
    updated_at = now()
  where id in (
    select id
    from admin_security_artifact_search_sessions
    where status = 'active'
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  update admin_security_artifact_search_documents
  set
    status = 'expired',
    updated_at = now()
  where status in ('pending', 'indexing', 'ready', 'failed')
    and expires_at is not null
    and expires_at <= now();

  return v_run_id;
end;
$$;

create or replace view admin_security_artifact_search_document_dashboard as
select
  d.id as admin_security_artifact_search_document_id,
  d.search_document_key,
  d.status,
  d.viewer_subject_id,
  vs.viewer_subject_key,
  d.download_subject_id,
  ds.subject_key as download_subject_key,
  d.source_type,
  d.source_id,
  d.artifact_type,
  d.artifact_key,
  d.title,
  d.summary,
  d.search_scope,
  d.visibility,
  d.sensitivity,
  d.redaction_policy,
  d.customer_name,
  d.customer_domain,
  d.private_room_id,
  r.private_room_key,
  d.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  d.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  d.indexed_item_count,
  d.indexed_chunk_count,
  d.embedding_model,
  d.embedding_version,
  d.last_indexed_at,
  d.last_error,
  d.expires_at,
  d.created_at,
  d.updated_at,
  d.public_metadata,
  d.internal_metadata
from admin_security_artifact_search_documents d
join admin_security_artifact_viewer_subjects vs
  on vs.id = d.viewer_subject_id
left join admin_security_artifact_download_subjects ds
  on ds.id = d.download_subject_id
left join admin_security_private_trust_rooms r
  on r.id = d.private_room_id
left join admin_security_auditor_portals ap
  on ap.id = d.auditor_portal_id
left join admin_security_enterprise_review_rooms er
  on er.id = d.enterprise_review_room_id
order by d.created_at desc;

create or replace view admin_security_artifact_search_chunk_dashboard as
select
  c.id as admin_security_artifact_search_chunk_id,
  c.search_document_id,
  d.search_document_key,
  c.viewer_subject_id,
  vs.viewer_subject_key,
  c.viewer_item_id,
  vi.item_key as viewer_item_key,
  c.chunk_key,
  c.chunk_type,
  c.source_type,
  c.source_id,
  c.artifact_type,
  c.artifact_key,
  c.page_number,
  c.section_key,
  c.section_title,
  c.title,
  c.summary,
  left(c.content_text, 500) as content_preview,
  c.content_hash_sha256,
  c.token_count,
  c.character_count,
  c.embedding_status,
  c.embedding_model,
  c.embedding_version,
  c.embedding_vector_id,
  c.embedding_dimensions,
  c.redacted,
  c.redaction_summary,
  c.sort_order,
  c.created_at,
  c.public_metadata,
  c.internal_metadata
from admin_security_artifact_search_chunks c
join admin_security_artifact_search_documents d
  on d.id = c.search_document_id
join admin_security_artifact_viewer_subjects vs
  on vs.id = c.viewer_subject_id
left join admin_security_artifact_viewer_items vi
  on vi.id = c.viewer_item_id
order by c.created_at desc;

create or replace view admin_security_artifact_search_session_dashboard as
select
  s.id as admin_security_artifact_search_session_id,
  s.search_session_key,
  s.status,
  s.search_scope,
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
  s.session_token_prefix,
  s.expires_at,
  s.query_count,
  s.max_queries,
  s.ip_address,
  s.user_agent,
  s.created_at,
  s.updated_at,
  s.metadata
from admin_security_artifact_search_sessions s
left join admin_security_private_trust_rooms r
  on r.id = s.private_room_id
left join admin_security_private_trust_room_participants p
  on p.id = s.private_room_participant_id
left join admin_security_auditor_portals ap
  on ap.id = s.auditor_portal_id
left join admin_security_enterprise_review_rooms er
  on er.id = s.enterprise_review_room_id
order by s.created_at desc;

create or replace view admin_security_artifact_search_query_dashboard as
select
  q.id as admin_security_artifact_search_query_id,
  q.search_query_key,
  q.search_session_id,
  s.search_session_key,
  q.status,
  q.search_scope,
  q.query_text,
  q.normalized_query,
  q.query_type,
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
  q.result_count,
  q.latency_ms,
  q.failure_reason,
  q.ip_address,
  q.user_agent,
  q.created_at,
  q.metadata
from admin_security_artifact_search_queries q
left join admin_security_artifact_search_sessions s
  on s.id = q.search_session_id
left join admin_security_private_trust_rooms r
  on r.id = q.private_room_id
left join admin_security_private_trust_room_participants p
  on p.id = q.private_room_participant_id
left join admin_security_auditor_portals ap
  on ap.id = q.auditor_portal_id
left join admin_security_enterprise_review_rooms er
  on er.id = q.enterprise_review_room_id
order by q.created_at desc;

create or replace view admin_security_artifact_search_integrity as
select
  (
    select count(*)
    from admin_security_artifact_search_documents
    where status = 'pending'
  ) as pending_document_count,
  (
    select count(*)
    from admin_security_artifact_search_documents
    where status = 'indexing'
  ) as indexing_document_count,
  (
    select count(*)
    from admin_security_artifact_search_documents
    where status = 'ready'
  ) as ready_document_count,
  (
    select count(*)
    from admin_security_artifact_search_documents
    where status = 'failed'
  ) as failed_document_count,
  (
    select count(*)
    from admin_security_artifact_search_chunks
  ) as search_chunk_count,
  (
    select count(*)
    from admin_security_artifact_search_chunks
    where embedding_status = 'pending'
  ) as pending_embedding_count,
  (
    select count(*)
    from admin_security_artifact_search_sessions
    where status = 'active'
  ) as active_search_session_count,
  (
    select count(*)
    from admin_security_artifact_search_sessions
    where status = 'active'
      and expires_at <= now()
  ) as overdue_expired_session_count,
  (
    select count(*)
    from admin_security_artifact_search_queries
    where created_at >= now() - interval '24 hours'
  ) as search_query_count_24h,
  (
    select count(*)
    from admin_security_artifact_search_queries
    where status = 'failed'
      and created_at >= now() - interval '1 hour'
  ) as failed_search_query_count_1h,
  now() as checked_at;

grant select on admin_security_artifact_search_document_dashboard to admin_api_role;
grant select on admin_security_artifact_search_chunk_dashboard to admin_api_role;
grant select on admin_security_artifact_search_session_dashboard to admin_api_role;
grant select on admin_security_artifact_search_query_dashboard to admin_api_role;
grant select on admin_security_artifact_search_integrity to admin_api_role;

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
    'admin_security_artifact_search_document_discovery_hourly',
    'Discover artifact search documents',
    'admin',
    true,
    '31 * * * *',
    'discover_admin_security_artifact_search_documents',
    '{"batch_size": 1000}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
  ),
  (
    'admin_security_artifact_search_session_expiry_every_5m',
    'Expire artifact search sessions and documents',
    'admin',
    true,
    '*/5 * * * *',
    'expire_admin_security_artifact_search_sessions_and_documents',
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
  elsif v_job.function_name = 'discover_admin_security_artifact_search_documents' then
    v_uuid_result := discover_admin_security_artifact_search_documents(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_security_artifact_search_sessions_and_documents' then
    v_uuid_result := expire_admin_security_artifact_search_sessions_and_documents(
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

alter table admin_security_artifact_search_documents enable row level security;
alter table admin_security_artifact_search_chunks enable row level security;
alter table admin_security_artifact_search_sessions enable row level security;
alter table admin_security_artifact_search_queries enable row level security;
alter table admin_security_artifact_search_results enable row level security;

create policy admin_security_artifact_search_documents_no_user_direct_access
on admin_security_artifact_search_documents
for all
to authenticated
using (false)
with check (false);

create policy admin_security_artifact_search_chunks_no_user_direct_access
on admin_security_artifact_search_chunks
for all
to authenticated
using (false)
with check (false);

create policy admin_security_artifact_search_sessions_no_user_direct_access
on admin_security_artifact_search_sessions
for all
to authenticated
using (false)
with check (false);

create policy admin_security_artifact_search_queries_no_user_direct_access
on admin_security_artifact_search_queries
for all
to authenticated
using (false)
with check (false);

create policy admin_security_artifact_search_results_no_user_direct_access
on admin_security_artifact_search_results
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_admin_security_artifact_search_documents
on admin_security_artifact_search_documents
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_artifact_search_chunks
on admin_security_artifact_search_chunks
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_artifact_search_sessions
on admin_security_artifact_search_sessions
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_artifact_search_queries
on admin_security_artifact_search_queries
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_artifact_search_results
on admin_security_artifact_search_results
for all
to admin_api_role
using (true)
with check (true);

create policy worker_all_admin_security_artifact_search_documents
on admin_security_artifact_search_documents
for all
to worker_role
using (true)
with check (true);

create policy worker_all_admin_security_artifact_search_chunks
on admin_security_artifact_search_chunks
for all
to worker_role
using (true)
with check (true);

grant execute on function register_admin_security_artifact_search_document(uuid, text, jsonb)
to admin_api_role, worker_role;

grant execute on function discover_admin_security_artifact_search_documents(integer, text, jsonb)
to admin_api_role, worker_role;

grant execute on function claim_admin_security_artifact_search_documents_for_indexing(integer, text, jsonb)
to worker_role;

grant execute on function upsert_admin_security_artifact_search_chunk(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer,
  text,
  text,
  text,
  text,
  integer,
  text,
  boolean,
  text,
  integer,
  jsonb,
  jsonb
) to worker_role, admin_api_role;

grant execute on function complete_admin_security_artifact_search_document_indexing(
  uuid,
  integer,
  integer,
  text,
  text,
  text,
  jsonb
) to worker_role, admin_api_role;

grant execute on function fail_admin_security_artifact_search_document_indexing(uuid, text, text, jsonb)
to worker_role, admin_api_role;

grant execute on function create_admin_security_artifact_search_session(
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
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function create_private_room_artifact_search_session(
  uuid,
  text,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function resolve_admin_security_artifact_search_session(text, uuid)
to admin_api_role;

grant execute on function execute_admin_security_artifact_search(
  text,
  text,
  text,
  integer,
  uuid,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function expire_admin_security_artifact_search_sessions_and_documents(integer, text, jsonb)
to admin_api_role, worker_role;

alter function register_admin_security_artifact_search_document(uuid, text, jsonb) security definer;
alter function register_admin_security_artifact_search_document(uuid, text, jsonb) set search_path = public;

alter function discover_admin_security_artifact_search_documents(integer, text, jsonb) security definer;
alter function discover_admin_security_artifact_search_documents(integer, text, jsonb) set search_path = public;

alter function claim_admin_security_artifact_search_documents_for_indexing(integer, text, jsonb) security definer;
alter function claim_admin_security_artifact_search_documents_for_indexing(integer, text, jsonb) set search_path = public;

alter function upsert_admin_security_artifact_search_chunk(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer,
  text,
  text,
  text,
  text,
  integer,
  text,
  boolean,
  text,
  integer,
  jsonb,
  jsonb
) security definer;
alter function upsert_admin_security_artifact_search_chunk(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer,
  text,
  text,
  text,
  text,
  integer,
  text,
  boolean,
  text,
  integer,
  jsonb,
  jsonb
) set search_path = public;

alter function complete_admin_security_artifact_search_document_indexing(
  uuid,
  integer,
  integer,
  text,
  text,
  text,
  jsonb
) security definer;
alter function complete_admin_security_artifact_search_document_indexing(
  uuid,
  integer,
  integer,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function fail_admin_security_artifact_search_document_indexing(uuid, text, text, jsonb) security definer;
alter function fail_admin_security_artifact_search_document_indexing(uuid, text, text, jsonb) set search_path = public;

alter function create_admin_security_artifact_search_session(
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
  inet,
  text,
  text,
  jsonb
) security definer;
alter function create_admin_security_artifact_search_session(
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
  inet,
  text,
  text,
  jsonb
) set search_path = public;

alter function create_private_room_artifact_search_session(
  uuid,
  text,
  inet,
  text,
  text,
  jsonb
) security definer;
alter function create_private_room_artifact_search_session(
  uuid,
  text,
  inet,
  text,
  text,
  jsonb
) set search_path = public;

alter function resolve_admin_security_artifact_search_session(text, uuid) security definer;
alter function resolve_admin_security_artifact_search_session(text, uuid) set search_path = public;

alter function execute_admin_security_artifact_search(
  text,
  text,
  text,
  integer,
  uuid,
  inet,
  text,
  text,
  jsonb
) security definer;
alter function execute_admin_security_artifact_search(
  text,
  text,
  text,
  integer,
  uuid,
  inet,
  text,
  text,
  jsonb
) set search_path = public;

alter function expire_admin_security_artifact_search_sessions_and_documents(integer, text, jsonb) security definer;
alter function expire_admin_security_artifact_search_sessions_and_documents(integer, text, jsonb) set search_path = public;

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
    'SEARCH_DOCUMENT_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Search document not found.',
    'Search document not found.',
    'platform'
  ),
  (
    'SEARCH_DOCUMENT_NOT_READY',
    'validation',
    'medium',
    409,
    true,
    true,
    'Search index is still being prepared.',
    'Search document or viewer subject not ready.',
    'platform'
  ),
  (
    'SEARCH_SESSION_INVALID',
    'permission',
    'high',
    403,
    false,
    true,
    'Search session is invalid.',
    'Search token invalid.',
    'platform'
  ),
  (
    'SEARCH_SESSION_EXPIRED',
    'permission',
    'medium',
    410,
    false,
    true,
    'Search session has expired.',
    'Search session expired.',
    'platform'
  ),
  (
    'SEARCH_SESSION_LIMIT_REACHED',
    'permission',
    'medium',
    429,
    false,
    true,
    'Search session query limit reached.',
    'Search session query limit reached.',
    'platform'
  ),
  (
    'SEARCH_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Search request requires complete fields.',
    'Search required fields missing.',
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
  ('search document not found', 'SEARCH_DOCUMENT_NOT_FOUND', 5, '{}'),
  ('viewer subject must be ready before indexing', 'SEARCH_DOCUMENT_NOT_READY', 5, '{}'),
  ('viewer subject requires manual redaction before indexing', 'SEARCH_DOCUMENT_NOT_READY', 5, '{}'),
  ('search document cannot complete from status', 'SEARCH_DOCUMENT_NOT_READY', 5, '{}'),
  ('search indexing error is required', 'SEARCH_REQUIRED_FIELDS', 5, '{}'),
  ('search chunk document id is required', 'SEARCH_REQUIRED_FIELDS', 5, '{}'),
  ('search chunk key is required', 'SEARCH_REQUIRED_FIELDS', 5, '{}'),
  ('search chunk content is required', 'SEARCH_REQUIRED_FIELDS', 5, '{}'),
  ('search token is required', 'SEARCH_REQUIRED_FIELDS', 5, '{}'),
  ('search token invalid', 'SEARCH_SESSION_INVALID', 5, '{}'),
  ('search session revoked', 'SEARCH_SESSION_INVALID', 5, '{}'),
  ('search session expired', 'SEARCH_SESSION_EXPIRED', 5, '{}'),
  ('search session query limit reached', 'SEARCH_SESSION_LIMIT_REACHED', 5, '{}'),
  ('search session authentication mismatch', 'SEARCH_SESSION_INVALID', 5, '{}'),
  ('search query text is required', 'SEARCH_REQUIRED_FIELDS', 5, '{}'),
  ('search limit must be between 1 and 100', 'SEARCH_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
