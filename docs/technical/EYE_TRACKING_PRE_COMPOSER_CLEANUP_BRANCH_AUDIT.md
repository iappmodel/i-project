# Eye Tracking Pre-Composer Cleanup Branch Audit

**Date:** 2026-05-20  
**Audit type:** Read-only branch recovery — no merges, no source-repo modifications  
**Source repo:** `~/Desktop/i-project-rescue/github-source-repos/eye_tracking_app`  
**Target branch:** `origin/checkpoint/pre-composer-cleanup`  
**Comparison base:** `origin/main`  
**Integration repo:** `~/Desktop/i-project-rescue/i_project_migration_archive`  
**Related docs:** [`MULTI_REPO_SYSTEM_RECOVERY_REPORT.md`](MULTI_REPO_SYSTEM_RECOVERY_REPORT.md), [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md), [`ITRACK_DIRTY_RUNTIME_REVIEW.md`](ITRACK_DIRTY_RUNTIME_REVIEW.md), [`Y_PLANE_TRANSPORT_EXPERIMENT.md`](Y_PLANE_TRANSPORT_EXPERIMENT.md), [`VERIFICATION_STABILITY_LAYER_V1.md`](VERIFICATION_STABILITY_LAYER_V1.md), [`PIPELINE_PERFORMANCE_INSTRUMENTATION_V1.md`](PIPELINE_PERFORMANCE_INSTRUMENTATION_V1.md), [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md)

---

## 1. Executive verdict

**The branch is a pre-T-series platform snapshot, not a superseding gaze runtime.** `checkpoint/pre-composer-cleanup` is a **single commit** (`78d8f68`) that bulk-imported a full POPS/economy/backend stack (~2,300 files, ~477k insertions) **before** Composer development. It is **51 commits behind `main`** on T-series stabilization and **31 commits behind** `feature/evidence-vault-v2-hardening` (which extends the same checkpoint).

**Critical finding for the stated objective:** Main and the promoted [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/) **did not lose gaze/blink/calibration math** during stabilization — they **gained** extracted modules (`calibration_phase.dart`, `zone_dwell_logic.dart`, `pipeline_tracking_coordinator.dart`, blink EAR helpers, etc.) that this checkpoint **never had**. The checkpoint still holds **inline** calibration FSM and monolithic `main.dart` (2,672 lines), but that is **pre-extraction**, not richer perception logic.

**What checkpoint uniquely preserves vs current promoted runtime:**

| System | Checkpoint | Promoted runtime / `main` | Verdict |
|--------|------------|---------------------------|---------|
| Gaze pipeline stabilization (T-08–T-10) | **Absent** (inline in `main.dart`) | **Present** (`lib/features/gaze/*`, `zone_dwell_logic.dart`) | Promoted wins |
| Blink EAR helpers | Inline only; no `meanEarIsBlinking` extract | **Present** on `main` | Promoted wins |
| Calibration FSM | Inline enum + handlers in `main.dart` | **Extracted** + unit tests | Promoted wins |
| Y8 / Y-plane transport | **Default path** in `frame_codec.dart` + `MainActivity.kt` | **Experimental flag** (`y_plane_frame_codec.dart`, `runtime_transport_config.dart`) | Already reconciled in i-project |
| Native segmentation perf | **Present** (`SEGMENT_EVERY_N_FRAMES`, grid subsampling) | **Absent** on `main` and promoted | **Cherry-pick candidate** |
| POPS / wallet / trust simulation | **72 Dart economy files + 216 SQL + services/api** | **Absent** (i-project has schema docs only) | Preserve via evidence-vault branch audit |
| `ai/` stabilization roadmap | **Absent** | **Present** on `main` | Main wins for ET maintenance |

**Recommendation:** Do **not** merge or bulk-promote this branch. Continue treating **promoted flutter-runtime + `main` T-series** as canonical for perception. **Selectively reconcile** native `VisionProcessor.kt` segmentation optimizations after a device A/B test. For POPS/backend, use [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md) (superset of this checkpoint).

---

## 2. Branch metadata

