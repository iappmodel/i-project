do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_portal_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'trust-transparency-admin@example.com',
    'Trust Transparency Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'trust transparency bootstrap');

  v_portal_id := create_admin_security_trust_transparency_portal(
    v_admin_auth_user_id,
    'customer_trust_center',
    'private',
    'trust-transparency-smoke',
    'Trust Transparency Smoke',
    'Smoke trust center.',
    'Smoke transparency portal.',
    'Transparency Corp',
    'transparency.example.com',
    null,
    null,
    null,
    true,
    true,
    false,
    '{"theme": "default"}'::jsonb,
    '{"test": true}'::jsonb,
    'trust-transparency-create',
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_trust_transparency_portal(
    v_admin_auth_user_id,
    v_portal_id,
    'trust-transparency-publish',
    '{"test": true}'::jsonb
  );

  perform sync_admin_security_trust_transparency_portal(
    v_portal_id,
    'trust-transparency-worker',
    'trust-transparency-sync',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_transparency_portals
    where id = v_portal_id
      and status = 'published'
  ) then
    raise exception 'transparency portal was not published';
  end if;

  if not exists (
    select 1
    from admin_security_trust_transparency_portal_sections
    where transparency_portal_id = v_portal_id
      and status = 'active'
  ) then
    raise exception 'transparency portal sections missing';
  end if;
end $$;
