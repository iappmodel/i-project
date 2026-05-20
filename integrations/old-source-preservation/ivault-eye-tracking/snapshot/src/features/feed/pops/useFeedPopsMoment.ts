import { useEffect, useMemo, useRef, useState } from "react";
import { usePopsIntentCapture } from "../../../pops/intent/usePopsIntentCapture";
import { usePopsSession } from "../../../pops/hooks/usePopsSession";
import type { PopsEventType } from "../../../pops/capture/pops-client-events";
import {
  FEED_POPS_DEFAULTS,
  type FeedCardKind,
  type FeedIntentAction,
  type FeedPopsCampaignRules,
  canAccrueProgress,
  canStartPopsForVisibility,
  computeRewardUiProgress,
  resolveFeedPopsRules,
} from "./feed-pops-rules";
import { FeedPopsRewardBadge } from "./FeedPopsRewardBadge";
import { FeedPopsStatusOverlay } from "./FeedPopsStatusOverlay";

type ServerDecision = "none" | "pending" | "held" | "denied";
type FeedPopsMomentState = "idle" | "verifying" | "verified" | "degraded" | "held";

export type UseFeedPopsMomentInput = {
  userId: string;
  deviceId: string;
  contentId: string;
  cardKind: FeedCardKind;
  campaignId?: string;
  campaignRules?: FeedPopsCampaignRules;
  scrollVelocityPxPerSec?: number;
  isMuted?: boolean;
  isAudioForegroundAllowed?: boolean;
};

export type FeedVisibilityTick = {
  visibleMs: number;
  completionPct: number;
  isVisible: boolean;
  isForeground: boolean;
  isScreenActive: boolean;
};

export type UseFeedPopsMomentResult = {
  state: FeedPopsMomentState;
  isSessionActive: boolean;
  momentVerified: boolean;
  rewardPending: boolean;
  statusTitle: string;
  statusSubtitle: string;
  rewardLabel: string;
  rewardMinor: number;
  rewardCurrency: string;
  progressPct: number;
  contentCompletionPct: number;
  verificationConfidenceProgressPct: number;
  requiredDurationProgressPct: number;
  onCardViewportEnter: () => void;
  onCardViewportExit: () => void;
  onVisibilityTick: (tick: FeedVisibilityTick) => void;
  onIntent: (intent: FeedIntentAction) => void;
  setServerDecision: (decision: ServerDecision) => void;
};

