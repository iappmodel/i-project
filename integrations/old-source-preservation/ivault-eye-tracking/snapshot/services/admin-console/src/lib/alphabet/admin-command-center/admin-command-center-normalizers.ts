import type {
  AdminCommandPriority,
  AdminCommandQueueScope,
  AdminCommandRecommendedAction,
  AdminCommandSeverity
} from "@/types/alphabet/admin-command-center.types";

export function severityToPriority(severity: AdminCommandSeverity): AdminCommandPriority {
  if (severity === "critical") return "urgent";
  if (severity === "danger") return "high";
  if (severity === "warning") return "normal";
  return "low";
}

export function inferQueueScope(params: {
  itemType?: string | null;
  alertType?: string | null;
  reviewCaseType?: string | null;
  sourceObjectType?: string | null;
  recommendedActions?: string[];
}): AdminCommandQueueScope {
  const haystack = [
    params.itemType,
    params.alertType,
    params.reviewCaseType,
    params.sourceObjectType,
    ...(params.recommendedActions ?? [])
  ]
    .join(":")
    .toLowerCase();

  if (haystack.includes("wallet")) return "wallet";
  if (haystack.includes("payout") || haystack.includes("transfer") || haystack.includes("provider"))
    return "payout";
  if (haystack.includes("finance") || haystack.includes("reconciliation") || haystack.includes("ledger"))
    return "finance";
  if (haystack.includes("campaign")) return "campaign";
  if (
    haystack.includes("identity") ||
    haystack.includes("kyc") ||
    haystack.includes("device") ||
    haystack.includes("sybil")
  )
    return "identity";
  if (haystack.includes("age") || haystack.includes("compliance")) return "compliance";
  if (haystack.includes("saga") || haystack.includes("job") || haystack.includes("audit")) return "system";
  if (haystack.includes("fraud") || haystack.includes("risk")) return "risk";

  return "global";
}

export function normalizeRecommendedActions(value: unknown): AdminCommandRecommendedAction[] {
  if (!Array.isArray(value)) return [];

  return value.map(String).filter(Boolean) as AdminCommandRecommendedAction[];
}

export function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean).map(String))];
}

export function isOpenStatus(status?: string | null): boolean {
  return !["command_item_resolved", "command_item_dismissed"].includes(String(status ?? ""));
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Map inbox / review severities into AdminCommandSeverity. */
export function coerceCommandSeverity(raw?: string | null): AdminCommandSeverity {
  const s = String(raw ?? "").toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high" || s === "danger") return "danger";
  if (s === "medium" || s === "warning") return "warning";
  return "info";
}
