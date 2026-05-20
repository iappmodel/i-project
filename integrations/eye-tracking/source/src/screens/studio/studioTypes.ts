/** Studio shared types (Stages 1–10). */

import type { MediaAssetRecord, UploadIntent, UploadProgress } from './media/studioMediaTypes';
import type { RenderJob, RenderManifest } from './media/studioRenderTypes';
import type { CaptionArtifact } from './media/studioCaptionArtifacts';
import type { MagicMaskArtifact } from './media/studioMagicMaskArtifacts';
import type { ExportManifestV2 } from './media/studioRenderManifest';
import type { StudioSubtitleTrack } from './media/studioCaptionArtifacts';
import type { StudioMagicReveal } from './media/studioMagicMaskArtifacts';

export type StudioTool =
  | 'trim'
  | 'filters'
  | 'beauty'
  | 'audio'
  | 'text'
  | 'stickers'
  | 'speed'
  | 'captions'
  | 'magic'
  | 'campaign'
  | 'verify'
  | 'media'
  | 'backend'
  | 'export'
  | 'publish';

export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';

export interface TimelineClip {
  id: string;
  assetId: string;
  startMs: number;
  endMs: number;
  track: 'video' | 'audio' | 'image';
}

export interface StudioProject {
  id: string;
  ownerUserId: string;
  name: string;
  playheadMs: number;
  timeline: TimelineClip[];
  captionsEnabled: boolean;
  subtitleTracks: StudioSubtitleTrack[];
  magicReveals: StudioMagicReveal[];
  safetyScan: ScanStatus;
  rightsScan: ScanStatus;
}

/** Legacy Stage 4 export manifest (superseded by RenderManifest for publish). */
export interface LegacyExportManifest {
  version: 1;
  projectId: string;
  exportedAt: string;
  ready: boolean;
}

export interface StudioState {
  mockMode: boolean;
  activeTool: StudioTool;
  project: StudioProject;
  mediaAdapterKind: 'mock' | 'supabase';
  mediaAssets: MediaAssetRecord[];
  uploadIntents: UploadIntent[];
  uploadProgress: Record<string, UploadProgress>;
  renderJobs: RenderJob[];
  renderManifests: RenderManifest[];
  captionArtifacts: CaptionArtifact[];
  magicMaskArtifacts: MagicMaskArtifact[];
  selectedMediaAssetId: string | null;
  selectedRenderJobId: string | null;
  mediaPipelineOpen: boolean;
  /** Latest export manifest from render pipeline (immutable snapshot for publish). */
  latestExportManifest: ExportManifestV2 | null;
  legacyExportManifest: LegacyExportManifest | null;
  exportSimulationCancel: (() => void) | null;
}

export const STUDIO_TOOLS_ORDER: StudioTool[] = [
  'trim',
  'filters',
  'beauty',
  'audio',
  'text',
  'stickers',
  'speed',
  'captions',
  'magic',
  'campaign',
  'verify',
  'media',
  'backend',
  'export',
  'publish',
];
