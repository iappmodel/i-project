import { describe, expect, it } from "vitest";
import { evaluateAdminCommand } from "../admin-console-engine";
import type { AdminConsoleSignalInput } from "../../../types/alphabet/admin-console.types";

function makeInput(overrides: Partial<AdminConsoleSignalInput> = {}): AdminConsoleSignalInput {
  return {
    adminCommandId: crypto.randomUUID(),
    adminQueueItemId: crypto.randomUUID(),
    queueType: "safety",
    operatorUserId: crypto.randomUUID(),
    operatorRole: "safety_specialist",
    permissionScope: "safety",
    commandType: "restore",
    currentCommandStatus: "command_created",
    targetSystem: "content_safety",
    targetObjectId: crypto.randomUUID(),
    commandReason: "Restoring content after valid safety review.",
    executionPayload: {
      exposureLevel: "public"
    },
    approvalRequired: false,
    twoPersonApprovalRequired: false,
    approvedByUserId: crypto.randomUUID(),
    sourceReviewCaseId: crypto.randomUUID(),
    sourceAuditId: null,
    sourceEventIds: [crypto.randomUUID()],
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
    executionRequested: false,
    cancelRequested: false,
    metadata: {},
    ...overrides
  };
}

describe("admin-console-engine", () => {
  it("allows safe specialist command with approval", () => {
    const result = evaluateAdminCommand(makeInput());

    expect(result.status).toBe("admin_command_allowed");
    expect(result.commandAllowed).toBe(true);
    expect(result.adminCommandAllowedEvent?.eventType).toBe("admin_command_allowed");
  });

  it("executes command when execution requested", () => {
    const result = evaluateAdminCommand(
      makeInput({
        executionRequested: true
      })
    );

    expect(result.status).toBe("admin_command_executed");
    expect(result.commandExecuted).toBe(true);
    expect(result.executionInstructions.length).toBeGreaterThan(0);
    expect(result.adminCommandExecutedEvent?.eventType).toBe("admin_command_executed");
  });

  it("denies viewer mutation", () => {
    const result = evaluateAdminCommand(
      makeInput({
        operatorRole: "viewer",
        permissionScope: "read_only",
        commandType: "remove"
      })
    );

    expect(result.status).toBe("admin_command_denied");
    expect(result.reasons).toContain("viewer_cannot_execute_mutation");
  });

  it("requires two person approval for dangerous command", () => {
    const result = evaluateAdminCommand(
      makeInput({
        commandType: "remove",
        approvedByUserId: null
      })
    );

    expect(result.status).toBe("admin_command_requires_approval");
    expect(result.twoPersonApprovalRequired).toBe(true);
    expect(result.reasons).toContain("two_person_approval_required");
  });

  it("denies export without admin role", () => {
    const result = evaluateAdminCommand(
      makeInput({
        commandType: "export",
        operatorRole: "safety_specialist",
        permissionScope: "safety",
        operatorHasExportPermission: true
      })
    );

    expect(result.status).toBe("admin_command_denied");
    expect(result.reasons).toContain("export_requires_admin_role");
  });

  it("allows admin export when privacy is low", () => {
    const result = evaluateAdminCommand(
      makeInput({
        commandType: "export",
        operatorRole: "admin",
        permissionScope: "admin",
        operatorHasExportPermission: true,
        privacySensitivityScore: 0.1,
        riskScore: 0.05,
        severityScore: 0.05,
        approvalRequired: false,
        twoPersonApprovalRequired: false,
        approvedByUserId: null
      })
    );

    expect(["admin_command_allowed", "admin_command_executed"]).toContain(result.status);
  });

  it("requires approval when evidence is weak", () => {
    const result = evaluateAdminCommand(
      makeInput({
        evidenceCompletenessScore: 0.2
      })
    );

    expect(result.status).toBe("admin_command_requires_approval");
    expect(result.reasons).toContain("evidence_completeness_below_mutation_minimum");
  });

  it("denies missing target access", () => {
    const result = evaluateAdminCommand(
      makeInput({
        operatorHasTargetAccess: false
      })
    );

    expect(result.status).toBe("admin_command_denied");
    expect(result.reasons).toContain("operator_missing_target_access");
  });

  it("fails canceled command", () => {
    const result = evaluateAdminCommand(
      makeInput({
        cancelRequested: true
      })
    );

    expect(result.status).toBe("admin_command_failed");
  });
});
