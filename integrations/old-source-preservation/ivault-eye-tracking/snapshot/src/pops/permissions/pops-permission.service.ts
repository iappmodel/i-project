import type { PopsRequirementToggle } from "../campaigns/pops-campaign-requirements.types";
import {
  POPS_PROOF_LEVEL,
  POPS_SESSION_TYPE,
  type PopsProofLevel,
  type PopsSessionType
} from "../../../services/api/src/pops/types/pops.types";
import { getPopsPermissionCopy } from "./pops-permission-copy";
import {
  POPS_PERMISSION_DECLINE_IMPACT,
  POPS_PERMISSION_PURPOSE,
  POPS_PERMISSION_STATUS,
  POPS_PERMISSION_TYPE,
  type GetRequiredPermissionsForMomentInput,
  type PopsPermissionDeclineImpact,
  type PopsPermissionFallbackMethod,
  type PopsPermissionFallbackOption,
  type PopsPermissionPreflightInput,
  type PopsPermissionPreflightResult,
  type PopsPermissionRequirement,
  type PopsPermissionStatus,
  type PopsPermissionType
} from "./pops-permission.types";

const PROOF_ORDER: readonly PopsProofLevel[] = [
  POPS_PROOF_LEVEL.LEVEL_0_NONE,
  POPS_PROOF_LEVEL.LEVEL_1_SESSION,
  POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
  POPS_PROOF_LEVEL.LEVEL_3_INTENT,
  POPS_PROOF_LEVEL.LEVEL_4_IDENTITY_CONTINUITY,
  POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE
] as const;

const HIGH_VALUE_MINOR_THRESHOLD = 100_000;

function proofRank(level: PopsProofLevel): number {
  const i = PROOF_ORDER.indexOf(level);
  return i === -1 ? 0 : i;
}

function proofAtLeast(current: PopsProofLevel, minimum: PopsProofLevel): boolean {
  return proofRank(current) >= proofRank(minimum);
}

function campaignRequired(t: PopsRequirementToggle): boolean {
  return t === true;
}

function campaignOptional(t: PopsRequirementToggle): boolean {
  return t === "optional" || t === "conditional";
}

function declineRank(d: PopsPermissionDeclineImpact): number {
  const order: PopsPermissionDeclineImpact[] = [
    POPS_PERMISSION_DECLINE_IMPACT.NO_IMPACT,
    POPS_PERMISSION_DECLINE_IMPACT.LOWER_CONFIDENCE,
    POPS_PERMISSION_DECLINE_IMPACT.EXTRA_VERIFICATION_REQUIRED,
    POPS_PERMISSION_DECLINE_IMPACT.PARTIAL_REWARD_ONLY,
    POPS_PERMISSION_DECLINE_IMPACT.REWARD_NOT_AVAILABLE,
    POPS_PERMISSION_DECLINE_IMPACT.CAMPAIGN_NOT_AVAILABLE
  ];
  const i = order.indexOf(d);
  return i === -1 ? 0 : i;
}

function stricterDecline(a: PopsPermissionDeclineImpact, b: PopsPermissionDeclineImpact): PopsPermissionDeclineImpact {
  return declineRank(a) >= declineRank(b) ? a : b;
}

function reqBase(
  partial: Omit<PopsPermissionRequirement, "userVisibleReason"> & { userVisibleReason?: string }
): PopsPermissionRequirement {
  const copy = getPopsPermissionCopy(partial.permissionType);
  return {
    ...partial,
    userVisibleReason: partial.userVisibleReason ?? copy.reason
  };
}

function mergeRequirementMap(map: Map<PopsPermissionType, PopsPermissionRequirement>, next: PopsPermissionRequirement): void {
  const prev = map.get(next.permissionType);
  if (!prev) {
    map.set(next.permissionType, next);
    return;
  }
  map.set(next.permissionType, {
    ...prev,
    required: prev.required || next.required,
    purpose: next.required ? next.purpose : prev.purpose,
    requiredForProofLevel: pickHigherProof(prev.requiredForProofLevel, next.requiredForProofLevel),
    requiredForCampaignId: next.requiredForCampaignId ?? prev.requiredForCampaignId,
    canFallback: prev.canFallback && next.canFallback,
    fallbackMethod: stricterFallback(prev.fallbackMethod, next.fallbackMethod),
    userVisibleReason: next.userVisibleReason ?? prev.userVisibleReason,
    declineImpact: stricterDecline(prev.declineImpact, next.declineImpact)
  });
}

