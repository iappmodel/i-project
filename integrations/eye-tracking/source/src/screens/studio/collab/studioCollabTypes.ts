/**
 * Stage 11 — collaboration, versioning, review, permissions, presence (types only).
 */

import type { StudioPersistedSlice } from '../studioDomainTypes';

export type StudioCollaboratorRole =
  | 'owner'
  | 'editor'
  | 'reviewer'
  | 'brand_reviewer'
  | 'legal_reviewer'
  | 'safety_reviewer'
  | 'finance_reviewer'
  | 'viewer_only';

export type StudioPermission =
  | 'view_project'
  | 'edit_timeline'
  | 'edit_media'
  | 'edit_magic'
  | 'edit_campaign'
  | 'edit_caption'
  | 'edit_disclosures'
  | 'run_export'
  | 'request_review'
  | 'approve_review'
  | 'reject_review'
  | 'publish_project'
  | 'manage_collaborators'
  | 'view_wallet_simulation'
  | 'view_backend_panel';

export type CollaborationStatus =
  | 'solo'
  | 'shared'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'locked'
  | 'archived';

export type StudioCollaboratorInviteStatus = 'invited' | 'active' | 'removed';

export interface StudioCollaborator {
  id: string;
  projectId: string;
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl?: string;
  role: StudioCollaboratorRole;
  permissions: StudioPermission[];
  status: StudioCollaboratorInviteStatus;
  lastActiveAt: string;
  createdAt: string;
}

export type StudioPresenceUserStatus = 'online' | 'idle' | 'offline';

export interface StudioPresence {
  collaboratorId: string;
  projectId: string;
  userId: string;
  displayName: string;
  color: string;
  activeTool: string;
  selectedClipId?: string;
  selectedMagicRevealId?: string;
  playheadMs: number;
  cursor?: { x: number; y: number };
  lastSeenAt: string;
  status: StudioPresenceUserStatus;
}

export interface StudioProjectSnapshot extends StudioPersistedSlice {
  renderManifestId?: string;
  safetyReportId?: string;
  rightsReportId?: string;
}

export interface StudioProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  label: string;
  description?: string;
  snapshot: StudioProjectSnapshot;
  createdByUserId: string;
  createdByName: string;
  changeSummary: string;
  createdAt: string;
  locked: boolean;
  publishCandidate: boolean;
}

export type StudioChangeType =
  | 'project_created'
  | 'title_changed'
  | 'asset_added'
  | 'asset_removed'
  | 'clip_added'
  | 'clip_updated'
  | 'clip_deleted'
  | 'timeline_changed'
  | 'magic_created'
  | 'magic_updated'
  | 'magic_deleted'
  | 'campaign_updated'
  | 'caption_updated'
  | 'disclosure_updated'
  | 'export_created'
  | 'publish_validation_run'
  | 'review_requested'
  | 'review_approved'
  | 'review_rejected'
  | 'version_restored';

export type StudioChangeTargetType =
  | 'project'
  | 'asset'
  | 'clip'
  | 'track'
  | 'magic_reveal'
  | 'campaign'
  | 'publish'
  | 'review'
  | 'comment'
  | 'version';

export interface StudioChangeLogEntry {
  id: string;
  projectId: string;
  versionId?: string;
  actorUserId: string;
  actorName: string;
  changeType: StudioChangeType;
  targetType: StudioChangeTargetType;
  targetId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

export type StudioCommentTargetType =
  | 'project'
  | 'asset'
  | 'timeline_time'
  | 'clip'
  | 'magic_reveal'
  | 'campaign'
  | 'publish_check'
  | 'safety_issue'
  | 'rights_issue'
  | 'render_job';

export type StudioCommentStatus = 'open' | 'resolved' | 'deleted';

export interface StudioComment {
  id: string;
  projectId: string;
  threadId: string;
  targetType: StudioCommentTargetType;
  targetId?: string;
  timelineMs?: number;
  authorUserId: string;
  authorName: string;
  body: string;
  status: StudioCommentStatus;
  createdAt: string;
  updatedAt: string;
}

export type StudioCommentThreadStatus = 'open' | 'resolved' | 'archived';

export interface StudioCommentThread {
  id: string;
  projectId: string;
  targetType: StudioCommentTargetType;
  targetId?: string;
  timelineMs?: number;
  title: string;
  status: StudioCommentThreadStatus;
  comments: StudioComment[];
  createdByUserId: string;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReviewRequestStatus =
  | 'draft'
  | 'requested'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export type ReviewRequestType =
  | 'creator_review'
  | 'brand_approval'
  | 'legal_review'
  | 'safety_review'
  | 'finance_review'
  | 'final_publish_approval';

export type ReviewDecision = 'approved' | 'changes_requested' | 'rejected';

export interface StudioReviewRequest {
  id: string;
  projectId: string;
  versionId: string;
  requestedByUserId: string;
  requestedByName: string;
  assignedToUserId: string;
  assignedToName: string;
  type: ReviewRequestType;
  status: ReviewRequestStatus;
  message?: string;
  requiredForPublish: boolean;
  dueAt?: string;
  decision?: ReviewDecision;
  decisionMessage?: string;
  createdAt: string;
  decidedAt?: string;
}

export type ApprovalGateStatus = 'pending' | 'passed' | 'failed' | 'waived';

export interface ApprovalGate {
  id: string;
  projectId: string;
  label: string;
  type: ReviewRequestType | 'media_ready' | 'rights_cleared' | 'campaign_budget';
  required: boolean;
  status: ApprovalGateStatus;
  relatedReviewRequestId?: string;
  blocking: boolean;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}
