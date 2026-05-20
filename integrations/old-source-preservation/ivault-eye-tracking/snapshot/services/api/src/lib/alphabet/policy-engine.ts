import { POLICY_RULES } from "@/data/alphabet/policy-rules";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  PolicyDecisionResult,
  PolicyRuleSet,
  PolicySignalInput,
  PolicyStatus
} from "@/types/alphabet/policy.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: PolicySignalInput): PolicyRuleSet | undefined {
  return POLICY_RULES.find(
    (rule) => rule.active && rule.context === input.context
  );
}

function isUnder13(ageBand: PolicySignalInput["ageBand"]): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: PolicySignalInput["ageBand"]): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function isMinor(ageBand: PolicySignalInput["ageBand"]): boolean {
  return isUnder13(ageBand) || isTeen(ageBand);
}

function normalizedTrust(input: PolicySignalInput): number {
  return clamp(input.trustScore / 100);
}

function normalizedUValue(input: PolicySignalInput): number {
  return clamp(input.uValueScore / 100);
}

function calculateRiskScore(input: PolicySignalInput): number {
  return clamp(
    input.safetyRisk * 0.16 +
      input.financialRisk * 0.18 +
      input.privacyRisk * 0.16 +
      input.contentRisk * 0.12 +
      input.locationRisk * 0.12 +
      input.messagingRisk * 0.1 +
      input.laborRisk * 0.08 +
      input.identityRisk * 0.08
  );
}

function calculateAgeSafetyScore(
  input: PolicySignalInput,
  rule: PolicyRuleSet
): number {
  if (input.ageBand === "unknown") {
    return rule.allowUnknownAge ? 0.55 : 0.15;
  }

  if (isUnder13(input.ageBand)) {
    if (rule.allowUnder13) return input.guardianApproved ? 0.85 : 0.6;
    if (rule.guardianCanUnlockUnder13 && input.guardianApproved) return 0.65;
    if (rule.schoolCanUnlock && input.schoolApproved) return 0.65;
    return 0.1;
  }

  if (input.ageBand === "13_15") {
    if (rule.allow13To15) return input.guardianApproved ? 0.9 : 0.7;
    if (rule.guardianCanUnlockTeen && input.guardianApproved) return 0.65;
    if (rule.schoolCanUnlock && input.schoolApproved) return 0.65;
    return 0.2;
  }

  if (input.ageBand === "16_17") {
    if (rule.allow16To17) return input.guardianApproved ? 0.95 : 0.8;
    if (rule.guardianCanUnlockTeen && input.guardianApproved) return 0.7;
    if (rule.schoolCanUnlock && input.schoolApproved) return 0.7;
    return 0.25;
  }

  return 1;
}

function calculateRegionalComplianceScore(input: PolicySignalInput): number {
  if (input.regionRestricted) return 0;

  const complianceScore =
    input.complianceStatus === "clear"
      ? 1
      : input.complianceStatus === "pending_review" ||
          input.complianceStatus === "manual_review_required"
        ? 0.45
        : 0;

  const kycScore = input.regionRequiresKyc
    ? input.kycStatus === "verified"
      ? 1
      : input.kycStatus === "pending"
        ? 0.5
        : 0
    : 1;

  const taxScore = input.regionRequiresTaxProfile
    ? input.taxProfileStatus === "verified"
      ? 1
      : input.taxProfileStatus === "pending"
        ? 0.5
        : 0
    : 1;

  return clamp(complianceScore * 0.5 + kycScore * 0.3 + taxScore * 0.2);
}

function calculatePolicyEligibilityScore(
  input: PolicySignalInput,
  rule: PolicyRuleSet
): number {
  const trust = normalizedTrust(input);
  const uValue = normalizedUValue(input);
  const ageSafetyScore = calculateAgeSafetyScore(input, rule);
  const regionalComplianceScore = calculateRegionalComplianceScore(input);
  const riskScore = calculateRiskScore(input);

  const approvalBoost =
    (input.guardianApproved ? 0.05 : 0) +
    (input.schoolApproved ? 0.04 : 0) +
    (input.businessApproved ? 0.04 : 0);

  return clamp(
    trust * 0.2 +
      uValue * 0.1 +
      ageSafetyScore * 0.25 +
      regionalComplianceScore * 0.25 +
      (1 - riskScore) * 0.15 +
      approvalBoost
  );
}