| Field | Value |
|-------|--------|
| **Branch name** | `checkpoint/pre-composer-cleanup` |
| **Remote ref** | `remotes/origin/checkpoint/pre-composer-cleanup` |
| **HEAD** | `78d8f68` — *Checkpoint current system state before Composer development* |
| **Merge base with `main`** | `5b97d00` — *Phase 5A: add frame performance instrumentation* |
| **Commits ahead of `main`** | 1 |
| **Commits behind `main`** | 51 |
| **Diff vs `main` (three-dot)** | **2,302 files**, **476,728 insertions**, **658 deletions** |
| **Relation to `main`** | Diverged snapshot — bulk platform import on checkpoint; T-series micro-stabilization on `main` |
| **Relation to `feature/evidence-vault-v2-hardening`** | Checkpoint **is** commit `78d8f68`; evidence-vault is **+31 commits** on top |
| **Tree size** | 2,575 tracked files (vs ~200-path lean Flutter tree on `main`) |

### Latest commits (checkpoint ancestry)

| Commit | Scope |
|--------|--------|
| `78d8f68` | Bulk checkpoint — POPS platform, services, db, web apps, economy engines, remote UI, Y8 transport, native perf tuning |
| `5b97d00` | Phase 5A: frame performance instrumentation |
| `4042f22` | Phase 4: calibration state machine |
| `69df8ce` | Phase 3: gate action commits by tracking state |
| `88c158a` | Include bypass safety test |
| `94f04c5` | Mark legacy pipeline non-runtime |
| `2f5085e` | Refactor: unify runtime gaze signal authority |

### Changed file buckets (checkpoint vs `main`)

| Bucket | Checkpoint-only / delta | Notes |
|--------|---------------------------|-------|
| `lib/` | +72 files on checkpoint; −10 T-series files on checkpoint | Platform simulation vs modular gaze |
| `android/` | Y8 `MainActivity`, segmentation cache in `VisionProcessor` | Perf path lost on `main` |
| `test/` | 60 files (checkpoint) vs 26 (`main`) | Checkpoint tests skew economy/POPS |
| `services/`, `db/`, `backend/`, `apps/web/`, `src/` | **Absent on `main`** | Full platform stack |
| `ai/` | **Absent on checkpoint** | Stabilization docs only on `main` |
| `docs/` (repo root) | `FINAL_ARCHITECTURE_INDEX.md`, `POPS_PHASE1_IMPLEMENTATION_PLAN.md`, etc. | Architecture prose |

---

## 3. High-value systems found

| System | Location | Implementation status | Authoritative? |
|--------|----------|----------------------|----------------|
| **Native MediaPipe vision bridge** | `android/.../VisionProcessor.kt`, `MainActivity.kt` | **Implemented** — Face Landmarker + Image Segmenter; anti-spoof flags | On-device signal authority |
| **Y8 + 512px vision transport** | `lib/features/vision/frame_codec.dart`, `MainActivity.kt` | **Implemented** (default, not flag-gated) | Superseded in i-project by experimental module |
| **Segmentation perf tuning** | `VisionProcessor.kt` — `SEGMENT_EVERY_N_FRAMES`, grid stride mask scan | **Implemented** | **Not on `main`/promoted** — reconcile |
| **Calibration state machine** | `lib/main.dart` — `CalibrationPhase` enum, `_setCalibrationPhase` | **Implemented inline** | Logic equivalent to extracted `calibration_phase.dart` on `main` |
| **EAR / blink detection** | `lib/blink_detector.dart`, `lib/ear_calibration.dart` | **Implemented** | Same core as `main`; `main` adds testable helpers |
| **Intent OS / governance / safety** | `lib/core/intent_os/*` | **Implemented** + unit tests | Shared ancestry with `main` |
| **Flutter POPS hooks** | `lib/pops/` (6 files) | **Partial** — scoring/decision/receipt orchestration | Client preview; emits bus events |
| **Economy / wallet / trust simulation** | `lib/reward_engine.dart`, `lib/trust_engine.dart`, `lib/wallet_ledger_engine.dart`, etc. | **Implemented** — header-marked non-authoritative | Simulation only |
| **Remote control shell** | `lib/features/remote/*` (14 files) | **Implemented** — router, policy, rate limit, UI orb | Product UX; not on `main` |
| **Backend POPS API** | `services/api/src/pops/` (~72 files) | **Implemented** with tests | Backend reference — see evidence-vault audit |
| **SQL platform schema** | `db/migrations/` (216 files) | **Implemented** | Reconcile with archive Supabase, not blind promote |
| **Trust transparency web** | `apps/web/src/components/trust-transparency/` | **Implemented** UI | Admin/customer portal mock |
| **Red-team simulation** | `lib/adversarial_layer.dart`, `lib/simulation_layer_engine.dart` | **Simulation** with tests | Non-authoritative |

