/** Stage 10 — immutable render manifest + hardened export bridge. */

import type { MediaAssetRecord } from './studioMediaTypes';
import type { RenderJob, RenderManifest } from './studioRenderTypes';

function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return `h${(h >>> 0).toString(16)}`;
}

export function hashTimelineSnapshot(snapshot: Record<string, unknown>): string {
  return simpleHash(JSON.stringify(snapshot));
}

export function hashMagicRevealSnapshot(snapshot: Record<string, unknown>): string {
  return simpleHash(JSON.stringify(snapshot));
}

export interface BuildRenderManifestInput {
  renderJob: RenderJob;
  outputAsset: MediaAssetRecord;
  thumbnailAsset?: MediaAssetRecord;
}

export function buildRenderManifest(input: BuildRenderManifestInput): RenderManifest {
  const { renderJob, outputAsset, thumbnailAsset } = input;
  const now = new Date().toISOString();
  return {
    id: `rm_${renderJob.id}_${Date.now()}`,
    renderJobId: renderJob.id,
    projectId: renderJob.projectId,
    outputAssetId: outputAsset.id,
    outputUrl: outputAsset.publicUrl ?? outputAsset.signedUrl,
    storageBucket: outputAsset.storageBucket ?? 'studio-renders',
    storagePath: outputAsset.storagePath ?? `renders/${renderJob.id}/output.${renderJob.renderSettings.outputExtension}`,
    thumbnailAssetId: thumbnailAsset?.id,
    durationMs: outputAsset.durationMs ?? 0,
    width: outputAsset.width ?? renderJob.renderSettings.width,
    height: outputAsset.height ?? renderJob.renderSettings.height,
    fps: renderJob.renderSettings.fps,
    fileSizeBytes: outputAsset.fileSizeBytes,
    checksum: outputAsset.checksum,
    quality: renderJob.quality,
    target: renderJob.target,
    aspectRatio: renderJob.aspectRatio,
    includesWatermark: renderJob.renderSettings.includeWatermark,
    includesCaptions: renderJob.renderSettings.includeBurnedCaptions,
    includesMagicMaskMap: renderJob.renderSettings.includeMagicMasks,
    mediaHash: simpleHash(outputAsset.id + outputAsset.checksum),
    timelineHash: hashTimelineSnapshot(renderJob.timelineSnapshot),
    createdAt: now,
  };
}

/** Published post packages should reference render manifest snapshots, not mutable draft assets. */
export interface ExportManifestV2 {
  version: 2;
  renderManifestId: string;
  renderManifestSnapshot: RenderManifest;
  /** Immutable after package build — render manifests are immutable after package build. */
  sealedAt: string;
}

export function buildExportManifestFromRenderManifest(manifest: RenderManifest): ExportManifestV2 {
  return {
    version: 2,
    renderManifestId: manifest.id,
    renderManifestSnapshot: { ...manifest },
    sealedAt: new Date().toISOString(),
  };
}
