export interface CreatorPopsContentAggregate {
  contentId: string;
  title: string;
  verifiedMoments: number;
  verifiedWatchTimeSeconds: number;
  averageMomentConfidence: number;
  attentionQualityScore: number;
  intentActionScore: number;
  saveFollowIntentQuality: number;
  rewardApprovalRate: number;
  rewardHoldRate: number;
  verifiedCompletionRate: number;
  replayRewatchQuality: number;
  suspiciousTrafficRate: number;
  trustAdjustedEngagementQuality: number;
}

export interface CreatorPopsAnalyticsAggregate {
  creatorId: string;
  verifiedMoments: number;
  verifiedWatchTimeSeconds: number;
  averageMomentConfidence: number;
  attentionQualityScore: number;
  intentActionScore: number;
  saveFollowIntentQuality: number;
  rewardApprovalRate: number;
  rewardHoldRate: number;
  contentCompletionRate: number;
  replayRewatchQuality: number;
  suspiciousTrafficRate: number;
  trustAdjustedEngagementQuality: number;
  creatorPresenceQuality: number;
  qualityTier: CreatorQualityTier;
  qualityFormulaBreakdown: CreatorPresenceQualityBreakdown;
  verifiedMomentsByContent: CreatorVerifiedMomentSeriesPoint[];
  rewardQualityBreakdown: CreatorRewardQualityBreakdown;
}

export interface CreatorPresenceQualityBreakdown {
  verifiedCompletionRateContribution: number;
  averageAttentionConfidenceContribution: number;
  averageIntentConfidenceContribution: number;
  replaySaveSignalContribution: number;
  lowFraudTrafficScoreContribution: number;
}

export interface CreatorVerifiedMomentSeriesPoint {
  label: string;
  verifiedMoments: number;
}

export interface CreatorRewardQualityBreakdown {
  approvalRate: number;
  holdRate: number;
  suspiciousTrafficRate: number;
  trustAdjustedEngagementQuality: number;
}