function pickHigherProof(
  a: PopsProofLevel | null,
  b: PopsProofLevel | null
): PopsProofLevel | null {
  if (!a) return b;
  if (!b) return a;
  return proofRank(a) >= proofRank(b) ? a : b;
}

function stricterFallback(a: PopsPermissionFallbackMethod, b: PopsPermissionFallbackMethod): PopsPermissionFallbackMethod {
  const rank: Record<PopsPermissionFallbackMethod, number> = {
    NONE: 0,
    DEFERRED_START: 1,
    ALTERNATE_SIGNALS: 2,
    EXTENDED_SESSION: 3,
    SECOND_FACTOR: 4,
    MANUAL_REVIEW: 5
  };
  return rank[a] >= rank[b] ? a : b;
}

function locationAllowed(input: GetRequiredPermissionsForMomentInput): boolean {
  return input.regionPolicy.config.locationProofAllowed !== false;
}

function audioAllowed(input: GetRequiredPermissionsForMomentInput): boolean {
  return input.regionPolicy.config.audioFeaturesAllowed !== false;
}

function sessionWantsLocation(sessionType: PopsSessionType): boolean {
  return (
    sessionType === POPS_SESSION_TYPE.GPS_CHECK_IN ||
    sessionType === POPS_SESSION_TYPE.QR_SCAN ||
    sessionType === POPS_SESSION_TYPE.NFC_MERCHANT
  );
}

function sessionWantsWalletSecurity(sessionType: PopsSessionType): boolean {
  return (
    sessionType === POPS_SESSION_TYPE.WALLET_CONVERSION ||
    sessionType === POPS_SESSION_TYPE.WITHDRAWAL_REVIEW ||
    sessionType === POPS_SESSION_TYPE.TIP_SEND
  );
}

