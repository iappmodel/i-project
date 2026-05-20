## Global conventions (Postgres / persistence)

When adding SQL schemas, migrations, or server-side persistence for this product, follow these norms so they stay consistent with canonical wire types in [`lib/canonical/build_spec_v01.dart`](lib/canonical/build_spec_v01.dart) and related engines.

### IDs

- Use **UUID** primary keys everywhere: `id uuid primary key default gen_random_uuid()` (requires `pgcrypto` or equivalent for `gen_random_uuid()`).

### Timestamps

- Every mutable table: `created_at timestamptz not null default now()`, `updated_at timestamptz` (maintain `updated_at` in application code or triggers as you prefer).
- **Immutable** append-only tables: include `created_at` as above; **omit** `updated_at`.

### Money

- **Never** use floating point for money.
- Store amounts as **integer minor units** (USD cents; ICOIN / VCOIN / RCOIN in their smallest on-ledger atomic units).
- Example: USD $1.25 → `125`.
- Column pattern: `amount_minor bigint not null`, `currency` constrained to the product enum (see below).

### Core currency enum

```sql
create type currency_code as enum (
  'USD',
  'ICOIN',
  'VCOIN',
  'RCOIN'
);
```

Wire strings match this enum (uppercase). Prefer `currency_code` columns typed to this enum rather than free-form `text` unless you have a deliberate escape hatch.

### Campaign budget accounts

- **Authoritative row:** `campaign_budget_accounts` (one row per campaign, `campaign_id` unique). Holds `funded_minor`, `reserved_minor`, `spent_minor`, `released_minor` with `reserved_minor + spent_minor <= funded_minor`.
- **Do not** compute reserve/spend/availability only from `campaigns` columns (e.g. `total_budget_minor`) in application or reporting code that drives economics; load or join the budget account for current caps and utilization. Campaign fields may remain for marketing/planning or back-office, but **money movement** reads and updates the budget account (or downstream ledger that reconciles to it).

## Economy / wallet invariants

- **Rule 2 — No manual balance edits.** Wallet balances (pending, available, locked, withdrawn, and coin buckets where applicable) are **never** assigned or incremented/decremented as free-form edits. They are **derived** from append-only ledger history (and the value-lot state that ledger entries produce). Admin or support corrections flow through **ledger events** (e.g. compensating entries), not in-place balance patches. Canonical implementation: [`lib/wallet_ledger_engine.dart`](lib/wallet_ledger_engine.dart) (`WalletBalance` via `balanceForWallet`). [`lib/reward_engine.dart`](lib/reward_engine.dart) `Wallet` mutations are a **legacy simulation aggregate** for that engine’s tests/demos; new work that needs Rule 2 compliance should apply outcomes through the wallet ledger (or issuance plans that downstream applies as ledger lines), not extend direct `Wallet` field edits.

- **Rule 6 — Admin actions are ledger events, not database hacks.** Every manual correction must be **auditable**: record intent and context in append-only admin surfaces (`AdminLedgerEvent`, `AdminAuditLogEntry`), and apply economic effects only as downstream **wallet ledger lines** (same spirit as Rule 2). The admin console does not patch balances or authoritative state in memory; settlement workers consume ledger kinds such as `manualBalanceAdjustment` as intent to post compensating entries. Canonical types and engine: [`lib/admin/admin_console_models.dart`](lib/admin/admin_console_models.dart), [`lib/admin/admin_console_engine.dart`](lib/admin/admin_console_engine.dart).

- **Rule 8 — Fraud systems can delay value, but not silently erase it.** Any **clawback**, **lock**, **hold**, or **rejection** must leave an **explicit, inspectable record**: machine-readable reason codes and/or append-only ledger lines — never a bare balance change with no provenance. **Canonical surfaces:** [`RewardIssuanceDecision`](lib/reward_issuance_engine.dart) always carries `rejectionReason` or `holdReason` on reject/hold; [`ValueLotEngine.clawBack`](lib/value_lot_engine.dart) requires a non-empty `reason` (stored on the lot); [`ValueLotEngine.lock`](lib/value_lot_engine.dart) / [`unlock`](lib/value_lot_engine.dart) stamp `lockReason` / `unlockReason` and timestamps in lot metadata; [`WalletLedgerEngine`](lib/wallet_ledger_engine.dart) records every bucket move via [`LedgerEntry`](lib/wallet_ledger_engine.dart) (e.g. `availableToLocked`). Legacy [`RewardEngine._rejectReward`](lib/reward_engine.dart) updates the linked `RewardEvent.status` — new paths should prefer issuance decisions + wallet ledger, not silent aggregate decrements alone.

