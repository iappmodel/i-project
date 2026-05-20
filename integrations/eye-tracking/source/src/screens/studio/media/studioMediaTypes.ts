/** Stage 10 — media asset lifecycle and upload/render domain types. */

export type MediaAssetLifecycleStatus =
  | 'local_selected'
  | 'upload_intent_created'
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'processed'
  | 'ready'
  | 'failed'
  | 'deleted'
  | 'quarantined';

export type MediaAssetSource =
  | 'device_upload'
  | 'camera_capture'
  | 'social_import'
  | 'url_import'
  | 'campaign_asset'
  | 'generated_render'
  | 'caption_artifact'
  | 'magic_mask_artifact'
  | 'thumbnail_artifact';

export type MediaAssetVisibility =
  | 'private_draft'
  | 'project_only'
  | 'published_public'
  | 'published_restricted'
  | 'archived';

export type MediaProcessingStatus =
  | 'not_required'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'blocked';

export type MediaDerivativeType =
  | 'thumbnail'
  | 'preview_proxy'
  | 'waveform'
  | 'caption_file'
  | 'transcript'
  | 'magic_mask_map'
  | 'render_output'
  | 'poster_frame'
  | 'safety_scan_frame'
  | 'audio_stem'
  | 'compressed_export';

export type MediaMimeCategory =
  | 'video'
  | 'image'
  | 'audio'
  | 'text'
  | 'json'
  | 'unknown';

export type UploadIntentStatus = 'created' | 'used' | 'expired' | 'cancelled';

export type MediaDerivativeRecordStatus =
  | 'pending'
  | 'ready'
  | 'failed'
  | 'blocked';

export interface MediaAssetRecord {
  id: string;
  projectId: string;
  ownerUserId: string;
  source: MediaAssetSource;
  type: string;
  lifecycleStatus: MediaAssetLifecycleStatus;
  visibility: MediaAssetVisibility;
  name: string;
  originalFileName: string;
  mimeType: string;
  mimeCategory: MediaMimeCategory;
  fileSizeBytes: number;
  durationMs?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  bitrate?: number;
  storageBucket?: string;
  storagePath?: string;
  publicUrl?: string;
  signedUrl?: string;
  localObjectUrl?: string;
  checksum?: string;
  metadata: Record<string, unknown>;
  processingStatus: MediaProcessingStatus;
  derivatives: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaDerivative {
  id: string;
  parentAssetId: string;
  projectId: string;
  type: MediaDerivativeType;
  mimeType: string;
  storageBucket?: string;
  storagePath?: string;
  publicUrl?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  fileSizeBytes?: number;
  metadata: Record<string, unknown>;
  status: MediaDerivativeRecordStatus;
  createdAt: string;
}

export interface UploadIntent {
  id: string;
  projectId: string;
  ownerUserId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  targetBucket: string;
  targetPath: string;
  signedUploadUrl?: string;
  expiresAt: string;
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
  status: UploadIntentStatus;
  createdAt: string;
}

export interface UploadProgress {
  assetId: string;
  bytesUploaded: number;
  totalBytes: number;
  percent: number;
  status: 'idle' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

export interface MediaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  mimeCategory: MediaMimeCategory;
  detectedMimeType?: string;
  maxSizeExceeded: boolean;
  unsupportedFormat: boolean;
  requiresTranscode: boolean;
  requiresSafetyScan: boolean;
}
