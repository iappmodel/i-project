/**
 * Stage 11 — version snapshots, compare, restore (local mock).
 *
 * Rules:
 * 1. Published package snapshots are immutable (caller must not mutate stored version rows).
 * 2. Draft versions can be restored.
 * 3. Restoring creates a NEW version; history is append-only.
 * 4. Versions with active paid unlocks cannot silently replace published runtime (enforced in store).
 * 5. New publish version required if media/Magic changes after publish (contentFingerprint).
 */

import type { StudioPersistedSlice } from '../studioDomainTypes';
import type { StudioProjectVersion, StudioProjectSnapshot, StudioChangeLogEntry } from './studioCollabTypes';
import type { StudioClip } from '../studioDomainTypes';
import type { StudioMagicReveal } from '../media/studioMagicMaskArtifacts';
import type { MediaAssetRecord } from '../media/studioMediaTypes';

export interface CreateVersionInput {
  projectId: string;
  label: string;
  description?: string;
  actorUserId: string;
  actorName: string;
  snapshot: StudioProjectSnapshot;
  changeSummary: string;
  publishCandidate: boolean;
  existingVersionCount: number;
}

export interface VersionCompareResult {
  addedAssets: string[];
  removedAssets: string[];
  changedClips: string[];
  changedMagicReveals: string[];
  changedCampaign: boolean;
  changedPublishSettings: boolean;
  changedDisclosures: boolean;
  summary: string;
}

export function createProjectSnapshot(slice: StudioPersistedSlice & {
  renderManifestId?: string;
  safetyReportId?: string;
  rightsReportId?: string;
}): StudioProjectSnapshot {
  return {
    project: { ...slice.project },
    timeline: JSON.parse(JSON.stringify(slice.timeline)) as StudioPersistedSlice['timeline'],
    assets: slice.assets.map((a) => ({ ...a })),
    magicReveals: slice.magicReveals.map((m) => ({ ...m })),
    campaign: { ...slice.campaign },
    publishSettings: { ...slice.publishSettings },
    disclosures: { ...slice.disclosures },
    renderManifestId: slice.renderManifestId,
    safetyReportId: slice.safetyReportId,
    rightsReportId: slice.rightsReportId,
  };
}

export function createVersion(input: CreateVersionInput): StudioProjectVersion {
  const nextNum = input.existingVersionCount + 1;
  return {
    id: `ver_${input.projectId}_${nextNum}_${Date.now()}`,
    projectId: input.projectId,
    versionNumber: nextNum,
    label: input.label,
    description: input.description,
    snapshot: createProjectSnapshot(input.snapshot),
    createdByUserId: input.actorUserId,
    createdByName: input.actorName,
    changeSummary: input.changeSummary,
    createdAt: new Date().toISOString(),
    locked: false,
    publishCandidate: input.publishCandidate,
  };
}

function clipSig(c: StudioClip): string {
  return `${c.id}:${c.startMs}:${c.endMs}:${c.assetId ?? ''}`;
}

function magicSig(m: StudioMagicReveal): string {
  return `${m.id}:${m.timelineStartMs}:${m.timelineEndMs}:${JSON.stringify(m.geometry)}`;
}

