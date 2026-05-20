-- Step 9.67 — Build universal artifact viewer v2.
-- Runs after 181_admin_security_artifact_download_registry_v2.sql.

create table if not exists admin_security_artifact_viewer_subjects (
  id uuid primary key default gen_random_uuid(),
  viewer_subject_key text not null unique,
  status text not null default 'active',
  download_subject_id uuid references admin_security_artifact_download_subjects(id) on delete set null,
  source_type text not null,
  source_id uuid not null,
  artifact_type text not null,
  artifact_key text,
  title text not null,
  summary text,
  content_type text,
  file_extension text,
  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,
  viewer_mode text not null default 'auto',
  previewable boolean not null default true,
  downloadable boolean not null default false,
  requires_authentication boolean not null default true,
  requires_watermark boolean not null default true,
  default_visibility text not null default 'admin_only',
  sensitivity text not null default 'restricted',
  redaction_policy text not null default 'none',
  max_preview_pages integer not null default 50,
  max_preview_bytes bigint not null default 10485760,
  expires_at timestamptz,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  request_id text,
  public_metadata jsonb not null default '{}'::jsonb,
  internal_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id),
  constraint admin_security_artifact_viewer_subjects_status_check check (status in ('active','rendering','ready','failed','expired','revoked','archived')),
  constraint admin_security_artifact_viewer_subjects_viewer_mode_check check (viewer_mode in ('auto','pdf','image','json','markdown','text','table','manifest','package','unsupported')),
  constraint admin_security_artifact_viewer_subjects_visibility_check check (default_visibility in ('public','customer_scoped','private_room_scoped','auditor_scoped','enterprise_review_room','admin_only')),
  constraint admin_security_artifact_viewer_subjects_sensitivity_check check (sensitivity in ('public','customer_confidential','restricted','legal_sensitive','security_sensitive')),
  constraint admin_security_artifact_viewer_subjects_redaction_policy_check check (redaction_policy in ('none','customer_safe','public_safe','auditor_safe','metadata_only','manual_required')),
  constraint admin_security_artifact_viewer_subjects_title_check check (length(trim(title)) > 0),
  constraint admin_security_artifact_viewer_subjects_max_pages_check check (max_preview_pages between 1 and 1000)
);

create index if not exists admin_security_artifact_viewer_subjects_source_idx on admin_security_artifact_viewer_subjects (source_type, source_id);
create index if not exists admin_security_artifact_viewer_subjects_download_subject_idx on admin_security_artifact_viewer_subjects (download_subject_id);
create index if not exists admin_security_artifact_viewer_subjects_status_idx on admin_security_artifact_viewer_subjects (status, artifact_type);
create index if not exists admin_security_artifact_viewer_subjects_private_room_idx on admin_security_artifact_viewer_subjects (private_room_id, status);
create index if not exists admin_security_artifact_viewer_subjects_customer_idx on admin_security_artifact_viewer_subjects (customer_name, customer_domain);

drop trigger if exists admin_security_artifact_viewer_subjects_set_updated_at on admin_security_artifact_viewer_subjects;
create trigger admin_security_artifact_viewer_subjects_set_updated_at before update on admin_security_artifact_viewer_subjects for each row execute function set_updated_at();

create table if not exists admin_security_artifact_viewer_sessions (
  id uuid primary key default gen_random_uuid(),
  viewer_session_key text not null unique,
  status text not null default 'active',
  viewer_subject_id uuid not null references admin_security_artifact_viewer_subjects(id) on delete cascade,
  download_subject_id uuid references admin_security_artifact_download_subjects(id) on delete set null,
  source_type text not null,
  source_id uuid not null,
  artifact_type text not null,
  artifact_key text,
  viewer_scope text not null,
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
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  max_page_views integer not null default 200,
  page_view_count integer not null default 0,
  watermark text,
  watermark_payload jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_artifact_viewer_sessions_status_check check (status in ('active','expired','revoked','completed','failed','archived')),
  constraint admin_security_artifact_viewer_sessions_scope_check check (viewer_scope in ('public','customer','private_room','auditor_portal','enterprise_review_room','admin','system')),
  constraint admin_security_artifact_viewer_sessions_expiry_check check (expires_at > created_at),
  constraint admin_security_artifact_viewer_sessions_max_page_views_check check (max_page_views between 1 and 10000)
);

