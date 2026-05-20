import {
  type PopsClientEvent,
  type PopsEventType,
  type PopsReasonCode,
  type PopsScoringSnapshot,
  type PopsSession,
  type PopsSessionStartInput,
  type PopsSignalBatch,
  type PopsSignalItem,
  type PopsSessionState,
} from "./pops-client-events";
import { PopsSignalBuffer } from "./pops-signal-buffer";

type CaptureOptions = {
  transport?: (payload: { events: PopsClientEvent[]; signalBatches: PopsSignalBatch[] }) => Promise<void>;
  isOnline?: () => boolean;
};

type CaptureSnapshot = {
  session?: PopsSession;
  state: PopsSessionState;
  progressPct: number;
  rawEventCount: number;
  bufferedEventCount: number;
  score: PopsScoringSnapshot;
};

const SIGNAL_FLUSH_INTERVAL_MS = 2000;
const PASSIVE_FARM_IDLE_LIMIT_MS = 20000;
const INTERRUPTION_PATTERN_WINDOW_MS = 60000;
const INTERRUPTION_PATTERN_THRESHOLD = 3;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function eventId(): string {
  return `pops_evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class PopsSessionCapture {
  private readonly buffer: PopsSignalBuffer;
  private session?: PopsSession;
  private state: PopsSessionState = "IDLE";
  private progressPct = 0;
  private rawEventCount = 0;

  private backgroundSince?: number;
  private lastForegroundAt?: number;
  private lastTouchAt?: number;
  private lastMotionAt?: number;
  private lastProgressAt?: number;
  private contentPaused = false;
  private screenActive = true;
  private inForeground = true;
  private motionStable?: boolean;
  private deviceIntegrityBasicFlag = true;
  private accountContinuityBasicFlag = true;
  private interruptionTimestamps: number[] = [];
  private touchIntervals: number[] = [];

  private signalBucket: PopsSignalItem[] = [];
  private signalTimer?: ReturnType<typeof setInterval>;
  private readonly reasonCodes = new Set<PopsReasonCode>();
  private score: PopsScoringSnapshot = {
    presenceConfidence: 0,
    attentionConfidence: 0,
    intentConfidence: 0,
    fraudRisk: 0,
    rewardEligibility: false,
    recommendedAction: "Presence forming…",
    isRewardLikely: false,
    isVerificationDegraded: false,
    isHeldForReview: false,
    reasonCodes: [],
  };

  constructor(options?: CaptureOptions) {
    this.buffer = new PopsSignalBuffer({
      transport: options?.transport,
      isOnline: options?.isOnline,
    });
  }

  startSession(input: PopsSessionStartInput): PopsSession {
    const now = Date.now();
    this.session = {
      ...input,
      sessionId: `pops_session_${now}_${Math.random().toString(36).slice(2, 7)}`,
      startedAt: now,
    };
    this.state = "ACTIVE";
    this.progressPct = 0;
    this.rawEventCount = 0;
    this.reasonCodes.clear();
    this.interruptionTimestamps = [];
    this.touchIntervals = [];
    this.recordEvent("SESSION_STARTED", { ...input });
    this.startSignalTimer();
    this.computeScore();
    return this.session;
  }

  recordEvent(eventType: PopsEventType, payload?: Record<string, unknown>): void {
    if (!this.session) return;

    const timestamp = Date.now();
    const event: PopsClientEvent = {
      id: eventId(),
      type: eventType,
      timestamp,
      payload,
    };

    this.rawEventCount += 1;
    this.buffer.addEvent(event);
    this.applyEventEffects(eventType, payload, timestamp);
    this.computeScore();
  }

  recordSignalBatch(signals: PopsSignalItem[]): void {
    if (!this.session || signals.length === 0) return;
    this.signalBucket.push(...signals);
  }

  pauseSession(reason: string): void {
    if (this.state !== "ACTIVE") return;
    this.state = "PAUSED";
    this.contentPaused = true;
    this.recordEvent("CONTENT_PAUSED", { reason });
  }

  resumeSession(reason: string): void {
    if (this.state !== "PAUSED") return;
    this.state = "ACTIVE";
    this.contentPaused = false;
    this.recordEvent("CONTENT_RESUMED", { reason });
  }

  completeSession(): void {
    if (!this.session) return;
    this.state = "COMPLETED";
    this.progressPct = 100;
    this.recordEvent("CONTENT_COMPLETED", { progressPct: 100 });
    this.computeScore();
    void this.flushAll();
  }

  closeSession(): void {
    if (!this.session) return;
    if (this.state !== "COMPLETED") {
      this.state = "CLOSED";
    }
    this.recordEvent("SESSION_ENDED", { state: this.state });
    void this.flushAll();
    this.stopSignalTimer();
    this.session.endedAt = Date.now();
  }

  getSnapshot(): CaptureSnapshot {
    return {
      session: this.session,
      state: this.state,
      progressPct: this.progressPct,
      rawEventCount: this.rawEventCount,
      bufferedEventCount: this.buffer.getPendingCount(),
      score: this.score,
    };
  }

  private applyEventEffects(
    eventType: PopsEventType,
    payload: Record<string, unknown> | undefined,
    now: number,
  ): void {
    switch (eventType) {
      case "SCREEN_ACTIVE":
        this.screenActive = true;
        break;
      case "APP_FOREGROUNDED":
        this.inForeground = true;
        this.lastForegroundAt = now;
        this.backgroundSince = undefined;
        break;
      case "APP_BACKGROUNDED":
        this.inForeground = false;
        this.backgroundSince = now;
        this.interruptionTimestamps.push(now);
        this.trimInterruptionHistory(now);
        void this.buffer.flush();
        break;
      case "CONTENT_PROGRESS": {
        this.lastProgressAt = now;
        const nextProgress = Number(payload?.progressPct ?? this.progressPct);
        if (this.inForeground === false && nextProgress > this.progressPct) {
          this.reasonCodes.add("BACKGROUND_PROGRESS");
          this.reasonCodes.add("IMPOSSIBLE_PROGRESS");
        }
        this.progressPct = Math.max(this.progressPct, Math.min(100, nextProgress));
        break;
      }
      case "TOUCH_TAP":
      case "TOUCH_SCROLL":
      case "TOUCH_SWIPE":
        if (this.lastTouchAt) {
          this.touchIntervals.push(now - this.lastTouchAt);
          if (this.touchIntervals.length > 20) this.touchIntervals.shift();
        }
        this.lastTouchAt = now;
        break;
      case "MOTION_STABLE":
        this.motionStable = true;
        this.lastMotionAt = now;
        break;
      case "MOTION_UNSTABLE":
        this.motionStable = false;
        this.lastMotionAt = now;
        break;
      case "NOTIFICATION_INTERRUPTION":
        this.interruptionTimestamps.push(now);
        this.trimInterruptionHistory(now);
        break;
      case "DEVICE_INTEGRITY_WARNING":
        this.deviceIntegrityBasicFlag = false;
        this.reasonCodes.add("DEVICE_INTEGRITY_LOW");
        break;
      case "CONTENT_COMPLETED":
        if (this.session && now - this.session.startedAt < this.session.requiredDurationMs) {
          this.reasonCodes.add("TOO_FAST_COMPLETION");
        }
        break;
      default:
        break;
    }
  }

  private computeScore(): void {
    const now = Date.now();
    const durationMs = this.session ? now - this.session.startedAt : 0;

    const backgroundPenalty = this.inForeground ? 0 : 18;
    const inactivePenalty = this.lastTouchAt && now - this.lastTouchAt > PASSIVE_FARM_IDLE_LIMIT_MS ? 12 : 0;
    const durationBoost = this.session && durationMs >= this.session.requiredDurationMs ? 14 : 6;

    let presence = 0;
    if (this.screenActive) presence += 22;
    if (this.inForeground) presence += 22;
    if (!this.contentPaused && this.state !== "IDLE") presence += 16;
    presence += durationBoost;
    if (typeof this.motionStable === "boolean") presence += this.motionStable ? 10 : 3;
    presence -= backgroundPenalty + inactivePenalty;

    let attention = 0;
    attention += Math.min(30, this.progressPct * 0.3);
    if (durationMs > 15000) attention += 14;
    if (this.lastTouchAt && now - this.lastTouchAt < 10000) attention += 12;
    if (!this.contentPaused) attention += 10;
    if (this.interruptionTimestamps.length > 0) attention -= Math.min(15, this.interruptionTimestamps.length * 3);
    if (this.reasonCodes.has("BACKGROUND_PROGRESS")) attention -= 18;

    let intent = 0;
    const hasRecentTap = this.lastTouchAt ? now - this.lastTouchAt < 6000 : false;
    if (hasRecentTap && durationMs > 4000) intent += 28;
    if (this.progressPct > 20) intent += 20;
    if (this.touchIntervals.length >= 4) intent += 12;
    if (this.touchIntervals.length > 3 && this.isHyperRegularTouchPattern()) intent -= 22;
    if (this.progressPct >= 90 && durationMs < 5000) intent -= 18;

    let fraud = 5;
    if (this.reasonCodes.has("IMPOSSIBLE_PROGRESS")) fraud += 24;
    if (this.reasonCodes.has("BACKGROUND_PROGRESS")) fraud += 18;
    if (this.reasonCodes.has("TOO_FAST_COMPLETION")) fraud += 20;
    if (this.isPassiveFarmRisk(now)) {
      this.reasonCodes.add("LOW_INTERACTION_DENSITY");
      fraud += 15;
    }
    if (this.isHyperRegularTouchPattern()) {
      this.reasonCodes.add("HYPER_REGULAR_TOUCH_PATTERN");
      fraud += 16;
    }
    if (this.hasRepeatedInterruptionPattern(now)) {
      this.reasonCodes.add("REPEATED_INTERRUPTION_PATTERN");
      fraud += 14;
    }
    if (!this.deviceIntegrityBasicFlag) fraud += 22;
    if (!this.accountContinuityBasicFlag) fraud += 10;

    const presenceScore = clampScore(presence);
    const attentionScore = clampScore(attention);
    const intentScore = clampScore(intent);
    const fraudRisk = clampScore(fraud);

    if (fraudRisk >= 50) this.reasonCodes.add("SESSION_DEGRADED");
    if (fraudRisk < 40 && attentionScore >= 45) this.reasonCodes.add("VALID_ATTENTION_SESSION");
    else if (fraudRisk < 50 && presenceScore >= 50) this.reasonCodes.add("VALID_BASIC_SESSION");

    const rewardEligibility = this.progressPct >= 95 && fraudRisk < 55 && attentionScore >= 35;
    const isVerificationDegraded = fraudRisk >= 50 || this.reasonCodes.has("SESSION_DEGRADED");
    const isHeldForReview = fraudRisk >= 65;
    const isRewardLikely = rewardEligibility && !isHeldForReview;
    const recommendedAction = this.getStatusCopy({
      rewardEligibility,
      isRewardLikely,
      isVerificationDegraded,
      isHeldForReview,
      presenceScore,
      attentionScore,
      fraudRisk,
    });

    this.score = {
      presenceConfidence: presenceScore,
      attentionConfidence: attentionScore,
      intentConfidence: intentScore,
      fraudRisk,
      rewardEligibility,
      recommendedAction,
      isRewardLikely,
      isVerificationDegraded,
      isHeldForReview,
      reasonCodes: Array.from(this.reasonCodes),
    };
  }

  private getStatusCopy(input: {
    rewardEligibility: boolean;
    isRewardLikely: boolean;
    isVerificationDegraded: boolean;
    isHeldForReview: boolean;
    presenceScore: number;
    attentionScore: number;
    fraudRisk: number;
  }): string {
    if (input.isHeldForReview) return "Reward held for review.";
    if (input.isRewardLikely) return "Reward approved.";
    if (input.rewardEligibility && !input.isRewardLikely) return "Reward pending verification.";
    if (input.isVerificationDegraded) return "Signal degraded.";
    if (input.attentionScore >= 70 && input.presenceScore >= 65 && input.fraudRisk < 40) return "Moment verified.";
    if (input.attentionScore >= 50) return "Attention quality rising.";
    if (input.presenceScore >= 45) return "Human session detected.";
    return "Presence forming…";
  }

  private startSignalTimer(): void {
    this.stopSignalTimer();
    this.signalTimer = setInterval(() => {
      if (!this.session || this.signalBucket.length === 0) return;
      const batch: PopsSignalBatch = {
        sessionId: this.session.sessionId,
        createdAt: Date.now(),
        signals: this.signalBucket.splice(0),
      };
      this.buffer.addSignalBatch(batch);
      void this.buffer.flush();
    }, SIGNAL_FLUSH_INTERVAL_MS);
  }

  private stopSignalTimer(): void {
    if (this.signalTimer) {
      clearInterval(this.signalTimer);
      this.signalTimer = undefined;
    }
  }

  private async flushAll(): Promise<void> {
    if (!this.session) return;
    if (this.signalBucket.length > 0) {
      this.buffer.addSignalBatch({
        sessionId: this.session.sessionId,
        createdAt: Date.now(),
        signals: this.signalBucket.splice(0),
      });
    }
    await this.buffer.flush();
  }

  private isPassiveFarmRisk(now: number): boolean {
    const idleTouch = !this.lastTouchAt || now - this.lastTouchAt > PASSIVE_FARM_IDLE_LIMIT_MS;
    const idleMotion = !this.lastMotionAt || now - this.lastMotionAt > PASSIVE_FARM_IDLE_LIMIT_MS;
    const noForeground = !this.inForeground;
    const progressAdvancing = this.progressPct > 25 && !!this.lastProgressAt;
    return progressAdvancing && idleTouch && idleMotion && noForeground;
  }

  private isHyperRegularTouchPattern(): boolean {
    if (this.touchIntervals.length < 5) return false;
    const avg = this.touchIntervals.reduce((sum, n) => sum + n, 0) / this.touchIntervals.length;
    const variance =
      this.touchIntervals.reduce((sum, n) => sum + Math.pow(n - avg, 2), 0) / this.touchIntervals.length;
    const stdDev = Math.sqrt(variance);
    return stdDev < 120;
  }

  private hasRepeatedInterruptionPattern(now: number): boolean {
    this.trimInterruptionHistory(now);
    return this.interruptionTimestamps.length >= INTERRUPTION_PATTERN_THRESHOLD;
  }

  private trimInterruptionHistory(now: number): void {
    this.interruptionTimestamps = this.interruptionTimestamps.filter(
      (ts) => now - ts <= INTERRUPTION_PATTERN_WINDOW_MS,
    );
  }
}

