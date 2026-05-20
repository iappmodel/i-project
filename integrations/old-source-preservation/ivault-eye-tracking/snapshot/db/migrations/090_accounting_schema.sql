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
      'contra_revenue',
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

  constraint accounting_accounts_currency_check
  check (currency_code in ('USD')),

  constraint accounting_accounts_status_check
  check (
    status in (
      'active',
      'archived'
    )
  )
);

create index if not exists accounting_accounts_type_idx
on accounting_accounts (account_type, status);

drop trigger if exists accounting_accounts_set_updated_at
on accounting_accounts;

create trigger accounting_accounts_set_updated_at
before update on accounting_accounts
for each row
execute function set_updated_at();

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
    'cash_usd',
    'Cash USD',
    'asset',
    'debit',
    'USD',
    '{"system": true}'::jsonb
  ),
  (
    'user_wallet_liability_usd',
    'User Wallet Liability USD',
    'liability',
    'credit',
    'USD',
    '{"system": true}'::jsonb
  ),
  (
    'campaign_reward_expense_usd',
    'Campaign Reward Expense USD',
    'expense',
    'debit',
    'USD',
    '{"system": true}'::jsonb
  ),
  (
    'platform_revenue_usd',
    'Platform Revenue USD',
    'revenue',
    'credit',
    'USD',
    '{"system": true}'::jsonb
  ),
  (
    'payout_payable_usd',
    'Payout Payable USD',
    'liability',
    'credit',
    'USD',
    '{"system": true}'::jsonb
  ),
  (
    'payout_fee_expense_usd',
    'Payout Fee Expense USD',
    'expense',
    'debit',
    'USD',
    '{"system": true}'::jsonb
  )
on conflict (account_key)
do update set
  account_name = excluded.account_name,
  account_type = excluded.account_type,
  normal_balance = excluded.normal_balance,
  metadata = accounting_accounts.metadata || excluded.metadata,
  updated_at = now();

create table if not exists accounting_journal_entries (
  id uuid primary key default gen_random_uuid(),

  journal_key text not null unique,

  source_type text not null,
  source_id uuid,

  status text not null default 'posted',

  description text,

  currency_code text not null default 'USD',

  total_debit_minor bigint not null default 0,
  total_credit_minor bigint not null default 0,

  posted_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint accounting_journal_entries_currency_check
  check (currency_code in ('USD')),

  constraint accounting_journal_entries_status_check
  check (
    status in (
      'draft',
      'posted',
      'voided',
      'reversed'
    )
  ),

  constraint accounting_journal_entries_balanced_check
  check (total_debit_minor = total_credit_minor)
);

create index if not exists accounting_journal_entries_source_idx
on accounting_journal_entries (source_type, source_id);

create index if not exists accounting_journal_entries_status_idx
on accounting_journal_entries (status, posted_at desc);

drop trigger if exists accounting_journal_entries_set_updated_at
on accounting_journal_entries;

create trigger accounting_journal_entries_set_updated_at
before update on accounting_journal_entries
for each row
execute function set_updated_at();

create table if not exists accounting_journal_lines (
  id uuid primary key default gen_random_uuid(),

  journal_entry_id uuid not null references accounting_journal_entries(id) on delete cascade,

  account_id uuid not null references accounting_accounts(id),
  account_key text not null,

  line_type text not null,

  amount_minor bigint not null,

  currency_code text not null default 'USD',

  memo text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint accounting_journal_lines_line_type_check
  check (
    line_type in (
      'debit',
      'credit'
    )
  ),

  constraint accounting_journal_lines_amount_check
  check (amount_minor > 0),

  constraint accounting_journal_lines_currency_check
  check (currency_code in ('USD'))
);

create index if not exists accounting_journal_lines_journal_idx
on accounting_journal_lines (journal_entry_id);

create index if not exists accounting_journal_lines_account_idx
on accounting_journal_lines (account_key, created_at desc);

