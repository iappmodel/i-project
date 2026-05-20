/**
 * [ i ] Studio Stage 8 — field authority matrix (client vs server vs immutable vs sensitive).
 */

export type DataBoundaryDomain =
  | "project"
  | "timeline"
  | "magic"
  | "publish"
  | "wallet"
  | "ledger"
  | "campaign"
  | "verification"
  | "fraud"
  | "trust"
  | "dispute"
  | "runtime";

export type ClientWritableField = { kind: "client_writable"; description: string };
export type ServerComputedField = { kind: "server_computed"; description: string };
export type ImmutableField = { kind: "immutable"; description: string };
export type SensitiveField = { kind: "sensitive"; description: string };

export type FieldRule = ClientWritableField | ServerComputedField | ImmutableField | SensitiveField;

export interface StudioDataBoundaryRow {
  domain: DataBoundaryDomain;
  field: string;
  clientWritable: boolean;
  serverComputed: boolean;
  immutable: boolean;
  sensitive: boolean;
  reason: string;
}

export const StudioDataBoundaryRules: StudioDataBoundaryRow[] = [
  {
    domain: "wallet",
    field: "balance.available",
    clientWritable: false,
    serverComputed: true,
    immutable: false,
    sensitive: true,
    reason: "Balances derive from append-only ledger; never trust client.",
  },
  {
    domain: "magic",
    field: "reveal.description",
    clientWritable: true,
    serverComputed: false,
    immutable: false,
    sensitive: false,
    reason: "Draft copy is creator-owned until publish-bound snapshot.",
  },
  {
    domain: "fraud",
    field: "fraud.score",
    clientWritable: false,
    serverComputed: true,
    immutable: false,
    sensitive: true,
    reason: "Fraud scoring is server-side and protected.",
  },
  {
    domain: "ledger",
    field: "entry.amount",
    clientWritable: false,
    serverComputed: true,
    immutable: true,
    sensitive: true,
    reason: "Ledger lines are append-only with server-computed economics.",
  },
  {
    domain: "verification",
    field: "gate.finalResult",
    clientWritable: false,
    serverComputed: true,
    immutable: true,
    sensitive: true,
    reason: "Completed verification is sealed server-side.",
  },
  {
    domain: "publish",
    field: "postPackage.snapshot",
    clientWritable: false,
    serverComputed: true,
    immutable: true,
    sensitive: false,
    reason: "Published snapshot is signed/immutable.",
  },
  {
    domain: "campaign",
    field: "spend.minor",
    clientWritable: false,
    serverComputed: true,
    immutable: false,
    sensitive: true,
    reason: "Spend is budget-account authoritative.",
  },
  {
    domain: "trust",
    field: "trust.score",
    clientWritable: false,
    serverComputed: true,
    immutable: false,
    sensitive: true,
    reason: "Trust is derived from server events only.",
  },
  {
    domain: "project",
    field: "title",
    clientWritable: true,
    serverComputed: false,
    immutable: false,
    sensitive: false,
    reason: "Draft metadata is client-editable.",
  },
  {
    domain: "runtime",
    field: "tap.action",
    clientWritable: true,
    serverComputed: false,
    immutable: false,
    sensitive: false,
    reason: "Client may request; server records canonical runtime event.",
  },
];

export type FieldAuthority = "client" | "server" | "immutable" | "sensitive" | "mixed";

export function getFieldAuthority(domain: DataBoundaryDomain, fieldName: string): FieldAuthority {
  const row = StudioDataBoundaryRules.find((r) => r.domain === domain && r.field === fieldName);
  if (!row) return "mixed";
  if (row.immutable) return "immutable";
  if (row.sensitive) return "sensitive";
  if (row.serverComputed) return "server";
  if (row.clientWritable) return "client";
  return "mixed";
}

export function isClientWritable(domain: DataBoundaryDomain, fieldName: string): boolean {
  return StudioDataBoundaryRules.some((r) => r.domain === domain && r.field === fieldName && r.clientWritable);
}

export function isServerComputed(domain: DataBoundaryDomain, fieldName: string): boolean {
  return StudioDataBoundaryRules.some((r) => r.domain === domain && r.field === fieldName && r.serverComputed);
}

export function isImmutable(domain: DataBoundaryDomain, fieldName: string): boolean {
  return StudioDataBoundaryRules.some((r) => r.domain === domain && r.field === fieldName && r.immutable);
}
