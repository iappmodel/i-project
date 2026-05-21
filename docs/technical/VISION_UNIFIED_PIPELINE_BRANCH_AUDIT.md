# Vision Unified Pipeline Branch Audit

**Date:** 2026-05-20  
**Audit type:** Read-only branch recovery — no merges, no source-repo modifications  
**Source repo:** `~/Desktop/i-project-rescue/github-source-repos/eye-earn-sparkle-archive`  
**Target branch:** `origin/codex/vision-unified-pipeline`  
**Comparison base:** `origin/main` (`b041361`)  
**Integration repo:** `~/Desktop/i-project-rescue/i_project_migration_archive`  
**Related docs:** [`MULTI_REPO_SYSTEM_RECOVERY_REPORT.md`](MULTI_REPO_SYSTEM_RECOVERY_REPORT.md), [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md), [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md), [`PROOF_PACKET_SCHEMA_V0.md`](PROOF_PACKET_SCHEMA_V0.md), [`VERIFICATION_STABILITY_LAYER_V1.md`](VERIFICATION_STABILITY_LAYER_V1.md)

---

## 1. Executive verdict

**The branch delivers real, implemented web vision unification — but only as a focused client-side delta, not a full “unified pipeline” platform.**

`codex/vision-unified-pipeline` is **2 commits ahead of `main`, 0 behind** (~44 files, ~3,462 insertions). The vision work is concentrated in commit `22cabd3` (13 files, ~1,486 insertions). It closes the **calibration disconnect** documented in the archive’s own [`REMOTE_CONTROL_AUDIT.md`](../../github-source-repos/eye-earn-sparkle-archive/docs/REMOTE_CONTROL_AUDIT.md): a single `VisionCalibrationProfile` v2, a `UnifiedVisionCalibrationWizard`, and wiring through remote control, attention tracking, and Supabase profile persistence.

**What is implemented (code, not docs):**

| System | Status |
|--------|--------|
| Unified gaze calibration profile + affine mapping | **Implemented** |
| Unified calibration wizard (gaze + gesture checks) | **Implemented** |
| MediaPipe hand tracking + multimodal command fusion | **Implemented** |
| Client liveness heuristic (motion + blink rate + face continuity) | **Implemented** — UI/attention gate only |
| Liveness gating in promo attention scoring | **Implemented** |
| Remote-control ↔ attention ↔ calibration shared profile | **Implemented** |

**What is NOT on this branch (despite the name):**

| Gap | Notes |
|-----|-------|
| POPS / Proof Packet v0 emission | **Absent** — no `POPS`, `ProofPacket`, or packet schema references in branch delta |
| Server-side liveness / anti-spoof | **`validate-attention` unchanged** — no liveness fields in edge function |
| Native Android anti-spoof | Lives in `eye_tracking_app` / promoted flutter-runtime — not extended here |
| New Supabase migrations or edge functions | **Zero** in branch diff |
| Flutter `attention_mediapipe` plugin wiring | Plugin exists on `main` tree; **not modified** on branch |

**Relative to the evidence-vault audit:** That branch was backend/admin custody + simulation POPS. **This branch is the complementary web client path** — browser MediaPipe gaze, blink remote control, and attention samples for `validate-attention`. It does **not** replace the missing mobile liveness layer; it **does** unify web calibration and add lightweight client liveness for feed/reward UX.

**Relative to canonical i-project:** Promoted [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/) remains the **authoritative native signal producer**. This branch is the **web companion layer** to preserve and selectively promote — not merge wholesale (commit `0b260c6` bundles unrelated investor-demo work).

**Recommendation:** **Selectively cherry-pick commit `22cabd3` vision files** into the integration archive when a web/Capacitor shell is promoted. **Do not merge the full branch** without separating investor-demo deltas. **Do not treat client `livenessScore` as POPS truth** — map it as a derived presence hint in future Proof Packet v0 `eyeTracking` section only after schema reconciliation.

---

## 2. Branch metadata

