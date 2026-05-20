create table if not exists accounting_accounts (
  id uuid primary key default gen_random_uuid(),

  account_key text not null unique,
  account_name text not null,

  account_type text not null,
  normal_balance text not null,

  currency_code text not null default 'USD',

  status text not null default 'active',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint accounting_accounts_type_check
  check (
    account_type in (
      'asset',
      'liability',
      'equity',
      'revenue',
      'expense',
      'contra_asset',
      'contra_liability',
      'contra_expense'
    )
  ),

  constraint accounting_accounts_normal_balance_check
  check (
    normal_balance in (
      'debit',
      'credit'
    )
  ),

  constraint accounting_accounts_status_check
  check (
    status in (
      'active',
      'disabled',
      'archived'
    )
  )
);

create index if not exists accounting_accounts_type_idx
on accounting_accounts (account_type, status);

insert into accounting_accounts (
  account_key,
  account_name,
  account_type,
  normal_balance,
  currency_code,
  metadata
)
values
  (
    'cash_platform_usd',
    'Platform Cash USD',
    'asset',
    'debit',
    'USD',
    '{"meaning": "real cash or processor-held funds"}'::jsonb
  ),
  (
    'campaign_budget_liability_usd',
    'Campaign Budget Liability USD',
    'liability',
    'credit',
    'USD',
    '{"meaning": "funds owed against advertiser-funded campaigns"}'::jsonb
  ),
  (
    'user_wallet_liability_usd',
    'User Wallet Liability USD',
    'liability',
    'credit',
    'USD',
    '{"meaning": "available/pending user balances owed by platform"}'::jsonb
  ),
  (
    'reward_expense_usd',
    'Reward Expense USD',
    'expense',
    'debit',
    'USD',
    '{"meaning": "platform-funded reward cost if not advertiser-funded"}'::jsonb
  ),
  (
    'campaign_reward_expense_usd',
    'Campaign Reward Expense USD',
    'expense',
    'debit',
    'USD',
    '{"meaning": "campaign reward cost recognized from campaign budget"}'::jsonb
  ),
  (
    'withdrawal_payable_usd',
    'Withdrawal Payable USD',
    'liability',
    'credit',
    'USD',
    '{"meaning": "approved withdrawals awaiting payout"}'::jsonb
  ),
  (
    'processor_clearing_usd',
    'Processor Clearing USD',
    'asset',
    'debit',
    'USD',
    '{"meaning": "external payment processor clearing account"}'::jsonb
  ),
  (
    'refunds_and_adjustments_usd',
    'Refunds And Adjustments USD',
    'expense',
    'debit',
    'USD',
    '{"meaning": "manual credits/refunds/adjustment expense"}'::jsonb
  ),
  (
    'fraud_recovery_usd',
    'Fraud Recovery USD',
    'contra_expense',
    'credit',
    'USD',
    '{"meaning": "recovered value from fraud clawbacks"}'::jsonb
  )
on conflict (account_key)
do update set
  account_name = excluded.account_name,
  account_type = excluded.account_type,
  normal_balance = excluded.normal_balance,
  metadata = accounting_accounts.metadata || excluded.metadata,
  updated_at = now();

alter table accounting_accounts
drop constraint if exists accounting_accounts_type_check;

alter table accounting_accounts
add constraint accounting_accounts_type_check
check (
  account_type in (
    'asset',
    'liability',
    'equity',
    'revenue',
    'expense',
    'contra_asset',
    'contra_liability',
    'contra_expense'
  )
);

create table if not exists accounting_journal_entries (
  id uuid primary key default gen_random_uuid(),

  journal_key text not null unique,

  journal_type text not null,

  source_type text not null,
  source_id uuid,

  wallet_id uuid references wallets(id),
  user_id uuid,
  campaign_id uuid,

  currency_code text not null default 'USD',

  total_debit_minor bigint not null default 0,
  total_credit_minor bigint not null default 0,

  status text not null default 'draft',

  idempotency_key text not null,
  operation_type text not null,

  posted_at timestamptz,
  reversed_at timestamptz,

  reversal_of_journal_entry_id uuid references accounting_journal_entries(id),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint accounting_journal_entries_status_check
  check (
    status in (
      'draft',
      'posted',
      'reversed',
      'voided',
      'failed'
    )
  ),

  constraint accounting_journal_entries_balance_check
  check (
    total_debit_minor >= 0
    and total_credit_minor >= 0
  )
);

