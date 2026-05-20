do $$
declare
  v_subject_id uuid;
  v_session jsonb;
  v_token text;
begin
  v_subject_id := register_admin_security_artifact_viewer_subject(
    null,
    'other',
    gen_random_uuid(),
    'security_document',
    'viewer-expired-artifact',
    'Viewer Expired Artifact',
    'Viewer expired session test.',
    null,
    null,
    null,
    repeat('e', 64),
    1000,
    'auto',
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
    'Viewer Expired Corp',
    'viewerexpired.example.com',
    null,
    null,
    null,
    'viewer-expired-register',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  update admin_security_artifact_viewer_subjects
  set status = 'ready'
  where id = v_subject_id;

  perform upsert_admin_security_artifact_viewer_item(
    v_subject_id,
    null,
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
    repeat('f', 64),
    100,
    false,
    null,
    0,
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  v_session := create_admin_security_artifact_viewer_session(
    v_subject_id,
    'customer',
    null,
    'expiredviewer@example.com',
    'Expired Viewer',
    null,
    null,
    null,
    null,
    null,
    1,
    200,
    null,
    'smoke-test',
    'viewer-expired-session',
    '{"test": true}'::jsonb
  );

  v_token := v_session->>'viewerToken';

  update admin_security_artifact_viewer_sessions
  set expires_at = now() - interval '1 minute'
  where id = (v_session->>'viewerSessionId')::uuid;

  begin
    perform resolve_admin_security_artifact_viewer_session(
      v_token,
      null,
      null,
      null,
      null,
      'smoke-test',
      'viewer-expired-resolve',
      '{"test": true}'::jsonb
    );

    raise exception 'expired viewer session should have failed';
  exception
    when others then
      if sqlerrm not like '%viewer session expired%' then
        raise;
      end if;
  end;
end $$;
