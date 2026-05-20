import type { RuntimePost, RuntimePostActionEvent, RuntimePostMetric, RuntimeViewerSession } from "./studioFeedTypes";
import type { StudioLedgerEntry, StudioRevealUnlock } from "../wallet/studioWalletTypes";
import { sumLedgerByType } from "../wallet/studioWalletLedger";

export function calculateAttentionQuality(input: {
  watchMs: number;
  durationMs: number;
  verifiedHuman: boolean;
  flagged?: boolean;
}): { attentionScore: number; verified: boolean } {
  const { watchMs, durationMs, verifiedHuman, flagged } = input;
  const dur = Math.max(1, durationMs);
  const ratio = watchMs / dur;
  const focusMock = Math.min(100, Math.round(40 + ratio * 55 + (verifiedHuman ? 5 : 0)));
  const attentionScore = flagged ? Math.min(focusMock, 40) : focusMock;
  return { attentionScore, verified: verifiedHuman && !flagged };
}

export function meetsVerifiedViewRule(input: {
  watchMs: number;
  durationMs: number;
  verifiedHuman: boolean;
  flagged?: boolean;
  attentionScore: number;
}): boolean {
  const { watchMs, durationMs, verifiedHuman, flagged, attentionScore } = input;
  if (flagged) return false;
  if (!verifiedHuman) return false;
  if (attentionScore < 55) return false;
  const ratioOk = watchMs >= durationMs * 0.6;
  const longVideo = durationMs >= 25_000;
  const longVideoMinOk = longVideo && watchMs >= 15_000;
  return ratioOk || longVideoMinOk;
}

export function calculatePostMetrics(
  postId: string,
  events: RuntimePostActionEvent[],
  unlocks: StudioRevealUnlock[],
  ledgerEntries: StudioLedgerEntry[]
): RuntimePostMetric {
  const ev = events.filter((e) => e.postId === postId);
  const ulk = unlocks.filter((u) => u.postId === postId);
  const led = ledgerEntries.filter((e) => e.postId === postId);

  const impressions = ev.filter((e) => e.action === "view" && e.metadata.impression === true).length;
  const sessionEndViews = ev.filter((e) => e.action === "view" && e.metadata.sessionEnd === true);
  const verifiedViews = ev.filter((e) => e.action === "verified_view").length;
  const views = Math.max(sessionEndViews.length, verifiedViews);
  const likes = ev.filter((e) => e.action === "like").length;
  const comments = ev.filter((e) => e.action === "comment").length;
  const saves = ev.filter((e) => e.action === "save").length;
  const shares = ev.filter((e) => e.action === "share").length;
  const follows = ev.filter((e) => e.action === "follow").length;
  const tips = ev.filter((e) => e.action === "tip").length;
  const magicTaps = ev.filter((e) => e.action === "magic_tap").length;
  const magicUnlocks = ev.filter((e) => e.action === "magic_unlock").length;
  const reports = ev.filter((e) => e.action === "report").length;
  const blocks = ev.filter((e) => e.action === "hide").length;

  const watchSamples = ev.filter((e) => typeof e.metadata.watchMs === "number") as Array<RuntimePostActionEvent & { metadata: { watchMs: number } }>;
  const averageWatchMs =
    watchSamples.length > 0
      ? Math.round(watchSamples.reduce((s, e) => s + (e.metadata.watchMs ?? 0), 0) / watchSamples.length)
      : 0;

  const completionRate = views > 0 ? Math.min(1, verifiedViews / views) : 0;
  const unlockConversionRate = magicTaps > 0 ? Math.min(1, magicUnlocks / magicTaps) : 0;

  const creatorGrossEarned = sumLedgerByType(led, "magic_creator_pending_credit") + sumLedgerByType(led, "escrow_release");
  const creatorPendingEarned = sumLedgerByType(led, "magic_creator_pending_credit");
  const platformFees = sumLedgerByType(led, "magic_platform_fee");
  const viewerRewardsPaid = sumLedgerByType(led, "magic_viewer_reward");

  return {
    impressions: Math.max(impressions, verifiedViews > 0 ? 1 : 0),
    views,
    verifiedViews,
    completionRate,
    averageWatchMs,
    likes,
    comments,
    saves,
    shares,
    follows,
    tips,
    magicTaps,
    magicUnlocks,
    unlockConversionRate,
    creatorGrossEarned,
    creatorPendingEarned,
    platformFees,
    viewerRewardsPaid,
    reports,
    blocks,
  };
}

export type RevealPerformanceRow = {
  revealId: string;
  views: number;
  taps: number;
  unlocks: number;
  conversionRate: number;
  grossRevenue: number;
  pendingRevenue: number;
  refunds: number;
  viewerRewards: number;
  blockedAttempts: number;
};

