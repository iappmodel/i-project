-- Step 9.41 — Build policy change-control workflow.
-- Runs after 155_admin_security_governance_policy_registry.sql.

create table if not exists admin_security_policy_change_requests (
  id uuid primary key default gen_random_uuid(),

  change_key text not null unique,

  status text not null default 'draft',

  change_type text not null,

  target_policy_id uuid references admin_security_governance_policies(id),

  draft_policy_id uuid references admin_security_governance_policies(id),

  title text not null,
  rationale text not null,

  risk_level text not null default 'high',

  proposed_payload jsonb not null default '{}'::jsonb,
  diff_payload jsonb not null default '{}'::jsonb,

  requested_by_auth_user_id uuid not null,
  requested_by_admin_user_id uuid references admin_users(id),

  submitted_at timestamptz,

  approved_by_auth_user_id uuid,
  approved_by_admin_user_id uuid references admin_users(id),
  approved_at timestamptz,
  approval_note text,

  rejected_by_auth_user_id uuid,
  rejected_by_admin_user_id uuid references admin_users(id),
  rejected_at timestamptz,
  rejection_reason text,

  activated_by_auth_user_id uuid,
  activated_by_admin_user_id uuid references admin_users(id),
  activated_at timestamptz,

  archived_by_auth_user_id uuid,
  archived_by_admin_user_id uuid references admin_users(id),
  archived_at timestamptz,
  archive_reason text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_policy_change_requests_status_check
  check (
    status in (
      'draft',
      'submitted',
      'approved',
      'rejected',
      'activated',
      'superseded',
      'archived',
      'cancelled'
    )
  ),

  constraint admin_security_policy_change_requests_type_check
  check (
    change_type in (
      'create_policy',
      'update_policy',
      'supersede_policy',
      'archive_policy'
    )
  ),

  constraint admin_security_policy_change_requests_risk_check
  check (
    risk_level in (
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_policy_change_requests_title_check
  check (length(trim(title)) > 0),

  constraint admin_security_policy_change_requests_rationale_check
  check (length(trim(rationale)) > 0)
);

create index if not exists admin_security_policy_change_requests_status_idx
on admin_security_policy_change_requests (status, created_at desc);

create index if not exists admin_security_policy_change_requests_target_idx
on admin_security_policy_change_requests (target_policy_id, status);

create index if not exists admin_security_policy_change_requests_draft_idx
on admin_security_policy_change_requests (draft_policy_id, status);

drop trigger if exists admin_security_policy_change_requests_set_updated_at
on admin_security_policy_change_requests;

create trigger admin_security_policy_change_requests_set_updated_at
before update on admin_security_policy_change_requests
for each row
execute function set_updated_at();

create table if not exists admin_security_policy_change_reviews (
  id uuid primary key default gen_random_uuid(),

  admin_security_policy_change_request_id uuid not null
    references admin_security_policy_change_requests(id)
    on delete cascade,

  reviewer_auth_user_id uuid not null,
  reviewer_admin_user_id uuid references admin_users(id),

  review_status text not null,

  review_note text not null,

  reviewed_at timestamptz not null default now(),

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_policy_change_reviews_status_check
  check (
    review_status in (
      'commented',
      'approved',
      'rejected',
      'requested_changes'
    )
  ),

  constraint admin_security_policy_change_reviews_note_check
  check (length(trim(review_note)) > 0)
);

create index if not exists admin_security_policy_change_reviews_request_idx
on admin_security_policy_change_reviews (
  admin_security_policy_change_request_id,
  reviewed_at desc
);

create index if not exists admin_security_policy_change_reviews_reviewer_idx
on admin_security_policy_change_reviews (
  reviewer_auth_user_id,
  reviewed_at desc
);

create or replace function build_admin_security_policy_diff(
  p_target_policy_id uuid,
  p_draft_policy_id uuid
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_target admin_security_governance_policies%rowtype;
  v_draft admin_security_governance_policies%rowtype;
  v_target_rules jsonb := '[]'::jsonb;
  v_draft_rules jsonb := '[]'::jsonb;
begin
  if p_draft_policy_id is null then
    raise exception 'draft policy id is required';
  end if;

  if p_target_policy_id is not null then
    select *
    into v_target
    from admin_security_governance_policies
    where id = p_target_policy_id;

    select coalesce(jsonb_agg(to_jsonb(r) order by r.rule_key), '[]'::jsonb)
    into v_target_rules
    from admin_security_governance_policy_rules r
    where r.admin_security_governance_policy_id = p_target_policy_id;
  end if;

  select *
  into v_draft
  from admin_security_governance_policies
  where id = p_draft_policy_id;

  if v_draft.id is null then
    raise exception 'draft governance policy not found: %', p_draft_policy_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.rule_key), '[]'::jsonb)
  into v_draft_rules
  from admin_security_governance_policy_rules r
  where r.admin_security_governance_policy_id = p_draft_policy_id;

  return jsonb_build_object(
    'target_policy_id', p_target_policy_id,
    'draft_policy_id', p_draft_policy_id,
    'target_policy', case when p_target_policy_id is null then null else to_jsonb(v_target) end,
    'draft_policy', to_jsonb(v_draft),
    'target_rules', v_target_rules,
    'draft_rules', v_draft_rules,
    'changed_fields', jsonb_build_object(
      'policy_key_changed', case when p_target_policy_id is null then true else v_target.policy_key is distinct from v_draft.policy_key end,
      'policy_name_changed', case when p_target_policy_id is null then true else v_target.policy_name is distinct from v_draft.policy_name end,
      'category_changed', case when p_target_policy_id is null then true else v_target.category is distinct from v_draft.category end,
      'severity_changed', case when p_target_policy_id is null then true else v_target.severity is distinct from v_draft.severity end,
      'owner_team_changed', case when p_target_policy_id is null then true else v_target.owner_team is distinct from v_draft.owner_team end,
      'description_changed', case when p_target_policy_id is null then true else v_target.description is distinct from v_draft.description end,
      'rules_changed', v_target_rules is distinct from v_draft_rules
    )
  );
end;
$$;

create or replace function create_admin_security_policy_change_request(
  p_admin_auth_user_id uuid,
  p_change_type text,
  p_change_key text,
  p_title text,
  p_rationale text,
  p_target_policy_id uuid default null,
  p_policy_key text default null,
  p_policy_name text default null,
  p_category text default null,
  p_severity text default 'high',
  p_owner_team text default 'platform',
  p_description text default null,
  p_risk_level text default 'high',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_target admin_security_governance_policies%rowtype;
  v_draft_policy_id uuid;
  v_change_request_id uuid;
  v_next_version integer := 1;
  v_diff jsonb;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'create_admin_security_policy_change_request'
    )
  );

  if p_change_type not in ('create_policy', 'update_policy', 'supersede_policy', 'archive_policy') then
    raise exception 'invalid policy change type: %', p_change_type;
  end if;

  if p_change_key is null or length(trim(p_change_key)) = 0 then
    raise exception 'policy change key is required';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'policy change title is required';
  end if;

  if p_rationale is null or length(trim(p_rationale)) = 0 then
    raise exception 'policy change rationale is required';
  end if;

  if p_risk_level not in ('medium', 'high', 'critical') then
    raise exception 'invalid policy change risk level: %', p_risk_level;
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  if p_change_type in ('update_policy', 'supersede_policy', 'archive_policy') then
    if p_target_policy_id is null then
      raise exception 'target policy id is required for policy update/supersede/archive';
    end if;

    select *
    into v_target
    from admin_security_governance_policies
    where id = p_target_policy_id;

    if v_target.id is null then
      raise exception 'target governance policy not found: %', p_target_policy_id;
    end if;

    v_next_version := v_target.version + 1;
  end if;

  if p_change_type = 'archive_policy' then
    insert into admin_security_governance_policies (
      policy_key,
      policy_name,
      category,
      status,
      version,
      severity,
      owner_team,
      description,
      effective_at,
      metadata
    )
    values (
      v_target.policy_key || '_archive_draft_v' || v_next_version,
      v_target.policy_name || ' archive draft',
      v_target.category,
      'draft',
      v_next_version,
      v_target.severity,
      v_target.owner_team,
      'Archive draft for policy: ' || v_target.policy_key,
      now(),
      p_metadata || jsonb_build_object(
        'change_type',
        p_change_type,
        'target_policy_id',
        p_target_policy_id
      )
    )
    returning id into v_draft_policy_id;
  else
    if p_policy_key is null or length(trim(p_policy_key)) = 0 then
      raise exception 'draft policy key is required';
    end if;

    if p_policy_name is null or length(trim(p_policy_name)) = 0 then
      raise exception 'draft policy name is required';
    end if;

    if p_description is null or length(trim(p_description)) = 0 then
      raise exception 'draft policy description is required';
    end if;

    insert into admin_security_governance_policies (
      policy_key,
      policy_name,
      category,
      status,
      version,
      severity,
      owner_team,
      description,
      effective_at,
      metadata
    )
    values (
      p_policy_key,
      p_policy_name,
      coalesce(p_category, v_target.category),
      'draft',
      v_next_version,
      coalesce(p_severity, v_target.severity, 'high'),
      coalesce(p_owner_team, v_target.owner_team, 'platform'),
      p_description,
      now(),
      p_metadata || jsonb_build_object(
        'change_type',
        p_change_type,
        'target_policy_id',
        p_target_policy_id
      )
    )
    returning id into v_draft_policy_id;
  end if;

  v_diff := build_admin_security_policy_diff(
    p_target_policy_id,
    v_draft_policy_id
  );

  insert into admin_security_policy_change_requests (
    change_key,
    status,
    change_type,
    target_policy_id,
    draft_policy_id,
    title,
    rationale,
    risk_level,
    proposed_payload,
    diff_payload,
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    p_change_key,
    'draft',
    p_change_type,
    p_target_policy_id,
    v_draft_policy_id,
    p_title,
    p_rationale,
    p_risk_level,
    jsonb_build_object(
      'draft_policy_id',
      v_draft_policy_id,
      'target_policy_id',
      p_target_policy_id
    ),
    v_diff,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_change_request_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_security_policy_change_request',
    'admin.write',
    'admin_security_policy_change_request',
    v_change_request_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_rationale,
    p_metadata || jsonb_build_object(
      'change_type',
      p_change_type,
      'draft_policy_id',
      v_draft_policy_id,
      'target_policy_id',
      p_target_policy_id
    )
  );

  return v_change_request_id;
