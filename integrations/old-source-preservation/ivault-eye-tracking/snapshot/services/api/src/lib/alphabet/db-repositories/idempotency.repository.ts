import { createServiceDbClient } from "../db-client";
import type {
  DedupeKeyRecord,
  IdempotencyKeyRecord,
  IdempotencyScope
} from "@/types/alphabet/idempotency.types";
import type { Json } from "@/types/alphabet/database.types";

function mapIdempotencyRow(row: Record<string, unknown>): IdempotencyKeyRecord {
  const meta = (row.metadata as Record<string, unknown> | null) ?? {};
  return {
    idempotencyKey: row.idempotency_key as string,
    scope: row.scope as IdempotencyScope,
    status: row.status as IdempotencyKeyRecord["status"],
    userId: (row.user_id as string | null) ?? null,
    objectId: (row.object_id as string | null) ?? null,
    requestHash: (row.request_hash as string | null) ?? null,
    responseSnapshot: (meta.responseSnapshot as Json | undefined) ?? null,
    linkedObjectIds: (meta.linkedObjectIds as IdempotencyKeyRecord["linkedObjectIds"] | undefined) ?? {},
    firstSeenAt: row.first_seen_at as string,
    lastSeenAt: row.last_seen_at as string,
    expiresAt: (meta.expiresAt as string | null | undefined) ?? null,
    metadata: (row.metadata as Json) ?? {}
  };
}

function mapDedupeRow(row: Record<string, unknown>): DedupeKeyRecord {
  const meta = (row.metadata as Record<string, unknown> | null) ?? {};
  return {
    dedupeKey: row.dedupe_key as string,
    scope: row.scope as IdempotencyScope,
    status: row.status as DedupeKeyRecord["status"],
    userId: (row.user_id as string | null) ?? null,
    objectId: (row.object_id as string | null) ?? null,
    duplicateCount: (row.duplicate_count as number) ?? 0,
    firstSeenAt: row.first_seen_at as string,
    lastSeenAt: row.last_seen_at as string,
    expiresAt: (meta.expiresAt as string | null | undefined) ?? null,
    metadata: (row.metadata as Json) ?? {}
  };
}

export async function getIdempotencyKeyDb(idempotencyKey: string): Promise<IdempotencyKeyRecord | null> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("idempotency_keys")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) throw error;
  return data ? mapIdempotencyRow(data as Record<string, unknown>) : null;
}

export async function upsertIdempotencyKeyDb(params: {
  idempotencyKey: string;
  scope: IdempotencyScope;
  userId?: string | null;
  objectId?: string | null;
  requestHash?: string | null;
  status: string;
  responseSnapshot?: Json | null;
  linkedObjectIds?: IdempotencyKeyRecord["linkedObjectIds"];
  expiresAt?: string | null;
  metadata?: Json;
  firstSeenAt?: string | null;
}): Promise<IdempotencyKeyRecord> {
  const db = createServiceDbClient();

  const metadata: Record<string, unknown> = {
    ...((params.metadata as Record<string, unknown>) ?? {}),
    responseSnapshot: params.responseSnapshot ?? null,
    linkedObjectIds: params.linkedObjectIds ?? {},
    expiresAt: params.expiresAt ?? null
  };

  const nowIso = new Date().toISOString();
  const firstSeen = params.firstSeenAt ?? nowIso;

  const { data, error } = await db
    .from("idempotency_keys")
    .upsert(
      {
        idempotency_key: params.idempotencyKey,
        scope: params.scope,
        user_id: params.userId ?? null,
        object_id: params.objectId ?? null,
        request_hash: params.requestHash ?? null,
        status: params.status,
        first_seen_at: firstSeen,
        last_seen_at: nowIso,
        metadata
      },
      { onConflict: "idempotency_key" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapIdempotencyRow(data as Record<string, unknown>);
}

export async function completeIdempotencyKeyDb(params: {
  idempotencyKey: string;
  responseSnapshot: Json;
  linkedObjectIds?: IdempotencyKeyRecord["linkedObjectIds"];
  metadata?: Json;
}): Promise<IdempotencyKeyRecord> {
  const existing = await getIdempotencyKeyDb(params.idempotencyKey);

  return upsertIdempotencyKeyDb({
    idempotencyKey: params.idempotencyKey,
    scope: existing?.scope ?? "api_action",
    userId: existing?.userId ?? null,
    objectId: existing?.objectId ?? null,
    requestHash: existing?.requestHash ?? null,
    status: "completed",
    responseSnapshot: params.responseSnapshot,
    linkedObjectIds: params.linkedObjectIds ?? existing?.linkedObjectIds ?? {},
    expiresAt: existing?.expiresAt ?? null,
    firstSeenAt: existing?.firstSeenAt ?? null,
    metadata: {
      ...(existing?.metadata as Record<string, unknown> | undefined),
      ...(params.metadata as Record<string, unknown> | undefined)
    } as Json
  });
}

export async function getDedupeKeyDb(dedupeKey: string): Promise<DedupeKeyRecord | null> {
  const db = createServiceDbClient();

  const { data, error } = await db.from("dedupe_keys").select("*").eq("dedupe_key", dedupeKey).maybeSingle();

  if (error) throw error;
  return data ? mapDedupeRow(data as Record<string, unknown>) : null;
}

export async function upsertDedupeKeyDb(params: {
  dedupeKey: string;
  scope: IdempotencyScope;
  userId?: string | null;
  objectId?: string | null;
  status: string;
  duplicateCount?: number;
  expiresAt?: string | null;
  metadata?: Json;
  firstSeenAt?: string | null;
}): Promise<DedupeKeyRecord> {
  const db = createServiceDbClient();

  const metadata: Record<string, unknown> = {
    ...((params.metadata as Record<string, unknown>) ?? {}),
    expiresAt: params.expiresAt ?? null
  };

  const nowIso = new Date().toISOString();
  const firstSeen = params.firstSeenAt ?? nowIso;

  const { data, error } = await db
    .from("dedupe_keys")
    .upsert(
      {
        dedupe_key: params.dedupeKey,
        scope: params.scope,
        user_id: params.userId ?? null,
        object_id: params.objectId ?? null,
        duplicate_count: params.duplicateCount ?? 0,
        status: params.status,
        first_seen_at: firstSeen,
        last_seen_at: nowIso,
        metadata
      },
      { onConflict: "dedupe_key" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapDedupeRow(data as Record<string, unknown>);
}

export async function incrementDedupeDuplicateDb(dedupeKey: string): Promise<DedupeKeyRecord | null> {
  const existing = await getDedupeKeyDb(dedupeKey);
  if (!existing) return null;

  return upsertDedupeKeyDb({
    dedupeKey,
    scope: existing.scope,
    userId: existing.userId,
    objectId: existing.objectId,
    status: "duplicate",
    duplicateCount: existing.duplicateCount + 1,
    expiresAt: existing.expiresAt,
    firstSeenAt: existing.firstSeenAt,
    metadata: existing.metadata
  });
}

export async function releaseDedupeKeyDb(dedupeKey: string): Promise<DedupeKeyRecord | null> {
  const existing = await getDedupeKeyDb(dedupeKey);
  if (!existing) return null;

  return upsertDedupeKeyDb({
    dedupeKey,
    scope: existing.scope,
    userId: existing.userId,
    objectId: existing.objectId,
    status: "released",
    duplicateCount: existing.duplicateCount,
    expiresAt: existing.expiresAt,
    firstSeenAt: existing.firstSeenAt,
    metadata: existing.metadata
  });
}
