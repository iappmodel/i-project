do $$
declare
  v_run_id uuid;
begin
  for i in 1..25 loop
    insert into admin_security_public_verification_results (
      result_key,
      verification_status,
      verification_type,
      subject_key,
      verified,
      customer_name,
      customer_domain,
      metadata
    )
    values (
      'ai-analyst-failed-verification-' || i::text,
      case when i <= 10 then 'failed' else 'passed' end,
      'trust_proof_report',
      'ai-analyst-proof-key',
      i > 10,
      'AI Analyst Corp',
      'aianalyst.example.com',
      '{"test": true}'::jsonb
    )
    on conflict (result_key) do nothing;
  end loop;

  v_run_id := run_admin_security_trust_ai_analyst(
    'manual',
    'verification_abuse',
    null,
    null,
    'ai-analyst-worker',
    'ai-analyst-smoke',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_ai_findings
    where analyst_run_id = v_run_id
      and finding_type = 'verification_failure_spike'
  ) then
    raise exception 'expected verification failure spike finding';
  end if;
end $$;