end;
$$;

create or replace function submit_admin_security_policy_change_request(
  p_admin_auth_user_id uuid,
  p_change_request_id uuid,
  p_note text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_security_policy_change_requests%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_request
  from admin_security_policy_change_requests
  where id = p_change_request_id
  for update;

  if v_request.id is null then
    raise exception 'admin security policy change request not found: %', p_change_request_id;
  end if;

  if v_request.status <> 'draft' then
    raise exception 'policy change request cannot be submitted from status: %', v_request.status;
  end if;

  update admin_security_policy_change_requests
  set
    status = 'submitted',
    submitted_at = now(),
    diff_payload = build_admin_security_policy_diff(target_policy_id, draft_policy_id),
    metadata = metadata || p_metadata || jsonb_build_object(
      'submit_note',
      p_note,
      'submit_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_request.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'submit_admin_security_policy_change_request',
    'admin.write',
    'admin_security_policy_change_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    coalesce(p_note, 'policy change request submitted'),
    p_metadata
  );

  return v_request.id;
end;
$$;

create or replace function review_admin_security_policy_change_request(
  p_admin_auth_user_id uuid,
  p_change_request_id uuid,
  p_review_status text,
  p_review_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_request admin_security_policy_change_requests%rowtype;
  v_review_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.read') is not true then
    raise exception 'missing required permission: admin.read';
  end if;

  if p_review_status not in ('commented', 'approved', 'rejected', 'requested_changes') then
    raise exception 'invalid policy change review status: %', p_review_status;
  end if;

  if p_review_note is null or length(trim(p_review_note)) = 0 then
    raise exception 'policy change review note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_request
  from admin_security_policy_change_requests
  where id = p_change_request_id
  for update;

  if v_request.id is null then
    raise exception 'admin security policy change request not found: %', p_change_request_id;
  end if;

  if v_request.status not in ('submitted', 'approved') then
    raise exception 'policy change request cannot be reviewed from status: %', v_request.status;
  end if;

  insert into admin_security_policy_change_reviews (
    admin_security_policy_change_request_id,
    reviewer_auth_user_id,
    reviewer_admin_user_id,
    review_status,
    review_note,
    request_id,
    metadata
  )
  values (
    v_request.id,
    p_admin_auth_user_id,
    v_admin.id,
    p_review_status,
    p_review_note,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_review_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'review_admin_security_policy_change_request',
    'admin.read',
    'admin_security_policy_change_review',
    v_review_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_review_note,
    p_metadata || jsonb_build_object(
      'change_request_id',
      v_request.id,
      'review_status',
      p_review_status
    )
  );

  return v_review_id;
end;
$$;

create or replace function approve_admin_security_policy_change_request(
  p_admin_auth_user_id uuid,
  p_change_request_id uuid,
  p_approval_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_request admin_security_policy_change_requests%rowtype;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'approve_admin_security_policy_change_request'
    )
  );

  if p_approval_note is null or length(trim(p_approval_note)) = 0 then
    raise exception 'policy change approval note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_request
  from admin_security_policy_change_requests
  where id = p_change_request_id
  for update;

  if v_request.id is null then
    raise exception 'admin security policy change request not found: %', p_change_request_id;
  end if;

  if v_request.status <> 'submitted' then
    raise exception 'policy change request cannot be approved from status: %', v_request.status;
  end if;

  if v_request.requested_by_auth_user_id = p_admin_auth_user_id then
    raise exception 'policy change request requires approval by a second admin';
  end if;

  update admin_security_policy_change_requests
  set
    status = 'approved',
    approved_by_auth_user_id = p_admin_auth_user_id,
    approved_by_admin_user_id = v_admin.id,
    approved_at = now(),
    approval_note = p_approval_note,
    diff_payload = build_admin_security_policy_diff(target_policy_id, draft_policy_id),
    metadata = metadata || p_metadata || jsonb_build_object(
      'approval_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_request.id;

  insert into admin_security_policy_change_reviews (
    admin_security_policy_change_request_id,
    reviewer_auth_user_id,
    reviewer_admin_user_id,
    review_status,
    review_note,
    request_id,
    metadata
  )
  values (
    v_request.id,
    p_admin_auth_user_id,
    v_admin.id,
    'approved',
    p_approval_note,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'approve_admin_security_policy_change_request',
    'admin.write',
    'admin_security_policy_change_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_approval_note,
    p_metadata
  );

  perform create_admin_security_alert(
    'admin_security_policy_change_approved',
    'critical',
    p_admin_auth_user_id,
    v_request.requested_by_auth_user_id,
    'approve_admin_security_policy_change_request',
    null,
    'Admin security governance policy change was approved.',
    p_metadata || jsonb_build_object(
      'admin_security_policy_change_request_id',
      v_request.id,
      'change_type',
      v_request.change_type,
      'risk_level',
      v_request.risk_level
    )
  );

  return v_request.id;
end;
$$;

create or replace function reject_admin_security_policy_change_request(
  p_admin_auth_user_id uuid,
  p_change_request_id uuid,
  p_rejection_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_request admin_security_policy_change_requests%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_rejection_reason is null or length(trim(p_rejection_reason)) = 0 then
    raise exception 'policy change rejection reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_request
  from admin_security_policy_change_requests
  where id = p_change_request_id
  for update;

  if v_request.id is null then
    raise exception 'admin security policy change request not found: %', p_change_request_id;
  end if;

  if v_request.status not in ('submitted', 'approved') then
    raise exception 'policy change request cannot be rejected from status: %', v_request.status;
  end if;

  update admin_security_policy_change_requests
  set
    status = 'rejected',
    rejected_by_auth_user_id = p_admin_auth_user_id,
    rejected_by_admin_user_id = v_admin.id,
    rejected_at = now(),
    rejection_reason = p_rejection_reason,
    metadata = metadata || p_metadata || jsonb_build_object(
      'rejection_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_request.id;

  update admin_security_governance_policies
  set
    status = 'archived',
    metadata = metadata || jsonb_build_object(
      'archived_reason',
      'draft policy rejected',
      'change_request_id',
      v_request.id
    ),
    updated_at = now()
  where id = v_request.draft_policy_id
    and status = 'draft';

  insert into admin_security_policy_change_reviews (
    admin_security_policy_change_request_id,
    reviewer_auth_user_id,
    reviewer_admin_user_id,
    review_status,
    review_note,
    request_id,
    metadata
  )
  values (
    v_request.id,
    p_admin_auth_user_id,
    v_admin.id,
    'rejected',
    p_rejection_reason,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'reject_admin_security_policy_change_request',
    'admin.write',
    'admin_security_policy_change_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_rejection_reason,
    p_metadata
  );

  return v_request.id;
end;
$$;

create or replace function activate_admin_security_policy_change_request(
  p_admin_auth_user_id uuid,
  p_change_request_id uuid,
  p_activation_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_request admin_security_policy_change_requests%rowtype;
  v_target admin_security_governance_policies%rowtype;
  v_draft admin_security_governance_policies%rowtype;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'activate_admin_security_policy_change_request'
    )
  );

  if p_activation_note is null or length(trim(p_activation_note)) = 0 then
    raise exception 'policy change activation note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_request
  from admin_security_policy_change_requests
  where id = p_change_request_id
  for update;

  if v_request.id is null then
    raise exception 'admin security policy change request not found: %', p_change_request_id;
  end if;

  if v_request.status <> 'approved' then
    raise exception 'policy change request cannot be activated from status: %', v_request.status;
  end if;

  select *
  into v_draft
  from admin_security_governance_policies
  where id = v_request.draft_policy_id
  for update;

  if v_draft.id is null then
    raise exception 'draft governance policy not found: %', v_request.draft_policy_id;
  end if;

  if v_request.target_policy_id is not null then
    select *
    into v_target
    from admin_security_governance_policies
    where id = v_request.target_policy_id
    for update;

    if v_target.id is null then
      raise exception 'target governance policy not found: %', v_request.target_policy_id;
    end if;
  end if;

  if v_request.change_type = 'create_policy' then
    update admin_security_governance_policies
    set
      status = 'active',
      effective_at = now(),
      metadata = metadata || p_metadata || jsonb_build_object(
        'activated_by_change_request_id',
        v_request.id
      ),
      updated_at = now()
    where id = v_draft.id;

  elsif v_request.change_type in ('update_policy', 'supersede_policy') then
    update admin_security_governance_policies
    set
      status = 'superseded',
      expires_at = now(),
      metadata = metadata || jsonb_build_object(
        'superseded_by_policy_id',
        v_draft.id,
        'superseded_by_change_request_id',
        v_request.id
      ),
      updated_at = now()
    where id = v_target.id;

    update admin_security_governance_policies
    set
      status = 'active',
      effective_at = now(),
      metadata = metadata || p_metadata || jsonb_build_object(
        'supersedes_policy_id',
        v_target.id,
        'activated_by_change_request_id',
        v_request.id
      ),
      updated_at = now()
    where id = v_draft.id;

  elsif v_request.change_type = 'archive_policy' then
    update admin_security_governance_policies
    set
      status = 'archived',
      expires_at = now(),
      metadata = metadata || jsonb_build_object(
        'archived_by_change_request_id',
        v_request.id,
        'archive_reason',
        p_activation_note
      ),
      updated_at = now()
    where id = v_target.id;

    update admin_security_governance_policies
    set
      status = 'archived',
      expires_at = now(),
      metadata = metadata || jsonb_build_object(
        'draft_archived_after_policy_archive',
        true,
        'change_request_id',
        v_request.id
      ),
      updated_at = now()
    where id = v_draft.id;

  else
    raise exception 'unsupported policy change type: %', v_request.change_type;
  end if;

  update admin_security_policy_change_requests
  set
    status = 'activated',
    activated_by_auth_user_id = p_admin_auth_user_id,
    activated_by_admin_user_id = v_admin.id,
    activated_at = now(),
    diff_payload = build_admin_security_policy_diff(target_policy_id, draft_policy_id),
    metadata = metadata || p_metadata || jsonb_build_object(
      'activation_note',
      p_activation_note,
      'activation_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_request.id;

  perform hash_admin_security_governance_policy(
    v_draft.id,
    p_metadata || jsonb_build_object(
      'source',
      'activate_admin_security_policy_change_request'
    )
  );

  if v_target.id is not null then
    perform hash_admin_security_governance_policy(
      v_target.id,
      p_metadata || jsonb_build_object(
        'source',
        'activate_admin_security_policy_change_request',
        'target_policy_hash',
        true
      )
    );
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'activate_admin_security_policy_change_request',
    'admin.write',
    'admin_security_policy_change_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_activation_note,
    p_metadata || jsonb_build_object(
      'change_type',
      v_request.change_type,
      'draft_policy_id',
      v_draft.id,
      'target_policy_id',
      v_target.id
    )
  );

  perform create_admin_security_alert(
    'admin_security_policy_change_activated',
    'critical',
    p_admin_auth_user_id,
    v_request.requested_by_auth_user_id,
    'activate_admin_security_policy_change_request',
    null,
    'Admin security governance policy change was activated.',
    p_metadata || jsonb_build_object(
      'admin_security_policy_change_request_id',
      v_request.id,
      'change_type',
      v_request.change_type,
      'draft_policy_id',
      v_draft.id,
      'target_policy_id',
      v_target.id
    )
  );

  return v_request.id;
end;
$$;

create or replace function cancel_admin_security_policy_change_request(
  p_admin_auth_user_id uuid,
  p_change_request_id uuid,
  p_cancel_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_security_policy_change_requests%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_cancel_reason is null or length(trim(p_cancel_reason)) = 0 then
    raise exception 'policy change cancel reason is required';
  end if;

  select *
  into v_request
  from admin_security_policy_change_requests
  where id = p_change_request_id
  for update;

  if v_request.id is null then
    raise exception 'admin security policy change request not found: %', p_change_request_id;
  end if;

  if v_request.status not in ('draft', 'submitted') then
    raise exception 'policy change request cannot be cancelled from status: %', v_request.status;
  end if;

  update admin_security_policy_change_requests
  set
    status = 'cancelled',
    metadata = metadata || p_metadata || jsonb_build_object(
      'cancel_reason',
      p_cancel_reason,
      'cancelled_by_auth_user_id',
      p_admin_auth_user_id,
      'cancel_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_request.id;

  update admin_security_governance_policies
  set
    status = 'archived',
    metadata = metadata || jsonb_build_object(
      'archived_reason',
      'policy change request cancelled',
      'change_request_id',
      v_request.id
    ),
    updated_at = now()
  where id = v_request.draft_policy_id
    and status = 'draft';

  perform record_admin_action(
    p_admin_auth_user_id,
    'cancel_admin_security_policy_change_request',
    'admin.write',
    'admin_security_policy_change_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_cancel_reason,
    p_metadata
  );

  return v_request.id;
end;
$$;

create or replace view admin_security_policy_change_request_dashboard as
select
  cr.id as admin_security_policy_change_request_id,
  cr.change_key,
  cr.status,
  cr.change_type,

  cr.target_policy_id,
  target.policy_key as target_policy_key,
  target.policy_name as target_policy_name,
  target.status as target_policy_status,
  target.version as target_policy_version,

  cr.draft_policy_id,
  draft.policy_key as draft_policy_key,
  draft.policy_name as draft_policy_name,
  draft.status as draft_policy_status,
  draft.version as draft_policy_version,

  cr.title,
  cr.rationale,
  cr.risk_level,

  cr.requested_by_auth_user_id,
  requester.email as requested_by_email,
  requester.display_name as requested_by_display_name,

  cr.submitted_at,

  cr.approved_by_auth_user_id,
  approver.email as approved_by_email,
  cr.approved_at,
  cr.approval_note,

  cr.rejected_by_auth_user_id,
  rejecter.email as rejected_by_email,
  cr.rejected_at,
  cr.rejection_reason,

  cr.activated_by_auth_user_id,
  activator.email as activated_by_email,
  cr.activated_at,

  (
    select count(*)
    from admin_security_policy_change_reviews r
    where r.admin_security_policy_change_request_id = cr.id
  ) as review_count,

  (
    select count(*)
    from admin_security_policy_change_reviews r
    where r.admin_security_policy_change_request_id = cr.id
      and r.review_status = 'approved'
  ) as approval_review_count,

  (
    select count(*)
    from admin_security_policy_change_reviews r
    where r.admin_security_policy_change_request_id = cr.id
      and r.review_status in ('rejected', 'requested_changes')
  ) as negative_review_count,

  cr.created_at,
  cr.updated_at,
  cr.metadata

from admin_security_policy_change_requests cr
left join admin_security_governance_policies target
  on target.id = cr.target_policy_id
left join admin_security_governance_policies draft
  on draft.id = cr.draft_policy_id
left join admin_users requester
  on requester.id = cr.requested_by_admin_user_id
left join admin_users approver
  on approver.id = cr.approved_by_admin_user_id
left join admin_users rejecter
  on rejecter.id = cr.rejected_by_admin_user_id
left join admin_users activator
  on activator.id = cr.activated_by_admin_user_id
order by cr.created_at desc;

create or replace view admin_security_policy_change_review_dashboard as
select
  r.id as admin_security_policy_change_review_id,
  r.admin_security_policy_change_request_id,

  cr.change_key,
  cr.status as change_request_status,
  cr.change_type,

  r.reviewer_auth_user_id,
  reviewer.email as reviewer_email,
  reviewer.display_name as reviewer_display_name,

  r.review_status,
  r.review_note,
  r.reviewed_at,

  r.created_at,
  r.metadata

from admin_security_policy_change_reviews r
join admin_security_policy_change_requests cr
  on cr.id = r.admin_security_policy_change_request_id
left join admin_users reviewer
  on reviewer.id = r.reviewer_admin_user_id
order by r.reviewed_at desc;

create or replace view admin_security_policy_change_integrity as
select
  (
    select count(*)
    from admin_security_policy_change_requests
    where status = 'draft'
  ) as draft_change_request_count,

  (
    select count(*)
    from admin_security_policy_change_requests
    where status = 'submitted'
  ) as submitted_change_request_count,

  (
    select count(*)
    from admin_security_policy_change_requests
    where status = 'approved'
  ) as approved_change_request_count,

  (
    select count(*)
    from admin_security_policy_change_requests
    where status = 'activated'
      and activated_at >= now() - interval '30 days'
  ) as activated_change_request_count_30d,

  (
    select count(*)
    from admin_security_policy_change_requests
    where risk_level = 'critical'
      and status in ('draft', 'submitted', 'approved')
  ) as open_critical_change_request_count,

  (
    select count(*)
    from admin_security_governance_policies
    where status = 'draft'
      and created_at <= now() - interval '30 days'
  ) as stale_draft_policy_count,

  now() as checked_at;

grant select on admin_security_policy_change_request_dashboard to admin_api_role;
grant select on admin_security_policy_change_review_dashboard to admin_api_role;
grant select on admin_security_policy_change_integrity to admin_api_role;

create or replace function hash_admin_security_policy_change_request(
  p_admin_security_policy_change_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_security_policy_change_requests%rowtype;
  v_reviews jsonb;
  v_payload jsonb;
begin
  select *
  into v_request
  from admin_security_policy_change_requests
  where id = p_admin_security_policy_change_request_id;

  if v_request.id is null then
    raise exception 'admin security policy change request not found: %', p_admin_security_policy_change_request_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.reviewed_at asc), '[]'::jsonb)
  into v_reviews
  from admin_security_policy_change_reviews r
  where r.admin_security_policy_change_request_id = v_request.id;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_policy_change_request',
    'source_id', v_request.id,
    'change_key', v_request.change_key,
    'status', v_request.status,
    'change_type', v_request.change_type,
    'target_policy_id', v_request.target_policy_id,
    'draft_policy_id', v_request.draft_policy_id,
    'title', v_request.title,
    'rationale', v_request.rationale,
    'risk_level', v_request.risk_level,
    'requested_by_auth_user_id', v_request.requested_by_auth_user_id,
    'approved_by_auth_user_id', v_request.approved_by_auth_user_id,
    'rejected_by_auth_user_id', v_request.rejected_by_auth_user_id,
    'activated_by_auth_user_id', v_request.activated_by_auth_user_id,
    'submitted_at', v_request.submitted_at,
    'approved_at', v_request.approved_at,
    'rejected_at', v_request.rejected_at,
    'activated_at', v_request.activated_at,
    'reviews', v_reviews,
    'created_at', v_request.created_at,
    'updated_at', v_request.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_policy_change_request',
    v_request.id,
    v_payload,
    'global_audit_chain',
    p_metadata
  );
end;
$$;

create or replace view audit_hash_missing_records as
select
  'wallet_ledger_entry'::text as source_type,
  wle.id as source_id,
  wle.created_at
from wallet_ledger_entries wle
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'wallet_ledger_entry'
    and ahc.source_id = wle.id
)
union all
select
  'accounting_journal_entry'::text as source_type,
  aje.id as source_id,
  aje.created_at
from accounting_journal_entries aje
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'accounting_journal_entry'
    and ahc.source_id = aje.id
)
union all
select
  'reward_issuance_group'::text as source_type,
  rig.id as source_id,
  rig.created_at
from reward_issuance_groups rig
where rig.status = 'completed'
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'reward_issuance_group'
      and ahc.source_id = rig.id
  )
