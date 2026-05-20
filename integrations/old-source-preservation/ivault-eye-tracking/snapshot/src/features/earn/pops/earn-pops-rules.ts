export const EARN_OFFER_PROOF_LEVEL = {
  BASIC_SESSION: "BASIC_SESSION",
  VERIFIED_ATTENTION: "VERIFIED_ATTENTION",
  INTENT_PROOF: "INTENT_PROOF",
  REAL_WORLD_PROOF: "REAL_WORLD_PROOF",
  HIGH_VALUE_PROOF: "HIGH_VALUE_PROOF"
} as const;

export type EarnOfferProofLevel =
  (typeof EARN_OFFER_PROOF_LEVEL)[keyof typeof EARN_OFFER_PROOF_LEVEL];

export const EARN_POPS_PREFLIGHT_STATUS = {
  ELIGIBLE: "ELIGIBLE",
  ALREADY_COMPLETED: "ALREADY_COMPLETED",
  CAMPAIGN_FULL: "CAMPAIGN_FULL",
  AGE_RESTRICTED: "AGE_RESTRICTED",
  KYC_REQUIRED: "KYC_REQUIRED",
  TRUST_TOO_LOW: "TRUST_TOO_LOW",
  DEVICE_NOT_ELIGIBLE: "DEVICE_NOT_ELIGIBLE",
  PERMISSION_REQUIRED: "PERMISSION_REQUIRED",
  REGION_NOT_ELIGIBLE: "REGION_NOT_ELIGIBLE"
} as const;

export type EarnPopsPreflightStatus =
  (typeof EARN_POPS_PREFLIGHT_STATUS)[keyof typeof EARN_POPS_PREFLIGHT_STATUS];

export const EARN_POPS_COMPLETION_STATE = {
  APPROVED_FULL: "APPROVED_FULL",
  APPROVED_PARTIAL: "APPROVED_PARTIAL",
  PENDING_REVIEW: "PENDING_REVIEW",
  DENIED: "DENIED"
} as const;

export type EarnPopsCompletionState =
  (typeof EARN_POPS_COMPLETION_STATE)[keyof typeof EARN_POPS_COMPLETION_STATE];

export interface EarnOfferProofRequirements {
  proofLevel: EarnOfferProofLevel;
  requiredActions: string[];
  visualPresenceNeeded: boolean;
  locationProofNeeded: boolean;
  kycMayBeRequired: boolean;
  pendingReleaseExpectation: string;
}

export interface EarnOfferPopsCampaign {
  campaignId: string;
  rewardAmountMinor: number;
  currency: "USD" | "ICOIN" | "VCOIN" | "RCOIN";
  estimatedTimeMinutes: number;
  budgetAvailable: boolean;
  minimumAge: number | null;
  allowedRegions: string[];
  minimumTrustTier: number;
  devicesAllowed: string[];
  permissionsRequired: string[];
  proofRequirements: EarnOfferProofRequirements;
}

export interface EarnOfferPopsUserContext {
  userAge: number;
  region: string;
  completedCampaignIds: string[];
  hasKyc: boolean;
  trustTier: number;
  deviceType: string;
  grantedPermissions: string[];
}

export interface EarnPopsPreflightResult {
  status: EarnPopsPreflightStatus;
  blockingReasons: string[];
}

export const EARN_OFFER_PROOF_LEVEL_COPY: Record<EarnOfferProofLevel, string> = {
  BASIC_SESSION:
    "Open and complete the session. P.O.P.S verifies app activity and completion.",
  VERIFIED_ATTENTION:
    "Watch with the app open. P.O.P.S verifies that the moment was active before reward release.",
  INTENT_PROOF:
    "Complete the action after engaging. P.O.P.S verifies deliberate participation.",
  REAL_WORLD_PROOF:
    "Visit, scan, or check in. P.O.P.S verifies real-world presence.",
  HIGH_VALUE_PROOF:
    "Higher rewards require stronger verification and may be reviewed before release."
};

export const EARN_OFFER_START_FLOW_STEPS = [
  "User taps offer",
  "Offer detail loads campaign requirements",
  "P.O.P.S preflight checks eligibility",
  "If eligible, user starts",
  "P.O.P.S session starts",
  "Offer task runs",
  "P.O.P.S checkpoints update UI",
  "Completion triggers pipeline",
  "Reward decision returns",
  "Wallet pending state updates"
] as const;

export interface EarnOfferVerificationStep {
  id: string;
  label: string;
  completed: boolean;
}

