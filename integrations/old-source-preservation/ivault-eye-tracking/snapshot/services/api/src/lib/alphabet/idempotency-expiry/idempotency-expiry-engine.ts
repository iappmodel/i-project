import { getIdempotencyExpiryRule } from "@/data/alphabet/idempotency-expiry-rules";
import { ALPHABET_SYSTEM_USER_ID } from "../db-repositories/alphabet-events.repository";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  IdempotencyExpiryEvaluationResult,
  IdempotencyExpiryOutcome,
  IdempotencyExpirySeverity,
  IdempotencyExpirySignalInput,
  IdempotencyExpiryStatus
} from "@/types/alphabet/idempotency-expiry.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function calculateSeverityScore(input: IdempotencyExpirySignalInput): number {
  let score = 0;

  score += input.riskScores.conflictRiskScore * 0.22;
  score += input.riskScores.replayRiskScore * 0.22;
  score += input.riskScores.abuseRiskScore * 0.18;
  score += input.riskScores.financialRiskScore * 0.18;
  score += (1 - input.riskScores.auditPreservationScore) * 0.08;

  score += input.conflictSpike ? 0.14 : 0;
  score += input.replaySpike ? 0.14 : 0;
  score += input.duplicateSpike ? 0.1 : 0;
  score += input.resultMismatch ? 0.16 : 0;
  score += input.missingResult ? 0.08 : 0;
  score += input.moneyScoped ? 0.1 : 0;
  score += input.auditCritical ? 0.08 : 0;

  return clamp(score);
}

function calculateConfidenceScore(input: IdempotencyExpirySignalInput): number {
  let score = input.riskScores.confidenceScore * 0.75;

  score += input.keyMetadata.keyValue ? 0.08 : 0;
  score += input.keyMetadata.scope ? 0.05 : 0;
  score += input.evidence ? 0.05 : 0;
  score += Object.values(input.linkedObjectIds).some(Boolean) ? 0.05 : 0;
  score += input.keyMetadata.lastSeenAt ? 0.02 : 0;

  return clamp(score);
}

function chooseSeverity(params: {
  input: IdempotencyExpirySignalInput;
  severityScore: number;
}): IdempotencyExpirySeverity {
  const rule = getIdempotencyExpiryRule(params.input.expiryType);

  if (!rule) return "danger";

  if (
    params.input.moneyScoped &&
    (params.input.conflictSpike || params.input.replaySpike || params.input.resultMismatch)
  ) {
    return "critical";
  }

  if (params.severityScore >= rule.criticalSeverityScore) return "critical";
  if (params.severityScore >= rule.failSeverityScore) return "danger";
  if (params.severityScore >= rule.warnSeverityScore) return "warning";

  return rule.defaultSeverity;
}

function decideOutcome(params: {
  input: IdempotencyExpirySignalInput;
  severityScore: number;
  confidenceScore: number;
  reasons: string[];
}): IdempotencyExpiryOutcome {
  const rule = getIdempotencyExpiryRule(params.input.expiryType);

  if (!rule) {
    params.reasons.push("idempotency_expiry_no_active_rule");
    return "expiry_skip";
  }

  if (params.confidenceScore < rule.minConfidenceScore) {
    params.reasons.push("idempotency_expiry_confidence_below_minimum");
    return "expiry_skip";
  }

  if (
    params.input.moneyScoped &&
    (params.input.conflictSpike || params.input.replaySpike || params.input.resultMismatch)
  ) {
    params.reasons.push("idempotency_expiry_money_scoped_abuse_or_mismatch");
    return "expiry_critical";
  }

  if (params.severityScore >= rule.criticalSeverityScore) {
    params.reasons.push("idempotency_expiry_critical_severity");
    return "expiry_critical";
  }

  if (params.severityScore >= rule.failSeverityScore) {
    params.reasons.push("idempotency_expiry_fail_severity");
    return "expiry_fail";
  }

  if (params.severityScore >= rule.warnSeverityScore) {
    params.reasons.push("idempotency_expiry_warn_severity");
    return "expiry_warn";
  }

  if (
    params.input.expired &&
    rule.suppressDuplicateExpired &&
    params.input.keyMetadata.keyType === "dedupe"
  ) {
    params.reasons.push("idempotency_expiry_duplicate_suppress");
    return "expiry_suppress";
  }

  if (params.input.expired && rule.archiveSafeExpired && !params.input.auditCritical) {
    params.reasons.push("idempotency_expiry_safe_archive");
    return "expiry_archive";
  }

  if (params.input.expired && rule.suppressDuplicateExpired) {
    params.reasons.push("idempotency_expiry_duplicate_suppress");
    return "expiry_suppress";
  }

  params.reasons.push("idempotency_expiry_pass");
  return "expiry_pass";
}