- **Rule 4 — No withdrawal from pending value.** Only **available** (cleared) USD value may enter a withdrawal: pending must move to available first (e.g. `releasePendingToAvailable` / verification). Withdrawal holds debit **available** only (then locked while the payout completes). Canonical enforcement: [`lib/wallet_ledger_engine.dart`](lib/wallet_ledger_engine.dart) `WalletLedgerEngine.requestWithdrawal` (requires sufficient aggregate `WalletBalance.availableUsd`; FIFO slices only `ValueLot.availableUsd`). Legacy simulation: [`lib/reward_engine.dart`](lib/reward_engine.dart) `RewardEngine.requestWithdraw` checks `wallet.availableUsd` before debiting. [`lib/value_lot_engine.dart`](lib/value_lot_engine.dart) `withdrawAll` allows only `available` or `locked` lot state, not `pending`.

- **Rule 5 — Trust controls financial speed.** **Lower trust ⇒ longer settlement holds (payout delay), lower daily earn / withdrawal caps, and stricter gates** (additional verification, soft-flag review, or deny until cleared). Higher trust relaxes those knobs monotonically. Do not bypass trust for “faster money” in product or backend paths; speed is a function of [`TrustScoreLevel`](lib/trust_engine.dart) and related gates. Canonical mapping of delay and limits: `_snapshotLimits` in [`lib/trust_engine.dart`](lib/trust_engine.dart); withdrawal / verification strictness: `evaluateWithdrawalGate` and `WithdrawalGateDecision` in the same file.

- **Rule 22 — Do not let the frontend invent financial events (Step 2).** Untrusted clients may submit **only** attention lifecycle and runtime signal summaries as namespaced wire types: `attention.session.started`, `attention.session.completed`, `attention.session.abandoned`, and `attention.runtime_signal.sampled` (exact allowlist: [`ClientAttentionIngestAllowlistV01`](lib/canonical/client_attention_ingest_v01.dart)). **Backend / system code** must produce sealed verification and all money-adjacent events, including at minimum: `attention.verification.created`, `reward.decision.*`, `budget.reservation.*`, `wallet.value_lot.*`, `wallet.ledger_entry.*`, `trust.score.updated`, `fraud.flag.created`. Ingest HTTP or queue workers must validate with [`validateClientAttentionIngestEventType`](lib/canonical/client_attention_ingest_v01.dart) before accepting a client payload. Normative causal ordering reference: §18 comments in [`lib/canonical/build_spec_v01.dart`](lib/canonical/build_spec_v01.dart). When emitting [`WalletEvent`](lib/core/events/wallet_event.dart) / [`TrustEvent`](lib/core/events/trust_event.dart) / [`FraudEvent`](lib/core/events/fraud_event.dart) on [`EventBus`](lib/core/system.dart), use [`SystemEconomicsBroadcaster`](lib/core/system_economics_broadcaster.dart) from system or settlement code paths only — not from UI widgets.

