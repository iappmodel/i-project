-- Step 9.56 — Build disclosure approval workflow.
-- Runs after 170_admin_security_revocation_disclosure_control.sql.

create table if not exists admin_security_disclosure_approval_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null unique,
  status text not null default 'active',
  disclosure_type text not null,
  risk_level text not null default 'medium',
  title text not null,
  description text not null,
  require_security_approval boolean not null default true,
  require_legal_approval boolean not null default false,
  require_second_admin_approval boolean not null default false,
  require_mfa boolean not null default true,
  min_required_approvals integer not null default 1,
  applies_to_source_types text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_disclosure_approval_policies_status_check
  check (status in ('active', 'disabled', 'archived')),
  constraint admin_security_disclosure_approval_policies_type_check
  check (
    disclosure_type in (
      'trust_center_publication',
      'enterprise_room_publication',
      'questionnaire_export_publication',
      'compliance_report_publication',
      'security_notice_publication',
      'revocation_disclosure',
      'document_download_access',
      'other'
    )
  ),
  constraint admin_security_disclosure_approval_policies_risk_check
  check (risk_level in ('low', 'medium', 'high', 'critical')),
  constraint admin_security_disclosure_approval_policies_min_check
  check (min_required_approvals >= 1)
);

create index if not exists admin_security_disclosure_approval_policies_status_idx
on admin_security_disclosure_approval_policies (status, disclosure_type, risk_level);

drop trigger if exists admin_security_disclosure_approval_policies_set_updated_at
on admin_security_disclosure_approval_policies;

create trigger admin_security_disclosure_approval_policies_set_updated_at
before update on admin_security_disclosure_approval_policies
for each row
execute function set_updated_at();

insert into admin_security_disclosure_approval_policies (
  policy_key,
  status,
  disclosure_type,
  risk_level,
  title,
  description,
  require_security_approval,
  require_legal_approval,
  require_second_admin_approval,
  require_mfa,
  min_required_approvals,
  applies_to_source_types,
  metadata
)
values
  (
    'trust_center_report_publication_high',
    'active',
    'trust_center_publication',
    'high',
    'Trust center report publication approval',
    'Publishing signed compliance reports to the public trust center requires security and second-admin approval.',
    true,
    false,
    true,
    true,
    2,
    array['admin_security_trust_center_report', 'admin_security_compliance_report'],
    '{}'::jsonb
  ),
  (
    'enterprise_room_document_publication_high',
    'active',
    'enterprise_room_publication',
    'high',
    'Enterprise room document disclosure approval',
    'Publishing signed reports, exports, and questionnaire responses into customer rooms requires security approval.',
    true,
    false,
    true,
    true,
    2,
    array[
      'admin_security_enterprise_review_room_document_grant',
      'admin_security_compliance_report',
      'admin_security_questionnaire_export'
    ],
    '{}'::jsonb
  ),
  (
    'security_notice_publication_critical',
    'active',
    'security_notice_publication',
    'critical',
    'Public security notice approval',
    'Public security or incident notices require security and legal approval.',
    true,
    true,
    true,
    true,
    3,
    array['admin_security_trust_center_notice'],
    '{}'::jsonb
  ),
  (
    'revocation_disclosure_high',
    'active',
    'revocation_disclosure',
    'high',
    'Public revocation disclosure approval',
    'Customer-visible revocations require security approval and MFA.',
    true,
    false,
    true,
    true,
    2,
    array[
      'admin_security_revocation_record',
      'admin_security_compliance_report',
      'admin_security_questionnaire_export'
    ],
    '{}'::jsonb
  )
on conflict (policy_key)
do update set
  status = excluded.status,
  disclosure_type = excluded.disclosure_type,
  risk_level = excluded.risk_level,
  title = excluded.title,
  description = excluded.description,
  require_security_approval = excluded.require_security_approval,
  require_legal_approval = excluded.require_legal_approval,
  require_second_admin_approval = excluded.require_second_admin_approval,
  require_mfa = excluded.require_mfa,
  min_required_approvals = excluded.min_required_approvals,
  applies_to_source_types = excluded.applies_to_source_types,
  metadata = admin_security_disclosure_approval_policies.metadata || excluded.metadata,
  updated_at = now();

