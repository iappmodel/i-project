/**
 * [ i ] Studio Stage 8 — domains where the server must remain authoritative.
 */

export type ServerAuthorityDomain =
  | "wallet"
  | "ledger"
  | "rewards"
  | "verification"
  | "fraud"
  | "trust"
  | "safety"
  | "rights"
  | "publish"
  | "campaign_budget"
  | "settlement"
  | "disputes"
  | "age"
  | "runtime_unlock";

const SERVER_ONLY: ServerAuthorityDomain[] = [
  "wallet",
  "ledger",
  "rewards",
  "verification",
  "fraud",
  "trust",
  "safety",
  "rights",
  "publish",
  "campaign_budget",
  "settlement",
  "disputes",
  "age",
  "runtime_unlock",
];

export type ClientStudioAction =
  | "request_unlock"
  | "display_balance"
  | "request_reward"
  | "edit_magic_draft"
  | "preview_settlement"
  | "run_mock_scan"
  | "request_publish"
  | "report_campaign_action"
  | "client_compute_balance"
  | "client_pass_verification"
  | "client_release_settlement";

const ACTION_REQUIRES_AUTHORITY: Record<ClientStudioAction, ServerAuthorityDomain[]> = {
  request_unlock: ["runtime_unlock", "ledger", "wallet", "verification"],
  display_balance: ["wallet", "ledger"],
  request_reward: ["rewards", "verification", "ledger", "campaign_budget"],
  edit_magic_draft: ["safety", "rights", "publish"],
  preview_settlement: ["settlement", "ledger"],
  run_mock_scan: ["safety"],
  request_publish: ["publish", "safety", "rights"],
  report_campaign_action: ["verification", "campaign_budget", "rewards"],
  client_compute_balance: ["wallet"],
  client_pass_verification: ["verification"],
  client_release_settlement: ["settlement", "ledger"],
};

export function assertServerAuthorityRequired(action: ClientStudioAction): { required: boolean; domains: ServerAuthorityDomain[]; reason: string } {
  const domains = ACTION_REQUIRES_AUTHORITY[action] ?? [];
  const needsServer = domains.length > 0;
  return {
    required: needsServer,
    domains,
    reason: needsServer
      ? `Server must validate: ${domains.join(", ")}`
      : "No dedicated server authority slice (still do not trust client for economics).",
  };
}

const EXPLANATIONS: Record<ServerAuthorityDomain, string> = {
  wallet: "Wallet balances and holds are derived from ledger history on the server.",
  ledger: "All bucket moves are append-only ledger lines applied in ACID transactions.",
  rewards: "Rewards issuance follows verification + budget reservation server-side.",
  verification: "Human / policy gates complete only via trusted workers.",
  fraud: "Fraud assessments and signals are computed server-side; client supplies hints at most.",
  trust: "Trust score updates originate from verified outcomes, not UI state.",
  safety: "Safety classification and publish blocking are moderation services.",
  rights: "Rights clearance and monetization eligibility are server adjudicated.",
  publish: "Post packages are validated, hashed, and signed before going live.",
  campaign_budget: "Spend and caps use budget accounts — never client arithmetic alone.",
  settlement: "Pending to available and releases are settlement workers.",
  disputes: "Dispute resolution and evidence chains are operator/server workflows.",
  age: "Age eligibility is verified off sensitive attributes; client cannot assert pass.",
  runtime_unlock: "Unlock taps create server decisions and ledger lines, not client debits.",
};

export function getServerAuthorityExplanation(domain: ServerAuthorityDomain): string {
  return EXPLANATIONS[domain] ?? "Server authority applies.";
}

export function isServerAuthorityDomain(d: string): d is ServerAuthorityDomain {
  return (SERVER_ONLY as string[]).includes(d);
}