function pushSessionBaseline(input: GetRequiredPermissionsForMomentInput, map: Map<PopsPermissionType, PopsPermissionRequirement>): void {
  const { sessionType, proofLevel } = input;

  mergeRequirementMap(
    map,
    reqBase({
      permissionType: POPS_PERMISSION_TYPE.SCREEN_ACTIVITY,
      purpose: POPS_PERMISSION_PURPOSE.BASIC_VERIFICATION,
      required: true,
      requiredForProofLevel: POPS_PROOF_LEVEL.LEVEL_1_SESSION,
      requiredForCampaignId: null,
      canFallback: false,
      fallbackMethod: "NONE",
      declineImpact: POPS_PERMISSION_DECLINE_IMPACT.REWARD_NOT_AVAILABLE
    })
  );

  mergeRequirementMap(
    map,
    reqBase({
      permissionType: POPS_PERMISSION_TYPE.CONTENT_PROGRESS,
      purpose: POPS_PERMISSION_PURPOSE.BASIC_VERIFICATION,
      required:
        sessionType === POPS_SESSION_TYPE.SPONSORED_WATCH ||
        sessionType === POPS_SESSION_TYPE.CREATOR_CONTENT ||
        sessionType === POPS_SESSION_TYPE.LEARNING ||
        sessionType === POPS_SESSION_TYPE.SURVEY,
      requiredForProofLevel: POPS_PROOF_LEVEL.LEVEL_1_SESSION,
      requiredForCampaignId: null,
      canFallback: sessionType === POPS_SESSION_TYPE.FEED_VIEW,
      fallbackMethod: sessionType === POPS_SESSION_TYPE.FEED_VIEW ? "EXTENDED_SESSION" : "NONE",
      declineImpact: sessionType === POPS_SESSION_TYPE.SPONSORED_WATCH
        ? POPS_PERMISSION_DECLINE_IMPACT.REWARD_NOT_AVAILABLE
        : POPS_PERMISSION_DECLINE_IMPACT.LOWER_CONFIDENCE
    })
  );

  if (proofAtLeast(proofLevel, POPS_PROOF_LEVEL.LEVEL_2_ATTENTION)) {
    mergeRequirementMap(
      map,
      reqBase({
        permissionType: POPS_PERMISSION_TYPE.DEVICE_MOTION,
        purpose: POPS_PERMISSION_PURPOSE.ATTENTION_VERIFICATION,
        required: false,
        requiredForProofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
        requiredForCampaignId: null,
        canFallback: true,
        fallbackMethod: "ALTERNATE_SIGNALS",
        declineImpact: POPS_PERMISSION_DECLINE_IMPACT.NO_IMPACT
      })
    );
  }

  if (sessionType === POPS_SESSION_TYPE.BRAND_CAMPAIGN || sessionType === POPS_SESSION_TYPE.PURCHASE_INTENT) {
    mergeRequirementMap(
      map,
      reqBase({
        permissionType: POPS_PERMISSION_TYPE.TOUCH_BEHAVIOR,
        purpose: POPS_PERMISSION_PURPOSE.INTENT_VERIFICATION,
        required: proofAtLeast(proofLevel, POPS_PROOF_LEVEL.LEVEL_3_INTENT),
        requiredForProofLevel: POPS_PROOF_LEVEL.LEVEL_3_INTENT,
        requiredForCampaignId: null,
        canFallback: true,
        fallbackMethod: "SECOND_FACTOR",
        declineImpact: POPS_PERMISSION_DECLINE_IMPACT.EXTRA_VERIFICATION_REQUIRED
      })
    );
  }

  if (sessionWantsLocation(sessionType) && locationAllowed(input)) {
    mergeRequirementMap(
      map,
      reqBase({
        permissionType: POPS_PERMISSION_TYPE.LOCATION_CLASS,
        purpose: POPS_PERMISSION_PURPOSE.REAL_WORLD_PROOF,
        required: true,
        requiredForProofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
        requiredForCampaignId: null,
        canFallback: false,
        fallbackMethod: "NONE",
        declineImpact: POPS_PERMISSION_DECLINE_IMPACT.CAMPAIGN_NOT_AVAILABLE
      })
    );
    if (sessionType === POPS_SESSION_TYPE.NFC_MERCHANT || sessionType === POPS_SESSION_TYPE.QR_SCAN) {
      mergeRequirementMap(
        map,
        reqBase({
          permissionType: POPS_PERMISSION_TYPE.PRECISE_LOCATION,
          purpose: POPS_PERMISSION_PURPOSE.REAL_WORLD_PROOF,
          required: sessionType === POPS_SESSION_TYPE.NFC_MERCHANT,
          requiredForProofLevel: POPS_PROOF_LEVEL.LEVEL_3_INTENT,
          requiredForCampaignId: null,
          canFallback: sessionType === POPS_SESSION_TYPE.QR_SCAN,
          fallbackMethod: "ALTERNATE_SIGNALS",
          declineImpact: POPS_PERMISSION_DECLINE_IMPACT.REWARD_NOT_AVAILABLE
        })
      );
    }
  }

  if (sessionWantsWalletSecurity(sessionType)) {
    mergeRequirementMap(
      map,
      reqBase({
        permissionType: POPS_PERMISSION_TYPE.DEVICE_INTEGRITY,
        purpose:
          sessionType === POPS_SESSION_TYPE.WITHDRAWAL_REVIEW
            ? POPS_PERMISSION_PURPOSE.PAYOUT_SECURITY
            : POPS_PERMISSION_PURPOSE.WALLET_SECURITY,
        required:
          sessionType === POPS_SESSION_TYPE.WALLET_CONVERSION || sessionType === POPS_SESSION_TYPE.WITHDRAWAL_REVIEW,
        requiredForProofLevel: POPS_PROOF_LEVEL.LEVEL_4_IDENTITY_CONTINUITY,
        requiredForCampaignId: null,
        canFallback: sessionType === POPS_SESSION_TYPE.TIP_SEND,
        fallbackMethod: "MANUAL_REVIEW",
        declineImpact: POPS_PERMISSION_DECLINE_IMPACT.EXTRA_VERIFICATION_REQUIRED
      })
    );
    mergeRequirementMap(
      map,
      reqBase({
        permissionType: POPS_PERMISSION_TYPE.ACCOUNT_CONTINUITY,
        purpose:
          sessionType === POPS_SESSION_TYPE.WITHDRAWAL_REVIEW
            ? POPS_PERMISSION_PURPOSE.PAYOUT_SECURITY
            : POPS_PERMISSION_PURPOSE.WALLET_SECURITY,
        required: proofAtLeast(proofLevel, POPS_PROOF_LEVEL.LEVEL_3_INTENT),
        requiredForProofLevel: POPS_PROOF_LEVEL.LEVEL_3_INTENT,
        requiredForCampaignId: null,
        canFallback: true,
        fallbackMethod: "SECOND_FACTOR",
        declineImpact: POPS_PERMISSION_DECLINE_IMPACT.EXTRA_VERIFICATION_REQUIRED
      })
    );
  }

  if (sessionType === POPS_SESSION_TYPE.ACCOUNT_VERIFICATION) {
    mergeRequirementMap(
      map,
      reqBase({
        permissionType: POPS_PERMISSION_TYPE.ACCOUNT_CONTINUITY,
        purpose: POPS_PERMISSION_PURPOSE.FRAUD_PREVENTION,
        required: true,
        requiredForProofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
        requiredForCampaignId: null,
        canFallback: false,
        fallbackMethod: "NONE",
        declineImpact: POPS_PERMISSION_DECLINE_IMPACT.REWARD_NOT_AVAILABLE
      })
    );
  }

  if (proofAtLeast(proofLevel, POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE)) {
    mergeRequirementMap(
      map,
      reqBase({
        permissionType: POPS_PERMISSION_TYPE.VISUAL_PRESENCE,
        purpose: POPS_PERMISSION_PURPOSE.HIGH_VALUE_REWARD,
        required: false,
        requiredForProofLevel: POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE,
        requiredForCampaignId: null,
        canFallback: true,
        fallbackMethod: "MANUAL_REVIEW",
        declineImpact: POPS_PERMISSION_DECLINE_IMPACT.PARTIAL_REWARD_ONLY
      })
    );
  }

  if (audioAllowed(input) && proofAtLeast(proofLevel, POPS_PROOF_LEVEL.LEVEL_3_INTENT)) {
    mergeRequirementMap(
      map,
      reqBase({
        permissionType: POPS_PERMISSION_TYPE.AUDIO_FEATURES,
        purpose: POPS_PERMISSION_PURPOSE.ATTENTION_VERIFICATION,
        required: false,
        requiredForProofLevel: POPS_PROOF_LEVEL.LEVEL_3_INTENT,
        requiredForCampaignId: null,
        canFallback: true,
        fallbackMethod: "ALTERNATE_SIGNALS",
        declineImpact: POPS_PERMISSION_DECLINE_IMPACT.NO_IMPACT
      })
    );
  }

  mergeRequirementMap(
    map,
    reqBase({
      permissionType: POPS_PERMISSION_TYPE.NOTIFICATIONS,
      purpose: POPS_PERMISSION_PURPOSE.BASIC_VERIFICATION,
      required: false,
      requiredForProofLevel: null,
      requiredForCampaignId: null,
      canFallback: true,
      fallbackMethod: "DEFERRED_START",
      declineImpact: POPS_PERMISSION_DECLINE_IMPACT.NO_IMPACT
    })
  );

  mergeRequirementMap(
    map,
    reqBase({
      permissionType: POPS_PERMISSION_TYPE.BACKGROUND_SYNC,
      purpose: POPS_PERMISSION_PURPOSE.BASIC_VERIFICATION,
      required: false,
      requiredForProofLevel: null,
      requiredForCampaignId: null,
      canFallback: true,
      fallbackMethod: "DEFERRED_START",
      declineImpact: POPS_PERMISSION_DECLINE_IMPACT.LOWER_CONFIDENCE
    })
  );
}

