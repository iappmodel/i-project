do $$
declare
  v_runtime jsonb;
  v_formula text;
begin
  v_runtime := seed_demo_attention_runtime(
    '{"test": true}'::jsonb
  );

  if v_runtime->>'model_version' <> 'vision_model_v1' then
    raise exception 'demo runtime model version mismatch';
  end if;

  v_formula := get_active_attention_scoring_formula_version();

  if v_formula <> 'attention_score_v1' then
    raise exception 'active scoring formula mismatch';
  end if;

  perform assert_attention_runtime_version_allowed(
    'vision_model_v1',
    'runtime_pipeline_v1',
    'runtime_signals_v1'
  );

  if exists (
    select 1
    from attention_runtime_integrity_check
    where has_integrity_issue is true
  ) then
    raise exception 'attention runtime integrity check failed';
  end if;
end $$;
