do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_target_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_component_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'smoke-admin@example.com',
    'Smoke Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'smoke test'
  );

  v_component_id := admin_add_trust_score_component(
    v_admin_auth_user_id,
    v_target_user_id,
    'smoke_admin_component',
    'admin',
    0.0100,
    -0.0100,
    1.0000,
    'smoke_admin_component',
    'Smoke admin component.',
    'smoke-request-id',
    '{"test": true}'::jsonb
  );

  if v_component_id is null then
    raise exception 'admin trust component was not created';
  end if;

  if not exists (
    select 1
    from admin_action_audit_log
    where admin_auth_user_id = v_admin_auth_user_id
      and action_key = 'admin_add_trust_score_component'
      and decision = 'allowed'
  ) then
    raise exception 'admin action audit log missing';
  end if;
end $$;
