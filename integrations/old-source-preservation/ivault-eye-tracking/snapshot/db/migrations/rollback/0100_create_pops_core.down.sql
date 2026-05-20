drop trigger if exists trg_pops_sessions_set_updated_at on pops_sessions;

drop table if exists pops_sessions;
drop table if exists pops_proof_presets;
drop table if exists pops_model_rule_versions;
drop table if exists pops_reason_codes;

drop function if exists pops_set_updated_at();
