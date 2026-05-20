/**
 * Planned Postgres / Supabase schema skeleton (Stage 9). Replace with `supabase gen types` output later.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      studio_projects: { Row: StudioProjectsRow; Insert: StudioProjectsInsert; Update: StudioProjectsUpdate };
      studio_project_snapshots: {
        Row: StudioProjectSnapshotsRow;
        Insert: StudioProjectSnapshotsInsert;
        Update: StudioProjectSnapshotsUpdate;
      };
      studio_assets: { Row: StudioAssetsRow; Insert: StudioAssetsInsert; Update: StudioAssetsUpdate };
      studio_tracks: { Row: StudioTracksRow; Insert: StudioTracksInsert; Update: StudioTracksUpdate };
      studio_clips: { Row: StudioClipsRow; Insert: StudioClipsInsert; Update: StudioClipsUpdate };
      studio_magic_reveals: { Row: StudioMagicRevealsRow; Insert: StudioMagicRevealsInsert; Update: StudioMagicRevealsUpdate };
      post_packages: { Row: PostPackagesRow; Insert: PostPackagesInsert; Update: PostPackagesUpdate };
      published_posts: { Row: PublishedPostsRow; Insert: PublishedPostsInsert; Update: PublishedPostsUpdate };
      wallet_accounts: { Row: WalletAccountsRow; Insert: WalletAccountsInsert; Update: WalletAccountsUpdate };
      wallet_balances: { Row: WalletBalancesRow; Insert: WalletBalancesInsert; Update: WalletBalancesUpdate };
      wallet_ledger_entries: { Row: WalletLedgerEntriesRow; Insert: WalletLedgerEntriesInsert; Update: WalletLedgerEntriesUpdate };
      campaigns: { Row: CampaignsRow; Insert: CampaignsInsert; Update: CampaignsUpdate };
      campaign_action_attempts: {
        Row: CampaignActionAttemptsRow;
        Insert: CampaignActionAttemptsInsert;
        Update: CampaignActionAttemptsUpdate;
      };
      verification_records: { Row: VerificationRecordsRow; Insert: VerificationRecordsInsert; Update: VerificationRecordsUpdate };
      fraud_assessments: { Row: FraudAssessmentsRow; Insert: FraudAssessmentsInsert; Update: FraudAssessmentsUpdate };
      pops_challenges: { Row: PopsChallengesRow; Insert: PopsChallengesInsert; Update: PopsChallengesUpdate };
      disputes: { Row: DisputesRow; Insert: DisputesInsert; Update: DisputesUpdate };
      runtime_events: { Row: RuntimeEventsRow; Insert: RuntimeEventsInsert; Update: RuntimeEventsUpdate };
      viewer_sessions: { Row: ViewerSessionsRow; Insert: ViewerSessionsInsert; Update: ViewerSessionsUpdate };
      trust_impacts: { Row: TrustImpactsRow; Insert: TrustImpactsInsert; Update: TrustImpactsUpdate };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export interface StudioProjectsRow {
  id: string;
  owner_user_id: string;
  title: string;
  draft_payload: Json;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
export type StudioProjectsInsert = Omit<StudioProjectsRow, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};
export type StudioProjectsUpdate = Partial<Omit<StudioProjectsRow, "id">>;

export interface StudioProjectSnapshotsRow {
  id: string;
  project_id: string;
  snapshot: Json;
  meta: Json;
  created_at: string;
}
export type StudioProjectSnapshotsInsert = Omit<StudioProjectSnapshotsRow, "created_at"> & { created_at?: string };
export type StudioProjectSnapshotsUpdate = Partial<Omit<StudioProjectSnapshotsRow, "id">>;

export interface StudioAssetsRow {
  id: string;
  project_id: string;
  payload: Json;
  status: string;
  created_at: string;
  updated_at: string;
}
export type StudioAssetsInsert = Omit<StudioAssetsRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
export type StudioAssetsUpdate = Partial<Omit<StudioAssetsRow, "id">>;

export interface StudioTracksRow {
  id: string;
  project_id: string;
  version: number;
  payload: Json;
  created_at: string;
  updated_at: string;
}
export type StudioTracksInsert = Omit<StudioTracksRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
export type StudioTracksUpdate = Partial<Omit<StudioTracksRow, "id">>;

export interface StudioClipsRow {
  id: string;
  project_id: string;
  track_id: string;
  version: number;
  payload: Json;
  created_at: string;
  updated_at: string;
}
export type StudioClipsInsert = Omit<StudioClipsRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
export type StudioClipsUpdate = Partial<Omit<StudioClipsRow, "id">>;

export interface StudioMagicRevealsRow {
  id: string;
  project_id: string;
  owner_user_id: string;
  target_type: string | null;
  timeline_start_ms: number | null;
  timeline_end_ms: number | null;
  geometry: Json | null;
  tracking: Json | null;
  hidden_render: Json | null;
  reveal_type: string | null;
  pricing: Json | null;
  reward: Json | null;
  eligibility: Json | null;
  unlock_policy: Json | null;
  settlement: Json | null;
  safety: Json | null;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
export type StudioMagicRevealsInsert = Omit<StudioMagicRevealsRow, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};
export type StudioMagicRevealsUpdate = Partial<Omit<StudioMagicRevealsRow, "id">>;

export interface PostPackagesRow {
  id: string;
  project_id: string;
  export_job_id: string;
  package_hash: string;
  payload: Json;
  status: string;
  created_at: string;
}
export type PostPackagesInsert = Omit<PostPackagesRow, "created_at"> & { created_at?: string };
export type PostPackagesUpdate = Partial<Omit<PostPackagesRow, "id">>;

export interface PublishedPostsRow {
  id: string;
  package_id: string;
  owner_user_id: string;
  payload: Json;
  status: string;
  created_at: string;
}
export type PublishedPostsInsert = Omit<PublishedPostsRow, "created_at"> & { created_at?: string };
export type PublishedPostsUpdate = Partial<Omit<PublishedPostsRow, "id">>;

export interface WalletAccountsRow {
  id: string;
  user_id: string;
  payload: Json;
  created_at: string;
}
export type WalletAccountsInsert = Omit<WalletAccountsRow, "created_at"> & { created_at?: string };
export type WalletAccountsUpdate = Partial<Omit<WalletAccountsRow, "id">>;

export interface WalletBalancesRow {
  id: string;
  wallet_account_id: string;
  payload: Json;
  updated_at: string;
}
export type WalletBalancesInsert = Omit<WalletBalancesRow, "updated_at"> & { updated_at?: string };
export type WalletBalancesUpdate = Partial<Omit<WalletBalancesRow, "id">>;

export interface WalletLedgerEntriesRow {
  id: string;
  wallet_account_id: string | null;
  project_id: string | null;
  post_id: string | null;
  status: string;
  payload: Json;
  idempotency_key: string | null;
  created_at: string;
}
export type WalletLedgerEntriesInsert = Omit<WalletLedgerEntriesRow, "created_at"> & { created_at?: string };
export type WalletLedgerEntriesUpdate = never;

export interface CampaignsRow {
  id: string;
  project_id: string;
  owner_user_id: string;
  payload: Json;
  status: string;
  created_at: string;
  updated_at: string;
}
export type CampaignsInsert = Omit<CampaignsRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
export type CampaignsUpdate = Partial<Omit<CampaignsRow, "id">>;

export interface CampaignActionAttemptsRow {
  id: string;
  campaign_id: string;
  payload: Json;
  created_at: string;
  updated_at: string;
}
export type CampaignActionAttemptsInsert = Omit<CampaignActionAttemptsRow, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};
export type CampaignActionAttemptsUpdate = Partial<Omit<CampaignActionAttemptsRow, "id">>;

export interface VerificationRecordsRow {
  id: string;
  payload: Json;
  status: string;
  created_at: string;
  updated_at: string;
}
export type VerificationRecordsInsert = Omit<VerificationRecordsRow, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};
export type VerificationRecordsUpdate = Partial<Omit<VerificationRecordsRow, "id">>;

export interface FraudAssessmentsRow {
  id: string;
  record_id: string;
  payload: Json;
  status: string;
  created_at: string;
}
export type FraudAssessmentsInsert = Omit<FraudAssessmentsRow, "created_at"> & { created_at?: string };
export type FraudAssessmentsUpdate = Partial<Omit<FraudAssessmentsRow, "id">>;

export interface PopsChallengesRow {
  id: string;
  record_id: string;
  payload: Json;
  status: string;
  created_at: string;
  updated_at: string;
}
export type PopsChallengesInsert = Omit<PopsChallengesRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
export type PopsChallengesUpdate = Partial<Omit<PopsChallengesRow, "id">>;

export interface DisputesRow {
  id: string;
  owner_user_id: string;
  payload: Json;
  status: string;
  created_at: string;
  updated_at: string;
}
export type DisputesInsert = Omit<DisputesRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
export type DisputesUpdate = Partial<Omit<DisputesRow, "id">>;

export interface RuntimeEventsRow {
  id: string;
  post_id: string;
  payload: Json;
  created_at: string;
}
export type RuntimeEventsInsert = Omit<RuntimeEventsRow, "created_at"> & { created_at?: string };
export type RuntimeEventsUpdate = never;

export interface ViewerSessionsRow {
  id: string;
  post_id: string;
  viewer_user_id: string;
  payload: Json;
  created_at: string;
  updated_at: string;
}
export type ViewerSessionsInsert = Omit<ViewerSessionsRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
export type ViewerSessionsUpdate = Partial<Omit<ViewerSessionsRow, "id">>;

export interface TrustImpactsRow {
  id: string;
  payload: Json;
  created_at: string;
}
export type TrustImpactsInsert = Omit<TrustImpactsRow, "created_at"> & { created_at?: string };
export type TrustImpactsUpdate = Partial<Omit<TrustImpactsRow, "id">>;
