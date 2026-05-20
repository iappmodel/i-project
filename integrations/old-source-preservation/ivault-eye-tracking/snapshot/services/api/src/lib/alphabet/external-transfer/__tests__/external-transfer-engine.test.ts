import { describe, expect, it } from "vitest";
import { evaluateExternalTransfer } from "../external-transfer-engine";
import type { ExternalTransferSignalInput } from "@/types/alphabet/external-transfer.types";

function risks() {
  return {
    transferEligibilityScore: 0.96,
    destinationConfidenceScore: 0.96,
    providerReadinessScore: 0.96,
    complianceScore: 0.96,
    transferFraudRisk: 0.02,
    reversalSafetyScore: 0.96
  };
}

function makeInput(overrides: Partial<ExternalTransferSignalInput> = {}): ExternalTransferSignalInput {
  return {
    externalTransferId: crypto.randomUUID(),
    transferType: "withdrawal_payout",
    provider: "mock",
    currentStatus: "transfer_created",

    userId: crypto.randomUUID(),
    walletId: crypto.randomUUID(),
    walletAccountId: crypto.randomUUID(),

    originalExecutionRequestId: crypto.randomUUID(),
    originalLedgerEntryId: crypto.randomUUID(),
    pipelineId: crypto.randomUUID(),
    sagaId: crypto.randomUUID(),

    amount: 25,
    coinCode: "I",
    fiatAmount: 25,
    fiatCurrency: "USD",

    providerTransferId: null,
    providerStatus: null,

    providerPayload: {},
    providerResponse: {},

    destinationType: "stored_payout_destination",
    destinationLabel: "Default payout destination",

    idempotencyKey: crypto.randomUUID(),
    dedupeKey: crypto.randomUUID(),

    sourceEventIds: [crypto.randomUUID()],

    riskScores: risks(),

    providerRequestCreated: true,
    providerRequestSent: false,
    providerPending: false,
    providerSucceeded: false,
    providerFailed: false,
    providerCanceled: false,
    providerUnknown: false,

    internalDebitExists: true,
    compensationAlreadyCreated: false,

    reviewApproved: true,
    cancelRequested: false,

    now: new Date().toISOString(),
    metadata: {},
    ...overrides
  };
}

describe("external-transfer-engine", () => {
  it("sends ready transfer to provider when review approved", () => {
    const result = evaluateExternalTransfer(makeInput());

    expect(result.status).toBe("transfer_send_to_provider");
    expect(result.sendToProvider).toBe(true);
  });

  it("requires review before provider send without approval", () => {
    const result = evaluateExternalTransfer(
      makeInput({
        reviewApproved: false
      })
    );

    expect(result.status).toBe("transfer_requires_review");
  });

  it("completes succeeded provider transfer", () => {
    const result = evaluateExternalTransfer(
      makeInput({
        providerRequestSent: true,
        providerSucceeded: true,
        providerTransferId: "provider_123",
        providerStatus: "succeeded"
      })
    );

    expect(result.status).toBe("transfer_completed");
    expect(result.completed).toBe(true);
  });

  it("requires compensation on confirmed provider failure after debit", () => {
    const result = evaluateExternalTransfer(
      makeInput({
        providerRequestSent: true,
        providerFailed: true,
        providerStatus: "failed"
      })
    );

    expect(result.status).toBe("transfer_compensation_required");
    expect(result.compensationSafeToCreate).toBe(true);
  });

  it("does not compensate unknown provider state", () => {
    const result = evaluateExternalTransfer(
      makeInput({
        providerRequestSent: true,
        providerUnknown: true,
        providerStatus: "unknown"
      })
    );

    expect(result.status).toBe("transfer_unknown");
    expect(result.compensationSafeToCreate).toBe(false);
  });

  it("blocks transfer without internal debit", () => {
    const result = evaluateExternalTransfer(
      makeInput({
        internalDebitExists: false
      })
    );

    expect(result.status).toBe("transfer_blocked");
  });

  it("blocks transfer without idempotency key", () => {
    const result = evaluateExternalTransfer(
      makeInput({
        idempotencyKey: null
      })
    );

    expect(result.status).toBe("transfer_blocked");
  });
});
