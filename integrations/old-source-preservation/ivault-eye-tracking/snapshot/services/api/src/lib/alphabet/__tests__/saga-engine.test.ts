import { describe, expect, it } from "vitest";
import type { SagaSignalInput, SagaStep } from "../../../types/alphabet/saga.types";
import { evaluateSaga } from "../saga-engine";

function step(
  stepType: SagaStep["stepType"],
  status: SagaStep["status"] = "passed",
  overrides: Partial<SagaStep> = {}
): SagaStep {
  return {
    sagaStepId: crypto.randomUUID(),
    stepType,
    status,
    label: `${stepType} step`,
    sourceObjectId: crypto.randomUUID(),
    sourceEventId: crypto.randomUUID(),
    dependsOnStepIds: [],
    retryCount: 0,
    maxRetries: 3,
    compensationRequired: false,
    compensationAction: null,
    startedAt: null,
    completedAt: status === "passed" ? new Date().toISOString() : null,
    failedAt: status === "failed" ? new Date().toISOString() : null,
    metadata: {},
    ...overrides
  };
}

function lowRisk() {
  return {
    sagaRisk: 0.01,
    policyRisk: 0.01,
    executionRisk: 0.01,
    handlerRisk: 0.01,
    auditRisk: 0.01,
    notificationRisk: 0.01
  };
}

function makeInput(overrides: Partial<SagaSignalInput> = {}): SagaSignalInput {
  return {
    sagaId: crypto.randomUUID(),
    sagaType: "wallet_credit",
    currentStatus: "saga_started",
    userId: crypto.randomUUID(),
    creatorId: null,
    businessId: null,
    walletId: crypto.randomUUID(),
    contentId: null,
    campaignId: null,
    grantEligibilityId: null,
    sourceActionIntentId: crypto.randomUUID(),
    policyDecisionId: crypto.randomUUID(),
    executionRequestIds: [crypto.randomUUID()],
    handlerDefinitionIds: [crypto.randomUUID()],
    auditRecordIds: [crypto.randomUUID()],
    notificationIds: [crypto.randomUUID()],
    sourceEventIds: [crypto.randomUUID()],
    steps: [
      step("policy"),
      step("execution"),
      step("handler_validation"),
      step("audit"),
      step("notification"),
      step("finalization")
    ],
    idempotencyKey: crypto.randomUUID(),
    timeoutDeadline: new Date(Date.now() + 60_000).toISOString(),
    now: new Date().toISOString(),
    riskSignals: lowRisk(),
    policyPassed: true,
    policyFailed: false,
    executionDispatched: true,
    executionCompleted: true,
    executionFailed: false,
    handlerValidationPassed: true,
    handlerValidationFailed: false,
    auditCompleted: true,
    notificationCompleted: true,
    cancelRequested: false,
    compensationRequested: false,
    compensationCompleted: false,
    metadata: {},
    ...overrides
  };
}

describe("saga-engine", () => {
  it("completes clean wallet credit saga", () => {
    const result = evaluateSaga(makeInput());

    expect(result.status).toBe("saga_completed");
    expect(result.completed).toBe(true);
    expect(result.sagaCompletedEvent?.eventType).toBe("saga_completed");
    expect(result.finalizationOutput).toBeTruthy();
  });

  it("fails when policy fails", () => {
    const result = evaluateSaga(
      makeInput({
        policyPassed: false,
        policyFailed: true
      })
    );

    expect(result.status).toBe("saga_failed");
    expect(result.reasons).toContain("saga_policy_failed");
  });

  it("requires compensation for failed money execution", () => {
    const result = evaluateSaga(
      makeInput({
        executionCompleted: false,
        executionFailed: true
      })
    );

    expect(result.status).toBe("saga_compensation_required");
    expect(result.compensationRequired).toBe(true);
  });

  it("blocks when required step type is missing", () => {
    const result = evaluateSaga(
      makeInput({
        steps: [step("policy"), step("execution")]
      })
    );

    expect(result.status).toBe("saga_blocked");
    expect(result.reasons).toContain("saga_missing_required_step_types");
  });

  it("returns ready when pending dependency-free step exists", () => {
    const pending = step("notification", "pending");

    const result = evaluateSaga(
      makeInput({
        steps: [
          step("policy"),
          step("execution"),
          step("handler_validation"),
          step("audit"),
          pending,
          step("finalization", "pending", {
            dependsOnStepIds: [pending.sagaStepId]
          })
        ],
        notificationCompleted: false
      })
    );

    expect(result.status).toBe("saga_ready");
    expect(result.nextRunnableSteps[0]?.stepType).toBe("notification");
  });

  it("waits when pending steps are dependency-blocked", () => {
    const dependency = step("notification", "running");
    const finalization = step("finalization", "pending", {
      dependsOnStepIds: [dependency.sagaStepId]
    });

    const result = evaluateSaga(
      makeInput({
        steps: [
          step("policy"),
          step("execution"),
          step("handler_validation"),
          step("audit"),
          dependency,
          finalization
        ],
        notificationCompleted: false
      })
    );

    expect(["saga_ready", "saga_waiting"]).toContain(result.status);
  });

  it("cancels saga", () => {
    const result = evaluateSaga(
      makeInput({
        cancelRequested: true
      })
    );

    expect(result.status).toBe("saga_canceled");
    expect(result.canceled).toBe(true);
  });

  it("marks compensated", () => {
    const result = evaluateSaga(
      makeInput({
        compensationCompleted: true
      })
    );

    expect(result.status).toBe("saga_compensated");
    expect(result.compensated).toBe(true);
  });

  it("requires review when timed out", () => {
    const result = evaluateSaga(
      makeInput({
        timeoutDeadline: new Date(Date.now() - 60_000).toISOString()
      })
    );

    expect(["saga_requires_review", "saga_failed"]).toContain(result.status);
  });
});