function mergeCampaignRequirements(
  input: GetRequiredPermissionsForMomentInput,
  map: Map<PopsPermissionType, PopsPermissionRequirement>
): void {
  const c = input.campaignRequirements;
  if (!c) return;
  const cid = c.campaignId;

  if (campaignRequired(c.visualPresenceRequired) || campaignOptional(c.visualPresenceRequired)) {
    mergeRequirementMap(
      map,
      reqBase({
        permissionType: POPS_PERMISSION_TYPE.VISUAL_PRESENCE,
        purpose: POPS_PERMISSION_PURPOSE.HIGH_VALUE_REWARD,
        required: campaignRequired(c.visualPresenceRequired),
        requiredForProofLevel: c.requiredProofLevel,
        requiredForCampaignId: cid,
        canFallback: !campaignRequired(c.visualPresenceRequired),
        fallbackMethod: "MANUAL_REVIEW",
        declineImpact: campaignRequired(c.visualPresenceRequired)
          ? POPS_PERMISSION_DECLINE_IMPACT.REWARD_NOT_AVAILABLE
          : POPS_PERMISSION_DECLINE_IMPACT.PARTIAL_REWARD_ONLY
      })
    );
  }

  if (campaignRequired(c.interactionRequired) || campaignOptional(c.interactionRequired)) {
    mergeRequirementMap(
      map,
      reqBase({
        permissionType: POPS_PERMISSION_TYPE.TOUCH_BEHAVIOR,
        purpose: POPS_PERMISSION_PURPOSE.INTENT_VERIFICATION,
        required: campaignRequired(c.interactionRequired),
        requiredForProofLevel: c.requiredProofLevel,
        requiredForCampaignId: cid,
        canFallback: !campaignRequired(c.interactionRequired),
        fallbackMethod: "SECOND_FACTOR",
        declineImpact: campaignRequired(c.interactionRequired)
          ? POPS_PERMISSION_DECLINE_IMPACT.REWARD_NOT_AVAILABLE
          : POPS_PERMISSION_DECLINE_IMPACT.EXTRA_VERIFICATION_REQUIRED
      })
    );
  }

  if (campaignRequired(c.locationProofRequired) || campaignOptional(c.locationProofRequired)) {
    if (locationAllowed(input)) {
      mergeRequirementMap(
        map,
        reqBase({
          permissionType: POPS_PERMISSION_TYPE.LOCATION_CLASS,
          purpose: POPS_PERMISSION_PURPOSE.REAL_WORLD_PROOF,
          required: campaignRequired(c.locationProofRequired),
          requiredForProofLevel: c.requiredProofLevel,
          requiredForCampaignId: cid,
          canFallback: !campaignRequired(c.locationProofRequired),
          fallbackMethod: "ALTERNATE_SIGNALS",
          declineImpact: campaignRequired(c.locationProofRequired)
            ? POPS_PERMISSION_DECLINE_IMPACT.CAMPAIGN_NOT_AVAILABLE
            : POPS_PERMISSION_DECLINE_IMPACT.LOWER_CONFIDENCE
        })
      );
    }
  }

  if (campaignRequired(c.merchantProofRequired) || campaignOptional(c.merchantProofRequired)) {
    if (locationAllowed(input)) {
      mergeRequirementMap(
        map,
        reqBase({
          permissionType: POPS_PERMISSION_TYPE.PRECISE_LOCATION,
          purpose: POPS_PERMISSION_PURPOSE.REAL_WORLD_PROOF,
          required: campaignRequired(c.merchantProofRequired),
          requiredForProofLevel: c.requiredProofLevel,
          requiredForCampaignId: cid,
          canFallback: !campaignRequired(c.merchantProofRequired),
          fallbackMethod: "MANUAL_REVIEW",
          declineImpact: campaignRequired(c.merchantProofRequired)
            ? POPS_PERMISSION_DECLINE_IMPACT.REWARD_NOT_AVAILABLE
            : POPS_PERMISSION_DECLINE_IMPACT.LOWER_CONFIDENCE
        })
      );
    }
  }

  if (campaignRequired(c.identityContinuityRequired) || campaignOptional(c.identityContinuityRequired)) {
    mergeRequirementMap(
      map,
      reqBase({
        permissionType: POPS_PERMISSION_TYPE.ACCOUNT_CONTINUITY,
        purpose: POPS_PERMISSION_PURPOSE.FRAUD_PREVENTION,
        required: campaignRequired(c.identityContinuityRequired),
        requiredForProofLevel: c.requiredProofLevel,
        requiredForCampaignId: cid,
        canFallback: !campaignRequired(c.identityContinuityRequired),
        fallbackMethod: "SECOND_FACTOR",
        declineImpact: campaignRequired(c.identityContinuityRequired)
          ? POPS_PERMISSION_DECLINE_IMPACT.REWARD_NOT_AVAILABLE
          : POPS_PERMISSION_DECLINE_IMPACT.EXTRA_VERIFICATION_REQUIRED
      })
    );
  }

  if (campaignRequired(c.kycRequired) || campaignOptional(c.kycRequired)) {
    mergeRequirementMap(
      map,
      reqBase({
        permissionType: POPS_PERMISSION_TYPE.ACCOUNT_CONTINUITY,
        purpose: POPS_PERMISSION_PURPOSE.PAYOUT_SECURITY,
        required: campaignRequired(c.kycRequired),
        requiredForProofLevel: c.requiredProofLevel,
        requiredForCampaignId: cid,
        canFallback: !campaignRequired(c.kycRequired),
        fallbackMethod: "MANUAL_REVIEW",
        declineImpact: campaignRequired(c.kycRequired)
          ? POPS_PERMISSION_DECLINE_IMPACT.CAMPAIGN_NOT_AVAILABLE
          : POPS_PERMISSION_DECLINE_IMPACT.EXTRA_VERIFICATION_REQUIRED
      })
    );
  }
}

