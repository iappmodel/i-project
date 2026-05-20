export type PopsRewardDecision = "APPROVED" | "HELD" | "DENIED" | "PARTIAL_APPROVED";

export interface PopsSessionEvent {
  id: string;
  type:
    | "session_started"
    | "content_started"
    | "content_progress_checkpoint"
    | "app_backgrounded"
    | "interruption"
    | "reward_checkpoint"
    | "session_completed"
    | "judgment_created"
    | "reward_decision_created"
    | "wallet_intent_created"
    | "privacy_receipt_created";
  at: string;
  detail?: string;
}

export interface PopsSessionReviewRecord {
  userId: string;
  sessionId: string;
  campaignId: string;
  campaignName: string;
  contentId: string;
  contentName: string;
  proofLevel: "BASIC" | "ENHANCED" | "STRICT";
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  fraudRisk: number;
  reasonCodes: string[];
  rewardDecision: PopsRewardDecision;
  rewardAmountMinor: number;
  rewardCurrency: "USD" | "ICOIN" | "VCOIN" | "RCOIN";
  walletStatus: "NOT_POSTED" | "POSTED_PENDING" | "POSTED_AVAILABLE" | "ON_HOLD";
  trustImpact: {
    action: string;
    scoreDelta: number;
    confidence: number;
    severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  };
  privacyReceipt: {
    receiptId: string;
    policyVersion: string;
    retentionPolicy: string;
    userVisibleSummary: string;
  };
  timeline: PopsSessionEvent[];
}

export interface PopsDashboardMetrics {
  totalSessionsToday: number;
  verifiedMoments: number;
  rewardsApproved: number;
  rewardsHeld: number;
  rewardsDenied: number;
  averagePresenceConfidence: number;
  averageAttentionConfidence: number;
  averageFraudRisk: number;
  manualReviewBacklog: number;
}

export interface PopsReasonCodeMetric {
  code: string;
  count: number;
}

export interface PopsCampaignHoldMetric {
  campaignId: string;
  campaignName: string;
  holdRate: number;
  heldSessions: number;
  totalSessions: number;
}

export interface PopsDeviceSuspiciousMetric {
  deviceId: string;
  suspiciousSessions: number;
  uniqueUsers: number;
}

export interface PopsFraudSignalRecord {
  signalId: string;
  sessionId: string;
  userId: string;
  risk: number;
  category: "AUTOMATION" | "INTEGRITY" | "CONTINUITY" | "DUPLICATE" | "ABUSE_PATTERN";
  reasonCode: string;
  createdAt: string;
}

export interface PopsTrustImpactRecord {
  id: string;
  userId: string;
  sessionId: string;
  eventType: string;
  recommendedAction: string;
  scoreDelta: number;
  confidence: number;
  createdAt: string;
}

export interface PopsAdminActionAuditRecord {
  id: string;
  adminUserId: string;
  sessionId: string;
  oldDecision: PopsRewardDecision;
  newDecision: PopsRewardDecision;
  reason: string;
  createdAt: string;
}

const now = Date.now();
const isoMinutesAgo = (minutesAgo: number): string =>
  new Date(now - minutesAgo * 60_000).toISOString();

