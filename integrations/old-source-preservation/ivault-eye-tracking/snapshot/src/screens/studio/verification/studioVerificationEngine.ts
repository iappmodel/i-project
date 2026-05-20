/**
 * Stage 7 — local verification + settlement decision (simulation only).
 */

import type { MagicReveal } from "../studioTypes";
import type { StudioLedgerEntry, StudioRevealUnlock, StudioWalletAccount } from "../wallet/studioWalletTypes";
import type {
  Dispute,
  FraudAssessment,
  FraudRiskLevel,
  SettlementDecision,
  VerificationGateResult,
  VerificationGateStatus,
  VerificationRecord,
  VerificationStatus,
  VerificationSubjectType,
  TrustImpact,
} from "./studioVerificationTypes";
import { fraudRiskLevelFromScore } from "./studioFraudEngine";

function gid(): string {
  return `gate_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function buildGateResult(input: {
  gateType: VerificationGateResult["gateType"];
  status: VerificationGateStatus;
  score: number;
  threshold: number;
  message: string;
  blocking: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}): VerificationGateResult {
  return {
    id: gid(),
    gateType: input.gateType,
    status: input.status,
    score: input.score,
    threshold: input.threshold,
    message: input.message,
    blocking: input.blocking,
    metadata: input.metadata ?? {},
    createdAt: input.createdAt,
  };
}

export function calculateVerificationStatus(gates: VerificationGateResult[]): VerificationStatus {
  const blockingFailed = gates.some((g) => g.blocking && g.status === "failed");
  if (blockingFailed) return "failed";

  const blockingPending = gates.some((g) => g.blocking && g.status === "pending");
  if (blockingPending) return "pending";

  const anyFailed = gates.some((g) => g.status === "failed");
  if (anyFailed) return "under_review";

  const warn = gates.some((g) => g.status === "warning");
  if (warn) return "under_review";

  return "passed";
}

export function verificationRecordAllowsReward(record: VerificationRecord): boolean {
  return record.status === "passed";
}

export function verificationRecordAllowsSettlement(record: VerificationRecord, fraudLevel: FraudRiskLevel): boolean {
  if (record.status === "failed" || record.status === "rejected" || record.status === "reversed") return false;
  if (fraudLevel === "high" || fraudLevel === "critical") return false;
  const s = record.settlementDecision.status;
  if (s === "block" || s === "reverse" || s === "refund") return false;
  if (s === "require_verification" || s === "require_review") return false;
  return true;
}

export type VerifyRuntimeActionInput = {
  subjectType: VerificationSubjectType;
  subjectId: string;
  viewerAccount: StudioWalletAccount;
  creatorAccount?: StudioWalletAccount;
  post?: { id: string; metrics?: { verifiedViews: number } };
  reveal?: MagicReveal;
  campaign?: {
    id: string;
    budgetRemainingMinor?: number;
    rewardMinor?: number;
    requiresGps?: boolean;
    requiresQr?: boolean;
    fraudSensitivity?: "low" | "medium" | "high";
    frequencyCapPerDay?: number;
  };
  session?: {
    watchMs: number;
    durationMs: number;
    attentionScore: number;
    flagged?: boolean;
    ageGatePassed?: boolean;
    disclosureAcknowledged?: boolean;
  };
  unlock?: StudioRevealUnlock;
  ledgerEntries: StudioLedgerEntry[];
  fraudAssessment?: FraudAssessment;
  popsPassed?: boolean;
  now: string;
};

function monetizedReveal(r: MagicReveal): boolean {
  const amt = r.pricing?.amount ?? 0;
  const tip = r.revealType === "tip_to_reveal" || r.revealType === "pay_to_reveal" || r.revealType === "collective_reveal";
  return tip || amt > 0;
}

export function verifyRuntimeAction(input: VerifyRuntimeActionInput): VerificationRecord {
  const now = input.now;
  const gates: VerificationGateResult[] = [];
  const fraudScore = input.fraudAssessment?.riskScore ?? 0;
  const fraudLevel = input.fraudAssessment?.riskLevel ?? fraudRiskLevelFromScore(fraudScore);

  gates.push(
    buildGateResult({
      gateType: "fraud_score",
      status: fraudScore >= 75 ? "failed" : fraudScore >= 50 ? "warning" : "passed",
      score: fraudScore,
      threshold: 50,
      message: `Fraud risk score ${fraudScore} (${fraudLevel})`,
      blocking: fraudScore >= 85,
      createdAt: now,
    })
  );

  if (input.subjectType === "view") {
    const dur = Math.max(1, input.session?.durationMs ?? 1);
    const watchRatio = (input.session?.watchMs ?? 0) / dur;
    gates.push(
      buildGateResult({
        gateType: "watch_time",
        status: watchRatio >= 0.25 ? "passed" : "failed",
        score: watchRatio,
        threshold: 0.25,
        message: watchRatio >= 0.25 ? "Watch threshold met" : "Insufficient watch for verified view",
        blocking: true,
        createdAt: now,
      })
    );
    gates.push(
      buildGateResult({
        gateType: "completion_rate",
        status: watchRatio >= 0.45 ? "passed" : "warning",
        score: watchRatio,
        threshold: 0.45,
        message: "Completion heuristic (mock)",
        blocking: false,
        createdAt: now,
      })
    );
    const att = input.session?.attentionScore ?? 0;
    gates.push(
      buildGateResult({
        gateType: "attention_score",
        status: att >= 0.35 ? "passed" : "failed",
        score: att,
        threshold: 0.35,
        message: att >= 0.35 ? "Attention OK" : "Low attention",
        blocking: true,
        createdAt: now,
      })
    );
    gates.push(
      buildGateResult({
        gateType: "human_presence",
        status: input.viewerAccount.isVerifiedHuman ? "passed" : "warning",
        score: input.viewerAccount.isVerifiedHuman ? 1 : 0.4,
        threshold: 1,
        message: input.viewerAccount.isVerifiedHuman ? "Human verified (mock)" : "Human verification suggested",
        blocking: false,
        createdAt: now,
      })
    );
    gates.push(
      buildGateResult({
        gateType: "session_integrity",
        status: input.session?.flagged ? "warning" : "passed",
        score: input.session?.flagged ? 0.3 : 1,
        threshold: 0.5,
        message: input.session?.flagged ? "Session flagged" : "Session clean",
        blocking: false,
        createdAt: now,
      })
    );
  }

  if (input.subjectType === "magic_unlock" && input.reveal) {
    const r = input.reveal;
    gates.push(
      buildGateResult({
        gateType: "trust_score",
        status: (input.viewerAccount.trustScore ?? 0) >= (r.eligibility.minTrustScore ?? 0) ? "passed" : "failed",
        score: input.viewerAccount.trustScore ?? 0,
        threshold: r.eligibility.minTrustScore ?? 0,
        message: "Eligibility / trust gate",
        blocking: (r.eligibility.minTrustScore ?? 0) > 0,
        createdAt: now,
      })
    );

    if (monetizedReveal(r)) {
      gates.push(
        buildGateResult({
          gateType: "payment_integrity",
          status: "passed",
          score: 1,
          threshold: 1,
          message: "Payment path integrity (mock — ledger reconciled)",
          blocking: false,
          createdAt: now,
        })
      );
    }

    const safety = r.safety.safetyStatus;
    gates.push(
      buildGateResult({
        gateType: "content_safety",
        status: safety === "blocked" ? "failed" : safety === "warning" ? "warning" : "passed",
        score: safety === "passed" ? 1 : safety === "warning" ? 0.6 : 0,
        threshold: 0.5,
        message: `Safety: ${safety}`,
        blocking: safety === "blocked",
        createdAt: now,
      })
    );

    if (r.safety.ageGateRequired || r.revealType === "age_to_reveal") {
      const minA = r.eligibility.minAge ?? 18;
      const age = input.viewerAccount.age ?? 99;
      const ok = age >= minA && (input.session?.ageGatePassed ?? false);
      gates.push(
        buildGateResult({
          gateType: "age_gate",
          status: ok ? "passed" : "failed",
          score: ok ? 1 : 0,
          threshold: 1,
          message: ok ? "Age gate satisfied" : "Age gate required for paid / restricted unlock",
          blocking: true,
          createdAt: now,
        })
      );
    }

    if (monetizedReveal(r)) {
      const disc = input.session?.disclosureAcknowledged ?? false;
      gates.push(
        buildGateResult({
          gateType: "disclosure_acknowledged",
          status: disc ? "passed" : "failed",
          score: disc ? 1 : 0,
          threshold: 1,
          message: disc ? "Monetization disclosure acknowledged" : "Disclosure required before monetized unlock",
          blocking: true,
          createdAt: now,
        })
      );
    }

    if (r.revealType === "watch_to_reveal") {
      const dur = Math.max(1, input.session?.durationMs ?? 1);
      const ratio = (input.session?.watchMs ?? 0) / dur;
      gates.push(
        buildGateResult({
          gateType: "watch_time",
          status: ratio >= 0.3 ? "passed" : "failed",
          score: ratio,
          threshold: 0.3,
          message: "Watch-to-reveal requires verified attention",
          blocking: true,
          createdAt: now,
        })
      );
    }

    if (r.revealType === "location_to_reveal" || Boolean(r.eligibility.requireLocation)) {
      const locOk = Boolean((input.session as { locationMatch?: boolean } | undefined)?.locationMatch);
      gates.push(
        buildGateResult({
          gateType: "location_proof",
          status: locOk ? "passed" : "failed",
          score: locOk ? 1 : 0,
          threshold: 1,
          message: "GPS / location objective requires location proof (mock)",
          blocking: true,
          metadata: { mock: true },
          createdAt: now,
        })
      );
    }

    const highValue =
      (r.reward?.viewerRewardAmount ?? 0) > 20 || (r.pricing?.amount ?? 0) > 25 || fraudLevel === "high" || fraudLevel === "critical";
    if (highValue || input.fraudAssessment?.recommendedAction === "require_pops") {
      gates.push(
        buildGateResult({
          gateType: "pops",
          status: input.popsPassed ? "passed" : fraudLevel === "critical" ? "failed" : "pending",
          score: input.popsPassed ? 1 : 0,
          threshold: 1,
          message: input.popsPassed ? "POPS passed" : "POPS required for high-value / high-risk unlock",
          blocking: fraudLevel === "critical" || ((r.reward?.viewerRewardAmount ?? 0) > 5 && !input.popsPassed && fraudLevel === "high"),
          createdAt: now,
        })
      );
    }
  }

  if (input.subjectType === "campaign_action" && input.campaign) {
    const c = input.campaign;
    const budgetOk = (c.budgetRemainingMinor ?? 1_000_000) >= (c.rewardMinor ?? 0);
    gates.push(
      buildGateResult({
        gateType: "campaign_budget",
        status: budgetOk ? "passed" : "failed",
        score: budgetOk ? 1 : 0,
        threshold: 1,
        message: budgetOk ? "Campaign budget OK" : "Insufficient campaign budget",
        blocking: true,
        createdAt: now,
      })
    );
    gates.push(
      buildGateResult({
        gateType: "human_presence",
        status: input.viewerAccount.isVerifiedHuman ? "passed" : "failed",
        score: input.viewerAccount.isVerifiedHuman ? 1 : 0,
        threshold: 1,
        message: "Rewarded campaigns require human verification (mock)",
        blocking: true,
        createdAt: now,
      })
    );
    if (c.requiresGps) {
      gates.push(
        buildGateResult({
          gateType: "location_proof",
          status: (input.session as { locationMatch?: boolean } | undefined)?.locationMatch ? "passed" : "failed",
          score: (input.session as { locationMatch?: boolean } | undefined)?.locationMatch ? 1 : 0,
          threshold: 1,
          message: "GPS objective proof",
          blocking: true,
          createdAt: now,
        })
      );
    }
    if (c.requiresQr) {
      gates.push(
        buildGateResult({
          gateType: "qr_proof",
          status: (input.session as { qrScanned?: boolean } | undefined)?.qrScanned ? "passed" : "failed",
          score: (input.session as { qrScanned?: boolean } | undefined)?.qrScanned ? 1 : 0,
          threshold: 1,
          message: "QR check-in proof",
          blocking: true,
          createdAt: now,
        })
      );
    }
    const cap = c.frequencyCapPerDay ?? 10;
    const todayClaims = input.ledgerEntries.filter((e) => e.metadata && (e.metadata as { campaignClaim?: string }).campaignClaim === input.subjectId).length;
    gates.push(
      buildGateResult({
        gateType: "duplicate_action",
        status: todayClaims < cap ? "passed" : "failed",
        score: cap - todayClaims,
        threshold: 1,
        message: todayClaims >= cap ? "Campaign frequency cap exceeded" : "Within frequency cap",
        blocking: true,
        createdAt: now,
      })
    );
    if ((c.rewardMinor ?? 0) > 15 || c.fraudSensitivity === "high") {
      gates.push(
        buildGateResult({
          gateType: "pops",
          status: input.popsPassed ? "passed" : "pending",
          score: input.popsPassed ? 1 : 0,
          threshold: 1,
          message: input.popsPassed ? "POPS OK" : "POPS required for high reward",
          blocking: !input.popsPassed,
          createdAt: now,
        })
      );
    }
  }

  if (input.subjectType === "payout_release") {
    gates.push(
      buildGateResult({
        gateType: "payment_integrity",
        status: "passed",
        score: 1,
        threshold: 1,
        message: "Payout rails integrity (mock)",
        blocking: false,
        createdAt: now,
      })
    );
    gates.push(
      buildGateResult({
        gateType: "content_safety",
        status: input.reveal?.safety.safetyStatus === "blocked" ? "failed" : "passed",
        score: 1,
        threshold: 1,
        message: "Content safety for release",
        blocking: true,
        createdAt: now,
      })
    );
  }

  const status = calculateVerificationStatus(gates);
  const settlement = decideSettlement(
    { fraudScore, gates, status } as Pick<VerificationRecord, "fraudScore" | "gates" | "status">,
    input.fraudAssessment ?? {
      id: "inline",
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      riskScore: fraudScore,
      riskLevel: fraudLevel,
      signals: [],
      recommendedAction: "allow",
      createdAt: now,
    },
    input.campaign?.rewardMinor ?? input.reveal?.pricing?.amount ?? 0,
    input.subjectType,
    now
  );

  const trustImpact: TrustImpact[] = [];

  const record: VerificationRecord = {
    id: `vr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    viewerAccountId: input.viewerAccount.userId,
    creatorAccountId: input.creatorAccount?.userId,
    campaignId: input.campaign?.id,
    revealId: input.reveal?.id,
    postId: input.post?.id ?? input.unlock?.postId,
    status,
    gates,
    fraudScore,
    trustImpact,
    settlementDecision: settlement,
    createdAt: now,
    completedAt: status === "passed" || status === "failed" || status === "rejected" ? now : undefined,
  };

  return record;
}

