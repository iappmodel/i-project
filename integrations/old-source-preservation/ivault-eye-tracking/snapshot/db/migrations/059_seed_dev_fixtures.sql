-- Step 6.14 — Seed / dev fixtures
-- Deterministic demo fixtures for local development, walkthroughs, and tests.
-- Safety principle: fixture data must never be confused with production data.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Fixture run tracking
-- ---------------------------------------------------------------------------

create table if not exists dev_fixture_runs (
  id uuid primary key default gen_random_uuid(),

  fixture_key text not null,
  fixture_version text not null default 'v1',

  status text not null default 'processing',

  created_user_count integer not null default 0,
  created_wallet_count integer not null default 0,
  created_campaign_count integer not null default 0,
  created_attention_event_count integer not null default 0,
  created_reward_count integer not null default 0,
  created_withdrawal_count integer not null default 0,
  created_invoice_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  constraint dev_fixture_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed',
      'cleaned'
    )
  )
);

create index if not exists dev_fixture_runs_fixture_idx
on dev_fixture_runs (fixture_key, started_at desc);

-- ---------------------------------------------------------------------------
-- 2) Fixture entity registry
-- ---------------------------------------------------------------------------

create table if not exists dev_fixture_entities (
  id uuid primary key default gen_random_uuid(),

  fixture_run_id uuid not null references dev_fixture_runs(id),

  entity_type text not null,
  entity_id uuid not null,

  entity_key text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (fixture_run_id, entity_type, entity_id)
);

create index if not exists dev_fixture_entities_run_idx
on dev_fixture_entities (fixture_run_id);

create index if not exists dev_fixture_entities_entity_idx
on dev_fixture_entities (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- 3) Fixture environment safety guard
-- ---------------------------------------------------------------------------

create table if not exists platform_environment_settings (
  id uuid primary key default gen_random_uuid(),

  environment text not null default 'development',

  allow_dev_fixtures boolean not null default false,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint platform_environment_settings_environment_check
  check (
    environment in (
      'development',
      'staging',
      'production'
    )
  )
);

create unique index if not exists platform_environment_settings_environment_unique
on platform_environment_settings (environment);

insert into platform_environment_settings (
  environment,
  allow_dev_fixtures,
  metadata
)
values (
  'development',
  true,
  '{"local": true, "seeded_by": "migration_059"}'::jsonb
)
on conflict (environment)
do update set
  allow_dev_fixtures = excluded.allow_dev_fixtures,
  metadata = platform_environment_settings.metadata || excluded.metadata;

create or replace function assert_dev_fixtures_allowed()
returns void
language plpgsql
stable
as $$
declare
  v_allowed boolean;
  v_environment text;
begin
  select environment, allow_dev_fixtures
  into v_environment, v_allowed
  from platform_environment_settings
  order by
    case environment
      when 'development' then 0
      when 'staging' then 1
      else 2
    end asc,
    created_at desc
  limit 1;

  if coalesce(v_allowed, false) is not true
    or coalesce(v_environment, 'production') = 'production' then
    raise exception 'dev fixtures are not allowed in this environment';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Fixture helpers
-- ---------------------------------------------------------------------------

