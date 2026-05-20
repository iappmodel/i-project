do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_wallet_id uuid;
  v_campaign_id uuid := gen_random_uuid();
  v_session_id uuid;
  v_event_id uuid;
begin
  perform seed_demo_attention_runtime(
    '{"test": true}'::jsonb
  );

  v_wallet_id := create_wallet(
    v_user_id,
    'USD',
    '{"test": true}'::jsonb
  );

  v_session_id := start_attention_verification_session(
    v_user_id,
    v_wallet_id,
    v_campaign_id,
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    '1.0.0-test',
    'android',
    'vision_model_v1',
    'runtime_pipeline_v1',
    'runtime_signals_v1',
    'attention_score_v1',
    '{"test": true}'::jsonb
  );

  if v_session_id is null then
    raise exception 'attention session was not created';
  end if;

  v_event_id := complete_attention_verification_event(
    v_session_id,
    'passed',
    'test_attention_verified',
    0.9200,
    0.9300,
    0.0500,
    0.9000,
    0.9100,
    0.8800,
    0.9500,
    1.0000,
    300,
    10,
    2,
    5,
    null,
    'test_attention_complete:' || v_session_id::text,
    '{"test": true}'::jsonb
  );

  if v_event_id is null then
    raise exception 'attention event was not created';
  end if;

  if not exists (
    select 1
    from attention_verification_events
    where id = v_event_id
      and decision = 'passed'
      and reward_eligible is true
      and reward_issued is false
  ) then
    raise exception 'attention event values are incorrect';
  end if;

  if not exists (
    select 1
    from attention_verification_sessions
    where id = v_session_id
      and status = 'completed'
  ) then
    raise exception 'attention session was not completed';
  end if;
end $$;
