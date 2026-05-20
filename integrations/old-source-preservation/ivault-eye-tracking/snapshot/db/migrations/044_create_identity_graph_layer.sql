-- Step 5.6 — Device graph / identity graph
-- Connect users, wallets, devices, sessions, IPs, payout rails, and
-- behavioral/vision fingerprints into a fraud-aware identity graph.

-- ---------------------------------------------------------------------------
-- 1. Identity graph nodes
-- ---------------------------------------------------------------------------

create table if not exists identity_graph_nodes (
  id uuid primary key default gen_random_uuid(),

  node_type text not null,
  node_key text not null,

  user_id uuid,
  wallet_id uuid references wallets(id),

  risk_score numeric(6, 4) not null default 0.0000,
  trust_score numeric(6, 4),

  status text not null default 'active',

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint identity_graph_nodes_type_check
  check (
    node_type in (
      'user',
      'wallet',
      'device',
      'session',
      'ip_address',
      'ip_subnet',
      'payout_account',
      'payment_instrument',
      'email',
      'phone',
      'identity_document',
      'app_install',
      'browser_fingerprint',
      'vision_fingerprint',
      'behavior_fingerprint',
      'campaign_cluster'
    )
  ),

  constraint identity_graph_nodes_status_check
  check (
    status in (
      'active',
      'watch',
      'restricted',
      'blocked',
      'merged',
      'archived'
    )
  ),

  constraint identity_graph_nodes_risk_check
  check (
    risk_score >= 0 and risk_score <= 1
  )
);

create unique index if not exists identity_graph_nodes_unique
on identity_graph_nodes (node_type, node_key);

create index if not exists identity_graph_nodes_user_idx
on identity_graph_nodes (user_id);

create index if not exists identity_graph_nodes_wallet_idx
on identity_graph_nodes (wallet_id);

create index if not exists identity_graph_nodes_type_risk_idx
on identity_graph_nodes (node_type, risk_score desc);

create index if not exists identity_graph_nodes_status_idx
on identity_graph_nodes (status, last_seen_at desc);

-- ---------------------------------------------------------------------------
-- 2. Identity graph edges
-- ---------------------------------------------------------------------------

create table if not exists identity_graph_edges (
  id uuid primary key default gen_random_uuid(),

  from_node_id uuid not null references identity_graph_nodes(id),
  to_node_id uuid not null references identity_graph_nodes(id),

  edge_type text not null,

  strength numeric(6, 4) not null default 1.0000,
  confidence_score numeric(6, 4) not null default 1.0000,

  risk_delta numeric(10, 6) not null default 0.000000,
  trust_delta numeric(10, 6) not null default 0.000000,

  source text not null default 'system',

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  observation_count integer not null default 1,

  active boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint identity_graph_edges_strength_check
  check (
    strength >= 0 and strength <= 1
    and confidence_score >= 0 and confidence_score <= 1
  ),

  constraint identity_graph_edges_type_check
  check (
    edge_type in (
      'owns',
      'uses',
      'used_by',
      'logged_in_from',
      'shares_device',
      'shares_ip',
      'shares_subnet',
      'shares_payout_account',
      'shares_payment_instrument',
      'shares_identity_document',
      'same_app_install',
      'same_browser_fingerprint',
      'same_vision_fingerprint',
      'same_behavior_fingerprint',
      'same_campaign_cluster',
      'suspected_same_actor',
      'confirmed_same_actor'
    )
  )
);

create unique index if not exists identity_graph_edges_unique
on identity_graph_edges (from_node_id, to_node_id, edge_type);

create index if not exists identity_graph_edges_from_idx
on identity_graph_edges (from_node_id, active, last_seen_at desc);

create index if not exists identity_graph_edges_to_idx
on identity_graph_edges (to_node_id, active, last_seen_at desc);

create index if not exists identity_graph_edges_type_idx
on identity_graph_edges (edge_type, active, last_seen_at desc);

-- ---------------------------------------------------------------------------
-- 3. Graph observations (evidence log)
-- ---------------------------------------------------------------------------