- **Rule 28 — Single database transaction per money-adjacent unit of work.** On Postgres (or any ACID store), the following flows must commit **one** transaction each: if any statement fails, **rollback the whole unit** — no partial campaign holds, partial lots, or orphan ledger lines. In-app reference implementations (in-memory, sequential) live in [`lib/campaign_engine.dart`](lib/campaign_engine.dart) / [`lib/campaign_budget_reserve_engine.dart`](lib/campaign_budget_reserve_engine.dart) (reserves), [`lib/reward_issuance_engine.dart`](lib/reward_issuance_engine.dart) + [`lib/economy/post_attention_spine.dart`](lib/economy/post_attention_spine.dart) + [`lib/wallet_ledger_engine.dart`](lib/wallet_ledger_engine.dart) `issueCampaignReward` / `releasePendingToAvailable` (approve + mint + optional pending→available), [`lib/wallet_ledger_engine.dart`](lib/wallet_ledger_engine.dart) `_appendLedger` + lot mutations (every bucket change), [`WalletLedgerEngine.requestWithdrawal`](lib/wallet_ledger_engine.dart) (withdrawal row + all FIFO lot locks + ledger lines), [`WalletLedgerEngine.convertAvailableToNewLot`](lib/wallet_ledger_engine.dart) (source debit + destination lot + both ledger lines + conversion row), admin compensating flows (append-only admin intent/audit **and** all resulting ledger lines + lot updates in one txn per Rule 6), and reward clawback (lot state + compensating ledger lines + linked budget/campaign adjustments if applicable, per Rule 8). **General rule:** any update to `wallet_value_lot` bucket columns must land in the **same** transaction as the `wallet_ledger_entry` rows that explain the delta; `campaign_budget_accounts` / reservation rows must move in lockstep with their paired reservation or capture.

## Learned User Preferences

- When changing Android Gradle in this repo, keep valid Kotlin DSL in `android/app/build.gradle.kts` (for example `implementation("artifact:version")`), not Groovy `build.gradle` syntax.
- For camera/vision work: get preview, permissions, and builds working before layering more features; prefer `ResolutionPreset.medium` over `high` for the front `CameraController` unless profiling shows landmark or gaze quality needs the extra resolution.
- For dwell, zone selection, and intent triggers, require `FixationState.fixation` before advancing UI or firing actions (do not treat unstable or saccadic gaze as actionable).
- Prefer event-driven intent handling (`EventBus`/`IntentEngine`/`ActionEngine`) and avoid direct UI actions coupled to raw fixation conditionals in feature logic.
- For security/privacy guidance, user prefers exact click-by-click steps with no vagueness and explicit clarification of whether actions were chat/tool operations or terminal commands.
- Do not commit at the end of tasks unless explicitly approved; the phase deliverable is verified edits plus `flutter analyze` and `flutter test` results with a summary of changed files.
- Respect the explicit "do not change" fences the user sets when approving a phase (e.g., frame spacing, JPEG/bridge format, native inference behavior, safety/gaze/fixation semantics, and "do not touch Dart files" for Kotlin-only phases); do not broaden scope beyond the approved change.
- For UI mutations driven from camera/frame callbacks, `LayoutBuilder`, `CustomPaint`, or other mid-layout paths, route them through a single `_safeUiUpdate(VoidCallback)` helper that returns if `!mounted` and, when `SchedulerBinding.instance.schedulerPhase` is `persistentCallbacks`/`postFrameCallbacks`/`transientCallbacks`/`midFrameMicrotasks`, defers via `SchedulerBinding.instance.addPostFrameCallback`.
- Gate hot-path native logs (e.g., `IRIS` `Log.d` in `VisionProcessor.kt`) behind a debug flag and replace per-frame Dart `debugPrint` with once-per-second `frame_perf`-style summary logging.
- Block intent/action commits (`_selectZone`, blink-confirm, dwell-complete, tap/openZone, autonomous execution) when `TrackingState` (tracked via `TrackingEngine` in `lib/main.dart`) is non-tracking; still allow frame processing, valid gaze/pipeline updates, UI/debug status updates, and reset/recovery during non-tracking.
- When syncing or porting native changes between this repo and `~/Desktop/iTrack` (especially `VisionProcessor.kt`), show `git diff` first and do not overwrite or edit files until the user explicitly approves after reviewing the diff.
- For `services/api` Alphabet economy/security and P.O.P.S work, keep persistence in-memory for demo/dev flows until explicitly requested; keep notification delivery strictly explanatory (no reward/wallet/trust mutation from notification events), model P.O.P.S as multimodal presence verification (not eye-tracking-only), and default to privacy-preserving processing (no raw camera/audio/location storage or upload unless explicitly required; prefer local processing and derived features).

