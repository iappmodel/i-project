import type {
  AttributionRecipient,
  ContentRightsRecord,
  ContentRightsResult,
  ContentRightsSignalInput,
  ContentRightsStatus,
  ContentSafetyStatus,
  ContentType,
  ExternalSourceReference,
  LicenseEvidence,
  LicenseStatus,
  RightsClaimType
} from "../../types/alphabet/content-rights.types";
import {
  evaluateContentRights,
  normalizeAttributionRecipients
} from "./content-rights-engine";

type ContentRightsStoreState = {
  records: Map<string, ContentRightsRecord>;
  results: Map<string, ContentRightsResult>;
};

const store: ContentRightsStoreState = {
  records: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapStatus(status: ContentRightsStatus): ContentRightsRecord["status"] {
  return status;
}

export function createContentRightsRecord(params: {
  contentId?: string;
  creatorId: string;
  userId: string;
  contentType: ContentType;
  rightsClaimType: RightsClaimType;
  licenseStatus?: LicenseStatus;
  safetyStatus?: ContentSafetyStatus;
  originalityScore?: number;
  attributionConfidenceScore?: number;
  transformationScore?: number;
  similarityScore?: number;
  knownSourceOverlapScore?: number;
  aiAssisted?: boolean;
  aiAssistanceDisclosed?: boolean;
  collaborators: AttributionRecipient[];
  externalSources?: ExternalSourceReference[];
  licenseEvidence?: LicenseEvidence[];
}): ContentRightsRecord {
  const now = nowIso();

  const record: ContentRightsRecord = {
    contentRightsId: createId("content_rights"),
    contentId: params.contentId ?? createId("content"),
    creatorId: params.creatorId,
    userId: params.userId,
    contentType: params.contentType,
    rightsClaimType: params.rightsClaimType,
    licenseStatus: params.licenseStatus ?? "none",
    safetyStatus: params.safetyStatus ?? "clear",
    originalityScore: params.originalityScore ?? 0,
    attributionConfidenceScore: params.attributionConfidenceScore ?? 0,
    transformationScore: params.transformationScore ?? 0,
    similarityScore: params.similarityScore ?? 0,
    knownSourceOverlapScore: params.knownSourceOverlapScore ?? 0,
    aiAssisted: params.aiAssisted ?? false,
    aiAssistanceDisclosed: params.aiAssistanceDisclosed ?? false,
    collaborators: normalizeAttributionRecipients(params.collaborators),
    externalSources: params.externalSources ?? [],
    licenseEvidence: params.licenseEvidence ?? [],
    status: "rights_created",
    createdAt: now,
    updatedAt: now
  };

  store.records.set(record.contentRightsId, record);

  return record;
}

export function getContentRightsRecord(
  contentRightsId: string
): ContentRightsRecord | null {
  return store.records.get(contentRightsId) ?? null;
}

export function listContentRightsRecordsForCreator(
  creatorId: string
): ContentRightsRecord[] {
  return Array.from(store.records.values()).filter(
    (record) => record.creatorId === creatorId
  );
}

export function evaluateStoredContentRights(
  input: Omit<
    ContentRightsSignalInput,
    | "contentRightsId"
    | "contentId"
    | "creatorId"
    | "userId"
    | "contentType"
    | "rightsClaimType"
    | "licenseStatus"
    | "safetyStatus"
    | "originalityScore"
    | "attributionConfidenceScore"
    | "transformationScore"
    | "similarityScore"
    | "knownSourceOverlapScore"
    | "collaborators"
    | "externalSources"
    | "licenseEvidence"
    | "aiAssisted"
    | "aiAssistanceDisclosed"
  > & {
    contentRightsId: string;
  }
): ContentRightsResult {
  const record = getContentRightsRecord(input.contentRightsId);

  if (!record) {
    throw new Error("Content rights record not found.");
  }

  const result = evaluateContentRights({
    ...input,
    contentRightsId: record.contentRightsId,
    contentId: record.contentId,
    creatorId: record.creatorId,
    userId: record.userId,
    contentType: record.contentType,
    rightsClaimType: record.rightsClaimType,
    licenseStatus: record.licenseStatus,
    safetyStatus: record.safetyStatus,
    originalityScore: record.originalityScore,
    attributionConfidenceScore: record.attributionConfidenceScore,
    transformationScore: record.transformationScore,
    similarityScore: record.similarityScore,
    knownSourceOverlapScore: record.knownSourceOverlapScore,
    collaborators: record.collaborators,
    externalSources: record.externalSources,
    licenseEvidence: record.licenseEvidence,
    aiAssisted: record.aiAssisted,
    aiAssistanceDisclosed: record.aiAssistanceDisclosed,
    metadata: {
      ...input.metadata
    }
  });

  const next: ContentRightsRecord = {
    ...record,
    status: mapStatus(result.status),
    updatedAt: nowIso()
  };

  store.records.set(next.contentRightsId, next);
  store.results.set(result.contentRightsId, result);

  return result;
}

export function updateContentRightsEvidence(params: {
  contentRightsId: string;
  collaborators?: AttributionRecipient[];
  externalSources?: ExternalSourceReference[];
  licenseEvidence?: LicenseEvidence[];
  licenseStatus?: LicenseStatus;
}): ContentRightsRecord {
  const record = getContentRightsRecord(params.contentRightsId);

  if (!record) {
    throw new Error("Content rights record not found.");
  }

  const next: ContentRightsRecord = {
    ...record,
    collaborators: params.collaborators
      ? normalizeAttributionRecipients(params.collaborators)
      : record.collaborators,
    externalSources: params.externalSources ?? record.externalSources,
    licenseEvidence: params.licenseEvidence ?? record.licenseEvidence,
    licenseStatus: params.licenseStatus ?? record.licenseStatus,
    updatedAt: nowIso()
  };

  store.records.set(next.contentRightsId, next);

  return next;
}

export function getContentRightsResult(
  contentRightsId: string
): ContentRightsResult | null {
  return store.results.get(contentRightsId) ?? null;
}

export function resetContentRightsStoreForTests(): void {
  store.records.clear();
  store.results.clear();
}
