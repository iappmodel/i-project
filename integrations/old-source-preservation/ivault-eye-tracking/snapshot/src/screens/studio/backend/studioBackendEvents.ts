/**
 * [ i ] Studio Stage 8 — cross-layer backend lifecycle events (log-only in UI).
 */

export const STUDIO_BACKEND_EVENTS = {
  projectPersistRequested: "backend.project.persist_requested",
  projectPersisted: "backend.project.persisted",
  projectPersistFailed: "backend.project.persist_failed",

  assetUploadIntentCreated: "backend.asset.upload_intent_created",
  assetUploadConfirmed: "backend.asset.upload_confirmed",

  magicPersistRequested: "backend.magic.persist_requested",
  magicPersisted: "backend.magic.persisted",
  magicValidationFailed: "backend.magic.validation_failed",

  publishValidationRequested: "backend.publish.validation_requested",
  publishPackageCreated: "backend.publish.package_created",
  publishPostPublished: "backend.publish.post_published",
  publishBlocked: "backend.publish.blocked",

  ledgerTransactionRequested: "backend.ledger.transaction_requested",
  ledgerTransactionCreated: "backend.ledger.transaction_created",
  ledgerTransactionRejected: "backend.ledger.transaction_rejected",

  verificationRequested: "backend.verification.requested",
  verificationCompleted: "backend.verification.completed",
  verificationRejected: "backend.verification.rejected",

  campaignPersisted: "backend.campaign.persisted",
  campaignActivated: "backend.campaign.activated",
  campaignRewardPaid: "backend.campaign.reward_paid",

  disputeCreated: "backend.dispute.created",
  disputeResolved: "backend.dispute.resolved",

  syncStarted: "backend.sync.started",
  syncCompleted: "backend.sync.completed",
  syncFailed: "backend.sync.failed",

  /** Stage 9 — mock-only connectivity ping from Studio UI (no network). */
  mockConnectionTest: "backend.connection.mock_test",
} as const;

export type StudioBackendEventType = (typeof STUDIO_BACKEND_EVENTS)[keyof typeof STUDIO_BACKEND_EVENTS];
