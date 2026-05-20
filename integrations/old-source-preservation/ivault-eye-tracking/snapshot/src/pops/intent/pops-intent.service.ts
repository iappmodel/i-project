import { evaluatePopsIntentSignal } from "./pops-intent-rules";
import type {
  PopsIntentActionType,
  PopsIntentAssessment,
  PopsIntentEvaluationContext,
  PopsIntentSignal
} from "./pops-intent.types";

export interface PopsIntentServiceConfig {
  highIntentThreshold?: number;
  mediumIntentThreshold?: number;
}

export class PopsIntentService {
  private readonly highIntentThreshold: number;
  private readonly mediumIntentThreshold: number;

  constructor(config: PopsIntentServiceConfig = {}) {
    this.highIntentThreshold = config.highIntentThreshold ?? 0.75;
    this.mediumIntentThreshold = config.mediumIntentThreshold ?? 0.45;
  }

  evaluate(
    signal: PopsIntentSignal,
    context: PopsIntentEvaluationContext
  ): PopsIntentAssessment {
    return evaluatePopsIntentSignal(signal, context);
  }

  isHighIntent(intentConfidence: number): boolean {
    return intentConfidence >= this.highIntentThreshold;
  }

  isMediumIntent(intentConfidence: number): boolean {
    return intentConfidence >= this.mediumIntentThreshold;
  }
}

export type CreateIntentSignalInput = Partial<Omit<PopsIntentSignal, "actionType" | "timestampMs">> & {
  actionType: PopsIntentActionType;
  timestampMs?: number;
};

export function createIntentSignal(input: CreateIntentSignalInput): PopsIntentSignal {
  return {
    actionType: input.actionType,
    timestampMs: input.timestampMs ?? Date.now(),
    contentExposureMs: input.contentExposureMs ?? 0,
    dwellBeforeActionMs: input.dwellBeforeActionMs ?? 0,
    tapPrecisionScore: input.tapPrecisionScore ?? 0,
    tapTimingScore: input.tapTimingScore ?? 0,
    touchRhythmScore: input.touchRhythmScore ?? 0,
    hesitationScore: input.hesitationScore ?? 0,
    rageTapScore: input.rageTapScore ?? 0,
    backtrackScore: input.backtrackScore ?? 0,
    repeatActionScore: input.repeatActionScore ?? 0,
    contextMatchScore: input.contextMatchScore ?? 0,
    accidentalActionRisk: input.accidentalActionRisk ?? 0,
    automationRisk: input.automationRisk ?? 0,
    intentConfidence: input.intentConfidence ?? 0
  };
}