create table if not exists admin_security_disclosure_approval_requests (
  id uuid primary key default gen_random_uuid(),
  approval_key text not null unique,
  status text not null default 'pending',
  disclosure_type text not null,
  risk_level text not null default 'medium',
  source_type text not null,
  source_id uuid not null,
  policy_id uuid
    references admin_security_disclosure_approval_policies(id)
    on delete set null,
  title text not null,
  summary text not null,
  requested_action text not null,
  customer_name text,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  requested_by_auth_user_id uuid not null,
  requested_by_admin_user_id uuid references admin_users(id),
  required_security_approval boolean not null default false,
  required_legal_approval boolean not null default false,
  required_second_admin_approval boolean not null default false,
  required_mfa boolean not null default true,
  min_required_approvals integer not null default 1,
  approved_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  final_decision_by_auth_user_id uuid,
  final_decision_by_admin_user_id uuid references admin_users(id),
  final_decision_note text,
  expires_at timestamptz not null default (now() + interval '14 days'),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_disclosure_approval_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  constraint admin_security_disclosure_approval_requests_type_check
  check (
    disclosure_type in (
      'trust_center_publication',
      'enterprise_room_publication',
      'questionnaire_export_publication',
      'compliance_report_publication',
      'security_notice_publication',
      'revocation_disclosure',
      'document_download_access',
      'other'
    )
  ),
  constraint admin_security_disclosure_approval_requests_risk_check
  check (risk_level in ('low', 'medium', 'high', 'critical')),
  constraint admin_security_disclosure_approval_requests_min_check
  check (min_required_approvals >= 1),
  constraint admin_security_disclosure_approval_requests_title_check
  check (length(trim(title)) > 0),
  constraint admin_security_disclosure_approval_requests_summary_check
  check (length(trim(summary)) > 0)
);

create index if not exists admin_security_disclosure_approval_requests_status_idx
on admin_security_disclosure_approval_requests (status, risk_level, created_at desc);

create index if not exists admin_security_disclosure_approval_requests_source_idx
on admin_security_disclosure_approval_requests (source_type, source_id, created_at desc);

create index if not exists admin_security_disclosure_approval_requests_room_idx
on admin_security_disclosure_approval_requests (enterprise_review_room_id, status);

drop trigger if exists admin_security_disclosure_approval_requests_set_updated_at
on admin_security_disclosure_approval_requests;

create trigger admin_security_disclosure_approval_requests_set_updated_at
before update on admin_security_disclosure_approval_requests
for each row
execute function set_updated_at();

create table if not exists admin_security_disclosure_approval_decisions (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null
    references admin_security_disclosure_approval_requests(id)
    on delete cascade,
  decision text not null,
  approval_role text not null,
  note text not null,
  decided_by_auth_user_id uuid not null,
  decided_by_admin_user_id uuid references admin_users(id),
  mfa_verified boolean not null default false,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (approval_request_id, decided_by_auth_user_id, approval_role),
  constraint admin_security_disclosure_approval_decisions_decision_check
  check (decision in ('approved', 'rejected')),
  constraint admin_security_disclosure_approval_decisions_role_check
  check (approval_role in ('security', 'legal', 'second_admin', 'owner', 'executive', 'other')),
  constraint admin_security_disclosure_approval_decisions_note_check
  check (length(trim(note)) > 0)
);

create index if not exists admin_security_disclosure_approval_decisions_request_idx
on admin_security_disclosure_approval_decisions (approval_request_id, created_at desc);

create or replace function find_admin_security_disclosure_policy(
  p_disclosure_type text,
  p_risk_level text,
  p_source_type text
)
returns admin_security_disclosure_approval_policies
language plpgsql
stable
as $$
declare
  v_policy admin_security_disclosure_approval_policies%rowtype;
begin
  select *
  into v_policy
  from admin_security_disclosure_approval_policies
  where status = 'active'
    and disclosure_type = p_disclosure_type
    and risk_level = p_risk_level
    and (
      applies_to_source_types = '{}'::text[]
      or p_source_type = any(applies_to_source_types)
    )
  order by
    case risk_level
      when 'critical' then 4
      when 'high' then 3
      when 'medium' then 2
      else 1
    end desc,
    created_at desc
  limit 1;

  if v_policy.id is null then
    select *
    into v_policy
    from admin_security_disclosure_approval_policies
    where status = 'active'
      and disclosure_type = p_disclosure_type
      and (
        applies_to_source_types = '{}'::text[]
        or p_source_type = any(applies_to_source_types)
      )
    order by
      case risk_level
        when 'critical' then 4
        when 'high' then 3
        when 'medium' then 2
        else 1
      end desc,
      created_at desc
    limit 1;
  end if;

  return v_policy;
end;
$$;

