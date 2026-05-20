-- Step 9.58 — Build external trust portal timeline.
-- Runs after 172_admin_security_immutable_disclosure_packages.sql.

create table if not exists admin_security_external_trust_timeline_events (
  id uuid primary key default gen_random_uuid(),

  event_key text not null unique,

  status text not null default 'published',

  visibility text not null default 'room_only',

  event_type text not null,
  event_severity text not null default 'info',

  customer_name text,
  customer_domain text,

  enterprise_review_room_id uuid
    references admin_security_enterprise_review_rooms(id)
    on delete set null,

  trust_center_scope text,

  source_type text not null,
  source_id uuid not null,

  disclosure_package_id uuid
    references admin_security_disclosure_packages(id)
    on delete set null,

  revocation_record_id uuid
    references admin_security_revocation_records(id)
    on delete set null,

  title text not null,
  summary text not null,

  public_body_markdown text,

  artifact_key text,
  artifact_type text,
  artifact_format text,

  verification_status text not null default 'not_checked',

  checksum_sha256 text,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  watermark text,

  issued_at timestamptz,
  disclosed_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,

  supersedes_event_id uuid
    references admin_security_external_trust_timeline_events(id)
    on delete set null,

  superseded_by_event_id uuid
    references admin_security_external_trust_timeline_events(id)
    on delete set null,

  sort_time timestamptz not null default now(),

  created_by_auth_user_id uuid not null,
  created_by_admin_user_id uuid references admin_users(id),

  request_id text,
  public_metadata jsonb not null default '{}'::jsonb,
  internal_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_external_trust_timeline_events_status_check
  check (
    status in (
      'draft',
      'published',
      'hidden',
      'superseded',
      'revoked',
      'archived'
    )
  ),

  constraint admin_security_external_trust_timeline_events_visibility_check
  check (
    visibility in (
      'public',
      'room_only',
      'customer_only',
      'auditor_only',
      'admin_only'
    )
  ),

  constraint admin_security_external_trust_timeline_events_type_check
  check (
    event_type in (
      'compliance_report_issued',
      'questionnaire_response_issued',
      'disclosure_package_created',
      'artifact_published_to_room',
      'artifact_published_to_trust_center',
      'artifact_verified',
      'artifact_expired',
      'artifact_revoked',
      'artifact_superseded',
      'security_notice_published',
      'trust_center_update',
      'other'
    )
  ),

  constraint admin_security_external_trust_timeline_events_severity_check
  check (
    event_severity in (
      'info',
      'notice',
      'warning',
      'critical'
    )
  ),

  constraint admin_security_external_trust_timeline_events_verification_check
  check (
    verification_status in (
      'not_checked',
      'verified',
      'failed',
      'revoked',
      'expired',
      'not_found'
    )
  ),

  constraint admin_security_external_trust_timeline_events_title_check
  check (length(trim(title)) > 0),

  constraint admin_security_external_trust_timeline_events_summary_check
  check (length(trim(summary)) > 0)
);

create index if not exists admin_security_external_trust_timeline_events_room_idx
on admin_security_external_trust_timeline_events (
  enterprise_review_room_id,
  visibility,
  sort_time desc
);

create index if not exists admin_security_external_trust_timeline_events_customer_idx
on admin_security_external_trust_timeline_events (
  customer_name,
  customer_domain,
  sort_time desc
);

create index if not exists admin_security_external_trust_timeline_events_public_idx
on admin_security_external_trust_timeline_events (
  visibility,
  status,
  sort_time desc
);

create index if not exists admin_security_external_trust_timeline_events_source_idx
on admin_security_external_trust_timeline_events (
  source_type,
  source_id,
  sort_time desc
);

create index if not exists admin_security_external_trust_timeline_events_package_idx
on admin_security_external_trust_timeline_events (
  disclosure_package_id,
  sort_time desc
);

drop trigger if exists admin_security_external_trust_timeline_events_set_updated_at
on admin_security_external_trust_timeline_events;

create trigger admin_security_external_trust_timeline_events_set_updated_at
before update on admin_security_external_trust_timeline_events
for each row
execute function set_updated_at();

