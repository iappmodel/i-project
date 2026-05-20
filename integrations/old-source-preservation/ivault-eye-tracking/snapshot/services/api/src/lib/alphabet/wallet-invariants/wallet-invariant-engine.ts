import { getWalletInvariantRule } from "@/data/alphabet/wallet-invariant-rules";
import { ALPHABET_SYSTEM_USER_ID } from "../db-repositories/alphabet-events.repository";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  WalletInvariantEvaluationResult,
  WalletInvariantSeverity,
  WalletInvariantSignalInput,
  WalletInvariantStatus
} from "@/types/alphabet/wallet-invariant.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function abs(value?: number | null): number {
  return Math.abs(value ?? 0);
}

function maxDelta(input: WalletInvariantSignalInput): number {
  const b = input.balances;
  return Math.max(
    abs(b.availableDelta),
    abs(b.pendingDelta),
    abs(b.reservedDelta),
    abs(b.totalDelta)
  );
}

function calculateSeverityScore(input: WalletInvariantSignalInput): number {
  let score = 0;

  score += input.riskScores.financialImpactScore * 0.28;
  score += input.riskScores.userImpactScore * 0.16;
  score += input.riskScores.exploitabilityScore * 0.16;
  score += input.riskScores.recurrenceRiskScore * 0.12;
  score += input.riskScores.repairComplexityScore * 0.12;

  score += input.moneyMovementAffected ? 0.12 : 0;
  score += input.externalProviderAffected ? 0.1 : 0;
  score += input.negativeBalanceDetected ? 0.14 : 0;
  score += input.mismatchDetected ? 0.1 : 0;

  const delta = maxDelta(input);
  if (delta > 1000) score += 0.16;
  else if (delta > 100) score += 0.1;
  else if (delta > 1) score += 0.05;

  return clamp(score);
}

function evidenceIsNonEmpty(evidence: unknown): boolean {
  if (evidence === null || evidence === undefined) return false;
  if (typeof evidence !== "object" || Array.isArray(evidence)) return Boolean(evidence);
  return Object.keys(evidence as Record<string, unknown>).length > 0;
}

function calculateConfidenceScore(input: WalletInvariantSignalInput): number {
  let score = input.riskScores.confidenceScore * 0.75;

  score += evidenceIsNonEmpty(input.evidence) ? 0.1 : 0;
  score += Object.values(input.linkedObjectIds).some(Boolean) ? 0.1 : 0;
  score += input.sourceEventIds.length > 0 ? 0.05 : 0;

  return clamp(score);
}

function chooseSeverity(params: {
  input: WalletInvariantSignalInput;
  severityScore: number;
}): WalletInvariantSeverity {
  const rule = getWalletInvariantRule(params.input.invariantType);

  if (!rule) return "danger";

  if (params.input.negativeBalanceDetected && !params.input.allowNegative) {
    return "critical";
  }

  if (
    params.input.invariantType === "external_transfer_without_debit" ||
    params.input.invariantType === "external_transfer_amount_mismatch" ||
    params.input.invariantType === "reversal_without_original" ||
    params.input.invariantType === "compensation_without_reversal_ledger"
  ) {
    return "critical";
  }

  if (params.severityScore >= rule.criticalSeverityScore) return "critical";
  if (params.severityScore >= rule.failSeverityScore) return "danger";
  if (params.severityScore >= rule.warnSeverityScore) return "warning";

  return rule.defaultSeverity;
}

function decideOutcome(params: {
  input: WalletInvariantSignalInput;
  severityScore: number;
  confidenceScore: number;
  reasons: string[];
}): WalletInvariantEvaluationResult["status"] {
  const rule = getWalletInvariantRule(params.input.invariantType);

  if (!rule) {
    params.reasons.push("wallet_invariant_no_active_rule");
    return "invariant_skip";
  }

  if (params.confidenceScore < rule.minConfidenceScore) {
    params.reasons.push("wallet_invariant_confidence_below_minimum");
    return "invariant_skip";
  }

  if (params.input.negativeBalanceDetected && !params.input.allowNegative) {
    params.reasons.push("wallet_invariant_negative_balance_detected");
    return "invariant_critical";
  }

  if (maxDelta(params.input) > rule.epsilon) {
    params.reasons.push("wallet_invariant_delta_exceeds_epsilon");

    if (params.severityScore >= rule.criticalSeverityScore) {
      return "invariant_critical";
    }

    if (params.severityScore >= rule.failSeverityScore) {
      return "invariant_fail";
    }

    return "invariant_warn";
  }

  if (params.input.mismatchDetected) {
    params.reasons.push("wallet_invariant_mismatch_detected");

    if (params.severityScore >= rule.criticalSeverityScore) {
      return "invariant_critical";
    }

    return "invariant_fail";
  }

  params.reasons.push("wallet_invariant_passed");
  return "invariant_pass";
}

