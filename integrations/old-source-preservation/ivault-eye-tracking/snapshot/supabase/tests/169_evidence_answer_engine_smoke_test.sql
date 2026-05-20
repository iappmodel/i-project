do $$
declare
  v_viewer_subject_id uuid;
  v_item_id uuid;
  v_document_id uuid;
  v_chunk_id uuid;
  v_session jsonb;
  v_token text;
  v_result jsonb;
begin
  v_viewer_subject_id := register_admin_security_artifact_viewer_subject(
    null,
    'other',
    gen_random_uuid(),
    'security_document',
    'answer-smoke-artifact',
    'Answer Smoke Artifact',
    'Answer smoke test.',
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
    'Answer Corp',
    'answer.example.com',
    null,
    null,
    null,
    'answer-viewer-register',
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
    'answer-document-register',
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
    'answer-smoke-artifact',
    null,
    'overview',
    'Overview',
    'Encryption controls',
    'Encryption evidence',
    'The platform uses encryption controls for protected trust artifacts and incident response documentation.',
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
    'answer-worker',
    '{"test": true}'::jsonb
  );

  v_session := create_admin_security_evidence_answer_session(
    'customer',
    null,
    'answer@example.com',
    'Answer User',
    null,
    null,
    null,
    null,
    null,
    'Answer Corp',
    'answer.example.com',
    60,
    100,
    false,
    true,
    true,
    null,
    'smoke-test',
    'answer-session',
    '{"test": true}'::jsonb
  );

  v_token := v_session->>'answerToken';

  v_result := generate_admin_security_evidence_answer(
    v_token,
    'What encryption controls exist?',
    8,
    null,
    null,
    'smoke-test',
    'answer-generate',
    '{"test": true}'::jsonb
  );

  if (v_result->>'answerStatus') <> 'answered' then
    raise exception 'expected answered, got %', v_result;
  end if;

  if jsonb_array_length(v_result->'citations') < 1 then
    raise exception 'expected at least one citation';
  end if;
end $$;
