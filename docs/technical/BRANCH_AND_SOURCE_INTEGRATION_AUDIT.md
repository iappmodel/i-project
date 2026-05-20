# Branch and source integration audit

**Audit date:** 2026-05-20  
**Operator:** Discovery only (no merges, cherry-picks, deletes, or edits to source repos)  
**Portable archive:** `~/Desktop/i-project-rescue/i_project_migration_archive`  
**Remote:** `https://github.com/iappmodel/i-project.git` (branch `main`)

Related prior reports: [`EYE_TRACKING_INTEGRATION_MAP.md`](EYE_TRACKING_INTEGRATION_MAP.md), [`EYE_TRACKING_RUNTIME_RECOVERY_REPORT.md`](EYE_TRACKING_RUNTIME_RECOVERY_REPORT.md), [`FLUTTER_RUNTIME_PROMOTION_REPORT.md`](FLUTTER_RUNTIME_PROMOTION_REPORT.md), [`INVESTOR_DEMO_VARIANT_COMPARISON.md`](INVESTOR_DEMO_VARIANT_COMPARISON.md)

---

## 1. Summary verdict

| Question | Answer |
|----------|--------|
| **Have we integrated everything?** | **Partial** |
| **Flutter eye-tracking runtime** | **Likely preserved** — promoted to `integrations/eye-tracking/flutter-runtime/` from IVAULT `main` snapshot; immutable copy in `source-runtime-candidates/` |
| **React investor demo + home prototypes** | **Partially preserved** — canonical demo + IVAULT candidate; home repo has **one unpromoted commit** on `investor-demo-mvp-night-build` |
| **IVAULT full app monorepo (Studio / i Command / evidence vault)** | **Not integrated** — `integration/studio-routing-audit` has ~2,640 tracked files; i-project `integrations/eye-tracking/source/` has **71** files |
| **Stashes (13) on IVAULT `eye_tracking_app`** | **Not integrated** — WIP Studio / iGO / i Command slices |
| **iTrack local edits** | **Not integrated** — only delta **candidates** copied; working tree dirty |
| **eye-earn-sparkle ecosystem** | **Not integrated** — separate repos; `attention_mediapipe` plugin copied as candidate only |
| **DEMOS:REPOS parent folder** | **Not a git repo** — collection of many i-related folders; only targeted paths were copied |

**Bottom line:** The archive successfully centralizes **rescued HTML**, **Flutter runtime**, **narrow Next.js/Dart fragments**, and **investor-demo variants** for portable [ i ] work. It does **not** contain the full IVAULT eye-tracking monorepo branches, stash WIP, sparkle-archive product app, or live iTrack modifications.

---

## 2. Repos and folders inspected

| # | Path | Git repo? | Current branch | Remote URL | Working tree |
|---|------|-----------|----------------|------------|--------------|
| 1 | `~/Desktop/i-project-rescue/i_project_migration_archive` | Yes | `main` | `https://github.com/iappmodel/i-project.git` | `?? docs/APP_AUDIT_REPORT.md` |
| 2 | `~/eye_tracking_app` | Yes | `investor-demo-mvp-night-build` | `https://github.com/iappmodel/i-initial-structures.git` | Clean |
| 3 | `~/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app` | Yes | `integration/studio-routing-audit` | `https://github.com/iappmodel/eye_tracking_app.git` | `?? investor-demo/` (full Vite tree) |
| 4 | `~/Desktop/iTrack` | Yes | `main` | `https://github.com/iappmodel/eye_tracking_app.git` | **Modified** (4 paths, see §6) |
| 5 | `~/Desktop/IVAULT/DEMOS:REPOS/eye-earn-sparkle-demo` | **Broken worktree** | — | `gitdir:` → `~/Desktop/eye-earn-sparkle-archive/.git/worktrees/eye-earn-sparkle-demo` (**missing**) | Folder exists; git metadata broken |
| 6 | `~/Desktop/IVAULT/DEMOS:REPOS` | **No** | — | — | Parent directory only |
| 7 | `~/Desktop/IVAULT/DEMOS:REPOS/eye-earn-sparkle-archive` | Yes | `codex/investor-demo-mode-v2` | `https://github.com/iappmodel/eye-earn-sparkle-archive.git` | Modified + untracked (see §6) |
| 8 | `~/Desktop/IVAULT/DEMOS:REPOS/eye-earn-sparkle` | Yes | `demo-investor` | `https://github.com/iappmodel/eye-earn-sparkle.git` | `package.json` / lock / PWA icons modified |
| 9 | `~/Desktop/IVAULT/DEMOS:REPOS/eye-earn-sparkle-1` | Yes | `main` | `https://github.com/iappmodel/eye-earn-sparkle.git` | `package-lock.json` modified |

