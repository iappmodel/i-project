import { createHmac, timingSafeEqual } from "crypto";
import type { PopsMerchantConfirmationPayload } from "./pops-realworld.types";

export interface PopsMerchantConfirmationVerifyInput {
  /** HMAC-SHA256 base64url over canonical JSON payload, using shared merchant secret. */
  signature: string;
  payload: PopsMerchantConfirmationPayload;
  secret: string;
  expectedCampaignId: string;
  expectedSessionId: string;
  expectedUserId: string;
  /** Merchant cannot confirm on behalf of another merchant's campaign binding. */
  boundMerchantId: string;
  /** Heuristic: many rapid self-confirmations from same terminal. */
  recentSelfConfirmCount: number;
}

export interface PopsMerchantConfirmationResult {
  ok: boolean;
  merchantProofScore: number;
  merchantSelfFraudRisk: boolean;
  reasons: string[];
}

function canonicalPayload(p: PopsMerchantConfirmationPayload): string {
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

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Merchant confirmation must bind campaign + session + user, and mitigate merchant self-fraud.
 */
export class PopsMerchantConfirmationService {
  verify(input: PopsMerchantConfirmationVerifyInput): PopsMerchantConfirmationResult {
    const reasons: string[] = [];
    const p = input.payload;
    if (p.merchantId !== input.boundMerchantId) reasons.push("MERCHANT_BINDING_MISMATCH");
    if (p.campaignId !== input.expectedCampaignId) reasons.push("MERCHANT_CONFIRM_CAMPAIGN_MISMATCH");
    if (p.sessionId !== input.expectedSessionId) reasons.push("MERCHANT_CONFIRM_SESSION_MISMATCH");
    if (p.userId !== input.expectedUserId) reasons.push("MERCHANT_CONFIRM_USER_MISMATCH");

    const body = canonicalPayload(p);
    const expectedSig = signPayload(body, input.secret);
    const a = Buffer.from(input.signature);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
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

  signPayloadForTests(payload: PopsMerchantConfirmationPayload, secret: string): string {
    return signPayload(canonicalPayload(payload), secret);
  }
}