function mergeHighValueReward(input: GetRequiredPermissionsForMomentInput, map: Map<PopsPermissionType, PopsPermissionRequirement>): void {
  if (input.rewardValue.amountMinor < HIGH_VALUE_MINOR_THRESHOLD) return;
  mergeRequirementMap(
    map,
    reqBase({
      permissionType: POPS_PERMISSION_TYPE.VISUAL_PRESENCE,
      purpose: POPS_PERMISSION_PURPOSE.HIGH_VALUE_REWARD,
      required: false,
      requiredForProofLevel: POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE,
      requiredForCampaignId: input.campaignRequirements?.campaignId ?? null,
      canFallback: true,
      fallbackMethod: "MANUAL_REVIEW",
      declineImpact: POPS_PERMISSION_DECLINE_IMPACT.PARTIAL_REWARD_ONLY
    })
  );
  mergeRequirementMap(
    map,
    reqBase({
      permissionType: POPS_PERMISSION_TYPE.DEVICE_INTEGRITY,
      purpose: POPS_PERMISSION_PURPOSE.FRAUD_PREVENTION,
      required: false,
      requiredForProofLevel: POPS_PROOF_LEVEL.LEVEL_4_IDENTITY_CONTINUITY,
      requiredForCampaignId: input.campaignRequirements?.campaignId ?? null,
      canFallback: true,
      fallbackMethod: "MANUAL_REVIEW",
      declineImpact: POPS_PERMISSION_DECLINE_IMPACT.EXTRA_VERIFICATION_REQUIRED
    })
  );
}