**Not exhaustively audited** (listed in DEMOS:REPOS but out of scope for deep branch log): `i-app`, `i-app-demo`, `i dev demo`, `flux-i-app`, `i_app`, HTML MVP recovery files, zip archives, etc. Treat as **unknown** until a follow-up pass.

---

## 3. Branches found (by repo)

### 3.1 `i_project_migration_archive`

| Branch | Tip | Recent commits (last 10) |
|--------|-----|-------------------------|
| `main` | `2f55651` | Create canonical React investor demo; preserve IVAULT investor variant; Flutter promotion; eye-tracking recovery scan; masterbrain inventory; rescued launcher |

### 3.2 `~/eye_tracking_app` (`i-initial-structures`)

| Branch | Tip | Notes |
|--------|-----|-------|
| `investor-demo-mvp-night-build` * | `9e7cc37` | **1 commit ahead** of import baseline `4953e01` |
| `main` | `a5b15d4` | Initial structure only |
| `dev` | `a5b15d4` | Same as `main` |

**Recent on `investor-demo-mvp-night-build`:** `9e7cc37` Update i MVP prototype before project migration → `4953e01` Add clean MVP prototype → `4eace0c` investor demo scaffold → `b9216bf` ignore generated → `a5b15d4` initial.

**Import provenance in archive:** HEAD `4953e01` per [`integrations/eye-tracking/ai-history/IMPORT_PROVENANCE.md`](../../integrations/eye-tracking/ai-history/IMPORT_PROVENANCE.md).

### 3.3 IVAULT `eye_tracking_app`

| Branch | Tip | In i-project? |
|--------|-----|---------------|
| `main` | `36d685f` | **Yes** — basis for `flutter-runtime/` + `source-runtime-candidates/from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/` |
| `integration/studio-routing-audit` * | `d23d365` | **No** (full monorepo) |
| `feature/evidence-vault-v2-hardening` | `d23d365` | **No** (same tip as integration) |
| `investor-demo-mvp-night-build` | `f740579` | **Partial** — adds HTML design-reference prototypes (+14k lines vs `main`); not in archive |
| `dev` | `419562a` | **No** — annotation pass on sim/mock files |
| `audit/repo-hygiene-checkpoint` | `607c225` | **No** |
| `checkpoint/pre-composer-cleanup` | `78d8f68` | **No** |
| `chore/restore-stashed-prototypes` | `cba625d` | **No** |
| `safety/studio-audit-current` | `e9e8e4f` | **No** |
| `studio/proof-from-stash` | `054331f` | **No** |

**Remote-only (no local branch):** `origin/add-claude-github-actions-*`, `origin/claude/issue-*`, `origin/cursor/dev-environment-setup-4f71`, `origin/cursor/v1-{autonomy,safety,signal}-4f71`.

**Recent on `integration/studio-routing-audit`:** `d23d365` Claude workflow docs → `3910759` Initial i app before Claude migration → Studio proof / i Command / publish pipeline merges.

**Recent on `main` (Flutter line):** `36d685f` roadmap sync → T-09/T-10 blink helper extractions → zone dwell helpers.

### 3.4 `~/Desktop/iTrack`

| Branch | Tip | Notes |
|--------|-----|-------|
| `main` | `d0bc0c6` | **Ahead of IVAULT `main`** (`36d685f`) by `d0bc0c6` Gate iris debug logging |

**Remote-only:** same `origin/cursor/*` branches as IVAULT clone.

### 3.5 `eye-earn-sparkle-archive`

| Branch | Tip |
|--------|-----|
| `codex/investor-demo-mode-v2` * | `6391b06` |
| `codex/investor-demo-mode` | `0b260c6` |
| `codex/investor-demo` | `b041361` (worktree `+` listed in `git branch`) |
| `codex/vision-unified-pipeline` | `22cabd3` |
| `codex/httpsgithubcomiappmodeleyeearnsparklearchive-i-app-full` | `9b61a9a` |
| `feature/updates` | `22cabd3` |
| `main` | `b041361` |

### 3.6 `eye-earn-sparkle` / `eye-earn-sparkle-1`

