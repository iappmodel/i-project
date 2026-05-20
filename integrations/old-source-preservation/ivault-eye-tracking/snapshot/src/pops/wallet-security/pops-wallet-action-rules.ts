import {
  POPS_WALLET_ACTION_TYPE,
  POPS_WALLET_ACTION_DECISION,
  POPS_WALLET_STEP_UP_TYPE,
  type PopsWalletActionEvaluationContext,
  type PopsWalletActionReasonCode,
  type PopsWalletActionRuleOutcome,
  type PopsWalletSensitiveActionType
} from "./pops-wallet-security.types";

const DEFAULT_LOW_AMOUNT = 500;
const DEFAULT_HIGH_AMOUNT = 5_000;
const DEFAULT_LARGE_CONVERSION = 10_000;

const REASON = {
  DELIBERATE_CONFIRMATION_REQUIRED: "DELIBERATE_CONFIRMATION_REQUIRED",
  LOW_TRUST_TIP: "LOW_TRUST_TIP",
  HIGH_VALUE_TIP: "HIGH_VALUE_TIP",
  EXPLICIT_CONVERT_CONFIRMATION: "EXPLICIT_CONVERT_CONFIRMATION",
  ACCOUNT_CONTINUITY_UNSTABLE: "ACCOUNT_CONTINUITY_UNSTABLE",
  LARGE_CONVERSION: "LARGE_CONVERSION",
  RECIPIENT_CONFIRMATION_REQUIRED: "RECIPIENT_CONFIRMATION_REQUIRED",
  HIGH_VALUE_PAYMENT: "HIGH_VALUE_PAYMENT",
  STRONG_INTENT_REQUIRED: "STRONG_INTENT_REQUIRED",
  KYC_REQUIRED: "KYC_REQUIRED",
  PAYOUT_RISK: "PAYOUT_RISK",
  STRONGEST_PROOF_REQUIRED: "STRONGEST_PROOF_REQUIRED",
  SUSPICIOUS_SESSION: "SUSPICIOUS_SESSION",
  BANK_LINK_KYC: "BANK_LINK_KYC",
  KYC_SUBMIT_FLOW: "KYC_SUBMIT_FLOW",
  HIGH_VALUE_TRANSFER: "HIGH_VALUE_TRANSFER",
  SECURITY_CHANGE_RISK: "SECURITY_CHANGE_RISK",
  COOLDOWN_ACTIVE: "COOLDOWN_ACTIVE",
  PRESENCE_LOW: "PRESENCE_LOW",
  INTENT_LOW: "INTENT_LOW",
  CONTINUITY_LOW: "CONTINUITY_LOW",
  DENY_SIGNALS: "DENY_SIGNALS"
} as const;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function baseConfidencesOk(ctx: PopsWalletActionEvaluationContext): boolean {
  return (
    clamp01(ctx.presenceConfidence) >= 0.55 &&
    clamp01(ctx.intentConfidence) >= 0.55 &&
    clamp01(ctx.continuityConfidence) >= 0.5
  );
}

function strongestStepUp(a: PopsWalletActionRuleOutcome["stepUpType"], b: PopsWalletActionRuleOutcome["stepUpType"]) {
  const rank: Record<string, number> = {
    NONE: 0,
    CONFIRMATION_TAP: 1,
    EMAIL_CONFIRMATION: 2,
    PIN: 3,
    BIOMETRIC_OS_LEVEL: 4,
    KYC_CHECK: 5,
    WAITING_PERIOD: 6,
    ADMIN_REVIEW: 7
  };
  return rank[a] >= rank[b] ? a : b;
}

/**
 * Pure rules for wallet-sensitive actions. Callers supply multimodal / session signals;
 * this module does not read device biometrics — it only names required step-ups.
 */
export function evaluatePopsWalletActionRules(ctx: PopsWalletActionEvaluationContext): PopsWalletActionRuleOutcome {
  const low = ctx.lowAmountMinorThreshold ?? DEFAULT_LOW_AMOUNT;
  const high = ctx.highAmountMinorThreshold ?? DEFAULT_HIGH_AMOUNT;
  const largeConv = ctx.largeConversionMinorThreshold ?? DEFAULT_LARGE_CONVERSION;

  switch (ctx.actionType) {
    case POPS_WALLET_ACTION_TYPE.TIP_SEND:
      return rulesTipSend(ctx, low, high);
    case POPS_WALLET_ACTION_TYPE.WALLET_CONVERT:
      return rulesWalletConvert(ctx, largeConv);
    case POPS_WALLET_ACTION_TYPE.PAYMENT_SEND:
      return rulesPaymentSend(ctx, high);
    case POPS_WALLET_ACTION_TYPE.WITHDRAW_REQUEST:
      return rulesWithdraw(ctx);
    case POPS_WALLET_ACTION_TYPE.BANK_LINK:
      return rulesBankLink(ctx);
    case POPS_WALLET_ACTION_TYPE.KYC_SUBMIT:
      return rulesKycSubmit(ctx);
    case POPS_WALLET_ACTION_TYPE.HIGH_VALUE_TRANSFER:
      return rulesHighValueTransfer(ctx, high);
    case POPS_WALLET_ACTION_TYPE.SECURITY_CHANGE:
      return rulesSecurityChange(ctx);
  }
}

