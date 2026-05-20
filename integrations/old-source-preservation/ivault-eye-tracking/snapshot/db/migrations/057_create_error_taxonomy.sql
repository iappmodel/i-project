-- Step 6.12 — Error taxonomy
-- Standardizes API/worker/admin failures into a canonical catalog + event log.

create extension if not exists pgcrypto;

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

  constraint error_catalog_category_check
  check (
    category in (
      'validation',
      'auth',
      'permission',
      'wallet',
      'withdrawal',
      'reward',
      'trust',
      'attention',
      'campaign',
      'accounting',
      'payout',
      'admin',
      'scheduler',
      'model',
      'evidence',
      'audit',
      'system'
    )
  ),

  constraint error_catalog_severity_check
  check (
    severity in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  -- Includes 202 review/pending API outcomes used by this taxonomy.
  constraint error_catalog_http_status_check
  check (
    http_status >= 200
    and http_status <= 599
  )
);

create index if not exists error_catalog_category_idx
on error_catalog (category, severity);

create index if not exists error_catalog_retryable_idx
on error_catalog (retryable, category);

create table if not exists error_events (
  id uuid primary key default gen_random_uuid(),

  error_code text not null references error_catalog(error_code),

  request_id text,
  idempotency_key text,

  actor_type text,
  user_id uuid,
  wallet_id uuid references wallets(id),
  admin_user_id uuid references admin_users(id),

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
    'MFA_REQUIRED',
    'permission',
    'high',
    403,
    false,
    true,
    'Additional verification is required.',
    'Admin MFA required.',
    'security'
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
    'Wallet is fraud locked.',
    'trust'
  ),
  (
    'WITHDRAWAL_TRUST_REVIEW_REQUIRED',
    'withdrawal',
    'medium',
    202,
    false,
    true,
    'Withdrawal is under review.',
    'Trust gate returned review/hold for withdrawal.',
    'trust'
  ),
  (
    'WITHDRAWAL_DENIED_BY_TRUST',
    'withdrawal',
    'high',
    403,
    false,
    true,
    'Withdrawal is not available for this wallet.',
    'Trust gate denied withdrawal.',
    'trust'
  ),
  (
    'WITHDRAWAL_INVALID_STATE',
    'withdrawal',
    'high',
    409,
    false,
    false,
    'Withdrawal cannot be changed right now.',
    'Withdrawal state transition is invalid.',
    'wallet'
  ),
  (
    'WITHDRAWAL_PROVIDER_PENDING',
    'withdrawal',
    'medium',
    202,
    true,
    true,
    'Withdrawal is still processing.',
    'External payout provider has not finalized payout.',
    'finance'
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
    'Model/pipeline/schema version is not allowed.',
    'attention'
  ),
  (
    'ATTENTION_LOW_CONFIDENCE',
    'attention',
    'low',
    422,
    true,
    true,
    'We could not verify attention confidently.',
    'Attention confidence below threshold.',
    'attention'
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
    'REWARD_NOT_ELIGIBLE',
    'reward',
    'medium',
    422,
    false,
    true,
    'This activity is not eligible for a reward.',
    'Attention event or campaign is not reward eligible.',
    'reward'
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
    'UNKNOWN_MODEL_VERSION',
    'model',
    'high',
    409,
    false,
    false,
    'Verification version is unavailable.',
    'Unknown model version.',
    'attention'
  ),
  (
    'MODEL_ROLLOUT_KILL_SWITCH',
    'model',
    'critical',
    503,
    true,
    false,
    'Verification is temporarily unavailable.',
    'Attention rollout kill switch is enabled.',
    'attention'
  ),
  (
    'IDENTITY_GRAPH_RISK',
    'trust',
    'high',
    403,
    false,
    false,
    'Verification is unavailable.',
    'Identity graph risk threshold exceeded.',
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
    'PAYOUT_PROVIDER_EVENT_UNLINKED',
    'payout',
    'medium',
    202,
    true,
    false,
    'Payout event is being processed.',
    'Provider event could not be linked to external payout.',
    'finance'
  ),
  (
    'PAYOUT_RECONCILIATION_MISMATCH',
    'payout',
    'high',
    500,
    false,
    false,
    'A payout reconciliation issue occurred.',
    'Internal payout state does not match provider state.',
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
  p_admin_user_id uuid default null,
  p_source text default 'system',
  p_endpoint text default null,
  p_function_name text default null,
  p_message text default null,
  p_raw_error text default null,
  p_related_entity_type text default null,
  p_related_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
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
    p_metadata
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

create table if not exists error_mapping_rules (
  id uuid primary key default gen_random_uuid(),

  match_pattern text not null,
  error_code text not null references error_catalog(error_code),

  priority integer not null default 100,

  active boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists error_mapping_rules_active_idx
on error_mapping_rules (active, priority asc);

insert into error_mapping_rules (
  match_pattern,
  error_code,
  priority,
  metadata
)
values
  ('insufficient available balance', 'INSUFFICIENT_BALANCE', 10, '{}'::jsonb),
  ('wallet not found', 'WALLET_NOT_FOUND', 10, '{}'::jsonb),
  ('wallet/user mismatch', 'WALLET_USER_MISMATCH', 10, '{}'::jsonb),
  ('wallet is fraud locked', 'WALLET_FRAUD_LOCKED', 10, '{}'::jsonb),
  ('trust gate denied', 'WITHDRAWAL_DENIED_BY_TRUST', 20, '{}'::jsonb),
  ('unknown attention model version', 'UNKNOWN_MODEL_VERSION', 20, '{}'::jsonb),
  ('attention model version not allowed', 'ATTENTION_RUNTIME_NOT_ALLOWED', 20, '{}'::jsonb),
  ('unbalanced journal entry', 'ACCOUNTING_UNBALANCED_JOURNAL', 10, '{}'::jsonb),
  ('admin missing permission', 'PERMISSION_DENIED', 10, '{}'::jsonb),
  ('admin mfa required', 'MFA_REQUIRED', 10, '{}'::jsonb),
  ('scheduled function not allowlisted', 'PERMISSION_DENIED', 10, '{}'::jsonb)
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
