import type {
  FraudAssessment,
  FraudRecommendedAction,
  FraudRiskLevel,
  FraudSeverity,
  FraudSignal,
  FraudSignalType,
  VerificationSubjectType,
} from "./studioVerificationTypes";
import type { MagicReveal } from "../studioTypes";
import type { StudioLedgerEntry, StudioRevealUnlock, StudioWalletAccount } from "../wallet/studioWalletTypes";
import type { RuntimePostActionEvent } from "../feed/studioFeedTypes";

function evId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function sevScore(s: FraudSeverity): number {
  switch (s) {
    case "low":
      return 10;
    case "medium":
      return 25;
    case "high":
      return 50;
    case "critical":
      return 80;
    default:
      return 0;
  }
}

export function fraudRiskLevelFromScore(score: number): FraudRiskLevel {
  if (score <= 24) return "low";
  if (score <= 49) return "medium";
  if (score <= 74) return "high";
  return "critical";
}

function recommendedFromLevel(level: FraudRiskLevel, hasCritical: boolean): FraudRecommendedAction {
  if (hasCritical || level === "critical") return "reject";
  if (level === "high") return "require_review";
  if (level === "medium") return "allow_with_hold";
  return "allow";
}

export type AssessFraudRiskInput = {
  viewerAccount: StudioWalletAccount;
  creatorAccount?: StudioWalletAccount;
  subjectType: VerificationSubjectType;
  subjectId: string;
  post?: { id: string; metrics?: { verifiedViews: number } };
  reveal?: MagicReveal;
  campaign?: { id: string; fraudSensitivity?: "low" | "medium" | "high"; frequencyCapPerDay?: number };
  session?: { watchMs: number; durationMs: number; attentionScore: number; flagged?: boolean };
  recentEvents: RuntimePostActionEvent[];
  recentUnlocks: StudioRevealUnlock[];
  ledgerEntries: StudioLedgerEntry[];
  claimKeysUsed?: string[];
};

function viewerKeys(a: StudioWalletAccount): string[] {
  return [a.userId, a.id].filter(Boolean) as string[];
}

function viewerMatchesAccount(keys: string[], accountId: string): boolean {
  return keys.includes(accountId);
}

export function assessFraudRisk(input: AssessFraudRiskInput): FraudAssessment {
  const now = new Date().toISOString();
  const signals: FraudSignal[] = [];
  const viewerId = input.viewerAccount.userId;
  const vKeys = viewerKeys(input.viewerAccount);

  const push = (type: FraudSignalType, severity: FraudSeverity, message: string, meta?: Record<string, unknown>) => {
    signals.push({
      id: evId(),
      type,
      severity,
      scoreImpact: sevScore(severity),
      message,
      metadata: meta ?? {},
      createdAt: now,
    });
  };

  const recentWindowMs = 60_000;
  const cutoff = Date.now() - recentWindowMs;
  const rapid = input.recentEvents.filter(
    (e) => viewerMatchesAccount(vKeys, e.viewerAccountId) && new Date(e.createdAt).getTime() >= cutoff
  );
  if (rapid.length > 12) {
    push("rapid_actions", "high", "Unusual action velocity in 60s window", { count: rapid.length });
  }

  const sameReveal = input.recentUnlocks.filter(
    (u) => viewerMatchesAccount(vKeys, u.viewerAccountId) && u.revealId === input.reveal?.id
  );
  if (sameReveal.length > 2) {
    push("repeated_unlocks", "medium", "Repeated unlock attempts on same reveal", { count: sameReveal.length });
  }

  if (input.session && input.subjectType === "view") {
    const minWatch = Math.max(3000, (input.session.durationMs || 1) * 0.25);
    if (input.session.watchMs < minWatch && input.post && (input.post.metrics?.verifiedViews ?? 0) > 0) {
      push("impossible_watch_time", "high", "Verified view signal without sufficient watch duration", {
        watchMs: input.session.watchMs,
        minWatch,
      });
    }
    if ((input.session.attentionScore ?? 1) < 0.35) {
      push("low_attention", "medium", "Attention score below threshold", { attention: input.session.attentionScore });
    }
  }

  if (input.subjectType === "campaign_action" && input.claimKeysUsed?.includes(input.subjectId)) {
    push("campaign_frequency_cap", "high", "Campaign reward already claimed for this key", { subjectId: input.subjectId });
  }

  const reversalCount = input.ledgerEntries.filter((e) => {
    if (e.type !== "magic_refund" || !e.metadata) return false;
    const vid = (e.metadata as { viewerId?: string }).viewerId;
    return vid != null && viewerMatchesAccount(vKeys, vid);
  }).length;
  if (reversalCount > 2) {
    push("payment_reversal", "medium", "Multiple payment reversals on record", { reversalCount });
  }

  if (
    input.creatorAccount &&
    (input.creatorAccount.userId === viewerId ||
      input.creatorAccount.id === input.viewerAccount.id ||
      input.creatorAccount.userId === input.viewerAccount.userId)
  ) {
    push("creator_self_dealing", "critical", "Viewer and creator accounts match (mock linked check)", {});
  }

  const lowValueCampaignTaps = input.recentEvents.filter(
    (e) =>
      e.action === "magic_unlock" &&
      viewerMatchesAccount(vKeys, e.viewerAccountId) &&
      new Date(e.createdAt).getTime() >= Date.now() - 86_400_000
  );
  if (lowValueCampaignTaps.length > 20) {
    push("reward_farming", "high", "High volume of low-context unlock actions", { count: lowValueCampaignTaps.length });
  }

  if (input.session?.flagged) {
    push("suspicious_session_pattern", "medium", "Session flagged for review", {});
  }

  if (input.reveal?.safety.safetyStatus === "blocked") {
    push("blocked_content_attempt", "critical", "Blocked safety class on reveal", { revealId: input.reveal.id });
  }

  if (input.campaign?.fraudSensitivity === "high" && rapid.length > 6) {
    push("bot_like_timing", "medium", "Timing distribution resembles automation (mock)", {});
  }

  let riskScore = signals.reduce((s, x) => s + x.scoreImpact, 0);
  riskScore = Math.max(0, Math.min(100, riskScore));
  const riskLevel = fraudRiskLevelFromScore(riskScore);
  const hasCritical = signals.some((s) => s.severity === "critical");
  let recommendedAction = recommendedFromLevel(riskLevel, hasCritical);
  if (riskLevel === "high" && !hasCritical) {
    recommendedAction = "require_pops";
  }
  if (riskLevel === "critical") {
    recommendedAction = "reverse";
  }

  return {
    id: `fa_${Date.now()}`,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    viewerAccountId: viewerId,
    creatorAccountId: input.creatorAccount?.userId,
    riskScore,
    riskLevel,
    signals,
    recommendedAction,
    createdAt: now,
  };
}
