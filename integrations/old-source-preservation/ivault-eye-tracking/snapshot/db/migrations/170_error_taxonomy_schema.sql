-- Step 7.9 — Error taxonomy schema
-- Canonical catalog, events, raw→code mapping, API error helpers, dashboard views.
-- Extends or replaces partial 057 definitions: keeps admin_user_id on error_events and
-- legacy catalog categories where older rows may exist.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Error catalog
-- ---------------------------------------------------------------------------

create table if not exists error_catalog (
  id uuid primary key default gen_random_uuid(),

  error_code text not null unique,

  category text not null,
  severity text not null default 'medium',

  http_status integer not null default 400,

  retryable boolean not null default false,
  user_visible boolean not null default true,

  user_message text not null,
  internal_message text not null,

  owner_team text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint error_catalog_severity_check
  check (
    severity in (
      'low',
      'medium',
      'high',
      'critical'
    )
  )
);

alter table error_catalog drop constraint if exists error_catalog_category_check;

alter table error_catalog
  add constraint error_catalog_category_check
  check (
    category in (
      'validation',
      'auth',
      'permission',
      'wallet',
      'attention',
      'reward',
      'campaign',
      'accounting',
      'audit',
      'scheduler',
      'system',
      'withdrawal',
      'trust',
      'payout',
      'admin',
      'model',
      'evidence'
    )
  );

alter table error_catalog drop constraint if exists error_catalog_http_status_check;

alter table error_catalog
  add constraint error_catalog_http_status_check
  check (
    http_status >= 200
    and http_status <= 599
  );

create index if not exists error_catalog_category_idx
on error_catalog (category, severity);

create index if not exists error_catalog_retryable_idx
on error_catalog (retryable, category);

drop trigger if exists error_catalog_set_updated_at on error_catalog;

create trigger error_catalog_set_updated_at
before update on error_catalog
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Error events
-- ---------------------------------------------------------------------------

create table if not exists error_events (
  id uuid primary key default gen_random_uuid(),

  error_code text not null references error_catalog(error_code),

  request_id text,
  idempotency_key text,

  actor_type text,
  user_id uuid,
  wallet_id uuid references wallets(id),

  source text not null,
  endpoint text,
  function_name text,

  severity text not null,
  retryable boolean not null default false,

  message text,
  raw_error text,

  related_entity_type text,
  related_entity_id uuid,

  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),

  constraint error_events_actor_type_check
  check (
    actor_type is null
    or actor_type in (
      'user',
      'admin',
      'worker',
      'provider',
      'system'
    )
  ),

  constraint error_events_severity_check
  check (
    severity in (
      'low',
      'medium',
      'high',
      'critical'
    )
  )
);

alter table error_events
  add column if not exists admin_user_id uuid references admin_users(id);

create index if not exists error_events_code_idx
on error_events (error_code, occurred_at desc);

create index if not exists error_events_wallet_idx
on error_events (wallet_id, occurred_at desc);

create index if not exists error_events_admin_idx
on error_events (admin_user_id, occurred_at desc);

create index if not exists error_events_source_idx
on error_events (source, occurred_at desc);

create index if not exists error_events_request_idx
on error_events (request_id);

-- ---------------------------------------------------------------------------
-- 3–6. Seed catalog rows
-- ---------------------------------------------------------------------------

