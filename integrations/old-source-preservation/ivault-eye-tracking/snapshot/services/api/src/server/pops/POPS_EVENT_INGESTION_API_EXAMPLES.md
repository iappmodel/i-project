# P.O.P.S Stage 13 API Examples

## Start Session

`POST /api/pops/sessions/start`

```json
{
  "userId": "6e8a7d8a-3286-4ad7-9929-e38850bf8ae3",
  "deviceId": "iphone-15-pro",
  "contentId": "content_901",
  "campaignId": "d0e2f2ee-bf8d-43da-8d63-0e8745092535",
  "sessionType": "BRAND_CAMPAIGN",
  "proofLevel": "LEVEL_2_ATTENTION",
  "clientStartedAt": "2026-04-27T00:00:00.000Z",
  "requiredDurationMs": 30000,
  "clientContext": {
    "appVersion": "2.4.1",
    "platform": "ios"
  },
  "privacyMode": "LOCAL_ONLY"
}
```

## Event Batch

`POST /api/pops/sessions/:sessionId/events`

```json
{
  "events": [
    {
      "eventId": "evt_001",
      "eventType": "CONTENT_PROGRESS",
      "source": "CONTENT",
      "clientTimestampMs": 1777263987000,
      "payload": {
        "progressPct": 43
      },
      "privacyFlags": {
        "containsRawMedia": false
      }
    }
  ]
}
```

## Signal Batch

`POST /api/pops/sessions/:sessionId/signal-batch`

```json
{
  "batchId": "batch_001",
  "clientTimestampMs": 1777263989000,
  "windowStartMs": 1777263987000,
  "windowEndMs": 1777263989000,
  "signals": {
    "screenActiveRatio": 0.82,
    "appForegroundRatio": 0.96,
    "contentProgressDeltaPct": 14.2,
    "touchEventCount": 12,
    "scrollDistance": 342,
    "averageScrollVelocity": 58.1,
    "tapCount": 3,
    "motionStabilityScore": 0.91,
    "visualPresenceScore": 0.78,
    "visualQualityScore": 0.84,
    "audioDistractionScore": 0.07,
    "deviceIntegrityScore": 0.94,
    "accountContinuityScore": 0.93,
    "locationClassConfidence": 0.71
  },
  "privacy": {
    "rawCameraStored": false,
    "rawAudioStored": false,
    "rawLocationStored": false,
    "localFeatureExtractionUsed": true
  }
}
```
