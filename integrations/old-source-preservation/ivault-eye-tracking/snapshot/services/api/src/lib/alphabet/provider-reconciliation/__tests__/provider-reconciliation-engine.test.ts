import { describe, expect, it } from "vitest";
import { evaluateProviderReconciliation } from "../provider-reconciliation-engine";
import type { ProviderReconciliationSignalInput } from "@/types/alphabet/provider-reconciliation.types";

function risks() {
  return {
    sourceTrustScore: 0.96,
    signatureConfidenceScore: 1,
    transferMatchScore: 0.96,
    statusConfidenceScore: 0.96,
    replayRiskScore: 0.02,
    compensationTriggerSafetyScore: 0.96
  };
}

function makeInput(
  overrides: Partial<ProviderReconciliationSignalInput> = {}
): ProviderReconciliationSignalInput {
  return {
    reconciliationId: crypto.randomUUID(),
    reconciliationSource: "webhook",
    provider: "mock",
    normalizedProviderStatus: "provider_succeeded",
    currentReconciliationStatus: "reconciliation_received",

    externalTransferId: crypto.randomUUID(),
    providerTransferId: "provider_123",

    providerEventId: "event_123",
    providerRawEventType: "transfer.succeeded",

    providerRawPayload: {},
    sanitizedProviderPayload: {},

    signatureVerified: true,
    signatureConfidenceScore: 1,

    idempotencyKey: "idem_1",
    dedupeKey: "dedupe_1",

    sourceEventIds: [crypto.randomUUID()],

    replayDetected: false,
    pollingAttemptCount: 0,

    externalTransferExists: true,
    externalTransferCurrentStatus: "provider_pending",
    internalDebitExists: true,
    compensationAlreadyCreated: false,

    riskScores: risks(),

    now: new Date().toISOString(),
    metadata: {},
    ...overrides
  };
}

describe("provider-reconciliation-engine", () => {
  it("applies provider success", () => {
    const result = evaluateProviderReconciliation(makeInput());

    expect(result.status).toBe("reconciliation_apply_success");
    expect(result.shouldCompletePipeline).toBe(true);
    expect(result.shouldFailPipeline).toBe(false);
  });

  it("applies provider pending", () => {
    const result = evaluateProviderReconciliation(
      makeInput({
        normalizedProviderStatus: "provider_pending"
      })
    );

    expect(result.status).toBe("reconciliation_apply_pending");
    expect(result.nextExternalTransferStatus).toBe("provider_pending");
    expect(result.shouldFailPipeline).toBe(false);
  });

  it("requires compensation on provider failure with internal debit", () => {
    const result = evaluateProviderReconciliation(
      makeInput({
        normalizedProviderStatus: "provider_failed"
      })
    );

    expect(result.status).toBe("reconciliation_apply_failure");
    expect(result.shouldTriggerCompensation).toBe(true);
    expect(result.shouldFailPipeline).toBe(false);
  });

  it("fails pipeline only on unknown provider state", () => {
    const result = evaluateProviderReconciliation(
      makeInput({
        normalizedProviderStatus: "provider_unknown"
      })
    );

    expect(result.status).toBe("reconciliation_apply_unknown");
    expect(result.compensationSafeToCreate).toBe(false);
    expect(result.shouldFailPipeline).toBe(true);
  });

  it("ignores duplicate provider event", () => {
    const result = evaluateProviderReconciliation(
      makeInput({
        replayDetected: true
      })
    );

    expect(result.status).toBe("reconciliation_ignore_duplicate");
  });

  it("fails unverified signature when provider requires signature", () => {
    const result = evaluateProviderReconciliation(
      makeInput({
        provider: "stripe",
        signatureVerified: false,
        signatureConfidenceScore: 0,
        riskScores: {
          ...risks(),
          signatureConfidenceScore: 0
        }
      })
    );

    expect(result.status).toBe("reconciliation_failed");
  });

  it("marks unmatched transfer", () => {
    const result = evaluateProviderReconciliation(
      makeInput({
        externalTransferExists: false,
        externalTransferId: null,
        riskScores: {
          ...risks(),
          transferMatchScore: 0.2
        }
      })
    );

    expect(result.status).toBe("reconciliation_unmatched");
  });
});