insert into error_catalog (
  error_code,
  category,
  severity,
  http_status,
  retryable,
  user_visible,
  user_message,
  internal_message,
  owner_team
)
values
  (
    'VALIDATION_FAILED',
    'validation',
    'low',
    400,
    false,
    true,
    'The request is invalid.',
    'Request validation failed.',
    'platform'
  ),
  (
    'INVALID_IDEMPOTENCY_KEY',
    'validation',
    'medium',
    400,
    false,
    true,
    'The request could not be safely processed.',
    'Invalid or missing idempotency key.',
    'platform'
  ),
  (
    'AUTH_REQUIRED',
    'auth',
    'medium',
    401,
    false,
    true,
    'You need to sign in.',
    'Authentication required.',
    'platform'
  ),
  (
    'PERMISSION_DENIED',
    'permission',
    'high',
    403,
    false,
    true,
    'You do not have permission to do that.',
    'Permission check failed.',
    'platform'
  ),
  (
    'SYSTEM_INTERNAL_ERROR',
    'system',
    'critical',
    500,
    true,
    true,
    'Something went wrong. Please try again.',
    'Unexpected internal error.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_catalog (
  error_code,
  category,
  severity,
  http_status,
  retryable,
  user_visible,
  user_message,
  internal_message,
  owner_team
)
values
  (
    'WALLET_NOT_FOUND',
    'wallet',
    'medium',
    404,
    false,
    true,
    'Wallet not found.',
    'Wallet row not found.',
    'wallet'
  ),
  (
    'WALLET_USER_MISMATCH',
    'wallet',
    'high',
    403,
    false,
    false,
    'Wallet access denied.',
    'Wallet/user mismatch.',
    'wallet'
  ),
  (
    'INSUFFICIENT_BALANCE',
    'wallet',
    'medium',
    409,
    false,
    true,
    'Insufficient available balance.',
    'Available wallet balance is below requested amount.',
    'wallet'
  ),
  (
    'WALLET_FRAUD_LOCKED',
    'wallet',
    'high',
    403,
    false,
    true,
    'This wallet is temporarily restricted.',
    'Wallet is fraud locked or unavailable.',
    'trust'
  ),
  (
    'WALLET_INTEGRITY_FAILED',
    'wallet',
    'critical',
    500,
    false,
    false,
    'A wallet consistency error occurred.',
    'Wallet integrity check failed.',
    'wallet'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_catalog (
  error_code,
  category,
  severity,
  http_status,
  retryable,
  user_visible,
  user_message,
  internal_message,
  owner_team
)
values
  (
    'ATTENTION_SESSION_NOT_FOUND',
    'attention',
    'medium',
    404,
    false,
    true,
    'Attention session not found.',
    'Attention verification session not found.',
    'attention'
  ),
  (
    'ATTENTION_RUNTIME_NOT_ALLOWED',
    'attention',
    'high',
    409,
    false,
    false,
    'Verification version is not available.',
    'Attention runtime model/pipeline/schema version is not allowed.',
    'attention'
  ),
  (
    'ATTENTION_NOT_REWARD_ELIGIBLE',
    'attention',
    'medium',
    422,
    false,
    true,
    'This activity is not eligible for a reward.',
    'Attention event is not reward eligible.',
    'reward'
  ),
  (
    'ATTENTION_FRAUD_SUSPECTED',
    'attention',
    'high',
    403,
    false,
    true,
    'This verification could not be accepted.',
    'Attention fraud suspected.',
    'trust'
  ),
  (
    'REWARD_ALREADY_ISSUED',
    'reward',
    'medium',
    409,
    false,
    false,
    'Reward already processed.',
    'Reward has already been issued for this source event.',
    'reward'
  ),
  (
    'REWARD_ISSUANCE_FAILED',
    'reward',
    'high',
    500,
    true,
    false,
    'Reward processing failed.',
    'Reward issuance failed.',
    'reward'
  ),
  (
    'CAMPAIGN_BUDGET_NOT_FOUND',
    'campaign',
    'medium',
    404,
    false,
    false,
    'Campaign is unavailable.',
    'Campaign budget not found.',
    'campaign'
  ),
  (
    'CAMPAIGN_BUDGET_INACTIVE',
    'campaign',
    'medium',
    409,
    false,
    true,
    'This campaign is not available.',
    'Campaign budget is not active.',
    'campaign'
  ),
  (
    'CAMPAIGN_BUDGET_EXHAUSTED',
    'campaign',
    'high',
    409,
    true,
    true,
    'This campaign is no longer available.',
    'Campaign budget has insufficient available funds.',
    'campaign'
  ),
  (
    'CAMPAIGN_BUDGET_INTEGRITY_FAILED',
    'campaign',
    'critical',
    500,
    false,
    false,
    'A campaign budget consistency error occurred.',
    'Campaign budget integrity check failed.',
    'campaign'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_catalog (
  error_code,
  category,
  severity,
  http_status,
  retryable,
  user_visible,
  user_message,
  internal_message,
  owner_team
)
values
  (
    'ACCOUNTING_UNBALANCED_JOURNAL',
    'accounting',
    'critical',
    500,
    false,
    false,
    'A financial consistency error occurred.',
    'Accounting journal debit/credit totals do not balance.',
    'finance'
  ),
  (
    'ACCOUNTING_MIRROR_MISSING',
    'accounting',
    'high',
    500,
    true,
    false,
    'A financial processing delay occurred.',
    'Expected accounting mirror is missing.',
    'finance'
  ),
  (
    'MONEY_INTEGRITY_FAILED',
    'accounting',
    'critical',
    500,
    false,
    false,
    'A financial consistency error occurred.',
    'Money integrity dashboard detected wallet/accounting mismatch.',
    'finance'
  ),
  (
    'AUDIT_HASH_CHAIN_BROKEN',
    'audit',
    'critical',
    500,
    false,
    false,
    'Audit integrity issue detected.',
    'Audit hash chain verification failed.',
    'security'
  ),
  (
    'AUDIT_HASH_MISSING_RECORDS',
    'audit',
    'high',
    500,
    true,
    false,
    'Audit processing is delayed.',
    'Critical records are missing audit hash entries.',
    'security'
  ),
  (
    'SCHEDULED_JOB_FAILED',
    'scheduler',
    'high',
    500,
    true,
    false,
    'A background job failed.',
    'Scheduled job execution failed.',
    'platform'
  ),
  (
    'SCHEDULED_JOB_LOCKED',
    'scheduler',
    'low',
    202,
    true,
    false,
    'Background job is already running.',
    'Scheduled job lock is active.',
    'platform'
  ),
  (
    'SCHEDULED_JOB_NOT_ALLOWLISTED',
    'scheduler',
    'high',
    403,
    false,
    false,
    'Background job is not allowed.',
    'Scheduled function is not allowlisted.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 7–9. Catalog lookup, record event, API error JSON
-- ---------------------------------------------------------------------------

create or replace function get_error_catalog_entry(
  p_error_code text
)
returns error_catalog
language plpgsql
stable
as $$
declare
  v_error error_catalog%rowtype;
begin
  select *
  into v_error
  from error_catalog
  where error_code = p_error_code;

  if v_error.id is null then
    select *
    into v_error
    from error_catalog
    where error_code = 'SYSTEM_INTERNAL_ERROR';
  end if;

  return v_error;
end;
$$;

create or replace function record_error_event(
  p_error_code text,
  p_request_id text default null,
  p_idempotency_key text default null,
  p_actor_type text default null,
  p_user_id uuid default null,
  p_wallet_id uuid default null,
  p_source text default 'system',
  p_endpoint text default null,
  p_function_name text default null,
  p_message text default null,
  p_raw_error text default null,
  p_related_entity_type text default null,
  p_related_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_admin_user_id uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_error error_catalog%rowtype;
  v_error_event_id uuid;
begin
  v_error := get_error_catalog_entry(p_error_code);

  insert into error_events (
    error_code,
    request_id,
    idempotency_key,
    actor_type,
    user_id,
    wallet_id,
    admin_user_id,
    source,
    endpoint,
    function_name,
    severity,
    retryable,
    message,
    raw_error,
    related_entity_type,
    related_entity_id,
    metadata
  )
  values (
    v_error.error_code,
    p_request_id,
    p_idempotency_key,
    p_actor_type,
    p_user_id,
    p_wallet_id,
    p_admin_user_id,
    coalesce(p_source, 'system'),
    p_endpoint,
    p_function_name,
    v_error.severity,
    v_error.retryable,
    coalesce(p_message, v_error.internal_message),
    p_raw_error,
    p_related_entity_type,
    p_related_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_error_event_id;

  return v_error_event_id;
end;
$$;

create or replace function build_api_error_response(
  p_error_code text,
  p_request_id text default null,
  p_details jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_error error_catalog%rowtype;
begin
  v_error := get_error_catalog_entry(p_error_code);

  return jsonb_build_object(
    'ok', false,
    'data', null,
    'error', jsonb_build_object(
      'code', v_error.error_code,
      'category', v_error.category,
      'message',
        case
          when v_error.user_visible is true
          then v_error.user_message
          else 'Something went wrong. Please try again.'
        end,
      'retryable', v_error.retryable,
      'httpStatus', v_error.http_status,
      'details', coalesce(p_details, '{}'::jsonb)
    ),
    'requestId', p_request_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 10–11. Raw SQL → stable code mapping
-- ---------------------------------------------------------------------------

create table if not exists error_mapping_rules (
  id uuid primary key default gen_random_uuid(),

  match_pattern text not null,
  error_code text not null references error_catalog(error_code),

  priority integer not null default 100,

  active boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create unique index if not exists error_mapping_rules_match_pattern_uidx
on error_mapping_rules (match_pattern);

create index if not exists error_mapping_rules_active_idx
on error_mapping_rules (active, priority);

insert into error_mapping_rules (
  match_pattern,
  error_code,
  priority,
  metadata
)
values
  ('wallet not found', 'WALLET_NOT_FOUND', 10, '{}'::jsonb),
  ('wallet/user mismatch', 'WALLET_USER_MISMATCH', 10, '{}'::jsonb),
  ('wallet is fraud locked', 'WALLET_FRAUD_LOCKED', 10, '{}'::jsonb),
  ('available balance cannot go negative', 'INSUFFICIENT_BALANCE', 10, '{}'::jsonb),
  ('campaign budget not found', 'CAMPAIGN_BUDGET_NOT_FOUND', 10, '{}'::jsonb),
  ('campaign budget is not active', 'CAMPAIGN_BUDGET_INACTIVE', 10, '{}'::jsonb),
  ('campaign budget exhausted', 'CAMPAIGN_BUDGET_EXHAUSTED', 10, '{}'::jsonb),
  ('attention session not found', 'ATTENTION_SESSION_NOT_FOUND', 10, '{}'::jsonb),
  ('attention event is not reward eligible', 'ATTENTION_NOT_REWARD_ELIGIBLE', 10, '{}'::jsonb),
  ('already marked reward issued', 'REWARD_ALREADY_ISSUED', 10, '{}'::jsonb),
  ('reward issuance group not found', 'REWARD_ISSUANCE_FAILED', 20, '{}'::jsonb),
  ('unknown attention model version', 'ATTENTION_RUNTIME_NOT_ALLOWED', 10, '{}'::jsonb),
  ('attention model version not allowed', 'ATTENTION_RUNTIME_NOT_ALLOWED', 10, '{}'::jsonb),
  ('attention pipeline version not allowed', 'ATTENTION_RUNTIME_NOT_ALLOWED', 10, '{}'::jsonb),
  ('runtime signal schema version not allowed', 'ATTENTION_RUNTIME_NOT_ALLOWED', 10, '{}'::jsonb),
  ('unbalanced journal entry', 'ACCOUNTING_UNBALANCED_JOURNAL', 10, '{}'::jsonb),
  ('scheduled function not allowlisted', 'SCHEDULED_JOB_NOT_ALLOWLISTED', 10, '{}'::jsonb),
  ('scheduled job not found', 'SCHEDULED_JOB_FAILED', 30, '{}'::jsonb)
on conflict (match_pattern)
do update set
  error_code = excluded.error_code,
  priority = excluded.priority,
  metadata = excluded.metadata,
  active = true;

insert into error_catalog (
  error_code,
  category,
  severity,
  http_status,
  retryable,
  user_visible,
  user_message,
  internal_message,
  owner_team
)
values
  (
    'WITHDRAWAL_BLOCKED_BY_TRUST_GATE',
    'wallet',
    'medium',
    403,
    false,
    true,
    'This withdrawal cannot be processed.',
    'Withdrawal blocked by trust gate.',
    'trust'
  ),
  (
    'WITHDRAWAL_REVIEW_REQUIRED',
    'wallet',
    'medium',
    202,
    false,
    true,
    'This withdrawal is under review.',
    'Withdrawal requires manual review.',
    'trust'
  ),
  (
    'WITHDRAWAL_LIMIT_EXCEEDED',
    'wallet',
    'medium',
    409,
    false,
    true,
    'Withdrawal limit exceeded.',
    'Withdrawal limit exceeded.',
    'trust'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_mapping_rules (
  match_pattern,
  error_code,
  priority,
  metadata
)
values
  ('withdrawal blocked by trust gate', 'WITHDRAWAL_BLOCKED_BY_TRUST_GATE', 5, '{}'::jsonb),
  ('daily withdrawal limit exceeded', 'WITHDRAWAL_LIMIT_EXCEEDED', 5, '{}'::jsonb),
  ('weekly withdrawal limit exceeded', 'WITHDRAWAL_LIMIT_EXCEEDED', 5, '{}'::jsonb),
  ('monthly withdrawal limit exceeded', 'WITHDRAWAL_LIMIT_EXCEEDED', 5, '{}'::jsonb),
  ('withdrawal amount is above the maximum', 'WITHDRAWAL_LIMIT_EXCEEDED', 5, '{}'::jsonb),
  ('withdrawal amount is below the minimum', 'WITHDRAWAL_LIMIT_EXCEEDED', 5, '{}'::jsonb)
on conflict do nothing;

create or replace function resolve_error_code_from_raw_error(
  p_raw_error text
)
returns text
language plpgsql
stable
as $$
declare
  v_error_code text;
begin
  if p_raw_error is null then
    return 'SYSTEM_INTERNAL_ERROR';
  end if;

  select error_code
  into v_error_code
  from error_mapping_rules
  where active is true
    and lower(p_raw_error) like '%' || lower(match_pattern) || '%'
  order by priority asc, created_at asc
  limit 1;

  return coalesce(v_error_code, 'SYSTEM_INTERNAL_ERROR');
end;
$$;

-- ---------------------------------------------------------------------------
-- 12–13. Dashboards
-- ---------------------------------------------------------------------------

create or replace view error_event_dashboard as
select
  ec.error_code,
  ec.category,
  ec.severity,
  ec.owner_team,
  ec.retryable,

  count(ee.id) as total_count,

  count(ee.id) filter (
    where ee.occurred_at >= now() - interval '1 hour'
  ) as count_1h,

  count(ee.id) filter (
    where ee.occurred_at >= now() - interval '24 hours'
  ) as count_24h,

  max(ee.occurred_at) as last_seen_at,

  jsonb_agg(
    jsonb_build_object(
      'error_event_id', ee.id,
      'request_id', ee.request_id,
      'actor_type', ee.actor_type,
      'user_id', ee.user_id,
      'wallet_id', ee.wallet_id,
      'admin_user_id', ee.admin_user_id,
      'source', ee.source,
      'endpoint', ee.endpoint,
      'function_name', ee.function_name,
      'message', ee.message,
      'related_entity_type', ee.related_entity_type,
      'related_entity_id', ee.related_entity_id,
      'occurred_at', ee.occurred_at
    )
    order by ee.occurred_at desc
  ) filter (where ee.id is not null) as recent_events

from error_catalog ec
left join error_events ee
  on ee.error_code = ec.error_code
 and ee.occurred_at >= now() - interval '24 hours'
group by
  ec.error_code,
  ec.category,
  ec.severity,
  ec.owner_team,
  ec.retryable;

create or replace view critical_error_alerts as
select
  *
from error_event_dashboard
where
  severity = 'critical'
  and count_1h > 0

union all

select
  *
from error_event_dashboard
where
  severity = 'high'
  and count_1h >= 5;

-- ---------------------------------------------------------------------------
-- 14. Record mapped exception (for PL/pgSQL exception handlers)
-- ---------------------------------------------------------------------------

create or replace function record_exception_event(
  p_raw_error text,
  p_source text,
  p_function_name text,
  p_request_id text default null,
  p_user_id uuid default null,
  p_wallet_id uuid default null,
  p_related_entity_type text default null,
  p_related_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_error_code text;
begin
  v_error_code := resolve_error_code_from_raw_error(p_raw_error);

  return record_error_event(
    v_error_code,
    p_request_id,
    null,
    'system',
    p_user_id,
    p_wallet_id,
    p_source,
    null,
    p_function_name,
    null,
    p_raw_error,
    p_related_entity_type,
    p_related_entity_id,
    coalesce(p_metadata, '{}'::jsonb),
    null
  );
end;
$$;
