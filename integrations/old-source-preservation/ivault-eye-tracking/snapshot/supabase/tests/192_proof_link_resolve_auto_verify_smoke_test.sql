do $$
declare
  v_report_id uuid;
  v_link jsonb;
  v_url text;
  v_code text;
  v_token text;
  v_result jsonb;
begin
  insert into admin_security_trust_proof_reports (
    report_key,status,report_scope,report_type,report_format,title,customer_name,customer_domain,report_payload,report_hash_sha256,
    payload_bytes,html_storage_uri,signature_algorithm,signing_key_version,signature,signed_at,generated_at,expires_at
  )
  values (
    'proof-link-resolve-report-smoke','ready','admin','admin_internal','html','Proof Link Resolve Report Smoke',
    'Proof Link Resolve Corp','prooflinkresolve.example.com','{"ok": true}'::jsonb,repeat('c', 64),1000,
    'file:///tmp/proof-link-resolve-report.html','HMAC-SHA256','trust-proof-report-signing-v1',repeat('d', 64),
    now(),now(),now() + interval '1 day'
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
    'proof-link-resolve-create',
    '{"test": true}'::jsonb
  );

  v_url := v_link->>'verificationUrl';
  v_code := substring(v_url from 'code=([^&]+)');
  v_token := substring(v_url from 'token=([^&]+)');

  v_result := resolve_public_proof_verification_link(
    v_code,
    v_token,
    null,
    'smoke-test',
    null,
    'proof-link-resolve',
    '{"test": true}'::jsonb
  );

  if (v_result->'verificationResult'->>'verified')::boolean is not true then
    raise exception 'expected auto verification success, got %', v_result;
  end if;

  if not exists (
    select 1
    from admin_security_proof_verification_link_events
    where short_code = v_code
      and event_type = 'verification_completed'
      and verified is true
  ) then
    raise exception 'verification completed link event missing';
  end if;
end $$;
