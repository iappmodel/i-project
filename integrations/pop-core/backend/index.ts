export * from "./types/pops.types.js";
export * from "./types/pops-decisions.types.js";

export { POPS_PROOF_THRESHOLDS, POPS_DEFAULT_SCORING_WEIGHTS } from "./scoring/pops.constants.js";
export { PopsScoringService } from "./scoring/pops-scoring.service.js";

export { PopsDecisionService } from "./decisions/pops-decision.service.js";

export {
  POPS_SCORING_ENGINE_V1,
  POPS_FRAUD_ENGINE_V1,
  POPS_REGISTERED_MODELS
} from "./decisions/versioning/pops-model-registry.js";
export {
  POPS_RULE_BUNDLE_V1,
  POPS_REGISTERED_RULES,
  popsRuleById
} from "./decisions/versioning/pops-rule-registry.js";
export {
  resolvePopsVersionBundle,
  resolveJudgmentRuleVersion,
  bundleToJudgmentVersionFields,
  bundleToRewardVersionFields,
  bundleToPrivacyReceiptVersionFields
} from "./decisions/versioning/pops-version-resolver.js";
export type {
  PopsVersionBundle,
  PopsVersionResolverInput,
  PopsJudgmentVersionFields
} from "./decisions/versioning/pops-version.types.js";

export * from "./types/proof-packet-v0.types.js";

export {
  proofPacketV0ToPopsSignalBatch,
  proofPacketV0ToDecisionInput
} from "./adapters/proof-packet-v0-to-pops.js";
export {
  popsDecisionToProofReview,
  eligibilityToLifecycleEventType,
  popsRewardEligibilityToProofReviewStatus,
  proofReviewStatusToPopsRewardEligibility
} from "./adapters/proof-review-status-map.js";

export {
  projectProofPacketReview,
  type ProofReviewProjectorOptions,
  type ProofReviewProjectionResult
} from "./review/proof-review-projector.js";

export {
  InMemoryProofReviewStore,
  ProofReviewConflictError,
  type ProofReviewRecord,
  type ProofReviewStore
} from "./review/proof-review-store.js";

export {
  JsonFileProofReviewStore,
  ProofReviewInvalidSessionIdError,
  ProofReviewStoreReadError,
  assertFilesystemSafeSessionId,
  type JsonFileProofReviewStoreOptions
} from "./review/persistence/json-file-proof-review-store.js";
export {
  PROOF_REVIEW_RECORD_STORAGE_VERSION,
  ProofReviewRecordStorageError,
  fromStoredRecord,
  toStoredRecord,
  type ProofReviewStoredRecordV1
} from "./review/persistence/proof-review-record-serializer.js";

export {
  ProofReviewService,
  ProofReviewNonPendingSubmissionError,
  ProofReviewProjectionMismatchError,
  type ProofReviewSubmitOptions
} from "./review/proof-review-service.js";

export { lifecycleEventFromDecision } from "./review/proof-review-lifecycle.js";
export {
  PROOF_REVIEW_LIFECYCLE_EVENT,
  type ProofReviewLifecycleEvent,
  type ProofReviewLifecycleEventType,
  type AuthorityReviewCompletedEvent,
  type AuthorityReviewDeferredEvent,
  type ManualReviewCompletedEvent,
  type PacketEmittedEvent
} from "./review/proof-review-lifecycle.types.js";
export {
  ProofReviewInvalidTransitionError,
  ProofReviewStateMachine,
  type ProofReviewTransitionResult
} from "./review/proof-review-state-machine.js";

export {
  toReviewAudit,
  type CreatePendingHoldOutcome,
  type CreatePendingHoldResult,
  type PendingHoldRecord,
  type PendingHoldReleaseStatus,
  type PendingHoldReviewAudit,
  type PendingHoldSkipReason,
  type PendingHoldStatus
} from "./settlement/pending-hold.js";

export {
  InMemoryPendingHoldStore,
  PendingHoldConflictError,
  type PendingHoldStore
} from "./settlement/pending-hold-store.js";

export {
  JsonFilePendingHoldStore,
  PendingHoldInvalidSessionIdError,
  PendingHoldStoreReadError,
  assertFilesystemSafeSessionId as assertFilesystemSafePendingHoldSessionId,
  type JsonFilePendingHoldStoreOptions
} from "./settlement/persistence/json-file-pending-hold-store.js";
export {
  PENDING_HOLD_RECORD_STORAGE_VERSION,
  PendingHoldRecordStorageError,
  fromStoredRecord as fromStoredPendingHoldRecord,
  toStoredRecord as toStoredPendingHoldRecord,
  type PendingHoldStoredRecordV1
} from "./settlement/persistence/pending-hold-record-serializer.js";

export {
  PendingHoldService,
  createPendingHoldFromReview,
  type CreatePendingHoldOptions
} from "./settlement/pending-hold-service.js";

export {
  POP_TRUST_TIERS,
  DEFAULT_RELEASE_DELAY_SECONDS_BY_TIER,
  isPopTrustTier,
  resolveTrustTier,
  releaseDelaySecondsForTier,
  isAutoSettleEligibleTier,
  computeReleaseEligibleAtForTier,
  canServerAutoSettleNowForTier,
  readReleaseDelaySecondsByTier,
  type PopTrustTier
} from "./settlement/trust-tier.js";
export {
  createAppealHoldFromReview,
  APPEAL_PLACEHOLDER_AMOUNT_MINOR,
  type AppealHoldOptions
} from "./settlement/appeal-hold-service.js";

