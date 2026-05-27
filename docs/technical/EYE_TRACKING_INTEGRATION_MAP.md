# Eye-tracking integration map

**Status:** Integration copy complete (stabilization pass)  
**Archive:** `i_project_migration_archive`  
**Source (live, do not delete):** `~/eye_tracking_app`  
**Import provenance:** [`integrations/eye-tracking/ai-history/IMPORT_PROVENANCE.md`](../../integrations/eye-tracking/ai-history/IMPORT_PROVENANCE.md)

---

## 1. What was imported

**172 files** copied into `integrations/eye-tracking/` (excluding `node_modules`, build artifacts, `.git`, and caches).

| Destination | Contents |
|-------------|----------|
| `integrations/eye-tracking/source/` | Next.js admin shell (`app/`), TypeScript `src/` (Alphabet safe-action engine, Elo services, studio media/collab), partial Dart `lib/core/intent_os/`, Supabase migration `0018_safe_action_execution.sql`, `package.json`, configs |
| `integrations/eye-tracking/demos/investor-demo/` | Vite + React investor walkthrough (watch → verify → reward flow) |
| `integrations/eye-tracking/prototypes/i-mvp-prototype/` | Vite + React clickable MVP with simulated eye-tracking UI |
| `integrations/eye-tracking/docs/` | `DECISIONS.md`, `AGENTS.md`, Obsidian vault (gaze pipeline, native Android vision, kernel governance, intent OS) |
| `integrations/eye-tracking/ai-history/` | `IMPORT_PROVENANCE.md`, Cursor `continual-learning.json` |

---

## 2. Where it came from

| Item | Path |
|------|------|
| Local project | `/Users/2023macbookpro/eye_tracking_app` |
| Git remote | `https://github.com/iappmodel/i-initial-structures.git` |
| Import HEAD | `4953e01` — *Add clean MVP prototype inside main app repo* |

The source repo was **not moved or deleted**. This archive holds a **snapshot copy** for unified [ i ] development.

---

## 3. Why it matters to [ i ]

The rescued archive (`06_feed_earning_loops/iapp_loop1_watch_verify_earn.html`, pitch pages, masterplan) describes **verified attention** and **watch → verify → earn** as core product loops. The eye-tracking project is the engineering counterpart: gaze fixation, dwell, blink-triggered intent, and safety kernels that turn “attention” into a **defensible payout gate**.

Without this integration, the HTML prototypes remain visual fiction. With it, the archive has a path to **real verification** aligned with Loop 1 and wallet settlement.

---

## 4. Core eye-tracking logic (expected vs present in copy)

### Documented as core (in `AGENTS.md` + Obsidian vault)

These paths describe the **intended production stack** (Flutter + Android native). They are **not present** in the current git tree of `~/eye_tracking_app` — only documented:

| Layer | Documented location | Role |
|--------|---------------------|------|
| Native vision | `android/.../VisionProcessor.kt`, `vision_channel` | MediaPipe face landmarker, gaze x/y, quality, blink EAR |
| Dart pipeline | `lib/engine/gaze_pipeline.dart`, `gaze_normalize.dart`, `gaze_zone.dart` | Smoothing, zones, validity |
| Fixation / blink | `lib/gaze_fixation.dart`, `lib/blink_detector.dart`, `lib/main.dart` | Actionable gaze only when fixated |
| Intent OS kernels | `lib/core/intent_os/*` | Governance, safety, autonomous execution |

### Actually present in this import (runnable / reference code)

| File(s) | Role |
|---------|------|
| `source/lib/core/intent_os/governance_kernel.dart` | Fixation + dwell + confidence gates for autonomous UI actions |
| `source/lib/core/intent_os/action_pipeline_kernel.dart`, `action_decision.dart`, `kernel_evaluation_input.dart` | Pipeline evaluation scaffolding |
| `source/lib/core/system_state.dart` | `calibrationActive` and system flags |
| `docs/obsidian-vault/Projects/eye-tracking-app/native-android-vision.md` | Native Android contract (reference) |
| `docs/obsidian-vault/Projects/eye-tracking-app/gaze-dart-pipeline.md` | Dart pipeline layering (reference) |
| `docs/AGENTS.md` | Numeric constants, MediaPipe assets, channel contract (ground truth text) |

**Gap:** `governance_kernel.dart` imports `../../gaze_fixation.dart`, which was **not** in the source repo’s tracked files at import time. Treat native + full Flutter app as **external or prior workspace** until recovered from another machine, branch, or backup.

---

## 5. Demos and prototypes

### Demos (`integrations/eye-tracking/demos/`)

