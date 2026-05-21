# Eye-Earn Sparkle v2 — Unified Vision Archive Branch Audit

**Date:** 2026-05-20  
**Audit type:** Read-only branch/repo recovery — no merges, no source-repo modifications  
**Source repo:** `~/Desktop/i-project-rescue/github-source-repos/eye-earn-sparkle-v2`  
**Target branch:** `origin/archive/unified-vision-2025-02-07`  
**Comparison base:** `origin/main` (`ec2ba2d` on `main`; merge base `5919cbf`)  
**Integration repo:** `~/Desktop/i-project-rescue/i_project_migration_archive`  
**Related docs:** [`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md), [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md), [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md), [`PROOF_PACKET_SCHEMA_V0.md`](PROOF_PACKET_SCHEMA_V0.md), [`MULTI_REPO_SYSTEM_RECOVERY_REPORT.md`](MULTI_REPO_SYSTEM_RECOVERY_REPORT.md)

---

## 1. Executive verdict

**The branch is a real Feb 2026 platform + vision milestone snapshot — not a prototype branch — but it is structurally stale relative to `eye-earn-sparkle-archive/codex/vision-unified-pipeline` for web vision promotion.**

`archive/unified-vision-2025-02-07` captures the **first full web vision stack** in the v2 repo (`useVisionEngine`, `VisionContext`, RC/attention coexistence, skin-tone fallback, gaze-backend bridge) plus a **complete `attention_mediapipe` Flutter plugin** and **Feb 18 wallet/attention-reward hardening** migrations. Commit `5a5c4f6` (Feb 21) explicitly archives “unified vision merge + gaze backends + face detection fixes + audit docs.”

**What is implemented (code, not docs):**

| System | Status |
|--------|--------|
| Web MediaPipe vision engine (`useVisionEngine`, worker offload) | **Implemented** — ~1,004 lines, new from merge base |
| Shared camera / RC ↔ attention handoff (`VisionContext`, `VisionStreamContext`) | **Implemented** |
| Promo attention scoring + `validate-attention` sample export | **Implemented** |
| Blink/gaze remote control + target overlay | **Implemented** |
| Pluggable gaze backends (GazeCloud, WebGazer) + `useGazeBackendBridge` | **Implemented** (commit `5a5c4f6`) |
| Skin-tone fallback when MediaPipe fails | **Implemented** |
| `attention_mediapipe` native plugin (Android Kotlin + iOS Swift, OpenCV head pose) | **Implemented** — standalone; **not wired into web `src/`** |
| Wallet ledger + 2-step attention reward + rate-limit idempotency (SQL) | **Implemented** (commit `f46b23e`) |
| Hardened `validate-attention` + `issue-reward` edge functions | **Implemented** |

**What is NOT on this branch (strict):**

| Gap | Notes |
|-----|-------|
| `VisionCalibrationProfile` v2 + `UnifiedVisionCalibrationWizard` | **Absent** — pre-unification offset/scale calibration only |
| Client `livenessScore` / `LOW_LIVENESS` / hand fusion | **Absent** — 0 hits for `livenessScore`, `HandLandmarker` |
| POPS / Proof Packet v0 | **Absent** — 0 references |
| Server-side liveness / anti-spoof | **`validate-attention` unchanged** for liveness fields |
| Proof emission in Flutter | Plugin emits `AttentionSample` events only |

**Relative to `eye-earn-sparkle-archive/codex/vision-unified-pipeline`:** That branch **supersedes this snapshot for web vision promotion** (March 2026 calibration unification, liveness heuristic, hand tracking). This v2 archive branch is the **historical baseline** that documents *why* unification was needed (`docs/EYE_TRACKING_FULL_AUDIT.md`, `REMOTE_CONTROL` audits) and holds **native plugin source** that v2 `main` no longer contains.

**Relative to v2 `main`:** `main` is **not a superset** — it **lacks** `useVisionEngine.ts`, `VisionContext`, and full `attention_mediapipe` sources (only build artifacts). `main` adds **AI edge functions** and partial `src/lib/gaze/*` adapters without the vision engine that consumes them.

**Relative to canonical i-project:** Promoted [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/) remains the **authoritative native runtime** (`VisionProcessor.kt` ~893 lines, governance, VSL, `proof_packet_v0.dart`). **`attention_mediapipe` was deliberately excluded** from flutter-runtime promotion ([`PROMOTION_MANIFEST.md`](../../integrations/eye-tracking/flutter-runtime/PROMOTION_MANIFEST.md)). Canonical `app/` is a **Loop 1 demo spine** with no web vision code — **no merge conflict**, only product-path divergence.

**Recommendation:** **Do not promote this branch wholesale.** Use it as a **reference snapshot** and for **`attention_mediapipe` diff vs flutter-runtime**. For web vision, **cherry-pick from `eye-earn-sparkle-archive/codex/vision-unified-pipeline` commit `22cabd3`** per [`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md). Reconcile v2 `main` gaze-adapter-only state before any Capacitor shell work.

---

## 2. Branch metadata

| Field | Value |
|-------|--------|
| **Branch name** | `archive/unified-vision-2025-02-07` |
| **Remote ref** | `remotes/origin/archive/unified-vision-2025-02-07` |
| **HEAD** | `5a5c4f6` — *Archive: unified vision merge + gaze backends + face detection fixes + audit docs* (2026-02-21) |
| **Merge base with `main`** | `5919cbf` — *Add Targets editor and overlay* (2026-02-07) |
| **Commits ahead of merge base (branch-only)** | 3 |
| **Commits on `main` not on branch** | 1 (`ec2ba2d` — AI edge functions, media bucket, gaze adapter files) |
| **`git rev-list --left-right main...archive`** | `1` (main-only) / `3` (archive-only) |
| **Archive-only diff (`5919cbf..archive`)** | **459 files**, **84,281 insertions**, **11,360 deletions** |
| **`main`-only diff (`5919cbf..main`)** | **46 files**, **12,930 insertions** (AI functions + config; no vision engine) |

### Commit breakdown (archive-only)

| Commit | Date | Scope | Scale |
|--------|------|-------|-------|
| `6741ba9` | 2026-02-17 | Attention threshold slider, reward pass override, Media Settings, **bulk platform import** | **401 files**, ~68k insertions |
| `f46b23e` | 2026-02-18 | VisionContext merge, skin-tone fallback, eye-tracking improvements, reward/tip, **wallet SQL** | **96 files**, ~6.5k insertions |
| `5a5c4f6` | 2026-02-21 | Gaze backends (GazeCloud/WebGazer), `useGazeBackendBridge`, audit docs, boot diagnostics | **35 files**, ~10.8k insertions (incl. `pnpm-lock.yaml`) |

### Relation to `main`

The branches **diverged** after `5919cbf`. The archive branch is **not** fast-forwardable from current `main` without reconciling ~459 files vs `main`’s AI-function delta. Treat them as **parallel evolution lines**, not “archive ⊂ main.”

---

## 3. High-value systems found

| System | Location | Implementation | Authoritative for payout? |
|--------|----------|----------------|---------------------------|
| **Central web vision engine** | `src/hooks/useVisionEngine.ts` | **Implemented** — face_mesh / face_landmarker, EAR, gaze, blink, worker | No — signal producer |
| **Vision camera orchestration** | `src/contexts/VisionContext.tsx`, `VisionStreamContext.tsx` | **Implemented** — single camera, RC broadcast, skin-tone fallback | No |
| **Promo attention path** | `src/hooks/useEyeTracking.ts`, `src/lib/attentionScoring.ts` | **Implemented** — presets, flags, samples → API | Partial — server recomputes |
| **Attention validation API** | `supabase/functions/validate-attention/index.ts` | **Implemented** — server score from samples; session TTL | **Yes** for promo sessions |
| **Reward issuance** | `supabase/functions/issue-reward/index.ts` | **Implemented** — atomic caps, session redemption | **Yes** |
| **Wallet ledger (SQL)** | `supabase/migrations/20260218100000_wallet_ledger.sql` (+ audit, rate-limit) | **Implemented** | **Yes** (when migrated) |
| **2-step attention reward** | `supabase/migrations/20260218110000_attention_reward_2step.sql` | **Implemented** | **Yes** |
| **Blink remote control** | `src/hooks/useBlinkRemoteControl.ts`, `BlinkRemoteControl.tsx` | **Implemented** | No — UI |
| **Gaze backend adapters** | `src/lib/gaze/*`, `useGazeBackendBridge.ts` | **Implemented** | No — optional fallback |
| **Native attention plugin** | `attention_mediapipe/` | **Implemented** — on-device Face Landmarker + calibration API | Parallel stack; not wired to web |
| **Cash eligibility gate** | `src/constants/attentionPass.ts` | **Implemented** — Icoin only when `source === 'vision'` | Client policy hint |
| **Platform audit snapshot** | `PLATFORM_AUDIT_REPORT.md`, `docs/EYE_TRACKING_FULL_AUDIT.md` | **Documentation** — Feb 7–21 2026 state | Reference |

---

## 4. `attention_mediapipe` findings

### 4.1 Presence and scope

On **`archive/unified-vision-2025-02-07`**, `attention_mediapipe/` is a **full Flutter plugin package** (~90+ source files including `face_landmarker.task` assets, Android Kotlin, iOS Swift/ObjC++, example app).

On **v2 `main`**, the same path contains **only build artifacts** (`.dart_tool/`, `.iml`, `gradle-wrapper.jar`) — **249 paths exist on archive but not on `main`**. The plugin source was **dropped or never merged** to `main`.

### 4.2 Implementation (native — **real code**)

| Component | Assessment |
|-----------|------------|
| `AttentionMediapipePlugin.kt` (~610 lines) | **Implemented** — CameraX, MediaPipe FaceLandmarker, OpenCV solvePnP head pose, EMA gaze smoothing, encrypted baseline storage, calibration collect/finish |
| `AttentionMediapipePlugin.swift` / `AMPHeadPoseEstimator` | **Implemented** — iOS parity |
| `lib/attention_mediapipe.dart` | **Implemented** — `AttentionSample` stream, `start`/`stop`/`startCalibration`/`finishCalibration` |
| Example + integration tests | **Present** — plugin scaffold tests; not production E2E for [ i ] |

### 4.3 Integration status

**No references** from web `src/` (Capacitor/React) to `attention_mediapipe` in this repo — the plugin is a **standalone parallel mobile path**, not bridged to `useEyeTracking` or Proof Packet v0.

### 4.4 Comparison to promoted flutter-runtime

| Aspect | `attention_mediapipe` (v2 archive) | `flutter-runtime` (i-project) |
|--------|-----------------------------------|------------------------------|
| Native vision | MediaPipe Face Landmarker plugin | `VisionProcessor.kt` + intent/governance kernels |
| Anti-spoof | Not observed in plugin grep | `fakeStaticGaze`, `fakeNoBlink`, `likelyFake` |
| Proof / POPS | None | `proof_packet_v0.dart` (schema only) |
| Promotion status | **Not promoted** per manifest | **Canonical** |

**Verdict:** Preserve for **diff/archaeology**; do **not** promote into flutter-runtime without a dedicated merge design. May overlap functionally with `VisionProcessor.kt` (~893 lines).

---

## 5. Unified vision architecture findings

The branch name reflects **client-side unification of remote control + promo attention + shared MediaPipe camera** — not cross-repo Flutter/Web unification.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser / Capacitor WebView                  │
├─────────────────────────────────────────────────────────────────┤
│  VisionContext (+ optional VisionStreamContext)                  │
│    • single getUserMedia when RC + attention both need vision    │
│    • skin-tone fallback after VISION_FALLBACK_MS (5s)            │
├─────────────────────────────────────────────────────────────────┤
│  useVisionEngine (face_mesh | face_landmarker)                   │
│    • visionSample.worker / eyeTracking.worker offload            │
│    • gaze, EAR, blink, head pose                                 │
├──────────────┬──────────────────────────────────────────────────┤
│ useBlink     │ useEyeTracking → attentionScoring → samples[]     │
│ RemoteControl│   → validate-attention → attentionSessionId      │
│              │ useGazeBackendBridge (when RC off, backend ≠ MP)   │
└──────────────┴──────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Supabase: validate-attention → issue-reward → wallet ledger     │
└─────────────────────────────────────────────────────────────────┘

Parallel (not integrated):
  attention_mediapipe/ → native Flutter plugin (separate product path)
  i-project flutter-runtime → proof schema + VSL (no emission)
```

### Documented pre-unification gaps (still true on this branch)

`docs/EYE_TRACKING_FULL_AUDIT.md` (Feb 7, 2025 header — content describes Feb 2026 tree) notes:

- `EyeBlinkCalibration` did not feed runtime gaze offset/scale consistently.
- `attentionThreshold` slider stored but **not used in scoring** (row 30 in audit table).
- RC-first camera ownership and collision handling — **implemented**.

**`codex/vision-unified-pipeline` addresses the calibration disconnect** this branch documents but does not fix.

---

## 6. Web gaze / blink / liveness findings

### 6.1 Implemented

| Capability | Mechanism | Maturity |
|------------|-----------|----------|
| Iris gaze from landmarks | MediaPipe 468–477, smoothing | **Working** |
| Blink / EAR baseline | Configurable thresholds, worker | **Working** |
| Head yaw/pitch | Landmark geometry | **Working** |
| RC dwell / blink patterns | `useBlinkRemoteControl`, targets overlay | **Working** |
| GazeCloud / WebGazer fallback | `useGazeBackendBridge` → `visionEngineSample` events | **Implemented** — privacy tradeoff documented in plan |
| Skin-tone fallback | `skinToneFallback.ts` when vision fails | **Implemented** — **not** liveness |

### 6.2 Not implemented

| Capability | Branch reality |
|------------|----------------|
| Client liveness score | **No** `livenessScore` in `useVisionEngine` |
| `LOW_LIVENESS` / spoof gating | **No** — only `NO_FACE`, `EYES_CLOSED`, `LOOK_AWAY`, `BAD_POSE` |
| Hand tracking / gesture fusion | **No** `HandLandmarker` |
| Server liveness | **`validate-attention`** has no liveness fields |

### 6.3 Documentation vs code

| Artifact | Type |
|----------|------|
| `docs/EYE_TRACKING_FULL_AUDIT.md` | **Audit** — accurate for this branch; calibration gap noted |
| `docs/GAZE_BACKEND_UPGRADE_PLAN.md` | **Plan** — GazeCloud/WebGazer evaluation; adapters added in `5a5c4f6` |
| `docs/EYE_TRACKING_REMOTE_CONTROL_FULL_AUDIT_FOR_CHATGPT.md` | **Export doc** |
| `PLATFORM_AUDIT_REPORT.md` | **Platform inventory** — archive-only file |

---

## 7. Calibration findings

| Layer | Implementation |
|-------|----------------|
| **Web blink/gaze calibration** | `EyeBlinkCalibration`, `calibration.service.ts` — per-device `CalibrationData` (offsetX/Y, scaleX/Y) in Supabase `profiles.calibration_data` |
| **Native plugin calibration** | `startCalibration` / `finishCalibration` on `AttentionMediapipe` — encrypted baselines on device |
| **Unified profile v2 + affine wizard** | **Not present** — only on `eye-earn-sparkle-archive/codex/vision-unified-pipeline` |

**Strict assessment:** Calibration is **implemented but fragmented** across web manual flows and native plugin baselines, matching the gap analysis in archive docs — **not** the unified `VisionCalibrationProfile` system.

---

## 8. Attention scoring findings

### 8.1 Client (implemented)

- `src/lib/attentionScoring.ts` — time-weighted ledger, elliptical gaze zone, EMA (~154 lines on branch delta).
- `src/constants/attention.ts` — strict / normal / relaxed presets.
- `src/constants/attentionPass.ts` — pass threshold from preset; **cash (Icoin) only if `source === 'vision'`** (excludes skin-tone fallback).

### 8.2 Server (implemented, authoritative)

`validate-attention`:

- Recomputes `score100` from `samples[]`; **rejects client-supplied scores**.
- `ATTENTIVE_THRESHOLD = 0.6` per sample.
- Writes `attention_sessions` server-side; returns `attentionSessionId` when valid.

### 8.3 i-project VSL mapping

Same gap as vision-unified-pipeline audit: web presets ≠ [`VERIFICATION_STABILITY_LAYER_V1.md`](VERIFICATION_STABILITY_LAYER_V1.md) bands — requires explicit mapping before Proof Packet v0 `eyeTracking` section.

---

## 9. POPS / proof / validation findings

| Term | Hits on branch | Assessment |
|------|----------------|------------|
| POPS | **0** | Not implemented |
| ProofPacket / proof_packet | **0** in app src | Schema exists only in i-project docs + Dart types |
| verification | `useAttentionVerification`, `validate-attention` | Promo attention only |
| evidence | Admin/evidence vault | See evidence-vault audit (Flutter/backend repo) |
| session | `attentionSessionId` flow | Server session, not proof packet |

**Validation path that exists:**

```
Watch promo → useEyeTracking → samples → validate-attention → issue-reward → wallet ledger
```

This is **instant promo settlement**, not POPS delayed multi-signal review per [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md).

**Backend POPS reference** remains `eye_tracking_app/feature/evidence-vault-v2-hardening` (`services/api/src/pops/`) — reconcile separately.

---

## 10. Reward / wallet / feed implications

### 10.1 Wallet / reward (commit `f46b23e` — **implemented SQL + functions**)

| Artifact | Role |
|----------|------|
| `20260218100000_wallet_ledger.sql` | Ledger foundation |
| `20260218110000_attention_reward_2step.sql` | Two-step attention reward |
| `20260218120000_wallet_ledger_audit.sql` | Audit trail |
| `20260218130000_reward_rate_limit_idempotency.sql` | Rate limits |
| `issue-reward/index.ts` | Major hardening (+656 lines delta vs base) |

**Note:** `eye-earn-sparkle-archive` working tree has similarly dated migrations (`20260218100002_wallet_ledger.sql`, etc.) — filenames differ slightly; **diff before promote** to avoid duplicate migration IDs.

### 10.2 Feed

Feed hooks (`useMainFeed`, `usePromoFeed`, etc.) are present as part of bulk platform import — **no vision-specific feed algorithm** on this branch beyond attention-gated promo rewards.

### 10.3 v2 `main` divergence

`main` adds AI feed curation functions (`ai-feed-curator`, etc.) **without** the vision engine — risk of building AI-on-feed while attention verification stack lives only on archive branch.

---

## 11. Comparison to `eye-earn-sparkle-archive/codex/vision-unified-pipeline`

| Dimension | v2 `archive/unified-vision-2025-02-07` | `codex/vision-unified-pipeline` |
|-----------|----------------------------------------|--------------------------------|
| **Date** | Feb 17–21, 2026 | Mar 7–8, 2026 |
| **Repo** | `eye-earn-sparkle-v2` | `eye-earn-sparkle-archive` |
| **`useVisionEngine`** | ~1,004 lines, **no liveness/hand** | +491 lines: liveness, HandLandmarker, command fusion |
| **Calibration** | Legacy offset/scale + docs noting gap | `visionCalibration/profile.ts` v2 + wizard |
| **Gaze adapters** | **Yes** (`5a5c4f6`) | **Yes** (`useGazeBackendBridge` on branch) |
| **`attention_mediapipe`** | **Full plugin source** | On `main` tree, **unchanged** on vision branch |
| **Investor demo** | Not on this branch | Bundled in commit `0b260c6` (separate concern) |
| **Wallet SQL** | Feb 18 migrations on branch | Broader platform on archive `main` |

**Supersession rule:**

| Layer | Winner |
|-------|--------|
| **Web vision promotion** | **`codex/vision-unified-pipeline` supersedes** this v2 archive branch |
| **Historical context / audits** | **This branch preserves** Feb 2026 narrative + `PLATFORM_AUDIT_REPORT.md` |
| **`attention_mediapipe` source in v2 repo** | **This branch only** — neither branch supersedes the other vs flutter-runtime without diff |
| **v2 `main` gaze adapters** | **Complements** archive branch if reconciled — adapters without engine are incomplete |

---

## 12. Files worth promoting

| Priority | Path | Why |
|----------|------|-----|
| **Defer web vision** | `src/hooks/useVisionEngine.ts`, `VisionContext.tsx`, `useEyeTracking.ts` | Promote from **`codex/vision-unified-pipeline`** instead (strict superset for liveness/calibration) |
| **P1** | `attention_mediapipe/` (full tree) | Copy to `integrations/eye-tracking/source-runtime-candidates/` for diff vs flutter-runtime — **not** merge blindly |
| **P1** | `supabase/functions/validate-attention/index.ts` | If migration archive lacks Feb 18 hardening — diff against `eye-earn-sparkle-archive` first |
| **P1** | `supabase/migrations/202602181*.sql` | Wallet/attention reward — diff IDs vs archive before `app/supabase/migrations/` |
| **P2** | `src/lib/gaze/*`, `useGazeBackendBridge.ts` | Only if not already taken from vision-unified-pipeline |
| **P2** | `src/constants/attentionPass.ts` | Cash-eligibility policy — map to product rules |

---

## 13. Files to preserve only

| Path | Reason |
|------|--------|
| `PLATFORM_AUDIT_REPORT.md` | Feb 7, 2025 platform inventory — not on v2 `main` |
| `docs/EYE_TRACKING_FULL_AUDIT.md` | Pre-unification gap list |
| `docs/GAZE_BACKEND_UPGRADE_PLAN.md` | Adapter decision record |
| `docs/EYE_TRACKING_REMOTE_CONTROL_*.md` | ChatGPT audit exports |
| `attention_mediapipe/example/` | Plugin demo — not production shell |
| `pnpm-lock.yaml` in commit `5a5c4f6` | Lockfile churn — do not promote |

---

## 14. Files to ignore

| Path | Reason |
|------|--------|
| Bulk import churn from `6741ba9` (~401 files) | Platform snapshot — promote via **`eye-earn-sparkle-archive`** Tier-1 list, not v2 duplicate |
| `dev-dist/`, `public/boot-diagnostics.js` | Dev/PWA tooling |
| v2 `main` AI functions without vision | Incomplete line — not a vision recovery target |
| Investor/demo paths | Not on this branch |
| `attention_mediapipe` `.metadata`, example assets | Scaffold noise |

---

## 15. Conflicts with current i-project implementation

| Conflict | Detail | Resolution |
|----------|--------|------------|
| **Dual native runtimes** | `attention_mediapipe` vs promoted `flutter-runtime` | Diff first; single canonical native path |
| **Web vs Flutter proof** | i-project `proof_packet_v0.dart` — no web emission | Flutter emission P0; web samples optional later |
| **No web code in `app/`** | Migration archive `app/` is demo spine | No file conflict — architecture choice |
| **Instant vs delayed validation** | Branch uses immediate `validate-attention` → `issue-reward` | Align with POPS pending UX before production |
| **Promoting wrong branch** | v2 archive lacks liveness/unified calibration | Use **`codex/vision-unified-pipeline`** for web |
| **v2 `main` split brain** | AI + gaze adapters without `useVisionEngine` | Reconcile or branch from archive snapshot |

---

## 16. Promotion priority

### P0 — promote / reconcile immediately

1. **Do not promote web vision from this branch** — use [`VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md`](VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md) §10 (`22cabd3` file list) instead.
2. **Run `attention_mediapipe` vs `flutter-runtime` diff`** — decide keep plugin, extract algorithms, or archive only (1–2 hour targeted diff).
3. **Diff wallet migrations** vs `eye-earn-sparkle-archive/supabase/migrations/202602181*.sql` before any SQL promote to `app/`.

### P1 — preserve and map

1. Full branch snapshot reference in integration docs (this audit).
2. `attentionPass.ts` cash-eligibility rules → product spec for Icoin vs Vicoin.
3. Gaze backend policy (GazeCloud server-side vs on-device MediaPipe default).
4. Reconcile v2 `main` (`ec2ba2d`) with archive branch before Capacitor work.

### P2 — archive

1. Bulk `6741ba9` platform import as historical state.
2. ChatGPT audit markdown exports.
3. Plugin example apps and binary `face_landmarker.task` duplicates (store once in candidates).

---

## 17. Exact recommended next action

1. **Mark this audit complete** — update [`MULTI_REPO_SYSTEM_RECOVERY_REPORT.md`](MULTI_REPO_SYSTEM_RECOVERY_REPORT.md) next target to `eye_tracking_app/checkpoint/pre-composer-cleanup`.

2. **Web vision:** Cherry-pick **`eye-earn-sparkle-archive` / `codex/vision-unified-pipeline` commit `22cabd3`** only — treat v2 `archive/unified-vision-2025-02-07` as **read-only baseline**, not promotion source.

3. **Native:** Execute **`attention_mediapipe` ↔ flutter-runtime** comparison doc (or extend [`EYE_TRACKING_RUNTIME_RECOVERY_REPORT.md`](EYE_TRACKING_RUNTIME_RECOVERY_REPORT.md)) — plugin is ~610-line Kotlin vs ~893-line `VisionProcessor.kt`.

4. **v2 repo hygiene:** Document that **`main` dropped the vision engine** — any team using v2 should branch from `archive/unified-vision-2025-02-07` or merge archive vision + `main` AI functions explicitly.

5. **Proof Packet v0:** Continue emission work in **flutter-runtime** — this branch does not unblock it.

---

## Appendix A — Keyword search summary

Searched `origin/archive/unified-vision-2025-02-07` tree (excluding `node_modules`):

| Term | Approx hits | Notes |
|------|-------------|-------|
| vision | 723 | Broad — components, docs, hooks |
| mediapipe | 218 | Web + plugin |
| unified | 19 | Branch/docs naming |
| liveness | 10 | **Not** `livenessScore` system — stray/doc mentions |
| spoof / anti-spoof | 0 | |
| POPS / ProofPacket | 0 | |
| calibration | Many | Web + native plugin |
| gaze | Many | Engine + adapters |
| blink | Many | RC + EAR |
| hand | Low | No HandLandmarker |
| wallet / reward / feed | Many | Platform + SQL |
| session | Many | `attention_sessions` |
| evidence | 0 in web src | |

---

## Appendix B — Top source paths discovered

1. `src/hooks/useVisionEngine.ts` — web MediaPipe core  
2. `src/hooks/useEyeTracking.ts` — promo attention orchestration  
3. `attention_mediapipe/android/.../AttentionMediapipePlugin.kt` — native parallel runtime  
4. `src/contexts/VisionContext.tsx` — shared camera / RC handoff  
5. `supabase/functions/validate-attention/index.ts` — server-authoritative scoring  

---

*Audit generated: 2026-05-20 — read-only; no merges, no source-repo modifications, no deletions*
