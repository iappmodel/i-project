import type { UValueImpactEvent, UValueImpactEventType } from "@/types/alphabet/u-value.types";
import type { Json } from "@/types/alphabet/database.types";

export function createUValueImpactEvent(params: {
  userId: string;
  eventType: UValueImpactEventType;
  category: UValueImpactEvent["category"];
  severity: UValueImpactEvent["severity"];
  coinCode: string;
  sourceEventId: string | null;
  confidence: number;
  metadata?: Json;
}): UValueImpactEvent {
  return {
    userId: params.userId,
    eventType: params.eventType,
    category: params.category,
    severity: params.severity,
    coinCode: params.coinCode,
    sourceEventId: params.sourceEventId,
    confidence: params.confidence,
    metadata: params.metadata ?? {}
  };
}
