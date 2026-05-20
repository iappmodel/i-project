do $$
declare
  v_report_id uuid;
  v_link jsonb;
  v_link_id uuid;
  v_qr_id uuid;
  v_job_id uuid;
begin
  insert into admin_security_trust_proof_reports (
    report_key,status,report_scope,report_type,report_format,title,customer_name,customer_domain,report_payload,report_hash_sha256,
    payload_bytes,html_storage_uri,signature_algorithm,signing_key_version,signature,signed_at,generated_at,expires_at
  )
  values (
    'proof-qr-report-smoke','ready','admin','admin_internal','html','Proof QR Report Smoke','Proof QR Corp',
    'proofqr.example.com','{"ok": true}'::jsonb,repeat('e', 64),1000,'file:///tmp/proof-qr-report.html',
    'HMAC-SHA256','trust-proof-report-signing-v1',repeat('f', 64),now(),now(),now() + interval '1 day'
  )
  returning id into v_report_id;

  v_link := create_admin_security_proof_verification_link(
    'trust_proof_report',
    v_report_id,
    null,
    null,
    null,
    'https://example.com/verify/link',
    now() + interval '1 day',
    null,
    'proof-qr-link-create',
    '{"test": true}'::jsonb
  );

  v_link_id := (v_link->>'verificationLinkId')::uuid;

  v_qr_id := create_admin_security_proof_qr_code(
    v_link_id,
    'svg',
    512,
    false,
    'proof-qr-create',
    '{"test": true}'::jsonb
  );

  select qr_job_id
  into v_job_id
  from claim_admin_security_proof_qr_code_jobs(
    10,
    'qr-worker',
    '{"test": true}'::jsonb
  )
  where qr_code_id = v_qr_id;

  if v_job_id is null then
    raise exception 'qr job was not claimed';
  end if;

  perform complete_admin_security_proof_qr_code_generation(
    v_qr_id,
    v_job_id,
    'file:///tmp/proof-qr.svg',
    repeat('a', 64),
    1000,
    'qr-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_proof_qr_codes
    where id = v_qr_id
      and status = 'ready'
      and image_checksum_sha256 = repeat('a', 64)
  ) then
    raise exception 'qr code was not completed';
  end if;
end $$;
