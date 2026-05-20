import { PRESENCE_RULES } from "../../data/alphabet/presence-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  PresenceRuleSet,
  PresenceSignalInput,
  PresenceVerificationResult,
  PresenceVerificationStatus
} from "../../types/alphabet/presence.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: PresenceSignalInput): PresenceRuleSet | undefined {
  return PRESENCE_RULES.find((rule) => rule.active && rule.context === input.context);
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function calculateDwellRatio(input: PresenceSignalInput): number {
  if (input.requiredDwellMs <= 0) return 0;
  return clamp(input.dwellMs / input.requiredDwellMs);
}

function calculateProofScore(input: PresenceSignalInput): number {
  return clamp(
    input.qrProofScore * 0.2 +
      input.nfcProofScore * 0.2 +
      input.bluetoothProofScore * 0.2 +
      input.purchaseProofScore * 0.25 +
      input.staffConfirmationScore * 0.15
  );
}

function calculatePresenceScore(input: PresenceSignalInput): number {
  const dwellRatio = calculateDwellRatio(input);
  const score =
    dwellRatio * 0.22 +
    clamp(input.geofenceMatchScore) * 0.28 +
    clamp(input.movementConsistencyScore) * 0.14 +
    clamp(input.deviceLocationIntegrityScore) * 0.18 +
    clamp(input.networkLocationCorroborationScore) * 0.12 +
    calculateProofScore(input) * 0.06;
  return clamp(score);
}

function calculateLocalActionScore(input: PresenceSignalInput): number {
  const proofScore = calculateProofScore(input);
  const score =
    calculatePresenceScore(input) * 0.35 +
    clamp(input.actionCompletionScore) * 0.35 +
    proofScore * 0.25 +
    clamp(input.staffConfirmationScore) * 0.05;
  return clamp(score);
}

function calculateQualityScore(input: PresenceSignalInput): number {
  const score =
    calculatePresenceScore(input) * 0.45 +
    calculateLocalActionScore(input) * 0.35 +
    clamp(input.deviceIntegrityScore) * 0.1 +
    clamp(input.networkLocationCorroborationScore) * 0.1;
  return clamp(score);
}

function calculateRiskScore(input: PresenceSignalInput): number {
  let risk =
    clamp(input.gpsSpoofingRisk) * 0.3 +
    clamp(input.impossibleTravelRisk) * 0.25 +
    clamp(input.duplicateCheckinRisk) * 0.15 +
    clamp(input.emulatorRisk) * 0.12 +
    clamp(input.businessCollusionRisk) * 0.12 +
    (input.deviceIntegrityScore < 0.5 ? 0.06 : 0);

  if (input.deviceLocationIntegrityScore < 0.45) risk += 0.1;
  if (input.geofenceMatchScore < 0.35) risk += 0.08;

  return clamp(risk);
}

function decidePresenceStatus(params: {
  input: PresenceSignalInput;
  rule: PresenceRuleSet;
  dwellRatio: number;
  presenceScore: number;
  localActionScore: number;
  qualityScore: number;
  riskScore: number;
  reasons: string[];
}): PresenceVerificationStatus {
  const {
    input,
    rule,
    dwellRatio,
    presenceScore,
    localActionScore,
    qualityScore,
    riskScore,
    reasons
  } = params;

  if (isUnder13(input.ageBand) && !rule.under13Allowed) {
    reasons.push("under_13_not_allowed_for_presence_context");
    return "suspicious";
  }

  if (isTeen(input.ageBand) && !rule.teenAllowed) {
    reasons.push("teen_not_allowed_for_presence_context");
    return "suspicious";
  }

  if (
    isUnder13(input.ageBand) &&
    rule.guardianRequiredForUnder13 &&
    !input.metadata?.guardianApproved
  ) {
    reasons.push("under_13_guardian_required");
    return "completed_needs_review";
  }

  if (input.gpsSpoofingRisk > rule.maxGpsSpoofingRisk) {
    reasons.push("gps_spoofing_risk_above_maximum");
    return "suspicious";
  }

  if (input.impossibleTravelRisk > rule.maxImpossibleTravelRisk) {
    reasons.push("impossible_travel_risk_above_maximum");
    return "suspicious";
  }

  if (input.duplicateCheckinRisk > rule.maxDuplicateCheckinRisk) {
    reasons.push("duplicate_checkin_risk_above_maximum");
    return "suspicious";
  }

  if (input.businessCollusionRisk > rule.maxBusinessCollusionRisk) {
    reasons.push("business_collusion_risk_above_maximum");
    return "suspicious";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.75 ? "suspicious" : "completed_needs_review";
  }

  if (input.dwellMs < rule.minDwellMs || dwellRatio < rule.minDwellRatio) {
    reasons.push("dwell_below_minimum");
    return dwellRatio < 0.5 ? "incomplete" : "completed_needs_review";
  }

  if (input.geofenceMatchScore < rule.minGeofenceMatchScore) {
    reasons.push("geofence_match_below_minimum");
    return "rejected";
  }

  if (input.movementConsistencyScore < rule.minMovementConsistencyScore) {
    reasons.push("movement_consistency_below_minimum");
    return "completed_needs_review";
  }

  if (input.deviceLocationIntegrityScore < rule.minDeviceLocationIntegrityScore) {
    reasons.push("device_location_integrity_below_minimum");
    return "suspicious";
  }

  if (
    input.networkLocationCorroborationScore <
    rule.minNetworkLocationCorroborationScore
  ) {
    reasons.push("network_location_corroboration_below_minimum");
    return "completed_needs_review";
  }

  if (rule.requiresPurchaseProof && input.purchaseProofScore < 0.65) {
    reasons.push("purchase_proof_required");
    return "completed_needs_review";
  }

  if (rule.requiresActionProof && input.actionCompletionScore < 0.65) {
    reasons.push("action_proof_required");
    return "completed_needs_review";
  }

  if (presenceScore < rule.minPresenceScore) {
    reasons.push("presence_score_below_minimum");
    return "completed_needs_review";
  }

  if (qualityScore < rule.minQualityScore) {
    reasons.push("quality_score_below_minimum");
    return "completed_needs_review";
  }

  if (localActionScore >= rule.minLocalActionScore) {
    reasons.push("local_action_verified");
    return "local_action_verified";
  }

  reasons.push("presence_verified");
  return "presence_verified";
}