create or replace view admin_security_external_trust_timeline_public as
select
  e.id as timeline_event_id,
  e.event_key,
  e.status,
  e.visibility,
  e.event_type,
  e.event_severity,
  e.customer_name,
  e.customer_domain,
  e.enterprise_review_room_id,
  r.room_key as enterprise_review_room_key,
  e.trust_center_scope,
  e.source_type,
  e.source_id,
  e.disclosure_package_id,
  p.package_key as disclosure_package_key,
  e.revocation_record_id,
  rr.revocation_key,
  e.title,
  e.summary,
  e.public_body_markdown,
  e.artifact_key,
  e.artifact_type,
  e.artifact_format,
  e.verification_status,
  e.checksum_sha256,
  e.signature_algorithm,
  e.signing_key_version,
  e.signature,
  e.watermark,
  e.issued_at,
  e.disclosed_at,
  e.revoked_at,
  e.expires_at,
  e.supersedes_event_id,
  e.superseded_by_event_id,
  e.sort_time,
  e.public_metadata,
  e.created_at
from admin_security_external_trust_timeline_events e
left join admin_security_enterprise_review_rooms r
  on r.id = e.enterprise_review_room_id
left join admin_security_disclosure_packages p
  on p.id = e.disclosure_package_id
left join admin_security_revocation_records rr
  on rr.id = e.revocation_record_id
where e.status in ('published', 'superseded', 'revoked')
  and e.visibility in ('public', 'room_only', 'customer_only', 'auditor_only');

grant select on admin_security_external_trust_timeline_public to admin_api_role;

