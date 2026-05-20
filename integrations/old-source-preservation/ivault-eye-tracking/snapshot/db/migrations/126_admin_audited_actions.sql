-- Step 9.8 — Replace direct admin mutations with audited RPCs.
-- Runs after 125_admin_rbac_schema.sql and before 160_scheduler_schema.sql.

create or replace function admin_update_device_status(
  p_admin_auth_user_id uuid,
  p_device_id uuid,
  p_status text,
  p_reviewed_by text,
  p_reason_code text,
  p_reason_message text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_device user_devices%rowtype;
  v_permission boolean;
  v_score_delta numeric := 0;
  v_risk_delta numeric := 0;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_device_id is null then
    raise exception 'device id is required';
  end if;

  if p_status not in ('active', 'trusted', 'suspicious', 'blocked') then
    raise exception 'invalid device status: %', p_status;
  end if;

  if p_reviewed_by is null or length(trim(p_reviewed_by)) = 0 then
    raise exception 'reviewed_by is required';
  end if;

  if p_reason_code is null or length(trim(p_reason_code)) = 0 then
    raise exception 'reason code is required';
  end if;

  if p_reason_message is null or length(trim(p_reason_message)) = 0 then
    raise exception 'reason message is required';
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'device.write'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_update_device_status',
      'device.write',
      'user_device',
      p_device_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing device.write permission',
      p_metadata
    );

    raise exception 'missing required permission: device.write';
  end if;

  select *
  into v_device
  from user_devices
  where id = p_device_id
  for update;

  if v_device.id is null then
    raise exception 'device not found: %', p_device_id;
  end if;

  update user_devices
  set
    status = p_status,
    risk_score =
      case
        when p_status = 'trusted' then least(risk_score, 0.1000)
        when p_status = 'active' then risk_score
        when p_status = 'suspicious' then greatest(risk_score, 0.6500)
        when p_status = 'blocked' then 1.0000
        else risk_score
      end,
    metadata = metadata || p_metadata || jsonb_build_object(
      'last_admin_status_update',
      jsonb_build_object(
        'admin_auth_user_id', p_admin_auth_user_id,
        'reviewed_by', p_reviewed_by,
        'reason_code', p_reason_code,
        'reason_message', p_reason_message,
        'request_id', p_request_id,
        'status', p_status,
        'updated_at', now()
      )
    ),
    updated_at = now()
  where id = p_device_id;

  v_score_delta :=
    case
      when p_status = 'trusted' then 0.0500
      when p_status = 'suspicious' then -0.0500
      when p_status = 'blocked' then -0.2500
      else 0.0000
    end;

  v_risk_delta :=
    case
      when p_status = 'trusted' then -0.0500
      when p_status = 'suspicious' then 0.1000
      when p_status = 'blocked' then 0.3500
      else 0.0000
    end;

  if v_device.first_seen_user_id is not null
    and (v_score_delta <> 0 or v_risk_delta <> 0) then
    perform add_user_trust_score_component(
      v_device.first_seen_user_id,
      case
        when p_status = 'trusted' then 'admin_device_trusted'
        when p_status = 'suspicious' then 'admin_device_suspicious'
        when p_status = 'blocked' then 'admin_device_blocked'
        else 'admin_device_status_updated'
      end,
      'device',
      v_score_delta,
      v_risk_delta,
      1.0000,
      'user_device',
      p_device_id,
      p_reason_code,
      p_reason_message,
      p_metadata || jsonb_build_object(
        'admin_auth_user_id', p_admin_auth_user_id,
        'reviewed_by', p_reviewed_by,
        'request_id', p_request_id
      )
    );
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_update_device_status',
    'device.write',
    'user_device',
    p_device_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason_code,
    p_metadata || jsonb_build_object(
      'status', p_status,
      'reviewed_by', p_reviewed_by,
      'reason_message', p_reason_message
    )
  );

  return p_device_id;
end;
$$;

create or replace function admin_add_trust_score_component(
  p_admin_auth_user_id uuid,
  p_target_user_id uuid,
  p_component_key text,
  p_component_category text,
  p_score_delta numeric default 0,
  p_risk_delta numeric default 0,
  p_weight numeric default 1,
  p_reason_code text default 'admin_manual_adjustment',
  p_reason_message text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_component_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_target_user_id is null then
    raise exception 'target user id is required';
  end if;

  if p_component_key is null or length(trim(p_component_key)) = 0 then
    raise exception 'component key is required';
  end if;

  if p_reason_code is null or length(trim(p_reason_code)) = 0 then
    raise exception 'reason code is required';
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'trust.write'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_add_trust_score_component',
      'trust.write',
      'user',
      p_target_user_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing trust.write permission',
      p_metadata
    );

    raise exception 'missing required permission: trust.write';
  end if;

  v_component_id := add_user_trust_score_component(
    p_target_user_id,
    p_component_key,
    p_component_category,
    p_score_delta,
    p_risk_delta,
    p_weight,
    'admin_action',
    null,
    p_reason_code,
    p_reason_message,
    p_metadata || jsonb_build_object(
      'admin_auth_user_id', p_admin_auth_user_id,
      'request_id', p_request_id
    )
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_add_trust_score_component',
    'trust.write',
    'user',
    p_target_user_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason_code,
    p_metadata || jsonb_build_object(
      'component_id', v_component_id,
      'component_key', p_component_key,
      'component_category', p_component_category,
      'score_delta', p_score_delta,
      'risk_delta', p_risk_delta,
      'weight', p_weight
    )
  );

  return v_component_id;
