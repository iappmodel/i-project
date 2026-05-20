do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_auditor_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_portal_id uuid;
  v_packet_id uuid;
  v_participant_id uuid;
  v_manifest_id uuid;
  v_result jsonb;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'auditor-verify-admin@example.com',
    'Auditor Verify Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'auditor verify bootstrap');

  v_portal_id := create_admin_security_auditor_portal(
    v_admin_auth_user_id,
    'Verify Audit Firm',
    'verify-audit.example.com',
    'Verify Audit LLC',
    'Verify Customer Corp',
    'verifycustomer.com',
    'security_review',
    'Verify review.',
    'Verify Auditor Portal',
    'Auditor verify portal test.',
    null,
    null,
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    'auditor-verify-create',
    '{"test": true}'::jsonb
  );

  v_participant_id := invite_admin_security_auditor_portal_participant(
    v_admin_auth_user_id,
    v_portal_id,
    'verify-auditor@example.com',
    'Verify Auditor',
    'auditor',
    v_auditor_auth_user_id,
    'Verify Audit LLC',
    'auditor-verify-invite',
    '{"test": true}'::jsonb
  );

  v_packet_id := create_admin_security_auditor_evidence_packet(
    v_admin_auth_user_id,
    v_portal_id,
    'evidence_packet',
    'Verify Evidence Packet',
    'Verify packet.',
    'Verify packet scope.',
    null,
    null,
    null,
    null,
    true,
    true,
    'verify-packet-create',
    '{"test": true}'::jsonb
  );

  perform add_admin_security_auditor_evidence_packet_item(
    v_admin_auth_user_id,
    v_packet_id,
    'manual_reference',
    'manual_reference',
    null,
    'Verify item',
    'Verify auditor-safe item.',
    'verify-item',
    null,
    null,
    null,
    null,
    null,
    true,
    true,
    false,
    1,
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_auditor_evidence_packet(
    v_admin_auth_user_id,
    v_packet_id,
    'packet ready',
    'verify-packet-publish',
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_auditor_portal(
    v_admin_auth_user_id,
    v_portal_id,
    'portal ready',
    'verify-portal-publish',
    '{"test": true}'::jsonb
  );

  insert into admin_security_auditor_packet_manifests (
    manifest_key,
    status,
    auditor_portal_id,
    evidence_packet_id,
    participant_id,
    manifest_type,
    export_format,
    title,
    summary,
    packet_key,
    portal_key,
    auditor_name,
    auditor_email,
    auditor_firm,
    customer_name,
    customer_domain,
    item_count,
    manifest_json,
    storage_uri,
    checksum_sha256,
    payload_bytes,
    signature_algorithm,
    signing_key_version,
    signature,
    signed_at,
    watermark,
    expires_at,
    requested_by_auth_user_id,
    requested_by_participant_id,
    generated_at,
    metadata
  )
  select
    'verify-auditor-manifest',
    'ready',
    p.id,
    ep.id,
    part.id,
    'participant_packet_manifest',
    'json',
    ep.title,
    ep.summary,
    ep.packet_key,
    p.portal_key,
    part.display_name,
    part.email,
    p.auditor_firm,
    p.customer_name,
    p.customer_domain,
    1,
    '{"ok": true}'::jsonb,
    'file:///tmp/verify-auditor-manifest.json',
    repeat('c', 64),
    1000,
    'HMAC-SHA256',
    'auditor-packet-signing-v1',
    repeat('d', 64),
    now(),
    'AUDITOR_PACKET=verify',
    now() + interval '14 days',
    v_auditor_auth_user_id,
    part.id,
    now(),
    '{"test": true}'::jsonb
  from admin_security_auditor_portals p
  join admin_security_auditor_evidence_packets ep
    on ep.auditor_portal_id = p.id
  join admin_security_auditor_portal_participants part
    on part.auditor_portal_id = p.id
  where p.id = v_portal_id
    and ep.id = v_packet_id
    and part.id = v_participant_id
  returning id into v_manifest_id;

  v_result := verify_admin_security_auditor_packet_manifest_public(
    'verify-auditor-manifest',
    repeat('c', 64),
    repeat('d', 64),
    true,
    null,
    'smoke-test',
    'verify-manifest',
    '{"test": true}'::jsonb
  );

  if (v_result->>'verificationStatus') <> 'verified' then
    raise exception 'expected verified manifest, got %', v_result;
  end if;
end $$;
