-- Step 9.24 — Admin MFA recovery code security alerts.
-- Runs after 138_admin_mfa_recovery_codes.sql.

create or replace function create_admin_mfa_recovery_code_security_alert(
  p_admin_auth_user_id uuid,
  p_alert_key text,
  p_severity text,
  p_action_key text,
  p_message text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_alert_key is null or length(trim(p_alert_key)) = 0 then
    raise exception 'alert key is required';
  end if;

  return create_admin_security_alert(
    p_alert_key,
    p_severity,
    p_admin_auth_user_id,
    p_admin_auth_user_id,
    p_action_key,
    null,
    p_message,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'request_id',
      p_request_id,
      'mfa_event_type',
      'recovery_code'
    )
  );
end;
$$;

grant execute on function create_admin_mfa_recovery_code_security_alert(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

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
    'ADMIN_RECOVERY_CODE_ALERT_FAILED',
    'system',
    'high',
    500,
    true,
    false,
    'Recovery-code security alert failed.',
    'Admin MFA recovery-code alert creation failed.',
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
  ('mfa_event_type', 'ADMIN_RECOVERY_CODE_ALERT_FAILED', 10, '{}')
on conflict do nothing;
