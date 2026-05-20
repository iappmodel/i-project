do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_room_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'enterprise-room-no-doc-admin@example.com',
    'Enterprise Room No Doc Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'enterprise no doc bootstrap');

  v_room_id := create_admin_security_enterprise_review_room(
    v_admin_auth_user_id,
    'No Doc Corp',
    'nodoc.com',
    'nodoc-corp',
    'No Doc Security Review',
    'No document room.',
    'enterprise_security_review',
    null,
    null,
    now(),
    now() + interval '30 days',
    true,
    true,
    'enterprise-no-doc-create',
    '{"test": true}'::jsonb
  );

  begin
    perform publish_admin_security_enterprise_review_room(
      v_admin_auth_user_id,
      v_room_id,
      'should fail',
      'enterprise-no-doc-publish',
      '{"test": true}'::jsonb
    );

    raise exception 'review room publish should require document grant';
  exception
    when others then
      if sqlerrm not like '%review room requires at least one active document grant before publishing%' then
        raise;
      end if;
  end;
end $$;
