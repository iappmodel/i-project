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
    'file:///tmp/archive-fail.json',
    repeat('b', 64),
    null,
    'archive-verification-fail-manifest',
    '{"test": true}'::jsonb
  );

  update admin_security_archive_manifests
  set status = 'sealed',
      sealed_at = now(),
      record_count = 3
  where id = v_manifest_id;

  v_job_id := enqueue_admin_security_archive_verification_job(
    v_manifest_id,
    'archive-verification-fail-enqueue',
    '{"test": true}'::jsonb
  );

  update admin_security_archive_verification_jobs
  set status = 'running',
      attempt_count = 1
  where id = v_job_id;

  perform complete_admin_security_archive_verification_job(
    v_job_id,
    repeat('c', 64),
    2,
    true,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_archive_verification_jobs
    where id = v_job_id
      and status = 'failed'
      and checksum_match is false
      and record_count_match is false
  ) then
    raise exception 'archive verification job did not fail correctly';
  end if;

  if not exists (
    select 1
    from admin_security_alert_events
    where alert_key = 'admin_security_archive_verification_failed'
      and metadata->>'archive_verification_job_id' = v_job_id::text
  ) then
    raise exception 'archive verification failure alert missing';
  end if;
end $$;
