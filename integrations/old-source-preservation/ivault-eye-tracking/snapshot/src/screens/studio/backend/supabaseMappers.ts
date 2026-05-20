/**
 * Row ↔ Stage 8 persistent shapes. DB uses snake_case + jsonb; never trust JSON without basic guards.
 */

import type {
  AssetId,
  CampaignId,
  ClipId,
  MagicRevealId,
  ProjectId,
  TrackId,
  UserId,
} from "./studioApiTypes";
import type {
  PersistentCampaign,
  PersistentMagicReveal,
  PersistentPostPackage,
  PersistentStudioAsset,
  PersistentStudioClip,
  PersistentStudioProject,
  PersistentStudioTrack,
} from "./studioPersistenceTypes";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function parseJsonField(v: unknown): Record<string, unknown> {
  if (typeof v === "string") {
    try {
      return asRecord(JSON.parse(v));
    } catch {
      return {};
    }
  }
  return asRecord(v);
}

export function normalizeIso(s: unknown, fallback: string): string {
  if (typeof s === "string" && s.length > 0) return s;
  return fallback;
}

export function projectToRow(p: PersistentStudioProject): Record<string, unknown> {
  return {
    id: p.id,
    owner_user_id: p.ownerUserId,
    title: p.title,
    status: p.status,
    version: p.version,
    draft_payload: p.draftPayload,
    updated_at: p.updatedAt,
    deleted_at: p.deletedAt ?? null,
  };
}

export function rowToProject(row: Record<string, unknown>): PersistentStudioProject {
  const draft = parseJsonField(row.draft_payload);
  return {
    id: String(row.id ?? "") as ProjectId,
    ownerUserId: String(row.owner_user_id ?? "") as UserId,
    title: String(row.title ?? ""),
    status: String(row.status ?? "draft"),
    draftPayload: Object.keys(draft).length ? draft : parseJsonField(row.draft_payload),
    version: typeof row.version === "number" ? row.version : Number(row.version) || 1,
    createdAt: normalizeIso(row.created_at, new Date().toISOString()),
    updatedAt: normalizeIso(row.updated_at, new Date().toISOString()),
    deletedAt: row.deleted_at ? String(row.deleted_at) : undefined,
  };
}

export function assetToRow(a: PersistentStudioAsset): Record<string, unknown> {
  const p = a.payload;
  const name = typeof p.name === "string" ? p.name : "asset";
  const mime = typeof p.mimeType === "string" ? p.mimeType : "application/octet-stream";
  const size = typeof p.sizeBytes === "number" ? p.sizeBytes : 0;
  return {
    id: a.id,
    project_id: a.projectId,
    owner_user_id: a.ownerUserId,
    status: a.status,
    name,
    mime_type: mime,
    size_bytes: size,
    payload: a.payload,
    updated_at: a.updatedAt,
    deleted_at: a.deletedAt ?? null,
  };
}

export function rowToAsset(row: Record<string, unknown>): PersistentStudioAsset {
  const payload = parseJsonField(row.payload);
  return {
    id: String(row.id ?? "") as AssetId,
    projectId: String(row.project_id ?? "") as ProjectId,
    ownerUserId: String(row.owner_user_id ?? "") as UserId,
    uri: typeof payload.uri === "string" ? payload.uri : undefined,
    status: String(row.status ?? "draft"),
    payload: { ...payload, name: row.name, mimeType: row.mime_type, sizeBytes: row.size_bytes },
    version: typeof row.version === "number" ? row.version : 1,
    createdAt: normalizeIso(row.created_at, new Date().toISOString()),
    updatedAt: normalizeIso(row.updated_at, new Date().toISOString()),
    deletedAt: row.deleted_at ? String(row.deleted_at) : undefined,
  };
}

export function trackToRow(t: PersistentStudioTrack): Record<string, unknown> {
  return {
    id: t.id,
    project_id: t.projectId,
    version: t.version,
    payload: t.payload,
    updated_at: t.updatedAt,
  };
}

export function rowToTrack(row: Record<string, unknown>): PersistentStudioTrack {
  return {
    id: String(row.id ?? "") as TrackId,
    projectId: String(row.project_id ?? "") as ProjectId,
    version: typeof row.version === "number" ? row.version : Number(row.version) || 1,
    payload: parseJsonField(row.payload),
    createdAt: normalizeIso(row.created_at, new Date().toISOString()),
    updatedAt: normalizeIso(row.updated_at, new Date().toISOString()),
  };
}

export function clipToRow(c: PersistentStudioClip): Record<string, unknown> {
  return {
    id: c.id,
    project_id: c.projectId,
    track_id: c.trackId,
    version: c.version,
    payload: c.payload,
    updated_at: c.updatedAt,
  };
}

export function rowToClip(row: Record<string, unknown>): PersistentStudioClip {
  return {
    id: String(row.id ?? "") as ClipId,
    projectId: String(row.project_id ?? "") as ProjectId,
    trackId: String(row.track_id ?? "") as TrackId,
    version: typeof row.version === "number" ? row.version : Number(row.version) || 1,
    payload: parseJsonField(row.payload),
    createdAt: normalizeIso(row.created_at, new Date().toISOString()),
    updatedAt: normalizeIso(row.updated_at, new Date().toISOString()),
  };
}

