import type {
  TrustFraudFinding,
  TrustFraudReviewJobResult,
  TrustFraudReviewScope
} from "@/types/alphabet/trust-fraud-review.types";
import { fetchTrustFraudReviewSourceRowsDb } from "../db-repositories/trust-fraud-review.repository";
import { createTrustFraudReviewBatch } from "./trust-fraud-review-store";
import {
  dateRangeForTrustFraudBatchDate,
  groupBy,
  isFailureStatus,
  normalizeRiskScore,
  sumBy,
  toNumber,
  uniqueCount
} from "./trust-fraud-review-normalizers";

function finding(params: {
  type: TrustFraudFinding["findingType"];
  category: TrustFraudFinding["category"];
  severity: TrustFraudFinding["severity"];
  title: string;
  summary: string;
  linkedObjectIds?: TrustFraudFinding["linkedObjectIds"];
  scores?: Partial<TrustFraudFinding["scores"]>;
  recommendedActions: TrustFraudFinding["recommendedActions"];
  evidence?: Record<string, unknown>;
  redactedEvidence?: Record<string, unknown>;
  reasonCodes: string[];
}): TrustFraudFinding {
  return {
    findingId: `trust_fraud_finding_${crypto.randomUUID()}`,
    findingType: params.type,
    category: params.category,
    severity: params.severity,
    title: params.title,
    summary: params.summary,
    linkedObjectIds: params.linkedObjectIds ?? {},
    scores: {
      trustRiskScore: params.scores?.trustRiskScore ?? 0,
      fraudRiskScore: params.scores?.fraudRiskScore ?? 0,
      walletRiskScore: params.scores?.walletRiskScore ?? 0,
      payoutRiskScore: params.scores?.payoutRiskScore ?? 0,
      campaignRiskScore: params.scores?.campaignRiskScore ?? 0,
      agePolicyRiskScore: params.scores?.agePolicyRiskScore ?? 0,
      identityRiskScore: params.scores?.identityRiskScore ?? 0,
      deviceRiskScore: params.scores?.deviceRiskScore ?? 0,
      rewardAbuseRiskScore: params.scores?.rewardAbuseRiskScore ?? 0,
      presenceRiskScore: params.scores?.presenceRiskScore ?? 0,
      confidenceScore: params.scores?.confidenceScore ?? 0.85
    },
    recommendedActions: params.recommendedActions,
    evidence: (params.evidence ?? {}) as never,
    redactedEvidence: (params.redactedEvidence ?? {}) as never,
    reasonCodes: params.reasonCodes
  };
}

function buildCounts(rows: Awaited<ReturnType<typeof fetchTrustFraudReviewSourceRowsDb>>) {
  return {
    userCount: rows.users.length,
    walletCount: rows.wallets.length,
    walletAccountCount: rows.walletAccounts.length,
    ledgerEntryCount: rows.ledgerEntries.length,
    alphabetEventCount: rows.alphabetEvents.length,
    trustEventCount: rows.trustEvents.length,
    uValueEventCount: rows.uValueEvents.length,
    rewardEventCount: rows.rewardEvents.length,
    payoutCount: rows.payouts.length,
    campaignCount: rows.campaigns.length,
    deviceSignalCount: rows.deviceSignals.length,
    presenceSignalCount: rows.presenceSignals.length,
    policyDecisionCount: rows.policyDecisions.length,
    adminReviewCaseCount: rows.adminReviewCases.length,
    operationalAlertCount: rows.operationalAlerts.length
  };
}