create or replace function register_dev_fixture_entity(
  p_fixture_run_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_entity_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  if p_fixture_run_id is null then
    raise exception 'fixture run id is required';
  end if;

  if p_entity_type is null or length(trim(p_entity_type)) = 0 then
    raise exception 'entity type is required';
  end if;

  if p_entity_id is null then
    raise exception 'entity id is required';
  end if;

  insert into dev_fixture_entities (
    fixture_run_id,
    entity_type,
    entity_id,
    entity_key,
    metadata
  )
  values (
    p_fixture_run_id,
    p_entity_type,
    p_entity_id,
    p_entity_key,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (fixture_run_id, entity_type, entity_id)
  do update set
    metadata = dev_fixture_entities.metadata || excluded.metadata
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function seed_demo_advertiser(
  p_fixture_run_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_advertiser_id uuid;
begin
  insert into advertisers (
    advertiser_name,
    billing_email,
    legal_name,
    status,
    default_currency_code,
    metadata
  )
  values (
    'Demo Advertiser',
    'billing+demo@example.com',
    'Demo Advertiser LLC',
    'active',
    'USD',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'demo', true,
      'fixture_key', 'demo_advertiser'
    )
  )
  returning id into v_advertiser_id;

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'advertiser',
    v_advertiser_id,
    'demo_advertiser',
    p_metadata
  );

  return v_advertiser_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Fixture users
-- ---------------------------------------------------------------------------

create table if not exists dev_fixture_users (
  id uuid primary key default gen_random_uuid(),

  fixture_run_id uuid not null references dev_fixture_runs(id),

  user_key text not null,

  display_name text,
  email text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (fixture_run_id, user_key)
);

create index if not exists dev_fixture_users_run_idx
on dev_fixture_users (fixture_run_id, created_at desc);

create or replace function seed_demo_users(
  p_fixture_run_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_user_good uuid;
  v_user_review uuid;
  v_user_fraud uuid;
begin
  insert into dev_fixture_users (
    fixture_run_id,
    user_key,
    display_name,
    email,
    metadata
  )
  values
    (
      p_fixture_run_id,
      'good_user',
      'Demo Good User',
      'good-user+demo@example.com',
      coalesce(p_metadata, '{}'::jsonb) || '{"demo": true}'::jsonb
    ),
    (
      p_fixture_run_id,
      'review_user',
      'Demo Review User',
      'review-user+demo@example.com',
      coalesce(p_metadata, '{}'::jsonb) || '{"demo": true}'::jsonb
    ),
    (
      p_fixture_run_id,
      'fraud_user',
      'Demo Fraud User',
      'fraud-user+demo@example.com',
      coalesce(p_metadata, '{}'::jsonb) || '{"demo": true}'::jsonb
    )
  on conflict (fixture_run_id, user_key)
  do update set
    display_name = excluded.display_name,
    email = excluded.email,
    metadata = dev_fixture_users.metadata || excluded.metadata;

  select id into v_user_good
  from dev_fixture_users
  where fixture_run_id = p_fixture_run_id
    and user_key = 'good_user';

  select id into v_user_review
  from dev_fixture_users
  where fixture_run_id = p_fixture_run_id
    and user_key = 'review_user';

  select id into v_user_fraud
  from dev_fixture_users
  where fixture_run_id = p_fixture_run_id
    and user_key = 'fraud_user';

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'user',
    v_user_good,
    'good_user',
    p_metadata
  );

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'user',
    v_user_review,
    'review_user',
    p_metadata
  );

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'user',
    v_user_fraud,
    'fraud_user',
    p_metadata
  );

  return jsonb_build_object(
    'good_user_id', v_user_good,
    'review_user_id', v_user_review,
    'fraud_user_id', v_user_fraud
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Fixture wallets
-- ---------------------------------------------------------------------------

create or replace function seed_demo_wallet(
  p_fixture_run_id uuid,
  p_user_id uuid,
  p_wallet_key text,
  p_available_minor bigint default 0,
  p_pending_minor bigint default 0,
  p_locked_minor bigint default 0,
  p_status text default 'active',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet_id uuid;
begin
  insert into wallets (
    user_id,
    currency_code,
    available_balance_minor,
    pending_balance_minor,
    locked_balance_minor,
    total_balance_minor,
    status,
    metadata
  )
  values (
    p_user_id,
    'USD',
    p_available_minor,
    p_pending_minor,
    p_locked_minor,
    p_available_minor + p_pending_minor + p_locked_minor,
    p_status,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'demo', true,
      'fixture_key', p_wallet_key
    )
  )
  returning id into v_wallet_id;

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'wallet',
    v_wallet_id,
    p_wallet_key,
    p_metadata
  );

  return v_wallet_id;
end;
$$;

create or replace function seed_demo_wallets(
  p_fixture_run_id uuid,
  p_users jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_good_wallet uuid;
  v_review_wallet uuid;
  v_fraud_wallet uuid;
begin
  v_good_wallet := seed_demo_wallet(
    p_fixture_run_id,
    (p_users->>'good_user_id')::uuid,
    'good_wallet',
    2500,
    500,
    0,
    'active',
    p_metadata
  );

  v_review_wallet := seed_demo_wallet(
    p_fixture_run_id,
    (p_users->>'review_user_id')::uuid,
    'review_wallet',
    1200,
    0,
    0,
    'active',
    p_metadata
  );

  v_fraud_wallet := seed_demo_wallet(
    p_fixture_run_id,
    (p_users->>'fraud_user_id')::uuid,
    'fraud_wallet',
    300,
    0,
    2000,
    'restricted',
    p_metadata
  );

  return jsonb_build_object(
    'good_wallet_id', v_good_wallet,
    'review_wallet_id', v_review_wallet,
    'fraud_wallet_id', v_fraud_wallet
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) Fixture wallet value lots
-- ---------------------------------------------------------------------------

create or replace function seed_demo_wallet_lot(
  p_fixture_run_id uuid,
  p_wallet_id uuid,
  p_user_id uuid,
  p_lot_key text,
  p_amount_minor bigint,
  p_status text default 'available',
  p_source_type text default 'demo_seed',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_lot_id uuid;
begin
  insert into wallet_value_lots (
    wallet_id,
    user_id,
    currency_code,
    original_amount_minor,
    remaining_amount_minor,
    status,
    source_type,
    source_id,
    available_at,
    expires_at,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    'USD',
    p_amount_minor,
    p_amount_minor,
    p_status,
    p_source_type,
    p_fixture_run_id,
    now(),
    null,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'demo', true,
      'fixture_key', p_lot_key
    )
  )
  returning id into v_lot_id;

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'wallet_value_lot',
    v_lot_id,
    p_lot_key,
    p_metadata
  );

  return v_lot_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) Fixture campaign budget
