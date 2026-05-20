do $$
declare
  v_answer_request_id uuid := gen_random_uuid();
  v_receipt_id uuid;
  v_bundle_id uuid;
  v_job_id uuid;
begin
  insert into admin_security_evidence_answer_requests (
    id, answer_request_key, status, answer_scope, question_text, normalized_question,
    answer_text, answer_status, confidence_score, evidence_score, retrieved_chunk_count, cited_chunk_count
  )
  values (
    v_answer_request_id,
    'export-bundle-answer-request',
    'answered',
    'admin',
    'Do you have controls?',
    'do you have controls?',
    'Based on evidence: yes.',
    'answered',
    0.9,
    0.9,
    1,
    1
  );

  insert into admin_security_answer_receipts (
    receipt_key, status, answer_request_id, answer_scope, question_text, normalized_question,
    answer_text, answer_status, confidence_score, evidence_score, retrieved_chunk_count, cited_chunk_count,
    receipt_payload, receipt_hash_sha256, payload_bytes, signature_algorithm, signing_key_version, signature,
    signed_at, valid_from, valid_until
  )
  values (
    'answer-receipt-export-smoke',
    'signed',
    v_answer_request_id,
    'admin',
    'Do you have controls?',
    'do you have controls?',
    'Based on evidence: yes.',
    'answered',
    0.9,
    0.9,
    1,
    1,
    '{"ok": true}'::jsonb,
    repeat('a', 64),
    1000,
    'HMAC-SHA256',
    'answer-receipt-signing-v1',
    repeat('b', 64),
    now(),
    now() - interval '1 minute',
    now() + interval '1 day'
  )
  returning id into v_receipt_id;

  v_bundle_id := create_admin_security_answer_receipt_export_bundle(
    v_receipt_id,
    'receipt_export',
    'json',
    false,
    'export-bundle-create',
    '{"test": true}'::jsonb
  );

  select build_job_id
  into v_job_id
  from claim_admin_security_answer_receipt_export_bundle_jobs(
    10,
    'export-bundle-worker',
    '{"test": true}'::jsonb
  )
  where export_bundle_id = v_bundle_id;

  if v_job_id is null then
    raise exception 'export bundle job was not claimed';
  end if;

  perform upsert_admin_security_answer_receipt_export_bundle_item(
    v_bundle_id,
    'receipt-payload',
    'receipt_payload',
    'Receipt Payload',
    'Receipt payload.',
    'admin_security_answer_receipt',
    v_receipt_id,
    v_receipt_id,
    null,
    null,
    'answer-receipt-export-smoke',
    '{"ok": true}'::jsonb,
    null,
    null,
    0,
    '{"test": true}'::jsonb
  );

  perform upsert_admin_security_answer_receipt_export_bundle_file(
    v_bundle_id,
    'bundle-json',
    'receipt_json',
    'bundle.json',
    'application/json',
    'file:///tmp/bundle.json',
    repeat('c', 64),
    1000,
    'HMAC-SHA256',
    'answer-receipt-signing-v1',
    repeat('d', 64),
    now(),
    '{"test": true}'::jsonb
  );

  perform complete_admin_security_answer_receipt_export_bundle_build(
    v_bundle_id,
    v_job_id,
    'file:///tmp/bundle.json',
    repeat('c', 64),
    1000,
    '{"manifest": true}'::jsonb,
    repeat('d', 64),
    'export-bundle-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_answer_receipt_export_bundles
    where id = v_bundle_id
      and status = 'ready'
      and bundle_checksum_sha256 = repeat('c', 64)
  ) then
    raise exception 'export bundle was not completed';
  end if;
end $$;
