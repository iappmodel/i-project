do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_assignee_auth_user_id uuid := gen_random_uuid();
  v_review_id uuid;
  v_action_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'corrective-action-admin@example.com',
    'Corrective Action Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform upsert_admin_user(
    v_assignee_auth_user_id,
    'corrective-action-assignee@example.com',
    'Corrective Action Assignee',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'corrective action smoke bootstrap'
  );

  v_review_id := create_admin_incident_review(
    'admin_security_alert_event',
    gen_random_uuid(),
    'critical',
    'Corrective action smoke review',
    'Corrective action smoke review summary',
    v_admin_auth_user_id,
    null,
    now() + interval '24 hours',
    'corrective-action-review',
    '{"test": true}'::jsonb
  );

  v_action_id := create_admin_incident_corrective_action(
    v_admin_auth_user_id,
    v_review_id,
    'rotate_mfa_policy',
    'critical',
    'Rotate MFA policy',
    'Review and rotate MFA policy after incident.',
    v_assignee_auth_user_id,
    now() + interval '7 days',
    'corrective-action-create',
    '{"test": true}'::jsonb
  );

  perform start_admin_incident_corrective_action(
    v_assignee_auth_user_id,
    v_action_id,
    'starting work',
    'corrective-action-start',
    '{"test": true}'::jsonb
  );

  perform complete_admin_incident_corrective_action(
    v_admin_auth_user_id,
    v_action_id,
    'MFA policy reviewed and updated.',
    'https://example.com/evidence',
    'corrective-action-complete',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_incident_corrective_actions
    where id = v_action_id
      and status = 'completed'
      and completed_at is not null
      and completion_note = 'MFA policy reviewed and updated.'
  ) then
    raise exception 'corrective action was not completed';
  end if;

  perform run_audit_hash_backfill_job(
    1000,
    '{"test": true, "scope": "corrective_action"}'::jsonb
  );

  if exists (
    select 1
    from audit_hash_missing_records
    where source_type = 'admin_incident_corrective_action'
      and source_id = v_action_id
  ) then
    raise exception 'completed corrective action hash missing';
  end if;
end $$;