create or replace function create_admin_security_disclosure_approval_request(
  p_admin_auth_user_id uuid,
  p_disclosure_type text,
  p_risk_level text,
  p_source_type text,
  p_source_id uuid,
  p_title text,
  p_summary text,
  p_requested_action text,
  p_customer_name text default null,
  p_enterprise_review_room_id uuid default null,
  p_expires_at timestamptz default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_policy admin_security_disclosure_approval_policies%rowtype;
  v_approval_id uuid;
  v_approval_key text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_source_id is null then
    raise exception 'disclosure approval source id is required';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'disclosure approval title is required';
  end if;

  if p_summary is null or length(trim(p_summary)) = 0 then
    raise exception 'disclosure approval summary is required';
  end if;

  if p_requested_action is null or length(trim(p_requested_action)) = 0 then
    raise exception 'disclosure approval requested action is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  v_policy := find_admin_security_disclosure_policy(
    p_disclosure_type,
    coalesce(p_risk_level, 'medium'),
    p_source_type
  );

  v_approval_key :=
    'disclosure_approval:' ||
    p_disclosure_type || ':' ||
    p_source_type || ':' ||
    p_source_id::text || ':' ||
    extract(epoch from now())::bigint::text || ':' ||
    substr(encode(gen_random_bytes(4), 'hex'), 1, 8);

  insert into admin_security_disclosure_approval_requests (
    approval_key,
    status,
    disclosure_type,
    risk_level,
    source_type,
    source_id,
    policy_id,
    title,
    summary,
    requested_action,
    customer_name,
    enterprise_review_room_id,
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    required_security_approval,
    required_legal_approval,
    required_second_admin_approval,
    required_mfa,
    min_required_approvals,
    expires_at,
    request_id,
    metadata
  )
  values (
    v_approval_key,
    'pending',
    p_disclosure_type,
    coalesce(p_risk_level, 'medium'),
    p_source_type,
    p_source_id,
    v_policy.id,
    p_title,
    p_summary,
    p_requested_action,
    p_customer_name,
    p_enterprise_review_room_id,
    p_admin_auth_user_id,
    v_admin.id,
    coalesce(v_policy.require_security_approval, true),
    coalesce(v_policy.require_legal_approval, false),
    coalesce(v_policy.require_second_admin_approval, false),
    coalesce(v_policy.require_mfa, true),
    coalesce(v_policy.min_required_approvals, 1),
    coalesce(p_expires_at, now() + interval '14 days'),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_approval_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_security_disclosure_approval_request',
    'admin.write',
    'admin_security_disclosure_approval_request',
    v_approval_id,
    p_request_id,
    null,
    null,
    'allowed',
    'disclosure approval request created',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'disclosure_type',
      p_disclosure_type,
      'source_type',
      p_source_type,
      'source_id',
      p_source_id
    )
  );

  return v_approval_id;
end;
$$;

create or replace function decide_admin_security_disclosure_approval_request(
  p_admin_auth_user_id uuid,
  p_approval_request_id uuid,
  p_decision text,
  p_approval_role text,
  p_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_request admin_security_disclosure_approval_requests%rowtype;
  v_approval_count integer;
  v_security_approved boolean;
  v_legal_approved boolean;
  v_second_admin_approved boolean;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid disclosure approval decision: %', p_decision;
  end if;

  if p_approval_role not in ('security', 'legal', 'second_admin', 'owner', 'executive', 'other') then
    raise exception 'invalid disclosure approval role: %', p_approval_role;
  end if;

  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'disclosure approval decision note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_request
  from admin_security_disclosure_approval_requests
  where id = p_approval_request_id
  for update;

  if v_request.id is null then
    raise exception 'disclosure approval request not found: %', p_approval_request_id;
  end if;

  if v_request.status <> 'pending' then
    raise exception 'disclosure approval request cannot be decided from status: %', v_request.status;
  end if;

  if v_request.expires_at <= now() then
    update admin_security_disclosure_approval_requests
    set
      status = 'expired',
      updated_at = now()
    where id = v_request.id;

    raise exception 'disclosure approval request has expired';
  end if;

  if v_request.required_mfa is true then
    perform require_admin_mfa(
      p_admin_auth_user_id,
      'privileged_action',
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'action_key',
        'decide_admin_security_disclosure_approval_request',
        'approval_request_id',
        v_request.id,
        'approval_role',
        p_approval_role
      )
    );
  end if;

  if p_approval_role = 'second_admin'
    and p_admin_auth_user_id = v_request.requested_by_auth_user_id
  then
    raise exception 'second admin approval cannot be performed by requester';
  end if;

  insert into admin_security_disclosure_approval_decisions (
    approval_request_id,
    decision,
    approval_role,
    note,
    decided_by_auth_user_id,
    decided_by_admin_user_id,
    mfa_verified,
    request_id,
    metadata
  )
  values (
    v_request.id,
    p_decision,
    p_approval_role,
    p_note,
    p_admin_auth_user_id,
    v_admin.id,
    v_request.required_mfa,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (approval_request_id, decided_by_auth_user_id, approval_role)
  do update set
    decision = excluded.decision,
    note = excluded.note,
    mfa_verified = excluded.mfa_verified,
    request_id = excluded.request_id,
    metadata = admin_security_disclosure_approval_decisions.metadata || excluded.metadata;

  if p_decision = 'rejected' then
    update admin_security_disclosure_approval_requests
    set
      status = 'rejected',
      rejected_at = now(),
      final_decision_by_auth_user_id = p_admin_auth_user_id,
      final_decision_by_admin_user_id = v_admin.id,
      final_decision_note = p_note,
      updated_at = now()
    where id = v_request.id;

    return v_request.id;
  end if;

  select count(*)
  into v_approval_count
  from admin_security_disclosure_approval_decisions
  where approval_request_id = v_request.id
    and decision = 'approved';

  select exists (
    select 1 from admin_security_disclosure_approval_decisions
    where approval_request_id = v_request.id
      and decision = 'approved'
      and approval_role = 'security'
  ) into v_security_approved;

  select exists (
    select 1 from admin_security_disclosure_approval_decisions
    where approval_request_id = v_request.id
      and decision = 'approved'
      and approval_role = 'legal'
  ) into v_legal_approved;

  select exists (
    select 1 from admin_security_disclosure_approval_decisions
    where approval_request_id = v_request.id
      and decision = 'approved'
      and approval_role = 'second_admin'
      and decided_by_auth_user_id <> v_request.requested_by_auth_user_id
  ) into v_second_admin_approved;

  if v_approval_count >= v_request.min_required_approvals
    and (v_request.required_security_approval is false or v_security_approved)
    and (v_request.required_legal_approval is false or v_legal_approved)
    and (v_request.required_second_admin_approval is false or v_second_admin_approved)
  then
    update admin_security_disclosure_approval_requests
    set
      status = 'approved',
      approved_at = now(),
      final_decision_by_auth_user_id = p_admin_auth_user_id,
      final_decision_by_admin_user_id = v_admin.id,
      final_decision_note = p_note,
      updated_at = now()
    where id = v_request.id;
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'approve_admin_security_disclosure_approval_request',
    'admin.write',
    'admin_security_disclosure_approval_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_note,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'approval_role',
      p_approval_role,
      'approval_count',
      v_approval_count
    )
  );

  return v_request.id;
