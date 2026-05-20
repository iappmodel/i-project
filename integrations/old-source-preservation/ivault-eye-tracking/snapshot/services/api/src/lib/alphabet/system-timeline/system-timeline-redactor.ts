import type { Json } from "@/types/alphabet/database.types";

const SERVICE_ONLY_KEYS = new Set([
  "raw_evidence",
  "rawEvidence",
  "provider_raw_payload",
  "providerRawPayload",
  "internalSummary",
  "internal_summary",
  "decision_notes",
  "decisionNotes",
  "riskSummary",
  "fraudModelOutput",
  "identityGraph",
  "deviceFingerprint",
  "privateEvidence",
  "adminPrivateNote"
]);

const SECRET_KEYS = new Set([
  "bankToken",
  "paymentToken",
  "accountNumber",
  "routingNumber",
  "cardNumber",
  "cvv",
  "secretKey",
  "apiKey",
  "password",
  "providerSecret",
  "webhookSignature",
  "rawIdentityDocument"
]);

export function redactSystemTimelinePayload(
  input: Json | Record<string, unknown>,
  options?: {
    includeServiceOnly?: boolean;
    includeRawPayloads?: boolean;
  }
): Json {
  if (input === null || typeof input !== "object") {
    return input as Json;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactSystemTimelinePayload(item as never, options)) as Json;
  }

  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (SECRET_KEYS.has(key)) {
      output[key] = "[REDACTED_SECRET]";
      continue;
    }

    if (!options?.includeServiceOnly && SERVICE_ONLY_KEYS.has(key)) {
      output[key] = "[SERVICE_ONLY]";
      continue;
    }

    if (!options?.includeRawPayloads && key.toLowerCase().includes("raw")) {
      output[key] = "[RAW_PAYLOAD_HIDDEN]";
      continue;
    }

    if (value && typeof value === "object") {
      output[key] = redactSystemTimelinePayload(value as never, options);
    } else {
      output[key] = value;
    }
  }

  return output as Json;
}
