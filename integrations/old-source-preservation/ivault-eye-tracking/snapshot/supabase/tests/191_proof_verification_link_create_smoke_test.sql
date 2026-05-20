do $$
declare
  v_report_id uuid;
  v_link jsonb;
begin
  insert into admin_security_trust_proof_reports (
    report_key,status,report_scope,report_type,report_format,title,customer_name,customer_domain,report_payload,report_hash_sha256,
    payload_bytes,html_storage_uri,signature_algorithm,signing_key_version,signature,signed_at,generated_at,expires_at
  )
  values (
    'proof-link-report-smoke','ready','admin','admin_internal','html','Proof Link Report Smoke','Proof Link Corp',
    'prooflink.example.com','{"ok": true}'::jsonb,repeat('a', 64),1000,'file:///tmp/proof-link-report.html',
    'HMAC-SHA256','trust-proof-report-signing-v1',repeat('b', 64),now(),now(),now() + interval '1 day'
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
    'proof-link-create',
    '{"test": true}'::jsonb
  );

  if v_link->>'verificationUrl' is null then
    raise exception 'verification URL was not created';
  end if;

  if not exists (
    select 1
    from admin_security_proof_verification_links
    where id = (v_link->>'verificationLinkId')::uuid
      and proof_key = 'proof-link-report-smoke'
      and proof_hash_sha256 = repeat('a', 64)
  ) then
    raise exception 'verification link was not stored';
  end if;
end $$;
