-- 41/post-MVP schema — reverse paid withdrawals after external payout reversals.

do $$
begin
  alter type wallet_lot_source_type add value if not exists 'withdrawal_reversal';
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter type wallet_ledger_entry_type add value if not exists 'withdrawal_reversal_credit';
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter type wallet_lot_status add value if not exists 'restored';
exception
  when duplicate_object then null;
end
$$;

create table if not exists wallet_withdrawal_reversal_groups (
  id uuid primary key default gen_random_uuid(),

  withdrawal_request_id uuid not null references wallet_withdrawal_requests(id),
  reservation_group_id uuid references wallet_reservation_groups(id),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  currency_code text not null default 'USD',

  original_withdrawal_amount_minor bigint not null,
  reversal_amount_minor bigint not null,

  reversal_type text not null default 'external_payout_reversal',
  reversal_reason text not null,

  external_processor text,
  external_payout_id text,
  external_reversal_id text,

  restore_to_wallet boolean not null default true,

  status text not null default 'processing',

  idempotency_key text not null,
  operation_type text not null default 'reverse_paid_withdrawal',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,

  constraint wallet_withdrawal_reversal_groups_amount_check
  check (
    original_withdrawal_amount_minor > 0
    and reversal_amount_minor > 0
    and reversal_amount_minor <= original_withdrawal_amount_minor
  ),

  constraint wallet_withdrawal_reversal_groups_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  ),

  constraint wallet_withdrawal_reversal_groups_type_check
  check (
    reversal_type in (
      'external_payout_reversal',
      'bank_return',
      'processor_failure_after_paid',
      'chargeback',
      'duplicate_payout_correction',
      'compliance_reversal',
      'admin_reversal'
    )
  )
);

create unique index if not exists wallet_withdrawal_reversal_groups_idempotency_unique
on wallet_withdrawal_reversal_groups (operation_type, idempotency_key);

create index if not exists wallet_withdrawal_reversal_groups_wallet_idx
on wallet_withdrawal_reversal_groups (wallet_id, created_at desc);

create index if not exists wallet_withdrawal_reversal_groups_withdrawal_idx
on wallet_withdrawal_reversal_groups (withdrawal_request_id);

create index if not exists wallet_withdrawal_reversal_groups_external_idx
on wallet_withdrawal_reversal_groups (external_processor, external_payout_id, external_reversal_id);

alter table wallet_ledger_entries
add column if not exists withdrawal_reversal_group_id uuid
references wallet_withdrawal_reversal_groups(id);

alter table wallet_value_lots
add column if not exists withdrawal_reversal_group_id uuid
references wallet_withdrawal_reversal_groups(id);

create index if not exists wallet_ledger_entries_withdrawal_reversal_group_idx
on wallet_ledger_entries (withdrawal_reversal_group_id);

create index if not exists wallet_value_lots_withdrawal_reversal_group_idx
on wallet_value_lots (withdrawal_reversal_group_id);

alter table wallet_withdrawal_requests
add column if not exists reversed_amount_minor bigint not null default 0,
add column if not exists reversal_status text not null default 'none';

alter table wallet_withdrawal_requests
drop constraint if exists wallet_withdrawal_requests_reversal_status_check;

alter table wallet_withdrawal_requests
add constraint wallet_withdrawal_requests_reversal_status_check
check (
  reversal_status in (
    'none',
    'partially_reversed',
    'fully_reversed'
  )
);

alter table wallet_withdrawal_requests
drop constraint if exists wallet_withdrawal_requests_reversed_amount_check;

alter table wallet_withdrawal_requests
add constraint wallet_withdrawal_requests_reversed_amount_check
check (
  reversed_amount_minor >= 0
);

create or replace function wallet_withdrawal_reversible_amount(
  p_withdrawal_request_id uuid
)
returns bigint
language sql
stable
as $$
  select greatest(
    coalesce(nullif(paid_amount_minor, 0), requested_amount_minor) - reversed_amount_minor,
    0
  )::bigint
  from wallet_withdrawal_requests
  where id = p_withdrawal_request_id
    and status in ('paid', 'completed', 'succeeded');
$$;