| Repo | Branch | Tip |
|------|--------|-----|
| eye-earn-sparkle | `demo-investor` | (modified package files) |
| eye-earn-sparkle-1 | `main` | (modified lockfile) |

---

## 4. Branches already represented in i-project

| Source | Branch / snapshot | i-project destination | Evidence |
|--------|-------------------|----------------------|----------|
| `~/eye_tracking_app` | `4953e01` on `investor-demo-mvp-night-build` | `integrations/eye-tracking/source/`, `demos/investor-demo/`, `prototypes/`, `docs/`, `ai-history/` | [`IMPORT_PROVENANCE.md`](../../integrations/eye-tracking/ai-history/IMPORT_PROVENANCE.md) |
| IVAULT `eye_tracking_app` | `main` @ `36d685f` (filesystem snapshot 2026-05-20) | `source-runtime-candidates/from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/` + `flutter-runtime/` | [`COPY_MANIFEST.md`](../../integrations/eye-tracking/source-runtime-candidates/COPY_MANIFEST.md), [`FLUTTER_RUNTIME_PROMOTION_REPORT.md`](FLUTTER_RUNTIME_PROMOTION_REPORT.md) |
| IVAULT `eye_tracking_app/investor-demo` (untracked) | Working tree | `demos/investor-demo-candidates/from-ivault-investor-demo/` | [`INVESTOR_DEMO_VARIANT_COMPARISON.md`](INVESTOR_DEMO_VARIANT_COMPARISON.md) |
| `~/Desktop/iTrack` | `main` + **committed** history | `source-runtime-candidates/from-Desktop-iTrack/` (5 files) | [`DELTA_NOTES.md`](../../integrations/eye-tracking/flutter-runtime/DELTA_NOTES.md) |
| `~/eye_tracking_app` | intent OS paths | `source-runtime-candidates/from-home-eye_tracking_app/` | Recovery scan |
| IVAULT `eye-earn-sparkle-demo/attention_mediapipe` | Plugin tree | `source-runtime-candidates/from-Desktop-IVAULT-DEMOS-REPOS-eye-earn-sparkle-demo-attention_mediapipe/` | Recovery scan |
| Rescued ChatGPT HTML | N/A | `00_README` … `08_raw_originals`, `prototype-app/` | Archive rescue commits |
| Masterbrain exports | N/A | `masterbrain/` | `21b4fdc` |
| Canonical investor demo (archive-native) | `main` @ `2f55651` | `integrations/eye-tracking/demos/investor-demo/` + root `app/` | Recent i-project commits |

---

## 5. Branches not yet represented

| Source | Branch / artifact | Risk | Why it matters |
|--------|-------------------|------|----------------|
| IVAULT `eye_tracking_app` | `integration/studio-routing-audit`, `feature/evidence-vault-v2-hardening` | **Needs review** | Full product monorepo: `src/`, `apps/`, `supabase/`, Studio, i Command, evidence vault (~2,640 files) |
| IVAULT `eye_tracking_app` | `audit/repo-hygiene-checkpoint`, `chore/restore-stashed-prototypes`, `safety/studio-audit-current`, `studio/proof-from-stash` | **Needs review** | Studio / iGO / MASTER BRAIN prototype slices |
| IVAULT `eye_tracking_app` | `investor-demo-mvp-night-build` @ `f740579` | **Needs review** | HTML prototypes under `design-reference/html-prototypes/` (+14k lines vs `main`) |
| IVAULT `eye_tracking_app` | `dev` @ `419562a` | **Unknown** | Mock/economy annotation layer |
| IVAULT `eye_tracking_app` | **13 git stashes** | **Needs review** | Uncommitted Studio / iGO / i Command WIP (see §7) |
| `~/eye_tracking_app` | `9e7cc37` (post-import) | **Needs review** | Large `prototypes/i-mvp-prototype` App.tsx/CSS update (+639/−110 lines) |
| `~/Desktop/iTrack` | **Uncommitted** `main` edits | **Needs review** | `main.dart` (+329 lines), `MainActivity.kt`, `blink_detector` path — **not** in `flutter-runtime/` |
| `eye-earn-sparkle-archive` | All branches | **Unknown** | Separate PWA/product codebase; Tobii WS, investor demo mode v2 |
| `eye-earn-sparkle` / `-1` | `demo-investor`, `main` | **Unknown** | Sibling product; local package drift |
| IVAULT `eye-earn-sparkle-demo` | Broken worktree | **Needs review** | `attention_mediapipe` copied; worktree link to missing `~/Desktop/eye-earn-sparkle-archive` |
| Remote-only | `origin/cursor/*`, `origin/claude/*` | **Unknown** | Never checked out locally on IVAULT clone |
| DEMOS:REPOS siblings | `i-app`, `i-app-demo`, flux, HTML MVPs, zips | **Unknown** | Not scanned in this pass |

