import { describe, expect, it } from "vitest";
import { evaluateStuckSaga } from "../stuck-saga-engine";
import type { StuckSagaSignalInput } from "@/types/alphabet/stuck-saga.types";

function makeInput(overrides: Partial<StuckSagaSignalInput> = {}): StuckSagaSignalInput {
  return {
    stuckType: "saga_running_too_long",
    scanScope: "single_saga",
    linkedObjectIds: {
      sagaId: crypto.randomUUID()
    },
    timing: {
      startedAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z",
      lastProgressAt: "2026-04-27T00:00:00.000Z",
      ageSeconds: 7200,
      staleSeconds: 3600,
      maxAllowedAgeSeconds: 3600,
      maxAllowedStaleSeconds: 1800
    },
    moneyExposure: {
      internalDebitAmount: 0,
      externalTransferAmount: 0,
      pendingAmount: 0,
      unknownAmount: 0,
      compensationAmount: 0,
      exposureAmount: 0
    },
    riskScores: {
      orchestrationRiskScore: 0.8,
      financialExposureScore: 0.2,
      userImpactScore: 0.4,
      platformImpactScore: 0.7,
      retryExhaustionScore: 0.2,
      uncertaintyScore: 0.6,
      confidenceScore: 0.95
    },
    evidence: {},
    redactedEvidence: {},
    sourceEventIds: [],
    stuckDetected: true,
    moneyMovementAffected: false,
    providerAffected: false,
    userVisibleAffected: false,
    retryExhausted: false,
    reviewAlreadyExists: false,
    now: "2026-04-27T02:00:00.000Z",
    metadata: {},
    ...overrides
  };
}

describe("stuck-saga-engine", () => {
  it("fails stuck saga running too long", () => {
    const result = evaluateStuckSaga(makeInput());

    expect(result.failed || result.critical || result.warning).toBe(true);
    expect(result.shouldCreateOperationalAlert).toBe(
      result.failed || result.critical
    );
  });

  it("marks money debited no completion as critical", () => {
    const result = evaluateStuckSaga(
      makeInput({
        stuckType: "saga_money_debited_no_completion",
        moneyExposure: {
          internalDebitAmount: 100,
          externalTransferAmount: 100,
          pendingAmount: 100,
          unknownAmount: 100,
          compensationAmount: 0,
          exposureAmount: 100
        },
        moneyMovementAffected: true,
        providerAffected: true,
        userVisibleAffected: true,
        riskScores: {
          orchestrationRiskScore: 0.9,
          financialExposureScore: 0.95,
          userImpactScore: 0.9,
          platformImpactScore: 0.9,
          retryExhaustionScore: 0.4,
          uncertaintyScore: 0.95,
          confidenceScore: 0.95
        }
      })
    );

    expect(result.status).toBe("stuck_saga_critical");
    expect(result.shouldCreateReviewCase).toBe(true);
  });

  it("passes when stuck not detected", () => {
    const result = evaluateStuckSaga(
      makeInput({
        stuckDetected: false
      })
    );

    expect(result.status).toBe("stuck_saga_pass");
  });

  it("skips low-confidence signals", () => {
    const result = evaluateStuckSaga(
      makeInput({
        riskScores: {
          orchestrationRiskScore: 0.8,
          financialExposureScore: 0.8,
          userImpactScore: 0.8,
          platformImpactScore: 0.8,
          retryExhaustionScore: 0.8,
          uncertaintyScore: 0.8,
          confidenceScore: 0.1
        }
      })
    );

    expect(result.status).toBe("stuck_saga_skip");
  });
});