-- ---------------------------------------------------------------------------

create or replace function seed_demo_campaign_budget(
  p_fixture_run_id uuid,
  p_advertiser_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_campaign_id uuid := gen_random_uuid();
  v_budget_id uuid;
begin
  insert into campaign_budgets (
    campaign_id,
    advertiser_id,
    currency_code,
    funded_amount_minor,
    reserved_amount_minor,
    issued_amount_minor,
    released_amount_minor,
    expired_amount_minor,
    refunded_amount_minor,
    status,
    metadata
  )
  values (
    v_campaign_id,
    p_advertiser_id,
    'USD',
    100000,
    0,
    0,
    0,
    0,
    0,
    'active',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'demo', true,
      'fixture_key', 'demo_campaign_budget'
    )
  )
  returning id into v_budget_id;

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'campaign',
    v_campaign_id,
    'demo_campaign',
    p_metadata
  );

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'campaign_budget',
    v_budget_id,
    'demo_campaign_budget',
    p_metadata
  );

  return v_campaign_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9) Attention runtime setup
-- ---------------------------------------------------------------------------

create or replace function seed_demo_attention_runtime(
  p_fixture_run_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
begin
  insert into runtime_signal_schema_versions (
    schema_version,
    status,
    required_fields,
    optional_fields,
    description,
    metadata
  )
  values (
    'runtime_signals_v1',
    'active',
    array['gazeX', 'gazeY', 'confidence', 'blink'],
    array['quality', 'fixationState', 'dwellProgress', 'trackingState', 'timestampMs'],
    'Demo runtime signal schema.',
    coalesce(p_metadata, '{}'::jsonb) || '{"demo": true}'::jsonb
  )
  on conflict (schema_version)
  do update set
    status = 'active',
    metadata = runtime_signal_schema_versions.metadata || excluded.metadata;

  insert into attention_scoring_formula_versions (
    formula_version,
    name,
    status,
    active,
    description,
    metadata
  )
  values (
    'attention_score_v1',
    'Attention Score V1',
    'active',
    true,
    'Demo scoring formula.',
    coalesce(p_metadata, '{}'::jsonb) || '{"demo": true}'::jsonb
  )
  on conflict (formula_version)
  do update set
    status = 'active',
    active = true,
    metadata = attention_scoring_formula_versions.metadata || excluded.metadata;

  insert into attention_model_versions (
    model_version,
    model_name,
    model_type,
    status,
    version_semver,
    description,
    metadata,
    deployed_at
  )
  values (
    'vision_model_v1',
    'Demo Vision Model V1',
    'fusion_model',
    'active',
    '1.0.0',
    'Demo local/offline attention model.',
    coalesce(p_metadata, '{}'::jsonb) || '{"demo": true, "offline_capable": true}'::jsonb,
    now()
  )
  on conflict (model_version)
  do update set
    status = 'active',
    metadata = attention_model_versions.metadata || excluded.metadata,
    updated_at = now();

  insert into attention_pipeline_versions (
    pipeline_version,
    pipeline_name,
    status,
    runtime_signal_schema_version,
    scoring_formula_version,
    fraud_formula_version,
    frame_format,
    max_frame_edge,
    target_processed_fps,
    app_platform,
    description,
    metadata,
    deployed_at
  )
  values (
    'runtime_signals_v1',
    'Demo Runtime Signals Pipeline V1',
    'active',
    'runtime_signals_v1',
    'attention_score_v1',
    'attention_fraud_v1',
    'y8',
    320,
    10.0,
    'android',
    'Demo local runtime pipeline.',
    coalesce(p_metadata, '{}'::jsonb) || '{"demo": true}'::jsonb,
    now()
  )
  on conflict (pipeline_version)
  do update set
    status = 'active',
    metadata = attention_pipeline_versions.metadata || excluded.metadata,
    updated_at = now();

  insert into attention_pipeline_model_links (
    pipeline_version,
    model_version,
    role,
    required,
    metadata
  )
  values (
    'runtime_signals_v1',
    'vision_model_v1',
    'fusion',
    true,
    coalesce(p_metadata, '{}'::jsonb) || '{"demo": true}'::jsonb
  )
  on conflict (pipeline_version, model_version, role)
  do update set
    metadata = attention_pipeline_model_links.metadata || excluded.metadata;

  return jsonb_build_object(
    'model_version', 'vision_model_v1',
    'pipeline_version', 'runtime_signals_v1',
    'runtime_signal_schema_version', 'runtime_signals_v1',
    'scoring_formula_version', 'attention_score_v1'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 10) Attention event fixtures (production-path function calls)
-- ---------------------------------------------------------------------------

create or replace function seed_demo_attention_event(
  p_fixture_run_id uuid,
  p_user_id uuid,
  p_wallet_id uuid,
  p_campaign_id uuid,
  p_event_key text,
  p_decision text,
  p_attention_score numeric,
  p_confidence_score numeric,
  p_fraud_risk_score numeric,
  p_quality_score numeric,
  p_reward_eligible boolean,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_assignment_id uuid;
  v_session_id uuid;
  v_event_id uuid;
begin
  v_assignment_id := resolve_attention_runtime_assignment(
    p_user_id,
    p_wallet_id,
    null,
    gen_random_uuid(),
    p_campaign_id,
    gen_random_uuid(),
    gen_random_uuid(),
    'android',
    '1.0.0-demo',
    'fixture_assignment:' || p_event_key,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'demo', true,
      'fixture_key', p_event_key
    )
  );

  v_session_id := start_attention_verification_session_from_assignment(
    v_assignment_id,
    p_user_id,
    p_wallet_id,
    p_campaign_id,
    null,
    null,
    null,
    gen_random_uuid(),
    '1.0.0-demo',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'demo', true,
      'fixture_key', p_event_key
    )
  );

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'attention_runtime_assignment',
    v_assignment_id,
    p_event_key || '_assignment',
    p_metadata
  );

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'attention_session',
    v_session_id,
    p_event_key || '_session',
    p_metadata
  );

  -- Keep this call aligned to the real production signature.
  v_event_id := complete_attention_verification_event(
    v_session_id,
    p_decision,
    p_attention_score,
    p_confidence_score,
    p_fraud_risk_score,
    p_quality_score,
    p_attention_score,
    p_attention_score,
    p_confidence_score,
    1.0000,
    p_attention_score,
    300,
    20,
    case when p_decision = 'fraud_suspected' then 80 else 5 end,
    case when p_decision = 'failed' then 90 else 10 end,
    case when p_decision = 'failed' then 90 else 10 end,
    case when p_decision = 'failed' then 90 else 10 end,
    null,
    'fixture_attention_complete:' || p_event_key,
    'vision_model_v1',
    'runtime_signals_v1',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'demo', true,
      'fixture_key', p_event_key,
      'expected_reward_eligible', p_reward_eligible
    )
  );

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'attention_event',
    v_event_id,
    p_event_key,
    p_metadata
  );

  return v_event_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11) Withdrawal fixture
