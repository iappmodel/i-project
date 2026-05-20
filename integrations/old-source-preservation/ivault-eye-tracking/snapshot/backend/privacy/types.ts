export enum DataClass {
  EphemeralHumanSignal = "EPHEMERAL_HUMAN_SIGNAL",
  UserControlledPrivateIntelligence = "USER_CONTROLLED_PRIVATE_INTELLIGENCE",
  EconomicLegalProof = "ECONOMIC_LEGAL_PROOF",
}

export enum RetentionPolicy {
  ImmediateDelete = "IMMEDIATE_DELETE",
  SessionBounded = "SESSION_BOUNDED",
  UserControlled = "USER_CONTROLLED",
  RegulatoryFinancial = "REGULATORY_FINANCIAL",
  FraudReviewWindow = "FRAUD_REVIEW_WINDOW",
}

export enum ProcessingLocation {
  OnDevice = "ON_DEVICE",
  TrustedEdge = "TRUSTED_EDGE",
  SecureBackend = "SECURE_BACKEND",
}

export enum ConsentScope {
  PrivateVaultStorage = "PRIVATE_VAULT_STORAGE",
  PersonalAnalytics = "PERSONAL_ANALYTICS",
  AccessibilityCalibration = "ACCESSIBILITY_CALIBRATION",
  PersonalAiMemory = "PERSONAL_AI_MEMORY",
  TaxAndPayoutCompliance = "TAX_AND_PAYOUT_COMPLIANCE",
}

export enum PrivacyPurpose {
  AttentionVerification = "ATTENTION_VERIFICATION",
  RewardIssuance = "REWARD_ISSUANCE",
  WalletLedgerSettlement = "WALLET_LEDGER_SETTLEMENT",
  CampaignCompletionProof = "CAMPAIGN_COMPLETION_PROOF",
  FraudRiskEvaluation = "FRAUD_RISK_EVALUATION",
  TrustScoreComputation = "TRUST_SCORE_COMPUTATION",
  ConsentManagement = "CONSENT_MANAGEMENT",
  RetentionEnforcement = "RETENTION_ENFORCEMENT",
  UserPrivateInsights = "USER_PRIVATE_INSIGHTS",
}

export enum RawSignalType {
  CameraFrame = "CAMERA_FRAME",
  FaceMesh = "FACE_MESH",
  GazeVector = "GAZE_VECTOR",
  PupilEstimate = "PUPIL_ESTIMATE",
  EyeTrackingFrame = "EYE_TRACKING_FRAME",
  FacialExpressionInference = "FACIAL_EXPRESSION_INFERENCE",
  RawGpsStream = "RAW_GPS_STREAM",
  RawScrollTouchTrace = "RAW_SCROLL_TOUCH_TRACE",
  RawAttentionSessionBuffer = "RAW_ATTENTION_SESSION_BUFFER",
  RawBiometricBehavioralSignal = "RAW_BIOMETRIC_BEHAVIORAL_SIGNAL",
}

export enum DerivedInsightType {
  PersonalEarningInsight = "PERSONAL_EARNING_INSIGHT",
  AttentionTimelineSummary = "ATTENTION_TIMELINE_SUMMARY",
  CreatorPerformanceHistory = "CREATOR_PERFORMANCE_HISTORY",
  AccessibilityCalibration = "ACCESSIBILITY_CALIBRATION",
  LocalPreferenceProfile = "LOCAL_PREFERENCE_PROFILE",
  PersonalAiMemorySummary = "PERSONAL_AI_MEMORY_SUMMARY",
  SavedAnalyticsDashboard = "SAVED_ANALYTICS_DASHBOARD",
}

export enum EconomicProofType {
  RewardIssuanceEvent = "REWARD_ISSUANCE_EVENT",
  WalletLedgerEntry = "WALLET_LEDGER_ENTRY",
  PendingRewardState = "PENDING_REWARD_STATE",
  CampaignCompletionProof = "CAMPAIGN_COMPLETION_PROOF",
  PayoutRecord = "PAYOUT_RECORD",
  ConversionRecord = "CONVERSION_RECORD",
  FraudScoreSummary = "FRAUD_SCORE_SUMMARY",
  TrustScoreSummary = "TRUST_SCORE_SUMMARY",
  ConsentReceipt = "CONSENT_RECEIPT",
  TaxKycRecord = "TAX_KYC_RECORD",
}

export type PrivacyStatus = "ACTIVE" | "INTERPRETED" | "DELETED" | "FAILED";
