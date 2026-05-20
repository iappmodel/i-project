do $$
declare
  v_report_id uuid;
  v_subject_id uuid;
begin
  insert into admin_security_trust_proof_reports (
    report_key,
    status,
    report_scope,
    report_type,
    report_format,
    title,
    customer_name,
    customer_domain,
    report_payload,
    report_hash_sha256,
    payload_bytes,
    html_storage_uri,
    signature_algorithm,
    signing_key_version,
    signature,
    signed_at,
    generated_at
  )
  values (
    'trust-proof-report-download-smoke',
    'ready',
    'admin',
    'admin_internal',
    'html',
    'Trust Proof Report Download Smoke',
    'Download Corp',
    'download.example.com',
    '{"ok": true}'::jsonb,
    repeat('a', 64),
    1000,
    'file:///tmp/trust-proof-report-download.html',
    'HMAC-SHA256',
    'trust-proof-report-signing-v1',
    repeat('b', 64),
    now(),
    now()
  )
  returning id into v_report_id;

  v_subject_id := register_trust_proof_report_download_subject(
    v_report_id,
    'report-download-subject',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_artifact_download_subjects
    where id = v_subject_id
      and source_type = 'admin_security_trust_proof_report'
      and source_id = v_report_id
  ) then
    raise exception 'trust proof report download subject was not registered';
  end if;
end $$;
