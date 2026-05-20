/**
 * Trust engine integration boundary — P.O.P.S emits structured impacts only.
 * Full trust scoring lives outside P.O.P.S (see app trust engine).
 */
export interface PopsTrustImpactEvent {
  userId: string;
  sessionId: string;
  source: "POPS";
  impact: "NONE" | "POSITIVE_LOW" | "POSITIVE_MEDIUM" | "POSITIVE_HIGH" | "NEGATIVE_LOW" | "NEGATIVE_MEDIUM" | "NEGATIVE_HIGH";
  reasonCodes: string[];
  occurredAt: string;
}

export interface PopsTrustIntegration {
  emit(event: PopsTrustImpactEvent): Promise<void>;
}

export class NoopPopsTrustIntegration implements PopsTrustIntegration {
  async emit(_event: PopsTrustImpactEvent): Promise<void> {
    /* wired to event bus / queue in production */
  }
}
