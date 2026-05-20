# Android runtime test hygiene checklist

**Date:** 2026-05-20  
**Runtime:** [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/)  
**Primary device class:** Samsung SM-S928U (`R5CX2137BEB`)  
**Related:** [`PIPELINE_PERFORMANCE_INSTRUMENTATION_V1.md`](PIPELINE_PERFORMANCE_INSTRUMENTATION_V1.md), [`Y_PLANE_TRANSPORT_EXPERIMENT.md`](Y_PLANE_TRANSPORT_EXPERIMENT.md)

---

## 1. Why this checklist exists

Physical Android runs on Samsung SM-S928U show **high encode/channel times**, **low processed FPS**, and **ImageStreamReader** buffer drops in logcat. Those symptoms are consistent with a **Dart-side pipeline bottleneck**, but they are also consistent with **test-environment noise**: bad USB links, thermal throttling, competing camera clients, debug-build overhead, host disk pressure, and uncontrolled face/lighting motion.

**Use this checklist before interpreting** `[frame_perf]` lines, **Pipeline perf** HUD values, or declaring that encode/channel optimization (e.g. Y-plane transport) “won” or “lost.” A single hot or noisy run is not evidence of a software regression or improvement.

---

## 2. Physical setup controls

| Control | Action |
|---------|--------|
| Data cable | Use a **known-good USB data cable** (not charge-only). Prefer the cable that already gave stable `adb devices` without disconnects. |
| Hubs / adapters | **Avoid USB hubs and dongle chains** when measuring throughput. Hubs add latency and power variance. |
| Mac connection | Plug the phone **directly into a Mac USB port** (not through a monitor hub if avoidable). **Record which port** (left/right, USB-C vs hub). |
| Phone mount | Rest phone on a **stand or tripod**; same position across baseline and experiment. |
| Lighting | **Consistent, even front lighting**; avoid backlighting and moving shadows across the face. |
| Face motion | Hold still for stability runs; do not mix “still” and “moving head” in the same 60 s window when comparing encode/channel. |

---

## 3. Phone state controls

| Control | Action |
|---------|--------|
| Battery | **> 50%** before starting; note % at start and end. |
| Power saving | **Disable** power saving / battery saver / ultra power saving. |
| Performance mode | Enable **performance / high performance** mode if the device offers it (Samsung Game Booster / performance profile). |
| Background apps | **Force-stop or close** heavy background apps (browser, games, other camera apps). |
| Screen recording | **Stop** any built-in or third-party screen recording before the measured run. |
| Camera users | Ensure **no other app** holds the camera (close Instagram, Meet, camera app, etc.). |
| Thermal state | If the phone feels warm from prior runs, **idle 2–5 minutes** (screen off, unplugged briefly if needed) before the recorded run. |
| Charging | Prefer **stable power**: either unplugged with high battery, or **plugged in for the whole session** — do not switch mid-run. |
| Screen brightness | Keep brightness **moderate and fixed** (not auto-dimming mid-run). |
| Battery optimization | For repeat lab work, consider excluding the debug app from aggressive **battery optimization** (document if changed). |

---

## 4. Mac state controls

| Control | Action |
|---------|--------|
| Disk space | Ensure **≥ 10 GB free** on the Mac volume hosting the Flutter project and Gradle caches. Note free GB before run. |
| Heavy apps | Quit or pause **video editors, Docker, large Chrome profiles, Time Machine backups** during the device run. |
| Parallel builds | **Do not** run `flutter build`, Gradle, or Xcode builds for other projects during the measured 60 s window. |
| Emulators | **No Android emulators or iOS simulators** running alongside the physical device test. |
| Terminal | Use a **clean terminal** session: one `flutter run` attached; avoid multiple concurrent `adb logcat` greps that flood the same shell unless intentional. |
| CPU load | Glance at Activity Monitor; avoid sustained **> 80% CPU** from unrelated processes during capture. |

---

## 5. Software run controls

| Control | Action |
|---------|--------|
| First run after install | **Ignore the first run** after fresh clone, `flutter pub get`, NDK download, or first Gradle native build — JIT, shader, and cache warmup skew timings. |
| Warm-up protocol | **Run once to warm up** (camera ACTIVE, face in frame ~30 s), **stop or background**, then start the **second run** used for recording. |
| Stable center run | Record a **60-second stable center** hold: face centered, minimal blink, minimal head motion. |
| Motion / blink run | Run **movement and blink** as a **separate** session (do not compare encode/channel to the stable run). |
| Debug overhead | Accept that **debug APK** adds overhead; compare sessions only with the same build mode (`flutter run` debug vs same flavor). |
| NDK / Gradle | If log shows first-time NDK or long “Running Gradle task”, **do not** archive that run’s `[frame_perf]` as baseline. |

**Commands (from repo root):**

```bash
cd integrations/eye-tracking/flutter-runtime
flutter pub get
flutter devices
flutter run -d R5CX2137BEB
```

Optional logcat during capture:

```bash
adb logcat -s VisionProcessor flutter | grep -E 'frame_perf|ImageStream|GetEnv|DWELL'
```

---

## 6. Baseline vs experiment protocol

Compare **JPEG baseline** vs **Y-plane experiment** only when **all** hygiene controls above match.