function buildTrustFindings(rows: Awaited<ReturnType<typeof fetchTrustFraudReviewSourceRowsDb>>) {
  const findings: TrustFraudFinding[] = [];
  const byUser = groupBy(rows.trustEvents as never, "user_id");
  for (const [userId, events] of Object.entries(byUser)) {
    const negativeEvents = events.filter((event: any) => toNumber(event.trust_delta) < 0);
    const totalTrustDrop = Math.abs(
      negativeEvents.reduce((sum: number, event: any) => sum + Math.min(0, toNumber(event.trust_delta)), 0)
    );
    if (totalTrustDrop >= 0.5 || negativeEvents.length >= 5) {
      findings.push(
        finding({
          type: "trust_score_drop",
          category: "trust",
          severity: totalTrustDrop >= 1 ? "critical" : "danger",
          title: "Trust score drop detected",
          summary: "User accumulated significant negative trust movement during the batch window.",
          linkedObjectIds: { userId },
          scores: {
            trustRiskScore: Math.min(1, totalTrustDrop),
            fraudRiskScore: negativeEvents.length >= 5 ? 0.55 : 0.3,
            confidenceScore: 0.9
          },
          recommendedActions:
            totalTrustDrop >= 1
              ? ["create_review_case", "monitor", "escalate_to_risk_team"]
              : ["monitor"],
          evidence: { userId, negativeEventCount: negativeEvents.length, totalTrustDrop },
          redactedEvidence: { userId, negativeEventCount: negativeEvents.length, totalTrustDrop },
          reasonCodes: ["trust_score_drop_detected"]
        })
      );
    }
  }
  return findings;
}

function buildRewardFindings(rows: Awaited<ReturnType<typeof fetchTrustFraudReviewSourceRowsDb>>) {
  const findings: TrustFraudFinding[] = [];
  const byUser = groupBy(rows.rewardEvents as never, "user_id");
  for (const [userId, events] of Object.entries(byUser)) {
    const rewardCount = events.length;
    const rewardAmount = sumBy(events as never, "amount");
    if (rewardCount >= 100 || rewardAmount >= 1000) {
      findings.push(
        finding({
          type: "reward_velocity_spike",
          category: "reward",
          severity: rewardCount >= 250 || rewardAmount >= 5000 ? "critical" : "danger",
          title: "Reward velocity spike",
          summary: "User earned rewards at abnormal velocity during the batch window.",
          linkedObjectIds: { userId },
          scores: {
            rewardAbuseRiskScore: Math.min(1, rewardCount / 250),
            fraudRiskScore: Math.min(1, rewardAmount / 5000),
            confidenceScore: 0.88
          },
          recommendedActions:
            rewardCount >= 250 || rewardAmount >= 5000
              ? ["create_review_case", "pause_rewards_review", "escalate_to_risk_team"]
              : ["monitor"],
          evidence: { userId, rewardCount, rewardAmount },
          redactedEvidence: { userId, rewardCount, rewardAmount },
          reasonCodes: ["reward_velocity_spike_detected"]
        })
      );
    }

    const repeatedObjects = Object.entries(groupBy(events as never, "object_id")).filter(
      ([, grouped]) => grouped.length >= 20
    );
    if (repeatedObjects.length > 0) {
      findings.push(
        finding({
          type: "earning_loop_abuse",
          category: "reward",
          severity: repeatedObjects.length >= 5 ? "critical" : "danger",
          title: "Possible earning loop abuse",
          summary: "User repeatedly earned against the same object set.",
          linkedObjectIds: { userId },
          scores: {
            rewardAbuseRiskScore: 0.85,
            fraudRiskScore: 0.75,
            confidenceScore: 0.86
          },
          recommendedActions: ["create_review_case", "pause_rewards_review", "escalate_to_risk_team"],
          evidence: { userId, repeatedObjectCount: repeatedObjects.length },
          redactedEvidence: { userId, repeatedObjectCount: repeatedObjects.length },
          reasonCodes: ["earning_loop_abuse_candidate"]
        })
      );
    }
  }
  return findings;
}

