do $$
declare
  v_sub_id uuid;
  v_event_id uuid;
  v_run_id uuid;
begin
  insert into admin_security_proof_digest_subscriptions (
    subscription_key,
    status,
    subscription_scope,
    recipient_type,
    recipient_email,
    recipient_display_name,
    digest_frequency,
    digest_channel,
    next_digest_at
  )
  values (
    'proof-digest-build-smoke-subscription',
    'active',
    'global_admin',
    'admin',
    'digest-build@example.com',
    'Digest Build',
    'daily',
    'email',
    now()
  )
  returning id into v_sub_id;

  v_event_id := record_admin_security_proof_notification_event(
    'global_admin',
    'hash_mismatch_detected',
    'critical',
    'Hash mismatch detected',
    'A public proof verification hash mismatch was detected.',
    null,
    null,
    null,
    null,
    null,
    null,
    'admin_security_public_verification_result',
    gen_random_uuid(),
    'result-smoke',
    'trust_proof_report',
    'report-smoke',
    repeat('a', 64),
    null,
    now(),
    'digest-build-smoke-event',
    'digest-build-event',
    '{"test": true}'::jsonb
  );

  v_run_id := build_admin_security_proof_digest_run(
    v_sub_id,
    now() - interval '1 day',
    now() + interval '1 minute',
    'digest-worker',
    'digest-build-run',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_proof_digest_runs
    where id = v_run_id
      and status = 'ready'
      and event_count >= 1
      and critical_count >= 1
  ) then
    raise exception 'proof digest run was not built';
  end if;

  if not exists (
    select 1
    from admin_security_proof_digest_items
    where digest_run_id = v_run_id
      and notification_event_id = v_event_id
  ) then
    raise exception 'proof digest item was not created';
  end if;
end $$;
