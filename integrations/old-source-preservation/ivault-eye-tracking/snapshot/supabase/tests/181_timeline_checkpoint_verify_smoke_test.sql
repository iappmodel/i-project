do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_event_id uuid;
  v_entry_id uuid;
  v_chain_id uuid;
  v_checkpoint_id uuid;
  v_result jsonb;
begin
  v_event_id := record_admin_security_trust_timeline_event(
    'other',
    v_source_id,
    'checkpoint-smoke-subject',
    'system',
    'checkpoint_smoke_event',
    'created',
    'other',
    v_source_id,
    'checkpoint-smoke-source',
    'Checkpoint Smoke Event',
    'Checkpoint smoke test.',
    'system',
    null,
    null,
    null,
    null,
    'Checkpoint Corp',
    'checkpoint.example.com',
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
    'checkpoint-smoke',
    '{"test": true}'::jsonb
  );

  v_entry_id := chain_admin_security_trust_timeline_event(
    v_event_id,
    'checkpoint-worker',
    '{"test": true}'::jsonb
  );

  select chain_id
  into v_chain_id
  from admin_security_trust_timeline_chain_entries
  where id = v_entry_id;

  v_checkpoint_id := create_admin_security_trust_timeline_chain_checkpoint(
    v_chain_id,
    'manual',
    'checkpoint-create',
    '{"test": true}'::jsonb
  );

  v_result := verify_admin_security_trust_timeline_chain(v_chain_id);

  if (v_result->>'verified')::boolean is not true then
    raise exception 'expected verified chain, got %', v_result;
  end if;

  if not exists (
    select 1
    from admin_security_trust_timeline_chain_checkpoints
    where id = v_checkpoint_id
      and checkpoint_hash_sha256 is not null
  ) then
    raise exception 'checkpoint was not created';
  end if;
end $$;
