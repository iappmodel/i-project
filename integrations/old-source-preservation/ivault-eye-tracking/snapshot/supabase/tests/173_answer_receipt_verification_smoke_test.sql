do $$
declare
  v_answer_request_id uuid := gen_random_uuid();
  v_receipt_id uuid;
  v_result jsonb;
begin
  insert into admin_security_evidence_answer_requests (
    id,
    answer_request_key,
    status,
    answer_scope,
    question_text,
    normalized_question,
    answer_text,
    answer_status,
    confidence_score,
    evidence_score,
    retrieved_chunk_count,
    cited_chunk_count
  )
  values (
    v_answer_request_id,
    'receipt-verify-answer-request',
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
    receipt_key,
    status,
    answer_request_id,
    answer_scope,
    question_text,
    normalized_question,
    answer_text,
    answer_status,
    confidence_score,
    evidence_score,
    retrieved_chunk_count,
    cited_chunk_count,
    receipt_payload,
    receipt_hash_sha256,
    payload_bytes,
    signature_algorithm,
    signing_key_version,
    signature,
    signed_at,
    valid_from,
    valid_until
  )
  values (
    'answer-receipt-verify-smoke',
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

  v_result := verify_admin_security_answer_receipt(
    'answer-receipt-verify-smoke',
    repeat('e', 64),
    repeat('f', 64),
    true,
    null,
    'verify@example.com',
    null,
    'smoke-test',
    'receipt-verify',
    '{"test": true}'::jsonb
  );

  if (v_result->>'verificationStatus') <> 'verified' then
    raise exception 'expected verified receipt, got %', v_result;
  end if;
end $$;
