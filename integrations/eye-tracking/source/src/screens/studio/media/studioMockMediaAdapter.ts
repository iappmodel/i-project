/** Stage 10 — in-memory StudioMediaAdapter for local simulation (no ffmpeg, no real storage). */

import type { StudioMediaAdapter } from './studioMediaAdapter';
import {
  okResponse,
  errResponse,
  type BuildMediaManifestRequest,
  type CancelRenderJobRequest,
  type ConfirmUploadRequest,
  type CreateCaptionArtifactRequest,
  type CreateMagicMaskArtifactRequest,
  type CreateRenderJobRequest,
  type CreateThumbnailRequest,
  type CreateUploadIntentRequest,
} from './studioMediaContracts';
import type {
  MediaAssetRecord,
  MediaDerivative,
  MediaDerivativeType,
  UploadIntent,
} from './studioMediaTypes';
import type { RenderJob } from './studioRenderTypes';
import { buildProjectAssetPath, getExtensionFromMime } from './studioMediaStoragePaths';
import { validateMediaFile } from './studioMediaValidation';
import { buildRenderManifest } from './studioRenderManifest';
import { createThumbnailPlaceholder } from './studioThumbnailEngine';
import { buildCaptionJson, buildMockVtt, type CaptionArtifact } from './studioCaptionArtifacts';
import type { MagicMaskArtifact } from './studioMagicMaskArtifacts';
import { createMaskArtifactFromMagicReveals, type StudioMagicReveal } from './studioMagicMaskArtifacts';

function nowIso() {
  return new Date().toISOString();
}

export class StudioMockMediaAdapter implements StudioMediaAdapter {
  private intents = new Map<string, UploadIntent>();
  private assets = new Map<string, MediaAssetRecord>();
  private derivatives = new Map<string, MediaDerivative>();
  private jobs = new Map<string, RenderJob>();
  private ownerUserId = 'mock_user';

  setOwnerUserId(id: string) {
    this.ownerUserId = id;
  }