create table if not exists identity_graph_observations (
  id uuid primary key default gen_random_uuid(),

  user_id uuid,
  wallet_id uuid references wallets(id),

  observation_type text not null,
  observation_source text not null,

  node_type text not null,
  node_key text not null,

  related_node_type text,
  related_node_key text,

  confidence_score numeric(6, 4) not null default 1.0000,
  risk_score numeric(6, 4) not null default 0.0000,

  related_attention_event_id uuid references attention_verification_events(id),
  related_attention_session_id uuid references attention_verification_sessions(id),
  related_reward_id uuid,
  related_campaign_id uuid,

  idempotency_key text,

  metadata jsonb not null default '{}'::jsonb,

  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint identity_graph_observations_confidence_check
  check (
    confidence_score >= 0 and confidence_score <= 1
    and risk_score >= 0 and risk_score <= 1
  )
);

create unique index if not exists identity_graph_observations_idempotency_unique
on identity_graph_observations (observation_source, idempotency_key)
where idempotency_key is not null;

create index if not exists identity_graph_observations_wallet_idx
on identity_graph_observations (wallet_id, observed_at desc);

create index if not exists identity_graph_observations_node_idx
on identity_graph_observations (node_type, node_key, observed_at desc);

create index if not exists identity_graph_observations_type_idx
on identity_graph_observations (observation_type, observed_at desc);

-- ---------------------------------------------------------------------------
-- 4. get_or_create_identity_graph_node
-- ---------------------------------------------------------------------------