export const popsSessionReviewRecords: PopsSessionReviewRecord[] = [
  {
    userId: "6c9b781b-9545-4020-b966-bc7a4e196ff5",
    sessionId: "9bb9de95-1ff6-4faa-b5ca-af2dd917e6f5",
    campaignId: "0d097524-3d86-4885-89fc-c77f9319754c",
    campaignName: "Nike Spring Motion",
    contentId: "ad_clip_nike_001",
    contentName: "Nike Run Spot 15s",
    proofLevel: "ENHANCED",
    startedAt: isoMinutesAgo(76),
    endedAt: isoMinutesAgo(74),
    durationSeconds: 112,
    presenceConfidence: 0.92,
    attentionConfidence: 0.88,
    intentConfidence: 0.86,
    fraudRisk: 0.17,
    reasonCodes: ["LOW_RISK", "HIGH_PRESENCE", "GOOD_ATTENTION"],
    rewardDecision: "APPROVED",
    rewardAmountMinor: 125,
    rewardCurrency: "USD",
    walletStatus: "POSTED_PENDING",
    trustImpact: {
      action: "INCREASE_TRUST_LOW",
      scoreDelta: 0.035,
      confidence: 0.84,
      severity: "LOW",
    },
    privacyReceipt: {
      receiptId: "325cb32e-3fac-4f75-a6d2-0f7ccde5371a",
      policyVersion: "pops_privacy_v4",
      retentionPolicy: "THIRTY_DAYS",
      userVisibleSummary: "Local attention and presence vectors verified this session.",
    },
    timeline: [
      { id: "ev_1", type: "session_started", at: isoMinutesAgo(76) },
      { id: "ev_2", type: "content_started", at: isoMinutesAgo(75), detail: "Nike Run Spot 15s" },
      { id: "ev_3", type: "content_progress_checkpoint", at: isoMinutesAgo(75), detail: "33% complete" },
      { id: "ev_4", type: "content_progress_checkpoint", at: isoMinutesAgo(74), detail: "66% complete" },
      { id: "ev_5", type: "reward_checkpoint", at: isoMinutesAgo(74), detail: "Eligibility check passed" },
      { id: "ev_6", type: "session_completed", at: isoMinutesAgo(74) },
      { id: "ev_7", type: "judgment_created", at: isoMinutesAgo(73) },
      { id: "ev_8", type: "reward_decision_created", at: isoMinutesAgo(73), detail: "APPROVED" },
      { id: "ev_9", type: "wallet_intent_created", at: isoMinutesAgo(73) },
      { id: "ev_10", type: "privacy_receipt_created", at: isoMinutesAgo(73) },
    ],
  },
  {
    userId: "90f389af-6af3-4c11-97b0-8f36e7f815c1",
    sessionId: "b8f1224e-8108-4b16-8e68-1175a2cbc53f",
    campaignId: "52d13cf3-4b2c-4e07-a542-19f4ff8a4f53",
    campaignName: "Hydration Challenge",
    contentId: "ad_clip_water_002",
    contentName: "Hydration Story 20s",
    proofLevel: "STRICT",
    startedAt: isoMinutesAgo(42),
    endedAt: isoMinutesAgo(39),
    durationSeconds: 141,
    presenceConfidence: 0.78,
    attentionConfidence: 0.63,
    intentConfidence: 0.59,
    fraudRisk: 0.68,
    reasonCodes: ["HIGH_FRAUD_RISK_SESSION", "REPEATED_DEGRADED_SESSION", "AUTOMATION_PATTERN"],
    rewardDecision: "HELD",
    rewardAmountMinor: 95,
    rewardCurrency: "USD",
    walletStatus: "ON_HOLD",
    trustImpact: {
      action: "SEND_TO_MANUAL_REVIEW",
      scoreDelta: -0.11,
      confidence: 0.81,
      severity: "HIGH",
    },
    privacyReceipt: {
      receiptId: "53f608fd-7909-45eb-b16d-cbf6209e7230",
      policyVersion: "pops_privacy_v4",
      retentionPolicy: "FRAUD_REVIEW_REQUIRED",
      userVisibleSummary: "Session requires review due to suspicious interaction consistency.",
    },
    timeline: [
      { id: "ev_11", type: "session_started", at: isoMinutesAgo(42) },
      { id: "ev_12", type: "content_started", at: isoMinutesAgo(41), detail: "Hydration Story 20s" },
      { id: "ev_13", type: "content_progress_checkpoint", at: isoMinutesAgo(41), detail: "25% complete" },
      { id: "ev_14", type: "app_backgrounded", at: isoMinutesAgo(40), detail: "App backgrounded for 9s" },
      { id: "ev_15", type: "interruption", at: isoMinutesAgo(40), detail: "Notification interruption" },
      { id: "ev_16", type: "reward_checkpoint", at: isoMinutesAgo(39), detail: "Risk threshold exceeded" },
      { id: "ev_17", type: "session_completed", at: isoMinutesAgo(39) },
      { id: "ev_18", type: "judgment_created", at: isoMinutesAgo(38) },
      { id: "ev_19", type: "reward_decision_created", at: isoMinutesAgo(38), detail: "HELD" },
      { id: "ev_20", type: "wallet_intent_created", at: isoMinutesAgo(38), detail: "Hold intent" },
      { id: "ev_21", type: "privacy_receipt_created", at: isoMinutesAgo(38) },
    ],
  },
];

export const popsDashboardMetrics: PopsDashboardMetrics = {
  totalSessionsToday: 1246,
  verifiedMoments: 1019,
  rewardsApproved: 913,
  rewardsHeld: 217,
  rewardsDenied: 116,
  averagePresenceConfidence: 0.87,
  averageAttentionConfidence: 0.81,
  averageFraudRisk: 0.24,
  manualReviewBacklog: 63,
};

export const popsTopReasonCodes: PopsReasonCodeMetric[] = [
  { code: "LOW_RISK", count: 853 },
  { code: "GOOD_ATTENTION", count: 794 },
  { code: "HIGH_FRAUD_RISK_SESSION", count: 217 },
  { code: "REPEATED_DEGRADED_SESSION", count: 143 },
  { code: "AUTOMATION_PATTERN", count: 117 },
];

