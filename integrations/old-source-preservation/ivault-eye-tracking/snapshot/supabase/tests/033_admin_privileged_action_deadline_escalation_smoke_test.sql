do $$
declare
  v_requester_auth_user_id uuid := gen_random_uuid();
  v_target_auth_user_id uuid := gen_random_uuid();
  v_request_id uuid;
begin
  perform upsert_admin_user(
    v_requester_auth_user_id,
    'deadline-requester@example.com',
    'Deadline Requester',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_requester_auth_user_id,
    'super_admin',
    null,
    'deadline smoke bootstrap'
  );

  perform upsert_admin_user(
    v_target_auth_user_id,
    'deadline-target@example.com',
    'Deadline Target',
    'active',
    '{"test": true}'::jsonb
  );

  v_request_id := admin_assign_admin_role(
    v_requester_auth_user_id,
    v_target_auth_user_id,
    'super_admin',
    'deadline escalation test',
    'deadline-escalation-request',
    '{"test": true}'::jsonb
  );

  update admin_privileged_action_requests
  set expires_at = now() + interval '30 minutes'
  where id = v_request_id;

  perform run_admin_security_alert_escalation_job(
    500,
    '{"test": true, "scope": "privileged_deadline"}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_alert_escalation_events
    where privileged_action_request_id = v_request_id
      and escalation_key = 'privileged_action_expiring_soon'
  ) then
    raise exception 'privileged action deadline escalation missing';
  end if;
end $$;
