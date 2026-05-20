do $$
declare
  v_auth_user_id uuid := gen_random_uuid();
  v_source_id uuid := gen_random_uuid();
  v_approval_id uuid;
begin
  perform upsert_admin_user(
    v_auth_user_id,
    'disclosure-self-second@example.com',
    'Disclosure Self Second',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_auth_user_id, 'super_admin', null, 'disclosure self bootstrap');

  v_approval_id := create_admin_security_disclosure_approval_request(
    v_auth_user_id,
    'enterprise_room_publication',
    'high',
    'admin_security_questionnaire_export',
    v_source_id,
    'Publish questionnaire export',
    'Approve publication.',
    'publish_to_enterprise_room',
    'Example Corp',
    null,
    now() + interval '7 days',
    'disclosure-self-create',
    '{"test": true}'::jsonb
  );

  begin
    perform decide_admin_security_disclosure_approval_request(
      v_auth_user_id,
      v_approval_id,
      'approved',
      'second_admin',
      'should fail',
      'disclosure-self-second',
      '{"test": true}'::jsonb
    );

    raise exception 'requester should not be able to second-admin approve own request';
  exception
    when others then
      if sqlerrm not like '%second admin approval cannot be performed by requester%' then
        raise;
      end if;
  end;
end $$;