export function calculateRevealMetrics(
  post: RuntimePost,
  revealId: string,
  events: RuntimePostActionEvent[],
  unlocks: StudioRevealUnlock[],
  ledgerEntries: StudioLedgerEntry[]
): RevealPerformanceRow {
  const ev = events.filter((e) => e.postId === post.id && e.revealId === revealId);
  const taps = ev.filter((e) => e.action === "magic_tap").length;
  const unlocksCount = ev.filter((e) => e.action === "magic_unlock").length;
  const views = ev.filter((e) => e.action === "view" || e.action === "magic_tap").length;
  const blockedAttempts = ev.filter((e) => e.metadata.blocked === true).length;

  const ulk = unlocks.filter((u) => u.postId === post.id && u.revealId === revealId);
  const refunds = ulk.filter((u) => u.status === "refunded" || u.settlementStatus === "refunded").length;

  const led = ledgerEntries.filter((e) => e.postId === post.id && e.revealId === revealId);
  const grossRevenue = ulk.reduce((s, u) => s + u.creatorGrossAmount, 0);
  const pendingRevenue = ulk.filter((u) => u.settlementStatus === "pending").reduce((s, u) => s + u.creatorGrossAmount, 0);
  const viewerRewards = sumLedgerByType(led, "magic_viewer_reward");
  const conversionRate = taps > 0 ? Math.min(1, unlocksCount / taps) : 0;

  return {
    revealId,
    views,
    taps,
    unlocks: unlocksCount,
    conversionRate,
    grossRevenue,
    pendingRevenue,
    refunds,
    viewerRewards,
    blockedAttempts,
  };
}

export type CreatorPostSummary = {
  totalPosts: number;
  publishedPosts: number;
  totalViews: number;
  verifiedViews: number;
  totalUnlocks: number;
  totalCreatorPending: number;
  totalCreatorAvailable: number;
  totalPlatformFees: number;
  topReveal: { revealId: string; revenue: number } | null;
  topEarningPost: { postId: string; earnings: number } | null;
};

export function calculateCreatorPostSummary(
  posts: RuntimePost[],
  ledgerEntries: StudioLedgerEntry[],
  creatorUserId: string
): CreatorPostSummary {
  const mine = posts.filter((p) => p.creatorUserId === creatorUserId);
  const publishedPosts = mine.filter((p) => p.status === "published").length;
  const totalViews = mine.reduce((s, p) => s + p.metrics.views, 0);
  const verifiedViews = mine.reduce((s, p) => s + p.metrics.verifiedViews, 0);
  const totalUnlocks = mine.reduce((s, p) => s + p.metrics.magicUnlocks, 0);

  const postIds = new Set(mine.map((p) => p.id));
  const ledMine = ledgerEntries.filter((e) => e.postId && postIds.has(e.postId));
  const totalCreatorPending = mine.reduce((s, p) => s + p.metrics.creatorPendingEarned, 0);
  const totalCreatorAvailable = mine.reduce((s, p) => s + p.metrics.creatorGrossEarned * 0.25, 0);
  const totalPlatformFees = mine.reduce((s, p) => s + p.metrics.platformFees, 0);

  const revealRevenue = new Map<string, number>();
  for (const e of ledMine) {
    if (!e.revealId) continue;
    if (e.type === "magic_creator_pending_credit" || e.type === "escrow_release") {
      revealRevenue.set(e.revealId, (revealRevenue.get(e.revealId) ?? 0) + e.amount);
    }
  }
  let topReveal: { revealId: string; revenue: number } | null = null;
  for (const [revealId, revenue] of revealRevenue) {
    if (!topReveal || revenue > topReveal.revenue) topReveal = { revealId, revenue };
  }

  let topEarningPost: { postId: string; earnings: number } | null = null;
  for (const p of mine) {
    const e = p.metrics.creatorGrossEarned + p.metrics.creatorPendingEarned;
    if (!topEarningPost || e > topEarningPost.earnings) topEarningPost = { postId: p.id, earnings: e };
  }

  return {
    totalPosts: mine.length,
    publishedPosts,
    totalViews,
    verifiedViews,
    totalUnlocks,
    totalCreatorPending,
    totalCreatorAvailable,
    totalPlatformFees,
    topReveal,
    topEarningPost,
  };
}

export function recalcPostMetricsInPlace(
  post: RuntimePost,
  events: RuntimePostActionEvent[],
  unlocks: StudioRevealUnlock[],
  ledgerEntries: StudioLedgerEntry[]
): RuntimePost {
  return {
    ...post,
    metrics: calculatePostMetrics(post.id, events, unlocks, ledgerEntries),
    updatedAt: new Date().toISOString(),
  };
}
