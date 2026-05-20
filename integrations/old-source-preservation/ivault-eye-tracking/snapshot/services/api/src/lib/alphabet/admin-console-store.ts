import type {
  AdminCommandRecord,
  AdminCommandRecordStatus,
  AdminCommandType,
  AdminConsoleEvaluationResult,
  AdminConsoleSignalInput,
  AdminExecutionInstruction,
  AdminOperatorRole,
  AdminPermissionScope,
  AdminQueueItem,
  AdminQueueType
} from "../../types/alphabet/admin-console.types";
import { evaluateAdminCommand } from "./admin-console-engine";

type AdminConsoleStoreState = {
  queueItems: Map<string, AdminQueueItem>;
  commands: Map<string, AdminCommandRecord>;
  results: Map<string, AdminConsoleEvaluationResult>;
};

const store: AdminConsoleStoreState = {
  queueItems: new Map(),
  commands: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapStatus(status: AdminConsoleEvaluationResult["status"]): AdminCommandRecordStatus {
  switch (status) {
    case "admin_command_allowed":
      return "command_allowed";
    case "admin_command_denied":
      return "command_denied";
    case "admin_command_requires_approval":
    case "admin_command_escalated":
      return "command_requires_approval";
    case "admin_command_executed":
      return "command_executed";
    case "admin_command_failed":
      return "command_failed";
    default:
      return "command_created";
  }
}

export function createAdminQueueItem(params: {
  queueType: AdminQueueType;
  targetSystem: AdminExecutionInstruction["targetSystem"];
  targetObjectId: string;
  title: string;
  summary: string;
  priority?: AdminQueueItem["priority"];
  sourceReviewCaseId?: string | null;
  sourceAuditId?: string | null;
  sourceEventIds?: string[];
}): AdminQueueItem {
  const now = nowIso();

  const item: AdminQueueItem = {
    adminQueueItemId: createId("admin_queue_item"),
    queueType: params.queueType,
    targetSystem: params.targetSystem,
    targetObjectId: params.targetObjectId,
    title: params.title,
    summary: params.summary,
    priority: params.priority ?? "normal",
    status: "open",
    assignedOperatorUserId: null,
    assignedOperatorRole: null,
    sourceReviewCaseId: params.sourceReviewCaseId ?? null,
    sourceAuditId: params.sourceAuditId ?? null,
    sourceEventIds: params.sourceEventIds ?? [],
    createdAt: now,
    updatedAt: now
  };

  store.queueItems.set(item.adminQueueItemId, item);
  return item;
}

export function getAdminQueueItem(adminQueueItemId: string): AdminQueueItem | null {
  return store.queueItems.get(adminQueueItemId) ?? null;
}

export function assignAdminQueueItem(params: {
  adminQueueItemId: string;
  operatorUserId: string;
  operatorRole: AdminOperatorRole;
}): AdminQueueItem {
  const item = getAdminQueueItem(params.adminQueueItemId);

  if (!item) {
    throw new Error("Admin queue item not found.");
  }

  const next: AdminQueueItem = {
    ...item,
    assignedOperatorUserId: params.operatorUserId,
    assignedOperatorRole: params.operatorRole,
    status: "assigned",
    updatedAt: nowIso()
  };

  store.queueItems.set(next.adminQueueItemId, next);
  return next;
}

export function createAdminCommand(params: {
  adminQueueItemId?: string | null;
  operatorUserId: string;
  operatorRole: AdminOperatorRole;
  permissionScope: AdminPermissionScope;
  commandType: AdminCommandType;
  targetSystem: AdminExecutionInstruction["targetSystem"];
  targetObjectId: string;
  commandReason: string;
  executionPayload?: Record<string, unknown>;
  approvalRequired?: boolean;
  twoPersonApprovalRequired?: boolean;
  approvedByUserId?: string | null;
  sourceReviewCaseId?: string | null;
  sourceAuditId?: string | null;
  sourceEventIds?: string[];
}): AdminCommandRecord {
  const now = nowIso();

  const command: AdminCommandRecord = {
    adminCommandId: createId("admin_command"),
    adminQueueItemId: params.adminQueueItemId ?? null,
    operatorUserId: params.operatorUserId,
    operatorRole: params.operatorRole,
    permissionScope: params.permissionScope,
    commandType: params.commandType,
    status: "command_created",
    targetSystem: params.targetSystem,
    targetObjectId: params.targetObjectId,
    commandReason: params.commandReason,
    executionPayload: params.executionPayload ?? {},
    approvalRequired: params.approvalRequired ?? false,
    twoPersonApprovalRequired: params.twoPersonApprovalRequired ?? false,
    approvedByUserId: params.approvedByUserId ?? null,
    sourceReviewCaseId: params.sourceReviewCaseId ?? null,
    sourceAuditId: params.sourceAuditId ?? null,
    sourceEventIds: params.sourceEventIds ?? [],
    createdAt: now,
    updatedAt: now,
    executedAt: null
  };

  store.commands.set(command.adminCommandId, command);
  return command;
}

export function getAdminCommand(adminCommandId: string): AdminCommandRecord | null {
  return store.commands.get(adminCommandId) ?? null;
}

export function approveAdminCommand(params: {
  adminCommandId: string;
  approvedByUserId: string;
}): AdminCommandRecord {
  const command = getAdminCommand(params.adminCommandId);

  if (!command) {
    throw new Error("Admin command not found.");
  }

  const next: AdminCommandRecord = {
    ...command,
    approvedByUserId: params.approvedByUserId,
    updatedAt: nowIso()
  };

  store.commands.set(next.adminCommandId, next);
  return next;
}

export function evaluateStoredAdminCommand(
  input: Omit<
    AdminConsoleSignalInput,
    | "adminCommandId"
    | "adminQueueItemId"
    | "queueType"
    | "operatorUserId"
    | "operatorRole"
    | "permissionScope"
    | "commandType"
    | "currentCommandStatus"
    | "targetSystem"
    | "targetObjectId"
    | "commandReason"
    | "executionPayload"
    | "approvalRequired"
    | "twoPersonApprovalRequired"
    | "approvedByUserId"
    | "sourceReviewCaseId"
    | "sourceAuditId"
    | "sourceEventIds"
  > & {
    adminCommandId: string;
    queueType?: AdminQueueType;
  }
): AdminConsoleEvaluationResult {
  const command = getAdminCommand(input.adminCommandId);

  if (!command) {
    throw new Error("Admin command not found.");
  }

  const queueItem = command.adminQueueItemId
    ? getAdminQueueItem(command.adminQueueItemId)
    : null;

  const result = evaluateAdminCommand({
    ...input,
    adminCommandId: command.adminCommandId,
    adminQueueItemId: command.adminQueueItemId,
    queueType: input.queueType ?? queueItem?.queueType ?? "system",
    operatorUserId: command.operatorUserId,
    operatorRole: command.operatorRole,
    permissionScope: command.permissionScope,
    commandType: command.commandType,
    currentCommandStatus: command.status,
    targetSystem: command.targetSystem,
    targetObjectId: command.targetObjectId,
    commandReason: command.commandReason,
    executionPayload: command.executionPayload,
    approvalRequired: command.approvalRequired,
    twoPersonApprovalRequired: command.twoPersonApprovalRequired,
    approvedByUserId: command.approvedByUserId,
    sourceReviewCaseId: command.sourceReviewCaseId,
    sourceAuditId: command.sourceAuditId,
    sourceEventIds: command.sourceEventIds,
    metadata: {
      ...input.metadata
    }
  });

  const now = nowIso();

  const nextCommand: AdminCommandRecord = {
    ...command,
    status: mapStatus(result.status),
    executedAt: result.commandExecuted ? now : command.executedAt,
    updatedAt: now
  };

  store.commands.set(nextCommand.adminCommandId, nextCommand);
  store.results.set(result.adminCommandId, result);

  if (queueItem && (result.commandExecuted || result.commandDenied)) {
    const nextQueueItem: AdminQueueItem = {
      ...queueItem,
      status: result.commandExecuted ? "resolved" : queueItem.status,
      updatedAt: now
    };

    store.queueItems.set(nextQueueItem.adminQueueItemId, nextQueueItem);
  }

  return result;
}

export function listAdminQueueItems(params?: {
  queueType?: AdminQueueType;
  status?: AdminQueueItem["status"];
  assignedOperatorUserId?: string;
}): AdminQueueItem[] {
  return Array.from(store.queueItems.values()).filter((item) => {
    if (params?.queueType && item.queueType !== params.queueType) return false;
    if (params?.status && item.status !== params.status) return false;
    if (
      params?.assignedOperatorUserId &&
      item.assignedOperatorUserId !== params.assignedOperatorUserId
    ) {
      return false;
    }
    return true;
  });
}

export function listAdminCommands(params?: {
  operatorUserId?: string;
  status?: AdminCommandRecordStatus;
}): AdminCommandRecord[] {
  return Array.from(store.commands.values()).filter((command) => {
    if (params?.operatorUserId && command.operatorUserId !== params.operatorUserId) return false;
    if (params?.status && command.status !== params.status) return false;
    return true;
  });
}

export function getAdminConsoleEvaluationResult(
  adminCommandId: string
): AdminConsoleEvaluationResult | null {
  return store.results.get(adminCommandId) ?? null;
}

export function resetAdminConsoleStoreForTests(): void {
  store.queueItems.clear();
  store.commands.clear();
  store.results.clear();
}