-- ---------------------------------------------------------------------------

create or replace function seed_demo_withdrawal(
  p_fixture_run_id uuid,
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_withdrawal_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_withdrawal_id uuid;
begin
  v_withdrawal_id := create_withdrawal_request(
    p_wallet_id,
    p_user_id,
    p_amount_minor,
    'USD',
    0,
    'manual_provider',
    'fixture_withdrawal:' || p_withdrawal_key,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'demo', true,
      'fixture_key', p_withdrawal_key
    )
  );

  if exists (
    select 1
    from withdrawal_requests
    where id = v_withdrawal_id
      and status = 'approved'
  ) then
    perform reserve_wallet_funds_for_withdrawal(
      v_withdrawal_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'demo', true,
        'fixture_key', p_withdrawal_key
      )
    );
  end if;

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'withdrawal_request',
    v_withdrawal_id,
    p_withdrawal_key,
    p_metadata
  );

  return v_withdrawal_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 12) Demo admin user fixture
-- ---------------------------------------------------------------------------

create or replace function seed_demo_admin_user(
  p_fixture_run_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin_id uuid;
  v_role_id uuid;
begin
  insert into admin_users (
    email,
    display_name,
    status,
    mfa_required,
    mfa_verified_at,
    metadata
  )
  values (
    'admin+demo@example.com',
    'Demo Admin',
    'active',
    true,
    now(),
    coalesce(p_metadata, '{}'::jsonb) || '{"demo": true}'::jsonb
  )
  on conflict (email)
  do update set
    status = 'active',
    mfa_verified_at = now(),
    metadata = admin_users.metadata || excluded.metadata
  returning id into v_admin_id;

  select id
  into v_role_id
  from admin_roles
  where role_key = 'super_admin';

  if v_role_id is not null then
    insert into admin_user_roles (
      admin_user_id,
      role_id,
      status,
      metadata
    )
    values (
      v_admin_id,
      v_role_id,
      'active',
      coalesce(p_metadata, '{}'::jsonb) || '{"demo": true}'::jsonb
    )
    on conflict (admin_user_id, role_id)
    do update set
      status = 'active',
      metadata = admin_user_roles.metadata || excluded.metadata;
  end if;

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'admin_user',
    v_admin_id,
    'demo_admin',
    p_metadata
  );

  return v_admin_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 13) Master fixture seeding function
