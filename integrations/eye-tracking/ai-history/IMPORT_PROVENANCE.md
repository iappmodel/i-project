# Eye-tracking import provenance

**Imported on:** 2026-05-20  
**Source project (unchanged on disk):** `~/eye_tracking_app`  
**Source last modified (filesystem):** 2026-05-14  

## Git snapshot at import time

| Field | Value |
|--------|--------|
| HEAD commit | `4953e019f79e27c07c346ba8f6999e8af51e128b` |
| Commit message | Add clean MVP prototype inside main app repo |
| Remote | `https://github.com/iappmodel/i-initial-structures.git` |
| Tracked files | 163 (per `git ls-files`) |

### Recent commit history (copied for traceability)

```
4953e01 Add clean MVP prototype inside main app repo
4eace0c Add investor demo MVP scaffold
b9216bf Ignore local generated folders
a5b15d4 Initial project structure
```

## Copy policy

- **Copied:** application source, demos, prototypes, documentation, Cursor continual-learning state.
- **Excluded:** `node_modules`, `.git`, `build/`, `dist/`, `.next`, `.vite`, `.cache`, `*.tsbuildinfo`, `.DS_Store`.
- **Not moved:** the original `~/eye_tracking_app` directory remains in place.

## Destination layout in this archive

| Source (`~/eye_tracking_app`) | Destination |
|----------------------------------|-------------|
| `app/`, `src/`, `lib/`, `supabase/`, root configs | `integrations/eye-tracking/source/` |
| `investor-demo/` | `integrations/eye-tracking/demos/investor-demo/` |
| `prototypes/` | `integrations/eye-tracking/prototypes/` |
| `docs/`, `AGENTS.md` | `integrations/eye-tracking/docs/` |
| `.cursor/` | `integrations/eye-tracking/ai-history/cursor/` |

## Read-only archive rule

Folders `00_README` through `08_raw_originals` are **rescued ChatGPT exports** — treat as reference-only. Eye-tracking integration lives under `integrations/` and must not overwrite archived originals.

## Cursor / AI history note

`ai-history/cursor/hooks/state/continual-learning.json` preserves one Cursor hook state file from the source repo. No separate “done log” or roadmap markdown was found in the git-tracked tree; product decisions live in `integrations/eye-tracking/docs/DECISIONS.md` and the Obsidian vault under `integrations/eye-tracking/docs/obsidian-vault/`.
