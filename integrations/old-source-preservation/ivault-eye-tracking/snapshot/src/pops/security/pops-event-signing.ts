import { createHmac, timingSafeEqual } from "crypto";
import type { PopsSessionTokenClaims } from "./pops-security.types";

interface PopsTokenEnvelope {
  claims: PopsSessionTokenClaims;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPart(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createPopsSessionToken(claims: PopsSessionTokenClaims, secret: string): string {
  const encodedPayload = base64UrlEncode(JSON.stringify({ claims } satisfies PopsTokenEnvelope));
  const signature = signPart(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export interface PopsSessionTokenValidationInput {
  token: string;
  expectedSessionId: string;
  expectedUserId: string;
  expectedDeviceId: string;
  expectedCampaignId: string;
  atMs: number;
}

export interface PopsSessionTokenValidationResult {
  valid: boolean;
  reasons: string[];
  claims?: PopsSessionTokenClaims;
}

export function validatePopsSessionToken(
  input: PopsSessionTokenValidationInput,
  secret: string,
): PopsSessionTokenValidationResult {
  const [encodedPayload, signature] = input.token.split(".");
  if (!encodedPayload || !signature) {
    return { valid: false, reasons: ["SESSION_TOKEN_MALFORMED"] };
  }

  const expectedSignature = signPart(encodedPayload, secret);
  if (!constantTimeEquals(signature, expectedSignature)) {
    return { valid: false, reasons: ["SESSION_TOKEN_SIGNATURE_INVALID"] };
  }

  const payloadString = base64UrlDecode(encodedPayload);
  const payload = JSON.parse(payloadString) as PopsTokenEnvelope;
  const claims = payload.claims;

  const reasons: string[] = [];
  if (claims.sessionId !== input.expectedSessionId) reasons.push("SESSION_TOKEN_SESSION_MISMATCH");
  if (claims.userId !== input.expectedUserId) reasons.push("SESSION_TOKEN_USER_MISMATCH");
  if (claims.deviceId !== input.expectedDeviceId) reasons.push("SESSION_TOKEN_DEVICE_MISMATCH");
  if (claims.campaignId !== input.expectedCampaignId) reasons.push("SESSION_TOKEN_CAMPAIGN_MISMATCH");
  if (input.atMs < claims.startedAtMs) reasons.push("SESSION_TOKEN_NOT_STARTED");
  if (input.atMs > claims.expiresAtMs) reasons.push("SESSION_TOKEN_EXPIRED");

  return {
    valid: reasons.length === 0,
    reasons,
    claims,
  };
}

export function signPopsEventDigest(eventDigest: string, token: string, secret: string): string {
  return createHmac("sha256", secret).update(`${token}:${eventDigest}`).digest("base64url");
}

export function verifyPopsEventDigestSignature(
  eventDigest: string,
  token: string,
  signature: string,
  secret: string,
): boolean {
  const expected = signPopsEventDigest(eventDigest, token, secret);
  return constantTimeEquals(signature, expected);
}
