do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_manifest_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'archive-manifest-admin@example.com',
    'Archive Manifest Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'archive manifest smoke bootstrap'
  );

  v_manifest_id := create_admin_security_archive_manifest(
    'admin_security_alert_event',
    now() - interval '1 year',
    now() - interval '180 days',
    'external_archive_stub',
    null,
    null,
    v_admin_auth_user_id,
    'archive-manifest-create',
    '{"test": true}'::jsonb
  );

  perform seal_admin_security_archive_manifest(
    v_admin_auth_user_id,
    v_manifest_id,
    's3://example/security/archive.json',
    repeat('a', 64),
    'archive-manifest-seal',
    '{"test": true}'::jsonb
  );

  perform verify_admin_security_archive_manifest(
    v_admin_auth_user_id,
    v_manifest_id,
    'archive-manifest-verify',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_archive_manifests
    where id = v_manifest_id
      and status = 'verified'
      and sealed_at is not null
      and verified_at is not null
  ) then
    raise exception 'archive manifest lifecycle failed';
  end if;

  perform run_audit_hash_backfill_job(
    1000,
    '{"test": true, "scope": "archive_manifest_hash"}'::jsonb
  );

  if exists (
    select 1
    from audit_hash_missing_records
    where source_type = 'admin_security_archive_manifest'
      and source_id = v_manifest_id
  ) then
    raise exception 'archive manifest hash missing';
  end if;
end $$;
