do $$
declare
  v_session jsonb;
  v_token text;
begin
  v_session := create_admin_security_artifact_search_session(
    'admin',
    null,
    'limited-search@example.com',
    'Limited Search User',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    60,
    1,
    null,
    'smoke-test',
    'limited-search-session',
    '{"test": true}'::jsonb
  );

  v_token := v_session->>'searchToken';

  update admin_security_artifact_search_sessions
  set query_count = 1
  where id = (v_session->>'searchSessionId')::uuid;

  begin
    perform execute_admin_security_artifact_search(
      v_token,
      'security',
      'keyword',
      20,
      null,
      null,
      'smoke-test',
      'limited-search-execute',
      '{"test": true}'::jsonb
    );

    raise exception 'query-limited search session should have failed';
  exception
    when others then
      if sqlerrm not like '%search session query limit reached%' then
        raise;
      end if;
  end;
end $$;