function baseRestrictionFlags(input: PolicySignalInput, rule: PolicyRuleSet) {
  const minor = isMinor(input.ageBand) || input.ageBand === "unknown";

  return {
    restrictMonetization: minor && rule.restrictMonetizationForMinors,
    restrictMessaging: minor && rule.restrictMessagingForMinors,
    restrictWithdrawal: minor && rule.restrictWithdrawalsForMinors,
    restrictLocalPresence: minor && rule.restrictLocalPresenceForMinors,
    restrictContentExposure: minor && rule.restrictPublicExposureForMinors
  };
}

function decidePolicyStatus(params: {
  input: PolicySignalInput;
  rule: PolicyRuleSet;
  policyEligibilityScore: number;
  ageSafetyScore: number;
  regionalComplianceScore: number;
  riskScore: number;
  reasons: string[];
}): PolicyStatus {
  const {
    input,
    rule,
    policyEligibilityScore,
    ageSafetyScore,
    regionalComplianceScore,
    riskScore,
    reasons
  } = params;

  if (input.regionRestricted) {
    reasons.push("region_restricted");
    return "blocked_region";
  }

  if (
    input.complianceStatus === "blocked" ||
    input.complianceStatus === "sanctions_match" ||
    input.complianceStatus === "region_blocked"
  ) {
    reasons.push("compliance_status_blocked");
    return "blocked_compliance";
  }

  if (input.ageBand === "unknown" && !rule.allowUnknownAge) {
    reasons.push("unknown_age_not_allowed");
    return "blocked_age";
  }

  if (isUnder13(input.ageBand) && !rule.allowUnder13) {
    if (rule.guardianCanUnlockUnder13 && input.guardianApproved) {
      reasons.push("under_13_allowed_with_guardian");
      return "allowed_with_guardian";
    }

    if (rule.schoolCanUnlock && input.schoolApproved) {
      reasons.push("under_13_allowed_with_school");
      return "allowed_with_limits";
    }

    reasons.push("under_13_not_allowed");
    return "blocked_age";
  }

  if (input.ageBand === "13_15" && !rule.allow13To15) {
    if (rule.guardianCanUnlockTeen && input.guardianApproved) {
      reasons.push("teen_allowed_with_guardian");
      return "allowed_with_guardian";
    }

    if (rule.schoolCanUnlock && input.schoolApproved) {
      reasons.push("teen_allowed_with_school");
      return "allowed_with_limits";
    }

    reasons.push("age_13_15_not_allowed");
    return "blocked_age";
  }

  if (input.ageBand === "16_17" && !rule.allow16To17) {
    if (rule.guardianCanUnlockTeen && input.guardianApproved) {
      reasons.push("teen_allowed_with_guardian");
      return "allowed_with_guardian";
    }

    if (rule.schoolCanUnlock && input.schoolApproved) {
      reasons.push("teen_allowed_with_school");
      return "allowed_with_limits";
    }

    reasons.push("age_16_17_not_allowed");
    return "blocked_age";
  }

  if (
    isMinor(input.ageBand) &&
    input.regionRequiresGuardianForMinors &&
    !input.guardianApproved
  ) {
    reasons.push("region_requires_guardian_for_minor");
    return "requires_review";
  }

  if (rule.requiresComplianceClear && input.complianceStatus !== "clear") {
    reasons.push("compliance_clear_required");
    return "requires_review";
  }

  if (rule.requiresKyc && input.kycStatus !== "verified") {
    reasons.push("kyc_required");
    return "requires_review";
  }

  if (rule.requiresTaxProfile && input.taxProfileStatus !== "verified") {
    reasons.push("tax_profile_required");
    return "requires_review";
  }

  if (input.trustScore < rule.minTrustScore) {
    reasons.push("trust_score_below_minimum");
    return "requires_review";
  }

  if (input.uValueScore < rule.minUValueScore) {
    reasons.push("u_value_below_minimum");
    return "requires_review";
  }

  if (input.safetyRisk > rule.maxSafetyRisk) {
    reasons.push("safety_risk_above_maximum");
    return "blocked_risk";
  }

  if (input.financialRisk > rule.maxFinancialRisk) {
    reasons.push("financial_risk_above_maximum");
    return "blocked_risk";
  }

  if (input.privacyRisk > rule.maxPrivacyRisk) {
    reasons.push("privacy_risk_above_maximum");
    return "blocked_risk";
  }

  if (input.contentRisk > rule.maxContentRisk) {
    reasons.push("content_risk_above_maximum");
    return "blocked_risk";
  }

  if (input.locationRisk > rule.maxLocationRisk) {
    reasons.push("location_risk_above_maximum");
    return "blocked_risk";
  }

  if (input.messagingRisk > rule.maxMessagingRisk) {
    reasons.push("messaging_risk_above_maximum");
    return "blocked_risk";
  }

  if (input.laborRisk > rule.maxLaborRisk) {
    reasons.push("labor_risk_above_maximum");
    return "blocked_risk";
  }

  if (input.identityRisk > rule.maxIdentityRisk) {
    reasons.push("identity_risk_above_maximum");
    return "blocked_risk";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.7 ? "blocked_risk" : "requires_review";
  }

  if (ageSafetyScore < rule.minAgeSafetyScore) {
    reasons.push("age_safety_score_below_minimum");
    return "requires_review";
  }

  if (regionalComplianceScore < rule.minRegionalComplianceScore) {
    reasons.push("regional_compliance_score_below_minimum");
    return "requires_review";
  }

  if (policyEligibilityScore < rule.minPolicyEligibilityScore) {
    reasons.push("policy_eligibility_below_minimum");
    return "requires_review";
  }

  const restrictions = baseRestrictionFlags(input, rule);

  if (
    restrictions.restrictMonetization ||
    restrictions.restrictMessaging ||
    restrictions.restrictWithdrawal ||
    restrictions.restrictLocalPresence ||
    restrictions.restrictContentExposure
  ) {
    reasons.push("allowed_with_minor_limits");
    return "allowed_with_limits";
  }

  reasons.push("allowed");
  return "allowed";
}