function sourceContextFromPresenceContext(
  context: PresenceSignalInput["context"]
): AlphabetEvent["sourceContext"] {
  switch (context) {
    case "local_offer":
    case "store_visit":
    case "pickup":
    case "service_visit":
      return "igo";
    case "learning_place":
      return "learning";
    case "workplace":
      return "marketplace";
    case "event_checkin":
    case "community_place":
    case "general_place":
    default:
      return "system";
  }
}

function createPresenceAlphabetEvent(params: {
  input: PresenceSignalInput;
  eventType: AlphabetEvent["eventType"];
  coinCode: AlphabetEvent["coinCode"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: params.coinCode,
    eventType: params.eventType,
    objectType: "presence_session",
    objectId: params.input.presenceSessionId,
    sourceContext: sourceContextFromPresenceContext(params.input.context),
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      presenceSessionId: params.input.presenceSessionId,
      context: params.input.context,
      offerId: params.input.offerId ?? null,
      businessId: params.input.businessId ?? null,
      locationId: params.input.locationId ?? null,
      requiredDwellMs: params.input.requiredDwellMs,
      dwellMs: params.input.dwellMs,
      geofenceMatchScore: params.input.geofenceMatchScore,
      movementConsistencyScore: params.input.movementConsistencyScore,
      deviceLocationIntegrityScore: params.input.deviceLocationIntegrityScore,
      networkLocationCorroborationScore: params.input.networkLocationCorroborationScore,
      actionCompletionScore: params.input.actionCompletionScore,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyPresenceSession(
  input: PresenceSignalInput
): PresenceVerificationResult {
  const reasons: string[] = [];
  const rule = findRule(input);
  const dwellRatio = calculateDwellRatio(input);
  const presenceScore = calculatePresenceScore(input);
  const localActionScore = calculateLocalActionScore(input);
  const qualityScore = calculateQualityScore(input);
  const riskScore = calculateRiskScore(input);

  if (!rule) {
    reasons.push("no_active_presence_rule");

    const sessionStartedEvent = createPresenceAlphabetEvent({
      input,
      eventType: "presence_session_started",
      coinCode: "P",
      rawScore: presenceScore,
      qualityScore,
      riskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      presenceSessionId: input.presenceSessionId,
      userId: input.userId,
      status: "suspicious",
      dwellRatio,
      presenceScore,
      localActionScore,
      qualityScore,
      riskScore,
      reasons,
      sessionStartedEvent,
      presenceVerifiedEvent: null,
      localActionCompletedEvent: null,
      localOfferRedeemedEvent: null,
      spoofingEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decidePresenceStatus({
    input,
    rule,
    dwellRatio,
    presenceScore,
    localActionScore,
    qualityScore,
    riskScore,
    reasons
  });

  const verificationStatus =
    status === "presence_verified" || status === "local_action_verified"
      ? "verified"
      : "rejected";

  const sessionStartedEvent = createPresenceAlphabetEvent({
    input,
    eventType: "presence_session_started",
    coinCode: "P",
    rawScore: presenceScore,
    qualityScore,
    riskScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const presenceVerifiedEvent =
    status === "presence_verified" || status === "local_action_verified"
      ? createPresenceAlphabetEvent({
          input,
          eventType: "presence_verified",
          coinCode: "P",
          rawScore: presenceScore,
          qualityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: { status, presenceScore, localActionScore, reasons }
        })
      : null;

  const localActionCompletedEvent =
    status === "local_action_verified"
      ? createPresenceAlphabetEvent({
          input,
          eventType: "local_action_completed",
          coinCode: "P",
          rawScore: localActionScore,
          qualityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: { status, presenceScore, localActionScore, reasons }
        })
      : null;

  const localOfferRedeemedEvent =
    status === "local_action_verified" && input.offerId
      ? createPresenceAlphabetEvent({
          input,
          eventType: "local_offer_redeemed",
          coinCode: "P",
          rawScore: localActionScore,
          qualityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            issueMode: "wallet_lot",
            status,
            presenceScore,
            localActionScore,
            reasons
          }
        })
      : null;

  const spoofingEvent =
    status === "suspicious" &&
    (reasons.includes("gps_spoofing_risk_above_maximum") ||
      reasons.includes("impossible_travel_risk_above_maximum"))
      ? createPresenceAlphabetEvent({
          input,
          eventType: "gps_spoofing_detected",
          coinCode: "P",
          rawScore: 0,
          qualityScore: 0,
          riskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  return {
    presenceSessionId: input.presenceSessionId,
    userId: input.userId,
    status,
    dwellRatio,
    presenceScore,
    localActionScore,
    qualityScore,
    riskScore,
    reasons,
    sessionStartedEvent,
    presenceVerifiedEvent,
    localActionCompletedEvent,
    localOfferRedeemedEvent,
    spoofingEvent,
    metadata: { ruleContext: rule.context, ...input.metadata }
  };
}
