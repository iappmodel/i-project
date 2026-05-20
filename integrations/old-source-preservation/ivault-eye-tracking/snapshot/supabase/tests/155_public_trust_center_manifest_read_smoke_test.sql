do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_profile_id uuid;
  v_manifest_id uuid;
  v_payload jsonb;
begin
  insert into admin_security_trust_center_profiles (
    trust_center_key,
    status,
    visibility,
    organization_name,
    organization_domain,
    title,
    summary,
    manifest_enabled,
    created_by_auth_user_id,
    public_metadata,
    internal_metadata
  )
  values (
    'public-read-trust-center',
    'published',
    'public',
    'Public Read Trust Corp',
    'publicread.example.com',
    'Public Read Trust Center',
    'Public read trust center.',
    true,
    v_admin_auth_user_id,
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  )
  on conflict (trust_center_key)
  do update set
    status = 'published',
    updated_at = now()
  returning id into v_profile_id;

  insert into admin_security_trust_center_manifests (
    manifest_key,
    status,
    trust_center_profile_id,
    trust_center_key,
    manifest_type,
    visibility,
    title,
    summary,
    organization_name,
    organization_domain,
    manifest_json,
    checksum_sha256,
    payload_bytes,
    signature_algorithm,
    signing_key_version,
    signature,
    signed_at,
    valid_from,
    valid_until,
    generated_at
  )
  values (
    'public-read-manifest',
    'ready',
    v_profile_id,
    'public-read-trust-center',
    'public_trust_center_manifest',
    'public',
    'Public Read Trust Center',
    'Public read trust center.',
    'Public Read Trust Corp',
    'publicread.example.com',
    '{"ok": true}'::jsonb,
    repeat('c', 64),
    1000,
    'HMAC-SHA256',
    'trust-center-signing-v1',
    repeat('d', 64),
    now(),
    now() - interval '1 minute',
    now() + interval '1 hour',
    now()
  )
  on conflict (manifest_key)
  do update set
    status = 'ready',
    trust_center_profile_id = excluded.trust_center_profile_id,
    trust_center_key = excluded.trust_center_key,
    manifest_json = excluded.manifest_json,
    checksum_sha256 = excluded.checksum_sha256,
    signature = excluded.signature,
    signed_at = excluded.signed_at,
    valid_from = excluded.valid_from,
    valid_until = excluded.valid_until,
    generated_at = excluded.generated_at,
    updated_at = now()
  returning id into v_manifest_id;

  v_payload := get_public_trust_center(
    'public-read-trust-center',
    'public-read',
    '{"test": true}'::jsonb
  );

  if (v_payload->'latestManifest'->>'manifestKey') <> 'public-read-manifest' then
    raise exception 'public trust center did not return latest manifest';
  end if;

  v_payload := get_latest_public_trust_center_manifest(
    'public-read-trust-center',
    'public-read-manifest',
    '{"test": true}'::jsonb
  );

  if (v_payload->>'checksumSha256') <> repeat('c', 64) then
    raise exception 'latest manifest returned wrong checksum';
  end if;
end $$;
