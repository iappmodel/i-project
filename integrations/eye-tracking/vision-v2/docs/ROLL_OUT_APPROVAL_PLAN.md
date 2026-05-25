# Rollout Plan (Approval Gates)

## Phase 1: Foundation (implemented)

- Provider abstraction
- Tobii WebSocket adapter
- Calibration profile engine
- Dwell/blink command engine

## Phase 2: Stability Controls (implemented)

- Connection health monitor with stale/no-sample detection
- Automatic provider fallback policy (`tobii_ws -> pointer -> mock`)
- Command cooldowns and anti-repeat filters (dwell + blink + global)

## Phase 3: Calibration Quality (implemented)

- Drift detection from dwell-confirmed target samples
- Per-device/profile calibration slots in local storage
- On-screen quality dashboard (rate, confidence, drift, recommendation)

## Phase 4: Production Integration (approval required)

- Merge selected modules into the main app
- Telemetry events and debug overlays
- Final UX tuning for gaze hold, blink timing, and remote actions
