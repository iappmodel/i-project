do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_event_id uuid;
begin
  v_event_id := record_admin_security_trust_timeline_event(
    'other',
    v_source_id,
    'timeline-immutable-subject',
    'system',
    'immutable_event',
    'created',
    'other',
    v_source_id,
    'timeline-immutable-source',
    'Timeline Immutable Event',
    'Timeline immutability smoke test.',
    'system',
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
    'timeline-immutable',
    '{"test": true}'::jsonb
  );

  begin
    update admin_security_trust_timeline_events
    set title = 'Mutated Title'
    where id = v_event_id;

    raise exception 'timeline event mutation should have failed';
  exception
    when others then
      if sqlerrm not like '%trust timeline events are immutable%' then
        raise;
      end if;
  end;
end $$;
