# Vision → Proof Bridge ADR

**Status:** Accepted (Phase 34)  
**Scope:** Loop 1 web demo only

## Decision

When `VITE_VISION_ENGINE=1`, the React app may attach **client-side vision metrics** to `ProofPacketV0` as `eyeTracking` hints via [`app/src/lib/visionProofBridge.ts`](../../app/src/lib/visionProofBridge.ts).

## Non-goals

- Client liveness is **not** POPS truth.
- Validator contract and settlement rules are **unchanged**.
- Web vision hints do not replace Flutter Seal Proof or server-side multimodal validation.

## Implementation

- `publishVisionProofSnapshot()` — latest metrics from Earn/Watch
- `buildDemoProofPacket()` — merges hints when flag on
- `VisionSourceBadge` — operator UI (`mock` vs `web-vision`)

## Verification

```bash
VITE_VISION_ENGINE=1 npm run dev --prefix app
./scripts/smoke_vision_proof_bridge.sh
```