function mergeAgeBand(input: GetRequiredPermissionsForMomentInput, map: Map<PopsPermissionType, PopsPermissionRequirement>): void {
  if (input.ageBand !== "U13") return;
  const precise = map.get(POPS_PERMISSION_TYPE.PRECISE_LOCATION);
  if (precise?.required) {
    map.set(POPS_PERMISSION_TYPE.PRECISE_LOCATION, {
      ...precise,
      required: false,
      canFallback: true,
      fallbackMethod: "ALTERNATE_SIGNALS",
      declineImpact: POPS_PERMISSION_DECLINE_IMPACT.EXTRA_VERIFICATION_REQUIRED,
      userVisibleReason: `${precise.userVisibleReason} For under-13 accounts, precise location is never required.`
    });
  }
}

const PERMISSION_ORDER: PopsPermissionType[] = [
  POPS_PERMISSION_TYPE.SCREEN_ACTIVITY,
  POPS_PERMISSION_TYPE.CONTENT_PROGRESS,
  POPS_PERMISSION_TYPE.TOUCH_BEHAVIOR,
  POPS_PERMISSION_TYPE.DEVICE_MOTION,
  POPS_PERMISSION_TYPE.VISUAL_PRESENCE,
  POPS_PERMISSION_TYPE.AUDIO_FEATURES,
  POPS_PERMISSION_TYPE.LOCATION_CLASS,
  POPS_PERMISSION_TYPE.PRECISE_LOCATION,
  POPS_PERMISSION_TYPE.DEVICE_INTEGRITY,
  POPS_PERMISSION_TYPE.ACCOUNT_CONTINUITY,
  POPS_PERMISSION_TYPE.NOTIFICATIONS,
  POPS_PERMISSION_TYPE.BACKGROUND_SYNC
];

