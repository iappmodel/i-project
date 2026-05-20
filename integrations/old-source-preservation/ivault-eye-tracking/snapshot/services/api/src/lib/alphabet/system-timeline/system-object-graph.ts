import type {
  SystemObjectEdge,
  SystemObjectNode,
  SystemTimelineObjectType
} from "@/types/alphabet/system-timeline.types";
import { redactSystemTimelinePayload } from "./system-timeline-redactor";

function nodeId(objectType: string, objectId: string) {
  return `${objectType}:${objectId}`;
}

function addNode(params: {
  nodes: Map<string, SystemObjectNode>;
  objectType: SystemTimelineObjectType;
  objectId?: string | null;
  label: string;
  status?: string | null;
  payload?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
}) {
  if (!params.objectId) return;

  const id = nodeId(params.objectType, params.objectId);

  if (params.nodes.has(id)) return;

  params.nodes.set(id, {
    nodeId: id,
    objectType: params.objectType,
    objectId: params.objectId,
    label: params.label,
    status: params.status ?? null,
    createdAt: params.createdAt ?? null,
    updatedAt: params.updatedAt ?? null,
    visibility: "admin_safe",
    payload: redactSystemTimelinePayload((params.payload ?? {}) as never)
  });
}

function addEdge(params: {
  edges: SystemObjectEdge[];
  fromType: SystemTimelineObjectType;
  fromId?: string | null;
  toType: SystemTimelineObjectType;
  toId?: string | null;
  relationType: SystemObjectEdge["relationType"];
  label: string;
  confidence?: number;
}) {
  if (!params.fromId || !params.toId) return;

  const fromNodeId = nodeId(params.fromType, params.fromId);
  const toNodeId = nodeId(params.toType, params.toId);

  params.edges.push({
    edgeId: `${fromNodeId}->${toNodeId}:${params.relationType}`,
    fromNodeId,
    toNodeId,
    relationType: params.relationType,
    label: params.label,
    confidence: params.confidence ?? 1,
    metadata: {}
  });
}

export type SystemTimelineGraphRows = {
  ledgers: Record<string, unknown>[];
  executions: Record<string, unknown>[];
  policies: Record<string, unknown>[];
  pipelines: Record<string, unknown>[];
  sagas: Record<string, unknown>[];
  transfers: Record<string, unknown>[];
  reconciliations: Record<string, unknown>[];
  compensations: Record<string, unknown>[];
  reviews: Record<string, unknown>[];
  audits: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  events: Record<string, unknown>[];
};