export function compareVersions(versionA: StudioProjectVersion, versionB: StudioProjectVersion): VersionCompareResult {
  const a = versionA.snapshot;
  const b = versionB.snapshot;
  const aAssetIds = new Set(a.assets.map((x) => x.id));
  const bAssetIds = new Set(b.assets.map((x) => x.id));
  const addedAssets = [...bAssetIds].filter((id) => !aAssetIds.has(id));
  const removedAssets = [...aAssetIds].filter((id) => !bAssetIds.has(id));

  const aClips = a.timeline.tracks.flatMap((t) => t.clips);
  const bClips = b.timeline.tracks.flatMap((t) => t.clips);
  const aMap = new Map(aClips.map((c) => [c.id, clipSig(c)]));
  const changedClips: string[] = [];
  for (const c of bClips) {
    const prev = aMap.get(c.id);
    if (prev === undefined || prev !== clipSig(c)) changedClips.push(c.id);
  }
  for (const id of aMap.keys()) {
    if (!bClips.some((c) => c.id === id)) changedClips.push(id);
  }

  const aMag = new Map(a.magicReveals.map((m) => [m.id, magicSig(m)]));
  const changedMagic: string[] = [];
  for (const m of b.magicReveals) {
    const prev = aMag.get(m.id);
    if (prev === undefined || prev !== magicSig(m)) changedMagic.push(m.id);
  }
  for (const id of aMag.keys()) {
    if (!b.magicReveals.some((m) => m.id === id)) changedMagic.push(id);
  }

  const changedCampaign = JSON.stringify(a.campaign) !== JSON.stringify(b.campaign);
  const changedPublishSettings = JSON.stringify(a.publishSettings) !== JSON.stringify(b.publishSettings);
  const changedDisclosures = JSON.stringify(a.disclosures) !== JSON.stringify(b.disclosures);

  const summaryParts: string[] = [];
  if (addedAssets.length) summaryParts.push(`${addedAssets.length} assets added`);
  if (removedAssets.length) summaryParts.push(`${removedAssets.length} assets removed`);
  if (changedClips.length) summaryParts.push(`${changedClips.length} clip changes`);
  if (changedMagic.length) summaryParts.push(`${changedMagic.length} Magic changes`);
  if (changedCampaign) summaryParts.push('campaign changed');
  if (changedPublishSettings) summaryParts.push('publish settings changed');
  if (changedDisclosures) summaryParts.push('disclosures changed');
  const summary = summaryParts.length ? summaryParts.join('; ') : 'No differences detected.';

  return {
    addedAssets,
    removedAssets,
    changedClips: [...new Set(changedClips)],
    changedMagicReveals: [...new Set(changedMagic)],
    changedCampaign,
    changedPublishSettings,
    changedDisclosures,
    summary,
  };
}

export interface RestoreVersionResult {
  /** Patch applied on top of current state (draft), plus new version metadata suggestion. */
  restoredSlice: StudioPersistedSlice;
  changeLog: Omit<StudioChangeLogEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: string };
}

/**
 * Restoring merges snapshot into working copy; store must append a NEW history version after apply.
 */
export function restoreVersion(version: StudioProjectVersion, actorUserId: string, actorName: string): RestoreVersionResult {
  const s = version.snapshot;
  const restoredSlice: StudioPersistedSlice = {
    project: { ...s.project, contentFingerprint: computeContentFingerprint(s) },
    timeline: JSON.parse(JSON.stringify(s.timeline)),
    assets: s.assets.map((a) => ({ ...a })),
    magicReveals: s.magicReveals.map((m) => ({ ...m })),
    campaign: { ...s.campaign },
    publishSettings: { ...s.publishSettings },
    disclosures: { ...s.disclosures },
  };
  return {
    restoredSlice,
    changeLog: {
      projectId: version.projectId,
      versionId: version.id,
      actorUserId,
      actorName,
      changeType: 'version_restored',
      targetType: 'version',
      targetId: version.id,
      summary: `Restored working draft from ${version.label} (v${version.versionNumber})`,
    },
  };
}

export function computeContentFingerprint(slice: StudioPersistedSlice): string {
  const payload = {
    assets: slice.assets.map((a) => a.id),
    clips: slice.timeline.tracks.flatMap((t) => t.clips.map(clipSig)),
    magic: slice.magicReveals.map(magicSig),
    campaign: slice.campaign,
  };
  return `fp_${hashString(JSON.stringify(payload))}`;
}

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export function lockVersion(versionId: string, versions: StudioProjectVersion[]): StudioProjectVersion[] {
  return versions.map((v) => (v.id === versionId ? { ...v, locked: true } : v));
}

export function markPublishCandidate(versionId: string, versions: StudioProjectVersion[]): StudioProjectVersion[] {
  return versions.map((v) => ({ ...v, publishCandidate: v.id === versionId }));
}

export function assertVersionMutable(version: StudioProjectVersion): string | null {
  if (version.locked) return 'Version is locked (immutable row).';
  return null;
}

/** Rule 4 hint: if published package exists and unlock simulation active, restoring cannot replace runtime. */
export function canSilentReplacePublishedRuntime(hasPaidUnlockActive: boolean, hasPublishedPackage: boolean): boolean {
  if (!hasPublishedPackage) return true;
  if (hasPaidUnlockActive) return false;
  return true;
}
