import type { PopsEvent } from "../types/pops-events.types";
import type { PopsPrivacyReceipt } from "../types/pops-privacy.types";
import type { PopsRewardDecision, PopsWalletRewardIntent } from "../types/pops-decisions.types";
import type { PopsJudgment, PopsSession, PopsSessionAggregate, PopsSessionState } from "../types/pops.types";
import { buildLocalSponsoredWatchAggregate } from "../aggregation/pops-local-aggregate-builder";
import { scorePopsSponsoredWatch } from "../scoring/pops-scoring-model-v1";
import { createPopsRewardDecision } from "../rewards/pops-reward-decision.service";
import { createMockPopsWalletIntent } from "../rewards/pops-wallet-integration";
import { createPopsPrivacyReceipt } from "../privacy/pops-privacy-receipt.service";
import { nowIso } from "../utils/pops-time";

function finalSessionState(decisionStatus: PopsRewardDecision["decisionStatus"]): PopsSessionState {
  switch (decisionStatus) {
    case "APPROVED_FULL":
    case "APPROVED_PARTIAL":
      return "REWARD_PENDING";
    case "HELD":
      return "REWARD_HELD";
    default:
      return "REWARD_DENIED";
  }
}

/**
 * Pure local completion: aggregate → score → reward → wallet mock → privacy receipt.
 * No React, storage, or backend.
 */
export function runLocalPopsCompletionPipeline(input: {
  session: PopsSession;
  events: PopsEvent[];
  completedAt?: string;
  trustTier?: number;
}): {
  session: PopsSession;
  aggregate: PopsSessionAggregate;
  judgment: PopsJudgment;
  rewardDecision: PopsRewardDecision;
  walletIntent: PopsWalletRewardIntent | null;
  privacyReceipt: PopsPrivacyReceipt;
} {
  const endedAt = input.completedAt ?? nowIso();
  const endedSession: PopsSession = {
    ...input.session,
    state: "COMPLETING",
    endedAt,
  };

  const parsedEnd = Date.parse(endedAt);
  const referenceNowMs = Number.isFinite(parsedEnd) ? parsedEnd : Date.now();
  const aggregate = buildLocalSponsoredWatchAggregate({
    session: endedSession,
    events: input.events,
    referenceNowMs,
  });

  const judgment = scorePopsSponsoredWatch({
    session: endedSession,
    aggregate,
  });

  const rewardDecision = createPopsRewardDecision({
    session: endedSession,
    judgment,
    trustTier: input.trustTier,
  });

  const walletIntent = createMockPopsWalletIntent({
    session: endedSession,
    rewardDecision,
  });

  const privacyReceipt = createPopsPrivacyReceipt({
    session: endedSession,
    judgment,
    rewardDecision,
  });

  const state = finalSessionState(rewardDecision.decisionStatus);
  const session: PopsSession = {
    ...endedSession,
    state,
  };

  return { session, aggregate, judgment, rewardDecision, walletIntent, privacyReceipt };
}
