import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  POPS_DEFAULT_REQUIRED_COMPLETION_PCT,
  POPS_DEFAULT_REQUIRED_DURATION_MS,
  POPS_DEFAULT_REWARD_AMOUNT,
  POPS_DEFAULT_REWARD_COIN_TYPE,
} from "../constants/pops.constants";
import { createPopsEvent } from "../aggregation/pops-local-aggregate-builder";
import type { PopsEvent } from "../types/pops-events.types";
import type { PopsJudgment, PopsSession, PopsSessionAggregate } from "../types/pops.types";
import type { PopsPrivacyReceipt } from "../types/pops-privacy.types";
import type { PopsRewardDecision, PopsWalletRewardIntent } from "../types/pops-decisions.types";
import { runLocalPopsCompletionPipeline } from "../orchestrator/pops-local-completion-pipeline";
import {
  buildSyntheticBackgroundFraud,
  buildSyntheticCleanFullWatch,
  buildSyntheticDeviceWarning,
  buildSyntheticImpossibleFast,
  buildSyntheticPartialWatch,
  parsePopsSessionStartMs,
} from "../fixtures/pops-sponsored-watch-synthetic";
import { buildPopsSessionPreview } from "../preview/pops-session-preview.service";
import type { PopsSessionPreview } from "../preview/pops-session-preview.types";
import {
  clearPopsLocalSession,
  isPopsStoredSessionExpired,
  loadPopsLocalSession,
  savePopsLocalSession,
} from "../storage/pops-local-session-storage";
import { nowIso } from "../utils/pops-time";

const DEMO_USER_ID = "pops-demo-user";
const TICK_MS = 250;
/** ~30s wall time for 0→100% auto demo progress (100 steps × 300ms). */
const AUTO_PROGRESS_TICK_MS = 300;

export interface UsePopsSessionOptions {
  /** When true, persist active demo session to localStorage (2h TTL). No raw media or secrets. */
  persistLocal?: boolean;
}

function newSessionId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** States where we still persist an in-progress demo session. */
function isLiveDemoState(s: PopsSession["state"]): boolean {
  return s === "ACTIVE" || s === "PAUSED" || s === "BACKGROUNDED" || s === "DEGRADED" || s === "INITIALIZING";
}

export interface UsePopsSessionResult {
  session: PopsSession | null;
  events: PopsEvent[];
  aggregate: PopsSessionAggregate | null;
  judgment: PopsJudgment | null;
  rewardDecision: PopsRewardDecision | null;
  walletIntent: PopsWalletRewardIntent | null;
  privacyReceipt: PopsPrivacyReceipt | null;
  preview: PopsSessionPreview | null;
  isStarted: boolean;
  isRunning: boolean;
  isPaused: boolean;
  isBackgrounded: boolean;
  isCompleted: boolean;
  progressPct: number;
  elapsedMs: number;
  userVisibleStatus: string;
  recoveryNotice: string | null;
  dismissRecoveryNotice: () => void;
  persistLocalEnabled: boolean;
  startSponsoredWatch: () => void;
  pause: () => void;
  resume: () => void;
  simulateAppBackground: () => void;
  simulateAppForeground: () => void;
  recordTap: () => void;
  recordScroll: () => void;
  setProgress: (progressPct: number) => void;
  completeClean: () => void;
  completePartial: () => void;
  simulateBackgroundFraud: () => void;
  simulateDeviceWarning: () => void;
  simulateImpossibleCompletion: () => void;
  reset: () => void;
  /** Demo: auto-advance CONTENT_PROGRESS while session is active (respects pause/background). */
  autoRun: boolean;
  setAutoRun: (v: boolean) => void;
  /** When true and progress reaches 100%, auto-run completes the pipeline with wall-clock `completedAt`. */
  autoComplete: boolean;
  setAutoComplete: (v: boolean) => void;
  /** User-driven completion using current events and `nowIso()` (real elapsed; may fail impossible-speed checks). */
  verifyMoment: () => void;
  isReadyToVerify: boolean;
}