export const popsTopCampaignsByHoldRate: PopsCampaignHoldMetric[] = [
  {
    campaignId: "52d13cf3-4b2c-4e07-a542-19f4ff8a4f53",
    campaignName: "Hydration Challenge",
    holdRate: 0.31,
    heldSessions: 69,
    totalSessions: 223,
  },
  {
    campaignId: "7acb032f-2f09-45a7-823f-fb846e66753e",
    campaignName: "Weekend Wellness",
    holdRate: 0.25,
    heldSessions: 52,
    totalSessions: 208,
  },
  {
    campaignId: "0d097524-3d86-4885-89fc-c77f9319754c",
    campaignName: "Nike Spring Motion",
    holdRate: 0.12,
    heldSessions: 31,
    totalSessions: 258,
  },
];

export const popsTopDevicesBySuspiciousSessions: PopsDeviceSuspiciousMetric[] = [
  { deviceId: "ios_13_pro_max_a91c", suspiciousSessions: 21, uniqueUsers: 4 },
  { deviceId: "android_pixel_7_1b2e", suspiciousSessions: 18, uniqueUsers: 3 },
  { deviceId: "android_samsung_s22_98fa", suspiciousSessions: 15, uniqueUsers: 5 },
];

export const popsFraudSignals: PopsFraudSignalRecord[] = [
  {
    signalId: "sig_001",
    sessionId: "b8f1224e-8108-4b16-8e68-1175a2cbc53f",
    userId: "90f389af-6af3-4c11-97b0-8f36e7f815c1",
    risk: 0.81,
    category: "AUTOMATION",
    reasonCode: "AUTOMATION_PATTERN",
    createdAt: isoMinutesAgo(37),
  },
  {
    signalId: "sig_002",
    sessionId: "ac0a1b20-b95e-4424-85dd-472f47e6a33e",
    userId: "07490f7c-7595-47cc-8c9e-0df0671f8d74",
    risk: 0.74,
    category: "CONTINUITY",
    reasonCode: "IDENTITY_CONTINUITY_BREAK",
    createdAt: isoMinutesAgo(84),
  },
  {
    signalId: "sig_003",
    sessionId: "962a5d12-e6bf-4101-bf82-c2e52d6fcb1e",
    userId: "13b2f808-c0d6-46e5-a868-c3b6ab465b3d",
    risk: 0.66,
    category: "DUPLICATE",
    reasonCode: "DUPLICATE_REWARD_ATTEMPT",
    createdAt: isoMinutesAgo(124),
  },
];

export const popsTrustImpactFeed: PopsTrustImpactRecord[] = [
  {
    id: "trust_001",
    userId: "90f389af-6af3-4c11-97b0-8f36e7f815c1",
    sessionId: "b8f1224e-8108-4b16-8e68-1175a2cbc53f",
    eventType: "HIGH_FRAUD_RISK_SESSION",
    recommendedAction: "SEND_TO_MANUAL_REVIEW",
    scoreDelta: -0.11,
    confidence: 0.81,
    createdAt: isoMinutesAgo(38),
  },
  {
    id: "trust_002",
    userId: "6c9b781b-9545-4020-b966-bc7a4e196ff5",
    sessionId: "9bb9de95-1ff6-4faa-b5ca-af2dd917e6f5",
    eventType: "VERIFIED_HUMAN_MOMENT",
    recommendedAction: "INCREASE_TRUST_LOW",
    scoreDelta: 0.035,
    confidence: 0.84,
    createdAt: isoMinutesAgo(73),
  },
];

export const popsAdminActionAuditMock: PopsAdminActionAuditRecord[] = [
  {
    id: "act_001",
    adminUserId: "admin_fraud_ops_01",
    sessionId: "b8f1224e-8108-4b16-8e68-1175a2cbc53f",
    oldDecision: "HELD",
    newDecision: "PARTIAL_APPROVED",
    reason: "Manual check confirms valid engagement for 63% of the session.",
    createdAt: isoMinutesAgo(12),
  },
  {
    id: "act_002",
    adminUserId: "admin_risk_02",
    sessionId: "ae87e67f-e8f3-45e0-98ec-801c0efe0746",
    oldDecision: "HELD",
    newDecision: "DENIED",
    reason: "KYC mismatch and repeat spoofing pattern.",
    createdAt: isoMinutesAgo(34),
  },
];

export const popsReviewQueue: PopsSessionReviewRecord[] = popsSessionReviewRecords.filter(
  (session) => session.rewardDecision === "HELD" || session.rewardDecision === "DENIED",
);