function dbStatusFromOutcome(status: IdempotencyExpiryOutcome): IdempotencyExpiryStatus {
  if (status === "expiry_pass") return "expiry_passed";
  if (status === "expiry_archive") return "expiry_archived";
  if (status === "expiry_suppress") return "expiry_suppressed";
  if (status === "expiry_warn") return "expiry_warning";
  if (status === "expiry_fail") return "expiry_failed";
  if (status === "expiry_critical") return "expiry_critical";
  return "expiry_skipped";
}

function resolveEventUserId(linkedUserId?: string | null): string {
  return linkedUserId && linkedUserId.length > 0 ? linkedUserId : ALPHABET_SYSTEM_USER_ID;
}

function createExpiryEvent(params: {
  input: IdempotencyExpirySignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: resolveEventUserId(params.input.linkedObjectIds.userId),
    coinCode: "J",
    eventType: params.eventType,
    objectType: "idempotency_dedupe_expiry",
    objectId: params.input.keyMetadata.keyValue ?? params.input.expiryType,
    sourceContext: "idempotency_expiry",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      expiryType: params.input.expiryType,
      expiryScope: params.input.expiryScope,
      keyMetadata: params.input.keyMetadata,
      linkedObjectIds: params.input.linkedObjectIds,
      ...params.metadata,
      ...(params.input.metadata as Record<string, unknown> | undefined)
    },
    createdAt: new Date().toISOString()
  };
}

function eventNames(input: IdempotencyExpirySignalInput) {
  const isDedupe = input.expiryScope === "dedupe";

  return {
    started: isDedupe ? "dedupe_expiry_scan_started" : "idempotency_expiry_scan_started",
    archived: isDedupe ? "dedupe_key_archived" : "idempotency_key_archived",
    suppressed: isDedupe ? "dedupe_key_suppressed" : "idempotency_key_suppressed",
    warning: isDedupe ? "dedupe_expiry_warning" : "idempotency_expiry_warning",
    failed: isDedupe ? "dedupe_expiry_failed" : "idempotency_expiry_failed",
    critical: isDedupe ? "dedupe_expiry_critical" : "idempotency_expiry_critical",
    completed: isDedupe ? "dedupe_expiry_scan_completed" : "idempotency_expiry_scan_completed"
  } as const;
}

export function evaluateIdempotencyExpiry(
  input: IdempotencyExpirySignalInput
): IdempotencyExpiryEvaluationResult {
  const reasons: string[] = [];
  const rule = getIdempotencyExpiryRule(input.expiryType);

  const expirySeverityScore = calculateSeverityScore(input);
  const expiryConfidenceScore = calculateConfidenceScore(input);

  const status = decideOutcome({
    input,
    severityScore: expirySeverityScore,
    confidenceScore: expiryConfidenceScore,
    reasons
  });

  const severity = chooseSeverity({
    input,
    severityScore: expirySeverityScore
  });

  const passed = status === "expiry_pass";
  const archived = status === "expiry_archive";
  const suppressed = status === "expiry_suppress";
  const warning = status === "expiry_warn";
  const failed = status === "expiry_fail";
  const critical = status === "expiry_critical";
  const skipped = status === "expiry_skip";

  const decisions = {
    shouldArchive: archived,
    shouldSuppress: suppressed,
    shouldAlert: Boolean(rule?.createsOperationalAlert) && (failed || critical),
    shouldReview: Boolean(rule?.createsReviewCase) && critical,
    shouldExpireLock: input.lockExpired
  };

  const names = eventNames(input);

  const base = {
    rawScore: expiryConfidenceScore,
    qualityScore: input.riskScores.auditPreservationScore,
    riskScore: expirySeverityScore,
    verificationStatus: passed || archived || suppressed ? ("verified" as const) : ("rejected" as const),
    metadata: {
      status,
      severity,
      reasons,
      decisions
    }
  };

  const startedEvent = createExpiryEvent({
    input,
    eventType: names.started,
    ...base
  });

  const archivedEvent = archived
    ? createExpiryEvent({
        input,
        eventType: names.archived,
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const suppressedEvent = suppressed
    ? createExpiryEvent({
        input,
        eventType: names.suppressed,
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const warningEvent = warning
    ? createExpiryEvent({
        input,
        eventType: names.warning,
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const failedEvent = failed
    ? createExpiryEvent({
        input,
        eventType: names.failed,
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const criticalEvent = critical
    ? createExpiryEvent({
        input,
        eventType: names.critical,
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const completedEvent = createExpiryEvent({
    input,
    eventType: names.completed,
    ...base
  });

  return {
    status,
    dbStatus: dbStatusFromOutcome(status),
    expiryType: input.expiryType,
    expiryScope: input.expiryScope,
    severity,
    expirySeverityScore,
    expiryConfidenceScore,
    passed,
    archived,
    suppressed,
    warning,
    failed,
    critical,
    skipped,
    decisions,
    reasons,
    startedEvent,
    archivedEvent,
    suppressedEvent,
    warningEvent,
    failedEvent,
    criticalEvent,
    completedEvent,
    metadata: {
      ruleExpiryType: rule?.expiryType ?? null,
      ...((input.metadata as Record<string, unknown>) ?? {})
    }
  };
}
