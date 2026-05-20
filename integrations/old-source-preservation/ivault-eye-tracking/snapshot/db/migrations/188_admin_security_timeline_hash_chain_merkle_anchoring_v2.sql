-- Step 9.73 — Build timeline hash chain and Merkle anchoring v2.
-- Runs after 187_admin_security_trust_proof_timeline_v2.sql.

create table if not exists admin_security_trust_timeline_chains (
  id uuid primary key default gen_random_uuid(),
  chain_key text not null unique,
  status text not null default 'active',
  chain_scope text not null,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  title text not null,
  summary text,
  last_sequence_number bigint not null default 0,
  last_event_id uuid references admin_security_trust_timeline_events(id) on delete set null,
  last_event_time timestamptz,
  last_event_hash_sha256 text,
  last_chain_hash_sha256 text,
  event_count bigint not null default 0,
  first_event_at timestamptz,
  last_checkpoint_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chain_scope, private_room_id, auditor_portal_id, enterprise_review_room_id, customer_name),
  constraint admin_security_trust_timeline_chains_status_check
  check (status in ('active', 'paused', 'sealed', 'revoked', 'archived')),
  constraint admin_security_trust_timeline_chains_scope_check
  check (
    chain_scope in (
      'global',
      'public',
      'customer',
      'private_room',
      'auditor_portal',
      'enterprise_review_room',
      'admin'
    )
  ),
  constraint admin_security_trust_timeline_chains_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_trust_timeline_chains_scope_idx
on admin_security_trust_timeline_chains (chain_scope, status);

create index if not exists admin_security_trust_timeline_chains_private_room_idx
on admin_security_trust_timeline_chains (private_room_id, status);

create index if not exists admin_security_trust_timeline_chains_customer_idx
on admin_security_trust_timeline_chains (customer_name, customer_domain);

drop trigger if exists admin_security_trust_timeline_chains_set_updated_at
on admin_security_trust_timeline_chains;

create trigger admin_security_trust_timeline_chains_set_updated_at
before update on admin_security_trust_timeline_chains
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_timeline_chain_entries (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references admin_security_trust_timeline_chains(id) on delete cascade,
  timeline_event_id uuid not null references admin_security_trust_timeline_events(id) on delete cascade,
  sequence_number bigint not null,
  event_time timestamptz not null,
  timeline_event_key text not null,
  event_hash_sha256 text not null,
  previous_chain_hash_sha256 text,
  chain_hash_sha256 text not null,
  chain_input jsonb not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (chain_id, sequence_number),
  unique (chain_id, timeline_event_id),
  constraint admin_security_trust_timeline_chain_entries_status_check
  check (status in ('active', 'redacted', 'revoked', 'archived'))
);

create index if not exists admin_security_trust_timeline_chain_entries_chain_idx
on admin_security_trust_timeline_chain_entries (chain_id, sequence_number);

create index if not exists admin_security_trust_timeline_chain_entries_event_idx
on admin_security_trust_timeline_chain_entries (timeline_event_id);

create index if not exists admin_security_trust_timeline_chain_entries_hash_idx
on admin_security_trust_timeline_chain_entries (chain_hash_sha256);

create or replace function prevent_admin_security_trust_timeline_chain_entry_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.status <> new.status
    or old.metadata is distinct from new.metadata
  then
    return new;
  end if;

  raise exception 'trust timeline chain entries are immutable';
end;
$$;

drop trigger if exists admin_security_trust_timeline_chain_entries_immutable
on admin_security_trust_timeline_chain_entries;

create trigger admin_security_trust_timeline_chain_entries_immutable
before update on admin_security_trust_timeline_chain_entries
for each row
execute function prevent_admin_security_trust_timeline_chain_entry_mutation();

create table if not exists admin_security_trust_timeline_chain_checkpoints (
  id uuid primary key default gen_random_uuid(),
  checkpoint_key text not null unique,
  status text not null default 'active',
  chain_id uuid not null references admin_security_trust_timeline_chains(id) on delete cascade,
  checkpoint_type text not null default 'scheduled',
  sequence_number bigint not null,
  event_count bigint not null,
  from_event_time timestamptz,
  to_event_time timestamptz,
  chain_head_hash_sha256 text not null,
  previous_checkpoint_hash_sha256 text,
  checkpoint_hash_sha256 text not null,
  checkpoint_payload jsonb not null default '{}'::jsonb,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  signed_at timestamptz,
  storage_uri text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (chain_id, sequence_number),
  constraint admin_security_trust_timeline_chain_checkpoints_status_check
  check (status in ('active', 'revoked', 'archived')),
  constraint admin_security_trust_timeline_chain_checkpoints_type_check
  check (
    checkpoint_type in (
      'scheduled',
      'manual',
      'snapshot',
      'room_close',
      'audit_export',
      'legal_hold',
      'system'
    )
  )
);

create index if not exists admin_security_trust_timeline_chain_checkpoints_chain_idx
on admin_security_trust_timeline_chain_checkpoints (chain_id, sequence_number desc);

create index if not exists admin_security_trust_timeline_chain_checkpoints_hash_idx
on admin_security_trust_timeline_chain_checkpoints (checkpoint_hash_sha256);

create table if not exists admin_security_trust_timeline_merkle_batches (
  id uuid primary key default gen_random_uuid(),
  merkle_batch_key text not null unique,
  status text not null default 'pending',
  chain_id uuid not null references admin_security_trust_timeline_chains(id) on delete cascade,
  batch_scope text not null,
  from_sequence_number bigint not null,
  to_sequence_number bigint not null,
  from_event_time timestamptz,
  to_event_time timestamptz,
  leaf_count integer not null default 0,
  merkle_root_sha256 text,
  merkle_algorithm text not null default 'SHA256_BINARY_TREE_V1',
  batch_payload jsonb not null default '{}'::jsonb,
  batch_hash_sha256 text,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  signed_at timestamptz,
  storage_uri text,
  completed_at timestamptz,
  failed_at timestamptz,
  last_error text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_trust_timeline_merkle_batches_status_check
  check (status in ('pending', 'building', 'ready', 'failed', 'revoked', 'archived')),
  constraint admin_security_trust_timeline_merkle_batches_scope_check
  check (batch_scope in ('global', 'public', 'customer', 'private_room', 'auditor_portal', 'enterprise_review_room', 'admin')),
  constraint admin_security_trust_timeline_merkle_batches_range_check
  check (to_sequence_number >= from_sequence_number)
);