---

## 6. Untracked folders and files that may matter

### 6.1 `i_project_migration_archive`

| Path | Notes |
|------|-------|
| `docs/APP_AUDIT_REPORT.md` | Untracked; unrelated to eye-tracking branches |

### 6.2 IVAULT `eye_tracking_app`

| Path | Notes |
|------|-------|
| `investor-demo/` (entire tree) | **Untracked in git**; partially mirrored as `demos/investor-demo-candidates/from-ivault-investor-demo/`. Live folder also has `node_modules/`, `dist/` (excluded from archive copy). **7 source files** still differ from canonical demo (see [`INVESTOR_DEMO_VARIANT_COMPARISON.md`](INVESTOR_DEMO_VARIANT_COMPARISON.md)). |

### 6.3 `~/Desktop/iTrack` (modified, not untracked)

| File | Δ summary |
|------|-----------|
| `lib/main.dart` | +329 / −? lines (monolithic fork vs modular IVAULT `main`) |
| `android/.../MainActivity.kt` | +165 lines |
| `lib/gaze_zone_buttons.dart` | ±64 lines |
| `android/build/reports/problems/problems-report.html` | build artifact (low value) |

### 6.4 `eye-earn-sparkle-archive`

| Path | Notes |
|------|-------|
| `?? src/components/EarnScreen.tsx` | Untracked |
| `?? src/components/FeedSurfaceChrome.tsx` | Untracked |
| `M` Index, PromoVideosFeed, AppContext, etc. | Uncommitted on `codex/investor-demo-mode-v2` |

### 6.5 Broken worktree `eye-earn-sparkle-demo`

- `.git` file points to `~/Desktop/eye-earn-sparkle-archive/.git/worktrees/eye-earn-sparkle-demo` which **does not exist** on Desktop (archive lives under IVAULT path only).
- Folder content still on disk; treat as **orphan working copy** until worktree is repaired or re-linked.

---

## 7. Stashes found

**Repo:** `~/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app` only (**13 stashes**). No stashes on other inspected repos.

| Stash | Base branch | Message (abbrev.) |
|-------|-------------|-------------------|
| `stash@{0}` | `audit/repo-hygiene-checkpoint` | WIP i-feature prototype tree before next slice |
| `stash@{1}` | `feature/evidence-vault-v2-hardening` | WIP Studio proof panel separate from i Command |
| `stash@{2}` | `feature/evidence-vault-v2-hardening` | WIP Studio publish panel separate from i Command |
| `stash@{3}` | `feature/evidence-vault-v2-hardening` | WIP iGO Stage 1–5 local campaign builder demo clean |
| `stash@{4}` | `chore/restore-stashed-prototypes` | WIP unrelated after i Command Stage 4 |
| `stash@{5–12}` | `feature/evidence-vault-v2-hardening` | iGO stages 1–4, i Command files, Studio i feature files, publish panels |

**None** of these stashes are represented in i-project. They may duplicate commits on branches `chore/restore-stashed-prototypes` / `audit/repo-hygiene-checkpoint` but require explicit `git stash show` review before assuming redundancy.

---

## 8. Comparison against i-project imported areas

| Archive path | Role | Coverage vs local repos |
|--------------|------|-------------------------|
| `integrations/eye-tracking/flutter-runtime/` | Promoted Android/Flutter runtime | Matches IVAULT **`main`** snapshot, not `integration/*` branch |
| `integrations/eye-tracking/source-runtime-candidates/` | Immutable recovery copies | IVAULT `main`, iTrack deltas, home intent OS, `attention_mediapipe` plugin |
| `integrations/eye-tracking/demos/investor-demo/` | Canonical React demo | From **home** `4953e01`; archive commit `2f55651` refined canonical |
| `integrations/eye-tracking/demos/investor-demo-candidates/` | IVAULT demo snapshot | External untracked `investor-demo/` |
| `integrations/eye-tracking/source/` | Narrow Next.js + Dart fragment | **~71 files** vs IVAULT integration branch **~2,640** |
| `integrations/eye-tracking/prototypes/i-mvp-prototype/` | Clickable MVP | Home import; **missing** home commit `9e7cc37` prototype expansion |
| `app/` | Root canonical investor demo (Vite) | Archive-native; not tied to a external branch tip |
| `masterbrain/` | Chat/product inventory | Independent of eye-tracking git branches |
| `prototype-app/index.html` | Launcher | Links technical docs; does not execute git branches |