create or replace function get_or_create_identity_graph_node(
  p_node_type text,
  p_node_key text,
  p_user_id uuid default null,
  p_wallet_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_node_id uuid;
begin
  if p_node_type is null or length(trim(p_node_type)) = 0 then
    raise exception 'node type is required';
  end if;

  if p_node_key is null or length(trim(p_node_key)) = 0 then
    raise exception 'node key is required';
  end if;

  insert into identity_graph_nodes (
    node_type,
    node_key,
    user_id,
    wallet_id,
    metadata
  )
  values (
    p_node_type,
    p_node_key,
    p_user_id,
    p_wallet_id,
    p_metadata
  )
  on conflict (node_type, node_key)
  do update set
    user_id = coalesce(excluded.user_id, identity_graph_nodes.user_id),
    wallet_id = coalesce(excluded.wallet_id, identity_graph_nodes.wallet_id),
    last_seen_at = now(),
    metadata = identity_graph_nodes.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_node_id;

  return v_node_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. upsert_identity_graph_edge
-- ---------------------------------------------------------------------------

create or replace function upsert_identity_graph_edge(
  p_from_node_id uuid,
  p_to_node_id uuid,
  p_edge_type text,
  p_strength numeric default 1.0000,
  p_confidence_score numeric default 1.0000,
  p_risk_delta numeric default 0.000000,
  p_trust_delta numeric default 0.000000,
  p_source text default 'system',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_edge_id uuid;
begin
  if p_from_node_id is null or p_to_node_id is null then
    raise exception 'from_node_id and to_node_id are required';
  end if;

  if p_from_node_id = p_to_node_id then
    raise exception 'self edge is not allowed';
  end if;

  insert into identity_graph_edges (
    from_node_id,
    to_node_id,
    edge_type,
    strength,
    confidence_score,
    risk_delta,
    trust_delta,
    source,
    metadata
  )
  values (
    p_from_node_id,
    p_to_node_id,
    p_edge_type,
    p_strength,
    p_confidence_score,
    p_risk_delta,
    p_trust_delta,
    p_source,
    p_metadata
  )
  on conflict (from_node_id, to_node_id, edge_type)
  do update set
    strength = greatest(identity_graph_edges.strength, excluded.strength),
    confidence_score = greatest(identity_graph_edges.confidence_score, excluded.confidence_score),
    risk_delta = identity_graph_edges.risk_delta + excluded.risk_delta,
    trust_delta = identity_graph_edges.trust_delta + excluded.trust_delta,
    observation_count = identity_graph_edges.observation_count + 1,
    last_seen_at = now(),
    active = true,
    metadata = identity_graph_edges.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_edge_id;

  return v_edge_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. record_identity_graph_observation
-- ---------------------------------------------------------------------------

create or replace function record_identity_graph_observation(
  p_user_id uuid,
  p_wallet_id uuid,
  p_observation_type text,
  p_observation_source text,
  p_node_type text,
  p_node_key text,
  p_related_node_type text default null,
  p_related_node_key text default null,
  p_edge_type text default null,
  p_confidence_score numeric default 1.0000,
  p_risk_score numeric default 0.0000,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_observation_id uuid;
  v_node_id uuid;
  v_related_node_id uuid;
begin
  if p_observation_type is null or length(trim(p_observation_type)) = 0 then
    raise exception 'observation type is required';
  end if;

  if p_observation_source is null or length(trim(p_observation_source)) = 0 then
    raise exception 'observation source is required';
  end if;

  v_node_id := get_or_create_identity_graph_node(
    p_node_type,
    p_node_key,
    p_user_id,
    p_wallet_id,
    p_metadata
  );

  insert into identity_graph_observations (
    user_id,
    wallet_id,
    observation_type,
    observation_source,
    node_type,
    node_key,
    related_node_type,
    related_node_key,
    confidence_score,
    risk_score,
    idempotency_key,
    metadata
  )
  values (
    p_user_id,
    p_wallet_id,
    p_observation_type,
    p_observation_source,
    p_node_type,
    p_node_key,
    p_related_node_type,
    p_related_node_key,
    p_confidence_score,
    p_risk_score,
    p_idempotency_key,
    p_metadata
  )
  on conflict (observation_source, idempotency_key)
  where idempotency_key is not null
  do update set
    metadata = identity_graph_observations.metadata || excluded.metadata
  returning id into v_observation_id;

  if p_related_node_type is not null
    and p_related_node_key is not null
    and p_edge_type is not null then

    v_related_node_id := get_or_create_identity_graph_node(
      p_related_node_type,
      p_related_node_key,
      p_user_id,
      p_wallet_id,
      p_metadata
    );

    perform upsert_identity_graph_edge(
      v_node_id,
      v_related_node_id,
      p_edge_type,
      p_confidence_score,
      p_confidence_score,
      p_risk_score,
      0.000000,
      p_observation_source,
      p_metadata || jsonb_build_object(
        'observation_id',
        v_observation_id
      )
    );
  end if;

  return v_observation_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. link_wallet_to_device
-- ---------------------------------------------------------------------------

create or replace function link_wallet_to_device(
  p_wallet_id uuid,
  p_user_id uuid,
  p_device_key text,
  p_device_id uuid default null,
  p_confidence_score numeric default 1.0000,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet_node_id uuid;
  v_device_node_id uuid;
  v_edge_id uuid;
begin
  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_device_key is null or length(trim(p_device_key)) = 0 then
    raise exception 'device key is required';
  end if;

  v_wallet_node_id := get_or_create_identity_graph_node(
    'wallet',
    p_wallet_id::text,
    p_user_id,
    p_wallet_id,
    p_metadata
  );

  v_device_node_id := get_or_create_identity_graph_node(
    'device',
    p_device_key,
    p_user_id,
    p_wallet_id,
    p_metadata || jsonb_build_object(
      'device_id',
      p_device_id
    )
  );

  v_edge_id := upsert_identity_graph_edge(
    v_wallet_node_id,
    v_device_node_id,
    'uses',
    1.0000,
    p_confidence_score,
    0.000000,
    0.000000,
    'device_graph',
    p_metadata
  );

  perform upsert_identity_graph_edge(
    v_device_node_id,
    v_wallet_node_id,
    'used_by',
    1.0000,
    p_confidence_score,
    0.000000,
    0.000000,
    'device_graph',
    p_metadata
  );

  return v_edge_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. link_wallet_to_ip
-- ---------------------------------------------------------------------------

create or replace function link_wallet_to_ip(
  p_wallet_id uuid,
  p_user_id uuid,
  p_ip_key text,
  p_ip_subnet_key text default null,
  p_confidence_score numeric default 0.4000,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet_node_id uuid;
  v_ip_node_id uuid;
  v_subnet_node_id uuid;
  v_edge_id uuid;
begin
  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_ip_key is null or length(trim(p_ip_key)) = 0 then
    raise exception 'ip key is required';
  end if;

  v_wallet_node_id := get_or_create_identity_graph_node(
    'wallet',
    p_wallet_id::text,
    p_user_id,
    p_wallet_id,
    p_metadata
  );

  v_ip_node_id := get_or_create_identity_graph_node(
    'ip_address',
    p_ip_key,
    p_user_id,
    p_wallet_id,
    p_metadata
  );

  v_edge_id := upsert_identity_graph_edge(
    v_wallet_node_id,
    v_ip_node_id,
    'logged_in_from',
    0.5000,
    p_confidence_score,
    0.000000,
    0.000000,
    'ip_graph',
    p_metadata
  );

  if p_ip_subnet_key is not null then
    v_subnet_node_id := get_or_create_identity_graph_node(
      'ip_subnet',
      p_ip_subnet_key,
      null,
      null,
      '{}'::jsonb
    );

    perform upsert_identity_graph_edge(
      v_ip_node_id,
      v_subnet_node_id,
      'shares_subnet',
      0.3000,
      p_confidence_score,
      0.000000,
      0.000000,
      'ip_graph',
      p_metadata
    );
  end if;

  return v_edge_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. link_wallet_to_payout_account
-- ---------------------------------------------------------------------------

create or replace function link_wallet_to_payout_account(
  p_wallet_id uuid,
  p_user_id uuid,
  p_payout_account_key text,
  p_confidence_score numeric default 1.0000,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet_node_id uuid;
  v_payout_node_id uuid;
  v_edge_id uuid;
begin
  if p_payout_account_key is null or length(trim(p_payout_account_key)) = 0 then
    raise exception 'payout account key is required';
  end if;

  v_wallet_node_id := get_or_create_identity_graph_node(
    'wallet',
    p_wallet_id::text,
    p_user_id,
    p_wallet_id,
    p_metadata
  );

  v_payout_node_id := get_or_create_identity_graph_node(
    'payout_account',
    p_payout_account_key,
    p_user_id,
    p_wallet_id,
    p_metadata
  );

  v_edge_id := upsert_identity_graph_edge(
    v_wallet_node_id,
    v_payout_node_id,
    'uses',
    1.0000,
    p_confidence_score,
    0.000000,
    0.000000,
    'payout_graph',
    p_metadata
  );

  return v_edge_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Shared node risk view
-- ---------------------------------------------------------------------------

create or replace view identity_graph_shared_nodes as
select
  n.id as node_id,
  n.node_type,
  n.node_key,
  n.risk_score,
  n.status,

  count(distinct e.from_node_id) filter (
    where wn.node_type = 'wallet'
  ) as connected_wallet_count,

  array_agg(distinct wn.wallet_id) filter (
    where wn.wallet_id is not null
  ) as connected_wallet_ids,

  max(e.last_seen_at) as last_seen_at

from identity_graph_nodes n
join identity_graph_edges e
  on e.to_node_id = n.id
 and e.active is true
join identity_graph_nodes wn
  on wn.id = e.from_node_id
where wn.node_type = 'wallet'
group by n.id
having count(distinct e.from_node_id) > 1;

-- ---------------------------------------------------------------------------
-- 11. High-risk cluster view
-- ---------------------------------------------------------------------------

create or replace view identity_graph_risky_clusters as
select
  node_id,
  node_type,
  node_key,
  connected_wallet_count,
  connected_wallet_ids,
  risk_score,
  status,
  last_seen_at,

  case
    when node_type = 'payout_account' and connected_wallet_count >= 2 then 'critical'
    when node_type = 'device' and connected_wallet_count >= 3 then 'high'
    when node_type = 'vision_fingerprint' and connected_wallet_count >= 3 then 'high'
    when node_type = 'behavior_fingerprint' and connected_wallet_count >= 3 then 'high'
    when node_type = 'ip_address' and connected_wallet_count >= 10 then 'medium'
    when node_type = 'ip_subnet' and connected_wallet_count >= 25 then 'medium'
    else 'low'
  end as cluster_severity,

  case
    when node_type = 'payout_account' and connected_wallet_count >= 2 then 0.9500
    when node_type = 'device' and connected_wallet_count >= 3 then 0.8500
    when node_type = 'vision_fingerprint' and connected_wallet_count >= 3 then 0.8500
    when node_type = 'behavior_fingerprint' and connected_wallet_count >= 3 then 0.8000
    when node_type = 'ip_address' and connected_wallet_count >= 10 then 0.6500
    when node_type = 'ip_subnet' and connected_wallet_count >= 25 then 0.6000
    else 0.3000
  end as cluster_risk_score

from identity_graph_shared_nodes;

-- ---------------------------------------------------------------------------
-- 12. Apply graph risk to wallets
-- ---------------------------------------------------------------------------

create or replace function apply_identity_graph_risk_to_wallets(
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_cluster record;
  v_wallet_id uuid;
  v_count integer := 0;
begin
  for v_cluster in
    select *
    from identity_graph_risky_clusters
    where cluster_severity in ('medium', 'high', 'critical')
  loop
    foreach v_wallet_id in array v_cluster.connected_wallet_ids
    loop
      perform record_trust_signal(
        'wallet',
        v_wallet_id,
        null,
        v_wallet_id,
        'risky_identity_graph_cluster',
        'identity_graph_engine',
        'negative',
        v_cluster.cluster_severity,
        v_cluster.cluster_risk_score,
        1.0000,
        null,
        null,
        null,
        'identity_graph_cluster:' ||
          v_cluster.node_id::text || ':' ||
          v_wallet_id::text,
        p_metadata || jsonb_build_object(
          'cluster_node_id',
          v_cluster.node_id,
          'cluster_node_type',
          v_cluster.node_type,
          'connected_wallet_count',
          v_cluster.connected_wallet_count,
          'cluster_risk_score',
          v_cluster.cluster_risk_score,
          'cluster_severity',
          v_cluster.cluster_severity
        )
      );

      perform apply_trust_score_to_wallet_policy(
        v_wallet_id,
        p_metadata || jsonb_build_object(
          'trigger',
          'identity_graph_risk',
          'cluster_node_id',
          v_cluster.node_id
        )
      );

      v_count := v_count + 1;
    end loop;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 13. Seed graph trust weight rules
-- ---------------------------------------------------------------------------

insert into trust_signal_weight_rules (
  formula_version,
  signal_source,
  signal_type,
  direction,
  severity,
  base_signal_weight,
  trust_delta,
  risk_delta,
  confidence_delta,
  metadata
)
values
  (
    'trust_v1',
    'identity_graph_engine',
    'risky_identity_graph_cluster',
    'negative',
    'medium',
    1.000000,
    -0.050000,
    0.100000,
    0.050000,
    '{"meaning": "medium graph cluster risk"}'::jsonb
  ),
  (
    'trust_v1',
    'identity_graph_engine',
    'risky_identity_graph_cluster',
    'negative',
    'high',
    1.000000,
    -0.120000,
    0.220000,
    0.080000,
    '{"meaning": "high graph cluster risk"}'::jsonb
  ),
  (
    'trust_v1',
    'identity_graph_engine',
    'risky_identity_graph_cluster',
    'negative',
    'critical',
    1.000000,
    -0.250000,
    0.400000,
    0.100000,
    '{"meaning": "critical graph cluster risk"}'::jsonb
  );

-- ---------------------------------------------------------------------------
-- 14. Identity graph risk runs
-- ---------------------------------------------------------------------------

create table if not exists identity_graph_risk_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  risky_cluster_count integer not null default 0,
  affected_wallet_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  constraint identity_graph_risk_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists identity_graph_risk_runs_started_idx
on identity_graph_risk_runs (started_at desc);

-- ---------------------------------------------------------------------------
-- 15. run_identity_graph_risk_job
-- ---------------------------------------------------------------------------

create or replace function run_identity_graph_risk_job(
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_cluster_count integer := 0;
  v_affected_count integer := 0;
begin
  insert into identity_graph_risk_runs (
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

  select count(*)
  into v_cluster_count
  from identity_graph_risky_clusters
  where cluster_severity in ('medium', 'high', 'critical');

  v_affected_count := apply_identity_graph_risk_to_wallets(
    p_metadata || jsonb_build_object(
      'identity_graph_risk_run_id',
      v_run_id
    )
  );

  update identity_graph_risk_runs
  set
    status = 'completed',
    completed_at = now(),
    risky_cluster_count = v_cluster_count,
    affected_wallet_count = v_affected_count
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update identity_graph_risk_runs
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
-- 16. Wallet identity graph details view
-- ---------------------------------------------------------------------------

create or replace view wallet_identity_graph_details as
select
  w.id as wallet_id,
  w.user_id,

  wn.id as wallet_node_id,

  count(e.id) as edge_count,

  jsonb_agg(
    jsonb_build_object(
      'edge_id', e.id,
      'edge_type', e.edge_type,
      'strength', e.strength,
      'confidence_score', e.confidence_score,
      'risk_delta', e.risk_delta,
      'trust_delta', e.trust_delta,
      'source', e.source,
      'observation_count', e.observation_count,
      'last_seen_at', e.last_seen_at,
      'node_id', n.id,
      'node_type', n.node_type,
      'node_key', n.node_key,
      'node_risk_score', n.risk_score,
      'node_status', n.status
    )
    order by e.last_seen_at desc
  ) filter (where e.id is not null) as connected_nodes

from wallets w
left join identity_graph_nodes wn
  on wn.node_type = 'wallet'
 and wn.node_key = w.id::text
left join identity_graph_edges e
  on e.from_node_id = wn.id
 and e.active is true
left join identity_graph_nodes n
  on n.id = e.to_node_id
group by w.id, wn.id;