insert into accounting_accounts (
  account_code,
  account_name,
  account_type,
  normal_balance,
  currency_code,
  metadata
)
values (
  'PAYOUT_REVERSAL_RECOVERY_USD',
  'Payout Reversal Recovery USD',
  'revenue',
  'credit',
  'USD',
  '{"purpose": "External payout reversals not restored to user wallet"}'::jsonb
)
on conflict (account_code) do nothing;

create or replace function post_accounting_withdrawal_reversed(
  p_withdrawal_reversal_group_id uuid,
  p_wallet_ledger_entry_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_group wallet_withdrawal_reversal_groups%rowtype;
  v_journal_id uuid;
begin
  select *
  into v_group
  from wallet_withdrawal_reversal_groups
  where id = p_withdrawal_reversal_group_id;

  if v_group.id is null then
    raise exception 'withdrawal reversal group not found: %',
      p_withdrawal_reversal_group_id;
  end if;

  if p_idempotency_key is null then
    p_idempotency_key :=
      'acct:withdrawal_reversed:' || p_withdrawal_reversal_group_id::text;
  end if;

  v_journal_id := create_accounting_journal(
    'withdrawal_reversed',
    'wallet_withdrawal_reversal_group',
    v_group.id,
    v_group.wallet_id,
    v_group.user_id,
    null,
    null,
    v_group.currency_code,
    p_idempotency_key,
    p_metadata
  );

  if exists (
    select 1
    from accounting_journal_lines
    where journal_id = v_journal_id
  ) then
    return v_journal_id;
  end if;

  perform insert_accounting_line(
    v_journal_id,
    'CASH_PLATFORM_USD',
    v_group.reversal_amount_minor,
    0,
    v_group.wallet_id,
    v_group.user_id,
    null,
    null,
    v_group.currency_code,
    'Payout cash returned / reversal received',
    p_metadata
  );

  perform insert_accounting_line(
    v_journal_id,
    'USER_REWARD_LIABILITY_USD',
    0,
    v_group.reversal_amount_minor,
    v_group.wallet_id,
    v_group.user_id,
    null,
    null,
    v_group.currency_code,
    'User wallet liability restored after payout reversal',
    p_metadata
  );

  perform assert_accounting_journal_balanced(v_journal_id);
  perform audit_accounting_journal(v_journal_id, p_metadata);

  if p_wallet_ledger_entry_id is not null then
    update wallet_ledger_entries
    set accounting_journal_id = v_journal_id
    where id = p_wallet_ledger_entry_id;
  end if;

  return v_journal_id;
end;
$$;

create or replace function post_accounting_withdrawal_reversed_no_wallet_restore(
  p_withdrawal_reversal_group_id uuid,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_group wallet_withdrawal_reversal_groups%rowtype;
  v_journal_id uuid;
begin
  select *
  into v_group
  from wallet_withdrawal_reversal_groups
  where id = p_withdrawal_reversal_group_id;

  if v_group.id is null then
    raise exception 'withdrawal reversal group not found: %',
      p_withdrawal_reversal_group_id;
  end if;

  if p_idempotency_key is null then
    p_idempotency_key :=
      'acct:withdrawal_reversed_no_restore:' ||
      p_withdrawal_reversal_group_id::text;
  end if;

  v_journal_id := create_accounting_journal(
    'withdrawal_reversed_no_wallet_restore',
    'wallet_withdrawal_reversal_group',
    v_group.id,
    v_group.wallet_id,
    v_group.user_id,
    null,
    null,
    v_group.currency_code,
    p_idempotency_key,
    p_metadata
  );

  if exists (
    select 1
    from accounting_journal_lines
    where journal_id = v_journal_id
  ) then
    return v_journal_id;
  end if;

  perform insert_accounting_line(
    v_journal_id,
    'CASH_PLATFORM_USD',
    v_group.reversal_amount_minor,
    0,
    v_group.wallet_id,
    v_group.user_id,
    null,
    null,
    v_group.currency_code,
    'Payout cash returned / reversal received',
    p_metadata
  );

  perform insert_accounting_line(
    v_journal_id,
    'PAYOUT_REVERSAL_RECOVERY_USD',
    0,
    v_group.reversal_amount_minor,
    v_group.wallet_id,
    v_group.user_id,
    null,
    null,
    v_group.currency_code,
    'Payout reversal recovery not restored to wallet',
    p_metadata
  );

  perform assert_accounting_journal_balanced(v_journal_id);
  perform audit_accounting_journal(v_journal_id, p_metadata);

  return v_journal_id;
end;
$$;

create or replace function audit_withdrawal_reversal_group(
  p_withdrawal_reversal_group_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_group wallet_withdrawal_reversal_groups%rowtype;
  v_payload jsonb;
begin
  select *
  into v_group
  from wallet_withdrawal_reversal_groups
  where id = p_withdrawal_reversal_group_id;

  if v_group.id is null then
    raise exception 'withdrawal reversal group not found: %',
      p_withdrawal_reversal_group_id;
  end if;

  v_payload := jsonb_build_object(
    'id', v_group.id,
    'withdrawal_request_id', v_group.withdrawal_request_id,
    'reservation_group_id', v_group.reservation_group_id,
    'wallet_id', v_group.wallet_id,
    'user_id', v_group.user_id,
    'currency_code', v_group.currency_code,
    'original_withdrawal_amount_minor', v_group.original_withdrawal_amount_minor,
    'reversal_amount_minor', v_group.reversal_amount_minor,
    'reversal_type', v_group.reversal_type,
    'reversal_reason', v_group.reversal_reason,
    'external_processor', v_group.external_processor,
    'external_payout_id', v_group.external_payout_id,
    'external_reversal_id', v_group.external_reversal_id,
    'restore_to_wallet', v_group.restore_to_wallet,
    'status', v_group.status,
    'idempotency_key', v_group.idempotency_key,
    'created_at', v_group.created_at,
    'completed_at', v_group.completed_at
  );

  return append_audit_hash_chain_entry(
    'wallet',
    v_group.wallet_id::text,
    'wallet_withdrawal_reversal_groups',
    v_group.id,
    'withdrawal_reversal_completed',
    v_payload,
    null,
    null,
    v_group.wallet_id,
    v_group.user_id,
    null,
    null,
    null,
    p_metadata
  );
end;
$$;

create or replace function reverse_paid_withdrawal(
  p_withdrawal_request_id uuid,
  p_reversal_amount_minor bigint,
  p_reversal_reason text,
  p_reversal_type text default 'external_payout_reversal',
  p_restore_to_wallet boolean default true,
  p_external_processor text default null,
  p_external_payout_id text default null,
  p_external_reversal_id text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_withdrawal wallet_withdrawal_requests%rowtype;
  v_reservation_group_id uuid;

  v_original_amount_minor bigint;
  v_reversible_amount bigint;
  v_new_reversed_total bigint;

  v_reversal_group_id uuid;
  v_restored_lot_id uuid;
  v_ledger_entry_id uuid;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  if p_reversal_amount_minor <= 0 then
    raise exception 'reversal amount must be positive';
  end if;

  if p_reversal_reason is null or length(trim(p_reversal_reason)) = 0 then
    raise exception 'reversal reason is required';
  end if;

  if p_reversal_type not in (
    'external_payout_reversal',
    'bank_return',
    'processor_failure_after_paid',
    'chargeback',
    'duplicate_payout_correction',
    'compliance_reversal',
    'admin_reversal'
  ) then
    raise exception 'invalid reversal type: %', p_reversal_type;
  end if;

  select *
  into v_withdrawal
  from wallet_withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if v_withdrawal.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_withdrawal.status not in ('paid', 'completed', 'succeeded') then
    raise exception 'only paid/completed/succeeded withdrawals can be reversed. withdrawal %, status %',
      p_withdrawal_request_id,
      v_withdrawal.status;
  end if;

  select id
  into v_reservation_group_id
  from wallet_reservation_groups
  where reservation_type = 'withdrawal'
    and reservation_id = v_withdrawal.id
  order by created_at desc
  limit 1;

  v_original_amount_minor := coalesce(nullif(v_withdrawal.paid_amount_minor, 0), v_withdrawal.requested_amount_minor);

  v_reversible_amount := greatest(
    v_original_amount_minor - v_withdrawal.reversed_amount_minor,
    0
  );

  if v_reversible_amount < p_reversal_amount_minor then
    raise exception 'withdrawal reversal exceeds reversible amount. reversible %, requested %',
      v_reversible_amount,
      p_reversal_amount_minor;
  end if;

  if p_idempotency_key is null then
    p_idempotency_key :=
      'reverse_paid_withdrawal:' ||
      p_withdrawal_request_id::text || ':' ||
      coalesce(p_external_reversal_id, p_reversal_amount_minor::text);
  end if;

  v_payload := jsonb_build_object(
    'withdrawal_request_id', p_withdrawal_request_id,
    'wallet_id', v_withdrawal.wallet_id,
    'user_id', v_withdrawal.user_id,
    'reversal_amount_minor', p_reversal_amount_minor,
    'currency_code', v_withdrawal.currency_code,
    'reversal_type', p_reversal_type,
    'reversal_reason', p_reversal_reason,
    'restore_to_wallet', p_restore_to_wallet,
    'external_processor', p_external_processor,
    'external_payout_id', p_external_payout_id,
    'external_reversal_id', p_external_reversal_id
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'reverse_paid_withdrawal',
    p_idempotency_key,
    v_withdrawal.user_id,
    v_withdrawal.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  insert into wallet_withdrawal_reversal_groups (
    withdrawal_request_id,
    reservation_group_id,
    wallet_id,
    user_id,
    currency_code,
    original_withdrawal_amount_minor,
    reversal_amount_minor,
    reversal_type,
    reversal_reason,
    external_processor,
    external_payout_id,
    external_reversal_id,
    restore_to_wallet,
    status,
    idempotency_key,
    operation_type,
    metadata
  )
  values (
    v_withdrawal.id,
    v_reservation_group_id,
    v_withdrawal.wallet_id,
    v_withdrawal.user_id,
    v_withdrawal.currency_code,
    v_original_amount_minor,
    p_reversal_amount_minor,
    p_reversal_type,
    p_reversal_reason,
    p_external_processor,
    p_external_payout_id,
    p_external_reversal_id,
    p_restore_to_wallet,
    'processing',
    p_idempotency_key,
    'reverse_paid_withdrawal',
    p_metadata
  )
  returning id into v_reversal_group_id;

  if p_restore_to_wallet is true then
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
      metadata,
      withdrawal_reversal_group_id
    )
    values (
      v_withdrawal.wallet_id,
      v_withdrawal.user_id,
      'withdrawal_reversal',
      v_reversal_group_id,
      v_withdrawal.currency_code,
      p_reversal_amount_minor,
      p_reversal_amount_minor,
      'available',
      true,
      now(),
      now(),
      p_metadata || jsonb_build_object(
        'withdrawal_request_id',
        v_withdrawal.id,
        'withdrawal_reversal_group_id',
        v_reversal_group_id,
        'reversal_type',
        p_reversal_type,
        'reversal_reason',
        p_reversal_reason
      ),
      v_reversal_group_id
    )
    returning id into v_restored_lot_id;

    insert into wallet_ledger_entries (
      wallet_id,
      user_id,
      value_lot_id,
      withdrawal_reversal_group_id,
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
      v_withdrawal.wallet_id,
      v_withdrawal.user_id,
      v_restored_lot_id,
      v_reversal_group_id,
      'withdrawal_reversal',
      v_reversal_group_id,
      'withdrawal_reversal_credit',
      1,
      v_withdrawal.currency_code,
      p_reversal_amount_minor,
      p_reversal_amount_minor,
      0,
      0,
      'posted',
      p_idempotency_key,
      'reverse_paid_withdrawal',
      p_metadata || jsonb_build_object(
        'withdrawal_request_id',
        v_withdrawal.id,
        'withdrawal_reversal_group_id',
        v_reversal_group_id,
        'restored_lot_id',
        v_restored_lot_id
      )
    )
    returning id into v_ledger_entry_id;

    perform post_accounting_withdrawal_reversed(
      v_reversal_group_id,
      v_ledger_entry_id,
      'acct:withdrawal_reversed:' || v_reversal_group_id::text,
      p_metadata
    );

    perform audit_wallet_ledger_entry(v_ledger_entry_id, p_metadata);
  else
    v_restored_lot_id := null;
    v_ledger_entry_id := null;

    perform post_accounting_withdrawal_reversed_no_wallet_restore(
      v_reversal_group_id,
      'acct:withdrawal_reversed_no_restore:' || v_reversal_group_id::text,
      p_metadata
    );
  end if;

  v_new_reversed_total :=
    v_withdrawal.reversed_amount_minor + p_reversal_amount_minor;

  update wallet_withdrawal_requests
  set
    reversed_amount_minor = v_new_reversed_total,
    reversed_at =
      case
        when v_new_reversed_total = v_original_amount_minor then now()
        else coalesce(reversed_at, now())
      end,
    reversal_status =
      case
        when v_new_reversed_total = v_original_amount_minor then 'fully_reversed'
        else 'partially_reversed'
      end,
    reversal_reason = p_reversal_reason,
    status =
      case
        when v_new_reversed_total = v_original_amount_minor then 'reversed'
        else status
      end,
    updated_at = now()
  where id = v_withdrawal.id;

  update wallet_withdrawal_reversal_groups
  set
    status = 'completed',
    completed_at = now()
  where id = v_reversal_group_id;

  perform audit_withdrawal_reversal_group(
    v_reversal_group_id,
    p_metadata
  );

  perform wallet_complete_idempotent_operation(
    'reverse_paid_withdrawal',
    p_idempotency_key,
    'wallet_withdrawal_reversal_group',
    v_reversal_group_id,
    jsonb_build_object(
      'withdrawal_reversal_group_id', v_reversal_group_id,
      'withdrawal_request_id', v_withdrawal.id,
      'reversal_amount_minor', p_reversal_amount_minor,
      'restored_lot_id', v_restored_lot_id,
      'ledger_entry_id', v_ledger_entry_id
    )
  );

  return v_reversal_group_id;

exception
  when others then
    if v_reversal_group_id is not null then
      update wallet_withdrawal_reversal_groups
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_reversal_group_id;
    end if;

    raise;
end;
$$;

create or replace view wallet_withdrawal_reversal_group_details as
select
  rg.id as withdrawal_reversal_group_id,
  rg.withdrawal_request_id,
  rg.reservation_group_id,
  rg.wallet_id,
  rg.user_id,
  rg.currency_code,
  rg.original_withdrawal_amount_minor,
  rg.reversal_amount_minor,
  rg.reversal_type,
  rg.reversal_reason,
  rg.external_processor,
  rg.external_payout_id,
  rg.external_reversal_id,
  rg.restore_to_wallet,
  rg.status,
  rg.idempotency_key,
  rg.created_at,
  rg.completed_at,
  rg.failed_at,
  rg.failure_reason,

  wr.status as withdrawal_status,
  wr.requested_amount_minor as withdrawal_amount_minor,
  wr.reversed_amount_minor as withdrawal_reversed_amount_minor,
  wr.reversal_status as withdrawal_reversal_status,

  wl.id as restored_value_lot_id,
  wl.status as restored_lot_status,
  wl.remaining_amount_minor as restored_remaining_minor,

  le.id as ledger_entry_id,
  le.entry_type,
  le.amount_minor as ledger_amount_minor,
  le.available_impact_minor,
  le.accounting_journal_id,

  aj.id as accounting_journal_id,
  aj.journal_type as accounting_journal_type
from wallet_withdrawal_reversal_groups rg
left join wallet_withdrawal_requests wr
  on wr.id = rg.withdrawal_request_id
left join wallet_value_lots wl
  on wl.withdrawal_reversal_group_id = rg.id
left join wallet_ledger_entries le
  on le.withdrawal_reversal_group_id = rg.id
left join accounting_journals aj
  on aj.id = le.accounting_journal_id;

create or replace view withdrawal_reversals_missing_audit_hash as
select
  rg.*
from wallet_withdrawal_reversal_groups rg
left join audit_hash_chain_entries a
  on a.source_table = 'wallet_withdrawal_reversal_groups'
 and a.source_id = rg.id
 and a.source_event_type = 'withdrawal_reversal_completed'
where rg.status = 'completed'
  and a.id is null;

create or replace view withdrawal_reversals_missing_accounting as
select
  rg.*
from wallet_withdrawal_reversal_groups rg
left join accounting_journals aj
  on aj.source_type = 'wallet_withdrawal_reversal_group'
 and aj.source_id = rg.id
where rg.status = 'completed'
  and aj.id is null;
