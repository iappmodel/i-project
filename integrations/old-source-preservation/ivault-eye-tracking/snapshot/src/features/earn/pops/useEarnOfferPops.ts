import { useCallback, useMemo, useState } from "react";
import {
  EARN_OFFER_PROOF_LEVEL_COPY,
  EARN_POPS_PREFLIGHT_STATUS,
  type EarnOfferCheckpointState,
  type EarnOfferPopsCampaign,
  type EarnOfferPopsUserContext,
  type EarnOfferVerificationStep,
  type EarnPopsCompletionState,
  type EarnPopsPreflightResult,
  buildEarnOfferVerificationSteps,
  evaluateEarnOfferPreflight
} from "./earn-pops-rules";

export interface UseEarnOfferPopsInput {
  campaign: EarnOfferPopsCampaign;
  userContext: EarnOfferPopsUserContext;
  checkpoints: EarnOfferCheckpointState;
  completionState: EarnPopsCompletionState | null;
}

export interface UseEarnOfferPopsOutput {
  preflight: EarnPopsPreflightResult;
  verificationSteps: EarnOfferVerificationStep[];
  proofCopy: string;
  canStart: boolean;
  summary: {
    rewardAmount: string;
    estimatedTime: string;
    proofLevel: string;
    requiredActions: string[];
    visualPresenceNeeded: boolean;
    locationProofNeeded: boolean;
    kycMayBeRequired: boolean;
    pendingReleaseExpectation: string;
  };
  completionState: EarnPopsCompletionState | null;
  runtime: {
    sessionStarted: boolean;
    progressPct: number;
    taskProgressLabel: string;
    verificationStatus: "idle" | "verifying" | "pending" | "review" | "verified" | "denied";
  };
  actions: {
    startOffer: () => void;
    captureProgress: (incrementPct?: number) => void;
    completeOffer: (result?: EarnPopsCompletionState) => void;
    resetOffer: () => void;
  };
}

function formatRewardAmount(amountMinor: number, currency: EarnOfferPopsCampaign["currency"]): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amountMinor / 100);
  }
  return `${amountMinor} ${currency}`;
}

export function buildEarnOfferPopsModel({
  campaign,
  userContext,
  checkpoints,
  completionState
}: UseEarnOfferPopsInput): UseEarnOfferPopsOutput {
  const preflight = evaluateEarnOfferPreflight(campaign, userContext);
  return {
    preflight,
    verificationSteps: buildEarnOfferVerificationSteps(checkpoints),
    proofCopy: EARN_OFFER_PROOF_LEVEL_COPY[campaign.proofRequirements.proofLevel],
    canStart: preflight.status === EARN_POPS_PREFLIGHT_STATUS.ELIGIBLE,
    summary: {
      rewardAmount: formatRewardAmount(campaign.rewardAmountMinor, campaign.currency),
      estimatedTime: `${campaign.estimatedTimeMinutes} min`,
      proofLevel: campaign.proofRequirements.proofLevel,
      requiredActions: campaign.proofRequirements.requiredActions,
      visualPresenceNeeded: campaign.proofRequirements.visualPresenceNeeded,
      locationProofNeeded: campaign.proofRequirements.locationProofNeeded,
      kycMayBeRequired: campaign.proofRequirements.kycMayBeRequired,
      pendingReleaseExpectation: campaign.proofRequirements.pendingReleaseExpectation
    },
    completionState,
    runtime: {
      sessionStarted: checkpoints.sessionStarted,
      progressPct: checkpoints.walletPendingUpdated ? 100 : checkpoints.checkpointsUpdating ? 55 : checkpoints.taskRunning ? 35 : 0,
      taskProgressLabel: checkpoints.walletPendingUpdated
        ? "Reward pending"
        : checkpoints.checkpointsUpdating
          ? "Moment confidence rising"
          : "P.O.P.S verifying moment",
      verificationStatus:
        completionState === "DENIED"
          ? "denied"
          : completionState === "APPROVED_FULL"
            ? "verified"
            : completionState === "APPROVED_PARTIAL"
              ? "pending"
              : completionState === "PENDING_REVIEW"
                ? "review"
                : "idle"
    },
    actions: {
      startOffer: () => undefined,
      captureProgress: () => undefined,
      completeOffer: () => undefined,
      resetOffer: () => undefined
    }
  };
}

