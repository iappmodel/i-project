do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_wallet_id uuid;
  v_session_risk_event_id uuid;
begin
  v_wallet_id := create_wallet(
    v_user_id,
    'USD',
    '{"test": true}'::jsonb
  );

  perform create_available_wallet_value_lot(
    v_wallet_id,
    v_user_id,
    100000,
    'admin_credit',
    gen_random_uuid(),
    'test_session_risk_credit:' || v_wallet_id::text,
    '{"test": true}'::jsonb
  );

  v_session_risk_event_id := observe_user_session_context(
    v_user_id,
    'hash_device_tor_test_1234567890',
    'android',
    '1.0.0-test',
    'Pixel Test',
    'Android Test',
    gen_random_uuid(),
    'test_request_tor',
    'hash_ip_tor_test_1234567890',
    'US',
    null,
    null,
    'AS-TEST',
    'tor',
    false,
    false,
    true,
    false,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from user_session_risk_events
    where id = v_session_risk_event_id
      and decision = 'block'
      and event_type = 'tor_seen'
  ) then
    raise exception 'tor session risk event did not block';
  end if;

  begin
    perform create_withdrawal_request(
      v_user_id,
      v_wallet_id,
      500,
      'manual_demo',
      0,
      'USD',
      'test_session_risk_withdrawal:' || v_wallet_id::text,
      '{"test": true}'::jsonb
    );

    raise exception 'withdrawal should have been blocked by session risk';
  exception
    when others then
      if sqlerrm not like '%withdrawal blocked by trust gate%' then
        raise;
      end if;
  end;

  if not exists (
    select 1
    from withdrawal_trust_gate_evaluations
    where wallet_id = v_wallet_id
      and decision = 'blocked'
      and reason_code = 'session_risk_blocks_withdrawal'
  ) then
    raise exception 'withdrawal gate did not include session risk block';
  end if;
end $$;

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_wallet_id uuid;
  v_session_risk_event_id uuid;
begin
  v_wallet_id := create_wallet(
    v_user_id,
    'USD',
    '{"test": true}'::jsonb
  );

  perform create_available_wallet_value_lot(
    v_wallet_id,
    v_user_id,
    100000,
    'admin_credit',
    gen_random_uuid(),
    'test_new_device_credit:' || v_wallet_id::text,
    '{"test": true}'::jsonb
  );

  v_session_risk_event_id := observe_user_session_context(
    v_user_id,
    'hash_new_device_test_1234567890',
    'ios',
    '1.0.0-test',
    'iPhone Test',
    'iOS Test',
    gen_random_uuid(),
    'test_request_new_device',
    'hash_ip_clean_test_1234567890',
    'US',
    null,
    null,
    'AS-TEST',
    'residential',
    false,
    false,
    false,
    false,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from user_session_risk_events
    where id = v_session_risk_event_id
      and decision = 'review'
      and event_type = 'new_device_seen'
  ) then
    raise exception 'new device did not create review risk event';
  end if;

  if not exists (
    select 1
    from user_trust_score_components
    where user_id = v_user_id
      and source_type = 'user_session_risk_event'
      and source_id = v_session_risk_event_id
  ) then
    raise exception 'session risk did not create trust score component';
  end if;
end $$;
