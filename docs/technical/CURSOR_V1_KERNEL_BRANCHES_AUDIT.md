# Cursor v1 Kernel Branches Audit

**Date:** 2026-05-21  
**Audit type:** Read-only branch recovery — no merges, no source-repo modifications, no deletions  
**Source repo:** `~/Desktop/i-project-rescue/github-source-repos/eye_tracking_app`  
**Target branches:** `cursor/v1-autonomy-4f71`, `cursor/v1-safety-4f71`, `cursor/v1-signal-4f71`  
**Comparison base:** `origin/main` (`36d685f`)  
**Integration repo:** `~/Desktop/i-project-rescue/i_project_migration_archive`  
**Related docs:** [`MULTI_REPO_SYSTEM_RECOVERY_REPORT.md`](MULTI_REPO_SYSTEM_RECOVERY_REPORT.md), [`STUDIO_ROUTING_AUDIT_BRANCH_AUDIT.md`](STUDIO_ROUTING_AUDIT_BRANCH_AUDIT.md), [`EYE_TRACKING_PRE_COMPOSER_CLEANUP_BRANCH_AUDIT.md`](EYE_TRACKING_PRE_COMPOSER_CLEANUP_BRANCH_AUDIT.md), [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md), [`PROOF_PACKET_SCHEMA_V0.md`](PROOF_PACKET_SCHEMA_V0.md)

---

## 1. Executive verdict

**The three Cursor v1 kernel branches are not three implementations — they are three identical stale bookmarks on the repo’s initial commit.**

All three remotes resolve to **`4980581`** (*Initial commit: eye tracking app project*, 2026-04-16). **0 commits** diverge from one another; **0 commits** exist on any branch that are not ancestors of `main`. `main` is **61 commits ahead** with T-series gaze/blink/calibration stabilization, hardened autonomous execution gates, and expanded test coverage.

**Strict assessment:**

| Expectation (from branch names) | Reality |
|----------------------------------|---------|
| Separate autonomy / safety / signal kernel experiments | **None** — names are Cursor workspace labels only |
| Hidden kernel work not on `main` | **None** — all kernel code on these branches is **older** than `main` |
| Alternative execution paths to promote | **No** — `main` and promoted [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/) already contain **evolved** versions of the same Intent OS |
| POPS / proof / evidence integration | **Absent** on v1 tips — zero `POPS`, `proof`, or `evidence` references in the tree |
| Web platform / i Command routing | **Absent** — no `src/`, `docs/`, `tools/`, or `ai/` at v1 tip (those live on monorepo checkpoint branches; see studio routing audit) |

**What the v1 snapshot *does* contain (implemented, not docs-only):** A **complete Flutter Intent OS** at initial import — `IntentEngine`, `GovernanceKernel`, `SafetyKernel`, `AutonomousExecutionKernel` (minimal), `AutonomousAgent`, `ActionPipelineKernel`, `UISandbox` digital twin, learning loop, and unit tests for governance/safety/execution kernels. Several router/command surfaces are **stubs** (`SignalRouter`, `ActionRouter`, `MultimodalCommandEngine._execute`).

**Does this supersede current i-project source?** **No.** Promoted flutter-runtime **`lib/core/intent_os/` matches `main`** for critical kernels (`safety_kernel.dart`, `autonomous_execution_kernel.dart`, `intent_engine.dart`, `action_context.dart` verified identical). i-project **adds** Proof Packet v0 types and verification stability layer that neither v1 branches nor bare `main` emit yet.

**Recommendation:** **Do not merge, promote, or re-audit these three branches individually.** Treat `4980581` as **historical baseline** only. Continue canonical work on **`main` → promoted flutter-runtime**. Next recovery effort: **`cursor/dev-environment-setup-4f71`** (1 commit on top of same base) or backend/POPS reconciliation per prior audits — not re-mining identical v1 pointers.

---

## 2. Branch metadata table

| Branch | Latest commit | Relation to `main` | Changed files vs `main` | Likely purpose |
|--------|---------------|--------------------|-------------------------|----------------|
| `cursor/v1-autonomy-4f71` | `4980581` (2026-04-16) | **Ancestor** — 0 ahead, **61 behind** | **62 files** on `main` not in v1 tip (inverse diff: main adds T-series + `ai/` + kernel hardening) | Cursor workspace bookmark — **no autonomy-specific commits** |
| `cursor/v1-safety-4f71` | `4980581` (identical) | **Ancestor** — 0 ahead, **61 behind** | Same as above | Cursor workspace bookmark — **no safety-specific commits** |
| `cursor/v1-signal-4f71` | `4980581` (identical) | **Ancestor** — 0 ahead, **61 behind** | Same as above | Cursor workspace bookmark — **no signal-specific commits** |

