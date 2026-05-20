do $$
declare
  v_requester_auth_user_id uuid := gen_random_uuid();
  v_approver_auth_user_id uuid := gen_random_uuid();

  v_requester_admin_user_id uuid;
  v_approver_admin_user_id uuid;

  v_change_request_id uuid;
  v_challenge_id uuid;
begin
  v_requester_admin_user_id := upsert_admin_user(
    v_requester_auth_user_id,
    'policy-no-sim-requester@example.com',
    'Policy No Sim Requester',
    'active',
    '{"test": true}'::jsonb
  );

  v_approver_admin_user_id := upsert_admin_user(
    v_approver_auth_user_id,
    'policy-no-sim-approver@example.com',
    'Policy No Sim Approver',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_requester_auth_user_id, 'super_admin', null, 'no sim requester bootstrap');
  perform assign_admin_role(v_approver_auth_user_id, 'super_admin', null, 'no sim approver bootstrap');

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
      'No Sim Requester Factor',
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
      'No Sim Approver Factor',
      'v1.fake.fake.fake',
      'v1',
      now(),
      '{"test": true}'::jsonb
    );

  v_challenge_id := create_admin_mfa_challenge(
    v_requester_auth_user_id,
    'stub',
    'privileged_action',
    'no-sim-create-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_requester_auth_user_id,
    v_challenge_id,
    '000000',
    'no-sim-create-mfa',
    '{"test": true}'::jsonb
  );

  v_change_request_id := create_admin_security_policy_change_request(
    v_requester_auth_user_id,
    'create_policy',
    'policy_no_sim_smoke',
    'No simulation smoke policy',
    'Testing simulation activation block.',
    null,
    'policy_no_sim_smoke_policy',
    'Policy No Simulation Smoke Policy',
    'general',
    'high',
    'platform',
    'Policy should not activate without simulation.',
    'high',
    'policy-no-sim-create',
    '{"test": true}'::jsonb
  );

  perform submit_admin_security_policy_change_request(
    v_requester_auth_user_id,
    v_change_request_id,
    'submit',
    'policy-no-sim-submit',
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_approver_auth_user_id,
    'stub',
    'privileged_action',
    'no-sim-approve-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_approver_auth_user_id,
    v_challenge_id,
    '000000',
    'no-sim-approve-mfa',
    '{"test": true}'::jsonb
  );

  perform approve_admin_security_policy_change_request(
    v_approver_auth_user_id,
    v_change_request_id,
    'approve',
    'policy-no-sim-approve',
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_requester_auth_user_id,
    'stub',
    'privileged_action',
    'no-sim-activate-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_requester_auth_user_id,
    v_challenge_id,
    '000000',
    'no-sim-activate-mfa',
    '{"test": true}'::jsonb
  );

  begin
    perform activate_admin_security_policy_change_request(
      v_requester_auth_user_id,
      v_change_request_id,
      'activate without simulation',
      'policy-no-sim-activate',
      '{"test": true}'::jsonb
    );

    raise exception 'activation should have required simulation';
  exception
    when others then
      if sqlerrm not like '%policy change simulation is required before activation%' then
        raise;
      end if;
  end;
end $$;
