-- Step 9.72 — Build trust proof timeline v2
-- Runs after 186_admin_security_answer_receipt_export_bundles_v2.sql

create table if not exists admin_security_trust_timeline_subjects (
  id uuid primary key default gen_random_uuid(),
  timeline_subject_key text not null unique,
  status text not null default 'active',
  subject_type text not null,
  subject_id uuid not null,
  subject_key text,
  title text not null,
  summary text,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  visibility text not null default 'admin_only',
  sensitivity text not null default 'restricted',
  first_event_at timestamptz,
  last_event_at timestamptz,
  event_count integer not null default 0,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_type, subject_id),
  constraint admin_security_trust_timeline_subjects_status_check
  check (status in ('active', 'archived', 'revoked', 'deleted')),
  constraint admin_security_trust_timeline_subjects_type_check
  check (
    subject_type in (
      'private_trust_room',
      'private_trust_room_participant',
      'private_trust_room_artifact',
      'artifact_download_subject',
      'artifact_download_grant',
      'artifact_viewer_subject',
      'artifact_viewer_session',
      'artifact_search_document',
      'artifact_search_session',
      'artifact_search_query',
      'evidence_answer_session',
      'evidence_answer_request',
      'answer_receipt',
      'answer_receipt_export_bundle',
      'answer_receipt_verification',
      'auditor_portal',
      'enterprise_review_room',
      'customer',
      'admin_action',
      'other'
    )
  ),
  constraint admin_security_trust_timeline_subjects_visibility_check
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
  constraint admin_security_trust_timeline_subjects_sensitivity_check
  check (
    sensitivity in (
      'public',
      'customer_confidential',
      'restricted',
      'legal_sensitive',
      'security_sensitive'
    )
  ),
  constraint admin_security_trust_timeline_subjects_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_trust_timeline_subjects_type_idx
on admin_security_trust_timeline_subjects (subject_type, subject_id);
create index if not exists admin_security_trust_timeline_subjects_private_room_idx
on admin_security_trust_timeline_subjects (private_room_id, status);
create index if not exists admin_security_trust_timeline_subjects_customer_idx
on admin_security_trust_timeline_subjects (customer_name, customer_domain);
create index if not exists admin_security_trust_timeline_subjects_last_event_idx
on admin_security_trust_timeline_subjects (last_event_at desc);

