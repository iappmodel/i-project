import type { SystemTimelineInput, SystemTimelineObjectType } from "@/types/alphabet/system-timeline.types";
import { fetchSystemTimelineRelatedRowsDb } from "../db-repositories/system-timeline.repository";
import { buildSystemObjectGraph, type SystemTimelineGraphRows } from "./system-object-graph";
import { buildSystemTimelineResult } from "./system-timeline-engine";
import {
  normalizeAlphabetEvent,
  normalizeGenericSystemRow,
  normalizeLedgerEntry
} from "./system-timeline-normalizers";

export async function getSystemTimeline(params: {
  objectType: SystemTimelineObjectType;
  objectId: string;
  includeServiceOnly?: boolean;
  includeRawPayloads?: boolean;
  maxDepth?: number;
  maxEntries?: number;
}) {
  const input: SystemTimelineInput = {
    root: {
      objectType: params.objectType,
      objectId: params.objectId
    },
    includeServiceOnly: params.includeServiceOnly ?? false,
    includeRawPayloads: params.includeRawPayloads ?? false,
    maxDepth: params.maxDepth ?? 2,
    maxEntries: params.maxEntries ?? 250,
    now: new Date().toISOString()
  };

  const rows = await fetchSystemTimelineRelatedRowsDb({
    objectType: params.objectType,
    objectId: params.objectId,
    maxEntries: input.maxEntries
  });

  const graphRows: SystemTimelineGraphRows = {
    events: rows.events as Record<string, unknown>[],
    ledgers: rows.ledgers as Record<string, unknown>[],
    executions: rows.executions as Record<string, unknown>[],
    policies: rows.policies as Record<string, unknown>[],
    pipelines: rows.pipelines as Record<string, unknown>[],
    sagas: rows.sagas as Record<string, unknown>[],
    transfers: rows.transfers as Record<string, unknown>[],
    reconciliations: rows.reconciliations as Record<string, unknown>[],
    compensations: rows.compensations as Record<string, unknown>[],
    reviews: rows.reviews as Record<string, unknown>[],
    audits: rows.audits as Record<string, unknown>[],
    notifications: rows.notifications as Record<string, unknown>[]
  };

  const graph = buildSystemObjectGraph(graphRows);

  const options = {
    includeServiceOnly: input.includeServiceOnly,
    includeRawPayloads: input.includeRawPayloads
  };

  const entries = [
    ...rows.events.map((row) => normalizeAlphabetEvent(row as Record<string, unknown>, options)),
    ...rows.ledgers.map((row) => normalizeLedgerEntry(row as Record<string, unknown>, options)),

    ...rows.executions.map((row) =>
      normalizeGenericSystemRow({
        row: row as Record<string, unknown>,
        entryType: "execution",
        objectType: "execution_request",
        objectIdKey: "execution_request_id",
        title: `Execution ${String((row as Record<string, unknown>).handler_name ?? "")}`,
        statusKeys: ["status"],
        ...options
      })
    ),

    ...rows.policies.map((row) =>
      normalizeGenericSystemRow({
        row: row as Record<string, unknown>,
        entryType: "policy",
        objectType: "policy_decision",
        objectIdKey: "policy_decision_id",
        title: `Policy ${String((row as Record<string, unknown>).decision ?? "")}`,
        statusKeys: ["status", "decision"],
        ...options
      })
    ),

    ...rows.pipelines.map((row) =>
      normalizeGenericSystemRow({
        row: row as Record<string, unknown>,
        entryType: "pipeline",
        objectType: "pipeline",
        objectIdKey: "pipeline_id",
        title: "Pipeline record",
        statusKeys: ["status"],
        ...options
      })
    ),

    ...rows.sagas.map((row) =>
      normalizeGenericSystemRow({
        row: row as Record<string, unknown>,
        entryType: "saga",
        objectType: "saga",
        objectIdKey: "saga_id",
        title: "Saga record",
        statusKeys: ["status"],
        ...options
      })
    ),

    ...rows.transfers.map((row) =>
      normalizeGenericSystemRow({
        row: row as Record<string, unknown>,
        entryType: "external_transfer",
        objectType: "external_transfer",
        objectIdKey: "external_transfer_id",
        title: `External transfer ${String((row as Record<string, unknown>).transfer_type ?? "")}`,
        statusKeys: ["status"],
        ...options
      })
    ),

    ...rows.reconciliations.map((row) =>
      normalizeGenericSystemRow({
        row: row as Record<string, unknown>,
        entryType: "provider_reconciliation",
        objectType: "provider_reconciliation",
        objectIdKey: "reconciliation_id",
        title: `Provider reconciliation ${String((row as Record<string, unknown>).provider ?? "")}`,
        statusKeys: ["reconciliation_status"],
        ...options
      })
    ),

    ...rows.compensations.map((row) =>
      normalizeGenericSystemRow({
        row: row as Record<string, unknown>,
        entryType: "compensation",
        objectType: "compensation",
        objectIdKey: "compensation_id",
        title: `Compensation ${String((row as Record<string, unknown>).compensation_type ?? "")}`,
        statusKeys: ["status"],
        ...options
      })
    ),

    ...rows.reviews.map((row) =>
      normalizeGenericSystemRow({
        row: row as Record<string, unknown>,
        entryType: "admin_review",
        objectType: "admin_review_case",
        objectIdKey: "review_case_id",
        title: `Admin review ${String((row as Record<string, unknown>).review_case_type ?? "")}`,
        statusKeys: ["status"],
        ...options
      })
    ),

    ...rows.audits.map((row) =>
      normalizeGenericSystemRow({
        row: row as Record<string, unknown>,
        entryType: "audit",
        objectType: "audit_record",
        objectIdKey: "audit_record_id",
        title: `Audit ${String((row as Record<string, unknown>).audit_type ?? "")}`,
        statusKeys: ["status"],
        ...options
      })
    ),

    ...rows.notifications.map((row) =>
      normalizeGenericSystemRow({
        row: row as Record<string, unknown>,
        entryType: "notification",
        objectType: "notification",
        objectIdKey: "notification_id",
        title: `Notification ${String((row as Record<string, unknown>).category ?? "")}`,
        statusKeys: ["status"],
        ...options
      })
    ),

    ...rows.idempotency.map((row) =>
      normalizeGenericSystemRow({
        row: row as Record<string, unknown>,
        entryType: "idempotency",
        objectType: "idempotency_key",
        objectIdKey: "idempotency_key",
        title: `Idempotency ${String((row as Record<string, unknown>).scope ?? "")}`,
        statusKeys: ["status"],
        ...options
      })
    ),

    ...rows.dedupe.map((row) =>
      normalizeGenericSystemRow({
        row: row as Record<string, unknown>,
        entryType: "dedupe",
        objectType: "dedupe_key",
        objectIdKey: "dedupe_key",
        title: `Dedupe ${String((row as Record<string, unknown>).scope ?? "")}`,
        statusKeys: ["status"],
        ...options
      })
    )
  ];

  return buildSystemTimelineResult({
    input,
    nodes: graph.nodes,
    edges: graph.edges,
    entries,
    rows: {
      ledgers: rows.ledgers as Record<string, unknown>[],
      transfers: rows.transfers as Record<string, unknown>[],
      compensations: rows.compensations as Record<string, unknown>[],
      reconciliations: rows.reconciliations as Record<string, unknown>[],
      reviews: rows.reviews as Record<string, unknown>[],
      executions: rows.executions as Record<string, unknown>[]
    }
  });
}
