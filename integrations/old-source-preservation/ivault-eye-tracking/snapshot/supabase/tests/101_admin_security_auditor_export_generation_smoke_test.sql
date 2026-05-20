do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_auditor_auth_user_id uuid := gen_random_uuid();
  v_auditor_id uuid;
  v_framework_id uuid;
  v_export_id uuid;
  v_claimed_id uuid;
  v_challenge_id uuid;
  v_item_count integer;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'auditor-export-generation-admin@example.com',
    'Auditor Export Generation Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'auditor export generation bootstrap'
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
    'Auditor Export Generation Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'auditor-export-generation-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'auditor-export-generation-mfa',
    '{"test": true}'::jsonb
  );

  v_auditor_id := create_admin_security_auditor(
    v_admin_auth_user_id,
    v_auditor_auth_user_id,
    'external',
    'Generation Audit Firm',
    'Generation Auditor',
    'generation-auditor@example.com',
    'Export generation smoke.',
    now(),
    now() + interval '30 days',
    'auditor-export-generation-create',
    '{"test": true}'::jsonb
  );

  select id
  into v_framework_id
  from admin_security_control_frameworks
  where framework_key = 'soc2';

  perform grant_admin_security_auditor_access(
    v_admin_auth_user_id,
    v_auditor_id,
    'framework',
    v_framework_id,
    null,
    null,
    null,
    null,
    null,
    null,
    true,
    'auditor-export-generation-grant',
    '{"test": true}'::jsonb
  );

  v_export_id := request_admin_security_auditor_export(
    v_auditor_auth_user_id,
    'framework_evidence_bundle',
    'soc2',
    null,
    null,
    null,
    'auditor-export-generation-request',
    '{"test": true}'::jsonb
  );

  perform approve_admin_security_auditor_export(
    v_admin_auth_user_id,
    v_export_id,
    'approved for smoke test',
    'auditor-export-generation-approve',
    '{"test": true}'::jsonb
  );

  select export_request_id
  into v_claimed_id
  from claim_admin_security_auditor_exports(
    5,
    'auditor-export-generation-worker',
    '{"test": true}'::jsonb
  )
  where export_request_id = v_export_id;

  if v_claimed_id is null then
    raise exception 'auditor export was not claimed';
  end if;

  v_item_count := build_admin_security_auditor_export_items(
    v_export_id,
    '{"test": true}'::jsonb
  );

  if v_item_count <= 1 then
    raise exception 'auditor export item count too low';
  end if;

  perform complete_admin_security_auditor_export(
    v_export_id,
    'file:///tmp/auditor-export-generation-smoke.json',
    repeat('a', 64),
    1234,
    v_item_count,
    'auditor-export-generation-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_auditor_export_requests
    where id = v_export_id
      and status = 'ready'
      and checksum_sha256 = repeat('a', 64)
      and expires_at is not null
  ) then
    raise exception 'auditor export was not completed ready';
  end if;
end $$;