create unique index if not exists accounting_journal_entries_idempotency_unique
on accounting_journal_entries (operation_type, idempotency_key);

create index if not exists accounting_journal_entries_wallet_idx
on accounting_journal_entries (wallet_id, created_at desc);

create index if not exists accounting_journal_entries_campaign_idx
on accounting_journal_entries (campaign_id, created_at desc);

create index if not exists accounting_journal_entries_source_idx
on accounting_journal_entries (source_type, source_id);

create index if not exists accounting_journal_entries_status_idx
on accounting_journal_entries (status, created_at desc);

create table if not exists accounting_journal_lines (
  id uuid primary key default gen_random_uuid(),

  journal_entry_id uuid not null references accounting_journal_entries(id) on delete cascade,

  account_id uuid not null references accounting_accounts(id),
  account_key text not null,

  line_type text not null,

  currency_code text not null default 'USD',

  debit_amount_minor bigint not null default 0,
  credit_amount_minor bigint not null default 0,

  wallet_ledger_entry_id uuid references wallet_ledger_entries(id),
  wallet_value_lot_id uuid references wallet_value_lots(id),
  campaign_budget_reservation_id uuid references campaign_budget_reservations(id),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint accounting_journal_lines_type_check
  check (
    line_type in (
      'debit',
      'credit'
    )
  ),

  constraint accounting_journal_lines_amount_check
  check (
    debit_amount_minor >= 0
    and credit_amount_minor >= 0
    and (
      (line_type = 'debit' and debit_amount_minor > 0 and credit_amount_minor = 0)
      or
      (line_type = 'credit' and credit_amount_minor > 0 and debit_amount_minor = 0)
    )
  )
);

create index if not exists accounting_journal_lines_journal_idx
on accounting_journal_lines (journal_entry_id);

create index if not exists accounting_journal_lines_account_idx
on accounting_journal_lines (account_key, created_at desc);

create index if not exists accounting_journal_lines_wallet_ledger_idx
on accounting_journal_lines (wallet_ledger_entry_id);

create or replace function get_accounting_account_id(
  p_account_key text
)
returns uuid
language plpgsql
stable
as $$
declare
  v_account_id uuid;
begin
  if p_account_key is null or length(trim(p_account_key)) = 0 then
    raise exception 'account key is required';
  end if;

  select id
  into v_account_id
  from accounting_accounts
  where account_key = p_account_key
    and status = 'active';

  if v_account_id is null then
    raise exception 'active accounting account not found: %', p_account_key;
  end if;

  return v_account_id;
end;
$$;

