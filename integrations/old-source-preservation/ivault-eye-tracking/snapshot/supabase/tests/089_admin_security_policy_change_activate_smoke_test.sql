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
    'policy-change-requester@example.com',
    'Policy Change Requester',
    'active',
    '{"test": true}'::jsonb
  );

  v_approver_admin_user_id := upsert_admin_user(
    v_approver_auth_user_id,
    'policy-change-approver@example.com',
    'Policy Change Approver',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_requester_auth_user_id,
    'super_admin',
    null,
    'policy change requester bootstrap'
  );

  perform assign_admin_role(
    v_approver_auth_user_id,
    'super_admin',
    null,
    'policy change approver bootstrap'
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
  values
    (
      v_requester_auth_user_id,
      v_requester_admin_user_id,
      'totp',
      'totp',
      'active',
      'Requester Policy Factor',
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
      'Approver Policy Factor',
      'v1.fake.fake.fake',
      'v1',
      now(),
      '{"test": true}'::jsonb
    );

  v_challenge_id := create_admin_mfa_challenge(
    v_requester_auth_user_id,
    'stub',
    'privileged_action',
    'policy-change-activate-create-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_requester_auth_user_id,
    v_challenge_id,
    '000000',
    'policy-change-activate-create-mfa',
    '{"test": true}'::jsonb
  );

  v_change_request_id := create_admin_security_policy_change_request(
    v_requester_auth_user_id,
    'create_policy',
    'policy_change_activate_smoke',
    'Activate smoke policy',
    'Testing policy activation.',
    null,
    'activated_smoke_policy',
    'Activated Smoke Policy',
    'general',
    'high',
    'platform',
    'A policy activated by smoke test.',
    'high',
    'policy-change-activate-create',
    '{"test": true}'::jsonb
  );

  select draft_policy_id
  into v_draft_policy_id
  from admin_security_policy_change_requests
  where id = v_change_request_id;

  perform submit_admin_security_policy_change_request(
    v_requester_auth_user_id,
    v_change_request_id,
    'ready for approval',
    'policy-change-activate-submit',
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_approver_auth_user_id,
    'stub',
    'privileged_action',
    'policy-change-activate-approve-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_approver_auth_user_id,
    v_challenge_id,
    '000000',
    'policy-change-activate-approve-mfa',
    '{"test": true}'::jsonb
  );

  perform approve_admin_security_policy_change_request(
    v_approver_auth_user_id,
    v_change_request_id,
    'approved activation smoke policy',
    'policy-change-activate-approve',
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_requester_auth_user_id,
    'stub',
    'privileged_action',
    'policy-change-activate-activate-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_requester_auth_user_id,
    v_challenge_id,
    '000000',
    'policy-change-activate-activate-mfa',
    '{"test": true}'::jsonb
  );

  perform activate_admin_security_policy_change_request(
    v_requester_auth_user_id,
    v_change_request_id,
    'activate approved smoke policy',
    'policy-change-activate',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_policy_change_requests
    where id = v_change_request_id
      and status = 'activated'
      and activated_at is not null
  ) then
    raise exception 'policy change request was not activated';
  end if;

  if not exists (
    select 1
    from admin_security_governance_policies
    where id = v_draft_policy_id
      and status = 'active'
  ) then
    raise exception 'draft policy was not activated';
  end if;
end $$;