function buildDeviceIdentityFindings(rows: Awaited<ReturnType<typeof fetchTrustFraudReviewSourceRowsDb>>) {
  const findings: TrustFraudFinding[] = [];
  const byDeviceCluster = groupBy(rows.deviceSignals as never, "device_cluster_id");
  for (const [deviceClusterId, signals] of Object.entries(byDeviceCluster)) {
    const userCount = uniqueCount((signals as any[]).map((signal) => signal.user_id));
    if (deviceClusterId !== "unknown" && userCount >= 5) {
      findings.push(
        finding({
          type: "duplicate_device_cluster",
          category: "device",
          severity: userCount >= 15 ? "critical" : "danger",
          title: "Duplicate device cluster",
          summary: "Multiple users are linked to the same device cluster.",
          linkedObjectIds: { deviceClusterId },
          scores: {
            deviceRiskScore: Math.min(1, userCount / 15),
            identityRiskScore: Math.min(1, userCount / 20),
            fraudRiskScore: Math.min(1, userCount / 15),
            confidenceScore: 0.88
          },
          recommendedActions:
            userCount >= 15
              ? ["create_review_case", "request_reverification", "escalate_to_risk_team"]
              : ["monitor"],
          evidence: { deviceClusterId, userCount },
          redactedEvidence: { deviceClusterId, userCount },
          reasonCodes: ["duplicate_device_cluster_detected"]
        })
      );
    }
  }

  const byIdentityCluster = groupBy(rows.deviceSignals as never, "identity_cluster_id");
  for (const [identityClusterId, signals] of Object.entries(byIdentityCluster)) {
    const userCount = uniqueCount((signals as any[]).map((signal) => signal.user_id));
    if (identityClusterId !== "unknown" && userCount >= 3) {
      findings.push(
        finding({
          type: userCount >= 8 ? "sybil_cluster_candidate" : "duplicate_identity_cluster",
          category: "identity",
          severity: userCount >= 8 ? "critical" : "danger",
          title: "Identity cluster risk",
          summary: "Multiple accounts appear linked through identity/device clustering.",
          linkedObjectIds: { identityClusterId },
          scores: {
            identityRiskScore: Math.min(1, userCount / 8),
            deviceRiskScore: 0.65,
            fraudRiskScore: Math.min(1, userCount / 8),
            confidenceScore: 0.86
          },
          recommendedActions: ["create_review_case", "request_reverification", "escalate_to_risk_team"],
          evidence: { identityClusterId, userCount },
          redactedEvidence: { identityClusterId, userCount },
          reasonCodes: ["identity_cluster_risk_detected"]
        })
      );
    }
  }
  return findings;
}

function buildPresenceFindings(rows: Awaited<ReturnType<typeof fetchTrustFraudReviewSourceRowsDb>>) {
  const findings: TrustFraudFinding[] = [];
  const byUser = groupBy(rows.presenceSignals as never, "user_id");
  for (const [userId, signals] of Object.entries(byUser)) {
    const failedSignals = (signals as any[]).filter(
      (signal) => isFailureStatus(signal.status) || normalizeRiskScore(signal.risk_score) > 0.75
    );
    if (failedSignals.length >= 10) {
      findings.push(
        finding({
          type: "suspicious_presence_pattern",
          category: "presence",
          severity: failedSignals.length >= 30 ? "critical" : "danger",
          title: "Suspicious presence pattern",
          summary: "Presence verification produced repeated risk/failure signals.",
          linkedObjectIds: { userId, presenceSessionId: failedSignals[0]?.presence_session_id ?? null },
          scores: {
            presenceRiskScore: Math.min(1, failedSignals.length / 30),
            fraudRiskScore: Math.min(1, failedSignals.length / 30),
            confidenceScore: 0.84
          },
          recommendedActions:
            failedSignals.length >= 30
              ? ["create_review_case", "request_reverification", "pause_rewards_review"]
              : ["monitor"],
          evidence: { userId, failedPresenceSignals: failedSignals.length },
          redactedEvidence: { userId, failedPresenceSignals: failedSignals.length },
          reasonCodes: ["suspicious_presence_pattern_detected"]
        })
      );
    }
  }
  return findings;
}