| Field | Value |
|-------|--------|
| **Branch name** | `codex/vision-unified-pipeline` |
| **Remote ref** | `remotes/origin/codex/vision-unified-pipeline` |
| **HEAD** | `22cabd3` — *commited these changes march 08 12:10, eye tracking remote control* (2026-03-08) |
| **Merge base with `main`** | `b041361` — *Align Supabase config project ID with deployed project* |
| **Commits ahead of `main`** | 2 |
| **Commits behind `main`** | 0 |
| **Diff vs `main` (three-dot)** | **44 files**, **3,462 insertions**, **181 deletions** |
| **Vision-only commit** | `22cabd3` — **13 files**, **1,486 insertions**, **95 deletions** |
| **Non-vision commit** | `0b260c6` — investor demo mode, hardening runbook, hook resilience (~31 files) |

### Commit breakdown

| Commit | Date | Scope |
|--------|------|-------|
| `0b260c6` | 2026-03-07 | Investor demo mode (`demoState.ts`, `appMode.ts`, `DEMO_README.md`), `HARDENING_DEPLOY_RUNBOOK.md`, AuthContext demo session, rewards/payout/subscription demo paths, feed/map/checkout hook guards |
| `22cabd3` | 2026-03-08 | **Vision unification:** profile, wizard, `useVisionEngine` hand+liveness fusion, blink remote control, eye tracking liveness gate, calibration service |

### Relation to `main`

The branch is a **strict superset** of `main` (fast-forwardable). All platform infrastructure on `main` — 50+ migrations, 35+ edge functions, `validate-attention`, `issue-reward`, wallet ledger, admin panel — is **present unchanged**. The branch adds client-side vision unification and demo-mode overlays on top.

---

## 3. High-value systems found

| System | Location | Implementation | Authoritative for payout? |
|--------|----------|----------------|---------------------------|
| **Vision calibration profile v2** | `src/lib/visionCalibration/profile.ts` | **Implemented** — device presets (iphone/android/desktop), affine params, liveness/gesture thresholds, localStorage + Supabase sync | No — client config only |
| **Unified calibration wizard** | `src/components/vision/UnifiedVisionCalibrationWizard.tsx` | **Implemented** — 4-step gaze grid + gesture checks + affine fit | No |
| **Central vision engine** | `src/hooks/useVisionEngine.ts` | **Extended on branch** — HandLandmarker, liveness score, command intent fusion | No — signal producer |
| **Blink/gaze remote control** | `src/hooks/useBlinkRemoteControl.ts`, `src/components/BlinkRemoteControl.tsx` | **Extended** — uses unified profile, enables hand tracking | No — UI control |
| **Promo attention tracking** | `src/hooks/useEyeTracking.ts` | **Extended** — liveness gates `hasFace`, `LOW_LIVENESS` flag | **Partial** — feeds `validate-attention` samples; server recomputes score |
| **Attention scoring engine** | `src/lib/attentionScoring.ts` | **On `main`, unchanged** — time-weighted ledger, presets | Server-side validation is authoritative |
| **Attention validation API** | `supabase/functions/validate-attention/index.ts` | **On `main`, unchanged** — recomputes score from samples; session TTL | **Yes** for promo_view session ids |
| **Reward issuance** | `supabase/functions/issue-reward/index.ts` | **On `main`, unchanged** | **Yes** |
| **Vision web worker** | `src/workers/visionSample.worker.ts` | **On `main`, unchanged** — EAR/gaze/blink off main thread | No |
| **Gaze backend adapters** | `src/lib/gaze/WebGazerAdapter.ts`, `GazeCloudAdapter.ts` | **On `main`, unchanged** | No |
| **Flutter attention plugin** | `attention_mediapipe/` | **On `main`, unchanged** — separate native path | Parallel stack, not wired to web branch |
| **Investor demo simulation** | `src/lib/demoState.ts`, `src/lib/appMode.ts` | **Branch-only (commit 1)** | **No** — localStorage mock |
| **Platform docs (audits)** | `docs/REMOTE_CONTROL_AUDIT.md`, `docs/EYE_TRACKING_FULL_AUDIT.md` | **On `main`** — describe pre-unification gaps | Reference |

