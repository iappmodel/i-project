# Obsidian bundle — folder naming

This folder **mirrors a vault layout** so you can copy `Projects/eye-tracking-app/` into Obsidian unchanged.

## Recommended vault path

```text
Projects/eye-tracking-app/
```

**Why this shape**

- **`Projects/`** — PARA-style: time-bound, repo-linked work stays out of evergreen `Areas/`.
- **`eye-tracking-app/`** — **lowercase slug** matching the git repo name: stable wikilinks, no spaces in paths (fewer tooling issues), still readable.

**Alternatives** (if your vault already uses another convention)

| You use | Then |
|--------|------|
| `Areas/Tech/` | Place the same files under `Areas/Tech/eye-tracking-app/` |
| `Sources/codebases/` | `Sources/codebases/eye-tracking-app/` |
| Flat vault | Copy only the `.md` files into vault root and fix wikilinks if titles collide |

**Wikilinks** in the notes assume Obsidian’s default: `[[note-title]]` resolves to a unique file name (e.g. `[[kernel-safety]]` → `kernel-safety.md`).

## Contents

| File | Role |
|------|------|
| `00-MOC-eye-tracking-app.md` | Map of content, flow diagram, open questions |
| `native-android-vision.md` | Camera → native → channel |
| `gaze-dart-pipeline.md` | Flutter gaze processing |
| `kernel-action-pipeline.md` | `ActionPipelineKernel` |
| `kernel-governance.md` | `GovernanceKernel` |
| `kernel-safety.md` | `SafetyKernel` |
| `kernel-autonomous-execution.md` | `AutonomousExecutionKernel` (gate order) |
| `intent-os-overview.md` | Prediction → execution stages + `IntentOS.process` |

## Sync from repo

After edits in the repo, re-copy the folder into your vault, or symlink:

```bash
ln -s /path/to/eye_tracking_app/docs/obsidian-vault/Projects/eye-tracking-app \
       /path/to/Vault/Projects/eye-tracking-app
```

---

*Part of `eye_tracking_app` — keep in sync with `AGENTS.md` for thresholds and platform facts.*
