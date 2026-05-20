do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_alert_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'incident-alert-admin@example.com',
    'Incident Alert Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'incident alert smoke bootstrap'
  );

  v_alert_id := create_admin_security_alert(
    'smoke_critical_incident_alert',
    'critical',
    v_admin_auth_user_id,
    null,
    'smoke_action',
    null,
    'Smoke critical alert for incident review.',
    '{"test": true}'::jsonb
  );

  perform run_admin_incident_review_creation_job(
    500,
    '{"test": true, "scope": "critical_alert_review"}'::jsonb
  );

  if not exists (
    select 1
    from admin_incident_reviews
    where source_type = 'admin_security_alert_event'
      and source_id = v_alert_id
      and status = 'open'
      and severity = 'critical'
  ) then
    raise exception 'incident review was not created for critical alert';
  end if;
end $$;
