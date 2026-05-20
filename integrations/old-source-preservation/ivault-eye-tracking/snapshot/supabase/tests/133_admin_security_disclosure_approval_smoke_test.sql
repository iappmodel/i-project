do $$
declare
  v_requester_auth_user_id uuid := gen_random_uuid();
  v_second_auth_user_id uuid := gen_random_uuid();
  v_source_id uuid := gen_random_uuid();
  v_approval_id uuid;
begin
  perform upsert_admin_user(
    v_requester_auth_user_id,
    'disclosure-requester@example.com',
    'Disclosure Requester',
    'active',
    '{"test": true}'::jsonb
  );

  perform upsert_admin_user(
    v_second_auth_user_id,
    'disclosure-second@example.com',
    'Disclosure Second Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_requester_auth_user_id, 'super_admin', null, 'disclosure requester bootstrap');
  perform assign_admin_role(v_second_auth_user_id, 'super_admin', null, 'disclosure second bootstrap');

  v_approval_id := create_admin_security_disclosure_approval_request(
    v_requester_auth_user_id,
    'enterprise_room_publication',
    'high',
    'admin_security_questionnaire_export',
    v_source_id,
    'Publish questionnaire export',
    'Approve publication of questionnaire export to enterprise room.',
    'publish_to_enterprise_room',
    'Example Corp',
    null,
    now() + interval '7 days',
    'disclosure-create',
    '{"test": true}'::jsonb
  );

  perform decide_admin_security_disclosure_approval_request(
    v_requester_auth_user_id,
    v_approval_id,
    'approved',
    'security',
    'security approved',
    'disclosure-security-approve',
    '{"test": true}'::jsonb
  );

  perform decide_admin_security_disclosure_approval_request(
    v_second_auth_user_id,
    v_approval_id,
    'approved',
    'second_admin',
    'second admin approved',
    'disclosure-second-approve',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_disclosure_approval_requests
    where id = v_approval_id
      and status = 'approved'
      and approved_at is not null
  ) then
    raise exception 'disclosure approval was not approved';
  end if;
end $$;
