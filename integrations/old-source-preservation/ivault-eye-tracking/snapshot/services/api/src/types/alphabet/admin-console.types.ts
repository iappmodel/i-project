import type { AlphabetEvent } from "./event.types";

export type AdminQueueType =
  | "review"
  | "appeal"
  | "safety"
  | "rights"
  | "payout"
  | "withdrawal"
  | "wallet"
  | "campaign"
  | "treasury"
  | "analytics"
  | "fraud"
  | "compliance"
  | "grant"
  | "system";

export type AdminOperatorRole =
  | "viewer"
  | "support_agent"
  | "reviewer"
  | "senior_reviewer"
  | "safety_specialist"
  | "rights_specialist"
  | "payment_specialist"
  | "treasury_specialist"
  | "compliance_specialist"
  | "admin"
  | "super_admin";

export type AdminCommandType =
  | "view"
  | "assign"
  | "escalate"
  | "request_evidence"
  | "approve"
  | "reject"
  | "release_hold"
  | "maintain_hold"
  | "pause"
  | "resume"
  | "suspend"
  | "restore"
  | "remove"
  | "refund"
  | "reverse"
  | "lock"
  | "unlock"
  | "notify"
  | "create_review"
  | "create_audit"
  | "export";

export type AdminCommandRecordStatus =
  | "command_created"
  | "command_allowed"
  | "command_denied"
  | "command_requires_approval"
  | "command_executed"
  | "command_failed"
  | "command_canceled";

export type AdminDecisionStatus =
  | "admin_queue_created"
  | "admin_command_allowed"
  | "admin_command_denied"
  | "admin_command_requires_approval"
  | "admin_command_executed"
  | "admin_command_failed"
  | "admin_command_escalated";

export type AdminPermissionScope =
  | "read_only"
  | "support"
  | "review"
  | "safety"
  | "rights"
  | "payment"
  | "treasury"
  | "compliance"
  | "admin"
  | "super_admin";

export interface AdminExecutionInstruction {
  targetSystem:
    | "wallet"
    | "reward"
    | "conversion"
    | "withdrawal"
    | "campaign"
    | "content_rights"
    | "content_safety"
    | "creator_payout"
    | "treasury"
    | "review"
    | "notification"
    | "audit"
    | "trust"
    | "u_value"
    | "grant"
    | "system";
  targetObjectId: string;
  action: AdminCommandType;
  reasonCode: string;
  payload?: Record<string, unknown>;
}

export interface AdminQueueItem {
  adminQueueItemId: string;

  queueType: AdminQueueType;
  targetSystem: AdminExecutionInstruction["targetSystem"];
  targetObjectId: string;

  title: string;
  summary: string;

  priority: "low" | "normal" | "high" | "urgent" | "critical";
  status:
    | "open"
    | "assigned"
    | "in_progress"
    | "resolved"
    | "escalated"
    | "closed";

  assignedOperatorUserId?: string | null;
  assignedOperatorRole?: AdminOperatorRole | null;

  sourceReviewCaseId?: string | null;
  sourceAuditId?: string | null;
  sourceEventIds: string[];

  createdAt: string;
  updatedAt: string;
}

export interface AdminCommandRecord {
  adminCommandId: string;

  adminQueueItemId?: string | null;

  operatorUserId: string;
  operatorRole: AdminOperatorRole;
  permissionScope: AdminPermissionScope;

  commandType: AdminCommandType;
  status: AdminCommandRecordStatus;

  targetSystem: AdminExecutionInstruction["targetSystem"];
  targetObjectId: string;

  commandReason: string;
  executionPayload: Record<string, unknown>;

  approvalRequired: boolean;
  twoPersonApprovalRequired: boolean;
  approvedByUserId?: string | null;

  sourceReviewCaseId?: string | null;
  sourceAuditId?: string | null;
  sourceEventIds: string[];

  createdAt: string;
  updatedAt: string;
  executedAt?: string | null;
}

export interface AdminConsoleSignalInput {
  adminCommandId: string;

  adminQueueItemId?: string | null;

  queueType: AdminQueueType;

  operatorUserId: string;
  operatorRole: AdminOperatorRole;
  permissionScope: AdminPermissionScope;

  commandType: AdminCommandType;
  currentCommandStatus: AdminCommandRecordStatus;

  targetSystem: AdminExecutionInstruction["targetSystem"];
  targetObjectId: string;

  commandReason: string;
  executionPayload: Record<string, unknown>;

  approvalRequired: boolean;
  twoPersonApprovalRequired: boolean;
  approvedByUserId?: string | null;

  sourceReviewCaseId?: string | null;
  sourceAuditId?: string | null;
  sourceEventIds: string[];

  riskScore: number;
  severityScore: number;
  evidenceCompletenessScore: number;
  privacySensitivityScore: number;

  targetOwnerUserId?: string | null;

  operatorHasQueueAccess: boolean;
  operatorHasTargetAccess: boolean;
  operatorHasExportPermission: boolean;

  duplicateCommandCount: number;
  recentFailedCommandCount: number;

  executionRequested: boolean;
  cancelRequested: boolean;

  metadata?: Record<string, unknown>;
}

export interface AdminConsoleRuleSet {
  queueType: AdminQueueType;

  allowedRoles: AdminOperatorRole[];
  allowedPermissionScopes: AdminPermissionScope[];

  mutationCommandsRequireApproval: boolean;
  dangerousCommandsRequireTwoPersonApproval: boolean;
  exportRequiresAdmin: boolean;

  minOperatorPermissionScore: number;
  minExecutionSafetyScore: number;
  maxCommandRiskScore: number;

  maxRiskScoreWithoutApproval: number;
  maxSeverityScoreWithoutApproval: number;
  minEvidenceCompletenessForMutation: number;
  maxPrivacySensitivityForExport: number;

  active: boolean;
}

export interface AdminConsoleEvaluationResult {
  adminCommandId: string;

  adminQueueItemId?: string | null;

  queueType: AdminQueueType;

  operatorUserId: string;
  operatorRole: AdminOperatorRole;
  permissionScope: AdminPermissionScope;

  commandType: AdminCommandType;

  targetSystem: AdminExecutionInstruction["targetSystem"];
  targetObjectId: string;

  status: AdminDecisionStatus;

  operatorPermissionScore: number;
  commandRiskScore: number;
  queuePriorityScore: number;
  executionSafetyScore: number;

  commandAllowed: boolean;
  commandDenied: boolean;
  commandRequiresApproval: boolean;
  twoPersonApprovalRequired: boolean;
  commandExecuted: boolean;
  commandFailed: boolean;
  commandEscalated: boolean;

  executionInstructions: AdminExecutionInstruction[];

  reasons: string[];

  adminQueueItemCreatedEvent: AlphabetEvent;
  adminCommandAllowedEvent?: AlphabetEvent | null;
  adminCommandDeniedEvent?: AlphabetEvent | null;
  adminCommandRequiresApprovalEvent?: AlphabetEvent | null;
  adminCommandExecutedEvent?: AlphabetEvent | null;
  adminCommandFailedEvent?: AlphabetEvent | null;
  adminCommandEscalatedEvent?: AlphabetEvent | null;

  metadata: Record<string, unknown>;
}