-- ---------------------------------------------------------------------------

create or replace function seed_demo_environment(
  p_fixture_key text default 'demo_environment',
  p_fixture_version text default 'v1',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;

  v_admin_id uuid;
  v_advertiser_id uuid;
  v_users jsonb;
  v_wallets jsonb;
  v_campaign_id uuid;

  v_good_event uuid;
  v_failed_event uuid;
  v_fraud_event uuid;

  v_good_withdrawal uuid;
  v_fixture_metadata jsonb;
begin
  perform assert_dev_fixtures_allowed();

  v_fixture_metadata := coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'demo', true,
    'fixture_version', coalesce(p_fixture_version, 'v1'),
    'environment', 'development'
  );

  insert into dev_fixture_runs (
    fixture_key,
    fixture_version,
    status,
    metadata
  )
  values (
    p_fixture_key,
    p_fixture_version,
    'processing',
    v_fixture_metadata
  )
  returning id into v_run_id;

  perform seed_demo_attention_runtime(
    v_run_id,
    v_fixture_metadata
  );

  v_admin_id := seed_demo_admin_user(
    v_run_id,
    v_fixture_metadata
  );

  v_advertiser_id := seed_demo_advertiser(
    v_run_id,
    v_fixture_metadata
  );

  v_users := seed_demo_users(
    v_run_id,
    v_fixture_metadata
  );

  v_wallets := seed_demo_wallets(
    v_run_id,
    v_users,
    v_fixture_metadata
  );

  perform seed_demo_wallet_lot(
    v_run_id,
    (v_wallets->>'good_wallet_id')::uuid,
    (v_users->>'good_user_id')::uuid,
    'good_wallet_lot_1',
    2500,
    'available',
    'demo_seed',
    v_fixture_metadata
  );

  perform seed_demo_wallet_lot(
    v_run_id,
    (v_wallets->>'review_wallet_id')::uuid,
    (v_users->>'review_user_id')::uuid,
    'review_wallet_lot_1',
    1200,
    'available',
    'demo_seed',
    v_fixture_metadata
  );

  v_campaign_id := seed_demo_campaign_budget(
    v_run_id,
    v_advertiser_id,
    v_fixture_metadata
  );

  v_good_event := seed_demo_attention_event(
    v_run_id,
    (v_users->>'good_user_id')::uuid,
    (v_wallets->>'good_wallet_id')::uuid,
    v_campaign_id,
    'good_passed_attention_event',
    'passed',
    0.9200,
    0.9300,
    0.0500,
    0.9000,
    true,
    v_fixture_metadata
  );

  v_failed_event := seed_demo_attention_event(
    v_run_id,
    (v_users->>'review_user_id')::uuid,
    (v_wallets->>'review_wallet_id')::uuid,
    v_campaign_id,
    'failed_attention_event',
    'failed',
    0.4200,
    0.6000,
    0.2000,
    0.5000,
    false,
    v_fixture_metadata
  );

  v_fraud_event := seed_demo_attention_event(
    v_run_id,
    (v_users->>'fraud_user_id')::uuid,
    (v_wallets->>'fraud_wallet_id')::uuid,
    v_campaign_id,
    'fraud_attention_event',
    'fraud_suspected',
    0.3000,
    0.4000,
    0.9200,
    0.3000,
    false,
    v_fixture_metadata
  );

  v_good_withdrawal := seed_demo_withdrawal(
    v_run_id,
    (v_wallets->>'good_wallet_id')::uuid,
    (v_users->>'good_user_id')::uuid,
    1000,
    'good_user_withdrawal_reserved',
    v_fixture_metadata
  );

  update dev_fixture_runs
  set
    status = 'completed',
    completed_at = now(),
    created_user_count = 3,
    created_wallet_count = 3,
    created_campaign_count = 1,
    created_attention_event_count = 3,
    created_withdrawal_count = 1,
    metadata = metadata || jsonb_build_object(
      'admin_user_id', v_admin_id,
      'advertiser_id', v_advertiser_id,
      'users', v_users,
      'wallets', v_wallets,
      'campaign_id', v_campaign_id,
      'attention_events', jsonb_build_object(
        'good_event_id', v_good_event,
        'failed_event_id', v_failed_event,
        'fraud_event_id', v_fraud_event
      ),
      'withdrawal_id', v_good_withdrawal
    )
  where id = v_run_id;

  perform emit_platform_event(
    'demo_environment_seeded',
    'system',
    'info',
    'dev_fixture_seed',
    null,
    null,
    v_campaign_id,
    v_admin_id,
    null,
    'dev_fixture_run',
    v_run_id,
    null,
    null,
    'Demo environment seeded',
    jsonb_build_object(
      'created_user_count', 3,
      'created_wallet_count', 3,
      'created_attention_event_count', 3
    ),
    v_fixture_metadata
  );

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update dev_fixture_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- 14) Fixture cleanup
-- ---------------------------------------------------------------------------

