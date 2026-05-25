# Proof packet emission sequence (PR1)

1. **Start session** — `ProofSessionContext.start()` assigns `sessionId`, `startedAt`, campaign ids.
2. **Reset collector** — `ProofSessionCollector.reset(sessionStartMs)`.
3. **Ingest frames** — `onFrame()` for face ratio, FPS, blink, `likelyFake`.
4. **Ingest VSL** — existing `VerificationStabilityLayer.ingest()` (parallel to frame loop).
5. **Record dwell / gaze windows** — optional milestone arrays.
6. **Record interactions** — taps, scrolls, playback flags.
7. **Seal** — `ProofPacketEmitter.sealAndEmit(artifactId: 'PP-000001', ...)`.
8. **Build** — `ProofPacketBuilder.build()` → `ProofPacketV0`.
9. **Validate** — MVP subset; `review.status` must be `pending`.
10. **Emit bus event** — `ProofPacketSealedEvent` on `System.bus`.
11. **Write fixture** — golden JSON at `integrations/pop-core/fixtures/PP-000001.json` (tests).

**Excluded:** wallet mutation, backend POST, settlement decision.
