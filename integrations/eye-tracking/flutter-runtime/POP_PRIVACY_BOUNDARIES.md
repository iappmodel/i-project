# POP Privacy Boundaries (Stage 9)

**Enforced in code as of POP finish plan implementation.**

## Must NEVER leave device

- Raw camera frames / YUV buffers (except transient native decode)
- Full face mesh landmark lists (release builds omit via `VisionProcessor.includeFullLandmarks`)
- Raw EAR geometry / biometric templates
- Continuous raw gaze stream

## May leave device (derived only)

- `ProofPacketV0` JSON: session ids, dwell windows, confidence bands, blink event timestamps
- Aggregated attention scores (`acsScore`, layer `signals.*.score`)
- Fraud flags (`likelyFake`, `signalIntegrity` notes) — boolean/score only
- Campaign/offer/content metadata
- Consent and privacy receipt summaries

## Implementation anchors

| Layer | Control |
|-------|---------|
| Flutter native | `includeFullLandmarks` false in release |
| Flutter Dart | `kDerivedSignalsOnly` in `pop_runtime_config.dart` |
| Web | `visionProofBridge` hints only; not POPS truth |
| Backend | `proof-packet-v0` schema — no frame buffers |
| DB | `pops_sessions` — no biometric columns |