end;
$$;

create or replace function require_admin_security_disclosure_approval(
  p_source_type text,
  p_source_id uuid,
  p_disclosure_type text
)
returns uuid
language plpgsql
stable
as $$
declare
  v_request admin_security_disclosure_approval_requests%rowtype;
begin
  select *
  into v_request
  from admin_security_disclosure_approval_requests
  where source_type = p_source_type
    and source_id = p_source_id
    and disclosure_type = p_disclosure_type
    and status = 'approved'
    and expires_at > now()
  order by approved_at desc
  limit 1;

  if v_request.id is null then
    raise exception 'approved disclosure request required for % % %',
      p_disclosure_type,
      p_source_type,
      p_source_id;
  end if;

  return v_request.id;
end;
$$;

create or replace function publish_admin_security_enterprise_review_room(
  p_admin_auth_user_id uuid,
  p_review_room_id uuid,
  p_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_room admin_security_enterprise_review_rooms%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'review room publish note is required';
  end if;

  select *
  into v_room
  from admin_security_enterprise_review_rooms
  where id = p_review_room_id
  for update;

  if v_room.id is null then
    raise exception 'enterprise review room not found: %', p_review_room_id;
  end if;

  if v_room.status <> 'draft' then
    raise exception 'review room cannot be published from status: %', v_room.status;
  end if;

  if not exists (
    select 1
    from admin_security_enterprise_review_room_document_grants
    where review_room_id = v_room.id
      and status = 'active'
  ) then
    raise exception 'review room requires at least one active document grant before publishing';
  end if;

  perform require_admin_security_disclosure_approval(
    'admin_security_enterprise_review_room',
    v_room.id,
    'enterprise_room_publication'
  );

  update admin_security_enterprise_review_rooms
  set
    status = 'published',
    published_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'publish_note',
      p_note,
      'publish_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_room.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'publish_admin_security_enterprise_review_room',
    'admin.write',
    'admin_security_enterprise_review_room',
    v_room.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_note,
    p_metadata
  );

  return v_room.id;
end;
$$;

