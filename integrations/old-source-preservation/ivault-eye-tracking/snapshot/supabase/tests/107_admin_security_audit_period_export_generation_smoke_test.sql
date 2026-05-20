do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_period_id uuid;
  v_snapshot_id uuid;
  v_export_id uuid;
  v_claimed_id uuid;
  v_challenge_id uuid;
  v_item_count integer;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'audit-period-export-admin@example.com',
    'Audit Period Export Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'audit period export bootstrap'
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
    'Audit Period Export Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_period_id := create_admin_security_audit_period(
    v_admin_auth_user_id,
    'audit_period_export_smoke',
    'Audit Period Export Smoke',
    'internal',
    now() - interval '30 days',
    now(),
    'Smoke test audit period export.',
    'platform',
    'audit-period-export-create',
    '{"test": true}'::jsonb
  );

  perform open_admin_security_audit_period(
    v_admin_auth_user_id,
    v_period_id,
    'open',
    'audit-period-export-open',
    '{"test": true}'::jsonb
  );

  v_snapshot_id := build_admin_security_audit_period_snapshot(
    v_admin_auth_user_id,
    v_period_id,
    'control_coverage',
    'audit_period_export_smoke_control_coverage',
    'Control coverage snapshot',
    'audit-period-export-snapshot',
    '{"test": true}'::jsonb
  );

  perform seal_admin_security_audit_period_snapshot(
    v_admin_auth_user_id,
    v_snapshot_id,
    'seal snapshot',
    'audit-period-export-snapshot-seal',
    '{"test": true}'::jsonb
  );

  perform close_admin_security_audit_period(
    v_admin_auth_user_id,
    v_period_id,
    'close',
    'audit-period-export-close',
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'audit-period-export-seal-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'audit-period-export-seal-mfa',
    '{"test": true}'::jsonb
  );

  perform seal_admin_security_audit_period(
    v_admin_auth_user_id,
    v_period_id,
    'seal period',
    'audit-period-export-seal',
    '{"test": true}'::jsonb
  );

  v_export_id := request_admin_security_audit_period_export(
    v_admin_auth_user_id,
    v_period_id,
    'full_period_bundle',
    'json',
    null,
    'audit-period-export-request',
    '{"test": true}'::jsonb
  );

  perform approve_admin_security_audit_period_export(
    v_admin_auth_user_id,
    v_export_id,
    'approved export',
    'audit-period-export-approve',
    '{"test": true}'::jsonb
  );

  select export_request_id
  into v_claimed_id
  from claim_admin_security_audit_period_exports(
    5,
    'audit-period-export-worker',
    '{"test": true}'::jsonb
  )
  where export_request_id = v_export_id;

  if v_claimed_id is null then
    raise exception 'audit period export was not claimed';
  end if;

  v_item_count := build_admin_security_audit_period_export_items(
    v_export_id,
    '{"test": true}'::jsonb
  );

  if v_item_count <= 2 then
    raise exception 'audit period export item count too low';
  end if;

  perform complete_admin_security_audit_period_export(
    v_export_id,
    'file:///tmp/audit-period-export-smoke.json',
    repeat('d', 64),
    12345,
    v_item_count,
    'audit-period-export-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_audit_period_export_requests
    where id = v_export_id
      and status = 'ready'
      and checksum_sha256 = repeat('d', 64)
      and expires_at is not null
  ) then
    raise exception 'audit period export was not completed ready';
  end if;
end $$;
