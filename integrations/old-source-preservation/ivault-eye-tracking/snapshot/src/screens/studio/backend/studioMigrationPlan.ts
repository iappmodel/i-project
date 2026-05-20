/**
 * [ i ] Studio Stage 8 — production migration roadmap (no execution here).
 */

export interface MigrationPhase {
  phase: number;
  goal: string;
  tables: string[];
  apis: string[];
  risks: string[];
  acceptanceCriteria: string[];
}

export const STUDIO_MIGRATION_PLAN: MigrationPhase[] = [
  {
    phase: 1,
    goal: "Local mock adapter only, deterministic IDs, UI integration.",
    tables: ["n/a — in-memory"],
    apis: ["StudioPersistenceAdapter via mock"],
    risks: ["Schema drift vs future Postgres"],
    acceptanceCriteria: ["Save/hydrate round-trip in demo", "No network calls"],
  },
  {
    phase: 2,
    goal: "Backend project persistence, asset upload intents, draft save/load.",
    tables: ["studio_projects", "studio_project_snapshots", "studio_assets", "idempotency_mutations"],
    apis: ["Create/Get/Update project", "Upload intent + confirm"],
    risks: ["Large JSON payloads", "PII in drafts"],
    acceptanceCriteria: ["Authoritative project row", "Asset metadata without raw bytes in DB"],
  },
  {
    phase: 3,
    goal: "Magic reveal persistence, safety scan endpoint, publish validation endpoint.",
    tables: ["studio_magic_reveals", "studio_export_jobs", "post_packages"],
    apis: ["Magic CRUD", "RunPublishValidation", "CreateExportJob"],
    risks: ["Moderation latency", "False positives blocking publish"],
    acceptanceCriteria: ["Safety decision not client-forged", "Export job idempotent"],
  },
  {
    phase: 4,
    goal: "Immutable wallet ledger, unlock transaction API, settlement hold/release.",
    tables: ["wallet_accounts", "wallet_balances", "wallet_ledger_entries", "magic_reveal_unlocks"],
    apis: ["CreateLedgerTransaction", "ReleaseSettlement", "ReverseSettlement"],
    risks: ["Double spend", "Partial commits"],
    acceptanceCriteria: ["Single DB txn per money unit", "Append-only ledger", "Idempotency keys enforced"],
  },
  {
    phase: 5,
    goal: "Runtime feed events, analytics aggregation, campaign action verification.",
    tables: ["runtime_events", "viewer_sessions", "campaigns", "campaign_action_attempts", "published_posts"],
    apis: ["RecordRuntimeAction", "VerifyCampaignAction", "Feed queries"],
    risks: ["Spam events", "Replay attacks"],
    acceptanceCriteria: ["Signed session tokens", "Rate limits", "Verified actions only for payout"],
  },
  {
    phase: 6,
    goal: "Fraud/POPS/disputes backend, trust score impact, risk monitor.",
    tables: ["verification_records", "verification_gate_results", "fraud_assessments", "fraud_signals", "pops_challenges", "disputes", "dispute_evidence", "trust_impacts"],
    apis: ["RunFraudAssessment", "POPS challenge lifecycle", "Dispute resolution"],
    risks: ["Sensitive data exposure", "Operator error"],
    acceptanceCriteria: ["Evidence append-only", "Trust deltas trace to events"],
  },
  {
    phase: 7,
    goal: "Production payouts/compliance, external platform publishing, audit logs.",
    tables: ["audit_logs (TBD)", "external_publish_jobs (TBD)"],
    apis: ["PayCampaignReward", "Compliance webhooks", "Platform connectors"],
    risks: ["Regulatory", "Chargebacks"],
    acceptanceCriteria: ["SOC2-ready logging", "Reconciliation reports"],
  },
];