create or replace function publish_admin_security_questionnaire_export_to_enterprise_room(
  p_admin_auth_user_id uuid,
  p_questionnaire_export_id uuid,
  p_enterprise_review_room_id uuid,
  p_display_title text default null,
  p_display_summary text default null,
  p_allow_download boolean default true,
  p_allow_public_verification boolean default true,
  p_access_expires_at timestamptz default null,
  p_sort_order integer default 0,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_export admin_security_questionnaire_exports%rowtype;
  v_project admin_security_questionnaire_projects%rowtype;
  v_room admin_security_enterprise_review_rooms%rowtype;
  v_grant_id uuid;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  select * into v_export
  from admin_security_questionnaire_exports
  where id = p_questionnaire_export_id
  for update;

  if v_export.id is null then
    raise exception 'questionnaire export not found: %', p_questionnaire_export_id;
  end if;

  if v_export.status <> 'ready' then
    raise exception 'only ready questionnaire exports can be published to enterprise room';
  end if;

  if v_export.signature is null or v_export.signed_at is null then
    raise exception 'cannot publish unsigned questionnaire export to enterprise room';
  end if;

  if v_export.expires_at is not null and v_export.expires_at <= now() then
    raise exception 'cannot publish expired questionnaire export to enterprise room';
  end if;

  select * into v_project
  from admin_security_questionnaire_projects
  where id = v_export.questionnaire_project_id;

  if v_project.id is null then
    raise exception 'questionnaire project not found: %', v_export.questionnaire_project_id;
  end if;

  if v_project.status not in ('approved', 'exported', 'sent') then
    raise exception 'questionnaire export publication requires approved project';
  end if;

  select * into v_room
  from admin_security_enterprise_review_rooms
  where id = p_enterprise_review_room_id
  for update;

  if v_room.id is null then
    raise exception 'enterprise review room not found: %', p_enterprise_review_room_id;
  end if;

  if v_room.status not in ('draft', 'published') then
    raise exception 'cannot publish questionnaire export to enterprise room status: %', v_room.status;
  end if;

  if v_project.customer_name <> v_room.customer_name then
    raise exception 'questionnaire customer does not match enterprise review room customer';
  end if;

  perform require_admin_security_disclosure_approval(
    'admin_security_questionnaire_export',
    v_export.id,
    'enterprise_room_publication'
  );

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  insert into admin_security_enterprise_review_room_document_grants (
    review_room_id,
    status,
    document_type,
    display_title,
    display_summary,
    visibility,
    allow_download,
    allow_public_verification,
    access_starts_at,
    access_expires_at,
    sort_order,
    granted_by_auth_user_id,
    granted_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_room.id,
    'active',
    'questionnaire_response',
    coalesce(p_display_title, v_project.questionnaire_title || ' Response'),
    coalesce(p_display_summary, 'Signed security questionnaire response for ' || v_project.customer_name || '.'),
    'room_only',
    coalesce(p_allow_download, true),
    coalesce(p_allow_public_verification, true),
    now(),
    coalesce(p_access_expires_at, least(v_room.access_expires_at, coalesce(v_export.expires_at, v_room.access_expires_at))),
    coalesce(p_sort_order, 0),
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'questionnaire_export_id', v_export.id,
      'questionnaire_export_key', v_export.export_key,
      'questionnaire_project_id', v_project.id,
      'project_key', v_project.project_key
    )
  )
  returning id into v_grant_id;

  update admin_security_questionnaire_exports
  set
    published_to_enterprise_room_at = now(),
    enterprise_review_room_document_grant_id = v_grant_id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'published_to_enterprise_room_id', v_room.id,
      'enterprise_review_room_document_grant_id', v_grant_id
    ),
    updated_at = now()
  where id = v_export.id;

  update admin_security_questionnaire_projects
  set
    status = case when status in ('approved', 'exported') then 'sent' else status end,
    updated_at = now()
  where id = v_project.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'publish_admin_security_questionnaire_export_to_enterprise_room',
    'admin.write',
    'admin_security_questionnaire_export',
    v_export.id,
    p_request_id,
    null,
    null,
    'allowed',
    'signed questionnaire export published to enterprise review room',
    p_metadata || jsonb_build_object(
      'questionnaire_export_id', v_export.id,
      'enterprise_review_room_id', v_room.id,
      'document_grant_id', v_grant_id
    )
  );

  return v_grant_id;
end;
$$;

create or replace function revoke_admin_security_compliance_report(
  p_admin_auth_user_id uuid,
  p_compliance_report_request_id uuid,
  p_reason_code text,
  p_reason text,
  p_public_reason text default null,
  p_notify_customers boolean default true,
  p_notify_auditors boolean default false,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_report admin_security_compliance_report_requests%rowtype;
  v_room_id uuid;
  v_customer_name text;
  v_revocation_id uuid;
begin
  select *
  into v_report
  from admin_security_compliance_report_requests
  where id = p_compliance_report_request_id
  for update;

  if v_report.id is null then
    raise exception 'compliance report request not found: %', p_compliance_report_request_id;
  end if;

  if v_report.status = 'revoked' then
    raise exception 'compliance report is already revoked';
  end if;

  if coalesce(p_notify_customers, true) is true or p_public_reason is not null then
    perform require_admin_security_disclosure_approval(
      'admin_security_compliance_report',
      v_report.id,
      'revocation_disclosure'
    );
  end if;

  select g.review_room_id, r.customer_name
  into v_room_id, v_customer_name
  from admin_security_enterprise_review_room_document_grants g
  join admin_security_enterprise_review_rooms r
    on r.id = g.review_room_id
  where g.compliance_report_request_id = v_report.id
    and g.status = 'active'
  order by g.created_at desc
  limit 1;

  v_revocation_id := create_admin_security_revocation_record(
    p_admin_auth_user_id,
    'admin_security_compliance_report',
    v_report.id,
    'revocation',
    'high',
    p_reason_code,
    p_reason,
    p_public_reason,
    null,
    true,
    p_notify_customers,
    p_notify_auditors,
    v_customer_name,
    v_room_id,
    v_report.status,
    'revoked',
    p_request_id,
    p_metadata
  );

  update admin_security_compliance_report_requests
  set
    status = 'revoked',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'revoked_at',
      now(),
      'revocation_record_id',
      v_revocation_id,
      'revocation_reason_code',
      p_reason_code
    ),
    updated_at = now()
  where id = v_report.id;

  update admin_security_enterprise_review_room_document_grants
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoke_reason = p_reason,
    metadata = metadata || jsonb_build_object(
      'source_revocation_record_id',
      v_revocation_id
    ),
    updated_at = now()
  where compliance_report_request_id = v_report.id
    and status = 'active';

  perform queue_admin_security_revocation_notifications(
    v_revocation_id,
    p_request_id,
    p_metadata
  );

  return v_revocation_id;
