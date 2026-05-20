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
    'file:///tmp/archive-pass.json',
    repeat('a', 64),
    null,
    'archive-verification-pass-manifest',
    '{"test": true}'::jsonb
  );

  update admin_security_archive_manifests
  set status = 'sealed',
      sealed_at = now(),
      record_count = 0
  where id = v_manifest_id;

  v_job_id := enqueue_admin_security_archive_verification_job(
    v_manifest_id,
    'archive-verification-pass-enqueue',
    '{"test": true}'::jsonb
  );

  select job_id
  into v_claimed_job_id
  from claim_admin_security_archive_verification_jobs(
    10,
    'archive-verification-smoke-worker',
    '{"test": true}'::jsonb
  )
  where job_id = v_job_id;

  if v_claimed_job_id is null then
    raise exception 'archive verification job was not claimed';
  end if;

  perform mark_admin_security_archive_verification_running(
    v_job_id,
    '{"test": true}'::jsonb
  );

  perform complete_admin_security_archive_verification_job(
    v_job_id,
    repeat('a', 64),
    0,
    true,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_archive_verification_jobs
    where id = v_job_id
      and status = 'passed'
      and checksum_match is true
      and record_count_match is true
      and payload_parse_ok is true
  ) then
    raise exception 'archive verification job did not pass';
  end if;

  if not exists (
    select 1
    from admin_security_archive_manifests
    where id = v_manifest_id
      and status = 'verified'
      and verified_at is not null
  ) then
    raise exception 'archive manifest was not promoted to verified';
  end if;
end $$;
