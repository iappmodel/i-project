import { describe, expect, it } from "vitest";
import { evaluateAdminCommandDecision } from "../admin-command-center-engine";
import type { AdminCommandDecisionInput } from "@/types/alphabet/admin-command-center.types";

function input(overrides: Partial<AdminCommandDecisionInput> = {}): AdminCommandDecisionInput {
  return {
    commandItemId: crypto.randomUUID(),
    actorAdminId: crypto.randomUUID(),
    actorRole: "admin",
    executableAction: "mark_resolved",
    decisionType: "item_resolved",
    decisionStatus: "decision_recorded",
    reasonCodes: ["review_completed"],
    evidenceSummary: "Reviewed evidence and resolved item.",
    linkedObjectIds: {},
    beforeState: {},
    afterState: {},
    idempotencyKey: crypto.randomUUID(),
    dedupeKey: crypto.randomUUID(),
    metadata: {},
    ...overrides
  };
}

describe("admin-command-center-engine", () => {
  it("allows safe resolved decision with reason", () => {
    const result = evaluateAdminCommandDecision(input());

    expect(result.allowed).toBe(true);
    expect(result.nextStatus).toBe("command_item_resolved");
  });

  it("blocks decision missing actor", () => {
    const result = evaluateAdminCommandDecision(
      input({
        actorAdminId: ""
      })
    );

    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("admin_command_missing_actor_admin_id");
  });

  it("requires reason codes for dismissal", () => {
    const result = evaluateAdminCommandDecision(
      input({
        executableAction: "dismiss_item",
        decisionType: "item_dismissed",
        reasonCodes: [],
        evidenceSummary: ""
      })
    );

    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("admin_command_reason_codes_required");
  });

  it("marks wallet freeze as review-only", () => {
    const result = evaluateAdminCommandDecision(
      input({
        executableAction: "approve_recommended_action",
        decisionType: "recommended_action_approved",
        requestedAction: "freeze_wallet_review",
        approvedAction: "freeze_wallet_review"
      })
    );

    expect(result.allowed).toBe(true);
    expect(result.blocksDirectWalletMutation).toBe(true);
    expect(result.blocksDirectMoneyMutation).toBe(true);
    expect(result.reasons).toContain("admin_command_money_action_review_only");
  });

  it("marks provider retry as review-only", () => {
    const result = evaluateAdminCommandDecision(
      input({
        executableAction: "approve_recommended_action",
        decisionType: "recommended_action_approved",
        requestedAction: "retry_provider_polling_review",
        approvedAction: "retry_provider_polling_review"
      })
    );

    expect(result.allowed).toBe(true);
    expect(result.blocksDirectProviderMutation).toBe(true);
  });
});
