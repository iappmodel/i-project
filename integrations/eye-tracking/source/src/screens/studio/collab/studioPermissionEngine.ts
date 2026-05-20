/**
 * Stage 11 — role → permissions and action checks (local mock).
 *
 * Hard rules (5–7, 10): editors default no publish; reviewers scope-limited; viewer read-only.
 */

import type { StudioPermission, StudioCollaborator, StudioCollaboratorRole } from './studioCollabTypes';
import type { ApprovalGate } from './studioCollabTypes';
import type { StudioReviewRequest } from './studioCollabTypes';
import type { StudioCommentTargetType } from './studioCollabTypes';

const ALL: StudioPermission[] = [
  'view_project',
  'edit_timeline',
  'edit_media',
  'edit_magic',
  'edit_campaign',
  'edit_caption',
  'edit_disclosures',
  'run_export',
  'request_review',
  'approve_review',
  'reject_review',
  'publish_project',
  'manage_collaborators',
  'view_wallet_simulation',
  'view_backend_panel',
];

const VIEW_ONLY: StudioPermission[] = ['view_project'];

const EDITOR: StudioPermission[] = [
  'view_project',
  'edit_timeline',
  'edit_media',
  'edit_magic',
  'edit_campaign',
  'edit_caption',
  'edit_disclosures',
  'run_export',
  'request_review',
  'view_wallet_simulation',
  'view_backend_panel',
];

const BRAND: StudioPermission[] = [
  'view_project',
  'request_review',
  'approve_review',
  'reject_review',
  'view_backend_panel',
];

const SAFETY: StudioPermission[] = [
  'view_project',
  'request_review',
  'approve_review',
  'reject_review',
  'view_backend_panel',
];

const LEGAL: StudioPermission[] = [
  'view_project',
  'request_review',
  'approve_review',
  'reject_review',
  'view_backend_panel',
];

const FINANCE: StudioPermission[] = [
  'view_project',
  'request_review',
  'approve_review',
  'reject_review',
  'view_backend_panel',
];

const REVIEWER: StudioPermission[] = [
  'view_project',
  'request_review',
  'approve_review',
  'reject_review',
  'view_backend_panel',
];

export function getPermissionsForRole(role: StudioCollaboratorRole): StudioPermission[] {
  switch (role) {
    case 'owner':
      return [...ALL];
    case 'editor':
      return [...EDITOR];
    case 'reviewer':
      return [...REVIEWER];
    case 'brand_reviewer':
      return [...BRAND];
    case 'legal_reviewer':
      return [...LEGAL];
    case 'safety_reviewer':
      return [...SAFETY];
    case 'finance_reviewer':
      return [...FINANCE];
    case 'viewer_only':
    default:
      return [...VIEW_ONLY];
  }
}

export function canCollaborator(collaborator: StudioCollaborator, permission: StudioPermission): boolean {
  return collaborator.permissions.includes(permission);
}

export function canEditTarget(
  collaborator: StudioCollaborator,
  targetType: StudioCommentTargetType | 'timeline' | 'media' | 'magic' | 'campaign',
): boolean {
  if (collaborator.role === 'owner') return true;
  if (collaborator.role === 'viewer_only') return false;
  if (['brand_reviewer', 'safety_reviewer', 'legal_reviewer', 'finance_reviewer'].includes(collaborator.role)) {
    return false;
  }
  if (targetType === 'timeline' || targetType === 'clip' || targetType === 'timeline_time') {
    return canCollaborator(collaborator, 'edit_timeline');
  }
  if (targetType === 'media' || targetType === 'asset') {
    return canCollaborator(collaborator, 'edit_media');
  }
  if (targetType === 'magic' || targetType === 'magic_reveal') {
    return canCollaborator(collaborator, 'edit_magic');
  }
  if (targetType === 'campaign') {
    return canCollaborator(collaborator, 'edit_campaign');
  }
  return canCollaborator(collaborator, 'edit_timeline');
}

export function canPublish(
  collaborator: StudioCollaborator,
  approvalGates: ApprovalGate[],
): { ok: boolean; reason?: string } {
  if (!canCollaborator(collaborator, 'publish_project')) {
    return { ok: false, reason: 'Role cannot publish.' };
  }
  const blocking = approvalGates.filter((g) => g.blocking && g.status !== 'passed' && g.status !== 'waived');
  if (blocking.length) {
    return { ok: false, reason: `Blocked by: ${blocking.map((b) => b.label).join(', ')}` };
  }
  return { ok: true };
}

export function canApproveReview(collaborator: StudioCollaborator, request: StudioReviewRequest): boolean {
  if (!canCollaborator(collaborator, 'approve_review')) return false;
  if (collaborator.userId !== request.assignedToUserId) return false;
  if (collaborator.role === 'owner') return true;
  if (collaborator.role === 'brand_reviewer' && request.type === 'brand_approval') return true;
  if (collaborator.role === 'safety_reviewer' && request.type === 'safety_review') return true;
  if (collaborator.role === 'legal_reviewer' && request.type === 'legal_review') return true;
  if (collaborator.role === 'finance_reviewer' && request.type === 'finance_review') return true;
  if (collaborator.role === 'reviewer') return true;
  return false;
}

export function canManageCollaborators(collaborator: StudioCollaborator): boolean {
  return canCollaborator(collaborator, 'manage_collaborators');
}

export type StudioPanelId =
  | 'collab'
  | 'versions'
  | 'media'
  | 'backend'
  | 'wallet'
  | 'publish'
  | 'export';

export function filterVisiblePanelsByPermission(collaborator: StudioCollaborator): StudioPanelId[] {
  const out: StudioPanelId[] = ['collab', 'versions', 'publish'];
  if (canCollaborator(collaborator, 'edit_media')) out.push('media');
  if (canCollaborator(collaborator, 'view_backend_panel')) out.push('backend');
  if (canCollaborator(collaborator, 'view_wallet_simulation')) out.push('wallet');
  if (canCollaborator(collaborator, 'run_export')) out.push('export');
  return out;
}