| Path | Purpose |
|------|---------|
| `investor-demo/index.html` | Entry for Vite demo — presenter-style flow |
| `investor-demo/src/screens/WatchVerifyScreen.tsx` | Watch + verify UX; **mocked gaze signals** |
| `investor-demo/src/screens/VerificationResultScreen.tsx` | Post-verification attention score |
| `investor-demo/src/demo/attentionDemoContext.ts` | Demo state for attention flow |
| `investor-demo/src/screens/RoadmapScreen.tsx` | Product roadmap screen |
| `investor-demo/design-ref/*.html` | HTML design references aligned with rescued archive |

**Run (from copy):** `cd integrations/eye-tracking/demos/investor-demo && npm install && npm run dev`

### Prototypes (`integrations/eye-tracking/prototypes/`)

| Path | Purpose |
|------|---------|
| `i-mvp-prototype/src/App.tsx` | Full MVP navigation; `eye-tracking: simulated` indicator |
| `i-mvp-prototype/design-reference/html-prototypes/` | Local HTML refs (overlap with archive folders 02–06) |

**Run:** `cd integrations/eye-tracking/prototypes/i-mvp-prototype && npm install && npm run dev`

---

## 6. How this supports verified attention

1. **Signal path (target):** Camera → MediaPipe landmarks → gaze x/y + quality → fixation/dwell → attention score → payout eligibility.
2. **Safety path (partially copied):** `GovernanceKernel` requires fixation, dwell > 0.8, confidence > 0.85, low risk, reversibility — matches “no payout on saccadic glance” product rule in `AGENTS.md`.
3. **Product demos (present):** Investor demo and MVP prototype express the **same user story** as `iapp_loop1_watch_verify_earn.html` but with React state instead of static HTML.
4. **Economy layer (present in source):** `src/lib/alphabet/safe-action-execution/` and Supabase migration tie trust/U-value events to **safe action execution** — adjacent to wallet/settlement in the rescued screens.

---

## 7. What still needs to connect to the [ i ] MVP

| Connection | Status |
|------------|--------|
| Rescued HTML launcher → eye-tracking section | Done (`prototype-app/index.html` §09) |
| Loop 1 HTML ↔ live gaze verification | Not connected — demo uses mocks |
| Flutter/Android vision app ↔ web MVP | Not in copied tree — needs recovery or re-link to `~/eye_tracking_app` if files exist only locally untracked |
| Alphabet admin (`source/app/`) ↔ rescued currency HTML | Parallel systems; schema in `supabase/migrations/` not wired to archive |
| Studio/creator TS modules ↔ `05_creator_campaigns` HTML | Conceptual overlap only |
| Single `app/` workspace at repo root | **Future** — per README, not started this pass |

**Recommended wiring order:** (1) run investor-demo beside launcher, (2) map `WatchVerifyScreen` states to `06_feed_earning_loops/iapp_loop1_watch_verify_earn.html` fields, (3) locate or restore full Flutter `lib/` from source machine, (4) embed gaze bridge into next React/Vite app under a new `app/` folder.

---

## 7.1 Phase 14 safe-flag promotion

- `app/src/lib/visionEngine.ts` introduces `VITE_VISION_ENGINE` with **default off** behavior.
- `app/src/screens/EarnScreen.tsx` now surfaces an explicit banner when web-vision experimental mode is enabled.
- This is intentionally additive only: no settlement, payout, or POP validator contract changes.

---

## 8. Risks and unknowns

| Risk | Detail |
|------|--------|
| **Incomplete Flutter tree** | `AGENTS.md` references `lib/main.dart`, `VisionProcessor.kt`, etc., but git only tracks 8 Dart files under `lib/core/`. Full eye-tracking may live untracked, another repo, or an older checkout. |
| **Broken Dart import** | `governance_kernel.dart` → missing `gaze_fixation.dart` in copy. |
| **Duplicate HTML** | `design-reference/html-prototypes/` duplicates rescued archive — risk of editing the wrong copy; prefer `08_raw_originals` as read-only truth. |
| **Two package names** | Root `package.json` is `alphabet-admin-layer`; demos are separate Vite apps — no monorepo glue yet. |
| **No automated tests in import** | `vitest.config.ts` exists at source root; test files were not in the 163 tracked paths. |
| **Privacy / camera** | `DECISIONS.md` mandates local-first telemetry; production needs consent flows not present in rescued HTML. |

---

## Quick file index (launcher-linked)

- Integration map (this file): `docs/technical/EYE_TRACKING_INTEGRATION_MAP.md`
- Import provenance: `integrations/eye-tracking/ai-history/IMPORT_PROVENANCE.md`
- Decision log: `integrations/eye-tracking/docs/DECISIONS.md`
- Agent ground truth: `integrations/eye-tracking/docs/AGENTS.md`
- MOC / hub note: `integrations/eye-tracking/docs/obsidian-vault/Projects/eye-tracking-app/00-MOC-eye-tracking-app.md`
