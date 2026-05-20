import { describe, expect, it } from "vitest";
import { evaluateHandlerRegistry } from "../handler-registry-engine";
import type { HandlerRegistrySignalInput } from "../../../types/alphabet/handler-registry.types";

function makeInput(
  overrides: Partial<HandlerRegistrySignalInput> = {}
): HandlerRegistrySignalInput {
  return {
    handlerDefinitionId: crypto.randomUUID(),
    handlerName: "wallet.credit",
    handlerVersion: "v1",
    targetSystem: "wallet",
    action: "credit",
    status: "active",
    health: "healthy",
    runtimeMode: "queue",
    permissionLevel: "financial",
    riskClass: "high",
    schema: {
      requiredPayloadKeys: ["walletId", "userId", "coinCode", "amount"],
      optionalPayloadKeys: ["reasonCode", "metadata"],
      forbiddenPayloadKeys: ["bankToken", "rawRiskScore"],
      requiredResultKeys: ["ledgerEntryId", "balanceAfter"],
      optionalResultKeys: ["metadata"]
    },
    idempotencyRequired: true,
    idempotencyKey: crypto.randomUUID(),
    auditRequired: true,
    auditCreated: true,
    retrySupported: true,
    retryCount: 0,
    timeoutMs: 30_000,
    ownerTeam: "wallet",
    executionPayload: {
      walletId: "wallet_1",
      userId: "user_1",
      coinCode: "I",
      amount: 10
    },
    executionResult: {
      ledgerEntryId: "ledger_1",
      balanceAfter: 110
    },
    allowDeprecated: false,
    validationMode: "payload",
    handlerReferencedByExecutionRequestId: crypto.randomUUID(),
    sourceEventIds: [crypto.randomUUID()],
    metadata: {},
    ...overrides
  };
}

describe("handler-registry-engine", () => {
  it("validates clean payload", () => {
    const result = evaluateHandlerRegistry(makeInput());
    expect(result.status).toBe("payload_valid");
    expect(result.payloadValid).toBe(true);
    expect(result.handlerPayloadValidEvent?.eventType).toBe("handler_payload_valid");
  });

  it("validates clean result", () => {
    const result = evaluateHandlerRegistry(
      makeInput({
        validationMode: "result"
      })
    );
    expect(result.status).toBe("result_valid");
    expect(result.resultValid).toBe(true);
    expect(result.handlerResultValidEvent?.eventType).toBe("handler_result_valid");
  });

  it("rejects missing required payload key", () => {
    const result = evaluateHandlerRegistry(
      makeInput({
        executionPayload: {
          walletId: "wallet_1",
          userId: "user_1",
          coinCode: "I"
        }
      })
    );
    expect(result.status).toBe("payload_invalid");
    expect(result.missingRequiredPayloadKeys).toContain("amount");
  });

  it("rejects forbidden payload key", () => {
    const result = evaluateHandlerRegistry(
      makeInput({
        executionPayload: {
          walletId: "wallet_1",
          userId: "user_1",
          coinCode: "I",
          amount: 10,
          rawRiskScore: 0.9
        }
      })
    );
    expect(result.status).toBe("payload_invalid");
    expect(result.forbiddenPayloadKeysFound).toContain("rawRiskScore");
    expect(result.safePayload).toEqual({
      walletId: "wallet_1",
      userId: "user_1",
      coinCode: "I",
      amount: 10
    });
  });

  it("rejects missing required result key", () => {
    const result = evaluateHandlerRegistry(
      makeInput({
        validationMode: "result",
        executionResult: {
          ledgerEntryId: "ledger_1"
        }
      })
    );
    expect(result.status).toBe("result_invalid");
    expect(result.missingRequiredResultKeys).toContain("balanceAfter");
  });

  it("marks deprecated handler when not explicitly allowed", () => {
    const result = evaluateHandlerRegistry(
      makeInput({
        status: "deprecated",
        allowDeprecated: false
      })
    );
    expect(result.status).toBe("handler_deprecated");
  });

  it("allows deprecated handler only with explicit flag if otherwise safe", () => {
    const result = evaluateHandlerRegistry(
      makeInput({
        status: "deprecated",
        allowDeprecated: true,
        permissionLevel: "internal",
        riskClass: "medium"
      })
    );
    expect(["payload_valid", "handler_requires_review", "handler_unavailable"]).toContain(result.status);
  });

  it("disables disabled handler", () => {
    const result = evaluateHandlerRegistry(
      makeInput({
        status: "disabled"
      })
    );
    expect(result.status).toBe("handler_disabled");
    expect(result.disabled).toBe(true);
  });

  it("requires review when audit missing for financial handler", () => {
    const result = evaluateHandlerRegistry(
      makeInput({
        auditRequired: true,
        auditCreated: false
      })
    );
    expect(result.status).toBe("handler_requires_review");
    expect(result.reasons).toContain("handler_audit_required");
  });

  it("requires review when idempotency missing for financial handler", () => {
    const result = evaluateHandlerRegistry(
      makeInput({
        idempotencyRequired: true,
        idempotencyKey: null
      })
    );
    expect(result.status).toBe("handler_requires_review");
    expect(result.reasons).toContain("handler_idempotency_key_required");
  });
});
