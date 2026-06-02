# POP v2 release

**Tag:** `pop-v2-complete`  
**Ship commit:** `3053a15` (2026-06-02)  
**Base:** `pop-android-mvp-v1` (Stages 0–9)  
**Repo:** https://github.com/iappmodel/i-project.git

POP v2 extends the Android MVP with **durable settlement**, **iOS sensing parity**, and a **hard external/OS gate** — without changing the in-app gaze zone loop.

## What shipped

| Slice | Commit (approx.) | Summary |
|-------|------------------|---------|
| Trust tiers | `e7fb5fc` | `t0_new` / `t1_established` / `t2_trusted`; tiered `release_eligible_at`; t2-only server auto-settle |
| Durable settlement | `8df2a89` | `POP_SETTLEMENT_PRIMARY=supabase`; mandatory hold upsert on validate |
| iOS vision | `b363378` | `vision_channel` + `VisionProcessor.swift` (MediaPipe, same map as Android) |
| External/OS gate | `3053a15` | `external_os_control_policy.dart`; `blockedExternalOs`; flag default off |

## Verify

```bash
./scripts/smoke_pop_ship_gate.sh
```

Results (2026-06-02): Flutter ship subset **PASS**, validator **22**, backend **277**, app vitest **15**.

## Production defaults (unchanged from MVP + v2)

| Area | Default |
|------|---------|
| Sensing | Flutter native `vision_channel` (Android + iOS) |
| Settlement primary | Local JSON validator files; set `POP_SETTLEMENT_PRIMARY=supabase` for production |
| Trust tier delays | `POP_TRUST_T0/T1/T2_DELAY_SECONDS` (see `docs/POP_TRUST_TIERS_V2.md`) |
| External/OS | **Off** — `kEnableExternalOsControl = false` (`docs/POP_EXTERNAL_OS_CONTROL.md`) |
| Auto-settle (server) | **t2_trusted only** when `POP_SERVER_AUTO_SETTLE` enabled |
| Web vision | Hints / demo only — not payout authority |

## Env quick reference

**Validator (durable holds)**

```bash
POP_SETTLEMENT_PRIMARY=supabase
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
# optional: POP_SETTLEMENT_SKIP_LOCAL_JSON=true
```

**Validator (trust tiers)**

```bash
POP_TRUST_T0_DELAY_SECONDS=3600
POP_TRUST_T1_DELAY_SECONDS=900
POP_TRUST_T2_DELAY_SECONDS=0
POP_SERVER_AUTO_SETTLE=true   # t2 only
```

**Flutter (QA only — never production store)**

```bash
flutter run --dart-define=POP_ENABLE_EXTERNAL_OS_CONTROL=true
```

## Canonical docs

- `docs/POP_ANDROID_MVP_RELEASE.md` — v1 baseline
- `docs/POP_TRUST_TIERS_V2.md`
- `docs/POP_DURABLE_SETTLEMENT.md`
- `docs/POP_IOS_VISION_PARITY.md`
- `docs/POP_EXTERNAL_OS_CONTROL.md`

## Device smoke (post-tag)

- **Android:** `./scripts/smoke_pop_finish.sh` + front camera 60s (see `docs/technical/ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md`)
- **iOS:** `cd integrations/eye-tracking/flutter-runtime/ios && LANG=en_US.UTF-8 pod install && flutter run` on physical device
