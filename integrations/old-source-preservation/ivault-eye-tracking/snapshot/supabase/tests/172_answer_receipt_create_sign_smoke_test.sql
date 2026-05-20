do $$
declare
  v_viewer_subject_id uuid;
  v_item_id uuid;
  v_document_id uuid;
  v_chunk_id uuid;
  v_session jsonb;
  v_token text;
  v_answer jsonb;
  v_answer_request_id uuid;
  v_receipt_id uuid;
  v_claimed_id uuid;
begin
  v_viewer_subject_id := register_admin_security_artifact_viewer_subject(
    null,
    'other',
    gen_random_uuid(),
    'security_document',
    'receipt-smoke-artifact',
    'Receipt Smoke Artifact',
    'Receipt smoke test.',
    'text/plain',
    'txt',
    null,
    repeat('a', 64),
    1000,
    'text',
    true,
    false,
    false,
    true,
    'customer_scoped',
    'customer_confidential',
    'customer_safe',
    50,
    10485760,
    now() + interval '1 day',
    'Receipt Corp',
    'receipt.example.com',
    null,
    null,
    null,
    'receipt-viewer-register',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  update admin_security_artifact_viewer_subjects
  set status = 'ready'
  where id = v_viewer_subject_id;

  v_item_id := upsert_admin_security_artifact_viewer_item(
    v_viewer_subject_id,
    null,
    'overview',
    'metadata',
    null,
    'overview',
    'Overview',
    'Encryption controls',
    'Encryption summary.',
    null,
    null,
    '{"control": "encryption"}'::jsonb,
    null,
    null,
    repeat('b', 64),
    100,
    false,
    null,
    0,
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  v_document_id := register_admin_security_artifact_search_document(
    v_viewer_subject_id,
    'receipt-document-register',
    '{"test": true}'::jsonb
  );

  update admin_security_artifact_search_documents
  set status = 'indexing'
  where id = v_document_id;

  v_chunk_id := upsert_admin_security_artifact_search_chunk(
    v_document_id,
    v_viewer_subject_id,
    v_item_id,
    'overview:chunk:0',
    'section',
    'other',
    gen_random_uuid(),
    'security_document',
    'receipt-smoke-artifact',
    null,
    'overview',
    'Overview',
    'Encryption controls',
    'Encryption evidence',
    'The platform uses encryption controls for protected answer receipt artifacts.',
    20,
    null,
    'not_required',
    'local-keyword-placeholder',
    'v1',
    null,
    null,
    null,
    false,
    null,
    0,
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  perform complete_admin_security_artifact_search_document_indexing(
    v_document_id,
    1,
    1,
    'local-keyword-placeholder',
    'v1',
    'receipt-worker',
    '{"test": true}'::jsonb
  );

  v_session := create_admin_security_evidence_answer_session(
    'customer',
    null,
    'receipt@example.com',
    'Receipt User',
    null,
    null,
    null,
    null,
    null,
    'Receipt Corp',
    'receipt.example.com',
    60,
    100,
    false,
    true,
    true,
    null,
    'smoke-test',
    'receipt-answer-session',
    '{"test": true}'::jsonb
  );

  v_token := v_session->>'answerToken';

  v_answer := generate_admin_security_evidence_answer(
    v_token,
    'What encryption controls exist?',
    8,
    null,
    null,
    'smoke-test',
    'receipt-answer-generate',
    '{"test": true}'::jsonb
  );

  v_answer_request_id := (v_answer->>'answerRequestId')::uuid;

  v_receipt_id := create_admin_security_answer_receipt(
    v_answer_request_id,
    'receipt-create',
    '{"test": true}'::jsonb
  );

  select answer_receipt_id
  into v_claimed_id
  from claim_admin_security_answer_receipts_for_signing(
    10,
    'receipt-sign-worker',
    '{"test": true}'::jsonb
  )
  where answer_receipt_id = v_receipt_id;

  if v_claimed_id is null then
    raise exception 'answer receipt was not claimed';
  end if;

  perform complete_admin_security_answer_receipt_signing(
    v_receipt_id,
    '{"ok": true}'::jsonb,
    repeat('c', 64),
    1000,
    repeat('d', 64),
    'receipt-sign-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_answer_receipts
    where id = v_receipt_id
      and status = 'signed'
      and signature = repeat('d', 64)
  ) then
    raise exception 'answer receipt was not signed';
  end if;
end $$;
