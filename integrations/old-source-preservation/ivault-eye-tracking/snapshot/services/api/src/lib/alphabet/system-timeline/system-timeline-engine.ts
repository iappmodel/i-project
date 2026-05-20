import { randomUUID } from "node:crypto";
import { getTimelineRule } from "@/data/alphabet/system-timeline-rules";
import type { Json } from "@/types/alphabet/database.types";
import type {
  SystemObjectEdge,
  SystemObjectNode,
  SystemTimelineAnomaly,
  SystemTimelineEntry,
  SystemTimelineInput,
  SystemTimelineObjectType,
  SystemTimelineResult
} from "@/types/alphabet/system-timeline.types";
import { redactSystemTimelinePayload } from "./system-timeline-redactor";

function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function nodeId(objectType: SystemTimelineObjectType, objectId: string) {
  return `${objectType}:${objectId}`;
}

function redactEvidenceFragment(row: Record<string, unknown>): Json {
  return redactSystemTimelinePayload(row as never, {
    includeServiceOnly: false,
    includeRawPayloads: false
  });
}

function detectAnomalies(params: {
  entries: SystemTimelineEntry[];
  nodes: SystemObjectNode[];
  edges: { fromNodeId: string; toNodeId: string }[];
  rows: {
    ledgers: Record<string, unknown>[];
    transfers: Record<string, unknown>[];
    compensations: Record<string, unknown>[];
    reconciliations: Record<string, unknown>[];
    reviews: Record<string, unknown>[];
    executions: Record<string, unknown>[];
  };
}): SystemTimelineAnomaly[] {
  const anomalies: SystemTimelineAnomaly[] = [];

  const nodeIdSet = new Set(params.nodes.map((n) => n.nodeId));
  for (const edge of params.edges) {
    if (!nodeIdSet.has(edge.fromNodeId)) {
      anomalies.push({
        anomalyId: createId("timeline_anomaly"),
        anomalyType: "missing_link",
        severity: "warning",
        title: "Edge references missing source node",
        summary: `No node found for ${edge.fromNodeId}.`,
        objectType: "system",
        objectId: edge.fromNodeId,
        relatedObjectIds: [edge.toNodeId],
        evidence: { edge } as unknown as Json,
        redactedEvidence: { fromNodeId: edge.fromNodeId, toNodeId: edge.toNodeId },
        reasonCodes: ["graph_edge_from_missing"]
      });
    }
    if (!nodeIdSet.has(edge.toNodeId)) {
      anomalies.push({
        anomalyId: createId("timeline_anomaly"),
        anomalyType: "missing_link",
        severity: "warning",
        title: "Edge references missing target node",
        summary: `No node found for ${edge.toNodeId}.`,
        objectType: "system",
        objectId: edge.toNodeId,
        relatedObjectIds: [edge.fromNodeId],
        evidence: { edge } as unknown as Json,
        redactedEvidence: { fromNodeId: edge.fromNodeId, toNodeId: edge.toNodeId },
        reasonCodes: ["graph_edge_to_missing"]
      });
    }
  }

  const ledgerIds = new Set(
    params.rows.ledgers.map((row) => String(row.ledger_entry_id ?? "")).filter(Boolean)
  );

  const executionIds = new Set(
    [
      ...params.rows.executions.map((row) => String(row.execution_request_id ?? "")).filter(Boolean),
      ...params.entries
        .filter((entry) => entry.objectType === "execution_request")
        .map((entry) => entry.objectId)
    ].filter(Boolean)
  );

  const idempotencyKeyCounts = new Map<string, number>();
  for (const ledger of params.rows.ledgers) {
    const key = ledger.idempotency_key != null ? String(ledger.idempotency_key) : "";
    if (!key) continue;
    idempotencyKeyCounts.set(key, (idempotencyKeyCounts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of idempotencyKeyCounts) {
    if (count > 1) {
      anomalies.push({
        anomalyId: createId("timeline_anomaly"),
        anomalyType: "duplicate_mutation_risk",
        severity: "warning",
        title: "Duplicate idempotency key on ledger rows",
        summary: `Idempotency key ${key} appears on ${count} ledger entries.`,
        objectType: "ledger_entry",
        objectId: key,
        relatedObjectIds: [],
        evidence: { idempotencyKey: key, count } as unknown as Json,
        redactedEvidence: { idempotencyKey: key, count },
        reasonCodes: ["ledger_idempotency_duplicate"]
      });
    }
  }

  for (const ledger of params.rows.ledgers) {
    if (
      ledger.source_type === "execution_request" &&
      ledger.source_object_id &&
      !executionIds.has(String(ledger.source_object_id))
    ) {
      anomalies.push({
        anomalyId: createId("timeline_anomaly"),
        anomalyType: "ledger_without_execution",
        severity: "critical",
        title: "Ledger entry references missing execution",
        summary:
          "A ledger entry claims it was produced by an execution request that was not found in the graph.",
        objectType: "ledger_entry",
        objectId: String(ledger.ledger_entry_id ?? ""),
        relatedObjectIds: [String(ledger.source_object_id)].filter(Boolean),
        evidence: ledger as unknown as Json,
        redactedEvidence: redactEvidenceFragment(ledger as Record<string, unknown>),
        reasonCodes: ["ledger_source_execution_missing"]
      });
    }

    if (
      ledger.source_type === "ledger_reversal" &&
      ledger.source_object_id &&
      !ledgerIds.has(String(ledger.source_object_id))
    ) {
      anomalies.push({
        anomalyId: createId("timeline_anomaly"),
        anomalyType: "reversal_without_original",
        severity: "critical",
        title: "Reversal ledger missing original ledger",
        summary: "A reversal entry exists but its original ledger entry was not found.",
        objectType: "ledger_entry",
        objectId: String(ledger.ledger_entry_id ?? ""),
        relatedObjectIds: [String(ledger.source_object_id)].filter(Boolean),
        evidence: ledger as unknown as Json,
        redactedEvidence: redactEvidenceFragment(ledger as Record<string, unknown>),
        reasonCodes: ["reversal_original_ledger_missing"]
      });
    }
  }

  for (const transfer of params.rows.transfers) {
    const status = String(transfer.status ?? "");
    if (
      (status === "provider_succeeded" || status === "transfer_completed") &&
      !transfer.original_ledger_entry_id
    ) {
      anomalies.push({
        anomalyId: createId("timeline_anomaly"),
        anomalyType: "transfer_success_without_debit",
        severity: "critical",
        title: "External transfer success without original debit",
        summary: "A transfer appears successful but has no original internal debit.",
        objectType: "external_transfer",
        objectId: String(transfer.external_transfer_id ?? ""),
        relatedObjectIds: [],
        evidence: transfer as unknown as Json,
        redactedEvidence: redactEvidenceFragment(transfer as Record<string, unknown>),
        reasonCodes: ["transfer_success_without_original_debit"]
      });
    }

    const hasReview = params.rows.reviews.some(
      (review) => String(review.external_transfer_id ?? "") === String(transfer.external_transfer_id ?? "")
    );

    if (status === "provider_unknown" && !hasReview) {
      anomalies.push({
        anomalyId: createId("timeline_anomaly"),
        anomalyType: "provider_unknown_without_review",
        severity: "critical",
        title: "Provider unknown without review case",
        summary: "A provider transfer is unknown and no review case was found.",
        objectType: "external_transfer",
        objectId: String(transfer.external_transfer_id ?? ""),
        relatedObjectIds: [],
        evidence: transfer as unknown as Json,
        redactedEvidence: redactEvidenceFragment(transfer as Record<string, unknown>),
        reasonCodes: ["provider_unknown_review_missing"]
      });
    }

    const hasCompensation = params.rows.compensations.some(
      (comp) => String(comp.original_ledger_entry_id ?? "") === String(transfer.original_ledger_entry_id ?? "")
    );

    if (status === "provider_failed" && !hasCompensation && !hasReview) {
      anomalies.push({
        anomalyId: createId("timeline_anomaly"),
        anomalyType: "provider_failure_without_compensation_or_review",
        severity: "danger",
        title: "Provider failure has no compensation or review",
        summary: "A failed transfer should have either a compensation path or an admin review.",
        objectType: "external_transfer",
        objectId: String(transfer.external_transfer_id ?? ""),
        relatedObjectIds: [String(transfer.original_ledger_entry_id ?? "")].filter(Boolean),
        evidence: transfer as unknown as Json,
        redactedEvidence: redactEvidenceFragment(transfer as Record<string, unknown>),
        reasonCodes: ["provider_failure_missing_compensation_or_review"]
      });
    }

    const rule = getTimelineRule("external_transfer");
    const highRisk = rule?.highRiskStatuses.includes(status) ?? false;
    if (highRisk && !hasReview) {
      anomalies.push({
        anomalyId: createId("timeline_anomaly"),
        anomalyType: "unreviewed_high_risk_state",
        severity: "warning",
        title: "High-risk transfer without review case",
        summary: "Transfer is in a high-risk status but no admin review case was found.",
        objectType: "external_transfer",
        objectId: String(transfer.external_transfer_id ?? ""),
        relatedObjectIds: [],
        evidence: transfer as unknown as Json,
        redactedEvidence: redactEvidenceFragment(transfer as Record<string, unknown>),
        reasonCodes: ["unreviewed_high_risk_transfer"]
      });
    }
  }

  for (const compensation of params.rows.compensations) {
    if (
      String(compensation.status ?? "") === "compensation_completed" &&
      !compensation.reversal_ledger_entry_id
    ) {
      anomalies.push({
        anomalyId: createId("timeline_anomaly"),
        anomalyType: "compensation_without_reversal",
        severity: "critical",
        title: "Completed compensation without reversal ledger",
        summary: "A compensation is marked completed but no reversal ledger entry is attached.",
        objectType: "compensation",
        objectId: String(compensation.compensation_id ?? ""),
        relatedObjectIds: [String(compensation.original_ledger_entry_id ?? "")].filter(Boolean),
        evidence: compensation as unknown as Json,
        redactedEvidence: redactEvidenceFragment(compensation as Record<string, unknown>),
        reasonCodes: ["compensation_completed_reversal_missing"]
      });
    }
  }

  return anomalies;
}

function calculateScores(params: {
  entries: SystemTimelineEntry[];
  nodeCount: number;
  edgeCount: number;
  anomalyCount: number;
  criticalAnomalyCount: number;
}) {
  const graphCompletenessScore = clamp(
    params.nodeCount === 0 ? 0 : Math.min(1, params.edgeCount / Math.max(1, params.nodeCount - 1))
  );

  const timelineIntegrityScore = clamp(
    1 - params.anomalyCount * 0.08 - params.criticalAnomalyCount * 0.12
  );

  const auditRiskScore = clamp(params.criticalAnomalyCount * 0.25 + params.anomalyCount * 0.08);

  return {
    graphCompletenessScore,
    timelineIntegrityScore,
    auditRiskScore
  };
}

export function buildSystemTimelineResult(params: {
  input: SystemTimelineInput;
  nodes: SystemObjectNode[];
  edges: SystemObjectEdge[];
  entries: SystemTimelineEntry[];
  rows: {
    ledgers: Record<string, unknown>[];
    transfers: Record<string, unknown>[];
    compensations: Record<string, unknown>[];
    reconciliations: Record<string, unknown>[];
    reviews: Record<string, unknown>[];
    executions: Record<string, unknown>[];
  };
}): SystemTimelineResult {
  const rootNodeId = nodeId(params.input.root.objectType, params.input.root.objectId);
  const nodes = [...params.nodes];
  if (!nodes.some((n) => n.nodeId === rootNodeId)) {
    nodes.unshift({
      nodeId: rootNodeId,
      objectType: params.input.root.objectType,
      objectId: params.input.root.objectId,
      label: `Root: ${params.input.root.objectType}`,
      status: null,
      createdAt: null,
      updatedAt: null,
      visibility: "admin_safe",
      payload: {}
    });
  }

  const sortedEntries = [...params.entries]
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
    .slice(0, params.input.maxEntries);

  let anomalies = detectAnomalies({
    entries: sortedEntries,
    nodes,
    edges: params.edges,
    rows: params.rows
  });

  const referencedNodeIds = new Set<string>();
  for (const edge of params.edges) {
    referencedNodeIds.add(edge.fromNodeId);
    referencedNodeIds.add(edge.toNodeId);
  }

  const orphanNodes = nodes.filter(
    (node) => node.nodeId !== rootNodeId && !referencedNodeIds.has(node.nodeId)
  );

  for (const node of orphanNodes) {
    anomalies.push({
      anomalyId: createId("timeline_anomaly"),
      anomalyType: "orphan_object",
      severity: "warning",
      title: "Graph node with no relations",
      summary: "This object appears in the graph but has no incoming or outgoing edges.",
      objectType: node.objectType,
      objectId: node.objectId,
      relatedObjectIds: [],
      evidence: { nodeId: node.nodeId } as unknown as Json,
      redactedEvidence: { nodeId: node.nodeId, objectType: node.objectType },
      reasonCodes: ["graph_orphan_node"]
    });
  }

  const orphanObjectIds = orphanNodes.map((node) => node.objectId);

  const criticalAnomalyCount = anomalies.filter((anomaly) => anomaly.severity === "critical").length;

  const scores = calculateScores({
    entries: sortedEntries,
    nodeCount: nodes.length,
    edgeCount: params.edges.length,
    anomalyCount: anomalies.length,
    criticalAnomalyCount
  });

  const nodeIdSet = new Set(nodes.map((n) => n.nodeId));
  const missingObjectIds: string[] = [];
  for (const edge of params.edges) {
    if (!nodeIdSet.has(edge.fromNodeId)) missingObjectIds.push(edge.fromNodeId);
    if (!nodeIdSet.has(edge.toNodeId)) missingObjectIds.push(edge.toNodeId);
  }

  return {
    root: params.input.root,
    nodes,
    edges: params.edges,
    entries: sortedEntries,
    anomalies,
    scores,
    missingObjectIds: [...new Set(missingObjectIds)],
    orphanObjectIds,
    generatedAt: params.input.now,
    metadata: {
      maxDepth: params.input.maxDepth,
      maxEntries: params.input.maxEntries
    }
  };
}