end;
$$;

create or replace function revoke_admin_security_questionnaire_export(
  p_admin_auth_user_id uuid,
  p_questionnaire_export_id uuid,
  p_reason_code text,
  p_reason text,
  p_public_reason text default null,
  p_notify_customers boolean default true,
  p_notify_auditors boolean default false,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_export admin_security_questionnaire_exports%rowtype;
  v_project admin_security_questionnaire_projects%rowtype;
  v_room_id uuid;
  v_revocation_id uuid;
begin
  select *
  into v_export
  from admin_security_questionnaire_exports
  where id = p_questionnaire_export_id
  for update;

  if v_export.id is null then
    raise exception 'questionnaire export not found: %', p_questionnaire_export_id;
  end if;

  if v_export.status = 'revoked' then
    raise exception 'questionnaire export is already revoked';
  end if;

  if coalesce(p_notify_customers, true) is true or p_public_reason is not null then
    perform require_admin_security_disclosure_approval(
      'admin_security_questionnaire_export',
      v_export.id,
      'revocation_disclosure'
    );
  end if;

  select *
  into v_project
  from admin_security_questionnaire_projects
  where id = v_export.questionnaire_project_id;

  select review_room_id
  into v_room_id
  from admin_security_enterprise_review_room_document_grants
  where id = v_export.enterprise_review_room_document_grant_id;

  v_revocation_id := create_admin_security_revocation_record(
    p_admin_auth_user_id,
    'admin_security_questionnaire_export',
    v_export.id,
    'revocation',
    'high',
    p_reason_code,
    p_reason,
    p_public_reason,
    null,
    true,
    p_notify_customers,
    p_notify_auditors,
    v_project.customer_name,
    v_room_id,
    v_export.status,
    'revoked',
    p_request_id,
    p_metadata
  );

  update admin_security_questionnaire_exports
  set
    status = 'revoked',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'revoked_at',
      now(),
      'revocation_record_id',
      v_revocation_id,
      'revocation_reason_code',
      p_reason_code
    ),
    updated_at = now()
  where id = v_export.id;

  update admin_security_enterprise_review_room_document_grants
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoke_reason = p_reason,
    metadata = metadata || jsonb_build_object(
      'source_revocation_record_id',
      v_revocation_id
    ),
    updated_at = now()
  where id = v_export.enterprise_review_room_document_grant_id
    and status = 'active';

  perform queue_admin_security_revocation_notifications(
    v_revocation_id,
    p_request_id,
    p_metadata
  );

  return v_revocation_id;
end;
$$;

create or replace view admin_security_disclosure_approval_dashboard as
select
  r.id as admin_security_disclosure_approval_request_id,
  r.approval_key,
  r.status,
  r.disclosure_type,
  r.risk_level,
  r.source_type,
  r.source_id,
  r.title,
  r.summary,
  r.requested_action,
  r.customer_name,
  r.enterprise_review_room_id,
  room.room_key as enterprise_review_room_key,
  r.required_security_approval,
  r.required_legal_approval,
  r.required_second_admin_approval,
  r.required_mfa,
  r.min_required_approvals,
  requester.email as requested_by_email,
  (
    select count(*)
    from admin_security_disclosure_approval_decisions d
    where d.approval_request_id = r.id
      and d.decision = 'approved'
  ) as approval_count,
  (
    select count(*)
    from admin_security_disclosure_approval_decisions d
    where d.approval_request_id = r.id
      and d.decision = 'rejected'
  ) as rejection_count,
  exists (
    select 1
    from admin_security_disclosure_approval_decisions d
    where d.approval_request_id = r.id
      and d.decision = 'approved'
      and d.approval_role = 'security'
  ) as security_approved,
  exists (
    select 1
    from admin_security_disclosure_approval_decisions d
    where d.approval_request_id = r.id
      and d.decision = 'approved'
      and d.approval_role = 'legal'
  ) as legal_approved,
  exists (
    select 1
    from admin_security_disclosure_approval_decisions d
    where d.approval_request_id = r.id
      and d.decision = 'approved'
      and d.approval_role = 'second_admin'
      and d.decided_by_auth_user_id <> r.requested_by_auth_user_id
  ) as second_admin_approved,
  r.approved_at,
  r.rejected_at,
  r.cancelled_at,
  r.expires_at,
  r.final_decision_note,
  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_disclosure_approval_requests r
