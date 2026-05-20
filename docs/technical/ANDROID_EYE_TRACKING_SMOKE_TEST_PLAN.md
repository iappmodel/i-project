# Android eye-tracking smoke test plan

**Date:** 2026-05-20  
**Runtime:** [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/)  
**Result:** [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md) (2026-05-20 — Samsung SM-S928U, partial pass)  
**Related:** [`FLUTTER_RUNTIME_PROMOTION_REPORT.md`](FLUTTER_RUNTIME_PROMOTION_REPORT.md), [`MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md)

---

## 1. Purpose

This smoke test is the **first on-device proof** that the promoted IVAULT eye-tracking Flutter runtime runs end-to-end on a **physical Android phone**. Unit tests (`flutter test`, 185 tests at last host run before generated artifacts were cleaned) validate Dart logic and channel contracts in isolation; they do **not** prove camera capture, MediaPipe native loading, or live gaze/EAR emission.

The smoke test answers one question: **Can this archive’s Android build receive camera frames and return real attention signals through `vision_channel` without crashing?**

---

## 2. What must be proven

| # | Claim | Evidence |
|---|--------|----------|
| 1 | Toolchain can build and deploy the promoted runtime | `flutter run` completes; app installs |
| 2 | Camera permission and preview pipeline work | Permission prompt → preview or frame loop starts |
| 3 | Native vision stack initializes | `VisionProcessor.init()` runs; `face_landmarker.task` loads (no asset/init crash) |
| 4 | Face mesh is detected when a face is visible | `VisionFrame` maps with non-empty `landmarks` / `hasFace` |
| 5 | Gaze, EAR, and attention metrics flow to Dart | `gazeX`/`gazeY`, `leftEAR`/`rightEAR`, `attentionScore` (0–100) update on HUD or logs |
| 6 | Channel bridge is stable under motion | No sustained `PlatformException` on `processFrame`; survives face loss/recovery |
| 7 | Short-session stability | No crash or ANR for **60 continuous seconds** of capture |

**Out of scope for this smoke test:** wiring gates to `investor-demo`, `process-earning`, wallet settlement, iOS, or production fraud review.

---

## 3. Preconditions

Complete these before running on device.

| Requirement | How to verify |
|-------------|----------------|
| **Flutter installed** | `flutter --version`; SDK satisfies `pubspec.yaml` (`>=3.8.1 <4.0.0`) |
| **Android SDK configured** | `flutter doctor -v` shows Android toolchain ✓; `ANDROID_HOME` or Android Studio SDK path valid |
| **Physical Android device connected** | USB debugging enabled; device appears in `flutter devices` (prefer **physical** over emulator for camera latency and real permission UX) |
| **Camera permission available** | Device has a working front camera; no enterprise policy blocking camera; tester can grant **Allow** when prompted |
| **Repo hygiene** | From a clean clone: run `flutter pub get` in `flutter-runtime/` (regenerates `.dart_tool/` locally; not committed — see [`FLUTTER_RUNTIME_REPO_HYGIENE.md`](FLUTTER_RUNTIME_REPO_HYGIENE.md)) |
| **Host unit baseline (recommended)** | `flutter test` passes on the same machine before device run (last recorded: **185 tests**) |
| **ML assets present** | `android/app/src/main/assets/face_landmarker.task` and `selfie_segmenter.tflite` exist in tree (tracked in git) |
| **`local.properties` (if needed)** | If build fails on SDK path, delete stale `android/local.properties` and let Flutter/Android Studio regenerate for **this** machine |

---

## 4. Commands

Run from the repository root or use the paths below.

```bash
cd integrations/eye-tracking/flutter-runtime

flutter pub get
flutter doctor -v
flutter devices
flutter run -d <device_id>
```

| Command | Role |
|---------|------|
| `flutter pub get` | Resolves deps and local plugin registrant |
| `flutter doctor -v` | Surfaces Android SDK / license / device issues early |
| `flutter devices` | Copy `<device_id>` for the physical handset |
| `flutter run -d <device_id>` | Debug build, hot reload, Dart `debugPrint` to terminal |

**Optional (not required for pass):**

```bash
flutter test          # re-confirm host baseline
flutter analyze       # static issues before long device session
```

**Logcat (separate terminal while app runs):**

```bash
adb logcat -s VisionProcessor flutter IRIS
```

---

## 5. Expected successful signals

Execute the run in a well-lit room, face the **front** camera, hold the phone at arm’s length.

### Launch and permissions

- App launches to the research/lab shell (`lib/main.dart`) without immediate crash.
- Android shows **camera permission** prompt (manifest declares `android.permission.CAMERA`).
- After **Allow**, camera preview appears or the frame-processing loop starts (black preview briefly then frames is acceptable on some devices).

### Native vision (`VisionProcessor.kt`)

- `MainActivity.onCreate` calls `VisionProcessor.init(this)` before the first `processFrame`.
- `FaceLandmarker.createFromOptions` loads asset **`face_landmarker.task`** (no “model not found” / native crash on startup).
- Optional: `selfie_segmenter.tflite` loads; segmenter failure is **non-fatal** (`Log.w` only — gaze/EAR can still work).

### Per-frame bridge (`vision_channel`)

- Method channel name: **`vision_channel`** (`MainActivity.kt`, `VisionChannelBridge`).
- Methods: `processFrame` (JPEG bytes in), `calibrateHeadPose` (optional baseline).
- While face visible, Dart receives `Map` payloads parsed as [`VisionFrame`](../../integrations/eye-tracking/flutter-runtime/lib/features/vision/vision_frame.dart) with:
  - `landmarks` (non-empty list)
  - `leftEAR`, `rightEAR` (numeric when eyes visible)
  - `gazeX`, `gazeY`
  - `attentionScore` (0–100, changes with gaze/head)
  - `headYaw`, `headPitch`, `headStable` when head pose is computed

### UI / Dart telemetry

- On-screen debug/HUD elements update (attention display, zones, gaze pointer — lab UI in `main.dart`).
- Terminal may show periodic `GazeX:` / `EAR L:` lines when verbose logging is enabled (default `_kVerbosePerFrameLogs = false` in `main.dart`; UI updates are the primary signal).
- Deliberate **look away** → attention score drops or tracking degrades predictably.
- Deliberate **blink** → blink state or EAR-driven behavior responds (native EAR threshold ~0.15 in `VisionProcessor.kt`).

### Stability window

- Leave the app in the active capture state for **≥ 60 seconds** with normal head movement and at least one face-loss/recovery cycle (cover camera briefly, then uncover).
- **Pass signal:** no crash, no red error banner from `_visionChannelError`, no repeating `processFrame: …` `PlatformException` spam.

---

## 6. Failure modes

| Symptom | Likely cause | What to check |
|---------|----------------|---------------|
| `flutter doctor` Android ✗ | SDK not installed or licenses missing | Install SDK; `flutter doctor --android-licenses` |
| “Unable to locate Android SDK” | `ANDROID_HOME` unset or stale `local.properties` | Regenerate `android/local.properties`; align with local SDK path |
| Gradle / AGP version errors | JDK or Gradle wrapper mismatch vs Flutter channel | Match Flutter’s recommended JDK; compare `android/gradle/wrapper/gradle-wrapper.properties` with Flutter release notes |
| No devices listed | USB debugging off, cable, or driver | `adb devices`; re-authorize RSA fingerprint on phone |
| Build succeeds, black screen, no prompt | Permission plugin or manifest | `AndroidManifest.xml` has `CAMERA`; grant in system Settings → App → Permissions |
| Immediate crash on open camera | Camera HAL / emulator without front cam | Use physical device; try back camera only if app allows (this app expects front-facing lab use) |
| Native crash on first frame | Missing `face_landmarker.task` | Confirm `android/app/src/main/assets/face_landmarker.task` size > 0 in APK (unzip `app-debug.apk` if needed) |
| `PlatformException` / `processFrame` errors | Channel name or method mismatch; corrupt JPEG | Channel must be `vision_channel`; methods `processFrame`, `calibrateHeadPose`; watch `adb logcat` |
| `INVALID_ARGUMENT` from native | Non-byte arguments on channel | Ensure Dart sends `Uint8List` JPEG bytes |
| Empty landmarks always | No face in frame, poor light, camera covered | Lighting; face centered; check `hasFace` / landmark count |
| Attention stuck at 0 with visible face | Init failed silently; decode failures | logcat `VisionProcessor`; verify bitmap decode not null |
| Kotlin/Java compile errors | Promoted tree vs local JDK/Kotlin | Clean `flutter clean` then `pub get` and rebuild |
| Works on old machine only | Recovered `local.properties` / NDK path | Delete machine-specific paths under `android/` |

---

## 7. Debug checklist

Use in order when the smoke test fails.

1. **`flutter doctor -v`** — fix every Android-related ✗ before device run.
2. **`flutter devices`** — confirm the physical device ID matches `-d` argument.
3. **`flutter pub get`** — after clone or branch switch; confirm no pub resolve errors.
4. **`flutter test`** — if failing on host, fix Dart/tests before debugging native camera.
5. **Delete stale `android/local.properties`** — regenerate on this machine only.
6. **`flutter clean`** then `flutter pub get` and `flutter run` — clears bad Gradle/cache state.
7. **Camera permission** — Settings → Apps → eye_tracking_app → Camera → Allow.
8. **Asset integrity** — `ls -la android/app/src/main/assets/` shows both `.task` and `.tflite`.
9. **logcat** — `adb logcat -s VisionProcessor flutter`; look for `ImageSegmenter init failed` (warning only) vs FaceLandmarker crash (fatal).
10. **Channel errors in Flutter console** — search for `processFrame:` or `_visionChannelError` paths in `main.dart`.
11. **Verbose Dart logs (optional)** — set `_kVerbosePerFrameLogs = true` in `lib/main.dart` only for debug sessions (revert after; not required for smoke pass).
12. **Face present / absent** — cover lens: landmarks empty and attention should drop; uncover: metrics return within a few frames.
13. **Compare to promotion source** — untouched copy under `integrations/eye-tracking/source-runtime-candidates/from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/` if regression is suspected.

---

## 8. Pass / fail criteria

### Pass (all required)

- [ ] `flutter doctor -v` shows a working Android toolchain for this machine.
- [ ] `flutter run -d <device_id>` installs and launches the app.
- [ ] Camera permission granted by tester.
- [ ] Preview or live frame loop runs without startup crash.
- [ ] With face in frame: at least one successful `processFrame` cycle yielding `VisionFrame` with **non-empty landmarks** and **attentionScore** that can change with gaze/head movement.
- [ ] `gazeX`/`gazeY` and EAR fields present (not permanently `n/a`) while face is visible.
- [ ] No `PlatformException` storm on `vision_channel` during the 60s window.
- [ ] App remains responsive (no crash/ANR) for **60 continuous seconds** including one face-loss/recovery cycle.

### Fail (any one)

- Build or deploy cannot complete.
- Camera permission denied and no fallback test path (cannot validate pipeline).
- Native crash referencing missing model asset or FaceLandmarker init.
- Zero successful face landmarks for ≥ 15s with a clearly visible, lit face.
- Repeated `processFrame` channel errors with face present.
- Crash or force-close within 60s observation window.

### Record outcome

| Field | Value |
|-------|--------|
| Date | |
| Tester | |
| Device model / Android version | |
| Flutter version (`flutter --version`) | |
| `device_id` | |
| Pass / Fail | |
| Notes | |

---

## 9. Screenshots and logs to capture

Store artifacts in a dated folder (e.g. `docs/technical/smoke-runs/2026-05-20-<device>/`) or attach to a Linear/GitHub issue.

| Artifact | When | Why |
|----------|------|-----|
| Screenshot: permission prompt | First launch | Proves Step 4 “device signal” path is reachable on real hardware |
| Screenshot: camera preview + HUD | Face in frame, attention > 0 | Visual proof of live metrics |
| Screenshot: face away / covered | Attention dropped or no face state | Proves signal is not hard-coded |
| Terminal: `flutter doctor -v` (Android section) | Pre-run | Toolchain audit trail |
| Terminal: `flutter devices` | Pre-run | Device binding |
| Terminal: `flutter run` tail (first 2 min) | During run | Deploy errors, Dart `debugPrint`, channel errors |
| `adb logcat` excerpt | 60s window | Native `VisionProcessor` warnings/crashes |
| Optional: `flutter test` summary | Same day on host | Confirms 185-test baseline still green |

**Redact** faces in screenshots if sharing externally; keep full frames for internal debugging only.

---

## 10. Connection to the [ i ] MVP “verified attention” claim

Canonical product flow: [`docs/MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md).

