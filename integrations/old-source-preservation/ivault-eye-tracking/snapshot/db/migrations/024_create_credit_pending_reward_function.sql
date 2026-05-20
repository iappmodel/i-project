-- 24/post-MVP schema — credit_pending_reward: pending lot + ledger + projection + events.

create or replace function credit_pending_reward(
  p_user_id uuid,
  p_reward_decision_id uuid,
  p_amount_minor bigint,
  p_currency currency_code,
  p_pending_until timestamptz,
  p_trust_score numeric,
  p_fraud_risk numeric,
  p_source_event_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
as $$
declare
  v_wallet_id uuid;
  v_lot_id uuid;
  v_ledger_id uuid;
begin
  if p_idempotency_key is null or length(trim(both from p_idempotency_key)) = 0 then
    raise exception 'idempotency_key_required';
  end if;

  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'amount_must_be_positive';
  end if;

  -- Idempotency fast-path: same logical operation returns the existing lot id.
  select id
    into v_lot_id
  from wallet_value_lots
  where wallet_id = (
      select id from wallets where user_id = p_user_id
    )
    and source_type = 'campaign_reward'
    and source_id = p_reward_decision_id;

  if v_lot_id is not null then
    return v_lot_id;
  end if;

  select id
    into v_wallet_id
  from wallets
  where user_id = p_user_id
  for update;

  if v_wallet_id is null then
    raise exception 'wallet_not_found';
  end if;

  insert into wallet_value_lots (
    wallet_id,
    user_id,
    source_type,
    source_id,
    campaign_id,
    reward_event_id,
    currency_code,
    original_amount_minor,
    remaining_amount_minor,
    status,
    is_withdrawable,
    is_spendable,
    is_convertible,
    pending_until,
    risk_score,
    metadata
  )
  values (
    v_wallet_id,
    p_user_id,
    'campaign_reward',
    p_reward_decision_id,
    null,
    p_reward_decision_id,
    p_currency::text,
    p_amount_minor,
    p_amount_minor,
    'pending',
    false,
    true,
    true,
    p_pending_until,
    coalesce(p_fraud_risk, 0),
    jsonb_build_object(
      'trust_score_at_creation', p_trust_score,
      'fraud_risk_at_creation', p_fraud_risk,
      'reward_decision_id', p_reward_decision_id
    )
  )
  returning id into v_lot_id;

  insert into wallet_ledger_entries (
    wallet_id,
    user_id,
    value_lot_id,
    entry_type,
    amount_minor,
    currency,
    direction,
    balance_bucket,
    source_event_id,
    idempotency_key
  )
  values (
    v_wallet_id,
    p_user_id,
    v_lot_id,
    'credit_pending',
    p_amount_minor,
    p_currency,
    'credit',
    'pending',
    p_source_event_id,
    p_idempotency_key || ':ledger'
  )
  returning id into v_ledger_id;

  insert into wallet_balance_projections (
    wallet_id,
    user_id,
    currency,
    pending_minor,
    available_minor,
    locked_minor,
    withdrawn_minor,
    spent_minor,
    last_ledger_entry_id,
    updated_at
  )
  values (
    v_wallet_id,
    p_user_id,
    p_currency,
    p_amount_minor,
    0,
    0,
    0,
    0,
    v_ledger_id,
    now()
  )
  on conflict (wallet_id, currency)
  do update set
    pending_minor = wallet_balance_projections.pending_minor + p_amount_minor,
    last_ledger_entry_id = v_ledger_id,
    updated_at = now();

  insert into system_events (
    event_type,
    event_version,
    actor_type,
    actor_id,
    subject_type,
    subject_id,
    user_id,
    payload,
    idempotency_key,
    correlation_id,
    causation_id
  )
  values (
    'WALLET_LOT_CREATED',
    1,
    'system',
    null,
    'wallet_value_lot',
    v_lot_id,
    p_user_id,
    jsonb_build_object(
      'wallet_id', v_wallet_id,
      'value_lot_id', v_lot_id,
      'reward_decision_id', p_reward_decision_id,
      'amount_minor', p_amount_minor,
      'currency', p_currency,
      'status', 'pending',
      'pending_until', p_pending_until,
      'trust_score_at_creation', p_trust_score,
      'fraud_risk_at_creation', p_fraud_risk
    ),
    p_idempotency_key || ':event:wallet_lot_created',
    p_source_event_id,
    p_source_event_id
  );

  insert into system_events (
    event_type,
    event_version,
    actor_type,
    actor_id,
    subject_type,
    subject_id,
    user_id,
    payload,
    idempotency_key,
    correlation_id,
    causation_id
  )
  values (
    'WALLET_LEDGER_ENTRY_CREATED',
    1,
    'system',
    null,
    'wallet_ledger_entry',
    v_ledger_id,
    p_user_id,
    jsonb_build_object(
      'wallet_id', v_wallet_id,
      'ledger_entry_id', v_ledger_id,
      'value_lot_id', v_lot_id,
      'entry_type', 'credit_pending',
      'amount_minor', p_amount_minor,
      'currency', p_currency,
      'balance_bucket', 'pending',
      'source_event_id', p_source_event_id
    ),
    p_idempotency_key || ':event:wallet_ledger_entry_created',
    p_source_event_id,
    p_source_event_id
  );

  return v_lot_id;
end;
$$;
