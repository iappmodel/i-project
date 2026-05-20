/** Stage 7 — verification / POPS / fraud / settlement / dispute / trust event type strings (local simulation). */

export const STUDIO_VERIFICATION_EVENTS = {
  verificationStarted: "verification.started",
  verificationGatePassed: "verification.gate_passed",
  verificationGateFailed: "verification.gate_failed",
  verificationCompleted: "verification.completed",
  verificationFailed: "verification.failed",
  verificationRejected: "verification.rejected",
  verificationUnderReview: "verification.under_review",
} as const;

export const STUDIO_POPS_EVENTS = {
  challengeCreated: "pops.challenge_created",
  challengeShown: "pops.challenge_shown",
  challengePassed: "pops.challenge_passed",
  challengeFailed: "pops.challenge_failed",
  challengeExpired: "pops.challenge_expired",
} as const;

export const STUDIO_FRAUD_EVENTS = {
  assessmentCreated: "fraud.assessment_created",
  signalDetected: "fraud.signal_detected",
  riskLow: "fraud.risk_low",
  riskMedium: "fraud.risk_medium",
  riskHigh: "fraud.risk_high",
  riskCritical: "fraud.risk_critical",
  actionAllowed: "fraud.action_allowed",
  actionHeld: "fraud.action_held",
  actionRejected: "fraud.action_rejected",
  actionReversed: "fraud.action_reversed",
} as const;

export const STUDIO_SETTLEMENT_VERIFICATION_EVENTS = {
  decisionCreated: "settlement.decision_created",
  holdApplied: "settlement.hold_applied",
  releaseAllowed: "settlement.release_allowed",
  releaseBlocked: "settlement.release_blocked",
  reversalRequired: "settlement.reversal_required",
} as const;

export const STUDIO_DISPUTE_EVENTS = {
  created: "dispute.created",
  evidenceCollected: "dispute.evidence_collected",
  underReview: "dispute.under_review",
  resolvedViewerWins: "dispute.resolved_viewer_wins",
  resolvedCreatorWins: "dispute.resolved_creator_wins",
  refunded: "dispute.refunded",
  rejected: "dispute.rejected",
  escalated: "dispute.escalated",
} as const;

export const STUDIO_TRUST_EVENTS = {
  impactCreated: "trust.impact_created",
  impactApplied: "trust.impact_applied",
} as const;
