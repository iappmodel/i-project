drop trigger if exists trg_pops_wallet_reward_intents_set_updated_at on pops_wallet_reward_intents;

alter table if exists pops_reward_decisions
  drop constraint if exists fk_pops_reward_decisions_wallet_intent_id;

drop table if exists pops_wallet_reward_intents;
drop table if exists pops_reward_decisions;
