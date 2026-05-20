import {
  DEFAULT_POLICY_ORCHESTRATOR_RULE,
  POLICY_ORCHESTRATOR_RULES
} from "../../data/alphabet/policy-orchestrator-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  PolicyDecision,
  PolicyDownstreamInstruction,
  PolicyGateName,
  PolicyGateResult,
  PolicyOrchestratorEvaluationResult,
  PolicyOrchestratorRuleSet,
  PolicyOrchestratorSignalInput,
  PolicyOutcomeStatus
} from "../../types/alphabet/policy-orchestrator.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: PolicyOrchestratorSignalInput): PolicyOrchestratorRuleSet {
  return (
    POLICY_ORCHESTRATOR_RULES.find(
      (rule) => rule.active && rule.actionType === input.actionType
    ) ?? DEFAULT_POLICY_ORCHESTRATOR_RULE
  );
}

function calculateOverallPolicyRiskScore(input: PolicyOrchestratorSignalInput): number {
  const r = input.riskSignals;

  const risk =
    clamp(r.ageRisk) * 0.13 +
    clamp(r.safetyRisk) * 0.16 +
    clamp(r.rightsRisk) * 0.12 +
    clamp(r.fraudRisk) * 0.14 +
    clamp(r.paymentRisk) * 0.12 +
    clamp(r.treasuryRisk) * 0.1 +
    clamp(r.privacyRisk) * 0.1 +
    clamp(r.complianceRisk) * 0.16 +
    clamp(r.reputationRisk) * 0.07;

  const failedGatePenalty =
    input.gateResults.filter((gate) => gate.decision === "fail").length * 0.06;

  const hardBlockPenalty = input.gateResults.some((gate) => gate.hardBlock)
    ? 0.18
    : 0;

  return clamp(risk + failedGatePenalty + hardBlockPenalty);
}

function calculateGatePassScore(
  input: PolicyOrchestratorSignalInput,
  rule: PolicyOrchestratorRuleSet
): number {
  const relevantGates = rule.requiredGates.map((gateName) =>
    input.gateResults.find((gate) => gate.gateName === gateName)
  );

  if (relevantGates.length === 0) return 1;

  const score =
    relevantGates.reduce((sum, gate) => {
      if (!gate) return sum;

      const decisionScore = {
        pass: 1,
        limited: 0.7,
        hold: 0.45,
        required: 0.35,
        fail: 0,
        skipped: 0.25
      }[gate.decision];

      return sum + decisionScore * 0.65 + clamp(gate.score) * 0.35;
    }, 0) / relevantGates.length;

  return clamp(score);
}

function calculateUserEligibilityScore(
  input: PolicyOrchestratorSignalInput,
  rule: PolicyOrchestratorRuleSet
): number {
  const trustComponent = clamp(input.trustScore / 100);
  const uValueComponent = clamp(input.uValueScore / 100);
  const ageComponent = input.ageBand === "unknown" && rule.blockUnknownAge ? 0 : 1;
  const riskComponent = 1 - calculateOverallPolicyRiskScore(input);

  return clamp(
    trustComponent * 0.35 +
      uValueComponent * 0.2 +
      ageComponent * 0.2 +
      riskComponent * 0.25
  );
}

function calculateActionSafetyScore(
  input: PolicyOrchestratorSignalInput,
  rule: PolicyOrchestratorRuleSet
): number {
  const gateScore = calculateGatePassScore(input, rule);
  const riskScore = calculateOverallPolicyRiskScore(input);
  const userScore = calculateUserEligibilityScore(input, rule);

  const sensitivityPenalty =
    (rule.sensitiveAction ? 0.04 : 0) +
    (rule.monetaryAction ? 0.04 : 0) +
    (rule.publicAction ? 0.03 : 0);

  return clamp(
    gateScore * 0.4 +
      (1 - riskScore) * 0.35 +
      userScore * 0.25 -
      sensitivityPenalty
  );
}

function missingRequiredGates(
  input: PolicyOrchestratorSignalInput,
  rule: PolicyOrchestratorRuleSet
): PolicyGateName[] {
  return rule.requiredGates.filter(
    (gateName) => !input.gateResults.some((gate) => gate.gateName === gateName)
  );
}

