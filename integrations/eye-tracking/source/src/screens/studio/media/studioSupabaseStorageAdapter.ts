/**
 * Stage 10 — Supabase Storage adapter skeleton.
 * Production upload intents must be server-created, not client-trusted.
 * No hard dependency on @supabase/supabase-js at compile time: pass an optional client duck-typed.
 */

import type { StudioMediaAdapter } from './studioMediaAdapter';
import { errResponse, okResponse, type CancelRenderJobRequest } from './studioMediaContracts';
import type { ConfirmUploadRequest } from './studioMediaContracts';
import type { CreateCaptionArtifactRequest } from './studioMediaContracts';
import type { CreateMagicMaskArtifactRequest } from './studioMediaContracts';
import type { CreateRenderJobRequest } from './studioMediaContracts';
import type { CreateThumbnailRequest } from './studioMediaContracts';
import type { CreateUploadIntentRequest } from './studioMediaContracts';
import type { BuildMediaManifestRequest } from './studioMediaContracts';
import type { MediaAssetRecord, MediaDerivative, UploadIntent } from './studioMediaTypes';
import type { MediaDerivativeType } from './studioMediaTypes';
/** Optional Supabase-like client with .storage.from(bucket).upload(path, body) */
export type SupabaseLikeClient = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: File | Blob | ArrayBuffer,
        options?: Record<string, unknown>,
      ) => Promise<{ data: { path: string } | null; error: Error | null }>;
    };
  };
};

export interface StudioSupabaseStorageAdapterOptions {
  /** When false (default), createUploadIntent returns server_function_required. */
  edgeUploadIntentFunctionAvailable?: boolean;
  /** Dev-only escape hatch; production must use signed intents from the server. */
  allowUnsafeLocalUpload?: boolean;
  defaultBucket?: string;
}

export class StudioSupabaseStorageAdapter implements StudioMediaAdapter {
  constructor(
    private readonly client: SupabaseLikeClient | null,
    private readonly opts: StudioSupabaseStorageAdapterOptions = {},
  ) {}

  async createUploadIntent(request: CreateUploadIntentRequest) {
    if (!this.opts.edgeUploadIntentFunctionAvailable) {
      return errResponse(
        'server_function_required',
        'Production upload intents should be server-created, not client-trusted.',
      );
    }
    const intentId = `ui_srv_${Date.now()}`;
    const intent: UploadIntent = {
      id: intentId,
      projectId: request.projectId,
      ownerUserId: 'server',
      fileName: request.fileName,
      mimeType: request.mimeType,
      fileSizeBytes: request.fileSizeBytes,
      targetBucket: this.opts.defaultBucket ?? 'studio',
      targetPath: `pending/${request.projectId}/${intentId}`,
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      maxFileSizeBytes: request.fileSizeBytes,
      allowedMimeTypes: [request.mimeType],
      status: 'created',
      createdAt: new Date().toISOString(),
    };
    const assetDraft: MediaAssetRecord = {
      id: `asset_srv_${Date.now()}`,
      projectId: request.projectId,
      ownerUserId: 'server',
      source: 'device_upload',
      type: 'unknown',
      lifecycleStatus: 'upload_intent_created',
      visibility: 'private_draft',
      name: request.fileName,
      originalFileName: request.fileName,
      mimeType: request.mimeType,
      mimeCategory: 'unknown',
      fileSizeBytes: request.fileSizeBytes,
      metadata: { serverIntentSkeleton: true },
      processingStatus: 'not_required',
      derivatives: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return okResponse({ uploadIntent: intent, assetDraft });
  }

  async uploadLocalFile(intent: UploadIntent, file: File | Blob) {
    if (!this.client || !this.opts.allowUnsafeLocalUpload) {
      return errResponse('not_implemented', 'Local upload requires configured Supabase client + explicit dev flag.');
    }
    const res = await this.client.storage.from(intent.targetBucket).upload(intent.targetPath, file, {
      upsert: false,
    });
    if (res.error) return errResponse('unknown_error', res.error.message);
    return okResponse({ bytesUploaded: file instanceof File ? file.size : intent.fileSizeBytes });
  }

  async confirmUpload(_request: ConfirmUploadRequest) {
    return errResponse(
      'server_authority_required',
      'Upload confirmation must be performed by an authoritative server after verifying object existence.',
    );
  }

  async getAsset(_assetId: string) {
    return errResponse('not_implemented');
  }

  async listProjectAssets(_projectId: string) {
    return errResponse('not_implemented');
  }

  async deleteAsset(_assetId: string) {
    return errResponse('not_implemented');
  }

  async createDerivative(
    _parentAssetId: string,
    _derivativeType: MediaDerivativeType,
    _metadata: Record<string, unknown>,
  ) {
    return errResponse('not_implemented');
  }

  async createRenderJob(_request: CreateRenderJobRequest) {
    return errResponse('server_function_required', 'Render jobs must be enqueued via an edge function / worker.');
  }

  async getRenderJob(renderJobId: string) {
    return errResponse('not_implemented', `No job store client-side (${renderJobId}).`);
  }

  async cancelRenderJob(_request: CancelRenderJobRequest) {
    return errResponse('not_implemented');
  }

  async listRenderJobs(_projectId: string) {
    return errResponse('not_implemented');
  }

  async createThumbnail(_request: CreateThumbnailRequest) {
    return errResponse('worker_required', 'Thumbnail generation requires a worker.');
  }

  async createCaptionArtifact(_request: CreateCaptionArtifactRequest) {
    return errResponse('server_function_required');
  }

  async createMagicMaskArtifact(_request: CreateMagicMaskArtifactRequest) {
    return errResponse('server_function_required');
  }

  async buildRenderManifest(_request: BuildMediaManifestRequest) {
    return errResponse(
      'server_authority_required',
      'Render manifests must be sealed server-side for publish integrity.',
    );
  }
}
