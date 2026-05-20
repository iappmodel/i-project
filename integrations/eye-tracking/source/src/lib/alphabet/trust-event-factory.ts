import type { TrustImpactEvent, TrustImpactEventType } from "@/types/alphabet/trust.types";
import type { Json } from "@/types/alphabet/database.types";

export function createTrustImpactEvent(params: {
  userId: string;
  eventType: TrustImpactEventType;
  category: TrustImpactEvent["category"];
  severity: TrustImpactEvent["severity"];
  sourceEventId: string | null;
  confidence: number;
  metadata?: Json;
}): TrustImpactEvent {
  return {
    userId: params.userId,
    eventType: params.eventType,
    category: params.category,
    severity: params.severity,
    sourceEventId: params.sourceEventId,
    confidence: params.confidence,
    metadata: params.metadata ?? {}
  };
}
