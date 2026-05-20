do $$
declare
  v_requester_auth_user_id uuid := gen_random_uuid();
  v_approver_auth_user_id uuid := gen_random_uuid();

  v_requester_admin_user_id uuid;
  v_approver_admin_user_id uuid;

  v_change_request_id uuid;
  v_draft_policy_id uuid;
  v_challenge_id uuid;
begin
  v_requester_admin_user_id := upsert_admin_user(
    v_requester_auth_user_id,
    'policy-with-sim-requester@example.com',
    'Policy With Sim Requester',
    'active',
    '{"test": true}'::jsonb
  );

  v_approver_admin_user_id := upsert_admin_user(
    v_approver_auth_user_id,
    'policy-with-sim-approver@example.com',
    'Policy With Sim Approver',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_requester_auth_user_id, 'super_admin', null, 'with sim requester bootstrap');
  perform assign_admin_role(v_approver_auth_user_id, 'super_admin', null, 'with sim approver bootstrap');

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
  values
    (
      v_requester_auth_user_id,
      v_requester_admin_user_id,
      'totp',
      'totp',
      'active',
      'With Sim Requester Factor',
      'v1.fake.fake.fake',
      'v1',
      now(),
      '{"test": true}'::jsonb
    ),
    (
      v_approver_auth_user_id,
      v_approver_admin_user_id,
      'totp',
      'totp',
      'active',
      'With Sim Approver Factor',
      'v1.fake.fake.fake',
      'v1',
      now(),
      '{"test": true}'::jsonb
    );

  v_challenge_id := create_admin_mfa_challenge(
    v_requester_auth_user_id,
    'stub',
    'privileged_action',
    'with-sim-create-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_requester_auth_user_id,
    v_challenge_id,
    '000000',
    'with-sim-create-mfa',
    '{"test": true}'::jsonb
  );

  v_change_request_id := create_admin_security_policy_change_request(
    v_requester_auth_user_id,
    'create_policy',
    'policy_with_sim_smoke',
    'With simulation smoke policy',
    'Testing simulation activation success.',
    null,
    'policy_with_sim_smoke_policy',
    'Policy With Simulation Smoke Policy',
    'general',
    'high',
    'platform',
    'Policy should activate after simulation.',
    'high',
    'policy-with-sim-create',
    '{"test": true}'::jsonb
  );

  select draft_policy_id
  into v_draft_policy_id
  from admin_security_policy_change_requests
  where id = v_change_request_id;

  insert into admin_security_governance_policy_rules (
    admin_security_governance_policy_id,
    rule_key,
    status,
    rule_type,
    enforcement_level,
    description,
    expected_behavior,
    metadata
  )
  values (
    v_draft_policy_id,
    'with_sim_smoke_rule',
    'active',
    'audit',
    'advisory',
    'Smoke policy rule.',
    'Record evidence.',
    '{"test": true}'::jsonb
  );

  perform submit_admin_security_policy_change_request(
    v_requester_auth_user_id,
    v_change_request_id,
    'submit',
    'policy-with-sim-submit',
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_approver_auth_user_id,
    'stub',
    'privileged_action',
    'with-sim-approve-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_approver_auth_user_id,
    v_challenge_id,
    '000000',
    'with-sim-approve-mfa',
    '{"test": true}'::jsonb
  );

  perform approve_admin_security_policy_change_request(
    v_approver_auth_user_id,
    v_change_request_id,
    'approve',
    'policy-with-sim-approve',
    '{"test": true}'::jsonb
  );

  perform run_admin_security_policy_change_simulation(
    v_requester_auth_user_id,
    v_change_request_id,
    'policy-with-sim-run',
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_requester_auth_user_id,
    'stub',
    'privileged_action',
    'with-sim-activate-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_requester_auth_user_id,
    v_challenge_id,
    '000000',
    'with-sim-activate-mfa',
    '{"test": true}'::jsonb
  );

  perform activate_admin_security_policy_change_request(
    v_requester_auth_user_id,
    v_change_request_id,
    'activate after simulation',
    'policy-with-sim-activate',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_policy_change_requests
    where id = v_change_request_id
      and status = 'activated'
  ) then
    raise exception 'policy change was not activated after simulation';
  end if;
end $$;
