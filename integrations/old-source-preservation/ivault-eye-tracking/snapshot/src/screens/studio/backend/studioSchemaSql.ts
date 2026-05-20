/**
 * [ i ] Studio Stage 8 — SQL schema preview strings (documentation / migration seeding).
 * Not executed by the app.
 */

export const STUDIO_SCHEMA_SQL = {
  studio_projects: `-- studio_projects
-- Draft projects may be mutable.
CREATE TABLE studio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  draft_payload jsonb NOT NULL DEFAULT '{}',
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);`,

  studio_project_snapshots: `-- studio_project_snapshots
CREATE TABLE studio_project_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES studio_projects(id),
  snapshot jsonb NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);`,

  studio_assets: `-- studio_assets
CREATE TABLE studio_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES studio_projects(id),
  owner_user_id uuid NOT NULL,
  uri text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);`,

  studio_tracks: `-- studio_tracks
CREATE TABLE studio_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES studio_projects(id),
  name text NOT NULL,
  sort_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  studio_clips: `-- studio_clips
CREATE TABLE studio_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES studio_tracks(id),
  start_ms bigint NOT NULL,
  end_ms bigint NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  studio_magic_reveals: `-- studio_magic_reveals
CREATE TABLE studio_magic_reveals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES studio_projects(id),
  owner_user_id uuid NOT NULL,
  description text,
  monetization jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  studio_export_jobs: `-- studio_export_jobs
CREATE TABLE studio_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES studio_projects(id),
  status text NOT NULL DEFAULT 'queued',
  result_uri text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  post_packages: `-- post_packages
-- Published post packages are immutable snapshots.
CREATE TABLE post_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES studio_projects(id),
  owner_user_id uuid NOT NULL,
  snapshot_hash text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  published_posts: `-- published_posts
CREATE TABLE published_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES post_packages(id),
  project_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  post_disclosures: `-- post_disclosures
CREATE TABLE post_disclosures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES published_posts(id),
  disclosure_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,

  wallet_accounts: `-- wallet_accounts
CREATE TABLE wallet_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  wallet_balances: `-- wallet_balances (materialized / cache — authoritative source is ledger)
CREATE TABLE wallet_balances (
  account_id uuid PRIMARY KEY REFERENCES wallet_accounts(id),
  pending_minor bigint NOT NULL DEFAULT 0,
  available_minor bigint NOT NULL DEFAULT 0,
  locked_minor bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  wallet_ledger_entries: `-- wallet_ledger_entries
-- DO NOT UPDATE ledger entries after creation; reverse with compensating entry.
CREATE TABLE wallet_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES wallet_accounts(id),
  amount_minor bigint NOT NULL,
  currency text NOT NULL,
  kind text NOT NULL,
  reference text,
  idempotency_key text UNIQUE,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);`,

  magic_reveal_unlocks: `-- magic_reveal_unlocks
CREATE TABLE magic_reveal_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reveal_id uuid NOT NULL REFERENCES studio_magic_reveals(id),
  viewer_session_id uuid,
  ledger_entry_id uuid REFERENCES wallet_ledger_entries(id),
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,

  campaigns: `-- campaigns
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  title text NOT NULL,
  budget_minor bigint NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  campaign_action_attempts: `-- campaign_action_attempts
CREATE TABLE campaign_action_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  actor_user_id uuid NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  verification_records: `-- verification_records
CREATE TABLE verification_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  verification_gate_results: `-- verification_gate_results (sealed after completion)
CREATE TABLE verification_gate_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES verification_records(id),
  gate text NOT NULL,
  passed boolean NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now()
);`,

  fraud_assessments: `-- fraud_assessments
CREATE TABLE fraud_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL,
  score numeric NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,

  fraud_signals: `-- fraud_signals
CREATE TABLE fraud_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES fraud_assessments(id),
  signal text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,

  pops_challenges: `-- pops_challenges
CREATE TABLE pops_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES verification_records(id),
  challenge jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  disputes: `-- disputes
CREATE TABLE disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  dispute_evidence: `-- dispute_evidence (append-only)
CREATE TABLE dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES disputes(id),
  uri text NOT NULL,
  submitted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,

  runtime_events: `-- runtime_events (append-only)
CREATE TABLE runtime_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,

  viewer_sessions: `-- viewer_sessions
CREATE TABLE viewer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES published_posts(id),
  viewer_user_id uuid,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,

  trust_impacts: `-- trust_impacts
CREATE TABLE trust_impacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta int NOT NULL,
  reason text NOT NULL,
  source_event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);`,

  idempotency_mutations: `-- idempotency / mutation log
CREATE TABLE idempotency_mutations (
  idempotency_key text PRIMARY KEY,
  actor_user_id uuid NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
} as const;

export type StudioSchemaTable = keyof typeof STUDIO_SCHEMA_SQL;