function buildPayoutWalletFindings(rows: Awaited<ReturnType<typeof fetchTrustFraudReviewSourceRowsDb>>) {
  const findings: TrustFraudFinding[] = [];
  const byUser = groupBy(rows.payouts as never, "user_id");
  for (const [userId, payouts] of Object.entries(byUser)) {
    const failed = (payouts as any[]).filter((payout) => isFailureStatus(payout.status));
    const unknown = (payouts as any[]).filter((payout) => String(payout.status).includes("unknown"));
    const payoutAmount = sumBy(payouts as never, "amount");
    if (failed.length >= 3 || unknown.length > 0 || payoutAmount >= 5000) {
      findings.push(
        finding({
          type: unknown.length > 0 ? "payout_risk_above_threshold" : "external_transfer_failure_pattern",
          category: "payout",
          severity: unknown.length > 0 || payoutAmount >= 10000 ? "critical" : "danger",
          title: "Payout risk above threshold",
          summary: "User has payout failures, unknown provider exposure, or high payout volume.",
          linkedObjectIds: { userId, externalTransferId: (payouts as any[])[0]?.external_transfer_id ?? null },
          scores: {
            payoutRiskScore: Math.min(1, (failed.length + unknown.length * 3) / 10),
            walletRiskScore: payoutAmount >= 5000 ? 0.75 : 0.45,
            fraudRiskScore: failed.length >= 3 ? 0.65 : 0.4,
            confidenceScore: 0.9
          },
          recommendedActions: ["create_review_case", "restrict_withdrawals", "escalate_to_risk_team"],
          evidence: {
            userId,
            payoutCount: (payouts as any[]).length,
            failedCount: failed.length,
            unknownCount: unknown.length,
            payoutAmount
          },
          redactedEvidence: {
            userId,
            payoutCount: (payouts as any[]).length,
            failedCount: failed.length,
            unknownCount: unknown.length,
            payoutAmount
          },
          reasonCodes: ["payout_risk_above_threshold"]
        })
      );
    }
  }

  const riskyWallets = rows.wallets.filter((wallet: any) => normalizeRiskScore(wallet.risk_score ?? wallet.wallet_risk_score) >= 0.8);
  for (const wallet of riskyWallets as any[]) {
    const score = normalizeRiskScore(wallet.risk_score ?? wallet.wallet_risk_score);
    findings.push(
      finding({
        type: "wallet_risk_above_threshold",
        category: "wallet",
        severity: score >= 0.95 ? "critical" : "danger",
        title: "Wallet risk above threshold",
        summary: "Wallet-level risk score exceeded daily review threshold.",
        linkedObjectIds: { userId: wallet.user_id, walletId: wallet.wallet_id },
        scores: {
          walletRiskScore: score,
          payoutRiskScore: 0.5,
          fraudRiskScore: 0.55,
          confidenceScore: 0.88
        },
        recommendedActions: ["create_review_case", "freeze_wallet_review", "restrict_withdrawals"],
        evidence: { walletId: wallet.wallet_id, riskScore: wallet.risk_score ?? wallet.wallet_risk_score },
        redactedEvidence: { walletId: wallet.wallet_id, riskScore: wallet.risk_score ?? wallet.wallet_risk_score },
        reasonCodes: ["wallet_risk_above_threshold"]
      })
    );
  }
  return findings;
}

function buildCampaignFindings(rows: Awaited<ReturnType<typeof fetchTrustFraudReviewSourceRowsDb>>) {
  const findings: TrustFraudFinding[] = [];
  for (const campaign of rows.campaigns as any[]) {
    const budgetAmount = toNumber(campaign.budget_amount);
    const spentAmount = toNumber(campaign.spent_amount);
    const abuseRisk = normalizeRiskScore(campaign.abuse_risk_score ?? campaign.risk_score);
    const drainRatio = budgetAmount > 0 ? spentAmount / budgetAmount : 0;
    if (abuseRisk >= 0.75) {
      findings.push(
        finding({
          type: "campaign_abuse_pattern",
          category: "campaign",
          severity: abuseRisk >= 0.95 ? "critical" : "danger",
          title: "Campaign abuse pattern",
          summary: "Campaign exceeded abuse-risk threshold.",
          linkedObjectIds: { campaignId: campaign.campaign_id, creatorId: campaign.creator_id, userId: campaign.owner_user_id },
          scores: {
            campaignRiskScore: abuseRisk,
            fraudRiskScore: abuseRisk,
            confidenceScore: 0.86
          },
          recommendedActions: ["create_review_case", "freeze_campaign_review", "escalate_to_risk_team"],
          evidence: { campaignId: campaign.campaign_id, abuseRisk },
          redactedEvidence: { campaignId: campaign.campaign_id, abuseRisk },
          reasonCodes: ["campaign_abuse_pattern_detected"]
        })
      );
    }
    if (drainRatio >= 0.9 && budgetAmount > 0) {
      findings.push(
        finding({
          type: "campaign_budget_drain_pattern",
          category: "campaign",
          severity: drainRatio >= 0.98 ? "critical" : "warning",
          title: "Campaign budget drain pattern",
          summary: "Campaign spent most of its budget during the batch window.",
          linkedObjectIds: { campaignId: campaign.campaign_id, creatorId: campaign.creator_id, userId: campaign.owner_user_id },
          scores: {
            campaignRiskScore: Math.min(1, drainRatio),
            fraudRiskScore: drainRatio >= 0.98 ? 0.65 : 0.35,
            confidenceScore: 0.82
          },
          recommendedActions: drainRatio >= 0.98 ? ["create_review_case", "freeze_campaign_review"] : ["monitor"],
          evidence: { campaignId: campaign.campaign_id, budgetAmount, spentAmount, drainRatio },
          redactedEvidence: { campaignId: campaign.campaign_id, budgetAmount, spentAmount, drainRatio },
          reasonCodes: ["campaign_budget_drain_pattern_detected"]
        })
      );
    }
  }
  return findings;
}