---

## 4. Gaze / blink / EAR findings

### 4.1 Implemented (shared core)

- **`lib/gaze_processing_pipeline.dart`**, **`lib/gaze_normalize.dart`**, **`lib/gaze_zone.dart`**, **`lib/gaze_filter*.dart`** — present on both branches from shared ancestry; no checkpoint-only gaze math discovered.
- **`lib/blink_detector.dart`** — EAR hysteresis blink FSM; checkpoint lacks extracted helpers `meanEarIsBlinking` / `meanEarFromPairIfFinite` that `main` added in T-10 (commits `47b3d67`, `a30584a`).
- **`lib/ear_calibration.dart`**, **`lib/ear_normalize.dart`** — identical role on both branches.

### 4.2 On `main` / promoted — absent on checkpoint

| Module | Purpose |
|--------|---------|
| `lib/features/gaze/drift_adjusted_gaze.dart` | Drift-adjusted gaze helper (T-series) |
| `lib/features/gaze/held_face_policy.dart` | Face-loss hold policy |
| `lib/features/gaze/pipeline_frame_confidence.dart` | Frame confidence scoring |
| `lib/features/gaze/pipeline_tracking_coordinator.dart` | Tracking coordinator seams |
| `lib/features/intent/zone_dwell_logic.dart` | Pure zone dwell step (replaces ad-hoc `main.dart` logic) |

Checkpoint uses **`lib/dwell_engine.dart`** — a generic target dwell timer — **not** the zone-band dwell system now extracted on `main`.

### 4.3 Strict assessment

**No checkpoint-only gaze or blink algorithm** was found that supersedes promoted runtime. Checkpoint perception logic is **older and more monolithic**, not removed during stabilization.

---

## 5. Calibration findings

### 5.1 Implemented on checkpoint

- **`CalibrationPhase` enum** inline in `lib/main.dart` (lines ~403–675): `idle → samplingLeft → samplingRight → samplingNeutralYaw → samplingOpenEar → ready`.
- **`calibrateHeadPose`** MethodChannel hook — present on both branches.
- **`lib/gaze_normalize.dart`** — left/right gaze bound calibration.
- **`lib/ear_calibration.dart`** — open-eye EAR baseline sampling.
- **`SystemState.calibrationActive`** gates autonomous actions via `action_decision.dart`.

### 5.2 On `main` / promoted — improvement, not loss

`main` **extracted** the same FSM to `lib/features/calibration/calibration_phase.dart` with `CalibrationBeginCapturePlan` and **`test/calibration_phase_test.dart`**. Promoted runtime also adds **`lib/calibration/adaptive_calibration_profile.dart`** (i-project integration — not on either upstream branch).

### 5.3 Verdict

Calibration **was not removed** during T-series work; it was **modularized and tested**. Do not revert to checkpoint inline FSM.

---

## 6. MediaPipe / native VisionProcessor findings

### 6.1 Shared (both branches)

- MediaPipe Face Landmarker (`face_landmarker.task`) + Image Segmenter (`selfie_segmenter.tflite`).
- Gaze derivation, EAR from landmarks, head pose, blink count.
- Anti-spoof heuristics: `fakeStaticGaze`, `fakePerfectStability`, `fakeNoBlink`, aggregate `likelyFake`.

### 6.2 Checkpoint-only native optimizations (lost on `main`)

```kotlin
// VisionProcessor.kt on checkpoint — absent on main and promoted runtime
private const val SEGMENT_EVERY_N_FRAMES = 3
private var segmentFrameCounter: Int = 0
// categoryMaskPersonFillRatio(..., gridStride: Int = 4) — subsampled mask scan
```

Segmentation runs every 3rd frame with cached metrics; full raster mask scan replaced by grid stride-4 sampling. Comments cite ~O(2.5M) per-frame cost on 1080p-class previews.

### 6.3 Transport / JNI

| Path | Checkpoint | `main` | Promoted runtime |
|------|------------|--------|------------------|
| JPEG `ByteArray` | Supported | **Only path** | Default (`useExperimentalYPlaneTransport = false`) |
| Y8 map `{format, width, height, rowStride, bytes}` | **Default** in `frame_codec.dart` | Removed from `frame_codec` | **Experimental** via `y_plane_frame_codec.dart` + flag |
| 512px downscale before vision | **Yes** (checkpoint `frame_codec`) | No on `main` JPEG path | Yes when Y-plane flag on |

