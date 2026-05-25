# Eye Earn Vision v2

A fresh repo for a new remote-control + eye-tracking architecture.

## New approach

- Provider-first gaze pipeline (`mock`, `pointer`, `tobii_ws`)
- Unified calibration layer (adaptive 9-point with affine fit)
- Remote command engine (dwell and blink actions)
- Runtime fallback strategy: if Tobii feed fails, switch provider without changing app logic
- Feed health watchdog and anti-repeat action throttling
- Per-device calibration slots and drift-aware quality dashboard

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:8090`.

## Implemented modules

- `src/providers/` gaze adapters
- `src/calibration/AdaptiveCalibration.ts`
- `src/control/RemoteCommandEngine.ts`
- `src/app/AppController.ts` demo orchestrator

## Notes

- `tobii_ws` expects a local WebSocket stream (for example a Python or C++ bridge).
- This repo is intentionally isolated from the existing app so we can iterate safely and merge selectively.
