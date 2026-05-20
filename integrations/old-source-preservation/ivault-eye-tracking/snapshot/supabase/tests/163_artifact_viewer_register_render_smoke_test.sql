do $$
declare
  v_subject_id uuid;
  v_job_id uuid;
  v_item_id uuid;
  v_session jsonb;
  v_token text;
  v_resolved jsonb;
begin
  v_subject_id := register_admin_security_artifact_viewer_subject(
    null,
    'other',
    gen_random_uuid(),
    'security_document',
    'viewer-smoke-artifact',
    'Viewer Smoke Artifact',
    'Viewer smoke test.',
    'application/pdf',
    'pdf',
    'file:///tmp/viewer-smoke.pdf',
    repeat('a', 64),
    1000,
    'pdf',
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
    'Viewer Corp',
    'viewer.example.com',
    null,
    null,
    null,
    'viewer-register',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  v_job_id := queue_admin_security_artifact_viewer_render_job(
    v_subject_id,
    'metadata_only',
    'viewer-render',
    '{"test": true}'::jsonb
  );

  update admin_security_artifact_viewer_render_jobs
  set status = 'processing'
  where id = v_job_id;

  v_item_id := upsert_admin_security_artifact_viewer_item(
    v_subject_id,
    v_job_id,
    'metadata',
    'metadata',
    null,
    'overview',
    'Overview',
    'Metadata',
    'Metadata preview.',
    null,
    null,
    '{"ok": true}'::jsonb,
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

  perform complete_admin_security_artifact_viewer_render_job(
    v_job_id,
    0,
    1,
    'viewer-worker',
    '{"test": true}'::jsonb
  );

  v_session := create_admin_security_artifact_viewer_session(
    v_subject_id,
    'customer',
    null,
    'viewer@example.com',
    'Viewer User',
    null,
    null,
    null,
    null,
    null,
    30,
    200,
    null,
    'smoke-test',
    'viewer-session',
    '{"test": true}'::jsonb
  );

  v_token := v_session->>'viewerToken';

  v_resolved := resolve_admin_security_artifact_viewer_session(
    v_token,
    null,
    null,
    null,
    null,
    'smoke-test',
    'viewer-resolve',
    '{"test": true}'::jsonb
  );

  if jsonb_array_length(v_resolved->'items') <> 1 then
    raise exception 'viewer resolve did not return item';
  end if;
end $$;
