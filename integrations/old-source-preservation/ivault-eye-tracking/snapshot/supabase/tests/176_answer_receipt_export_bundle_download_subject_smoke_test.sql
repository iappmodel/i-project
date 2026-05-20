do $$
declare
  v_answer_request_id uuid := gen_random_uuid();
  v_receipt_id uuid;
  v_bundle_id uuid;
  v_subject_id uuid;
begin
  insert into admin_security_evidence_answer_requests (
    id, answer_request_key, status, answer_scope, question_text, normalized_question,
    answer_text, answer_status, confidence_score, evidence_score, retrieved_chunk_count, cited_chunk_count
  )
  values (
    v_answer_request_id,
    'export-download-answer-request',
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
    'answer-receipt-export-download-smoke',
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
    repeat('e', 64),
    1000,
    'HMAC-SHA256',
    'answer-receipt-signing-v1',
    repeat('f', 64),
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
    'export-download-create',
    '{"test": true}'::jsonb
  );

  update admin_security_answer_receipt_export_bundles
  set
    status = 'ready',
    bundle_storage_uri = 'file:///tmp/export-download.json',
    bundle_checksum_sha256 = repeat('a', 64),
    bundle_payload_bytes = 1000,
    signature_algorithm = 'HMAC-SHA256',
    signing_key_version = 'answer-receipt-signing-v1',
    signature = repeat('b', 64),
    signed_at = now()
  where id = v_bundle_id;

  v_subject_id := register_answer_receipt_export_bundle_download_subject(
    v_bundle_id,
    'export-download-subject',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_artifact_download_subjects
    where id = v_subject_id
      and source_type = 'admin_security_answer_receipt_export_bundle'
      and source_id = v_bundle_id
  ) then
    raise exception 'export bundle download subject was not registered';
  end if;
end $$;
