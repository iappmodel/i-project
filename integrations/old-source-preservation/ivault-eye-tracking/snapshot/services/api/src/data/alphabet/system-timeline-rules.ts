import type {
  SystemTimelineEntryType,
  SystemTimelineSeverity,
  SystemTimelineVisibility
} from "@/types/alphabet/system-timeline.types";

export interface SystemTimelineRule {
  entryType: SystemTimelineEntryType;
  defaultSeverity: SystemTimelineSeverity;
  defaultVisibility: SystemTimelineVisibility;
  highRiskStatuses: string[];
  successStatuses: string[];
  warningStatuses: string[];
  dangerStatuses: string[];
  criticalStatuses: string[];
}

export const SYSTEM_TIMELINE_RULES: SystemTimelineRule[] = [
  {
    entryType: "ledger",
    defaultSeverity: "info",
    defaultVisibility: "admin_safe",
    successStatuses: ["posted"],
    warningStatuses: ["pending"],
    dangerStatuses: ["failed", "reversed"],
    criticalStatuses: [],
    highRiskStatuses: ["failed", "reversed"]
  },
  {
    entryType: "execution",
    defaultSeverity: "info",
    defaultVisibility: "admin_safe",
    successStatuses: ["execution_completed"],
    warningStatuses: ["execution_retry_pending", "execution_locked", "execution_running"],
    dangerStatuses: ["execution_failed", "execution_dead_lettered"],
    criticalStatuses: ["execution_dead_lettered"],
    highRiskStatuses: ["execution_failed", "execution_dead_lettered"]
  },
  {
    entryType: "external_transfer",
    defaultSeverity: "info",
    defaultVisibility: "admin_safe",
    successStatuses: ["transfer_completed", "provider_succeeded"],
    warningStatuses: ["provider_pending", "transfer_requires_review"],
    dangerStatuses: ["provider_failed", "transfer_failed", "compensation_required"],
    criticalStatuses: ["provider_unknown"],
    highRiskStatuses: ["provider_failed", "provider_unknown", "compensation_required"]
  },
  {
    entryType: "provider_reconciliation",
    defaultSeverity: "info",
    defaultVisibility: "admin_safe",
    successStatuses: ["reconciliation_applied", "reconciliation_verified"],
    warningStatuses: ["reconciliation_requires_review", "reconciliation_unmatched"],
    dangerStatuses: ["reconciliation_failed", "reconciliation_unverified"],
    criticalStatuses: ["reconciliation_unverified"],
    highRiskStatuses: [
      "reconciliation_failed",
      "reconciliation_unverified",
      "reconciliation_unmatched"
    ]
  },
  {
    entryType: "compensation",
    defaultSeverity: "info",
    defaultVisibility: "admin_safe",
    successStatuses: ["compensation_completed"],
    warningStatuses: ["compensation_requires_review", "compensation_pending"],
    dangerStatuses: ["compensation_failed", "compensation_blocked"],
    criticalStatuses: [],
    highRiskStatuses: ["compensation_failed", "compensation_blocked", "compensation_requires_review"]
  },
  {
    entryType: "admin_review",
    defaultSeverity: "warning",
    defaultVisibility: "admin_safe",
    successStatuses: ["review_approved", "review_closed"],
    warningStatuses: ["review_queued", "review_assigned", "review_needs_more_info"],
    dangerStatuses: ["review_rejected", "review_escalated"],
    criticalStatuses: [],
    highRiskStatuses: ["review_rejected", "review_escalated"]
  },
  {
    entryType: "audit",
    defaultSeverity: "info",
    defaultVisibility: "admin_safe",
    successStatuses: ["created", "completed"],
    warningStatuses: [],
    dangerStatuses: ["failed"],
    criticalStatuses: [],
    highRiskStatuses: ["failed"]
  },
  {
    entryType: "event",
    defaultSeverity: "info",
    defaultVisibility: "admin_safe",
    successStatuses: [],
    warningStatuses: [],
    dangerStatuses: [],
    criticalStatuses: [],
    highRiskStatuses: []
  }
];

export function getTimelineRule(entryType: SystemTimelineEntryType): SystemTimelineRule | null {
  return SYSTEM_TIMELINE_RULES.find((rule) => rule.entryType === entryType) ?? null;
}

export function severityForStatus(
  entryType: SystemTimelineEntryType,
  status?: string | null
): SystemTimelineSeverity {
  const rule = getTimelineRule(entryType);
  if (!rule) return "info";
  if (!status) return rule.defaultSeverity;

  if (rule.criticalStatuses.includes(status)) return "critical";
  if (rule.dangerStatuses.includes(status)) return "danger";
  if (rule.warningStatuses.includes(status)) return "warning";
  if (rule.successStatuses.includes(status)) return "success";

  return rule.defaultSeverity;
}

export function visibilityForEntry(entryType: SystemTimelineEntryType): SystemTimelineVisibility {
  return getTimelineRule(entryType)?.defaultVisibility ?? "admin_safe";
}
