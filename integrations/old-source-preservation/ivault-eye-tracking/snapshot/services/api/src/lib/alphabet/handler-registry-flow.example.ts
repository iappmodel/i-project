import {
  evaluateStoredHandler,
  findHandlerDefinition,
  registerHandlerDefinition
} from "./handler-registry-store";
import {
  createExecutionRequest,
  evaluateStoredExecutionRequest
} from "./execution-router-store";
import {
  createTrustEventFromHandlerResult,
  createUValueEventFromHandlerResult
} from "./handler-registry-event-factory";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore
} from "./trust-store";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";

registerHandlerDefinition({
  handlerName: "wallet.credit",
  handlerVersion: "v1",
  targetSystem: "wallet",
  action: "credit",
  permissionLevel: "financial",
  riskClass: "high",
  runtimeMode: "queue",
  idempotencyRequired: true,
  auditRequired: true,
  retrySupported: true,
  timeoutMs: 30_000,
  ownerTeam: "wallet",
  schema: {
    requiredPayloadKeys: ["walletId", "userId", "coinCode", "amount"],
    optionalPayloadKeys: ["reasonCode", "metadata"],
    forbiddenPayloadKeys: ["rawRiskScore", "bankToken", "paymentToken"],
    requiredResultKeys: ["ledgerEntryId", "balanceAfter"],
    optionalResultKeys: ["metadata"]
  }
});

const handler = findHandlerDefinition({
  targetSystem: "wallet",
  action: "credit"
});

if (!handler) {
  throw new Error("No handler found.");
}

const executionRequest = createExecutionRequest({
  sourcePolicyDecisionId: crypto.randomUUID(),
  sourceEventIds: [crypto.randomUUID()],
  targetSystem: "wallet",
  targetObjectId: "wallet_1",
  action: "credit",
  priority: "high",
  idempotencyKey: "wallet-credit-policy-1",
  dedupeKey: "wallet-credit-policy-1",
  handlerName: handler.handlerName,
  handlerVersion: handler.handlerVersion,
  payload: {
    walletId: "wallet_1",
    userId: "user_1",
    coinCode: "I",
    amount: 10,
    reasonCode: "reward_credit",
    rawRiskScore: 0.9
  }
});

const handlerPayloadResult = evaluateStoredHandler({
  handlerDefinitionId: handler.handlerDefinitionId,
  idempotencyKey: executionRequest.idempotencyKey,
  auditCreated: true,
  retryCount: executionRequest.retryCount,
  executionPayload: executionRequest.sanitizedPayload,
  executionResult: null,
  allowDeprecated: false,
  validationMode: "payload",
  handlerReferencedByExecutionRequestId: executionRequest.executionRequestId,
  sourceEventIds: executionRequest.sourceEventIds
});

if (!handlerPayloadResult.payloadValid) {
  throw new Error("Handler payload invalid.");
}

const executionResult = evaluateStoredExecutionRequest({
  executionRequestId: executionRequest.executionRequestId,
  policyDecision: "allow",
  handlerAvailable: handlerPayloadResult.available || handlerPayloadResult.payloadValid,
  handlerHealthy: handler.health === "healthy",
  dispatchRequested: true,
  executionSucceeded: false,
  executionFailed: false,
  cancelRequested: false,
  requiresAudit: true,
  auditCreated: true,
  containsPaymentData: false,
  containsPrivateUserData: true,
  containsRawRiskData: false,
  riskScore: 0.02,
  paymentRisk: 0.02,
  privacyRisk: 0.05,
  complianceRisk: 0.02,
  handlerRisk: handlerPayloadResult.handlerRiskScore
});

const trustEvent = createTrustEventFromHandlerResult(handlerPayloadResult);
if (trustEvent) applyTrustImpactEventToUser(trustEvent);

const uValueEvent = createUValueEventFromHandlerResult(handlerPayloadResult);
if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

console.log("Handler payload:");
console.log(JSON.stringify(handlerPayloadResult, null, 2));

console.log("Execution dispatch:");
console.log(JSON.stringify(executionResult, null, 2));

console.log("System Trust:");
console.log(JSON.stringify(getOrCreateTrustScore("system"), null, 2));

console.log("System U Value:");
console.log(JSON.stringify(getOrCreateUValueState("system"), null, 2));