export function useEarnOfferPops(input: UseEarnOfferPopsInput): UseEarnOfferPopsOutput {
  const base = useMemo(() => buildEarnOfferPopsModel(input), [input]);
  const [sessionStarted, setSessionStarted] = useState(input.checkpoints.sessionStarted);
  const [progressPct, setProgressPct] = useState(0);
  const [completionState, setCompletionState] = useState<EarnPopsCompletionState | null>(input.completionState);

  const verificationStatus: UseEarnOfferPopsOutput["runtime"]["verificationStatus"] =
    completionState === "DENIED"
      ? "denied"
      : completionState === "PENDING_REVIEW"
        ? "review"
        : completionState === "APPROVED_FULL"
          ? "pending"
          : completionState === "APPROVED_PARTIAL"
            ? "pending"
            : sessionStarted
              ? "verifying"
              : "idle";

  const taskProgressLabel =
    verificationStatus === "denied"
      ? "Moment not verified"
      : verificationStatus === "review"
        ? "Reward under review"
        : completionState !== null
          ? "Reward pending"
          : sessionStarted
            ? "Moment confidence rising"
            : "P.O.P.S verifying moment";

  const runtimeCheckpoints: EarnOfferCheckpointState = {
    sessionStarted,
    taskRunning: progressPct >= 8,
    checkpointsUpdating: progressPct >= 20,
    completionTriggered: completionState !== null,
    rewardDecisionReturned: completionState !== null,
    walletPendingUpdated: completionState === "APPROVED_FULL" || completionState === "APPROVED_PARTIAL"
  };

  const startOffer = useCallback(() => {
    if (!base.canStart) return;
    setSessionStarted(true);
    setProgressPct(6);
  }, [base.canStart]);

  const captureProgress = useCallback(
    (incrementPct = 8) => {
      if (!sessionStarted || completionState !== null) return;
      setProgressPct((prev) => Math.min(96, prev + Math.max(1, incrementPct)));
    },
    [completionState, sessionStarted]
  );

  const completeOffer = useCallback(
    (result: EarnPopsCompletionState = "APPROVED_FULL") => {
      if (!sessionStarted) return;
      setProgressPct(100);
      setCompletionState(result);
    },
    [sessionStarted]
  );

  const resetOffer = useCallback(() => {
    setSessionStarted(false);
    setProgressPct(0);
    setCompletionState(null);
  }, []);

  return {
    ...base,
    verificationSteps: buildEarnOfferVerificationSteps(runtimeCheckpoints),
    completionState,
    runtime: {
      sessionStarted,
      progressPct,
      taskProgressLabel,
      verificationStatus
    },
    actions: {
      startOffer,
      captureProgress,
      completeOffer,
      resetOffer
    }
  };
}

export function createEarnOfferPopsDemoData(): {
  campaign: EarnOfferPopsCampaign;
  userContext: EarnOfferPopsUserContext;
  checkpoints: EarnOfferCheckpointState;
} {
  return {
    campaign: {
      campaignId: "offer_demo_pops_001",
      rewardAmountMinor: 225,
      currency: "ICOIN",
      estimatedTimeMinutes: 2,
      budgetAvailable: true,
      minimumAge: null,
      allowedRegions: ["US", "CA", "MX"],
      minimumTrustTier: 1,
      devicesAllowed: ["ios", "android", "web"],
      permissionsRequired: [],
      proofRequirements: {
        proofLevel: "VERIFIED_ATTENTION",
        requiredActions: ["Start offer", "Keep offer active", "Complete offer task"],
        visualPresenceNeeded: false,
        locationProofNeeded: false,
        kycMayBeRequired: false,
        pendingReleaseExpectation: "Pending after verification"
      }
    },
    userContext: {
      userAge: 24,
      region: "US",
      completedCampaignIds: [],
      hasKyc: true,
      trustTier: 3,
      deviceType: "web",
      grantedPermissions: []
    },
    checkpoints: {
      sessionStarted: false,
      taskRunning: false,
      checkpointsUpdating: false,
      completionTriggered: false,
      rewardDecisionReturned: false,
      walletPendingUpdated: false
    }
  };
}