create or replace function create_admin_security_external_trust_timeline_event(
  p_admin_auth_user_id uuid,
  p_event_type text,
  p_event_severity text,
  p_visibility text,
  p_source_type text,
  p_source_id uuid,
  p_title text,
  p_summary text,
  p_public_body_markdown text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_enterprise_review_room_id uuid default null,
  p_trust_center_scope text default null,
  p_disclosure_package_id uuid default null,
  p_revocation_record_id uuid default null,
  p_artifact_key text default null,
  p_artifact_type text default null,
  p_artifact_format text default null,
  p_verification_status text default 'not_checked',
  p_checksum_sha256 text default null,
  p_signature_algorithm text default null,
  p_signing_key_version text default null,
  p_signature text default null,
  p_watermark text default null,
  p_issued_at timestamptz default null,
  p_disclosed_at timestamptz default null,
  p_revoked_at timestamptz default null,
  p_expires_at timestamptz default null,
  p_supersedes_event_id uuid default null,
  p_sort_time timestamptz default null,
  p_request_id text default null,
  p_public_metadata jsonb default '{}'::jsonb,
  p_internal_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_event_id uuid;
  v_event_key text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_source_id is null then
    raise exception 'timeline event source id is required';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'timeline event title is required';
  end if;

  if p_summary is null or length(trim(p_summary)) = 0 then
    raise exception 'timeline event summary is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  v_event_key :=
    'trust_timeline:' ||
    p_event_type || ':' ||
    regexp_replace(coalesce(p_artifact_key, p_source_id::text), '[^a-zA-Z0-9._:-]+', '-', 'g') ||
    ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_external_trust_timeline_events (
    event_key,
    status,
    visibility,
    event_type,
    event_severity,
    customer_name,
    customer_domain,
    enterprise_review_room_id,
    trust_center_scope,
    source_type,
    source_id,
    disclosure_package_id,
    revocation_record_id,
    title,
    summary,
    public_body_markdown,
    artifact_key,
    artifact_type,
    artifact_format,
    verification_status,
    checksum_sha256,
    signature_algorithm,
    signing_key_version,
    signature,
    watermark,
    issued_at,
    disclosed_at,
    revoked_at,
    expires_at,
    supersedes_event_id,
    sort_time,
    created_by_auth_user_id,
    created_by_admin_user_id,
    request_id,
    public_metadata,
    internal_metadata
  )
  values (
    v_event_key,
    'published',
    coalesce(p_visibility, 'room_only'),
    p_event_type,
    coalesce(p_event_severity, 'info'),
    p_customer_name,
    p_customer_domain,
    p_enterprise_review_room_id,
    p_trust_center_scope,
    p_source_type,
    p_source_id,
    p_disclosure_package_id,
    p_revocation_record_id,
    p_title,
    p_summary,
    p_public_body_markdown,
    p_artifact_key,
    p_artifact_type,
    p_artifact_format,
    coalesce(p_verification_status, 'not_checked'),
    p_checksum_sha256,
    p_signature_algorithm,
    p_signing_key_version,
    p_signature,
    p_watermark,
    p_issued_at,
    p_disclosed_at,
    p_revoked_at,
    p_expires_at,
    p_supersedes_event_id,
    coalesce(p_sort_time, coalesce(p_disclosed_at, p_issued_at, p_revoked_at, now())),
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_public_metadata, '{}'::jsonb),
    coalesce(p_internal_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  if p_supersedes_event_id is not null then
    update admin_security_external_trust_timeline_events
    set
      status = case when status = 'published' then 'superseded' else status end,
      superseded_by_event_id = v_event_id,
      updated_at = now()
    where id = p_supersedes_event_id;
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_security_external_trust_timeline_event',
    'admin.write',
    'admin_security_external_trust_timeline_event',
    v_event_id,
    p_request_id,
    null,
    null,
    'allowed',
    'external trust timeline event created',
    coalesce(p_internal_metadata, '{}'::jsonb) || jsonb_build_object(
      'event_type',
      p_event_type,
      'visibility',
      p_visibility,
      'source_type',
      p_source_type,
      'source_id',
      p_source_id
    )
  );

  return v_event_id;
end;
$$;

create or replace function create_external_trust_timeline_event_from_disclosure_package(
  p_admin_auth_user_id uuid,
  p_disclosure_package_id uuid,
  p_visibility text default 'room_only',
  p_event_type text default null,
  p_event_severity text default 'info',
  p_public_body_markdown text default null,
  p_request_id text default null,
  p_public_metadata jsonb default '{}'::jsonb,
  p_internal_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_package admin_security_disclosure_packages%rowtype;
  v_event_type text;
  v_title text;
  v_summary text;
begin
  select *
  into v_package
  from admin_security_disclosure_packages
  where id = p_disclosure_package_id;

  if v_package.id is null then
    raise exception 'disclosure package not found: %', p_disclosure_package_id;
  end if;

  if v_package.status <> 'active' then
    raise exception 'only active disclosure packages can create timeline events';
  end if;

  v_event_type := coalesce(
    p_event_type,
    case
      when v_package.source_type = 'admin_security_questionnaire_export'
        then 'questionnaire_response_issued'
      when v_package.source_type = 'admin_security_compliance_report'
        then 'compliance_report_issued'
      when v_package.source_type = 'admin_security_revocation_record'
        then 'artifact_revoked'
      else 'disclosure_package_created'
    end
  );

  v_title := v_package.title;
  v_summary :=
    v_package.summary ||
    ' This item is linked to immutable disclosure package ' ||
    v_package.package_key || '.';

  return create_admin_security_external_trust_timeline_event(
    p_admin_auth_user_id,
    v_event_type,
    coalesce(p_event_severity, 'info'),
    coalesce(p_visibility, 'room_only'),
    v_package.source_type,
    v_package.source_id,
    v_title,
    v_summary,
    p_public_body_markdown,
    v_package.customer_name,
    v_package.customer_domain,
    v_package.enterprise_review_room_id,
    null,
    v_package.id,
    null,
    v_package.artifact_key,
    v_package.source_type,
    v_package.artifact_format,
    case
      when v_package.revocation_status_at_disclosure = 'revoked' then 'revoked'
      when v_package.revocation_status_at_disclosure = 'expired' then 'expired'
      else 'verified'
    end,
    v_package.checksum_sha256,
    v_package.signature_algorithm,
    v_package.signing_key_version,
    v_package.signature,
    v_package.watermark,
    v_package.signed_at,
    v_package.disclosed_at,
    null,
    v_package.expires_at,
    null,
    v_package.disclosed_at,
    p_request_id,
    coalesce(p_public_metadata, '{}'::jsonb) || jsonb_build_object(
      'packageKey',
      v_package.package_key
    ),
    coalesce(p_internal_metadata, '{}'::jsonb) || jsonb_build_object(
      'disclosure_package_id',
      v_package.id
    )
  );
end;
$$;

create or replace function create_external_trust_timeline_event_from_revocation(
  p_admin_auth_user_id uuid,
  p_revocation_record_id uuid,
  p_visibility text default 'room_only',
  p_request_id text default null,
  p_public_metadata jsonb default '{}'::jsonb,
  p_internal_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_revocation admin_security_revocation_records%rowtype;
  v_title text;
  v_summary text;
begin
  select *
  into v_revocation
  from admin_security_revocation_records
  where id = p_revocation_record_id;

  if v_revocation.id is null then
    raise exception 'revocation record not found: %', p_revocation_record_id;
  end if;

  if v_revocation.status <> 'active' then
    raise exception 'only active revocation records can create timeline events';
  end if;

  v_title :=
    case
      when v_revocation.revocation_type = 'forced_expiry'
        then 'Security artifact expired'
      else 'Security artifact revoked'
    end;

  v_summary := coalesce(
    v_revocation.public_reason,
    'A previously issued security artifact has been revoked.'
  );

  return create_admin_security_external_trust_timeline_event(
    p_admin_auth_user_id,
    case
      when v_revocation.revocation_type = 'forced_expiry'
        then 'artifact_expired'
      else 'artifact_revoked'
    end,
    case
      when v_revocation.severity = 'critical' then 'critical'
      else 'warning'
    end,
    coalesce(p_visibility, 'room_only'),
    v_revocation.source_type,
    v_revocation.source_id,
    v_title,
    v_summary,
    v_summary,
    v_revocation.affected_customer_name,
    null,
    v_revocation.affected_room_id,
    null,
    null,
    v_revocation.id,
    v_revocation.revocation_key,
    v_revocation.source_type,
    null,
    case
      when v_revocation.revocation_type = 'forced_expiry' then 'expired'
      else 'revoked'
    end,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    v_revocation.effective_at,
    null,
    null,
    v_revocation.effective_at,
    p_request_id,
    coalesce(p_public_metadata, '{}'::jsonb) || jsonb_build_object(
      'revocationKey',
      v_revocation.revocation_key,
      'reasonCode',
      v_revocation.reason_code,
      'publicReason',
      coalesce(v_revocation.public_reason, v_revocation.reason)
    ),
    coalesce(p_internal_metadata, '{}'::jsonb) || jsonb_build_object(
      'revocation_record_id',
      v_revocation.id
    )
  );
end;
$$;

create or replace function list_enterprise_review_room_timeline_for_participant(
  p_auth_user_id uuid,
  p_room_key text,
  p_limit integer default 100,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_room admin_security_enterprise_review_rooms%rowtype;
  v_participant admin_security_enterprise_review_room_participants%rowtype;
  v_items jsonb;
begin
  if p_limit <= 0 or p_limit > 250 then
    raise exception 'timeline limit must be between 1 and 250';
  end if;

  select *
  into v_room
  from admin_security_enterprise_review_rooms
  where room_key = p_room_key;

  if v_room.id is null then
    raise exception 'enterprise review room not found: %', p_room_key;
  end if;

  if v_room.status <> 'published'
    or v_room.access_starts_at > now()
    or v_room.access_expires_at <= now()
  then
    raise exception 'enterprise review room is not available';
  end if;

  select *
  into v_participant
  from admin_security_enterprise_review_room_participants
  where review_room_id = v_room.id
    and auth_user_id = p_auth_user_id
    and status = 'active';

  if v_participant.id is null then
    raise exception 'enterprise review room participant access denied';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'eventKey', e.event_key,
        'eventType', e.event_type,
        'eventSeverity', e.event_severity,
        'title', e.title,
        'summary', e.summary,
        'bodyMarkdown', e.public_body_markdown,
        'artifactKey', e.artifact_key,
        'artifactType', e.artifact_type,
        'artifactFormat', e.artifact_format,
        'verificationStatus', e.verification_status,
        'checksumSha256', e.checksum_sha256,
        'signatureAlgorithm', e.signature_algorithm,
        'signingKeyVersion', e.signing_key_version,
        'signature', e.signature,
        'watermark', e.watermark,
        'disclosurePackageKey', e.disclosure_package_key,
        'revocationKey', e.revocation_key,
        'issuedAt', e.issued_at,
        'disclosedAt', e.disclosed_at,
        'revokedAt', e.revoked_at,
        'expiresAt', e.expires_at,
        'sortTime', e.sort_time,
        'publicMetadata', e.public_metadata
      )
      order by e.sort_time desc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select *
    from admin_security_external_trust_timeline_public
    where enterprise_review_room_id = v_room.id
      and visibility in ('room_only', 'customer_only', 'auditor_only')
      and status in ('published', 'superseded', 'revoked')
    order by sort_time desc
    limit p_limit
  ) e;

  return jsonb_build_object(
    'room', jsonb_build_object(
      'roomKey', v_room.room_key,
      'customerName', v_room.customer_name,
      'customerDomain', v_room.customer_domain,
      'title', v_room.room_title
    ),
    'timeline', v_items
  );
end;
$$;

create or replace function list_public_trust_center_timeline(
  p_limit integer default 100,
  p_trust_center_scope text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_items jsonb;
begin
  if p_limit <= 0 or p_limit > 250 then
    raise exception 'timeline limit must be between 1 and 250';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'eventKey', e.event_key,
        'eventType', e.event_type,
        'eventSeverity', e.event_severity,
        'title', e.title,
        'summary', e.summary,
        'bodyMarkdown', e.public_body_markdown,
        'artifactKey', e.artifact_key,
        'artifactType', e.artifact_type,
        'artifactFormat', e.artifact_format,
        'verificationStatus', e.verification_status,
        'checksumSha256', e.checksum_sha256,
        'signatureAlgorithm', e.signature_algorithm,
        'signingKeyVersion', e.signing_key_version,
        'signature', e.signature,
        'watermark', e.watermark,
        'disclosurePackageKey', e.disclosure_package_key,
        'revocationKey', e.revocation_key,
        'issuedAt', e.issued_at,
        'disclosedAt', e.disclosed_at,
        'revokedAt', e.revoked_at,
        'expiresAt', e.expires_at,
        'sortTime', e.sort_time,
        'publicMetadata', e.public_metadata
      )
      order by e.sort_time desc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select *
    from admin_security_external_trust_timeline_public
    where visibility = 'public'
      and status in ('published', 'superseded', 'revoked')
      and (
        p_trust_center_scope is null
        or trust_center_scope = p_trust_center_scope
      )
    order by sort_time desc
    limit p_limit
  ) e;

  return jsonb_build_object(
    'timeline', v_items,
    'scope', p_trust_center_scope
  );
end;
$$;

create or replace view admin_security_external_trust_timeline_dashboard as
select
  e.id as admin_security_external_trust_timeline_event_id,
  e.event_key,
  e.status,
  e.visibility,
  e.event_type,
  e.event_severity,
  e.customer_name,
  e.customer_domain,
  e.enterprise_review_room_id,
  r.room_key as enterprise_review_room_key,
  r.room_title as enterprise_review_room_title,
  e.trust_center_scope,
  e.source_type,
  e.source_id,
  e.disclosure_package_id,
  p.package_key as disclosure_package_key,
  e.revocation_record_id,
  rr.revocation_key,
  e.title,
  e.summary,
  e.artifact_key,
  e.artifact_type,
  e.artifact_format,
  e.verification_status,
  e.checksum_sha256,
  e.signature_algorithm,
  e.signing_key_version,
  e.signature,
  e.issued_at,
  e.disclosed_at,
  e.revoked_at,
  e.expires_at,
  e.supersedes_event_id,
  e.superseded_by_event_id,
  creator.email as created_by_email,
  e.sort_time,
  e.created_at,
  e.updated_at,
  e.public_metadata,
  e.internal_metadata
from admin_security_external_trust_timeline_events e
left join admin_security_enterprise_review_rooms r
  on r.id = e.enterprise_review_room_id
left join admin_security_disclosure_packages p
  on p.id = e.disclosure_package_id
left join admin_security_revocation_records rr
  on rr.id = e.revocation_record_id
left join admin_users creator
  on creator.id = e.created_by_admin_user_id
order by e.sort_time desc;

create or replace view admin_security_external_trust_timeline_integrity as
select
  (
    select count(*)
    from admin_security_external_trust_timeline_events
    where status = 'published'
  ) as published_event_count,
  (
    select count(*)
    from admin_security_external_trust_timeline_events
    where status = 'published'
      and visibility = 'public'
  ) as public_event_count,
  (
    select count(*)
    from admin_security_external_trust_timeline_events
    where status = 'published'
      and visibility = 'room_only'
  ) as room_only_event_count,
  (
    select count(*)
    from admin_security_disclosure_packages p
    where p.status = 'active'
      and not exists (
        select 1
        from admin_security_external_trust_timeline_events e
        where e.disclosure_package_id = p.id
          and e.status in ('published', 'superseded', 'revoked')
      )
  ) as active_package_missing_timeline_event_count,
  (
    select count(*)
    from admin_security_revocation_records r
    where r.status = 'active'
      and not exists (
        select 1
        from admin_security_external_trust_timeline_events e
        where e.revocation_record_id = r.id
          and e.status in ('published', 'superseded', 'revoked')
      )
  ) as active_revocation_missing_timeline_event_count,
  (
    select count(*)
    from admin_security_external_trust_timeline_events
    where status = 'published'
      and verification_status = 'revoked'
      and event_type not in ('artifact_revoked', 'artifact_expired')
  ) as suspicious_published_revoked_status_count,
  now() as checked_at;

grant select on admin_security_external_trust_timeline_dashboard to admin_api_role;
grant select on admin_security_external_trust_timeline_integrity to admin_api_role;

alter table admin_security_external_trust_timeline_events enable row level security;

drop policy if exists admin_security_external_trust_timeline_events_no_user_direct_access
on admin_security_external_trust_timeline_events;
create policy admin_security_external_trust_timeline_events_no_user_direct_access
on admin_security_external_trust_timeline_events
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_external_trust_timeline_events
on admin_security_external_trust_timeline_events;
create policy admin_api_all_admin_security_external_trust_timeline_events
on admin_security_external_trust_timeline_events
for all
to admin_api_role
using (true)
with check (true);

grant execute on function create_admin_security_external_trust_timeline_event(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  uuid,
  timestamptz,
  text,
  jsonb,
  jsonb
) to admin_api_role;

grant execute on function create_external_trust_timeline_event_from_disclosure_package(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb
) to admin_api_role;

grant execute on function create_external_trust_timeline_event_from_revocation(
  uuid,
  uuid,
  text,
  text,
  jsonb,
  jsonb
) to admin_api_role;

grant execute on function list_enterprise_review_room_timeline_for_participant(
  uuid,
  text,
  integer,
  text,
  jsonb
) to admin_api_role;

grant execute on function list_public_trust_center_timeline(
  integer,
  text,
  text,
  jsonb
) to admin_api_role;

alter function create_admin_security_external_trust_timeline_event(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  uuid,
  timestamptz,
  text,
  jsonb,
  jsonb
) security definer;

alter function create_admin_security_external_trust_timeline_event(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  uuid,
  timestamptz,
  text,
  jsonb,
  jsonb
) set search_path = public;

alter function create_external_trust_timeline_event_from_disclosure_package(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb
) security definer;

alter function create_external_trust_timeline_event_from_disclosure_package(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb
) set search_path = public;

alter function create_external_trust_timeline_event_from_revocation(
  uuid,
  uuid,
  text,
  text,
  jsonb,
  jsonb
) security definer;

alter function create_external_trust_timeline_event_from_revocation(
  uuid,
  uuid,
  text,
  text,
  jsonb,
  jsonb
) set search_path = public;

alter function list_enterprise_review_room_timeline_for_participant(
  uuid,
  text,
  integer,
  text,
  jsonb
) security definer;

alter function list_enterprise_review_room_timeline_for_participant(
  uuid,
  text,
  integer,
  text,
  jsonb
) set search_path = public;

alter function list_public_trust_center_timeline(
  integer,
  text,
  text,
  jsonb
) security definer;

alter function list_public_trust_center_timeline(
  integer,
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
    'TRUST_TIMELINE_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Trust timeline item not found.',
    'Trust timeline item not found.',
    'platform'
  ),
  (
    'TRUST_TIMELINE_ACCESS_DENIED',
    'permission',
    'high',
    403,
    false,
    true,
    'You do not have access to this trust timeline.',
    'Trust timeline room participant access denied.',
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
  ),
  (
    'TRUST_TIMELINE_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Trust timeline item cannot move from its current state.',
    'Trust timeline invalid state.',
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
  ('timeline event source id is required', 'TRUST_TIMELINE_REQUIRED_FIELDS', 5, '{}'),
  ('timeline event title is required', 'TRUST_TIMELINE_REQUIRED_FIELDS', 5, '{}'),
  ('timeline event summary is required', 'TRUST_TIMELINE_REQUIRED_FIELDS', 5, '{}'),
  ('timeline limit must be between 1 and 250', 'TRUST_TIMELINE_REQUIRED_FIELDS', 5, '{}'),
  ('enterprise review room not found', 'TRUST_TIMELINE_NOT_FOUND', 5, '{}'),
  ('enterprise review room is not available', 'TRUST_TIMELINE_INVALID_STATE', 5, '{}'),
  ('enterprise review room participant access denied', 'TRUST_TIMELINE_ACCESS_DENIED', 5, '{}'),
  ('only active disclosure packages can create timeline events', 'TRUST_TIMELINE_INVALID_STATE', 5, '{}'),
  ('only active revocation records can create timeline events', 'TRUST_TIMELINE_INVALID_STATE', 5, '{}')
on conflict do nothing;

create or replace function admin_security_disclosure_package_auto_create_timeline_event()
returns trigger
language plpgsql
as $$
begin
  perform create_external_trust_timeline_event_from_disclosure_package(
    new.disclosed_by_auth_user_id,
    new.id,
    case
      when new.publication_target_type = 'trust_center' then 'public'
      when new.publication_target_type = 'enterprise_review_room' then 'room_only'
      else 'customer_only'
    end,
    null,
    'info',
    null,
    new.request_id,
    jsonb_build_object('autoCreated', true),
    coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object('created_by_package', true)
  );
  return new;
end;
$$;

drop trigger if exists admin_security_disclosure_packages_auto_timeline_event
on admin_security_disclosure_packages;
create trigger admin_security_disclosure_packages_auto_timeline_event
after insert on admin_security_disclosure_packages
for each row
execute function admin_security_disclosure_package_auto_create_timeline_event();

create or replace function admin_security_revocation_auto_create_timeline_event()
returns trigger
language plpgsql
as $$
begin
  perform create_external_trust_timeline_event_from_revocation(
    new.revoked_by_auth_user_id,
    new.id,
    case
      when new.revocation_type = 'forced_expiry' then 'customer_only'
      when new.notify_customers is true then 'room_only'
      else 'customer_only'
    end,
    new.request_id,
    jsonb_build_object('autoCreated', true),
    coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
      'created_by_revocation',
      case when new.revocation_type = 'forced_expiry' then false else true end,
      'created_by_force_expire',
      case when new.revocation_type = 'forced_expiry' then true else false end
    )
  );
  return new;
end;
$$;

drop trigger if exists admin_security_revocation_records_auto_timeline_event
on admin_security_revocation_records;
create trigger admin_security_revocation_records_auto_timeline_event
after insert on admin_security_revocation_records
for each row
execute function admin_security_revocation_auto_create_timeline_event();
