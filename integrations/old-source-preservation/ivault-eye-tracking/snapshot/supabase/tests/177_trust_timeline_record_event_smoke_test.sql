do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_event_id uuid;
begin
  v_event_id := record_admin_security_trust_timeline_event(
    'other',
    v_source_id,
    'timeline-smoke-subject',
    'system',
    'smoke_event',
    'created',
    'other',
    v_source_id,
    'timeline-smoke-source',
    'Timeline Smoke Event',
    'Timeline smoke test.',
    'system',
    null,
    null,
    'system@example.com',
    'System',
    'Timeline Corp',
    'timeline.example.com',
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
    'timeline-smoke',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_timeline_events
    where id = v_event_id
      and event_type = 'smoke_event'
      and immutable_hash_sha256 is not null
  ) then
    raise exception 'timeline event was not recorded';
  end if;
end $$;
