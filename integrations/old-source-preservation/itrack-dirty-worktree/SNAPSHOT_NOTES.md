# iTrack dirty working tree

**Source path:** `~/Desktop/iTrack`  
**Captured:** 2026-05-20 (read-only; source repo not modified)

## Git state at capture

| Field | Value |
|-------|-------|
| **Branch** | `main` |
| **Committed tip** | `d0bc0c6` — Gate iris debug logging behind `kDebugMode` |
| **Remote** | `https://github.com/iappmodel/eye_tracking_app.git` |
| **Tracking** | `origin/main` |

## Uncommitted changes

| Path | Preserved | Notes |
|------|-----------|-------|
| `lib/main.dart` | Yes → [`files/lib/main.dart`](files/lib/main.dart) | Large monolithic fork vs modular IVAULT `main` |
| `android/app/src/main/kotlin/.../MainActivity.kt` | Yes | Native bridge expansion |
| `lib/gaze_zone_buttons.dart` | Yes | Zone button logic drift |
| `android/build/reports/problems/problems-report.html` | **No** (diff only in patch) | Build artifact — excluded from `files/` |

## Artifacts

- [`git-status.txt`](git-status.txt) — full `git status` output
- [`diffs/working-tree.patch`](diffs/working-tree.patch) — complete working tree diff
- [`diffs/working-tree-stat.txt`](diffs/working-tree-stat.txt) — `--stat` summary
- [`files/`](files/) — copies of modified source files with original paths

## Relation to i-project

`integrations/eye-tracking/flutter-runtime/` was promoted from IVAULT **`main`**, not this dirty tree. See [`integrations/eye-tracking/flutter-runtime/DELTA_NOTES.md`](../../eye-tracking/flutter-runtime/DELTA_NOTES.md).

## Review hint

Side-by-side diff: preserved `files/lib/main.dart` vs `integrations/eye-tracking/flutter-runtime/lib/main.dart` before any merge decision.
