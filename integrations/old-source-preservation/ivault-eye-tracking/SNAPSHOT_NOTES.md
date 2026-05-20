# IVAULT `eye_tracking_app` snapshot

**Source path:** `~/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app`  
**Captured:** 2026-05-20 (read-only; source repo not modified)

## Git state at capture

| Field | Value |
|-------|-------|
| **Branch** | `integration/studio-routing-audit` |
| **Tracking** | `origin/integration/studio-routing-audit` |
| **HEAD** | `d23d365` — Add autonomous Claude workflow docs |
| **Remote** | `https://github.com/iappmodel/eye_tracking_app.git` |
| **Working tree** | Clean for tracked files; **untracked** `investor-demo/` (Vite tree) |

## Last 10 commits (current branch)

```
d23d365 Add autonomous Claude workflow docs
3910759 Initial i app project before Claude migration
e9e8e4f Merge Studio proof mock pipeline
054331f Add Studio proof mock pipeline
45adbfb Add i Command dev smoke buttons
361e0ae Update IResponseCard rendering
3c7740c Use normalized i Command display result in UI
250184b Add Studio Stage 6 publish mock pipeline
003e0e3 Add i Command display result normalization
d6f4502 Expand i Command fixture coverage
```

Full log copy: [`recent-commits.txt`](recent-commits.txt)  
Metadata: [`git-metadata.txt`](git-metadata.txt)

## What was copied into this archive

| Destination | Method | Files |
|-------------|--------|-------|
| [`snapshot/`](snapshot/) | `git archive HEAD` (tracked files only) | **2,640** files (~24 MB) |
| [`untracked-investor-demo/`](untracked-investor-demo/) | `rsync` excluding `node_modules`, `dist`, `build` | Vite source snapshot (~620 KB) |

## Excluded (by design)

- `.git/`, `node_modules/`, `dist/`, `build/`, `.dart_tool/`, local `build/` outputs on disk (~1.7 GB full folder)
- **13 git stashes** — preserved separately under [`../ivault-eye-tracking-stashes/`](../ivault-eye-tracking-stashes/)
- Other local branches (`main`, `investor-demo-mvp-night-build`, `feature/evidence-vault-v2-hardening`, etc.) — not archived in this pass

## Relation to i-project

- `integrations/eye-tracking/source/` (~71 files) is a **narrow** fragment, not this monorepo.
- `integrations/eye-tracking/flutter-runtime/` matches IVAULT **`main`** @ `36d685f`, not this integration branch.

## Review hint

Treat `snapshot/` as the Studio / i Command / evidence-vault monorepo slice at `d23d365`. Compare to stash patches before assuming branch-only coverage.
