drop trigger if exists trg_audit_pops_admin_overrides on pops_admin_overrides;
drop trigger if exists trg_audit_pops_admin_actions on pops_admin_actions;
drop trigger if exists trg_audit_pops_wallet_reward_intents on pops_wallet_reward_intents;
drop trigger if exists trg_audit_pops_reward_decisions on pops_reward_decisions;

drop function if exists pops_write_audit_log();
drop table if exists pops_audit_log;
