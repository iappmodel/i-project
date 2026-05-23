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
