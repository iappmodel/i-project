import { createHmac, timingSafeEqual } from "crypto";

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function signPopsRealWorldPayload(payloadJson: string, secret: string): string {
  const encoded = base64UrlEncode(payloadJson);
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyPopsRealWorldEnvelope<T>(
  envelope: string,
  secret: string,
): { ok: true; value: T } | { ok: false; reason: string } {
  const [encoded, signature] = envelope.split(".");
  if (!encoded || !signature) {
    return { ok: false, reason: "MALFORMED_ENVELOPE" };
  }
  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return { ok: false, reason: "SIGNATURE_INVALID" };
  }
  try {
    const json = base64UrlDecode(encoded);
    return { ok: true, value: JSON.parse(json) as T };
  } catch {
    return { ok: false, reason: "PAYLOAD_PARSE_ERROR" };
  }
}
