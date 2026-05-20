import { beforeEach, describe, expect, it } from "vitest";
import {
  attachSagaObjectIds,
  createSagaRecord,
  createSagaStep,
  evaluateStoredSaga,
  getSagaEvaluationResult,
  getSagaRecord,
  listSagaRecords,
  resetSagaStoreForTests,
  startSaga,
  updateSagaStepStatus
} from "../saga-store";

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

describe("saga-store", () => {
  beforeEach(() => {
    resetSagaStoreForTests();
  });

  function createBaseSaga() {
    return createSagaRecord({
      sagaType: "wallet_credit",
      userId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      policyDecisionId: crypto.randomUUID(),
      executionRequestIds: [crypto.randomUUID()],
      handlerDefinitionIds: [crypto.randomUUID()],
      auditRecordIds: [crypto.randomUUID()],
      notificationIds: [crypto.randomUUID()],
      sourceEventIds: [crypto.randomUUID()],
      steps: [
        createSagaStep({ stepType: "policy", label: "Policy", status: "passed" }),
        createSagaStep({ stepType: "execution", label: "Execution", status: "passed" }),
        createSagaStep({
          stepType: "handler_validation",
          label: "Handler",
          status: "passed"
        }),
        createSagaStep({ stepType: "audit", label: "Audit", status: "passed" }),
        createSagaStep({ stepType: "notification", label: "Notification", status: "passed" }),
        createSagaStep({ stepType: "finalization", label: "Finalization", status: "passed" })
      ],
      idempotencyKey: crypto.randomUUID()
    });
  }

  it("creates saga record", () => {
    const saga = createBaseSaga();

    expect(saga.status).toBe("saga_created");

    const stored = getSagaRecord(saga.sagaId);
    expect(stored?.sagaId).toBe(saga.sagaId);
  });

  it("starts saga", () => {
    const saga = createBaseSaga();
    const started = startSaga(saga.sagaId);

    expect(started.status).toBe("saga_started");
    expect(started.startedAt).toBeTruthy();
  });

  it("updates saga step status", () => {
    const saga = createBaseSaga();
    const sagaStep = saga.steps[0];
    if (!sagaStep) throw new Error("Expected saga step to exist.");

    const updated = updateSagaStepStatus({
      sagaId: saga.sagaId,
      sagaStepId: sagaStep.sagaStepId,
      status: "running"
    });

    expect(updated.steps[0]?.status).toBe("running");
  });

  it("attaches object ids", () => {
    const saga = createBaseSaga();
    const policyDecisionId = crypto.randomUUID();

    const updated = attachSagaObjectIds({
      sagaId: saga.sagaId,
      policyDecisionId
    });

    expect(updated.policyDecisionId).toBe(policyDecisionId);
  });

  it("evaluates stored saga completed", () => {
    const saga = createBaseSaga();

    const result = evaluateStoredSaga({
      sagaId: saga.sagaId,
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
      compensationCompleted: false
    });

    expect(result.status).toBe("saga_completed");

    const updated = getSagaRecord(saga.sagaId);
    expect(updated?.status).toBe("saga_completed");

    const storedResult = getSagaEvaluationResult(saga.sagaId);
    expect(storedResult?.status).toBe("saga_completed");
  });

  it("lists saga records", () => {
    const saga = createBaseSaga();

    expect(listSagaRecords({ userId: saga.userId })).toHaveLength(1);
    expect(listSagaRecords({ sagaType: "wallet_credit" })).toHaveLength(1);
  });

  it("marks failed saga", () => {
    const saga = createBaseSaga();

    const result = evaluateStoredSaga({
      sagaId: saga.sagaId,
      riskSignals: lowRisk(),
      policyPassed: false,
      policyFailed: true,
      executionDispatched: false,
      executionCompleted: false,
      executionFailed: false,
      handlerValidationPassed: false,
      handlerValidationFailed: false,
      auditCompleted: false,
      notificationCompleted: false,
      cancelRequested: false,
      compensationRequested: false,
      compensationCompleted: false
    });

    expect(result.status).toBe("saga_failed");

    const updated = getSagaRecord(saga.sagaId);
    expect(updated?.status).toBe("saga_failed");
  });
});