---

## 4. Unified vision pipeline architecture

The “unified pipeline” on this branch means **one shared client vision stack** consumed by remote control, promo attention, and calibration — not a single cross-platform Flutter/Web runtime.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser / Capacitor WebView                  │
├─────────────────────────────────────────────────────────────────┤
│  UnifiedVisionCalibrationWizard                                  │
│       ↓ saves VisionCalibrationProfile v2 (local + Supabase)     │
├─────────────────────────────────────────────────────────────────┤
│  VisionContext / VisionStreamContext (shared MediaPipe driver)   │
│       ↓                                                          │
│  useVisionEngine                                                 │
│    • face_mesh | face_landmarker (tasks-vision)                  │
│    • HandLandmarker (optional, remote control)                   │
│    • visionSample.worker (EAR, gaze, blink, head pose)           │
│    • livenessScore = f(continuity, face motion, blink rate)      │
│    • commandIntent = f(hand gesture, head yaw/nod, liveness)     │
├──────────────┬──────────────────────────────────────────────────┤
│ useBlink     │ useEyeTracking (promo / feed rewards)             │
│ RemoteControl│   → attentionScoring.ts → samples[]               │
│ (dwell/blink │   → LOW_LIVENESS / spoofRisk gate                 │
│  UI actions) │   → validate-attention edge fn → sessionId        │
└──────────────┴──────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Supabase (unchanged on branch)                                  │
│  validate-attention → issue-reward → wallet ledger               │
└─────────────────────────────────────────────────────────────────┘

Parallel (not unified on branch):
  Flutter eye_tracking_app / attention_mediapipe → native MediaPipe
  i-project flutter-runtime → proof_packet_v0 (schema only, no emission)
