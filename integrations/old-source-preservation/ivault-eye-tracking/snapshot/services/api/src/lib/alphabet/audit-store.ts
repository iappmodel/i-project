import type {
  AuditCategory,
  AuditRecord,
  AuditSeverity,
  AuditSignalInput,
  AuditSubjectType,
  ComplianceStatus,
  EvidenceItem,
  EvidencePacket,
  RetentionClass
} from "../../types/alphabet/audit.types";
import {
  calculateAuditHash,
  derivePacketPrivacy,
  evaluateAuditRecord,
  sha256Hex,
  canonicalize
} from "./audit-engine";
import { AUDIT_RULES } from "../../data/alphabet/audit-rules";

type AuditStoreState = {
  packets: Map<string, EvidencePacket>;
  records: Map<string, AuditRecord>;
  results: Map<string, ReturnType<typeof evaluateAuditRecord>>;
  lastHash: string | null;
  sequence: number;
};

const store: AuditStoreState = {
  packets: new Map(),
  records: new Map(),
  results: new Map(),
  lastHash: null,
  sequence: 0
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function getRule(category: AuditCategory) {
  return AUDIT_RULES.find((rule) => rule.active && rule.auditCategory === category);
}

function evidenceCompleteness(items: EvidenceItem[]): number {
  if (items.length === 0) return 0;

  const avg =
    items.reduce((sum, item) => {
      return (
        sum +
        (item.title ? 0.2 : 0) +
        (item.summary ? 0.2 : 0) +
        (Object.keys(item.payload).length > 0 ? 0.25 : 0) +
        (item.hash ? 0.25 : 0) +
        (item.evidenceType ? 0.1 : 0)
      );
    }, 0) / items.length;

  return Number(avg.toFixed(4));
}

export async function createEvidenceItem(params: {
  evidenceType: EvidenceItem["evidenceType"];
  sourceObjectId?: string | null;
  sourceEventId?: string | null;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  privacySensitivity?: EvidenceItem["privacySensitivity"];
  redactionRequired?: boolean;
}): Promise<EvidenceItem> {
  const base = {
    evidenceType: params.evidenceType,
    sourceObjectId: params.sourceObjectId ?? null,
    sourceEventId: params.sourceEventId ?? null,
    title: params.title,
    summary: params.summary,
    payload: params.payload
  };

  return {
    evidenceItemId: createId("evidence_item"),
    ...base,
    privacySensitivity: params.privacySensitivity ?? "medium",
    redactionRequired: params.redactionRequired ?? false,
    hash: await sha256Hex(canonicalize(base)),
    createdAt: nowIso()
  };
}

export function createEvidencePacket(params: {
  subjectType: AuditSubjectType;
  subjectId: string;
  actorUserId?: string | null;
  subjectOwnerUserId?: string | null;
  evidenceItems: EvidenceItem[];
}): EvidencePacket {
  const now = nowIso();
  const privacy = derivePacketPrivacy(params.evidenceItems);

  const packet: EvidencePacket = {
    evidencePacketId: createId("evidence_packet"),
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    actorUserId: params.actorUserId ?? null,
    subjectOwnerUserId: params.subjectOwnerUserId ?? null,
    evidenceItems: params.evidenceItems,
    completenessScore: evidenceCompleteness(params.evidenceItems),
    privacySensitivity: privacy.privacySensitivity,
    redactionRequired: privacy.redactionRequired,
    createdAt: now,
    updatedAt: now
  };

  store.packets.set(packet.evidencePacketId, packet);

  return packet;
}

export function getEvidencePacket(evidencePacketId: string): EvidencePacket | null {
  return store.packets.get(evidencePacketId) ?? null;
}

export async function createAuditRecord(params: {
  subjectType: AuditSubjectType;
  subjectId: string;
  auditCategory: AuditCategory;
  severity: AuditSeverity;
  complianceStatus?: ComplianceStatus;
  retentionClass?: RetentionClass;
  actorUserId?: string | null;
  subjectOwnerUserId?: string | null;
  targetObjectId: string;
  evidencePacketId?: string | null;
  sourceEventIds?: string[];
  exportSafe?: boolean;
  legalHold?: boolean;
  payload?: Record<string, unknown>;
}): Promise<AuditRecord> {
  const rule = getRule(params.auditCategory);
  const now = nowIso();

  const packet = params.evidencePacketId
    ? getEvidencePacket(params.evidencePacketId)
    : null;

  const privacySensitivity = packet?.privacySensitivity ?? "medium";
  const redactionRequired = packet?.redactionRequired ?? false;

  const chainSequence = store.sequence + 1;
  const previousHash = store.lastHash;

  const immutableHash = await calculateAuditHash({
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    targetObjectId: params.targetObjectId,
    auditCategory: params.auditCategory,
    evidencePacketId: params.evidencePacketId ?? null,
    sourceEventIds: params.sourceEventIds ?? [],
    previousHash,
    chainSequence,
    payload: params.payload ?? {}
  });

  const retentionClass =
    params.legalHold
      ? "legal_hold"
      : params.retentionClass ?? rule?.defaultRetentionClass ?? "standard";

  const record: AuditRecord = {
    auditRecordId: createId("audit_record"),
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    auditCategory: params.auditCategory,
    severity: params.severity,
    complianceStatus: params.complianceStatus ?? "pending",
    retentionClass,
    actorUserId: params.actorUserId ?? null,
    subjectOwnerUserId: params.subjectOwnerUserId ?? null,
    targetObjectId: params.targetObjectId,
    evidencePacketId: params.evidencePacketId ?? null,
    sourceEventIds: params.sourceEventIds ?? [],
    immutableHash,
    previousHash,
    chainSequence,
    exportSafe: params.exportSafe ?? privacySensitivity !== "restricted",
    privacySensitivity,
    redactionRequired,
    legalHold: params.legalHold ?? retentionClass === "legal_hold",
    deletionEligibleAt:
      retentionClass === "legal_hold" || retentionClass === "permanent"
        ? null
        : addDays(rule?.minimumRetentionDays ?? 730),
    status: "audit_created",
    createdAt: now,
    updatedAt: now
  };

  store.records.set(record.auditRecordId, record);
  store.lastHash = immutableHash;
  store.sequence = chainSequence;

  return record;
}

export function getAuditRecord(auditRecordId: string): AuditRecord | null {
  return store.records.get(auditRecordId) ?? null;
}

export function listAuditRecords(params?: {
  subjectType?: AuditSubjectType;
  auditCategory?: AuditCategory;
  subjectOwnerUserId?: string;
}): AuditRecord[] {
  return Array.from(store.records.values()).filter((record) => {
    if (params?.subjectType && record.subjectType !== params.subjectType) return false;
    if (params?.auditCategory && record.auditCategory !== params.auditCategory) return false;
    if (
      params?.subjectOwnerUserId &&
      record.subjectOwnerUserId !== params.subjectOwnerUserId
    ) {
      return false;
    }
    return true;
  });
}

export async function evaluateStoredAuditRecord(
  input: Omit<
    AuditSignalInput,
    | "auditRecordId"
    | "subjectType"
    | "subjectId"
    | "auditCategory"
    | "severity"
    | "complianceStatus"
    | "retentionClass"
    | "actorUserId"
    | "subjectOwnerUserId"
    | "targetObjectId"
    | "evidencePacketId"
    | "evidenceItems"
    | "sourceEventIds"
    | "immutableHash"
    | "previousHash"
    | "chainSequence"
    | "exportSafe"
    | "privacySensitivity"
    | "redactionRequired"
    | "legalHold"
    | "deletionEligibleAt"
    | "now"
  > & {
    auditRecordId: string;
    now?: string;
  }
) {
  const record = getAuditRecord(input.auditRecordId);

  if (!record) {
    throw new Error("Audit record not found.");
  }

  const packet = record.evidencePacketId
    ? getEvidencePacket(record.evidencePacketId)
    : null;

  const evidenceItems = packet?.evidenceItems ?? [];

  const result = evaluateAuditRecord({
    ...input,
    auditRecordId: record.auditRecordId,
    subjectType: record.subjectType,
    subjectId: record.subjectId,
    auditCategory: record.auditCategory,
    severity: record.severity,
    complianceStatus: record.complianceStatus,
    retentionClass: record.retentionClass,
    actorUserId: record.actorUserId,
    subjectOwnerUserId: record.subjectOwnerUserId,
    targetObjectId: record.targetObjectId,
    evidencePacketId: record.evidencePacketId,
    evidenceItems,
    sourceEventIds: record.sourceEventIds,
    immutableHash: record.immutableHash,
    previousHash: record.previousHash,
    chainSequence: record.chainSequence,
    exportSafe: record.exportSafe,
    privacySensitivity: record.privacySensitivity,
    redactionRequired: record.redactionRequired,
    legalHold: record.legalHold,
    deletionEligibleAt: record.deletionEligibleAt,
    now: input.now ?? nowIso(),
    evidenceCompletenessScore: packet?.completenessScore ?? 0,
    metadata: {
      ...input.metadata
    }
  });

  const next: AuditRecord = {
    ...record,
    status: result.status,
    complianceStatus:
      result.auditComplete ? "compliant" : result.escalated ? "escalated" : record.complianceStatus,
    updatedAt: nowIso()
  };

  store.records.set(next.auditRecordId, next);
  store.results.set(result.auditRecordId, result);

  return result;
}

export function getAuditEvaluationResult(auditRecordId: string) {
  return store.results.get(auditRecordId) ?? null;
}

export function resetAuditStoreForTests(): void {
  store.packets.clear();
  store.records.clear();
  store.results.clear();
  store.lastHash = null;
  store.sequence = 0;
}
