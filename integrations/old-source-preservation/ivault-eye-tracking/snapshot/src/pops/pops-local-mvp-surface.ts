/**
 * Disciplined public surface for the local sponsored-watch MVP (Stage 138).
 * Prefer importing from this module for demo / product slice; the root `index.ts`
 * barrel still exposes legacy modules for older paths.
 */

export * from "./types/pops.types";
export * from "./types/pops-events.types";
export * from "./types/pops-decisions.types";
export * from "./types/pops-privacy.types";

export * from "./constants/pops.constants";
export * from "./constants/pops-reason-codes";

export { runLocalPopsCompletionPipeline } from "./orchestrator/pops-local-completion-pipeline";
export {
  runAllPopsManualScenarios,
  runCleanPopsScenario,
  runPartialPopsScenario,
  runBackgroundFraudPopsScenario,
  runImpossibleCompletionPopsScenario,
  runDeviceWarningPopsScenario,
} from "./tests/pops-manual-scenarios";
export { scorePopsSponsoredWatch } from "./scoring/pops-scoring-model-v1";
export { createPopsRewardDecision } from "./rewards/pops-reward-decision.service";
export { createPopsPrivacyReceipt } from "./privacy/pops-privacy-receipt.service";

export { usePopsSession } from "./hooks/usePopsSession";

export { PopsStatusChip } from "./ui/PopsStatusChip";
export { PopsRewardProgress } from "./ui/PopsRewardProgress";
export { PopsMomentVerified } from "./ui/PopsMomentVerified";
export { PopsPrivacyReceiptCard } from "./ui/PopsPrivacyReceiptCard";

export { PopsSponsoredWatchDemo } from "./demo/PopsSponsoredWatchDemo";
