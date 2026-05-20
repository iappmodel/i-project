"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POPS_REAL_WORLD_FRAUD_VECTORS = exports.POPS_REAL_WORLD_RULES = exports.POPS_REALWORLD_USER_COPY = void 0;
exports.evaluateLocationFraudRisk = evaluateLocationFraudRisk;
exports.recommendedActionForRealWorld = recommendedActionForRealWorld;
exports.aggregateRealWorldDecision = aggregateRealWorldDecision;
exports.buildRealWorldPrivacyDisclosure = buildRealWorldPrivacyDisclosure;
const pops_realworld_types_1 = require("./pops-realworld.types");
Object.defineProperty(exports, "POPS_REALWORLD_USER_COPY", { enumerable: true, get: function () { return pops_realworld_types_1.POPS_REALWORLD_USER_COPY; } });
/** Normative rules copy for audits and UI tooltips (Stage 35). */
exports.POPS_REAL_WORLD_RULES = {
    LOCATION_CLASS: "Use broad location class where possible. Do not store exact address unless the campaign explicitly requires it.",
    PRECISE_GEOFENCE: "Requires explicit user permission. Used only for local visit campaigns. Store minimal proof result, not a raw tracking trail.",
    QR_SCAN: "QR must be signed by merchant or campaign authority. QR expires quickly. QR reuse detection is required.",
    NFC_TAP: "NFC terminal or session token must be signed, one-time use, with merchant and device binding.",
    MERCHANT_CONFIRMATION: "Merchant confirms visit or action. Confirmation must reference campaign and session. Mitigate merchant self-fraud.",
    DWELL_TIME: "User must remain in a valid context for a minimum duration. Prefer session start/end proof over invasive continuous tracking.",
    MOTION_CONSISTENCY: "Detect impossible movement only as a supporting signal. Do not penalize wheelchair, transit, or low-motion contexts.",
    TIME_WINDOW: "Visit or scan must fall inside the campaign time window.",
};
exports.POPS_REAL_WORLD_FRAUD_VECTORS = {
    GPS_SPOOFING: "GPS_SPOOFING",
    QR_SCREENSHOT_REUSE: "QR_SCREENSHOT_REUSE",
    QR_SHARING: "QR_SHARING",
    MERCHANT_COLLUSION: "MERCHANT_COLLUSION",
    FAKE_CHECK_INS: "FAKE_CHECK_INS",
    IMPOSSIBLE_TRAVEL: "IMPOSSIBLE_TRAVEL",
    REPEATED_FARM_VISITS: "REPEATED_FARM_VISITS",
    DEVICE_FARM_AT_LOCATION: "DEVICE_FARM_AT_LOCATION",
};
function fraudRiskFromScore(score) {
    if (score >= 0.85)
        return "CRITICAL";
    if (score >= 0.6)
        return "HIGH";
    if (score >= 0.35)
        return "MEDIUM";
    return "LOW";
}
/**
 * Aggregates fraud indicators into a single location-adjacent fraud tier.
 * Motion / dwell are supporting only — they nudge score lightly per rules.
 */
function evaluateLocationFraudRisk(input) {
    let score = 0;
    if (!input.timeWindowValid)
        score += 0.35;
    if (input.geofenceConfidence !== null && input.geofenceConfidence < 0.25)
        score += 0.35;
    if (input.qrReuseSuspected)
        score += 0.45;
    if (input.qrShareSuspected)
        score += 0.25;
    if (input.merchantSelfFraudRisk)
        score += 0.4;
    if (input.impossibleTravelSuspected)
        score += 0.35;
    score += Math.min(0.35, input.repeatedVisitsRiskScore);
    if (input.deviceFarmClusterSuspected)
        score += 0.4;
    const motion = input.motionConsistencyScore;
    if (motion !== null && motion < 0.2 && input.proofTypes.includes(pops_realworld_types_1.POPS_REAL_WORLD_PROOF_TYPE.MOTION_CONSISTENCY)) {
        score += 0.08;
    }
    return fraudRiskFromScore(Math.min(1, score));
}
function recommendedActionForRealWorld(locationFraudRisk, presenceConfidence, merchantConfidence) {
    if (locationFraudRisk === "CRITICAL")
        return "DENY";
    if (locationFraudRisk === "HIGH" || presenceConfidence < 0.35)
        return "HOLD_REVIEW";
    if (merchantConfidence < 0.4 && presenceConfidence < 0.55)
        return "REQUEST_ADDITIONAL_PROOF";
    if (locationFraudRisk === "MEDIUM" || presenceConfidence < 0.5)
        return "HOLD_REVIEW";
    return "ALLOW";
}
function aggregateRealWorldDecision(input) {
    const motion = input.motionSupportScore;
    const motionBoost = motion === null ? 0 : Math.max(0, Math.min(0.08, (motion - 0.5) * 0.12));
    const realWorldPresenceConfidence = clamp01(0.55 * input.locationProofScore +
        0.2 * (input.dwellSatisfied ? 1 : 0.35) +
        0.15 * input.qrProofScore +
        0.1 * input.nfcProofScore +
        motionBoost);
    const channelBoost = Math.min(1, Math.max(input.qrProofScore, input.nfcProofScore));
    const merchantProofConfidence = clamp01(0.65 * input.merchantProofScore + 0.35 * channelBoost);
    const recommendedAction = recommendedActionForRealWorld(input.locationFraudRisk, realWorldPresenceConfidence, merchantProofConfidence);
    const reasons = [];
    if (input.locationFraudRisk !== "LOW") {
        reasons.push(`LOCATION_FRAUD_RISK_${input.locationFraudRisk}`);
    }
    if (!input.dwellSatisfied)
        reasons.push("DWELL_NOT_MET");
    if (motion !== null && motion < 0.35)
        reasons.push("MOTION_LOW_SUPPORT_ONLY");
    return {
        realWorldPresenceConfidence,
        merchantProofConfidence,
        locationFraudRisk: input.locationFraudRisk,
        recommendedAction,
        reasons,
    };
}
function buildRealWorldPrivacyDisclosure(input) {
    return {
        locationClassUsed: input.locationClassUsed,
        preciseLocationUsed: input.preciseGeofenceUsed,
        qrUsed: input.qrUsed,
        nfcUsed: input.nfcUsed,
        merchantConfirmationUsed: input.merchantConfirmationUsed,
        retentionPolicy: input.retentionPolicy,
    };
}
function clamp01(value) {
    if (!Number.isFinite(value))
        return 0;
    return Math.max(0, Math.min(1, value));
}