export function useFeedPopsMoment(input: UseFeedPopsMomentInput): UseFeedPopsMomentResult {
  const pops = usePopsSession();
  const rules = useMemo(() => resolveFeedPopsRules(input.cardKind, input.campaignRules), [input.cardKind, input.campaignRules]);
  const checkpointRef = useRef<number>(Date.now());
  const visibleRef = useRef(false);
  const lastExitAtRef = useRef<number>();
  const seenFeedContentRef = useRef<Record<string, number>>({});
  const [state, setState] = useState<FeedPopsMomentState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [contentCompletionPct, setContentCompletionPct] = useState(0);
  const [requiredDurationProgressPct, setRequiredDurationProgressPct] = useState(0);
  const [verificationConfidenceProgressPct, setVerificationConfidenceProgressPct] = useState(0);
  const [serverDecision, setServerDecision] = useState<ServerDecision>("none");
  const [lastForeground, setLastForeground] = useState(true);
  const [lastScreenActive, setLastScreenActive] = useState(true);

  const intents = usePopsIntentCapture({
    recordEvent: pops.recordEvent,
    context: {
      minimumConfidence: 0.25,
      cooldownMs: 350,
      stableWindowMs: 450,
      maxInterruptionCount: 3,
      movementStabilityThreshold: 0.4,
      sessionAgeMs: elapsedMs,
      interruptionCount: state === "degraded" ? 2 : 0,
      accountReputation: "STANDARD",
    },
  });

  const onCardViewportEnter = () => {
    visibleRef.current = true;
  };

  const onCardViewportExit = () => {
    visibleRef.current = false;
    lastExitAtRef.current = Date.now();
    if (pops.state === "ACTIVE") {
      pops.pauseSession("scroll_away");
      pops.recordEvent("CONTENT_PAUSED", { reason: "scroll_away" });
      pops.recordSignalBatch([{ type: "CONTENT_PAUSED", timestamp: Date.now(), value: "scroll_away" }]);
      if (contentCompletionPct >= rules.requiredProgressPct || requiredDurationProgressPct >= 100) {
        pops.completeSession();
      }
    }
  };

  const onVisibilityTick = (tick: FeedVisibilityTick) => {
    setContentCompletionPct(Math.max(0, Math.min(100, tick.completionPct)));
    const canStart = canStartPopsForVisibility({
      visibleMs: tick.visibleMs,
      minVisibleMsBeforeSessionStart: rules.minVisibleMsBeforeSessionStart,
      scrollVelocityPxPerSec: input.scrollVelocityPxPerSec,
    });

    const canProgress = canAccrueProgress({
      visibleMs: tick.visibleMs,
      isForeground: tick.isForeground,
      isScreenActive: tick.isScreenActive,
      isAudioForegroundAllowed: input.isAudioForegroundAllowed ?? false,
      isMuted: input.isMuted ?? false,
      allowsMutedPlayback: rules.allowsMutedPlayback,
      allowsBackgroundPlaybackWithAudio: rules.allowsBackgroundPlaybackWithAudio,
      minVisibleMsBeforeProgress: rules.minVisibleMsBeforeProgress,
    });

    if (tick.isForeground !== lastForeground) {
      const eventType: PopsEventType = tick.isForeground ? "APP_FOREGROUNDED" : "APP_BACKGROUNDED";
      pops.recordEvent(eventType);
      setLastForeground(tick.isForeground);
    }
    if (tick.isScreenActive !== lastScreenActive) {
      pops.recordEvent("SCREEN_ACTIVE", { active: tick.isScreenActive });
      setLastScreenActive(tick.isScreenActive);
    }

    if (!canStart || !tick.isVisible || !visibleRef.current) return;
    if (isWithinRepeatWindow(input.contentId, rules.repeatWindowMs, seenFeedContentRef.current)) return;

    const resumeAllowed = lastExitAtRef.current
      ? Date.now() - lastExitAtRef.current <= rules.continuityWindowMs
      : false;

    if (pops.state === "IDLE") {
      if (rules.feedProofLevel === "LEVEL_0_NONE") return;
      pops.startSession({
        userId: input.userId,
        deviceId: input.deviceId,
        contentId: input.contentId,
        campaignId: input.campaignId ?? "feed_default",
        sessionType: rules.sessionType,
        proofLevel: rules.popsProofLevel,
        requiredDurationMs: rules.requiredDurationMs,
      });
      checkpointRef.current = Date.now();
      setElapsedMs(0);
    } else if (pops.state === "PAUSED" && resumeAllowed) {
      pops.resumeSession("feed_returned");
      pops.recordEvent("CONTENT_RESUMED", { reason: "within_continuity_window" });
    }

    if (!canProgress || pops.state !== "ACTIVE") {
      if (state !== "held") {
        setState(!tick.isForeground || !tick.isScreenActive ? "degraded" : "verifying");
      }
      return;
    }

    const now = Date.now();
    const dt = Math.max(0, now - checkpointRef.current);
    checkpointRef.current = now;
    setElapsedMs((prev) => prev + dt);
    pops.recordEvent("CONTENT_PROGRESS", { progressPct: tick.completionPct });
    pops.recordSignalBatch([{ type: "CONTENT_PROGRESS", timestamp: now, value: tick.completionPct }]);
  };

  useEffect(() => {
    if (pops.state !== "ACTIVE") return;
    const timer = setInterval(() => {
      pops.recordEvent("REWARD_CHECKPOINT", {
        elapsedMs,
        contentCompletionPct,
      });
    }, FEED_POPS_DEFAULTS.checkpointMs);
    return () => clearInterval(timer);
  }, [pops, elapsedMs, contentCompletionPct]);

  useEffect(() => {
    const durationPct = Math.min(100, (elapsedMs / rules.requiredDurationMs) * 100);
    setRequiredDurationProgressPct(durationPct);
    const confidence = Math.min(
      100,
      Math.round((pops.attentionConfidence * 100 + pops.presenceConfidence * 100 + pops.intentConfidence * 100) / 3),
    );
    setVerificationConfidenceProgressPct(confidence);
  }, [elapsedMs, rules.requiredDurationMs, pops.attentionConfidence, pops.presenceConfidence, pops.intentConfidence]);

  useEffect(() => {
    if (serverDecision === "held") {
      setState("held");
      return;
    }
    if (serverDecision === "denied") {
      setState("degraded");
      return;
    }
    const verified =
      contentCompletionPct >= rules.requiredProgressPct &&
      requiredDurationProgressPct >= 100 &&
      verificationConfidenceProgressPct >= 60;
    if (verified) {
      setState("verified");
      pops.completeSession();
      seenFeedContentRef.current[input.contentId] = Date.now();
    } else if (pops.state === "ACTIVE") {
      setState("verifying");
    }
  }, [
    contentCompletionPct,
    requiredDurationProgressPct,
    verificationConfidenceProgressPct,
    rules.requiredProgressPct,
    pops,
    serverDecision,
    input.contentId,
  ]);

  const onIntent = (intent: FeedIntentAction) => {
    intents.captureIntent({
      actionType: intent === "cta_click" ? "tap" : "gesture",
      zoneId: `feed:${input.contentId}`,
      dwellMs: Math.min(2_000, elapsedMs),
      movementStable: state !== "degraded",
      confidenceHint: intent === "cta_click" ? 0.9 : 0.7,
      metadata: {
        intent,
        contentId: input.contentId,
      },
    });
  };

  const rewardPending = serverDecision === "pending";
  const progressPct = computeRewardUiProgress({
    contentCompletionPct,
    verificationConfidenceProgressPct,
    requiredDurationProgressPct,
  });

  return {
    state,
    isSessionActive: pops.state === "ACTIVE" || pops.state === "PAUSED",
    momentVerified: state === "verified" || rewardPending,
    rewardPending,
    statusTitle: getStatusTitle(state, rewardPending),
    statusSubtitle: getStatusSubtitle(state, rewardPending),
    rewardLabel: `Earn ${formatRewardLabel(rules.rewardMinor, rules.rewardCurrency)}`,
    rewardMinor: rules.rewardMinor,
    rewardCurrency: rules.rewardCurrency,
    progressPct,
    contentCompletionPct,
    verificationConfidenceProgressPct,
    requiredDurationProgressPct,
    onCardViewportEnter,
    onCardViewportExit,
    onVisibilityTick,
    onIntent,
    setServerDecision,
  };
}

