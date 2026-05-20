-- Step 9.26 — Build admin device trust workflow.
-- Runs after 140_admin_session_device_ip_risk.sql.

create or replace function count_trusted_admin_devices(
  p_admin_auth_user_id uuid
)
returns integer
language plpgsql
stable
as $$
declare
  v_count integer;
begin
  if p_admin_auth_user_id is null then
    return 0;
  end if;

  select count(*)
  into v_count
  from admin_devices
  where admin_auth_user_id = p_admin_auth_user_id
    and status = 'trusted';

  return coalesce(v_count, 0);
end;
$$;

create or replace function admin_update_admin_device_status(
  p_admin_auth_user_id uuid,
  p_admin_device_id uuid,
  p_status text,
  p_reason_code text,
  p_reason_message text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_actor_admin admin_users%rowtype;
  v_device admin_devices%rowtype;
  v_old_status text;
  v_trusted_count integer;
  v_permission boolean;
  v_alert_severity text := 'high';
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_admin_device_id is null then
    raise exception 'admin device id is required';
  end if;

  if p_status not in ('unknown', 'trusted', 'suspicious', 'blocked', 'revoked') then
    raise exception 'invalid admin device status: %', p_status;
  end if;

  if p_reason_code is null or length(trim(p_reason_code)) = 0 then
    raise exception 'reason code is required';
  end if;

  if p_reason_message is null or length(trim(p_reason_message)) = 0 then
    raise exception 'reason message is required';
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'admin.write'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_update_admin_device_status',
      'admin.write',
      'admin_device',
      p_admin_device_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    case
      when p_status in ('blocked', 'revoked') then 'privileged_action'
      else 'admin_write'
    end,
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'admin_update_admin_device_status',
      'admin_device_id',
      p_admin_device_id,
      'new_status',
      p_status
    )
  );

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id,
    'admin_update_admin_device_status',
    'admin.write',
    null,
    'admin_device',
    p_admin_device_id,
    p_request_id,
    p_metadata || jsonb_build_object(
      'new_status',
      p_status
    )
  );

  v_actor_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_device
  from admin_devices
  where id = p_admin_device_id
  for update;

  if v_device.id is null then
    raise exception 'admin device not found: %', p_admin_device_id;
  end if;

  v_old_status := v_device.status;

  if v_device.admin_auth_user_id = p_admin_auth_user_id
    and p_status in ('blocked', 'revoked') then

    v_trusted_count := count_trusted_admin_devices(p_admin_auth_user_id);

    if v_device.status = 'trusted'
      and v_trusted_count <= 1 then
      perform record_admin_action(
        p_admin_auth_user_id,
        'admin_update_admin_device_status',
        'admin.write',
        'admin_device',
        p_admin_device_id,
        p_request_id,
        null,
        null,
        'denied',
        'cannot block or revoke last trusted admin device',
        p_metadata
      );

      raise exception 'cannot block or revoke last trusted admin device';
    end if;
  end if;

  update admin_devices
  set
    status = p_status,
    trust_score =
      case
        when p_status = 'trusted' then 1.0000
        when p_status = 'unknown' then least(trust_score, 0.5000)
        when p_status = 'suspicious' then least(trust_score, 0.2500)
        when p_status in ('blocked', 'revoked') then 0.0000
        else trust_score
      end,
    risk_score =
      case
        when p_status = 'trusted' then 0.0500
        when p_status = 'unknown' then greatest(risk_score, 0.3000)
        when p_status = 'suspicious' then greatest(risk_score, 0.7000)
        when p_status in ('blocked', 'revoked') then 1.0000
        else risk_score
      end,
    metadata = metadata || p_metadata || jsonb_build_object(
      'last_status_change',
      jsonb_build_object(
        'old_status', v_old_status,
        'new_status', p_status,
        'changed_by_auth_user_id', p_admin_auth_user_id,
        'changed_by_admin_user_id', v_actor_admin.id,
        'reason_code', p_reason_code,
        'reason_message', p_reason_message,
        'request_id', p_request_id,
        'changed_at', now()
      )
    ),
    updated_at = now()
  where id = p_admin_device_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_update_admin_device_status',
    'admin.write',
    'admin_device',
    p_admin_device_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason_code,
    p_metadata || jsonb_build_object(
      'old_status',
      v_old_status,
      'new_status',
      p_status,
      'reason_message',
      p_reason_message,
      'target_admin_auth_user_id',
      v_device.admin_auth_user_id
    )
  );

  v_alert_severity :=
    case
      when p_status in ('blocked', 'revoked') then 'critical'
      when p_status = 'suspicious' then 'high'
      when p_status = 'trusted' then 'medium'
      else 'low'
    end;

  perform create_admin_security_alert(
    'admin_device_status_changed',
    v_alert_severity,
    p_admin_auth_user_id,
    v_device.admin_auth_user_id,
    'admin_update_admin_device_status',
    null,
    'Admin device status changed from ' || v_old_status || ' to ' || p_status || '.',
    p_metadata || jsonb_build_object(
      'request_id',
      p_request_id,
      'admin_device_id',
      p_admin_device_id,
      'old_status',
      v_old_status,
      'new_status',
      p_status,
      'reason_code',
      p_reason_code,
      'reason_message',
      p_reason_message
    )
  );

  return p_admin_device_id;
