-- Draft RLS: refine per product before production. Service-role backend required for ledger/fraud/settlement.

-- Helper: authenticated only (replace with finer checks in production)
-- alter table ... enable row level security; policies below.

-- --- Core studio (owner-scoped) ---
alter table public.studio_projects enable row level security;
create policy studio_projects_select_own on public.studio_projects
  for select using (auth.uid() = owner_user_id and deleted_at is null);
create policy studio_projects_insert_own on public.studio_projects
  for insert with check (auth.uid() = owner_user_id);
create policy studio_projects_update_own on public.studio_projects
  for update using (auth.uid() = owner_user_id);

alter table public.studio_project_snapshots enable row level security;
create policy studio_project_snapshots_rw_own on public.studio_project_snapshots
  for all using (
    exists (select 1 from public.studio_projects p where p.id = project_id and p.owner_user_id = auth.uid())
  );

alter table public.studio_assets enable row level security;
create policy studio_assets_rw_own on public.studio_assets
  for all using (auth.uid() = owner_user_id);

alter table public.studio_tracks enable row level security;
create policy studio_tracks_rw_own on public.studio_tracks
  for all using (
    exists (select 1 from public.studio_projects p where p.id = project_id and p.owner_user_id = auth.uid())
  );

alter table public.studio_clips enable row level security;
create policy studio_clips_rw_own on public.studio_clips
  for all using (
    exists (select 1 from public.studio_projects p where p.id = project_id and p.owner_user_id = auth.uid())
  );

-- --- Magic reveals ---
alter table public.studio_magic_reveals enable row level security;
create policy studio_magic_reveals_rw_own on public.studio_magic_reveals
  for all using (auth.uid() = owner_user_id);

alter table public.studio_magic_reveal_versions enable row level security;
-- Prefer INSERT from server only; read for owner
create policy studio_magic_reveal_versions_select_own on public.studio_magic_reveal_versions
  for select using (
    exists (select 1 from public.studio_magic_reveals r where r.id = reveal_id and r.owner_user_id = auth.uid())
  );

-- --- Publish ---
alter table public.studio_export_jobs enable row level security;
create policy studio_export_jobs_rw_own on public.studio_export_jobs
  for all using (auth.uid() = owner_user_id);

alter table public.post_packages enable row level security;
create policy post_packages_select_own on public.post_packages
  for select using (auth.uid() = owner_user_id);
create policy post_packages_insert_own on public.post_packages
  for insert with check (auth.uid() = owner_user_id);
-- No client UPDATE after seal — omit update policy; use Edge publish-post with service role

alter table public.published_posts enable row level security;
create policy published_posts_select_visibility on public.published_posts
  for select using (auth.uid() = owner_user_id or visibility = 'public');
create policy published_posts_insert_service on public.published_posts
  for insert with check (false); -- placeholder: real insert via service role / Edge only

alter table public.post_disclosures enable row level security;
create policy post_disclosures_select on public.post_disclosures
  for select using (
    exists (select 1 from public.published_posts pp where pp.id = post_id and (pp.owner_user_id = auth.uid() or pp.visibility = 'public'))
  );

-- --- Wallet / ledger: NO client writes ---
alter table public.wallet_accounts enable row level security;
create policy wallet_accounts_select_own on public.wallet_accounts
  for select using (auth.uid() = owner_user_id);

alter table public.wallet_balances enable row level security;
create policy wallet_balances_select_own on public.wallet_balances
  for select using (
    exists (select 1 from public.wallet_accounts a where a.id = account_id and a.owner_user_id = auth.uid())
  );

alter table public.wallet_ledger_entries enable row level security;
create policy wallet_ledger_no_client on public.wallet_ledger_entries
  for all using (false);

alter table public.magic_reveal_unlocks enable row level security;
create policy magic_reveal_unlocks_select_own on public.magic_reveal_unlocks
  for select using (auth.uid() = viewer_user_id);
create policy magic_reveal_unlocks_insert_denied on public.magic_reveal_unlocks
  for insert with check (false); -- Edge confirm-magic-unlock

-- --- Campaigns ---
alter table public.campaigns enable row level security;
create policy campaigns_rw_draft_own on public.campaigns
  for all using (auth.uid() = owner_user_id and status = 'draft');

alter table public.campaign_action_attempts enable row level security;
create policy campaign_action_attempts_select_own on public.campaign_action_attempts
  for select using (
    exists (select 1 from public.campaigns c where c.id = campaign_id and c.owner_user_id = auth.uid())
  );

alter table public.campaign_budget_events enable row level security;
create policy campaign_budget_events_no_client on public.campaign_budget_events
  for all using (false);

-- --- Verification / fraud / POPS / disputes ---
alter table public.verification_records enable row level security;
create policy verification_records_select_related on public.verification_records
  for select using (true); -- tighten: subject ownership join in production

alter table public.verification_gate_results enable row level security;
create policy verification_gate_results_no_client_write on public.verification_gate_results
  for all using (false);

alter table public.fraud_assessments enable row level security;
create policy fraud_assessments_no_client_write on public.fraud_assessments
  for all using (false);

alter table public.fraud_signals enable row level security;
create policy fraud_signals_no_client on public.fraud_signals
  for all using (false);

alter table public.pops_challenges enable row level security;
create policy pops_challenges_select_own on public.pops_challenges
  for select using (auth.uid() = subject_user_id);

alter table public.disputes enable row level security;
create policy disputes_select_own on public.disputes
  for select using (auth.uid() = opener_user_id);
create policy disputes_insert_own on public.disputes
  for insert with check (auth.uid() = opener_user_id);
-- No self-resolve with financial effect — omit update or restrict to moderator role

alter table public.dispute_evidence enable row level security;
create policy dispute_evidence_append_own on public.dispute_evidence
  for insert with check (
    exists (select 1 from public.disputes d where d.id = dispute_id and d.opener_user_id = auth.uid())
    and submitted_by = auth.uid()
  );
create policy dispute_evidence_select on public.dispute_evidence
  for select using (
    exists (select 1 from public.disputes d where d.id = dispute_id and d.opener_user_id = auth.uid())
  );

alter table public.trust_impacts enable row level security;
create policy trust_impacts_no_client_write on public.trust_impacts
  for all using (false);

-- --- Runtime / analytics ---
alter table public.runtime_events enable row level security;
create policy runtime_events_insert_authenticated on public.runtime_events
  for insert with check (auth.role() = 'authenticated');
create policy runtime_events_select_own on public.runtime_events
  for select using (actor_user_id = auth.uid());

alter table public.viewer_sessions enable row level security;
create policy viewer_sessions_own on public.viewer_sessions
  for all using (viewer_user_id = auth.uid());

alter table public.post_metric_snapshots enable row level security;
create policy post_metric_snapshots_read_public on public.post_metric_snapshots
  for select using (true); -- tighten with post visibility join

alter table public.campaign_metric_snapshots enable row level security;
create policy campaign_metric_snapshots_owner on public.campaign_metric_snapshots
  for select using (
    exists (select 1 from public.campaigns c where c.id = campaign_id and c.owner_user_id = auth.uid())
  );

alter table public.creator_metric_snapshots enable row level security;
create policy creator_metric_snapshots_own on public.creator_metric_snapshots
  for select using (creator_user_id = auth.uid());

comment on policy wallet_ledger_no_client on public.wallet_ledger_entries is 'Service role bypasses RLS for append-only ledger writes from Edge/workers.';