export function decideSettlement(
  record: Pick<VerificationRecord, "fraudScore" | "gates" | "status">,
  fraud: FraudAssessment,
  amountMinor: number,
  subjectType: VerificationSubjectType,
  nowIso: string
): SettlementDecision {
  const level = fraud.riskLevel;
  const safetyWarn = record.gates.some((g) => g.gateType === "content_safety" && g.status === "warning");

  if (record.status === "failed" || record.status === "rejected") {
    return { status: "block", holdSeconds: 0, reason: "Verification failed — no reward" };
  }
  if (level === "critical" || fraud.recommendedAction === "reverse") {
    return { status: "reverse", holdSeconds: 0, reason: "Critical fraud — reversal / refund path" };
  }
  if (level === "high") {
    return {
      status: "require_review",
      holdSeconds: 3600 * 48,
      reason: "High fraud risk — manual review or POPS",
      releaseAt: new Date(Date.now() + 3600 * 48 * 1000).toISOString(),
    };
  }
  if (level === "medium") {
    return { status: "hold_pending", holdSeconds: 900, reason: "Medium fraud — settlement hold", releaseAt: new Date(Date.now() + 900_000).toISOString() };
  }
  if (safetyWarn && subjectType === "magic_unlock") {
    return { status: "hold_pending", holdSeconds: 600, reason: "Content safety warning — hold pending review" };
  }
  if (subjectType === "creator_reward") {
    return { status: "hold_pending", holdSeconds: 1200, reason: "Creator reward always pending first (policy)" };
  }
  if (subjectType === "campaign_action" && record.status === "passed") {
    return { status: "release_now", holdSeconds: 0, reason: "Campaign action verified — viewer reward OK" };
  }
  if (subjectType === "payout_release") {
    return { status: "release_now", holdSeconds: 0, reason: "Payout checks passed (mock)" };
  }
  if (amountMinor > 0 && record.status === "passed") {
    return { status: "release_now", holdSeconds: 0, reason: "Verified — release path open" };
  }
  if (record.status === "under_review") {
    return { status: "hold_pending", holdSeconds: 1800, reason: "Under review — hold", releaseAt: new Date(Date.now() + 1800_000).toISOString() };
  }
  return { status: "require_verification", holdSeconds: 0, reason: "Awaiting verification completion" };
}