function failedGates(input: PolicyOrchestratorSignalInput): PolicyGateResult[] {
  return input.gateResults.filter((gate) => gate.decision === "fail" || gate.hardBlock);
}

function hasGateDecision(
  input: PolicyOrchestratorSignalInput,
  gateName: PolicyGateName,
  decisions: PolicyGateResult["decision"][]
): boolean {
  return input.gateResults.some(
    (gate) => gate.gateName === gateName && decisions.includes(gate.decision)
  );
}

function mapStatusToDecision(status: PolicyOutcomeStatus): PolicyDecision {
  switch (status) {
    case "policy_allowed":
      return "allow";
    case "policy_limited":
      return "allow_with_limits";
    case "policy_held":
      return "hold";
    case "policy_guardian_required":
      return "require_guardian";
    case "policy_review_required":
      return "require_review";
    case "policy_audit_required":
      return "require_audit";
    case "policy_treasury_required":
      return "require_treasury";
    case "policy_verification_required":
      return "require_verification";
    case "policy_escalated":
      return "escalate";
    default:
      return "block";
  }
}

function decidePolicyOutcome(params: {
  input: PolicyOrchestratorSignalInput;
  rule: PolicyOrchestratorRuleSet;
  overallPolicyRiskScore: number;
  gatePassScore: number;
  userEligibilityScore: number;
  actionSafetyScore: number;
  missingGates: PolicyGateName[];
  failed: PolicyGateResult[];
  reasons: string[];
}): PolicyOutcomeStatus {
  const {
    input,
    rule,
    overallPolicyRiskScore,
    gatePassScore,
    userEligibilityScore,
    actionSafetyScore,
    missingGates,
    failed,
    reasons
  } = params;

  if (missingGates.length > 0) {
    reasons.push("required_policy_gates_missing");
    return "policy_verification_required";
  }

  if (rule.blockUnknownAge && input.ageBand === "unknown") {
    reasons.push("unknown_age_blocks_sensitive_action");
    return "policy_verification_required";
  }

  if (hasGateDecision(input, "age", ["required"])) {
    reasons.push("guardian_permission_required");
    return "policy_guardian_required";
  }

  if (hasGateDecision(input, "age", ["fail"])) {
    reasons.push("age_gate_failed");
    return "policy_blocked";
  }

  if (hasGateDecision(input, "safety", ["fail"])) {
    reasons.push("safety_gate_failed");
    return "policy_blocked";
  }

  if (input.riskSignals.complianceRisk > 0.75) {
    reasons.push("compliance_risk_requires_escalation");
    return "policy_escalated";
  }

  if (failed.some((gate) => gate.hardBlock)) {
    reasons.push("hard_policy_gate_block");
    return "policy_blocked";
  }

  if (hasGateDecision(input, "rights", ["fail"]) && rule.requiresRights) {
    reasons.push("rights_gate_failed");
    return "policy_blocked";
  }

  if (hasGateDecision(input, "wallet", ["fail"]) && rule.requiresWallet) {
    reasons.push("wallet_gate_failed");
    return "policy_blocked";
  }

  if (hasGateDecision(input, "payment", ["fail"]) && rule.monetaryAction) {
    reasons.push("payment_gate_failed");
    return "policy_blocked";
  }

  if (hasGateDecision(input, "treasury", ["fail"]) && rule.requiresTreasury) {
    reasons.push("treasury_gate_failed");
    return "policy_blocked";
  }

  if (
    rule.requiresAudit &&
    hasGateDecision(input, "audit", ["required", "hold", "skipped"])
  ) {
    reasons.push("audit_required_before_action");
    return "policy_audit_required";
  }

  if (
    rule.requiresTreasury &&
    hasGateDecision(input, "treasury", ["required", "hold", "skipped"])
  ) {
    reasons.push("treasury_required_before_action");
    return "policy_treasury_required";
  }

  if (
    rule.requiresReview &&
    hasGateDecision(input, "review", ["required", "hold", "skipped"])
  ) {
    reasons.push("review_required_before_action");
    return "policy_review_required";
  }

  if (input.trustScore < rule.minTrustScore) {
    reasons.push("trust_score_below_policy_minimum");
    return "policy_review_required";
  }

  if (input.uValueScore < rule.minUValueScore) {
    reasons.push("u_value_below_policy_minimum");
    return "policy_limited";
  }

  if (overallPolicyRiskScore > rule.maxOverallPolicyRiskScore) {
    reasons.push("overall_policy_risk_above_maximum");
    return overallPolicyRiskScore > 0.65 ? "policy_escalated" : "policy_review_required";
  }

  if (gatePassScore < rule.minGatePassScore) {
    reasons.push("gate_pass_score_below_minimum");
    return "policy_review_required";
  }

  if (userEligibilityScore < rule.minUserEligibilityScore) {
    reasons.push("user_eligibility_score_below_minimum");
    return "policy_review_required";
  }

  if (actionSafetyScore < rule.minActionSafetyScore) {
    reasons.push("action_safety_score_below_minimum");
    return "policy_review_required";
  }

  if (input.gateResults.some((gate) => gate.decision === "hold")) {
    reasons.push("one_or_more_policy_gates_on_hold");
    return "policy_held";
  }

  if (input.gateResults.some((gate) => gate.decision === "limited")) {
    reasons.push("one_or_more_policy_gates_limited");
    return "policy_limited";
  }

  reasons.push("policy_allowed");
  return "policy_allowed";
}

