# POP Android MVP — v1 release

**Tag:** `pop-android-mvp-v1`  
**Ship commit:** `d7a6d0d` (2026-06-02)  
**Repo:** https://github.com/iappmodel/i-project.git

Proof of Presence (POP) v1 is the production-grade attention-verification and settlement spine for the Android Flutter runtime. Web vision remains demo/hints only.

## What shipped (Stages 0–9)

| Stage | Focus | Key artifacts |
|-------|--------|-----------------|
| 1 | Replay harness | `lib/replay/pop_replay_driver.dart`, golden fixtures |
| 2 | Dead code removal | `POP_FINISH_DELETION_MANIFEST.md` |
| 3 | Safety | CRITICAL-1 confidence honesty, high-risk lane, gaze freshness |
| 4 | Unified gaze | `GazeSample`, `resolveZoneFromGaze`, native-smoothed pipeline |
| 5 | Server settlement | Appeal holds, `release_eligible_at`, validator → `pops_sessions` |
| 6 | Calibration | `AdaptiveCalibrationProfile`, on-device persistence, recalibration banner |
| 7 | Performance | Y8 buffer pool, native bitmap reuse, 5 Hz HUD, frame backpressure metrics |
| 8 | UX | Consent + 5-step wizard, undo, safe mode, touch zone parity, pending explainer |
| 9 | Ship gate | Privacy gates, double-fire tests, RLS contract, `smoke_pop_ship_gate.sh` |

## Verify before demo / store build

```bash
./scripts/smoke_pop_ship_gate.sh
```

Flutter-only subset:

```bash
cd integrations/eye-tracking/flutter-runtime && flutter test
./scripts/smoke_pop_finish.sh
```

## Runtime defaults (locked)

- **Sensing authority:** Flutter + Android `VisionProcessor.kt` only
- **Transport:** Y8 plane (JPEG fallback)
- **Settlement:** Server-side; `VITE_AUTO_SETTLE` is demo-only
- **pending / escalated:** Hold-with-expiry + one re-verify (not silent drop)
- **External OS control:** Off — hard gate in `external_os_control_policy.dart` (`docs/POP_EXTERNAL_OS_CONTROL.md`)

## Env flags (React shell)

| Variable | Purpose |
|----------|---------|
| `VITE_POP_VALIDATOR_URL` | Live wallet + proof validate |
| `VITE_POP_KILL_SWITCH` | Blocks proof submit + telemetry |
| `VITE_POP_BETA_COHORT` | Rollout label (e.g. `android-mvp`) |
| `VITE_POP_TELEMETRY` | Dev anonymized events |
| `VITE_AUTO_SETTLE` | **Demo only** — not production authority |

## v2 progress

- **Trust tiers** — shipped (`docs/POP_TRUST_TIERS_V2.md`): tiered release delay + t2-only auto-settle

## Deferred (v2 remainder)

- Durable Supabase-backed pop-core stores (production path)
- iOS `vision_channel` parity — see `docs/POP_IOS_VISION_PARITY.md` (shipped v2)
- External/OS: shipped v2 hard gate; Play policy review before enabling flag in production

## Canonical docs

- `integrations/eye-tracking/flutter-runtime/POP_PRIVACY_BOUNDARIES.md`
- `MASTER_BRAIN/ENTITIES/POP.md`
- `MASTER_BRAIN/WIRING_STATUS.md` (POP finish plan section)
