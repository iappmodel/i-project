import type { ReviewRuleSet } from "../../types/alphabet/review.types";

const highRiskSubjects = new Set([
  "withdrawal",
  "wallet",
  "ledger_entry",
  "content_safety",
  "content_rights",
  "creator_payout",
  "policy_check",
  "treasury",
  "grant",
  "user_account",
  "business_account",
  "creator_account"
]);

const paymentSubjects = new Set([
  "withdrawal",
  "wallet",
  "ledger_entry",
  "conversion",
  "creator_payout",
  "treasury"
]);

export const REVIEW_RULES: ReviewRuleSet[] = [
  "policy_check",
  "wallet",
  "ledger_entry",
  "reward",
  "conversion",
  "withdrawal",
  "campaign",
  "content_rights",
  "content_safety",
  "creator_payout",
  "treasury",
  "analytics_alert",
  "trust_score",
  "u_value",
  "user_account",
  "business_account",
  "creator_account",
  "grant",
  "system"
].map((subjectType) => {
  const highRisk = highRiskSubjects.has(subjectType);
  const payment = paymentSubjects.has(subjectType);

  return {
    subjectType: subjectType as ReviewRuleSet["subjectType"],

    defaultAllowedAppealLimit: highRisk ? 1 : 2,
    defaultSlaHours: highRisk ? 24 : 72,

    minEvidenceCompletenessScore: highRisk ? 0.75 : 0.55,
    minDecisionConfidenceScore: highRisk ? 0.75 : 0.6,
    minReviewerConfidenceScore: highRisk ? 0.75 : 0.6,
    minDecisionQualityScore: highRisk ? 0.75 : 0.6,
    minResolutionIntegrityScore: highRisk ? 0.78 : 0.6,

    maxRiskScoreForStandardReviewer: highRisk ? 0.28 : 0.45,
    maxSeverityScoreForStandardReviewer: highRisk ? 0.35 : 0.5,

    requireSpecialistForCritical: highRisk,
    requireSeniorForAppeal: highRisk,
    requireEvidencePacket: highRisk || payment,
    allowAppeal: subjectType !== "analytics_alert" && subjectType !== "system",
    allowSystemResolution:
      subjectType === "analytics_alert" ||
      subjectType === "system" ||
      subjectType === "reward",

    active: true
  };
});
