do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_period_id uuid;
  v_snapshot_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'audit-period-seal@example.com',
    'Audit Period Seal',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'audit period seal bootstrap'
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
    'Audit Period Seal Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_period_id := create_admin_security_audit_period(
    v_admin_auth_user_id,
    'audit_period_seal_smoke',
    'Audit Period Seal Smoke',
    'internal',
    now() - interval '30 days',
    now(),
    'Smoke test sealed audit period.',
    'platform',
    'audit-period-seal-create',
    '{"test": true}'::jsonb
  );

  perform open_admin_security_audit_period(
    v_admin_auth_user_id,
    v_period_id,
    'open',
    'audit-period-seal-open',
    '{"test": true}'::jsonb
  );

  v_snapshot_id := build_admin_security_audit_period_snapshot(
    v_admin_auth_user_id,
    v_period_id,
    'control_coverage',
    'audit_period_seal_smoke_control_coverage',
    'Control coverage snapshot',
    'audit-period-seal-snapshot',
    '{"test": true}'::jsonb
  );

  perform seal_admin_security_audit_period_snapshot(
    v_admin_auth_user_id,
    v_snapshot_id,
    'seal snapshot',
    'audit-period-snapshot-seal',
    '{"test": true}'::jsonb
  );

  perform close_admin_security_audit_period(
    v_admin_auth_user_id,
    v_period_id,
    'close before seal',
    'audit-period-close',
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'audit-period-seal-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'audit-period-seal-mfa',
    '{"test": true}'::jsonb
  );

  perform seal_admin_security_audit_period(
    v_admin_auth_user_id,
    v_period_id,
    'seal period',
    'audit-period-seal',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_audit_periods
    where id = v_period_id
      and status = 'sealed'
      and seal_checksum_sha256 is not null
      and sealed_at is not null
  ) then
    raise exception 'audit period was not sealed';
  end if;
end $$;
