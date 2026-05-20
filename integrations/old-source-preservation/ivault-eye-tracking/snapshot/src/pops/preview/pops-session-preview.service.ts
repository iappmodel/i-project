import { buildLocalSponsoredWatchAggregate } from "../aggregation/pops-local-aggregate-builder";
import type { PopsEvent } from "../types/pops-events.types";
import type { PopsSession } from "../types/pops.types";
import { scorePopsSponsoredWatch } from "../scoring/pops-scoring-model-v1";
import { getPopsPreviewStatus } from "./pops-preview-copy";
import type { PopsSessionPreview, PopsSessionPreviewState } from "./pops-session-preview.types";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function parseStartMs(session: PopsSession): number {
  return Date.parse(session.startedAt);
}

export interface BuildPopsSessionPreviewInput {
  session: PopsSession;
  events: PopsEvent[];
  now?: string;
  isPaused?: boolean;
  isBackgrounded?: boolean;
}

/**
 * Live preview for active sessions only. Uses the same aggregate + scoring path as completion,
 * but must not be treated as a final judgment or wallet intent.
 */
export function buildPopsSessionPreview(input: BuildPopsSessionPreviewInput): PopsSessionPreview {
  const nowIso = input.now ?? new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const startMs = parseStartMs(input.session);
  const elapsedMs = Math.max(0, nowMs - startMs);

  const aggregate = buildLocalSponsoredWatchAggregate({
    session: input.session,
    events: input.events,
    referenceNowMs: nowMs,
  });

  const judgment = scorePopsSponsoredWatch({
    session: input.session,
    aggregate,
  });

  const requiredPct = Math.max(1, input.session.requiredCompletionPct);
  const requiredMs = Math.max(1, input.session.requiredDurationMs);
  const contentRatio = clamp01(aggregate.contentProgressPct / requiredPct);
  const durationRatio = clamp01(aggregate.activeDurationMs / requiredMs);
  const confMid = (judgment.presenceConfidence + judgment.attentionConfidence) / 2;
  const confidenceRatio = clamp01(confMid / 0.75);
  const rewardProgressPct = Math.round(
    100 * Math.min(contentRatio, durationRatio, confidenceRatio),
  );

  let state: PopsSessionPreviewState = "PREVIEW";
  if (input.isPaused) state = "PAUSED";
  else if (input.isBackgrounded) state = "BACKGROUNDED";
  else if (input.session.state === "ACTIVE" || input.session.state === "PAUSED" || input.session.state === "BACKGROUNDED") {
    state = "ACTIVE";
  } else if (input.session.state === "NOT_STARTED") {
    state = "NOT_STARTED";
  }
  if (judgment.fraudRisk >= 0.5) {
    state = "FRAUD_PREVIEW_HIGH";
  }

  const userVisibleStatus =
    input.session.state === "NOT_STARTED"
      ? "P.O.P.S ready"
      : getPopsPreviewStatus({
          rewardProgressPct,
          fraudRiskPreview: judgment.fraudRisk,
          isPaused: Boolean(input.isPaused),
          isBackgrounded: Boolean(input.isBackgrounded),
        });

  return {
    sessionId: input.session.id,
    progressPct: aggregate.contentProgressPct,
    elapsedMs,
    activeMs: aggregate.activeDurationMs,
    presencePreview: judgment.presenceConfidence,
    attentionPreview: judgment.attentionConfidence,
    fraudRiskPreview: judgment.fraudRisk,
    rewardProgressPct,
    state,
    userVisibleStatus,
    reasonCodes: [...judgment.reasonCodes],
    isPreview: true,
  };
}
