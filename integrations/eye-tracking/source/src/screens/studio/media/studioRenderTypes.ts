/** Stage 10 — render jobs, settings, and immutable render manifests. */

export type RenderJobStatus =
  | 'draft'
  | 'queued'
  | 'preparing'
  | 'rendering'
  | 'postprocessing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type RenderJobType =
  | 'preview_proxy'
  | 'thumbnail'
  | 'final_export'
  | 'caption_burn_in'
  | 'magic_mask_render'
  | 'safety_frame_extract'
  | 'waveform'
  | 'social_platform_export';

export type RenderQuality = 'draft' | 'preview' | 'standard' | 'high' | 'original';

export type RenderTarget =
  | 'i_feed'
  | 'i_story'
  | 'i_campaign'
  | 'private_link'
  | 'download'
  | 'external_platform';

export interface RenderSettings {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  includeWatermark: boolean;
  includeBurnedCaptions: boolean;
  includeMagicMasks: boolean;
  includeAudio: boolean;
  normalizeAudio: boolean;
  outputMimeType: string;
  outputExtension: string;
}

export interface RenderJob {
  id: string;
  projectId: string;
  postPackageId?: string;
  ownerUserId: string;
  type: RenderJobType;
  status: RenderJobStatus;
  target: RenderTarget;
  quality: RenderQuality;
  aspectRatio: string;
  inputAssetIds: string[];
  outputAssetId?: string;
  timelineSnapshot: Record<string, unknown>;
  /** Validated Magic reveals / mask artifact refs — server must validate. */
  magicRevealSnapshot: Record<string, unknown>;
  /** Versioned caption artifact snapshot — not mutable editor-only text. */
  captionSnapshot: Record<string, unknown>;
  renderSettings: RenderSettings;
  progress: number;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface RenderManifest {
  id: string;
  renderJobId: string;
  projectId: string;
  outputAssetId: string;
  outputUrl?: string;
  storageBucket: string;
  storagePath: string;
  thumbnailAssetId?: string;
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  fileSizeBytes: number;
  checksum?: string;
  quality: RenderQuality;
  target: RenderTarget;
  aspectRatio: string;
  includesWatermark: boolean;
  includesCaptions: boolean;
  includesMagicMaskMap: boolean;
  mediaHash?: string;
  timelineHash?: string;
  createdAt: string;
}