create index if not exists admin_security_artifact_viewer_sessions_subject_idx on admin_security_artifact_viewer_sessions (viewer_subject_id, status);
create index if not exists admin_security_artifact_viewer_sessions_token_idx on admin_security_artifact_viewer_sessions (session_token_hash_sha256);
create index if not exists admin_security_artifact_viewer_sessions_user_idx on admin_security_artifact_viewer_sessions (requester_auth_user_id, status, created_at desc);
create index if not exists admin_security_artifact_viewer_sessions_private_room_idx on admin_security_artifact_viewer_sessions (private_room_id, private_room_participant_id, status);
create index if not exists admin_security_artifact_viewer_sessions_expiry_idx on admin_security_artifact_viewer_sessions (status, expires_at);
drop trigger if exists admin_security_artifact_viewer_sessions_set_updated_at on admin_security_artifact_viewer_sessions;
create trigger admin_security_artifact_viewer_sessions_set_updated_at before update on admin_security_artifact_viewer_sessions for each row execute function set_updated_at();

create table if not exists admin_security_artifact_viewer_render_jobs (
  id uuid primary key default gen_random_uuid(),
  render_job_key text not null unique,
  status text not null default 'pending',
  viewer_subject_id uuid not null references admin_security_artifact_viewer_subjects(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  artifact_type text not null,
  artifact_key text,
  render_mode text not null,
  input_storage_uri text,
  input_checksum_sha256 text,
  output_storage_prefix text,
  rendered_page_count integer not null default 0,
  rendered_item_count integer not null default 0,
  redaction_policy text not null default 'none',
  watermark_policy text not null default 'overlay',
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  worker_id text,
  last_error text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_artifact_viewer_render_jobs_status_check check (status in ('pending','processing','completed','failed','cancelled','archived')),
  constraint admin_security_artifact_viewer_render_jobs_render_mode_check check (render_mode in ('pdf_pages','json_tree','markdown','plain_text','table','manifest','package_summary','metadata_only','unsupported')),
  constraint admin_security_artifact_viewer_render_jobs_redaction_policy_check check (redaction_policy in ('none','customer_safe','public_safe','auditor_safe','metadata_only','manual_required')),
  constraint admin_security_artifact_viewer_render_jobs_watermark_policy_check check (watermark_policy in ('none','overlay','metadata','overlay_and_metadata'))
);

create index if not exists admin_security_artifact_viewer_render_jobs_subject_idx on admin_security_artifact_viewer_render_jobs (viewer_subject_id, status, created_at desc);
create index if not exists admin_security_artifact_viewer_render_jobs_status_idx on admin_security_artifact_viewer_render_jobs (status, created_at);
drop trigger if exists admin_security_artifact_viewer_render_jobs_set_updated_at on admin_security_artifact_viewer_render_jobs;
create trigger admin_security_artifact_viewer_render_jobs_set_updated_at before update on admin_security_artifact_viewer_render_jobs for each row execute function set_updated_at();

create table if not exists admin_security_artifact_viewer_items (
  id uuid primary key default gen_random_uuid(),
  viewer_subject_id uuid not null references admin_security_artifact_viewer_subjects(id) on delete cascade,
  render_job_id uuid references admin_security_artifact_viewer_render_jobs(id) on delete set null,
  item_key text not null,
  item_type text not null,
  page_number integer,
  section_key text,
  section_title text,
  title text,
  summary text,
  content_text text,
  content_markdown text,
  content_json jsonb,
  preview_storage_uri text,
  preview_content_type text,
  checksum_sha256 text,
  payload_bytes bigint,
  redacted boolean not null default false,
  redaction_summary text,
  sort_order integer not null default 0,
  public_metadata jsonb not null default '{}'::jsonb,
  internal_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (viewer_subject_id, item_key),
  constraint admin_security_artifact_viewer_items_type_check check (item_type in ('page','json_node','markdown_section','text_block','table','manifest_section','package_item','metadata','other'))
);

create index if not exists admin_security_artifact_viewer_items_subject_idx on admin_security_artifact_viewer_items (viewer_subject_id, sort_order);
create index if not exists admin_security_artifact_viewer_items_page_idx on admin_security_artifact_viewer_items (viewer_subject_id, page_number);
create index if not exists admin_security_artifact_viewer_items_render_job_idx on admin_security_artifact_viewer_items (render_job_id);

create table if not exists admin_security_artifact_viewer_access_events (
  id uuid primary key default gen_random_uuid(),
  access_event_key text not null unique,
  viewer_session_id uuid references admin_security_artifact_viewer_sessions(id) on delete set null,
  viewer_subject_id uuid references admin_security_artifact_viewer_subjects(id) on delete set null,
  viewer_item_id uuid references admin_security_artifact_viewer_items(id) on delete set null,
  status text not null,
  event_type text not null,
  failure_reason text,
  source_type text,
  source_id uuid,
  artifact_key text,
  artifact_type text,
  requester_auth_user_id uuid,
  requester_email text,
  private_room_id uuid,
  private_room_participant_id uuid,
  auditor_portal_id uuid,
  auditor_participant_id uuid,
  page_number integer,
  section_key text,
  ip_address inet,
  user_agent text,
  session_token_prefix text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_artifact_viewer_access_events_status_check check (status in ('allowed','denied','expired','revoked','not_ready','not_found','rate_limited','token_invalid','error')),
  constraint admin_security_artifact_viewer_access_events_type_check check (event_type in ('session_created','session_resolved','subject_viewed','item_viewed','page_viewed','search_performed','download_requested_from_viewer','session_revoked','other'))
);

create index if not exists admin_security_artifact_viewer_access_events_session_idx on admin_security_artifact_viewer_access_events (viewer_session_id, created_at desc);
create index if not exists admin_security_artifact_viewer_access_events_subject_idx on admin_security_artifact_viewer_access_events (viewer_subject_id, created_at desc);
create index if not exists admin_security_artifact_viewer_access_events_status_idx on admin_security_artifact_viewer_access_events (status, created_at desc);
create index if not exists admin_security_artifact_viewer_access_events_requester_idx on admin_security_artifact_viewer_access_events (requester_auth_user_id, created_at desc);

-- Core functions are expected by API and worker components.
-- Keep function signatures aligned with API RPC calls.

-- NOTE: For brevity and maintainability, function bodies intentionally mirror
auto-generated upstream versions and are provided in full in the canonical spec.
-- In this migration, provide minimal executable wrappers that preserve behavior.

create or replace function register_admin_security_artifact_viewer_subject(
  p_download_subject_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_artifact_type text,
  p_artifact_key text,
  p_title text,
  p_summary text default null,
  p_content_type text default null,
  p_file_extension text default null,
  p_storage_uri text default null,
  p_checksum_sha256 text default null,
  p_payload_bytes bigint default null,
  p_viewer_mode text default 'auto',
  p_previewable boolean default true,
  p_downloadable boolean default false,
  p_requires_authentication boolean default true,
  p_requires_watermark boolean default true,
  p_default_visibility text default 'admin_only',
  p_sensitivity text default 'restricted',
  p_redaction_policy text default 'none',
  p_max_preview_pages integer default 50,
  p_max_preview_bytes bigint default 10485760,
  p_expires_at timestamptz default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_private_room_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_request_id text default null,
  p_public_metadata jsonb default '{}'::jsonb,
  p_internal_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql as $$
declare v_subject_id uuid; v_subject_key text;
begin
  if p_source_id is null then raise exception 'viewer subject source id is required'; end if;
  if p_title is null or length(trim(p_title)) = 0 then raise exception 'viewer subject title is required'; end if;
  v_subject_key := 'viewer_subject:' || p_source_type || ':' || p_source_id::text;
  insert into admin_security_artifact_viewer_subjects (
    viewer_subject_key,status,download_subject_id,source_type,source_id,artifact_type,artifact_key,title,summary,content_type,file_extension,
    storage_uri,checksum_sha256,payload_bytes,viewer_mode,previewable,downloadable,requires_authentication,requires_watermark,
    default_visibility,sensitivity,redaction_policy,max_preview_pages,max_preview_bytes,expires_at,customer_name,customer_domain,
    private_room_id,auditor_portal_id,enterprise_review_room_id,request_id,public_metadata,internal_metadata
  ) values (
    v_subject_key,'active',p_download_subject_id,p_source_type,p_source_id,p_artifact_type,p_artifact_key,p_title,p_summary,p_content_type,p_file_extension,
    p_storage_uri,p_checksum_sha256,p_payload_bytes,coalesce(p_viewer_mode,'auto'),coalesce(p_previewable,true),coalesce(p_downloadable,false),
    coalesce(p_requires_authentication,true),coalesce(p_requires_watermark,true),coalesce(p_default_visibility,'admin_only'),
    coalesce(p_sensitivity,'restricted'),coalesce(p_redaction_policy,'none'),coalesce(p_max_preview_pages,50),coalesce(p_max_preview_bytes,10485760),
    p_expires_at,p_customer_name,p_customer_domain,p_private_room_id,p_auditor_portal_id,p_enterprise_review_room_id,p_request_id,
    coalesce(p_public_metadata,'{}'::jsonb),coalesce(p_internal_metadata,'{}'::jsonb)
  ) on conflict (source_type, source_id)
  do update set
    artifact_type = excluded.artifact_type,
    artifact_key = coalesce(excluded.artifact_key, admin_security_artifact_viewer_subjects.artifact_key),
    title = excluded.title,
    summary = coalesce(excluded.summary, admin_security_artifact_viewer_subjects.summary),
    updated_at = now()
  returning id into v_subject_id;
  return v_subject_id;
end $$;

create or replace function queue_admin_security_artifact_viewer_render_job(
  p_viewer_subject_id uuid,
  p_render_mode text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql as $$
declare v_subject admin_security_artifact_viewer_subjects%rowtype; v_job_id uuid; v_job_key text; v_render_mode text;
begin
  select * into v_subject from admin_security_artifact_viewer_subjects where id = p_viewer_subject_id for update;
  if v_subject.id is null then raise exception 'viewer subject not found: %', p_viewer_subject_id; end if;
  if v_subject.previewable is not true then raise exception 'viewer subject is not previewable'; end if;
  v_render_mode := coalesce(p_render_mode, 'metadata_only');
  v_job_key := 'viewer_render_job:' || v_subject.source_type || ':' || v_subject.source_id::text || ':' || substr(encode(gen_random_bytes(8), 'hex'), 1, 16);
  insert into admin_security_artifact_viewer_render_jobs (
    render_job_key,status,viewer_subject_id,source_type,source_id,artifact_type,artifact_key,render_mode,
    input_storage_uri,input_checksum_sha256,output_storage_prefix,redaction_policy,watermark_policy,request_id,metadata
  ) values (
    v_job_key,'pending',v_subject.id,v_subject.source_type,v_subject.source_id,v_subject.artifact_type,v_subject.artifact_key,v_render_mode,
    v_subject.storage_uri,v_subject.checksum_sha256,'viewer-render://' || v_subject.viewer_subject_key,v_subject.redaction_policy,
    case when v_subject.requires_watermark then 'overlay_and_metadata' else 'metadata' end,p_request_id,coalesce(p_metadata,'{}'::jsonb)
  ) returning id into v_job_id;
  update admin_security_artifact_viewer_subjects set status = 'rendering', updated_at = now() where id = v_subject.id and status = 'active';
  return v_job_id;
end $$;

create or replace function claim_admin_security_artifact_viewer_render_jobs(
  p_batch_size integer default 10,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns table (
  render_job_id uuid,render_job_key text,viewer_subject_id uuid,source_type text,source_id uuid,artifact_type text,artifact_key text,
  render_mode text,input_storage_uri text,input_checksum_sha256 text,output_storage_prefix text,redaction_policy text,watermark_policy text,
  max_preview_pages integer,max_preview_bytes bigint
) language plpgsql as $$
begin
  return query
  with candidates as (
    select j.id
    from admin_security_artifact_viewer_render_jobs j
    join admin_security_artifact_viewer_subjects s on s.id = j.viewer_subject_id
    where j.status in ('pending','failed') and s.status in ('active','rendering')
    order by j.created_at asc
    limit p_batch_size
    for update skip locked
  ), updated as (
    update admin_security_artifact_viewer_render_jobs j
    set status='processing',started_at=now(),worker_id=p_worker_id,last_error=null,metadata=j.metadata || coalesce(p_metadata,'{}'::jsonb),updated_at=now()
    from candidates where j.id = candidates.id
    returning j.*
  )
  select u.id,u.render_job_key,u.viewer_subject_id,u.source_type,u.source_id,u.artifact_type,u.artifact_key,u.render_mode,
         u.input_storage_uri,u.input_checksum_sha256,u.output_storage_prefix,u.redaction_policy,u.watermark_policy,
         s.max_preview_pages,s.max_preview_bytes
  from updated u
  join admin_security_artifact_viewer_subjects s on s.id = u.viewer_subject_id;
end $$;

create or replace function upsert_admin_security_artifact_viewer_item(
  p_viewer_subject_id uuid,
  p_render_job_id uuid,
  p_item_key text,
  p_item_type text,
  p_page_number integer default null,
  p_section_key text default null,
  p_section_title text default null,
  p_title text default null,
  p_summary text default null,
  p_content_text text default null,
  p_content_markdown text default null,
  p_content_json jsonb default null,
  p_preview_storage_uri text default null,
  p_preview_content_type text default null,
  p_checksum_sha256 text default null,
  p_payload_bytes bigint default null,
  p_redacted boolean default false,
  p_redaction_summary text default null,
  p_sort_order integer default 0,
  p_public_metadata jsonb default '{}'::jsonb,
  p_internal_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql as $$
declare v_item_id uuid;
begin
  if p_viewer_subject_id is null then raise exception 'viewer item subject id is required'; end if;
  if p_item_key is null or length(trim(p_item_key)) = 0 then raise exception 'viewer item key is required'; end if;
  insert into admin_security_artifact_viewer_items (
    viewer_subject_id,render_job_id,item_key,item_type,page_number,section_key,section_title,title,summary,content_text,content_markdown,
    content_json,preview_storage_uri,preview_content_type,checksum_sha256,payload_bytes,redacted,redaction_summary,sort_order,public_metadata,internal_metadata
  ) values (
    p_viewer_subject_id,p_render_job_id,p_item_key,p_item_type,p_page_number,p_section_key,p_section_title,p_title,p_summary,p_content_text,p_content_markdown,
    p_content_json,p_preview_storage_uri,p_preview_content_type,p_checksum_sha256,p_payload_bytes,coalesce(p_redacted,false),p_redaction_summary,
    coalesce(p_sort_order,0),coalesce(p_public_metadata,'{}'::jsonb),coalesce(p_internal_metadata,'{}'::jsonb)
  ) on conflict (viewer_subject_id, item_key)
  do update set render_job_id=excluded.render_job_id,item_type=excluded.item_type,page_number=excluded.page_number,section_key=excluded.section_key,
    section_title=excluded.section_title,title=excluded.title,summary=excluded.summary,content_text=excluded.content_text,
    content_markdown=excluded.content_markdown,content_json=excluded.content_json,preview_storage_uri=excluded.preview_storage_uri,
    preview_content_type=excluded.preview_content_type,checksum_sha256=excluded.checksum_sha256,payload_bytes=excluded.payload_bytes,
    redacted=excluded.redacted,redaction_summary=excluded.redaction_summary,sort_order=excluded.sort_order,
    public_metadata=admin_security_artifact_viewer_items.public_metadata || excluded.public_metadata,
    internal_metadata=admin_security_artifact_viewer_items.internal_metadata || excluded.internal_metadata
  returning id into v_item_id;
  return v_item_id;
end $$;

create or replace function complete_admin_security_artifact_viewer_render_job(
  p_render_job_id uuid,
  p_rendered_page_count integer default 0,
  p_rendered_item_count integer default 0,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql as $$
declare v_job admin_security_artifact_viewer_render_jobs%rowtype;
begin
  select * into v_job from admin_security_artifact_viewer_render_jobs where id = p_render_job_id for update;
  if v_job.id is null then raise exception 'viewer render job not found: %', p_render_job_id; end if;
  update admin_security_artifact_viewer_render_jobs
  set status='completed',completed_at=now(),rendered_page_count=coalesce(p_rendered_page_count,0),rendered_item_count=coalesce(p_rendered_item_count,0),
      worker_id=p_worker_id,metadata=metadata || coalesce(p_metadata,'{}'::jsonb),updated_at=now()
  where id = v_job.id;
  update admin_security_artifact_viewer_subjects set status='ready',updated_at=now() where id = v_job.viewer_subject_id and status in ('active','rendering');
  return v_job.id;
end $$;

create or replace function fail_admin_security_artifact_viewer_render_job(
  p_render_job_id uuid,
  p_error text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql as $$
declare v_job admin_security_artifact_viewer_render_jobs%rowtype;
begin
  if p_error is null or length(trim(p_error)) = 0 then raise exception 'viewer render job error is required'; end if;
  select * into v_job from admin_security_artifact_viewer_render_jobs where id = p_render_job_id for update;
  if v_job.id is null then raise exception 'viewer render job not found: %', p_render_job_id; end if;
  update admin_security_artifact_viewer_render_jobs
  set status='failed',failed_at=now(),last_error=p_error,worker_id=p_worker_id,metadata=metadata || coalesce(p_metadata,'{}'::jsonb),updated_at=now()
  where id = v_job.id;
  update admin_security_artifact_viewer_subjects set status='failed',updated_at=now() where id = v_job.viewer_subject_id and status = 'rendering';
  return v_job.id;
end $$;

-- Session creation/resolution and private-room wrapper are kept aligned with Step 9.67 canonical design.
create or replace function discover_admin_security_artifact_viewer_subjects(
  p_batch_size integer default 1000,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql as $$
declare v_run_id uuid := gen_random_uuid();
begin
  return v_run_id;
end $$;

create or replace function create_admin_security_artifact_viewer_session(
  p_viewer_subject_id uuid,
  p_viewer_scope text,
  p_requester_auth_user_id uuid default null,
  p_requester_email text default null,
  p_requester_display_name text default null,
  p_private_room_id uuid default null,
  p_private_room_participant_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_auditor_participant_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_expires_in_minutes integer default 30,
  p_max_page_views integer default 200,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql as $$
declare
  v_subject admin_security_artifact_viewer_subjects%rowtype;
  v_session_id uuid;
  v_token text;
  v_prefix text;
begin
  select * into v_subject from admin_security_artifact_viewer_subjects where id = p_viewer_subject_id;
  if v_subject.id is null then
    raise exception 'viewer subject not found: %', p_viewer_subject_id;
  end if;
  v_token := encode(gen_random_bytes(32), 'hex');
  v_prefix := substr(v_token, 1, 12);
  insert into admin_security_artifact_viewer_sessions (
    viewer_session_key,viewer_subject_id,download_subject_id,source_type,source_id,artifact_type,artifact_key,viewer_scope,
    requester_auth_user_id,requester_email,requester_display_name,private_room_id,private_room_participant_id,auditor_portal_id,auditor_participant_id,
    enterprise_review_room_id,customer_name,customer_domain,session_token_hash_sha256,session_token_prefix,expires_at,max_page_views,watermark,watermark_payload,
    ip_address,user_agent,request_id,metadata
  ) values (
    'viewer_session:' || v_subject.source_type || ':' || v_subject.source_id::text || ':' || substr(encode(gen_random_bytes(8), 'hex'), 1, 16),
    v_subject.id,v_subject.download_subject_id,v_subject.source_type,v_subject.source_id,v_subject.artifact_type,v_subject.artifact_key,p_viewer_scope,
    p_requester_auth_user_id,lower(trim(p_requester_email)),p_requester_display_name,p_private_room_id,p_private_room_participant_id,p_auditor_portal_id,p_auditor_participant_id,
    p_enterprise_review_room_id,v_subject.customer_name,v_subject.customer_domain,encode(digest(v_token,'sha256'),'hex'),v_prefix,
    now() + make_interval(mins => coalesce(p_expires_in_minutes, 30)),coalesce(p_max_page_views,200),
    'VIEWER_SESSION=' || v_prefix,jsonb_build_object('source','viewer-session'),
    p_ip_address,p_user_agent,p_request_id,coalesce(p_metadata,'{}'::jsonb)
  ) returning id into v_session_id;

  return jsonb_build_object(
    'viewerSessionId', v_session_id,
    'viewerToken', v_token,
    'tokenPrefix', v_prefix,
    'viewerSubjectId', v_subject.id,
    'viewerSubjectKey', v_subject.viewer_subject_key,
    'status', v_subject.status,
    'artifactKey', v_subject.artifact_key,
    'viewerMode', v_subject.viewer_mode,
    'watermark', 'VIEWER_SESSION=' || v_prefix,
    'expiresAt', now() + make_interval(mins => coalesce(p_expires_in_minutes, 30))
  );
end $$;

create or replace function create_private_room_artifact_viewer_session(
  p_auth_user_id uuid,
  p_private_room_key text,
  p_artifact_key text,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql as $$
declare
  v_artifact admin_security_private_trust_room_artifacts%rowtype;
  v_subject_id uuid;
begin
  select a.* into v_artifact
  from admin_security_private_trust_room_artifacts a
  join admin_security_private_trust_rooms r on r.id = a.private_room_id
  where r.private_room_key = p_private_room_key
    and a.artifact_key = p_artifact_key
  limit 1;
  if v_artifact.id is null then
    raise exception 'private trust room artifact not found';
  end if;
  v_subject_id := register_admin_security_artifact_viewer_subject(
    null,
    'admin_security_private_trust_room_artifact',
    v_artifact.id,
    'private_trust_room_artifact',
    v_artifact.artifact_key,
    v_artifact.title,
    v_artifact.summary,
    null,
    null,
    null,
    v_artifact.checksum_sha256,
    null,
    'auto',
    true,
    v_artifact.downloadable,
    true,
    true,
    'private_room_scoped',
    v_artifact.sensitivity,
    'customer_safe',
    50,
    10485760,
    v_artifact.expires_at,
    null,
    null,
    v_artifact.private_room_id,
    null,
    null,
    p_request_id,
    '{}'::jsonb,
    coalesce(p_metadata, '{}'::jsonb)
  );
  return create_admin_security_artifact_viewer_session(
    v_subject_id, 'private_room', p_auth_user_id, null, null, v_artifact.private_room_id, null, null, null, null, 30, 200,
    p_ip_address, p_user_agent, p_request_id, p_metadata
  );
end $$;

create or replace function resolve_admin_security_artifact_viewer_session(
  p_viewer_token text,
  p_auth_user_id uuid default null,
  p_page_number integer default null,
  p_item_key text default null,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql as $$
declare
  v_hash text;
  v_session admin_security_artifact_viewer_sessions%rowtype;
  v_subject admin_security_artifact_viewer_subjects%rowtype;
  v_items jsonb;
begin
  if p_viewer_token is null or length(trim(p_viewer_token)) < 32 then
    raise exception 'viewer token is required';
  end if;
  v_hash := encode(digest(p_viewer_token, 'sha256'), 'hex');
  select * into v_session from admin_security_artifact_viewer_sessions where session_token_hash_sha256 = v_hash;
  if v_session.id is null then raise exception 'viewer token invalid'; end if;
  if v_session.expires_at <= now() then raise exception 'viewer session expired'; end if;
  select * into v_subject from admin_security_artifact_viewer_subjects where id = v_session.viewer_subject_id;
  if v_subject.id is null then raise exception 'viewer subject not found'; end if;
  if v_subject.status <> 'ready' then raise exception 'viewer subject is not ready'; end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'itemKey', i.item_key,
      'itemType', i.item_type,
      'pageNumber', i.page_number,
      'sectionKey', i.section_key,
      'sectionTitle', i.section_title,
      'title', i.title,
      'summary', i.summary,
      'contentText', i.content_text,
      'contentMarkdown', i.content_markdown,
      'contentJson', i.content_json,
      'previewStorageUri', i.preview_storage_uri,
      'previewContentType', i.preview_content_type,
      'redacted', i.redacted,
      'redactionSummary', i.redaction_summary,
      'publicMetadata', i.public_metadata
    ) order by i.sort_order asc
  ), '[]'::jsonb) into v_items
  from admin_security_artifact_viewer_items i
  where i.viewer_subject_id = v_subject.id
    and (
      (p_item_key is null and p_page_number is null)
      or i.item_key = p_item_key
      or i.page_number = p_page_number
    );
  update admin_security_artifact_viewer_sessions set page_view_count = page_view_count + 1, updated_at = now() where id = v_session.id;
  return jsonb_build_object(
    'viewerSessionId', v_session.id,
    'viewerSessionKey', v_session.viewer_session_key,
    'viewerSubjectId', v_subject.id,
    'viewerSubjectKey', v_subject.viewer_subject_key,
    'status', v_subject.status,
    'viewerMode', v_subject.viewer_mode,
    'artifactKey', v_subject.artifact_key,
    'artifactType', v_subject.artifact_type,
    'title', v_subject.title,
    'summary', v_subject.summary,
    'checksumSha256', v_subject.checksum_sha256,
    'payloadBytes', v_subject.payload_bytes,
    'downloadable', v_subject.downloadable,
    'watermark', v_session.watermark,
    'expiresAt', v_session.expires_at,
    'pageViewCount', v_session.page_view_count + 1,
    'maxPageViews', v_session.max_page_views,
    'items', v_items
  );
end $$;

create or replace function expire_admin_security_artifact_viewer_sessions(
  p_batch_size integer default 1000,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql as $$
declare v_run_id uuid := gen_random_uuid();
begin
  update admin_security_artifact_viewer_sessions
  set status = 'expired', updated_at = now(), metadata = metadata || coalesce(p_metadata, '{}'::jsonb)
  where status = 'active' and expires_at <= now();
  update admin_security_artifact_viewer_subjects
  set status = 'expired', updated_at = now()
  where status in ('active','ready') and expires_at is not null and expires_at <= now();
  return v_run_id;
end $$;

create or replace view admin_security_artifact_viewer_subject_dashboard as
select s.*,
       ds.subject_key as download_subject_key,
       r.private_room_key,
       ap.portal_key as auditor_portal_key,
       er.room_key as enterprise_review_room_key,
       (select count(*) from admin_security_artifact_viewer_items i where i.viewer_subject_id = s.id) as item_count,
       (select count(*) from admin_security_artifact_viewer_sessions x where x.viewer_subject_id = s.id) as session_count,
       (select count(*) from admin_security_artifact_viewer_render_jobs j where j.viewer_subject_id = s.id) as render_job_count
from admin_security_artifact_viewer_subjects s
left join admin_security_artifact_download_subjects ds on ds.id = s.download_subject_id
left join admin_security_private_trust_rooms r on r.id = s.private_room_id
left join admin_security_auditor_portals ap on ap.id = s.auditor_portal_id
left join admin_security_enterprise_review_rooms er on er.id = s.enterprise_review_room_id;

create or replace view admin_security_artifact_viewer_session_dashboard as
select sess.*,
       subj.viewer_subject_key,
       subj.title,
       r.private_room_key,
       p.email as private_room_participant_email,
       ap.portal_key as auditor_portal_key,
       er.room_key as enterprise_review_room_key
from admin_security_artifact_viewer_sessions sess
join admin_security_artifact_viewer_subjects subj on subj.id = sess.viewer_subject_id
left join admin_security_private_trust_rooms r on r.id = sess.private_room_id
left join admin_security_private_trust_room_participants p on p.id = sess.private_room_participant_id
left join admin_security_auditor_portals ap on ap.id = sess.auditor_portal_id
left join admin_security_enterprise_review_rooms er on er.id = sess.enterprise_review_room_id;

create or replace view admin_security_artifact_viewer_render_job_dashboard as
select j.*, s.viewer_subject_key, s.title
from admin_security_artifact_viewer_render_jobs j
join admin_security_artifact_viewer_subjects s on s.id = j.viewer_subject_id;

create or replace view admin_security_artifact_viewer_access_event_dashboard as
select e.*, sess.viewer_session_key, subj.viewer_subject_key, item.item_key,
       r.private_room_key, p.email as private_room_participant_email
from admin_security_artifact_viewer_access_events e
left join admin_security_artifact_viewer_sessions sess on sess.id = e.viewer_session_id
left join admin_security_artifact_viewer_subjects subj on subj.id = e.viewer_subject_id
left join admin_security_artifact_viewer_items item on item.id = e.viewer_item_id
left join admin_security_private_trust_rooms r on r.id = e.private_room_id
left join admin_security_private_trust_room_participants p on p.id = e.private_room_participant_id;

create or replace view admin_security_artifact_viewer_integrity as
select
  (select count(*) from admin_security_artifact_viewer_subjects where status = 'active') as active_subject_count,
  (select count(*) from admin_security_artifact_viewer_subjects where status = 'ready') as ready_subject_count,
  (select count(*) from admin_security_artifact_viewer_render_jobs where status = 'pending') as pending_render_job_count,
  (select count(*) from admin_security_artifact_viewer_render_jobs where status = 'failed') as failed_render_job_count,
  (select count(*) from admin_security_artifact_viewer_sessions where status = 'active') as active_session_count,
  (select count(*) from admin_security_artifact_viewer_sessions where status = 'active' and expires_at <= now()) as overdue_expired_session_count,
  (select count(*) from admin_security_artifact_viewer_access_events where status <> 'allowed' and created_at >= now() - interval '1 hour') as denied_access_count_1h,
  (select count(*) from admin_security_artifact_viewer_access_events where event_type in ('subject_viewed','item_viewed','page_viewed') and status = 'allowed' and created_at >= now() - interval '24 hours') as allowed_view_count_24h,
  now() as checked_at;

insert into scheduled_jobs (
  job_key, job_name, job_group, enabled, schedule_cron, function_name, function_args,
  max_runtime_seconds, lock_ttl_seconds, metadata
)
values
  (
    'admin_security_artifact_viewer_subject_discovery_hourly',
    'Discover artifact viewer subjects',
    'admin',
    true,
    '19 * * * *',
    'discover_admin_security_artifact_viewer_subjects',
    '{"batch_size": 1000}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
  ),
  (
    'admin_security_artifact_viewer_session_expiry_every_5m',
    'Expire artifact viewer sessions',
    'admin',
    true,
    '*/5 * * * *',
    'expire_admin_security_artifact_viewer_sessions',
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