export {
  PENDING_HOLD_RELEASE_ELIGIBILITY_REASON,
  PendingHoldReleaseEligibilityError,
  assertReleaseEligible,
  isReleaseAmountConsistent,
  isReleaseEligible,
  type PendingHoldReleaseEligibilityReason
} from "./settlement/pending-hold-release-eligibility.js";
export {
  projectPendingHoldReleaseTransition,
  releaseApprovedEvent,
  releaseBlockedEvent,
  releaseCancelledEvent,
  releaseCompletedEvent,
  type PendingHoldReleaseEventOptions
} from "./settlement/pending-hold-release-lifecycle.js";
export {
  PENDING_HOLD_RELEASE_LIFECYCLE_EVENT,
  type HoldCreatedEvent,
  type PendingHoldReleaseLifecycleEvent,
  type PendingHoldReleaseLifecycleEventType,
  type PendingHoldReleaseState,
  type ReleaseApprovedEvent,
  type ReleaseBlockedEvent,
  type ReleaseCancelledEvent,
  type ReleaseCompletedEvent
} from "./settlement/pending-hold-release-lifecycle.types.js";
export {
  PendingHoldReleaseInvalidTransitionError,
  PendingHoldReleaseStateMachine,
  type PendingHoldReleaseTransitionResult
} from "./settlement/pending-hold-release-state-machine.js";

export {
  RELEASE_EXECUTION_BOUNDARY_V1,
  buildReleaseExecutionRecord,
  deriveReleaseExecutionRef,
  releaseStateFromExecutionRecord,
  type BuildReleaseExecutionRecordInput,
  type ReleaseExecutionBoundaryVersion,
  type ReleaseExecutionRecord
} from "./settlement/release-execution.js";
export {
  InMemoryReleaseExecutionStore,
  ReleaseExecutionConflictError,
  type ReleaseExecutionStore
} from "./settlement/release-execution-store.js";
export {
  ReleaseExecutionService,
  executePendingHoldRelease,
  type ExecutePendingHoldReleaseOptions,
  type ExecutePendingHoldReleaseOutcome,
  type ExecutePendingHoldReleaseResult,
  type ReleaseExecutionSkipReason
} from "./settlement/release-execution-service.js";

export {
  LEDGER_BOUNDARY_V1,
  buildLedgerCreditEntryFromReleaseExecution,
  deriveLedgerEntryId,
  type BuildLedgerCreditEntryOptions,
  type LedgerBoundaryVersion,
  type LedgerEntry,
  type LedgerEntryDirection,
  type LedgerEntryStatus,
  type LedgerEntryType
} from "./settlement/ledger-entry.js";
export {
  InMemoryLedgerEntryStore,
  LedgerEntryConflictError,
  type LedgerEntryStore
} from "./settlement/ledger-entry-store.js";
export {
  LedgerEntryService,
  postLedgerCreditFromReleaseExecution,
  type PostLedgerCreditFromReleaseExecutionOptions,
  type PostLedgerCreditFromReleaseExecutionResult,
  type PostLedgerCreditOutcome
} from "./settlement/ledger-entry-service.js";

export {
  WALLET_BOUNDARY_V1,
  buildWalletCreditFromLedgerEntry,
  deriveWalletCreditId,
  type BuildWalletCreditFromLedgerEntryOptions,
  type WalletBoundaryVersion,
  type WalletCreditRecord,
  type WalletOwnerResolutionSource
} from "./settlement/wallet-credit.js";
export {
  InMemoryWalletCreditStore,
  WalletCreditConflictError,
  type WalletCreditStore
} from "./settlement/wallet-credit-store.js";
export {
  WalletCreditService,
  WalletOwnerNotFoundError,
  applyWalletCreditFromLedgerEntry,
  type ApplyWalletCreditFromLedgerEntryOptions,
  type ApplyWalletCreditFromLedgerEntryResult,
  type ApplyWalletCreditOutcome
} from "./settlement/wallet-credit-service.js";
export {
  createHoldReviewWalletOwnerResolver,
  resolveWalletOwnerRef,
  type WalletOwnerIdentity,
  type WalletOwnerResolver
} from "./settlement/wallet-owner-resolver.js";
export {
  computeWalletAvailableBalance,
  type WalletBalanceSnapshot
} from "./settlement/wallet-balance.js";

export {
  POP_VALUE_FLOW_V1,
  PopValueFlowSkippedError,
  createDefaultPopValueFlowStores,
  runPopValueFlow,
  type PopValueFlowOptions,
  type PopValueFlowResult,
  type PopValueFlowStageOutcomes,
  type PopValueFlowStores,
  type PopValueFlowVersion
} from "./pipeline/pop-value-flow.js";

export {
  SETTLEMENT_AMOUNT_POLICY_V1,
  SETTLEMENT_APPROVED_MULTIPLIER_V1,
  SETTLEMENT_PARTIAL_MULTIPLIER_V1,
  SETTLEMENT_CURRENCY_V1,
  type SettlementCurrency
} from "./settlement/settlement-amount.constants.js";
export type {
  SettlementAmountBreakdown,
  SettlementAmountInput,
  SettlementAmountResult
} from "./settlement/settlement-amount.types.js";
export { computeSettlementAmount } from "./settlement/settlement-amount-policy.js";
export {
  DEFAULT_FIXTURE_BASE_REWARD_MINOR,
  DEFAULT_FIXTURE_OFFER_ID,
  DEFAULT_FIXTURE_OFFER_SETTLEMENT_TERMS,
  InMemoryOfferSettlementTermsProvider,
  createDefaultOfferSettlementTermsProvider,
  type OfferSettlementTerms,
  type OfferSettlementTermsProvider
} from "./settlement/offer-settlement-terms.js";
