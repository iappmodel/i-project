# Calibration tuning plan — practical device guide

**Date:** 2026-05-20  
**Runtime:** [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/)  
**Adaptive design:** [`ADAPTIVE_CALIBRATION_SYSTEM.md`](ADAPTIVE_CALIBRATION_SYSTEM.md)  
**Device baseline:** Samsung SM-S928U (Android 15) — [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md)

This document is the **operator playbook** for the next physical device session. Run these procedures before changing thresholds or wiring adaptive calibration.

---

## Quick start — commands

```bash
cd integrations/eye-tracking/flutter-runtime
flutter pub get
flutter analyze
flutter run -d R5CX2137BEB
```

Logcat (second terminal):

```bash
adb logcat -s VisionProcessor flutter IRIS > docs/technical/smoke-runs/$(date +%Y-%m-%d)-sm-s928u-calibration.logcat
```

Create artifact folder before the session:

```bash
mkdir -p docs/technical/smoke-runs/$(date +%Y-%m-%d)-sm-s928u-calibration
```

---

## Practical device run (60–90 min)

### A. Pre-flight (5 min)

| Step | Action | Pass | Fail |
|------|--------|------|------|
| A1 | App installs and camera opens | Preview visible ≤10 s | Black screen / crash |
| A2 | LEFT/CENTER/RIGHT overlay visible | Three targets, no layout error | FlutterError / red screen |
| A3 | Lab HUD scrolls (bottom-left) | All lines readable | Text clipped off-screen |
| A4 | `[frame_perf]` in terminal | processed FPS > 0 with face in frame | processed=0 for >15 s |

**Capture:** screenshot `01-preflight-overlay.png`

---

### B. Manual calibration sequence (10 min)

Use lab buttons (top-right). Good lighting, arm’s-length phone, portrait.

| Step | Action | Record in notes | Pass | Fail |
|------|--------|-----------------|------|------|
| B1 | **Cal N** — look center, head level | HUD `yaw₀=` | Value updates | Stays `—` |
| B2 | **Cal L** — look at physical left target 1 s | HUD `min=` | Value updates | Stays `—` |
| B3 | **Cal R** — look at physical right target 1 s | HUD `max=` | Value updates | Stays `—` |
| B4 | **Cal EAR** — eyes open, neutral ~1 s | `leftOpenEAR`, `rightOpenEAR` | Both numeric after 30/30 | Stays `—` |
| B5 | Check FSM line | `Calibration FSM:` | `ready` | Stuck in `sampling-*` |

**Capture:** screenshot `02-cal-complete-hud.png`  
**Log:** copy HUD block into `calibration-notes.md`:

```markdown
## Cal capture
- min (left): ___
- max (right): ___
- yaw₀: ___
- leftOpenEAR: ___
- rightOpenEAR: ___
- dynamic close threshold: ___
- FSM: ___
```

---

### C. Left / center / right zone test (15 min)

**Setup:** After B sequence. Hold phone steady. Use on-screen zones as reference.

| Trial | Instruction | Expected zone highlight | Duration | Pass criterion |
|-------|-------------|----------------------|----------|----------------|
| C1 | Look **center** (nose at camera) | CENTER | 5 s hold | CENTER ≥4 s |
| C2 | Look **left** (eyes only, minimal head turn) | LEFT | 5 s hold | LEFT ≥4 s |
| C3 | Look **right** | RIGHT | 5 s hold | RIGHT ≥4 s |
| C4 | Slow sweep L → R → L | L → C → R → C | ~20 s | ≤2 wrong-zone flips |
| C5 | Return center after each extreme | CENTER between | 2 s each | Recovers to CENTER |

**Score:** 5 trials × pass/fail → **≥4/5 = zone pass**, **≤3/5 = zone fail**

**Record per trial:**

| Trial | Subjective direction | HUD `Zone:` | Match? (Y/N) |
|-------|---------------------|-------------|--------------|
| C1 | center | | |
| C2 | left | | |
| C3 | right | | |
| C4 | sweep | (note mis-assigns) | |
| C5 | center recovery | | |

**Capture:** screenshots `03-zone-left.png`, `04-zone-center.png`, `05-zone-right.png`

**If zone fail:** note whether `min`/`max` spread is narrow (<0.02) or `Zone:` disagrees with highlighted button — feeds adaptive plan.

---

### D. Blink / EAR test (15 min)

| Trial | Instruction | Expected HUD | Pass | Fail |
|-------|-------------|--------------|------|------|
| D1 | Normal blink ×3 | `Blink: true` briefly; count increments | 3/3 detected | <2/3 |
| D2 | Dwell CENTER until ring fills → **close eyes** | Haptic; zone selected | Select fires | No haptic |
| D3 | Dwell LEFT → close eyes | SELECTED: LEFT | Amber border LEFT | Wrong zone |
| D4 | After select: **2 quick blinks** | Confirm path (heavy haptic) | Confirm fires | No response |
| D5 | Dwell → select → **3+ blinks** | Cancel path | Selection clears | Stuck selected |

**Score:** **≥3/5 = blink pass**, **≤2/5 = blink fail**

**Record:**

| Trial | mean EAR at close (if visible) | dynamic closeTh | Blink count | Pass |
|-------|-------------------------------|-----------------|-------------|------|
| D1 | | | | |
| D2 | | | | |
| D3 | | | | |

**Capture:** screenshot `06-blink-select.png` (moment of selection)

---

### E. Attention & authenticity spot-check (10 min)

Hold neutral pose: center gaze, eyes open, head still, 30 s.

