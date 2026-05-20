do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_auditor_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_portal_id uuid;
  v_portal_key text;
  v_packet_id uuid;
  v_packet_key text;
  v_payload jsonb;
  v_question_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'auditor-participant-admin@example.com',
    'Auditor Participant Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'auditor participant bootstrap');

  v_portal_id := create_admin_security_auditor_portal(
    v_admin_auth_user_id,
    'Participant Audit Firm',
    'participant-audit.example.com',
    'Participant Audit LLC',
    'Participant Customer Corp',
    'participantcustomer.com',
    'security_review',
    'Participant review.',
    'Participant Auditor Portal',
    'Auditor portal participant test.',
    null,
    null,
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    'auditor-participant-create',
    '{"test": true}'::jsonb
  );

  select portal_key into v_portal_key
  from admin_security_auditor_portals
  where id = v_portal_id;

  perform invite_admin_security_auditor_portal_participant(
    v_admin_auth_user_id,
    v_portal_id,
    'participant-auditor@example.com',
    'Participant Auditor',
    'auditor',
    v_auditor_auth_user_id,
    'Participant Audit LLC',
    'auditor-participant-invite',
    '{"test": true}'::jsonb
  );

  v_packet_id := create_admin_security_auditor_evidence_packet(
    v_admin_auth_user_id,
    v_portal_id,
    'evidence_packet',
    'Participant Evidence Packet',
    'Participant packet.',
    'Review packet.',
    null,
    null,
    null,
    null,
    true,
    true,
    'participant-packet-create',
    '{"test": true}'::jsonb
  );

  perform add_admin_security_auditor_evidence_packet_item(
    v_admin_auth_user_id,
    v_packet_id,
    'manual_reference',
    'manual_reference',
    null,
    'Participant control summary',
    'Safe control summary.',
    'participant-control-summary',
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
    'participant-packet-publish',
    '{"test": true}'::jsonb
  );

  select packet_key into v_packet_key
  from admin_security_auditor_evidence_packets
  where id = v_packet_id;

  perform publish_admin_security_auditor_portal(
    v_admin_auth_user_id,
    v_portal_id,
    'portal ready',
    'participant-portal-publish',
    '{"test": true}'::jsonb
  );

  v_payload := list_auditor_portal_for_participant(
    v_auditor_auth_user_id,
    v_portal_key,
    'participant-read',
    '{"test": true}'::jsonb
  );

  if jsonb_array_length(v_payload->'evidencePackets') <> 1 then
    raise exception 'auditor participant did not see evidence packet';
  end if;

  v_question_id := submit_auditor_question(
    v_auditor_auth_user_id,
    v_portal_key,
    'Question about MFA',
    'Can you clarify the MFA control scope?',
    'medium',
    'authentication',
    null,
    null,
    'participant-question',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_auditor_questions
    where id = v_question_id
      and status = 'open'
  ) then
    raise exception 'auditor question was not submitted';
  end if;
end $$;
