> **Canonical location:** [`integrations/pop-core/contracts/proof-packet-v0/PROOF_PACKET_SCHEMA_V0.md`](../../integrations/pop-core/contracts/proof-packet-v0/PROOF_PACKET_SCHEMA_V0.md)

# Proof Packet Schema v0

**Date:** 2026-05-20  
**Status:** Schema definition — docs + optional Dart types; **no runtime emission yet**  
**Related:** [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md), [`VERIFICATION_STABILITY_LAYER_V1.md`](VERIFICATION_STABILITY_LAYER_V1.md), [`MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md)  
**Optional types:** [`proof_packet_v0.dart`](../../integrations/eye-tracking/flutter-runtime/lib/proof/proof_packet_v0.dart)

---

## 1. Purpose

Proof Packet v0 is the **first concrete contract** between:

| Layer | Role |
|-------|------|
| **Flutter Android runtime** | Aggregates on-device **derived signals** at session end (or on periodic chunk + final seal) |
| **POPS validation** | Scores Proof of Presence, Participation, Perception, Signal, Session Integrity, and Reward Eligibility **after** the interaction |
| **Wallet / ledger UX** | Moves rewards to **pending validation** until review completes |

The packet is **not** instant payout truth. Eye-tracking metrics are one **input section** (`eyeTracking`); touch, playback, foreground, and integrity fields corroborate or contradict perception.

v0 is JSON-first, privacy-preserving, and implementable without backend, cryptography, or raw video storage.

---

## 2. Privacy principle

| Rule | v0 behavior |
|------|-------------|
| **No raw video by default** | Packets must not include frame buffers, thumbnails, or encoded video unless an explicit opt-in dispute path exists (out of v0 scope) |
| **Derived metrics only** | Ratios, windows, event lists, zone labels, confidence bands, timestamps — never pixel streams |
| **Local-first capture** | Aggregation happens on device; transmission/review is a separate step |
| **Minimal identity** | `userId` or `localUserRef` and `deviceId` / `deviceIdHash` are placeholders until auth and attestation ship |

Rejected or escalated sessions store **reason codes** and layer scores, not camera artifacts.

---

## 3. Proof packet lifecycle

```mermaid
sequenceDiagram
  participant User
  participant Runtime as Flutter runtime
  participant Review as POPS review (client stub / platform)
  participant Wallet as Wallet pending state

  User->>Runtime: Start paid interaction (offer loaded)
  Note over Runtime: sessionId assigned; clocks started
  Runtime->>Runtime: Collect derived signals (gaze, touch, playback, foreground)
  User->>Runtime: End watch / complete gates (UI)
  Runtime->>Runtime: Seal Proof Packet v0
  Runtime->>Review: Emit packet (queue / handoff — not wired in v0)
  Review->>Wallet: Mark reward pending validation
  Review->>Review: Score signal sections (async / manual MVP)
  Review->>Wallet: Settlement decision (approved / partial / rejected / escalated)
  Wallet->>User: Status update (pending → final)
```

| Phase | Owner | v0 note |
|-------|--------|---------|
| **Session starts** | Runtime | `startedAt`, `sessionId`, `offerId`, `contentId` set; collectors armed |
| **Signals collected** | Runtime | Rolling windows (e.g. stability layer), dwell/blink events, interaction counters |
| **Packet emitted** | Runtime | Immutable JSON object at session end; **not implemented in runtime yet** |
| **Reward marked pending** | Wallet / demo | User sees provisional earn + **Pending Validation** — not available balance |
| **Packet reviewed** | POPS reviewer | Layer scores + `review.status` updated |
| **Settlement decision made** | Ledger | `review.status` → wallet available / adjusted / zero |

HUD feedback during watch remains **indicative**; authoritative payout follows review.

---

## 4. Required top-level fields

All packets **must** include:

| Field | Type | Description |
|-------|------|-------------|
| `packetVersion` | string | Always `"0"` for this schema |
| `sessionId` | string | UUID or client-generated id unique per watch session |
| `userId` | string \| null | Authenticated user id when known |
| `localUserRef` | string | Placeholder when `userId` absent (demo / offline) |
| `offerId` | string | Campaign / sponsored offer identifier |
| `contentId` | string | Asset or feed item id under watch |
| `deviceId` | string \| null | Platform device id when permitted |
| `deviceIdHash` | string | One-way hash placeholder when raw `deviceId` must not ship |
| `startedAt` | string (ISO-8601 UTC) | Session start |
| `endedAt` | string (ISO-8601 UTC) | Session end / packet seal time |
| `durationMs` | integer | `endedAt - startedAt` in milliseconds |
| `appVersion` | string | Host app build (e.g. `1.0.0+42`) |
| `runtimeVersion` | string | Eye-tracking Flutter runtime package / git describe |

**Convention:** At least one of `userId` or `localUserRef` must be non-empty. At least one of `deviceId` or `deviceIdHash` must be non-empty for integrity checks in later versions.

---

## 5. Signal sections (POPS layers)

Nested object `signals` groups **layer summaries**. Each subsection carries a `score` (0.0–1.0 provisional), optional `confidence`, and `notes` (short machine/human hints). Full automated scoring is later; v0 defines **shape**.

| Key | POPS layer | Typical derived inputs |
|-----|------------|------------------------|
| `presence` | Proof of Presence | Face presence ratio, session duration, blink liveness, foreground |
| `participation` | Proof of Participation | Playback started/completed, taps, scrolls, required duration met |
| `perception` | Proof of Perception | Gaze dwell in content zones, stable gaze windows, attention intervals |
| `signalIntegrity` | Proof of Signal | FPS stability, invalid frame ratio, calibration confidence, timing plausibility |
| `sessionIntegrity` | Proof of Session Integrity | Continuous session, backgrounding, clock skew bounds, packet sequence |
| `rewardEligibility` | Proof of Reward Eligibility | Offer rules satisfied, content completion, anomaly flags |

Example minimal `signals.presence`:

```json
"presence": {
  "score": 0.82,
  "confidence": 0.75,
  "notes": "facePresentRatio=0.91; foregroundRatio=0.88"
}
```

Layers are scored **independently**; composite settlement uses all present sections.

---

## 6. Eye-tracking section (`eyeTracking`)

Derived from Flutter runtime pipelines and [`verification_stability_layer.dart`](../../integrations/eye-tracking/flutter-runtime/lib/verification/verification_stability_layer.dart). **No per-frame arrays** in v0 MVP — use aggregates and event lists.

| Field | Type | Description |
|-------|------|-------------|
| `facePresentRatio` | number | Fraction of windowed samples with valid face / valid frame |
| `stableGazeWindows` | array | `{ startedAtMs, endedAtMs, zone, confidence }` — rolled stable band intervals |
| `dwellEvents` | array | `{ zone, startedAtMs, endedAtMs, satisfied }` — zone dwell milestones |
| `blinkEvents` | array | `{ timestampMs, detected }` — liveness samples (sparse list, not every frame) |
| `verificationStabilitySnapshot` | object | Final (or last) stability layer output — see below |
| `calibrationConfidence` | number | 0.0–1.0 from adaptive calibration profile when available |
| `invalidFrameRatio` | number | Complement of stability `validFrameRatio` or explicit drop ratio |
| `processedFpsAvg` | number | Mean processed FPS over session window |

### `verificationStabilitySnapshot` (embedded)

Maps to `VerificationStabilitySnapshot`:

| Field | Type |
|-------|------|
| `stableZone` | string (`LEFT` \| `CENTER` \| `RIGHT` \| `—`) |
| `confidenceBand` | string (`POOR` \| `WARMING` \| `USABLE` \| `STRONG`) |
| `validFrameRatio` | number |
| `zoneConsistency` | number |
| `dwellReadiness` | number |
| `blinkConfidence` | number |
| `fpsConfidence` | number |
| `reason` | string |
| `sampleCount` | integer |
| `windowMs` | integer |

---

## 7. Interaction section (`interaction`)

App and demo instrumentation — not eye-tracking alone.

| Field | Type | Description |
|-------|------|-------------|
| `taps` | integer | Tap count during earn window |
| `scrolls` | integer | Scroll gestures (feed context) |
| `playbackStarted` | boolean | Media playback began |
| `playbackCompleted` | boolean | Required watch fraction reached |
| `foregroundRatio` | number | Fraction of session in foreground |
| `interactionTiming` | object | `{ firstInteractionMs, lastInteractionMs, cadenceScore }` — human-plausible timing |

---

## 8. Review result (`review`)

Set by reviewer (stub, admin, or future automated engine) **after** packet receipt. Omitted or `pending` at emit time from device.

| Field | Type | Description |
|-------|------|-------------|
| `status` | enum | See statuses below |
| `reviewedAt` | string (ISO-8601) \| null | When decision recorded |
| `reasons` | array of string | Stable reason codes (e.g. `perception.dwell_insufficient`, `integrity.backgrounded`) |
| `layerOutcomes` | object | Optional per-layer `{ presence: "pass", perception: "fail", ... }` |
| `settlementAmount` | number \| null | Final iCoins after partial adjustment |

### Review statuses

| Status | Meaning |
|--------|---------|
| `pending` | Packet received; no decision yet (default after emit) |
| `approved` | Full eligibility confirmed |
| `partial` | Reduced payout; some layers weak |
| `rejected` | Failed policy or fraud thresholds |
| `escalated` | Manual or extended review |

---

## 9. Example JSON packet

```json
{
  "packetVersion": "0",
  "sessionId": "sess_8f3c2a1b-4e5d-6a7b-8c9d-0e1f2a3b4c5d",
  "userId": null,
  "localUserRef": "demo-user-001",
  "offerId": "nike-pegasus-41-watch",
  "contentId": "feed-card-sponsored-12",
  "deviceId": null,
  "deviceIdHash": "sha256:placeholder-device-hash",
  "startedAt": "2026-05-20T18:04:12.000Z",
  "endedAt": "2026-05-20T18:08:42.000Z",
  "durationMs": 270000,
  "appVersion": "0.1.0-mvp",
  "runtimeVersion": "flutter-runtime@archive-promoted",
  "signals": {
    "presence": { "score": 0.85, "confidence": 0.78, "notes": "facePresentRatio=0.91" },
    "participation": { "score": 0.92, "confidence": 0.90, "notes": "playbackCompleted=true" },
    "perception": { "score": 0.74, "confidence": 0.70, "notes": "centerDwellMet=true" },
    "signalIntegrity": { "score": 0.68, "confidence": 0.65, "notes": "band=USABLE" },
    "sessionIntegrity": { "score": 0.88, "confidence": 0.85, "notes": "foregroundRatio=0.94" },
    "rewardEligibility": { "score": 0.80, "confidence": 0.75, "notes": "offerRulesMet=pending_review" }
  },
  "eyeTracking": {
    "facePresentRatio": 0.91,
    "stableGazeWindows": [
      { "startedAtMs": 120400, "endedAtMs": 125800, "zone": "CENTER", "confidence": 0.82 }
    ],
    "dwellEvents": [
      { "zone": "CENTER", "startedAtMs": 118000, "endedAtMs": 126500, "satisfied": true }
    ],
    "blinkEvents": [
      { "timestampMs": 122100, "detected": true },
      { "timestampMs": 124800, "detected": true }
    ],
    "verificationStabilitySnapshot": {
      "stableZone": "CENTER",
      "confidenceBand": "USABLE",
      "validFrameRatio": 0.76,
      "zoneConsistency": 0.81,
      "dwellReadiness": 0.88,
      "blinkConfidence": 0.72,
      "fpsConfidence": 0.65,
      "reason": "usable zone consistency; moderate fps",
      "sampleCount": 48,
      "windowMs": 2000
    },
    "calibrationConfidence": 0.71,
    "invalidFrameRatio": 0.24,
    "processedFpsAvg": 7.8
  },
  "interaction": {
    "taps": 2,
    "scrolls": 0,
    "playbackStarted": true,
    "playbackCompleted": true,
    "foregroundRatio": 0.94,
    "interactionTiming": {
      "firstInteractionMs": 4500,
      "lastInteractionMs": 268000,
      "cadenceScore": 0.85
    }
  },
  "review": {
    "status": "pending",
    "reviewedAt": null,
    "reasons": [],
    "layerOutcomes": null,
    "settlementAmount": null
  }
}
```

---

## 10. MVP version (minimum fields now)

Implementers should be able to emit a **valid minimal packet** without full scoring engine:

| Required | MVP subset |
|----------|------------|
| Top-level | `packetVersion`, `sessionId`, `localUserRef`, `offerId`, `contentId`, `deviceIdHash`, `startedAt`, `endedAt`, `durationMs`, `appVersion`, `runtimeVersion` |
| `signals` | At least `participation.contentCompleted` equivalent via `interaction.playbackCompleted` + one of `presence` or `perception` with `score` |
| `eyeTracking` | `facePresentRatio`, `verificationStabilitySnapshot`, `invalidFrameRatio`, `processedFpsAvg` |
| `interaction` | `playbackCompleted`, `foregroundRatio` |
| `review` | `{ "status": "pending" }` only |

Defer optional arrays (`stableGazeWindows`, `blinkEvents`) until collectors exist; empty arrays are valid.

---

## 11. Later version (out of v0 scope)

| Capability | Purpose |
|------------|---------|
| **Cryptographic signature** | Tamper-evident submission; replay defense |
| **Device attestation** | Stronger Signal + Session Integrity without server-side biometrics |
| **Fraud graph references** | Cross-session / cross-device clustering ids |
| **Advertiser audit trail** | Dispute resolution and CPM reconciliation |
| Chunked packets + sequence numbers | Long sessions, partial upload |
| Automated `signals.*.score` | Weighted layer fusion with campaign-specific rules |

---

## 12. System connections

### Android runtime (`integrations/eye-tracking/flutter-runtime/`)

| Source | Packet mapping |
|--------|----------------|
| Camera / MediaPipe pipeline | `eyeTracking.facePresentRatio`, `invalidFrameRatio`, `processedFpsAvg` |
| Zone / dwell logic | `dwellEvents`, `stableGazeWindows`, `signals.perception` |
| Blink detector | `blinkEvents`, `signals.presence` |
| `VerificationStabilityLayer` | `eyeTracking.verificationStabilitySnapshot` |
| Adaptive calibration | `calibrationConfidence` |
| Session lifecycle in `main.dart` / watch flow | Top-level timestamps, `sessionId` (future wiring) |

Runtime **does not** emit packets in v0; types live in `lib/proof/proof_packet_v0.dart` for contract alignment only.

### React investor demo (`integrations/eye-tracking/demos/investor-demo/`)

| Step | v0 alignment |
|------|----------------|
| Step 4 — Verification | Cosmetic gates become **narrative** stand-in for POPS review; real flow: packet → pending |
| Step 5 — Reward reveal | Show **provisional** earn; copy references validation in flight |
| Step 6 — Wallet | **Pending Validation** tab matches `review.status: pending` |

Demo can mock a packet JSON in presenter mode without Flutter bridge.

### Wallet pending state

| Wallet field | Packet / review link |
|--------------|----------------------|
| Pending balance | Sum of rewards where `review.status === "pending"` |
| Available balance | Approved settlements only |
| Transaction row status | `pending_validation` → `approved` / `partial` / `rejected` |

See `04_wallet_payments/wallet_pending_tab.html` and [`MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md) Step 6.

### POPS architecture

This schema operationalizes [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md):

- Delayed validation (packet → pending → review → settle)
- Multi-signal fusion via `signals` + `eyeTracking` + `interaction`
- Eye-tracking as proof input, not sole truth

**Next engineering step:** Wire session-end aggregation in Flutter to build `ProofPacketV0` and hand off to demo stub / queue — without changing reward settlement in the camera loop.

---

## References

| Artifact | Role |
|----------|------|
| [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md) | Layer definitions and lifecycle |
| [`VERIFICATION_STABILITY_LAYER_V1.md`](VERIFICATION_STABILITY_LAYER_V1.md) | Stability snapshot semantics |
| [`MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md) | Investor demo steps |
| [`proof_packet_v0.dart`](../../integrations/eye-tracking/flutter-runtime/lib/proof/proof_packet_v0.dart) | Optional Dart mirror types |
