# Old-source preservation (read-only)

**Purpose:** Frozen snapshots of unresolved work identified in [`docs/technical/BRANCH_AND_SOURCE_INTEGRATION_AUDIT.md`](../../docs/technical/BRANCH_AND_SOURCE_INTEGRATION_AUDIT.md). This tree is **not** canonical product code.

**Captured:** 2026-05-20 (UTC timestamps in per-folder notes)

## Rules followed

- No deletes in source repos
- No edits to source repos
- No merges, cherry-picks, or stash apply
- No overwrite of existing `integrations/eye-tracking/*` promoted paths
- Excluded from copies: `node_modules/`, `dist/`, `build/`, `.git/`, caches
- No builds run during capture

## Layout

| Folder | Source | Contents |
|--------|--------|----------|
| [`ivault-eye-tracking/`](ivault-eye-tracking/) | `~/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app` | Branch `integration/studio-routing-audit` @ `d23d365` — tracked tree via `git archive` + untracked `investor-demo/` source |
| [`ivault-eye-tracking-stashes/`](ivault-eye-tracking-stashes/) | Same repo | 13 stash entries — index + unified diffs only (`patches/stash-{n}.patch`) |
| [`itrack-dirty-worktree/`](itrack-dirty-worktree/) | `~/Desktop/iTrack` | Uncommitted `main` edits — status, diff, copied modified files |
| [`home-eye-tracking-post-import/`](home-eye-tracking-post-import/) | `~/eye_tracking_app` | Post-import commit `9e7cc37` (i-mvp-prototype expansion) |

## Report

See [`docs/technical/OLD_SOURCE_PRESERVATION_REPORT.md`](../../docs/technical/OLD_SOURCE_PRESERVATION_REPORT.md) for what was preserved, excluded, unknowns, and recommended review order.

## Using this material

1. **Compare only** — diff against `integrations/eye-tracking/flutter-runtime/`, `demos/investor-demo/`, or `prototypes/i-mvp-prototype/` before any promotion.
2. **Do not import blindly** — IVAULT integration branch is ~2,640 tracked files; stashes may overlap branch tips.
3. **Source of truth for live work** — original paths on Desktop remain authoritative until an explicit integration decision.