create index if not exists admin_security_trust_timeline_merkle_batches_chain_idx
on admin_security_trust_timeline_merkle_batches (chain_id, status, created_at desc);

create index if not exists admin_security_trust_timeline_merkle_batches_root_idx
on admin_security_trust_timeline_merkle_batches (merkle_root_sha256);

drop trigger if exists admin_security_trust_timeline_merkle_batches_set_updated_at
on admin_security_trust_timeline_merkle_batches;

create trigger admin_security_trust_timeline_merkle_batches_set_updated_at
before update on admin_security_trust_timeline_merkle_batches
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_timeline_merkle_leaves (
  id uuid primary key default gen_random_uuid(),
  merkle_batch_id uuid not null references admin_security_trust_timeline_merkle_batches(id) on delete cascade,
  chain_entry_id uuid not null references admin_security_trust_timeline_chain_entries(id) on delete cascade,
  timeline_event_id uuid not null references admin_security_trust_timeline_events(id) on delete cascade,
  leaf_index integer not null,
  sequence_number bigint not null,
  event_hash_sha256 text not null,
  chain_hash_sha256 text not null,
  leaf_hash_sha256 text not null,
  proof_path jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (merkle_batch_id, leaf_index),
  unique (merkle_batch_id, timeline_event_id)
);

create index if not exists admin_security_trust_timeline_merkle_leaves_batch_idx
on admin_security_trust_timeline_merkle_leaves (merkle_batch_id, leaf_index);

create index if not exists admin_security_trust_timeline_merkle_leaves_event_idx
on admin_security_trust_timeline_merkle_leaves (timeline_event_id);

create index if not exists admin_security_trust_timeline_merkle_leaves_hash_idx
on admin_security_trust_timeline_merkle_leaves (leaf_hash_sha256);

create table if not exists admin_security_trust_timeline_anchors (
  id uuid primary key default gen_random_uuid(),
  anchor_key text not null unique,
  status text not null default 'active',
  anchor_type text not null default 'internal',
  chain_id uuid references admin_security_trust_timeline_chains(id) on delete set null,
  checkpoint_id uuid references admin_security_trust_timeline_chain_checkpoints(id) on delete set null,
  merkle_batch_id uuid references admin_security_trust_timeline_merkle_batches(id) on delete set null,
  anchored_hash_sha256 text not null,
  anchored_payload jsonb not null default '{}'::jsonb,
  external_system text,
  external_reference text,
  external_url text,
  anchored_at timestamptz not null default now(),
  signature_algorithm text,
  signing_key_version text,
  signature text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_trust_timeline_anchors_status_check
  check (status in ('active', 'revoked', 'archived')),
  constraint admin_security_trust_timeline_anchors_type_check
  check (anchor_type in ('internal', 'object_storage', 'transparency_log', 'blockchain', 'notary', 'external_audit', 'other'))
);

create index if not exists admin_security_trust_timeline_anchors_chain_idx
on admin_security_trust_timeline_anchors (chain_id, created_at desc);

create index if not exists admin_security_trust_timeline_anchors_hash_idx
on admin_security_trust_timeline_anchors (anchored_hash_sha256);

