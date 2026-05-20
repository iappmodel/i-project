import { createHash, randomUUID } from "node:crypto";
import type { Json } from "@/types/alphabet/database.types";
import type { IdempotencyScope } from "@/types/alphabet/idempotency.types";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const record = value as Record<string, unknown>;

  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function createRequestHash(payload: Json | Record<string, unknown>): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

export function createCanonicalIdempotencyKey(params: {
  scope: IdempotencyScope;
  userId?: string | null;
  objectId?: string | null;
  clientRequestId?: string | null;
  action?: string | null;
}): string {
  return [
    "idem",
    params.scope,
    params.userId ?? "system",
    params.objectId ?? "object",
    params.action ?? "action",
    params.clientRequestId ?? randomUUID()
  ].join(":");
}

export function createCanonicalDedupeKey(params: {
  scope: IdempotencyScope;
  userId?: string | null;
  objectId?: string | null;
  action?: string | null;
  amount?: number | null;
  coinCode?: string | null;
}): string {
  return [
    "dedupe",
    params.scope,
    params.userId ?? "system",
    params.objectId ?? "object",
    params.action ?? "action",
    params.amount ?? "na",
    params.coinCode ?? "na"
  ].join(":");
}