function rulesTipSend(
  ctx: PopsWalletActionEvaluationContext,
  lowMinor: number,
  highMinor: number
): PopsWalletActionRuleOutcome {
  const reasons: PopsWalletActionReasonCode[] = [REASON.DELIBERATE_CONFIRMATION_REQUIRED];

  if (!ctx.deliberateConfirmationCompleted) {
    if (ctx.amountMinor < lowMinor && clamp01(ctx.trustScore) >= 0.75) {
      reasons.push("LOW_AMOUNT_HIGH_TRUST_TAP_ONLY");
    } else if (ctx.amountMinor >= highMinor) {
      reasons.push(REASON.HIGH_VALUE_TIP);
    } else if (clamp01(ctx.trustScore) < 0.55) {
      reasons.push(REASON.LOW_TRUST_TIP);
    }
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.CONFIRMATION_TAP,
      reasonCodes: reasons
    };
  }

  if (ctx.amountMinor >= highMinor && !ctx.osBiometricOrPinCompleted) {
    const st =
      clamp01(ctx.trustScore) >= 0.72 ? POPS_WALLET_STEP_UP_TYPE.BIOMETRIC_OS_LEVEL : POPS_WALLET_STEP_UP_TYPE.WAITING_PERIOD;
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: st,
      reasonCodes: [...reasons, REASON.HIGH_VALUE_TIP]
    };
  }

  if (!baseConfidencesOk(ctx)) {
    return denyOrHold(ctx, [REASON.PRESENCE_LOW, REASON.INTENT_LOW]);
  }

  return {
    decision: POPS_WALLET_ACTION_DECISION.ALLOW,
    requiresStepUp: false,
    stepUpType: POPS_WALLET_STEP_UP_TYPE.NONE,
    reasonCodes: ["TIP_SEND_VERIFIED"]
  };
}

function rulesWalletConvert(ctx: PopsWalletActionEvaluationContext, largeMinor: number): PopsWalletActionRuleOutcome {
  const reasons: PopsWalletActionReasonCode[] = [REASON.EXPLICIT_CONVERT_CONFIRMATION];

  if (!ctx.accountContinuityStable) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.HOLD,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.WAITING_PERIOD,
      reasonCodes: [...reasons, REASON.ACCOUNT_CONTINUITY_UNSTABLE]
    };
  }

  if (!ctx.deliberateConfirmationCompleted) {
    let stepUp = POPS_WALLET_STEP_UP_TYPE.CONFIRMATION_TAP;
    if (ctx.amountMinor >= largeMinor) {
      stepUp = strongestStepUp(stepUp, POPS_WALLET_STEP_UP_TYPE.PIN);
      reasons.push(REASON.LARGE_CONVERSION);
    }
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: stepUp,
      reasonCodes: reasons
    };
  }

  if (ctx.amountMinor >= largeMinor && !ctx.osBiometricOrPinCompleted) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.BIOMETRIC_OS_LEVEL,
      reasonCodes: [...reasons, REASON.LARGE_CONVERSION]
    };
  }

  if (!baseConfidencesOk(ctx)) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.CONFIRMATION_TAP,
      reasonCodes: [REASON.CONTINUITY_LOW]
    };
  }

  return {
    decision: POPS_WALLET_ACTION_DECISION.ALLOW,
    requiresStepUp: false,
    stepUpType: POPS_WALLET_STEP_UP_TYPE.NONE,
    reasonCodes: ["WALLET_CONVERT_VERIFIED"]
  };
}