export function usePopsSession(options?: UsePopsSessionOptions): UsePopsSessionResult {
  const persistLocal = options?.persistLocal === true;
  const [session, setSession] = useState<PopsSession | null>(null);
  const [events, setEvents] = useState<PopsEvent[]>([]);
  const eventsRef = useRef<PopsEvent[]>([]);
  const [aggregate, setAggregate] = useState<PopsSessionAggregate | null>(null);
  const [judgment, setJudgment] = useState<PopsJudgment | null>(null);
  const [rewardDecision, setRewardDecision] = useState<PopsRewardDecision | null>(null);
  const [walletIntent, setWalletIntent] = useState<PopsWalletRewardIntent | null>(null);
  const [privacyReceipt, setPrivacyReceipt] = useState<PopsPrivacyReceipt | null>(null);
  const [preview, setPreview] = useState<PopsSessionPreview | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  const [progressPct, setProgressPctState] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [autoRun, setAutoRun] = useState(true);
  const [autoComplete, setAutoComplete] = useState(false);
  const hydratedRef = useRef(false);
  const sessionRef = useRef<PopsSession | null>(null);
  const isPausedRef = useRef(false);
  const isBackgroundedRef = useRef(false);
  const progressRef = useRef(0);
  const rewardDecisionRef = useRef<PopsRewardDecision | null>(null);
  const autoCompleteRef = useRef(false);

  const dismissRecoveryNotice = useCallback(() => setRecoveryNotice(null), []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    isBackgroundedRef.current = isBackgrounded;
  }, [isBackgrounded]);
  useEffect(() => {
    progressRef.current = progressPct;
  }, [progressPct]);
  useEffect(() => {
    rewardDecisionRef.current = rewardDecision;
  }, [rewardDecision]);
  useEffect(() => {
    autoCompleteRef.current = autoComplete;
  }, [autoComplete]);

  const appendEvent = useCallback((e: PopsEvent) => {
    setEvents((prev) => {
      const next = [...prev, e];
      eventsRef.current = next;
      return next;
    });
  }, []);

  const applyPopsCompletion = useCallback(
    (sess: PopsSession, evs: PopsEvent[], completedAt: string) => {
      const out = runLocalPopsCompletionPipeline({
        session: { ...sess, state: "ACTIVE" },
        events: evs,
        completedAt,
        trustTier: 2,
      });
      setSession(out.session);
      setAggregate(out.aggregate);
      setJudgment(out.judgment);
      setRewardDecision(out.rewardDecision);
      setWalletIntent(out.walletIntent);
      setPrivacyReceipt(out.privacyReceipt);
      setIsPaused(false);
      setIsBackgrounded(false);
      if (persistLocal) clearPopsLocalSession();
    },
    [persistLocal],
  );

  const applyPopsCompletionRef = useRef(applyPopsCompletion);
  useEffect(() => {
    applyPopsCompletionRef.current = applyPopsCompletion;
  }, [applyPopsCompletion]);

  useEffect(() => {
    if (!persistLocal || hydratedRef.current) return;
    hydratedRef.current = true;
    const stored = loadPopsLocalSession();
    if (!stored) return;
    if (isPopsStoredSessionExpired(stored)) {
      clearPopsLocalSession();
      setRecoveryNotice("Previous verification expired.");
      return;
    }
    if (!isLiveDemoState(stored.session.state)) {
      clearPopsLocalSession();
      return;
    }
    eventsRef.current = stored.events;
    setSession(stored.session);
    setEvents(stored.events);
    setProgressPctState(stored.lastProgressPct);
    setIsPaused(stored.session.state === "PAUSED");
    setIsBackgrounded(stored.session.state === "BACKGROUNDED");
    setRecoveryNotice("Session restored.");
  }, [persistLocal]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const w = window;
    if (!session || session.state === "NOT_STARTED") {
      setElapsedMs(0);
      return;
    }
    if (
      isPaused ||
      session.state === "REWARD_DENIED" ||
      session.state === "COMPLETED" ||
      session.state === "REWARD_HELD" ||
      session.state === "REWARD_PENDING"
    ) {
      return;
    }
    const tick = () => {
      const start = parsePopsSessionStartMs(session);
      setElapsedMs(Math.max(0, Date.now() - start));
    };
    tick();
    const id = w.setInterval(tick, TICK_MS);
    return () => w.clearInterval(id);
  }, [session, isPaused]);

  useEffect(() => {
    if (!persistLocal || !session) return;
    if (rewardDecision != null || !isLiveDemoState(session.state)) {
      return;
    }
    savePopsLocalSession({
      version: 1,
      session,
      events,
      lastProgressPct: progressPct,
      savedAt: new Date().toISOString(),
    });
  }, [persistLocal, session, events, progressPct, rewardDecision]);

  /** Demo-only: advance progress on an interval; never simulates background fraud. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!autoRun) return;
    const id = window.setInterval(() => {
      const s = sessionRef.current;
      if (!s || rewardDecisionRef.current) return;
      if (!isLiveDemoState(s.state)) return;
      if (isPausedRef.current || isBackgroundedRef.current) return;
      const p = progressRef.current;
      if (p >= 100) {
        if (autoCompleteRef.current) {
          const hasDone = eventsRef.current.some((e) => e.eventType === "CONTENT_COMPLETED");
          if (!hasDone) {
            const progressEv = createPopsEvent({
              sessionId: s.id,
              userId: s.userId,
              eventType: "CONTENT_PROGRESS",
              source: "CONTENT",
              payload: { contentProgressPct: 100 },
            });
            const doneEv = createPopsEvent({
              sessionId: s.id,
              userId: s.userId,
              eventType: "CONTENT_COMPLETED",
              source: "CONTENT",
            });
            const merged = [...eventsRef.current, progressEv, doneEv];
            eventsRef.current = merged;
            setEvents(merged);
            setProgressPctState(100);
            applyPopsCompletionRef.current(s, merged, nowIso());
          }
        }
        return;
      }
      const next = Math.min(100, p + 1);
      setProgressPctState(next);
      const progressEv = createPopsEvent({
        sessionId: s.id,
        userId: s.userId,
        eventType: "CONTENT_PROGRESS",
        source: "CONTENT",
        payload: { contentProgressPct: next },
      });
      setEvents((prev) => {
        const n = [...prev, progressEv];
        eventsRef.current = n;
        return n;
      });
    }, AUTO_PROGRESS_TICK_MS);
    return () => window.clearInterval(id);
  }, [autoRun]);

  useEffect(() => {
    if (!session || rewardDecision) {
      setPreview(null);
      return;
    }
    if (session.state === "NOT_STARTED") {
      setPreview(null);
      return;
    }
    const p = buildPopsSessionPreview({
      session,
      events,
      now: new Date().toISOString(),
      isPaused,
      isBackgrounded,
    });
    setPreview(p);
  }, [session, events, isPaused, isBackgrounded, rewardDecision, elapsedMs]);

  const isStarted = session !== null;
  const isCompleted = rewardDecision !== null;
  const isRunning =
    session !== null &&
    !isPaused &&
    !isBackgrounded &&
    session.state === "ACTIVE" &&
    !isCompleted;

  const userVisibleStatus = useMemo(() => {
    if (rewardDecision) {
      switch (rewardDecision.decisionStatus) {
        case "APPROVED_FULL":
          return "Moment verified";
        case "APPROVED_PARTIAL":
          return "Partial moment verified";
        case "HELD":
          return "Reward under review";
        case "DENIED_FRAUD_RISK":
        case "DENIED_LOW_CONFIDENCE":
          return "Moment not verified";
        default:
          return "Moment not verified";
      }
    }
    if (!session) return "P.O.P.S ready";
    if (session.state === "NOT_STARTED") return "P.O.P.S ready";
    if (preview) return preview.userVisibleStatus;
    return "P.O.P.S ready";
  }, [rewardDecision, session, preview]);

  const isReadyToVerify = useMemo(() => {
    if (!session || rewardDecision) return false;
    if (!isLiveDemoState(session.state)) return false;
    return progressPct >= 90 && elapsedMs >= session.requiredDurationMs;
  }, [session, rewardDecision, progressPct, elapsedMs]);

  const startSponsoredWatch = useCallback(() => {
    setRecoveryNotice(null);
    const id = newSessionId();
    const startedAt = new Date().toISOString();
    const nextSession: PopsSession = {
      id,
      userId: DEMO_USER_ID,
      sessionType: "SPONSORED_WATCH",
      proofLevel: "LEVEL_2_ATTENTION",
      state: "ACTIVE",
      startedAt,
      requiredDurationMs: POPS_DEFAULT_REQUIRED_DURATION_MS,
      requiredCompletionPct: POPS_DEFAULT_REQUIRED_COMPLETION_PCT,
      expectedReward: { coinType: POPS_DEFAULT_REWARD_COIN_TYPE, amount: POPS_DEFAULT_REWARD_AMOUNT },
    };
    const ev1 = createPopsEvent({
      sessionId: id,
      userId: DEMO_USER_ID,
      eventType: "SESSION_STARTED",
      source: "SESSION",
    });
    const ev2 = createPopsEvent({
      sessionId: id,
      userId: DEMO_USER_ID,
      eventType: "CONTENT_STARTED",
      source: "CONTENT",
    });
    const initial = [ev1, ev2];
    eventsRef.current = initial;
    setEvents(initial);
    setSession(nextSession);
    setAggregate(null);
    setJudgment(null);
    setRewardDecision(null);
    setWalletIntent(null);
    setPrivacyReceipt(null);
    setIsPaused(false);
    setIsBackgrounded(false);
    setProgressPctState(0);
    setElapsedMs(0);
  }, []);

  const pause = useCallback(() => {
    if (!session || rewardDecision) return;
    appendEvent(
      createPopsEvent({
        sessionId: session.id,
        userId: session.userId,
        eventType: "SESSION_PAUSED",
        source: "SESSION",
      }),
    );
    setIsPaused(true);
    setSession({ ...session, state: "PAUSED" });
  }, [session, rewardDecision, appendEvent]);

  const resume = useCallback(() => {
    if (!session || rewardDecision) return;
    appendEvent(
      createPopsEvent({
        sessionId: session.id,
        userId: session.userId,
        eventType: "SESSION_RESUMED",
        source: "SESSION",
      }),
    );
    setIsPaused(false);
    setSession({ ...session, state: "ACTIVE" });
  }, [session, rewardDecision, appendEvent]);

  const simulateAppBackground = useCallback(() => {
    if (!session || rewardDecision) return;
    appendEvent(
      createPopsEvent({
        sessionId: session.id,
        userId: session.userId,
        eventType: "APP_BACKGROUNDED",
        source: "APP_STATE",
      }),
    );
    setIsBackgrounded(true);
    setSession({ ...session, state: "BACKGROUNDED" });
  }, [session, rewardDecision, appendEvent]);

  const simulateAppForeground = useCallback(() => {
    if (!session || rewardDecision) return;
    appendEvent(
      createPopsEvent({
        sessionId: session.id,
        userId: session.userId,
        eventType: "APP_FOREGROUNDED",
        source: "APP_STATE",
      }),
    );
    setIsBackgrounded(false);
    setSession({ ...session, state: "ACTIVE" });
  }, [session, rewardDecision, appendEvent]);

  const recordTap = useCallback(() => {
    if (!session || rewardDecision) return;
    appendEvent(
      createPopsEvent({
        sessionId: session.id,
        userId: session.userId,
        eventType: "TOUCH_TAP",
        source: "TOUCH",
      }),
    );
  }, [session, rewardDecision, appendEvent]);

  const recordScroll = useCallback(() => {
    if (!session || rewardDecision) return;
    appendEvent(
      createPopsEvent({
        sessionId: session.id,
        userId: session.userId,
        eventType: "TOUCH_SCROLL",
        source: "TOUCH",
      }),
    );
  }, [session, rewardDecision, appendEvent]);

  const setProgress = useCallback(
    (pct: number) => {
      if (!session || rewardDecision) return;
      const clamped = Math.max(0, Math.min(100, pct));
      setProgressPctState(clamped);
      const progressEv = createPopsEvent({
        sessionId: session.id,
        userId: session.userId,
        eventType: "CONTENT_PROGRESS",
        source: "CONTENT",
        payload: { contentProgressPct: clamped },
      });
      const doneEv =
        clamped >= 100
          ? createPopsEvent({
              sessionId: session.id,
              userId: session.userId,
              eventType: "CONTENT_COMPLETED",
              source: "CONTENT",
            })
          : null;
      setEvents((prev) => {
        const next = doneEv ? [...prev, progressEv, doneEv] : [...prev, progressEv];
        eventsRef.current = next;
        return next;
      });
    },
    [session, rewardDecision],
  );

  const completeClean = useCallback(() => {
    if (!session || rewardDecision) return;
    const { events: syn, completedAt } = buildSyntheticCleanFullWatch(session);
    setProgressPctState(100);
    eventsRef.current = syn;
    setEvents(syn);
    applyPopsCompletion(session, syn, completedAt);
  }, [session, rewardDecision, applyPopsCompletion]);

  const simulateImpossibleCompletion = useCallback(() => {
    if (!session || rewardDecision) return;
    const { events: syn, completedAt } = buildSyntheticImpossibleFast(session);
    setProgressPctState(100);
    eventsRef.current = syn;
    setEvents(syn);
    applyPopsCompletion(session, syn, completedAt);
  }, [session, rewardDecision, applyPopsCompletion]);

  const completePartial = useCallback(() => {
    if (!session || rewardDecision) return;
    const { events: syn, completedAt } = buildSyntheticPartialWatch(session);
    setProgressPctState(50);
    eventsRef.current = syn;
    setEvents(syn);
    applyPopsCompletion(session, syn, completedAt);
  }, [session, rewardDecision, applyPopsCompletion]);

  const simulateBackgroundFraud = useCallback(() => {
    if (!session || rewardDecision) return;
    const { events: syn, completedAt } = buildSyntheticBackgroundFraud(session);
    setProgressPctState(100);
    eventsRef.current = syn;
    setEvents(syn);
    applyPopsCompletion(session, syn, completedAt);
  }, [session, rewardDecision, applyPopsCompletion]);

  const simulateDeviceWarning = useCallback(() => {
    if (!session || rewardDecision) return;
    const { events: syn, completedAt } = buildSyntheticDeviceWarning(session);
    setProgressPctState(100);
    eventsRef.current = syn;
    setEvents(syn);
    applyPopsCompletion(session, syn, completedAt);
  }, [session, rewardDecision, applyPopsCompletion]);

  const verifyMoment = useCallback(() => {
    if (!session || rewardDecision) return;
    let evs = [...eventsRef.current];
    const hasComplete = evs.some((e) => e.eventType === "CONTENT_COMPLETED");
    if (!hasComplete) {
      const progressEv = createPopsEvent({
        sessionId: session.id,
        userId: session.userId,
        eventType: "CONTENT_PROGRESS",
        source: "CONTENT",
        payload: { contentProgressPct: 100 },
      });
      const doneEv = createPopsEvent({
        sessionId: session.id,
        userId: session.userId,
        eventType: "CONTENT_COMPLETED",
        source: "CONTENT",
      });
      evs = [...evs, progressEv, doneEv];
    }
    eventsRef.current = evs;
    setEvents(evs);
    setProgressPctState(100);
    applyPopsCompletion(session, evs, nowIso());
  }, [session, rewardDecision, applyPopsCompletion]);

  const reset = useCallback(() => {
    eventsRef.current = [];
    setSession(null);
    setEvents([]);
    setAggregate(null);
    setJudgment(null);
    setRewardDecision(null);
    setWalletIntent(null);
    setPrivacyReceipt(null);
    setPreview(null);
    setIsPaused(false);
    setIsBackgrounded(false);
    setProgressPctState(0);
    setElapsedMs(0);
    if (persistLocal) clearPopsLocalSession();
  }, [persistLocal]);

  return {
    session,
    events,
    aggregate,
    judgment,
    rewardDecision,
    walletIntent,
    privacyReceipt,
    preview,
    isStarted,
    isRunning,
    isPaused,
    isBackgrounded,
    isCompleted,
    progressPct,
    elapsedMs,
    userVisibleStatus,
    recoveryNotice,
    dismissRecoveryNotice,
    persistLocalEnabled: persistLocal,
    startSponsoredWatch,
    pause,
    resume,
    simulateAppBackground,
    simulateAppForeground,
    recordTap,
    recordScroll,
    setProgress,
    completeClean,
    completePartial,
    simulateBackgroundFraud,
    simulateDeviceWarning,
    simulateImpossibleCompletion,
    reset,
    autoRun,
    setAutoRun,
    autoComplete,
    setAutoComplete,
    verifyMoment,
    isReadyToVerify,
  };
}