function formatRewardLabel(rewardMinor: number, rewardCurrency: string): string {
  if (rewardCurrency === "ICOIN" || rewardCurrency === "VCOIN" || rewardCurrency === "RCOIN") {
    return `${(rewardMinor / 100).toFixed(2)} ${rewardCurrency.toLowerCase()}s`;
  }
  return `${(rewardMinor / 100).toFixed(2)} ${rewardCurrency}`;
}

function isWithinRepeatWindow(contentId: string, repeatWindowMs: number, seen: Record<string, number>): boolean {
  const seenAt = seen[contentId];
  if (!seenAt) return false;
  return Date.now() - seenAt <= repeatWindowMs;
}

function getStatusTitle(state: FeedPopsMomentState, rewardPending: boolean): string {
  if (rewardPending) return "Reward pending";
  if (state === "verified") return "Moment verified";
  if (state === "degraded") return "Moment not verified";
  if (state === "held") return "Reward under review";
  return "P.O.P.S verifying moment";
}

function getStatusSubtitle(state: FeedPopsMomentState, rewardPending: boolean): string {
  if (rewardPending) return "Moment verified";
  if (state === "verified") return "Moment verified";
  if (state === "degraded") return "Moment confidence rising";
  if (state === "held") return "Reward pending";
  return "Moment confidence rising";
}

