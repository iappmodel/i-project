import type { StudioEvent } from "./studioTypes";

export const STUDIO_MAGIC_EVENTS = {
  opened: "studio.magic.opened",
  revealCreated: "studio.magic.reveal_created",
  revealSelected: "studio.magic.reveal_selected",
  revealUpdated: "studio.magic.reveal_updated",
  revealDeleted: "studio.magic.reveal_deleted",
  revealDuplicated: "studio.magic.reveal_duplicated",
  hiddenRenderChanged: "studio.magic.hidden_render_changed",
  revealTypeChanged: "studio.magic.reveal_type_changed",
  priceChanged: "studio.magic.price_changed",
  rewardChanged: "studio.magic.reward_changed",
  eligibilityChanged: "studio.magic.eligibility_changed",
  unlockPolicyChanged: "studio.magic.unlock_policy_changed",
  safetyScanStarted: "studio.magic.safety_scan_started",
  safetyScanCompleted: "studio.magic.safety_scan_completed",
  unlockPreviewOpened: "studio.magic.unlock_preview_opened",
  unlockPreviewClosed: "studio.magic.unlock_preview_closed",
  tabChanged: "studio.magic.tab_changed",
} as const;

export const STUDIO_UNLOCK_EVENTS = {
  simulatorOpened: "studio.unlock.simulator_opened",
  simulatorClosed: "studio.unlock.simulator_closed",
  /** Simulator / inspector: user selected an unlock row (not payment confirmation). */
  unlockSelected: "studio.unlock.unlock_selected",
  eligibilityChecked: "studio.unlock.eligibility_checked",
  started: "studio.unlock.started",
  blocked: "studio.unlock.blocked",
  confirmed: "studio.unlock.confirmed",
  completed: "studio.unlock.completed",
  failed: "studio.unlock.failed",
  refunded: "studio.unlock.refunded",
  verificationStarted: "studio.unlock.verification_started",
  verificationCompleted: "studio.unlock.verification_completed",
  settlementPending: "studio.unlock.settlement_pending",
  settlementReleased: "studio.unlock.settlement_released",
  settlementReversed: "studio.unlock.settlement_reversed",
} as const;

export const STUDIO_WALLET_EVENTS = {
  ledgerEntryCreated: "studio.wallet.ledger_entry_created",
  balanceChanged: "studio.wallet.balance_changed",
  viewerDebited: "studio.wallet.viewer_debited",
  creatorPendingCredited: "studio.wallet.creator_pending_credited",
  platformFeeRecorded: "studio.wallet.platform_fee_recorded",
  rewardPoolDebited: "studio.wallet.reward_pool_debited",
  viewerRewardCredited: "studio.wallet.viewer_reward_credited",
} as const;

/** Stage 4 — publish pipeline, safety, rights, export, post package (local simulation). */
export const STUDIO_PUBLISH_EVENTS = {
  panelOpened: "studio.publish.panel_opened",
  panelClosed: "studio.publish.panel_closed",
  targetChanged: "studio.publish.target_changed",
  visibilityChanged: "studio.publish.visibility_changed",
  captionChanged: "studio.publish.caption_changed",
  hashtagsChanged: "studio.publish.hashtags_changed",
  monetizationModeChanged: "studio.publish.monetization_mode_changed",
  validationStarted: "studio.publish.validation_started",
  validationCompleted: "studio.publish.validation_completed",
  checkPassed: "studio.publish.check_passed",
  checkFailed: "studio.publish.check_failed",
  checkBlocked: "studio.publish.check_blocked",
  started: "studio.publish.started",
  completed: "studio.publish.completed",
  failed: "studio.publish.failed",
  blocked: "studio.publish.blocked",
} as const;

export const STUDIO_SAFETY_PUBLISH_EVENTS = {
  scanStarted: "studio.safety.scan_started",
  scanCompleted: "studio.safety.scan_completed",
  issueDetected: "studio.safety.issue_detected",
  publishBlocked: "studio.safety.publish_blocked",
  warningCreated: "studio.safety.warning_created",
} as const;

export const STUDIO_RIGHTS_PUBLISH_EVENTS = {
  scanStarted: "studio.rights.scan_started",
  scanCompleted: "studio.rights.scan_completed",
  warningCreated: "studio.rights.warning_created",
  monetizationBlocked: "studio.rights.monetization_blocked",
} as const;

export const STUDIO_POST_PACKAGE_EVENTS = {
  manifestCreated: "studio.export.manifest_created",
  postPackageCreated: "studio.post_package.created",
  runtimePreviewOpened: "studio.post_runtime.preview_opened",
  runtimePreviewClosed: "studio.post_runtime.preview_closed",
} as const;

/*
 * Future backend events (Stage 5+):
 * wallet.ledger.persisted
 * wallet.settlement.batch_released
 * wallet.dispute.opened
 * wallet.dispute.resolved
 *
 * post.magic.reveal_tapped
 * post.magic.unlock_started
 * post.magic.unlock_completed
 * post.magic.unlock_failed
 *
 * post.created
 * post.media_render.persisted
 * post.magic_rules.persisted
 * post.wallet_rules.persisted
 * post.feed_indexed
 */

export const STUDIO_EVENTS = {
  projectCreated: "studio.project.created",
  projectOpened: "studio.project.opened",
  projectSaved: "studio.project.saved",
  modeChanged: "studio.mode.changed",
  aspectChanged: "studio.aspect.changed",
  assetUploadStarted: "studio.asset.upload_started",
  assetUploadCompleted: "studio.asset.upload_completed",
  toolSelected: "studio.tool.selected",
  clipSelected: "studio.clip.selected",
  clipTrimmed: "studio.clip.trimmed",
  clipSplit: "studio.clip.split",
  clipDeleted: "studio.clip.deleted",
  clipUpdated: "studio.clip.updated",
  trackVisibilityChanged: "studio.track.visibility_changed",
  trackLockChanged: "studio.track.lock_changed",
  trackMuteChanged: "studio.track.mute_changed",
  playbackStarted: "studio.playback.started",
  playbackPaused: "studio.playback.paused",
  playheadChanged: "studio.playhead.changed",
  exportStarted: "studio.export.started",
  exportProgress: "studio.export.progress",
  exportCompleted: "studio.export.completed",
} as const;

/** Stage 5 — runtime feed + creator dashboard event names (local simulation). */
export { RUNTIME_FEED_EVENTS } from "./feed/studioFeedEvents";

/** Stage 8 — backend lifecycle / sync log event type strings (no transport). */
export { STUDIO_BACKEND_EVENTS } from "./backend/studioBackendEvents";
export type { StudioBackendEventType } from "./backend/studioBackendEvents";

/** Stage 7 — verification / POPS / fraud / settlement / disputes (local simulation). */
export {
  STUDIO_VERIFICATION_EVENTS,
  STUDIO_POPS_EVENTS,
  STUDIO_FRAUD_EVENTS,
  STUDIO_SETTLEMENT_VERIFICATION_EVENTS,
  STUDIO_DISPUTE_EVENTS,
  STUDIO_TRUST_EVENTS,
} from "./verification/studioVerificationEvents";

export function appendStudioEvent(
  events: StudioEvent[],
  projectId: string,
  type: string,
  payload?: Record<string, unknown>,
  max = 300
): StudioEvent[] {
  const next: StudioEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    projectId,
    payload: payload ?? {},
    createdAt: new Date().toISOString(),
  };
  return [...events, next].slice(-max);
}