end;
$$;

create or replace function admin_trust_admin_device(
  p_admin_auth_user_id uuid,
  p_admin_device_id uuid,
  p_reason_message text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  return admin_update_admin_device_status(
    p_admin_auth_user_id,
    p_admin_device_id,
    'trusted',
    'admin_device_trusted',
    p_reason_message,
    p_request_id,
    p_metadata
  );
end;
$$;

create or replace function admin_mark_admin_device_suspicious(
  p_admin_auth_user_id uuid,
  p_admin_device_id uuid,
  p_reason_message text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  return admin_update_admin_device_status(
    p_admin_auth_user_id,
    p_admin_device_id,
    'suspicious',
    'admin_device_marked_suspicious',
    p_reason_message,
    p_request_id,
    p_metadata
  );
end;
$$;

create or replace function admin_block_admin_device(
  p_admin_auth_user_id uuid,
  p_admin_device_id uuid,
  p_reason_message text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  return admin_update_admin_device_status(
    p_admin_auth_user_id,
    p_admin_device_id,
    'blocked',
    'admin_device_blocked',
    p_reason_message,
    p_request_id,
    p_metadata
  );
end;
$$;

create or replace function admin_revoke_admin_device(
  p_admin_auth_user_id uuid,
  p_admin_device_id uuid,
  p_reason_message text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  return admin_update_admin_device_status(
    p_admin_auth_user_id,
    p_admin_device_id,
    'revoked',
    'admin_device_revoked',
    p_reason_message,
    p_request_id,
    p_metadata
  );
end;
$$;

create or replace view admin_device_detail_dashboard as
select
  d.id as admin_device_id,
  d.admin_auth_user_id,
  au.email,
  au.display_name,
  d.device_fingerprint_hash,
  d.platform,
  d.browser_name,
  d.browser_version,
  d.os_name,
  d.os_version,
  d.device_label,
  d.status,
  d.trust_score,
  d.risk_score,
  d.first_seen_at,
  d.last_seen_at,
  (
    select count(*)
    from admin_session_contexts s
    where s.admin_device_id = d.id
  ) as session_count,
  (
    select count(*)
    from admin_action_risk_evaluations e
    where e.admin_device_id = d.id
  ) as action_risk_evaluation_count,
  (
    select max(e.created_at)
    from admin_action_risk_evaluations e
    where e.admin_device_id = d.id
  ) as last_action_risk_evaluated_at,
  d.created_at,
  d.updated_at,
  d.metadata
from admin_devices d
left join admin_users au
  on au.id = d.admin_user_id
order by d.last_seen_at desc;

grant select on admin_device_detail_dashboard to admin_api_role;

grant execute on function count_trusted_admin_devices(uuid)
to admin_api_role;

grant execute on function admin_update_admin_device_status(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function admin_trust_admin_device(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function admin_mark_admin_device_suspicious(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function admin_block_admin_device(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function admin_revoke_admin_device(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

alter function count_trusted_admin_devices(uuid) security definer;
alter function count_trusted_admin_devices(uuid) set search_path = public;

alter function admin_update_admin_device_status(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) security definer;

alter function admin_update_admin_device_status(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function admin_trust_admin_device(uuid, uuid, text, text, jsonb) security definer;
alter function admin_trust_admin_device(uuid, uuid, text, text, jsonb) set search_path = public;

alter function admin_mark_admin_device_suspicious(uuid, uuid, text, text, jsonb) security definer;
alter function admin_mark_admin_device_suspicious(uuid, uuid, text, text, jsonb) set search_path = public;

alter function admin_block_admin_device(uuid, uuid, text, text, jsonb) security definer;
alter function admin_block_admin_device(uuid, uuid, text, text, jsonb) set search_path = public;

alter function admin_revoke_admin_device(uuid, uuid, text, text, jsonb) security definer;
alter function admin_revoke_admin_device(uuid, uuid, text, text, jsonb) set search_path = public;

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
    'ADMIN_DEVICE_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Admin device not found.',
    'Admin device not found.',
    'platform'
  ),
  (
    'ADMIN_DEVICE_STATUS_INVALID',
    'validation',
    'medium',
    400,
    false,
    true,
    'Invalid admin device status.',
    'Invalid admin device status.',
    'platform'
  ),
  (
    'ADMIN_LAST_TRUSTED_DEVICE_PROTECTED',
    'permission',
    'critical',
    409,
    false,
    true,
    'Cannot block or revoke the last trusted admin device.',
    'Last trusted admin device protection triggered.',
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
  ('admin device not found', 'ADMIN_DEVICE_NOT_FOUND', 5, '{}'),
  ('invalid admin device status', 'ADMIN_DEVICE_STATUS_INVALID', 5, '{}'),
  ('cannot block or revoke last trusted admin device', 'ADMIN_LAST_TRUSTED_DEVICE_PROTECTED', 5, '{}')
on conflict do nothing;