export type MockFeedItem = {
  id: string;
  cardKind: FeedCardKind;
  title: string;
  sponsor?: string;
  campaignRules?: FeedPopsCampaignRules;
};

export function createMockFeedItems(): MockFeedItem[] {
  return [
    {
      id: "organic_001",
      cardKind: "organic",
      title: "Creator story: morning routine",
      campaignRules: { proofLevel: "LEVEL_1_SESSION", rewardMinor: 0 },
    },
    {
      id: "sponsored_001",
      cardKind: "sponsored",
      title: "Sponsored: eco headphones",
      sponsor: "Auraloop",
      campaignRules: {
        proofLevel: "LEVEL_2_ATTENTION",
        rewardMinor: 25,
        requiredDurationMs: 30_000,
        requiredProgressPct: 85,
      },
    },
    {
      id: "creator_paid_001",
      cardKind: "creator_paid_action",
      title: "Creator mission: follow + save",
      campaignRules: {
        proofLevel: "LEVEL_3_INTENT",
        rewardMinor: 20,
        requiredDurationMs: 20_000,
        requiredProgressPct: 70,
      },
    },
  ];
}

export function FeedPopsMockedDemoFeed() {
  const items = createMockFeedItems();
  const [activeId, setActiveId] = useState(items[1]?.id ?? items[0].id);
  const active = items.find((item) => item.id === activeId) ?? items[0];
  const moment = useFeedPopsMoment({
    userId: "demo_feed_user",
    deviceId: "demo_feed_device",
    contentId: active.id,
    cardKind: active.cardKind,
    campaignId: active.campaignRules?.id ?? "feed_demo_campaign",
    campaignRules: active.campaignRules,
    isMuted: false,
    isAudioForegroundAllowed: false,
  });
  const [visibleMs, setVisibleMs] = useState(0);
  const [completionPct, setCompletionPct] = useState(0);

  useEffect(() => {
    moment.onCardViewportEnter();
    return () => moment.onCardViewportExit();
  }, [active.id, moment]);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleMs((prevVisibleMs) => {
        const nextVisibleMs = prevVisibleMs + 1_000;
        setCompletionPct((prevCompletionPct) => {
          const nextCompletionPct = Math.min(100, prevCompletionPct + 4);
          moment.onVisibilityTick({
            visibleMs: nextVisibleMs,
            completionPct: nextCompletionPct,
            isVisible: true,
            isForeground: true,
            isScreenActive: true,
          });
          return nextCompletionPct;
        });
        return nextVisibleMs;
      });
    }, 1_000);
    return () => clearInterval(timer);
  }, [moment]);

  useEffect(() => {
    if (moment.state !== "verified" || moment.rewardMinor <= 0) return;
    if (moment.rewardPending) return;
    const timer = setTimeout(() => {
      moment.setServerDecision("pending");
    }, 1_200);
    return () => clearTimeout(timer);
  }, [moment.state, moment.rewardMinor, moment.rewardPending, moment.setServerDecision]);

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveId(item.id);
              setVisibleMs(0);
              setCompletionPct(0);
            }}
          >
            {item.cardKind}
          </button>
        ))}
      </div>

      {active.cardKind === "sponsored" ? (
        <FeedPopsRewardBadge
          rewardLabel={moment.rewardLabel}
          pending={moment.rewardPending}
          underReview={moment.state === "held"}
        />
      ) : null}

      <FeedPopsStatusOverlay
        title={moment.statusTitle}
        subtitle={moment.statusSubtitle}
        progressPct={moment.progressPct}
        state={moment.state}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => moment.onIntent("like")}>Like</button>
        <button onClick={() => moment.onIntent("save")}>Save</button>
        <button onClick={() => moment.onIntent("follow")}>Follow</button>
        <button onClick={() => moment.onIntent("share")}>Share</button>
        <button onClick={() => moment.onIntent("cta_click")}>CTA click</button>
        <button onClick={() => moment.setServerDecision("pending")}>Mock pending</button>
        <button onClick={() => moment.setServerDecision("held")}>Mock held</button>
        <button onClick={() => moment.setServerDecision("denied")}>Mock denied</button>
      </div>
    </div>
  );
}