function flagsFromStatus(params: {
  input: PolicySignalInput;
  rule: PolicyRuleSet;
  status: PolicyStatus;
}) {
  const { input, rule, status } = params;
  const restrictions = baseRestrictionFlags(input, rule);

  const blocked =
    status === "blocked_age" ||
    status === "blocked_region" ||
    status === "blocked_compliance" ||
    status === "blocked_risk";

  return {
    allowAction:
      status === "allowed" ||
      status === "allowed_with_guardian" ||
      status === "allowed_with_limits",
    requireGuardian:
      status === "allowed_with_guardian" ||
      (isMinor(input.ageBand) &&
        input.regionRequiresGuardianForMinors &&
        !input.guardianApproved),
    requireKyc: rule.requiresKyc && input.kycStatus !== "verified",
    requireTaxProfile:
      rule.requiresTaxProfile && input.taxProfileStatus !== "verified",
    requireReview: status === "requires_review",
    restrictMonetization: restrictions.restrictMonetization,
    restrictMessaging: restrictions.restrictMessaging,
    restrictWithdrawal:
      restrictions.restrictWithdrawal || status === "blocked_compliance",
    restrictLocalPresence: restrictions.restrictLocalPresence,
    restrictContentExposure: restrictions.restrictContentExposure,
    blockAction: blocked
  };
}

