do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_auditor_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_portal_id uuid;
  v_portal_key text;
  v_packet_id uuid;
  v_packet_key text;
  v_manifest_id uuid;
  v_manifest_key text;
  v_download jsonb;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'auditor-download-admin@example.com',
    'Auditor Download Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'auditor download bootstrap');

  v_portal_id := create_admin_security_auditor_portal(
    v_admin_auth_user_id,
    'Download Audit Firm',
    'download-audit.example.com',
    'Download Audit LLC',
    'Download Customer Corp',
    'downloadcustomer.com',
    'security_review',
    'Download review.',
    'Download Auditor Portal',
    'Auditor download portal test.',
    null,
    null,
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    'auditor-download-create',
    '{"test": true}'::jsonb
  );

  select portal_key into v_portal_key
  from admin_security_auditor_portals
  where id = v_portal_id;

  perform invite_admin_security_auditor_portal_participant(
    v_admin_auth_user_id,
    v_portal_id,
    'download-auditor@example.com',
    'Download Auditor',
    'auditor',
    v_auditor_auth_user_id,
    'Download Audit LLC',
    'auditor-download-invite',
    '{"test": true}'::jsonb
  );

  v_packet_id := create_admin_security_auditor_evidence_packet(
    v_admin_auth_user_id,
    v_portal_id,
    'evidence_packet',
    'Download Evidence Packet',
    'Download packet.',
    'Download packet scope.',
    null,
    null,
    null,
    null,
    true,
    true,
    'download-packet-create',
    '{"test": true}'::jsonb
  );

  perform add_admin_security_auditor_evidence_packet_item(
    v_admin_auth_user_id,
    v_packet_id,
    'manual_reference',
    'manual_reference',
    null,
    'Download item',
    'Download auditor-safe item.',
    'download-item',
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
    'download-packet-publish',
    '{"test": true}'::jsonb
  );

  select packet_key into v_packet_key
  from admin_security_auditor_evidence_packets
  where id = v_packet_id;

  perform publish_admin_security_auditor_portal(
    v_admin_auth_user_id,
    v_portal_id,
    'portal ready',
    'download-portal-publish',
    '{"test": true}'::jsonb
  );

  v_manifest_id := request_auditor_packet_manifest_for_participant(
    v_auditor_auth_user_id,
    v_portal_key,
    v_packet_key,
    'json',
    null,
    'smoke-test',
    'download-manifest-request',
    '{"test": true}'::jsonb
  );

  update admin_security_auditor_packet_manifests
  set
    status = 'ready',
    storage_uri = 'file:///tmp/download-manifest.json',
    checksum_sha256 = repeat('c', 64),
    payload_bytes = 1000,
    signature_algorithm = 'HMAC-SHA256',
    signing_key_version = 'auditor-packet-signing-v1',
    signature = repeat('d', 64),
    signed_at = now(),
    generated_at = now()
  where id = v_manifest_id;

  select manifest_key into v_manifest_key
  from admin_security_auditor_packet_manifests
  where id = v_manifest_id;

  v_download := register_auditor_packet_manifest_download(
    v_auditor_auth_user_id,
    v_portal_key,
    v_manifest_key,
    null,
    'smoke-test',
    'download-register',
    '{"test": true}'::jsonb
  );

  if (v_download->>'checksumSha256') <> repeat('c', 64) then
    raise exception 'download registration returned wrong checksum';
  end if;

  if not exists (
    select 1
    from admin_security_auditor_packet_download_requests
    where manifest_id = v_manifest_id
      and status = 'ready'
  ) then
    raise exception 'download request was not registered';
  end if;
end $$;
