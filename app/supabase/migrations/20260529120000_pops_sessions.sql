-- POP session registry (Stage 6) — derived metadata only; no biometrics.
CREATE TABLE IF NOT EXISTS pops_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  local_user_ref TEXT,
  offer_id TEXT NOT NULL,
  content_id TEXT,
  device_id_hash TEXT,
  proof_level TEXT NOT NULL DEFAULT 'LEVEL_2_ATTENTION',
  state TEXT NOT NULL DEFAULT 'COMPLETED',
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  acs_score INTEGER,
  review_status TEXT,
  fraud_flag BOOLEAN NOT NULL DEFAULT false,
  privacy_receipt JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pops_sessions_user_created_idx
  ON pops_sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pops_sessions_offer_idx
  ON pops_sessions (offer_id);

ALTER TABLE pops_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY pops_sessions_owner_read ON pops_sessions
  FOR SELECT
  USING (auth.uid() = user_id OR local_user_ref IS NOT NULL);

CREATE POLICY pops_sessions_service_write ON pops_sessions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
