do $$
begin
  perform 1 from app_wallet_summary limit 1;
  perform 1 from app_wallet_ledger limit 1;
  perform 1 from app_attention_history limit 1;
  perform 1 from app_reward_history limit 1;
  perform 1 from app_user_home_snapshot limit 1;

  perform 1 from admin_wallet_detail limit 1;
  perform 1 from admin_wallet_ledger_detail limit 1;
  perform 1 from admin_attention_detail limit 1;
  perform 1 from admin_reward_detail limit 1;
  perform 1 from admin_campaign_budget_detail limit 1;
  perform 1 from admin_money_integrity limit 1;
  perform 1 from admin_audit_integrity limit 1;
  perform 1 from admin_system_command_center limit 1;
  perform 1 from admin_scheduler_dashboard limit 1;
  perform 1 from admin_error_dashboard limit 1;
  perform 1 from admin_alert_dashboard limit 1;

  raise notice 'view smoke test passed';
end $$;
