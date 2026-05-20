/**
 * Stage 7 — trust deltas from verification / fraud / disputes (local simulation).
 */

import type {
  Dispute,
  FraudAssessment,
  FraudRiskLevel,
  TrustImpact,
  TrustImpactCategory,
  VerificationRecord,
} from "./studioVerificationTypes";
import type { StudioWalletAccount } from "../wallet/studioWalletTypes";

export type TrustImpactRole = "viewer" | "creator" | "reporter";

export type CalculateTrustImpactInput = {
  verificationRecord?: VerificationRecord;
  fraudAssessment?: FraudAssessment;
  dispute?: Dispute;
  role: TrustImpactRole;
};

function push(
  out: TrustImpact[],
  accountId: string,
  delta: number,
  reason: string,
  category: TrustImpactCategory,
  createdAt: string
): void {
  out.push({ accountId, delta, reason, category, applied: false, createdAt });
}

export function calculateTrustImpact(input: CalculateTrustImpactInput, nowIso: string): TrustImpact[] {
  const out: TrustImpact[] = [];
  const vr = input.verificationRecord;
  const fa = input.fraudAssessment;
  const d = input.dispute;

  if (vr?.status === "passed" && input.role === "viewer") {
    const vid = vr.viewerAccountId;
    if (vid) push(out, vid, 1, "Verification passed", "positive_verification", nowIso);
    if ((vr.gates ?? []).some((g) => g.gateType === "attention_score" && g.status === "passed" && g.score >= 0.85)) {
      const vid = vr.viewerAccountId;
      if (vid) push(out, vid, 0.5, "High-quality verified attention", "positive_verification", nowIso);
    }
  }

  if (vr?.status === "failed" && input.role === "viewer") {
    const vid = vr.viewerAccountId;
    if (vid) push(out, vid, -2, "Verification failed", "failed_verification", nowIso);
  }

  if (fa && input.role === "viewer") {
    const vid = fa.viewerAccountId ?? vr?.viewerAccountId;
    if (!vid) return out;
    const lvl: FraudRiskLevel = fa.riskLevel;
    if (lvl === "high") push(out, vid, -5, "Elevated fraud risk", "fraud_signal", nowIso);
    if (lvl === "critical") push(out, vid, -15, "Critical fraud risk", "fraud_signal", nowIso);
    if (fa.signals.some((s) => s.type === "blocked_content_attempt")) {
      push(out, vid, -6, "Blocked content attempt", "fraud_signal", nowIso);
    }
  }

  if (vr?.subjectType === "campaign_action" && vr.status === "failed" && fa?.riskLevel === "high" && input.role === "viewer") {
    const vid = vr.viewerAccountId;
    if (vid) push(out, vid, -3, "Campaign action rejected (fraud)", "failed_verification", nowIso);
  }

  if (d?.status === "resolved_viewer_wins" && d.creatorAccountId && input.role === "creator") {
    push(out, d.creatorAccountId, -8, "Misleading reveal dispute upheld", "dispute_lost", nowIso);
  }
  if (d?.status === "resolved_creator_wins" && d.creatorAccountId && input.role === "creator") {
    push(out, d.creatorAccountId, 0.5, "Dispute resolved in creator favor", "dispute_won", nowIso);
  }
  if (d?.status === "rejected" && d.reporterAccountId) {
    push(out, d.reporterAccountId, -4, "Repeated or invalid dispute pattern (mock)", "dispute_lost", nowIso);
  }

  return out;
}

export function applyTrustImpact(account: StudioWalletAccount, impacts: TrustImpact[]): StudioWalletAccount {
  const delta = impacts.filter((i) => i.accountId === account.userId || i.accountId === account.id).reduce((s, i) => s + i.delta, 0);
  const base = account.trustScore ?? 50;
  const next = Math.max(0, Math.min(100, base + delta));
  return { ...account, trustScore: next };
}
