/**
 * Stage 7 — shared Watch → Verify → Earn gate for Magic unlock (local simulation).
 */

import type { MagicReveal, StudioSimPost } from "../studioTypes";
import type { StudioLedgerEntry, StudioRevealUnlock, StudioWalletAccount } from "../wallet/studioWalletTypes";
import type { RuntimePostActionEvent } from "../feed/studioFeedTypes";
import { assessFraudRisk } from "./studioFraudEngine";
import { selectRequiredPOPS } from "./studioPOPS";
import { verifyRuntimeAction, verificationRecordAllowsReward } from "./studioVerificationEngine";
import type { FraudAssessment, POPSChallenge, POPSMethod, VerificationRecord } from "./studioVerificationTypes";

/** Which context a passed POPS challenge must match (metadata on challenge). */
export type POPSScope = {
  viewerUserId: string;
  revealId?: string;
  campaignId?: string;
};

function popsChallengeMatchesScope(c: POPSChallenge, scope: POPSScope): boolean {
  if (c.metadata?.viewerUserId != null && c.metadata.viewerUserId !== scope.viewerUserId) return false;
  if (scope.revealId != null) {
    if (c.metadata?.revealId != null && c.metadata.revealId !== scope.revealId) return false;
  }
  if (scope.campaignId != null) {
    if (c.metadata?.campaignId != null && c.metadata.campaignId !== scope.campaignId) return false;
  }
  return true;
}

export function popsSatisfied(methods: POPSMethod[], challenges: POPSChallenge[], scope: POPSScope): boolean {
  if (methods.length === 0) return true;
  return methods.every((m) =>
    challenges.some((c) => c.method === m && c.status === "passed" && popsChallengeMatchesScope(c, scope))
  );
}

export type UnlockVerificationSessionSim = {
  watchMs: number;
  durationMs: number;
  attentionScore: number;
  flagged?: boolean;
  ageGatePassed?: boolean;
  disclosureAcknowledged?: boolean;
  locationMatch?: boolean;
  qrScanned?: boolean;
};

export type RunMagicUnlockVerificationInput = {
  viewerAccount: StudioWalletAccount;
  creatorAccount: StudioWalletAccount;
  reveal: MagicReveal;
  post: StudioSimPost;
  unlocks: StudioRevealUnlock[];
  ledgerEntries: StudioLedgerEntry[];
  popsChallenges: POPSChallenge[];
  recentEvents: RuntimePostActionEvent[];
  session: UnlockVerificationSessionSim;
  now: string;
};

export function popsSatisfiedForReveal(
  methods: POPSMethod[],
  challenges: POPSChallenge[],
  revealId: string,
  viewerUserId: string
): boolean {
  return popsSatisfied(methods, challenges, { revealId, viewerUserId });
}

export function popsSatisfiedForCampaign(
  methods: POPSMethod[],
  challenges: POPSChallenge[],
  campaignId: string,
  viewerUserId: string
): boolean {
  return popsSatisfied(methods, challenges, { campaignId, viewerUserId });
}

export function missingPOPSMethods(
  methods: POPSMethod[],
  challenges: POPSChallenge[],
  scope: POPSScope
): POPSMethod[] {
  return methods.filter(
    (m) => !challenges.some((c) => c.method === m && c.status === "passed" && popsChallengeMatchesScope(c, scope))
  );
}

export function runMagicUnlockVerificationPipeline(input: RunMagicUnlockVerificationInput): {
  fraudAssessment: FraudAssessment;
  verificationRecord: VerificationRecord;
  popsPassed: boolean;
  rewardAllowed: boolean;
  blockReason?: string;
} {
  const { reveal, viewerAccount, creatorAccount, post, unlocks, ledgerEntries, popsChallenges, recentEvents, session, now } = input;

  const fraudAssessment = assessFraudRisk({
    viewerAccount,
    creatorAccount,
    subjectType: "magic_unlock",
    subjectId: reveal.id,
    post: { id: post.postId, metrics: { verifiedViews: post.verifiedViews } },
    reveal,
    session: {
      watchMs: session.watchMs,
      durationMs: session.durationMs,
      attentionScore: session.attentionScore,
      flagged: session.flagged,
    },
    recentEvents,
    recentUnlocks: unlocks,
    ledgerEntries,
  });

  const rewardAmount = reveal.reward?.viewerRewardAmount ?? 0;
  const priceAmount = reveal.pricing?.amount ?? 0;

  const popsMethods = selectRequiredPOPS({
    rewardAmount: rewardAmount || priceAmount,
    riskScore: fraudAssessment.riskScore,
    campaignFraudSensitivity: "medium",
    actionType: "unlock",
    viewerTrustScore: viewerAccount.trustScore ?? 50,
    campaignRequiresGps: Boolean(reveal.revealType === "location_to_reveal"),
    campaignRequiresQr: Boolean(
      reveal.eligibility && "requireQr" in reveal.eligibility && (reveal.eligibility as { requireQr?: boolean }).requireQr
    ),
  });

  const popsPassed = popsSatisfied(popsMethods, popsChallenges, {
    revealId: reveal.id,
    viewerUserId: viewerAccount.userId,
  });

  const verificationRecord = verifyRuntimeAction({
    subjectType: "magic_unlock",
    subjectId: reveal.id,
    viewerAccount,
    creatorAccount,
    post: { id: post.postId, metrics: { verifiedViews: post.verifiedViews } },
    reveal,
    ledgerEntries,
    fraudAssessment,
    popsPassed,
    session: {
      watchMs: session.watchMs,
      durationMs: session.durationMs,
      attentionScore: session.attentionScore,
      flagged: session.flagged,
      ageGatePassed: session.ageGatePassed,
      disclosureAcknowledged: session.disclosureAcknowledged,
      locationMatch: session.locationMatch,
      qrScanned: session.qrScanned,
    },
    now,
  });

  const rewardAllowed =
    verificationRecordAllowsReward(verificationRecord) &&
    fraudAssessment.recommendedAction !== "reject" &&
    fraudAssessment.recommendedAction !== "reverse";

  let blockReason: string | undefined;
  if (!rewardAllowed) {
    if (fraudAssessment.recommendedAction === "reject" || fraudAssessment.recommendedAction === "reverse") {
      blockReason = "Blocked by fraud assessment (simulation).";
    } else if (!verificationRecordAllowsReward(verificationRecord)) {
      blockReason = `Verification ${verificationRecord.status} — adjust Verify panel sim inputs or complete POPS.`;
    }
  }

  return { fraudAssessment, verificationRecord, popsPassed, rewardAllowed, blockReason };
}