```

### Pre-branch problem (documented, now addressed on branch)

`REMOTE_CONTROL_AUDIT.md` (Feb 2026, on `main`) identified that `EyeBlinkCalibration` did not produce gaze offset/scale used at runtime, while `useBlinkRemoteControl` used a separate manual calibration flow. **Commit `22cabd3` addresses this** via `UnifiedVisionCalibrationWizard` + `visionCalibration/profile.ts` with affine mapping from gaze samples.

### Still not unified across repos

| Layer | Web (this branch) | Native (i-project) |
|-------|-------------------|---------------------|
| Calibration schema | `VisionCalibrationProfile` v2 (TS) | `adaptive_calibration_profile.dart`, EAR baselines |
| Liveness | Heuristic score in `useVisionEngine` | Kotlin `VisionProcessor.kt` fake-static/no-blink flags |
| Proof handoff | Attention samples → `validate-attention` | Proof Packet v0 (designed, not emitted) |
| Stability bands | `ATTENTION_PRESETS` / EMA | `verification_stability_layer.dart` |

---

## 5. Web eye-control / gaze findings

### 5.1 Implemented

| Capability | Mechanism | Maturity |
|------------|-----------|----------|
| Iris-based gaze | MediaPipe landmarks 468–477, smoothed | **Working** — ~2–5° error typical for webcam |
| Affine gaze mapping | 5-point wizard + least-squares fit | **New on branch** — fixes calibration disconnect |
| Device-class presets | iphone / android / desktop thresholds | **New on branch** |
| Blink patterns | EAR baseline, pattern timeout, wink detection | **On `main`, refined on branch** |
| Hand gestures | HandLandmarker: pinch, point, open palm, fist | **New on branch** |
| Multimodal commands | select/confirm/next/previous from hand + head | **New on branch** |
| Ghost-mode dwell | Target overlay + gaze hold activation | **On `main`** |
| Gaze backends | mediapipe (default), gazecloud, webgazer | **On `main`** — adapters unchanged |
| Target editor/overlay | Screen target registration | Minor branch tweaks |

### 5.2 Documentation vs code

| Artifact | Type |
|----------|------|
| `docs/REMOTE_CONTROL_AUDIT.md` | **Audit doc** — pre-unification gaps; partially superseded by branch |
| `docs/EYE_TRACKING_REMOTE_CONTROL_FULL_AUDIT_FOR_CHATGPT.md` | **Audit doc** |
| `docs/GAZE_BACKEND_UPGRADE_PLAN.md` | **Plan** — not fully executed on branch |
| `.lovable/plan.md` | **Prototype plan** |

### 5.3 Not implemented

- Polynomial/high-order gaze mapping beyond affine (mentioned in audit as future)
- Server-side gaze validation
- Cross-session gaze drift auto-correction beyond `autoCalibrationEnabled` click history

---

## 6. Liveness / anti-spoof findings

### 6.1 Client liveness heuristic (branch-only — **implemented**)

In `useVisionEngine.updateLivenessState`:

```typescript
// Composite: continuity (45%) + face motion (35%) + blink rate (20%)
livenessScore = clamp01(continuityScore * 0.45 + motionScore * 0.35 + blinkScore * 0.2)
livenessStable = hasFace && livenessScore >= fusionConfig.livenessMinScore
```

Signals used:

- **Face continuity** — consecutive frames with face detected
- **Face motion** — rolling average of face-center displacement (penalizes static/frozen frames)
- **Blink rate** — blinks in last 30s (zero blinks → low score; 2–45/min → high)

Thresholds come from `VisionCalibrationProfile` (device presets: 0.50–0.60 default min).

### 6.2 Attention-path spoof gating (branch-only — **implemented**)

In `useEyeTracking`:

- `spoofRisk = hasFace && livenessScore < max(0.2, livenessMin - 0.2)` → treats as **no face**
- `LOW_LIVENESS` flag when face present but not stable
- Command fusion in `useVisionEngine` blocks intents when `!livenessStable`

### 6.3 What this is NOT

| Concern | Branch reality |
|---------|----------------|
| Anti-spoof / deepfake detection | **No** — heuristic only |
| 3D liveness / challenge-response | **No** — `SlowBlinkTraining` exists on `main` as UX, not cryptographic proof |
| Server enforcement | **`validate-attention` has no liveness fields** |
| Native Kotlin heuristics | **`fakeStaticGaze`, `fakeNoBlink`, `likelyFake`** — in flutter-runtime, not web branch |

### 6.4 Comparison to evidence-vault branch

Evidence-vault audit found native anti-spoof in `VisionProcessor.kt` (shared with `main`) and backend POPS scoring. **This branch adds the missing web-side liveness gate** for attention UX — complementary, not duplicate.

---

## 7. Attention scoring findings

### 7.1 Client stack (implemented on `main`, extended on branch)

| Component | Role |
|-----------|------|
| `src/lib/attentionScoring.ts` | Time-weighted ledger, elliptical gaze zone, EMA |
| `src/constants/attention.ts` | Presets: strict / normal / relaxed; **`LOW_LIVENESS` flag added on branch** |
| `src/hooks/useEyeTracking.ts` | Orchestrates vision → scoring → UI + sample export |
| `src/hooks/useAttentionVerification.ts` | Simpler EMA hook (legacy weights in comments) |

Scoring weights (normal preset): face 20%, eyes 25%, gaze 40%, pose 15%. Attentive threshold for vision path: 0.62 raw.

### 7.2 Server validation (on `main`, authoritative)

`validate-attention`:

- Recomputes `score100` from client `samples[]` — **client score never authoritative**
- `ATTENTIVE_THRESHOLD = 0.6` per sample
- Issues `attentionSessionId` with 10-minute TTL
- Rate limiting + idempotency via shared middleware

`issue-reward` requires `attentionSessionId` for `promo_view` — single-use redemption.

### 7.3 i-project verification stability layer

[`VERIFICATION_STABILITY_LAYER_V1.md`](VERIFICATION_STABILITY_LAYER_V1.md) defines **POOR → STRONG** confidence bands for **Flutter runtime** proof inputs. Web branch uses a **different** preset/threshold model (`ATTENTION_PRESETS`). These should be **mapped**, not merged blindly:

| Web (archive) | Flutter (i-project) |
|---------------|---------------------|
| `ATTENTION_PRESETS.requiredAttentionThreshold` (75–90) | VSL `VerificationConfidenceBand` |
| `LOW_LIVENESS` flag | Native `likelyFake` + stability ratios |
| Rolling 2s window | ~2s rolling window (aligned) |

---

## 8. POPS / proof / validation findings

### 8.1 Keyword search (branch delta + shared `main` tree)

| Term | Branch delta | Shared `main` tree | Assessment |
|------|-------------|-------------------|------------|
| POPS | **0 hits** | 0 in web src | **Not implemented** in archive web app |
| proof / ProofPacket | **0 in delta** | Task `proofKind` in `update-task-progress` only | **Not** Proof Packet v0 |
| verification | Attention verification hooks | `validate-attention` edge fn | **Partial** — promo attention only |
| evidence | **0 in delta** | — | See evidence-vault audit for backend custody |
| session | `attentionSessionId` flow on `main` | Implemented | Server session, not proof packet |

### 8.2 Validation path that exists (implemented end-to-end on `main`)

```
Watch promo → useEyeTracking collects samples
  → validate-attention (server recomputes score, issues sessionId)
  → issue-reward (redeems sessionId once)
  → wallet ledger credit