Promoted `MainActivity.kt` **already includes** `y8ToArgbBitmap` and map dispatch (from i-project Y-plane experiment / itrack dirty review). **Segmentation perf tuning is the remaining native gap.**

---

## 7. Transport / performance findings

### 7.1 Checkpoint default path

1. Camera YUV420 → `_yuv420Y8PlaneForVision` (512px cap) → MethodChannel map `format: y8`.
2. Native `y8ToArgbBitmap` → MediaPipe (no JPEG encode/decode).
3. BGRA fallback → JPEG map.

Matches the design documented in [`Y_PLANE_TRANSPORT_EXPERIMENT.md`](Y_PLANE_TRANSPORT_EXPERIMENT.md) and preserved in [`ITRACK_DIRTY_RUNTIME_REVIEW.md`](ITRACK_DIRTY_RUNTIME_REVIEW.md).

### 7.2 `main` path (promoted default)

1. Camera → full-res luma → JPEG @ quality 75 → `Uint8List`.
2. Native `BitmapFactory.decodeByteArray` → MediaPipe.

[`PIPELINE_PERFORMANCE_INSTRUMENTATION_V1.md`](PIPELINE_PERFORMANCE_INSTRUMENTATION_V1.md) identifies encode + channel as dominant costs on SM-S928U; Y-plane experiment addresses this in promoted runtime behind a flag.

### 7.3 Frame instrumentation

Both branches share Phase 5A ancestry (`5b97d00`). Checkpoint keeps perf counters inline in monolithic `main.dart`; `main` extracted `lib/features/vision/frame_perf_metrics.dart`. Promoted runtime adds **`pipeline_performance_monitor.dart`** (i-project only).

---

## 8. Anti-spoof / liveness findings

| Layer | Checkpoint | Notes |
|-------|------------|-------|
| **Native heuristics** | `VisionProcessor.kt` | Same flags as `main`; not new liveness model |
| **Dart consumption** | `_NativeVisionFrame` in `main.dart` parses `likelyFake*` | Signal flags only; not payout gates |
| **Simulation** | `lib/adversarial_layer.dart`, `lib/adversarial_reward_loop_simulation.dart` | Red-team / reward loop simulation — **non-authoritative** |
| **POPS fraud scoring** | `lib/pops/pops_scoring_service.dart`, `services/api/src/pops/` | Backend-weighted; client hooks emit events |
| **Mobile liveness product** | **Not implemented** | Confirms evidence-vault audit conclusion |

No checkpoint-only mobile liveness pipeline beyond existing native heuristics.

---

## 9. Remote / intent / governance findings

### 9.1 Intent OS (shared, production-quality)

`lib/core/intent_os/` — `IntentEngine`, `GovernanceKernel`, `SafetyKernel`, `AutonomousExecutionKernel`, learning loop. Present on both branches; unit-tested.

### 9.2 Checkpoint-only: remote control system

**`lib/features/remote/`** (14 files):

| File | Role |
|------|------|
| `remote_router.dart` | Command routing with rate limit, confirmation, block |
| `remote_policy.dart` | Policy gates |
| `remote_controller.dart` / `use_remote.dart` | State + hook |
| `remote_shell.dart`, `remote_orb.dart`, `remote_quick_panel.dart` | UI shell |
| `remote_commands.dart`, `remote_events.dart`, `remote_types.dart` | Command/event model |

Implemented MVP with in-memory rate limiter — **not on `main`**. Distinct from web `BlinkRemoteControl` in eye-earn-sparkle-archive.

### 9.3 Governance / evidence / POPS

- **`FINAL_ARCHITECTURE_INDEX.md`**, **`POPS_PHASE1_IMPLEMENTATION_PLAN.md`**, **`STAGE_25_POPS_LAUNCH_MVP.md`** — architecture docs at repo root.
- **`lib/pops/pops_integration_hooks.dart`** — wires scoring → decision → privacy receipt → `System.bus` events.
- **`services/api/`**, **`db/migrations/`** — full backend; **superset work continues on evidence-vault branch**.

---

## 10. Tests / docs / AI roadmap findings

### 10.1 Tests

