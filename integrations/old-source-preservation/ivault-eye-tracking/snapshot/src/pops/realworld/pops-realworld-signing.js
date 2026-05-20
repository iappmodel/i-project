"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signPopsRealWorldPayload = signPopsRealWorldPayload;
exports.verifyPopsRealWorldEnvelope = verifyPopsRealWorldEnvelope;
const crypto_1 = require("crypto");
function base64UrlEncode(value) {
    return Buffer.from(value, "utf8").toString("base64url");
}
function base64UrlDecode(value) {
    return Buffer.from(value, "base64url").toString("utf8");
}
function signPopsRealWorldPayload(payloadJson, secret) {
    const encoded = base64UrlEncode(payloadJson);
    const signature = (0, crypto_1.createHmac)("sha256", secret).update(encoded).digest("base64url");
    return `${encoded}.${signature}`;
}
function verifyPopsRealWorldEnvelope(envelope, secret) {
    const [encoded, signature] = envelope.split(".");
    if (!encoded || !signature) {
        return { ok: false, reason: "MALFORMED_ENVELOPE" };
    }
    const expected = (0, crypto_1.createHmac)("sha256", secret).update(encoded).digest("base64url");
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !(0, crypto_1.timingSafeEqual)(left, right)) {
        return { ok: false, reason: "SIGNATURE_INVALID" };
    }
    try {
        const json = base64UrlDecode(encoded);
        return { ok: true, value: JSON.parse(json) };
    }
    catch {
        return { ok: false, reason: "PAYLOAD_PARSE_ERROR" };
    }
}
