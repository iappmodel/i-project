/** Stage 11 — collaboration/version/review event names (local bus / logging). */

export const studioCollabEvents = {
  project_shared: 'collab.project_shared',
  collaborator_invited: 'collab.collaborator_invited',
  collaborator_removed: 'collab.collaborator_removed',
  permission_changed: 'collab.permission_changed',
  presence_updated: 'collab.presence_updated',
  comment_created: 'collab.comment_created',
  comment_replied: 'collab.comment_replied',
  comment_resolved: 'collab.comment_resolved',
  version_created: 'collab.version_created',
  version_compared: 'collab.version_compared',
  version_restored: 'collab.version_restored',
  version_locked: 'collab.version_locked',
  publish_candidate_marked: 'collab.publish_candidate_marked',
  review_requested: 'collab.review_requested',
  review_approved: 'collab.review_approved',
  review_changes_requested: 'collab.review_changes_requested',
  review_rejected: 'collab.review_rejected',
  review_cancelled: 'collab.review_cancelled',
  approval_gate_passed: 'collab.approval_gate_passed',
  approval_gate_failed: 'collab.approval_gate_failed',
  publish_blocked_by_review: 'collab.publish_blocked_by_review',
  change_logged: 'collab.change_logged',
} as const;

export type StudioCollabEventName = (typeof studioCollabEvents)[keyof typeof studioCollabEvents];
