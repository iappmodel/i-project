do $$
declare
  v_detector_id uuid;
  v_run_id uuid;
  v_finding_id uuid;
  v_result jsonb;
  v_unique_key text := 'command-center-smoke-' || substr(encode(gen_random_bytes(8), 'hex'), 1, 16);
begin
  select id
  into v_detector_id
  from admin_security_trust_ai_detectors
  where detector_key = 'trust_ai_detector:verification_failure_spike'
  limit 1;

  if v_detector_id is null then
    raise exception 'trust ai detector trust_ai_detector:verification_failure_spike not seeded';
  end if;

  v_run_id := run_admin_security_trust_ai_analyst(
    'manual',
    null,
    null,
    null,
    'command-center-finding-worker',
    'command-center-finding-run',
    '{"test": true}'::jsonb
  );

  v_finding_id := create_admin_security_trust_ai_finding(
    v_run_id,
    v_detector_id,
    'command_center_smoke_finding',
    'Command center smoke finding',
    'Command center smoke finding summary.',
    'high',
    0.9,
    'Command Corp',
    'command.example.com',
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
    'command-finding-create',
    '{"test": true}'::jsonb
  );

  v_result := sync_admin_security_trust_command_center_queue(
    'Command Corp',
    'command.example.com',
    500,
    'command-center-worker',
    'command-queue-sync',
    '{"test": true}'::jsonb
  );

  if coalesce((v_result->>'queueItemsSynced')::integer, 0) < 1 then
    raise exception 'command queue sync expected at least one item, got %', v_result;
  end if;

  if not exists (
    select 1
    from admin_security_trust_command_center_queue
    where source_id = v_finding_id
      and queue_type = 'ai_finding'
  ) then
    raise exception 'command queue item missing for finding %', v_finding_id;
  end if;
end $$;
