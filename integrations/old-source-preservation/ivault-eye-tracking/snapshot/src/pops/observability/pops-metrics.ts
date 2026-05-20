export const POPS_METRIC_NAMES = [
  "pops.sessions.started",
  "pops.sessions.completed",
  "pops.sessions.closed",
  "pops.sessions.abandoned",
  "pops.sessions.degraded",
  "pops.sessions.failed",
  "pops.events.received",
  "pops.events.rejected",
  "pops.events.deduplicated",
  "pops.events.late_arrival",
  "pops.signal_batches.received",
  "pops.signal_batches.rejected",
  "pops.judgments.created",
  "pops.presence_confidence.avg",
  "pops.attention_confidence.avg",
  "pops.intent_confidence.avg",
  "pops.continuity_confidence.avg",
  "pops.fraud_risk.avg",
  "pops.reason_code.count",
  "pops.rewards.approved_full",
  "pops.rewards.approved_partial",
  "pops.rewards.pending_review",
  "pops.rewards.held",
  "pops.rewards.denied",
  "pops.rewards.final_amount.total",
  "pops.rewards.hold_rate",
  "pops.rewards.denial_rate",
  "pops.wallet_intents.created",
  "pops.wallet_intents.released",
  "pops.wallet_intents.held",
  "pops.wallet_intents.denied",
  "pops.wallet_release_latency.avg",
  "pops.privacy_receipts.created",
  "pops.privacy_receipts.failed",
  "pops.raw_camera_stored.count",
  "pops.raw_audio_stored.count",
  "pops.local_processing.used_rate",
  "pops.fraud.background_progress.count",
  "pops.fraud.impossible_completion.count",
  "pops.fraud.automation_timing.count",
  "pops.fraud.device_integrity_warning.count",
  "pops.fraud.duplicate_reward.count",
  "pops.fraud.high_risk_sessions.count",
  "pops.permission_decline_rate",
  "pops.visual_presence_degraded_rate",
  "pops.session_dropoff_rate",
  "pops.reward_dispute_rate",
  "pops.reward_hold_appeal_rate",
] as const;

export type PopsMetricName = (typeof POPS_METRIC_NAMES)[number];

export type PopsMetricTagValue = string | number | boolean;
export type PopsMetricTags = Record<string, PopsMetricTagValue>;

export interface PopsMetricSample {
  name: PopsMetricName;
  value: number;
  tags?: PopsMetricTags;
  timestampMs: number;
}

export interface PopsMetricAggregate {
  name: PopsMetricName;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  lastValue: number;
  lastTimestampMs: number;
}

function keyForTags(name: PopsMetricName, tags?: PopsMetricTags): string {
  if (!tags || Object.keys(tags).length === 0) {
    return name;
  }
  const sorted = Object.keys(tags)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${key}:${String(tags[key])}`);
  return `${name}|${sorted.join("|")}`;
}

export class PopsMetricsCollector {
  private readonly samples: PopsMetricSample[] = [];
  private readonly aggregates = new Map<string, PopsMetricAggregate>();

  record(name: PopsMetricName, value = 1, tags?: PopsMetricTags, timestampMs = Date.now()): void {
    if (!Number.isFinite(value)) return;

    this.samples.push({ name, value, tags, timestampMs });
    const key = keyForTags(name, tags);
    const existing = this.aggregates.get(key);

    if (!existing) {
      this.aggregates.set(key, {
        name,
        count: 1,
        sum: value,
        min: value,
        max: value,
        avg: value,
        lastValue: value,
        lastTimestampMs: timestampMs,
      });
      return;
    }

    existing.count += 1;
    existing.sum += value;
    existing.min = Math.min(existing.min, value);
    existing.max = Math.max(existing.max, value);
    existing.avg = existing.sum / existing.count;
    existing.lastValue = value;
    existing.lastTimestampMs = timestampMs;
  }

  increment(name: PopsMetricName, tags?: PopsMetricTags): void {
    this.record(name, 1, tags);
  }

  recordAverage(name: PopsMetricName, value: number, tags?: PopsMetricTags): void {
    this.record(name, value, tags);
  }

  getSamples(): readonly PopsMetricSample[] {
    return this.samples;
  }

  getAggregates(): readonly PopsMetricAggregate[] {
    return Array.from(this.aggregates.values());
  }
}

export interface PopsRateInput {
  numerator: number;
  denominator: number;
}

export function safeRate(input: PopsRateInput): number {
  if (input.denominator <= 0) return 0;
  if (!Number.isFinite(input.numerator) || !Number.isFinite(input.denominator)) return 0;
  return input.numerator / input.denominator;
}

export function recordReasonCodeMetrics(
  collector: PopsMetricsCollector,
  reasonCodes: readonly string[],
  extraTags?: PopsMetricTags,
): void {
  for (const reasonCode of reasonCodes) {
    collector.increment("pops.reason_code.count", {
      reasonCode,
      ...(extraTags ?? {}),
    });
  }
}
