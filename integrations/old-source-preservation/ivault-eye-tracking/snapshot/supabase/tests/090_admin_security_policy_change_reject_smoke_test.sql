do $$
declare
  v_requester_auth_user_id uuid := gen_random_uuid();
  v_reviewer_auth_user_id uuid := gen_random_uuid();

  v_requester_admin_user_id uuid;
  v_reviewer_admin_user_id uuid;

  v_change_request_id uuid;
  v_draft_policy_id uuid;
  v_challenge_id uuid;
begin
  v_requester_admin_user_id := upsert_admin_user(
    v_requester_auth_user_id,
    'policy-change-reject-requester@example.com',
    'Policy Change Reject Requester',
    'active',
    '{"test": true}'::jsonb
  );

  v_reviewer_admin_user_id := upsert_admin_user(
    v_reviewer_auth_user_id,
    'policy-change-reject-reviewer@example.com',
    'Policy Change Reject Reviewer',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_requester_auth_user_id, 'super_admin', null, 'reject requester bootstrap');
  perform assign_admin_role(v_reviewer_auth_user_id, 'super_admin', null, 'reject reviewer bootstrap');

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
    v_requester_auth_user_id,
    v_requester_admin_user_id,
    'totp',
    'totp',
    'active',
    'Reject Requester Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_requester_auth_user_id,
    'stub',
    'privileged_action',
    'policy-change-reject-create-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_requester_auth_user_id,
    v_challenge_id,
    '000000',
    'policy-change-reject-create-mfa',
    '{"test": true}'::jsonb
  );

  v_change_request_id := create_admin_security_policy_change_request(
    v_requester_auth_user_id,
    'create_policy',
    'policy_change_reject_smoke',
    'Reject smoke policy',
    'Testing rejection.',
    null,
    'rejected_smoke_policy',
    'Rejected Smoke Policy',
    'general',
    'high',
    'platform',
    'A policy that should be rejected.',
    'high',
    'policy-change-reject-create',
    '{"test": true}'::jsonb
  );

  select draft_policy_id
  into v_draft_policy_id
  from admin_security_policy_change_requests
  where id = v_change_request_id;

  perform submit_admin_security_policy_change_request(
    v_requester_auth_user_id,
    v_change_request_id,
    'reject this',
    'policy-change-reject-submit',
    '{"test": true}'::jsonb
  );

  perform reject_admin_security_policy_change_request(
    v_reviewer_auth_user_id,
    v_change_request_id,
    'not acceptable',
    'policy-change-reject',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_policy_change_requests
    where id = v_change_request_id
      and status = 'rejected'
  ) then
    raise exception 'policy change request was not rejected';
  end if;

  if not exists (
    select 1
    from admin_security_governance_policies
    where id = v_draft_policy_id
      and status = 'archived'
  ) then
    raise exception 'rejected draft policy was not archived';
  end if;
end $$;
