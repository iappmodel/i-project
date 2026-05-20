do $$
declare
  v_snapshot_id uuid;
begin
  v_snapshot_id := create_admin_security_daily_snapshot(
    current_date,
    '{"test": true, "scope": "daily_snapshot"}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_daily_snapshots
    where id = v_snapshot_id
      and snapshot_date = current_date
      and status in ('healthy', 'warning', 'critical')
  ) then
    raise exception 'admin security daily snapshot was not created';
  end if;

  if not exists (
    select 1
    from admin_security_daily_snapshots
    where id = v_snapshot_id
      and jsonb_typeof(posture_checks) = 'array'
      and jsonb_typeof(priority_queue_sample) = 'array'
      and jsonb_typeof(actor_rollup_sample) = 'array'
  ) then
    raise exception 'admin security daily snapshot json samples invalid';
  end if;
end $$;