## Learned Workspace Facts

- Flutter uses `camera` and `permission_handler` (Dart runtime permission; `CAMERA` in `AndroidManifest.xml`; iOS/macOS `NSCameraUsageDescription` in `Info.plist`). `android/app/build.gradle.kts` targets current `camera_android` with `compileSdk = 36`, `ndkVersion` pinned to `27.0.12077973` (not `flutter.ndkVersion`), `minSdk = maxOf(flutter.minSdkVersion, 24)`, `versionCode`/`versionName` from the Flutter Gradle extension, and `com.google.mediapipe:tasks-vision:0.10.0`.
- `CameraController.startImageStream` is treated as Android/iOS-only in app code because the plugin can assert on other platforms; macOS desktop runs may use `flutter run -d macos` when no mobile device is attached.
- `android/app/src/main/assets` exists for bundled Android assets (for example ML models): `face_landmarker.task` and **`selfie_segmenter.tflite`** (MediaPipe image segmenter float16 bundle). Android loads the segmenter with **`ImageSegmenter.createFromOptions`** + **`ImageSegmenter.ImageSegmenterOptions`** (`setOutputCategoryMask(true)`, confidence masks off) and `BaseOptions.setModelAssetPath("selfie_segmenter.tflite")` — there is no `createFromFile` on the Tasks API. With a detected face, **`selfieQuality`** is the mean of `qualityScores` (or `-1`), and **`faceConfidence`** is the fraction of **category-mask** pixels equal to category **`1`** (person), via **`ByteBufferExtractor`** over `width * height` bytes (or `-1` if missing).
- Widget tests target the public root widget `EyeTrackingApp` in `lib/main.dart`. Android `MethodChannel('vision_channel')` handles `processFrame` with a **Map**: `format: y8` + tight Y-plane `bytes` + `width`/`height`/`rowStride` (YUV420 path, no Dart JPEG) or `format: jpeg` + `bytes` (BGRA8888 path, `BitmapFactory.decodeByteArray`). Legacy **raw `ByteArray`** JPEG is still accepted. YUV frames use the same max-edge downscale as the previous JPEG luma path (`_kVisionPipelineMaxEdge`).
- Flutter maps raw `gazeX` with `normalizeGazeX` in `lib/gaze_normalize.dart` as `(gazeX - gazeXNormMin) / (gazeXNormMax - gazeXNormMin)` using fixed bounds `gazeXNormMin` / `gazeXNormMax` (0.076 / 0.132); `getGazeZone` in `lib/gaze_zone.dart` uses that normalized value: **LEFT** if `< 0.33`, **RIGHT** if `> 0.66`, else **CENTER**.
- Flutter `BlinkDetector` (`lib/blink_detector.dart`) counts a blink on an EAR **down-cross**: previous frame `> 0.12` and current `< 0.08`, with **250 ms** debounce between increments; `isBlinking` is true while `ear < 0.08` (native `VisionProcessor.kt` may use different blink framing). `lib/head_pitch_zone.dart` maps native `headPitch` to **DOWN** if `pitch > 0.2`, **UP** if `pitch < -0.2`, else `null` (mid band).
- In `VisionProcessor.kt`, iris rings use indices **474–477** (left) and **469–472** (right); gaze uses per-eye **(iris centroid − eye contour centroid) / `distance(eyeContour[0], eyeContour[8])`**, then **average of left and right** when both valid, **× 8** on X and **× 4** on Y after averaging (`8.0f` / `4.0f`); one eye uses the same factors on that eye’s norm. Small combined gaze components are zeroed by a symmetric dead zone (`GAZE_DEAD_ZONE`) before EMA; channel values use EMA (`GAZE_XY_SMOOTH`).
- `GazePipeline` (`lib/engine/gaze_pipeline.dart`) returns only `x`, `y`, `quality`, `varX`, and `varY` when input is valid; invalid or non-finite gaze yields `{ valid: false }` only (no fixation state in the map). `lib/main.dart` centralizes fixation via `GazeFixation.update` on `GazeTraceBuffer` with `varX` / `varY` from the pipeline result.
- Intent/action API: `IntentAction` carries `UIActionType`, `targetZone` (String), `confidence`, and `sourceTimestamp`; use `FixationState` (not `EyeMotionState`) for gaze-motion naming. `ActionPipelineKernel.evaluateSafety` + `KernelEvaluationInput` are the real entry points (not `evaluate`/`ActionRequest`), with additional governance and safety layers: `GovernanceKernel.approve` and `SafetyKernel.finalGate`/`AutonomousExecutionKernel.tryExecute` gate autonomous actions using confidence (>0.85), risk caps (<0.25 / <0.2 for some heuristics), fixation + dwell (`FixationState.fixation` with `dwellProgress > 0.8`), rate limiting (`timeSinceLastActionMs > 600`, `recentActionsLast1s < 3`), reversibility flags, and an `AutonomousExecutionKernel.emergencyKillSwitch` before invoking UI actions.
- `GazeZoneButtons` (`lib/gaze_zone_buttons.dart`): avoid `StackFit.expand` (or an effectively expanding `Stack`) when the parent allows unbounded max height (`0.0<=h<=Infinity`); it yields non-finite `Stack` size and triggers `!_debugDoingThisLayout` / hit-test failures. Prefer a finite height (`SizedBox`/`ConstrainedBox`), `StackFit.loose` with intrinsically sized children, or an outer bounded parent while preserving zone button visuals.
- `~/Desktop/iTrack` is the authoritative working tree for this project's native/Kotlin changes (e.g., `android/app/src/main/java/com/example/eye_tracking_app/VisionProcessor.kt`); the current iTrack `selfieQualityMean` workaround is the reference implementation for `selfieQuality` and must be preserved when editing that file.
- Alphabet provider payout and reconciliation HTTP surfaces live in **`services/api`** (Express): **`POST /v1/webhooks/alphabet/provider/:provider`** is wired on a router mounted **before** `express.json()` and uses **`express.text`** so the payload stays a **raw string for HMAC** (`provider-webhook-verifier`). Vitest in `services/api` expects env vars aligned with **`tests/setup/env.ts`**; full `pnpm test` may still need `.env.test` / complete env.

