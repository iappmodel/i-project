import type { PopsEventType, PopsSignalItem } from "../../../pops/capture/pops-client-events";
import type { InMemoryPopsEventRepository } from "../repositories/inMemoryPopsEvent.repository";
import type {
  InMemoryPopsSession,
  InMemoryPopsSessionRepository,
  PopsCompletionOutput,
} from "../repositories/inMemoryPopsSession.repository";

type Aggregates = {
  progressPct: number;
  durationMs: number;
  interactions: number;
  interruptions: number;
  hasBackgroundProgress: boolean;
  hasIntegrityWarning: boolean;
  signals: PopsSignalItem[];
};

const INTERRUPTION_EVENTS: PopsEventType[] = ["APP_BACKGROUNDED", "NOTIFICATION_INTERRUPTION"];
const INTERACTION_EVENTS: PopsEventType[] = ["TOUCH_TAP", "TOUCH_SCROLL", "TOUCH_SWIPE"];

function aggregateSessionSignals(
  session: InMemoryPopsSession,
  events: Array<{ type: PopsEventType; timestamp: number; payload?: Record<string, unknown> }>,
  signalBatches: Array<{ signals: PopsSignalItem[] }>,
): Aggregates {
  let progressPct = 0;
  let interruptions = 0;
  let interactions = 0;
  let hasBackgroundProgress = false;
  let hasIntegrityWarning = false;
  const allSignals = signalBatches.flatMap((batch) => batch.signals);

  for (const event of events) {
    if (INTERRUPTION_EVENTS.includes(event.type)) interruptions += 1;
    if (INTERACTION_EVENTS.includes(event.type)) interactions += 1;
    if (event.type === "CONTENT_PROGRESS") {
      const nextProgress = Number(event.payload?.progressPct ?? 0);
      if (Number.isFinite(nextProgress)) progressPct = Math.max(progressPct, Math.min(100, nextProgress));
    }
    if (event.type === "DEVICE_INTEGRITY_WARNING") hasIntegrityWarning = true;
  }

  for (const signal of allSignals) {
    if (signal.type === "CONTENT_PROGRESS") {
      const nextProgress = Number(signal.value ?? signal.payload?.progressPct ?? 0);
      if (Number.isFinite(nextProgress)) progressPct = Math.max(progressPct, Math.min(100, nextProgress));
      if (Boolean(signal.payload?.progressInBackground)) hasBackgroundProgress = true;
    }
    if (signal.type === "DEVICE_INTEGRITY_WARNING") hasIntegrityWarning = true;
  }

  const endTs = events.length > 0 ? events[events.length - 1]!.timestamp : Date.now();
  return {
    progressPct,
    durationMs: Math.max(0, endTs - session.startedAt),
    interactions,
    interruptions,
    hasBackgroundProgress,
    hasIntegrityWarning,
    signals: allSignals,
  };
}

function scoreFromAggregates(session: InMemoryPopsSession, aggregates: Aggregates) {
  const progressFactor = Math.min(1, aggregates.progressPct / 100);
  const durationFactor = session.requiredDurationMs > 0 ? Math.min(1, aggregates.durationMs / session.requiredDurationMs) : 1;
  const interactionFactor = Math.min(1, aggregates.interactions / 8);

  const presenceConfidence = Math.round((0.45 * durationFactor + 0.35 * progressFactor + 0.2 * interactionFactor) * 100);
  const attentionConfidence = Math.round((0.5 * progressFactor + 0.3 * interactionFactor + 0.2 * durationFactor) * 100);
  const intentConfidence = Math.round((0.55 * interactionFactor + 0.3 * progressFactor + 0.15 * durationFactor) * 100);

  let fraudRisk = Math.round((aggregates.interruptions / 5) * 100);
  if (aggregates.hasBackgroundProgress) fraudRisk = Math.max(fraudRisk, 75);
  if (aggregates.hasIntegrityWarning) fraudRisk = Math.max(fraudRisk, 65);
  if (aggregates.interactions === 0 && aggregates.progressPct > 50) fraudRisk = Math.max(fraudRisk, 60);
  fraudRisk = Math.min(100, fraudRisk);

  const rewardEligibility = aggregates.progressPct >= 95 && fraudRisk < 60 && attentionConfidence >= 45;
  const reasonCodes: string[] = [];
  if (aggregates.progressPct >= 95) reasonCodes.push("VALID_COMPLETION");
  if (aggregates.hasBackgroundProgress) reasonCodes.push("BACKGROUND_PROGRESS");
  if (aggregates.hasIntegrityWarning) reasonCodes.push("DEVICE_INTEGRITY_WARNING");
  if (fraudRisk >= 60) reasonCodes.push("SESSION_DEGRADED");
  if (aggregates.interruptions >= 3) reasonCodes.push("REPEATED_INTERRUPTION_PATTERN");
  if (aggregates.interactions < 2) reasonCodes.push("LOW_INTERACTION_DENSITY");

  return {
    presenceConfidence,
    attentionConfidence,
    intentConfidence,
    fraudRisk,
    rewardEligibility,
    reasonCodes,
    recommendedAction: rewardEligibility ? "Moment verified." : fraudRisk >= 65 ? "Reward held for review." : "Signal quality insufficient.",
  };
}

