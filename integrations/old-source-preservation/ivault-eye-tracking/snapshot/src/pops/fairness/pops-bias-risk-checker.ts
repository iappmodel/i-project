import type { PopsSession } from "../../../services/api/src/pops/types/pops.types";
import {
  POPS_PROOF_LEVEL,
  type PopsCampaignVerificationRequirement
} from "../campaigns/pops-campaign-requirements.types";
import {
  POPS_ACCESSIBILITY_MODE,
  POPS_FAIRNESS_RISK,
  type PopsAccessibilityContext,
  type PopsFairnessRisk,
  type PopsSignalAvailability
} from "./pops-fairness.types";

export interface AssessFairnessRisksInput {
  session: PopsSession;
  signalAvailability: PopsSignalAvailability;
  accessibilityContext: PopsAccessibilityContext;
  campaignRequirements: PopsCampaignVerificationRequirement;
}

/**
 * Surfaces where normative scoring could misread humane presence.
 * Does not infer disability or protected class — only structural risk flags.
 */
export function assessFairnessRisks(input: AssessFairnessRisksInput): PopsFairnessRisk[] {
  const risks: PopsFairnessRisk[] = [];
  const { signalAvailability, accessibilityContext, campaignRequirements, session } = input;
  const modes = new Set(accessibilityContext.modes);

  const visualHeavy =
    campaignRequirements.visualPresenceRequired === true ||
    campaignRequirements.requiredProofLevel === POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE;

  if (visualHeavy && (signalAvailability.visual !== "available" || modes.has(POPS_ACCESSIBILITY_MODE.SCREEN_READER_ACTIVE))) {
    risks.push(POPS_FAIRNESS_RISK.VISUAL_DEPENDENCY_RISK);
  }

  const motorOrSwitch =
    modes.has(POPS_ACCESSIBILITY_MODE.SWITCH_CONTROL) ||
    modes.has(POPS_ACCESSIBILITY_MODE.VOICE_CONTROL) ||
    modes.has(POPS_ACCESSIBILITY_MODE.ASSISTIVE_TOUCH) ||
    modes.has(POPS_ACCESSIBILITY_MODE.MOTOR_ACCESSIBILITY);

  if (motorOrSwitch && (signalAvailability.touch === "degraded" || signalAvailability.touch === "unavailable")) {
    risks.push(POPS_FAIRNESS_RISK.TOUCH_PATTERN_BIAS_RISK);
  }

  if (
    modes.has(POPS_ACCESSIBILITY_MODE.REDUCED_MOTION) ||
    signalAvailability.motion === "unavailable" ||
    signalAvailability.motion === "degraded"
  ) {
    risks.push(POPS_FAIRNESS_RISK.MOTION_PATTERN_BIAS_RISK);
  }

  if (
    signalAvailability.environmentStress === "high" ||
    signalAvailability.networkQuality === "low" ||
    signalAvailability.visual === "degraded"
  ) {
    risks.push(POPS_FAIRNESS_RISK.LIGHTING_ENVIRONMENT_BIAS_RISK);
  }

  if (signalAvailability.deviceSensorQuality === "low" || signalAvailability.deviceSensorQuality === "medium") {
    risks.push(POPS_FAIRNESS_RISK.DEVICE_QUALITY_BIAS_RISK);
  }

  const sessionMeta = session.metadata as Record<string, unknown> | undefined;
  if (sessionMeta?.["popsInclusiveInteractionTiming"] === true) {
    risks.push(POPS_FAIRNESS_RISK.AGE_PATTERN_BIAS_RISK);
  }

  if (modes.has(POPS_ACCESSIBILITY_MODE.COGNITIVE_ACCESSIBILITY)) {
    risks.push(POPS_FAIRNESS_RISK.NEURODIVERGENCE_PATTERN_RISK);
  }

  if (modes.has(POPS_ACCESSIBILITY_MODE.UNKNOWN_ACCESSIBILITY_CONTEXT)) {
    risks.push(POPS_FAIRNESS_RISK.ACCESSIBILITY_CONFLICT_RISK);
  }

  if (
    modes.has(POPS_ACCESSIBILITY_MODE.VISUAL_ACCESSIBILITY) &&
    campaignRequirements.visualPresenceRequired === true
  ) {
    risks.push(POPS_FAIRNESS_RISK.ACCESSIBILITY_CONFLICT_RISK);
  }

  const regionTier = sessionMeta?.["networkRegionTier"];
  if (regionTier === "low" || regionTier === "constrained") {
    risks.push(POPS_FAIRNESS_RISK.REGION_DEVICE_INFRASTRUCTURE_RISK);
  }

  if (modes.has(POPS_ACCESSIBILITY_MODE.HEARING_ACCESSIBILITY) && signalAvailability.audioFeatures === "unavailable") {
    risks.push(POPS_FAIRNESS_RISK.ACCESSIBILITY_CONFLICT_RISK);
  }

  return dedupe(risks);
}

function dedupe(risks: PopsFairnessRisk[]): PopsFairnessRisk[] {
  return [...new Set(risks)];
}
