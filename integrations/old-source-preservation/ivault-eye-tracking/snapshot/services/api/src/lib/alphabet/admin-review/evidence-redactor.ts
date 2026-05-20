import type { Json } from "@/types/alphabet/database.types";

const SENSITIVE_KEYS = new Set([
  "bankToken",
  "paymentToken",
  "accountNumber",
  "routingNumber",
  "cardNumber",
  "cvv",
  "secretKey",
  "apiKey",
  "password",
  "rawIdentityDocument",
  "deviceFingerprint",
  "identityGraph",
  "privateEvidence",
  "reviewerPrivateNote",
  "internalThreshold",
  "rawRiskScore",
  "fraudModelOutput",
  "providerRawPayload",
  "providerSecret",
  "webhookSignature",
  "adminPrivateNote"
]);

export function redactEvidence<T extends Json | Record<string, unknown>>(input: T): T {
  if (input === null || typeof input !== "object") return input;

  if (Array.isArray(input)) {
    return input.map((item) => redactEvidence(item as Json)) as unknown as T;
  }

  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEYS.has(key)) {
      clean[key] = "[REDACTED]";
      continue;
    }

    if (value && typeof value === "object") {
      clean[key] = redactEvidence(value as never);
    } else {
      clean[key] = value;
    }
  }

  return clean as T;
}

export function buildPublicSummary(params: {
  reviewCaseType: string;
  reviewTrigger: string;
  severity: string;
}): string {
  return `A ${params.severity} ${params.reviewCaseType} was opened because ${params.reviewTrigger}.`;
}