create or replace function get_or_create_admin_security_trust_timeline_chain(
  p_chain_scope text,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_private_room_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_title text default null,
  p_summary text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_chain_id uuid;
  v_chain_key text;
  v_title text;
begin
  v_chain_key :=
    'trust_timeline_chain:' ||
    p_chain_scope || ':' ||
    coalesce(p_private_room_id::text, '') || ':' ||
    coalesce(p_auditor_portal_id::text, '') || ':' ||
    coalesce(p_enterprise_review_room_id::text, '') || ':' ||
    coalesce(lower(regexp_replace(p_customer_name, '\s+', '-', 'g')), 'global');

  v_title := coalesce(
    p_title,
    case
      when p_chain_scope = 'private_room' then 'Private Room Timeline Chain'
      when p_chain_scope = 'customer' then 'Customer Timeline Chain — ' || coalesce(p_customer_name, 'Unknown Customer')
      when p_chain_scope = 'auditor_portal' then 'Auditor Timeline Chain'
      when p_chain_scope = 'enterprise_review_room' then 'Enterprise Review Timeline Chain'
      when p_chain_scope = 'public' then 'Public Timeline Chain'
      else 'Global Trust Timeline Chain'
    end
  );

  insert into admin_security_trust_timeline_chains (
    chain_key,
    status,
    chain_scope,
    customer_name,
    customer_domain,
    private_room_id,
    auditor_portal_id,
    enterprise_review_room_id,
    title,
    summary,
    metadata
  )
  values (
    v_chain_key,
    'active',
    p_chain_scope,
    p_customer_name,
    p_customer_domain,
    p_private_room_id,
    p_auditor_portal_id,
    p_enterprise_review_room_id,
    v_title,
    p_summary,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (chain_scope, private_room_id, auditor_portal_id, enterprise_review_room_id, customer_name)
  do update set
    customer_domain = coalesce(excluded.customer_domain, admin_security_trust_timeline_chains.customer_domain),
    title = coalesce(excluded.title, admin_security_trust_timeline_chains.title),
    summary = coalesce(excluded.summary, admin_security_trust_timeline_chains.summary),
    metadata = admin_security_trust_timeline_chains.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_chain_id;

  return v_chain_id;
end;
$$;

create or replace function determine_admin_security_trust_timeline_event_chain_scope(
  p_private_room_id uuid,
  p_auditor_portal_id uuid,
  p_enterprise_review_room_id uuid,
  p_customer_name text,
  p_visibility text
)
returns text
language plpgsql
as $$
begin
  if p_private_room_id is not null then
    return 'private_room';
  elsif p_auditor_portal_id is not null then
    return 'auditor_portal';
  elsif p_enterprise_review_room_id is not null then
    return 'enterprise_review_room';
  elsif p_visibility = 'public' then
    return 'public';
  elsif p_customer_name is not null then
    return 'customer';
  else
    return 'global';
  end if;
end;
$$;

create or replace function chain_admin_security_trust_timeline_event(
  p_timeline_event_id uuid,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event admin_security_trust_timeline_events%rowtype;
  v_chain_id uuid;
  v_scope text;
  v_chain admin_security_trust_timeline_chains%rowtype;
  v_sequence bigint;
  v_chain_input jsonb;
  v_chain_hash text;
  v_entry_id uuid;
begin
  select *
  into v_event
  from admin_security_trust_timeline_events
  where id = p_timeline_event_id;

  if v_event.id is null then
    raise exception 'timeline event not found: %', p_timeline_event_id;
  end if;

  if v_event.immutable_hash_sha256 is null then
    raise exception 'timeline event missing immutable hash: %', p_timeline_event_id;
  end if;

  v_scope := determine_admin_security_trust_timeline_event_chain_scope(
    v_event.private_room_id,
    v_event.auditor_portal_id,
    v_event.enterprise_review_room_id,
    v_event.customer_name,
    v_event.visibility
  );

  v_chain_id := get_or_create_admin_security_trust_timeline_chain(
    v_scope,
    v_event.customer_name,
    v_event.customer_domain,
    v_event.private_room_id,
    v_event.auditor_portal_id,
    v_event.enterprise_review_room_id,
    null,
    null,
    coalesce(p_metadata, '{}'::jsonb)
  );

  select *
  into v_chain
  from admin_security_trust_timeline_chains
  where id = v_chain_id
  for update;

  if exists (
    select 1
    from admin_security_trust_timeline_chain_entries
    where chain_id = v_chain_id
      and timeline_event_id = v_event.id
  ) then
    select id
    into v_entry_id
    from admin_security_trust_timeline_chain_entries
    where chain_id = v_chain_id
      and timeline_event_id = v_event.id;

    return v_entry_id;
  end if;

  v_sequence := v_chain.last_sequence_number + 1;

  v_chain_input := jsonb_build_object(
    'chainKey', v_chain.chain_key,
    'sequenceNumber', v_sequence,
    'timelineEventKey', v_event.timeline_event_key,
    'eventHashSha256', v_event.immutable_hash_sha256,
    'previousChainHashSha256', v_chain.last_chain_hash_sha256,
    'eventTime', v_event.event_time,
    'sourceType', v_event.source_type,
    'sourceId', v_event.source_id
  );

  v_chain_hash := encode(digest(v_chain_input::text, 'sha256'), 'hex');

  insert into admin_security_trust_timeline_chain_entries (
    chain_id,
    timeline_event_id,
    sequence_number,
    event_time,
    timeline_event_key,
    event_hash_sha256,
    previous_chain_hash_sha256,
    chain_hash_sha256,
    chain_input,
    metadata
  )
  values (
    v_chain_id,
    v_event.id,
    v_sequence,
    v_event.event_time,
    v_event.timeline_event_key,
    v_event.immutable_hash_sha256,
    v_chain.last_chain_hash_sha256,
    v_chain_hash,
    v_chain_input,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('worker_id', p_worker_id)
  )
  returning id into v_entry_id;

  update admin_security_trust_timeline_chains
  set
    last_sequence_number = v_sequence,
    last_event_id = v_event.id,
    last_event_time = v_event.event_time,
    last_event_hash_sha256 = v_event.immutable_hash_sha256,
    last_chain_hash_sha256 = v_chain_hash,
    event_count = event_count + 1,
    first_event_at = coalesce(first_event_at, v_event.event_time),
    updated_at = now()
  where id = v_chain_id;

  return v_entry_id;
end;
$$;

create or replace function chain_admin_security_trust_timeline_events(
  p_batch_size integer default 1000,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_row record;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_row in
    select e.id
    from admin_security_trust_timeline_events e
    where e.status = 'active'
      and not exists (
        select 1
        from admin_security_trust_timeline_chain_entries ce
        where ce.timeline_event_id = e.id
      )
    order by e.event_time asc, e.created_at asc
    limit p_batch_size
  loop
    perform chain_admin_security_trust_timeline_event(
      v_row.id,
      p_worker_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('timeline_chain_run_id', v_run_id)
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function create_admin_security_trust_timeline_chain_checkpoint(
  p_chain_id uuid,
  p_checkpoint_type text default 'scheduled',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_chain admin_security_trust_timeline_chains%rowtype;
  v_previous admin_security_trust_timeline_chain_checkpoints%rowtype;
  v_checkpoint_id uuid;
  v_checkpoint_key text;
  v_payload jsonb;
  v_hash text;
begin
  select *
  into v_chain
  from admin_security_trust_timeline_chains
  where id = p_chain_id
  for update;

  if v_chain.id is null then
    raise exception 'timeline chain not found: %', p_chain_id;
  end if;

  if v_chain.last_chain_hash_sha256 is null then
    raise exception 'timeline chain has no events to checkpoint';
  end if;

  select *
  into v_previous
  from admin_security_trust_timeline_chain_checkpoints
  where chain_id = v_chain.id
    and status = 'active'
  order by sequence_number desc
  limit 1;

  v_checkpoint_key := 'trust_timeline_checkpoint:' || v_chain.chain_key || ':' || v_chain.last_sequence_number::text;

  v_payload := jsonb_build_object(
    'checkpointKey', v_checkpoint_key,
    'chainKey', v_chain.chain_key,
    'chainScope', v_chain.chain_scope,
    'sequenceNumber', v_chain.last_sequence_number,
    'eventCount', v_chain.event_count,
    'chainHeadHashSha256', v_chain.last_chain_hash_sha256,
    'previousCheckpointHashSha256', v_previous.checkpoint_hash_sha256,
    'createdAt', now()
  );

  v_hash := encode(digest(v_payload::text, 'sha256'), 'hex');

  insert into admin_security_trust_timeline_chain_checkpoints (
    checkpoint_key,
    status,
    chain_id,
    checkpoint_type,
    sequence_number,
    event_count,
    from_event_time,
    to_event_time,
    chain_head_hash_sha256,
    previous_checkpoint_hash_sha256,
    checkpoint_hash_sha256,
    checkpoint_payload,
    signature_algorithm,
    signing_key_version,
    signature,
    signed_at,
    storage_uri,
    request_id,
    metadata
  )
  values (
    v_checkpoint_key,
    'active',
    v_chain.id,
    coalesce(p_checkpoint_type, 'scheduled'),
    v_chain.last_sequence_number,
    v_chain.event_count,
    v_chain.first_event_at,
    v_chain.last_event_time,
    v_chain.last_chain_hash_sha256,
    v_previous.checkpoint_hash_sha256,
    v_hash,
    v_payload,
    'HMAC-SHA256',
    'timeline-checkpoint-signing-v1',
    encode(digest(v_hash || ':' || v_checkpoint_key, 'sha256'), 'hex'),
    now(),
    'trust-timeline-checkpoint://' || v_checkpoint_key || '.json',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (chain_id, sequence_number)
  do update set
    metadata = admin_security_trust_timeline_chain_checkpoints.metadata || excluded.metadata
  returning id into v_checkpoint_id;

  update admin_security_trust_timeline_chains
  set
    last_checkpoint_at = now(),
    updated_at = now()
  where id = v_chain.id;

  return v_checkpoint_id;
end;
$$;

create or replace function build_admin_security_trust_timeline_merkle_batch(
  p_chain_id uuid,
  p_from_sequence_number bigint,
  p_to_sequence_number bigint,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_chain admin_security_trust_timeline_chains%rowtype;
  v_batch_id uuid;
  v_batch_key text;
  v_leaf_count integer;
  v_root text;
  v_payload jsonb;
  v_batch_hash text;
begin
  if p_to_sequence_number < p_from_sequence_number then
    raise exception 'merkle batch invalid sequence range';
  end if;

  if (p_to_sequence_number - p_from_sequence_number) > 5000 then
    raise exception 'merkle batch range too large';
  end if;

  select *
  into v_chain
  from admin_security_trust_timeline_chains
  where id = p_chain_id;

  if v_chain.id is null then
    raise exception 'timeline chain not found: %', p_chain_id;
  end if;

  v_batch_key := 'trust_timeline_merkle_batch:' || v_chain.chain_key || ':' || p_from_sequence_number::text || '-' || p_to_sequence_number::text;

  insert into admin_security_trust_timeline_merkle_batches (
    merkle_batch_key,
    status,
    chain_id,
    batch_scope,
    from_sequence_number,
    to_sequence_number,
    request_id,
    metadata
  )
  values (
    v_batch_key,
    'building',
    v_chain.id,
    v_chain.chain_scope,
    p_from_sequence_number,
    p_to_sequence_number,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (merkle_batch_key)
  do update set
    status = 'building',
    metadata = admin_security_trust_timeline_merkle_batches.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_batch_id;

  delete from admin_security_trust_timeline_merkle_leaves
  where merkle_batch_id = v_batch_id;

  insert into admin_security_trust_timeline_merkle_leaves (
    merkle_batch_id,
    chain_entry_id,
    timeline_event_id,
    leaf_index,
    sequence_number,
    event_hash_sha256,
    chain_hash_sha256,
    leaf_hash_sha256,
    proof_path,
    metadata
  )
  select
    v_batch_id,
    ce.id,
    ce.timeline_event_id,
    row_number() over (order by ce.sequence_number asc)::integer - 1,
    ce.sequence_number,
    ce.event_hash_sha256,
    ce.chain_hash_sha256,
    encode(digest(ce.sequence_number::text || ':' || ce.chain_hash_sha256 || ':' || ce.event_hash_sha256, 'sha256'), 'hex'),
    '[]'::jsonb,
    '{}'::jsonb
  from admin_security_trust_timeline_chain_entries ce
  where ce.chain_id = v_chain.id
    and ce.sequence_number between p_from_sequence_number and p_to_sequence_number
    and ce.status = 'active'
  order by ce.sequence_number asc;

  get diagnostics v_leaf_count = row_count;

  if v_leaf_count = 0 then
    raise exception 'merkle batch has no leaves';
  end if;

  select encode(digest(string_agg(leaf_hash_sha256, '' order by leaf_index asc), 'sha256'), 'hex')
  into v_root
  from admin_security_trust_timeline_merkle_leaves
  where merkle_batch_id = v_batch_id;

  select jsonb_build_object(
    'schemaVersion', 'trust-timeline-merkle-batch-v1',
    'merkleBatchKey', v_batch_key,
    'chainKey', v_chain.chain_key,
    'batchScope', v_chain.chain_scope,
    'fromSequenceNumber', p_from_sequence_number,
    'toSequenceNumber', p_to_sequence_number,
    'leafCount', v_leaf_count,
    'merkleAlgorithm', 'SHA256_ORDERED_LEAF_HASH_V1',
    'merkleRootSha256', v_root,
    'builtAt', now()
  )
  into v_payload;

  v_batch_hash := encode(digest(v_payload::text, 'sha256'), 'hex');

  update admin_security_trust_timeline_merkle_batches
  set
    status = 'ready',
    leaf_count = v_leaf_count,
    merkle_root_sha256 = v_root,
    merkle_algorithm = 'SHA256_ORDERED_LEAF_HASH_V1',
    batch_payload = v_payload,
    batch_hash_sha256 = v_batch_hash,
    signature_algorithm = 'HMAC-SHA256',
    signing_key_version = 'timeline-merkle-signing-v1',
    signature = encode(digest(v_batch_hash || ':' || v_batch_key, 'sha256'), 'hex'),
    signed_at = now(),
    storage_uri = 'trust-timeline-merkle://' || v_batch_key || '.json',
    completed_at = now(),
    last_error = null,
    updated_at = now()
  where id = v_batch_id;

  return v_batch_id;
exception
  when others then
    update admin_security_trust_timeline_merkle_batches
    set
      status = 'failed',
      failed_at = now(),
      last_error = sqlerrm,
      metadata = metadata || jsonb_build_object('failed_at', now()),
      updated_at = now()
    where id = v_batch_id;

    raise;
end;
$$;

create or replace function create_admin_security_trust_timeline_anchor(
  p_chain_id uuid default null,
  p_checkpoint_id uuid default null,
  p_merkle_batch_id uuid default null,
  p_anchor_type text default 'internal',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_checkpoint admin_security_trust_timeline_chain_checkpoints%rowtype;
  v_batch admin_security_trust_timeline_merkle_batches%rowtype;
  v_hash text;
  v_payload jsonb;
  v_anchor_id uuid;
  v_anchor_key text;
begin
  if p_checkpoint_id is null and p_merkle_batch_id is null then
    raise exception 'anchor requires checkpoint or merkle batch';
  end if;

  if p_checkpoint_id is not null then
    select *
    into v_checkpoint
    from admin_security_trust_timeline_chain_checkpoints
    where id = p_checkpoint_id;

    if v_checkpoint.id is null then
      raise exception 'timeline checkpoint not found: %', p_checkpoint_id;
    end if;

    v_hash := v_checkpoint.checkpoint_hash_sha256;
    v_payload := v_checkpoint.checkpoint_payload;
  end if;

  if p_merkle_batch_id is not null then
    select *
    into v_batch
    from admin_security_trust_timeline_merkle_batches
    where id = p_merkle_batch_id;

    if v_batch.id is null then
      raise exception 'timeline merkle batch not found: %', p_merkle_batch_id;
    end if;

    if v_batch.status <> 'ready' then
      raise exception 'timeline merkle batch is not ready: %', v_batch.status;
    end if;

    v_hash := v_batch.batch_hash_sha256;
    v_payload := v_batch.batch_payload;
  end if;

  v_anchor_key :=
    'trust_timeline_anchor:' ||
    coalesce(p_anchor_type, 'internal') || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  insert into admin_security_trust_timeline_anchors (
    anchor_key,
    status,
    anchor_type,
    chain_id,
    checkpoint_id,
    merkle_batch_id,
    anchored_hash_sha256,
    anchored_payload,
    external_system,
    external_reference,
    external_url,
    anchored_at,
    signature_algorithm,
    signing_key_version,
    signature,
    request_id,
    metadata
  )
  values (
    v_anchor_key,
    'active',
    coalesce(p_anchor_type, 'internal'),
    coalesce(p_chain_id, v_checkpoint.chain_id, v_batch.chain_id),
    p_checkpoint_id,
    p_merkle_batch_id,
    v_hash,
    v_payload,
    null,
    null,
    null,
    now(),
    'HMAC-SHA256',
    'timeline-anchor-signing-v1',
    encode(digest(v_hash || ':' || v_anchor_key, 'sha256'), 'hex'),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_anchor_id;

  return v_anchor_id;
end;
$$;

create or replace function verify_admin_security_trust_timeline_chain(
  p_chain_id uuid
)
returns jsonb
language plpgsql
as $$
declare
  v_chain admin_security_trust_timeline_chains%rowtype;
  v_bad_count integer := 0;
  v_gap_count integer := 0;
  v_first_bad_sequence bigint;
begin
  select *
  into v_chain
  from admin_security_trust_timeline_chains
  where id = p_chain_id;

  if v_chain.id is null then
    raise exception 'timeline chain not found: %', p_chain_id;
  end if;

  with ordered as (
    select
      ce.*,
      lag(ce.chain_hash_sha256) over (order by ce.sequence_number asc) as expected_previous_hash,
      lag(ce.sequence_number) over (order by ce.sequence_number asc) as previous_sequence
    from admin_security_trust_timeline_chain_entries ce
    where ce.chain_id = p_chain_id
      and ce.status = 'active'
  ),
  checks as (
    select
      sequence_number,
      case
        when sequence_number = 1 then previous_chain_hash_sha256 is null
        else previous_chain_hash_sha256 = expected_previous_hash
      end as previous_hash_ok,
      case
        when previous_sequence is null then sequence_number = 1
        else sequence_number = previous_sequence + 1
      end as sequence_ok
    from ordered
  )
  select
    count(*) filter (where previous_hash_ok is not true),
    count(*) filter (where sequence_ok is not true),
    min(sequence_number) filter (where previous_hash_ok is not true or sequence_ok is not true)
  into v_bad_count, v_gap_count, v_first_bad_sequence
  from checks;

  return jsonb_build_object(
    'chainId', v_chain.id,
    'chainKey', v_chain.chain_key,
    'verified', coalesce(v_bad_count, 0) = 0 and coalesce(v_gap_count, 0) = 0,
    'eventCount', v_chain.event_count,
    'lastSequenceNumber', v_chain.last_sequence_number,
    'lastChainHashSha256', v_chain.last_chain_hash_sha256,
    'badPreviousHashCount', coalesce(v_bad_count, 0),
    'sequenceGapCount', coalesce(v_gap_count, 0),
    'firstBadSequence', v_first_bad_sequence
  );
end;
$$;

create or replace function verify_admin_security_trust_timeline_merkle_batch(
  p_merkle_batch_id uuid
)
returns jsonb
language plpgsql
as $$
declare
  v_batch admin_security_trust_timeline_merkle_batches%rowtype;
  v_recomputed_root text;
  v_leaf_count integer;
begin
  select *
  into v_batch
  from admin_security_trust_timeline_merkle_batches
  where id = p_merkle_batch_id;

  if v_batch.id is null then
    raise exception 'timeline merkle batch not found: %', p_merkle_batch_id;
  end if;

  select
    encode(digest(string_agg(leaf_hash_sha256, '' order by leaf_index asc), 'sha256'), 'hex'),
    count(*)
  into v_recomputed_root, v_leaf_count
  from admin_security_trust_timeline_merkle_leaves
  where merkle_batch_id = v_batch.id;

  return jsonb_build_object(
    'merkleBatchId', v_batch.id,
    'merkleBatchKey', v_batch.merkle_batch_key,
    'verified', v_batch.merkle_root_sha256 = v_recomputed_root and v_batch.leaf_count = v_leaf_count,
    'storedRootSha256', v_batch.merkle_root_sha256,
    'recomputedRootSha256', v_recomputed_root,
    'storedLeafCount', v_batch.leaf_count,
    'recomputedLeafCount', v_leaf_count,
    'algorithm', v_batch.merkle_algorithm
  );
end;
$$;

insert into scheduled_jobs (
  job_key,
  job_name,
  job_group,
  enabled,
  schedule_cron,
  function_name,
  function_args,
  max_runtime_seconds,
  lock_ttl_seconds,
  metadata
)
values (
  'admin_security_trust_timeline_chain_events_every_5m',
  'Chain trust timeline events',
  'admin',
  true,
  '*/5 * * * *',
  'chain_admin_security_trust_timeline_events',
  '{"batch_size": 1000}'::jsonb,
  300,
  600,
  '{"priority":"high"}'::jsonb
)
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_name = excluded.function_name,
  function_args = excluded.function_args,
  max_runtime_seconds = excluded.max_runtime_seconds,
  lock_ttl_seconds = excluded.lock_ttl_seconds,
  metadata = scheduled_jobs.metadata || excluded.metadata,
  updated_at = now();

create or replace function run_scheduled_job(
  p_job_key text,
  p_locked_by text default 'scheduler',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_job scheduled_jobs%rowtype;
  v_run_id uuid;
  v_lock_acquired boolean;
  v_started_at timestamptz;
  v_uuid_result uuid;
  v_result jsonb := '{}'::jsonb;
begin
  if p_job_key is null or length(trim(p_job_key)) = 0 then
    raise exception 'job key is required';
  end if;

  select *
  into v_job
  from scheduled_jobs
  where job_key = p_job_key;

  if v_job.id is null then
    raise exception 'scheduled job not found: %', p_job_key;
  end if;

  if v_job.enabled is false then
    insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, metadata)
    values (v_job.id, v_job.job_key, v_job.job_group, 'disabled', p_metadata)
    returning id into v_run_id;

    update scheduled_jobs
    set last_status = 'disabled', last_run_id = v_run_id, updated_at = now()
    where id = v_job.id;

    return v_run_id;
  end if;

  v_lock_acquired := acquire_scheduled_job_lock(v_job.job_key, p_locked_by, v_job.lock_ttl_seconds, p_metadata);

  if v_lock_acquired is false then
    insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, metadata)
    values (v_job.id, v_job.job_key, v_job.job_group, 'skipped_locked', p_metadata)
    returning id into v_run_id;

    update scheduled_jobs
    set last_status = 'skipped_locked', last_run_id = v_run_id, updated_at = now()
    where id = v_job.id;

    return v_run_id;
  end if;

  v_started_at := now();

  insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, started_at, metadata)
  values (v_job.id, v_job.job_key, v_job.job_group, 'started', v_started_at, p_metadata)
  returning id into v_run_id;

  update scheduled_jobs
  set last_started_at = v_started_at, last_status = 'started', last_run_id = v_run_id, updated_at = now()
  where id = v_job.id;

  if v_job.function_name = 'run_reward_issuance_job' then
    v_uuid_result := run_reward_issuance_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'release_mature_reward_lots' then
    v_uuid_result := release_mature_reward_lots(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_accounting_mirror_job' then
    v_uuid_result := run_accounting_mirror_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_withdrawal_reserve_job' then
    v_uuid_result := run_withdrawal_reserve_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_audit_hash_backfill_job' then
    v_uuid_result := run_audit_hash_backfill_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'verify_audit_hash_chain' then
    v_uuid_result := verify_audit_hash_chain(
      coalesce(v_job.function_args->>'chain_key', 'global_audit_chain'),
      coalesce((v_job.function_args->>'batch_size')::integer, 100000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_observability_snapshot_job' then
    v_uuid_result := run_observability_snapshot_job(
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_payout_provider_event_processing_job' then
    v_uuid_result := run_payout_provider_event_processing_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_security_evidence_answer_sessions' then
    v_uuid_result := expire_admin_security_evidence_answer_sessions(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_security_answer_receipt_export_bundles' then
    v_uuid_result := expire_admin_security_answer_receipt_export_bundles(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'chain_admin_security_trust_timeline_events' then
    v_uuid_result := chain_admin_security_trust_timeline_events(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  else
    raise exception 'scheduled function not allowlisted: %', v_job.function_name;
  end if;

  update scheduled_job_runs
  set status = 'completed',
      completed_at = now(),
      runtime_ms = (extract(epoch from (now() - v_started_at)) * 1000)::integer,
      result = v_result
  where id = v_run_id;

  update scheduled_jobs
  set last_completed_at = now(), last_status = 'completed', last_run_id = v_run_id, updated_at = now()
  where id = v_job.id;

  perform release_scheduled_job_lock(v_job.job_key);
  return v_run_id;
exception
  when others then
    if v_run_id is not null then
      update scheduled_job_runs
      set status = 'failed',
          failed_at = now(),
          runtime_ms = case when v_started_at is not null then (extract(epoch from (now() - v_started_at)) * 1000)::integer else null end,
          error_message = sqlerrm
      where id = v_run_id;
    end if;

    update scheduled_jobs
    set last_failed_at = now(), last_status = 'failed', last_run_id = v_run_id, updated_at = now()
    where job_key = p_job_key;

    perform release_scheduled_job_lock(p_job_key);
    raise;
end;
$$;

create or replace view admin_security_trust_timeline_chain_dashboard as
select
  c.id as admin_security_trust_timeline_chain_id,
  c.chain_key,
  c.status,
  c.chain_scope,
  c.customer_name,
  c.customer_domain,
  c.private_room_id,
  r.private_room_key,
  c.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  c.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  c.title,
  c.summary,
  c.last_sequence_number,
  c.last_event_id,
  e.timeline_event_key as last_timeline_event_key,
  c.last_event_time,
  c.last_event_hash_sha256,
  c.last_chain_hash_sha256,
  c.event_count,
  c.first_event_at,
  c.last_checkpoint_at,
  (
    select count(*)
    from admin_security_trust_timeline_chain_checkpoints cp
    where cp.chain_id = c.id
      and cp.status = 'active'
  ) as checkpoint_count,
  (
    select count(*)
    from admin_security_trust_timeline_merkle_batches mb
    where mb.chain_id = c.id
      and mb.status = 'ready'
  ) as merkle_batch_count,
  c.created_at,
  c.updated_at,
  c.metadata
from admin_security_trust_timeline_chains c
left join admin_security_trust_timeline_events e on e.id = c.last_event_id
left join admin_security_private_trust_rooms r on r.id = c.private_room_id
left join admin_security_auditor_portals ap on ap.id = c.auditor_portal_id
left join admin_security_enterprise_review_rooms er on er.id = c.enterprise_review_room_id
order by c.updated_at desc;

create or replace view admin_security_trust_timeline_chain_entry_dashboard as
select
  ce.id as admin_security_trust_timeline_chain_entry_id,
  ce.chain_id,
  c.chain_key,
  c.chain_scope,
  ce.timeline_event_id,
  e.timeline_event_key,
  e.event_family,
  e.event_type,
  e.event_action,
  e.title,
  ce.sequence_number,
  ce.event_time,
  ce.event_hash_sha256,
  ce.previous_chain_hash_sha256,
  ce.chain_hash_sha256,
  ce.status,
  ce.created_at,
  ce.metadata
from admin_security_trust_timeline_chain_entries ce
join admin_security_trust_timeline_chains c on c.id = ce.chain_id
join admin_security_trust_timeline_events e on e.id = ce.timeline_event_id
order by ce.created_at desc;

create or replace view admin_security_trust_timeline_chain_checkpoint_dashboard as
select
  cp.id as admin_security_trust_timeline_chain_checkpoint_id,
  cp.checkpoint_key,
  cp.status,
  cp.chain_id,
  c.chain_key,
  c.chain_scope,
  cp.checkpoint_type,
  cp.sequence_number,
  cp.event_count,
  cp.from_event_time,
  cp.to_event_time,
  cp.chain_head_hash_sha256,
  cp.previous_checkpoint_hash_sha256,
  cp.checkpoint_hash_sha256,
  cp.signature_algorithm,
  cp.signing_key_version,
  cp.signature,
  cp.signed_at,
  cp.storage_uri,
  cp.created_at,
  cp.metadata
from admin_security_trust_timeline_chain_checkpoints cp
join admin_security_trust_timeline_chains c on c.id = cp.chain_id
order by cp.created_at desc;

create or replace view admin_security_trust_timeline_merkle_batch_dashboard as
select
  mb.id as admin_security_trust_timeline_merkle_batch_id,
  mb.merkle_batch_key,
  mb.status,
  mb.chain_id,
  c.chain_key,
  c.chain_scope,
  mb.batch_scope,
  mb.from_sequence_number,
  mb.to_sequence_number,
  mb.from_event_time,
  mb.to_event_time,
  mb.leaf_count,
  mb.merkle_root_sha256,
  mb.merkle_algorithm,
  mb.batch_hash_sha256,
  mb.signature_algorithm,
  mb.signing_key_version,
  mb.signature,
  mb.signed_at,
  mb.storage_uri,
  mb.completed_at,
  mb.failed_at,
  mb.last_error,
  mb.created_at,
  mb.updated_at,
  mb.metadata
from admin_security_trust_timeline_merkle_batches mb
join admin_security_trust_timeline_chains c on c.id = mb.chain_id
order by mb.created_at desc;

create or replace view admin_security_trust_timeline_anchor_dashboard as
select
  a.id as admin_security_trust_timeline_anchor_id,
  a.anchor_key,
  a.status,
  a.anchor_type,
  a.chain_id,
  c.chain_key,
  c.chain_scope,
  a.checkpoint_id,
  cp.checkpoint_key,
  a.merkle_batch_id,
  mb.merkle_batch_key,
  a.anchored_hash_sha256,
  a.external_system,
  a.external_reference,
  a.external_url,
  a.anchored_at,
  a.signature_algorithm,
  a.signing_key_version,
  a.signature,
  a.created_at,
  a.metadata
from admin_security_trust_timeline_anchors a
left join admin_security_trust_timeline_chains c on c.id = a.chain_id
left join admin_security_trust_timeline_chain_checkpoints cp on cp.id = a.checkpoint_id
left join admin_security_trust_timeline_merkle_batches mb on mb.id = a.merkle_batch_id
order by a.created_at desc;

create or replace view admin_security_trust_timeline_crypto_integrity as
select
  (
    select count(*)
    from admin_security_trust_timeline_events e
    where e.status = 'active'
      and not exists (
        select 1
        from admin_security_trust_timeline_chain_entries ce
        where ce.timeline_event_id = e.id
      )
  ) as unchained_event_count,
  (
    select count(*)
    from admin_security_trust_timeline_chains
    where status = 'active'
  ) as active_chain_count,
  (
    select count(*)
    from admin_security_trust_timeline_chain_entries
    where status = 'active'
  ) as active_chain_entry_count,
  (
    select count(*)
    from admin_security_trust_timeline_chains
    where event_count > 0
      and last_chain_hash_sha256 is null
  ) as broken_chain_head_count,
  (
    select count(*)
    from admin_security_trust_timeline_chain_checkpoints
    where status = 'active'
  ) as active_checkpoint_count,
  (
    select count(*)
    from admin_security_trust_timeline_merkle_batches
    where status = 'ready'
  ) as ready_merkle_batch_count,
  (
    select count(*)
    from admin_security_trust_timeline_merkle_batches
    where status = 'failed'
      and created_at >= now() - interval '1 hour'
  ) as failed_merkle_batch_count_1h,
  (
    select count(*)
    from admin_security_trust_timeline_anchors
    where status = 'active'
  ) as active_anchor_count,
  now() as checked_at;

grant select on admin_security_trust_timeline_chain_dashboard to admin_api_role;
grant select on admin_security_trust_timeline_chain_entry_dashboard to admin_api_role;
grant select on admin_security_trust_timeline_chain_checkpoint_dashboard to admin_api_role;
grant select on admin_security_trust_timeline_merkle_batch_dashboard to admin_api_role;
grant select on admin_security_trust_timeline_anchor_dashboard to admin_api_role;
grant select on admin_security_trust_timeline_crypto_integrity to admin_api_role;

alter table admin_security_trust_timeline_chains enable row level security;
alter table admin_security_trust_timeline_chain_entries enable row level security;
alter table admin_security_trust_timeline_chain_checkpoints enable row level security;
alter table admin_security_trust_timeline_merkle_batches enable row level security;
alter table admin_security_trust_timeline_merkle_leaves enable row level security;
alter table admin_security_trust_timeline_anchors enable row level security;

create policy admin_security_trust_timeline_chains_no_user_direct_access
on admin_security_trust_timeline_chains
for all
to authenticated
using (false)
with check (false);

create policy admin_security_trust_timeline_chain_entries_no_user_direct_access
on admin_security_trust_timeline_chain_entries
for all
to authenticated
using (false)
with check (false);

create policy admin_security_trust_timeline_chain_checkpoints_no_user_direct_access
on admin_security_trust_timeline_chain_checkpoints
for all
to authenticated
using (false)
with check (false);

create policy admin_security_trust_timeline_merkle_batches_no_user_direct_access
on admin_security_trust_timeline_merkle_batches
for all
to authenticated
using (false)
with check (false);

create policy admin_security_trust_timeline_merkle_leaves_no_user_direct_access
on admin_security_trust_timeline_merkle_leaves
for all
to authenticated
using (false)
with check (false);

create policy admin_security_trust_timeline_anchors_no_user_direct_access
on admin_security_trust_timeline_anchors
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_trust_timeline_chains
on admin_security_trust_timeline_chains
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_trust_timeline_chain_entries
on admin_security_trust_timeline_chain_entries
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_trust_timeline_chain_checkpoints
on admin_security_trust_timeline_chain_checkpoints
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_trust_timeline_merkle_batches
on admin_security_trust_timeline_merkle_batches
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_trust_timeline_merkle_leaves
on admin_security_trust_timeline_merkle_leaves
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_trust_timeline_anchors
on admin_security_trust_timeline_anchors
for all
to admin_api_role
using (true)
with check (true);

create policy worker_all_trust_timeline_crypto_tables
on admin_security_trust_timeline_chains
for all
to worker_role
using (true)
with check (true);

create policy worker_all_trust_timeline_chain_entries
on admin_security_trust_timeline_chain_entries
for all
to worker_role
using (true)
with check (true);

create policy worker_all_trust_timeline_checkpoints
on admin_security_trust_timeline_chain_checkpoints
for all
to worker_role
using (true)
with check (true);

create policy worker_all_trust_timeline_merkle_batches
on admin_security_trust_timeline_merkle_batches
for all
to worker_role
using (true)
with check (true);

create policy worker_all_trust_timeline_merkle_leaves
on admin_security_trust_timeline_merkle_leaves
for all
to worker_role
using (true)
with check (true);

create policy worker_all_trust_timeline_anchors
on admin_security_trust_timeline_anchors
for all
to worker_role
using (true)
with check (true);

grant execute on function get_or_create_admin_security_trust_timeline_chain(
  text, text, text, uuid, uuid, uuid, text, text, jsonb
) to admin_api_role, worker_role;

grant execute on function determine_admin_security_trust_timeline_event_chain_scope(
  uuid, uuid, uuid, text, text
) to admin_api_role, worker_role;

grant execute on function chain_admin_security_trust_timeline_event(uuid, text, jsonb)
to admin_api_role, worker_role;

grant execute on function chain_admin_security_trust_timeline_events(integer, text, jsonb)
to admin_api_role, worker_role;

grant execute on function create_admin_security_trust_timeline_chain_checkpoint(
  uuid, text, text, jsonb
) to admin_api_role, worker_role;

grant execute on function build_admin_security_trust_timeline_merkle_batch(
  uuid, bigint, bigint, text, jsonb
) to admin_api_role, worker_role;

grant execute on function create_admin_security_trust_timeline_anchor(
  uuid, uuid, uuid, text, text, jsonb
) to admin_api_role, worker_role;

grant execute on function verify_admin_security_trust_timeline_chain(uuid) to admin_api_role;
grant execute on function verify_admin_security_trust_timeline_merkle_batch(uuid) to admin_api_role;

alter function get_or_create_admin_security_trust_timeline_chain(
  text, text, text, uuid, uuid, uuid, text, text, jsonb
) security definer;
alter function get_or_create_admin_security_trust_timeline_chain(
  text, text, text, uuid, uuid, uuid, text, text, jsonb
) set search_path = public;

alter function chain_admin_security_trust_timeline_event(uuid, text, jsonb) security definer;
alter function chain_admin_security_trust_timeline_event(uuid, text, jsonb) set search_path = public;
alter function chain_admin_security_trust_timeline_events(integer, text, jsonb) security definer;
alter function chain_admin_security_trust_timeline_events(integer, text, jsonb) set search_path = public;
alter function create_admin_security_trust_timeline_chain_checkpoint(uuid, text, text, jsonb) security definer;
alter function create_admin_security_trust_timeline_chain_checkpoint(uuid, text, text, jsonb) set search_path = public;
alter function build_admin_security_trust_timeline_merkle_batch(uuid, bigint, bigint, text, jsonb) security definer;
alter function build_admin_security_trust_timeline_merkle_batch(uuid, bigint, bigint, text, jsonb) set search_path = public;
alter function create_admin_security_trust_timeline_anchor(uuid, uuid, uuid, text, text, jsonb) security definer;
alter function create_admin_security_trust_timeline_anchor(uuid, uuid, uuid, text, text, jsonb) set search_path = public;
alter function verify_admin_security_trust_timeline_chain(uuid) security definer;
alter function verify_admin_security_trust_timeline_chain(uuid) set search_path = public;
alter function verify_admin_security_trust_timeline_merkle_batch(uuid) security definer;
alter function verify_admin_security_trust_timeline_merkle_batch(uuid) set search_path = public;

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
  ('TIMELINE_CRYPTO_NOT_FOUND', 'validation', 'medium', 404, false, true, 'Timeline cryptographic record not found.', 'Timeline crypto record not found.', 'platform'),
  ('TIMELINE_CRYPTO_INVALID_STATE', 'validation', 'medium', 409, true, true, 'Timeline cryptographic record is not in a valid state.', 'Timeline crypto invalid state.', 'platform'),
  ('TIMELINE_CRYPTO_REQUIRED_FIELDS', 'validation', 'medium', 400, false, true, 'Timeline cryptographic request requires complete fields.', 'Timeline crypto required fields missing.', 'platform')
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_mapping_rules (match_pattern, error_code, priority, metadata)
values
  ('timeline event not found', 'TIMELINE_CRYPTO_NOT_FOUND', 5, '{}'::jsonb),
  ('timeline chain not found', 'TIMELINE_CRYPTO_NOT_FOUND', 5, '{}'::jsonb),
  ('timeline checkpoint not found', 'TIMELINE_CRYPTO_NOT_FOUND', 5, '{}'::jsonb),
  ('timeline merkle batch not found', 'TIMELINE_CRYPTO_NOT_FOUND', 5, '{}'::jsonb),
  ('timeline event missing immutable hash', 'TIMELINE_CRYPTO_INVALID_STATE', 5, '{}'::jsonb),
  ('timeline chain has no events to checkpoint', 'TIMELINE_CRYPTO_INVALID_STATE', 5, '{}'::jsonb),
  ('timeline merkle batch is not ready', 'TIMELINE_CRYPTO_INVALID_STATE', 5, '{}'::jsonb),
  ('merkle batch invalid sequence range', 'TIMELINE_CRYPTO_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('merkle batch range too large', 'TIMELINE_CRYPTO_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('merkle batch has no leaves', 'TIMELINE_CRYPTO_INVALID_STATE', 5, '{}'::jsonb),
  ('anchor requires checkpoint or merkle batch', 'TIMELINE_CRYPTO_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust timeline chain entries are immutable', 'TIMELINE_CRYPTO_INVALID_STATE', 5, '{}'::jsonb)
on conflict do nothing;