| MVP surface | Uses live camera? | Role |
|-------------|-------------------|------|
| HTML loop / `iapp_loop1_watch_verify_earn.html` | No — cosmetic 5-gate animation | Investor narrative |
| `integrations/eye-tracking/demos/investor-demo/` | No — mocked `WatchVerifyScreen` | Clickable MVP spine |
| **`flutter-runtime/` (this smoke test)** | **Yes** | **Proof layer** for real attention signals |

**Step 4 — “Attention is verified”** requires five gates (device signal, dwell threshold, attention score, completion event, fraud check). Today the demos **animate** those gates without live gaze. This smoke test does **not** wire gates to React/HTML; it establishes the **technical substrate** those gates would consume:

| Gate (canonical) | Smoke test establishes |
|------------------|-------------------------|
| **Device signal** | Physical Android app runs; camera permission granted; frames reach native code |
| **Dwell threshold** | Dart zone/dwell logic runs atop live gaze (lab UI; not yet mapped to `VerificationResultScreen`) |
| **Attention score** | Native `attentionScore` 0–100 emitted via `vision_channel` |
| **Completion event** | Out of scope — needs watch-session orchestration |
| **Fraud check** | Partial — native `likelyFake` / anti-spoof flags exist; full fraud engine not in archive |

**Claim boundary for stakeholders:**