function buildDownstreamInstructions(params: {
  input: PolicyOrchestratorSignalInput;
  status: PolicyOutcomeStatus;
  decision: PolicyDecision;
  reasons: string[];
}): PolicyDownstreamInstruction[] {
  const { input, status, decision, reasons } = params;

  const instructions: PolicyDownstreamInstruction[] = [];

  const targetObjectId =
    input.contentId ??
    input.campaignId ??
    input.grantEligibilityId ??
    input.walletId ??
    input.userId;

  if (status === "policy_allowed" || status === "policy_limited") {
    instructions.push({
      targetSystem: "system",
      targetObjectId,
      action: status === "policy_allowed" ? "allow" : "limit",
      reasonCode: status,
      payload: {
        policyDecisionId: input.policyDecisionId,
        actionType: input.actionType,
        decision,
        reasons
      }
    });
  }

  if (status === "policy_held") {
    instructions.push({
      targetSystem: "system",
      targetObjectId,
      action: "hold",
      reasonCode: "policy_hold_required",
      payload: {
        policyDecisionId: input.policyDecisionId,
        actionType: input.actionType,
        reasons
      }
    });
  }

  if (status === "policy_blocked") {
    instructions.push({
      targetSystem: "system",
      targetObjectId,
      action: "block",
      reasonCode: "policy_blocked",
      payload: {
        policyDecisionId: input.policyDecisionId,
        actionType: input.actionType,
        reasons
      }
    });
  }

  if (status === "policy_escalated") {
    instructions.push({
      targetSystem: "review",
      targetObjectId,
      action: "create_review",
      reasonCode: "policy_escalation_review_required",
      payload: {
        policyDecisionId: input.policyDecisionId,
        actionType: input.actionType,
        reasons
      }
    });
  }

  if (status === "policy_guardian_required") {
    instructions.push({
      targetSystem: "age_guardian",
      targetObjectId: input.userId,
      action: "request_guardian",
      reasonCode: "guardian_consent_required",
      payload: {
        policyDecisionId: input.policyDecisionId,
        actionType: input.actionType,
        reasons
      }
    });
  }

  if (status === "policy_review_required") {
    instructions.push({
      targetSystem: "review",
      targetObjectId,
      action: "create_review",
      reasonCode: "policy_review_required",
      payload: {
        policyDecisionId: input.policyDecisionId,
        actionType: input.actionType,
        reasons
      }
    });
  }

  if (status === "policy_audit_required") {
    instructions.push({
      targetSystem: "audit",
      targetObjectId,
      action: "create_audit",
      reasonCode: "policy_audit_required",
      payload: {
        policyDecisionId: input.policyDecisionId,
        actionType: input.actionType,
        reasons
      }
    });
  }

  if (status === "policy_treasury_required") {
    instructions.push({
      targetSystem: "treasury",
      targetObjectId,
      action: "reserve_treasury",
      reasonCode: "policy_treasury_required",
      payload: {
        policyDecisionId: input.policyDecisionId,
        actionType: input.actionType,
        reasons
      }
    });
  }

  if (status === "policy_verification_required") {
    instructions.push({
      targetSystem: "system",
      targetObjectId: input.userId,
      action: "request_verification",
      reasonCode: "policy_verification_required",
      payload: {
        policyDecisionId: input.policyDecisionId,
        actionType: input.actionType,
        reasons
      }
    });
  }

  if (input.notificationRequested) {
    instructions.push({
      targetSystem: "notification",
      targetObjectId: input.userId,
      action: "notify",
      reasonCode: status,
      payload: {
        policyDecisionId: input.policyDecisionId,
        actionType: input.actionType,
        decision,
        reasons
      }
    });
  }

  return instructions;
}