**Cross-branch relation:** All three are **byte-identical** (0 / 0 commit delta each pair).

**Tree size at v1 tip:** 282 tracked files — lean Flutter app (no platform monorepo).

**Default branch:** `main` @ `36d685f`.

---

## 3. Autonomy branch findings

*Branch-specific commits: **none**. Findings describe autonomy-related **systems present at the shared v1 snapshot** vs current `main`.*

### 3.1 Implemented autonomy systems (v1 snapshot)

| System | Location | Status at v1 | Status on `main` / promoted runtime |
|--------|----------|--------------|-------------------------------------|
| **Autonomous proposal** | `lib/core/intent_os/autonomous_agent.dart` | **Implemented** — fixation + dwell + probability thresholds; `decide()` does not execute | **Same file** — unchanged role |
| **Autonomous execution gate** | `lib/core/intent_os/autonomous_execution_kernel.dart` | **Minimal** — kill switch → governance → safety → execute; returns `bool` | **Hardened** — prefilter via `ActionPipelineKernel`, `AutonomousActionGateResult` enum, audit sink, structured gate telemetry |
| **Autonomy level policy** | `lib/core/intent_os/autonomy_level.dart`, `action_pipeline_kernel.dart` | **Implemented** — confidence threshold scales with `autonomyLevel` | **Same** + richer `ActionContext.autonomyLevel` wiring on `main` |
| **Autonomous action model** | `lib/core/intent_os/autonomous_action.dart`, `ui_action.dart` | **Implemented** | **Same** |
| **Implicit confirmation path** | `AutonomousAgent.tryExecute` | **Implemented** — optional `SafetyKernel.validate` on `KernelEvaluationInput` | **Same**; runtime wiring still in `main.dart` |

### 3.2 Not implemented / stub (autonomy theme)

| Artifact | Status |
|----------|--------|
| Persistent autonomy profiles | **Absent** — in-memory only |
| Backend approval queue | **Absent** |
| Agent loop / LLM agent | **Absent** — “agent” means `AutonomousAgent` (gaze UI agent), not Cursor/Claude agent |
| Separate autonomy branch code path | **Absent** — branch name only |

### 3.3 Delta vs `main` (autonomy-critical)

`AutonomousExecutionKernel` grew from **24 lines** (v1) to **93 lines** (`main`) — the largest autonomy regression risk if someone promoted v1 over `main`.

---

## 4. Safety branch findings

*Branch-specific commits: **none**.*

### 4.1 Implemented safety systems (v1 snapshot)

| System | Location | Status at v1 | Delta on `main` |
|--------|----------|--------------|-----------------|
| **Safety kernel** | `lib/core/intent_os/safety_kernel.dart` | **Implemented** — sanity, anomaly (low confidence + high dwell), burst (<3 actions/s) | **+ twin risk envelope** (`riskScore < 0.5`) in `finalGate` |
| **Pipeline safety prefilter** | `lib/core/intent_os/action_pipeline_kernel.dart` | **Implemented** — system gates + confidence vs autonomy | **Unchanged** |
| **Governance kernel** | `lib/core/intent_os/governance_kernel.dart` | **Implemented** — confidence >0.85, risk <0.25, fixation + dwell >0.8, rate limit >600ms, reversibility | **Identical** at file hash level |
| **Digital twin risk** | `lib/core/ui_sandbox.dart` | **Implemented** — `SandboxSimulation` with `riskScore`, zone alignment | **Same**; `main` documents twin → kernel risk feed in safety comments |
| **Risk tier taxonomy** | `lib/core/intent_os/risk_tier.dart`, `action_type_risk.dart` | **Implemented** + tests | **Same** |
| **Bypass path tests** | `test/bypass_paths_test.dart` | **Absent** on v1 | **Present on `main`** — guards against kernel bypass |

### 4.2 Not implemented (safety theme)

