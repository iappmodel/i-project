export const POPS_PRESENCE_WEIGHTS_V1 = {
  screenPresenceComponent: 0.3,
  appForegroundComponent: 0.2,
  sessionDurationComponent: 0.15,
  motionComponent: 0.1,
  visualComponent: 0.15,
  accountContinuityComponent: 0.1,
} as const;

export const POPS_ATTENTION_WEIGHTS_V1 = {
  contentProgressComponent: 0.3,
  activeDwellComponent: 0.2,
  interactionNaturalnessComponent: 0.15,
  pauseResumeNormalityComponent: 0.1,
  interruptionPenaltyComponent: 0.15,
  proofLevelSignalComponent: 0.1,
} as const;

export const POPS_INTENT_WEIGHTS_V1 = {
  dwellBeforeActionComponent: 0.25,
  tapPrecisionComponent: 0.15,
  actionSequenceComponent: 0.2,
  contextMatchComponent: 0.2,
  timingNaturalnessComponent: 0.1,
  duplicatePenaltyComponent: 0.1,
} as const;

export const POPS_CONTINUITY_WEIGHTS_V1 = {
  accountContinuityComponent: 0.35,
  deviceIntegrityComponent: 0.25,
  sessionConsistencyComponent: 0.2,
  historicalPatternComponent: 0.1,
  identitySignalComponent: 0.1,
} as const;

export const POPS_FRAUD_RISK_WEIGHTS_V1 = {
  impossibleProgressRisk: 0.2,
  automationTimingRisk: 0.15,
  deviceIntegrityRisk: 0.2,
  duplicateRewardRisk: 0.15,
  sessionAnomalyRisk: 0.1,
  accountPatternRisk: 0.1,
  campaignAbuseRisk: 0.1,
} as const;

export type PopsScoreWeightsV1 = {
  presence: typeof POPS_PRESENCE_WEIGHTS_V1;
  attention: typeof POPS_ATTENTION_WEIGHTS_V1;
  intent: typeof POPS_INTENT_WEIGHTS_V1;
  continuity: typeof POPS_CONTINUITY_WEIGHTS_V1;
  fraudRisk: typeof POPS_FRAUD_RISK_WEIGHTS_V1;
};

export const POPS_SCORE_WEIGHTS_V1: PopsScoreWeightsV1 = {
  presence: POPS_PRESENCE_WEIGHTS_V1,
  attention: POPS_ATTENTION_WEIGHTS_V1,
  intent: POPS_INTENT_WEIGHTS_V1,
  continuity: POPS_CONTINUITY_WEIGHTS_V1,
  fraudRisk: POPS_FRAUD_RISK_WEIGHTS_V1,
};
