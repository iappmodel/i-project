/**
 * Stage 10 — deterministic storage layout.
 * Draft assets are private; published media uses post-scoped paths.
 * Never expose raw private draft path as a public URL.
 */

export interface BuildProjectAssetPathInput {
  ownerUserId: string;
  projectId: string;
  assetId: string;
  fileName: string;
}

export interface BuildDerivativePathInput {
  ownerUserId: string;
  projectId: string;
  parentAssetId: string;
  derivativeType: string;
  derivativeId: string;
  ext: string;
}

export interface BuildRenderOutputPathInput {
  ownerUserId: string;
  projectId: string;
  renderJobId: string;
  ext: string;
}

export interface BuildPostMediaPathInput {
  postId: string;
  renderManifestId: string;
  ext: string;
}

export interface BuildMagicMaskPathInput {
  ownerUserId: string;
  projectId: string;
  revealId: string;
  maskId: string;
}

export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? 'asset';
  const noTraverse = base.replace(/\.\./g, '').replace(/[/\\]/g, '-');
  const spaced = noTraverse.replace(/\s+/g, '-').toLowerCase();
  return spaced.replace(/[^a-z0-9._-]/g, '') || 'asset.bin';
}

const MIME_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'text/vtt': 'vtt',
  'application/json': 'json',
};

export function getExtensionFromMime(mimeType: string): string {
  const key = mimeType.toLowerCase();
  return MIME_EXT[key] ?? 'bin';
}

export function buildProjectAssetPath(input: BuildProjectAssetPathInput): string {
  const safe = sanitizeFileName(input.fileName);
  return `users/${input.ownerUserId}/studio/projects/${input.projectId}/assets/${input.assetId}/${safe}`;
}

export function buildDerivativePath(input: BuildDerivativePathInput): string {
  const ext = input.ext.replace(/^\./, '').toLowerCase();
  return `users/${input.ownerUserId}/studio/projects/${input.projectId}/derivatives/${input.parentAssetId}/${input.derivativeType}/${input.derivativeId}.${ext}`;
}

export function buildRenderOutputPath(input: BuildRenderOutputPathInput): string {
  const ext = input.ext.replace(/^\./, '').toLowerCase();
  return `users/${input.ownerUserId}/studio/projects/${input.projectId}/renders/${input.renderJobId}/output.${ext}`;
}

export function buildPostMediaPath(input: BuildPostMediaPathInput): string {
  const ext = input.ext.replace(/^\./, '').toLowerCase();
  return `posts/${input.postId}/media/${input.renderManifestId}/output.${ext}`;
}

export function buildMagicMaskPath(input: BuildMagicMaskPathInput): string {
  return `users/${input.ownerUserId}/studio/projects/${input.projectId}/magic-masks/${input.revealId}/${input.maskId}.json`;
}
