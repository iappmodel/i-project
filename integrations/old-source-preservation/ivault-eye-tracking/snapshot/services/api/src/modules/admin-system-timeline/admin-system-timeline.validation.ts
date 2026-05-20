import { z } from "zod";

/** Express query values are strings; avoid z.coerce.boolean() which treats "false" as true. */
const optionalQueryBoolean = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  if (typeof val === "boolean") return val;
  const s = String(val).toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return undefined;
}, z.boolean().optional());

const objectTypes = [
  "user",
  "wallet",
  "wallet_account",
  "ledger_entry",
  "value_lot",
  "policy_decision",
  "pipeline",
  "saga",
  "execution_request",
  "external_transfer",
  "provider_reconciliation",
  "compensation",
  "admin_review_case",
  "audit_record",
  "notification",
  "alphabet_event",
  "idempotency_key",
  "dedupe_key",
  "system"
] as const;

export const systemTimelineObjectTypeSchema = z.enum(objectTypes);

export const systemTimelineQuerySchema = z.object({
  objectType: systemTimelineObjectTypeSchema,
  objectId: z.string().min(1),
  includeRawPayloads: optionalQueryBoolean,
  includeServiceOnly: optionalQueryBoolean,
  maxEntries: z.coerce.number().int().positive().max(500).optional()
});

export const systemTimelineParamsSchema = z.object({
  objectType: systemTimelineObjectTypeSchema,
  objectId: z.string().min(1)
});

export const systemTimelineDetailQuerySchema = z.object({
  includeRawPayloads: optionalQueryBoolean,
  includeServiceOnly: optionalQueryBoolean,
  maxEntries: z.coerce.number().int().positive().max(500).optional()
});
