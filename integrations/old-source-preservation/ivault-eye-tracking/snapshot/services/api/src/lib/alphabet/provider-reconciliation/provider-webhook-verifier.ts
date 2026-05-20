import { createHmac, timingSafeEqual } from "crypto";
import type {
  ProviderWebhookInput,
  ProviderWebhookVerificationResult
} from "@/types/alphabet/provider-reconciliation.types";

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function headerSignature(headers: Record<string, string | null>): string | null {
  const direct =
    headers["x-provider-signature"] ??
    headers["X-Provider-Signature"] ??
    headers["X-PROVIDER-SIGNATURE"];
  if (direct) return direct;
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === "x-provider-signature" && v) return v;
  }
  return null;
}

export function verifyProviderWebhook(
  input: ProviderWebhookInput
): ProviderWebhookVerificationResult {
  if (input.provider === "mock" || input.provider === "internal") {
    return {
      verified: true,
      signatureConfidenceScore: 1,
      reasonCodes: ["provider_signature_not_required"]
    };
  }

  const signature = headerSignature(input.headers);
  const secret = process.env.PROVIDER_WEBHOOK_SECRET;

  if (!secret) {
    return {
      verified: false,
      signatureConfidenceScore: 0,
      reasonCodes: ["provider_webhook_secret_missing"]
    };
  }

  if (!signature) {
    return {
      verified: false,
      signatureConfidenceScore: 0,
      reasonCodes: ["provider_signature_missing"]
    };
  }

  const expected = createHmac("sha256", secret).update(input.rawBody).digest("hex");

  const verified = safeCompare(signature, expected);

  return {
    verified,
    signatureConfidenceScore: verified ? 1 : 0,
    reasonCodes: verified ? ["provider_signature_verified"] : ["provider_signature_invalid"]
  };
}
