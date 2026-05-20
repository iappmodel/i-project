do $$
declare
  v_snapshot_id uuid;
  v_observability_run_id uuid;
  v_alert_count integer;
begin
  v_snapshot_id := create_system_health_snapshot(
    'manual',
    '{"test": true}'::jsonb
  );

  if v_snapshot_id is null then
    raise exception 'system health snapshot was not created';
  end if;

  if not exists (
    select 1
    from system_health_snapshots
    where id = v_snapshot_id
  ) then
    raise exception 'system health snapshot row missing';
  end if;

  v_alert_count := evaluate_alert_rules(
    '{"test": true}'::jsonb
  );

  if v_alert_count is null then
    raise exception 'alert evaluation returned null';
  end if;

  v_observability_run_id := run_observability_snapshot_job(
    '{"test": true}'::jsonb
  );

  if v_observability_run_id is null then
    raise exception 'observability run was not created';
  end if;

  if not exists (
    select 1
    from observability_runs
    where id = v_observability_run_id
      and status = 'completed'
  ) then
    raise exception 'observability run did not complete';
  end if;

  if not exists (
    select 1
    from platform_operations_dashboard
  ) then
    raise exception 'platform operations dashboard returned no rows';
  end if;
end $$;