| Branch | Test files | Character |
|--------|------------|-----------|
| Checkpoint | **60** | Heavy: `reward_engine_test`, `wallet_ledger_engine_test`, `trust_engine_test`, `pops_integration_hooks_test`, `simulation_layer_engine_test` |
| `main` | **26** | Focused: gaze pipeline, blink, calibration phase, zone dwell, vision bridge, frame codec |

Checkpoint **lacks** T-series unit tests for extracted modules (`zone_dwell_logic_test`, `pipeline_tracking_coordinator_test`, `vision_channel_bridge_test`, etc.) that exist on `main` and promoted runtime.

### 10.2 Docs

**Checkpoint adds (not on `main`):** `FINAL_ARCHITECTURE_INDEX.md`, `IMPLEMENTATION_CHECKLIST.md`, `PRIVACY_ARCHITECTURE.md`, `CONTRIBUTING.md`, platform README expansion.

**`main` adds (not on checkpoint):** entire **`ai/`** directory — `stabilization-roadmap.md`, `system-map.md`, `governance.md`, T-09/T-10 seam docs. Critical for ongoing ET maintenance.

### 10.3 AI roadmap

No `ai/` folder on checkpoint. T-series progress (T-08d complete, T-09/T-10 partial) is documented only on `main`.

---

## 11. Comparison to promoted i-project runtime

**Promoted path:** [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/) — sourced from `eye_tracking_app` `main` lineage + i-project additions.

| Capability | Promoted runtime | Checkpoint |
|------------|------------------|------------|
| T-series gaze modules | **Yes** | **No** |
| Blink EAR helpers + tests | **Yes** | **No** |
| Calibration phase module + tests | **Yes** | Inline only |
| Y-plane transport | **Flagged experimental** | Default integrated |
| Y8 native bridge | **Yes** (`MainActivity.kt`) | **Yes** |
| Segmentation perf tuning | **No** | **Yes** |
| Verification stability layer | **Yes** (i-project) | **No** |
| Proof packet v0 types | **Yes** (i-project) | **No** |
| Pipeline perf monitor HUD | **Yes** (i-project) | Inline perf only |
| POPS packet emission | **Types only; no emission** | Client hooks + simulation |
| Economy / wallet engines | **No** | **Yes** (simulation) |
| Remote control UI | **No** | **Yes** |
| Android smoke tested | **Yes** (SM-S928U) | **Not verified in i-project** |

**Verdict:** Promoted runtime **supersedes checkpoint for all gaze/blink/calibration/perception work**. Checkpoint contributes **native perf slice** and **platform simulation reference** only.

---

## 12. Files worth promoting

| Priority | Path | Target | Condition |
|----------|------|--------|-----------|
| **P0** | `android/.../VisionProcessor.kt` — segmentation cache + grid subsampling | Promoted `flutter-runtime/android/` | After SM-S928U A/B: landmark stability + fps vs current |
| **P1** | `lib/features/remote/remote_router.dart` + policy/types | Map only — product decision on remote UX | If blink-remote ships in Flutter |
| **P1** | `FINAL_ARCHITECTURE_INDEX.md`, `POPS_PHASE1_IMPLEMENTATION_PLAN.md` | `docs/technical/` reference copies | Cross-link with evidence-vault audit |
| **P2** | `lib/pops/pops_integration_hooks.dart` | Reconcile with `proof_packet_v0.dart` design | When wiring emission |
| **Defer** | Y8 `frame_codec.dart` default path | Already in `y_plane_frame_codec.dart` | Enable flag after device proof |
| **Defer** | Bulk `services/`, `db/`, economy `lib/*` | Use evidence-vault branch (+31 commits) | Not from checkpoint alone |

---

## 13. Files to preserve only

| Path | Reason |
|------|--------|
| Entire checkpoint tree at `78d8f68` | Git ref preserved in source repo — no copy needed |
| `lib/reward_engine.dart`, `lib/trust_engine.dart`, `lib/wallet_ledger_engine.dart` | Simulation — reconcile with archive Supabase, not promote as authority |
| `lib/adversarial_*.dart`, `lib/simulation_layer_engine.dart` | Red-team tooling |
| `android/gradlew.broken-backup` | Broken artifact |
| `services/`, `db/migrations/`, `apps/web/` | Backend reference — prefer evidence-vault hardening commits |
| Monolithic `lib/main.dart` (2,672 lines) | Historical; promoted modular `main` + features supersede |

