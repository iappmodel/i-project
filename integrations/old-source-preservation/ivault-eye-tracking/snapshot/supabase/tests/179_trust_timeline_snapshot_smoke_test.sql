do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_event_id uuid;
  v_snapshot_id uuid;
begin
  v_event_id := record_admin_security_trust_timeline_event(
    'other',
    v_source_id,
    'timeline-snapshot-subject',
    'system',
    'snapshot_event',
    'created',
    'other',
    v_source_id,
    'timeline-snapshot-source',
    'Timeline Snapshot Event',
    'Timeline snapshot smoke test.',
    'system',
    null,
    null,
    null,
    null,
    'Snapshot Corp',
    'snapshot.example.com',
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
    'timeline-snapshot-event',
    '{"test": true}'::jsonb
  );

  v_snapshot_id := create_admin_security_trust_timeline_snapshot(
    'customer',
    'Snapshot Corp Timeline',
    'Snapshot test.',
    'Snapshot Corp',
    'snapshot.example.com',
    null,
    null,
    null,
    now() - interval '1 hour',
    now() + interval '1 hour',
    'timeline-snapshot-create',
    '{"test": true}'::jsonb
  );

  perform build_admin_security_trust_timeline_snapshot(
    v_snapshot_id,
    'timeline-snapshot-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_timeline_snapshots
    where id = v_snapshot_id
      and status = 'ready'
      and event_count >= 1
      and snapshot_hash_sha256 is not null
  ) then
    raise exception 'timeline snapshot was not built';
  end if;
end $$;