---

## 9. Risk assessment

| Category | Items | Assessment |
|----------|-------|------------|
| **Likely already preserved** | IVAULT Flutter `main` → `flutter-runtime/` + candidates; home `4953e01` web/demo/docs import; rescued HTML; masterbrain; investor-demo canonical + IVAULT candidate copy | Safe for portable archive work; run `flutter test` when validating |
| **Needs review** | `integration/studio-routing-audit` monorepo; 13 stashes; iTrack dirty `main`; home `9e7cc37`; IVAULT untracked `investor-demo/` live drift; IVAULT `investor-demo-mvp-night-build` HTML prototypes; iTrack vs IVAULT `main.dart` fork | Import or snapshot decision required before claiming “complete” |
| **Unknown** | eye-earn-sparkle-archive branches; DEMOS:REPOS sibling folders; remote-only cursor/claude branches; broken `eye-earn-sparkle-demo` worktree | Schedule focused pass or branch snapshots |

---

## 10. Recommended next actions

| Priority | Action | Type |
|----------|--------|------|
| 1 | **Preserve branch snapshot** — tag or bundle `integration/studio-routing-audit` @ `d23d365` and `investor-demo-mvp-night-build` @ `f740579` without merging | `git archive` / read-only tarball into `integrations/` or external vault |
| 2 | **Preserve stash snapshot** — `git stash show -p` exports for all 13 entries on IVAULT `eye_tracking_app` | Documentation + tarball |
| 3 | **Compare before merge** — iTrack dirty tree vs `flutter-runtime/lib/main.dart` per [`DELTA_NOTES.md`](../../integrations/eye-tracking/flutter-runtime/DELTA_NOTES.md) | Side-by-side diff only |
| 4 | **Import candidate** — home `9e7cc37` prototype changes OR merge IVAULT investor-demo UI deltas into canonical demo | Copy-only after review |
| 5 | **Ignore duplicate** — `eye-earn-sparkle-1` vs `eye-earn-sparkle` if confirmed same remote history | De-dupe in planning only |
| 6 | **Repair or document** broken `eye-earn-sparkle-demo` worktree | Point `gitdir` at IVAULT `eye-earn-sparkle-archive` or re-clone worktree |
| 7 | **Compare before merge** — IVAULT `investor-demo-mvp-night-build` HTML prototypes vs `08_raw_originals` / design-ref | Avoid editing wrong HTML copy |

**Do not:** delete repos, merge branches, cherry-pick, or commit inside old repos (per audit rules).

---

## 11. Final answer

### Have we integrated everything?

**Partial.**

- **Yes (for a defined MVP slice):** Flutter runtime, recovery candidates, rescued archive HTML, masterbrain inventory, investor-demo canonical + IVAULT candidate, and home-repo import at `4953e01`.
- **No:** IVAULT studio/integration monorepo branches, git stashes, full eye-earn-sparkle product repos, iTrack working-tree changes, post-import home prototype commit `9e7cc37`, and IVAULT `investor-demo-mvp-night-build` HTML prototype branch content.
- **Unknown:** Remaining DEMOS:REPOS siblings and remote-only automation branches.

---

## Appendix A — Inspection commands (read-only)

```bash
# Repeat this audit (no writes)
for p in ~/Desktop/i-project-rescue/i_project_migration_archive \
         ~/eye_tracking_app \
         ~/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app \
         ~/Desktop/iTrack; do
  echo "=== $p ==="
  git -C "$p" status -sb
  git -C "$p" branch -a
  git -C "$p" stash list
done
```

## Appendix B — Branch tip SHAs (quick reference)

| Repo | Branch | SHA |
|------|--------|-----|
| i-project | `main` | `2f55651` |
| home eye_tracking | `investor-demo-mvp-night-build` | `9e7cc37` |
| home eye_tracking | import baseline | `4953e01` |
| IVAULT eye_tracking | `main` | `36d685f` |
| IVAULT eye_tracking | `integration/studio-routing-audit` | `d23d365` |
| IVAULT eye_tracking | `investor-demo-mvp-night-build` | `f740579` |
| iTrack | `main` (committed) | `d0bc0c6` |

---

*End of audit. No source repositories were modified during this pass.*
