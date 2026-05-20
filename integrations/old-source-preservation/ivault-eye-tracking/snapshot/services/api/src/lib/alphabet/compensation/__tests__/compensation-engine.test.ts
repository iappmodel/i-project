import { describe, expect, it } from "vitest";
import { evaluateCompensation } from "../compensation-engine";
import type { CompensationSignalInput } from "@/types/alphabet/compensation.types";

function scores() {
  return {
    originalMutationConfidence: 0.96,
    reversalEligibilityScore: 0.96,
    reversalSafetyScore: 0.96,
    compensationUrgencyScore: 0.7,
    compensationFraudRisk: 0.02,
    compensationAuditScore: 0.96
  };
}

function makeInput(overrides: Partial<CompensationSignalInput> = {}): CompensationSignalInput {
  return {
    compensationId: crypto.randomUUID(),
    compensationType: "ledger_reversal",
    triggerType: "system_error",
    currentStatus: "compensation_created",

    originalExecutionRequestId: crypto.randomUUID(),
    originalLedgerEntryId: crypto.randomUUID(),
    originalSagaId: null,
    originalPipelineId: null,
    originalPolicyDecisionId: null,
    originalWalletId: crypto.randomUUID(),
    originalWalletAccountId: crypto.randomUUID(),
    originalUserId: crypto.randomUUID(),

    existingReversalLedgerEntryIds: [],

    amount: 25,
    originalAmount: 25,
    alreadyReversedAmount: 0,
    coinCode: "I",
    originalDirection: "debit",
    reversalDirection: "credit",

    idempotencyKey: crypto.randomUUID(),
    dedupeKey: crypto.randomUUID(),

    sourceEventIds: [crypto.randomUUID()],
    reasonCodes: ["system_error"],

    requiresReview: false,
    reviewApproved: false,
    cancelRequested: false,

    externalTransferMayHaveStarted: false,
    externalTransferConfirmedFailed: false,

    actorUserId: null,

    safetyScores: scores(),

    now: new Date().toISOString(),
    metadata: {},
    ...overrides
  };
}

describe("compensation-engine", () => {
  it("allows safe ledger reversal", () => {
    const result = evaluateCompensation(makeInput());

    expect(result.status).toBe("compensation_execute_reversal");
    expect(result.executeReversal).toBe(true);
  });

  it("blocks reversal above original amount", () => {
    const result = evaluateCompensation(
      makeInput({
        amount: 30,
        originalAmount: 25
      })
    );

    expect(result.status).toBe("compensation_blocked");
    expect(result.reasons).toContain("compensation_amount_exceeds_reversible_amount");
  });

  it("requires review for unknown external transfer state", () => {
    const result = evaluateCompensation(
      makeInput({
        compensationType: "withdrawal_reversal",
        externalTransferMayHaveStarted: true,
        externalTransferConfirmedFailed: false
      })
    );

    expect(result.status).toBe("compensation_requires_review");
  });

  it("requires admin actor for manual admin compensation", () => {
    const result = evaluateCompensation(
      makeInput({
        compensationType: "manual_admin_compensation",
        actorUserId: null,
        reviewApproved: true
      })
    );

    expect(result.status).toBe("compensation_requires_review");
    expect(result.reasons).toContain("compensation_admin_actor_required");
  });

  it("requires review if existing reversal exists", () => {
    const result = evaluateCompensation(
      makeInput({
        existingReversalLedgerEntryIds: [crypto.randomUUID()]
      })
    );

    expect(result.status).toBe("compensation_requires_review");
  });

  it("cancels compensation", () => {
    const result = evaluateCompensation(
      makeInput({
        cancelRequested: true
      })
    );

    expect(result.status).toBe("compensation_canceled");
  });
});
