import type { StuckSagaRuleSet } from "@/types/alphabet/stuck-saga.types";

export const STUCK_SAGA_RULES: StuckSagaRuleSet[] = [
  {
    stuckType: "saga_started_no_progress",
    defaultSeverity: "warning",
    createsOperationalAlert: true,
    createsReviewCase: false,
    maxAgeSeconds: 30 * 60,
    maxStaleSeconds: 15 * 60,
    minConfidenceScore: 0.7,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.55,
    criticalSeverityScore: 0.85,
    active: true
  },
  {
    stuckType: "saga_running_too_long",
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: false,
    maxAgeSeconds: 60 * 60,
    maxStaleSeconds: 30 * 60,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.8,
    active: true
  },
  {
    stuckType: "saga_partial_failure",
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: true,
    maxAgeSeconds: 60 * 60,
    maxStaleSeconds: 20 * 60,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.8,
    active: true
  },
  {
    stuckType: "saga_child_execution_failed",
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: true,
    maxAgeSeconds: 60 * 60,
    maxStaleSeconds: 20 * 60,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.8,
    active: true
  },
  {
    stuckType: "saga_child_execution_dead_lettered",
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    maxAgeSeconds: 30 * 60,
    maxStaleSeconds: 10 * 60,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.7,
    active: true
  },
  {
    stuckType: "saga_money_debited_no_completion",
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    maxAgeSeconds: 20 * 60,
    maxStaleSeconds: 10 * 60,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.7,
    active: true
  },
  {
    stuckType: "saga_external_transfer_created_no_polling",
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: true,
    maxAgeSeconds: 30 * 60,
    maxStaleSeconds: 15 * 60,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.8,
    active: true
  },
  {
    stuckType: "pipeline_locked_too_long",
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: false,
    maxAgeSeconds: 30 * 60,
    maxStaleSeconds: 15 * 60,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.8,
    active: true
  },
  {
    stuckType: "pipeline_running_too_long",
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: false,
    maxAgeSeconds: 45 * 60,
    maxStaleSeconds: 20 * 60,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.8,
    active: true
  },
  {
    stuckType: "execution_running_too_long",
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: true,
    maxAgeSeconds: 20 * 60,
    maxStaleSeconds: 10 * 60,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.8,
    active: true
  },
  {
    stuckType: "execution_retry_exhausted",
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    maxAgeSeconds: 0,
    maxStaleSeconds: 0,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.7,
    active: true
  },
  {
    stuckType: "execution_dead_lettered_unreviewed",
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    maxAgeSeconds: 0,
    maxStaleSeconds: 0,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.7,
    active: true
  },
  {
    stuckType: "execution_money_mutation_uncertain",
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    maxAgeSeconds: 10 * 60,
    maxStaleSeconds: 5 * 60,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.7,
    active: true
  },
  {
    stuckType: "provider_polling_missing_after_transfer",
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: true,
    maxAgeSeconds: 30 * 60,
    maxStaleSeconds: 15 * 60,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.8,
    active: true
  },
  {
    stuckType: "orphan_execution_request",
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: false,
    maxAgeSeconds: 60 * 60,
    maxStaleSeconds: 30 * 60,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.85,
    active: true
  },
  {
    stuckType: "orphan_external_transfer",
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    maxAgeSeconds: 30 * 60,
    maxStaleSeconds: 15 * 60,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.7,
    active: true
  }
];

export function getStuckSagaRule(stuckType: string): StuckSagaRuleSet | null {
  return (
    STUCK_SAGA_RULES.find(
      (rule) => rule.active && rule.stuckType === stuckType
    ) ?? null
  );
}