function rulesPaymentSend(ctx: PopsWalletActionEvaluationContext, highMinor: number): PopsWalletActionRuleOutcome {
  const reasons: PopsWalletActionReasonCode[] = [REASON.STRONG_INTENT_REQUIRED, REASON.RECIPIENT_CONFIRMATION_REQUIRED];

  if (!ctx.recipientConfirmationCompleted) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.CONFIRMATION_TAP,
      reasonCodes: reasons
    };
  }

  if (clamp01(ctx.intentConfidence) < 0.62) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.CONFIRMATION_TAP,
      reasonCodes: [...reasons, REASON.INTENT_LOW]
    };
  }

  if (ctx.amountMinor >= highMinor) {
    if (!ctx.osBiometricOrPinCompleted) {
      return {
        decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
        requiresStepUp: true,
        stepUpType: POPS_WALLET_STEP_UP_TYPE.BIOMETRIC_OS_LEVEL,
        reasonCodes: [...reasons, REASON.HIGH_VALUE_PAYMENT]
      };
    }
  }

  if (!baseConfidencesOk(ctx)) {
    return denyOrHold(ctx, reasons);
  }

  return {
    decision: POPS_WALLET_ACTION_DECISION.ALLOW,
    requiresStepUp: false,
    stepUpType: POPS_WALLET_STEP_UP_TYPE.NONE,
    reasonCodes: ["PAYMENT_SEND_VERIFIED"]
  };
}

function rulesWithdraw(ctx: PopsWalletActionEvaluationContext): PopsWalletActionRuleOutcome {
  const reasons: PopsWalletActionReasonCode[] = [REASON.STRONGEST_PROOF_REQUIRED];

  if (!ctx.kycCompleted || (ctx.kycLevel ?? "NONE") === "NONE") {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.KYC_CHECK,
      reasonCodes: [...reasons, REASON.KYC_REQUIRED]
    };
  }

  if (clamp01(ctx.payoutRiskScore) >= 0.45) {
    if (!ctx.osBiometricOrPinCompleted) {
      return {
        decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
        requiresStepUp: true,
        stepUpType: POPS_WALLET_STEP_UP_TYPE.BIOMETRIC_OS_LEVEL,
        reasonCodes: [...reasons, REASON.PAYOUT_RISK]
      };
    }
    return {
      decision: POPS_WALLET_ACTION_DECISION.HOLD,
      requiresStepUp: false,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.WAITING_PERIOD,
      reasonCodes: [...reasons, REASON.PAYOUT_RISK]
    };
  }

  if (!ctx.accountContinuityStable) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.HOLD,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.WAITING_PERIOD,
      reasonCodes: [...reasons, REASON.ACCOUNT_CONTINUITY_UNSTABLE]
    };
  }

  if (ctx.suspiciousRecentPopsSession) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ADMIN_REVIEW,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.ADMIN_REVIEW,
      reasonCodes: [...reasons, REASON.SUSPICIOUS_SESSION]
    };
  }

  if (!ctx.deliberateConfirmationCompleted || !ctx.osBiometricOrPinCompleted) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: ctx.deliberateConfirmationCompleted
        ? POPS_WALLET_STEP_UP_TYPE.BIOMETRIC_OS_LEVEL
        : POPS_WALLET_STEP_UP_TYPE.CONFIRMATION_TAP,
      reasonCodes: reasons
    };
  }

  if (!baseConfidencesOk(ctx)) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.HOLD,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.WAITING_PERIOD,
      reasonCodes: [...reasons, REASON.PRESENCE_LOW]
    };
  }

  return {
    decision: POPS_WALLET_ACTION_DECISION.ALLOW,
    requiresStepUp: false,
    stepUpType: POPS_WALLET_STEP_UP_TYPE.NONE,
    reasonCodes: ["WITHDRAW_VERIFIED"]
  };
}

function rulesBankLink(ctx: PopsWalletActionEvaluationContext): PopsWalletActionRuleOutcome {
  if (!ctx.kycCompleted) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.KYC_CHECK,
      reasonCodes: [REASON.BANK_LINK_KYC, "BANK_PROVIDER_AUTH_OUT_OF_BAND"]
    };
  }

  if (!ctx.accountContinuityStable) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.EMAIL_CONFIRMATION,
      reasonCodes: [REASON.ACCOUNT_CONTINUITY_UNSTABLE]
    };
  }

  if (!ctx.osBiometricOrPinCompleted) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.BIOMETRIC_OS_LEVEL,
      reasonCodes: [REASON.BANK_LINK_KYC]
    };
  }

  return {
    decision: POPS_WALLET_ACTION_DECISION.ALLOW,
    requiresStepUp: false,
    stepUpType: POPS_WALLET_STEP_UP_TYPE.NONE,
    reasonCodes: ["BANK_LINK_POPS_VERIFIED"]
  };
}

