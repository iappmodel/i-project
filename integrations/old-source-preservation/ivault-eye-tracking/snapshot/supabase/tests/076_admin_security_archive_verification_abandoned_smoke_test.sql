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
    'file:///tmp/archive-abandoned.json',
    repeat('d', 64),
    null,
    'archive-verification-abandoned-manifest',
    '{"test": true}'::jsonb
  );

  update admin_security_archive_manifests
  set status = 'sealed',
      sealed_at = now()
  where id = v_manifest_id;

  v_job_id := enqueue_admin_security_archive_verification_job(
    v_manifest_id,
    'archive-verification-abandoned-enqueue',
    '{"test": true}'::jsonb
  );

  update admin_security_archive_verification_jobs
  set attempt_count = 5,
      max_attempts = 5
  where id = v_job_id;

  perform fail_admin_security_archive_verification_job(
    v_job_id,
    'archive file unavailable',
    60,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_archive_verification_jobs
    where id = v_job_id
      and status = 'abandoned'
      and last_error = 'archive file unavailable'
  ) then
    raise exception 'archive verification job was not abandoned';
  end if;

  if not exists (
    select 1
    from admin_security_alert_events
    where alert_key = 'admin_security_archive_verification_abandoned'
      and metadata->>'archive_verification_job_id' = v_job_id::text
  ) then
    raise exception 'archive verification abandoned alert missing';
  end if;
end $$;
