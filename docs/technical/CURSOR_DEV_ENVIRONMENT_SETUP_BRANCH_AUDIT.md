# Cursor Dev Environment Setup Branch Audit

**Date:** 2026-05-21  
**Audit type:** Read-only branch recovery — no merges, no source-repo modifications, no deletions  
**Source repo:** `~/Desktop/i-project-rescue/github-source-repos/eye_tracking_app`  
**Target branch:** `origin/cursor/dev-environment-setup-4f71`  
**Comparison base:** `origin/main` (`36d685f`)  
**Integration repo:** `~/Desktop/i-project-rescue/i_project_migration_archive`  
**Related docs:** [`MULTI_REPO_SYSTEM_RECOVERY_REPORT.md`](MULTI_REPO_SYSTEM_RECOVERY_REPORT.md), [`CURSOR_V1_KERNEL_BRANCHES_AUDIT.md`](CURSOR_V1_KERNEL_BRANCHES_AUDIT.md), [`EYE_TRACKING_PRE_COMPOSER_CLEANUP_BRANCH_AUDIT.md`](EYE_TRACKING_PRE_COMPOSER_CLEANUP_BRANCH_AUDIT.md), [`STUDIO_ROUTING_AUDIT_BRANCH_AUDIT.md`](STUDIO_ROUTING_AUDIT_BRANCH_AUDIT.md)

---

## 1. Executive verdict

**The branch is a single Cursor compile-fix on the initial-import snapshot — not dev-environment setup, not a superseding runtime, and safe to close for archaeology.**

`cursor/dev-environment-setup-4f71` has **one unique commit** (`0ccccdfb`, *fix: restore flutter compile for runtime startup*) on merge base **`4980581`** (same root as the three identical `cursor/v1-*-4f71` bookmarks). It is **1 commit ahead** of that base and **61 commits behind `main`**. The three-dot diff vs `main` touches **2 files** only (`lib/gaze_filter.dart`, `lib/main.dart`).

**What the commit actually did:**

| Change | Purpose | Status on `main` / promoted runtime |
|--------|---------|-------------------------------------|
| Add **`GazeFilterStack`** to `gaze_filter.dart` | `GazePipeline` imported `gaze_filter_stack.dart` → `GazeFilterStack`, but class was missing at initial commit | **Superseded** — `main` and [`integrations/eye-tracking/flutter-runtime/lib/gaze_filter.dart`](../../integrations/eye-tracking/flutter-runtime/lib/gaze_filter.dart) use a **thin delegate** wrapping `GazeFilter` (15 lines), not the branch’s **70-line duplicate EMA implementation** |
| Rename `smooth` → `filteredRaw` / `pipelineSmooth` in `main.dart` | Fix Dart **duplicate local variable** compile error in `_FullScreenPreviewState` | **Superseded** — `main.dart` on `main` was refactored (e.g. `pipelineGaze`); shadowing fix is obsolete |

**What the branch did *not* do (despite name and commit message):**

| Expected from branch name | Found |
|---------------------------|-------|
| Android / Gradle / SDK setup | **None** — zero platform or build-file changes |
| CI, dependencies, `pubspec` | **None** |
| Environment files (`.env`, tooling) | **None** |
| Gaze/blink/calibration algorithm work | **None** — only missing symbol + rename |
| POPS / proof / safety kernel changes | **None** |

**Does this supersede promoted i-project Flutter runtime?** **No.** Promoted flutter-runtime matches `main` for `GazeFilterStack` and Intent OS; it **adds** Proof Packet v0 types not present on this branch tip.

**Recommendation:** **Do not merge, promote, or re-open.** Treat as **historical evidence** that the initial import did not compile until `GazeFilterStack` existed. Continue canonical work on **`main` → `integrations/eye-tracking/flutter-runtime/`**. Close Cursor `eye_tracking_app` branch archaeology except cross-repo Studio reconciliation (see recovery report).

---

## 2. Branch metadata

| Field | Value |
|-------|--------|
| **Branch name** | `cursor/dev-environment-setup-4f71` |
| **Remote ref** | `remotes/origin/cursor/dev-environment-setup-4f71` |
| **HEAD** | `0ccccdfb` — *fix: restore flutter compile for runtime startup* (2026-04-17, Cursor Agent) |
| **Merge base with `main`** | `4980581` — *Initial commit: eye tracking app project* |
| **Commits ahead of `main`** | 0 (not reachable from `main`; diverged) |
| **Commits ahead of merge base** | 1 |
| **Commits behind `main`** | 61 |
| **Diff vs `main` (three-dot)** | **2 files**, **81 insertions**, **11 deletions** |
| **Relation to `main`** | **Stale side branch** — one fix on initial snapshot; all T-series stabilization and kernel hardening live on `main` only |
| **Relation to `cursor/v1-*-4f71`** | Same merge base `4980581`; v1 branches have **0** extra commits; this branch has **+1** compile fix |
| **Tree size at tip** | 282 tracked files (lean Flutter app; same scale as v1 snapshot) |
| **Tree size on `main`** | 320 tracked files |

### Latest commit (sole branch-specific)

| Commit | Author | Scope |
|--------|--------|-------|
| `0ccccdfb` | Cursor Agent | `GazeFilterStack` class body in `gaze_filter.dart`; `main.dart` variable renames for compile |

---

## 3. Changed files

### 3.1 Files in branch commit (`4980581` → `0ccccdfb`)

| File | Δ | Role |
|------|---|------|
| `lib/gaze_filter.dart` | +70 lines | Inline `GazeFilterStack` (tuple EMA + variance helpers) |
| `lib/main.dart` | 11 lines renamed | Resolve `smooth` identifier collision |

