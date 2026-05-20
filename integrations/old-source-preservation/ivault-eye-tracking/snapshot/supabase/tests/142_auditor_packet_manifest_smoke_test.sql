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
  v_claimed_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'auditor-manifest-admin@example.com',
    'Auditor Manifest Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'auditor manifest bootstrap');

  v_portal_id := create_admin_security_auditor_portal(
    v_admin_auth_user_id,
    'Manifest Audit Firm',
    'manifest-audit.example.com',
    'Manifest Audit LLC',
    'Manifest Customer Corp',
    'manifestcustomer.com',
    'security_review',
    'Manifest review.',
    'Manifest Auditor Portal',
    'Auditor manifest portal test.',
    null,
    null,
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    'auditor-manifest-create',
    '{"test": true}'::jsonb
  );

  select portal_key into v_portal_key
  from admin_security_auditor_portals
  where id = v_portal_id;

  perform invite_admin_security_auditor_portal_participant(
    v_admin_auth_user_id,
    v_portal_id,
    'manifest-auditor@example.com',
    'Manifest Auditor',
    'auditor',
    v_auditor_auth_user_id,
    'Manifest Audit LLC',
    'auditor-manifest-invite',
    '{"test": true}'::jsonb
  );

  v_packet_id := create_admin_security_auditor_evidence_packet(
    v_admin_auth_user_id,
    v_portal_id,
    'evidence_packet',
    'Manifest Evidence Packet',
    'Manifest packet.',
    'Manifest packet scope.',
    null,
    null,
    null,
    null,
    true,
    true,
    'manifest-packet-create',
    '{"test": true}'::jsonb
  );

  perform add_admin_security_auditor_evidence_packet_item(
    v_admin_auth_user_id,
    v_packet_id,
    'manual_reference',
    'manual_reference',
    null,
    'Manifest item',
    'Manifest auditor-safe item.',
    'manifest-item',
    null,
    null,
    repeat('a', 64),
    repeat('b', 64),
    now(),
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
    'manifest-packet-publish',
    '{"test": true}'::jsonb
  );

  select packet_key into v_packet_key
  from admin_security_auditor_evidence_packets
  where id = v_packet_id;

  perform publish_admin_security_auditor_portal(
    v_admin_auth_user_id,
    v_portal_id,
    'portal ready',
    'manifest-portal-publish',
    '{"test": true}'::jsonb
  );

  v_manifest_id := request_auditor_packet_manifest_for_participant(
    v_auditor_auth_user_id,
    v_portal_key,
    v_packet_key,
    'json',
    null,
    'smoke-test',
    'manifest-request',
    '{"test": true}'::jsonb
  );

  select manifest_id
  into v_claimed_id
  from claim_admin_security_auditor_packet_manifests(
    5,
    'manifest-worker',
    '{"test": true}'::jsonb
  )
  where manifest_id = v_manifest_id;

  if v_claimed_id is null then
    raise exception 'manifest was not claimed';
  end if;

  perform complete_admin_security_auditor_packet_manifest(
    v_manifest_id,
    '{"ok": true}'::jsonb,
    'file:///tmp/auditor-manifest.json',
    repeat('c', 64),
    1000,
    repeat('d', 64),
    'manifest-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_auditor_packet_manifests
    where id = v_manifest_id
      and status = 'ready'
      and signature = repeat('d', 64)
      and signed_at is not null
  ) then
    raise exception 'manifest was not completed';
  end if;
end $$;
