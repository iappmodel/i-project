/** Stage 10 — API-style contracts for upload, render, and manifest flows. */

import type { MediaAssetRecord, UploadIntent } from './studioMediaTypes';
import type {
  RenderJob,
  RenderManifest,
  RenderJobType,
  RenderTarget,
  RenderQuality,
  RenderSettings,
} from './studioRenderTypes';
import type { MediaDerivative } from './studioMediaTypes';
import type { CaptionFormat } from './studioCaptionArtifacts';
import type { MagicMaskFormat } from './studioMagicMaskArtifacts';

export type ApiResponseCode =
  | 'ok'
  | 'validation_error'
  | 'not_found'
  | 'not_implemented'
  | 'server_function_required'
  | 'server_authority_required'
  | 'worker_required'
  | 'conflict'
  | 'unknown_error';

export interface ApiResponse<T> {
  ok: boolean;
  code: ApiResponseCode;
  data?: T;
  message?: string;
}

export interface MutationMeta {
  clientRequestId?: string;
  /** Mock mode — never send trusted paths to production workers. */
  mockMode?: boolean;
}

export interface CreateUploadIntentRequest {
  projectId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  mutationMeta: MutationMeta;
}

export interface CreateUploadIntentResponse {
  uploadIntent: UploadIntent;
  assetDraft: MediaAssetRecord;
}

export interface ConfirmUploadRequest {
  uploadIntentId: string;
  assetId: string;
  checksum?: string;
  uploadedBytes: number;
  mutationMeta: MutationMeta;
}

export interface ConfirmUploadResponse {
  asset: MediaAssetRecord;
}

export interface CreateRenderJobRequest {
  projectId: string;
  type: RenderJobType;
  target: RenderTarget;
  quality: RenderQuality;
  aspectRatio: string;
  renderSettings: RenderSettings;
  mutationMeta: MutationMeta;
}

export interface CreateRenderJobResponse {
  renderJob: RenderJob;
}

export interface GetRenderJobStatusRequest {
  renderJobId: string;
}

export interface GetRenderJobStatusResponse {
  renderJob: RenderJob;
}

export interface CancelRenderJobRequest {
  renderJobId: string;
  mutationMeta: MutationMeta;
}

export interface CreateThumbnailRequest {
  projectId: string;
  assetId: string;
  timeMs: number;
  mutationMeta: MutationMeta;
}

export interface CreateThumbnailResponse {
  derivative: MediaDerivative;
}

export interface CreateCaptionArtifactRequest {
  projectId: string;
  transcript: string;
  language: string;
  format: CaptionFormat;
  mutationMeta: MutationMeta;
}

export interface CreateMagicMaskArtifactRequest {
  projectId: string;
  revealIds: string[];
  format: MagicMaskFormat;
  mutationMeta: MutationMeta;
}

export interface BuildMediaManifestRequest {
  projectId: string;
  renderJobId: string;
  mutationMeta: MutationMeta;
}

export interface BuildMediaManifestResponse {
  renderManifest: RenderManifest;
}

export function okResponse<T>(data: T): ApiResponse<T> {
  return { ok: true, code: 'ok', data };
}

export function errResponse<T = never>(
  code: ApiResponseCode,
  message?: string,
): ApiResponse<T> {
  return { ok: false, code, message };
}