- **Before this smoke test:** “We recovered and unit-tested the attention runtime in the archive.”
- **After a passing smoke test:** “We have **device-level evidence** that camera → MediaPipe → gaze/EAR/attention works on Android,” supporting the roadmap to replace mocked Step 4 gates — still **not** the same as “MVP demo verifies attention in production.”

Next integration steps (documented elsewhere, not part of this smoke): map `VisionFrame` fields to `process-earning` / `impressions.attention_score` schema and `VerificationResultScreen.tsx` gate props per [`flutter-runtime/README.md`](../../integrations/eye-tracking/flutter-runtime/README.md).

---

## References

| Doc | Path |
|-----|------|
| **Smoke test result (2026-05-20)** | [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md) |
| Runtime README | [`integrations/eye-tracking/flutter-runtime/README.md`](../../integrations/eye-tracking/flutter-runtime/README.md) |
| Promotion report | [`FLUTTER_RUNTIME_PROMOTION_REPORT.md`](FLUTTER_RUNTIME_PROMOTION_REPORT.md) |
| Repo hygiene | [`FLUTTER_RUNTIME_REPO_HYGIENE.md`](FLUTTER_RUNTIME_REPO_HYGIENE.md) |
| MVP canonical flow | [`docs/MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md) |
| Integration map | [`EYE_TRACKING_INTEGRATION_MAP.md`](EYE_TRACKING_INTEGRATION_MAP.md) |
