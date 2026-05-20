do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_portal_id uuid;
  v_grant_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'transparency-access-admin@example.com',
    'Transparency Access Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'transparency access bootstrap');

  v_portal_id := create_admin_security_trust_transparency_portal(
    v_admin_auth_user_id,
    'customer_trust_center',
    'invite_only',
    'transparency-access-smoke',
    'Transparency Access Smoke',
    null,
    null,
    'Access Corp',
    'access.example.com',
    null,
    null,
    null,
    true,
    true,
    true,
    '{}'::jsonb,
    '{}'::jsonb,
    'transparency-access-create',
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_trust_transparency_portal(
    v_admin_auth_user_id,
    v_portal_id,
    'transparency-access-publish',
    '{"test": true}'::jsonb
  );

  v_grant_id := grant_admin_security_trust_transparency_access(
    v_admin_auth_user_id,
    v_portal_id,
    'customer',
    'customer@example.com',
    'Customer Reviewer',
    'proofs',
    true,
    true,
    false,
    false,
    5,
    now() + interval '30 days',
    'transparency-access-grant',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_transparency_access_grants
    where id = v_grant_id
      and status = 'active'
  ) then
    raise exception 'transparency access grant missing';
  end if;
end $$;
