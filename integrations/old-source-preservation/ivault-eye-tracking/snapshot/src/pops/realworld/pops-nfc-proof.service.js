"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPopsNfcOneTimeStore = exports.PopsNfcProofService = void 0;
const pops_realworld_signing_1 = require("./pops-realworld-signing");
/**
 * NFC tap: signed token, one-time session token, merchant + device binding.
 */
class PopsNfcProofService {
    oneTime;
    constructor(oneTime) {
        this.oneTime = oneTime;
    }
    createSignedEnvelope(payload, secret) {
        return (0, pops_realworld_signing_1.signPopsRealWorldPayload)(JSON.stringify(payload), secret);
    }
    verify(input) {
        const reasons = [];
        const parsed = (0, pops_realworld_signing_1.verifyPopsRealWorldEnvelope)(input.envelope, input.secret);
        if (!parsed.ok) {
            return { ok: false, nfcTapId: null, nfcProofScore: 0, reasons: [parsed.reason] };
        }
        const p = parsed.value;
        if (p.merchantId !== input.expectedMerchantId)
            reasons.push("NFC_MERCHANT_MISMATCH");
        if (p.deviceBindingId !== input.expectedDeviceBindingId)
            reasons.push("NFC_DEVICE_BINDING_MISMATCH");
        if (input.nowMs > p.expiresAtMs)
            reasons.push("NFC_EXPIRED");
        const reused = this.oneTime.hasConsumed(p.sessionToken);
        if (reused) {
            reasons.push("NFC_SESSION_TOKEN_REUSE");
        }
        else {
            this.oneTime.markConsumed(p.sessionToken);
        }
        const structuralOk = p.merchantId === input.expectedMerchantId &&
            p.deviceBindingId === input.expectedDeviceBindingId &&
            input.nowMs <= p.expiresAtMs &&
            !reused;
        return {
            ok: structuralOk,
            nfcTapId: p.nfcTapId,
            nfcProofScore: structuralOk ? 0.96 : 0.2,
            reasons,
        };
    }
}
exports.PopsNfcProofService = PopsNfcProofService;
class InMemoryPopsNfcOneTimeStore {
    consumed = new Set();
    hasConsumed(sessionToken) {
        return this.consumed.has(sessionToken);
    }
    markConsumed(sessionToken) {
        this.consumed.add(sessionToken);
    }
}
exports.InMemoryPopsNfcOneTimeStore = InMemoryPopsNfcOneTimeStore;
