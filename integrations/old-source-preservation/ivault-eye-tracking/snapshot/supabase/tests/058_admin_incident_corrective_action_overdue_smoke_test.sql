do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_review_id uuid;
  v_action_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'corrective-action-overdue@example.com',
    'Corrective Action Overdue',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'corrective action overdue bootstrap'
  );

  v_review_id := create_admin_incident_review(
    'admin_security_alert_event',
    gen_random_uuid(),
    'critical',
    'Overdue corrective action review',
    'Overdue corrective action review summary',
    v_admin_auth_user_id,
    null,
    now() + interval '24 hours',
    'corrective-action-overdue-review',
    '{"test": true}'::jsonb
  );

  v_action_id := create_admin_incident_corrective_action(
    v_admin_auth_user_id,
    v_review_id,
    'overdue_action',
    'critical',
    'Overdue action',
    'This action is overdue.',
    null,
    now() - interval '1 minute',
    'corrective-action-overdue-create',
    '{"test": true}'::jsonb
  );

  perform mark_overdue_admin_incident_corrective_actions(
    500,
    '{"test": true, "scope": "corrective_action_overdue"}'::jsonb
  );

  if not exists (
    select 1
    from admin_incident_corrective_actions
    where id = v_action_id
      and status = 'overdue'
  ) then
    raise exception 'corrective action was not marked overdue';
  end if;

  if not exists (
    select 1
    from admin_security_alert_events
    where alert_key = 'admin_incident_corrective_action_overdue'
      and metadata->>'admin_incident_corrective_action_id' = v_action_id::text
  ) then
    raise exception 'overdue corrective action alert missing';
  end if;
end $$;