function buildPolicyFindings(rows: Awaited<ReturnType<typeof fetchTrustFraudReviewSourceRowsDb>>) {
  const findings: TrustFraudFinding[] = [];
  for (const decision of rows.policyDecisions as any[]) {
    const decisionType = String(decision.decision_type ?? decision.policy_type ?? "");
    const status = String(decision.status ?? decision.decision_status ?? "");
    const reasonText = JSON.stringify(decision.reason_codes ?? decision.reason_code ?? decision.metadata ?? {});
    if (decisionType.includes("age") && (isFailureStatus(status) || reasonText.includes("age"))) {
      findings.push(
        finding({
          type: "age_policy_conflict",
          category: "age_policy",
          severity: "critical",
          title: "Age policy conflict",
          summary: "Policy decision indicates age-related eligibility conflict.",
          linkedObjectIds: { userId: decision.user_id, policyDecisionId: decision.policy_decision_id },
          scores: {
            agePolicyRiskScore: 0.95,
            identityRiskScore: 0.6,
            confidenceScore: 0.88
          },
          recommendedActions: ["create_review_case", "escalate_to_compliance", "request_reverification"],
          evidence: { policyDecisionId: decision.policy_decision_id, decisionType, status },
          redactedEvidence: { policyDecisionId: decision.policy_decision_id, decisionType, status },
          reasonCodes: ["age_policy_conflict_detected"]
        })
      );
    }
    if (decisionType.includes("kyc") && isFailureStatus(status)) {
      findings.push(
        finding({
          type: "kyc_policy_conflict",
          category: "identity",
          severity: "critical",
          title: "KYC policy conflict",
          summary: "KYC-related policy decision failed or requires review.",
          linkedObjectIds: { userId: decision.user_id, policyDecisionId: decision.policy_decision_id },
          scores: {
            identityRiskScore: 0.9,
            fraudRiskScore: 0.75,
            confidenceScore: 0.88
          },
          recommendedActions: ["create_review_case", "request_reverification", "escalate_to_compliance"],
          evidence: { policyDecisionId: decision.policy_decision_id, decisionType, status },
          redactedEvidence: { policyDecisionId: decision.policy_decision_id, decisionType, status },
          reasonCodes: ["kyc_policy_conflict_detected"]
        })
      );
    }
  }
  return findings;
}

