do $$
declare
  v_sub_id uuid;
  v_result jsonb;
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
    'proof-digest-process-smoke-subscription',
    'active',
    'global_admin',
    'admin',
    'digest-process@example.com',
    'Digest Process',
    'daily',
    'email',
    now() - interval '1 minute'
  )
  returning id into v_sub_id;

  perform record_admin_security_proof_notification_event(
    'global_admin',
    'public_verification_failed',
    'warning',
    'Public verification failed',
    'Smoke public verification failed.',
    null,
    null,
    null,
    null,
    null,
    null,
    'admin_security_public_verification_result',
    gen_random_uuid(),
    'result-process-smoke',
    'trust_proof_report',
    'report-process-smoke',
    repeat('b', 64),
    null,
    now(),
    'digest-process-smoke-event',
    'digest-process-event',
    '{"test": true}'::jsonb
  );

  v_result := process_due_admin_security_proof_digests(
    10,
    'digest-worker',
    'digest-process',
    '{"test": true}'::jsonb
  );

  if (v_result->>'built')::integer < 1 then
    raise exception 'expected at least one built digest, got %', v_result;
  end if;
end $$;
