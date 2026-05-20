do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_event_id uuid;
  v_entry_id uuid;
begin
  v_event_id := record_admin_security_trust_timeline_event(
    'other',
    v_source_id,
    'chain-smoke-subject',
    'system',
    'chain_smoke_event',
    'created',
    'other',
    v_source_id,
    'chain-smoke-source',
    'Chain Smoke Event',
    'Chain smoke test.',
    'system',
    null,
    null,
    null,
    null,
    'Chain Corp',
    'chain.example.com',
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
    'chain-smoke',
    '{"test": true}'::jsonb
  );

  v_entry_id := chain_admin_security_trust_timeline_event(
    v_event_id,
    'chain-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_timeline_chain_entries
    where id = v_entry_id
      and sequence_number = 1
      and chain_hash_sha256 is not null
  ) then
    raise exception 'timeline event was not chained';
  end if;
end $$;
