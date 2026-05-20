import { beforeEach, describe, expect, it } from "vitest";
import {
  createWithdrawalRequest,
  getWithdrawalRequest,
  getWithdrawalVerificationResult,
  resetWithdrawalStoreForTests,
  verifyStoredWithdrawalRequest
} from "../withdrawal-store";

describe("withdrawal-store", () => {
  beforeEach(() => {
    resetWithdrawalStoreForTests();
  });

  it("creates withdrawal request", () => {
    const request = createWithdrawalRequest({
      walletId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      sourceCoin: "I",
      requestedAmount: 100,
      payoutMethod: "bank",
      region: "US",
      countryCode: "US"
    });

    expect(request.status).toBe("created");
    expect(request.payoutAmount).toBe(98.75);
    expect(request.feeAmount).toBe(1.25);

    const stored = getWithdrawalRequest(request.withdrawalRequestId);
    expect(stored?.withdrawalRequestId).toBe(request.withdrawalRequestId);
  });

  it("verifies stored withdrawal request", () => {
    const request = createWithdrawalRequest({
      walletId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      sourceCoin: "I",
      requestedAmount: 100,
      payoutMethod: "bank",
      region: "US",
      countryCode: "US"
    });

    const result = verifyStoredWithdrawalRequest({
      withdrawalRequestId: request.withdrawalRequestId,
      availableBalance: 500,
      pendingBalance: 0,
      lockedBalance: 0,
      ageBand: "18_plus",
      guardianApproved: false,
      kycStatus: "verified",
      taxProfileStatus: "verified",
      complianceStatus: "clear",
      paymentMethodVerificationStatus: "verified",
      trustScore: 80,
      uValueScore: 35,
      withdrawalVelocityScore: 0.1,
      recentWithdrawalCount: 1,
      recentWithdrawalAmount: 100,
      chargebackRisk: 0.02,
      fraudRisk: 0.02,
      accountTakeoverRisk: 0.02,
      moneyLaunderingRisk: 0.02,
      payoutRailRisk: 0.02,
      deviceIntegrityScore: 0.9,
      recentPenaltyCount: 0,
      recentSeverePenaltyCount: 0,
      walletLocked: false,
      withdrawalsLocked: false
    });

    expect(result.status).toBe("withdrawal_approved");

    const storedResult = getWithdrawalVerificationResult(request.withdrawalRequestId);
    expect(storedResult?.status).toBe("withdrawal_approved");

    const updated = getWithdrawalRequest(request.withdrawalRequestId);
    expect(updated?.status).toBe("approved");
  });

  it("marks completed if payoutCompleted metadata is true", () => {
    const request = createWithdrawalRequest({
      walletId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      sourceCoin: "I",
      requestedAmount: 100,
      payoutMethod: "bank",
      region: "US",
      countryCode: "US"
    });

    const result = verifyStoredWithdrawalRequest({
      withdrawalRequestId: request.withdrawalRequestId,
      availableBalance: 500,
      pendingBalance: 0,
      lockedBalance: 0,
      ageBand: "18_plus",
      guardianApproved: false,
      kycStatus: "verified",
      taxProfileStatus: "verified",
      complianceStatus: "clear",
      paymentMethodVerificationStatus: "verified",
      trustScore: 80,
      uValueScore: 35,
      withdrawalVelocityScore: 0.1,
      recentWithdrawalCount: 1,
      recentWithdrawalAmount: 100,
      chargebackRisk: 0.02,
      fraudRisk: 0.02,
      accountTakeoverRisk: 0.02,
      moneyLaunderingRisk: 0.02,
      payoutRailRisk: 0.02,
      deviceIntegrityScore: 0.9,
      recentPenaltyCount: 0,
      recentSeverePenaltyCount: 0,
      walletLocked: false,
      withdrawalsLocked: false,
      metadata: {
        payoutCompleted: true
      }
    });

    expect(result.payoutCompletedEvent?.eventType).toBe("payout_completed");

    const updated = getWithdrawalRequest(request.withdrawalRequestId);
    expect(updated?.status).toBe("completed");
    expect(updated?.completedAt).toBeTruthy();
  });

  it("marks request held if KYC missing", () => {
    const request = createWithdrawalRequest({
      walletId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      sourceCoin: "I",
      requestedAmount: 100,
      payoutMethod: "bank",
      region: "US",
      countryCode: "US"
    });

    const result = verifyStoredWithdrawalRequest({
      withdrawalRequestId: request.withdrawalRequestId,
      availableBalance: 500,
      pendingBalance: 0,
      lockedBalance: 0,
      ageBand: "18_plus",
      guardianApproved: false,
      kycStatus: "not_started",
      taxProfileStatus: "verified",
      complianceStatus: "clear",
      paymentMethodVerificationStatus: "verified",
      trustScore: 80,
      uValueScore: 35,
      withdrawalVelocityScore: 0.1,
      recentWithdrawalCount: 1,
      recentWithdrawalAmount: 100,
      chargebackRisk: 0.02,
      fraudRisk: 0.02,
      accountTakeoverRisk: 0.02,
      moneyLaunderingRisk: 0.02,
      payoutRailRisk: 0.02,
      deviceIntegrityScore: 0.9,
      recentPenaltyCount: 0,
      recentSeverePenaltyCount: 0,
      walletLocked: false,
      withdrawalsLocked: false
    });

    expect(result.status).toBe("withdrawal_held");

    const updated = getWithdrawalRequest(request.withdrawalRequestId);
    expect(updated?.status).toBe("held");
  });
});
