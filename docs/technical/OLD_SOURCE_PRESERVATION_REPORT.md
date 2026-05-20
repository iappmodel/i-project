# Old-source preservation report

**Date:** 2026-05-20  
**Trigger:** [`BRANCH_AND_SOURCE_INTEGRATION_AUDIT.md`](BRANCH_AND_SOURCE_INTEGRATION_AUDIT.md) — priority unresolved sources  
**Archive root:** `integrations/old-source-preservation/`

---

## 1. What was preserved

| ID | Source | Destination | Summary |
|----|--------|-------------|---------|
| **A** | IVAULT `eye_tracking_app` @ `integration/studio-routing-audit` | `ivault-eye-tracking/` | 2,640 tracked files via `git archive`; untracked `investor-demo/` source (no `node_modules`/`dist`) |
| **B** | IVAULT 13 stashes | `ivault-eye-tracking-stashes/patches/` | `stash-0.patch` … `stash-12.patch` + [`STASH_INDEX.md`](../integrations/old-source-preservation/ivault-eye-tracking-stashes/STASH_INDEX.md) |
| **C** | iTrack dirty `main` | `itrack-dirty-worktree/` | 3 source files + full working-tree diff |
| **D** | Home `eye_tracking_app` `9e7cc37` | `home-eye-tracking-post-import/` | i-mvp-prototype `App.tsx` / `App.css` at post-import tip |

**Total artifact files:** ~2,722 under `integrations/old-source-preservation/` (~26 MB excluding repo `.git`).

---

## 2. What was excluded

| Category | Reason |
|----------|--------|
| `node_modules/`, `dist/`, `build/`, `.git/`, `.dart_tool/`, caches | Per preservation rules; IVAULT live folder is ~1.7 GB on disk |
| iTrack `android/build/reports/...` | Build artifact — noted in diff only |
| Stash **apply** / branch merges / cherry-picks | Preservation-only mandate |
| IVAULT branches other than current checkout | e.g. `investor-demo-mvp-night-build` @ `f740579`, `main` @ `36d685f` already partially represented elsewhere |
| eye-earn-sparkle-archive, DEMOS:REPOS siblings, broken worktrees | Out of scope for this pass (still **unknown**) |
| Overwriting `integrations/eye-tracking/*` promoted paths | Explicit non-goal |

---

## 3. What remains unknown

- Whether stash patches duplicate commits on `chore/restore-stashed-prototypes` / `audit/repo-hygiene-checkpoint`
- Full IVAULT `investor-demo-mvp-night-build` HTML prototypes (`f740579`, +14k lines vs `main`)
- eye-earn-sparkle-archive branches and local modifications
- DEMOS:REPOS folders not scanned (`i-app`, `i-app-demo`, flux, HTML MVPs, zips)
- Remote-only branches (`origin/cursor/*`, `origin/claude/*`) never checked out locally
- Broken `eye-earn-sparkle-demo` worktree link

---

## 4. Recommended next review order

| Order | Item | Action |
|-------|------|--------|
| **1** | iTrack dirty tree | Diff `itrack-dirty-worktree/files/lib/main.dart` vs `integrations/eye-tracking/flutter-runtime/lib/main.dart` ([`DELTA_NOTES.md`](../integrations/eye-tracking/flutter-runtime/DELTA_NOTES.md)) |
| **2** | Home `9e7cc37` | Diff `home-eye-tracking-post-import/` vs `integrations/eye-tracking/prototypes/i-mvp-prototype/` — promote or fold into canonical demo |
| **3** | IVAULT stashes | Spot-check `stash-11` / `stash-12` (Studio / i Command) against `ivault-eye-tracking/snapshot/` for redundancy |
| **4** | IVAULT integration monorepo | Architectural review of `ivault-eye-tracking/snapshot/` vs narrow `integrations/eye-tracking/source/` (71 files) |
| **5** | IVAULT `investor-demo-mvp-night-build` @ `f740579` | Separate snapshot pass if HTML prototypes are still needed |
| **6** | Sparkle / DEMOS siblings | Focused audit per audit §10 item 6–7 |

---

## 5. Source repos (unchanged)

No modifications were made to:

- `~/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app`
- `~/Desktop/iTrack`
- `~/eye_tracking_app`

---

## 6. Launcher links

- [`integrations/old-source-preservation/README.md`](../integrations/old-source-preservation/README.md)
- This report

*End of preservation report.*
