/** Stage 10 — client-side validation rules (production still re-validates server-side). */

import type { MediaMimeCategory, MediaValidationResult } from './studioMediaTypes';
import type { RenderSettings } from './studioRenderTypes';

const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const AUDIO_MIMES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac'] as const;
const TEXT_MIMES = ['text/vtt', 'application/json'] as const;

const VIDEO_MAX = 2 * 1024 * 1024 * 1024; // 2GB placeholder
const IMAGE_MAX = 50 * 1024 * 1024;
const AUDIO_MAX = 250 * 1024 * 1024;
const CAPTION_MAX = 10 * 1024 * 1024;

export function getMimeCategory(mimeType: string): MediaMimeCategory {
  const m = mimeType.toLowerCase();
  if (VIDEO_MIMES.includes(m as (typeof VIDEO_MIMES)[number])) return 'video';
  if (IMAGE_MIMES.includes(m as (typeof IMAGE_MIMES)[number])) return 'image';
  if (AUDIO_MIMES.includes(m as (typeof AUDIO_MIMES)[number])) return 'audio';
  if (TEXT_MIMES.includes(m as (typeof TEXT_MIMES)[number])) return m === 'application/json' ? 'json' : 'text';
  return 'unknown';
}

export function requiresTranscode(mimeType: string): boolean {
  const cat = getMimeCategory(mimeType);
  if (cat === 'unknown') return true;
  // Non-mp4 video may need transcode for unified pipeline (placeholder heuristic).
  if (cat === 'video' && mimeType !== 'video/mp4') return true;
  return false;
}

export function requiresSafetyScan(mimeCategory: MediaMimeCategory): boolean {
  return mimeCategory === 'video' || mimeCategory === 'image' || mimeCategory === 'audio';
}

export interface ValidateMediaFileInput {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}

export function validateMediaFile(input: ValidateMediaFileInput): MediaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mimeCategory = getMimeCategory(input.mimeType);
  const detectedMimeType = input.mimeType;

  const allowed =
    mimeCategory !== 'unknown' &&
    [...VIDEO_MIMES, ...IMAGE_MIMES, ...AUDIO_MIMES, ...TEXT_MIMES].includes(
      input.mimeType.toLowerCase() as never,
    );

  let maxSizeExceeded = false;
  let unsupportedFormat = !allowed;

  if (mimeCategory === 'video' && input.fileSizeBytes > VIDEO_MAX) {
    maxSizeExceeded = true;
    errors.push(`Video exceeds max size (${VIDEO_MAX} bytes).`);
  }
  if (mimeCategory === 'image' && input.fileSizeBytes > IMAGE_MAX) {
    maxSizeExceeded = true;
    errors.push(`Image exceeds max size (${IMAGE_MAX} bytes).`);
  }
  if (mimeCategory === 'audio' && input.fileSizeBytes > AUDIO_MAX) {
    maxSizeExceeded = true;
    errors.push(`Audio exceeds max size (${AUDIO_MAX} bytes).`);
  }
  if ((mimeCategory === 'text' || mimeCategory === 'json') && input.fileSizeBytes > CAPTION_MAX) {
    maxSizeExceeded = true;
    errors.push(`Caption/text exceeds max size (${CAPTION_MAX} bytes).`);
  }

  if (unsupportedFormat) {
    errors.push(`Unsupported MIME type: ${input.mimeType}`);
  }

  const rt = requiresTranscode(input.mimeType);
  if (rt) warnings.push('Transcode recommended or required for this format.');

  const ss = requiresSafetyScan(mimeCategory);
  if (ss) warnings.push('Safety scan required before publish for this media category.');

  const valid = errors.length === 0 && !maxSizeExceeded && !unsupportedFormat;

  return {
    valid,
    errors,
    warnings,
    mimeCategory,
    detectedMimeType,
    maxSizeExceeded,
    unsupportedFormat,
    requiresTranscode: rt,
    requiresSafetyScan: ss,
  };
}

export function validateRenderSettings(settings: RenderSettings): MediaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (settings.width <= 0 || settings.height <= 0) errors.push('Invalid dimensions.');
  if (settings.fps <= 0 || settings.fps > 120) errors.push('FPS out of supported range.');
  if (settings.bitrate <= 0) errors.push('Bitrate must be positive.');
  if (!settings.outputMimeType) errors.push('outputMimeType required.');
  if (!settings.outputExtension) errors.push('outputExtension required.');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    mimeCategory: 'unknown',
    maxSizeExceeded: false,
    unsupportedFormat: false,
    requiresTranscode: false,
    requiresSafetyScan: false,
  };
}

/** Reject `..`, absolute paths, and empty segments. */
export function validateStoragePath(path: string): MediaValidationResult {
  const errors: string[] = [];
  if (!path || path.trim() === '') errors.push('Path is empty.');
  if (path.includes('..')) errors.push('Path traversal not allowed.');
  if (path.startsWith('/')) errors.push('Absolute paths not allowed.');
  const segments = path.split('/').filter(Boolean);
  if (segments.some((s) => s === '.' || s === '..')) errors.push('Invalid path segment.');

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
    mimeCategory: 'unknown',
    maxSizeExceeded: false,
    unsupportedFormat: false,
    requiresTranscode: false,
    requiresSafetyScan: false,
  };
}
