import { beforeEach, describe, expect, it } from "vitest";
import {
  approveAdminCommand,
  assignAdminQueueItem,
  createAdminCommand,
  createAdminQueueItem,
  evaluateStoredAdminCommand,
  getAdminCommand,
  getAdminConsoleEvaluationResult,
  getAdminQueueItem,
  listAdminCommands,
  listAdminQueueItems,
  resetAdminConsoleStoreForTests
} from "../admin-console-store";

describe("admin-console-store", () => {
  beforeEach(() => {
    resetAdminConsoleStoreForTests();
  });

  it("creates admin queue item", () => {
    const item = createAdminQueueItem({
      queueType: "safety",
      targetSystem: "content_safety",
      targetObjectId: crypto.randomUUID(),
      title: "Safety review needed",
      summary: "Content safety case needs operator attention.",
      priority: "high"
    });

    expect(item.status).toBe("open");

    const stored = getAdminQueueItem(item.adminQueueItemId);
    expect(stored?.adminQueueItemId).toBe(item.adminQueueItemId);
  });

  it("assigns queue item", () => {
    const item = createAdminQueueItem({
      queueType: "safety",
      targetSystem: "content_safety",
      targetObjectId: crypto.randomUUID(),
      title: "Safety review needed",
      summary: "Content safety case needs operator attention."
    });

    const assigned = assignAdminQueueItem({
      adminQueueItemId: item.adminQueueItemId,
      operatorUserId: crypto.randomUUID(),
      operatorRole: "safety_specialist"
    });

    expect(assigned.status).toBe("assigned");
    expect(assigned.assignedOperatorRole).toBe("safety_specialist");
  });

  it("creates admin command", () => {
    const command = createAdminCommand({
      operatorUserId: crypto.randomUUID(),
      operatorRole: "admin",
      permissionScope: "admin",
      commandType: "view",
      targetSystem: "review",
      targetObjectId: crypto.randomUUID(),
      commandReason: "Viewing case for admin triage."
    });

    expect(command.status).toBe("command_created");

    const stored = getAdminCommand(command.adminCommandId);
    expect(stored?.adminCommandId).toBe(command.adminCommandId);
  });

  it("approves command", () => {
    const command = createAdminCommand({
      operatorUserId: crypto.randomUUID(),
      operatorRole: "safety_specialist",
      permissionScope: "safety",
      commandType: "remove",
      targetSystem: "content_safety",
      targetObjectId: crypto.randomUUID(),
      commandReason: "Removing content after safety escalation.",
      twoPersonApprovalRequired: true
    });

    const approved = approveAdminCommand({
      adminCommandId: command.adminCommandId,
      approvedByUserId: crypto.randomUUID()
    });

    expect(approved.approvedByUserId).toBeTruthy();
  });

  it("evaluates stored admin command", () => {
    const item = createAdminQueueItem({
      queueType: "safety",
      targetSystem: "content_safety",
      targetObjectId: crypto.randomUUID(),
      title: "Safety restore",
      summary: "Restore content after review.",
      priority: "high"
    });

    const operatorUserId = crypto.randomUUID();

    const command = createAdminCommand({
      adminQueueItemId: item.adminQueueItemId,
      operatorUserId,
      operatorRole: "safety_specialist",
      permissionScope: "safety",
      commandType: "restore",
      targetSystem: "content_safety",
      targetObjectId: item.targetObjectId,
      commandReason: "Restoring content after successful appeal.",
      executionPayload: {
        exposureLevel: "public"
      },
      approvedByUserId: crypto.randomUUID()
    });

    const result = evaluateStoredAdminCommand({
      adminCommandId: command.adminCommandId,

      riskScore: 0.15,
      severityScore: 0.2,
      evidenceCompletenessScore: 0.9,
      privacySensitivityScore: 0.2,

      targetOwnerUserId: crypto.randomUUID(),

      operatorHasQueueAccess: true,
      operatorHasTargetAccess: true,
      operatorHasExportPermission: false,

      duplicateCommandCount: 0,
      recentFailedCommandCount: 0,

      executionRequested: true,
      cancelRequested: false
    });

    expect(result.status).toBe("admin_command_executed");

    const storedResult = getAdminConsoleEvaluationResult(command.adminCommandId);
    expect(storedResult?.status).toBe("admin_command_executed");

    const updatedCommand = getAdminCommand(command.adminCommandId);
    expect(updatedCommand?.status).toBe("command_executed");

    const updatedQueueItem = getAdminQueueItem(item.adminQueueItemId);
    expect(updatedQueueItem?.status).toBe("resolved");
  });

  it("lists queue items and commands", () => {
    const operatorUserId = crypto.randomUUID();

    createAdminQueueItem({
      queueType: "campaign",
      targetSystem: "campaign",
      targetObjectId: crypto.randomUUID(),
      title: "Campaign review",
      summary: "Campaign needs review."
    });

    createAdminCommand({
      operatorUserId,
      operatorRole: "reviewer",
      permissionScope: "review",
      commandType: "approve",
      targetSystem: "campaign",
      targetObjectId: crypto.randomUUID(),
      commandReason: "Approving campaign after review."
    });

    expect(listAdminQueueItems({ queueType: "campaign" })).toHaveLength(1);
    expect(listAdminCommands({ operatorUserId })).toHaveLength(1);
  });
});
