do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_event_id uuid;
  v_entry_id uuid;
  v_chain_id uuid;
  v_batch_id uuid;
  v_anchor_id uuid;
  v_result jsonb;
begin
  v_event_id := record_admin_security_trust_timeline_event(
    'other',
    v_source_id,
    'merkle-smoke-subject',
    'system',
    'merkle_smoke_event',
    'created',
    'other',
    v_source_id,
    'merkle-smoke-source',
    'Merkle Smoke Event',
    'Merkle smoke test.',
    'system',
    null,
    null,
    null,
    null,
    'Merkle Corp',
    'merkle.example.com',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'info',
    'admin_only',
    'restricted',
    null,
    'smoke-test',
    'merkle-smoke',
    '{"test": true}'::jsonb
  );

  v_entry_id := chain_admin_security_trust_timeline_event(
    v_event_id,
    'merkle-worker',
    '{"test": true}'::jsonb
  );

  select chain_id
  into v_chain_id
  from admin_security_trust_timeline_chain_entries
  where id = v_entry_id;

  v_batch_id := build_admin_security_trust_timeline_merkle_batch(
    v_chain_id,
    1,
    1,
    'merkle-batch-create',
    '{"test": true}'::jsonb
  );

  v_result := verify_admin_security_trust_timeline_merkle_batch(v_batch_id);

  if (v_result->>'verified')::boolean is not true then
    raise exception 'expected verified merkle batch, got %', v_result;
  end if;

  v_anchor_id := create_admin_security_trust_timeline_anchor(
    v_chain_id,
    null,
    v_batch_id,
    'internal',
    'merkle-anchor-create',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_timeline_anchors
    where id = v_anchor_id
      and anchored_hash_sha256 is not null
  ) then
    raise exception 'merkle anchor was not created';
  end if;
end $$;
