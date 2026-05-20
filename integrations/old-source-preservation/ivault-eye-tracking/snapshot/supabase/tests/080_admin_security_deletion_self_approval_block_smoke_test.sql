do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_manifest_id uuid;
  v_deletion_request_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'deletion-self-approval@example.com',
    'Deletion Self Approval',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'deletion self approval bootstrap'
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
    'Self Approval Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_manifest_id := create_admin_security_archive_manifest(
    'admin_security_notification_delivery',
    now() - interval '600 days',
    now() - interval '400 days',
    'external_archive_stub',
    's3://example/security/self-approval.json',
    repeat('f', 64),
    null,
    'deletion-self-approval-manifest',
    '{"test": true}'::jsonb
  );

  update admin_security_archive_manifests
  set status = 'verified',
      sealed_at = now(),
      verified_at = now()
  where id = v_manifest_id;

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'deletion-self-create-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'deletion-self-create-mfa',
    '{"test": true}'::jsonb
  );

  v_deletion_request_id := create_admin_security_deletion_request(
    v_admin_auth_user_id,
    'admin_security_notification_delivery',
    now() - interval '600 days',
    now() - interval '400 days',
    'self approval should not be allowed',
    'deletion-self-create',
    '{"test": true}'::jsonb
  );

  begin
    perform approve_admin_security_deletion_request(
      v_admin_auth_user_id,
      v_deletion_request_id,
      'self approval',
      'deletion-self-approve',
      '{"test": true}'::jsonb
    );

    raise exception 'self approval should have failed';
  exception
    when others then
      if sqlerrm not like '%deletion request requires approval by a second admin%' then
        raise;
      end if;
  end;
end $$;
