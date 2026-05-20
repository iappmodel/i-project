/** Stage 10 — thumbnail placeholders (no canvas/ffmpeg extraction). */

import type { MediaAssetRecord, MediaDerivative } from './studioMediaTypes';
import type { MediaDerivativeType } from './studioMediaTypes';

export interface StudioProjectLike {
  playheadMs?: number;
}

export function createThumbnailPlaceholder(
  asset: MediaAssetRecord,
  timeMs: number,
  derivativeId: string,
): Omit<MediaDerivative, 'createdAt'> & { createdAt: string } {
  return {
    id: derivativeId,
    parentAssetId: asset.id,
    projectId: asset.projectId,
    type: 'thumbnail',
    mimeType: 'image/png',
    width: 320,
    height: 180,
    metadata: { timeMs, placeholder: true },
    status: 'ready',
    createdAt: new Date().toISOString(),
  };
}

/** Mock: first “non-black” frame at 1000ms or playhead. */
export function selectPosterFrame(project: StudioProjectLike): number {
  const ph = project.playheadMs ?? 0;
  return ph > 0 ? ph : 1000;
}

export type ThumbnailSize = 'small' | 'medium' | 'large';

const SIZES: Record<ThumbnailSize, { w: number; h: number }> = {
  small: { w: 160, h: 90 },
  medium: { w: 320, h: 180 },
  large: { w: 640, h: 360 },
};

export function buildThumbnailSet(asset: MediaAssetRecord, timeMs: number): MediaDerivative[] {
  const base = Date.now();
  return (['small', 'medium', 'large'] as ThumbnailSize[]).map((size, i) => {
    const dim = SIZES[size];
    return {
      id: `thumb_${asset.id}_${size}_${base + i}`,
      parentAssetId: asset.id,
      projectId: asset.projectId,
      type: 'thumbnail' as MediaDerivativeType,
      mimeType: 'image/png',
      width: dim.w,
      height: dim.h,
      metadata: { timeMs, size, placeholder: true },
      status: 'ready',
      createdAt: new Date().toISOString(),
    };
  });
}
