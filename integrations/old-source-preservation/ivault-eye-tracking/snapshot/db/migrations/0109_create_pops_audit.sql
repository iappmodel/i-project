-- Stage 14: P.O.P.S audit schema and triggers

create extension if not exists pgcrypto;

create table if not exists pops_audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  actor_type text not null,
  actor_id uuid,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_audit_log_entity on pops_audit_log (entity_type, entity_id, created_at);
create index if not exists idx_pops_audit_log_created_at on pops_audit_log (created_at);

create or replace function pops_write_audit_log()
returns trigger
language plpgsql
as $$
declare
  v_actor_id uuid;
  v_reason text;
begin
  v_reason := coalesce(new.hold_reason, new.reason, null);

  if tg_table_name = 'pops_reward_decisions' then
    v_actor_id := null;
  elsif tg_table_name = 'pops_wallet_reward_intents' then
    v_actor_id := null;
  elsif tg_table_name = 'pops_admin_actions' then
    v_actor_id := new.admin_user_id;
  else
    v_actor_id := null;
  end if;

  insert into pops_audit_log (
    entity_type,
    entity_id,
    actor_type,
    actor_id,
    action,
    old_value,
    new_value,
    reason
  )
  values (
    tg_table_name,
    new.id,
    case when tg_table_name = 'pops_admin_actions' then 'ADMIN' else 'SYSTEM' end,
    v_actor_id,
    tg_op,
    to_jsonb(old),
    to_jsonb(new),
    v_reason
  );

  return new;
end
$$;

drop trigger if exists trg_audit_pops_reward_decisions on pops_reward_decisions;
create trigger trg_audit_pops_reward_decisions
after update on pops_reward_decisions
for each row
execute function pops_write_audit_log();

drop trigger if exists trg_audit_pops_wallet_reward_intents on pops_wallet_reward_intents;
create trigger trg_audit_pops_wallet_reward_intents
after update on pops_wallet_reward_intents
for each row
execute function pops_write_audit_log();

drop trigger if exists trg_audit_pops_admin_actions on pops_admin_actions;
create trigger trg_audit_pops_admin_actions
after update on pops_admin_actions
for each row
execute function pops_write_audit_log();

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'pops_admin_overrides'
  ) then
    execute '
      drop trigger if exists trg_audit_pops_admin_overrides on pops_admin_overrides;
      create trigger trg_audit_pops_admin_overrides
      after update on pops_admin_overrides
      for each row
      execute function pops_write_audit_log();
    ';
  end if;
end
$$;
