/**
 * Stage 5 runtime + creator event name constants (wire to appendStudioEvent / analytics).
 */

export const RUNTIME_FEED_EVENTS = {
  postImpression: "runtime.post.impression",
  postViewStarted: "runtime.post.view_started",
  postViewCompleted: "runtime.post.view_completed",
  postVerifiedView: "runtime.post.verified_view",
  postLiked: "runtime.post.liked",
  postSaved: "runtime.post.saved",
  postShared: "runtime.post.shared",
  postCommented: "runtime.post.commented",
  postTipped: "runtime.post.tipped",
  postReported: "runtime.post.reported",
  postHidden: "runtime.post.hidden",

  magicRevealSeen: "runtime.magic.reveal_seen",
  magicRevealTapped: "runtime.magic.reveal_tapped",
  magicUnlockSheetOpened: "runtime.magic.unlock_sheet_opened",
  magicUnlockConfirmed: "runtime.magic.unlock_confirmed",
  magicUnlockCompleted: "runtime.magic.unlock_completed",
  magicUnlockBlocked: "runtime.magic.unlock_blocked",
  magicUnlockFailed: "runtime.magic.unlock_failed",
  magicUnlockRefunded: "runtime.magic.unlock_refunded",

  disclosureShown: "runtime.disclosure.shown",
  disclosureOpened: "runtime.disclosure.opened",
  ageGateShown: "runtime.age_gate.shown",
  ageGatePassed: "runtime.age_gate.passed",
  ageGateBlocked: "runtime.age_gate.blocked",

  creatorDashboardOpened: "creator.dashboard.opened",
  creatorPostPaused: "creator.post.paused",
  creatorPostResumed: "creator.post.resumed",
  creatorPostArchived: "creator.post.archived",
  creatorPostDeleted: "creator.post.deleted",
  creatorPostSentToReview: "creator.post.sent_to_review",
  creatorRevealPaused: "creator.reveal.paused",
  creatorRevealMonetizationDisabled: "creator.reveal.monetization_disabled",
} as const;
