import { describe, expect, it } from "vitest";
import type { WithdrawalSignalInput } from "../../../types/alphabet/withdrawal.types";
import { verifyWithdrawalRequest } from "../withdrawal-engine";

function makeInput(
  overrides: Partial<WithdrawalSignalInput> = {}
): WithdrawalSignalInput {
  return {
    withdrawalRequestId: crypto.randomUUID(),
    walletId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    sourceCoin: "I",
    requestedAmount: 100,
    availableBalance: 500,
    pendingBalance: 0,
    lockedBalance: 0,
    payoutMethod: "bank",
    region: "US",
    countryCode: "US",
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
    metadata: {},
    ...overrides
  };
}

describe("withdrawal-engine", () => {
  it("approves clean bank withdrawal", () => {
    const result = verifyWithdrawalRequest(makeInput());
    expect(result.status).toBe("withdrawal_approved");
    expect(result.feeAmount).toBe(1.25);
    expect(result.payoutAmount).toBe(98.75);
    expect(result.withdrawalApprovedEvent?.eventType).toBe("withdrawal_approved");
  });

  it("creates payout completed event only when payout is completed", () => {
    const result = verifyWithdrawalRequest(
      makeInput({
        metadata: { payoutCompleted: true }
      })
    );
    expect(result.status).toBe("withdrawal_approved");
    expect(result.payoutCompletedEvent?.eventType).toBe("payout_completed");
  });

  it("rejects non-iCoin withdrawal", () => {
    const result = verifyWithdrawalRequest(
      makeInput({
        sourceCoin: "W"
      })
    );
    expect(result.status).toBe("withdrawal_rejected");
    expect(result.reasons).toContain("only_icoin_can_be_withdrawn");
  });

  it("rejects insufficient available balance", () => {
    const result = verifyWithdrawalRequest(
      makeInput({
        availableBalance: 50
      })
    );
    expect(result.status).toBe("withdrawal_rejected");
    expect(result.reasons).toContain("insufficient_available_balance");
  });

  it("holds withdrawal when KYC is missing", () => {
    const result = verifyWithdrawalRequest(
      makeInput({
        kycStatus: "not_started"
      })
    );
    expect(result.status).toBe("withdrawal_held");
    expect(result.reasons).toContain("kyc_required_or_not_verified");
  });

  it("pending review when KYC is pending", () => {
    const result = verifyWithdrawalRequest(
      makeInput({
        kycStatus: "pending"
      })
    );
    expect(result.status).toBe("withdrawal_pending_review");
    expect(result.reasons).toContain("kyc_required_or_not_verified");
  });

  it("blocks sanctions/compliance", () => {
    const result = verifyWithdrawalRequest(
      makeInput({
        complianceStatus: "sanctions_match"
      })
    );
    expect(result.status).toBe("compliance_blocked");
    expect(result.complianceBlockedEvent?.eventType).toBe("compliance_blocked");
  });

  it("blocks wallet locked", () => {
    const result = verifyWithdrawalRequest(
      makeInput({
        walletLocked: true
      })
    );
    expect(result.status).toBe("wallet_locked");
    expect(result.reasons).toContain("wallet_locked");
  });

  it("holds withdrawals locked", () => {
    const result = verifyWithdrawalRequest(
      makeInput({
        withdrawalsLocked: true
      })
    );
    expect(result.status).toBe("withdrawal_held");
    expect(result.reasons).toContain("withdrawals_locked");
  });

  it("flags fraud as suspicious", () => {
    const result = verifyWithdrawalRequest(
      makeInput({
        fraudRisk: 0.95
      })
    );
    expect(result.status).toBe("suspicious");
    expect(result.withdrawalFraudEvent?.eventType).toBe("withdrawal_fraud_detected");
  });

  it("flags account takeover as suspicious", () => {
    const result = verifyWithdrawalRequest(
      makeInput({
        accountTakeoverRisk: 0.95
      })
    );
    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("account_takeover_risk_above_maximum");
  });

  it("requires guardian approval for teen withdrawal", () => {
    const result = verifyWithdrawalRequest(
      makeInput({
        ageBand: "13_15",
        guardianApproved: false
      })
    );
    expect(result.status).toBe("withdrawal_pending_review");
    expect(result.reasons).toContain("minor_withdrawal_requires_guardian_approval");
  });

  it("allows teen withdrawal with guardian approval", () => {
    const result = verifyWithdrawalRequest(
      makeInput({
        ageBand: "13_15",
        guardianApproved: true
      })
    );
    expect(result.status).toBe("withdrawal_approved");
  });

  it("blocks crypto for teens", () => {
    const result = verifyWithdrawalRequest(
      makeInput({
        payoutMethod: "crypto",
        requestedAmount: 100,
        ageBand: "13_15",
        guardianApproved: true,
        trustScore: 90,
        uValueScore: 40
      })
    );
    expect(result.status).toBe("withdrawal_rejected");
    expect(result.reasons).toContain("teen_withdrawal_not_allowed");
  });
});
