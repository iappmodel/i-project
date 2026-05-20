import { z } from "zod";
import { POPS_EVENT_TYPE } from "../../../pops/types/pops-events.types";
import { POPS_SIGNAL_SOURCE } from "../../../pops/types/pops.types";

const eventTypes = Object.values(POPS_EVENT_TYPE) as [string, ...string[]];
const eventSources = Object.values(POPS_SIGNAL_SOURCE) as [string, ...string[]];

const ratio = z.number().min(0).max(1);
const boundedNumber = z.number().min(0).max(1_000_000_000);

export const popsEventsIngestSchema = z.object({
  events: z
    .array(
      z.object({
        eventId: z.string().min(6).max(128),
        eventType: z.enum(eventTypes),
        source: z.enum(eventSources),
        clientTimestampMs: z.number().int().min(0),
        payload: z.record(z.unknown()).default({}),
        privacyFlags: z.record(z.unknown()).default({})
      })
    )
    .min(1)
    .max(200)
});

export const popsSignalBatchSchema = z.object({
  batchId: z.string().min(6).max(128),
  clientTimestampMs: z.number().int().min(0),
  windowStartMs: z.number().int().min(0),
  windowEndMs: z.number().int().min(0),
  signals: z.object({
    screenActiveRatio: ratio,
    appForegroundRatio: ratio,
    contentProgressDeltaPct: z.number().min(0).max(100),
    touchEventCount: z.number().int().min(0).max(100_000),
    scrollDistance: boundedNumber,
    averageScrollVelocity: boundedNumber,
    tapCount: z.number().int().min(0).max(100_000),
    motionStabilityScore: ratio,
    visualPresenceScore: ratio,
    visualQualityScore: ratio,
    audioDistractionScore: ratio,
    deviceIntegrityScore: ratio,
    accountContinuityScore: ratio,
    locationClassConfidence: ratio
  }),
  privacy: z.object({
    rawCameraStored: z.boolean(),
    rawAudioStored: z.boolean(),
    rawLocationStored: z.boolean(),
    localFeatureExtractionUsed: z.boolean()
  })
});
