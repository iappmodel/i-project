"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPopsQrNonceStore = exports.PopsQrProofService = void 0;
const pops_realworld_signing_1 = require("./pops-realworld-signing");
const MAX_QR_TTL_MS = 5 * 60 * 1000;
/**
 * QR must be signed, expire quickly, and JTIs must be single-use (reuse detection).
 */
class PopsQrProofService {
    nonceStore;
    constructor(nonceStore) {
        this.nonceStore = nonceStore;
    }
    createSignedEnvelope(payload, secret) {
        const ttl = payload.expiresAtMs - payload.issuedAtMs;
        if (ttl > MAX_QR_TTL_MS) {
            throw new Error("QR_TTL_EXCEEDS_POLICY_MAX");
        }
        return (0, pops_realworld_signing_1.signPopsRealWorldPayload)(JSON.stringify(payload), secret);
    }
    verify(input) {
        const reasons = [];
        const parsed = (0, pops_realworld_signing_1.verifyPopsRealWorldEnvelope)(input.envelope, input.secret);
        if (!parsed.ok) {
            return {
                ok: false,
                qrScanId: null,
                qrProofScore: 0,
                qrReuseSuspected: false,
                qrShareSuspected: false,
                reasons: [parsed.reason],
            };
        }
        const p = parsed.value;
        if (p.campaignId !== input.expectedCampaignId)
            reasons.push("QR_CAMPAIGN_MISMATCH");
        if (p.merchantId !== input.expectedMerchantId)
            reasons.push("QR_MERCHANT_MISMATCH");
        if (input.nowMs > p.expiresAtMs)
            reasons.push("QR_EXPIRED");
        if (input.nowMs < p.issuedAtMs)
            reasons.push("QR_NOT_YET_VALID");
        const qrReuseSuspected = this.nonceStore.hasUsed(p.jti);
        if (!qrReuseSuspected) {
            this.nonceStore.markUsed(p.jti);
        }
        else {
            reasons.push("QR_JTI_REUSE");
        }
        let qrShareSuspected = false;
        if (input.peerScanFingerprint &&
            input.lastPeerFingerprint &&
            input.peerScanFingerprint === input.lastPeerFingerprint) {
            qrShareSuspected = true;
            reasons.push("QR_PEER_FINGERPRINT_COLLISION");
        }
        const structuralOk = p.campaignId === input.expectedCampaignId &&
            p.merchantId === input.expectedMerchantId &&
            input.nowMs <= p.expiresAtMs &&
            input.nowMs >= p.issuedAtMs;
        const ok = structuralOk && !qrReuseSuspected;
        const qrProofScore = ok ? (qrShareSuspected ? 0.55 : 0.95) : structuralOk ? 0.25 : 0;
        return {
            ok,
            qrScanId: p.qrScanId,
            qrProofScore,
            qrReuseSuspected,
            qrShareSuspected,
            reasons,
        };
    }
}
exports.PopsQrProofService = PopsQrProofService;
class InMemoryPopsQrNonceStore {
    used = new Set();
    hasUsed(jti) {
        return this.used.has(jti);
    }
    markUsed(jti) {
        this.used.add(jti);
    }
}
exports.InMemoryPopsQrNonceStore = InMemoryPopsQrNonceStore;
