/**
 * Stage 31 — P.O.P.S rule & model versioning.
 * Bundles identify which scoring, fraud, reward, trust, wallet, campaign, and privacy
 * artifacts were active when a judgment was produced so replays and audits stay reproducible.
 */

export const POPS_RULE_TYPE = {
  SCORING_MODEL: "SCORING_MODEL",
  FRAUD_MODEL: "FRAUD_MODEL",
  REWARD_FORMULA: "REWARD_FORMULA",
  PRIVACY_POLICY: "PRIVACY_POLICY",
  TRUST_RULES: "TRUST_RULES",
  WALLET_RELEASE_RULES: "WALLET_RELEASE_RULES",
  CAMPAIGN_REQUIREMENTS: "CAMPAIGN_REQUIREMENTS",
  RETENTION_POLICY: "RETENTION_POLICY",
  CONSENT_POLICY: "CONSENT_POLICY",
  RULE_BUNDLE: "RULE_BUNDLE"
} as const;

export type PopsRuleType = (typeof POPS_RULE_TYPE)[keyof typeof POPS_RULE_TYPE];

/** Canonical version bundle attached to sessions / replays / audits. */
export interface PopsVersionBundle {
  scoringModelVersion: string;
  fraudModelVersion: string;
  rewardFormulaVersion: string;
  campaignRequirementVersion: string;
  privacyPolicyVersion: string;
  trustRuleVersion: string;
  walletRuleVersion: string;
  createdAt: string;
}

/** Versions that must be persisted on every P.O.P.S judgment row. */
export interface PopsJudgmentVersionFields {
  scoringModelVersion: string;
  fraudModelVersion: string;
  rewardFormulaVersion: string;
  ruleVersion: string;
  privacyPolicyVersion: string;
  campaignRequirementVersion: string;
}

/** Versions that must be persisted on every reward decision row. */
export interface PopsRewardDecisionVersionFields {
  rewardFormulaVersion: string;
  walletRuleVersion: string;
  campaignRequirementVersion: string;
}

/** Versions that must be persisted on every privacy receipt row. */
export interface PopsPrivacyReceiptVersionFields {
  privacyPolicyVersion: string;
  retentionPolicyVersion: string;
  consentPolicyVersion: string;
}

export type PopsRegionCode = "GLOBAL" | "US" | "EU" | "UK" | "BR" | string;

/** Inputs the resolver uses to pick active rule rows for a point in time. */
export interface PopsVersionResolverInput {
  sessionAt: string;
  campaignId?: string | null;
  region: PopsRegionCode;
  appVersion: string;
  featureFlags: Record<string, boolean | string | number>;
}

export interface PopsReplaySessionContext {
  userId: string;
  /** `PopsProofLevel` string, e.g. `LEVEL_2_ATTENTION`. */
  proofLevel: string;
  /** `PopsSessionState` string, e.g. `FOCUSED`. */
  state: string;
}

/** Snapshot aligned with `PopsScoringResult` for replay payloads (no runtime import cycle). */
export interface PopsReplayScoringSnapshot {
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  continuityConfidence: number;
  fraudRisk: number;
  reasonCodes: string[];
}

export interface PopsReplayJudgmentInput {
  sessionId: string;
  versionBundle: PopsVersionBundle;
  requestedBy: string;
  originalJudgmentId?: string | null;
  /** Original persisted judgment for diff-only comparison; never mutated by replay. */
  originalJudgment?: Record<string, unknown> | null;
  sessionContext: PopsReplaySessionContext;
}

export interface PopsReplayOutput {
  sessionId: string;
  versionBundle: PopsVersionBundle;
  scoringResult: PopsReplayScoringSnapshot;
  judgmentPreview: Record<string, unknown>;
  eventCount: number;
  signalBatchCount: number;
  replayedAt: string;
}

export interface PopsReplayDifferenceSummary {
  changedKeys: string[];
  notes: string[];
}

export interface PopsJudgmentReplayRecord {
  id: string;
  originalJudgmentId: string | null;
  sessionId: string;
  requestedBy: string;
  versionBundle: PopsVersionBundle;
  replayOutput: PopsReplayOutput;
  differenceSummary: PopsReplayDifferenceSummary | null;
  createdAt: string;
}

export interface PopsJudgmentReplayRepository {
  save(record: PopsJudgmentReplayRecord): Promise<void>;
}

export interface PopsRuleVersionRow {
  id: string;
  ruleType: PopsRuleType;
  version: string;
  description: string | null;
  configJson: Record<string, unknown> | null;
  activeFrom: string;
  activeUntil: string | null;
  createdBy: string | null;
  createdAt: string;
}