function buildReviewAlertFindings(rows: Awaited<ReturnType<typeof fetchTrustFraudReviewSourceRowsDb>>) {
  const findings: TrustFraudFinding[] = [];
  const reviewsByUser = groupBy(rows.adminReviewCases as never, "user_id");
  const alertsByUser = groupBy(rows.operationalAlerts as never, "user_id");

  for (const [userId, reviews] of Object.entries(reviewsByUser)) {
    const failed = (reviews as any[]).filter((review) => isFailureStatus(review.status));
    if (failed.length >= 3) {
      findings.push(
        finding({
          type: "repeated_review_failures",
          category: "fraud",
          severity: failed.length >= 5 ? "critical" : "danger",
          title: "Repeated review failures",
          summary: "User has repeated failed or escalated review cases.",
          linkedObjectIds: { userId, reviewCaseId: failed[0]?.review_case_id ?? null },
          scores: {
            fraudRiskScore: Math.min(1, failed.length / 5),
            trustRiskScore: 0.75,
            confidenceScore: 0.9
          },
          recommendedActions: ["create_review_case", "escalate_to_risk_team"],
          evidence: { userId, failedReviewCount: failed.length },
          redactedEvidence: { userId, failedReviewCount: failed.length },
          reasonCodes: ["repeated_review_failures_detected"]
        })
      );
    }
  }

  for (const [userId, alerts] of Object.entries(alertsByUser)) {
    if ((alerts as any[]).length >= 5) {
      findings.push(
        finding({
          type: "repeated_operational_alerts",
          category: "fraud",
          severity: (alerts as any[]).length >= 10 ? "critical" : "danger",
          title: "Repeated operational alerts",
          summary: "User is linked to repeated operational alerts.",
          linkedObjectIds: { userId, alertId: (alerts as any[])[0]?.alert_id ?? null },
          scores: {
            fraudRiskScore: Math.min(1, (alerts as any[]).length / 10),
            walletRiskScore: 0.5,
            confidenceScore: 0.9
          },
          recommendedActions: ["create_review_case", "monitor", "escalate_to_risk_team"],
          evidence: { userId, alertCount: (alerts as any[]).length },
          redactedEvidence: { userId, alertCount: (alerts as any[]).length },
          reasonCodes: ["repeated_operational_alerts_detected"]
        })
      );
    }
  }
  return findings;
}

function buildFindings(rows: Awaited<ReturnType<typeof fetchTrustFraudReviewSourceRowsDb>>) {
  return [
    ...buildTrustFindings(rows),
    ...buildRewardFindings(rows),
    ...buildDeviceIdentityFindings(rows),
    ...buildPresenceFindings(rows),
    ...buildPayoutWalletFindings(rows),
    ...buildCampaignFindings(rows),
    ...buildPolicyFindings(rows),
    ...buildReviewAlertFindings(rows)
  ];
}

export async function runTrustFraudReviewBatch(params?: {
  batchDate?: string;
  batchScope?: TrustFraudReviewScope;
  generatedBy?: string;
}): Promise<TrustFraudReviewJobResult> {
  const batchDate = params?.batchDate ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { periodStart, periodEnd } = dateRangeForTrustFraudBatchDate(batchDate);
  const rows = await fetchTrustFraudReviewSourceRowsDb({ periodStart, periodEnd });
  const counts = buildCounts(rows);
  const findings = buildFindings(rows);
  const batchObjectId = crypto.randomUUID();

  const batch = await createTrustFraudReviewBatch({
    batchScope: params?.batchScope ?? "global_daily",
    batchDate,
    periodStart,
    periodEnd,
    batchObjectId,
    counts,
    findings,
    sourceEventIds: [],
    generatedBy: params?.generatedBy ?? "scheduled_job",
    breakdown: {
      counts,
      findingTypes: findings.reduce((acc, item) => {
        acc[item.findingType] = (acc[item.findingType] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      categories: findings.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recommendedActions: findings.reduce((acc, item) => {
        for (const action of item.recommendedActions) {
          acc[action] = (acc[action] ?? 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>)
    }
  });

  return {
    ok: batch.evaluation.clean || batch.evaluation.warning,
    resultPayload: {
      batchId: batch.batch.batch_id,
      status: batch.batch.status,
      severity: batch.batch.severity,
      batchDate,
      findingCount: findings.length,
      criticalFindingCount: findings.filter((item) => item.severity === "critical").length
    } as never,
    scannedObjectCounts: counts,
    mutationCounts: {
      batchesCreated: 1,
      alertsCreated: batch.alert ? 1 : 0,
      reviewCasesCreated: batch.reviewCases.length
    },
    sourceEventIds: batch.eventIds,
    createdAlertIds: batch.alert?.alert ? [String((batch.alert.alert as Record<string, unknown>).alert_id)] : [],
    createdReviewCaseIds: batch.reviewCases
      .map((review) => String(review.review_case_id ?? ""))
      .filter(Boolean),
    reasonCodes: batch.evaluation.reasons,
    retryable: false
  };
}