left join admin_users requester
  on requester.id = r.requested_by_admin_user_id
left join admin_security_enterprise_review_rooms room
  on room.id = r.enterprise_review_room_id
order by r.created_at desc;

create or replace view admin_security_disclosure_approval_decision_dashboard as
select
  d.id as admin_security_disclosure_approval_decision_id,
  d.approval_request_id,
  r.approval_key,
  r.disclosure_type,
  r.source_type,
  r.source_id,
  d.decision,
  d.approval_role,
  d.note,
  d.mfa_verified,
  admin.email as decided_by_email,
  d.created_at,
  d.metadata
from admin_security_disclosure_approval_decisions d
join admin_security_disclosure_approval_requests r
  on r.id = d.approval_request_id
left join admin_users admin
  on admin.id = d.decided_by_admin_user_id
order by d.created_at desc;

create or replace view admin_security_disclosure_approval_integrity as
select
  (
    select count(*)
    from admin_security_disclosure_approval_requests
    where status = 'pending'
  ) as pending_approval_count,
  (
    select count(*)
    from admin_security_disclosure_approval_requests
    where status = 'pending'
      and expires_at <= now()
  ) as expired_pending_approval_count,
  (
    select count(*)
    from admin_security_disclosure_approval_requests
    where status = 'pending'
      and risk_level in ('high', 'critical')
  ) as high_risk_pending_approval_count,
  (
    select count(*)
    from admin_security_disclosure_approval_requests r
    where r.status = 'approved'
      and r.required_second_admin_approval is true
      and not exists (
        select 1
        from admin_security_disclosure_approval_decisions d
        where d.approval_request_id = r.id
          and d.decision = 'approved'
          and d.approval_role = 'second_admin'
          and d.decided_by_auth_user_id <> r.requested_by_auth_user_id
      )
  ) as approved_missing_second_admin_count,
  (
    select count(*)
    from admin_security_disclosure_approval_requests r
    where r.status = 'approved'
      and r.required_legal_approval is true
      and not exists (
        select 1
        from admin_security_disclosure_approval_decisions d
        where d.approval_request_id = r.id
          and d.decision = 'approved'
          and d.approval_role = 'legal'
      )
  ) as approved_missing_legal_count,
  now() as checked_at;

grant select on admin_security_disclosure_approval_dashboard to admin_api_role;
grant select on admin_security_disclosure_approval_decision_dashboard to admin_api_role;
grant select on admin_security_disclosure_approval_integrity to admin_api_role;

