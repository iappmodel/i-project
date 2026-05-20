do $$
declare
  v_subject_id uuid;
  v_grant_payload jsonb;
  v_token text;
  v_resolved jsonb;
begin
  v_subject_id := register_admin_security_artifact_download_subject(
    'other',
    gen_random_uuid(),
    'security_document',
    'download-exhaust-artifact',
    'Download Exhaust Artifact',
    'Download exhaustion test.',
    'file:///tmp/download-exhaust.pdf',
    repeat('c', 64),
    1000,
    null,
    null,
    null,
    null,
    'customer_scoped',
    'customer_confidential',
    true,
    true,
    false,
    false,
    now() + interval '1 day',
    'Exhaust Corp',
    'exhaust.example.com',
    null,
    null,
    null,
    'download-exhaust-subject',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  v_grant_payload := create_admin_security_artifact_download_grant(
    null,
    v_subject_id,
    'customer',
    null,
    'exhaust@example.com',
    'Exhaust User',
    null,
    null,
    null,
    null,
    null,
    null,
    1,
    15,
    null,
    'smoke-test',
    'download-exhaust-grant',
    '{"test": true}'::jsonb
  );

  v_token := v_grant_payload->>'downloadToken';

  v_resolved := resolve_admin_security_artifact_download_grant(
    v_token,
    null,
    null,
    'smoke-test',
    'download-exhaust-resolve',
    '{"test": true}'::jsonb
  );

  perform complete_admin_security_artifact_download(
    (v_resolved->>'downloadGrantId')::uuid,
    (v_resolved->>'attemptId')::uuid,
    1000,
    repeat('c', 64),
    v_resolved->>'signedUrl',
    'download-exhaust-complete',
    '{"test": true}'::jsonb
  );

  begin
    perform resolve_admin_security_artifact_download_grant(
      v_token,
      null,
      null,
      'smoke-test',
      'download-exhaust-second-resolve',
      '{"test": true}'::jsonb
    );

    raise exception 'exhausted grant should have failed';
  exception
    when others then
      if sqlerrm not like '%download grant exhausted%' then
        raise;
      end if;
  end;
end $$;
