do $$
declare
  v_profile_id uuid;
  v_manifest_id uuid;
  v_result jsonb;
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
    'verify-trust-center',
    'published',
    'public',
    'Verify Trust Corp',
    'verifytrust.example.com',
    'Verify Trust Center',
    'Verify trust center.',
    true,
    gen_random_uuid(),
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
    'verify-trust-center-manifest',
    'ready',
    v_profile_id,
    'verify-trust-center',
    'public_trust_center_manifest',
    'public',
    'Verify Trust Center',
    'Verify trust center.',
    'Verify Trust Corp',
    'verifytrust.example.com',
    '{"ok": true}'::jsonb,
    repeat('e', 64),
    1000,
    'HMAC-SHA256',
    'trust-center-signing-v1',
    repeat('f', 64),
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

  v_result := verify_public_trust_center_manifest(
    'verify-trust-center-manifest',
    repeat('e', 64),
    repeat('f', 64),
    true,
    null,
    'smoke-test',
    'verify-trust-center',
    '{"test": true}'::jsonb
  );

  if (v_result->>'verificationStatus') <> 'verified' then
    raise exception 'expected verified trust center manifest, got %', v_result;
  end if;
end $$;
