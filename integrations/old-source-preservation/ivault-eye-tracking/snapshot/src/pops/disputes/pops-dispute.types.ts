export const POPS_DISPUTE_STATUS = {
  CREATED: "CREATED",
  UNDER_REVIEW: "UNDER_REVIEW",
  NEEDS_MORE_INFO: "NEEDS_MORE_INFO",
  APPROVED: "APPROVED",
  PARTIALLY_APPROVED: "PARTIALLY_APPROVED",
  DENIED: "DENIED",
  CLOSED: "CLOSED"
} as const;

export type PopsDisputeStatus = (typeof POPS_DISPUTE_STATUS)[keyof typeof POPS_DISPUTE_STATUS];

export const POPS_DISPUTE_REASON = {
  COMPLETED_ACTION: "I completed the action",
  VERIFICATION_FAILED: "App verification failed",
  REWARD_AMOUNT_WRONG: "Reward amount is wrong",
  SESSION_INTERRUPTED: "Session was interrupted",
  LOCATION_VERIFICATION_FAILED: "Location verification failed",
  MISTAKE: "I think this was a mistake",
  OTHER: "Other"
} as const;

export type PopsDisputeReason = (typeof POPS_DISPUTE_REASON)[keyof typeof POPS_DISPUTE_REASON];

export const POPS_DISPUTE_STATUS_COPY: Record<PopsDisputeStatus, string> = {
  CREATED: "Dispute submitted.",
  UNDER_REVIEW: "Review in progress.",
  NEEDS_MORE_INFO: "We need more information.",
  APPROVED: "Reward approved.",
  PARTIALLY_APPROVED: "Partial reward approved.",
  DENIED: "Decision upheld.",
  CLOSED: "Dispute closed."
};

export const POPS_DISPUTE_FORM_COPY = {
  title: "Dispute reward decision",
  body:
    "If you believe this moment was incorrectly verified, you can request review. P.O.P.S will not expose private fraud signals, but a reviewer can check your session receipt and reward decision.",
  userMessagePlaceholder: "Tell us what happened."
} as const;

export interface PopsDispute {
  id: string;
  userId: string;
  sessionId: string;
  rewardDecisionId: string;
  walletRewardIntentId: string | null;
  status: PopsDisputeStatus;
  reason: PopsDisputeReason;
  userMessage: string;
  evidenceAttachments: string[];
  adminDecision: string | null;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface PopsDisputeAttachment {
  id: string;
  disputeId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface PopsDisputeEvent {
  id: string;
  disputeId: string;
  status: PopsDisputeStatus;
  actorType: "USER" | "ADMIN" | "SYSTEM";
  actorId: string | null;
  note: string | null;
  createdAt: string;
}

export interface PopsCreateDisputeInput {
  userId: string;
  sessionId: string;
  rewardDecisionId: string;
  walletRewardIntentId?: string | null;
  reason: PopsDisputeReason;
  userMessage: string;
  evidenceAttachments?: string[];
}

export interface PopsResolveDisputeInput {
  disputeId: string;
  adminId: string;
  status:
    | typeof POPS_DISPUTE_STATUS.APPROVED
    | typeof POPS_DISPUTE_STATUS.PARTIALLY_APPROVED
    | typeof POPS_DISPUTE_STATUS.DENIED
    | typeof POPS_DISPUTE_STATUS.NEEDS_MORE_INFO
    | typeof POPS_DISPUTE_STATUS.CLOSED;
  adminDecision: string;
  adminNote?: string;
}

export interface PopsDisputeRateLimitConfig {
  maxDisputesPerWindow: number;
  windowMs: number;
}

export interface PopsDisputeAbuseSignal {
  userId: string;
  disputeId: string;
  signal: "DISPUTE_ABUSE_WARNING" | "DISPUTE_ABUSE_CONFIRMED";
  detail: string;
  createdAt: string;
}

export interface PopsDisputeCorrectionEvent {
  userId: string;
  disputeId: string;
  rewardDecisionId: string;
  eventType: "REWARD_DECISION_CORRECTED";
  message: string;
  createdAt: string;
}
