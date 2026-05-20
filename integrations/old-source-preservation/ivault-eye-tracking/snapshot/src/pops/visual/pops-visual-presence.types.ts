export type PopsVisualPresenceState =
  | "NOT_REQUESTED"
  | "PERMISSION_REQUIRED"
  | "INITIALIZING"
  | "ACTIVE"
  | "FACE_PRESENT"
  | "FACE_MISSING"
  | "DEGRADED_LIGHTING"
  | "DEGRADED_OCCLUSION"
  | "MULTIPLE_FACES"
  | "SPOOF_RISK"
  | "UNAVAILABLE"
  | "DISABLED_BY_USER";

export type PopsVisualSignal = {
  timestampMs: number;
  facePresent: boolean;
  faceCount: number;
  visualQuality: number;
  lightingQuality: number;
  cameraOcclusionRisk: number;
  headPoseStability: number;
  eyeOpennessScore: number;
  gazeTowardScreenEstimate: number;
  blinkNaturalnessScore: number;
  visualAttentionEstimate: number;
  spoofRiskEstimate: number;
  identityContinuityEstimate: number;
  rawFrameStored: boolean;
  localProcessingUsed: boolean;
};

export type PopsVisualScoreBreakdown = {
  facePresentWeight: number;
  visualQualityWeight: number;
  headPoseStabilityWeight: number;
  blinkNaturalnessWeight: number;
  gazeEstimateWeight: number;
  spoofRiskPenalty: number;
  occlusionPenalty: number;
  multipleFacesPenalty: number;
};

export type PopsVisualScoringWeights = {
  facePresent: number;
  visualQuality: number;
  headPoseStability: number;
  blinkNaturalness: number;
  gazeEstimate: number;
  spoofRiskPenalty: number;
  occlusionPenalty: number;
  multipleFacesPenalty: number;
};

export type PopsVisualScoringContext = {
  campaignRequiresVisualProof?: boolean;
  highValueRewardFlow?: boolean;
  proofLevel?: "BASIC" | "ATTENTION" | "STRONG";
  progressAdvancing?: boolean;
  elapsedSinceFacePresentMs?: number;
  repeatedLongAbsenceCount?: number;
};

export type PopsVisualPresenceComputation = {
  state: PopsVisualPresenceState;
  visualPresenceScore: number;
  visualQuality: number;
  visualSpoofRisk: number;
  visualContinuityScore: number;
  breakdown: PopsVisualScoreBreakdown;
  holdSuggested: boolean;
  denySuggested: boolean;
  reasons: string[];
};

export type PopsVisualSignalInput = Partial<PopsVisualSignal> & { timestampMs?: number };

