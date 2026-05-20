do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_alert_id uuid;
  v_manifest_id uuid;
  v_payload jsonb;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'archive-payload-admin@example.com',
    'Archive Payload Admin',
    'active',
    '{"test": true}'::jsonb
  );

  v_alert_id := create_admin_security_alert(
    'archive_payload_smoke_alert',
    'critical',
    v_admin_auth_user_id,
    v_admin_auth_user_id,
    'archive_payload_action',
    null,
    'Archive payload smoke alert.',
    '{"test": true}'::jsonb
  );

  v_manifest_id := create_admin_security_archive_manifest(
    'admin_security_alert_event',
    now() - interval '1 minute',
    now() + interval '1 minute',
    'local_file',
    null,
    null,
    null,
    'archive-payload-manifest',
    '{"test": true}'::jsonb
  );

  v_payload := build_admin_security_archive_payload(v_manifest_id);

  if (v_payload->>'source_type') <> 'admin_security_alert_event' then
    raise exception 'archive payload source type invalid';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(v_payload->'records') r
    where r->>'id' = v_alert_id::text
  ) then
    raise exception 'archive payload did not include expected alert';
  end if;
end $$;