---

## 14. Files to ignore

| Path | Reason |
|------|--------|
| `android/build/reports/problems/problems-report.html` | Build artifact |
| Duplicate platform docs already covered in evidence-vault audit | Avoid triple-counting |
| Checkpoint `test/reward_engine_test.dart` etc. | Test simulation engines not wired to product |
| `src/screens/studio/*` mock pipelines on checkpoint | Prototype — i-initial-structures + archive are canonical |
| Re-promoting inline `CalibrationPhase` from checkpoint `main.dart` | Superseded by extracted module |

---

## 15. Conflicts with current i-project implementation

| Conflict | Detail |
|----------|--------|
| **Canonical runtime source** | Promoted runtime follows `main` T-series; checkpoint would regress modularization |
| **Y-plane default vs flag** | Checkpoint forces Y8; i-project defaults JPEG with experimental opt-in |
| **POPS authority** | i-project docs define Proof Packet v0 + delayed validation; checkpoint client economy engines claim simulation-only but overlap narratively with archive Supabase |
| **Backend duplication** | Checkpoint `db/migrations/` vs `eye-earn-sparkle-archive/supabase/migrations/` — must diff before any SQL promote |
| **Verification stability** | i-project layer is local confidence bands; checkpoint `confidence_hud.dart` is debug overlay — different contracts |
| **Test count regression** | Promoting checkpoint tests would drop T-series coverage |

---

## 16. Promotion priority

### P0 — promote / reconcile immediately

1. **`VisionProcessor.kt` segmentation optimizations** — only native perf delta not already in promoted runtime; device A/B required before merge.

### P1 — preserve and map

1. **`lib/features/remote/*`** — map to product remote-control spec vs web `BlinkRemoteControl`.
2. **Platform architecture docs** at repo root — index in i-project; defer SQL/API to evidence-vault audit.
3. **`lib/pops/*`** — map hooks to Proof Packet v0 emission plan.

### P2 — archive

1. Full checkpoint platform tree (reference via git SHA `78d8f68`).
2. Client economy simulation engines.
3. Inline monolithic `main.dart` and generic `dwell_engine.dart`.

---

## 17. Exact recommended next action

1. **Do not promote checkpoint flutter-runtime wholesale.** Keep [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/) as canonical.
2. **Device A/B on SM-S928U:** promoted default JPEG vs Y-plane flag vs checkpoint-style native segmentation tuning — log `[frame_perf]` + landmark jitter per [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md).
3. **If segmentation A/B wins:** cherry-pick only `VisionProcessor.kt` `SEGMENT_EVERY_N_FRAMES` + `gridStride` hunk into promoted runtime.
4. **For POPS/backend:** continue from [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md) — do not re-audit 216 migrations from checkpoint alone.
5. **Next branch audit:** `eye_tracking_app/integration/studio-routing-audit`.

---

## Appendix A — Top-level checkpoint additions vs `main` (runtime-relevant)

```
android/gradlew.broken-backup
lib/dwell_engine.dart
lib/features/remote/*  (14 files)
lib/features/vision/frame_codec.dart  (Y8 default — differs from main)
lib/pops/*  (6 files)
lib/features/admin/admin_console_screen.dart
lib/features/debug/confidence_hud.dart
```

## Appendix B — `main`-only runtime files absent on checkpoint

```
lib/features/calibration/calibration_phase.dart
lib/features/camera/camera_session_controller.dart
lib/features/gaze/drift_adjusted_gaze.dart
lib/features/gaze/held_face_policy.dart
lib/features/gaze/pipeline_frame_confidence.dart
lib/features/gaze/pipeline_tracking_coordinator.dart
lib/features/intent/zone_dwell_logic.dart
lib/features/vision/frame_perf_metrics.dart
lib/features/vision/vision_channel_bridge.dart
lib/features/vision/vision_frame.dart
```

## Appendix C — i-project-only additions (neither branch)

```
lib/calibration/adaptive_calibration_profile.dart
lib/features/vision/y_plane_frame_codec.dart
lib/features/vision/runtime_transport_config.dart
lib/verification/verification_stability_layer.dart
lib/proof/proof_packet_v0.dart
lib/performance/pipeline_performance_monitor.dart
```

---

*Audit generated: 2026-05-20 — read-only inspection; no merges, no source-repo modifications, no builds*
