import type { ActionIntentEvaluationResult } from "@/types/alphabet/action-intent.types";
import type { RuntimePolicyDraft } from "@/types/alphabet/runtime.types";

export function buildPolicyDraftFromIntentResult(
  intent: ActionIntentEvaluationResult
): RuntimePolicyDraft {
  const risky =
    intent.precheckRiskScore > 0.45 ||
    intent.rejected ||
    intent.duplicate ||
    intent.expired;

  const decision: RuntimePolicyDraft["decision"] =
    intent.rejected || intent.duplicate || intent.expired
      ? "block"
      : risky
        ? "require_review"
        : "allow";

  return {
    userId: intent.userId,
    actionType: intent.policyRequest.actionType,
    primaryDomain: intent.policyRequest.primaryDomain,
    decision,
    status:
      decision === "allow"
        ? "policy_allowed"
        : decision === "require_review"
          ? "policy_requires_review"
          : "policy_blocked",
    ageBand: "unknown",
    trustScore: 0,
    uValueScore: 0,
    riskSignals: {
      intentRisk: intent.precheckRiskScore,
      contextCompletenessScore: intent.contextCompletenessScore,
      intentLegitimacyScore: intent.intentLegitimacyScore,
      routingReadinessScore: intent.routingReadinessScore
    },
    gateResults: [
      {
        gate: "action_intent_precheck",
        passed: !intent.rejected && !intent.duplicate && !intent.expired,
        reasons: intent.reasons
      }
    ],
    downstreamInstructions: [],
    metadata: {
      actionIntentId: intent.actionIntentId,
      source: "runtime_policy_draft"
    }
  };
}

/** Only these decisions may enqueue mutation execution requests (worker handles money). */
export function policyAllowsMutationExecution(decision: string): boolean {
  return decision === "allow" || decision === "allow_with_limits";
}