| Variable | Baseline | Experiment |
|----------|----------|------------|
| Flag | `useExperimentalYPlaneTransport = false` | `useExperimentalYPlaneTransport = true` |
| Transport | JPEG `Uint8List` (default path) | Y8 map on Android YUV420 |
| Lighting | Same room / lamps | **Identical** |
| Phone position | Stand/tripod mark | **Same mark** |
| Cable / port | Documented | **Same cable and Mac port** |
| Duration | 60 s stable center | **60 s stable center** |
| Sequence | Warm-up → **second run** record | Warm-up → **second run** record |
| Build | Same `flutter run` debug flow | Rebuild after flag change; still **second run** for metrics |

**See:** [`Y_PLANE_TRANSPORT_EXPERIMENT.md`](Y_PLANE_TRANSPORT_EXPERIMENT.md) §8–10 for flag location and metric table.

---

## 7. What to record

For each archived run, capture:

| Item | How |
|------|-----|
| `[frame_perf]` logs | Terminal scrollback or `adb logcat`; ~60 s of stable center |
| Pipeline perf HUD | Screenshot or transcribe `enc` / `ch` / `nat` / `tot`, `fps proc` / `cam`, `inv`, `bn`, `drop T/B/I/buf` |
| Battery % | Settings or status bar at start/end |
| Phone temperature | If visible (Samsung device care / thermal warning); note “warm / hot / cool” |
| Mac disk free | `df -h` on project volume |
| Cable / port | Short note, e.g. “Anker USB-C 1 m, MacBook left port” |
| Screen recording | Yes/no |
| Flag state | `false` = JPEG baseline, `true` = Y-plane |
| Run index | “warm-up” vs “recorded second run” |
| logcat buffer drops | Grep `ImageStreamReader` / `GetEnv` if investigating `buf` proxy |

Archive under `docs/technical/smoke-runs/` with names like `jpeg-baseline-YYYYMMDD-second-run.txt` and `y8-transport-YYYYMMDD-second-run.txt`.

---

## 8. Pass / fail thresholds

Use these to decide whether a run is **valid for comparison**, not whether the product is production-ready.

| Check | Pass (hygienic stable center run, SM-S928U class) | Fail (discard or fix environment) |
|-------|---------------------------------------------------|-----------------------------------|
| App stability | No crash, no `PlatformException` storm | Crash or repeated channel errors |
| Camera fps | `fps(cam=…)` **stable ~25–35** in HUD / `[frame_perf]` after warm-up | Camera **< 20** or wildly swinging without movement |
| Processed fps | `fps proc` **sustained ~4–12** (debug JPEG path); note value | **0.0 processed** for full 60 s with face in frame |
| Invalid frame ratio | `inv` **< ~25%** on stable hold | **> 40%** on stable hold (check lighting/face) |
| Drops | `busy`/`buf` low on still hold; throttle expected | **Rising busy/buf** + logcat `ImageStreamReader` drops throughout still hold |
| Functional signal | **`DWELL_READY: CENTER`** appears in log during center hold | Never achieves dwell with stable face |
| Bottleneck label | `bn:` present and consistent with `enc`/`ch` averages | HUD empty or contradicts logs |

**Experiment-specific pass** (after hygiene): Y-plane second run shows **lower `enc`/`ch` averages** and **higher `fps proc`** vs JPEG baseline under **same** conditions — see [`Y_PLANE_TRANSPORT_EXPERIMENT.md`](Y_PLANE_TRANSPORT_EXPERIMENT.md) §9.

---

## 9. Interpretation rules

1. **Do not** call a pipeline bottleneck (encode, channel, or buffer) **confirmed** unless the symptom is **reproducible on a second hygienic run** with controls in §2–5 satisfied.
2. **Do not** compare JPEG baseline vs Y-plane unless **§6** variables match; a brighter room or different cable invalidates the diff.
3. **Ignore** the first run after dependency install, NDK fetch, or cold Gradle — only archive **warm-up → second run**.
4. **Separate** stable-center metrics from movement/blink sessions; high `invalid` during motion is not proof the transport path failed.
5. **Correlate** HUD `drop T/B/I/buf` with logcat `ImageStreamReader` before blaming Dart encode alone.
6. **Thermal / battery** regression: if `enc`/`ch` worsen run-over-run without code changes, repeat after cool-down and > 50% battery.

---

## 10. Recommended next exact test

After completing §2–5 on a cool phone with a known-good cable:

1. **Clean second-run JPEG baseline**  
   - `useExperimentalYPlaneTransport = false`  
   - Warm-up run → second `flutter run` → 60 s stable center → archive `[frame_perf]` + HUD + metadata from §7.

2. **Clean second-run Y-plane experiment**  
   - Set `useExperimentalYPlaneTransport = true`, rebuild, same physical setup.  
   - Warm-up → second run → 60 s stable center → archive with same filename pattern.

3. **Only then** compare `ms(avg encode=…)`, `ms(avg channel=…)`, `fps(processed=…)`, and `bn:` between the two archives.

Optional follow-up (separate files): 30 s movement/blink run per flag for invalid-ratio behavior — not for encode/channel A/B.

---

## References

| Doc | Purpose |
|-----|---------|
| [`PIPELINE_PERFORMANCE_INSTRUMENTATION_V1.md`](PIPELINE_PERFORMANCE_INSTRUMENTATION_V1.md) | HUD fields and bottleneck semantics |
| [`Y_PLANE_TRANSPORT_EXPERIMENT.md`](Y_PLANE_TRANSPORT_EXPERIMENT.md) | Baseline vs Y8 flag and pass criteria |
| [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md) | SM-S928U observed ranges (pre-hygiene) |
| [`ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md) | Broader smoke protocol |
