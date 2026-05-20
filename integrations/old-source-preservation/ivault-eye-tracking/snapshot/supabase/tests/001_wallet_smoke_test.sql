do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_wallet_id uuid;
  v_lot_id uuid;
begin
  v_wallet_id := create_wallet(
    v_user_id,
    'USD',
    '{"test": true}'::jsonb
  );

  if v_wallet_id is null then
    raise exception 'wallet was not created';
  end if;

  v_lot_id := create_available_wallet_value_lot(
    v_wallet_id,
    v_user_id,
    2500,
    'admin_credit',
    gen_random_uuid(),
    'test_admin_credit:' || v_wallet_id::text,
    '{"test": true}'::jsonb
  );

  if v_lot_id is null then
    raise exception 'wallet lot was not created';
  end if;

  if not exists (
    select 1
    from wallets
    where id = v_wallet_id
      and available_balance_minor = 2500
      and pending_balance_minor = 0
      and locked_balance_minor = 0
      and total_balance_minor = 2500
  ) then
    raise exception 'wallet balances are incorrect after credit';
  end if;

  if not exists (
    select 1
    from wallet_integrity_check
    where wallet_id = v_wallet_id
      and total_balance_delta_minor = 0
      and available_vs_ledger_delta_minor = 0
      and pending_vs_ledger_delta_minor = 0
      and locked_vs_ledger_delta_minor = 0
  ) then
    raise exception 'wallet integrity check failed';
  end if;
end $$;
