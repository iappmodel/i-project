-- 36/post-MVP schema — admin wallet adjustment core.

do $$
begin
  alter type wallet_lot_source_type add value if not exists 'admin_credit';
  alter type wallet_lot_source_type add value if not exists 'support_goodwill_credit';
  alter type wallet_lot_source_type add value if not exists 'migration_credit';
  alter type wallet_lot_source_type add value if not exists 'compliance_correction';
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter type wallet_ledger_entry_type add value if not exists 'admin_credit';
  alter type wallet_ledger_entry_type add value if not exists 'admin_debit';
  alter type wallet_ledger_entry_type add value if not exists 'support_goodwill_credit';
  alter type wallet_ledger_entry_type add value if not exists 'fraud_debit';
  alter type wallet_ledger_entry_type add value if not exists 'migration_credit';
  alter type wallet_ledger_entry_type add value if not exists 'migration_debit';
  alter type wallet_ledger_entry_type add value if not exists 'compliance_correction';
exception
  when duplicate_object then null;
end
$$;

create table if not exists wallet_admin_adjustment_groups (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  adjustment_type text not null,
  direction integer not null,

  currency_code text not null default 'USD',
  requested_amount_minor bigint not null,
  adjusted_amount_minor bigint not null default 0,

  reason text not null,

  admin_user_id uuid not null,
  admin_case_id uuid,

  status text not null default 'processing',

  idempotency_key text not null,
  operation_type text not null default 'admin_adjust_wallet_balance',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,

  constraint wallet_admin_adjustment_groups_amount_check
  check (
    requested_amount_minor > 0
    and adjusted_amount_minor >= 0
    and adjusted_amount_minor <= requested_amount_minor
  ),

  constraint wallet_admin_adjustment_groups_direction_check
  check (direction in (-1, 1)),

  constraint wallet_admin_adjustment_groups_type_check
  check (
    adjustment_type in (
      'admin_credit',
      'admin_debit',
      'support_goodwill_credit',
      'fraud_debit',
      'migration_credit',
      'migration_debit',
      'compliance_correction'
    )
  ),

  constraint wallet_admin_adjustment_groups_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create unique index if not exists wallet_admin_adjustment_groups_idempotency_unique
on wallet_admin_adjustment_groups (operation_type, idempotency_key);

create index if not exists wallet_admin_adjustment_groups_wallet_idx
on wallet_admin_adjustment_groups (wallet_id, created_at desc);

create index if not exists wallet_admin_adjustment_groups_user_idx
on wallet_admin_adjustment_groups (user_id, created_at desc);

create index if not exists wallet_admin_adjustment_groups_admin_idx
on wallet_admin_adjustment_groups (admin_user_id, created_at desc);

create index if not exists wallet_admin_adjustment_groups_case_idx
on wallet_admin_adjustment_groups (admin_case_id);

alter table wallet_ledger_entries
add column if not exists admin_adjustment_group_id uuid
references wallet_admin_adjustment_groups(id);

alter table wallet_value_lots
add column if not exists admin_adjustment_group_id uuid
references wallet_admin_adjustment_groups(id);

create index if not exists wallet_ledger_entries_admin_adjustment_group_idx
on wallet_ledger_entries (admin_adjustment_group_id);

create index if not exists wallet_value_lots_admin_adjustment_group_idx
on wallet_value_lots (admin_adjustment_group_id);

create or replace function admin_credit_wallet_balance(
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_currency_code text default 'USD',
  p_adjustment_type text default 'admin_credit',
  p_reason text default null,
  p_admin_user_id uuid default null,
  p_admin_case_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_adjustment_group_id uuid;
  v_value_lot_id uuid;
  v_ledger_entry_id uuid;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_amount_minor <= 0 then
    raise exception 'credit amount must be positive';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'admin credit reason is required';
  end if;

  if p_admin_user_id is null then
    raise exception 'admin user id is required';
  end if;

  if p_adjustment_type not in (
    'admin_credit',
    'support_goodwill_credit',
    'migration_credit',
    'compliance_correction'
  ) then
    raise exception 'invalid admin credit adjustment type: %', p_adjustment_type;
  end if;

  if p_idempotency_key is null then
    if p_admin_case_id is null then
      raise exception 'idempotency key or admin case id is required';
    end if;

    p_idempotency_key :=
      'admin_credit:' ||
      p_wallet_id::text || ':' ||
      p_admin_case_id::text || ':' ||
      p_amount_minor::text;
  end if;

  perform wallet_assert_not_fraud_locked(
    p_wallet_id,
    'admin_adjustment'
  );

  v_payload := jsonb_build_object(
    'wallet_id', p_wallet_id,
    'user_id', p_user_id,
    'amount_minor', p_amount_minor,
    'currency_code', coalesce(p_currency_code, 'USD'),
    'adjustment_type', p_adjustment_type,
    'reason', p_reason,
    'admin_user_id', p_admin_user_id,
    'admin_case_id', p_admin_case_id
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'admin_credit_wallet_balance',
    p_idempotency_key,
    p_user_id,
    p_wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  insert into wallet_admin_adjustment_groups (
    wallet_id,
    user_id,
    adjustment_type,
    direction,
    currency_code,
    requested_amount_minor,
    adjusted_amount_minor,
    reason,
    admin_user_id,
    admin_case_id,
    status,
    idempotency_key,
    operation_type,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    p_adjustment_type,
    1,
    coalesce(p_currency_code, 'USD'),
    p_amount_minor,
    0,
    p_reason,
    p_admin_user_id,
    p_admin_case_id,
    'processing',
    p_idempotency_key,
    'admin_credit_wallet_balance',
    p_metadata
  )
  returning id into v_adjustment_group_id;

  insert into wallet_value_lots (
    wallet_id,
    user_id,
    source_type,
    source_id,
    currency_code,
    original_amount_minor,
    remaining_amount_minor,
    status,
    cashout_eligible,
    available_at,
    released_at,
    expires_at,
    metadata,
    admin_adjustment_group_id
  )
  values (
    p_wallet_id,
    p_user_id,
    p_adjustment_type::wallet_lot_source_type,
    v_adjustment_group_id,
    coalesce(p_currency_code, 'USD'),
    p_amount_minor,
    p_amount_minor,
    'available',
    true,
    now(),
    now(),
    null,
    p_metadata || jsonb_build_object(
      'admin_adjustment_group_id',
      v_adjustment_group_id,
      'reason',
      p_reason,
      'admin_user_id',
      p_admin_user_id,
      'admin_case_id',
      p_admin_case_id
    ),
    v_adjustment_group_id
  )
  returning id into v_value_lot_id;

  insert into wallet_ledger_entries (
    wallet_id,
    user_id,
    value_lot_id,
    admin_adjustment_group_id,
    source_type,
    source_id,
    entry_type,
    direction,
    currency_code,
    amount_minor,
    available_impact_minor,
    pending_impact_minor,
    locked_impact_minor,
    status,
    idempotency_key,
    operation_type,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    v_value_lot_id,
    v_adjustment_group_id,
    p_adjustment_type,
    v_adjustment_group_id,
    p_adjustment_type::wallet_ledger_entry_type,
    1,
    coalesce(p_currency_code, 'USD'),
    p_amount_minor,
    p_amount_minor,
    0,
    0,
    'posted',
    p_idempotency_key,
    'admin_credit_wallet_balance',
    p_metadata || jsonb_build_object(
      'admin_adjustment_group_id',
      v_adjustment_group_id,
      'wallet_value_lot_id',
      v_value_lot_id,
      'reason',
      p_reason,
      'admin_user_id',
      p_admin_user_id,
      'admin_case_id',
      p_admin_case_id
    )
  )
  returning id into v_ledger_entry_id;

  update wallet_admin_adjustment_groups
  set
    status = 'completed',
    completed_at = now(),
    adjusted_amount_minor = p_amount_minor
  where id = v_adjustment_group_id;

  perform wallet_complete_idempotent_operation(
    'admin_credit_wallet_balance',
    p_idempotency_key,
    'wallet_admin_adjustment_group',
    v_adjustment_group_id,
    jsonb_build_object(
      'admin_adjustment_group_id', v_adjustment_group_id,
      'wallet_value_lot_id', v_value_lot_id,
      'ledger_entry_id', v_ledger_entry_id,
      'credited_amount_minor', p_amount_minor
    )
  );

  return v_adjustment_group_id;

exception
  when others then
    if v_adjustment_group_id is not null then
      update wallet_admin_adjustment_groups
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_adjustment_group_id;
    end if;

    raise;
end;
$$;

create or replace function admin_debit_wallet_balance(
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_currency_code text default 'USD',
  p_adjustment_type text default 'admin_debit',
  p_reason text default null,
  p_admin_user_id uuid default null,
  p_admin_case_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_available bigint;
  v_remaining_to_debit bigint;
  v_take_amount bigint;

  v_lot wallet_value_lots%rowtype;

  v_adjustment_group_id uuid;
  v_ledger_entry_id uuid;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_amount_minor <= 0 then
    raise exception 'debit amount must be positive';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'admin debit reason is required';
  end if;

  if p_admin_user_id is null then
    raise exception 'admin user id is required';
  end if;

  if p_adjustment_type not in (
    'admin_debit',
    'fraud_debit',
    'migration_debit',
    'compliance_correction'
  ) then
    raise exception 'invalid admin debit adjustment type: %', p_adjustment_type;
  end if;

  if p_idempotency_key is null then
    if p_admin_case_id is null then
      raise exception 'idempotency key or admin case id is required';
    end if;

    p_idempotency_key :=
      'admin_debit:' ||
      p_wallet_id::text || ':' ||
      p_admin_case_id::text || ':' ||
      p_amount_minor::text;
  end if;

  perform wallet_assert_not_fraud_locked(
    p_wallet_id,
    'admin_adjustment'
  );

  v_payload := jsonb_build_object(
    'wallet_id', p_wallet_id,
    'user_id', p_user_id,
    'amount_minor', p_amount_minor,
    'currency_code', coalesce(p_currency_code, 'USD'),
    'adjustment_type', p_adjustment_type,
    'reason', p_reason,
    'admin_user_id', p_admin_user_id,
    'admin_case_id', p_admin_case_id
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'admin_debit_wallet_balance',
    p_idempotency_key,
    p_user_id,
    p_wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  v_available := wallet_available_balance(
    p_wallet_id,
    coalesce(p_currency_code, 'USD'),
    false
  );

  if v_available < p_amount_minor then
    update wallet_idempotency_keys
    set
      status = 'failed',
      failed_at = now(),
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'insufficient_available_balance_for_admin_debit',
        'available_minor',
        v_available,
        'requested_minor',
        p_amount_minor
      )
    where operation_type = 'admin_debit_wallet_balance'
      and idempotency_key = p_idempotency_key;

    raise exception 'insufficient available balance for admin debit. available %, requested %',
      v_available,
      p_amount_minor;
  end if;

  insert into wallet_admin_adjustment_groups (
    wallet_id,
    user_id,
    adjustment_type,
    direction,
    currency_code,
    requested_amount_minor,
    adjusted_amount_minor,
    reason,
    admin_user_id,
    admin_case_id,
    status,
    idempotency_key,
    operation_type,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    p_adjustment_type,
    -1,
    coalesce(p_currency_code, 'USD'),
    p_amount_minor,
    0,
    p_reason,
    p_admin_user_id,
    p_admin_case_id,
    'processing',
    p_idempotency_key,
    'admin_debit_wallet_balance',
    p_metadata
  )
  returning id into v_adjustment_group_id;

  v_remaining_to_debit := p_amount_minor;

  for v_lot in
    select *
    from wallet_value_lots
    where wallet_id = p_wallet_id
      and user_id = p_user_id
      and currency_code = coalesce(p_currency_code, 'USD')
      and status = 'available'
      and remaining_amount_minor > 0
      and (
        expires_at is null
        or expires_at > now()
      )
    order by
      expires_at asc nulls last,
      released_at asc nulls last,
      created_at asc,
      remaining_amount_minor asc,
      id asc
    for update
  loop
    exit when v_remaining_to_debit <= 0;

    v_take_amount := least(v_lot.remaining_amount_minor, v_remaining_to_debit);

    update wallet_value_lots
    set
      remaining_amount_minor = remaining_amount_minor - v_take_amount,
      status =
        case
          when remaining_amount_minor - v_take_amount = 0
          then 'revoked'
          else status
        end,
      revoked_at =
        case
          when remaining_amount_minor - v_take_amount = 0
          then now()
          else revoked_at
        end,
      updated_at = now(),
      metadata = metadata || jsonb_build_object(
        'admin_adjustment_group_id',
        v_adjustment_group_id,
        'admin_debit_reason',
        p_reason
      )
    where id = v_lot.id;

    insert into wallet_ledger_entries (
      wallet_id,
      user_id,
      value_lot_id,
      admin_adjustment_group_id,
      source_type,
      source_id,
      campaign_id,
      entry_type,
      direction,
      currency_code,
      amount_minor,
      available_impact_minor,
      pending_impact_minor,
      locked_impact_minor,
      status,
      idempotency_key,
      operation_type,
      metadata
    )
    values (
      p_wallet_id,
      p_user_id,
      v_lot.id,
      v_adjustment_group_id,
      p_adjustment_type,
      v_adjustment_group_id,
      v_lot.campaign_id,
      p_adjustment_type::wallet_ledger_entry_type,
      -1,
      coalesce(p_currency_code, 'USD'),
      v_take_amount,
      -v_take_amount,
      0,
      0,
      'posted',
      p_idempotency_key,
      'admin_debit_wallet_balance',
      p_metadata || jsonb_build_object(
        'admin_adjustment_group_id',
        v_adjustment_group_id,
        'reason',
        p_reason,
        'admin_user_id',
        p_admin_user_id,
        'admin_case_id',
        p_admin_case_id,
        'lot_amount_before',
        v_lot.remaining_amount_minor,
        'debited_amount',
        v_take_amount
      )
    )
    returning id into v_ledger_entry_id;

    v_remaining_to_debit := v_remaining_to_debit - v_take_amount;
  end loop;

  if v_remaining_to_debit <> 0 then
    update wallet_admin_adjustment_groups
    set
      status = 'failed',
      failed_at = now(),
      adjusted_amount_minor = p_amount_minor - v_remaining_to_debit,
      failure_reason = 'admin_debit_selection_race'
    where id = v_adjustment_group_id;

    update wallet_idempotency_keys
    set
      status = 'failed',
      failed_at = now(),
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'admin_debit_selection_race',
        'remaining_to_debit',
        v_remaining_to_debit
      )
    where operation_type = 'admin_debit_wallet_balance'
      and idempotency_key = p_idempotency_key;

    raise exception 'admin debit failed after lot selection. remaining amount %',
      v_remaining_to_debit;
  end if;

  update wallet_admin_adjustment_groups
  set
    status = 'completed',
    completed_at = now(),
    adjusted_amount_minor = p_amount_minor
  where id = v_adjustment_group_id;

  perform wallet_complete_idempotent_operation(
    'admin_debit_wallet_balance',
    p_idempotency_key,
    'wallet_admin_adjustment_group',
    v_adjustment_group_id,
    jsonb_build_object(
      'admin_adjustment_group_id', v_adjustment_group_id,
      'debited_amount_minor', p_amount_minor
    )
  );

  return v_adjustment_group_id;

exception
  when others then
    if v_adjustment_group_id is not null then
      update wallet_admin_adjustment_groups
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_adjustment_group_id;
    end if;

    raise;
end;
$$;

create or replace view wallet_admin_adjustment_group_details as
select
  ag.id as admin_adjustment_group_id,
  ag.wallet_id,
  ag.user_id,
  ag.adjustment_type,
  ag.direction,
  ag.currency_code,
  ag.requested_amount_minor,
  ag.adjusted_amount_minor,
  ag.reason,
  ag.admin_user_id,
  ag.admin_case_id,
  ag.status,
  ag.idempotency_key,
  ag.created_at,
  ag.completed_at,
  ag.failed_at,
  ag.failure_reason,

  count(le.id) as ledger_entry_count,

  coalesce(sum(le.amount_minor), 0)::bigint as ledger_amount_total_minor,

  jsonb_agg(
    jsonb_build_object(
      'ledger_entry_id', le.id,
      'value_lot_id', le.value_lot_id,
      'entry_type', le.entry_type,
      'direction', le.direction,
      'currency_code', le.currency_code,
      'amount_minor', le.amount_minor,
      'available_impact_minor', le.available_impact_minor,
      'pending_impact_minor', le.pending_impact_minor,
      'locked_impact_minor', le.locked_impact_minor,
      'campaign_id', le.campaign_id,
      'created_at', le.created_at
    )
    order by le.created_at asc
  ) filter (where le.id is not null) as ledger_entries

from wallet_admin_adjustment_groups ag
left join wallet_ledger_entries le
  on le.admin_adjustment_group_id = ag.id
group by ag.id;

create table if not exists wallet_admin_action_queue (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  action_type text not null,
  requested_amount_minor bigint,
  currency_code text default 'USD',

  reason text not null,

  requested_by_admin_id uuid not null,
  approved_by_admin_id uuid,
  executed_by_admin_id uuid,

  status text not null default 'requested',

  priority text not null default 'normal',

  metadata jsonb not null default '{}'::jsonb,

  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  executed_at timestamptz,
  rejected_at timestamptz,

  rejection_reason text,
  resulting_adjustment_group_id uuid references wallet_admin_adjustment_groups(id),

  constraint wallet_admin_action_queue_action_check
  check (
    action_type in (
      'credit',
      'debit',
      'soft_lock',
      'hard_lock',
      'clear_lock',
      'clawback',
      'manual_review'
    )
  ),

  constraint wallet_admin_action_queue_status_check
  check (
    status in (
      'requested',
      'approved',
      'executed',
      'rejected',
      'cancelled'
    )
  ),

  constraint wallet_admin_action_queue_priority_check
  check (
    priority in (
      'low',
      'normal',
      'high',
      'critical'
    )
  )
);

create index if not exists wallet_admin_action_queue_status_idx
on wallet_admin_action_queue (status, priority, requested_at desc);

create index if not exists wallet_admin_action_queue_wallet_idx
on wallet_admin_action_queue (wallet_id, requested_at desc);
