/**
 * Human-readable RLS intent (Stage 9). SQL scaffold: `supabase/migrations/studio_0008_rls_policies.sql`.
 */

export type RlsPolicyDomain =
  | "projects"
  | "assets"
  | "timeline"
  | "magic_reveals"
  | "post_packages"
  | "published_posts"
  | "wallet_accounts"
  | "ledger_entries"
  | "campaigns"
  | "verification"
  | "fraud"
  | "disputes"
  | "runtime_events";

export interface RlsPolicyDescription {
  domain: RlsPolicyDomain;
  userCan: string[];
  serverOnly: string[];
  appendOnly: string[];
  immutable: string[];
}

export const STUDIO_RLS_POLICY_DESCRIPTIONS: RlsPolicyDescription[] = [
  {
    domain: "projects",
    userCan: ["CRUD own draft projects where owner_user_id = auth.uid()"],
    serverOnly: ["Cross-tenant admin repair (service role)"],
    appendOnly: [],
    immutable: [],
  },
  {
    domain: "assets",
    userCan: ["Read own assets; create/update while draft"],
    serverOnly: ["Virus scan / transcode status updates"],
    appendOnly: [],
    immutable: [],
  },
  {
    domain: "timeline",
    userCan: ["Read/write tracks+clips for owned draft projects"],
    serverOnly: ["Frozen snapshots after publish"],
    appendOnly: [],
    immutable: ["Published timeline snapshots"],
  },
  {
    domain: "magic_reveals",
    userCan: ["CRUD reveals on owned projects (draft)"],
    serverOnly: ["Settlement hooks, safety finalization"],
    appendOnly: [],
    immutable: [],
  },
  {
    domain: "post_packages",
    userCan: ["Read package metadata when permitted by visibility"],
    serverOnly: ["Create seal/hash row on publish; link to published_posts"],
    appendOnly: [],
    immutable: ["post_packages after publish (no UPDATE)"],
  },
  {
    domain: "published_posts",
    userCan: ["Read when visibility allows"],
    serverOnly: ["Create row on publish; moderation takedown via service policy"],
    appendOnly: [],
    immutable: ["Package hash + disclosure snapshot"],
  },
  {
    domain: "wallet_accounts",
    userCan: ["Read own account rows"],
    serverOnly: ["Balance materialization / corrections via ledger workers"],
    appendOnly: [],
    immutable: [],
  },
  {
    domain: "ledger_entries",
    userCan: [],
    serverOnly: ["INSERT via Edge Function / worker with service role"],
    appendOnly: ["wallet_ledger_entries (no UPDATE/DELETE)"],
    immutable: [],
  },
  {
    domain: "campaigns",
    userCan: ["Draft campaign edit for owner"],
    serverOnly: ["Activate, budget reservation, reward payout"],
    appendOnly: ["campaign_budget_events"],
    immutable: [],
  },
  {
    domain: "verification",
    userCan: ["Submit evidence; read own status"],
    serverOnly: ["Mark passed/failed; gate transitions"],
    appendOnly: ["verification_gate_results"],
    immutable: [],
  },
  {
    domain: "fraud",
    userCan: [],
    serverOnly: ["All fraud_assessments / fraud_signals writes"],
    appendOnly: ["fraud_signals optional append-only ingest"],
    immutable: [],
  },
  {
    domain: "disputes",
    userCan: ["Create dispute; append evidence for own dispute"],
    serverOnly: ["Resolve + financial side-effects"],
    appendOnly: ["dispute_evidence"],
    immutable: [],
  },
  {
    domain: "runtime_events",
    userCan: ["Insert coarse engagement events subject to constraints"],
    serverOnly: ["High-trust / payout-adjacent events"],
    appendOnly: ["runtime_events"],
    immutable: [],
  },
];

export function getRlsPolicySummary(): string {
  return STUDIO_RLS_POLICY_DESCRIPTIONS.map(
    (d) =>
      `[${d.domain}] user: ${d.userCan.join("; ") || "—"} | server: ${d.serverOnly.join("; ")} | append: ${d.appendOnly.join("; ") || "—"} | immutable: ${d.immutable.join("; ") || "—"}`
  ).join("\n");
}
