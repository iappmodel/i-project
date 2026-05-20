import { describe, expect, it } from "vitest";
import { POPS_WALLET_ACTION_TYPE, POPS_WALLET_ACTION_DECISION, POPS_WALLET_STEP_UP_TYPE } from "./pops-wallet-security.types";
import { PopsWalletActionProofService, toPopsWalletActionProofClientView } from "./pops-wallet-action-proof.service";
import { evaluatePopsWalletActionRules } from "./pops-wallet-action-rules";

function baseCtx(over: Partial<Parameters<typeof evaluatePopsWalletActionRules>[0]> = {}) {
  return {
    userId: "u1",
    sessionId: "s1",
    walletActionId: "w1",
    amountMinor: 100,
    coinType: "USD",
    recipientId: null as string | null,
    presenceConfidence: 0.8,
    intentConfidence: 0.82,
    continuityConfidence: 0.78,
    trustScore: 0.8,
    kycCompleted: true,
    kycLevel: "FULL" as const,
    payoutRiskScore: 0.1,
    accountContinuityStable: true,
    suspiciousRecentPopsSession: false,
    deliberateConfirmationCompleted: true,
    recipientConfirmationCompleted: true,
    osBiometricOrPinCompleted: true,
    emailConfirmationCompleted: true,
    securityChangeCooldownActive: false,
    actionType: POPS_WALLET_ACTION_TYPE.TIP_SEND,
    ...over
  };
}

describe("evaluatePopsWalletActionRules", () => {
  it("TIP_SEND requires deliberate confirmation first", () => {
    const r = evaluatePopsWalletActionRules(
      baseCtx({
        actionType: POPS_WALLET_ACTION_TYPE.TIP_SEND,
        deliberateConfirmationCompleted: false,
        amountMinor: 100,
        trustScore: 0.9
      })
    );
    expect(r.decision).toBe(POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP);
    expect(r.stepUpType).toBe(POPS_WALLET_STEP_UP_TYPE.CONFIRMATION_TAP);
    expect(r.requiresStepUp).toBe(true);
  });

  it("TIP_SEND high amount requires OS-level step after confirmation", () => {
    const r = evaluatePopsWalletActionRules(
      baseCtx({
        actionType: POPS_WALLET_ACTION_TYPE.TIP_SEND,
        amountMinor: 8000,
        deliberateConfirmationCompleted: true,
        osBiometricOrPinCompleted: false
      })
    );
    expect(r.decision).toBe(POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP);
    expect([POPS_WALLET_STEP_UP_TYPE.BIOMETRIC_OS_LEVEL, POPS_WALLET_STEP_UP_TYPE.WAITING_PERIOD]).toContain(r.stepUpType);
  });

  it("WALLET_CONVERT holds when account continuity unstable", () => {
    const r = evaluatePopsWalletActionRules(
      baseCtx({
        actionType: POPS_WALLET_ACTION_TYPE.WALLET_CONVERT,
        accountContinuityStable: false,
        deliberateConfirmationCompleted: true
      })
    );
    expect(r.decision).toBe(POPS_WALLET_ACTION_DECISION.HOLD);
    expect(r.stepUpType).toBe(POPS_WALLET_STEP_UP_TYPE.WAITING_PERIOD);
  });

  it("PAYMENT_SEND requires recipient confirmation", () => {
    const r = evaluatePopsWalletActionRules(
      baseCtx({
        actionType: POPS_WALLET_ACTION_TYPE.PAYMENT_SEND,
        recipientConfirmationCompleted: false,
        deliberateConfirmationCompleted: true
      })
    );
    expect(r.decision).toBe(POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP);
    expect(r.reasonCodes.join(" ")).toMatch(/RECIPIENT/);
  });

  it("WITHDRAW_REQUEST routes suspicious sessions to admin review", () => {
    const r = evaluatePopsWalletActionRules(
      baseCtx({
        actionType: POPS_WALLET_ACTION_TYPE.WITHDRAW_REQUEST,
        suspiciousRecentPopsSession: true,
        deliberateConfirmationCompleted: true,
        osBiometricOrPinCompleted: true,
        payoutRiskScore: 0.1
      })
    );
    expect(r.decision).toBe(POPS_WALLET_ACTION_DECISION.ADMIN_REVIEW);
    expect(r.stepUpType).toBe(POPS_WALLET_STEP_UP_TYPE.ADMIN_REVIEW);
  });

  it("BANK_LINK requires KYC when not completed", () => {
    const r = evaluatePopsWalletActionRules(
      baseCtx({
        actionType: POPS_WALLET_ACTION_TYPE.BANK_LINK,
        kycCompleted: false
      })
    );
    expect(r.stepUpType).toBe(POPS_WALLET_STEP_UP_TYPE.KYC_CHECK);
  });

  it("SECURITY_CHANGE holds when cool-down active", () => {
    const r = evaluatePopsWalletActionRules(
      baseCtx({
        actionType: POPS_WALLET_ACTION_TYPE.SECURITY_CHANGE,
        securityChangeCooldownActive: true
      })
    );
    expect(r.decision).toBe(POPS_WALLET_ACTION_DECISION.HOLD);
  });
});

describe("PopsWalletActionProofService", () => {
  it("produces proof with required fields and derived fraudRisk", () => {
    const svc = new PopsWalletActionProofService();
    const proof = svc.evaluate(
      baseCtx({
        actionType: POPS_WALLET_ACTION_TYPE.TIP_SEND,
        deliberateConfirmationCompleted: true,
        amountMinor: 200,
        presenceConfidence: 0.9,
        intentConfidence: 0.88,
        continuityConfidence: 0.86
      })
    );
    expect(proof.id.length).toBeGreaterThan(4);
    expect(proof.userId).toBe("u1");
    expect(proof.fraudRisk).toBeGreaterThanOrEqual(0);
    expect(proof.fraudRisk).toBeLessThanOrEqual(1);
    expect(proof.createdAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(proof.decision).toBe(POPS_WALLET_ACTION_DECISION.ALLOW);
  });

  it("client view omits fraudRisk", () => {
    const svc = new PopsWalletActionProofService();
    const proof = svc.evaluate(
      baseCtx({
        actionType: POPS_WALLET_ACTION_TYPE.PAYMENT_SEND,
        amountMinor: 200,
        recipientConfirmationCompleted: true,
        intentConfidence: 0.9
      })
    );
    const pub = toPopsWalletActionProofClientView(proof);
    expect("fraudRisk" in pub).toBe(false);
    expect(pub.decision).toBe(proof.decision);
  });
});