create or replace function create_accounting_journal_entry(
  p_journal_type text,
  p_source_type text,
  p_source_id uuid,
  p_wallet_id uuid,
  p_user_id uuid,
  p_campaign_id uuid,
  p_currency_code text,
  p_operation_type text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_journal_id uuid;
  v_existing_id uuid;
begin
  if p_journal_type is null or length(trim(p_journal_type)) = 0 then
    raise exception 'journal type is required';
  end if;

  if p_operation_type is null or length(trim(p_operation_type)) = 0 then
    raise exception 'operation type is required';
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency key is required';
  end if;

  select id
  into v_existing_id
  from accounting_journal_entries
  where operation_type = p_operation_type
    and idempotency_key = p_idempotency_key;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  insert into accounting_journal_entries (
    journal_key,
    journal_type,
    source_type,
    source_id,
    wallet_id,
    user_id,
    campaign_id,
    currency_code,
    status,
    operation_type,
    idempotency_key,
    metadata
  )
  values (
    p_operation_type || ':' || p_idempotency_key,
    p_journal_type,
    p_source_type,
    p_source_id,
    p_wallet_id,
    p_user_id,
    p_campaign_id,
    coalesce(p_currency_code, 'USD'),
    'draft',
    p_operation_type,
    p_idempotency_key,
    p_metadata
  )
  returning id into v_journal_id;

  return v_journal_id;
end;
$$;

create or replace function add_accounting_journal_line(
  p_journal_entry_id uuid,
  p_account_key text,
  p_line_type text,
  p_amount_minor bigint,
  p_currency_code text default 'USD',
  p_wallet_ledger_entry_id uuid default null,
  p_wallet_value_lot_id uuid default null,
  p_campaign_budget_reservation_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_account_id uuid;
  v_line_id uuid;
begin
  if p_journal_entry_id is null then
    raise exception 'journal entry id is required';
  end if;

  if p_line_type not in ('debit', 'credit') then
    raise exception 'invalid line type: %', p_line_type;
  end if;

  if p_amount_minor <= 0 then
    raise exception 'journal line amount must be positive';
  end if;

  v_account_id := get_accounting_account_id(p_account_key);

  insert into accounting_journal_lines (
    journal_entry_id,
    account_id,
    account_key,
    line_type,
    currency_code,
    debit_amount_minor,
    credit_amount_minor,
    wallet_ledger_entry_id,
    wallet_value_lot_id,
    campaign_budget_reservation_id,
    metadata
  )
  values (
    p_journal_entry_id,
    v_account_id,
    p_account_key,
    p_line_type,
    coalesce(p_currency_code, 'USD'),
    case when p_line_type = 'debit' then p_amount_minor else 0 end,
    case when p_line_type = 'credit' then p_amount_minor else 0 end,
    p_wallet_ledger_entry_id,
    p_wallet_value_lot_id,
    p_campaign_budget_reservation_id,
    p_metadata
  )
  returning id into v_line_id;

  return v_line_id;
end;
$$;

create or replace function post_accounting_journal_entry(
  p_journal_entry_id uuid
)
returns uuid
language plpgsql
as $$
declare
  v_total_debit bigint;
  v_total_credit bigint;
  v_line_count integer;
begin
  if p_journal_entry_id is null then
    raise exception 'journal entry id is required';
  end if;

  select
    coalesce(sum(debit_amount_minor), 0)::bigint,
    coalesce(sum(credit_amount_minor), 0)::bigint,
    count(*)::integer
  into
    v_total_debit,
    v_total_credit,
    v_line_count
  from accounting_journal_lines
  where journal_entry_id = p_journal_entry_id;

  if v_line_count < 2 then
    raise exception 'journal entry must have at least two lines';
  end if;

  if v_total_debit <> v_total_credit then
    update accounting_journal_entries
    set
      status = 'failed',
      total_debit_minor = v_total_debit,
      total_credit_minor = v_total_credit,
      updated_at = now(),
      metadata = metadata || jsonb_build_object(
        'failure_reason',
        'unbalanced_journal_entry'
      )
    where id = p_journal_entry_id;

    raise exception 'unbalanced journal entry. debit %, credit %',
      v_total_debit,
      v_total_credit;
  end if;

  update accounting_journal_entries
  set
    status = 'posted',
    total_debit_minor = v_total_debit,
    total_credit_minor = v_total_credit,
    posted_at = now(),
    updated_at = now()
  where id = p_journal_entry_id
    and status = 'draft';

  if not found then
    raise exception 'draft journal entry not found: %', p_journal_entry_id;
  end if;

  return p_journal_entry_id;
end;
$$;

create or replace function mirror_accounting_campaign_reward_issued(
  p_reward_issuance_group_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_group reward_issuance_groups%rowtype;
  v_journal_id uuid;
begin
  if p_reward_issuance_group_id is null then
    raise exception 'reward issuance group id is required';
  end if;

  select *
  into v_group
  from reward_issuance_groups
  where id = p_reward_issuance_group_id;

  if v_group.id is null then
    raise exception 'reward issuance group not found: %', p_reward_issuance_group_id;
  end if;

  if v_group.status <> 'completed' then
    raise exception 'cannot mirror incomplete reward issuance group. status %',
      v_group.status;
  end if;

  v_journal_id := create_accounting_journal_entry(
    'campaign_reward_issued',
    'reward_issuance_group',
    v_group.id,
    v_group.wallet_id,
    v_group.user_id,
    v_group.campaign_id,
    v_group.currency_code,
    'mirror_accounting_campaign_reward_issued',
    'reward_issuance_group:' || v_group.id::text,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'campaign_reward_expense_usd',
    'debit',
    v_group.reward_amount_minor,
    v_group.currency_code,
    null,
    v_group.wallet_value_lot_id,
    v_group.campaign_budget_reservation_id,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'user_wallet_liability_usd',
    'credit',
    v_group.reward_amount_minor,
    v_group.currency_code,
    null,
    v_group.wallet_value_lot_id,
    v_group.campaign_budget_reservation_id,
    p_metadata
  );

  perform post_accounting_journal_entry(v_journal_id);

  return v_journal_id;
end;
$$;

create or replace function mirror_accounting_admin_credit(
  p_admin_adjustment_group_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_group wallet_admin_adjustment_groups%rowtype;
  v_journal_id uuid;
begin
  select *
  into v_group
  from wallet_admin_adjustment_groups
  where id = p_admin_adjustment_group_id;

  if v_group.id is null then
    raise exception 'admin adjustment group not found: %', p_admin_adjustment_group_id;
  end if;

  if v_group.status <> 'completed' or v_group.direction <> 1 then
    raise exception 'admin adjustment is not completed credit';
  end if;

  v_journal_id := create_accounting_journal_entry(
    'admin_wallet_credit',
    'wallet_admin_adjustment_group',
    v_group.id,
    v_group.wallet_id,
    v_group.user_id,
    null,
    v_group.currency_code,
    'mirror_accounting_admin_credit',
    'admin_adjustment_group:' || v_group.id::text,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'refunds_and_adjustments_usd',
    'debit',
    v_group.adjusted_amount_minor,
    v_group.currency_code,
    null,
    null,
    null,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'user_wallet_liability_usd',
    'credit',
    v_group.adjusted_amount_minor,
    v_group.currency_code,
    null,
    null,
    null,
    p_metadata
  );

  perform post_accounting_journal_entry(v_journal_id);

  return v_journal_id;
end;
$$;

create or replace function mirror_accounting_admin_debit(
  p_admin_adjustment_group_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_group wallet_admin_adjustment_groups%rowtype;
  v_journal_id uuid;
begin
  select *
  into v_group
  from wallet_admin_adjustment_groups
  where id = p_admin_adjustment_group_id;

  if v_group.id is null then
    raise exception 'admin adjustment group not found: %', p_admin_adjustment_group_id;
  end if;

  if v_group.status <> 'completed' or v_group.direction <> -1 then
    raise exception 'admin adjustment is not completed debit';
  end if;

  v_journal_id := create_accounting_journal_entry(
    'admin_wallet_debit',
    'wallet_admin_adjustment_group',
    v_group.id,
    v_group.wallet_id,
    v_group.user_id,
    null,
    v_group.currency_code,
    'mirror_accounting_admin_debit',
    'admin_adjustment_group:' || v_group.id::text,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'user_wallet_liability_usd',
    'debit',
    v_group.adjusted_amount_minor,
    v_group.currency_code,
    null,
    null,
    null,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'refunds_and_adjustments_usd',
    'credit',
    v_group.adjusted_amount_minor,
    v_group.currency_code,
    null,
    null,
    null,
    p_metadata
  );

  perform post_accounting_journal_entry(v_journal_id);

  return v_journal_id;
end;
$$;

create or replace function mirror_accounting_withdrawal_reserved(
  p_withdrawal_request_id uuid,
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_currency_code text default 'USD',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_journal_id uuid;
begin
  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  if p_amount_minor <= 0 then
    raise exception 'withdrawal amount must be positive';
  end if;

  v_journal_id := create_accounting_journal_entry(
    'withdrawal_reserved',
    'withdrawal_request',
    p_withdrawal_request_id,
    p_wallet_id,
    p_user_id,
    null,
    p_currency_code,
    'mirror_accounting_withdrawal_reserved',
    'withdrawal_request:' || p_withdrawal_request_id::text,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'user_wallet_liability_usd',
    'debit',
    p_amount_minor,
    p_currency_code,
    null,
    null,
    null,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'withdrawal_payable_usd',
    'credit',
    p_amount_minor,
    p_currency_code,
    null,
    null,
    null,
    p_metadata
  );

  perform post_accounting_journal_entry(v_journal_id);

  return v_journal_id;
end;
$$;

create or replace function mirror_accounting_withdrawal_paid(
  p_withdrawal_request_id uuid,
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_currency_code text default 'USD',
  p_processor_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_journal_id uuid;
begin
  if p_amount_minor <= 0 then
    raise exception 'paid amount must be positive';
  end if;

  v_journal_id := create_accounting_journal_entry(
    'withdrawal_paid',
    'withdrawal_request',
    p_withdrawal_request_id,
    p_wallet_id,
    p_user_id,
    null,
    p_currency_code,
    'mirror_accounting_withdrawal_paid',
    'withdrawal_request:' || p_withdrawal_request_id::text,
    p_metadata || jsonb_build_object(
      'processor_reference',
      p_processor_reference
    )
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'withdrawal_payable_usd',
    'debit',
    p_amount_minor,
    p_currency_code,
    null,
    null,
    null,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'processor_clearing_usd',
    'credit',
    p_amount_minor,
    p_currency_code,
    null,
    null,
    null,
    p_metadata || jsonb_build_object(
      'processor_reference',
      p_processor_reference
    )
  );

  perform post_accounting_journal_entry(v_journal_id);

  return v_journal_id;
end;
$$;

create or replace function mirror_accounting_campaign_reward_clawback(
  p_campaign_budget_refund_group_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_group campaign_budget_refund_groups%rowtype;
  v_journal_id uuid;
begin
  select *
  into v_group
  from campaign_budget_refund_groups
  where id = p_campaign_budget_refund_group_id;

  if v_group.id is null then
    raise exception 'campaign budget refund group not found: %',
      p_campaign_budget_refund_group_id;
  end if;

  if v_group.status <> 'completed' then
    raise exception 'campaign budget refund group is not completed';
  end if;

  v_journal_id := create_accounting_journal_entry(
    'campaign_reward_clawback',
    'campaign_budget_refund_group',
    v_group.id,
    v_group.wallet_id,
    v_group.user_id,
    v_group.campaign_id,
    v_group.currency_code,
    'mirror_accounting_campaign_reward_clawback',
    'campaign_budget_refund_group:' || v_group.id::text,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'user_wallet_liability_usd',
    'debit',
    v_group.refunded_amount_minor,
    v_group.currency_code,
    null,
    v_group.wallet_value_lot_id,
    v_group.campaign_budget_reservation_id,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'fraud_recovery_usd',
    'credit',
    v_group.refunded_amount_minor,
    v_group.currency_code,
    null,
    v_group.wallet_value_lot_id,
    v_group.campaign_budget_reservation_id,
    p_metadata
  );

  perform post_accounting_journal_entry(v_journal_id);

  return v_journal_id;
end;
$$;

create or replace view accounting_account_balances as
select
  a.id as account_id,
  a.account_key,
  a.account_name,
  a.account_type,
  a.normal_balance,
  a.currency_code,

  coalesce(sum(l.debit_amount_minor), 0)::bigint as total_debit_minor,
  coalesce(sum(l.credit_amount_minor), 0)::bigint as total_credit_minor,

  case
    when a.normal_balance = 'debit' then
      (
        coalesce(sum(l.debit_amount_minor), 0)
        - coalesce(sum(l.credit_amount_minor), 0)
      )::bigint
    else
      (
        coalesce(sum(l.credit_amount_minor), 0)
        - coalesce(sum(l.debit_amount_minor), 0)
      )::bigint
  end as balance_minor,

  max(l.created_at) as last_line_at

from accounting_accounts a
left join accounting_journal_lines l
  on l.account_id = a.id
left join accounting_journal_entries je
  on je.id = l.journal_entry_id
 and je.status = 'posted'
group by a.id;

create or replace view accounting_unbalanced_journals as
select
  je.id as journal_entry_id,
  je.journal_key,
  je.journal_type,
  je.source_type,
  je.source_id,
  je.wallet_id,
  je.user_id,
  je.campaign_id,
  je.currency_code,
  je.status,

  coalesce(sum(l.debit_amount_minor), 0)::bigint as computed_debit_minor,
  coalesce(sum(l.credit_amount_minor), 0)::bigint as computed_credit_minor,

  (
    coalesce(sum(l.debit_amount_minor), 0)
    - coalesce(sum(l.credit_amount_minor), 0)
  )::bigint as delta_minor,

  count(l.id) as line_count,

  je.created_at,
  je.posted_at

from accounting_journal_entries je
left join accounting_journal_lines l
  on l.journal_entry_id = je.id
group by je.id
having
  coalesce(sum(l.debit_amount_minor), 0)
  <>
  coalesce(sum(l.credit_amount_minor), 0);

create or replace view accounting_missing_mirrors as
select
  'reward_issuance_group' as source_type,
  rig.id as source_id,
  rig.wallet_id,
  rig.user_id,
  rig.campaign_id,
  rig.currency_code,
  rig.reward_amount_minor as amount_minor,
  rig.completed_at as source_completed_at
from reward_issuance_groups rig
left join accounting_journal_entries je
  on je.source_type = 'reward_issuance_group'
 and je.source_id = rig.id
 and je.status = 'posted'
where rig.status = 'completed'
  and je.id is null

union all

select
  'wallet_admin_adjustment_group' as source_type,
  ag.id as source_id,
  ag.wallet_id,
  ag.user_id,
  null as campaign_id,
  ag.currency_code,
  ag.adjusted_amount_minor as amount_minor,
  ag.completed_at as source_completed_at
from wallet_admin_adjustment_groups ag
left join accounting_journal_entries je
  on je.source_type = 'wallet_admin_adjustment_group'
 and je.source_id = ag.id
 and je.status = 'posted'
where ag.status = 'completed'
  and je.id is null

union all

select
  'campaign_budget_refund_group' as source_type,
  crg.id as source_id,
  crg.wallet_id,
  crg.user_id,
  crg.campaign_id,
  crg.currency_code,
  crg.refunded_amount_minor as amount_minor,
  crg.completed_at as source_completed_at
from campaign_budget_refund_groups crg
left join accounting_journal_entries je
  on je.source_type = 'campaign_budget_refund_group'
 and je.source_id = crg.id
 and je.status = 'posted'
where crg.status = 'completed'
  and je.id is null;

create table if not exists accounting_mirror_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  scanned_count integer not null default 0,
  mirrored_count integer not null default 0,
  failed_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,

  constraint accounting_mirror_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists accounting_mirror_runs_started_idx
on accounting_mirror_runs (started_at desc);

create or replace function run_accounting_mirror_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_row record;

  v_scanned integer := 0;
  v_mirrored integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into accounting_mirror_runs (
    run_type,
    status,
    metadata
  )
  values (
    'scheduled',
    'processing',
    p_metadata
  )
  returning id into v_run_id;

  for v_row in
    select *
    from accounting_missing_mirrors
    order by source_completed_at asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;

    begin
      if v_row.source_type = 'reward_issuance_group' then
        perform mirror_accounting_campaign_reward_issued(
          v_row.source_id,
          p_metadata || jsonb_build_object(
            'accounting_mirror_run_id',
            v_run_id
          )
        );

      elsif v_row.source_type = 'wallet_admin_adjustment_group' then
        if exists (
          select 1
          from wallet_admin_adjustment_groups
          where id = v_row.source_id
            and direction = 1
        ) then
          perform mirror_accounting_admin_credit(
            v_row.source_id,
            p_metadata || jsonb_build_object(
              'accounting_mirror_run_id',
              v_run_id
            )
          );
        else
          perform mirror_accounting_admin_debit(
            v_row.source_id,
            p_metadata || jsonb_build_object(
              'accounting_mirror_run_id',
              v_run_id
            )
          );
        end if;

      elsif v_row.source_type = 'campaign_budget_refund_group' then
        perform mirror_accounting_campaign_reward_clawback(
          v_row.source_id,
          p_metadata || jsonb_build_object(
            'accounting_mirror_run_id',
            v_run_id
          )
        );
      end if;

      v_mirrored := v_mirrored + 1;

    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update accounting_mirror_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_count = v_scanned,
    mirrored_count = v_mirrored,
    failed_count = v_failed
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update accounting_mirror_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace view accounting_journal_details as
select
  je.id as journal_entry_id,
  je.journal_key,
  je.journal_type,
  je.source_type,
  je.source_id,
  je.wallet_id,
  je.user_id,
  je.campaign_id,
  je.currency_code,
  je.total_debit_minor,
  je.total_credit_minor,
  je.status,
  je.operation_type,
  je.idempotency_key,
  je.posted_at,
  je.reversed_at,
  je.created_at,

  jsonb_agg(
    jsonb_build_object(
      'journal_line_id', jl.id,
      'account_key', jl.account_key,
      'line_type', jl.line_type,
      'currency_code', jl.currency_code,
      'debit_amount_minor', jl.debit_amount_minor,
      'credit_amount_minor', jl.credit_amount_minor,
      'wallet_ledger_entry_id', jl.wallet_ledger_entry_id,
      'wallet_value_lot_id', jl.wallet_value_lot_id,
      'campaign_budget_reservation_id', jl.campaign_budget_reservation_id,
      'metadata', jl.metadata
    )
    order by jl.created_at asc
  ) filter (where jl.id is not null) as lines

from accounting_journal_entries je
left join accounting_journal_lines jl
  on jl.journal_entry_id = je.id
group by je.id;