function rulesKycSubmit(ctx: PopsWalletActionEvaluationContext): PopsWalletActionRuleOutcome {
  if (!ctx.deliberateConfirmationCompleted) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.CONFIRMATION_TAP,
      reasonCodes: [REASON.KYC_SUBMIT_FLOW]
    };
  }
  if (!ctx.osBiometricOrPinCompleted) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.BIOMETRIC_OS_LEVEL,
      reasonCodes: [REASON.KYC_SUBMIT_FLOW]
    };
  }
  if (!baseConfidencesOk(ctx)) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.KYC_CHECK,
      reasonCodes: [REASON.KYC_SUBMIT_FLOW, REASON.PRESENCE_LOW]
    };
  }
  return {
    decision: POPS_WALLET_ACTION_DECISION.ALLOW,
    requiresStepUp: false,
    stepUpType: POPS_WALLET_STEP_UP_TYPE.NONE,
    reasonCodes: ["KYC_SUBMIT_VERIFIED"]
  };
}

function rulesHighValueTransfer(ctx: PopsWalletActionEvaluationContext, highMinor: number): PopsWalletActionRuleOutcome {
  const reasons: PopsWalletActionReasonCode[] = [REASON.HIGH_VALUE_TRANSFER];
  if (ctx.amountMinor < highMinor) {
    reasons.push("AMOUNT_BELOW_HIGH_VALUE_POLICY");
  }
  if (!ctx.recipientConfirmationCompleted || !ctx.deliberateConfirmationCompleted) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.CONFIRMATION_TAP,
      reasonCodes: reasons
    };
  }
  if (!ctx.osBiometricOrPinCompleted) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.BIOMETRIC_OS_LEVEL,
      reasonCodes: reasons
    };
  }
  if (!ctx.emailConfirmationCompleted) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.EMAIL_CONFIRMATION,
      reasonCodes: reasons
    };
  }
  if (clamp01(ctx.payoutRiskScore) >= 0.35) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.WAITING_PERIOD,
      reasonCodes: reasons
    };
  }
  return {
    decision: POPS_WALLET_ACTION_DECISION.ALLOW,
    requiresStepUp: false,
    stepUpType: POPS_WALLET_STEP_UP_TYPE.NONE,
    reasonCodes: ["HIGH_VALUE_TRANSFER_VERIFIED"]
  };
}

function rulesSecurityChange(ctx: PopsWalletActionEvaluationContext): PopsWalletActionRuleOutcome {
  const reasons: PopsWalletActionReasonCode[] = [REASON.SECURITY_CHANGE_RISK];
  if (ctx.securityChangeCooldownActive) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.HOLD,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.WAITING_PERIOD,
      reasonCodes: [...reasons, REASON.COOLDOWN_ACTIVE]
    };
  }
  if (!ctx.osBiometricOrPinCompleted) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.BIOMETRIC_OS_LEVEL,
      reasonCodes: reasons
    };
  }
  if (clamp01(ctx.fraudRiskHint ?? 0) >= 0.55 || !baseConfidencesOk(ctx)) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.ALLOW_WITH_STEP_UP,
      requiresStepUp: true,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.WAITING_PERIOD,
      reasonCodes: [...reasons, REASON.DENY_SIGNALS]
    };
  }
  return {
    decision: POPS_WALLET_ACTION_DECISION.ALLOW,
    requiresStepUp: false,
    stepUpType: POPS_WALLET_STEP_UP_TYPE.NONE,
    reasonCodes: ["SECURITY_CHANGE_VERIFIED"]
  };
}

function denyOrHold(ctx: PopsWalletActionEvaluationContext, reasons: PopsWalletActionReasonCode[]): PopsWalletActionRuleOutcome {
  if (clamp01(ctx.presenceConfidence) < 0.35 || clamp01(ctx.intentConfidence) < 0.35) {
    return {
      decision: POPS_WALLET_ACTION_DECISION.DENY,
      requiresStepUp: false,
      stepUpType: POPS_WALLET_STEP_UP_TYPE.NONE,
      reasonCodes: [...reasons, REASON.DENY_SIGNALS]
    };
  }
  return {
    decision: POPS_WALLET_ACTION_DECISION.HOLD,
    requiresStepUp: true,
    stepUpType: POPS_WALLET_STEP_UP_TYPE.WAITING_PERIOD,
    reasonCodes: [...reasons, REASON.PRESENCE_LOW]
  };
}

export function isWalletSensitiveAction(value: string): value is PopsWalletSensitiveActionType {
  return (Object.values(POPS_WALLET_ACTION_TYPE) as string[]).includes(value);
}