## Autonomous agent approval gates

Use this section so coding agents can run **autonomously** on routine work and only pause for **human approval** on high-impact changes.

### Auto-allowed (no extra approval)

- Dart-only refactors that preserve public behavior and keep `flutter analyze` / `flutter test` green.
- New or expanded **unit tests** and **documentation** (`README.md`, `docs/`, comments that do not change semantics).
- Debug-only logging gated behind `kDebugMode` (or equivalent) where it does not flood release builds.
- CI workflow updates that only run analyze/test (no secret exfiltration, no third-party publish steps).

### Stop and wait for explicit human approval

1. **Native / Kotlin** — Any edit to `VisionProcessor.kt`, Gradle/NDK/manifest camera or vision permissions, MediaPipe model swap, or `MethodChannel` payload shape. Per workspace rule: show `git diff` first; do not overwrite until the user approves.
2. **Safety and gaze semantics** — Changes to fixation requirements, dwell thresholds, `TrackingState` commit blocking, `GovernanceKernel` / `SafetyKernel` / `AutonomousExecutionKernel` thresholds or gate ordering when they alter **product meaning** (not mere renames). Prefer a short rationale + test updates in the same change.
3. **PII, storage, and compliance** — Session export, persistent logs of face/gaze, cloud upload, new Android/iOS privacy strings beyond camera, analytics hooks, or anything that stores biometric-adjacent data off-device.
4. **Secrets and credentials** — No new API keys in repo; no `flutter run` instructions that embed tokens. CI must not print secrets.

### Suggested agent workflow

1. Read `AGENTS.md` and run `flutter analyze` + `flutter test` before claiming done.
2. If the task touches any **Stop** row, summarize the diff and ask once; otherwise ship the PR/branch without blocking on trivia.
