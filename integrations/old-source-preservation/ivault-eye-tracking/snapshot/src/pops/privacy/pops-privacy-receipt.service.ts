import { POPS_PRIVACY_POLICY_VERSION } from "../constants/pops.constants";
import type { PopsJudgment } from "../types/pops.types";
import type { PopsSession } from "../types/pops.types";
import type { PopsPrivacyReceipt, PopsRawDataType } from "../types/pops-privacy.types";
import { POPS_SIGNAL_CATEGORIES, POPS_STORED_FEATURE_TYPES } from "../types/pops-privacy.types";
import type { PopsRewardDecision } from "../types/pops-decisions.types";
import { getPopsPrivacySummary } from "./pops-privacy-copy";
import { createPopsId } from "../utils/pops-id";
import { addDaysIso, nowIso } from "../utils/pops-time";

const RAW_EMPTY: PopsRawDataType[] = [];

export function createPopsPrivacyReceipt(input: {
  session: PopsSession;
  judgment: PopsJudgment;
  rewardDecision: PopsRewardDecision;
}): PopsPrivacyReceipt {
  const { session, judgment, rewardDecision } = input;
  const createdAt = nowIso();
  const retentionExpiresAt = addDaysIso(createdAt, 90);
  const codes = rewardDecision.reasonCodes.join(", ");

  return {
    id: createPopsId("pops_receipt"),
    sessionId: session.id,
    judgmentId: judgment.id,
    rewardDecisionId: rewardDecision.id,
    userId: session.userId,
    sessionType: session.sessionType,
    proofLevel: session.proofLevel,
    signalCategoriesUsed: [...POPS_SIGNAL_CATEGORIES],
    rawDataTypesStored: RAW_EMPTY,
    storedFeatureTypes: [...POPS_STORED_FEATURE_TYPES],
    localProcessingUsed: true,
    rawDataDiscarded: true,
    retentionPolicy: "NINETY_DAYS",
    retentionExpiresAt,
    userVisibleSummary: getPopsPrivacySummary(rewardDecision.decisionStatus),
    internalSummary: `session=${session.id} decision=${rewardDecision.decisionStatus} reasons=[${codes}]`,
    policyVersion: POPS_PRIVACY_POLICY_VERSION,
    createdAt,
  };
}
