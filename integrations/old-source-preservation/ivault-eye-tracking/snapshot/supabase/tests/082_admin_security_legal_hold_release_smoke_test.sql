do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_hold_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'legal-hold-release@example.com',
    'Legal Hold Release',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'legal hold release smoke bootstrap'
  );

  insert into admin_mfa_factors (
    admin_auth_user_id,
    admin_user_id,
    factor_type,
    provider,
    status,
    label,
    secret_ciphertext,
    secret_key_version,
    confirmed_at,
    metadata
  )
  values (
    v_admin_auth_user_id,
    v_admin_user_id,
    'totp',
    'totp',
    'active',
    'Legal Hold Release Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'legal-hold-release-create-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'legal-hold-release-create-mfa',
    '{"test": true}'::jsonb
  );

  v_hold_id := create_admin_security_legal_hold(
    v_admin_auth_user_id,
    'legal_hold_release_smoke',
    'compliance',
    'Release hold smoke',
    'Temporary compliance hold.',
    'compliance',
    'COMP-001',
    now() - interval '1 day',
    null,
    'legal-hold-release-create',
    '{"test": true}'::jsonb
  );

  perform add_admin_security_legal_hold_target(
    v_admin_auth_user_id,
    v_hold_id,
    'source_type',
    'admin_security_notification_delivery',
    null,
    null,
    null,
    null,
    null,
    'legal-hold-release-target',
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'legal-hold-release-release-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'legal-hold-release-release-mfa',
    '{"test": true}'::jsonb
  );

  perform release_admin_security_legal_hold(
    v_admin_auth_user_id,
    v_hold_id,
    'legal hold no longer required',
    'legal-hold-release',
    '{"test": true}'::jsonb
  );

  perform require_no_admin_security_legal_hold(
    'admin_security_notification_delivery',
    null,
    now() - interval '600 days',
    now() - interval '400 days',
    null,
    null
  );

  if not exists (
    select 1
    from admin_security_legal_holds
    where id = v_hold_id
      and status = 'released'
      and released_at is not null
  ) then
    raise exception 'legal hold was not released';
  end if;
end $$;
