/**
 * Production readiness checklist (Stage 9 scaffold — statuses are illustrative).
 */

export type ChecklistStatus = "not_started" | "planned" | "scaffolded" | "implemented" | "verified";

export type ChecklistCategory =
  | "Auth"
  | "Database"
  | "Storage"
  | "Media Processing"
  | "Wallet/Ledger"
  | "Verification"
  | "Fraud"
  | "Safety"
  | "Campaigns"
  | "Runtime Feed"
  | "Analytics"
  | "Compliance"
  | "Observability"
  | "Backup/Recovery";

export interface StudioProductionChecklistItem {
  id: string;
  category: ChecklistCategory;
  label: string;
  status: ChecklistStatus;
  blockingForProduction: boolean;
  notes?: string;
}

export const STUDIO_PRODUCTION_CHECKLIST: StudioProductionChecklistItem[] = [
  { id: "auth-rls", category: "Auth", label: "RLS enabled on all tables", status: "scaffolded", blockingForProduction: true, notes: "See studio_0008_rls_policies.sql" },
  { id: "auth-jwt", category: "Auth", label: "JWT/session alignment with Supabase Auth", status: "not_started", blockingForProduction: true },
  { id: "db-migrate", category: "Database", label: "Migration runner in CI + prod promotion", status: "planned", blockingForProduction: true },
  { id: "db-ledger", category: "Wallet/Ledger", label: "Ledger writes service-role only", status: "scaffolded", blockingForProduction: true },
  { id: "db-balance", category: "Wallet/Ledger", label: "Wallet balances derived from ledger / locked table", status: "planned", blockingForProduction: true },
  { id: "db-idem", category: "Wallet/Ledger", label: "Idempotency keys enforced on money-like mutations", status: "planned", blockingForProduction: true },
  { id: "st-url", category: "Storage", label: "Media upload via signed URLs", status: "not_started", blockingForProduction: true },
  { id: "mp-transcode", category: "Media Processing", label: "Transcode pipeline + checksum verification", status: "not_started", blockingForProduction: true },
  { id: "safe-scan", category: "Safety", label: "Safety scan before publish (server)", status: "scaffolded", blockingForProduction: true },
  { id: "fraud-reward", category: "Fraud", label: "Fraud assessment before reward", status: "planned", blockingForProduction: true },
  { id: "wallet-hold", category: "Wallet/Ledger", label: "Settlement hold worker", status: "not_started", blockingForProduction: true },
  { id: "disp-flow", category: "Compliance", label: "Dispute workflow + evidence retention", status: "scaffolded", blockingForProduction: true },
  { id: "audit", category: "Compliance", label: "Audit logs for admin + money paths", status: "planned", blockingForProduction: true },
  { id: "rate", category: "Observability", label: "Rate limits on ingest + Edge Functions", status: "not_started", blockingForProduction: true },
  { id: "backup", category: "Backup/Recovery", label: "Backup policy + tested restore", status: "not_started", blockingForProduction: true },
  { id: "rt-feed", category: "Runtime Feed", label: "Realtime feed delivery (non-mock)", status: "not_started", blockingForProduction: false },
  { id: "analytics-wh", category: "Analytics", label: "Warehouse export / dashboards", status: "not_started", blockingForProduction: false },
  { id: "camp-validate", category: "Campaigns", label: "Server-side campaign activation + caps", status: "scaffolded", blockingForProduction: true },
  { id: "verif-human", category: "Verification", label: "Verification provider integration", status: "not_started", blockingForProduction: true },
  { id: "obs-trace", category: "Observability", label: "Distributed tracing on Edge + workers", status: "planned", blockingForProduction: false },
];
