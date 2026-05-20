/**
 * Index of SQL migration scaffolds under `supabase/migrations/` (Stage 9).
 * Files are named `studio_0001_*.sql` … `studio_0008_*.sql` so lexicographic order runs them
 * after existing numeric wallet/economy migrations and avoids duplicate `0006`/`0007`/`0008` prefixes.
 */

export type MigrationRiskLevel = "low" | "medium" | "high" | "critical";

export interface MigrationFile {
  id: string;
  filename: string;
  domain: string;
  description: string;
  dependsOn: string[];
  tables: string[];
  riskLevel: MigrationRiskLevel;
  productionRequired: boolean;
}

export const STUDIO_MIGRATION_FILES: MigrationFile[] = [
  {
    id: "0001",
    filename: "studio_0001_core.sql",
    domain: "studio_core",
    description: "Projects, snapshots, assets, tracks, clips",
    dependsOn: [],
    tables: ["studio_projects", "studio_project_snapshots", "studio_assets", "studio_tracks", "studio_clips"],
    riskLevel: "medium",
    productionRequired: true,
  },
  {
    id: "0002",
    filename: "studio_0002_magic_reveals.sql",
    domain: "magic",
    description: "Magic reveal definitions and optional version history",
    dependsOn: ["0001"],
    tables: ["studio_magic_reveals", "studio_magic_reveal_versions"],
    riskLevel: "high",
    productionRequired: true,
  },
  {
    id: "0003",
    filename: "studio_0003_publish_runtime.sql",
    domain: "publish_runtime",
    description: "Export jobs, post packages, published posts, disclosures",
    dependsOn: ["0001", "0002"],
    tables: ["studio_export_jobs", "post_packages", "published_posts", "post_disclosures"],
    riskLevel: "high",
    productionRequired: true,
  },
  {
    id: "0004",
    filename: "studio_0004_wallet_ledger.sql",
    domain: "wallet",
    description: "Accounts, balances, append-only ledger, unlock links",
    dependsOn: ["0001"],
    tables: ["wallet_accounts", "wallet_balances", "wallet_ledger_entries", "magic_reveal_unlocks"],
    riskLevel: "critical",
    productionRequired: true,
  },
  {
    id: "0005",
    filename: "studio_0005_campaigns.sql",
    domain: "campaigns",
    description: "Campaigns, attempts, budget events",
    dependsOn: ["0001", "0004"],
    tables: ["campaigns", "campaign_action_attempts", "campaign_budget_events"],
    riskLevel: "critical",
    productionRequired: true,
  },
  {
    id: "0006",
    filename: "studio_0006_verification_fraud_disputes.sql",
    domain: "trust_risk",
    description: "Verification, fraud, POPS, disputes, trust impacts",
    dependsOn: ["0001", "0004"],
    tables: [
      "verification_records",
      "verification_gate_results",
      "fraud_assessments",
      "fraud_signals",
      "pops_challenges",
      "disputes",
      "dispute_evidence",
      "trust_impacts",
    ],
    riskLevel: "critical",
    productionRequired: true,
  },
  {
    id: "0007",
    filename: "studio_0007_runtime_events_analytics.sql",
    domain: "analytics",
    description: "Runtime events, sessions, metric snapshots",
    dependsOn: ["0003", "0005"],
    tables: [
      "runtime_events",
      "viewer_sessions",
      "post_metric_snapshots",
      "campaign_metric_snapshots",
      "creator_metric_snapshots",
    ],
    riskLevel: "medium",
    productionRequired: false,
  },
  {
    id: "0008",
    filename: "studio_0008_rls_policies.sql",
    domain: "security",
    description: "Enable RLS + draft policies (tighten before prod)",
    dependsOn: ["0001", "0002", "0003", "0004", "0005", "0006", "0007"],
    tables: [],
    riskLevel: "critical",
    productionRequired: true,
  },
];