| Metric | Record min / max / median | Pass | Fail |
|--------|---------------------------|------|------|
| `Attention: … (native …)` | native: ___ | native > 0 for ≥20 s | native 0 entire window |
| `likelyFake` | true/false | false entire window | true ≥5 s on real face |
| CONF/STAB panel | STAB typical: ___ | STAB > 0.25 sometimes | always low_stability |

**Capture:** screenshot `07-attention-neutral.png`

---

### F. Stability run (60 s)

| Check | Pass | Fail |
|-------|------|------|
| No crash / ANR | 60 s continuous | Crash |
| `frame_perf` processed FPS | ≥4 avg | <2 sustained |
| Face-loss recovery | Cover lens 3 s → uncover → face returns ≤5 s | Stuck noFace |
| Layout assertions | None in logcat | Stack/constraint errors |

**Capture:** last 3 `[frame_perf]` lines pasted into `calibration-notes.md`

---

## Pass / fail summary (session verdict)

| Area | Pass threshold | Result |
|------|----------------|--------|
| Pre-flight | A1–A4 all pass | |
| Manual cal | B1–B5 all pass | |
| Zones | ≥4/5 trials (section C) | |
| Blink | ≥3/5 trials (section D) | |
| Attention | native > 0 ≥20 s, likelyFake false | |
| Stability | 60 s no crash, FPS ≥4 | |

**Overall calibration session pass:** all six rows pass.  
**Partial pass:** pre-flight + stability pass; zones or blink fail (expected before adaptive wiring).  
**Fail:** crash, no camera, or processed FPS = 0.

---

## What to measure (numbers for adaptive system)

Copy into `calibration-notes.md` or CSV:

| Measurement | How | Used for |
|-------------|-----|----------|
| Raw `gazeX` at neutral / left / right | HUD + logcat during C1–C3 | `GazeThresholds` |
| Pipeline zone vs subjective | C table | deadband tuning |
| Cal L/R/N captured values | B5 HUD block | session vs population merge |
| Open EAR L/R | After Cal EAR | `EarBaseline` |
| Dynamic close threshold | HUD line | blink select alignment |
| Blink closure depth | D trials | close fraction |
| Native attention range | E 30 s window | future gate (observe only) |
| `likelyFake` FP rate | E + normal use | anti-spoof baseline |
| Processed FPS | F log excerpt | perf budget |

---

## Artifacts checklist

Save under `docs/technical/smoke-runs/YYYY-MM-DD-sm-s928u-calibration/`:

- [ ] `calibration-notes.md` (tables above filled)
- [ ] `01-preflight-overlay.png` … `07-attention-neutral.png`
- [ ] `session.logcat` (adb logcat capture)
- [ ] Last 10 `[frame_perf]` lines (paste or `grep frame_perf session.logcat`)

Redact face if sharing externally.

---

## Current validated state

| Layer | Status |
|-------|--------|
| APK / camera / stream | Pass (2026-05-20 smoke) |
| Native processing + frame_perf | Pass |
| Gaze overlay | Pass (post d24a440) |
| Lab HUD layout | Pass (bounded + scroll) |
| Zone accuracy | **Not validated** — measure in section C |
| Blink select reliability | **Not validated** — measure in section D |
| Adaptive profile | Scaffold only — [`adaptive_calibration_profile.dart`](../../integrations/eye-tracking/flutter-runtime/lib/calibration/adaptive_calibration_profile.dart) |

---

## Known issues (do not fix in measurement pass)

| Issue | Notes |
|-------|-------|
| `getZone` uses raw ±0.10 deadband | Not using Cal L/R normalized bounds yet |
| Single-frame Cal L/R capture | First frame after button — noisy |
| Blink select uses fixed 0.08 | May disagree with dynamic EAR path |
| Attention not productionized | Observe only; no invented cutoffs |
| Lab Cal buttons | Dev-only; product uses adaptive micro-cal (future) |

---

## Tuning knobs (after measurement)

| Knob | File | Current |
|------|------|---------|
| Zone deadband | `lib/gaze_zone.dart` | ±0.10 |
| Normalized bands | `lib/gaze_zone.dart` `getGazeZone` | 0.33 / 0.66 |
| Gaze offset | `lib/gaze_normalize.dart` | 0.09 |
| Population L/R | `lib/gaze_normalize.dart` | 0.076 / 0.132 |
| EAR close fraction | `lib/ear_calibration.dart` | 0.7 |
| Open EAR sample count | `OpenEarCalibrator` | 30 |

Adjust only with section C/D data — see [`ADAPTIVE_CALIBRATION_SYSTEM.md`](ADAPTIVE_CALIBRATION_SYSTEM.md) for adaptive loop.

---

## References

| Doc | Path |
|-----|------|
| Adaptive calibration design | [`ADAPTIVE_CALIBRATION_SYSTEM.md`](ADAPTIVE_CALIBRATION_SYSTEM.md) |
| Smoke test result | [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md) |
| Smoke test plan | [`ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md) |
| Profile scaffold | [`lib/calibration/adaptive_calibration_profile.dart`](../../integrations/eye-tracking/flutter-runtime/lib/calibration/adaptive_calibration_profile.dart) |

### Key runtime files

| Area | Path |
|------|------|
| Main loop + HUD | `lib/main.dart` |
| Adaptive profile | `lib/calibration/adaptive_calibration_profile.dart` |
| Zone UI | `lib/gaze_zone_buttons.dart` |
| Zone thresholds | `lib/gaze_zone.dart` |
| Gaze normalize | `lib/gaze_normalize.dart` |
| Calibration FSM | `lib/features/calibration/calibration_phase.dart` |
| EAR / blink | `lib/ear_calibration.dart`, `lib/blink_detector.dart` |