| Gap | Notes |
|-----|-------|
| POPS / wallet freeze / trust rules | **Absent** — lives in i-project docs + `i-initial-structures` types, not ET v1 |
| Evidence vault / liveness SQL | **Absent** — on `feature/evidence-vault-v2-hardening` checkpoint, not v1 |
| Production audit log persistence | **Absent** — v1 has no `[ACTION_AUDIT]` sink; `main` adds `debugPrint` audit default |

---

## 5. Signal branch findings

*Branch-specific commits: **none**.*

### 5.1 Implemented signal systems (v1 snapshot)

| System | Location | Status | Notes |
|--------|----------|--------|-------|
| **Gaze signal pipeline** | `lib/engine/gaze_pipeline.dart`, `lib/gaze_processing_pipeline.dart` | **Implemented** | Canonical on-device signal authority |
| **Gaze filters / quality** | `lib/gaze_filter*.dart`, `lib/gaze_quality.dart`, `lib/gaze_fixation.dart` | **Implemented** | |
| **Blink / EAR** | `lib/blink_detector.dart`, `lib/ear_calibration.dart` | **Implemented** | `main` adds extracted T-10 helpers |
| **Tracking engine** | `lib/core/stability/tracking_engine.dart` | **Implemented** | Gates tracking/degraded/lost |
| **Attention kernel** | `lib/attention_kernel.dart` | **Implemented** | Scoring for intent engine |
| **Event bus signals** | `lib/core/events/gaze_event.dart`, `blink_event.dart`, `voice_event.dart` | **Implemented** | Voice path not wired in `main.dart` at v1 |
| **Trust merge (local/global)** | `lib/trust_merge.dart` | **Implemented** | Session sample weighting — not POPS trust engine |
| **Signal router** | `lib/core/intent_os/signal_router.dart` | **Stub** — 4-field bag (`blink`, `dwell`, `voice`, `stability`) | **Unchanged stub** on `main` |
| **Runtime signal authority test** | `test/runtime_signal_authority_test.dart` | **Absent** on v1 | **On `main`** — documents canonical pipeline ownership |
| **Signal unification test** | `test/signal_unification_test.dart` | **Absent** on v1 | **On `main`** |

### 5.2 T-series modules on `main` only (signal path)

| Module | Purpose |
|--------|---------|
| `lib/features/gaze/drift_adjusted_gaze.dart` | Drift-adjusted gaze |
| `lib/features/gaze/held_face_policy.dart` | Face-loss hold |
| `lib/features/gaze/pipeline_frame_confidence.dart` | Frame confidence |
| `lib/features/gaze/pipeline_tracking_coordinator.dart` | Coordinator seams |
| `lib/features/intent/zone_dwell_logic.dart` | Pure zone dwell |
| `lib/features/vision/frame_codec.dart`, `vision_frame.dart`, `vision_channel_bridge.dart` | Vision transport extraction |
| `lib/features/calibration/calibration_phase.dart` | Calibration FSM extract |

**Verdict:** Signal branch name implies pipeline variant work — **no such branch exists**. Signal evolution happened on **`main`**, already promoted.

---

## 6. Intent OS / command router findings

### 6.1 Intent OS (implemented at v1 — full stack)

```
EventBus (GazeEvent / BlinkEvent / VoiceEvent)
    → IntentEngine.process / resolveIntent
    → IntentType + zone commits (fixation-gated)
    → AutonomousAgent.decide (proposal)
    → UISandbox.simulate (twin risk)
    → KernelEvaluationInput + ActionContext
    → AutonomousExecutionKernel.tryExecute (side-effect gate)
    → LearningEngine / CollectiveZoneStats (in-memory adapt)
```

**51 files** under `lib/core/intent_os/` at v1 — **same file set** as `main`. **6 files differ** on `main` (see §8).

### 6.2 Command / router surfaces (strict: implemented vs stub)