union all
select
  'attention_verification_event'::text as source_type,
  ave.id as source_id,
  ave.created_at
from attention_verification_events ave
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'attention_verification_event'
    and ahc.source_id = ave.id
)
union all
select
  'withdrawal_request'::text as source_type,
  wr.id as source_id,
  wr.created_at
from withdrawal_requests wr
where wr.status in ('reserved', 'submitted', 'processing', 'paid', 'failed', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'withdrawal_request'
      and ahc.source_id = wr.id
  )
union all
select
  'external_payout'::text as source_type,
  ep.id as source_id,
  ep.created_at
from external_payouts ep
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'external_payout'
    and ahc.source_id = ep.id
)
union all
select
  'admin_incident_review'::text as source_type,
  r.id as source_id,
  r.created_at
from admin_incident_reviews r
where r.status in ('closed', 'dismissed')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_incident_review'
      and ahc.source_id = r.id
  )
union all
select
  'admin_incident_corrective_action'::text as source_type,
  ca.id as source_id,
  ca.created_at
from admin_incident_corrective_actions ca
where ca.status in ('completed', 'dismissed')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_incident_corrective_action'
      and ahc.source_id = ca.id
  )
union all
select
  'admin_security_daily_snapshot'::text as source_type,
  s.id as source_id,
  s.created_at