export function magicRevealToRow(m: PersistentMagicReveal): Record<string, unknown> {
  const p = m.payload;
  const g = asRecord(p.geometry);
  const tr = asRecord(p.tracking);
  const hr = asRecord((p as { hiddenRender?: unknown; hidden_render?: unknown }).hiddenRender ?? (p as { hidden_render?: unknown }).hidden_render);
  return {
    id: m.id,
    project_id: m.projectId,
    owner_user_id: m.ownerUserId,
    status: m.status,
    version: m.version,
    payload: m.payload,
    geometry: Object.keys(g).length ? g : {},
    tracking: Object.keys(tr).length ? tr : {},
    hidden_render: Object.keys(hr).length ? hr : {},
    pricing: p.pricing ?? null,
    reward: p.reward ?? null,
    eligibility: p.eligibility ?? {},
    unlock_policy: p.unlockPolicy ?? {},
    settlement: p.settlement ?? {},
    safety: p.safety ?? {},
    target_type: p.targetType ?? null,
    reveal_type: p.revealType ?? null,
    timeline_start_ms: typeof p.timelineStartMs === "number" ? p.timelineStartMs : null,
    timeline_end_ms: typeof p.timelineEndMs === "number" ? p.timelineEndMs : null,
    updated_at: m.updatedAt,
    deleted_at: m.deletedAt ?? null,
  };
}

export function rowToMagicReveal(row: Record<string, unknown>): PersistentMagicReveal {
  const base = parseJsonField(row.payload);
  const merged: Record<string, unknown> = {
    ...base,
    id: row.id,
    projectId: row.project_id,
    ownerUserId: row.owner_user_id,
    geometry: row.geometry ?? base.geometry,
    tracking: row.tracking ?? base.tracking,
    hiddenRender: row.hidden_render ?? base.hiddenRender,
    pricing: row.pricing ?? base.pricing,
    reward: row.reward ?? base.reward,
    eligibility: row.eligibility ?? base.eligibility,
    unlockPolicy: row.unlock_policy ?? base.unlockPolicy,
    settlement: row.settlement ?? base.settlement,
    safety: row.safety ?? base.safety,
    targetType: row.target_type ?? base.targetType,
    revealType: row.reveal_type ?? base.revealType,
    timelineStartMs: row.timeline_start_ms ?? base.timelineStartMs,
    timelineEndMs: row.timeline_end_ms ?? base.timelineEndMs,
  };
  return {
    id: String(row.id ?? "") as MagicRevealId,
    projectId: String(row.project_id ?? "") as ProjectId,
    ownerUserId: String(row.owner_user_id ?? "") as UserId,
    status: String(row.status ?? "draft"),
    payload: merged,
    version: typeof row.version === "number" ? row.version : Number(row.version) || 1,
    createdAt: normalizeIso(row.created_at, new Date().toISOString()),
    updatedAt: normalizeIso(row.updated_at, new Date().toISOString()),
    deletedAt: row.deleted_at ? String(row.deleted_at) : undefined,
  };
}

export function campaignToRow(c: PersistentCampaign): Record<string, unknown> {
  return {
    id: c.id,
    owner_user_id: c.ownerUserId,
    status: c.status,
    title: null,
    payload: {
      projectId: c.projectId,
      monetization: c.monetization,
      monetizationMode: c.monetizationMode,
      version: c.version,
    },
    updated_at: c.updatedAt,
  };
}

export function rowToCampaign(row: Record<string, unknown>): PersistentCampaign {
  const payload = parseJsonField(row.payload);
  return {
    id: String(row.id ?? "") as CampaignId,
    projectId: String(payload.projectId ?? "") as ProjectId,
    ownerUserId: String(row.owner_user_id ?? "") as UserId,
    status: String(row.status ?? "draft"),
    monetization: asRecord(payload.monetization),
    monetizationMode: String(payload.monetizationMode ?? "off"),
    version: typeof payload.version === "number" ? payload.version : Number(payload.version) || 1,
    createdAt: normalizeIso(row.created_at, new Date().toISOString()),
    updatedAt: normalizeIso(row.updated_at, new Date().toISOString()),
  };
}

export function postPackageToRow(
  pkg: Record<string, unknown>,
  projectId: string,
  exportJobId: string,
  ownerUserId: string,
  id: string,
  packageHash: string
): Record<string, unknown> {
  const snapshot = { ...pkg, exportJobId };
  return {
    id,
    project_id: projectId,
    owner_user_id: ownerUserId,
    status: "draft",
    package_hash: packageHash,
    snapshot,
    updated_at: new Date().toISOString(),
  };
}

export function rowToPostPackage(row: Record<string, unknown>): PersistentPostPackage {
  const snap = parseJsonField(row.snapshot ?? row.payload);
  return {
    id: String(row.id ?? ""),
    projectId: String(row.project_id ?? "") as ProjectId,
    exportJobId: typeof snap.exportJobId === "string" ? snap.exportJobId : "",
    ownerUserId: String(row.owner_user_id ?? "") as UserId,
    packagePayload: snap,
    contentHash: row.package_hash ? String(row.package_hash) : undefined,
    sealedAt: row.sealed_at ? String(row.sealed_at) : undefined,
    createdAt: normalizeIso(row.created_at, new Date().toISOString()),
    updatedAt: normalizeIso(row.updated_at, new Date().toISOString()),
  };
}
