"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopsLocationProofService = void 0;
const pops_realworld_types_1 = require("./pops-realworld.types");
/**
 * LOCATION_CLASS: prefer broad class; avoid exact address unless required.
 * PRECISE_GEOFENCE: only when permission + local visit campaign; store minimal result.
 * DWELL_TIME / TIME_WINDOW: session boundary based, not invasive tracking.
 */
class PopsLocationProofService {
    evaluate(input) {
        const proofTypes = [pops_realworld_types_1.POPS_REAL_WORLD_PROOF_TYPE.LOCATION_CLASS];
        const reasons = [];
        let preciseGeofenceUsed = false;
        let geofenceConfidence = null;
        if (input.isLocalVisitCampaign && input.precisePermissionGranted) {
            proofTypes.push(pops_realworld_types_1.POPS_REAL_WORLD_PROOF_TYPE.PRECISE_GEOFENCE);
            preciseGeofenceUsed = true;
            geofenceConfidence =
                input.insideGeofence === null ? null : input.insideGeofence ? clamp01(input.geofenceConfidence ?? 0.75) : 0;
            if (input.insideGeofence === false) {
                reasons.push("GEOFENCE_OUTSIDE");
            }
        }
        else if (input.isLocalVisitCampaign && !input.precisePermissionGranted) {
            reasons.push("PRECISE_GEOFENCE_SKIPPED_NO_PERMISSION");
        }
        const end = input.sessionEndedAtMs ?? input.nowMs;
        const dwellTimeMs = Math.max(0, end - input.sessionStartedAtMs);
        proofTypes.push(pops_realworld_types_1.POPS_REAL_WORLD_PROOF_TYPE.DWELL_TIME);
        const dwellSatisfied = dwellTimeMs >= input.minimumDwellMs;
        if (!dwellSatisfied)
            reasons.push("DWELL_TOO_SHORT");
        const timeWindowValid = input.nowMs >= input.campaignTimeWindowStartMs && input.nowMs <= input.campaignTimeWindowEndMs;
        proofTypes.push(pops_realworld_types_1.POPS_REAL_WORLD_PROOF_TYPE.TIME_WINDOW);
        if (!timeWindowValid)
            reasons.push("OUTSIDE_TIME_WINDOW");
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
exports.PopsLocationProofService = PopsLocationProofService;
function clamp01(n) {
    if (!Number.isFinite(n))
        return 0;
    return Math.max(0, Math.min(1, n));
}
function scoreLocation(params) {
    let base = 0.45;
    if (params.locationClass === pops_realworld_types_1.POPS_LOCATION_CLASS.MERCHANT_VICINITY)
        base = 0.62;
    if (params.locationClass === pops_realworld_types_1.POPS_LOCATION_CLASS.NEIGHBORHOOD)
        base = 0.58;
    if (params.locationClass === pops_realworld_types_1.POPS_LOCATION_CLASS.CITY)
        base = 0.52;
    if (params.locationClass === pops_realworld_types_1.POPS_LOCATION_CLASS.REGION)
        base = 0.48;
    if (params.locationClass === pops_realworld_types_1.POPS_LOCATION_CLASS.COUNTRY)
        base = 0.44;
    if (params.locationClass === pops_realworld_types_1.POPS_LOCATION_CLASS.HOME_OR_WORK_WIFI)
        base = 0.5;
    if (params.locationClass === pops_realworld_types_1.POPS_LOCATION_CLASS.UNKNOWN)
        base = 0.28;
    if (params.insideGeofence === true) {
        base += 0.22 * (params.geofenceConfidence ?? 0.7);
    }
    else if (params.insideGeofence === false) {
        base *= 0.35;
    }
    if (!params.dwellSatisfied)
        base *= 0.55;
    if (!params.timeWindowValid)
        base *= 0.4;
    return clamp01(base);
}
