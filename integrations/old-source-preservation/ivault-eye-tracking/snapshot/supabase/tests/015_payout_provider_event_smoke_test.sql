do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_wallet_id uuid;
  v_withdrawal_id uuid;
  v_payout_id uuid;
  v_provider_event_id uuid;
begin
  v_wallet_id := create_wallet(
    v_user_id,
    'USD',
    '{"test": true}'::jsonb
  );

  perform create_available_wallet_value_lot(
    v_wallet_id,
    v_user_id,
    1000,
    'admin_credit',
    gen_random_uuid(),
    'test_provider_event_credit:' || v_wallet_id::text,
    '{"test": true}'::jsonb
  );

  v_withdrawal_id := create_withdrawal_request(
    v_user_id,
    v_wallet_id,
    500,
    'manual_demo',
    0,
    'USD',
    'test_provider_event_withdrawal:' || v_wallet_id::text,
    '{"test": true}'::jsonb
  );

  perform reserve_wallet_funds_for_withdrawal(
    v_withdrawal_id,
    '{"test": true}'::jsonb
  );

  v_payout_id := submit_withdrawal_to_provider(
    v_withdrawal_id,
    'manual_demo',
    'provider_payout_smoke_001',
    null,
    'provider_ref_smoke_001',
    '{"test": true}'::jsonb
  );

  v_provider_event_id := record_payout_provider_event(
    'manual_demo',
    'provider_event_paid_001',
    'payout.paid',
    'provider_payout_smoke_001',
    null,
    'provider_ref_smoke_001',
    'USD',
    500,
    0,
    'paid',
    '{"provider": "manual_demo"}'::jsonb,
    '{"test": true}'::jsonb
  );

  perform process_payout_provider_event(
    v_provider_event_id,
    '{"test": true}'::jsonb
  );

  perform run_accounting_mirror_job(500, '{"test": true}'::jsonb);
  perform run_audit_hash_backfill_job(1000, '{"test": true}'::jsonb);
  perform verify_audit_hash_chain('global_audit_chain', 100000, '{"test": true}'::jsonb);

  if not exists (
    select 1
    from withdrawal_requests
    where id = v_withdrawal_id
      and status = 'paid'
  ) then
    raise exception 'withdrawal was not marked paid by provider event';
  end if;

  if not exists (
    select 1
    from payout_provider_events
    where id = v_provider_event_id
      and processing_status = 'processed'
  ) then
    raise exception 'provider event was not processed';
  end if;

  if exists (
    select 1
    from withdrawal_integrity_check
    where withdrawal_request_id = v_withdrawal_id
      and has_integrity_issue is true
  ) then
    raise exception 'withdrawal integrity failed after provider event';
  end if;

  if exists (
    select 1
    from money_integrity_dashboard
    where wallet_vs_accounting_delta_minor <> 0
  ) then
    raise exception 'money integrity failed after provider event';
  end if;
end
$$;