export class PopsCompletionPipelineService {
  constructor(
    private readonly sessions: InMemoryPopsSessionRepository,
    private readonly events: InMemoryPopsEventRepository,
  ) {}

  completeSession(sessionId: string): PopsCompletionOutput {
    const session = this.sessions.getSession(sessionId);
    if (!session) throw new Error("session not found");
    if (session.state === "CLOSED") throw new Error("session already closed");
    if (session.finalDecision) return session.finalDecision;

    try {
      const sessionEvents = this.events.getEvents(sessionId);
      const signalBatches = this.events.getSignalBatches(sessionId);
      const aggregates = aggregateSessionSignals(session, sessionEvents, signalBatches);
      const score = scoreFromAggregates(session, aggregates);

      const judgment = this.sessions.createJudgment({
        sessionId,
        presenceConfidence: score.presenceConfidence,
        attentionConfidence: score.attentionConfidence,
        intentConfidence: score.intentConfidence,
        fraudRisk: score.fraudRisk,
        rewardEligibility: score.rewardEligibility,
        reasonCodes: score.reasonCodes,
      });

      const rewardDecision = this.sessions.createRewardDecision({
        sessionId,
        status: score.rewardEligibility ? "APPROVED" : score.fraudRisk >= 65 ? "HELD" : "DENIED",
        amountMinor: score.rewardEligibility ? 100 : 0,
        reasonCodes: score.reasonCodes,
      });

      const walletIntent = rewardDecision.status === "APPROVED"
        ? this.sessions.createWalletIntent({
            sessionId,
            rewardDecisionId: rewardDecision.id,
            type: "WALLET_REWARD_INTENT",
            status: "CREATED",
            amountMinor: rewardDecision.amountMinor,
          })
        : null;

      const privacyReceipt = this.sessions.createPrivacyReceipt({
        sessionId,
        summary: "P.O.P.S processed derived signals only. Raw media was not stored.",
        signalCategoriesUsed: [...new Set(aggregates.signals.map((signal) => signal.type.toLowerCase()))],
        rawDataStored: false,
        retentionPolicy: "SESSION_ONLY",
      });

      const finalDecision: PopsCompletionOutput = {
        sessionId,
        finalState: "COMPLETED",
        checkpoint: {
          progressPct: aggregates.progressPct,
          presenceConfidence: score.presenceConfidence,
          attentionConfidence: score.attentionConfidence,
          intentConfidence: score.intentConfidence,
          fraudRisk: score.fraudRisk,
          rewardEligibility: score.rewardEligibility,
          recommendedAction: score.recommendedAction,
          reasonCodes: score.reasonCodes,
        },
        judgment,
        rewardDecision,
        walletIntent,
        privacyReceipt,
        userVisibleMessage: score.rewardEligibility ? "Moment verified." : "Moment not verified.",
      };

      this.sessions.updateSession(sessionId, {
        state: "COMPLETED",
        endedAt: Date.now(),
        checkpoint: finalDecision.checkpoint,
        finalDecision,
      });

      return finalDecision;
    } catch {
      throw new Error("completion failed");
    }
  }
}