| Component | Path | v1 status |
|-----------|------|-----------|
| **Intent engine (canonical router for dwell/blink)** | `lib/core/intent_os/intent_engine.dart` | **Implemented** |
| **Action pipeline kernel** | `lib/core/intent_os/action_pipeline_kernel.dart` | **Implemented** |
| **Signal router** | `lib/core/intent_os/signal_router.dart` | **Stub** — unused data bag |
| **Action router** | `lib/core/intent_os/action_router.dart` | **Stub** — empty `execute` |
| **Multimodal command engine** | `lib/core/commands/multimodal_command_engine.dart` | **Prototype** — voice mode + blink/dwell triggers; `_execute` unimplemented |
| **Command engine (registry)** | `core/commands/command_engine.dart` | **Minimal** — string → callback map |
| **Voice engine** | `lib/core/commands/voice_engine.dart` | **Present** — not wired to camera loop |
| **Repo-root pipeline** | `core/pipeline.dart` | **Partial** — alternate pipeline sketch importing `lib/core/stability` |

### 6.3 Comparison to Studio routing audit (i Command)

[`STUDIO_ROUTING_AUDIT_BRANCH_AUDIT.md`](STUDIO_ROUTING_AUDIT_BRANCH_AUDIT.md) documents **`src/lib/i/i-command-router.ts`** on the **monorepo checkpoint** (`d23d365`) — utterance → `actionType` / `nextRoute` for **web Studio**. That system is **orthogonal** to v1 Flutter branches:

| Router | Repo / branch | Stack | Status |
|--------|---------------|-------|--------|
| i Command router | `integration/studio-routing-audit` | TypeScript | Web dev route — not on v1 or `main` ET |
| Intent OS | v1 / `main` ET | Dart | Gaze/blink autonomous UI — **canonical for mobile ET** |
| Signal router (Dart) | v1 / `main` ET | Dart | **Non-functional stub** |

**No merge path** between i Command TS router and Flutter Intent OS without an explicit cross-platform command schema (not present on v1 branches).

---

## 7. Governance / policy / risk findings

| Layer | Implementation | v1 | `main` / promoted |
|-------|----------------|-----|-------------------|
| **Governance** | `GovernanceKernel.approve` | Fixed thresholds | **Same** |
| **Policy prefilter** | `ActionPipelineKernel.evaluateSafety` | Autonomy-scaled confidence floor | **Same** |
| **Safety final gate** | `SafetyKernel.finalGate` | Sanity + anomaly + burst | **+ twin risk ceiling** |
| **Risk scoring** | `UISandbox.simulate`, `ActionContext.riskScore` | **Implemented** | **Same** |
| **User trust blend** | `trust_merge.dart`, `ActionContext.userTrust` | **Implemented** | **Same** |
| **Digital twin** | `digital_twin_engine.dart` | Advisory EMA state | **Same** — not a hard gate |
| **Collective prior** | `collective_stats.dart` | Plain class | **`main` adds `kCollectivePriorHints` constant** |
| **Platform trust rules** | `i-initial-structures` trust.types | **Not in ET v1** | i-project architecture only |

**AGENTS.md** at v1 tip already documents kernel thresholds (confidence >0.85, risk caps, dwell >0.8, rate limits) — useful prose, not a separate policy engine.

---

## 8. Signal / proof / validation findings

### 8.1 On v1 branches

| Topic | Finding |
|-------|---------|
| **POPS** | **Zero references** |
| **Proof packet** | **Absent** — no `lib/proof/` |
| **Evidence vault** | **Absent** |
| **Verification stability layer** | **Absent** — added in i-project promoted runtime + docs, not v1 |
| **Validation** | Kernel **unit tests** only (`governance_kernel_test`, `safety_kernel_test`, `autonomous_execution_kernel_test`) |

### 8.2 Canonical i-project contract (supersedes v1 for product layer)

| Artifact | Location | Relationship to v1 |
|----------|----------|-------------------|
| POPS 6-layer architecture | [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md) | Defines **platform** validation; ET v1 produces gaze signals only |
| Proof Packet v0 schema | [`PROOF_PACKET_SCHEMA_V0.md`](PROOF_PACKET_SCHEMA_V0.md) | **Not implemented** on v1 or `main` emission — types in promoted `lib/proof/proof_packet_v0.dart` |
| Verification stability bands | `integrations/eye-tracking/flutter-runtime/lib/verification/` | **i-project addition** post-v1 |

**Gap (unchanged by this audit):** Runtime still does not **emit** proof packets at session end — see multi-repo report §4.2.

---

## 9. Workflow / state-machine findings

