-- Rollback Stage 31: P.O.P.S rule versioning

alter table pops_privacy_receipts
  drop column if exists consent_policy_version,
  drop column if exists retention_policy_version,
  drop column if exists privacy_policy_version;

alter table pops_reward_decisions
  drop column if exists campaign_requirement_version,
  drop column if exists wallet_rule_version,
  drop column if exists reward_formula_version;

alter table pops_judgments
  drop column if exists campaign_requirement_version,
  drop column if exists privacy_policy_version,
  drop column if exists reward_formula_version,
  drop column if exists fraud_model_version,
  drop column if exists scoring_model_version;

drop table if exists pops_judgment_replays;
drop table if exists pops_rule_versions;