function dbStatusFromOutcome(status: WalletInvariantEvaluationResult["status"]): WalletInvariantStatus {
  if (status === "invariant_pass") return "invariant_passed";
  if (status === "invariant_warn") return "invariant_warning";
  if (status === "invariant_skip") return "invariant_skipped";
  return "invariant_failed";
}

function createInvariantEvent(params: {
  input: WalletInvariantSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.linkedObjectIds.userId ?? ALPHABET_SYSTEM_USER_ID,
    coinCode: "J",
    eventType: params.eventType,
    objectType: "wallet_invariant",
    objectId:
      params.input.linkedObjectIds.walletAccountId ??
      params.input.linkedObjectIds.walletId ??
      params.input.linkedObjectIds.ledgerEntryId ??
      params.input.invariantType,
    sourceContext: "wallet_invariant",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      invariantType: params.input.invariantType,
      scanScope: params.input.scanScope,
      linkedObjectIds: params.input.linkedObjectIds,
      balances: params.input.balances,
      ...params.metadata,
      ...(params.input.metadata as Record<string, unknown> | undefined)
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateWalletInvariant(input: WalletInvariantSignalInput): WalletInvariantEvaluationResult {
  const reasons: string[] = [];
  const rule = getWalletInvariantRule(input.invariantType);

  const invariantSeverityScore = calculateSeverityScore(input);
  const invariantConfidenceScore = calculateConfidenceScore(input);

  const status = decideOutcome({
    input,
    severityScore: invariantSeverityScore,
    confidenceScore: invariantConfidenceScore,
    reasons
  });

  const severity = chooseSeverity({
    input,
    severityScore: invariantSeverityScore
  });

  const passed = status === "invariant_pass";
  const warning = status === "invariant_warn";
  const failed = status === "invariant_fail";
  const critical = status === "invariant_critical";
  const skipped = status === "invariant_skip";

  const shouldCreateOperationalAlert =
    Boolean(rule?.createsOperationalAlert) && (failed || critical);

  const shouldCreateReviewCase = Boolean(rule?.createsReviewCase) && critical;

  const verificationStatus: AlphabetEvent["verificationStatus"] = passed
    ? "verified"
    : "rejected";

  const base = {
    rawScore: invariantConfidenceScore,
    qualityScore: 1 - invariantSeverityScore,
    riskScore: invariantSeverityScore,
    verificationStatus,
    metadata: { status, severity, reasons }
  };

  const walletInvariantScanStartedEvent = createInvariantEvent({
    input,
    eventType: "wallet_invariant_scan_started",
    ...base
  });

  const walletInvariantPassedEvent = passed
    ? createInvariantEvent({
        input,
        eventType: "wallet_invariant_passed",
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const walletInvariantWarningEvent = warning
    ? createInvariantEvent({
        input,
        eventType: "wallet_invariant_warning",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const walletInvariantFailedEvent = failed
    ? createInvariantEvent({
        input,
        eventType: "wallet_invariant_failed",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const walletInvariantCriticalEvent = critical
    ? createInvariantEvent({
        input,
        eventType: "wallet_invariant_critical",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const walletInvariantScanCompletedEvent = createInvariantEvent({
    input,
    eventType: "wallet_invariant_scan_completed",
    ...base
  });

  return {
    status,
    invariantType: input.invariantType,
    scanScope: input.scanScope,
    severity,
    dbStatus: dbStatusFromOutcome(status),
    invariantSeverityScore,
    invariantConfidenceScore,
    passed,
    warning,
    failed,
    critical,
    skipped,
    shouldCreateOperationalAlert,
    shouldCreateReviewCase,
    reasons,
    walletInvariantScanStartedEvent,
    walletInvariantPassedEvent,
    walletInvariantWarningEvent,
    walletInvariantFailedEvent,
    walletInvariantCriticalEvent,
    walletInvariantScanCompletedEvent,
    metadata: {
      ruleInvariantType: rule?.invariantType ?? null,
      ...((input.metadata as Record<string, unknown>) ?? {})
    }
  };
}
