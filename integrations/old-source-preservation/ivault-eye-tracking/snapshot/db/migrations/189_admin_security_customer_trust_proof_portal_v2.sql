-- Step 9.74 — Build customer trust proof portal v2
-- Runs after 188_admin_security_timeline_hash_chain_merkle_anchoring_v2.sql

create table if not exists admin_security_customer_trust_proof_portals (
  id uuid primary key default gen_random_uuid(),
  portal_key text not null unique,
  status text not null default 'active',
  portal_type text not null default 'private_room',
  title text not null,
  subtitle text,
  description text,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete cascade,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  show_artifacts boolean not null default true,
  show_search boolean not null default true,
  show_answers boolean not null default true,
  show_receipts boolean not null default true,
  show_exports boolean not null default true,
  show_downloads boolean not null default true,
  show_timeline boolean not null default true,
  show_crypto_status boolean not null default true,
  allow_customer_search boolean not null default true,
  allow_customer_answers boolean not null default true,
  allow_receipt_creation boolean not null default true,
  allow_export_creation boolean not null default true,
  allow_timeline_snapshot_creation boolean not null default true,
  require_authenticated_access boolean not null default true,
  theme_json jsonb not null default '{}'::jsonb,
  copy_json jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  expires_at timestamptz,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (private_room_id),
  constraint admin_security_customer_trust_proof_portals_status_check
  check (
    status in (
      'draft',
      'active',
      'paused',
      'expired',
      'revoked',
      'archived'
    )
  ),
  constraint admin_security_customer_trust_proof_portals_type_check
  check (
    portal_type in (
      'public_trust_center',
      'customer',
      'private_room',
      'auditor',
      'enterprise_review'
    )
  ),
  constraint admin_security_customer_trust_proof_portals_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_customer_trust_proof_portals_status_idx
on admin_security_customer_trust_proof_portals (status, portal_type);

create index if not exists admin_security_customer_trust_proof_portals_customer_idx
on admin_security_customer_trust_proof_portals (customer_name, customer_domain);

create index if not exists admin_security_customer_trust_proof_portals_private_room_idx
on admin_security_customer_trust_proof_portals (private_room_id, status);

drop trigger if exists admin_security_customer_trust_proof_portals_set_updated_at
on admin_security_customer_trust_proof_portals;

create trigger admin_security_customer_trust_proof_portals_set_updated_at
before update on admin_security_customer_trust_proof_portals
for each row
execute function set_updated_at();

create table if not exists admin_security_customer_trust_proof_portal_sessions (
  id uuid primary key default gen_random_uuid(),
  portal_session_key text not null unique,
  status text not null default 'active',
  portal_id uuid not null
    references admin_security_customer_trust_proof_portals(id)
    on delete cascade,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete cascade,
  private_room_participant_id uuid references admin_security_private_trust_room_participants(id) on delete set null,
  requester_auth_user_id uuid,
  requester_email text,
  requester_display_name text,
  customer_name text,
  customer_domain text,
  session_token_hash_sha256 text,
  session_token_prefix text,
  expires_at timestamptz not null default (now() + interval '120 minutes'),
  ip_address inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_customer_trust_proof_portal_sessions_status_check
  check (
    status in (
      'active',
      'expired',
      'revoked',
      'completed',
      'archived'
    )
  ),
  constraint admin_security_customer_trust_proof_portal_sessions_expiry_check
  check (expires_at > created_at)
);

create index if not exists admin_security_customer_trust_proof_portal_sessions_token_idx
on admin_security_customer_trust_proof_portal_sessions (session_token_hash_sha256);

create index if not exists admin_security_customer_trust_proof_portal_sessions_portal_idx
on admin_security_customer_trust_proof_portal_sessions (portal_id, status);

create index if not exists admin_security_customer_trust_proof_portal_sessions_private_room_idx
on admin_security_customer_trust_proof_portal_sessions (private_room_id, private_room_participant_id, status);

create index if not exists admin_security_customer_trust_proof_portal_sessions_expiry_idx
on admin_security_customer_trust_proof_portal_sessions (status, expires_at);

drop trigger if exists admin_security_customer_trust_proof_portal_sessions_set_updated_at
on admin_security_customer_trust_proof_portal_sessions;

create trigger admin_security_customer_trust_proof_portal_sessions_set_updated_at
before update on admin_security_customer_trust_proof_portal_sessions
for each row
execute function set_updated_at();

create table if not exists admin_security_customer_trust_proof_portal_events (
  id uuid primary key default gen_random_uuid(),
  portal_event_key text not null unique,
  portal_id uuid not null
    references admin_security_customer_trust_proof_portals(id)
    on delete cascade,
  portal_session_id uuid
    references admin_security_customer_trust_proof_portal_sessions(id)
    on delete set null,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  private_room_participant_id uuid references admin_security_private_trust_room_participants(id) on delete set null,
  event_type text not null,
  event_action text not null,
  requester_auth_user_id uuid,
  requester_email text,
  related_type text,
  related_id uuid,
  related_key text,
  title text not null,
  summary text,
  ip_address inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_customer_trust_proof_portal_events_type_check
  check (
    event_type in (
      'portal_opened',
      'dashboard_viewed',
      'artifact_opened',
      'search_started',
      'search_executed',
      'answer_session_created',
      'answer_generated',
      'receipt_created',
      'receipt_verified',
      'export_created',
      'timeline_viewed',
      'timeline_snapshot_created',
      'crypto_status_viewed',
      'download_started',
      'download_completed',
      'error',
      'other'
    )
  ),
  constraint admin_security_customer_trust_proof_portal_events_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_customer_trust_proof_portal_events_portal_idx
on admin_security_customer_trust_proof_portal_events (portal_id, created_at desc);

create index if not exists admin_security_customer_trust_proof_portal_events_session_idx
on admin_security_customer_trust_proof_portal_events (portal_session_id, created_at desc);

create index if not exists admin_security_customer_trust_proof_portal_events_private_room_idx
on admin_security_customer_trust_proof_portal_events (private_room_id, created_at desc);

create index if not exists admin_security_customer_trust_proof_portal_events_related_idx
on admin_security_customer_trust_proof_portal_events (related_type, related_id);

create or replace function get_or_create_private_room_customer_trust_proof_portal(
  p_private_room_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_room admin_security_private_trust_rooms%rowtype;
  v_portal_id uuid;
  v_portal_key text;
begin
  select *
  into v_room
  from admin_security_private_trust_rooms
  where id = p_private_room_id;

  if v_room.id is null then
    raise exception 'private room not found: %', p_private_room_id;
  end if;

  v_portal_key := 'customer_trust_proof_portal:private_room:' || v_room.private_room_key;

  insert into admin_security_customer_trust_proof_portals (
    portal_key,
    status,
    portal_type,
    title,
    subtitle,
    description,
    customer_name,
    customer_domain,
    private_room_id,
    enterprise_review_room_id,
    show_artifacts,
    show_search,
    show_answers,
    show_receipts,
    show_exports,
    show_downloads,
    show_timeline,
    show_crypto_status,
    allow_customer_search,
    allow_customer_answers,
    allow_receipt_creation,
    allow_export_creation,
    allow_timeline_snapshot_creation,
    require_authenticated_access,
    published_at,
    expires_at,
    request_id,
    metadata
  )
  values (
    v_portal_key,
    case when v_room.status in ('published', 'active', 'ready') then 'active' else 'draft' end,
    'private_room',
    'Trust Proof — ' || v_room.title,
    v_room.customer_name,
    'Customer-facing proof portal for artifacts, answers, receipts, timeline, downloads, and cryptographic verification.',
    v_room.customer_name,
    v_room.customer_domain,
    v_room.id,
    v_room.enterprise_review_room_id,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    now(),
    v_room.expires_at,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (private_room_id)
  do update set
    status = case
      when excluded.expires_at is not null and excluded.expires_at <= now() then 'expired'
      else excluded.status
    end,
    title = excluded.title,
    subtitle = excluded.subtitle,
    description = excluded.description,
    customer_name = excluded.customer_name,
    customer_domain = excluded.customer_domain,
    enterprise_review_room_id = excluded.enterprise_review_room_id,
    expires_at = excluded.expires_at,
    metadata = admin_security_customer_trust_proof_portals.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_portal_id;

  return v_portal_id;
end;
$$;

create or replace function create_private_room_customer_trust_proof_portal_session(
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
  v_portal_id uuid;
  v_portal admin_security_customer_trust_proof_portals%rowtype;
  v_session_id uuid;
  v_session_key text;
  v_raw_token text;
  v_hash text;
  v_prefix text;
begin
  v_participant := get_active_private_trust_room_participant(
    p_auth_user_id,
    p_private_room_key
  );

  select *
  into v_room
  from admin_security_private_trust_rooms
  where id = v_participant.private_room_id;

  v_portal_id := get_or_create_private_room_customer_trust_proof_portal(
    v_room.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  select *
  into v_portal
  from admin_security_customer_trust_proof_portals
  where id = v_portal_id;

  if v_portal.status <> 'active' then
    raise exception 'customer trust proof portal is not active: %', v_portal.status;
  end if;

  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_raw_token, 'sha256'), 'hex');
  v_prefix := substr(v_raw_token, 1, 12);

  v_session_key :=
    'customer_trust_proof_portal_session:' ||
    v_portal.portal_key || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_customer_trust_proof_portal_sessions (
    portal_session_key,
    status,
    portal_id,
    private_room_id,
    private_room_participant_id,
    requester_auth_user_id,
    requester_email,
    requester_display_name,
    customer_name,
    customer_domain,
    session_token_hash_sha256,
    session_token_prefix,
    expires_at,
    ip_address,
    user_agent,
    request_id,
    metadata
  )
  values (
    v_session_key,
    'active',
    v_portal.id,
    v_room.id,
    v_participant.id,
    p_auth_user_id,
    v_participant.email,
    v_participant.display_name,
    v_room.customer_name,
    v_room.customer_domain,
    v_hash,
    v_prefix,
    now() + interval '120 minutes',
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_session_id;

  perform record_customer_trust_proof_portal_event(
    v_portal.id,
    v_session_id,
    'portal_opened',
    'created_session',
    p_auth_user_id,
    v_participant.email,
    'customer_trust_proof_portal_session',
    v_session_id,
    v_session_key,
    'Customer proof portal opened',
    'Customer opened the trust proof portal.',
    p_ip_address,
    p_user_agent,
    p_request_id,
    '{}'::jsonb
  );

  return jsonb_build_object(
    'portalSessionId', v_session_id,
    'portalSessionKey', v_session_key,
    'portalToken', v_raw_token,
    'tokenPrefix', v_prefix,
    'portalId', v_portal.id,
    'portalKey', v_portal.portal_key,
    'privateRoomId', v_room.id,
    'privateRoomKey', v_room.private_room_key,
    'expiresAt', now() + interval '120 minutes'
  );
end;
$$;

create or replace function resolve_customer_trust_proof_portal_session(
  p_portal_token text,
  p_auth_user_id uuid default null
)
returns admin_security_customer_trust_proof_portal_sessions
language plpgsql
as $$
declare
  v_hash text;
  v_session admin_security_customer_trust_proof_portal_sessions%rowtype;
begin
  if p_portal_token is null or length(trim(p_portal_token)) < 32 then
    raise exception 'customer trust proof portal token is required';
  end if;

  v_hash := encode(digest(p_portal_token, 'sha256'), 'hex');

  select *
  into v_session
  from admin_security_customer_trust_proof_portal_sessions
  where session_token_hash_sha256 = v_hash;

  if v_session.id is null then
    raise exception 'customer trust proof portal session invalid';
  end if;

  if v_session.status = 'revoked' then
    raise exception 'customer trust proof portal session revoked';
  end if;

  if v_session.expires_at <= now() then
    raise exception 'customer trust proof portal session expired';
  end if;

  if v_session.requester_auth_user_id is not null
    and p_auth_user_id is distinct from v_session.requester_auth_user_id
  then
    raise exception 'customer trust proof portal session authentication mismatch';
  end if;

  return v_session;
end;
$$;

create or replace function record_customer_trust_proof_portal_event(
  p_portal_id uuid,
  p_portal_session_id uuid,
  p_event_type text,
  p_event_action text,
  p_requester_auth_user_id uuid default null,
  p_requester_email text default null,
  p_related_type text default null,
  p_related_id uuid default null,
  p_related_key text default null,
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
  v_portal admin_security_customer_trust_proof_portals%rowtype;
  v_session admin_security_customer_trust_proof_portal_sessions%rowtype;
  v_event_id uuid;
  v_event_key text;
begin
  select *
  into v_portal
  from admin_security_customer_trust_proof_portals
  where id = p_portal_id;

  if v_portal.id is null then
    raise exception 'customer trust proof portal not found: %', p_portal_id;
  end if;

  if p_portal_session_id is not null then
    select *
    into v_session
    from admin_security_customer_trust_proof_portal_sessions
    where id = p_portal_session_id;
  end if;

  v_event_key :=
    'customer_trust_proof_portal_event:' ||
    v_portal.portal_key || ':' ||
    coalesce(p_event_type, 'event') || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_customer_trust_proof_portal_events (
    portal_event_key,
    portal_id,
    portal_session_id,
    private_room_id,
    private_room_participant_id,
    event_type,
    event_action,
    requester_auth_user_id,
    requester_email,
    related_type,
    related_id,
    related_key,
    title,
    summary,
    ip_address,
    user_agent,
    request_id,
    metadata
  )
  values (
    v_event_key,
    v_portal.id,
    p_portal_session_id,
    coalesce(v_session.private_room_id, v_portal.private_room_id),
    v_session.private_room_participant_id,
    p_event_type,
    p_event_action,
    p_requester_auth_user_id,
    p_requester_email,
    p_related_type,
    p_related_id,
    p_related_key,
    coalesce(p_title, p_event_type),
    p_summary,
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function get_customer_trust_proof_portal_dashboard(
  p_portal_token text,
  p_auth_user_id uuid default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_session admin_security_customer_trust_proof_portal_sessions%rowtype;
  v_portal admin_security_customer_trust_proof_portals%rowtype;
  v_room admin_security_private_trust_rooms%rowtype;
  v_artifact_count integer := 0;
  v_ready_artifact_count integer := 0;
  v_search_document_count integer := 0;
  v_answer_count integer := 0;
  v_receipt_count integer := 0;
  v_export_count integer := 0;
  v_download_count integer := 0;
  v_timeline_event_count integer := 0;
  v_chain_count integer := 0;
  v_latest_chain_hash text;
  v_latest_checkpoint_hash text;
  v_latest_merkle_root text;
begin
  v_session := resolve_customer_trust_proof_portal_session(
    p_portal_token,
    p_auth_user_id
  );

  select *
  into v_portal
  from admin_security_customer_trust_proof_portals
  where id = v_session.portal_id;

  select *
  into v_room
  from admin_security_private_trust_rooms
  where id = v_session.private_room_id;

  select count(*)
  into v_artifact_count
  from admin_security_private_trust_room_artifacts
  where private_room_id = v_room.id;

  select count(*)
  into v_ready_artifact_count
  from admin_security_artifact_viewer_subjects
  where private_room_id = v_room.id
    and status = 'ready';

  select count(*)
  into v_search_document_count
  from admin_security_artifact_search_documents
  where private_room_id = v_room.id
    and status = 'ready';

  select count(*)
  into v_answer_count
  from admin_security_evidence_answer_requests
  where private_room_id = v_room.id;

  select count(*)
  into v_receipt_count
  from admin_security_answer_receipts
  where private_room_id = v_room.id;

  select count(*)
  into v_export_count
  from admin_security_answer_receipt_export_bundles
  where private_room_id = v_room.id;

  select count(*)
  into v_download_count
  from admin_security_artifact_download_attempt_dashboard
  where private_room_id = v_room.id
    and status = 'allowed';

  select count(*)
  into v_timeline_event_count
  from admin_security_trust_timeline_events
  where private_room_id = v_room.id
    and status = 'active';

  select
    count(*),
    max(last_chain_hash_sha256)
  into v_chain_count, v_latest_chain_hash
  from admin_security_trust_timeline_chains
  where private_room_id = v_room.id
    and status = 'active';

  select cp.checkpoint_hash_sha256
  into v_latest_checkpoint_hash
  from admin_security_trust_timeline_chain_checkpoints cp
  join admin_security_trust_timeline_chains c
    on c.id = cp.chain_id
  where c.private_room_id = v_room.id
    and cp.status = 'active'
  order by cp.created_at desc
  limit 1;

  select mb.merkle_root_sha256
  into v_latest_merkle_root
  from admin_security_trust_timeline_merkle_batches mb
  join admin_security_trust_timeline_chains c
    on c.id = mb.chain_id
  where c.private_room_id = v_room.id
    and mb.status = 'ready'
  order by mb.created_at desc
  limit 1;

  perform record_customer_trust_proof_portal_event(
    v_portal.id,
    v_session.id,
    'dashboard_viewed',
    'viewed',
    v_session.requester_auth_user_id,
    v_session.requester_email,
    'customer_trust_proof_portal',
    v_portal.id,
    v_portal.portal_key,
    'Customer proof dashboard viewed',
    'Customer viewed proof dashboard.',
    v_session.ip_address,
    v_session.user_agent,
    p_request_id,
    '{}'::jsonb
  );

  return jsonb_build_object(
    'portal',
    jsonb_build_object(
      'portalId', v_portal.id,
      'portalKey', v_portal.portal_key,
      'title', v_portal.title,
      'subtitle', v_portal.subtitle,
      'description', v_portal.description,
      'customerName', v_portal.customer_name,
      'customerDomain', v_portal.customer_domain,
      'status', v_portal.status,
      'features', jsonb_build_object(
        'showArtifacts', v_portal.show_artifacts,
        'showSearch', v_portal.show_search,
        'showAnswers', v_portal.show_answers,
        'showReceipts', v_portal.show_receipts,
        'showExports', v_portal.show_exports,
        'showDownloads', v_portal.show_downloads,
        'showTimeline', v_portal.show_timeline,
        'showCryptoStatus', v_portal.show_crypto_status
      )
    ),
    'privateRoom',
    jsonb_build_object(
      'privateRoomId', v_room.id,
      'privateRoomKey', v_room.private_room_key,
      'title', v_room.title,
      'status', v_room.status,
      'expiresAt', v_room.expires_at
    ),
    'counts',
    jsonb_build_object(
      'artifacts', v_artifact_count,
      'readyArtifacts', v_ready_artifact_count,
      'searchDocuments', v_search_document_count,
      'answers', v_answer_count,
      'receipts', v_receipt_count,
      'exports', v_export_count,
      'downloads', v_download_count,
      'timelineEvents', v_timeline_event_count,
      'chains', v_chain_count
    ),
    'crypto',
    jsonb_build_object(
      'latestChainHash', v_latest_chain_hash,
      'latestCheckpointHash', v_latest_checkpoint_hash,
      'latestMerkleRoot', v_latest_merkle_root,
      'hasCryptoProof', v_latest_chain_hash is not null
    )
  );
end;
$$;

create or replace function list_customer_trust_proof_portal_artifacts(
  p_portal_token text,
  p_auth_user_id uuid default null,
  p_limit integer default 50,
  p_request_id text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_session admin_security_customer_trust_proof_portal_sessions%rowtype;
  v_items jsonb;
begin
  if p_limit <= 0 or p_limit > 100 then
    raise exception 'customer trust proof portal artifact limit must be between 1 and 100';
  end if;

  v_session := resolve_customer_trust_proof_portal_session(
    p_portal_token,
    p_auth_user_id
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'viewerSubjectId', vs.admin_security_artifact_viewer_subject_id,
        'viewerSubjectKey', vs.viewer_subject_key,
        'artifactKey', vs.artifact_key,
        'artifactType', vs.artifact_type,
        'title', vs.title,
        'summary', vs.summary,
        'status', vs.status,
        'visibility', vs.default_visibility,
        'sensitivity', vs.sensitivity,
        'redactionPolicy', vs.redaction_policy,
        'previewable', vs.previewable,
        'downloadable', vs.downloadable,
        'expiresAt', vs.expires_at,
        'createdAt', vs.created_at
      )
      order by vs.created_at desc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select *
    from admin_security_artifact_viewer_subject_dashboard
    where private_room_id = v_session.private_room_id
      and status = 'ready'
    order by created_at desc
    limit p_limit
  ) vs;

  perform record_customer_trust_proof_portal_event(
    v_session.portal_id,
    v_session.id,
    'artifact_opened',
    'listed',
    v_session.requester_auth_user_id,
    v_session.requester_email,
    'private_trust_room',
    v_session.private_room_id,
    null,
    'Customer listed trust artifacts',
    'Customer viewed the artifact proof list.',
    v_session.ip_address,
    v_session.user_agent,
    p_request_id,
    jsonb_build_object('limit', p_limit)
  );

  return jsonb_build_object(
    'items',
    v_items
  );
end;
$$;

create or replace function list_customer_trust_proof_portal_timeline_events(
  p_portal_token text,
  p_auth_user_id uuid default null,
  p_limit integer default 50,
  p_request_id text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_session admin_security_customer_trust_proof_portal_sessions%rowtype;
  v_items jsonb;
begin
  if p_limit <= 0 or p_limit > 100 then
    raise exception 'customer trust proof portal timeline limit must be between 1 and 100';
  end if;

  v_session := resolve_customer_trust_proof_portal_session(
    p_portal_token,
    p_auth_user_id
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'timelineEventId', e.admin_security_trust_timeline_event_id,
        'timelineEventKey', e.timeline_event_key,
        'eventFamily', e.event_family,
        'eventType', e.event_type,
        'eventAction', e.event_action,
        'eventTime', e.event_time,
        'title', e.title,
        'summary', e.summary,
        'actorType', e.actor_type,
        'actorEmail', e.actor_email,
        'artifactType', e.artifact_type,
        'artifactKey', e.artifact_key,
        'receiptKey', e.receipt_key,
        'bundleKey', e.bundle_key,
        'verificationStatus', e.verification_status,
        'riskLevel', e.risk_level,
        'immutableHashSha256', e.immutable_hash_sha256
      )
      order by e.event_time desc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select *
    from admin_security_trust_timeline_event_dashboard
    where private_room_id = v_session.private_room_id
      and status = 'active'
    order by event_time desc
    limit p_limit
  ) e;

  perform record_customer_trust_proof_portal_event(
    v_session.portal_id,
    v_session.id,
    'timeline_viewed',
    'listed',
    v_session.requester_auth_user_id,
    v_session.requester_email,
    'private_trust_room',
    v_session.private_room_id,
    null,
    'Customer viewed trust timeline',
    'Customer listed trust proof timeline events.',
    v_session.ip_address,
    v_session.user_agent,
    p_request_id,
    jsonb_build_object('limit', p_limit)
  );

  return jsonb_build_object(
    'items',
    v_items
  );
end;
$$;

create or replace function get_customer_trust_proof_portal_crypto_status(
  p_portal_token text,
  p_auth_user_id uuid default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_session admin_security_customer_trust_proof_portal_sessions%rowtype;
  v_chain record;
  v_checkpoint record;
  v_merkle record;
  v_anchor record;
  v_chain_verification jsonb;
begin
  v_session := resolve_customer_trust_proof_portal_session(
    p_portal_token,
    p_auth_user_id
  );

  select *
  into v_chain
  from admin_security_trust_timeline_chain_dashboard
  where private_room_id = v_session.private_room_id
    and status = 'active'
  order by updated_at desc
  limit 1;

  if v_chain.admin_security_trust_timeline_chain_id is not null then
    v_chain_verification := verify_admin_security_trust_timeline_chain(
      v_chain.admin_security_trust_timeline_chain_id
    );
  else
    v_chain_verification := jsonb_build_object(
      'verified',
      false,
      'failureReason',
      'No timeline chain found.'
    );
  end if;

  select *
  into v_checkpoint
  from admin_security_trust_timeline_chain_checkpoint_dashboard
  where chain_id = v_chain.admin_security_trust_timeline_chain_id
  order by created_at desc
  limit 1;

  select *
  into v_merkle
  from admin_security_trust_timeline_merkle_batch_dashboard
  where chain_id = v_chain.admin_security_trust_timeline_chain_id
    and status = 'ready'
  order by created_at desc
  limit 1;

  select *
  into v_anchor
  from admin_security_trust_timeline_anchor_dashboard
  where chain_id = v_chain.admin_security_trust_timeline_chain_id
    and status = 'active'
  order by created_at desc
  limit 1;

  perform record_customer_trust_proof_portal_event(
    v_session.portal_id,
    v_session.id,
    'crypto_status_viewed',
    'viewed',
    v_session.requester_auth_user_id,
    v_session.requester_email,
    'private_trust_room',
    v_session.private_room_id,
    null,
    'Customer viewed crypto proof status',
    'Customer viewed cryptographic proof status.',
    v_session.ip_address,
    v_session.user_agent,
    p_request_id,
    '{}'::jsonb
  );

  return jsonb_build_object(
    'chain',
    case
      when v_chain.admin_security_trust_timeline_chain_id is not null then jsonb_build_object(
        'chainId', v_chain.admin_security_trust_timeline_chain_id,
        'chainKey', v_chain.chain_key,
        'chainScope', v_chain.chain_scope,
        'eventCount', v_chain.event_count,
        'lastSequenceNumber', v_chain.last_sequence_number,
        'lastChainHashSha256', v_chain.last_chain_hash_sha256,
        'lastEventTime', v_chain.last_event_time,
        'verified', (v_chain_verification->>'verified')::boolean
      )
      else null
    end,
    'checkpoint',
    case
      when v_checkpoint.admin_security_trust_timeline_chain_checkpoint_id is not null then jsonb_build_object(
        'checkpointId', v_checkpoint.admin_security_trust_timeline_chain_checkpoint_id,
        'checkpointKey', v_checkpoint.checkpoint_key,
        'checkpointHashSha256', v_checkpoint.checkpoint_hash_sha256,
        'chainHeadHashSha256', v_checkpoint.chain_head_hash_sha256,
        'signedAt', v_checkpoint.signed_at
      )
      else null
    end,
    'merkle',
    case
      when v_merkle.admin_security_trust_timeline_merkle_batch_id is not null then jsonb_build_object(
        'merkleBatchId', v_merkle.admin_security_trust_timeline_merkle_batch_id,
        'merkleBatchKey', v_merkle.merkle_batch_key,
        'merkleRootSha256', v_merkle.merkle_root_sha256,
        'leafCount', v_merkle.leaf_count,
        'algorithm', v_merkle.merkle_algorithm,
        'signedAt', v_merkle.signed_at
      )
      else null
    end,
    'anchor',
    case
      when v_anchor.admin_security_trust_timeline_anchor_id is not null then jsonb_build_object(
        'anchorId', v_anchor.admin_security_trust_timeline_anchor_id,
        'anchorKey', v_anchor.anchor_key,
        'anchorType', v_anchor.anchor_type,
        'anchoredHashSha256', v_anchor.anchored_hash_sha256,
        'anchoredAt', v_anchor.anchored_at
      )
      else null
    end,
    'verification',
    v_chain_verification
  );
end;
$$;

create or replace function expire_customer_trust_proof_portal_sessions(
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

  update admin_security_customer_trust_proof_portal_sessions
  set
    status = 'expired',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'expired_by_worker',
      p_worker_id,
      'portal_session_expiry_run_id',
      v_run_id
    ),
    updated_at = now()
  where id in (
    select id
    from admin_security_customer_trust_proof_portal_sessions
    where status = 'active'
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  update admin_security_customer_trust_proof_portals
  set
    status = 'expired',
    updated_at = now()
  where status in ('active', 'paused')
    and expires_at is not null
    and expires_at <= now();

  return v_run_id;
end;
$$;

create or replace view admin_security_customer_trust_proof_portal_dashboard as
select
  p.id as admin_security_customer_trust_proof_portal_id,
  p.portal_key,
  p.status,
  p.portal_type,
  p.title,
  p.subtitle,
  p.description,
  p.customer_name,
  p.customer_domain,
  p.private_room_id,
  r.private_room_key,
  p.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  p.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  p.show_artifacts,
  p.show_search,
  p.show_answers,
  p.show_receipts,
  p.show_exports,
  p.show_downloads,
  p.show_timeline,
  p.show_crypto_status,
  p.allow_customer_search,
  p.allow_customer_answers,
  p.allow_receipt_creation,
  p.allow_export_creation,
  p.allow_timeline_snapshot_creation,
  p.require_authenticated_access,
  p.published_at,
  p.expires_at,
  (
    select count(*)
    from admin_security_customer_trust_proof_portal_sessions s
    where s.portal_id = p.id
  ) as session_count,
  (
    select count(*)
    from admin_security_customer_trust_proof_portal_events e
    where e.portal_id = p.id
  ) as event_count,
  p.created_at,
  p.updated_at,
  p.metadata
from admin_security_customer_trust_proof_portals p
left join admin_security_private_trust_rooms r
  on r.id = p.private_room_id
left join admin_security_auditor_portals ap
  on ap.id = p.auditor_portal_id
left join admin_security_enterprise_review_rooms er
  on er.id = p.enterprise_review_room_id
order by p.created_at desc;

create or replace view admin_security_customer_trust_proof_portal_session_dashboard as
select
  s.id as admin_security_customer_trust_proof_portal_session_id,
  s.portal_session_key,
  s.status,
  s.portal_id,
  p.portal_key,
  s.private_room_id,
  r.private_room_key,
  s.private_room_participant_id,
  prp.email as private_room_participant_email,
  s.requester_auth_user_id,
  s.requester_email,
  s.requester_display_name,
  s.customer_name,
  s.customer_domain,
  s.session_token_prefix,
  s.expires_at,
  s.ip_address,
  s.user_agent,
  s.created_at,
  s.updated_at,
  s.metadata
from admin_security_customer_trust_proof_portal_sessions s
join admin_security_customer_trust_proof_portals p
  on p.id = s.portal_id
left join admin_security_private_trust_rooms r
  on r.id = s.private_room_id
left join admin_security_private_trust_room_participants prp
  on prp.id = s.private_room_participant_id
order by s.created_at desc;

create or replace view admin_security_customer_trust_proof_portal_event_dashboard as
select
  e.id as admin_security_customer_trust_proof_portal_event_id,
  e.portal_event_key,
  e.portal_id,
  p.portal_key,
  e.portal_session_id,
  s.portal_session_key,
  e.private_room_id,
  r.private_room_key,
  e.private_room_participant_id,
  prp.email as private_room_participant_email,
  e.event_type,
  e.event_action,
  e.requester_auth_user_id,
  e.requester_email,
  e.related_type,
  e.related_id,
  e.related_key,
  e.title,
  e.summary,
  e.ip_address,
  e.user_agent,
  e.created_at,
  e.metadata
from admin_security_customer_trust_proof_portal_events e
join admin_security_customer_trust_proof_portals p
  on p.id = e.portal_id
left join admin_security_customer_trust_proof_portal_sessions s
  on s.id = e.portal_session_id
left join admin_security_private_trust_rooms r
  on r.id = e.private_room_id
left join admin_security_private_trust_room_participants prp
  on prp.id = e.private_room_participant_id
order by e.created_at desc;

create or replace view admin_security_customer_trust_proof_portal_integrity as
select
  (
    select count(*)
    from admin_security_customer_trust_proof_portals
    where status = 'active'
  ) as active_portal_count,
  (
    select count(*)
    from admin_security_customer_trust_proof_portals
    where status = 'active'
      and private_room_id is null
      and portal_type = 'private_room'
  ) as broken_private_room_portal_count,
  (
    select count(*)
    from admin_security_customer_trust_proof_portal_sessions
    where status = 'active'
  ) as active_portal_session_count,
  (
    select count(*)
    from admin_security_customer_trust_proof_portal_sessions
    where status = 'active'
      and expires_at <= now()
  ) as overdue_expired_portal_session_count,
  (
    select count(*)
    from admin_security_customer_trust_proof_portal_events
    where created_at >= now() - interval '24 hours'
  ) as portal_event_count_24h,
  (
    select count(*)
    from admin_security_customer_trust_proof_portal_events
    where event_type = 'error'
      and created_at >= now() - interval '1 hour'
  ) as portal_error_count_1h,
  now() as checked_at;

grant select on admin_security_customer_trust_proof_portal_dashboard to admin_api_role;
grant select on admin_security_customer_trust_proof_portal_session_dashboard to admin_api_role;
grant select on admin_security_customer_trust_proof_portal_event_dashboard to admin_api_role;
grant select on admin_security_customer_trust_proof_portal_integrity to admin_api_role;

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
    'customer_trust_proof_portal_session_expiry_every_5m',
    'Expire customer trust proof portal sessions',
    'admin',
    true,
    '*/5 * * * *',
    'expire_customer_trust_proof_portal_sessions',
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

  select *
  into v_job
  from scheduled_jobs
  where job_key = p_job_key;

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

  v_lock_acquired := acquire_scheduled_job_lock(v_job.job_key, p_locked_by, v_job.lock_ttl_seconds, p_metadata);

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

  insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, started_at, metadata)
  values (v_job.id, v_job.job_key, v_job.job_group, 'started', v_started_at, p_metadata)
  returning id into v_run_id;

  update scheduled_jobs
  set last_started_at = v_started_at, last_status = 'started', last_run_id = v_run_id, updated_at = now()
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
  elsif v_job.function_name = 'chain_admin_security_trust_timeline_events' then
    v_uuid_result := chain_admin_security_trust_timeline_events(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_customer_trust_proof_portal_sessions' then
    v_uuid_result := expire_customer_trust_proof_portal_sessions(
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

alter table admin_security_customer_trust_proof_portals enable row level security;
alter table admin_security_customer_trust_proof_portal_sessions enable row level security;
alter table admin_security_customer_trust_proof_portal_events enable row level security;

create policy admin_security_customer_trust_proof_portals_no_user_direct_access
on admin_security_customer_trust_proof_portals
for all
to authenticated
using (false)
with check (false);

create policy admin_security_customer_trust_proof_portal_sessions_no_user_direct_access
on admin_security_customer_trust_proof_portal_sessions
for all
to authenticated
using (false)
with check (false);

create policy admin_security_customer_trust_proof_portal_events_no_user_direct_access
on admin_security_customer_trust_proof_portal_events
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_customer_trust_proof_portals
on admin_security_customer_trust_proof_portals
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_customer_trust_proof_portal_sessions
on admin_security_customer_trust_proof_portal_sessions
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_customer_trust_proof_portal_events
on admin_security_customer_trust_proof_portal_events
for all
to admin_api_role
using (true)
with check (true);

create policy worker_all_customer_trust_proof_portal_sessions
on admin_security_customer_trust_proof_portal_sessions
for all
to worker_role
using (true)
with check (true);

grant execute on function get_or_create_private_room_customer_trust_proof_portal(uuid, text, jsonb)
to admin_api_role;

grant execute on function create_private_room_customer_trust_proof_portal_session(
  uuid,
  text,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function resolve_customer_trust_proof_portal_session(text, uuid)
to admin_api_role;

grant execute on function record_customer_trust_proof_portal_event(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  text,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function get_customer_trust_proof_portal_dashboard(text, uuid, text)
to admin_api_role;

grant execute on function list_customer_trust_proof_portal_artifacts(text, uuid, integer, text)
to admin_api_role;

grant execute on function list_customer_trust_proof_portal_timeline_events(text, uuid, integer, text)
to admin_api_role;

grant execute on function get_customer_trust_proof_portal_crypto_status(text, uuid, text)
to admin_api_role;

grant execute on function expire_customer_trust_proof_portal_sessions(integer, text, jsonb)
to admin_api_role, worker_role;

alter function get_or_create_private_room_customer_trust_proof_portal(uuid, text, jsonb) security definer;
alter function get_or_create_private_room_customer_trust_proof_portal(uuid, text, jsonb) set search_path = public;

alter function create_private_room_customer_trust_proof_portal_session(uuid, text, inet, text, text, jsonb) security definer;
alter function create_private_room_customer_trust_proof_portal_session(uuid, text, inet, text, text, jsonb) set search_path = public;

alter function resolve_customer_trust_proof_portal_session(text, uuid) security definer;
alter function resolve_customer_trust_proof_portal_session(text, uuid) set search_path = public;

alter function record_customer_trust_proof_portal_event(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  text,
  inet,
  text,
  text,
  jsonb
) security definer;
alter function record_customer_trust_proof_portal_event(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  text,
  inet,
  text,
  text,
  jsonb
) set search_path = public;

alter function get_customer_trust_proof_portal_dashboard(text, uuid, text) security definer;
alter function get_customer_trust_proof_portal_dashboard(text, uuid, text) set search_path = public;

alter function list_customer_trust_proof_portal_artifacts(text, uuid, integer, text) security definer;
alter function list_customer_trust_proof_portal_artifacts(text, uuid, integer, text) set search_path = public;

alter function list_customer_trust_proof_portal_timeline_events(text, uuid, integer, text) security definer;
alter function list_customer_trust_proof_portal_timeline_events(text, uuid, integer, text) set search_path = public;

alter function get_customer_trust_proof_portal_crypto_status(text, uuid, text) security definer;
alter function get_customer_trust_proof_portal_crypto_status(text, uuid, text) set search_path = public;

alter function expire_customer_trust_proof_portal_sessions(integer, text, jsonb) security definer;
alter function expire_customer_trust_proof_portal_sessions(integer, text, jsonb) set search_path = public;

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
    'CUSTOMER_TRUST_PROOF_PORTAL_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Customer trust proof portal not found.',
    'Customer trust proof portal not found.',
    'platform'
  ),
  (
    'CUSTOMER_TRUST_PROOF_PORTAL_INVALID',
    'permission',
    'medium',
    403,
    false,
    true,
    'Customer trust proof portal is not available.',
    'Customer trust proof portal invalid.',
    'platform'
  ),
  (
    'CUSTOMER_TRUST_PROOF_PORTAL_EXPIRED',
    'permission',
    'medium',
    410,
    false,
    true,
    'Customer trust proof portal session has expired.',
    'Customer trust proof portal session expired.',
    'platform'
  ),
  (
    'CUSTOMER_TRUST_PROOF_PORTAL_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Customer trust proof portal request requires complete fields.',
    'Customer trust proof portal required fields missing.',
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
  ('customer trust proof portal not found', 'CUSTOMER_TRUST_PROOF_PORTAL_NOT_FOUND', 5, '{}'::jsonb),
  ('private room not found', 'CUSTOMER_TRUST_PROOF_PORTAL_NOT_FOUND', 5, '{}'::jsonb),
  ('customer trust proof portal is not active', 'CUSTOMER_TRUST_PROOF_PORTAL_INVALID', 5, '{}'::jsonb),
  ('customer trust proof portal session invalid', 'CUSTOMER_TRUST_PROOF_PORTAL_INVALID', 5, '{}'::jsonb),
  ('customer trust proof portal session revoked', 'CUSTOMER_TRUST_PROOF_PORTAL_INVALID', 5, '{}'::jsonb),
  ('customer trust proof portal session authentication mismatch', 'CUSTOMER_TRUST_PROOF_PORTAL_INVALID', 5, '{}'::jsonb),
  ('customer trust proof portal session expired', 'CUSTOMER_TRUST_PROOF_PORTAL_EXPIRED', 5, '{}'::jsonb),
  ('customer trust proof portal token is required', 'CUSTOMER_TRUST_PROOF_PORTAL_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('customer trust proof portal artifact limit must be between 1 and 100', 'CUSTOMER_TRUST_PROOF_PORTAL_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('customer trust proof portal timeline limit must be between 1 and 100', 'CUSTOMER_TRUST_PROOF_PORTAL_REQUIRED_FIELDS', 5, '{}'::jsonb)
on conflict do nothing;