end;
$$;

create or replace function admin_approve_withdrawal_review(
  p_admin_auth_user_id uuid,
  p_withdrawal_request_id uuid,
  p_review_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_withdrawal_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  if p_review_note is null or length(trim(p_review_note)) = 0 then
    raise exception 'review note is required';
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'withdrawal.review'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_approve_withdrawal_review',
      'withdrawal.review',
      'withdrawal_request',
      p_withdrawal_request_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing withdrawal.review permission',
      p_metadata
    );

    raise exception 'missing required permission: withdrawal.review';
  end if;

  v_withdrawal_id := approve_withdrawal_review(
    p_withdrawal_request_id,
    p_admin_auth_user_id::text,
    p_review_note,
    p_metadata || jsonb_build_object(
      'admin_auth_user_id', p_admin_auth_user_id,
      'request_id', p_request_id
    )
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_approve_withdrawal_review',
    'withdrawal.review',
    'withdrawal_request',
    p_withdrawal_request_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_review_note,
    p_metadata
  );

  return v_withdrawal_id;
end;
$$;

create or replace function admin_block_withdrawal_review(
  p_admin_auth_user_id uuid,
  p_withdrawal_request_id uuid,
  p_review_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_withdrawal_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  if p_review_note is null or length(trim(p_review_note)) = 0 then
    raise exception 'review note is required';
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'withdrawal.review'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_block_withdrawal_review',
      'withdrawal.review',
      'withdrawal_request',
      p_withdrawal_request_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing withdrawal.review permission',
      p_metadata
    );

    raise exception 'missing required permission: withdrawal.review';
  end if;

  v_withdrawal_id := block_withdrawal_review(
    p_withdrawal_request_id,
    p_admin_auth_user_id::text,
    p_review_note,
    p_metadata || jsonb_build_object(
      'admin_auth_user_id', p_admin_auth_user_id,
      'request_id', p_request_id
    )
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_block_withdrawal_review',
    'withdrawal.review',
    'withdrawal_request',
    p_withdrawal_request_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_review_note,
    p_metadata
  );

  return v_withdrawal_id;
end;
$$;

grant execute on function admin_update_device_status(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function admin_add_trust_score_component(
  uuid,
  uuid,
  text,
  text,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function admin_approve_withdrawal_review(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function admin_block_withdrawal_review(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

alter function admin_update_device_status(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) security definer;

alter function admin_update_device_status(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function admin_add_trust_score_component(
  uuid,
  uuid,
  text,
  text,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text,
  jsonb
) security definer;

alter function admin_add_trust_score_component(
  uuid,
  uuid,
  text,
  text,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function admin_approve_withdrawal_review(
  uuid,
  uuid,
  text,
  text,
  jsonb
) security definer;

alter function admin_approve_withdrawal_review(
  uuid,
  uuid,
  text,
  text,
  jsonb
) set search_path = public;

alter function admin_block_withdrawal_review(
  uuid,
  uuid,
  text,
  text,
  jsonb
) security definer;

alter function admin_block_withdrawal_review(
  uuid,
  uuid,
  text,
  text,
  jsonb
) set search_path = public;

create or replace view admin_action_audit_dashboard as
select
  aal.id as admin_action_audit_log_id,

  aal.admin_user_id,
  aal.admin_auth_user_id,

  au.email,
  au.display_name,

  aal.action_key,
  aal.permission_key,

  aal.target_type,
  aal.target_id,

  aal.request_id,
  aal.endpoint,
  aal.method,

  aal.decision,
  aal.reason,

  aal.occurred_at,
  aal.metadata

from admin_action_audit_log aal
left join admin_users au
  on au.id = aal.admin_user_id
order by aal.occurred_at desc;

grant select on admin_action_audit_dashboard to admin_api_role;

insert into admin_permissions (
  permission_key,
  permission_name,
  permission_group,
  description
)
values (
  'admin.audit.read',
  'Read admin action audit log',
  'admin',
  'Can read admin action audit log.'
)
on conflict (permission_key)
do update set
  permission_name = excluded.permission_name,
  permission_group = excluded.permission_group,
  description = excluded.description,
  status = 'active',
  updated_at = now();

insert into admin_role_permissions (
  admin_role_id,
  admin_permission_id
)
select
  r.id,
  p.id
from admin_roles r
join admin_permissions p
  on p.permission_key = 'admin.audit.read'
where r.role_key = 'super_admin'
on conflict do nothing;

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
    'ADMIN_ACTION_DENIED',
    'permission',
    'high',
    403,
    false,
    true,
    'You do not have permission for this admin action.',
    'Audited admin action denied.',
    'platform'
  ),
  (
    'ADMIN_ACTION_INVALID',
    'validation',
    'medium',
    400,
    false,
    true,
    'The admin action is invalid.',
    'Invalid admin action input.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
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
  ('missing required permission', 'ADMIN_ACTION_DENIED', 5, '{}'),
  ('invalid device status', 'ADMIN_ACTION_INVALID', 5, '{}'),
  ('device not found', 'ADMIN_ACTION_INVALID', 5, '{}'),
  ('admin auth user id is required', 'ADMIN_ACTION_INVALID', 5, '{}')
on conflict do nothing;
