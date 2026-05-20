do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_target_user_id uuid := gen_random_uuid();
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'mfa-required-admin@example.com',
    'MFA Required Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'mfa required smoke bootstrap'
  );

  begin
    perform admin_add_trust_score_component(
      v_admin_auth_user_id,
      v_target_user_id,
      'mfa_required_test',
      'admin',
      0.0100,
      0.0000,
      1.0000,
      'mfa_required_test',
      'This should require MFA.',
      'mfa-required-test',
      '{"test": true}'::jsonb
    );

    raise exception 'admin write should have required MFA';
  exception
    when others then
      if sqlerrm not like '%recent MFA verification required%' then
        raise;
      end if;
  end;
end $$;
