do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_period_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'audit-period-no-snapshot@example.com',
    'Audit Period No Snapshot',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'audit period no snapshot bootstrap'
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
  values (
    v_admin_auth_user_id,
    v_admin_user_id,
    'totp',
    'totp',
    'active',
    'Audit No Snapshot Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_period_id := create_admin_security_audit_period(
    v_admin_auth_user_id,
    'audit_period_no_snapshot_smoke',
    'Audit Period No Snapshot Smoke',
    'internal',
    now() - interval '30 days',
    now(),
    'Smoke test no snapshot.',
    'platform',
    'audit-period-no-snapshot-create',
    '{"test": true}'::jsonb
  );

  perform open_admin_security_audit_period(
    v_admin_auth_user_id,
    v_period_id,
    'open',
    'audit-period-no-snapshot-open',
    '{"test": true}'::jsonb
  );

  perform close_admin_security_audit_period(
    v_admin_auth_user_id,
    v_period_id,
    'close',
    'audit-period-no-snapshot-close',
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'audit-period-no-snapshot-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'audit-period-no-snapshot-mfa',
    '{"test": true}'::jsonb
  );

  begin
    perform seal_admin_security_audit_period(
      v_admin_auth_user_id,
      v_period_id,
      'seal should fail',
      'audit-period-no-snapshot-seal',
      '{"test": true}'::jsonb
    );

    raise exception 'audit period seal should require snapshot';
  exception
    when others then
      if sqlerrm not like '%audit period requires at least one built snapshot before sealing%' then
        raise;
      end if;
  end;
end $$;
