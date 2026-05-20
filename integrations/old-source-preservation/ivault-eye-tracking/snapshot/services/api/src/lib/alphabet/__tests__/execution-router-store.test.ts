import { beforeEach, describe, expect, it } from "vitest";
import {
  createExecutionRequest,
  evaluateStoredExecutionRequest,
  getExecutionEvaluationResult,
  getExecutionRequest,
  incrementExecutionRetry,
  listExecutionRequests,
  markExecutionResult,
  resetExecutionRouterStoreForTests
} from "../execution-router-store";

describe("execution-router-store", () => {
  beforeEach(() => {
    resetExecutionRouterStoreForTests();
  });

  it("creates execution request", () => {
    const request = createExecutionRequest({
      sourcePolicyDecisionId: crypto.randomUUID(),
      sourceEventIds: [crypto.randomUUID()],
      targetSystem: "wallet",
      targetObjectId: crypto.randomUUID(),
      action: "credit",
      idempotencyKey: crypto.randomUUID(),
      dedupeKey: crypto.randomUUID(),
      handlerName: "wallet.credit",
      payload: {
        amount: 10,
        coinCode: "I"
      }
    });

    expect(request.status).toBe("request_created");

    const stored = getExecutionRequest(request.executionRequestId);
    expect(stored?.executionRequestId).toBe(request.executionRequestId);
  });

  it("evaluates stored execution request", () => {
    const request = createExecutionRequest({
      sourcePolicyDecisionId: crypto.randomUUID(),
      targetSystem: "wallet",
      targetObjectId: crypto.randomUUID(),
      action: "credit",
      idempotencyKey: crypto.randomUUID(),
      handlerName: "wallet.credit",
      payload: {
        amount: 10,
        coinCode: "I"
      }
    });

    const result = evaluateStoredExecutionRequest({
      executionRequestId: request.executionRequestId,
      policyDecision: "allow",
      handlerAvailable: true,
      handlerHealthy: true,
      dispatchRequested: false,
      executionSucceeded: false,
      executionFailed: false,
      cancelRequested: false,
      requiresAudit: true,
      auditCreated: true,
      containsPaymentData: false,
      containsPrivateUserData: false,
      containsRawRiskData: false,
      riskScore: 0.01,
      paymentRisk: 0.01,
      privacyRisk: 0.01,
      complianceRisk: 0.01,
      handlerRisk: 0.01
    });

    expect(result.status).toBe("execution_allowed");

    const updated = getExecutionRequest(request.executionRequestId);
    expect(updated?.status).toBe("dispatch_allowed");

    const storedResult = getExecutionEvaluationResult(request.executionRequestId);
    expect(storedResult?.status).toBe("execution_allowed");
  });

  it("increments retry", () => {
    const request = createExecutionRequest({
      targetSystem: "notification",
      action: "notify",
      handlerName: "notification.send"
    });

    const updated = incrementExecutionRetry(request.executionRequestId);

    expect(updated.retryCount).toBe(1);
    expect(updated.status).toBe("queued");
  });

  it("marks execution result", () => {
    const request = createExecutionRequest({
      targetSystem: "notification",
      action: "notify",
      handlerName: "notification.send"
    });

    const updated = markExecutionResult({
      executionRequestId: request.executionRequestId,
      succeeded: true,
      resultPayload: {
        notificationId: "notification_1"
      }
    });

    expect(updated.status).toBe("executed");
    expect(updated.resultPayload?.notificationId).toBe("notification_1");
  });

  it("lists execution requests", () => {
    createExecutionRequest({
      targetSystem: "notification",
      action: "notify",
      handlerName: "notification.send"
    });

    expect(listExecutionRequests({ targetSystem: "notification" })).toHaveLength(1);
  });

  it("sanitizes payload on create", () => {
    const request = createExecutionRequest({
      targetSystem: "wallet",
      action: "credit",
      idempotencyKey: crypto.randomUUID(),
      handlerName: "wallet.credit",
      payload: {
        amount: 10,
        rawRiskScore: 0.99,
        bankToken: "secret"
      }
    });

    expect(request.sanitizedPayload).toEqual({
      amount: 10
    });
  });

  it("denies duplicate dedupe key", () => {
    const dedupeKey = "wallet-credit-1";

    createExecutionRequest({
      targetSystem: "wallet",
      action: "credit",
      idempotencyKey: crypto.randomUUID(),
      dedupeKey,
      handlerName: "wallet.credit"
    });

    const duplicate = createExecutionRequest({
      targetSystem: "wallet",
      action: "credit",
      idempotencyKey: crypto.randomUUID(),
      dedupeKey,
      handlerName: "wallet.credit"
    });

    const result = evaluateStoredExecutionRequest({
      executionRequestId: duplicate.executionRequestId,
      policyDecision: "allow",
      handlerAvailable: true,
      handlerHealthy: true,
      dispatchRequested: false,
      executionSucceeded: false,
      executionFailed: false,
      cancelRequested: false,
      requiresAudit: true,
      auditCreated: true,
      containsPaymentData: false,
      containsPrivateUserData: false,
      containsRawRiskData: false,
      riskScore: 0.01,
      paymentRisk: 0.01,
      privacyRisk: 0.01,
      complianceRisk: 0.01,
      handlerRisk: 0.01
    });

    expect(result.status).toBe("execution_denied");
  });
});
