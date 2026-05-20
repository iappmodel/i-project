export const POPS_INTENT_ACTION_TYPE = {
  CTA_CLICK: "CTA_CLICK",
  FOLLOW_CREATOR: "FOLLOW_CREATOR",
  SAVE_CONTENT: "SAVE_CONTENT",
  SHARE_CONTENT: "SHARE_CONTENT",
  COMMENT: "COMMENT",
  LIKE_REACTION: "LIKE_REACTION",
  SURVEY_ANSWER: "SURVEY_ANSWER",
  PURCHASE_CLICK: "PURCHASE_CLICK",
  QR_SCAN: "QR_SCAN",
  NFC_TAP: "NFC_TAP",
  TIP_SEND: "TIP_SEND",
  WALLET_CONVERT: "WALLET_CONVERT",
  WITHDRAW_REQUEST: "WITHDRAW_REQUEST",
  CAMPAIGN_COMPLETE: "CAMPAIGN_COMPLETE"
} as const;

export type PopsIntentActionType =
  (typeof POPS_INTENT_ACTION_TYPE)[keyof typeof POPS_INTENT_ACTION_TYPE];

export const POPS_INTENT_REASON_CODE = {
  VALID_DELIBERATE_ACTION: "VALID_DELIBERATE_ACTION",
  VALID_AFTER_DWELL: "VALID_AFTER_DWELL",
  VALID_CONTEXT_MATCH: "VALID_CONTEXT_MATCH",
  ACTION_TOO_FAST: "ACTION_TOO_FAST",
  ACCIDENTAL_TAP_RISK: "ACCIDENTAL_TAP_RISK",
  RAGE_TAP_PATTERN: "RAGE_TAP_PATTERN",
  DUPLICATE_ACTION_PATTERN: "DUPLICATE_ACTION_PATTERN",
  AUTOMATION_TIMING_PATTERN: "AUTOMATION_TIMING_PATTERN",
  LOW_CONTEXT_MATCH: "LOW_CONTEXT_MATCH",
  HIGH_INTENT_CONFIDENCE: "HIGH_INTENT_CONFIDENCE",
  MEDIUM_INTENT_CONFIDENCE: "MEDIUM_INTENT_CONFIDENCE",
  LOW_INTENT_CONFIDENCE: "LOW_INTENT_CONFIDENCE"
} as const;

export type PopsIntentReasonCode =
  (typeof POPS_INTENT_REASON_CODE)[keyof typeof POPS_INTENT_REASON_CODE];

export interface PopsIntentSignal {
  actionType: PopsIntentActionType;
  timestampMs: number;
  contentExposureMs: number;
  dwellBeforeActionMs: number;
  tapPrecisionScore: number;
  tapTimingScore: number;
  touchRhythmScore: number;
  hesitationScore: number;
  rageTapScore: number;
  backtrackScore: number;
  repeatActionScore: number;
  contextMatchScore: number;
  accidentalActionRisk: number;
  automationRisk: number;
  intentConfidence: number;
}

export interface PopsIntentEvaluationContext {
  isActiveSession: boolean;
  priorExposureMs?: number;
  seenProfileView?: boolean;
  replayCount?: number;
  scrollPauseCount?: number;
  surveyQuestionReadMs?: number;
  surveyExpectedReadMs?: number;
  sameChoiceStreak?: number;
  walletConfirmed?: boolean;
  explicitUserConfirmation?: boolean;
  sessionContinuityOk?: boolean;
  identityContinuityOk?: boolean;
  deviceTrustScore?: number;
}

export interface PopsIntentAssessment {
  signal: PopsIntentSignal;
  intentConfidence: number;
  isDeliberate: boolean;
  reasonCodes: PopsIntentReasonCode[];
}
