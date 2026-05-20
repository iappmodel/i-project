import type {
  PopsEventEnvelope,
  PopsRewardIdempotencyInput,
  PopsRewardIdempotencyResult,
  PopsSequenceValidationContext,
  PopsSequenceValidationResult,
  PopsSessionIntegritySnapshot,
} from "./pops-security.types";

function createInitialSnapshot(sessionId: string): PopsSessionIntegritySnapshot {
  return {
    sessionId,
    started: false,
    contentStarted: false,
    completed: false,
    closed: false,
    rewardCheckpointCount: 0,
    acceptedEventIds: new Set<string>(),
    lastSequence: -1,
    timestampIntegrity: {
      maxObservedDriftMs: 0,
      impossibleJumpDetected: false,
      lateArrivalDetected: false,
    },
  };
}

export class PopsSessionIntegrityValidator {
  private readonly sessions = new Map<string, PopsSessionIntegritySnapshot>();
  private readonly rewardedSessions = new Set<string>();
  private readonly rewardedCampaignCompletions = new Set<string>();

  getSnapshot(sessionId: string): PopsSessionIntegritySnapshot {
    return this.sessions.get(sessionId) ?? createInitialSnapshot(sessionId);
  }

  validateSequence(
    event: PopsEventEnvelope,
    context: PopsSequenceValidationContext,
  ): PopsSequenceValidationResult {
    const session = this.sessions.get(event.sessionId) ?? createInitialSnapshot(event.sessionId);
    const reasons: string[] = [];

    if (session.acceptedEventIds.has(event.eventId)) {
      reasons.push("DUPLICATE_EVENT_ID");
    }
    if (event.sequence <= session.lastSequence) {
      reasons.push("NON_MONOTONIC_SEQUENCE");
    }
    if (session.closed && event.eventType === "APP_FOREGROUNDED") {
      reasons.push("CANNOT_FOREGROUND_AFTER_CLOSE");
    }
    if (!session.started && event.eventType !== "SESSION_STARTED") {
      reasons.push("CANNOT_COMPLETE_OR_PROGRESS_BEFORE_START");
    }
    if (event.eventType === "SESSION_COMPLETED" && !session.started) {
      reasons.push("CANNOT_COMPLETE_BEFORE_START");
    }
    if (event.eventType === "CONTENT_PROGRESS" && !session.contentStarted) {
      reasons.push("CANNOT_PROGRESS_CONTENT_BEFORE_CONTENT_STARTED");
    }
    if (event.eventType === "REWARD_CHECKPOINT") {
      if (!session.startedAtMs || context.nowMs - session.startedAtMs < context.requiredDurationMs) {
        reasons.push("CANNOT_REWARD_CHECKPOINT_BEFORE_REQUIRED_DURATION");
      }
    }
    if (event.eventType === "SESSION_COMPLETED" && session.completed) {
      reasons.push("CANNOT_COMPLETE_TWICE");
    }

    this.evaluateTimestampIntegrity(event, session, reasons, context.nowMs);

    if (reasons.length > 0) {
      return { accepted: false, reasons };
    }

    session.acceptedEventIds.add(event.eventId);
    session.lastSequence = event.sequence;
    if (event.eventType === "SESSION_STARTED") {
      session.started = true;
      session.startedAtMs = event.clientTimestampMs;
    }
    if (event.eventType === "CONTENT_STARTED") {
      session.contentStarted = true;
      session.contentStartedAtMs = event.clientTimestampMs;
    }
    if (event.eventType === "REWARD_CHECKPOINT") {
      session.rewardCheckpointCount += 1;
    }
    if (event.eventType === "SESSION_COMPLETED") {
      session.completed = true;
      session.completedAtMs = event.clientTimestampMs;
    }
    if (event.eventType === "SESSION_CLOSED") {
      session.closed = true;
    }

    this.sessions.set(event.sessionId, session);
    return { accepted: true, reasons: [] };
  }

  assertRewardIdempotency(input: PopsRewardIdempotencyInput): PopsRewardIdempotencyResult {
    const reasons: string[] = [];

    if (this.rewardedSessions.has(input.sessionId)) {
      reasons.push("SESSION_ALREADY_HAS_WALLET_INTENT");
    }

    const campaignCompletionKey = `${input.campaignId}:${input.userId}`;
    if (!input.campaignAllowsDuplicateRewards && this.rewardedCampaignCompletions.has(campaignCompletionKey)) {
      reasons.push("DUPLICATE_CAMPAIGN_COMPLETION_REWARD_BLOCKED");
    }

    if (reasons.length > 0) {
      return { allowed: false, reasons };
    }

    this.rewardedSessions.add(input.sessionId);
    this.rewardedCampaignCompletions.add(campaignCompletionKey);
    return { allowed: true, reasons: [] };
  }

  private evaluateTimestampIntegrity(
    event: PopsEventEnvelope,
    session: PopsSessionIntegritySnapshot,
    reasons: string[],
    nowMs: number,
  ): void {
    const previousClient = session.timestampIntegrity.previousClientTimestampMs;
    const previousServer = session.timestampIntegrity.previousServerTimestampMs;
    const serverTimestamp = event.serverReceivedAtMs ?? nowMs;

    const driftMs = Math.abs(serverTimestamp - event.clientTimestampMs);
    session.timestampIntegrity.maxObservedDriftMs = Math.max(
      session.timestampIntegrity.maxObservedDriftMs,
      driftMs,
    );
    session.timestampIntegrity.driftMs = driftMs;

    if (driftMs > 45_000) {
      reasons.push("CLOCK_DRIFT_TOO_HIGH");
    }
    if (previousClient !== undefined && event.clientTimestampMs < previousClient - 2_000) {
      session.timestampIntegrity.impossibleJumpDetected = true;
      reasons.push("IMPOSSIBLE_TIME_JUMP");
    }
    if (previousServer !== undefined && serverTimestamp < previousServer - 2_000) {
      session.timestampIntegrity.impossibleJumpDetected = true;
      reasons.push("SERVER_TIME_REGRESSION");
    }
    if (serverTimestamp - event.clientTimestampMs > 120_000) {
      session.timestampIntegrity.lateArrivalDetected = true;
      reasons.push("LATE_ARRIVAL_EVENT");
    }

    session.timestampIntegrity.previousClientTimestampMs = event.clientTimestampMs;
    session.timestampIntegrity.previousServerTimestampMs = serverTimestamp;
  }
}
