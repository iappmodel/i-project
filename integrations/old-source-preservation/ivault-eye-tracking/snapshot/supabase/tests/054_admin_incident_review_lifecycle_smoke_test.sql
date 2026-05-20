do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_assignee_auth_user_id uuid := gen_random_uuid();
  v_review_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'incident-lifecycle-admin@example.com',
    'Incident Lifecycle Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform upsert_admin_user(
    v_assignee_auth_user_id,
    'incident-lifecycle-assignee@example.com',
    'Incident Lifecycle Assignee',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'incident lifecycle smoke bootstrap'
  );

  perform assign_admin_role(
    v_assignee_auth_user_id,
    'super_admin',
    null,
    'incident lifecycle assignee bootstrap'
  );

  v_review_id := create_admin_incident_review(
    'admin_security_alert_event',
    gen_random_uuid(),
    'critical',
    'Smoke review',
    'Smoke review summary',
    v_admin_auth_user_id,
    null,
    now() + interval '24 hours',
    'incident-lifecycle-create',
    '{"test": true}'::jsonb
  );

  perform assign_admin_incident_review(
    v_admin_auth_user_id,
    v_review_id,
    v_assignee_auth_user_id,
    'assign smoke review',
    'incident-lifecycle-assign',
    '{"test": true}'::jsonb
  );

  perform start_admin_incident_review_investigation(
    v_assignee_auth_user_id,
    v_review_id,
    'start investigation',
    'incident-lifecycle-start',
    '{"test": true}'::jsonb
  );

  perform close_admin_incident_review(
    v_admin_auth_user_id,
    v_review_id,
    'review complete',
    'No compromise found.',
    'Continue monitoring.',
    'incident-lifecycle-close',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_incident_reviews
    where id = v_review_id
      and status = 'closed'
      and closed_at is not null
      and findings = 'No compromise found.'
      and corrective_actions = 'Continue monitoring.'
  ) then
    raise exception 'incident review was not closed correctly';
  end if;

  perform run_audit_hash_backfill_job(
    1000,
    '{"test": true, "scope": "incident_review"}'::jsonb
  );

  if exists (
    select 1
    from audit_hash_missing_records
    where source_type = 'admin_incident_review'
      and source_id = v_review_id
  ) then
    raise exception 'closed incident review hash missing';
  end if;
end $$;
