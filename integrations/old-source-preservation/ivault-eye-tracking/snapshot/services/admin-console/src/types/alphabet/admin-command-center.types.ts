import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

export type AdminCommandQueueScope =
  | "global"
  | "risk"
  | "finance"
  | "wallet"
  | "payout"
  | "campaign"
  | "identity"
  | "compliance"
  | "system";

export type AdminCommandItemType =
  | "operational_alert"
  | "admin_review_case"
  | "wallet_invariant_failure"
  | "stuck_saga_failure"
  | "financial_reconciliation_failure"
  | "audit_integrity_failure"
  | "trust_fraud_finding"
  | "manual_admin_task";

export type AdminCommandItemStatus =
  | "command_item_open"
  | "command_item_assigned"
  | "command_item_in_review"
  | "command_item_waiting_for_evidence"
  | "command_item_action_recommended"
  | "command_item_action_approved"
  | "command_item_action_executed"
  | "command_item_resolved"
  | "command_item_dismissed"
  | "command_item_escalated";

export type AdminCommandSeverity = "info" | "warning" | "danger" | "critical";

export type AdminCommandPriority = "low" | "normal" | "high" | "urgent";

export type AdminCommandRecommendedAction =
  | "no_action"
  | "monitor"
  | "request_more_evidence"
  | "request_reverification"
  | "restrict_withdrawals_review"
  | "freeze_wallet_review"
  | "unfreeze_wallet_review"
  | "freeze_campaign_review"
  | "pause_rewards_review"
  | "approve_compensation_review"
  | "reject_compensation_review"
  | "retry_provider_polling_review"
  | "create_manual_repair_task"
  | "escalate_to_risk_team"
  | "escalate_to_finance"
  | "escalate_to_compliance"
  | "escalate_to_engineering";

export type AdminCommandExecutableAction =
  | "add_admin_note"
  | "assign_item"
  | "change_priority"
  | "request_evidence"
  | "approve_recommended_action"
  | "reject_recommended_action"
  | "mark_resolved"
  | "dismiss_item"
  | "escalate_item"
  | "create_followup_review_case";

export type AdminCommandDecisionType =
  | "item_assignment"
  | "priority_change"
  | "evidence_requested"
  | "recommended_action_approved"
  | "recommended_action_rejected"
  | "item_resolved"
  | "item_dismissed"
  | "item_escalated"
  | "followup_review_created"
  | "admin_note_added";

export type AdminCommandDecisionStatus =
  | "decision_recorded"
  | "decision_approved"
  | "decision_rejected"
  | "decision_executed"
  | "decision_failed";

export interface AdminCommandLinkedObjectIds {
  userId?: string | null;
  creatorId?: string | null;
  walletId?: string | null;
  walletAccountId?: string | null;
  campaignId?: string | null;
  payoutId?: string | null;
  externalTransferId?: string | null;
  ledgerEntryId?: string | null;
  policyDecisionId?: string | null;
  reviewCaseId?: string | null;
  alertId?: string | null;
  deviceClusterId?: string | null;
  identityClusterId?: string | null;
  presenceSessionId?: string | null;
  alphabetEventId?: string | null;
  stuckSagaResultId?: string | null;
  walletInvariantResultId?: string | null;
  financialReconciliationReportId?: string | null;
  auditIntegrityReportId?: string | null;
  trustFraudBatchId?: string | null;
}

export interface AdminCommandItemInput {
  itemType: AdminCommandItemType;
  queueScope: AdminCommandQueueScope;
  status?: AdminCommandItemStatus;
  severity: AdminCommandSeverity;
  priority: AdminCommandPriority;

  title: string;
  summary: string;

  linkedObjectIds: AdminCommandLinkedObjectIds;

  sourceObjectType?: string | null;
  sourceObjectId?: string | null;

  recommendedActions: AdminCommandRecommendedAction[];

  evidence: Json;
  redactedEvidence: Json;

  sourceEventIds?: string[];
  linkedAlertIds?: string[];
  linkedReviewCaseIds?: string[];

  dueAt?: string | null;

  reasonCodes?: string[];
  tags?: string[];
  metadata?: Json;
}

export interface AdminCommandDecisionInput {
  commandItemId: string;

  actorAdminId: string;
  actorRole: string;

  executableAction: AdminCommandExecutableAction;

  decisionType: AdminCommandDecisionType;
  decisionStatus?: AdminCommandDecisionStatus;

  requestedAction?: AdminCommandRecommendedAction | null;
  approvedAction?: AdminCommandRecommendedAction | null;
  rejectedAction?: AdminCommandRecommendedAction | null;

  reasonCodes: string[];
  evidenceSummary: string;

  linkedObjectIds: AdminCommandLinkedObjectIds;

  beforeState: Json;
  afterState: Json;

  idempotencyKey: string;
  dedupeKey: string;

  metadata?: Json;
}

export interface AdminCommandEvaluationResult {
  allowed: boolean;
  requiresReasonCodes: boolean;
  requiresApproval: boolean;
  blocksDirectMoneyMutation: boolean;
  blocksDirectWalletMutation: boolean;
  blocksDirectProviderMutation: boolean;
  nextStatus: AdminCommandItemStatus;
  decisionStatus: AdminCommandDecisionStatus;
  reasons: string[];
  event: AlphabetEvent;
  metadata: Json;
}

export interface AdminCommandQueueSummary {
  totalOpen: number;
  urgentCount: number;
  criticalCount: number;
  assignedToMeCount: number;
  waitingForEvidenceCount: number;
  actionRecommendedCount: number;
  financeCount: number;
  walletCount: number;
  payoutCount: number;
  complianceCount: number;
  systemCount: number;
}