function createPolicyAlphabetEvent(params: {
  input: PolicyOrchestratorSignalInput;
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
    objectType: "policy_decision",
    objectId: params.input.policyDecisionId,
    sourceContext: "system",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: params.input.trustScore,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      policyDecisionId: params.input.policyDecisionId,
      actionType: params.input.actionType,
      primaryDomain: params.input.primaryDomain,
      userId: params.input.userId,
      creatorId: params.input.creatorId ?? null,
      businessId: params.input.businessId ?? null,
      walletId: params.input.walletId ?? null,
      contentId: params.input.contentId ?? null,
      campaignId: params.input.campaignId ?? null,
      grantEligibilityId: params.input.grantEligibilityId ?? null,
      gateResults: params.input.gateResults,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluatePolicyDecision(
  input: PolicyOrchestratorSignalInput
): PolicyOrchestratorEvaluationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const overallPolicyRiskScore = calculateOverallPolicyRiskScore(input);
  const gatePassScore = calculateGatePassScore(input, rule);
  const userEligibilityScore = calculateUserEligibilityScore(input, rule);
  const actionSafetyScore = calculateActionSafetyScore(input, rule);
  const requiredGatesMissing = missingRequiredGates(input, rule);
  const failed = failedGates(input);

  const status = decidePolicyOutcome({
    input,
    rule,
    overallPolicyRiskScore,
    gatePassScore,
    userEligibilityScore,
    actionSafetyScore,
    missingGates: requiredGatesMissing,
    failed,
    reasons
  });

  const decision = mapStatusToDecision(status);

  const allowed = status === "policy_allowed";
  const limited = status === "policy_limited";
  const held = status === "policy_held";
  const blocked = status === "policy_blocked";
  const escalated = status === "policy_escalated";

  const guardianRequired = status === "policy_guardian_required";
  const reviewRequired = status === "policy_review_required" || status === "policy_escalated";
  const auditRequired = status === "policy_audit_required";
  const treasuryRequired = status === "policy_treasury_required";
  const verificationRequired = status === "policy_verification_required";

  const downstreamInstructions = buildDownstreamInstructions({
    input,
    status,
    decision,
    reasons
  });

  const verificationStatus = allowed || limited ? "verified" : "rejected";

  const policyDecisionCreatedEvent = createPolicyAlphabetEvent({
    input,
    eventType: "policy_decision_created",
    rawScore: gatePassScore,
    qualityScore: actionSafetyScore,
    riskScore: overallPolicyRiskScore,
    verificationStatus,
    metadata: {
      status,
      decision,
      reasons
    }
  });

  const policyAllowedEvent = allowed
    ? createPolicyAlphabetEvent({
        input,
        eventType: "policy_allowed",
        rawScore: gatePassScore,
        qualityScore: actionSafetyScore,
        riskScore: overallPolicyRiskScore,
        verificationStatus: "verified",
        metadata: { status, decision, reasons }
      })
    : null;

  const policyLimitedEvent = limited
    ? createPolicyAlphabetEvent({
        input,
        eventType: "policy_limited",
        rawScore: gatePassScore,
        qualityScore: actionSafetyScore,
        riskScore: overallPolicyRiskScore,
        verificationStatus: "verified",
        metadata: { status, decision, reasons }
      })
    : null;

  const policyHeldEvent = held
    ? createPolicyAlphabetEvent({
        input,
        eventType: "policy_held",
        rawScore: gatePassScore,
        qualityScore: actionSafetyScore,
        riskScore: overallPolicyRiskScore,
        verificationStatus: "rejected",
        metadata: { status, decision, reasons }
      })
    : null;

  const policyGuardianRequiredEvent = guardianRequired
    ? createPolicyAlphabetEvent({
        input,
        eventType: "policy_guardian_required",
        rawScore: userEligibilityScore,
        qualityScore: actionSafetyScore,
        riskScore: overallPolicyRiskScore,
        verificationStatus: "rejected",
        metadata: { status, decision, reasons }
      })
    : null;

  const policyReviewRequiredEvent = reviewRequired
    ? createPolicyAlphabetEvent({
        input,
        eventType: "policy_review_required",
        rawScore: userEligibilityScore,
        qualityScore: actionSafetyScore,
        riskScore: overallPolicyRiskScore,
        verificationStatus: "rejected",
        metadata: { status, decision, reasons }
      })
    : null;

  const policyAuditRequiredEvent = auditRequired
    ? createPolicyAlphabetEvent({
        input,
        eventType: "policy_audit_required",
        rawScore: gatePassScore,
        qualityScore: actionSafetyScore,
        riskScore: overallPolicyRiskScore,
        verificationStatus: "rejected",
        metadata: { status, decision, reasons }
      })
    : null;

  const policyTreasuryRequiredEvent = treasuryRequired
    ? createPolicyAlphabetEvent({
        input,
        eventType: "policy_treasury_required",
        rawScore: gatePassScore,
        qualityScore: actionSafetyScore,
        riskScore: overallPolicyRiskScore,
        verificationStatus: "rejected",
        metadata: { status, decision, reasons }
      })
    : null;

  const policyVerificationRequiredEvent = verificationRequired
    ? createPolicyAlphabetEvent({
        input,
        eventType: "policy_verification_required",
        rawScore: userEligibilityScore,
        qualityScore: actionSafetyScore,
        riskScore: overallPolicyRiskScore,
        verificationStatus: "rejected",
        metadata: { status, decision, reasons }
      })
    : null;

  const policyBlockedEvent = blocked
    ? createPolicyAlphabetEvent({
        input,
        eventType: "policy_blocked",
        rawScore: gatePassScore,
        qualityScore: actionSafetyScore,
        riskScore: overallPolicyRiskScore,
        verificationStatus: "rejected",
        metadata: { status, decision, reasons }
      })
    : null;

  const policyEscalatedEvent = escalated
    ? createPolicyAlphabetEvent({
        input,
        eventType: "policy_escalated",
        rawScore: gatePassScore,
        qualityScore: actionSafetyScore,
        riskScore: overallPolicyRiskScore,
        verificationStatus: "rejected",
        metadata: { status, decision, reasons }
      })
    : null;

  const policyGateFailedEvent =
    failed.length > 0 || requiredGatesMissing.length > 0
      ? createPolicyAlphabetEvent({
          input,
          eventType: "policy_gate_failed",
          rawScore: failed.length,
          qualityScore: gatePassScore,
          riskScore: overallPolicyRiskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            decision,
            failedGates: failed,
            requiredGatesMissing,
            reasons
          }
        })
      : null;

  return {
    policyDecisionId: input.policyDecisionId,
    userId: input.userId,
    creatorId: input.creatorId ?? null,
    businessId: input.businessId ?? null,
    walletId: input.walletId ?? null,
    contentId: input.contentId ?? null,
    campaignId: input.campaignId ?? null,
    grantEligibilityId: input.grantEligibilityId ?? null,
    actionType: input.actionType,
    primaryDomain: input.primaryDomain,
    status,
    decision,
    overallPolicyRiskScore,
    gatePassScore,
    userEligibilityScore,
    actionSafetyScore,
    allowed,
    limited,
    held,
    blocked,
    escalated,
    guardianRequired,
    reviewRequired,
    auditRequired,
    treasuryRequired,
    verificationRequired,
    failedGates: failed,
    requiredGatesMissing,
    downstreamInstructions,
    reasons,
    policyDecisionCreatedEvent,
    policyAllowedEvent,
    policyLimitedEvent,
    policyHeldEvent,
    policyGuardianRequiredEvent,
    policyReviewRequiredEvent,
    policyAuditRequiredEvent,
    policyTreasuryRequiredEvent,
    policyVerificationRequiredEvent,
    policyBlockedEvent,
    policyEscalatedEvent,
    policyGateFailedEvent,
    metadata: {
      ruleActionType: rule.actionType,
      ...input.metadata
    }
  };
}
