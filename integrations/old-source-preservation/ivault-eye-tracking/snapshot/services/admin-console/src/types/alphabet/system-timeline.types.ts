export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SystemTimelineObjectType =
  | "user"
  | "wallet"
  | "wallet_account"
  | "ledger_entry"
  | "value_lot"
  | "policy_decision"
  | "pipeline"
  | "saga"
  | "execution_request"
  | "external_transfer"
  | "provider_reconciliation"
  | "compensation"
  | "admin_review_case"
  | "audit_record"
  | "notification"
  | "alphabet_event"
  | "idempotency_key"
  | "dedupe_key"
  | "system";

export type SystemTimelineRelationType =
  | "caused_by"
  | "produced"
  | "reviewed_by"
  | "compensated_by"
  | "reversed_by"
  | "audited_by"
  | "notified_by"
  | "belongs_to"
  | "locks"
  | "derives_from"
  | "references";

export type SystemTimelineEntryType =
  | "event"
  | "ledger"
  | "execution"
  | "policy"
  | "pipeline"
  | "saga"
  | "external_transfer"
  | "provider_reconciliation"
  | "compensation"
  | "admin_review"
  | "audit"
  | "notification"
  | "idempotency"
  | "dedupe"
  | "system";

export type SystemTimelineSeverity =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "critical";

export type SystemTimelineVisibility =
  | "public_safe"
  | "admin_safe"
  | "service_only";

export type SystemTimelineAnomalyType =
  | "missing_link"
  | "orphan_object"
  | "inconsistent_state"
  | "ledger_without_execution"
  | "reversal_without_original"
  | "transfer_success_without_debit"
  | "compensation_without_reversal"
  | "provider_failure_without_compensation_or_review"
  | "provider_unknown_without_review"
  | "duplicate_mutation_risk"
  | "unreviewed_high_risk_state";

export interface SystemTimelineRoot {
  objectType: SystemTimelineObjectType;
  objectId: string;
}

export interface SystemObjectNode {
  nodeId: string;
  objectType: SystemTimelineObjectType;
  objectId: string;
  label: string;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  visibility: SystemTimelineVisibility;
  payload: Json;
}

export interface SystemObjectEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: SystemTimelineRelationType;
  label: string;
  confidence: number;
  metadata: Json;
}

export interface SystemTimelineEntry {
  entryId: string;
  entryType: SystemTimelineEntryType;
  objectType: SystemTimelineObjectType;
  objectId: string;

  title: string;
  summary?: string | null;
  status?: string | null;

  severity: SystemTimelineSeverity;
  visibility: SystemTimelineVisibility;

  occurredAt: string;

  sourceObjectType?: SystemTimelineObjectType | null;
  sourceObjectId?: string | null;

  payload: Json;
  redactedPayload: Json;

  reasonCodes: string[];
  metadata: Json;
}

export interface SystemTimelineAnomaly {
  anomalyId: string;
  anomalyType: SystemTimelineAnomalyType;
  severity: SystemTimelineSeverity;
  title: string;
  summary: string;
  objectType: SystemTimelineObjectType;
  objectId: string;
  relatedObjectIds: string[];
  evidence: Json;
  redactedEvidence: Json;
  reasonCodes: string[];
}

export interface SystemTimelineScores {
  graphCompletenessScore: number;
  timelineIntegrityScore: number;
  auditRiskScore: number;
}

export interface SystemTimelineInput {
  root: SystemTimelineRoot;
  includeServiceOnly: boolean;
  includeRawPayloads: boolean;
  maxDepth: number;
  maxEntries: number;
  now: string;
}

export interface SystemTimelineResult {
  root: SystemTimelineRoot;

  nodes: SystemObjectNode[];
  edges: SystemObjectEdge[];
  entries: SystemTimelineEntry[];
  anomalies: SystemTimelineAnomaly[];

  scores: SystemTimelineScores;

  missingObjectIds: string[];
  orphanObjectIds: string[];

  generatedAt: string;
  metadata: Json;
}
