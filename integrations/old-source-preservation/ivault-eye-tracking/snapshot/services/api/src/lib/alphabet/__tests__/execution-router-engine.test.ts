import { describe, expect, it } from "vitest";
import {
  evaluateExecutionRequest,
  sanitizeExecutionPayload
} from "../execution-router-engine";
import type { ExecutionRouterSignalInput } from "../../../types/alphabet/execution-router.types";

function makeInput(
  overrides: Partial<ExecutionRouterSignalInput> = {}
): ExecutionRouterSignalInput {
  return {
    executionRequestId: crypto.randomUUID(),
    sourcePolicyDecisionId: crypto.randomUUID(),
    sourceEventIds: [crypto.randomUUID()],
    targetSystem: "wallet",
    targetObjectId: crypto.randomUUID(),
    action: "credit",
    currentStatus: "request_created",
    priority: "normal",
    policyDecision: "allow",
    idempotencyKey: crypto.randomUUID(),
    dedupeKey: crypto.randomUUID(),
    duplicateRequestCount: 0,
    retryCount: 0,
    maxRetries: 2,
    handlerName: "wallet.credit",
    handlerVersion: "v1",
    handlerAvailable: true,
    handlerHealthy: true,
    payload: {
      amount: 10,
      coinCode: "I"
    },
    sanitizedPayload: {
      amount: 10,
      coinCode: "I"
    },
    resultPayload: null,
    dispatchRequested: false,
    executionSucceeded: false,
    executionFailed: false,
    cancelRequested: false,
    requiresAudit: true,
    auditCreated: true,
    containsRestrictedPayloadKeys: false,
    containsPaymentData: false,
    containsPrivateUserData: false,
    containsRawRiskData: false,
    riskScore: 0.01,
    paymentRisk: 0.01,
    privacyRisk: 0.01,
    complianceRisk: 0.01,
    handlerRisk: 0.01,
    metadata: {},
    ...overrides
  };
}

describe("execution-router-engine", () => {
  it("allows safe wallet credit execution", () => {
    const result = evaluateExecutionRequest(makeInput());

    expect(result.status).toBe("execution_allowed");
    expect(result.dispatchAllowed).toBe(true);
    expect(result.executionAllowedEvent?.eventType).toBe("execution_allowed");
  });

  it("dispatches when dispatch requested", () => {
    const result = evaluateExecutionRequest(
      makeInput({
        dispatchRequested: true
      })
    );

    expect(result.status).toBe("execution_dispatched");
    expect(result.dispatched).toBe(true);
    expect(result.executionDispatchedEvent?.eventType).toBe("execution_dispatched");
  });

  it("completes when execution succeeded", () => {
    const result = evaluateExecutionRequest(
      makeInput({
        executionSucceeded: true,
        resultPayload: {
          ledgerEntryId: "ledger_1"
        }
      })
    );

    expect(result.status).toBe("execution_completed");
    expect(result.completed).toBe(true);
    expect(result.executionCompletedEvent?.eventType).toBe("execution_completed");
  });

  it("denies mutation when policy blocks", () => {
    const result = evaluateExecutionRequest(
      makeInput({
        policyDecision: "block"
      })
    );

    expect(result.status).toBe("execution_denied");
    expect(result.reasons).toContain("mutation_not_allowed_without_policy_allow");
  });

  it("denies money action without idempotency", () => {
    const result = evaluateExecutionRequest(
      makeInput({
        idempotencyKey: null
      })
    );

    expect(result.status).toBe("execution_denied");
    expect(result.reasons).toContain("idempotency_key_required");
  });

  it("requires review when audit missing for dangerous action", () => {
    const result = evaluateExecutionRequest(
      makeInput({
        auditCreated: false
      })
    );

    expect(result.status).toBe("execution_requires_review");
    expect(result.reasons).toContain("audit_required_for_dangerous_execution");
  });

  it("requires review when handler unhealthy", () => {
    const result = evaluateExecutionRequest(
      makeInput({
        handlerHealthy: false
      })
    );

    expect(result.status).toBe("execution_requires_review");
    expect(result.reasons).toContain("handler_readiness_below_minimum");
  });

  it("fails after retry limit", () => {
    const result = evaluateExecutionRequest(
      makeInput({
        retryCount: 2,
        maxRetries: 2
      })
    );

    expect(result.status).toBe("execution_failed");
    expect(result.reasons).toContain("retry_safety_below_minimum");
  });

  it("sanitizes restricted payload keys", () => {
    const sanitized = sanitizeExecutionPayload({
      amount: 10,
      rawRiskScore: 0.9,
      nested: {
        bankToken: "secret",
        ok: true
      }
    });

    expect(sanitized).toEqual({
      amount: 10,
      nested: {
        ok: true
      }
    });
  });
});
