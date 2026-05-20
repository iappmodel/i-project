import type {
  AdminCommandExecutableAction,
  AdminCommandRecommendedAction
} from "@/types/alphabet/admin-command-center.types";

export const ADMIN_COMMAND_DANGEROUS_RECOMMENDED_ACTIONS: AdminCommandRecommendedAction[] = [
  "restrict_withdrawals_review",
  "freeze_wallet_review",
  "unfreeze_wallet_review",
  "freeze_campaign_review",
  "pause_rewards_review",
  "approve_compensation_review",
  "reject_compensation_review",
  "retry_provider_polling_review",
  "create_manual_repair_task"
];

export const ADMIN_COMMAND_MONEY_RECOMMENDED_ACTIONS: AdminCommandRecommendedAction[] = [
  "restrict_withdrawals_review",
  "freeze_wallet_review",
  "unfreeze_wallet_review",
  "approve_compensation_review",
  "reject_compensation_review",
  "retry_provider_polling_review",
  "create_manual_repair_task"
];

export const ADMIN_COMMAND_EXECUTABLE_ACTIONS_REQUIRING_REASON: AdminCommandExecutableAction[] = [
  "approve_recommended_action",
  "reject_recommended_action",
  "mark_resolved",
  "dismiss_item",
  "escalate_item",
  "create_followup_review_case",
  "request_evidence"
];

export const ADMIN_COMMAND_EXECUTABLE_ACTIONS_REQUIRING_APPROVAL: AdminCommandExecutableAction[] = [
  "approve_recommended_action",
  "create_followup_review_case"
];

export const ADMIN_COMMAND_SAFE_EXECUTABLE_ACTIONS: AdminCommandExecutableAction[] = [
  "add_admin_note",
  "assign_item",
  "change_priority",
  "request_evidence",
  "approve_recommended_action",
  "reject_recommended_action",
  "mark_resolved",
  "dismiss_item",
  "escalate_item",
  "create_followup_review_case"
];

export function isDangerousRecommendedAction(action?: string | null): boolean {
  return ADMIN_COMMAND_DANGEROUS_RECOMMENDED_ACTIONS.includes(action as AdminCommandRecommendedAction);
}

export function isMoneyRecommendedAction(action?: string | null): boolean {
  return ADMIN_COMMAND_MONEY_RECOMMENDED_ACTIONS.includes(action as AdminCommandRecommendedAction);
}

export function executableActionRequiresReason(action: AdminCommandExecutableAction): boolean {
  return ADMIN_COMMAND_EXECUTABLE_ACTIONS_REQUIRING_REASON.includes(action);
}

export function executableActionRequiresApproval(action: AdminCommandExecutableAction): boolean {
  return ADMIN_COMMAND_EXECUTABLE_ACTIONS_REQUIRING_APPROVAL.includes(action);
}

export function isExecutableActionAllowed(action: AdminCommandExecutableAction): boolean {
  return ADMIN_COMMAND_SAFE_EXECUTABLE_ACTIONS.includes(action);
}
