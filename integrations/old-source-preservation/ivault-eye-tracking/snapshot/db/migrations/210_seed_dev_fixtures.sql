-- Step 7.13 — Build 210_seed_dev_fixtures.sql
-- Deterministic dev/demo fixtures.
-- Fixtures are development-only, obvious, resettable, and blocked from production.

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

insert into platform_environment_settings (
  environment,
  allow_dev_fixtures,
  metadata
)
values (
  'development',
  true,
  '{"local": true, "fixture_seed": true}'::jsonb
)
on conflict do nothing;

create or replace function assert_dev_fixtures_allowed()
returns void
language plpgsql
stable
as $$
declare
  v_environment text;
  v_allowed boolean;
begin
  select
    environment,
    allow_dev_fixtures
  into
    v_environment,
    v_allowed
  from platform_environment_settings
  order by created_at desc
  limit 1;

  if coalesce(v_allowed, false) is not true
    or coalesce(v_environment, 'production') = 'production' then
    raise exception 'dev fixtures are not allowed in this environment';
  end if;
end;
$$;

create table if not exists dev_fixture_runs (
  id uuid primary key default gen_random_uuid(),

  fixture_key text not null,
  fixture_version text not null default 'v1',

  status text not null default 'processing',

  created_wallet_count integer not null default 0,
  created_campaign_count integer not null default 0,
  created_attention_event_count integer not null default 0,
  created_reward_count integer not null default 0,
  created_accounting_journal_count integer not null default 0,
  created_audit_hash_count integer not null default 0,

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

create or replace function seed_fixture_wallet(
  p_fixture_run_id uuid,
  p_user_id uuid,
  p_wallet_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet_id uuid;
begin
  v_wallet_id := create_wallet(
    p_user_id,
    'USD',
    p_metadata || jsonb_build_object(
      'demo', true,
      'fixture_key', p_wallet_key
    )
  );

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

create or replace function seed_fixture_campaign_budget(
  p_fixture_run_id uuid,
  p_campaign_id uuid,
  p_budget_minor bigint default 10000,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_budget_id uuid;
begin
  v_budget_id := create_campaign_budget(
    p_campaign_id,
    p_budget_minor,
    null,
    'USD',
    p_metadata || jsonb_build_object(
      'demo', true,
      'fixture_key', 'demo_campaign_budget'
    )
  );

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'campaign_budget',
    v_budget_id,
    'demo_campaign_budget',
    p_metadata
  );

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'campaign',
    p_campaign_id,
    'demo_campaign',
    p_metadata
  );

  return v_budget_id;
end;
$$;

create or replace function seed_fixture_attention_event(
  p_fixture_run_id uuid,
  p_user_id uuid,
  p_wallet_id uuid,
  p_campaign_id uuid,
  p_event_key text default 'demo_passed_attention_event',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_session_id uuid;
  v_event_id uuid;
begin
  perform seed_demo_attention_runtime(
    p_metadata || '{"demo": true}'::jsonb
  );

  v_session_id := start_attention_verification_session(
    p_user_id,
    p_wallet_id,
    p_campaign_id,
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    '1.0.0-fixture',
    'android',
    'vision_model_v1',
    'runtime_pipeline_v1',
    'runtime_signals_v1',
    'attention_score_v1',
    p_metadata || jsonb_build_object(
      'demo', true,
      'fixture_key', p_event_key
    )
  );

  perform register_dev_fixture_entity(
    p_fixture_run_id,
    'attention_session',
    v_session_id,
    p_event_key || '_session',
    p_metadata
  );

  v_event_id := complete_attention_verification_event(
    v_session_id,
    'passed',
    'fixture_attention_verified',
    0.9200,
    0.9300,
    0.0500,
    0.9000,
    0.9100,
    0.8800,
    0.9500,
    1.0000,
    300,
    10,
    2,
    5,
    null,
    'fixture_attention_complete:' || v_session_id::text,
    p_metadata || jsonb_build_object(
      'demo', true,
      'fixture_key', p_event_key
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

create or replace function seed_demo_core_money_loop(
  p_fixture_key text default 'demo_core_money_loop',
  p_fixture_version text default 'v1',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;

  v_user_id uuid := gen_random_uuid();
  v_wallet_id uuid;
  v_campaign_id uuid := gen_random_uuid();
  v_campaign_budget_id uuid;

  v_attention_event_id uuid;
  v_reward_group_id uuid;

  v_accounting_run_id uuid;
  v_audit_run_id uuid;
  v_audit_verify_run_id uuid;
  v_snapshot_id uuid;

  v_reward_count integer := 0;
  v_journal_count integer := 0;
  v_hash_count integer := 0;
begin
  perform assert_dev_fixtures_allowed();

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
    p_metadata || jsonb_build_object(
      'demo', true,
      'environment', 'development'
    )
  )
  returning id into v_run_id;

  perform register_dev_fixture_entity(
    v_run_id,
    'user',
    v_user_id,
    'demo_user',
    p_metadata
  );

  v_wallet_id := seed_fixture_wallet(
    v_run_id,
    v_user_id,
    'demo_wallet',
    p_metadata
  );

  v_campaign_budget_id := seed_fixture_campaign_budget(
    v_run_id,
    v_campaign_id,
    10000,
    p_metadata
  );

  v_attention_event_id := seed_fixture_attention_event(
    v_run_id,
    v_user_id,
    v_wallet_id,
    v_campaign_id,
    'demo_passed_attention_event',
    p_metadata
  );

  v_reward_group_id := issue_reward_from_attention_event(
    v_attention_event_id,
    100,
    'fixture_reward_from_attention:' || v_attention_event_id::text,
    p_metadata || jsonb_build_object(
      'fixture_run_id',
      v_run_id
    )
  );

  perform register_dev_fixture_entity(
    v_run_id,
    'reward_issuance_group',
    v_reward_group_id,
    'demo_reward_group',
    p_metadata
  );

  v_accounting_run_id := run_accounting_mirror_job(
    500,
    p_metadata || jsonb_build_object(
      'fixture_run_id',
      v_run_id
    )
  );

  v_audit_run_id := run_audit_hash_backfill_job(
    1000,
    p_metadata || jsonb_build_object(
      'fixture_run_id',
      v_run_id
    )
  );

  v_audit_verify_run_id := verify_audit_hash_chain(
    'global_audit_chain',
    100000,
    p_metadata || jsonb_build_object(
      'fixture_run_id',
      v_run_id
    )
  );

  v_snapshot_id := create_system_health_snapshot(
    'fixture',
    p_metadata || jsonb_build_object(
      'fixture_run_id',
      v_run_id
    )
  );

  select count(*)
  into v_reward_count
  from reward_issuance_groups
  where id = v_reward_group_id;

  select count(*)
  into v_journal_count
  from accounting_journal_entries
  where source_type = 'reward_issuance_group'
    and source_id = v_reward_group_id;

  select count(*)
  into v_hash_count
  from audit_hash_chain_entries
  where source_id in (
    v_attention_event_id,
    v_reward_group_id
  )
  or source_id in (
    select wallet_ledger_entry_id
    from reward_issuance_groups
    where id = v_reward_group_id
  )
  or source_id in (
    select id
    from accounting_journal_entries
    where source_type = 'reward_issuance_group'
      and source_id = v_reward_group_id
  );

  update dev_fixture_runs
  set
    status = 'completed',
    completed_at = now(),
    created_wallet_count = 1,
    created_campaign_count = 1,
    created_attention_event_count = 1,
    created_reward_count = v_reward_count,
    created_accounting_journal_count = v_journal_count,
    created_audit_hash_count = v_hash_count,
    metadata = metadata || jsonb_build_object(
      'user_id',
      v_user_id,
      'wallet_id',
      v_wallet_id,
      'campaign_id',
      v_campaign_id,
      'campaign_budget_id',
      v_campaign_budget_id,
      'attention_event_id',
      v_attention_event_id,
      'reward_issuance_group_id',
      v_reward_group_id,
      'accounting_run_id',
      v_accounting_run_id,
      'audit_backfill_run_id',
      v_audit_run_id,
      'audit_verify_run_id',
      v_audit_verify_run_id,
      'system_health_snapshot_id',
      v_snapshot_id
    )
  where id = v_run_id;

  perform emit_platform_event(
    'fixture_core_money_loop_seeded',
    'system',
    'info',
    'dev_fixture_seed',
    v_user_id,
    v_wallet_id,
    v_campaign_id,
    'dev_fixture_run',
    v_run_id,
    null,
    null,
    'Demo core money loop seeded',
    jsonb_build_object(
      'reward_amount_minor',
      100
    ),
    p_metadata
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

create or replace function mark_dev_fixture_run_cleaned(
  p_fixture_run_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  perform assert_dev_fixtures_allowed();

  update dev_fixture_runs
  set
    status = 'cleaned',
    metadata = metadata || p_metadata || jsonb_build_object(
      'cleaned_at',
      now(),
      'cleanup_mode',
      'marked_only'
    )
  where id = p_fixture_run_id;

  if not found then
    raise exception 'fixture run not found: %', p_fixture_run_id;
  end if;

  return p_fixture_run_id;
end;
$$;

create or replace view dev_fixture_dashboard as
select
  dfr.id as fixture_run_id,
  dfr.fixture_key,
  dfr.fixture_version,
  dfr.status,

  dfr.created_wallet_count,
  dfr.created_campaign_count,
  dfr.created_attention_event_count,
  dfr.created_reward_count,
  dfr.created_accounting_journal_count,
  dfr.created_audit_hash_count,

  dfr.started_at,
  dfr.completed_at,
  dfr.failed_at,
  dfr.failure_reason,

  dfr.metadata,

  (
    select jsonb_agg(
      jsonb_build_object(
        'entity_type', dfe.entity_type,
        'entity_id', dfe.entity_id,
        'entity_key', dfe.entity_key,
        'created_at', dfe.created_at
      )
      order by dfe.created_at asc
    )
    from dev_fixture_entities dfe
    where dfe.fixture_run_id = dfr.id
  ) as entities

from dev_fixture_runs dfr
order by dfr.started_at desc;

grant select on dev_fixture_dashboard to admin_api_role;
