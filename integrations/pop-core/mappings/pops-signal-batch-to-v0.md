# PopsSignalBatch → ProofPacketV0 mapping (PR1)

**Status:** Documentation only — no backend code copied.

## Backend source

`integrations/old-source-preservation/ivault-eye-tracking/snapshot/services/api/src/pops/types/pops.types.ts`

## Field mapping

| PopsSignalBatch.signals | ProofPacketV0 target | PR1 |
|-------------------------|---------------------|-----|
| `visualPresenceScore` | `eyeTracking.facePresentRatio`, `signals.presence` | Runtime emits |
| `appForegrounded` | `interaction.foregroundRatio`, `signals.sessionIntegrity` | Runtime emits |
| `contentProgressPct` | `interaction.playbackCompleted` (derived) | Runtime emits |
| `touchIntentScore` / tap counts | `interaction.taps`, `signals.participation` | Runtime emits |
| `deviceIntegrityScore` | `signals.signalIntegrity` (partial) | Deferred full map |
| `motionStabilityScore` | `signals.signalIntegrity.notes` | Deferred |
| `accountContinuityScore` | — | Deferred |
| `locationClassConfidence` | — | Deferred |

## Privacy block

| PopsSignalBatch.privacy | ProofPacketV0 |
|-------------------------|---------------|
| `localFeatureExtractionUsed: true` | Implied — derived metrics only |
| `rawCameraStored: false` | Required by schema §2 |

## Ingest path (deferred)

`POST /api/pops/sessions/:sessionId/signal-batch` — **not wired in PR1**.

Future PR: accept `ProofPacketV0` JSON or map batch → v0 before scoring service.
