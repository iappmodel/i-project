import { severityForStatus, visibilityForEntry } from "@/data/alphabet/system-timeline-rules";
import type { Json } from "@/types/alphabet/database.types";
import type {
  SystemTimelineEntry,
  SystemTimelineEntryType,
  SystemTimelineObjectType
} from "@/types/alphabet/system-timeline.types";
import { redactSystemTimelinePayload } from "./system-timeline-redactor";

function createEntryId(prefix: string, objectId: string) {
  return `${prefix}:${objectId}`;
}

function getValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return null;
}

export function normalizeTimelineRow(params: {
  row: Record<string, unknown>;
  entryType: SystemTimelineEntryType;
  objectType: SystemTimelineObjectType;
  objectIdKey: string;
  statusKeys?: string[];
  title: string;
  summary?: string | null;
  occurredAtKeys?: string[];
  sourceObjectType?: SystemTimelineObjectType | null;
  sourceObjectId?: string | null;
  includeServiceOnly?: boolean;
  includeRawPayloads?: boolean;
}): SystemTimelineEntry {
  const rawId = params.row[params.objectIdKey];
  const objectId = rawId != null && rawId !== "" ? String(rawId) : "unknown";

  const statusVal = getValue(params.row, params.statusKeys ?? ["status"]);
  const status = statusVal != null ? String(statusVal) : "";

  const occurredRaw = getValue(params.row, params.occurredAtKeys ?? ["created_at", "updated_at"]);
  const occurredAt =
    occurredRaw != null && String(occurredRaw) !== ""
      ? String(occurredRaw)
      : new Date().toISOString();

  const fullPayload: Json = params.includeRawPayloads ? (params.row as unknown as Json) : {};

  return {
    entryId: createEntryId(params.entryType, objectId),
    entryType: params.entryType,
    objectType: params.objectType,
    objectId,
    title: params.title,
    summary: params.summary ?? null,
    status: status || null,
    severity: severityForStatus(params.entryType, status || null),
    visibility: visibilityForEntry(params.entryType),
    occurredAt,
    sourceObjectType: params.sourceObjectType ?? null,
    sourceObjectId: params.sourceObjectId ?? null,
    payload: fullPayload,
    redactedPayload: redactSystemTimelinePayload(params.row as never, {
      includeServiceOnly: params.includeServiceOnly,
      includeRawPayloads: params.includeRawPayloads
    }),
    reasonCodes: Array.isArray(params.row.reason_codes)
      ? (params.row.reason_codes as string[])
      : Array.isArray(params.row.reasonCodes)
        ? (params.row.reasonCodes as string[])
        : [],
    metadata: {
      normalizedFrom: params.entryType
    }
  };
}

export function normalizeAlphabetEvent(
  row: Record<string, unknown>,
  options?: {
    includeServiceOnly?: boolean;
    includeRawPayloads?: boolean;
  }
) {
  const meta = (row.metadata_json ?? row.metadata) as Record<string, unknown> | undefined;
  const metaExec = meta && typeof meta.executionRequestId === "string" ? meta.executionRequestId : "";
  const metaTransfer =
    meta && typeof meta.externalTransferId === "string" ? meta.externalTransferId : "";

  const sourceTypeRaw = row.object_type;
  const sourceType =
    typeof sourceTypeRaw === "string" && sourceTypeRaw.length > 0
      ? (sourceTypeRaw as SystemTimelineObjectType)
      : null;

  return normalizeTimelineRow({
    row,
    entryType: "event",
    objectType: "alphabet_event",
    objectIdKey: "event_id",
    statusKeys: ["verification_status"],
    title: String(row.event_type ?? "Alphabet event"),
    summary: String(row.source_context ?? ""),
    occurredAtKeys: ["created_at"],
    sourceObjectType: sourceType,
    sourceObjectId: String(row.object_id ?? metaExec ?? metaTransfer ?? ""),
    includeServiceOnly: options?.includeServiceOnly,
    includeRawPayloads: options?.includeRawPayloads
  });
}

export function normalizeLedgerEntry(
  row: Record<string, unknown>,
  options?: {
    includeServiceOnly?: boolean;
    includeRawPayloads?: boolean;
  }
) {
  const st = row.source_type;
  const sourceObjectType: SystemTimelineObjectType | null =
    st === "execution_request"
      ? "execution_request"
      : st === "ledger_reversal"
        ? "ledger_entry"
        : null;

  return normalizeTimelineRow({
    row,
    entryType: "ledger",
    objectType: "ledger_entry",
    objectIdKey: "ledger_entry_id",
    statusKeys: ["ledger_status", "status"],
    title: `Ledger ${String(row.direction ?? "entry")} ${String(row.amount ?? "")} ${String(row.coin_code ?? "")}`,
    summary: String(row.reason_code ?? ""),
    occurredAtKeys: ["created_at"],
    sourceObjectType,
    sourceObjectId: row.source_object_id != null ? String(row.source_object_id) : null,
    includeServiceOnly: options?.includeServiceOnly,
    includeRawPayloads: options?.includeRawPayloads
  });
}

export function normalizeGenericSystemRow(params: {
  row: Record<string, unknown>;
  entryType: SystemTimelineEntryType;
  objectType: SystemTimelineObjectType;
  objectIdKey: string;
  title: string;
  statusKeys?: string[];
  includeServiceOnly?: boolean;
  includeRawPayloads?: boolean;
}) {
  return normalizeTimelineRow({
    row: params.row,
    entryType: params.entryType,
    objectType: params.objectType,
    objectIdKey: params.objectIdKey,
    statusKeys: params.statusKeys ?? ["status"],
    title: params.title,
    occurredAtKeys: ["created_at", "updated_at"],
    includeServiceOnly: params.includeServiceOnly,
    includeRawPayloads: params.includeRawPayloads
  });
}
