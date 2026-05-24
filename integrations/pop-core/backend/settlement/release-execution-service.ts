import type { PendingHoldRecord } from "./pending-hold.js";
import {
  collectReleaseEligibilityReasons,
  type PendingHoldReleaseEligibilityReason
} from "./pending-hold-release-eligibility.js";
import {
  projectPendingHoldReleaseTransition,
  releaseApprovedEvent,
  releaseCompletedEvent
} from "./pending-hold-release-lifecycle.js";
import type { PendingHoldReleaseState } from "./pending-hold-release-lifecycle.types.js";
import { PendingHoldReleaseStateMachine } from "./pending-hold-release-state-machine.js";
import {
  buildReleaseExecutionRecord,
  deriveReleaseExecutionRef,
  releaseStateFromExecutionRecord,
  type ReleaseExecutionRecord
} from "./release-execution.js";
import {
  InMemoryReleaseExecutionStore,
  type ReleaseExecutionStore
} from "./release-execution-store.js";

export type ExecutePendingHoldReleaseOutcome = "executed" | "existing" | "skipped";

export type ReleaseExecutionSkipReason = PendingHoldReleaseEligibilityReason;

export interface ExecutePendingHoldReleaseResult {
  outcome: ExecutePendingHoldReleaseOutcome;
  sessionId: string;
  execution?: ReleaseExecutionRecord;
  releaseState?: PendingHoldReleaseState;
  skipReason?: ReleaseExecutionSkipReason;
}

export interface ExecutePendingHoldReleaseOptions {
  store?: ReleaseExecutionStore;
  executedAt?: string;
  occurredAt?: string;
  approverRef?: string;
  reasonCodes?: string[];
}

export function executePendingHoldRelease(
  hold: PendingHoldRecord,
  options?: ExecutePendingHoldReleaseOptions
): ExecutePendingHoldReleaseResult {
  const store = options?.store ?? new InMemoryReleaseExecutionStore();
  const sessionId = hold.sessionId;

  const existing = store.getBySessionId(sessionId);
  if (existing) {
    return {
      outcome: "existing",
      sessionId,
      execution: existing,
      releaseState: releaseStateFromExecutionRecord(existing)
    };
  }

  const eligibilityReasons = collectReleaseEligibilityReasons(hold);
  if (eligibilityReasons.length > 0) {
    return {
      outcome: "skipped",
      sessionId,
      skipReason: eligibilityReasons[0]
    };
  }

  const occurredAt = options?.occurredAt ?? options?.executedAt ?? new Date().toISOString();
  const executedAt = options?.executedAt ?? occurredAt;

  const initialState = {
    releaseStatus: PendingHoldReleaseStateMachine.initialReleaseStatus(),
    releaseLifecycleEvents: []
  };

  const approvedEvent = releaseApprovedEvent(sessionId, {
    occurredAt,
    approverRef: options?.approverRef,
    reasonCodes: options?.reasonCodes
  });
  const readyState = projectPendingHoldReleaseTransition(initialState, hold, approvedEvent);

  const executionRef = deriveReleaseExecutionRef(hold);
  const completedEvent = releaseCompletedEvent(sessionId, executionRef, {
    occurredAt,
    reasonCodes: options?.reasonCodes
  });
  const releasedState = projectPendingHoldReleaseTransition(readyState, hold, completedEvent);

  const execution = buildReleaseExecutionRecord({
    hold,
    executionRef,
    releaseLifecycleEvents: releasedState.releaseLifecycleEvents,
    executedAt
  });

  store.save(execution);

  return {
    outcome: "executed",
    sessionId,
    execution,
    releaseState: releasedState
  };
}

export class ReleaseExecutionService {
  constructor(
    private readonly store: ReleaseExecutionStore = new InMemoryReleaseExecutionStore()
  ) {}

  executePendingHoldRelease(
    hold: PendingHoldRecord,
    options?: Omit<ExecutePendingHoldReleaseOptions, "store">
  ): ExecutePendingHoldReleaseResult {
    return executePendingHoldRelease(hold, { ...options, store: this.store });
  }

  getExecutionBySessionId(sessionId: string): ReleaseExecutionRecord | null {
    return this.store.getBySessionId(sessionId);
  }
}
