do $$
declare
  v_subject_id uuid;
  v_grant_payload jsonb;
  v_token text;
  v_resolved jsonb;
  v_completion_id uuid;
begin
  v_subject_id := register_admin_security_artifact_download_subject(
    'other',
    gen_random_uuid(),
    'security_document',
    'download-smoke-artifact',
    'Download Smoke Artifact',
    'Download smoke test.',
    'file:///tmp/download-smoke.pdf',
    repeat('a', 64),
    1000,
    'HMAC-SHA256',
    'test-key',
    repeat('b', 64),
    now(),
    'customer_scoped',
    'customer_confidential',
    true,
    true,
    false,
    false,
    now() + interval '1 day',
    'Download Corp',
    'download.example.com',
    null,
    null,
    null,
    'download-subject',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  v_grant_payload := create_admin_security_artifact_download_grant(
    null,
    v_subject_id,
    'customer',
    null,
    'download@example.com',
    'Download User',
    null,
    null,
    null,
    null,
    null,
    null,
    3,
    15,
    null,
    'smoke-test',
    'download-grant',
    '{"test": true}'::jsonb
  );

  v_token := v_grant_payload->>'downloadToken';

  v_resolved := resolve_admin_security_artifact_download_grant(
    v_token,
    null,
    null,
    'smoke-test',
    'download-resolve',
    '{"test": true}'::jsonb
  );

  if (v_resolved->>'artifactKey') <> 'download-smoke-artifact' then
    raise exception 'download resolve returned wrong artifact';
  end if;

  v_completion_id := complete_admin_security_artifact_download(
    (v_resolved->>'downloadGrantId')::uuid,
    (v_resolved->>'attemptId')::uuid,
    1000,
    repeat('a', 64),
    v_resolved->>'signedUrl',
    'download-complete',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_artifact_download_completions
    where id = v_completion_id
  ) then
    raise exception 'download completion was not recorded';
  end if;
end $$;
