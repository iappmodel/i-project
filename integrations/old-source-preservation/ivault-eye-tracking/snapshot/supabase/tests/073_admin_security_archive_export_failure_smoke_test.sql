do $$
declare
  v_manifest_id uuid;
  v_job_id uuid;
begin
  v_manifest_id := create_admin_security_archive_manifest(
    'admin_security_alert_event',
    now() - interval '1 year',
    now() - interval '180 days',
    'local_file',
    null,
    null,
    null,
    'archive-export-failure-manifest',
    '{"test": true}'::jsonb
  );

  v_job_id := enqueue_admin_security_archive_export_job(
    v_manifest_id,
    'local_file',
    'archive-export-failure-enqueue',
    '{"test": true}'::jsonb
  );

  update admin_security_archive_export_jobs
  set attempt_count = 5,
      max_attempts = 5
  where id = v_job_id;

  perform fail_admin_security_archive_export_job(
    v_job_id,
    'storage unavailable',
    60,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_archive_export_jobs
    where id = v_job_id
      and status = 'abandoned'
      and last_error = 'storage unavailable'
  ) then
    raise exception 'archive export job was not abandoned';
  end if;

  if not exists (
    select 1
    from admin_security_archive_manifests
    where id = v_manifest_id
      and status = 'failed'
  ) then
    raise exception 'archive manifest was not marked failed';
  end if;
end $$;