export type CreatorQualityTier = "Emerging" | "Reliable" | "Strong" | "Premium" | "Elite";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function weightedAverage(values: number[], weights: number[]): number {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }

  const weightedTotal = values.reduce((sum, value, index) => sum + value * weights[index], 0);
  return clamp01(weightedTotal / totalWeight);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratioSafe(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

export function computeCreatorPresenceQuality(params: {
  verifiedCompletionRate: number;
  averageAttentionConfidence: number;
  averageIntentConfidence: number;
  replaySaveSignal: number;
  lowFraudTrafficScore: number;
}): { score: number; breakdown: CreatorPresenceQualityBreakdown } {
  const verifiedCompletionRate = clamp01(params.verifiedCompletionRate);
  const averageAttentionConfidence = clamp01(params.averageAttentionConfidence);
  const averageIntentConfidence = clamp01(params.averageIntentConfidence);
  const replaySaveSignal = clamp01(params.replaySaveSignal);
  const lowFraudTrafficScore = clamp01(params.lowFraudTrafficScore);

  const breakdown: CreatorPresenceQualityBreakdown = {
    verifiedCompletionRateContribution: verifiedCompletionRate * 0.30,
    averageAttentionConfidenceContribution: averageAttentionConfidence * 0.25,
    averageIntentConfidenceContribution: averageIntentConfidence * 0.20,
    replaySaveSignalContribution: replaySaveSignal * 0.15,
    lowFraudTrafficScoreContribution: lowFraudTrafficScore * 0.10,
  };

  const score = clamp01(
    breakdown.verifiedCompletionRateContribution +
      breakdown.averageAttentionConfidenceContribution +
      breakdown.averageIntentConfidenceContribution +
      breakdown.replaySaveSignalContribution +
      breakdown.lowFraudTrafficScoreContribution,
  );

  return { score, breakdown };
}

export function getCreatorQualityTier(score: number): CreatorQualityTier {
  const clamped = clamp01(score);
  if (clamped >= 0.9) return "Elite";
  if (clamped >= 0.78) return "Premium";
  if (clamped >= 0.62) return "Strong";
  if (clamped >= 0.45) return "Reliable";
  return "Emerging";
}

export function buildCreatorPopsAnalytics(
  creatorId: string,
  contentAggregates: CreatorPopsContentAggregate[],
): CreatorPopsAnalyticsAggregate {
  const verifiedMoments = contentAggregates.reduce((sum, item) => sum + item.verifiedMoments, 0);
  const verifiedWatchTimeSeconds = contentAggregates.reduce((sum, item) => sum + item.verifiedWatchTimeSeconds, 0);

  const averageMomentConfidence = average(contentAggregates.map((item) => item.averageMomentConfidence));
  const attentionQualityScore = average(contentAggregates.map((item) => item.attentionQualityScore));
  const intentActionScore = average(contentAggregates.map((item) => item.intentActionScore));
  const saveFollowIntentQuality = average(contentAggregates.map((item) => item.saveFollowIntentQuality));
  const contentCompletionRate = average(contentAggregates.map((item) => item.verifiedCompletionRate));
  const replayRewatchQuality = average(contentAggregates.map((item) => item.replayRewatchQuality));
  const suspiciousTrafficRate = average(contentAggregates.map((item) => item.suspiciousTrafficRate));
  const trustAdjustedEngagementQuality = average(
    contentAggregates.map((item) => item.trustAdjustedEngagementQuality),
  );

  const rewardApprovalWeighted = contentAggregates.reduce(
    (sum, item) => sum + item.rewardApprovalRate * item.verifiedMoments,
    0,
  );
  const rewardHoldWeighted = contentAggregates.reduce((sum, item) => sum + item.rewardHoldRate * item.verifiedMoments, 0);
  const rewardApprovalRate = ratioSafe(rewardApprovalWeighted, verifiedMoments);
  const rewardHoldRate = ratioSafe(rewardHoldWeighted, verifiedMoments);

  const replaySaveSignal = clamp01(weightedAverage([replayRewatchQuality, saveFollowIntentQuality], [0.5, 0.5]));
  const lowFraudTrafficScore = clamp01(1 - suspiciousTrafficRate);
  const quality = computeCreatorPresenceQuality({
    verifiedCompletionRate: contentCompletionRate,
    averageAttentionConfidence: attentionQualityScore,
    averageIntentConfidence: intentActionScore,
    replaySaveSignal,
    lowFraudTrafficScore,
  });

  const verifiedMomentsByContent = contentAggregates.map((item) => ({
    label: item.title,
    verifiedMoments: item.verifiedMoments,
  }));

  return {
    creatorId,
    verifiedMoments,
    verifiedWatchTimeSeconds,
    averageMomentConfidence: clamp01(averageMomentConfidence),
    attentionQualityScore: clamp01(attentionQualityScore),
    intentActionScore: clamp01(intentActionScore),
    saveFollowIntentQuality: clamp01(saveFollowIntentQuality),
    rewardApprovalRate: clamp01(rewardApprovalRate),
    rewardHoldRate: clamp01(rewardHoldRate),
    contentCompletionRate: clamp01(contentCompletionRate),
    replayRewatchQuality: clamp01(replayRewatchQuality),
    suspiciousTrafficRate: clamp01(suspiciousTrafficRate),
    trustAdjustedEngagementQuality: clamp01(trustAdjustedEngagementQuality),
    creatorPresenceQuality: quality.score,
    qualityTier: getCreatorQualityTier(quality.score),
    qualityFormulaBreakdown: quality.breakdown,
    verifiedMomentsByContent,
    rewardQualityBreakdown: {
      approvalRate: clamp01(rewardApprovalRate),
      holdRate: clamp01(rewardHoldRate),
      suspiciousTrafficRate: clamp01(suspiciousTrafficRate),
      trustAdjustedEngagementQuality: clamp01(trustAdjustedEngagementQuality),
    },
  };
}

const creatorPopsMockContentAggregates: CreatorPopsContentAggregate[] = [
  {
    contentId: "clip_001",
    title: "Summer Training Mix",
    verifiedMoments: 920,
    verifiedWatchTimeSeconds: 110_400,
    averageMomentConfidence: 0.87,
    attentionQualityScore: 0.84,
    intentActionScore: 0.72,
    saveFollowIntentQuality: 0.69,
    rewardApprovalRate: 0.83,
    rewardHoldRate: 0.11,
    verifiedCompletionRate: 0.78,
    replayRewatchQuality: 0.67,
    suspiciousTrafficRate: 0.12,
    trustAdjustedEngagementQuality: 0.81,
  },
  {
    contentId: "clip_002",
    title: "Recovery Routine",
    verifiedMoments: 760,
    verifiedWatchTimeSeconds: 95_800,
    averageMomentConfidence: 0.85,
    attentionQualityScore: 0.81,
    intentActionScore: 0.68,
    saveFollowIntentQuality: 0.64,
    rewardApprovalRate: 0.79,
    rewardHoldRate: 0.14,
    verifiedCompletionRate: 0.72,
    replayRewatchQuality: 0.61,
    suspiciousTrafficRate: 0.16,
    trustAdjustedEngagementQuality: 0.76,
  },
  {
    contentId: "clip_003",
    title: "Long-form Coach Session",
    verifiedMoments: 640,
    verifiedWatchTimeSeconds: 129_600,
    averageMomentConfidence: 0.9,
    attentionQualityScore: 0.86,
    intentActionScore: 0.75,
    saveFollowIntentQuality: 0.71,
    rewardApprovalRate: 0.86,
    rewardHoldRate: 0.08,
    verifiedCompletionRate: 0.81,
    replayRewatchQuality: 0.74,
    suspiciousTrafficRate: 0.09,
    trustAdjustedEngagementQuality: 0.85,
  },
];

export function getCreatorPopsAnalyticsMock(creatorId = "creator_demo_01"): CreatorPopsAnalyticsAggregate {
  return buildCreatorPopsAnalytics(creatorId, creatorPopsMockContentAggregates);
}
