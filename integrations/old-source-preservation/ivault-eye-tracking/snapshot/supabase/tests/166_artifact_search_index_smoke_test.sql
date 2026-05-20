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
    'search-smoke-artifact',
    'Search Smoke Artifact',
    'Search smoke test.',
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
    'Search Corp',
    'search.example.com',
    null,
    null,
    null,
    'search-viewer-register',
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
    'Searchable security document',
    'This document contains encryption controls and incident response procedures.',
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
    'search-document-register',
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
    'search-smoke-artifact',
    null,
    'overview',
    'Overview',
    'Searchable security document',
    'Security controls',
    'This document contains encryption controls and incident response procedures.',
    12,
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
    'search-worker',
    '{"test": true}'::jsonb
  );

  v_session := create_admin_security_artifact_search_session(
    'customer',
    null,
    'search@example.com',
    'Search User',
    null,
    null,
    null,
    null,
    null,
    'Search Corp',
    'search.example.com',
    60,
    100,
    null,
    'smoke-test',
    'search-session',
    '{"test": true}'::jsonb
  );

  v_token := v_session->>'searchToken';

  v_result := execute_admin_security_artifact_search(
    v_token,
    'encryption controls',
    'keyword',
    20,
    null,
    null,
    'smoke-test',
    'search-execute',
    '{"test": true}'::jsonb
  );

  if (v_result->>'resultCount')::integer < 1 then
    raise exception 'expected at least one search result, got %', v_result;
  end if;
end $$;