| Workflow | v1 status | Notes |
|----------|-----------|-------|
| **Fixation → dwell → zone commit** | **Implemented** in `IntentEngine` + `main.dart` | Fixation gate enforced in AGENTS.md preferences |
| **Blink edge → intent** | **Implemented** | EAR down-cross in `BlinkDetector` |
| **Calibration FSM** | **Inline in `main.dart`** at v1 | **Extracted** to `calibration_phase.dart` on `main` |
| **Autonomous execution chain** | **Implemented** — monolithic in `main.dart` | Same coupling; `ai/system-map.md` on `main` documents danger |
| **Learning session lifecycle** | **Implemented** — `IntentEngine.endSession` | **`main` adds `MemoryCompressor` merge** |
| **Voice command mode** | **Prototype** — `MultimodalCommandEngine` | Not wired |
| **Queue / approval workflow** | **Absent** | No action queue beyond in-memory `ActionHistory` |
| **Backend settlement** | **Absent** | POPS pending flow is i-project + archive Supabase |

---

## 10. Files worth promoting

**None from v1 kernel branches immediately.**

All valuable kernel code at `4980581` is **already superseded** on `main` and in [`integrations/eye-tracking/flutter-runtime/lib/core/intent_os/`](../../integrations/eye-tracking/flutter-runtime/lib/core/intent_os/). Promoting v1 would **regress**:

- `autonomous_execution_kernel.dart` (l loses prefilter + audit + typed gate results)
- `safety_kernel.dart` (loses twin risk envelope)
- `intent_engine.dart` (loses memory compressor session merge)
- `action_context.dart` (loses dwellMs, timestampMs, autonomyLevel, stabilityVariance)

---

## 11. Files to preserve only

| Path | Reason |
|------|--------|
| `4980581` git tag reference | Baseline for “Intent OS at first import” — use `git show 4980581:` for archaeology |
| `AGENTS.md` @ v1 | Kernel threshold documentation at initial commit |
| `lib/core/intent_os/` @ v1 | Historical comparison only — **do not copy over `main`** |
| Branch refs `cursor/v1-*-4f71` | Keep on remote as bookmarks; document as **empty of unique work** |

No separate preservation copy needed — **`main` history contains v1 as ancestor.**

---

## 12. Files to ignore

| Path / artifact | Reason |
|-----------------|--------|
| All three `cursor/v1-*-4f71` branch tips | Identical to initial commit; no delta |
| `lib/core/intent_os/signal_router.dart` | Stub — no routing logic |
| `lib/core/intent_os/action_router.dart` | Stub |
| `MultimodalCommandEngine._execute` | Empty prototype |
| `core/pipeline.dart` (repo root) | Duplicate / experimental import paths |
| `lib/main.dart.bak_step_fixation` | Backup artifact |
| Expectation of branch-specific autonomy/safety/signal splits | **Misleading branch names** |

---

## 13. Conflicts with current i-project implementation

| Area | v1 branches | i-project canonical | Conflict |
|------|-------------|---------------------|----------|
| Flutter gaze runtime | Initial monolithic import | Promoted flutter-runtime + T-series modules | **i-project wins** — newer extractions + tests |
| Intent OS kernels | Older 6-file revision | Matches `main` @ `36d685f` | **i-project wins** |
| POPS / proof | Absent | Schema + architecture docs + Dart types | **No overlap** — product layer only in i-project |
| i Command web router | Absent | Preserved in old-source snapshot @ `d23d365` | **Different layer** — web vs Flutter |
| Studio collab/media | Absent | `integrations/eye-tracking/source/` | **i-project wins** for type-first studio slice |
| Verification stability | Absent | `verification_stability_layer.dart` + tests | **i-project addition** |

**No merge conflicts possible** — v1 branches are strict ancestors. Risk is **accidental downgrade** if a developer checks out a v1 branch believing it is newer kernel work.

---

## 14. Promotion priority

### P0 — promote / reconcile immediately

| Item | Action |
|------|--------|
| — | **Nothing from v1 kernel branches** |
| Proof packet emission | Continue on **`main` / promoted runtime** per [`PROOF_PACKET_SCHEMA_V0.md`](PROOF_PACKET_SCHEMA_V0.md) — not on v1 |
| Kernel gate parity | **Verify** promoted runtime stays synced with `eye_tracking_app/main` on kernel changes (currently **identical** for critical files) |

### P1 — preserve and map

