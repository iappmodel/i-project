do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_target_user_id uuid := gen_random_uuid();
  v_challenge_id uuid;
  v_component_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'mfa-verified-admin@example.com',
    'MFA Verified Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'mfa verified smoke bootstrap'
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'admin_write',
    'mfa-verify-test-challenge',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'mfa-verify-test',
    '{"test": true}'::jsonb
  );

  v_component_id := admin_add_trust_score_component(
    v_admin_auth_user_id,
    v_target_user_id,
    'mfa_verified_test',
    'admin',
    0.0100,
    0.0000,
    1.0000,
    'mfa_verified_test',
    'This should pass with MFA.',
    'mfa-verified-test',
    '{"test": true}'::jsonb
  );

  if v_component_id is null then
    raise exception 'admin write did not succeed after MFA verification';
  end if;
end $$;