export function canReleaseCreatorSettlement(input: {
  verificationRecords: VerificationRecord[];
  fraudAssessments: FraudAssessment[];
  disputes: Dispute[];
  unlock: StudioRevealUnlock;
  reveal?: MagicReveal;
}): { ok: boolean; reason?: string } {
  const { unlock, disputes, verificationRecords, fraudAssessments, reveal } = input;
  const open = disputes.some(
    (d) =>
      (d.unlockId === unlock.id || d.revealId === unlock.revealId) &&
      (d.status === "open" || d.status === "collecting_evidence" || d.status === "under_review")
  );
  if (open) return { ok: false, reason: "Open dispute on unlock/reveal" };

  const vr = verificationRecords.filter((r) => r.revealId === unlock.revealId || r.subjectId === unlock.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  const fa = fraudAssessments
    .filter((f) => f.subjectId === unlock.id || f.subjectId === unlock.revealId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  const fraudLevel = fa?.riskLevel ?? "low";
  if (fraudLevel === "high" || fraudLevel === "critical") {
    return { ok: false, reason: "Fraud risk too high for settlement release" };
  }

  if (vr && !verificationRecordAllowsSettlement(vr, fraudLevel)) {
    return { ok: false, reason: "Verification record blocks settlement" };
  }

  if (!vr && unlock.verificationStatus !== "verified" && unlock.verificationStatus !== "not_required") {
    return { ok: false, reason: "Complete verification before release" };
  }

  if (reveal?.safety.safetyStatus === "blocked") {
    return { ok: false, reason: "Safety blocked" };
  }

  if (unlock.verificationStatus === "failed") {
    return { ok: false, reason: "Unlock verification failed" };
  }

  return { ok: true };
}
