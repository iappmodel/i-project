do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_review_id uuid;
  v_action_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'review-open-action-admin@example.com',
    'Review Open Action Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'review open corrective action bootstrap'
  );

  v_review_id := create_admin_incident_review(
    'admin_security_alert_event',
    gen_random_uuid(),
    'critical',
    'Review with open action',
    'Review with open action summary',
    v_admin_auth_user_id,
    null,
    now() + interval '24 hours',
    'review-open-action-create',
    '{"test": true}'::jsonb
  );

  v_action_id := create_admin_incident_corrective_action(
    v_admin_auth_user_id,
    v_review_id,
    'open_action',
    'high',
    'Open action',
    'This action is still open.',
    null,
    now() + interval '7 days',
    'review-open-action-task',
    '{"test": true}'::jsonb
  );

  begin
    perform close_admin_incident_review(
      v_admin_auth_user_id,
      v_review_id,
      'trying to close',
      'Findings.',
      'Need to fix things.',
      'review-open-action-close',
      '{"test": true}'::jsonb
    );

    raise exception 'review close should have failed with open corrective action';
  exception
    when others then
      if sqlerrm not like '%cannot close incident review with open corrective actions%' then
        raise;
      end if;
  end;
end $$;
