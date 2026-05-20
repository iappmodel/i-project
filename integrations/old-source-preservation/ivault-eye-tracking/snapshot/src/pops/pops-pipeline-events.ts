export const POPS_PIPELINE_EVENT = {
  STARTED: "POPS_PIPELINE_STARTED",
  SESSION_VALIDATED: "POPS_SESSION_VALIDATED",
  SIGNALS_AGGREGATED: "POPS_SIGNALS_AGGREGATED",
  JUDGMENT_CREATED: "POPS_JUDGMENT_CREATED",
  REWARD_DECISION_CREATED: "POPS_REWARD_DECISION_CREATED",
  WALLET_INTENT_CREATED: "POPS_WALLET_INTENT_CREATED",
  TRUST_IMPACT_CREATED: "POPS_TRUST_IMPACT_CREATED",
  PRIVACY_RECEIPT_CREATED: "POPS_PRIVACY_RECEIPT_CREATED",
  ADMIN_REVIEW_CREATED: "POPS_ADMIN_REVIEW_CREATED",
  COMPLETED: "POPS_PIPELINE_COMPLETED",
  FAILED: "POPS_PIPELINE_FAILED",
} as const;

export type PopsPipelineEventName =
  (typeof POPS_PIPELINE_EVENT)[keyof typeof POPS_PIPELINE_EVENT];

export interface PopsPipelineEvent {
  name: PopsPipelineEventName;
  timestampMs: number;
  reasonCodes: string[];
  detail?: Record<string, unknown>;
}

export function createPopsPipelineEvent(
  name: PopsPipelineEventName,
  timestampMs: number,
  reasonCodes: string[],
  detail?: Record<string, unknown>,
): PopsPipelineEvent {
  return {
    name,
    timestampMs,
    reasonCodes,
    detail,
  };
}
