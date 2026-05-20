do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_portal_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'proof-status-transparency-admin@example.com',
    'Proof Status Transparency Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'proof status transparency bootstrap');

  perform register_admin_security_proof_retention_subject(
    'trust_proof_report',
    gen_random_uuid(),
    'transparency-proof-status-report',
    'trust_proof_report',
    'transparency-proof-status-report',
    repeat('a', 64),
    'Proof Status Corp',
    'proofstatus.example.com',
    null,
    null,
    null,
    null,
    repeat('a', 64),
    1000,
    'customer_confidential',
    'proof_artifact',
    true,
    true,
    false,
    false,
    'transparency-proof-status-subject',
    '{"test": true}'::jsonb
  );

  v_portal_id := create_admin_security_trust_transparency_portal(
    v_admin_auth_user_id,
    'customer_trust_center',
    'private',
    'proof-status-transparency-smoke',
    'Proof Status Transparency Smoke',
    null,
    null,
    'Proof Status Corp',
    'proofstatus.example.com',
    null,
    null,
    null,
    true,
    true,
    false,
    '{}'::jsonb,
    '{}'::jsonb,
    'proof-status-transparency-create',
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_trust_transparency_portal(
    v_admin_auth_user_id,
    v_portal_id,
    'proof-status-transparency-publish',
    '{"test": true}'::jsonb
  );

  perform sync_admin_security_published_proof_status(
    v_portal_id,
    1000,
    'proof-status-worker',
    'proof-status-sync',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_published_proof_status
    where transparency_portal_id = v_portal_id
      and proof_key = 'transparency-proof-status-report'
      and status = 'published'
  ) then
    raise exception 'published proof status missing';
  end if;
end $$;
