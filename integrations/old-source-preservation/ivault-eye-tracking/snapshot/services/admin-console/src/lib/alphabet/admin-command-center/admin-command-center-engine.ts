import {
  executableActionRequiresApproval,
  executableActionRequiresReason,
  isDangerousRecommendedAction,
  isExecutableActionAllowed,
  isMoneyRecommendedAction
} from "@/data/alphabet/admin-command-center-rules";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type { Json } from "@/types/alphabet/database.types";
import type {
  AdminCommandDecisionInput,
  AdminCommandEvaluationResult,
  AdminCommandItemStatus
} from "@/types/alphabet/admin-command-center.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function eventTypeForDecision(
  decisionType: AdminCommandDecisionInput["decisionType"]
): AlphabetEvent["eventType"] {
  if (decisionType === "item_assignment") return "admin_command_item_assigned";
  if (decisionType === "priority_change") return "admin_command_priority_changed";
  if (decisionType === "evidence_requested") return "admin_command_evidence_requested";
  if (decisionType === "recommended_action_approved") return "admin_command_action_approved";
  if (decisionType === "recommended_action_rejected") return "admin_command_action_rejected";
  if (decisionType === "item_resolved") return "admin_command_item_resolved";
  if (decisionType === "item_dismissed") return "admin_command_item_dismissed";
  if (decisionType === "item_escalated") return "admin_command_item_escalated";
  if (decisionType === "followup_review_created") return "admin_command_followup_review_created";
  return "admin_command_note_added";
}

function nextStatusForDecision(decisionType: AdminCommandDecisionInput["decisionType"]): AdminCommandItemStatus {
  if (decisionType === "item_assignment") return "command_item_assigned";
  if (decisionType === "priority_change") return "command_item_in_review";
  if (decisionType === "evidence_requested") return "command_item_waiting_for_evidence";
  if (decisionType === "recommended_action_approved") return "command_item_action_approved";
  if (decisionType === "recommended_action_rejected") return "command_item_in_review";
  if (decisionType === "item_resolved") return "command_item_resolved";
  if (decisionType === "item_dismissed") return "command_item_dismissed";
  if (decisionType === "item_escalated") return "command_item_escalated";
  if (decisionType === "followup_review_created") return "command_item_escalated";
  return "command_item_in_review";
}

export function buildAlphabetEventForAdminCommandDecision(input: AdminCommandDecisionInput): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: input.linkedObjectIds.userId ?? input.actorAdminId,
    coinCode: "J",
    eventType: eventTypeForDecision(input.decisionType),
    objectType: "admin_command_item",
    objectId: input.commandItemId,
    sourceContext: "admin_command_center",
    rawScore: 1,
    qualityScore: 1,
    trustScoreAtEvent: null,
    riskScore: 0,
    ageBand: "unknown",
    verificationStatus: "verified",
    metadata: {
      commandItemId: input.commandItemId,
      actorAdminId: input.actorAdminId,
      actorRole: input.actorRole,
      decisionType: input.decisionType,
      executableAction: input.executableAction,
      requestedAction: input.requestedAction ?? null,
      approvedAction: input.approvedAction ?? null,
      rejectedAction: input.rejectedAction ?? null,
      reasonCodes: input.reasonCodes,
      linkedObjectIds: input.linkedObjectIds as Json
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateAdminCommandDecision(input: AdminCommandDecisionInput): AdminCommandEvaluationResult {
  const reasons: string[] = [];

  const allowedExecutableAction = isExecutableActionAllowed(input.executableAction);
  const requiresReasonCodes = executableActionRequiresReason(input.executableAction);
  const requiresApproval = executableActionRequiresApproval(input.executableAction);

  if (!allowedExecutableAction) {
    reasons.push("admin_command_executable_action_not_allowed");
  }

  if (!input.actorAdminId) {
    reasons.push("admin_command_missing_actor_admin_id");
  }

  if (!input.actorRole) {
    reasons.push("admin_command_missing_actor_role");
  }

  if (requiresReasonCodes && input.reasonCodes.length === 0) {
    reasons.push("admin_command_reason_codes_required");
  }

  if (!input.evidenceSummary && requiresReasonCodes) {
    reasons.push("admin_command_evidence_summary_required");
  }

  const action =
    input.approvedAction ?? input.rejectedAction ?? input.requestedAction ?? null;

  const dangerous = isDangerousRecommendedAction(action);
  const money = isMoneyRecommendedAction(action);

  const blocksDirectMoneyMutation = money;
  const blocksDirectWalletMutation =
    action === "freeze_wallet_review" ||
    action === "unfreeze_wallet_review" ||
    action === "restrict_withdrawals_review";

  const blocksDirectProviderMutation = action === "retry_provider_polling_review";

  if (money) {
    reasons.push("admin_command_money_action_review_only");
  }

  if (dangerous && input.decisionType === "recommended_action_approved") {
    reasons.push("admin_command_dangerous_action_approved_as_review_only");
  }

  const allowed =
    allowedExecutableAction &&
    Boolean(input.actorAdminId) &&
    Boolean(input.actorRole) &&
    (!requiresReasonCodes || input.reasonCodes.length > 0) &&
    (!requiresReasonCodes || Boolean(input.evidenceSummary));

  const nextStatus = nextStatusForDecision(input.decisionType);

  const decisionStatus = allowed ? (input.decisionStatus ?? "decision_recorded") : "decision_failed";

  const event = buildAlphabetEventForAdminCommandDecision(input);

  return {
    allowed,
    requiresReasonCodes,
    requiresApproval,
    blocksDirectMoneyMutation,
    blocksDirectWalletMutation,
    blocksDirectProviderMutation,
    nextStatus,
    decisionStatus,
    reasons,
    event,
    metadata: {
      allowedExecutableAction,
      dangerous,
      money,
      action,
      reviewOnly: money || dangerous
    }
  };
}
