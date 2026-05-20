import {
  type PopsLocationClass,
  type PopsRealWorldProofType,
  POPS_LOCATION_CLASS,
  POPS_REAL_WORLD_PROOF_TYPE,
} from "./pops-realworld.types";

export interface PopsLocationProofInput {
  /** Broad class from OS / fused location — preferred signal. */
  locationClass: PopsLocationClass;
  /** Whether the user granted precise / fine location for this session. */
  precisePermissionGranted: boolean;
  /** Campaign is a local visit offer that may require geofence (still minimal proof storage). */
  isLocalVisitCampaign: boolean;
  /** Campaign explicitly requires retaining exact address (rare). */
  campaignRequiresExactAddress: boolean;
  /** Minimal geofence result: inside target area (no raw trail stored). */
  insideGeofence: boolean | null;
  /** Confidence 0–1 for geofence match when precise path is used. */
  geofenceConfidence: number | null;
  nowMs: number;
  sessionStartedAtMs: number;
  sessionEndedAtMs: number | null;
  minimumDwellMs: number;
  campaignTimeWindowStartMs: number;
  campaignTimeWindowEndMs: number;
}

export interface PopsLocationProofResult {
  proofTypes: PopsRealWorldProofType[];
  locationProofScore: number;
  preciseGeofenceUsed: boolean;
  storeExactAddressRecommended: boolean;
  geofenceConfidence: number | null;
  dwellTimeMs: number | null;
  timeWindowValid: boolean;
  reasons: string[];
}

/**
 * LOCATION_CLASS: prefer broad class; avoid exact address unless required.
 * PRECISE_GEOFENCE: only when permission + local visit campaign; store minimal result.
 * DWELL_TIME / TIME_WINDOW: session boundary based, not invasive tracking.
 */
export class PopsLocationProofService {
  evaluate(input: PopsLocationProofInput): PopsLocationProofResult {
    const proofTypes: PopsRealWorldProofType[] = [POPS_REAL_WORLD_PROOF_TYPE.LOCATION_CLASS];
    const reasons: string[] = [];

    let preciseGeofenceUsed = false;
    let geofenceConfidence: number | null = null;

    if (input.isLocalVisitCampaign && input.precisePermissionGranted) {
      proofTypes.push(POPS_REAL_WORLD_PROOF_TYPE.PRECISE_GEOFENCE);
      preciseGeofenceUsed = true;
      geofenceConfidence =
        input.insideGeofence === null ? null : input.insideGeofence ? clamp01(input.geofenceConfidence ?? 0.75) : 0;
      if (input.insideGeofence === false) {
        reasons.push("GEOFENCE_OUTSIDE");
      }
    } else if (input.isLocalVisitCampaign && !input.precisePermissionGranted) {
      reasons.push("PRECISE_GEOFENCE_SKIPPED_NO_PERMISSION");
    }

    const end = input.sessionEndedAtMs ?? input.nowMs;
    const dwellTimeMs = Math.max(0, end - input.sessionStartedAtMs);
    proofTypes.push(POPS_REAL_WORLD_PROOF_TYPE.DWELL_TIME);
    const dwellSatisfied = dwellTimeMs >= input.minimumDwellMs;
    if (!dwellSatisfied) reasons.push("DWELL_TOO_SHORT");

    const timeWindowValid =
      input.nowMs >= input.campaignTimeWindowStartMs && input.nowMs <= input.campaignTimeWindowEndMs;
    proofTypes.push(POPS_REAL_WORLD_PROOF_TYPE.TIME_WINDOW);
    if (!timeWindowValid) reasons.push("OUTSIDE_TIME_WINDOW");

    const storeExactAddressRecommended = Boolean(input.campaignRequiresExactAddress);

    const locationProofScore = scoreLocation({
      locationClass: input.locationClass,
      insideGeofence: input.insideGeofence,
      geofenceConfidence,
      dwellSatisfied,
      timeWindowValid,
    });

    return {
      proofTypes,
      locationProofScore,
      preciseGeofenceUsed,
      storeExactAddressRecommended,
      geofenceConfidence,
      dwellTimeMs,
      timeWindowValid,
      reasons,
    };
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function scoreLocation(params: {
  locationClass: PopsLocationClass;
  insideGeofence: boolean | null;
  geofenceConfidence: number | null;
  dwellSatisfied: boolean;
  timeWindowValid: boolean;
}): number {
  let base = 0.45;
  if (params.locationClass === POPS_LOCATION_CLASS.MERCHANT_VICINITY) base = 0.62;
  if (params.locationClass === POPS_LOCATION_CLASS.NEIGHBORHOOD) base = 0.58;
  if (params.locationClass === POPS_LOCATION_CLASS.CITY) base = 0.52;
  if (params.locationClass === POPS_LOCATION_CLASS.REGION) base = 0.48;
  if (params.locationClass === POPS_LOCATION_CLASS.COUNTRY) base = 0.44;
  if (params.locationClass === POPS_LOCATION_CLASS.HOME_OR_WORK_WIFI) base = 0.5;
  if (params.locationClass === POPS_LOCATION_CLASS.UNKNOWN) base = 0.28;

  if (params.insideGeofence === true) {
    base += 0.22 * (params.geofenceConfidence ?? 0.7);
  } else if (params.insideGeofence === false) {
    base *= 0.35;
  }

  if (!params.dwellSatisfied) base *= 0.55;
  if (!params.timeWindowValid) base *= 0.4;

  return clamp01(base);
}
