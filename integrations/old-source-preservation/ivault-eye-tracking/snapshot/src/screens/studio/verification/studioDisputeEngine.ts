/**
 * Stage 7 — dispute lifecycle (local simulation; not legal arbitration).
 */

import type { Dispute, DisputeEvidence, DisputeStatus, TrustImpact } from "./studioVerificationTypes";
import type { StudioEvent } from "../studioTypes";
import type { StudioLedgerEntry, StudioRevealUnlock } from "../wallet/studioWalletTypes";
import type { VerificationRecord } from "./studioVerificationTypes";
import type { MagicReveal } from "../studioTypes";

function did(): string {
  return `dsp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function eid(): string {
  return `evd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export type CreateDisputeInput = {
  reason: Dispute["reason"];
  reporterAccountId: string;
  creatorAccountId?: string;
  postId?: string;
  revealId?: string;
  unlockId?: string;
  campaignId?: string;
  ledgerEntryIds: string[];
  statement: string;
  nowIso: string;
};

export function createDispute(input: CreateDisputeInput): Dispute {
  const ev: DisputeEvidence = {
    id: eid(),
    type: "user_statement",
    createdAt: input.nowIso,
    payload: { text: input.statement },
  };
  return {
    id: did(),
    reason: input.reason,
    status: "open",
    reporterAccountId: input.reporterAccountId,
    creatorAccountId: input.creatorAccountId,
    postId: input.postId,
    revealId: input.revealId,
    unlockId: input.unlockId,
    campaignId: input.campaignId,
    ledgerEntryIds: input.ledgerEntryIds,
    evidence: [ev],
    trustImpacts: [],
    createdAt: input.nowIso,
  };
}

export type CollectEvidenceState = {
  unlocks: StudioRevealUnlock[];
  ledgerEntries: StudioLedgerEntry[];
  verificationRecords: VerificationRecord[];
  events: StudioEvent[];
  reveal?: MagicReveal;
};

export function collectDisputeEvidence(dispute: Dispute, state: CollectEvidenceState): Dispute {
  const next: DisputeEvidence[] = [...dispute.evidence];
  const push = (type: DisputeEvidence["type"], payload: Record<string, unknown>) => {
    next.push({ id: eid(), type, createdAt: new Date().toISOString(), payload });
  };

  const u = state.unlocks.find((x) => x.id === dispute.unlockId || x.revealId === dispute.revealId);
  if (u) {
    push("unlock_snapshot", { unlock: u });
  }
  for (const le of state.ledgerEntries.filter((l) => dispute.ledgerEntryIds.includes(l.id))) {
    push("payment_record", { entry: le });
  }
  for (const vr of state.verificationRecords.filter((r) => r.revealId === dispute.revealId || r.subjectId === (dispute.unlockId ?? ""))) {
    push("verification_record", { record: vr });
  }
  const recent = state.events.filter((e) => e.payload?.postId === dispute.postId || e.payload?.revealId === dispute.revealId).slice(-12);
  for (const ev of recent) {
    push("runtime_event", { type: ev.type, payload: ev.payload });
  }
  if (state.reveal?.safety) {
    push("safety_report", { safety: state.reveal.safety });
  }

  return { ...dispute, evidence: next, status: "collecting_evidence" };
}

export type DisputeResolution = "viewer_wins" | "creator_wins" | "rejected" | "escalated";

export function resolveDispute(dispute: Dispute, resolution: DisputeResolution, nowIso: string): { dispute: Dispute; trustImpacts: TrustImpact[] } {
  const trustImpacts: TrustImpact[] = [];
  let status: DisputeStatus = dispute.status;
  let resText = "";

  switch (resolution) {
    case "viewer_wins":
      status = "resolved_viewer_wins";
      resText = "Viewer favored — refund eligible (mock)";
      if (dispute.creatorAccountId) {
        trustImpacts.push({
          accountId: dispute.creatorAccountId,
          delta: dispute.reason === "misleading_reveal" ? -8 : -3,
          reason: "Dispute lost",
          category: "dispute_lost",
          applied: false,
          createdAt: nowIso,
        });
      }
      break;
    case "creator_wins":
      status = "resolved_creator_wins";
      resText = "Creator favored — settlement may proceed (mock)";
      if (dispute.creatorAccountId) {
        trustImpacts.push({
          accountId: dispute.creatorAccountId,
          delta: 0.5,
          reason: "Dispute won",
          category: "dispute_won",
          applied: false,
          createdAt: nowIso,
        });
      }
      break;
    case "rejected":
      status = "rejected";
      resText = "Dispute rejected — no reversal";
      trustImpacts.push({
        accountId: dispute.reporterAccountId,
        delta: -4,
        reason: "Invalid or repeated dispute (mock)",
        category: "dispute_lost",
        applied: false,
        createdAt: nowIso,
      });
      break;
    case "escalated":
      status = "escalated";
      resText = "Escalated — hold extended (mock)";
      break;
    default:
      break;
  }

  return {
    dispute: {
      ...dispute,
      status,
      resolution: resText,
      trustImpacts: [...dispute.trustImpacts, ...trustImpacts],
      resolvedAt: nowIso,
    },
    trustImpacts,
  };
}