create or replace function create_accounting_journal_entry(
  p_journal_key text,
  p_source_type text,
  p_source_id uuid,
  p_description text,
  p_lines jsonb,
  p_currency_code text default 'USD',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_journal_id uuid;
  v_line jsonb;

  v_account accounting_accounts%rowtype;

  v_total_debit bigint := 0;
  v_total_credit bigint := 0;

  v_line_type text;
  v_account_key text;
  v_amount_minor bigint;
  v_memo text;
begin
  if p_journal_key is null or length(trim(p_journal_key)) = 0 then
    raise exception 'journal key is required';
  end if;

  if p_source_type is null or length(trim(p_source_type)) = 0 then
    raise exception 'source type is required';
  end if;

  if coalesce(p_currency_code, 'USD') <> 'USD' then
    raise exception 'unsupported currency: %', p_currency_code;
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 2 then
    raise exception 'journal requires at least two lines';
  end if;

  if exists (
    select 1
    from accounting_journal_entries
    where journal_key = p_journal_key
  ) then
    select id
    into v_journal_id
    from accounting_journal_entries
    where journal_key = p_journal_key;

    return v_journal_id;
  end if;

  for v_line in
    select *
    from jsonb_array_elements(p_lines)
  loop
    v_line_type := v_line->>'line_type';
    v_account_key := v_line->>'account_key';
    v_amount_minor := (v_line->>'amount_minor')::bigint;

    if v_line_type not in ('debit', 'credit') then
      raise exception 'invalid journal line type: %', v_line_type;
    end if;

    if v_amount_minor <= 0 then
      raise exception 'journal line amount must be positive';
    end if;

    select *
    into v_account
    from accounting_accounts
    where account_key = v_account_key
      and status = 'active';

    if v_account.id is null then
      raise exception 'account not found or inactive: %', v_account_key;
    end if;

    if v_line_type = 'debit' then
      v_total_debit := v_total_debit + v_amount_minor;
    else
      v_total_credit := v_total_credit + v_amount_minor;
    end if;
  end loop;

  if v_total_debit <> v_total_credit then
    raise exception 'unbalanced journal entry: debit %, credit %',
      v_total_debit,
      v_total_credit;
  end if;

  insert into accounting_journal_entries (
    journal_key,
    source_type,
    source_id,
    status,
    description,
    currency_code,
    total_debit_minor,
    total_credit_minor,
    metadata
  )
  values (
    p_journal_key,
    p_source_type,
    p_source_id,
    'posted',
    p_description,
    'USD',
    v_total_debit,
    v_total_credit,
    p_metadata
  )
  returning id into v_journal_id;

  for v_line in
    select *
    from jsonb_array_elements(p_lines)
  loop
    v_line_type := v_line->>'line_type';
    v_account_key := v_line->>'account_key';
    v_amount_minor := (v_line->>'amount_minor')::bigint;
    v_memo := v_line->>'memo';

    select *
    into v_account
    from accounting_accounts
    where account_key = v_account_key
      and status = 'active';

    insert into accounting_journal_lines (
      journal_entry_id,
      account_id,
      account_key,
      line_type,
      amount_minor,
      currency_code,
      memo,
      metadata
    )
    values (
      v_journal_id,
      v_account.id,
      v_account.account_key,
      v_line_type,
      v_amount_minor,
      'USD',
      v_memo,
      coalesce(v_line->'metadata', '{}'::jsonb)
    );
  end loop;

  return v_journal_id;
end;
$$;

create or replace function mirror_accounting_reward_issued(
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
    raise exception 'reward group must be completed before accounting mirror';
  end if;

  v_journal_id := create_accounting_journal_entry(
    'reward_issued:' || v_group.id::text,
    'reward_issuance_group',
    v_group.id,
    'Reward issued from verified attention',
    jsonb_build_array(
      jsonb_build_object(
        'line_type', 'debit',
        'account_key', 'campaign_reward_expense_usd',
        'amount_minor', v_group.reward_amount_minor,
        'memo', 'Reward expense'
      ),
      jsonb_build_object(
        'line_type', 'credit',
        'account_key', 'user_wallet_liability_usd',
        'amount_minor', v_group.reward_amount_minor,
        'memo', 'User wallet liability increase'
      )
    ),
    v_group.currency_code,
    p_metadata || jsonb_build_object(
      'reward_issuance_group_id',
      v_group.id,
      'attention_event_id',
      v_group.attention_event_id,
      'wallet_id',
      v_group.wallet_id,
      'user_id',
      v_group.user_id,
      'campaign_id',
      v_group.campaign_id
    )
  );

  return v_journal_id;
end;
$$;

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
  v_group record;

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

  for v_group in
    select rig.id
    from reward_issuance_groups rig
    where rig.status = 'completed'
      and not exists (
        select 1
        from accounting_journal_entries aje
        where aje.source_type = 'reward_issuance_group'
          and aje.source_id = rig.id
          and aje.status = 'posted'
      )
    order by rig.completed_at asc nulls last, rig.created_at asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;

    begin
      perform mirror_accounting_reward_issued(
        v_group.id,
        p_metadata || jsonb_build_object(
          'accounting_mirror_run_id',
          v_run_id
        )
      );

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

create or replace view accounting_account_balances as
select
  aa.id as account_id,
  aa.account_key,
  aa.account_name,
  aa.account_type,
  aa.normal_balance,
  aa.currency_code,

  coalesce(sum(ajl.amount_minor) filter (where ajl.line_type = 'debit'), 0)::bigint
    as debit_total_minor,

  coalesce(sum(ajl.amount_minor) filter (where ajl.line_type = 'credit'), 0)::bigint
    as credit_total_minor,

  case
    when aa.normal_balance = 'debit' then
      (
        coalesce(sum(ajl.amount_minor) filter (where ajl.line_type = 'debit'), 0)
        -
        coalesce(sum(ajl.amount_minor) filter (where ajl.line_type = 'credit'), 0)
      )::bigint
    else
      (
        coalesce(sum(ajl.amount_minor) filter (where ajl.line_type = 'credit'), 0)
        -
        coalesce(sum(ajl.amount_minor) filter (where ajl.line_type = 'debit'), 0)
      )::bigint
  end as balance_minor

from accounting_accounts aa
left join accounting_journal_lines ajl
  on ajl.account_id = aa.id
left join accounting_journal_entries aje
  on aje.id = ajl.journal_entry_id
 and aje.status = 'posted'
where aa.status = 'active'
group by aa.id;

create or replace view accounting_unbalanced_journals as
select
  aje.id as journal_entry_id,
  aje.journal_key,
  aje.source_type,
  aje.source_id,
  aje.total_debit_minor,
  aje.total_credit_minor,
  (
    aje.total_debit_minor - aje.total_credit_minor
  ) as delta_minor,
  aje.created_at
from accounting_journal_entries aje
where aje.total_debit_minor <> aje.total_credit_minor;

create or replace view accounting_missing_reward_mirrors as
select
  rig.id as reward_issuance_group_id,
  rig.attention_event_id,
  rig.wallet_id,
  rig.user_id,
  rig.campaign_id,
  rig.reward_amount_minor,
  rig.completed_at
from reward_issuance_groups rig
where rig.status = 'completed'
  and not exists (
    select 1
    from accounting_journal_entries aje
    where aje.source_type = 'reward_issuance_group'
      and aje.source_id = rig.id
      and aje.status = 'posted'
  );

create or replace view accounting_journal_details as
select
  aje.id as journal_entry_id,
  aje.journal_key,
  aje.source_type,
  aje.source_id,
  aje.status,
  aje.description,
  aje.currency_code,
  aje.total_debit_minor,
  aje.total_credit_minor,
  aje.posted_at,
  aje.created_at,

  jsonb_agg(
    jsonb_build_object(
      'journal_line_id', ajl.id,
      'account_key', ajl.account_key,
      'line_type', ajl.line_type,
      'amount_minor', ajl.amount_minor,
      'memo', ajl.memo
    )
    order by ajl.created_at asc
  ) filter (where ajl.id is not null) as lines

from accounting_journal_entries aje
left join accounting_journal_lines ajl
  on ajl.journal_entry_id = aje.id
group by aje.id;

create or replace view money_integrity_dashboard as
select
  (
    select count(*)
    from accounting_unbalanced_journals
  ) as unbalanced_journal_count,

  (
    select count(*)
    from accounting_missing_reward_mirrors
  ) as missing_reward_mirror_count,

  (
    select coalesce(sum(balance_minor), 0)
    from accounting_account_balances
    where account_key = 'user_wallet_liability_usd'
  ) as accounting_user_wallet_liability_minor,

  (
    select coalesce(sum(total_balance_minor), 0)
    from wallets
  ) as wallet_total_balance_minor,

  (
    (
      select coalesce(sum(balance_minor), 0)
      from accounting_account_balances
      where account_key = 'user_wallet_liability_usd'
    )
    -
    (
      select coalesce(sum(total_balance_minor), 0)
      from wallets
    )
  ) as wallet_vs_accounting_delta_minor,

  now() as checked_at;