| Item | Action |
|------|--------|
| Branch name registry | Record in recovery report that `cursor/v1-*-4f71` are **bookmarks @ `4980581`** |
| `AGENTS.md` kernel thresholds | Already reflected in `ai/system-map.md` on `main` — no duplicate doc needed |
| i Command TS router | Map separately from [`STUDIO_ROUTING_AUDIT_BRANCH_AUDIT.md`](STUDIO_ROUTING_AUDIT_BRANCH_AUDIT.md) when web shell promotes |

### P2 — archive

| Item | Action |
|------|--------|
| `cursor/v1-autonomy-4f71` | Archive mentally — no dedicated re-audit |
| `cursor/v1-safety-4f71` | Same |
| `cursor/v1-signal-4f71` | Same |
| Stub routers (`signal_router`, `action_router`) | Leave in place on `main` or delete in future cleanup — **not worth promoting from v1** |

---

## 15. Exact recommended next action

1. **Close the v1 kernel branch recovery thread** — update [`MULTI_REPO_SYSTEM_RECOVERY_REPORT.md`](MULTI_REPO_SYSTEM_RECOVERY_REPORT.md) (done in this pass).
2. **Do not checkout v1 branches for kernel work** — use `eye_tracking_app/main` or `integrations/eye-tracking/flutter-runtime/`.
3. **Implement Proof Packet v0 emission** in promoted runtime (P0 product gap unchanged).
4. **Next branch audit:** `eye_tracking_app/cursor/dev-environment-setup-4f71` (`0ccccdf` — single compile-fix commit on same base) — confirm no hidden env/kernel deltas, then **`eye-earn-sparkle-archive/main` Studio reconciliation** vs IVAULT types per studio routing audit §15.
5. Optional cleanup (low priority): Rename or delete stale `cursor/v1-*-4f71` remote branches on source repo **only if** team agrees — **out of scope for this audit** (no modifications rule).

---

## Appendix A — Keyword search summary (v1 tip @ `4980581`)

Search scope: `*.dart`, `*.md` on shared v1 snapshot (all three branches identical).

| Keyword | Files matched (approx.) | Notes |
|---------|-------------------------|-------|
| autonomy | 7 | `AutonomyLevel`, pipeline threshold |
| autonomous | 14 | Agent + execution kernel |
| agent | 4 | `AutonomousAgent` only |
| intent | 48 | Full Intent OS |
| kernel | 18 | Governance, safety, pipeline, execution |
| command | 6 | Mostly stubs + voice |
| router | 4 | Stubs + comments |
| safety | 15 | Safety kernel + tests |
| governance | 6 | Governance kernel |
| policy | 7 | Comments / thresholds |
| risk | 15 | risk_tier, twin, action_type_risk |
| trust | 13 | trust_merge, userTrust |
| signal | 17 | Events + pipeline; not POPS |
| proof / evidence / POPS / validation | **0** | — |
| workflow / queue / approval / audit | Minimal | `ActionHistory` only; no audit persistence |

---

## Appendix B — `main` commits after v1 tip (kernel-relevant subset)

| Commit theme | Example commits | Impact |
|--------------|-----------------|--------|
| Signal authority | `2f5085e` Refactor: unify runtime gaze signal authority | Canonical pipeline ownership |
| Bypass safety | `88c158a` Include bypass safety test | Test guard |
| Calibration FSM | `4042f22` Phase 4: calibration state machine | Later extracted |
| T-08–T-10 gaze/coordinator | `6816eda` … `a30584a` | Modular features/ |
| AI stabilization docs | `ai/system-map.md` etc. | Ownership map |

Full count: **61 commits** on `main` not reachable from v1 tips.

---

## Appendix C — intent_os file diff (`4980581` → `main`)

| File | Change summary |
|------|----------------|
| `action_context.dart` | +dwellMs, timestampMs, autonomyLevel, stabilityVariance |
| `autonomous_execution_kernel.dart` | Full gate chain + audit + AutonomousActionGateResult |
| `intent_action.dart` | +IntentActionType typedef |
| `intent_engine.dart` | +MemoryCompressor session merge |
| `learning/collective_stats.dart` | +kCollectivePriorHints |
| `safety_kernel.dart` | +_twinRiskEnvelope in finalGate |

**45 / 51** intent_os files **unchanged** between v1 and `main`.

---

*Report generated: 2026-05-21*  
*Audit status: Read-only — no merges, no source-repo modifications, no deletions*
