export const REVIEW_STATUS_LABELS: Record<string, string> = {
  review_created: "Created",
  review_queued: "Queued",
  review_assigned: "Assigned",
  review_in_progress: "In Progress",
  review_needs_more_info: "Needs Info",
  review_approved: "Approved",
  review_rejected: "Rejected",
  review_escalated: "Escalated",
  review_closed: "Closed",
  review_canceled: "Canceled"
};

export const REVIEW_DECISION_LABELS: Record<string, string> = {
  approve_continue: "Approve Continue",
  approve_with_limits: "Approve With Limits",
  reject_block: "Reject / Block",
  escalate: "Escalate",
  request_more_info: "Request More Info",
  cancel_case: "Cancel Case",
  reverse_and_compensate: "Reverse + Compensate",
  freeze_wallet: "Freeze Wallet",
  freeze_withdrawals: "Freeze Withdrawals",
  freeze_campaign: "Freeze Campaign",
  release_hold: "Release Hold"
};

export const REVIEW_SEVERITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical"
};

export const REVIEW_PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent"
};

export const REVIEW_DECISION_OPTIONS = [
  "approve_continue",
  "approve_with_limits",
  "reject_block",
  "escalate",
  "request_more_info",
  "cancel_case",
  "reverse_and_compensate",
  "freeze_wallet",
  "freeze_withdrawals",
  "freeze_campaign",
  "release_hold"
] as const;

export function isEscalatedCase(status?: string | null, severity?: string | null) {
  return status === "review_escalated" || severity === "critical";
}

export function isClosedCase(status?: string | null) {
  return (
    status === "review_approved" ||
    status === "review_rejected" ||
    status === "review_closed" ||
    status === "review_canceled"
  );
}

export function canDecideCase(status?: string | null) {
  return !isClosedCase(status);
}

export function canAssignCase(status?: string | null) {
  return (
    status === "review_created" ||
    status === "review_queued" ||
    status === "review_needs_more_info" ||
    status === "review_escalated"
  );
}