### 3.2 Three-dot diff vs `main` (`main...branch`)

Same **2 paths** — branch tip is initial tree + compile patch; `main` evolved 61 commits elsewhere.

| Path | Branch vs `main` |
|------|------------------|
| `lib/gaze_filter.dart` | Branch carries **duplicate** `GazeFilterStack`; `main` has **delegate** pattern + exports via `gaze_filter_stack.dart` |
| `lib/main.dart` | Branch has monolithic preview loop with rename fix; `main` has modular gaze features and different local names |

**No changes in:** `android/`, `ios/`, `pubspec.yaml`, `test/`, `.github/`, `ai/`, `docs/`, Gradle, CI.

---

## 4. Setup / build findings

| Topic | Finding |
|-------|---------|
| **Flutter compile** | Branch commit message is accurate for **its** tree: initial import referenced `GazeFilterStack` without defining it |
| **Dev environment** | **No** documented setup steps, scripts, README, or toolchain pins added |
| **Android / Gradle** | **Unchanged** on branch |
| **Dependencies** | **Unchanged** — no `pubspec.yaml` diff |
| **CI** | **Unchanged** |
| **Tests** | **Unchanged** — no test files in commit |

**Useful historical note:** At `4980581`, `lib/engine/gaze_pipeline.dart` already depended on `GazeFilterStack` via `import '../gaze_filter_stack.dart'`, but `gaze_filter.dart` ended at `GazeFilter` only — a **linker/symbol gap**, not an environment misconfiguration.

---

## 5. Runtime / product findings

### 5.1 Keyword scan (changed files only)

| Keyword | Hit | Notes |
|---------|-----|-------|
| Flutter | Yes | Commit message |
| Android / Gradle / dependency / CI / setup / environment | **No** | — |
| test | **No** | — |
| gaze | Yes | `GazeFilterStack`, `smoothGazeX/Y`, `_gazeFilter`, `rawGaze` |
| blink | Yes | Existing `nextBlinking`, blink drop fields — **logic unchanged** |
| calibration | **No** | — |
| runtime | Yes | Commit message (“runtime startup”) |
| proof / POPS | **No** | — |
| safety | **No** | — |

### 5.2 Gaze / signal assessment

| Item | Branch implementation | `main` / promoted |
|------|----------------------|-------------------|
| `GazeFilterStack` | Standalone duplicate of EMA/variance logic | Delegates to `GazeFilter` — DRY, same pipeline API |
| `GazePipeline` consumer | Unchanged import path | Same |
| Blink / EAR / calibration modules | At initial-import level only | **61 commits** of T-series extracts and tests on `main` |
| Intent OS / governance / safety | Initial-import kernels | Hardened `AutonomousExecutionKernel`, bypass tests, etc. (see v1 kernel audit) |

### 5.3 Comparison to [`CURSOR_V1_KERNEL_BRANCHES_AUDIT.md`](CURSOR_V1_KERNEL_BRANCHES_AUDIT.md)

| Aspect | v1 kernel branches | `dev-environment-setup-4f71` |
|--------|-------------------|------------------------------|
| Tip commit | `4980581` | `0ccccdfb` (= `4980581` + 1) |
| Unique work | None (3 identical bookmarks) | **One** compile-fix commit |
| Supersedes promoted runtime? | No | **No** |
| Worth individual re-audit? | No (closed) | **No** — strictly subsumed by `main` |

---

## 6. Promotion assessment

| Candidate | Promote? | Reason |
|-----------|----------|--------|
| `GazeFilterStack` duplicate in `gaze_filter.dart` | **No** | Regresses `main` delegate design; promoted copy already correct |
| `main.dart` variable renames | **No** | Target regions refactored on `main`; cherry-pick would conflict |
| Android/Gradle/CI setup | **N/A** | Not present |
| POPS / proof | **N/A** | Not present |

**Verdict:** **Nothing should be promoted** into `integrations/eye-tracking/flutter-runtime/` or i-project docs from this branch.

---

## 7. Files to ignore

| Path / artifact | Why ignore |
|-----------------|------------|
| Branch `GazeFilterStack` body (lines 75–144 on branch tip) | Duplicate of `GazeFilter`; worse than `main` |
| Co-authored-by Cursor metadata | No product signal |
| `lib/main.dart` on branch tip | Monolithic pre-T-series; authoritative loop is on `main` |
| Branch name `dev-environment-setup` | Misleading — no environment setup landed |

---

## 8. Exact recommendation

1. **Mark `cursor/dev-environment-setup-4f71` recovery complete** — no merge, no promotion, no further digs in `eye_tracking_app` Cursor branches unless new remotes appear.
2. **Record closure rationale:** Single compile-fix on `4980581`; **`main` @ `36d685f` and promoted flutter-runtime strictly dominate** for gaze pipeline and Intent OS.
3. **Do not cherry-pick `0ccccdfb`** — risk reintroducing duplicate `GazeFilterStack` or conflicting `main.dart`.
4. **Next audit (per recovery report):** `eye-earn-sparkle-archive/main` — **Studio component reconciliation** vs `integrations/eye-tracking/source/` studio/collab/media types (not another ET Cursor branch).

---

## Appendix A — `main` commits not on branch (sample)

Branch misses all post-import stabilization, including: gaze signal authority refactor, bypass safety test, calibration FSM, T-08–T-10 modular extracts, blink EAR helpers, `ai/` roadmap, Proof Packet types on promoted copy. Full gap: **61 commits** (`git rev-list --count origin/cursor/dev-environment-setup-4f71..origin/main`).

---

*Report generated: 2026-05-21*  
*Audit status: Read-only — no merges, no source-repo modifications, no deletions*