```

Branch adds **client liveness gating before samples count as attentive** — strengthens client-side signal quality but **does not change POPS architecture**.

### 8.3 Gap vs i-project canonical design

| i-project artifact | Archive web branch |
|--------------------|-------------------|
| [`PROOF_PACKET_SCHEMA_V0.md`](PROOF_PACKET_SCHEMA_V0.md) | **No emission** |
| [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md) | **No 6-layer scorer** — single attention path |
| `proof_packet_v0.dart` | **Not referenced** |
| Pending validation wallet UX | Demo-only on branch (`demoState`) |

**Backend POPS reference** from evidence-vault branch (`services/api/src/pops/`) remains the authoritative server design to reconcile — **not** this web branch.

---

## 9. Reward / wallet / feed implications

### 9.1 Reward path (unchanged backend; stronger client gate on branch)

- **`rewards.service.ts` delta** is primarily **investor demo mode** (localStorage balances when `isDemoMode()`) — not vision logic
- Production reward path still: `validate-attention` → `issue-reward`
- Branch improves **signal honesty** before samples are sent; server trust model unchanged

### 9.2 Feed / check-in (commit `0b260c6` only)

- `useMainFeed`, `useDiscoveryPromotions`, `useNearbyPromotions` — demo guards
- `DiscoveryMap`, `PromoCheckInFlow`, `QuickCheckInSheet` — demo compatibility
- **No vision integration changes** in feed hooks

### 9.3 Wallet

- Demo balances via `demoState.ts` (branch-only)
- Production wallet/ledger/stripe on `main` — untouched

### 9.4 Implication for i-project MVP

When wiring Proof Packet v0 emission in flutter-runtime, **web attention samples** from this branch could populate `eyeTracking.attentionSamples` in the schema — but require a **cross-platform normalizer** (web preset scores ≠ VSL bands ≠ native flags).

---

## 10. Files worth promoting

Selective copy from commit `22cabd3` (vision commit) into integration archive when web shell is canonical:

| Priority | Path | Why |
|----------|------|-----|
| **P0** | `src/lib/visionCalibration/profile.ts` | Single source of truth for web calibration + liveness thresholds |
| **P0** | `src/components/vision/UnifiedVisionCalibrationWizard.tsx` | Fixes documented calibration disconnect |
| **P0** | `src/hooks/useVisionEngine.ts` | Hand tracking + liveness + command fusion (+491 lines vs `main`) |
| **P0** | `src/hooks/useBlinkRemoteControl.ts` | Profile integration, hand tracking enablement |
| **P0** | `src/hooks/useEyeTracking.ts` | Liveness/spoof gating for attention samples |
| **P0** | `src/services/calibration.service.ts` | Normalized Supabase profile persistence |
| **P1** | `src/contexts/VisionContext.tsx` | Calibration sync event wiring |
| **P1** | `src/components/BlinkRemoteControl.tsx` | Wizard mount + advanced flow handoff |
| **P1** | `src/constants/attention.ts` | `LOW_LIVENESS` flag + labels |
| **P1** | `src/hooks/useScreenTargets.ts`, `TargetOverlay.tsx`, `TargetEditor.tsx` | Minor unified-pipeline tweaks |

**Reference only (already on `main`, promote with platform backend bundle):**

- `supabase/functions/validate-attention/`
- `supabase/functions/issue-reward/`
- `src/lib/attentionScoring.ts`
- `src/workers/visionSample.worker.ts`

---

## 11. Files to preserve only

| Path | Reason |
|------|--------|
| `docs/REMOTE_CONTROL_AUDIT.md` | Historical gap analysis — keep for archaeology |
| `docs/EYE_TRACKING_FULL_AUDIT.md` | Pre-unification platform audit |
| `docs/EYE_TRACKING_REMOTE_CONTROL_*.md` | ChatGPT audit exports |
| `docs/GAZE_BACKEND_UPGRADE_PLAN.md` | Unfinished plan |
| `attention_mediapipe/` | Separate Flutter plugin — evaluate vs flutter-runtime before any merge |
| `src/lib/gaze/*` | Alternative gaze backends — preserve, don't promote until adapter strategy locked |

---

## 12. Files to ignore (for vision recovery)

| Path | Reason |
|------|--------|
| `src/lib/demoState.ts` | Investor demo localStorage — separate concern |
| `src/lib/appMode.ts` | Demo mode flag |
| `DEMO_README.md` | Demo ops doc |
| `docs/HARDENING_DEPLOY_RUNBOOK.md` | Deploy runbook — migrations already on `main`; audit `codex/investor-demo-mode*` instead |
| `src/contexts/AuthContext.tsx` (demo delta) | Demo session simulation |
| `src/services/rewards.service.ts` (demo delta) | Mock wallet paths |
| `src/services/payout.service.ts`, `subscription.service.ts` (demo delta) | Mock payment flows |
| `package-lock.json` / demo script changes | Tie to investor demo commit |

---

## 13. Conflicts with current i-project implementation

| Conflict | Detail | Resolution |
|----------|--------|------------|
| **Dual runtimes** | i-project promotes Flutter; branch is web MediaPipe | Web = companion; Flutter = primary proof producer |
| **Calibration schema mismatch** | TS `VisionCalibrationProfile` v2 vs Dart `AdaptiveCalibrationProfile` | Document field mapping; do not assume interchangeability |
| **Liveness semantics** | Web heuristic score vs Kotlin `likelyFake` flags vs VSL bands | Normalize to Proof Packet v0 `signals.eyeTracking.livenessHints[]` with `source` tag |
| **POPS not wired** | i-project schema exists; branch emits attention samples only | Implement packet emission in flutter-runtime first; web follows |
| **Evidence vault vs web proof** | Vault = admin custody post-ingestion | Complementary layers per evidence-vault audit |
| **Instant vs delayed validation** | `validate-attention` + `issue-reward` can settle immediately for promos | POPS doc mandates pending state — product decision needed before promoting web reward path to canonical MVP |
| **Branch bundles demo + vision** | Single branch name, two commits | Cherry-pick `22cabd3` only for vision promotion |

---

## 14. Promotion priority

### P0 — promote / reconcile immediately

1. **Cherry-pick vision commit files** (`22cabd3` list in §10) into i-project web integration path when Capacitor shell is promoted — **not** full branch merge.
2. **Document web liveness heuristic** as non-authoritative presence input aligned with [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md) Proof of Presence layer.
3. **Reconcile attention presets** with [`VERIFICATION_STABILITY_LAYER_V1.md`](VERIFICATION_STABILITY_LAYER_V1.md) — produce mapping table (web strict/normal/relaxed ↔ VSL bands).
4. **Close REMOTE_CONTROL_AUDIT gap** — mark calibration disconnect as addressed by `UnifiedVisionCalibrationWizard` in integration docs.

### P1 — preserve and map

1. Full `validate-attention` + `issue-reward` chain from archive `main` — promote with wallet backend bundle (already in multi-repo Tier 1 list).
2. `attention_mediapipe/` plugin — compare to promoted flutter-runtime before choosing native mobile path.
3. Gaze adapter trio (mediapipe / gazecloud / webgazer) — architecture decision for web fallback order.
4. Investor demo deltas (`0b260c6`) — defer to `codex/investor-demo-mode-v2` audit.

### P2 — archive

1. Pre-unification calibration flows in old docs (keep in source repo).
2. Demo mode mock wallet/state — preserve in source repo only unless investor demo is canonical.
3. `.lovable/plan.md` and ChatGPT audit markdown exports.

---

## 15. Exact recommended next action

1. **In i-project:** Create a short **Web Vision Integration Map** doc (or section in [`EYE_TRACKING_INTEGRATION_MAP.md`](EYE_TRACKING_INTEGRATION_MAP.md)) listing cherry-picked paths from §10 and explicit non-goals (no POPS, no server liveness).

2. **In flutter-runtime:** Continue **Proof Packet v0 emission** as priority #1 — this branch does not unblock or replace that work.

3. **When promoting web shell:** Apply only commit `22cabd3` files; run manual smoke on calibration wizard → remote control → promo attention → `validate-attention` session id flow.

4. **Do not merge** `codex/vision-unified-pipeline` into i-project as a single merge — separates demo debt from vision value.

5. **Next branch audit:** `eye-earn-sparkle-archive` / `codex/investor-demo-mode-v2` — isolates demo polish bundled in commit `0b260c6`; alternatively `eye-earn-sparkle-v2` / `archive/unified-vision-2025-02-07` for Feb 2026 vision snapshot comparison.

---

## Appendix A — Keyword search summary

Searched branch tree (`.ts`, `.tsx`, `.md`) for recovery terms:

| Term | Hits (approx) | Branch delta? | Notes |
|------|---------------|---------------|-------|
| vision | 80+ | Yes | Engine, contexts, wizard |
| unified pipeline | 0 literal | Name only | Concept = shared profile + engine |
| gaze | 100+ | Partial | Core on `main`; affine wiring on branch |
| blink | 100+ | Partial | Remote control + liveness |
| liveness | 25+ | **Yes** | `useVisionEngine`, profile, eye tracking |
| spoof / anti-spoof | 5 | **Yes (client)** | `spoofRisk` in useEyeTracking only |
| mediapipe | 50+ | Partial | face_landmarker + **new** HandLandmarker |
| attention | 80+ | Partial | Scoring on `main`; liveness gate on branch |
| proof | 10 | No | Task proofs only, not v0 packet |
| POPS | 0 | No | — |
| calibration | 60+ | **Yes** | Profile + wizard + service |
| remote / device / session | 40+ | Partial | Remote control + attention sessions |
| scoring | 30+ | On `main` | attentionScoring + validate-attention |
| evidence | 0 in delta | No | See evidence-vault audit |
| reward / wallet / feed | 50+ | Demo delta | Production paths on `main` |
| face | 100+ | Shared | MediaPipe landmarks |

---

## Appendix B — Top source paths (quick reference)

1. `src/lib/visionCalibration/profile.ts` — unified web calibration contract  
2. `src/hooks/useVisionEngine.ts` — MediaPipe engine + liveness + hand fusion  
3. `src/components/vision/UnifiedVisionCalibrationWizard.tsx` — calibration UX fixing known disconnect  
4. `src/hooks/useEyeTracking.ts` — promo attention + liveness gating → validate-attention  
5. `supabase/functions/validate-attention/index.ts` — authoritative server attention validation (on `main`)

---

*Audit performed read-only against `origin/codex/vision-unified-pipeline` @ `22cabd3` vs `origin/main` @ `b041361`.*
