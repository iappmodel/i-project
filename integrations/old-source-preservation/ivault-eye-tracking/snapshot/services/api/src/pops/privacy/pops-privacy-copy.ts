import type { PopsJudgment } from "../types/pops-decisions.types";
import type { PopsRewardDecision } from "../rewards/pops-reward-decision.types";
import { POPS_REWARD_DECISION_STATUS } from "../rewards/pops-reward-decision.types";
import type { PopsSessionType } from "../types/pops.types";
import type { PopsSignalCategory } from "./pops-privacy-receipt.types";

const SIGNAL_LABEL: Record<PopsSignalCategory, string> = {
  SCREEN_ACTIVITY: "screen activity",
  CONTENT_PROGRESS: "content progress",
  TOUCH_BEHAVIOR: "touch rhythm",
  DEVICE_MOTION: "device motion",
  APP_STATE: "app state",
  VISUAL_PRESENCE: "visual presence",
  AUDIO_FEATURES: "audio features",
  LOCATION_CLASS: "location class",
  DEVICE_INTEGRITY: "device integrity",
  ACCOUNT_CONTINUITY: "account continuity",
  CAMPAIGN_RULES: "campaign rules",
  WALLET_RISK: "wallet risk checks",
  TRUST_HISTORY: "trust history"
};

function prettyList(values: string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function isVisualPresenceSession(sessionType: PopsSessionType): boolean {
  return (
    sessionType === "ACCOUNT_VERIFICATION" ||
    sessionType === "WITHDRAWAL_REVIEW" ||
    sessionType === "PURCHASE_INTENT"
  );
}

function isLocationSession(sessionType: PopsSessionType): boolean {
  return sessionType === "GPS_CHECK_IN" || sessionType === "NFC_MERCHANT";
}

export function buildUserVisibleSummary(params: {
  sessionType: PopsSessionType;
  signalCategoriesUsed: PopsSignalCategory[];
  rawDataTypesStored: readonly string[];
  judgment: PopsJudgment;
  rewardDecision: PopsRewardDecision | null;
}): string {
  const labels = params.signalCategoriesUsed.map((category) => SIGNAL_LABEL[category]);
  const hasRawData = params.rawDataTypesStored.length > 0;

  if (params.rewardDecision?.decision === POPS_REWARD_DECISION_STATUS.HELD) {
    return "Your reward was held because the session could not be fully verified. The system stored verification scores and reason codes for review.";
  }

  if (
    params.rewardDecision &&
    (params.rewardDecision.decision === POPS_REWARD_DECISION_STATUS.DENIED_LOW_CONFIDENCE ||
      params.rewardDecision.decision === POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK ||
      params.rewardDecision.decision === POPS_REWARD_DECISION_STATUS.DENIED_INELIGIBLE ||
      params.rewardDecision.decision === POPS_REWARD_DECISION_STATUS.DENIED_DUPLICATE ||
      params.rewardDecision.decision === POPS_REWARD_DECISION_STATUS.DENIED_EXPIRED)
  ) {
    return "This reward was not approved because the moment did not meet the required verification level.";
  }

  if (isLocationSession(params.sessionType)) {
    return hasRawData
      ? "P.O.P.S verified this visit using location class, session timing, and merchant confirmation. Precise location was retained only for campaign or compliance requirements."
      : "P.O.P.S verified this visit using location class, session timing, and merchant confirmation. Precise location was not retained unless required by the campaign.";
  }

  if (isVisualPresenceSession(params.sessionType)) {
    return hasRawData
      ? "P.O.P.S verified this moment using temporary visual presence signals. Raw camera frames were retained only for required fraud or compliance review."
      : "P.O.P.S verified this moment using temporary visual presence signals. Raw camera frames were not stored. Only verification scores were saved.";
  }

  const formattedSignals = prettyList(labels);
  return `P.O.P.S verified this moment using ${formattedSignals}. No raw camera or audio was stored.`;
}

export function buildInternalSummary(params: {
  sessionId: string;
  sessionType: PopsSessionType;
  proofLevel: string;
  signalCategoriesUsed: PopsSignalCategory[];
  rawDataTypesStored: readonly string[];
  localProcessingUsed: boolean;
  judgment: PopsJudgment;
  rewardDecision: PopsRewardDecision | null;
}): string {
  const decision = params.rewardDecision?.decision ?? params.judgment.rewardEligibility;
  return [
    `session=${params.sessionId}`,
    `type=${params.sessionType}`,
    `proof=${params.proofLevel}`,
    `decision=${decision}`,
    `signals=${params.signalCategoriesUsed.join("|")}`,
    `rawStored=${params.rawDataTypesStored.join("|") || "NONE"}`,
    `localProcessing=${params.localProcessingUsed ? "YES" : "NO"}`
  ].join("; ");
}

