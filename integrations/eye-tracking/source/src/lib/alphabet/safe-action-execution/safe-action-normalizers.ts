import type {
  SafeActionExecutionMode,
  SafeActionSeverity,
  SafeActionType
} from "@/types/alphabet/safe-action-execution.types";

export function normalizeSafeAction(value: string): SafeActionType | null {
  const action = value.trim().toLowerCase();

  const map: Record<string, SafeActionType> = {
    request_reverification: "request_reverification",
    restrict_withdrawals: "restrict_withdrawals",
    restrict_withdrawals_review: "restrict_withdrawals",
    unrestrict_withdrawals: "unrestrict_withdrawals",
    freeze_wallet: "freeze_wallet",
    freeze_wallet_review: "freeze_wallet",
    unfreeze_wallet: "unfreeze_wallet",
    unfreeze_wallet_review: "unfreeze_wallet",
    freeze_campaign: "freeze_campaign",
    freeze_campaign_review: "freeze_campaign",
    unfreeze_campaign: "unfreeze_campaign",
    pause_rewards: "pause_rewards",
    pause_rewards_review: "pause_rewards",
    unpause_rewards: "unpause_rewards",
    approve_compensation: "approve_compensation",
    approve_compensation_review: "approve_compensation",
    reject_compensation: "reject_compensation",
    reject_compensation_review: "reject_compensation",
    retry_provider_polling: "retry_provider_polling",
    retry_provider_polling_review: "retry_provider_polling",
    create_manual_repair_task: "create_manual_repair_task",
    escalate_to_risk_team: "escalate_to_risk_team",
    escalate_to_finance: "escalate_to_finance",
    escalate_to_compliance: "escalate_to_compliance",
    escalate_to_engineering: "escalate_to_engineering"
  };

  return map[action] ?? null;
}

export function inferSafeActionSeverity(action: SafeActionType): SafeActionSeverity {
  if (
    action === "freeze_wallet" ||
    action === "unfreeze_wallet" ||
    action === "approve_compensation"
  ) {
    return "critical";
  }

  if (
    action === "restrict_withdrawals" ||
    action === "unrestrict_withdrawals" ||
    action === "freeze_campaign" ||
    action === "unfreeze_campaign" ||
    action === "pause_rewards" ||
    action === "retry_provider_polling" ||
    action === "create_manual_repair_task" ||
    action === "escalate_to_compliance"
  ) {
    return "danger";
  }

  if (action === "request_reverification" || action.startsWith("escalate_to_")) {
    return "warning";
  }

  return "info";
}

export function inferExecutionMode(action: SafeActionType): SafeActionExecutionMode {
  if (action === "approve_compensation" || action === "retry_provider_polling") {
    return "external_system_required";
  }

  if (action === "create_manual_repair_task") {
    return "manual_only";
  }

  if (
    action.includes("wallet") ||
    action.includes("campaign") ||
    action.includes("withdrawals") ||
    action.includes("rewards") ||
    action.includes("compensation")
  ) {
    return "approval_required";
  }

  return "automatic_safe";
}

export function targetObjectForAction(params: {
  action: SafeActionType;
  linkedObjectIds: Record<string, string | null | undefined>;
}): {
  targetObjectType: string | null;
  targetObjectId: string | null;
} {
  const ids = params.linkedObjectIds;

  if (params.action.includes("wallet") || params.action.includes("withdrawals")) {
    return {
      targetObjectType: "wallet",
      targetObjectId: ids.walletId ?? null
    };
  }

  if (params.action.includes("campaign")) {
    return {
      targetObjectType: "campaign",
      targetObjectId: ids.campaignId ?? null
    };
  }

  if (params.action.includes("compensation")) {
    return {
      targetObjectType: "compensation",
      targetObjectId: ids.compensationId ?? null
    };
  }

  if (params.action === "retry_provider_polling") {
    return {
      targetObjectType: "external_transfer",
      targetObjectId: ids.externalTransferId ?? null
    };
  }

  if (params.action === "request_reverification") {
    return {
      targetObjectType: "user",
      targetObjectId: ids.userId ?? null
    };
  }

  return {
    targetObjectType: "admin_command_item",
    targetObjectId: null
  };
}

export function buildExecutionSteps(action: SafeActionType): string[] {
  const common = [
    "load_source_decision",
    "check_idempotency",
    "check_policy",
    "write_execution_audit"
  ];

  if (
    action === "freeze_wallet" ||
    action === "unfreeze_wallet" ||
    action === "restrict_withdrawals" ||
    action === "unrestrict_withdrawals"
  ) {
    return [
      ...common,
      "create_wallet_status_execution_request",
      "write_wallet_status_event",
      "complete_execution"
    ];
  }

  if (action === "freeze_campaign" || action === "unfreeze_campaign") {
    return [
      ...common,
      "create_campaign_status_execution_request",
      "write_campaign_status_event",
      "complete_execution"
    ];
  }

  if (action === "pause_rewards" || action === "unpause_rewards") {
    return [
      ...common,
      "create_reward_status_execution_request",
      "write_reward_status_event",
      "complete_execution"
    ];
  }

  if (action === "approve_compensation" || action === "reject_compensation") {
    return [
      ...common,
      "create_compensation_workflow_request",
      "write_compensation_review_event",
      "complete_execution"
    ];
  }

  if (action === "retry_provider_polling") {
    return [
      ...common,
      "create_provider_polling_request",
      "write_provider_retry_event",
      "complete_execution"
    ];
  }

  if (action === "create_manual_repair_task") {
    return [
      ...common,
      "create_manual_repair_task",
      "write_manual_required_event",
      "complete_execution"
    ];
  }

  return [
    ...common,
    "write_escalation_or_reverification_request",
    "complete_execution"
  ];
}

export function actionNeedsTarget(action: SafeActionType): boolean {
  return [
    "request_reverification",
    "restrict_withdrawals",
    "unrestrict_withdrawals",
    "freeze_wallet",
    "unfreeze_wallet",
    "freeze_campaign",
    "unfreeze_campaign",
    "pause_rewards",
    "unpause_rewards",
    "approve_compensation",
    "reject_compensation",
    "retry_provider_polling"
  ].includes(action);
}

export function isDirectMoneyMutationForbidden(action: SafeActionType): boolean {
  return ["approve_compensation", "reject_compensation", "retry_provider_polling"].includes(
    action
  );
}