from admin_security_daily_snapshots s
where s.snapshot_date < current_date
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_daily_snapshot'
      and ahc.source_id = s.id
  )
union all
select
  'admin_security_report_export'::text as source_type,
  r.id as source_id,
  r.created_at
from admin_security_report_exports r
where r.status in ('generated', 'exported', 'archived')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_report_export'
      and ahc.source_id = r.id
  )
union all
select
  'admin_security_archive_manifest'::text as source_type,
  m.id as source_id,
  m.created_at
from admin_security_archive_manifests m
where m.status in ('sealed', 'verified')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_archive_manifest'
      and ahc.source_id = m.id
  )
union all
select
  'admin_security_deletion_request'::text as source_type,
  r.id as source_id,
  r.created_at
from admin_security_deletion_requests r
where r.status in ('rejected', 'executed', 'failed', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_deletion_request'
      and ahc.source_id = r.id
  )
union all
select
  'admin_security_legal_hold'::text as source_type,
  h.id as source_id,
  h.created_at
from admin_security_legal_holds h
where h.status in ('released', 'expired', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_legal_hold'
      and ahc.source_id = h.id
  )
union all
select
  'admin_security_governance_policy'::text as source_type,
  p.id as source_id,
  p.created_at
from admin_security_governance_policies p
where p.status in ('active', 'superseded', 'archived')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_governance_policy'
      and ahc.source_id = p.id
  )
