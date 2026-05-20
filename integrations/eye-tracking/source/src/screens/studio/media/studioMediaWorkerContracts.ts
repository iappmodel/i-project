/**
 * Stage 10 — contracts for future media workers (ffmpeg, edge, queue).
 *
 * Rules (documented for implementers):
 * - Media workers must not trust client render settings without server validation.
 * - Final export jobs must use server-signed project snapshot.
 * - Magic masks must be generated from validated reveals.
 */

export type WorkerJobType =
  | 'transcode_video'
  | 'generate_proxy'
  | 'generate_thumbnail'
  | 'extract_waveform'
  | 'burn_captions'
  | 'render_magic_masks'
  | 'final_export'
  | 'safety_frame_extract';

export interface WorkerJobRequest {
  jobId: string;
  type: WorkerJobType;
  inputAssets: string[];
  outputPath: string;
  settings: Record<string, unknown>;
  callbackUrl?: string;
}

export interface WorkerJobResponse {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  outputAssets: string[];
  logs: string[];
  error?: string;
}

export interface WorkerProgressEvent {
  jobId: string;
  progress: number;
  stage: string;
  message: string;
  createdAt: string;
}
