do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_period_id uuid;
  v_snapshot_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'audit-period-admin@example.com',
    'Audit Period Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'audit period bootstrap'
  );

  v_period_id := create_admin_security_audit_period(
    v_admin_auth_user_id,
    'audit_period_snapshot_smoke',
    'Audit Period Snapshot Smoke',
    'internal',
    now() - interval '30 days',
    now(),
    'Smoke test audit period.',
    'platform',
    'audit-period-create',
    '{"test": true}'::jsonb
  );

  perform open_admin_security_audit_period(
    v_admin_auth_user_id,
    v_period_id,
    'open smoke period',
    'audit-period-open',
    '{"test": true}'::jsonb
  );

  v_snapshot_id := build_admin_security_audit_period_snapshot(
    v_admin_auth_user_id,
    v_period_id,
    'control_coverage',
    'audit_period_snapshot_smoke_control_coverage',
    'Control coverage snapshot',
    'audit-period-snapshot',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_audit_period_snapshots
    where id = v_snapshot_id
      and status = 'built'
      and item_count > 0
      and checksum_sha256 is not null
  ) then
    raise exception 'audit period snapshot was not built';
  end if;

  if not exists (
    select 1
    from admin_security_audit_period_snapshot_items
    where audit_period_snapshot_id = v_snapshot_id
  ) then
    raise exception 'audit period snapshot items missing';
  end if;
end $$;
