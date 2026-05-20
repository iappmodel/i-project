/** Stage 10 — pluggable media backend; mock vs Supabase skeleton. */

import type { ApiResponse } from './studioMediaContracts';
import type {
  BuildMediaManifestRequest,
  BuildMediaManifestResponse,
  CancelRenderJobRequest,
  ConfirmUploadRequest,
  ConfirmUploadResponse,
  CreateCaptionArtifactRequest,
  CreateMagicMaskArtifactRequest,
  CreateRenderJobRequest,
  CreateRenderJobResponse,
  CreateThumbnailRequest,
  CreateThumbnailResponse,
  CreateUploadIntentRequest,
  CreateUploadIntentResponse,
  GetRenderJobStatusRequest,
  GetRenderJobStatusResponse,
} from './studioMediaContracts';
import type { MediaAssetRecord } from './studioMediaTypes';
import type { MediaDerivative } from './studioMediaTypes';
import type { RenderJob } from './studioRenderTypes';
import type { CaptionArtifact } from './studioCaptionArtifacts';
import type { MagicMaskArtifact } from './studioMagicMaskArtifacts';

export interface StudioMediaAdapter {
  createUploadIntent(
    request: CreateUploadIntentRequest,
  ): Promise<ApiResponse<CreateUploadIntentResponse>>;
  uploadLocalFile(
    intent: import('./studioMediaTypes').UploadIntent,
    file: File | Blob,
  ): Promise<ApiResponse<{ bytesUploaded: number }>>;
  confirmUpload(request: ConfirmUploadRequest): Promise<ApiResponse<ConfirmUploadResponse>>;
  getAsset(assetId: string): Promise<ApiResponse<MediaAssetRecord>>;
  listProjectAssets(projectId: string): Promise<ApiResponse<MediaAssetRecord[]>>;
  deleteAsset(assetId: string): Promise<ApiResponse<{ deleted: boolean }>>;
  createDerivative(
    parentAssetId: string,
    derivativeType: import('./studioMediaTypes').MediaDerivativeType,
    metadata: Record<string, unknown>,
  ): Promise<ApiResponse<MediaDerivative>>;
  createRenderJob(request: CreateRenderJobRequest): Promise<ApiResponse<CreateRenderJobResponse>>;
  getRenderJob(renderJobId: string): Promise<ApiResponse<GetRenderJobStatusResponse>>;
  cancelRenderJob(request: CancelRenderJobRequest): Promise<ApiResponse<RenderJob>>;
  listRenderJobs(projectId: string): Promise<ApiResponse<RenderJob[]>>;
  createThumbnail(request: CreateThumbnailRequest): Promise<ApiResponse<CreateThumbnailResponse>>;
  createCaptionArtifact(
    request: CreateCaptionArtifactRequest,
  ): Promise<ApiResponse<CaptionArtifact>>;
  createMagicMaskArtifact(
    request: CreateMagicMaskArtifactRequest,
  ): Promise<ApiResponse<MagicMaskArtifact>>;
  buildRenderManifest(
    request: BuildMediaManifestRequest,
  ): Promise<ApiResponse<BuildMediaManifestResponse>>;
}
