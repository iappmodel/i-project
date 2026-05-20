do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_detector_id uuid;
  v_run_id uuid;
  v_finding_id uuid;
  v_unique_key text := 'manual-smoke-' || substr(encode(gen_random_bytes(8), 'hex'), 1, 16);
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'ai-finding-admin@example.com',
    'AI Finding Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'ai finding bootstrap');

  select id
  into v_detector_id
  from admin_security_trust_ai_detectors
  where detector_key = 'trust_ai_detector:verification_failure_spike'
  limit 1;

  v_run_id := run_admin_security_trust_ai_analyst(
    'manual',
    null,
    null,
    null,
    'finding-worker',
    'finding-run',
    '{"test": true}'::jsonb
  );

  v_finding_id := create_admin_security_trust_ai_finding(
    v_run_id,
    v_detector_id,
    'manual_smoke_finding',
    'Manual smoke finding',
    'Manual smoke finding summary.',
    'medium',
    0.9,
    'Finding Corp',
    'finding.example.com',
    null,
    null,
    null,
    null,
    'smoke',
    gen_random_uuid(),
    v_unique_key,
    1,
    '{}'::jsonb,
    '{}'::jsonb,
    'Review manually.',
    '{}'::jsonb,
    false,
    false,
    false,
    'finding-create',
    '{"test": true}'::jsonb
  );

  perform acknowledge_admin_security_trust_ai_finding(
    v_admin_auth_user_id,
    v_finding_id,
    'finding-ack',
    '{"test": true}'::jsonb
  );

  perform resolve_admin_security_trust_ai_finding(
    v_admin_auth_user_id,
    v_finding_id,
    'Resolved in smoke test.',
    'finding-resolve',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_ai_findings
    where id = v_finding_id
      and status = 'resolved'
  ) then
    raise exception 'finding was not resolved';
  end if;
end $$;