export const EARN_POPS_COMPLETION_COPY: Record<
  EarnPopsCompletionState,
  { title: string; body: string }
> = {
  APPROVED_FULL: {
    title: "Moment verified",
    body: "Reward pending"
  },
  APPROVED_PARTIAL: {
    title: "Moment verified",
    body: "Reward pending"
  },
  PENDING_REVIEW: {
    title: "Reward under review",
    body: "Moment confidence rising"
  },
  DENIED: {
    title: "Moment not verified",
    body: "Moment not verified"
  }
};

export interface EarnOfferCheckpointState {
  sessionStarted: boolean;
  taskRunning: boolean;
  checkpointsUpdating: boolean;
  completionTriggered: boolean;
  rewardDecisionReturned: boolean;
  walletPendingUpdated: boolean;
}

export function evaluateEarnOfferPreflight(
  campaign: EarnOfferPopsCampaign,
  user: EarnOfferPopsUserContext
): EarnPopsPreflightResult {
  if (user.completedCampaignIds.includes(campaign.campaignId)) {
    return { status: EARN_POPS_PREFLIGHT_STATUS.ALREADY_COMPLETED, blockingReasons: ["previous_completion"] };
  }
  if (!campaign.budgetAvailable) {
    return { status: EARN_POPS_PREFLIGHT_STATUS.CAMPAIGN_FULL, blockingReasons: ["campaign_budget_unavailable"] };
  }
  if (campaign.minimumAge !== null && user.userAge < campaign.minimumAge) {
    return { status: EARN_POPS_PREFLIGHT_STATUS.AGE_RESTRICTED, blockingReasons: ["minimum_age_not_met"] };
  }
  if (campaign.proofRequirements.kycMayBeRequired && !user.hasKyc) {
    return { status: EARN_POPS_PREFLIGHT_STATUS.KYC_REQUIRED, blockingReasons: ["kyc_needed_for_offer"] };
  }
  if (!campaign.allowedRegions.includes(user.region)) {
    return { status: EARN_POPS_PREFLIGHT_STATUS.REGION_NOT_ELIGIBLE, blockingReasons: ["region_not_supported"] };
  }
  if (user.trustTier < campaign.minimumTrustTier) {
    return { status: EARN_POPS_PREFLIGHT_STATUS.TRUST_TOO_LOW, blockingReasons: ["trust_tier_below_requirement"] };
  }
  if (!campaign.devicesAllowed.includes(user.deviceType)) {
    return { status: EARN_POPS_PREFLIGHT_STATUS.DEVICE_NOT_ELIGIBLE, blockingReasons: ["device_not_supported"] };
  }

  const missingPermissions = campaign.permissionsRequired.filter(
    (permission) => !user.grantedPermissions.includes(permission)
  );
  if (missingPermissions.length > 0) {
    return {
      status: EARN_POPS_PREFLIGHT_STATUS.PERMISSION_REQUIRED,
      blockingReasons: missingPermissions
    };
  }

  return { status: EARN_POPS_PREFLIGHT_STATUS.ELIGIBLE, blockingReasons: [] };
}

export function buildEarnOfferVerificationSteps(
  checkpoints: EarnOfferCheckpointState
): EarnOfferVerificationStep[] {
  return [
    { id: "tap_offer", label: EARN_OFFER_START_FLOW_STEPS[0], completed: true },
    { id: "detail_loaded", label: EARN_OFFER_START_FLOW_STEPS[1], completed: true },
    { id: "preflight", label: EARN_OFFER_START_FLOW_STEPS[2], completed: true },
    { id: "start", label: EARN_OFFER_START_FLOW_STEPS[3], completed: checkpoints.sessionStarted },
    { id: "session", label: EARN_OFFER_START_FLOW_STEPS[4], completed: checkpoints.sessionStarted },
    { id: "task", label: EARN_OFFER_START_FLOW_STEPS[5], completed: checkpoints.taskRunning },
    { id: "checkpoints", label: EARN_OFFER_START_FLOW_STEPS[6], completed: checkpoints.checkpointsUpdating },
    { id: "completion", label: EARN_OFFER_START_FLOW_STEPS[7], completed: checkpoints.completionTriggered },
    { id: "decision", label: EARN_OFFER_START_FLOW_STEPS[8], completed: checkpoints.rewardDecisionReturned },
    { id: "wallet", label: EARN_OFFER_START_FLOW_STEPS[9], completed: checkpoints.walletPendingUpdated }
  ];
}