export function buildSystemObjectGraph(rows: SystemTimelineGraphRows): {
  nodes: SystemObjectNode[];
  edges: SystemObjectEdge[];
} {
  const nodes = new Map<string, SystemObjectNode>();
  const edges: SystemObjectEdge[] = [];

  for (const row of rows.ledgers) {
    addNode({
      nodes,
      objectType: "ledger_entry",
      objectId: row.ledger_entry_id as string | undefined,
      label: `Ledger ${String(row.direction)} ${String(row.amount)} ${String(row.coin_code)}`,
      status: row.ledger_status != null ? String(row.ledger_status) : null,
      payload: row as Record<string, unknown>,
      createdAt: row.created_at != null ? String(row.created_at) : null,
      updatedAt: row.updated_at != null ? String(row.updated_at) : null
    });

    addNode({
      nodes,
      objectType: "wallet",
      objectId: row.wallet_id as string | undefined,
      label: "Wallet",
      payload: { wallet_id: row.wallet_id }
    });

    addEdge({
      edges,
      fromType: "ledger_entry",
      fromId: row.ledger_entry_id as string | undefined,
      toType: "wallet",
      toId: row.wallet_id as string | undefined,
      relationType: "belongs_to",
      label: "ledger belongs to wallet"
    });

    if (row.wallet_account_id) {
      addNode({
        nodes,
        objectType: "wallet_account",
        objectId: row.wallet_account_id as string | undefined,
        label: "Wallet account",
        payload: { wallet_account_id: row.wallet_account_id }
      });
      addEdge({
        edges,
        fromType: "ledger_entry",
        fromId: row.ledger_entry_id as string | undefined,
        toType: "wallet_account",
        toId: row.wallet_account_id as string | undefined,
        relationType: "belongs_to",
        label: "ledger belongs to wallet account"
      });
    }

    if (row.user_id) {
      addNode({
        nodes,
        objectType: "user",
        objectId: row.user_id as string | undefined,
        label: "User",
        payload: { user_id: row.user_id }
      });
      addEdge({
        edges,
        fromType: "ledger_entry",
        fromId: row.ledger_entry_id as string | undefined,
        toType: "user",
        toId: row.user_id as string | undefined,
        relationType: "belongs_to",
        label: "ledger belongs to user"
      });
    }

    if (row.source_type === "execution_request") {
      addEdge({
        edges,
        fromType: "ledger_entry",
        fromId: row.ledger_entry_id as string | undefined,
        toType: "execution_request",
        toId: row.source_object_id as string | undefined,
        relationType: "caused_by",
        label: "ledger caused by execution"
      });
    }

    if (row.source_type === "ledger_reversal") {
      addEdge({
        edges,
        fromType: "ledger_entry",
        fromId: row.ledger_entry_id as string | undefined,
        toType: "ledger_entry",
        toId: row.source_object_id as string | undefined,
        relationType: "reversed_by",
        label: "reversal references original ledger"
      });
    }
  }

  for (const row of rows.executions) {
    addNode({
      nodes,
      objectType: "execution_request",
      objectId: row.execution_request_id as string | undefined,
      label: `Execution ${String(row.handler_name ?? "")}`,
      status: row.status != null ? String(row.status) : null,
      payload: row as Record<string, unknown>,
      createdAt: row.created_at != null ? String(row.created_at) : null,
      updatedAt: row.updated_at != null ? String(row.updated_at) : null
    });

    if (row.source_policy_decision_id) {
      addEdge({
        edges,
        fromType: "execution_request",
        fromId: row.execution_request_id as string | undefined,
        toType: "policy_decision",
        toId: row.source_policy_decision_id as string | undefined,
        relationType: "caused_by",
        label: "execution caused by policy"
      });
    }
  }

  for (const row of rows.policies) {
    addNode({
      nodes,
      objectType: "policy_decision",
      objectId: row.policy_decision_id as string | undefined,
      label: `Policy ${String(row.decision ?? "")}`,
      status: row.status != null ? String(row.status) : row.decision != null ? String(row.decision) : null,
      payload: row as Record<string, unknown>,
      createdAt: row.created_at != null ? String(row.created_at) : null,
      updatedAt: row.updated_at != null ? String(row.updated_at) : null
    });
  }

  for (const row of rows.pipelines) {
    addNode({
      nodes,
      objectType: "pipeline",
      objectId: row.pipeline_id as string | undefined,
      label: "Pipeline",
      status: row.status != null ? String(row.status) : null,
      payload: row as Record<string, unknown>,
      createdAt: row.created_at != null ? String(row.created_at) : null,
      updatedAt: row.updated_at != null ? String(row.updated_at) : null
    });
  }

  for (const row of rows.sagas) {
    addNode({
      nodes,
      objectType: "saga",
      objectId: row.saga_id as string | undefined,
      label: "Saga",
      status: row.status != null ? String(row.status) : null,
      payload: row as Record<string, unknown>,
      createdAt: row.created_at != null ? String(row.created_at) : null,
      updatedAt: row.updated_at != null ? String(row.updated_at) : null
    });
  }

  for (const row of rows.transfers) {
    addNode({
      nodes,
      objectType: "external_transfer",
      objectId: row.external_transfer_id as string | undefined,
      label: `External transfer ${String(row.amount)} ${String(row.coin_code)}`,
      status: row.status != null ? String(row.status) : null,
      payload: row as Record<string, unknown>,
      createdAt: row.created_at != null ? String(row.created_at) : null,
      updatedAt: row.updated_at != null ? String(row.updated_at) : null
    });

    addEdge({
      edges,
      fromType: "external_transfer",
      fromId: row.external_transfer_id as string | undefined,
      toType: "ledger_entry",
      toId: row.original_ledger_entry_id as string | undefined,
      relationType: "derives_from",
      label: "transfer derives from debit ledger"
    });

    addEdge({
      edges,
      fromType: "external_transfer",
      fromId: row.external_transfer_id as string | undefined,
      toType: "execution_request",
      toId: row.original_execution_request_id as string | undefined,
      relationType: "caused_by",
      label: "transfer caused by execution"
    });
  }

  for (const row of rows.reconciliations) {
    addNode({
      nodes,
      objectType: "provider_reconciliation",
      objectId: row.reconciliation_id as string | undefined,
      label: `Provider reconciliation ${String(row.normalized_provider_status ?? row.provider ?? "")}`,
      status: row.reconciliation_status != null ? String(row.reconciliation_status) : null,
      payload: row as Record<string, unknown>,
      createdAt: row.created_at != null ? String(row.created_at) : null,
      updatedAt: row.updated_at != null ? String(row.updated_at) : null
    });

    addEdge({
      edges,
      fromType: "provider_reconciliation",
      fromId: row.reconciliation_id as string | undefined,
      toType: "external_transfer",
      toId: row.external_transfer_id as string | undefined,
      relationType: "references",
      label: "reconciles transfer"
    });
  }

  for (const row of rows.compensations) {
    addNode({
      nodes,
      objectType: "compensation",
      objectId: row.compensation_id as string | undefined,
      label: `Compensation ${String(row.compensation_type)}`,
      status: row.status != null ? String(row.status) : null,
      payload: row as Record<string, unknown>,
      createdAt: row.created_at != null ? String(row.created_at) : null,
      updatedAt: row.updated_at != null ? String(row.updated_at) : null
    });

    addEdge({
      edges,
      fromType: "compensation",
      fromId: row.compensation_id as string | undefined,
      toType: "ledger_entry",
      toId: row.original_ledger_entry_id as string | undefined,
      relationType: "compensated_by",
      label: "compensates original ledger"
    });

    addEdge({
      edges,
      fromType: "compensation",
      fromId: row.compensation_id as string | undefined,
      toType: "ledger_entry",
      toId: row.reversal_ledger_entry_id as string | undefined,
      relationType: "produced",
      label: "produced reversal ledger"
    });
  }

  for (const row of rows.reviews) {
    addNode({
      nodes,
      objectType: "admin_review_case",
      objectId: row.review_case_id as string | undefined,
      label: `Review ${String(row.review_case_type)}`,
      status: row.status != null ? String(row.status) : null,
      payload: row as Record<string, unknown>,
      createdAt: row.created_at != null ? String(row.created_at) : null,
      updatedAt: row.updated_at != null ? String(row.updated_at) : null
    });

    const links: Array<[SystemTimelineObjectType, string | null | undefined]> = [
      ["external_transfer", row.external_transfer_id as string | undefined],
      ["compensation", row.compensation_id as string | undefined],
      ["policy_decision", row.policy_decision_id as string | undefined],
      ["pipeline", row.pipeline_id as string | undefined],
      ["saga", row.saga_id as string | undefined],
      ["execution_request", row.execution_request_id as string | undefined],
      ["provider_reconciliation", row.provider_reconciliation_id as string | undefined],
      ["wallet", row.wallet_id as string | undefined]
    ];

    for (const [type, linkId] of links) {
      addEdge({
        edges,
        fromType: "admin_review_case",
        fromId: row.review_case_id as string | undefined,
        toType: type,
        toId: linkId,
        relationType: "reviewed_by",
        label: `review references ${type}`
      });
    }
  }

  for (const row of rows.audits) {
    addNode({
      nodes,
      objectType: "audit_record",
      objectId: row.audit_record_id as string | undefined,
      label: `Audit ${String(row.audit_type)}`,
      status: row.status != null ? String(row.status) : null,
      payload: row as Record<string, unknown>,
      createdAt: row.created_at != null ? String(row.created_at) : null,
      updatedAt: row.updated_at != null ? String(row.updated_at) : null
    });
  }

  for (const row of rows.notifications) {
    addNode({
      nodes,
      objectType: "notification",
      objectId: row.notification_id as string | undefined,
      label: `Notification ${String(row.category)}`,
      status: row.status != null ? String(row.status) : null,
      payload: row as Record<string, unknown>,
      createdAt: row.created_at != null ? String(row.created_at) : null,
      updatedAt: row.updated_at != null ? String(row.updated_at) : null
    });

    addEdge({
      edges,
      fromType: "notification",
      fromId: row.notification_id as string | undefined,
      toType: "execution_request",
      toId: row.source_object_id as string | undefined,
      relationType: "references",
      label: "notification references source object"
    });
  }

  for (const row of rows.events) {
    addNode({
      nodes,
      objectType: "alphabet_event",
      objectId: row.event_id as string | undefined,
      label: `Event ${String(row.event_type)}`,
      status: row.verification_status != null ? String(row.verification_status) : null,
      payload: row as Record<string, unknown>,
      createdAt: row.created_at != null ? String(row.created_at) : null,
      updatedAt: null
    });
  }

  return {
    nodes: Array.from(nodes.values()),
    edges
  };
}
