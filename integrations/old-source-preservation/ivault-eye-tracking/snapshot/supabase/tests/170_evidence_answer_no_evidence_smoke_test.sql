do $$
declare
  v_session jsonb;
  v_token text;
  v_result jsonb;
begin
  v_session := create_admin_security_evidence_answer_session(
    'admin',
    null,
    'noevidence@example.com',
    'No Evidence User',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    60,
    100,
    false,
    true,
    true,
    null,
    'smoke-test',
    'no-evidence-session',
    '{"test": true}'::jsonb
  );

  v_token := v_session->>'answerToken';

  v_result := generate_admin_security_evidence_answer(
    v_token,
    'zzzz nonexistent evidence term zzzz',
    8,
    null,
    null,
    'smoke-test',
    'no-evidence-generate',
    '{"test": true}'::jsonb
  );

  if (v_result->>'answerStatus') <> 'not_answered' then
    raise exception 'expected not_answered, got %', v_result;
  end if;

  if (v_result->>'nonAnswerReason') is null then
    raise exception 'expected non-answer reason';
  end if;
end $$;