function createPolicyAlphabetEvent(params: {
  input: PolicySignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: "J",
    eventType: params.eventType,
    objectType: "policy_check",
    objectId: params.input.policyCheckId,
    sourceContext: "system",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: params.input.trustScore,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      policyCheckId: params.input.policyCheckId,
      context: params.input.context,
      actionType: params.input.actionType,
      riskCategory: params.input.riskCategory,
      ageBand: params.input.ageBand,
      userRole: params.input.userRole,
      region: params.input.region,
      countryCode: params.input.countryCode,
      guardianApproved: params.input.guardianApproved,
      schoolApproved: params.input.schoolApproved,
      businessApproved: params.input.businessApproved,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluatePolicy(input: PolicySignalInput): PolicyDecisionResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  if (!rule) {
    reasons.push("no_active_policy_rule");

    const riskScore = calculateRiskScore(input);

    const policyCheckCreatedEvent = createPolicyAlphabetEvent({
      input,
      eventType: "policy_check_created",
      rawScore: 0,
      qualityScore: 0,
      riskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      policyCheckId: input.policyCheckId,
      userId: input.userId,
      status: "requires_review",
      policyEligibilityScore: 0,
      ageSafetyScore: 0,
      regionalComplianceScore: 0,
      riskScore,
      allowAction: false,
      requireGuardian: false,
      requireKyc: false,
      requireTaxProfile: false,
      requireReview: true,
      restrictMonetization: true,
      restrictMessaging: true,
      restrictWithdrawal: true,
      restrictLocalPresence: true,
      restrictContentExposure: true,
      blockAction: false,
      reasons,
      policyCheckCreatedEvent,
      policyAllowedEvent: null,
      policyLimitedEvent: null,
      policyReviewRequiredEvent: policyCheckCreatedEvent,
      policyBlockedEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const ageSafetyScore = calculateAgeSafetyScore(input, rule);
  const regionalComplianceScore = calculateRegionalComplianceScore(input);
  const riskScore = calculateRiskScore(input);
  const policyEligibilityScore = calculatePolicyEligibilityScore(input, rule);

  const status = decidePolicyStatus({
    input,
    rule,
    policyEligibilityScore,
    ageSafetyScore,
    regionalComplianceScore,
    riskScore,
    reasons
  });

  const flags = flagsFromStatus({ input, rule, status });

  const verificationStatus =
    status === "allowed" ||
    status === "allowed_with_guardian" ||
    status === "allowed_with_limits"
      ? "verified"
      : "rejected";

  const policyCheckCreatedEvent = createPolicyAlphabetEvent({
    input,
    eventType: "policy_check_created",
    rawScore: policyEligibilityScore,
    qualityScore: ageSafetyScore,
    riskScore,
    verificationStatus,
    metadata: {
      status,
      flags,
      reasons
    }
  });

  const policyAllowedEvent =
    status === "allowed" || status === "allowed_with_guardian"
      ? createPolicyAlphabetEvent({
          input,
          eventType: "policy_allowed",
          rawScore: policyEligibilityScore,
          qualityScore: ageSafetyScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            flags,
            reasons
          }
        })
      : null;

  const policyLimitedEvent =
    status === "allowed_with_limits"
      ? createPolicyAlphabetEvent({
          input,
          eventType: "policy_limited",
          rawScore: policyEligibilityScore,
          qualityScore: ageSafetyScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            flags,
            reasons
          }
        })
      : null;

  const policyReviewRequiredEvent =
    status === "requires_review"
      ? createPolicyAlphabetEvent({
          input,
          eventType: "policy_review_required",
          rawScore: policyEligibilityScore,
          qualityScore: ageSafetyScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            flags,
            reasons
          }
        })
      : null;

  const policyBlockedEvent =
    status === "blocked_age" ||
    status === "blocked_region" ||
    status === "blocked_compliance" ||
    status === "blocked_risk"
      ? createPolicyAlphabetEvent({
          input,
          eventType: "policy_blocked",
          rawScore: policyEligibilityScore,
          qualityScore: ageSafetyScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            flags,
            reasons
          }
        })
      : null;

  return {
    policyCheckId: input.policyCheckId,
    userId: input.userId,
    status,
    policyEligibilityScore,
    ageSafetyScore,
    regionalComplianceScore,
    riskScore,
    ...flags,
    reasons,
    policyCheckCreatedEvent,
    policyAllowedEvent,
    policyLimitedEvent,
    policyReviewRequiredEvent,
    policyBlockedEvent,
    metadata: {
      ruleContext: rule.context,
      ...input.metadata
    }
  };
}
