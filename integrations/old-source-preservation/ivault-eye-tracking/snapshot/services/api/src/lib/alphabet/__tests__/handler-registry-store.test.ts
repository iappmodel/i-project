import { beforeEach, describe, expect, it } from "vitest";
import {
  deprecateHandler,
  disableHandler,
  evaluateStoredHandler,
  findHandlerByName,
  findHandlerDefinition,
  getHandlerDefinition,
  getHandlerEvaluationResult,
  listHandlerDefinitions,
  registerHandlerDefinition,
  resetHandlerRegistryStoreForTests,
  updateHandlerHealth
} from "../handler-registry-store";

describe("handler-registry-store", () => {
  beforeEach(() => {
    resetHandlerRegistryStoreForTests();
  });

  function registerWalletCredit() {
    return registerHandlerDefinition({
      handlerName: "wallet.credit",
      handlerVersion: "v1",
      targetSystem: "wallet",
      action: "credit",
      permissionLevel: "financial",
      riskClass: "high",
      idempotencyRequired: true,
      auditRequired: true,
      ownerTeam: "wallet",
      schema: {
        requiredPayloadKeys: ["walletId", "userId", "coinCode", "amount"],
        optionalPayloadKeys: ["reasonCode"],
        forbiddenPayloadKeys: ["rawRiskScore", "bankToken"],
        requiredResultKeys: ["ledgerEntryId", "balanceAfter"],
        optionalResultKeys: ["metadata"]
      }
    });
  }

  it("registers handler definition", () => {
    const handler = registerWalletCredit();
    expect(handler.status).toBe("active");
    const stored = getHandlerDefinition(handler.handlerDefinitionId);
    expect(stored?.handlerDefinitionId).toBe(handler.handlerDefinitionId);
  });

  it("finds handler by target/action", () => {
    const handler = registerWalletCredit();
    const found = findHandlerDefinition({
      targetSystem: "wallet",
      action: "credit"
    });
    expect(found?.handlerDefinitionId).toBe(handler.handlerDefinitionId);
  });

  it("finds handler by name", () => {
    const handler = registerWalletCredit();
    const found = findHandlerByName({
      handlerName: "wallet.credit"
    });
    expect(found?.handlerDefinitionId).toBe(handler.handlerDefinitionId);
  });

  it("updates handler health", () => {
    const handler = registerWalletCredit();
    const updated = updateHandlerHealth({
      handlerDefinitionId: handler.handlerDefinitionId,
      health: "degraded"
    });
    expect(updated.health).toBe("degraded");
  });

  it("deprecates and disables handler", () => {
    const handler = registerWalletCredit();
    const deprecated = deprecateHandler(handler.handlerDefinitionId);
    expect(deprecated.status).toBe("deprecated");
    const disabled = disableHandler(handler.handlerDefinitionId);
    expect(disabled.status).toBe("disabled");
  });

  it("evaluates stored handler payload", () => {
    const handler = registerWalletCredit();
    const result = evaluateStoredHandler({
      handlerDefinitionId: handler.handlerDefinitionId,
      idempotencyKey: crypto.randomUUID(),
      auditCreated: true,
      retryCount: 0,
      executionPayload: {
        walletId: "wallet_1",
        userId: "user_1",
        coinCode: "I",
        amount: 10
      },
      executionResult: null,
      allowDeprecated: false,
      validationMode: "payload",
      handlerReferencedByExecutionRequestId: crypto.randomUUID(),
      sourceEventIds: [crypto.randomUUID()]
    });

    expect(result.status).toBe("payload_valid");
    const storedResult = getHandlerEvaluationResult(handler.handlerDefinitionId);
    expect(storedResult?.status).toBe("payload_valid");
  });

  it("evaluates stored handler result", () => {
    const handler = registerWalletCredit();
    const result = evaluateStoredHandler({
      handlerDefinitionId: handler.handlerDefinitionId,
      idempotencyKey: crypto.randomUUID(),
      auditCreated: true,
      retryCount: 0,
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
      validationMode: "result",
      sourceEventIds: []
    });

    expect(result.status).toBe("result_valid");
  });

  it("lists handler definitions", () => {
    registerWalletCredit();
    expect(listHandlerDefinitions({ targetSystem: "wallet" })).toHaveLength(1);
    expect(listHandlerDefinitions({ permissionLevel: "financial" })).toHaveLength(1);
  });
});