  async createUploadIntent(request: CreateUploadIntentRequest) {
    const v = validateMediaFile({
      fileName: request.fileName,
      mimeType: request.mimeType,
      fileSizeBytes: request.fileSizeBytes,
    });
    if (!v.valid) {
      return errResponse('validation_error', v.errors.join('; '));
    }
    const assetId = `asset_${Date.now()}`;
    const targetPath = buildProjectAssetPath({
      ownerUserId: this.ownerUserId,
      projectId: request.projectId,
      assetId,
      fileName: request.fileName,
    });
    const intent: UploadIntent = {
      id: `ui_${Date.now()}`,
      projectId: request.projectId,
      ownerUserId: this.ownerUserId,
      fileName: request.fileName,
      mimeType: request.mimeType,
      fileSizeBytes: request.fileSizeBytes,
      targetBucket: 'studio-mock',
      targetPath,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      maxFileSizeBytes: 2 * 1024 * 1024 * 1024,
      allowedMimeTypes: [request.mimeType],
      status: 'created',
      createdAt: nowIso(),
    };
    this.intents.set(intent.id, intent);

    const assetDraft: MediaAssetRecord = {
      id: assetId,
      projectId: request.projectId,
      ownerUserId: this.ownerUserId,
      source: 'device_upload',
      type: v.mimeCategory,
      lifecycleStatus: 'upload_intent_created',
      visibility: 'private_draft',
      name: request.fileName,
      originalFileName: request.fileName,
      mimeType: request.mimeType,
      mimeCategory: v.mimeCategory,
      fileSizeBytes: request.fileSizeBytes,
      storageBucket: intent.targetBucket,
      storagePath: targetPath,
      metadata: { mock: true },
      processingStatus: 'not_required',
      derivatives: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.assets.set(assetId, assetDraft);
    return okResponse({ uploadIntent: intent, assetDraft });
  }

  async uploadLocalFile(intent: UploadIntent, file: File | Blob) {
    const size = file instanceof File ? file.size : intent.fileSizeBytes;
    return okResponse({ bytesUploaded: size });
  }

  async confirmUpload(request: ConfirmUploadRequest) {
    const intent = this.intents.get(request.uploadIntentId);
    const asset = this.assets.get(request.assetId);
    if (!intent || !asset) return errResponse('not_found', 'Intent or asset missing');
    intent.status = 'used';
    const updated: MediaAssetRecord = {
      ...asset,
      lifecycleStatus: 'uploaded',
      processingStatus: 'queued',
      checksum: request.checksum,
      updatedAt: nowIso(),
    };
    this.assets.set(asset.id, updated);
    return okResponse({ asset: updated });
  }

  async getAsset(assetId: string) {
    const a = this.assets.get(assetId);
    if (!a) return errResponse('not_found');
    return okResponse(a);
  }

  async listProjectAssets(projectId: string) {
    return okResponse([...this.assets.values()].filter((a) => a.projectId === projectId));
  }

  async deleteAsset(assetId: string) {
    const a = this.assets.get(assetId);
    if (!a) return errResponse('not_found');
    this.assets.set(assetId, { ...a, lifecycleStatus: 'deleted', updatedAt: nowIso() });
    return okResponse({ deleted: true });
  }

  async createDerivative(
    parentAssetId: string,
    derivativeType: MediaDerivativeType,
    metadata: Record<string, unknown>,
  ) {
    const parent = this.assets.get(parentAssetId);
    if (!parent) return errResponse('not_found');
    const d: MediaDerivative = {
      id: `der_${Date.now()}`,
      parentAssetId,
      projectId: parent.projectId,
      type: derivativeType,
      mimeType: 'application/octet-stream',
      metadata,
      status: 'ready',
      createdAt: nowIso(),
    };
    this.derivatives.set(d.id, d);
    parent.derivatives.push(d.id);
    this.assets.set(parent.id, { ...parent, updatedAt: nowIso() });
    return okResponse(d);
  }

  async createRenderJob(request: CreateRenderJobRequest) {
    const job: RenderJob = {
      id: `rj_${Date.now()}`,
      projectId: request.projectId,
      ownerUserId: this.ownerUserId,
      type: request.type,
      status: 'queued',
      target: request.target,
      quality: request.quality,
      aspectRatio: request.aspectRatio,
      inputAssetIds: [],
      timelineSnapshot: {},
      magicRevealSnapshot: {},
      captionSnapshot: {},
      renderSettings: request.renderSettings,
      progress: 0,
      createdAt: nowIso(),
    };
    this.jobs.set(job.id, job);
    return okResponse({ renderJob: job });
  }

  async getRenderJob(renderJobId: string) {
    const j = this.jobs.get(renderJobId);
    if (!j) return errResponse('not_found');
    return okResponse({ renderJob: j });
  }

  async cancelRenderJob(request: CancelRenderJobRequest) {
    const j = this.jobs.get(request.renderJobId);
    if (!j) return errResponse('not_found');
    const u = j.status === 'completed' ? j : { ...j, status: 'cancelled' as const };
    this.jobs.set(j.id, u);
    return okResponse(u);
  }

  async listRenderJobs(projectId: string) {
    return okResponse([...this.jobs.values()].filter((j) => j.projectId === projectId));
  }

  async createThumbnail(request: CreateThumbnailRequest) {
    const asset = this.assets.get(request.assetId);
    if (!asset) return errResponse('not_found');
    const der = createThumbnailPlaceholder(asset, request.timeMs, `thumb_${Date.now()}`);
    this.derivatives.set(der.id, der);
    asset.derivatives.push(der.id);
    this.assets.set(asset.id, { ...asset, updatedAt: nowIso() });
    return okResponse({ derivative: der });
  }

  async createCaptionArtifact(request: CreateCaptionArtifactRequest) {
    const cues = [
      { id: '1', startMs: 0, endMs: 2000, text: request.transcript.slice(0, 80) || 'mock' },
    ];
    const artifact: CaptionArtifact = {
      id: `cap_${Date.now()}`,
      projectId: request.projectId,
      language: request.language,
      format: request.format,
      cues,
      storagePath: `captions/${request.projectId}/${Date.now()}.${request.format === 'vtt' ? 'vtt' : 'json'}`,
      status: 'ready',
    };
    if (request.format === 'vtt') buildMockVtt(cues);
    else buildCaptionJson(cues);
    return okResponse(artifact);
  }

  async createMagicMaskArtifact(request: CreateMagicMaskArtifactRequest) {
    const reveals: StudioMagicReveal[] = request.revealIds.map((id) => ({
      id,
      timelineStartMs: 0,
      timelineEndMs: 5000,
      geometry: { kind: 'rect', coords: [0.1, 0.1, 0.4, 0.3] },
      hiddenRender: true,
    }));
    const artifact: MagicMaskArtifact = createMaskArtifactFromMagicReveals(request.projectId, {
      magicReveals: reveals,
    });
    artifact.format = request.format;
    return okResponse(artifact);
  }

  async buildRenderManifest(request: BuildMediaManifestRequest) {
    const job = this.jobs.get(request.renderJobId);
    if (!job) return errResponse('not_found', 'Render job not found');
    const ext = getExtensionFromMime(job.renderSettings.outputMimeType);
    const output: MediaAssetRecord = {
      id: `out_${job.id}`,
      projectId: job.projectId,
      ownerUserId: job.ownerUserId,
      source: 'generated_render',
      type: 'video',
      lifecycleStatus: 'ready',
      visibility: 'project_only',
      name: `output.${ext}`,
      originalFileName: `output.${ext}`,
      mimeType: job.renderSettings.outputMimeType,
      mimeCategory: 'video',
      fileSizeBytes: 1024 * 1024,
      durationMs: 60_000,
      width: job.renderSettings.width,
      height: job.renderSettings.height,
      storageBucket: 'studio-renders',
      storagePath: `renders/${job.id}/output.${ext}`,
      metadata: { mockOutput: true },
      processingStatus: 'completed',
      derivatives: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.assets.set(output.id, output);
    const manifest = buildRenderManifest({ renderJob: job, outputAsset: output });
    return okResponse({ renderManifest: manifest });
  }
}
