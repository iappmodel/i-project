/**
 * Redacts P.O.P.S payloads for post-retention anonymization while preserving
 * aggregate-safe fields where possible.
 */

const REDACTED = "[REDACTED]";

export interface PopsEventLike {
  readonly id: string;
  readonly payload: Record<string, unknown>;
  readonly privacy_flags?: Record<string, unknown> | null;
}

export interface PopsSignalBatchLike {
  readonly id: string;
  readonly raw_payload?: Record<string, unknown> | null;
  readonly privacy?: Record<string, unknown> | null;
}

export interface PopsSessionMetadataLike {
  readonly id: string;
  readonly client_context?: Record<string, unknown> | null;
  readonly metadata?: Record<string, unknown> | null;
}

function redactObjectShallow(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("email") ||
      lower.includes("phone") ||
      lower.includes("name") ||
      lower.includes("address") ||
      lower.includes("gps") ||
      lower.includes("lat") ||
      lower.includes("lon") ||
      lower.includes("device_token")
    ) {
      out[key] = REDACTED;
    } else {
      out[key] = input[key];
    }
  }
  return out;
}

export class PopsAnonymizationService {
  anonymizeEventPayload<T extends PopsEventLike>(event: T): T {
    return {
      ...event,
      payload: redactObjectShallow({ ...event.payload }),
      privacy_flags: event.privacy_flags
        ? redactObjectShallow({ ...event.privacy_flags })
        : event.privacy_flags
    };
  }

  clearSignalBatchRawPayload<T extends PopsSignalBatchLike>(batch: T): T {
    return {
      ...batch,
      raw_payload: null,
      privacy: batch.privacy ? redactObjectShallow({ ...batch.privacy }) : batch.privacy
    };
  }

  anonymizeSessionMetadata<T extends PopsSessionMetadataLike>(session: T): T {
    return {
      ...session,
      client_context: session.client_context
        ? redactObjectShallow({ ...session.client_context })
        : session.client_context,
      metadata: session.metadata ? redactObjectShallow({ ...session.metadata }) : session.metadata
    };
  }
}