union all
select
  'admin_security_policy_change_request'::text as source_type,
  cr.id as source_id,
  cr.created_at
from admin_security_policy_change_requests cr
where cr.status in ('rejected', 'activated', 'superseded', 'archived', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_policy_change_request'
      and ahc.source_id = cr.id
  );

create or replace function run_audit_hash_backfill_job(
  p_batch_size integer default 1000,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_row record;
  v_scanned integer := 0;
  v_hashed integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into audit_hash_backfill_runs (status, metadata)
  values ('processing', coalesce(p_metadata, '{}'::jsonb))
  returning id into v_run_id;

  for v_row in
    select *
    from audit_hash_missing_records
    order by created_at asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;
    begin
      if v_row.source_type = 'wallet_ledger_entry' then
        perform hash_wallet_ledger_entry(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'accounting_journal_entry' then
        perform hash_accounting_journal_entry(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'reward_issuance_group' then
        perform hash_reward_issuance_group(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'attention_verification_event' then
        perform hash_attention_verification_event(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'withdrawal_request' then
        perform hash_withdrawal_request(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'external_payout' then
        perform hash_external_payout(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_incident_review' then
        perform hash_admin_incident_review(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_incident_corrective_action' then
        perform hash_admin_incident_corrective_action(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_daily_snapshot' then
        perform hash_admin_security_daily_snapshot(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_report_export' then
        perform hash_admin_security_report_export(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_archive_manifest' then
        perform hash_admin_security_archive_manifest(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_deletion_request' then
        perform hash_admin_security_deletion_request(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_legal_hold' then
        perform hash_admin_security_legal_hold(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_governance_policy' then
        perform hash_admin_security_governance_policy(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_policy_change_request' then
        perform hash_admin_security_policy_change_request(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      end if;
      v_hashed := v_hashed + 1;
    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update audit_hash_backfill_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_count = v_scanned,
    hashed_count = v_hashed,
    failed_count = v_failed
  where id = v_run_id;

  return v_run_id;
exception
  when others then
    if v_run_id is not null then
      update audit_hash_backfill_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;
    raise;
end;
$$;

alter table admin_security_policy_change_requests enable row level security;
alter table admin_security_policy_change_reviews enable row level security;

drop policy if exists admin_security_policy_change_requests_no_user_direct_access on admin_security_policy_change_requests;
create policy admin_security_policy_change_requests_no_user_direct_access
on admin_security_policy_change_requests
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_policy_change_reviews_no_user_direct_access on admin_security_policy_change_reviews;
create policy admin_security_policy_change_reviews_no_user_direct_access
on admin_security_policy_change_reviews
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_policy_change_requests on admin_security_policy_change_requests;
create policy admin_api_all_admin_security_policy_change_requests
on admin_security_policy_change_requests
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_policy_change_reviews on admin_security_policy_change_reviews;
create policy admin_api_all_admin_security_policy_change_reviews
on admin_security_policy_change_reviews
for all
to admin_api_role
using (true)
with check (true);

grant execute on function build_admin_security_policy_diff(uuid, uuid)
to admin_api_role;

grant execute on function create_admin_security_policy_change_request(
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
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function submit_admin_security_policy_change_request(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function review_admin_security_policy_change_request(uuid, uuid, text, text, text, jsonb)
to admin_api_role;

grant execute on function approve_admin_security_policy_change_request(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function reject_admin_security_policy_change_request(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function activate_admin_security_policy_change_request(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function cancel_admin_security_policy_change_request(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function hash_admin_security_policy_change_request(uuid, jsonb)
to worker_role, admin_api_role;

alter function build_admin_security_policy_diff(uuid, uuid) security definer;
alter function build_admin_security_policy_diff(uuid, uuid) set search_path = public;

alter function create_admin_security_policy_change_request(
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
  text,
  text,
  text,
  jsonb
) security definer;

alter function create_admin_security_policy_change_request(
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
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function submit_admin_security_policy_change_request(uuid, uuid, text, text, jsonb) security definer;
alter function submit_admin_security_policy_change_request(uuid, uuid, text, text, jsonb) set search_path = public;

alter function review_admin_security_policy_change_request(uuid, uuid, text, text, text, jsonb) security definer;
alter function review_admin_security_policy_change_request(uuid, uuid, text, text, text, jsonb) set search_path = public;

alter function approve_admin_security_policy_change_request(uuid, uuid, text, text, jsonb) security definer;
alter function approve_admin_security_policy_change_request(uuid, uuid, text, text, jsonb) set search_path = public;

alter function reject_admin_security_policy_change_request(uuid, uuid, text, text, jsonb) security definer;
alter function reject_admin_security_policy_change_request(uuid, uuid, text, text, jsonb) set search_path = public;

alter function activate_admin_security_policy_change_request(uuid, uuid, text, text, jsonb) security definer;
alter function activate_admin_security_policy_change_request(uuid, uuid, text, text, jsonb) set search_path = public;

alter function cancel_admin_security_policy_change_request(uuid, uuid, text, text, jsonb) security definer;
alter function cancel_admin_security_policy_change_request(uuid, uuid, text, text, jsonb) set search_path = public;

alter function hash_admin_security_policy_change_request(uuid, jsonb) security definer;
alter function hash_admin_security_policy_change_request(uuid, jsonb) set search_path = public;

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
    'ADMIN_SECURITY_POLICY_CHANGE_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Security policy change request not found.',
    'Admin security policy change request not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_POLICY_CHANGE_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Security policy change request cannot move from its current state.',
    'Admin security policy change invalid lifecycle state.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_POLICY_CHANGE_SECOND_APPROVER_REQUIRED',
    'permission',
    'critical',
    409,
    false,
    true,
    'Policy change requires approval by a second admin.',
    'Admin security policy change second approver required.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_POLICY_CHANGE_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Policy change requires complete fields.',
    'Admin security policy change required fields missing.',
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
  ('admin security policy change request not found', 'ADMIN_SECURITY_POLICY_CHANGE_NOT_FOUND', 5, '{}'),
  ('policy change request cannot be submitted from status', 'ADMIN_SECURITY_POLICY_CHANGE_INVALID_STATE', 5, '{}'),
  ('policy change request cannot be reviewed from status', 'ADMIN_SECURITY_POLICY_CHANGE_INVALID_STATE', 5, '{}'),
  ('policy change request cannot be approved from status', 'ADMIN_SECURITY_POLICY_CHANGE_INVALID_STATE', 5, '{}'),
  ('policy change request cannot be rejected from status', 'ADMIN_SECURITY_POLICY_CHANGE_INVALID_STATE', 5, '{}'),
  ('policy change request cannot be activated from status', 'ADMIN_SECURITY_POLICY_CHANGE_INVALID_STATE', 5, '{}'),
  ('policy change request cannot be cancelled from status', 'ADMIN_SECURITY_POLICY_CHANGE_INVALID_STATE', 5, '{}'),
  ('policy change request requires approval by a second admin', 'ADMIN_SECURITY_POLICY_CHANGE_SECOND_APPROVER_REQUIRED', 5, '{}'),
  ('policy change key is required', 'ADMIN_SECURITY_POLICY_CHANGE_REQUIRED_FIELDS', 5, '{}'),
  ('policy change title is required', 'ADMIN_SECURITY_POLICY_CHANGE_REQUIRED_FIELDS', 5, '{}'),
  ('policy change rationale is required', 'ADMIN_SECURITY_POLICY_CHANGE_REQUIRED_FIELDS', 5, '{}'),
  ('draft policy key is required', 'ADMIN_SECURITY_POLICY_CHANGE_REQUIRED_FIELDS', 5, '{}'),
  ('draft policy name is required', 'ADMIN_SECURITY_POLICY_CHANGE_REQUIRED_FIELDS', 5, '{}'),
  ('draft policy description is required', 'ADMIN_SECURITY_POLICY_CHANGE_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