drop trigger if exists admin_security_trust_timeline_subjects_set_updated_at
on admin_security_trust_timeline_subjects;
create trigger admin_security_trust_timeline_subjects_set_updated_at
before update on admin_security_trust_timeline_subjects
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_timeline_events (
  id uuid primary key default gen_random_uuid(),
  timeline_event_key text not null unique,
  status text not null default 'active',
  timeline_subject_id uuid references admin_security_trust_timeline_subjects(id) on delete set null,
  event_family text not null,
  event_type text not null,
  event_action text not null,
  event_time timestamptz not null default now(),
  source_type text not null,
  source_id uuid not null,
  source_key text,
  title text not null,
  summary text,
  actor_type text not null default 'system',
  actor_auth_user_id uuid,
  actor_admin_user_id uuid references admin_users(id),
  actor_email text,
  actor_display_name text,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  private_room_participant_id uuid references admin_security_private_trust_room_participants(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  auditor_participant_id uuid,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  artifact_type text,
  artifact_key text,
  receipt_key text,
  bundle_key text,
  grant_key text,
  viewer_session_key text,
  search_session_key text,
  answer_session_key text,
  verification_status text,
  risk_level text not null default 'info',
  visibility text not null default 'admin_only',
  sensitivity text not null default 'restricted',
  immutable_hash_sha256 text,
  ip_address inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_trust_timeline_events_status_check
  check (status in ('active', 'redacted', 'revoked', 'archived')),
  constraint admin_security_trust_timeline_events_family_check
  check (
    event_family in (
      'room',
      'artifact',
      'viewer',
      'search',
      'answer',
      'receipt',
      'export',
      'download',
      'verification',
      'revocation',
      'admin',
      'system',
      'security',
      'other'
    )
  ),
  constraint admin_security_trust_timeline_events_actor_type_check
  check (
    actor_type in (
      'customer_user',
      'auditor_user',
      'enterprise_user',
      'admin_user',
      'worker',
      'system',
      'anonymous',
      'unknown'
    )
  ),
  constraint admin_security_trust_timeline_events_risk_level_check
  check (risk_level in ('info', 'low', 'medium', 'high', 'critical')),
  constraint admin_security_trust_timeline_events_visibility_check
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
  constraint admin_security_trust_timeline_events_sensitivity_check
  check (
    sensitivity in (
      'public',
      'customer_confidential',
      'restricted',
      'legal_sensitive',
      'security_sensitive'
    )
  ),
  constraint admin_security_trust_timeline_events_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_trust_timeline_events_subject_idx
on admin_security_trust_timeline_events (timeline_subject_id, event_time desc);
create index if not exists admin_security_trust_timeline_events_source_idx
on admin_security_trust_timeline_events (source_type, source_id);
create index if not exists admin_security_trust_timeline_events_family_idx
on admin_security_trust_timeline_events (event_family, event_type, event_time desc);
create index if not exists admin_security_trust_timeline_events_private_room_idx
on admin_security_trust_timeline_events (private_room_id, event_time desc);
create index if not exists admin_security_trust_timeline_events_customer_idx
on admin_security_trust_timeline_events (customer_name, customer_domain, event_time desc);
create index if not exists admin_security_trust_timeline_events_receipt_idx
on admin_security_trust_timeline_events (receipt_key, event_time desc);
create index if not exists admin_security_trust_timeline_events_bundle_idx
on admin_security_trust_timeline_events (bundle_key, event_time desc);
create index if not exists admin_security_trust_timeline_events_risk_idx
on admin_security_trust_timeline_events (risk_level, event_time desc);

create or replace function prevent_admin_security_trust_timeline_event_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.status <> new.status
    or old.metadata is distinct from new.metadata
  then
    return new;
  end if;

  raise exception 'trust timeline events are immutable';
end;
$$;

drop trigger if exists admin_security_trust_timeline_events_immutable
on admin_security_trust_timeline_events;
create trigger admin_security_trust_timeline_events_immutable
before update on admin_security_trust_timeline_events
for each row
execute function prevent_admin_security_trust_timeline_event_mutation();

create table if not exists admin_security_trust_timeline_event_links (
  id uuid primary key default gen_random_uuid(),
  timeline_event_id uuid not null references admin_security_trust_timeline_events(id) on delete cascade,
  linked_type text not null,
  linked_id uuid,
  linked_key text,
  relationship_type text not null,
  title text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (timeline_event_id, linked_type, linked_id, relationship_type),
  constraint admin_security_trust_timeline_event_links_relationship_check
  check (
    relationship_type in (
      'subject',
      'parent',
      'child',
      'caused_by',
      'derived_from',
      'evidence_for',
      'citation_for',
      'download_for',
      'verification_for',
      'revocation_for',
      'export_for',
      'same_actor',
      'same_scope',
      'other'
    )
  )
);

create index if not exists admin_security_trust_timeline_event_links_event_idx
on admin_security_trust_timeline_event_links (timeline_event_id);
create index if not exists admin_security_trust_timeline_event_links_linked_idx
on admin_security_trust_timeline_event_links (linked_type, linked_id);

create table if not exists admin_security_trust_timeline_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_key text not null unique,
  status text not null default 'pending',
  snapshot_scope text not null,
  title text not null,
  summary text,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  start_time timestamptz,
  end_time timestamptz,
  event_count integer not null default 0,
  snapshot_payload jsonb not null default '{}'::jsonb,
  snapshot_hash_sha256 text,
  payload_bytes bigint,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  signed_at timestamptz,
  storage_uri text,
  expires_at timestamptz default (now() + interval '90 days'),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_trust_timeline_snapshots_status_check
  check (status in ('pending', 'building', 'ready', 'failed', 'expired', 'revoked', 'archived')),
  constraint admin_security_trust_timeline_snapshots_scope_check
  check (snapshot_scope in ('public', 'customer', 'private_room', 'auditor_portal', 'enterprise_review_room', 'admin')),
  constraint admin_security_trust_timeline_snapshots_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_trust_timeline_snapshots_scope_idx
on admin_security_trust_timeline_snapshots (snapshot_scope, status, created_at desc);
create index if not exists admin_security_trust_timeline_snapshots_private_room_idx
on admin_security_trust_timeline_snapshots (private_room_id, status, created_at desc);

drop trigger if exists admin_security_trust_timeline_snapshots_set_updated_at
on admin_security_trust_timeline_snapshots;
create trigger admin_security_trust_timeline_snapshots_set_updated_at
before update on admin_security_trust_timeline_snapshots
for each row
execute function set_updated_at();

create or replace function register_admin_security_trust_timeline_subject(
  p_subject_type text,
  p_subject_id uuid,
  p_subject_key text,
  p_title text,
  p_summary text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_private_room_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_visibility text default 'admin_only',
  p_sensitivity text default 'restricted',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_subject_id uuid;
  v_subject_key text;
begin
  if p_subject_id is null then
    raise exception 'timeline subject id is required';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'timeline subject title is required';
  end if;

  v_subject_key := 'trust_timeline_subject:' || p_subject_type || ':' || p_subject_id::text;

  insert into admin_security_trust_timeline_subjects (
    timeline_subject_key,
    status,
    subject_type,
    subject_id,
    subject_key,
    title,
    summary,
    customer_name,
    customer_domain,
    private_room_id,
    auditor_portal_id,
    enterprise_review_room_id,
    visibility,
    sensitivity,
    request_id,
    metadata
  )
  values (
    v_subject_key,
    'active',
    p_subject_type,
    p_subject_id,
    p_subject_key,
    p_title,
    p_summary,
    p_customer_name,
    p_customer_domain,
    p_private_room_id,
    p_auditor_portal_id,
    p_enterprise_review_room_id,
    coalesce(p_visibility, 'admin_only'),
    coalesce(p_sensitivity, 'restricted'),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (subject_type, subject_id)
  do update set
    status = 'active',
    subject_key = coalesce(excluded.subject_key, admin_security_trust_timeline_subjects.subject_key),
    title = excluded.title,
    summary = coalesce(excluded.summary, admin_security_trust_timeline_subjects.summary),
    customer_name = coalesce(excluded.customer_name, admin_security_trust_timeline_subjects.customer_name),
    customer_domain = coalesce(excluded.customer_domain, admin_security_trust_timeline_subjects.customer_domain),
    private_room_id = coalesce(excluded.private_room_id, admin_security_trust_timeline_subjects.private_room_id),
    auditor_portal_id = coalesce(excluded.auditor_portal_id, admin_security_trust_timeline_subjects.auditor_portal_id),
    enterprise_review_room_id = coalesce(excluded.enterprise_review_room_id, admin_security_trust_timeline_subjects.enterprise_review_room_id),
    visibility = excluded.visibility,
    sensitivity = excluded.sensitivity,
    metadata = admin_security_trust_timeline_subjects.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_subject_id;

  return v_subject_id;
end;
$$;

create or replace function record_admin_security_trust_timeline_event(
  p_subject_type text,
  p_subject_id uuid,
  p_subject_key text,
  p_event_family text,
  p_event_type text,
  p_event_action text,
  p_source_type text,
  p_source_id uuid,
  p_source_key text,
  p_title text,
  p_summary text default null,
  p_actor_type text default 'system',
  p_actor_auth_user_id uuid default null,
  p_actor_admin_user_id uuid default null,
  p_actor_email text default null,
  p_actor_display_name text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_private_room_id uuid default null,
  p_private_room_participant_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_auditor_participant_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_artifact_type text default null,
  p_artifact_key text default null,
  p_receipt_key text default null,
  p_bundle_key text default null,
  p_grant_key text default null,
  p_viewer_session_key text default null,
  p_search_session_key text default null,
  p_answer_session_key text default null,
  p_verification_status text default null,
  p_risk_level text default 'info',
  p_visibility text default 'admin_only',
  p_sensitivity text default 'restricted',
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_timeline_subject_id uuid;
  v_event_id uuid;
  v_event_key text;
  v_hash_source text;
  v_hash text;
begin
  if p_source_id is null then
    raise exception 'timeline event source id is required';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'timeline event title is required';
  end if;

  v_timeline_subject_id := register_admin_security_trust_timeline_subject(
    p_subject_type,
    p_subject_id,
    p_subject_key,
    p_title,
    p_summary,
    p_customer_name,
    p_customer_domain,
    p_private_room_id,
    p_auditor_portal_id,
    p_enterprise_review_room_id,
    p_visibility,
    p_sensitivity,
    p_request_id,
    jsonb_build_object('auto_registered_from_event', true)
  );

  v_event_key :=
    'trust_timeline_event:' ||
    p_source_type || ':' ||
    p_source_id::text || ':' ||
    p_event_type || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  v_hash_source := concat_ws(
    '|',
    v_event_key,
    p_event_family,
    p_event_type,
    p_event_action,
    p_source_type,
    p_source_id::text,
    p_title,
    coalesce(p_actor_email, ''),
    coalesce(p_customer_name, ''),
    coalesce(p_artifact_key, ''),
    coalesce(p_receipt_key, ''),
    now()::text
  );

  v_hash := encode(digest(v_hash_source, 'sha256'), 'hex');

  insert into admin_security_trust_timeline_events (
    timeline_event_key,
    status,
    timeline_subject_id,
    event_family,
    event_type,
    event_action,
    source_type,
    source_id,
    source_key,
    title,
    summary,
    actor_type,
    actor_auth_user_id,
    actor_admin_user_id,
    actor_email,
    actor_display_name,
    customer_name,
    customer_domain,
    private_room_id,
    private_room_participant_id,
    auditor_portal_id,
    auditor_participant_id,
    enterprise_review_room_id,
    artifact_type,
    artifact_key,
    receipt_key,
    bundle_key,
    grant_key,
    viewer_session_key,
    search_session_key,
    answer_session_key,
    verification_status,
    risk_level,
    visibility,
    sensitivity,
    immutable_hash_sha256,
    ip_address,
    user_agent,
    request_id,
    metadata
  )
  values (
    v_event_key,
    'active',
    v_timeline_subject_id,
    p_event_family,
    p_event_type,
    p_event_action,
    p_source_type,
    p_source_id,
    p_source_key,
    p_title,
    p_summary,
    coalesce(p_actor_type, 'system'),
    p_actor_auth_user_id,
    p_actor_admin_user_id,
    p_actor_email,
    p_actor_display_name,
    p_customer_name,
    p_customer_domain,
    p_private_room_id,
    p_private_room_participant_id,
    p_auditor_portal_id,
    p_auditor_participant_id,
    p_enterprise_review_room_id,
    p_artifact_type,
    p_artifact_key,
    p_receipt_key,
    p_bundle_key,
    p_grant_key,
    p_viewer_session_key,
    p_search_session_key,
    p_answer_session_key,
    p_verification_status,
    coalesce(p_risk_level, 'info'),
    coalesce(p_visibility, 'admin_only'),
    coalesce(p_sensitivity, 'restricted'),
    v_hash,
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  update admin_security_trust_timeline_subjects
  set
    first_event_at = coalesce(first_event_at, now()),
    last_event_at = now(),
    event_count = event_count + 1,
    updated_at = now()
  where id = v_timeline_subject_id;

  return v_event_id;
end;
$$;

create or replace function link_admin_security_trust_timeline_event(
  p_timeline_event_id uuid,
  p_linked_type text,
  p_linked_id uuid,
  p_linked_key text,
  p_relationship_type text,
  p_title text default null,
  p_summary text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_link_id uuid;
begin
  if p_timeline_event_id is null then
    raise exception 'timeline event id is required';
  end if;
  if p_linked_type is null or length(trim(p_linked_type)) = 0 then
    raise exception 'timeline linked type is required';
  end if;

  insert into admin_security_trust_timeline_event_links (
    timeline_event_id,
    linked_type,
    linked_id,
    linked_key,
    relationship_type,
    title,
    summary,
    metadata
  )
  values (
    p_timeline_event_id,
    p_linked_type,
    p_linked_id,
    p_linked_key,
    p_relationship_type,
    p_title,
    p_summary,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (timeline_event_id, linked_type, linked_id, relationship_type)
  do update set
    linked_key = coalesce(excluded.linked_key, admin_security_trust_timeline_event_links.linked_key),
    title = coalesce(excluded.title, admin_security_trust_timeline_event_links.title),
    summary = coalesce(excluded.summary, admin_security_trust_timeline_event_links.summary),
    metadata = admin_security_trust_timeline_event_links.metadata || excluded.metadata
  returning id into v_link_id;

  return v_link_id;
end;
$$;

create or replace function discover_admin_security_trust_timeline_events(
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
  v_event_id uuid;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_row in
    select
      e.id,
      e.private_room_id,
      e.participant_id,
      e.event_type,
      e.source_type,
      e.source_id,
      e.title,
      e.summary,
      e.ip_address,
      e.user_agent,
      e.request_id,
      e.metadata,
      e.created_at,
      r.private_room_key,
      r.customer_name,
      r.customer_domain,
      p.email as participant_email,
      p.display_name as participant_display_name
    from admin_security_private_trust_room_access_events e
    join admin_security_private_trust_rooms r on r.id = e.private_room_id
    left join admin_security_private_trust_room_participants p on p.id = e.participant_id
    where not exists (
      select 1
      from admin_security_trust_timeline_events t
      where t.source_type = 'admin_security_private_trust_room_access_event'
        and t.source_id = e.id
    )
    order by e.created_at asc
    limit p_batch_size
  loop
    v_event_id := record_admin_security_trust_timeline_event(
      'private_trust_room',
      v_row.private_room_id,
      v_row.private_room_key,
      'room',
      v_row.event_type,
      'private_room_access_event',
      'admin_security_private_trust_room_access_event',
      v_row.id,
      v_row.event_type,
      v_row.title,
      v_row.summary,
      case when v_row.participant_id is not null then 'customer_user' else 'system' end,
      null,
      null,
      v_row.participant_email,
      v_row.participant_display_name,
      v_row.customer_name,
      v_row.customer_domain,
      v_row.private_room_id,
      v_row.participant_id,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'info',
      'private_room_scoped',
      'customer_confidential',
      v_row.ip_address,
      v_row.user_agent,
      v_row.request_id,
      coalesce(v_row.metadata, '{}'::jsonb) || jsonb_build_object(
        'timeline_discovery_run_id',
        v_run_id,
        'worker_id',
        p_worker_id
      )
    );
  end loop;

  for v_row in
    select *
    from admin_security_artifact_download_attempt_dashboard a
    where not exists (
      select 1
      from admin_security_trust_timeline_events t
      where t.source_type = 'admin_security_artifact_download_attempt'
        and t.source_id = a.admin_security_artifact_download_attempt_id
    )
    order by a.created_at asc
    limit p_batch_size
  loop
    v_event_id := record_admin_security_trust_timeline_event(
      'artifact_download_grant',
      coalesce(v_row.download_grant_id, v_row.admin_security_artifact_download_attempt_id),
      v_row.grant_key,
      'download',
      'download_attempt',
      v_row.status,
      'admin_security_artifact_download_attempt',
      v_row.admin_security_artifact_download_attempt_id,
      v_row.attempt_key,
      'Artifact download attempt',
      coalesce(v_row.failure_reason, 'Download attempt status: ' || v_row.status),
      case when v_row.requester_auth_user_id is not null then 'customer_user' else 'unknown' end,
      v_row.requester_auth_user_id,
      null,
      v_row.requester_email,
      null,
      null,
      null,
      v_row.private_room_id,
      v_row.private_room_participant_id,
      v_row.auditor_portal_id,
      v_row.auditor_participant_id,
      null,
      v_row.artifact_type,
      v_row.artifact_key,
      null,
      null,
      v_row.grant_key,
      null,
      null,
      null,
      null,
      case when v_row.status = 'allowed' then 'info' else 'medium' end,
      'admin_only',
      'restricted',
      v_row.ip_address,
      v_row.user_agent,
      null,
      coalesce(v_row.metadata, '{}'::jsonb) || jsonb_build_object('timeline_discovery_run_id', v_run_id)
    );
  end loop;

  for v_row in
    select *
    from admin_security_artifact_viewer_access_event_dashboard e
    where not exists (
      select 1
      from admin_security_trust_timeline_events t
      where t.source_type = 'admin_security_artifact_viewer_access_event'
        and t.source_id = e.admin_security_artifact_viewer_access_event_id
    )
    order by e.created_at asc
    limit p_batch_size
  loop
    v_event_id := record_admin_security_trust_timeline_event(
      'artifact_viewer_session',
      coalesce(v_row.viewer_session_id, v_row.admin_security_artifact_viewer_access_event_id),
      v_row.viewer_session_key,
      'viewer',
      v_row.event_type,
      v_row.status,
      'admin_security_artifact_viewer_access_event',
      v_row.admin_security_artifact_viewer_access_event_id,
      v_row.access_event_key,
      'Artifact viewer event',
      coalesce(v_row.failure_reason, v_row.event_type),
      case when v_row.requester_auth_user_id is not null then 'customer_user' else 'unknown' end,
      v_row.requester_auth_user_id,
      null,
      v_row.requester_email,
      null,
      null,
      null,
      v_row.private_room_id,
      v_row.private_room_participant_id,
      v_row.auditor_portal_id,
      v_row.auditor_participant_id,
      null,
      v_row.artifact_type,
      v_row.artifact_key,
      null,
      null,
      null,
      v_row.viewer_session_key,
      null,
      null,
      null,
      case when v_row.status = 'allowed' then 'info' else 'medium' end,
      'admin_only',
      'restricted',
      v_row.ip_address,
      v_row.user_agent,
      null,
      coalesce(v_row.metadata, '{}'::jsonb) || jsonb_build_object('timeline_discovery_run_id', v_run_id)
    );
  end loop;

  for v_row in
    select *
    from admin_security_artifact_search_query_dashboard q
    where not exists (
      select 1
      from admin_security_trust_timeline_events t
      where t.source_type = 'admin_security_artifact_search_query'
        and t.source_id = q.admin_security_artifact_search_query_id
    )
    order by q.created_at asc
    limit p_batch_size
  loop
    v_event_id := record_admin_security_trust_timeline_event(
      'artifact_search_query',
      v_row.admin_security_artifact_search_query_id,
      v_row.search_query_key,
      'search',
      'search_query',
      v_row.status,
      'admin_security_artifact_search_query',
      v_row.admin_security_artifact_search_query_id,
      v_row.search_query_key,
      'Artifact search query',
      left(v_row.query_text, 500),
      case when v_row.requester_auth_user_id is not null then 'customer_user' else 'unknown' end,
      v_row.requester_auth_user_id,
      null,
      v_row.requester_email,
      null,
      v_row.customer_name,
      v_row.customer_domain,
      v_row.private_room_id,
      v_row.private_room_participant_id,
      v_row.auditor_portal_id,
      null,
      v_row.enterprise_review_room_id,
      null,
      null,
      null,
      null,
      null,
      null,
      v_row.search_session_key,
      null,
      null,
      case when v_row.status = 'completed' then 'info' else 'medium' end,
      'admin_only',
      'restricted',
      v_row.ip_address,
      v_row.user_agent,
      null,
      coalesce(v_row.metadata, '{}'::jsonb) || jsonb_build_object(
        'result_count',
        v_row.result_count,
        'latency_ms',
        v_row.latency_ms,
        'timeline_discovery_run_id',
        v_run_id
      )
    );
  end loop;

  for v_row in
    select *
    from admin_security_evidence_answer_request_dashboard q
    where not exists (
      select 1
      from admin_security_trust_timeline_events t
      where t.source_type = 'admin_security_evidence_answer_request'
        and t.source_id = q.admin_security_evidence_answer_request_id
    )
    order by q.created_at asc
    limit p_batch_size
  loop
    v_event_id := record_admin_security_trust_timeline_event(
      'evidence_answer_request',
      v_row.admin_security_evidence_answer_request_id,
      v_row.answer_request_key,
      'answer',
      'evidence_answer_request',
      v_row.answer_status,
      'admin_security_evidence_answer_request',
      v_row.admin_security_evidence_answer_request_id,
      v_row.answer_request_key,
      'Evidence answer generated',
      left(v_row.question_text, 500),
      case when v_row.requester_auth_user_id is not null then 'customer_user' else 'unknown' end,
      v_row.requester_auth_user_id,
      null,
      v_row.requester_email,
      null,
      v_row.customer_name,
      v_row.customer_domain,
      v_row.private_room_id,
      v_row.private_room_participant_id,
      v_row.auditor_portal_id,
      null,
      v_row.enterprise_review_room_id,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      v_row.answer_session_key,
      null,
      case
        when v_row.answer_status = 'answered' and v_row.cited_chunk_count = 0 then 'critical'
        when v_row.status = 'failed' then 'high'
        else 'info'
      end,
      'admin_only',
      'restricted',
      v_row.ip_address,
      v_row.user_agent,
      null,
      coalesce(v_row.metadata, '{}'::jsonb) || jsonb_build_object(
        'confidence_score',
        v_row.confidence_score,
        'cited_chunk_count',
        v_row.cited_chunk_count,
        'timeline_discovery_run_id',
        v_run_id
      )
    );
  end loop;

  for v_row in
    select *
    from admin_security_answer_receipt_dashboard r
    where not exists (
      select 1
      from admin_security_trust_timeline_events t
      where t.source_type = 'admin_security_answer_receipt'
        and t.source_id = r.admin_security_answer_receipt_id
    )
    order by r.created_at asc
    limit p_batch_size
  loop
    v_event_id := record_admin_security_trust_timeline_event(
      'answer_receipt',
      v_row.admin_security_answer_receipt_id,
      v_row.receipt_key,
      'receipt',
      'answer_receipt',
      v_row.status,
      'admin_security_answer_receipt',
      v_row.admin_security_answer_receipt_id,
      v_row.receipt_key,
      'Answer receipt created',
      left(v_row.question_text, 500),
      case when v_row.requester_auth_user_id is not null then 'customer_user' else 'system' end,
      v_row.requester_auth_user_id,
      null,
      v_row.requester_email,
      null,
      v_row.customer_name,
      v_row.customer_domain,
      v_row.private_room_id,
      v_row.private_room_participant_id,
      v_row.auditor_portal_id,
      null,
      v_row.enterprise_review_room_id,
      null,
      null,
      v_row.receipt_key,
      null,
      null,
      null,
      null,
      v_row.answer_session_key,
      null,
      case
        when v_row.status = 'revoked' then 'high'
        when v_row.answer_status = 'answered' and v_row.cited_chunk_count = 0 then 'critical'
        else 'info'
      end,
      'admin_only',
      'restricted',
      null,
      null,
      null,
      coalesce(v_row.metadata, '{}'::jsonb) || jsonb_build_object(
        'receipt_hash_sha256',
        v_row.receipt_hash_sha256,
        'signature_algorithm',
        v_row.signature_algorithm,
        'timeline_discovery_run_id',
        v_run_id
      )
    );
  end loop;

  for v_row in
    select *
    from admin_security_answer_receipt_verification_dashboard v
    where not exists (
      select 1
      from admin_security_trust_timeline_events t
      where t.source_type = 'admin_security_answer_receipt_verification_attempt'
        and t.source_id = v.admin_security_answer_receipt_verification_attempt_id
    )
    order by v.created_at asc
    limit p_batch_size
  loop
    v_event_id := record_admin_security_trust_timeline_event(
      'answer_receipt_verification',
      v_row.admin_security_answer_receipt_verification_attempt_id,
      v_row.receipt_key,
      'verification',
      'answer_receipt_verification',
      v_row.verification_status,
      'admin_security_answer_receipt_verification_attempt',
      v_row.admin_security_answer_receipt_verification_attempt_id,
      v_row.receipt_key,
      'Answer receipt verification attempted',
      coalesce(v_row.failure_reason, v_row.verification_status),
      case when v_row.requester_auth_user_id is not null then 'customer_user' else 'anonymous' end,
      v_row.requester_auth_user_id,
      null,
      v_row.requester_email,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      v_row.receipt_key,
      null,
      null,
      null,
      null,
      null,
      v_row.verification_status,
      case when v_row.verification_status = 'verified' then 'info' else 'medium' end,
      'admin_only',
      'restricted',
      v_row.requester_ip,
      v_row.user_agent,
      null,
      coalesce(v_row.metadata, '{}'::jsonb) || jsonb_build_object(
        'hash_match',
        v_row.hash_match,
        'signature_match',
        v_row.signature_match,
        'timeline_discovery_run_id',
        v_run_id
      )
    );
  end loop;

  for v_row in
    select *
    from admin_security_answer_receipt_export_bundle_dashboard b
    where not exists (
      select 1
      from admin_security_trust_timeline_events t
      where t.source_type = 'admin_security_answer_receipt_export_bundle'
        and t.source_id = b.admin_security_answer_receipt_export_bundle_id
    )
    order by b.created_at asc
    limit p_batch_size
  loop
    v_event_id := record_admin_security_trust_timeline_event(
      'answer_receipt_export_bundle',
      v_row.admin_security_answer_receipt_export_bundle_id,
      v_row.bundle_key,
      'export',
      'answer_receipt_export_bundle',
      v_row.status,
      'admin_security_answer_receipt_export_bundle',
      v_row.admin_security_answer_receipt_export_bundle_id,
      v_row.bundle_key,
      'Answer receipt export bundle',
      v_row.title,
      'system',
      v_row.requester_auth_user_id,
      null,
      v_row.requester_email,
      null,
      v_row.customer_name,
      v_row.customer_domain,
      v_row.private_room_id,
      v_row.private_room_participant_id,
      v_row.auditor_portal_id,
      null,
      v_row.enterprise_review_room_id,
      null,
      null,
      v_row.receipt_key,
      v_row.bundle_key,
      null,
      null,
      null,
      null,
      null,
      case
        when v_row.status = 'revoked' then 'high'
        when v_row.status = 'failed' then 'medium'
        else 'info'
      end,
      'admin_only',
      'restricted',
      null,
      null,
      null,
      coalesce(v_row.metadata, '{}'::jsonb) || jsonb_build_object(
        'bundle_checksum_sha256',
        v_row.bundle_checksum_sha256,
        'timeline_discovery_run_id',
        v_run_id
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function create_admin_security_trust_timeline_snapshot(
  p_snapshot_scope text,
  p_title text,
  p_summary text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_private_room_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_start_time timestamptz default null,
  p_end_time timestamptz default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_snapshot_id uuid;
  v_snapshot_key text;
begin
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'timeline snapshot title is required';
  end if;

  v_snapshot_key := 'trust_timeline_snapshot:' || p_snapshot_scope || ':' || substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  insert into admin_security_trust_timeline_snapshots (
    snapshot_key,
    status,
    snapshot_scope,
    title,
    summary,
    customer_name,
    customer_domain,
    private_room_id,
    auditor_portal_id,
    enterprise_review_room_id,
    start_time,
    end_time,
    request_id,
    metadata
  )
  values (
    v_snapshot_key,
    'pending',
    p_snapshot_scope,
    p_title,
    p_summary,
    p_customer_name,
    p_customer_domain,
    p_private_room_id,
    p_auditor_portal_id,
    p_enterprise_review_room_id,
    p_start_time,
    p_end_time,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_snapshot_id;

  return v_snapshot_id;
end;
$$;

create or replace function build_admin_security_trust_timeline_snapshot(
  p_snapshot_id uuid,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_snapshot admin_security_trust_timeline_snapshots%rowtype;
  v_payload jsonb;
  v_hash text;
  v_bytes bigint;
  v_event_count integer;
begin
  select *
  into v_snapshot
  from admin_security_trust_timeline_snapshots
  where id = p_snapshot_id
  for update;

  if v_snapshot.id is null then
    raise exception 'timeline snapshot not found: %', p_snapshot_id;
  end if;

  if v_snapshot.status not in ('pending', 'failed') then
    raise exception 'timeline snapshot cannot build from status: %', v_snapshot.status;
  end if;

  update admin_security_trust_timeline_snapshots
  set
    status = 'building',
    updated_at = now()
  where id = v_snapshot.id;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'timelineEventKey',
          e.timeline_event_key,
          'eventFamily',
          e.event_family,
          'eventType',
          e.event_type,
          'eventAction',
          e.event_action,
          'eventTime',
          e.event_time,
          'sourceType',
          e.source_type,
          'sourceId',
          e.source_id,
          'sourceKey',
          e.source_key,
          'title',
          e.title,
          'summary',
          e.summary,
          'actorType',
          e.actor_type,
          'actorEmail',
          e.actor_email,
          'customerName',
          e.customer_name,
          'customerDomain',
          e.customer_domain,
          'privateRoomId',
          e.private_room_id,
          'artifactType',
          e.artifact_type,
          'artifactKey',
          e.artifact_key,
          'receiptKey',
          e.receipt_key,
          'bundleKey',
          e.bundle_key,
          'verificationStatus',
          e.verification_status,
          'riskLevel',
          e.risk_level,
          'immutableHashSha256',
          e.immutable_hash_sha256,
          'metadata',
          e.metadata
        )
        order by e.event_time asc
      ),
      '[]'::jsonb
    ),
    count(*)
  into v_payload, v_event_count
  from admin_security_trust_timeline_events e
  where e.status = 'active'
    and (v_snapshot.start_time is null or e.event_time >= v_snapshot.start_time)
    and (v_snapshot.end_time is null or e.event_time <= v_snapshot.end_time)
    and (
      v_snapshot.snapshot_scope = 'admin'
      or (
        v_snapshot.snapshot_scope = 'private_room'
        and e.private_room_id = v_snapshot.private_room_id
      )
      or (
        v_snapshot.snapshot_scope = 'customer'
        and e.customer_name = v_snapshot.customer_name
      )
      or (
        v_snapshot.snapshot_scope = 'auditor_portal'
        and e.auditor_portal_id = v_snapshot.auditor_portal_id
      )
      or (
        v_snapshot.snapshot_scope = 'enterprise_review_room'
        and e.enterprise_review_room_id = v_snapshot.enterprise_review_room_id
      )
      or (
        v_snapshot.snapshot_scope = 'public'
        and e.visibility = 'public'
      )
    );

  v_payload := jsonb_build_object(
    'schemaVersion',
    'trust-proof-timeline-snapshot-v1',
    'snapshotKey',
    v_snapshot.snapshot_key,
    'snapshotScope',
    v_snapshot.snapshot_scope,
    'title',
    v_snapshot.title,
    'summary',
    v_snapshot.summary,
    'customerName',
    v_snapshot.customer_name,
    'customerDomain',
    v_snapshot.customer_domain,
    'privateRoomId',
    v_snapshot.private_room_id,
    'startTime',
    v_snapshot.start_time,
    'endTime',
    v_snapshot.end_time,
    'eventCount',
    coalesce(v_event_count, 0),
    'events',
    v_payload,
    'builtAt',
    now()
  );

  v_hash := encode(digest(v_payload::text, 'sha256'), 'hex');
  v_bytes := length(v_payload::text::bytea);

  update admin_security_trust_timeline_snapshots
  set
    status = 'ready',
    event_count = coalesce(v_event_count, 0),
    snapshot_payload = v_payload,
    snapshot_hash_sha256 = v_hash,
    payload_bytes = v_bytes,
    signature_algorithm = 'HMAC-SHA256',
    signing_key_version = 'timeline-snapshot-signing-v1',
    signature = encode(digest(v_hash || ':' || snapshot_key, 'sha256'), 'hex'),
    signed_at = now(),
    storage_uri = 'trust-timeline-snapshot://' || snapshot_key || '.json',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('built_by_worker', p_worker_id),
    updated_at = now()
  where id = v_snapshot.id;

  return v_snapshot.id;
exception
  when others then
    update admin_security_trust_timeline_snapshots
    set
      status = 'failed',
      metadata = metadata || jsonb_build_object(
        'build_error',
        sqlerrm,
        'failed_at',
        now(),
        'worker_id',
        p_worker_id
      ),
      updated_at = now()
    where id = p_snapshot_id;

    raise;
end;
$$;

create or replace function expire_admin_security_trust_timeline_snapshots(
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

  update admin_security_trust_timeline_snapshots
  set
    status = 'expired',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'expired_by_worker',
      p_worker_id,
      'timeline_snapshot_expiry_run_id',
      v_run_id
    ),
    updated_at = now()
  where id in (
    select id
    from admin_security_trust_timeline_snapshots
    where status = 'ready'
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  return v_run_id;
end;
$$;

create or replace function create_private_room_trust_timeline_snapshot(
  p_auth_user_id uuid,
  p_private_room_key text,
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
  v_snapshot_id uuid;
begin
  v_participant := get_active_private_trust_room_participant(
    p_auth_user_id,
    p_private_room_key
  );

  select *
  into v_room
  from admin_security_private_trust_rooms
  where id = v_participant.private_room_id;

  v_snapshot_id := create_admin_security_trust_timeline_snapshot(
    'private_room',
    'Trust Timeline — ' || v_room.title,
    'Chronological proof timeline for this private trust room.',
    v_room.customer_name,
    v_room.customer_domain,
    v_room.id,
    null,
    v_room.enterprise_review_room_id,
    p_start_time,
    p_end_time,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'requested_by_participant_id',
      v_participant.id,
      'requested_by_email',
      v_participant.email
    )
  );

  return v_snapshot_id;
end;
$$;

create or replace view admin_security_trust_timeline_subject_dashboard as
select
  s.id as admin_security_trust_timeline_subject_id,
  s.timeline_subject_key,
  s.status,
  s.subject_type,
  s.subject_id,
  s.subject_key,
  s.title,
  s.summary,
  s.customer_name,
  s.customer_domain,
  s.private_room_id,
  r.private_room_key,
  s.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  s.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  s.visibility,
  s.sensitivity,
  s.first_event_at,
  s.last_event_at,
  s.event_count,
  s.created_at,
  s.updated_at,
  s.metadata
from admin_security_trust_timeline_subjects s
left join admin_security_private_trust_rooms r on r.id = s.private_room_id
left join admin_security_auditor_portals ap on ap.id = s.auditor_portal_id
left join admin_security_enterprise_review_rooms er on er.id = s.enterprise_review_room_id
order by s.last_event_at desc nulls last, s.created_at desc;

create or replace view admin_security_trust_timeline_event_dashboard as
select
  e.id as admin_security_trust_timeline_event_id,
  e.timeline_event_key,
  e.status,
  e.timeline_subject_id,
  s.timeline_subject_key,
  e.event_family,
  e.event_type,
  e.event_action,
  e.event_time,
  e.source_type,
  e.source_id,
  e.source_key,
  e.title,
  e.summary,
  e.actor_type,
  e.actor_auth_user_id,
  e.actor_admin_user_id,
  au.email as actor_admin_email,
  e.actor_email,
  e.actor_display_name,
  e.customer_name,
  e.customer_domain,
  e.private_room_id,
  r.private_room_key,
  e.private_room_participant_id,
  p.email as private_room_participant_email,
  e.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  e.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  e.artifact_type,
  e.artifact_key,
  e.receipt_key,
  e.bundle_key,
  e.grant_key,
  e.viewer_session_key,
  e.search_session_key,
  e.answer_session_key,
  e.verification_status,
  e.risk_level,
  e.visibility,
  e.sensitivity,
  e.immutable_hash_sha256,
  e.ip_address,
  e.user_agent,
  e.request_id,
  e.created_at,
  e.metadata
from admin_security_trust_timeline_events e
left join admin_security_trust_timeline_subjects s on s.id = e.timeline_subject_id
left join admin_users au on au.id = e.actor_admin_user_id
left join admin_security_private_trust_rooms r on r.id = e.private_room_id
left join admin_security_private_trust_room_participants p on p.id = e.private_room_participant_id
left join admin_security_auditor_portals ap on ap.id = e.auditor_portal_id
left join admin_security_enterprise_review_rooms er on er.id = e.enterprise_review_room_id
order by e.event_time desc;

create or replace view admin_security_trust_timeline_snapshot_dashboard as
select
  s.id as admin_security_trust_timeline_snapshot_id,
  s.snapshot_key,
  s.status,
  s.snapshot_scope,
  s.title,
  s.summary,
  s.customer_name,
  s.customer_domain,
  s.private_room_id,
  r.private_room_key,
  s.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  s.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  s.start_time,
  s.end_time,
  s.event_count,
  s.snapshot_hash_sha256,
  s.payload_bytes,
  s.signature_algorithm,
  s.signing_key_version,
  s.signature,
  s.signed_at,
  s.storage_uri,
  s.expires_at,
  s.created_at,
  s.updated_at,
  s.metadata
from admin_security_trust_timeline_snapshots s
left join admin_security_private_trust_rooms r on r.id = s.private_room_id
left join admin_security_auditor_portals ap on ap.id = s.auditor_portal_id
left join admin_security_enterprise_review_rooms er on er.id = s.enterprise_review_room_id
order by s.created_at desc;

create or replace view admin_security_trust_timeline_integrity as
select
  (
    select count(*)
    from admin_security_trust_timeline_events
    where status = 'active'
  ) as active_event_count,
  (
    select count(*)
    from admin_security_trust_timeline_events
    where risk_level in ('high', 'critical')
      and created_at >= now() - interval '24 hours'
  ) as high_risk_event_count_24h,
  (
    select count(*)
    from admin_security_trust_timeline_events
    where immutable_hash_sha256 is null
  ) as missing_immutable_hash_count,
  (
    select count(*)
    from admin_security_trust_timeline_subjects
    where event_count = 0
  ) as empty_subject_count,
  (
    select count(*)
    from admin_security_trust_timeline_snapshots
    where status = 'pending'
  ) as pending_snapshot_count,
  (
    select count(*)
    from admin_security_trust_timeline_snapshots
    where status = 'ready'
      and snapshot_hash_sha256 is null
  ) as ready_snapshot_missing_hash_count,
  (
    select count(*)
    from admin_security_trust_timeline_snapshots
    where status = 'failed'
      and created_at >= now() - interval '1 hour'
  ) as failed_snapshot_count_1h,
  now() as checked_at;

grant select on admin_security_trust_timeline_subject_dashboard to admin_api_role;
grant select on admin_security_trust_timeline_event_dashboard to admin_api_role;
grant select on admin_security_trust_timeline_snapshot_dashboard to admin_api_role;
grant select on admin_security_trust_timeline_integrity to admin_api_role;

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
    'admin_security_trust_timeline_discovery_every_5m',
    'Discover trust proof timeline events',
    'admin',
    true,
    '*/5 * * * *',
    'discover_admin_security_trust_timeline_events',
    '{"batch_size": 1000}'::jsonb,
    300,
    600,
    '{"priority": "high"}'::jsonb
  ),
  (
    'admin_security_trust_timeline_snapshot_expiry_every_5m',
    'Expire trust proof timeline snapshots',
    'admin',
    true,
    '*/5 * * * *',
    'expire_admin_security_trust_timeline_snapshots',
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
  elsif v_job.function_name = 'expire_admin_security_answer_receipt_export_bundles' then
    v_uuid_result := expire_admin_security_answer_receipt_export_bundles(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'discover_admin_security_trust_timeline_events' then
    v_uuid_result := discover_admin_security_trust_timeline_events(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_security_trust_timeline_snapshots' then
    v_uuid_result := expire_admin_security_trust_timeline_snapshots(
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

alter table admin_security_trust_timeline_subjects enable row level security;
alter table admin_security_trust_timeline_events enable row level security;
alter table admin_security_trust_timeline_event_links enable row level security;
alter table admin_security_trust_timeline_snapshots enable row level security;

create policy admin_security_trust_timeline_subjects_no_user_direct_access
on admin_security_trust_timeline_subjects
for all
to authenticated
using (false)
with check (false);
create policy admin_security_trust_timeline_events_no_user_direct_access
on admin_security_trust_timeline_events
for all
to authenticated
using (false)
with check (false);
create policy admin_security_trust_timeline_event_links_no_user_direct_access
on admin_security_trust_timeline_event_links
for all
to authenticated
using (false)
with check (false);
create policy admin_security_trust_timeline_snapshots_no_user_direct_access
on admin_security_trust_timeline_snapshots
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_trust_timeline_subjects
on admin_security_trust_timeline_subjects
for all
to admin_api_role
using (true)
with check (true);
create policy admin_api_all_trust_timeline_events
on admin_security_trust_timeline_events
for all
to admin_api_role
using (true)
with check (true);
create policy admin_api_all_trust_timeline_event_links
on admin_security_trust_timeline_event_links
for all
to admin_api_role
using (true)
with check (true);
create policy admin_api_all_trust_timeline_snapshots
on admin_security_trust_timeline_snapshots
for all
to admin_api_role
using (true)
with check (true);

create policy worker_all_trust_timeline_subjects
on admin_security_trust_timeline_subjects
for all
to worker_role
using (true)
with check (true);
create policy worker_all_trust_timeline_events
on admin_security_trust_timeline_events
for all
to worker_role
using (true)
with check (true);
create policy worker_all_trust_timeline_event_links
on admin_security_trust_timeline_event_links
for all
to worker_role
using (true)
with check (true);
create policy worker_all_trust_timeline_snapshots
on admin_security_trust_timeline_snapshots
for all
to worker_role
using (true)
with check (true);

grant execute on function register_admin_security_trust_timeline_subject(
  text, uuid, text, text, text, text, text, uuid, uuid, uuid, text, text, text, jsonb
) to admin_api_role, worker_role;
grant execute on function record_admin_security_trust_timeline_event(
  text, uuid, text, text, text, text, text, uuid, text, text, text, text, uuid, uuid, text, text, text, text, uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, inet, text, text, jsonb
) to admin_api_role, worker_role;
grant execute on function link_admin_security_trust_timeline_event(
  uuid, text, uuid, text, text, text, text, jsonb
) to admin_api_role, worker_role;
grant execute on function discover_admin_security_trust_timeline_events(integer, text, jsonb)
to admin_api_role, worker_role;
grant execute on function create_admin_security_trust_timeline_snapshot(
  text, text, text, text, text, uuid, uuid, uuid, timestamptz, timestamptz, text, jsonb
) to admin_api_role;
grant execute on function build_admin_security_trust_timeline_snapshot(uuid, text, jsonb)
to admin_api_role, worker_role;
grant execute on function expire_admin_security_trust_timeline_snapshots(integer, text, jsonb)
to admin_api_role, worker_role;
grant execute on function create_private_room_trust_timeline_snapshot(
  uuid, text, timestamptz, timestamptz, text, jsonb
) to admin_api_role;

alter function register_admin_security_trust_timeline_subject(
  text, uuid, text, text, text, text, text, uuid, uuid, uuid, text, text, text, jsonb
) security definer;
alter function register_admin_security_trust_timeline_subject(
  text, uuid, text, text, text, text, text, uuid, uuid, uuid, text, text, text, jsonb
) set search_path = public;
alter function discover_admin_security_trust_timeline_events(integer, text, jsonb) security definer;
alter function discover_admin_security_trust_timeline_events(integer, text, jsonb) set search_path = public;
alter function create_admin_security_trust_timeline_snapshot(
  text, text, text, text, text, uuid, uuid, uuid, timestamptz, timestamptz, text, jsonb
) security definer;
alter function create_admin_security_trust_timeline_snapshot(
  text, text, text, text, text, uuid, uuid, uuid, timestamptz, timestamptz, text, jsonb
) set search_path = public;
alter function build_admin_security_trust_timeline_snapshot(uuid, text, jsonb) security definer;
alter function build_admin_security_trust_timeline_snapshot(uuid, text, jsonb) set search_path = public;
alter function expire_admin_security_trust_timeline_snapshots(integer, text, jsonb) security definer;
alter function expire_admin_security_trust_timeline_snapshots(integer, text, jsonb) set search_path = public;
alter function create_private_room_trust_timeline_snapshot(uuid, text, timestamptz, timestamptz, text, jsonb) security definer;
alter function create_private_room_trust_timeline_snapshot(uuid, text, timestamptz, timestamptz, text, jsonb) set search_path = public;

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
    'TRUST_TIMELINE_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Trust timeline record not found.',
    'Trust timeline record not found.',
    'platform'
  ),
  (
    'TRUST_TIMELINE_INVALID_STATE',
    'validation',
    'medium',
    409,
    true,
    true,
    'Trust timeline record is not in a valid state.',
    'Trust timeline invalid state.',
    'platform'
  ),
  (
    'TRUST_TIMELINE_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Trust timeline request requires complete fields.',
    'Trust timeline required fields missing.',
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

insert into error_mapping_rules (match_pattern, error_code, priority, metadata)
values
  ('timeline subject id is required', 'TRUST_TIMELINE_REQUIRED_FIELDS', 5, '{}'),
  ('timeline subject title is required', 'TRUST_TIMELINE_REQUIRED_FIELDS', 5, '{}'),
  ('timeline event source id is required', 'TRUST_TIMELINE_REQUIRED_FIELDS', 5, '{}'),
  ('timeline event title is required', 'TRUST_TIMELINE_REQUIRED_FIELDS', 5, '{}'),
  ('timeline event id is required', 'TRUST_TIMELINE_REQUIRED_FIELDS', 5, '{}'),
  ('timeline linked type is required', 'TRUST_TIMELINE_REQUIRED_FIELDS', 5, '{}'),
  ('timeline snapshot title is required', 'TRUST_TIMELINE_REQUIRED_FIELDS', 5, '{}'),
  ('timeline snapshot not found', 'TRUST_TIMELINE_NOT_FOUND', 5, '{}'),
  ('timeline snapshot cannot build from status', 'TRUST_TIMELINE_INVALID_STATE', 5, '{}'),
  ('trust timeline events are immutable', 'TRUST_TIMELINE_INVALID_STATE', 5, '{}')
on conflict do nothing;
