import {
  buildSyntheticBackgroundFraud,
  buildSyntheticCleanFullWatch,
  buildSyntheticDeviceWarning,
  buildSyntheticImpossibleFast,
  buildSyntheticPartialWatch,
} from "../fixtures/pops-sponsored-watch-synthetic";
import { runLocalPopsCompletionPipeline } from "../orchestrator/pops-local-completion-pipeline";
import type { PopsEvent } from "../types/pops-events.types";
import type { PopsPrivacyReceipt } from "../types/pops-privacy.types";
import type { PopsRewardDecision, PopsWalletRewardIntent } from "../types/pops-decisions.types";
import type { PopsJudgment, PopsSession, PopsSessionAggregate } from "../types/pops.types";
import { makePopsSession } from "./pops-test-builders";

export type PopsManualScenarioOutput = {
  session: PopsSession;
  aggregate: PopsSessionAggregate;
  judgment: PopsJudgment;
  rewardDecision: PopsRewardDecision;
  walletIntent: PopsWalletRewardIntent | null;
  privacyReceipt: PopsPrivacyReceipt;
};

function runPipeline(session: PopsSession, events: PopsEvent[], completedAt: string): PopsManualScenarioOutput {
  const out = runLocalPopsCompletionPipeline({
    session,
    events,
    completedAt,
    trustTier: 2,
  });
  return {
    session: out.session,
    aggregate: out.aggregate,
    judgment: out.judgment,
    rewardDecision: out.rewardDecision,
    walletIntent: out.walletIntent,
    privacyReceipt: out.privacyReceipt,
  };
}

export function runCleanPopsScenario(): PopsManualScenarioOutput {
  const session = makePopsSession();
  const { events, completedAt } = buildSyntheticCleanFullWatch(session);
  const out = runPipeline(session, events, completedAt);
  if (out.rewardDecision.decisionStatus !== "APPROVED_FULL") {
    throw new Error(`runCleanPopsScenario: expected APPROVED_FULL, got ${out.rewardDecision.decisionStatus}`);
  }
  if (out.walletIntent?.status !== "PENDING") {
    throw new Error(`runCleanPopsScenario: expected wallet PENDING, got ${out.walletIntent?.status ?? "null"}`);
  }
  if (!out.privacyReceipt) {
    throw new Error("runCleanPopsScenario: expected privacy receipt");
  }
  return out;
}

export function runPartialPopsScenario(): PopsManualScenarioOutput {
  const session = makePopsSession();
  const { events, completedAt } = buildSyntheticPartialWatch(session);
  const out = runPipeline(session, events, completedAt);
  if (out.rewardDecision.decisionStatus === "APPROVED_FULL") {
    throw new Error("runPartialPopsScenario: must not be APPROVED_FULL");
  }
  if (!out.privacyReceipt) {
    throw new Error("runPartialPopsScenario: expected privacy receipt");
  }
  return out;
}

export function runBackgroundFraudPopsScenario(): PopsManualScenarioOutput {
  const session = makePopsSession();
  const { events, completedAt } = buildSyntheticBackgroundFraud(session);
  const out = runPipeline(session, events, completedAt);
  const ok = out.rewardDecision.decisionStatus === "HELD" || out.rewardDecision.decisionStatus === "DENIED_FRAUD_RISK";
  if (!ok) {
    throw new Error(`runBackgroundFraudPopsScenario: expected HELD or DENIED_FRAUD_RISK, got ${out.rewardDecision.decisionStatus}`);
  }
  if (out.rewardDecision.decisionStatus === "APPROVED_FULL") {
    throw new Error("runBackgroundFraudPopsScenario: must not be APPROVED_FULL");
  }
  if (!out.privacyReceipt) {
    throw new Error("runBackgroundFraudPopsScenario: expected privacy receipt");
  }
  return out;
}

export function runImpossibleCompletionPopsScenario(): PopsManualScenarioOutput {
  const session = makePopsSession();
  const { events, completedAt } = buildSyntheticImpossibleFast(session);
  const out = runPipeline(session, events, completedAt);
  if (out.rewardDecision.decisionStatus !== "DENIED_FRAUD_RISK") {
    throw new Error(`runImpossibleCompletionPopsScenario: expected DENIED_FRAUD_RISK, got ${out.rewardDecision.decisionStatus}`);
  }
  if (out.walletIntent != null) {
    throw new Error("runImpossibleCompletionPopsScenario: expected no wallet intent");
  }
  if (!out.privacyReceipt) {
    throw new Error("runImpossibleCompletionPopsScenario: expected privacy receipt");
  }
  return out;
}

export function runDeviceWarningPopsScenario(): PopsManualScenarioOutput {
  const session = makePopsSession();
  const { events, completedAt } = buildSyntheticDeviceWarning(session);
  const out = runPipeline(session, events, completedAt);
  const d = out.rewardDecision.decisionStatus;
  const ok = d === "HELD" || d === "DENIED_FRAUD_RISK" || d === "DENIED_LOW_CONFIDENCE";
  if (!ok) {
    throw new Error(`runDeviceWarningPopsScenario: expected HELD, DENIED_FRAUD_RISK, or DENIED_LOW_CONFIDENCE, got ${d}`);
  }
  if (!out.privacyReceipt) {
    throw new Error("runDeviceWarningPopsScenario: expected privacy receipt");
  }
  return out;
}

export function runAllPopsManualScenarios(): {
  clean: PopsManualScenarioOutput;
  partial: PopsManualScenarioOutput;
  backgroundFraud: PopsManualScenarioOutput;
  impossible: PopsManualScenarioOutput;
  deviceWarning: PopsManualScenarioOutput;
} {
  const clean = runCleanPopsScenario();
  if (clean.rewardDecision.decisionStatus !== "APPROVED_FULL") {
    throw new Error(`runAllPopsManualScenarios: clean full expected APPROVED_FULL, got ${clean.rewardDecision.decisionStatus}`);
  }
  if (clean.walletIntent?.status !== "PENDING") {
    throw new Error(`runAllPopsManualScenarios: clean full expected wallet PENDING, got ${clean.walletIntent?.status ?? "null"}`);
  }
  if (!clean.privacyReceipt) {
    throw new Error("runAllPopsManualScenarios: clean full expected privacy receipt");
  }

  const partial = runPartialPopsScenario();

  const backgroundFraud = runBackgroundFraudPopsScenario();
  if (backgroundFraud.rewardDecision.decisionStatus === "APPROVED_FULL") {
    throw new Error("runAllPopsManualScenarios: background fraud must not be APPROVED_FULL");
  }

  const impossible = runImpossibleCompletionPopsScenario();
  if (impossible.rewardDecision.decisionStatus !== "DENIED_FRAUD_RISK") {
    throw new Error(`runAllPopsManualScenarios: impossible fast expected DENIED_FRAUD_RISK, got ${impossible.rewardDecision.decisionStatus}`);
  }

  const deviceWarning = runDeviceWarningPopsScenario();

  return { clean, partial, backgroundFraud, impossible, deviceWarning };
}
