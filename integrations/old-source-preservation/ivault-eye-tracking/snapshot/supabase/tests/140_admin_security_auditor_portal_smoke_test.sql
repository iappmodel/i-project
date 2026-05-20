do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_auditor_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_portal_id uuid;
  v_packet_id uuid;
  v_item_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'auditor-portal-admin@example.com',
    'Auditor Portal Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'auditor portal bootstrap');

  v_portal_id := create_admin_security_auditor_portal(
    v_admin_auth_user_id,
    'Example Audit Firm',
    'audit.example.com',
    'Example Audit LLC',
    'Audit Customer Corp',
    'auditcustomer.com',
    'security_review',
    'Review security controls and trust artifacts.',
    'Audit Customer Security Review',
    'External auditor portal.',
    null,
    null,
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    'auditor-portal-create',
    '{"test": true}'::jsonb
  );

  perform invite_admin_security_auditor_portal_participant(
    v_admin_auth_user_id,
    v_portal_id,
    'auditor@example.com',
    'Example Auditor',
    'lead_auditor',
    v_auditor_auth_user_id,
    'Example Audit LLC',
    'auditor-invite',
    '{"test": true}'::jsonb
  );

  v_packet_id := create_admin_security_auditor_evidence_packet(
    v_admin_auth_user_id,
    v_portal_id,
    'evidence_packet',
    'Security Evidence Packet',
    'Auditor-safe evidence packet.',
    'Security controls overview.',
    null,
    null,
    null,
    null,
    true,
    true,
    'auditor-packet-create',
    '{"test": true}'::jsonb
  );

  v_item_id := add_admin_security_auditor_evidence_packet_item(
    v_admin_auth_user_id,
    v_packet_id,
    'manual_reference',
    'manual_reference',
    null,
    'Security control summary',
    'Control summary safe for auditor review.',
    'control-summary',
    'cc6.1',
    'soc2',
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
    'auditor-packet-publish',
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_auditor_portal(
    v_admin_auth_user_id,
    v_portal_id,
    'portal ready',
    'auditor-portal-publish',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_auditor_portals
    where id = v_portal_id
      and status = 'published'
  ) then
    raise exception 'auditor portal was not published';
  end if;

  if not exists (
    select 1
    from admin_security_auditor_evidence_packets
    where id = v_packet_id
      and status = 'published'
      and item_count = 1
  ) then
    raise exception 'auditor evidence packet was not published';
  end if;
end $$;
