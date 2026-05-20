do $$
declare
  v_report_id uuid;
  v_job_id uuid;
begin
  v_report_id := create_admin_security_trust_proof_report(
    'admin',
    'admin_internal',
    'html',
    'Smoke Trust Proof Report',
    'Smoke Test',
    'Smoke report.',
    'Report Corp',
    'report.example.com',
    null,
    null,
    null,
    null,
    null,
    null,
    'report@example.com',
    'Report User',
    now() - interval '1 day',
    now() + interval '1 day',
    'report-create',
    '{"test": true}'::jsonb
  );

  select report_job_id
  into v_job_id
  from claim_admin_security_trust_proof_report_jobs(
    10,
    'report-worker',
    '{"test": true}'::jsonb
  )
  where report_id = v_report_id;

  if v_job_id is null then
    raise exception 'trust proof report job was not claimed';
  end if;

  perform upsert_admin_security_trust_proof_report_section(
    v_report_id,
    'cover',
    'cover',
    'Cover',
    'Smoke',
    'Smoke cover.',
    '{"ok": true}'::jsonb,
    null,
    null,
    0,
    0,
    '{"test": true}'::jsonb
  );

  perform upsert_admin_security_trust_proof_report_file(
    v_report_id,
    'report-html',
    'report_html',
    'trust-proof-report.html',
    'text/html',
    'file:///tmp/trust-proof-report.html',
    repeat('a', 64),
    1000,
    'HMAC-SHA256',
    'trust-proof-report-signing-v1',
    repeat('b', 64),
    now(),
    '{"test": true}'::jsonb
  );

  perform complete_admin_security_trust_proof_report_build(
    v_report_id,
    v_job_id,
    '{"ok": true}'::jsonb,
    repeat('c', 64),
    1000,
    'file:///tmp/trust-proof-report.html',
    null,
    'file:///tmp/trust-proof-report.json',
    repeat('d', 64),
    'report-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_proof_reports
    where id = v_report_id
      and status = 'ready'
      and report_hash_sha256 = repeat('c', 64)
  ) then
    raise exception 'trust proof report was not completed';
  end if;
end $$;
