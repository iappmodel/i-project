do $$
declare
  v_error_code text;
  v_error_event_id uuid;
  v_response jsonb;
begin
  v_error_code := resolve_error_code_from_raw_error(
    'wallet/user mismatch'
  );

  if v_error_code <> 'WALLET_USER_MISMATCH' then
    raise exception 'error mapping failed';
  end if;

  v_error_event_id := record_error_event(
    'WALLET_USER_MISMATCH',
    'test_request_001',
    null,
    'user',
    gen_random_uuid(),
    null,
    'smoke_test',
    '/test',
    'test_function',
    'Wallet mismatch test',
    'wallet/user mismatch',
    'wallet',
    gen_random_uuid(),
    '{"test": true}'::jsonb
  );

  if v_error_event_id is null then
    raise exception 'error event was not recorded';
  end if;

  v_response := build_api_error_response(
    'WALLET_USER_MISMATCH',
    'test_request_001',
    '{"field": "walletId"}'::jsonb
  );

  if v_response->>'ok' <> 'false' then
    raise exception 'api error response did not return ok=false';
  end if;

  if v_response->'error'->>'code' <> 'WALLET_USER_MISMATCH' then
    raise exception 'api error response code mismatch';
  end if;

  if not exists (
    select 1
    from error_event_dashboard
    where error_code = 'WALLET_USER_MISMATCH'
      and count_24h > 0
  ) then
    raise exception 'error dashboard did not include test error';
  end if;
end $$;
