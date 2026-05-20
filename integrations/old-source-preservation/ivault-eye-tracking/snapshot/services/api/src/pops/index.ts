export * from "./constants/pops.constants";
export * from "./state/pops-state-machine";
export * from "./types/pops.types";
export * from "./types/pops-events.types";
export * from "./types/pops-decisions.types";
export * from "./types/pops-privacy.types";
export * from "./services/pops-session.service";
export * from "./services/pops-event.service";
export * from "./services/pops-scoring.service";
export * from "./services/pops-decision.service";
export * from "./services/pops-privacy.service";
export * from "./wallet";
export * from "./economics";
export * from "./pricing";
export * from "./realworld";
export * from "./versioning";

import type { PopsJudgment, PopsRewardDecision } from "./types/pops-decisions.types";
import type { PopsPrivacyReceipt } from "./types/pops-privacy.types";

export interface PopsIntegrationHooks {
  onPopsJudgmentCreated(judgment: PopsJudgment): void | Promise<void>;
  onPopsRewardDecisionCreated(decision: PopsRewardDecision): void | Promise<void>;
  onPopsPrivacyReceiptCreated(receipt: PopsPrivacyReceipt): void | Promise<void>;
}

export const noopPopsIntegrationHooks: PopsIntegrationHooks = {
  onPopsJudgmentCreated: async () => undefined,
  onPopsRewardDecisionCreated: async () => undefined,
  onPopsPrivacyReceiptCreated: async () => undefined
};