create or replace function expire_admin_security_disclosure_approval_requests(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
begin
  update admin_security_disclosure_approval_requests
  set
    status = 'expired',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'expired_at',
      now(),
      'expire_run_id',
      v_run_id
    ),
    updated_at = now()
  where id in (
    select id
    from admin_security_disclosure_approval_requests
    where status = 'pending'
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  return v_run_id;
end;
$$;

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
values (
  'admin_security_disclosure_approval_expire_hourly',
  'Expire disclosure approval requests',
  'admin',
  true,
  '37 * * * *',
  'expire_admin_security_disclosure_approval_requests',
  '{"batch_size": 500}'::jsonb,
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
  elsif v_job.function_name = 'expire_admin_security_disclosure_approval_requests' then
    v_uuid_result := expire_admin_security_disclosure_approval_requests(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
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

alter table admin_security_disclosure_approval_policies enable row level security;
alter table admin_security_disclosure_approval_requests enable row level security;
alter table admin_security_disclosure_approval_decisions enable row level security;

drop policy if exists admin_security_disclosure_approval_policies_no_user_direct_access
on admin_security_disclosure_approval_policies;
create policy admin_security_disclosure_approval_policies_no_user_direct_access
on admin_security_disclosure_approval_policies
for all to authenticated
using (false)
with check (false);

drop policy if exists admin_security_disclosure_approval_requests_no_user_direct_access
on admin_security_disclosure_approval_requests;
create policy admin_security_disclosure_approval_requests_no_user_direct_access
on admin_security_disclosure_approval_requests
for all to authenticated
using (false)
with check (false);

drop policy if exists admin_security_disclosure_approval_decisions_no_user_direct_access
on admin_security_disclosure_approval_decisions;
create policy admin_security_disclosure_approval_decisions_no_user_direct_access
on admin_security_disclosure_approval_decisions
for all to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_disclosure_approval_policies
on admin_security_disclosure_approval_policies;
create policy admin_api_all_admin_security_disclosure_approval_policies
on admin_security_disclosure_approval_policies
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_disclosure_approval_requests
on admin_security_disclosure_approval_requests;
create policy admin_api_all_admin_security_disclosure_approval_requests
on admin_security_disclosure_approval_requests
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_disclosure_approval_decisions
on admin_security_disclosure_approval_decisions;
create policy admin_api_all_admin_security_disclosure_approval_decisions
on admin_security_disclosure_approval_decisions
for all to admin_api_role
using (true)
with check (true);

drop policy if exists worker_update_admin_security_disclosure_approval_requests
on admin_security_disclosure_approval_requests;
create policy worker_update_admin_security_disclosure_approval_requests
on admin_security_disclosure_approval_requests
for update to worker_role
using (true)
with check (true);

drop policy if exists worker_read_admin_security_disclosure_approval_requests
on admin_security_disclosure_approval_requests;
create policy worker_read_admin_security_disclosure_approval_requests
on admin_security_disclosure_approval_requests
for select to worker_role
using (true);

grant execute on function find_admin_security_disclosure_policy(text, text, text)
to admin_api_role;

grant execute on function create_admin_security_disclosure_approval_request(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  timestamptz,
  text,
  jsonb
) to admin_api_role;

grant execute on function decide_admin_security_disclosure_approval_request(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function require_admin_security_disclosure_approval(text, uuid, text)
to admin_api_role;

grant execute on function expire_admin_security_disclosure_approval_requests(integer, jsonb)
to worker_role;

alter function find_admin_security_disclosure_policy(text, text, text) security definer;
alter function find_admin_security_disclosure_policy(text, text, text) set search_path = public;

alter function create_admin_security_disclosure_approval_request(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  timestamptz,
  text,
  jsonb
) security definer;
alter function create_admin_security_disclosure_approval_request(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  timestamptz,
  text,
  jsonb
) set search_path = public;

alter function decide_admin_security_disclosure_approval_request(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) security definer;
alter function decide_admin_security_disclosure_approval_request(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function require_admin_security_disclosure_approval(text, uuid, text) security definer;
alter function require_admin_security_disclosure_approval(text, uuid, text) set search_path = public;

alter function expire_admin_security_disclosure_approval_requests(integer, jsonb) security definer;
alter function expire_admin_security_disclosure_approval_requests(integer, jsonb) set search_path = public;

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
    'DISCLOSURE_APPROVAL_REQUIRED',
    'permission',
    'high',
    403,
    false,
    true,
    'Disclosure approval is required before this action.',
    'Approved disclosure request required.',
    'platform'
  ),
  (
    'DISCLOSURE_APPROVAL_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Disclosure approval request not found.',
    'Disclosure approval request not found.',
    'platform'
  ),
  (
    'DISCLOSURE_APPROVAL_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Disclosure approval request cannot move from its current state.',
    'Disclosure approval invalid state.',
    'platform'
  ),
  (
    'DISCLOSURE_APPROVAL_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Disclosure approval request requires complete fields.',
    'Disclosure approval required fields missing.',
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
  ('approved disclosure request required', 'DISCLOSURE_APPROVAL_REQUIRED', 5, '{}'),
  ('disclosure approval request not found', 'DISCLOSURE_APPROVAL_NOT_FOUND', 5, '{}'),
  ('disclosure approval request cannot be decided from status', 'DISCLOSURE_APPROVAL_INVALID_STATE', 5, '{}'),
  ('disclosure approval request has expired', 'DISCLOSURE_APPROVAL_INVALID_STATE', 5, '{}'),
  ('second admin approval cannot be performed by requester', 'DISCLOSURE_APPROVAL_INVALID_STATE', 5, '{}'),
  ('invalid disclosure approval decision', 'DISCLOSURE_APPROVAL_REQUIRED_FIELDS', 5, '{}'),
  ('invalid disclosure approval role', 'DISCLOSURE_APPROVAL_REQUIRED_FIELDS', 5, '{}'),
  ('disclosure approval source id is required', 'DISCLOSURE_APPROVAL_REQUIRED_FIELDS', 5, '{}'),
  ('disclosure approval title is required', 'DISCLOSURE_APPROVAL_REQUIRED_FIELDS', 5, '{}'),
  ('disclosure approval summary is required', 'DISCLOSURE_APPROVAL_REQUIRED_FIELDS', 5, '{}'),
  ('disclosure approval requested action is required', 'DISCLOSURE_APPROVAL_REQUIRED_FIELDS', 5, '{}'),
  ('disclosure approval decision note is required', 'DISCLOSURE_APPROVAL_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
