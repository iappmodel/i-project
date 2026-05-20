export const POPS_WALLET_ACTION_TYPE = {
  TIP_SEND: "TIP_SEND",
  WALLET_CONVERT: "WALLET_CONVERT",
  PAYMENT_SEND: "PAYMENT_SEND",
  WITHDRAW_REQUEST: "WITHDRAW_REQUEST",
  BANK_LINK: "BANK_LINK",
  KYC_SUBMIT: "KYC_SUBMIT",
  HIGH_VALUE_TRANSFER: "HIGH_VALUE_TRANSFER",
  SECURITY_CHANGE: "SECURITY_CHANGE"
} as const;

export type PopsWalletSensitiveActionType =
  (typeof POPS_WALLET_ACTION_TYPE)[keyof typeof POPS_WALLET_ACTION_TYPE];

export const POPS_WALLET_STEP_UP_TYPE = {
  NONE: "NONE",
  CONFIRMATION_TAP: "CONFIRMATION_TAP",
  PIN: "PIN",
  BIOMETRIC_OS_LEVEL: "BIOMETRIC_OS_LEVEL",
  KYC_CHECK: "KYC_CHECK",
  EMAIL_CONFIRMATION: "EMAIL_CONFIRMATION",
  ADMIN_REVIEW: "ADMIN_REVIEW",
  WAITING_PERIOD: "WAITING_PERIOD"
} as const;

export type PopsWalletStepUpType = (typeof POPS_WALLET_STEP_UP_TYPE)[keyof typeof POPS_WALLET_STEP_UP_TYPE];

export const POPS_WALLET_ACTION_DECISION = {
  ALLOW: "ALLOW",
  ALLOW_WITH_STEP_UP: "ALLOW_WITH_STEP_UP",
  HOLD: "HOLD",
  DENY: "DENY",
  ADMIN_REVIEW: "ADMIN_REVIEW"
} as const;

export type PopsWalletActionDecision =
  (typeof POPS_WALLET_ACTION_DECISION)[keyof typeof POPS_WALLET_ACTION_DECISION];

export type PopsWalletActionReasonCode = string;

/**
 * Authoritative proof record for wallet-adjacent actions.
 * P.O.P.S validates human presence and intent; payment rails still authorize funds.
 */
export interface PopsWalletActionProof {
  id: string;
  userId: string;
  sessionId: string;
  walletActionId: string;
  actionType: PopsWalletSensitiveActionType;
  amount: number;
  coinType: string;
  recipientId: string | null;
  presenceConfidence: number;
  intentConfidence: number;
  continuityConfidence: number;
  fraudRisk: number;
  requiresStepUp: boolean;
  stepUpType: PopsWalletStepUpType;
  decision: PopsWalletActionDecision;
  reasonCodes: PopsWalletActionReasonCode[];
  createdAt: string;
}

/**
 * Client-safe view: omit internals that must not appear in UI or untrusted surfaces.
 */
export type PopsWalletActionProofClientView = Omit<PopsWalletActionProof, "fraudRisk">;

export interface PopsWalletActionEvaluationContext {
  actionType: PopsWalletSensitiveActionType;
  userId: string;
  sessionId: string;
  walletActionId: string;
  amountMinor: number;
  coinType: string;
  recipientId?: string | null;
  presenceConfidence: number;
  intentConfidence: number;
  continuityConfidence: number;
  /** Optional aggregate risk 0–1; if omitted, derived from confidence signals only. */
  fraudRiskHint?: number;
  trustScore: number;
  kycCompleted: boolean;
  kycLevel?: "NONE" | "BASIC" | "FULL";
  payoutRiskScore: number;
  accountContinuityStable: boolean;
  suspiciousRecentPopsSession: boolean;
  deliberateConfirmationCompleted: boolean;
  recipientConfirmationCompleted: boolean;
  osBiometricOrPinCompleted: boolean;
  emailConfirmationCompleted: boolean;
  securityChangeCooldownActive: boolean;
  /** Tips below this (minor units) are treated as low-value for step-up relaxation. */
  lowAmountMinorThreshold?: number;
  /** Amounts at or above this (minor units) trigger stronger step-ups where applicable. */
  highAmountMinorThreshold?: number;
  /** Conversions at or above this (minor units) count as large for step-up. */
  largeConversionMinorThreshold?: number;
}

export interface PopsWalletActionRuleOutcome {
  decision: PopsWalletActionDecision;
  requiresStepUp: boolean;
  stepUpType: PopsWalletStepUpType;
  reasonCodes: PopsWalletActionReasonCode[];
}