create or replace function cleanup_dev_fixture_run(
  p_fixture_run_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run dev_fixture_runs%rowtype;
begin
  perform assert_dev_fixtures_allowed();

  select *
  into v_run
  from dev_fixture_runs
  where id = p_fixture_run_id
  for update;

  if v_run.id is null then
    raise exception 'fixture run not found: %', p_fixture_run_id;
  end if;

  -- Dependency-safe, conservative cleanup based only on registered entities.
  delete from withdrawal_reserved_lots
  where withdrawal_request_id in (
    select entity_id
    from dev_fixture_entities
    where fixture_run_id = p_fixture_run_id
      and entity_type = 'withdrawal_request'
  );

  delete from withdrawal_status_events
  where withdrawal_request_id in (
    select entity_id
    from dev_fixture_entities
    where fixture_run_id = p_fixture_run_id
      and entity_type = 'withdrawal_request'
  );

  delete from withdrawal_requests
  where id in (
    select entity_id
    from dev_fixture_entities
    where fixture_run_id = p_fixture_run_id
      and entity_type = 'withdrawal_request'
  );

  delete from attention_verification_events
  where id in (
    select entity_id
    from dev_fixture_entities
    where fixture_run_id = p_fixture_run_id
      and entity_type = 'attention_event'
  );

  delete from attention_verification_sessions
  where id in (
    select entity_id
    from dev_fixture_entities
    where fixture_run_id = p_fixture_run_id
      and entity_type = 'attention_session'
  );

  delete from attention_runtime_assignments
  where id in (
    select entity_id
    from dev_fixture_entities
    where fixture_run_id = p_fixture_run_id
      and entity_type = 'attention_runtime_assignment'
  );

  delete from wallet_value_lots
  where id in (
    select entity_id
    from dev_fixture_entities
    where fixture_run_id = p_fixture_run_id
      and entity_type = 'wallet_value_lot'
  );

  delete from wallets
  where id in (
    select entity_id
    from dev_fixture_entities
    where fixture_run_id = p_fixture_run_id
      and entity_type = 'wallet'
  );

  delete from campaign_budgets
  where id in (
    select entity_id
    from dev_fixture_entities
    where fixture_run_id = p_fixture_run_id
      and entity_type = 'campaign_budget'
  );

  delete from advertisers
  where id in (
    select entity_id
    from dev_fixture_entities
    where fixture_run_id = p_fixture_run_id
      and entity_type = 'advertiser'
  );

  delete from dev_fixture_users
  where fixture_run_id = p_fixture_run_id;

  update dev_fixture_runs
  set
    status = 'cleaned',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'cleaned_at',
      now()
    )
  where id = p_fixture_run_id;

  return p_fixture_run_id;
end;
$$;
