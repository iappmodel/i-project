do $$
declare
  v_manifest_id uuid;
  v_job_id uuid;
  v_claimed_job_id uuid;
begin
  v_manifest_id := create_admin_security_archive_manifest(
    'admin_security_alert_event',
    now() - interval '1 year',
    now() - interval '180 days',
    'local_file',
    null,
    null,
    null,
    'archive-export-job-manifest',
    '{"test": true}'::jsonb
  );

  v_job_id := enqueue_admin_security_archive_export_job(
    v_manifest_id,
    'local_file',
    'archive-export-job-enqueue',
    '{"test": true}'::jsonb
  );

  select job_id
  into v_claimed_job_id
  from claim_admin_security_archive_export_jobs(
    10,
    'archive-export-smoke-worker',
    '{"test": true}'::jsonb
  )
  where job_id = v_job_id;

  if v_claimed_job_id is null then
    raise exception 'archive export job was not claimed';
  end if;

  perform mark_admin_security_archive_export_running(
    v_job_id,
    '{"test": true}'::jsonb
  );

  perform complete_admin_security_archive_export_job(
    v_job_id,
    'file:///tmp/archive-smoke.json',
    repeat('a', 64),
    1234,
    0,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_archive_export_jobs
    where id = v_job_id
      and status = 'completed'
      and completed_at is not null
  ) then
    raise exception 'archive export job was not completed';
  end if;

  if not exists (
    select 1
    from admin_security_archive_manifests
    where id = v_manifest_id
      and status = 'sealed'
      and storage_uri = 'file:///tmp/archive-smoke.json'
      and checksum_sha256 = repeat('a', 64)
  ) then
    raise exception 'archive manifest was not sealed by export job';
  end if;
end $$;
