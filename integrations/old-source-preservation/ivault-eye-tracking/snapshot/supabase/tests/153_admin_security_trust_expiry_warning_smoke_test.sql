do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_package_id uuid;
  v_run_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'expiry-warning-admin@example.com',
    'Expiry Warning Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'expiry warning bootstrap');

  perform create_admin_security_trust_notification_subscriber(
    v_admin_auth_user_id,
    'customer_security',
    'expiry-subscriber@example.com',
    'Expiry Subscriber',
    null,
    'Expiry Corp',
    'expiry.example.com',
    'Expiry Corp',
    'expiry.example.com',
    null,
    null,
    null,
    'email',
    'expiry-subscriber',
    '{"test": true}'::jsonb
  );

  insert into admin_security_disclosure_packages (
    package_key,
    status,
    disclosure_type,
    risk_level,
    source_type,
    source_id,
    publication_target_type,
    customer_name,
    customer_domain,
    title,
    summary,
    expires_at,
    disclosed_by_auth_user_id,
    metadata
  )
  values (
    'expiry-warning-package',
    'active',
    'other',
    'medium',
    'other',
    gen_random_uuid(),
    'other',
    'Expiry Corp',
    'expiry.example.com',
    'Expiry Test Package',
    'Expiry test package.',
    now() + interval '7 days',
    v_admin_auth_user_id,
    '{"test": true}'::jsonb
  )
  returning id into v_package_id;

  v_run_id := queue_admin_security_trust_expiry_warning_notifications(
    14,
    500,
    'expiry-warning-worker',
    '{"test": true}'::jsonb
  );

  if v_run_id is null then
    raise exception 'expiry warning run id was not returned';
  end if;

  if not exists (
    select 1
    from admin_security_trust_notification_events
    where topic_key = 'artifact_expiry_warnings'
      and source_type = 'admin_security_disclosure_package'
      and source_id = v_package_id
      and status = 'queued'
  ) then
    raise exception 'expiry warning notification was not queued';
  end if;
end $$;
