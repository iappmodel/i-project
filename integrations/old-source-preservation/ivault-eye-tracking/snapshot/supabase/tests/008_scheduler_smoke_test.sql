do $$
declare
  v_run_id uuid;
begin
  v_run_id := run_scheduled_job(
    'reward_issuance_every_minute',
    'smoke_test',
    '{"test": true}'::jsonb
  );

  if v_run_id is null then
    raise exception 'scheduled reward job did not create run';
  end if;

  if not exists (
    select 1
    from scheduled_job_runs
    where id = v_run_id
      and status in ('completed', 'skipped_locked')
  ) then
    raise exception 'scheduled reward job did not complete or skip-lock';
  end if;

  v_run_id := run_scheduled_job(
    'accounting_mirror_every_minute',
    'smoke_test',
    '{"test": true}'::jsonb
  );

  if v_run_id is null then
    raise exception 'scheduled accounting job did not create run';
  end if;

  v_run_id := run_scheduled_job(
    'audit_hash_backfill_hourly',
    'smoke_test',
    '{"test": true}'::jsonb
  );

  if v_run_id is null then
    raise exception 'scheduled audit backfill job did not create run';
  end if;

  v_run_id := run_scheduled_job(
    'audit_hash_verify_daily',
    'smoke_test',
    '{"test": true}'::jsonb
  );

  if v_run_id is null then
    raise exception 'scheduled audit verify job did not create run';
  end if;
end $$;
