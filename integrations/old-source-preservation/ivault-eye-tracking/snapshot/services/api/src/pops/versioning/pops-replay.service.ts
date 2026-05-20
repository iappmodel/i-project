import { PopsDecisionService } from "../services/pops-decision.service";
import { PopsScoringService } from "../services/pops-scoring.service";
import type { PopsDecisionInput } from "../types/pops-decisions.types";
import type { PopsEvent } from "../types/pops-events.types";
import type { PopsProofLevel, PopsSessionState, PopsSignalBatch } from "../types/pops.types";
import { POPS_PROOF_LEVEL, POPS_SESSION_STATE } from "../types/pops.types";
import type {
  PopsJudgmentReplayRecord,
  PopsJudgmentReplayRepository,
  PopsReplayDifferenceSummary,
  PopsReplayJudgmentInput,
  PopsReplayOutput,
  PopsVersionBundle
} from "./pops-version.types";

export interface PopsReplayDataStore {
  loadEvents(sessionId: string): Promise<PopsEvent[]>;
  loadSignalBatches(sessionId: string): Promise<PopsSignalBatch[]>;
}

export interface PopsReplayServiceOptions {
  dataStore: PopsReplayDataStore;
  replayRepository?: PopsJudgmentReplayRepository | null;
  scoringService?: PopsScoringService;
  decisionService?: PopsDecisionService;
}

function isoNow(): string {
  return new Date().toISOString();
}

function newReplayId(): string {
  const uuid =
    typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `pops_judgment_replay_${uuid}`;
}

function pickLatestBatch(batches: PopsSignalBatch[]): PopsSignalBatch | null {
  if (batches.length === 0) return null;
  return [...batches].sort((a, b) => b.timestampMs - a.timestampMs)[0] ?? null;
}

function summarizeDifferences(
  original: Record<string, unknown> | null | undefined,
  preview: Record<string, unknown>
): PopsReplayDifferenceSummary | null {
  if (!original) return null;
  const changedKeys: string[] = [];
  const keys = new Set([...Object.keys(original), ...Object.keys(preview)]);
  for (const key of keys) {
    const a = original[key];
    const b = preview[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changedKeys.push(key);
    }
  }
  return {
    changedKeys,
    notes:
      changedKeys.length === 0
        ? ["Replay output matches original on compared keys."]
        : ["Replay differs from stored judgment on one or more fields — review before any admin override."]
  };
}

function coerceProofLevel(value: string): PopsProofLevel {
  const allowed = new Set<string>(Object.values(POPS_PROOF_LEVEL));
  return (allowed.has(value) ? value : POPS_PROOF_LEVEL.LEVEL_1_SESSION) as PopsProofLevel;
}

function coerceSessionState(value: string): PopsSessionState {
  const allowed = new Set<string>(Object.values(POPS_SESSION_STATE));
  return (allowed.has(value) ? value : POPS_SESSION_STATE.DETECTING) as PopsSessionState;
}

/**
 * Replays P.O.P.S judgment logic from persisted events + signal batches only.
 * Does not mutate stored judgments; persists an append-only replay row when a repository is wired.
 */
export class PopsReplayService {
  private readonly dataStore: PopsReplayDataStore;
  private readonly replayRepository: PopsJudgmentReplayRepository | null;
  private readonly scoring: PopsScoringService;
  private readonly decisions: PopsDecisionService;

  constructor(options: PopsReplayServiceOptions) {
    this.dataStore = options.dataStore;
    this.replayRepository = options.replayRepository ?? null;
    this.scoring = options.scoringService ?? new PopsScoringService();
    this.decisions = options.decisionService ?? new PopsDecisionService();
  }

  async replayJudgment(sessionId: string, versionBundle: PopsVersionBundle, input?: Partial<PopsReplayJudgmentInput>): Promise<PopsJudgmentReplayRecord> {
    const events = await this.dataStore.loadEvents(sessionId);
    const batches = await this.dataStore.loadSignalBatches(sessionId);
    const batch = pickLatestBatch(batches);
    if (!batch) {
      throw new Error(`pops replay: no signal batches for session ${sessionId}`);
    }

    const merged: PopsReplayJudgmentInput = {
      sessionId,
      versionBundle,
      requestedBy: input?.requestedBy ?? "system",
      originalJudgmentId: input?.originalJudgmentId ?? null,
      originalJudgment: input?.originalJudgment ?? null,
      sessionContext: input?.sessionContext ?? {
        userId: batch.userId,
        proofLevel: POPS_PROOF_LEVEL.LEVEL_1_SESSION,
        state: POPS_SESSION_STATE.DETECTING
      }
    };

    const scoringResult = this.scoring.score(batch);
    const proofLevel = coerceProofLevel(String(merged.sessionContext.proofLevel));
    const state = coerceSessionState(String(merged.sessionContext.state));

    const decisionInput: PopsDecisionInput = {
      sessionId,
      userId: merged.sessionContext.userId,
      proofLevel,
      state,
      presenceConfidence: scoringResult.presenceConfidence,
      attentionConfidence: scoringResult.attentionConfidence,
      intentConfidence: scoringResult.intentConfidence,
      continuityConfidence: scoringResult.continuityConfidence,
      fraudRisk: scoringResult.fraudRisk,
      reasonCodes: [...scoringResult.reasonCodes]
    };

    const rewardDecision = this.decisions.evaluate(decisionInput);
    const judgment = this.decisions.toJudgment(decisionInput, rewardDecision);

    const judgmentPreview: Record<string, unknown> = { ...judgment, versionBundle };

    const replayOutput: PopsReplayOutput = {
      sessionId,
      versionBundle,
      scoringResult: { ...scoringResult },
      judgmentPreview,
      eventCount: events.length,
      signalBatchCount: batches.length,
      replayedAt: isoNow()
    };

    const differenceSummary = summarizeDifferences(merged.originalJudgment ?? null, judgmentPreview);

    const record: PopsJudgmentReplayRecord = {
      id: newReplayId(),
      originalJudgmentId: merged.originalJudgmentId ?? null,
      sessionId,
      requestedBy: merged.requestedBy,
      versionBundle,
      replayOutput,
      differenceSummary,
      createdAt: isoNow()
    };

    if (this.replayRepository) {
      await this.replayRepository.save(record);
    }

    return record;
  }
}

export async function replayJudgment(
  sessionId: string,
  versionBundle: PopsVersionBundle,
  deps: PopsReplayServiceOptions,
  input?: Partial<PopsReplayJudgmentInput>
): Promise<PopsJudgmentReplayRecord> {
  const service = new PopsReplayService(deps);
  return service.replayJudgment(sessionId, versionBundle, input);
}
