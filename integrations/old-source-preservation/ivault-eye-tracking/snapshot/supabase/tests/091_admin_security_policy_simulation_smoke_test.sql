do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_change_request_id uuid;
  v_run_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'policy-simulation@example.com',
    'Policy Simulation',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'policy simulation bootstrap'
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
    'Policy Simulation Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'policy-simulation-create-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'policy-simulation-create-mfa',
    '{"test": true}'::jsonb
  );

  v_change_request_id := create_admin_security_policy_change_request(
    v_admin_auth_user_id,
    'create_policy',
    'policy_simulation_smoke',
    'Policy simulation smoke',
    'Testing simulation engine.',
    null,
    'policy_simulation_smoke_policy',
    'Policy Simulation Smoke Policy',
    'general',
    'high',
    'platform',
    'Policy used for simulation smoke test.',
    'high',
    'policy-simulation-create',
    '{"test": true}'::jsonb
  );

  v_run_id := run_admin_security_policy_change_simulation(
    v_admin_auth_user_id,
    v_change_request_id,
    'policy-simulation-run',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_policy_simulation_runs
    where id = v_run_id
      and status in ('passed', 'warning', 'failed')
  ) then
    raise exception 'policy simulation run was not completed';
  end if;

  if not exists (
    select 1
    from admin_security_policy_simulation_items
    where admin_security_policy_simulation_run_id = v_run_id
  ) then
    raise exception 'policy simulation items missing';
  end if;
end $$;
