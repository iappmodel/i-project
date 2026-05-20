"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopsMerchantConfirmationService = void 0;
const crypto_1 = require("crypto");
function canonicalPayload(p) {
    return JSON.stringify({
        merchantConfirmationId: p.merchantConfirmationId,
        merchantId: p.merchantId,
        campaignId: p.campaignId,
        sessionId: p.sessionId,
        userId: p.userId,
        action: p.action,
        confirmedAtMs: p.confirmedAtMs,
    });
}
function signPayload(payload, secret) {
    return (0, crypto_1.createHmac)("sha256", secret).update(payload).digest("base64url");
}
/**
 * Merchant confirmation must bind campaign + session + user, and mitigate merchant self-fraud.
 */
class PopsMerchantConfirmationService {
    verify(input) {
        const reasons = [];
        const p = input.payload;
        if (p.merchantId !== input.boundMerchantId)
            reasons.push("MERCHANT_BINDING_MISMATCH");
        if (p.campaignId !== input.expectedCampaignId)
            reasons.push("MERCHANT_CONFIRM_CAMPAIGN_MISMATCH");
        if (p.sessionId !== input.expectedSessionId)
            reasons.push("MERCHANT_CONFIRM_SESSION_MISMATCH");
        if (p.userId !== input.expectedUserId)
            reasons.push("MERCHANT_CONFIRM_USER_MISMATCH");
        const body = canonicalPayload(p);
        const expectedSig = signPayload(body, input.secret);
        const a = Buffer.from(input.signature);
        const b = Buffer.from(expectedSig);
        if (a.length !== b.length || !(0, crypto_1.timingSafeEqual)(a, b)) {
            reasons.push("MERCHANT_CONFIRM_SIGNATURE_INVALID");
        }
        const merchantSelfFraudRisk = input.recentSelfConfirmCount >= 8;
        if (merchantSelfFraudRisk) {
            reasons.push("MERCHANT_SELF_CONFIRM_VELOCITY");
        }
        const ok = reasons.length === 0;
        const merchantProofScore = ok ? (merchantSelfFraudRisk ? 0.55 : 0.92) : 0.15;
        return {
            ok,
            merchantProofScore,
            merchantSelfFraudRisk,
            reasons,
        };
    }
    signPayloadForTests(payload, secret) {
        return signPayload(canonicalPayload(payload), secret);
    }
}
exports.PopsMerchantConfirmationService = PopsMerchantConfirmationService;
