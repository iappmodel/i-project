do $$
declare
  v_review_id uuid;
begin
  v_review_id := create_admin_incident_review(
    'admin_security_alert_event',
    gen_random_uuid(),
    'critical',
    'Overdue smoke review',
    'Overdue smoke review summary',
    null,
    null,
    now() - interval '1 minute',
    'incident-overdue-create',
    '{"test": true}'::jsonb
  );

  perform mark_overdue_admin_incident_reviews(
    500,
    '{"test": true, "scope": "overdue_review"}'::jsonb
  );

  if not exists (
    select 1
    from admin_incident_reviews
    where id = v_review_id
      and status = 'overdue'
  ) then
    raise exception 'incident review was not marked overdue';
  end if;

  if not exists (
    select 1
    from admin_security_alert_events
    where alert_key = 'admin_incident_review_overdue'
      and metadata->>'admin_incident_review_id' = v_review_id::text
  ) then
    raise exception 'overdue incident review alert missing';
  end if;
end $$;
