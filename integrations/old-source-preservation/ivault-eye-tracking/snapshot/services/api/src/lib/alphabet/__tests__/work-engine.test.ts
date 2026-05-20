import { describe, expect, it } from "vitest";
import { verifyWorkTask } from "../work-engine";
import type { WorkSignalInput } from "../../../types/alphabet/work.types";

function makeInput(overrides: Partial<WorkSignalInput> = {}): WorkSignalInput {
  return {
    workTaskId: crypto.randomUUID(),
    workerUserId: crypto.randomUUID(),
    clientUserId: crypto.randomUUID(),
    businessId: null,
    context: "marketplace_task",
    taskValue: 25,
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
    deviceIntegrityScore: 0.9,
    workerAgeBand: "18_plus",
    metadata: {},
    ...overrides
  };
}

describe("work-engine", () => {
  it("verifies clean work and exchange", () => {
    const result = verifyWorkTask(makeInput());

    expect(result.status).toBe("exchange_verified");
    expect(result.workScore).toBeGreaterThan(0.65);
    expect(result.exchangeScore).toBeGreaterThan(0.65);
    expect(result.workVerifiedEvent?.eventType).toBe("work_verified");
    expect(result.exchangeCompletedEvent?.eventType).toBe("exchange_completed");
  });

  it("rejects undelivered work", () => {
    const result = verifyWorkTask(
      makeInput({
        delivered: false
      })
    );

    expect(result.status).toBe("rejected");
    expect(result.reasons).toContain("work_not_delivered");
    expect(result.workVerifiedEvent).toBeNull();
  });

  it("needs review without client confirmation", () => {
    const result = verifyWorkTask(
      makeInput({
        clientConfirmed: false
      })
    );

    expect(result.status).toBe("completed_needs_review");
    expect(result.reasons).toContain("client_confirmation_required");
  });

  it("detects dispute", () => {
    const result = verifyWorkTask(
      makeInput({
        disputeStatus: "opened"
      })
    );

    expect(result.status).toBe("disputed");
    expect(result.disputeEvent?.eventType).toBe("work_dispute_opened");
  });

  it("rejects worker-fault dispute", () => {
    const result = verifyWorkTask(
      makeInput({
        disputeStatus: "worker_fault"
      })
    );

    expect(result.status).toBe("rejected");
    expect(result.reasons).toContain("work_dispute_worker_fault");
  });

  it("flags fraud as suspicious", () => {
    const result = verifyWorkTask(
      makeInput({
        fraudRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.fraudEvent?.eventType).toBe("work_fraud_detected");
  });

  it("flags collusion as suspicious", () => {
    const result = verifyWorkTask(
      makeInput({
        collusionRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("collusion_risk_above_maximum");
  });

  it("flags chargeback risk as suspicious", () => {
    const result = verifyWorkTask(
      makeInput({
        chargebackRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("chargeback_risk_above_maximum");
  });

  it("blocks under 13 marketplace work", () => {
    const result = verifyWorkTask(
      makeInput({
        workerAgeBand: "under_13",
        context: "marketplace_task"
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("under_13_worker_not_allowed_for_context");
  });

  it("allows under 13 learning task if clean", () => {
    const result = verifyWorkTask(
      makeInput({
        workerAgeBand: "under_13",
        context: "learning_task",
        taskValue: 0,
        clientConfirmed: false,
        paymentClean: true,
        escrowClean: true
      })
    );

    expect(["work_verified", "exchange_verified"]).toContain(result.status);
  });
});
