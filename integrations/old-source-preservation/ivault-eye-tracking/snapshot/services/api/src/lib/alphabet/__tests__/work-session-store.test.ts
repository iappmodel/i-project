import { beforeEach, describe, expect, it } from "vitest";
import {
  acceptWorkTask,
  createWorkTask,
  getWorkTask,
  getWorkVerificationResult,
  markWorkDelivered,
  resetWorkTaskStoreForTests,
  verifyStoredWorkTask
} from "../work-session-store";

describe("work-session-store", () => {
  beforeEach(() => {
    resetWorkTaskStoreForTests();
  });

  it("creates work task", () => {
    const task = createWorkTask({
      workerUserId: crypto.randomUUID(),
      clientUserId: crypto.randomUUID(),
      context: "marketplace_task",
      taskValue: 25,
      workerAgeBand: "18_plus"
    });

    expect(task.status).toBe("created");

    const stored = getWorkTask(task.workTaskId);
    expect(stored?.workTaskId).toBe(task.workTaskId);
  });

  it("accepts work task", () => {
    const task = createWorkTask({
      workerUserId: crypto.randomUUID(),
      clientUserId: crypto.randomUUID(),
      context: "marketplace_task",
      taskValue: 25,
      workerAgeBand: "18_plus"
    });

    const accepted = acceptWorkTask(task.workTaskId);

    expect(accepted.status).toBe("accepted");
    expect(accepted.acceptedAt).toBeTruthy();
  });

  it("marks work delivered", () => {
    const task = createWorkTask({
      workerUserId: crypto.randomUUID(),
      clientUserId: crypto.randomUUID(),
      context: "marketplace_task",
      taskValue: 25,
      workerAgeBand: "18_plus"
    });

    acceptWorkTask(task.workTaskId);

    const delivered = markWorkDelivered(task.workTaskId);

    expect(delivered.status).toBe("delivered");
    expect(delivered.deliveredAt).toBeTruthy();
  });

  it("verifies stored work task", () => {
    const task = createWorkTask({
      workerUserId: crypto.randomUUID(),
      clientUserId: crypto.randomUUID(),
      context: "marketplace_task",
      taskValue: 25,
      workerAgeBand: "18_plus"
    });

    acceptWorkTask(task.workTaskId);
    markWorkDelivered(task.workTaskId);

    const result = verifyStoredWorkTask({
      workTaskId: task.workTaskId,
      delivered: true,
      clientConfirmed: true,
      deliveryDurationMs: 20 * 60 * 1000,
      clientSatisfactionScore: 0.88,
      deliveryQualityScore: 0.86,
      requirementMatchScore: 0.9,
      timelinessScore: 0.85,
      revisionScore: 0.8,
      independentVerificationScore: 0.75,
      systemValidationScore: 0.8,
      disputeStatus: "none",
      escrowClean: true,
      paymentClean: true,
      fraudRisk: 0.03,
      taskFarmingRisk: 0.03,
      collusionRisk: 0.03,
      chargebackRisk: 0.02,
      refundAbuseRisk: 0.02,
      deviceIntegrityScore: 0.9
    });

    expect(result.status).toBe("exchange_verified");

    const stored = getWorkVerificationResult(task.workTaskId);
    expect(stored?.status).toBe("exchange_verified");

    const updatedTask = getWorkTask(task.workTaskId);
    expect(updatedTask?.status).toBe("exchange_verified");
  });
});
