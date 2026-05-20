do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_profile_id uuid;
  v_manifest_id uuid;
  v_claimed_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'trust-center-admin@example.com',
    'Trust Center Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'trust center bootstrap');

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
    created_by_admin_user_id,
    public_metadata,
    internal_metadata
  )
  values (
    'smoke-trust-center',
    'published',
    'public',
    'Smoke Trust Corp',
    'smoketrust.example.com',
    'Smoke Trust Center',
    'Smoke trust center.',
    true,
    v_admin_auth_user_id,
    v_admin_user_id,
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  )
  on conflict (trust_center_key)
  do update set
    status = 'published',
    updated_at = now()
  returning id into v_profile_id;

  v_manifest_id := queue_admin_security_trust_center_manifest_generation(
    v_admin_auth_user_id,
    'smoke-trust-center',
    'public',
    'trust-center-manifest-queue',
    '{"test": true}'::jsonb
  );

  select manifest_id
  into v_claimed_id
  from claim_admin_security_trust_center_manifests(
    5,
    'trust-center-worker',
    '{"test": true}'::jsonb
  )
  where manifest_id = v_manifest_id;

  if v_claimed_id is null then
    raise exception 'trust center manifest was not claimed';
  end if;

  perform complete_admin_security_trust_center_manifest(
    v_manifest_id,
    '{"ok": true}'::jsonb,
    'file:///tmp/trust-center-manifest.json',
    repeat('a', 64),
    1000,
    repeat('b', 64),
    1,
    2,
    3,
    4,
    'trust-center-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_center_manifests
    where id = v_manifest_id
      and status = 'ready'
      and checksum_sha256 = repeat('a', 64)
      and signature = repeat('b', 64)
  ) then
    raise exception 'trust center manifest was not completed';
  end if;
end $$;
