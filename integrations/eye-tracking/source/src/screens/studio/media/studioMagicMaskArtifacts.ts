/**
 * Stage 10 — Magic mask artifacts so runtime can hide/reveal without trusting editor state.
 * Magic masks must be generated from validated Magic reveals.
 */

export type MagicMaskFormat = 'json_mask_map' | 'alpha_video' | 'vector_regions' | 'tracking_keyframes';

export interface MagicMaskGeometry {
  kind: 'rect' | 'polygon' | 'ellipse';
  /** Normalized 0–1 coordinates in preview space (mock). */
  coords: number[];
}

export interface MagicMaskTracking {
  enabled: boolean;
  keyframes: { tMs: number; geometry: MagicMaskGeometry }[];
}

export interface MagicMaskRegion {
  revealId: string;
  timelineStartMs: number;
  timelineEndMs: number;
  geometry: MagicMaskGeometry;
  tracking: MagicMaskTracking;
  hiddenRender: boolean;
}

export interface MagicMaskArtifact {
  id: string;
  projectId: string;
  revealIds: string[];
  format: MagicMaskFormat;
  regions: MagicMaskRegion[];
  storagePath?: string;
  status: 'draft' | 'ready' | 'failed';
}

export interface StudioMagicReveal {
  id: string;
  timelineStartMs: number;
  timelineEndMs: number;
  /** Mock geometry */
  geometry: MagicMaskGeometry;
  hiddenRender?: boolean;
}

export function validateMagicMaskRegions(regions: MagicMaskRegion[]): string[] {
  const errors: string[] = [];
  regions.forEach((r, i) => {
    if (r.timelineEndMs < r.timelineStartMs) errors.push(`Region ${i}: invalid timeline range.`);
    if (!r.revealId) errors.push(`Region ${i}: missing revealId.`);
  });
  return errors;
}

export function buildMagicMaskMap(project: { magicReveals?: StudioMagicReveal[] }): MagicMaskRegion[] {
  const reveals = project.magicReveals ?? [];
  return reveals.map((mr) => ({
    revealId: mr.id,
    timelineStartMs: mr.timelineStartMs,
    timelineEndMs: mr.timelineEndMs,
    geometry: mr.geometry,
    tracking: { enabled: false, keyframes: [] },
    hiddenRender: mr.hiddenRender ?? true,
  }));
}

export function createMaskArtifactFromMagicReveals(
  projectId: string,
  project: { magicReveals?: StudioMagicReveal[] },
): MagicMaskArtifact {
  const regions = buildMagicMaskMap(project);
  return {
    id: `mm_${Date.now()}`,
    projectId,
    revealIds: regions.map((r) => r.revealId),
    format: 'json_mask_map',
    regions,
    status: validateMagicMaskRegions(regions).length === 0 ? 'ready' : 'draft',
  };
}