export function getRequiredPermissionsForMoment(
  input: GetRequiredPermissionsForMomentInput
): PopsPermissionRequirement[] {
  const map = new Map<PopsPermissionType, PopsPermissionRequirement>();
  pushSessionBaseline(input, map);
  mergeCampaignRequirements(input, map);
  mergeHighValueReward(input, map);
  mergeAgeBand(input, map);

  return PERMISSION_ORDER.map((t) => map.get(t)).filter((r): r is PopsPermissionRequirement => Boolean(r));
}

function statusSatisfies(required: boolean, status: PopsPermissionStatus | undefined): boolean {
  if (!required) return true;
  const s = status ?? POPS_PERMISSION_STATUS.NOT_REQUESTED;
  return s === POPS_PERMISSION_STATUS.GRANTED || s === POPS_PERMISSION_STATUS.LIMITED;
}

function fallbackLabel(method: PopsPermissionFallbackMethod): string {
  switch (method) {
    case "ALTERNATE_SIGNALS":
      return "Use alternate signals";
    case "EXTENDED_SESSION":
      return "Longer on-screen session";
    case "MANUAL_REVIEW":
      return "Manual review";
    case "SECOND_FACTOR":
      return "Second confirmation";
    case "DEFERRED_START":
      return "Start when ready";
    case "NONE":
    default:
      return "No automatic fallback";
  }
}

function fallbackDescription(method: PopsPermissionFallbackMethod): string {
  switch (method) {
    case "ALTERNATE_SIGNALS":
      return "We may use other allowed signals to reach the same confidence without this permission.";
    case "EXTENDED_SESSION":
      return "Staying on screen a bit longer can sometimes replace a missing optional signal.";
    case "MANUAL_REVIEW":
      return "A reviewer may confirm eligibility before funds move.";
    case "SECOND_FACTOR":
      return "You may be asked for an extra confirmation instead of this signal.";
    case "DEFERRED_START":
      return "You can start the moment later after adjusting settings.";
    case "NONE":
    default:
      return "This signal is needed for this moment as configured.";
  }
}

function policyBlocksLocation(input: PopsPermissionPreflightInput): boolean {
  const campaignWants =
    Boolean(input.campaignRequirements?.locationProofRequired === true) ||
    Boolean(input.campaignRequirements?.merchantProofRequired === true);
  const sessionWants = sessionWantsLocation(input.sessionType);
  return (campaignWants || sessionWants) && !locationAllowed(input);
}

export function runPermissionPreflight(input: PopsPermissionPreflightInput): PopsPermissionPreflightResult {
  if (policyBlocksLocation(input)) {
    return {
      canStart: false,
      missingRequiredPermissions: [],
      optionalPermissions: [],
      fallbackOptions: [],
      userVisibleMessage:
        "This moment needs location context, but location signals are not offered for your region. You can still browse other moments."
    };
  }

  const requirements = getRequiredPermissionsForMoment(input);

  const missingRequired: PopsPermissionType[] = [];
  for (const r of requirements) {
    if (!r.required) continue;
    if (!statusSatisfies(true, input.permissionStatuses[r.permissionType])) {
      missingRequired.push(r.permissionType);
    }
  }

  const fallbackOptions: PopsPermissionFallbackOption[] = [];
  for (const r of requirements) {
    if (!r.canFallback || r.fallbackMethod === "NONE") continue;
    if (statusSatisfies(r.required, input.permissionStatuses[r.permissionType])) continue;
    fallbackOptions.push({
      forPermission: r.permissionType,
      label: fallbackLabel(r.fallbackMethod),
      description: fallbackDescription(r.fallbackMethod)
    });
  }

  const canStart = missingRequired.length === 0;
  const copy = (t: PopsPermissionType) => getPopsPermissionCopy(t).title;
  const userVisibleMessage = canStart
    ? "Permissions needed for this moment look ready. You can start when you are comfortable."
    : `To start, allow: ${missingRequired.map(copy).join(", ")}. Optional signals can improve confidence but are not required unless marked.`;

  const optionalPermissions = [
    ...new Set(requirements.filter((r) => !r.required).map((r) => r.permissionType))
  ];

  return {
    canStart,
    missingRequiredPermissions: missingRequired,
    optionalPermissions,
    fallbackOptions,
    userVisibleMessage
  };
}
