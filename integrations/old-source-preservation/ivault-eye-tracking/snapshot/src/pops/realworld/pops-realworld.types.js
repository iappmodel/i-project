"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POPS_REALWORLD_USER_COPY = exports.POPS_LOCATION_CLASS = exports.POPS_REAL_WORLD_PROOF_TYPE = exports.POPS_REAL_WORLD_MIN_PROOF_LEVEL = void 0;
exports.realWorldProofAllowedForLevel = realWorldProofAllowedForLevel;
/** Minimum proof tier that may use real-world merchant / location proof (Stage 35). */
exports.POPS_REAL_WORLD_MIN_PROOF_LEVEL = "LEVEL_4_IDENTITY_CONTINUITY";
function realWorldProofAllowedForLevel(level) {
    const order = {
        LEVEL_1_SESSION: 1,
        LEVEL_2_ATTENTION: 2,
        LEVEL_3_INTENT: 3,
        LEVEL_4_IDENTITY_CONTINUITY: 4,
        LEVEL_5_HIGH_VALUE: 5,
    };
    return order[level] >= order[exports.POPS_REAL_WORLD_MIN_PROOF_LEVEL];
}
exports.POPS_REAL_WORLD_PROOF_TYPE = {
    LOCATION_CLASS: "LOCATION_CLASS",
    PRECISE_GEOFENCE: "PRECISE_GEOFENCE",
    QR_SCAN: "QR_SCAN",
    NFC_TAP: "NFC_TAP",
    MERCHANT_CONFIRMATION: "MERCHANT_CONFIRMATION",
    RECEIPT_CONFIRMATION: "RECEIPT_CONFIRMATION",
    DWELL_TIME: "DWELL_TIME",
    MOTION_CONSISTENCY: "MOTION_CONSISTENCY",
    TIME_WINDOW: "TIME_WINDOW",
};
/** Broad location bucket — prefer this over precise coordinates when possible. */
exports.POPS_LOCATION_CLASS = {
    UNKNOWN: "UNKNOWN",
    HOME_OR_WORK_WIFI: "HOME_OR_WORK_WIFI",
    NEIGHBORHOOD: "NEIGHBORHOOD",
    CITY: "CITY",
    REGION: "REGION",
    COUNTRY: "COUNTRY",
    MERCHANT_VICINITY: "MERCHANT_VICINITY",
};
/** User-visible strings for real-world flows (Stage 35). */
exports.POPS_REALWORLD_USER_COPY = {
    verifyingVisit: "P.O.P.S is verifying this visit.",
    locationProofActive: "Location proof active for this offer.",
    scanConfirmed: "Scan confirmed.",
    merchantConfirmationReceived: "Merchant confirmation received.",
    visitVerified: "Visit verified.",
    visitRewardPending: "Visit reward pending.",
};
