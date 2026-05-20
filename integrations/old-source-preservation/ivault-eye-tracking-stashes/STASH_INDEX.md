# IVAULT `eye_tracking_app` — stash index

**Source:** `~/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app`  
**Count:** 13 (`stash@{0}` … `stash@{12}`)  
**Captured:** 2026-05-20 — patches only; **stashes were not applied**

## Export method

| Stash type | Command | Patch file |
|------------|---------|------------|
| Standard | `git stash show -p stash@{n}` | `patches/stash-{n}.patch` |
| Merge-format (empty `stash show -p`) | `git show -p stash@{n}^3` + header comment | `patches/stash-{6,8,9,10,11,12}.patch` |

Merge stashes store WIP in the third parent (`^3`, “untracked files on …” commit). `git stash show -p` returns no output for those entries.

## Stash list (as captured)

```
stash@{0}  Wed May 6 14:12:52 2026  On audit/repo-hygiene-checkpoint: WIP i-feature prototype tree before next slice
stash@{1}  Fri May 1 13:25:56 2026  On feature/evidence-vault-v2-hardening: WIP Studio proof panel separate from i Command
stash@{2}  Fri May 1 12:07:46 2026  On feature/evidence-vault-v2-hardening: WIP Studio publish panel separate from i Command
stash@{3}  Fri May 1 12:00:54 2026  On feature/evidence-vault-v2-hardening: WIP iGO Stage 1-5 local campaign builder demo clean
stash@{4}  Fri May 1 11:50:44 2026  On chore/restore-stashed-prototypes: WIP unrelated after i Command Stage 4
stash@{5}  Fri May 1 11:12:53 2026  On feature/evidence-vault-v2-hardening: WIP Studio publish panel separate from i Command
stash@{6}  Fri May 1 10:38:53 2026  On feature/evidence-vault-v2-hardening: WIP iGO separate from i Command  [merge → ^3 export]
stash@{7}  Fri May 1 00:08:15 2026  On feature/evidence-vault-v2-hardening: WIP non-i-command changes
stash@{8}  Thu Apr 30 23:42:03 2026  On feature/evidence-vault-v2-hardening: WIP iGO Stage 1-4 local owner audit demo  [merge → ^3 export]
stash@{9}  Thu Apr 30 23:25:12 2026  On feature/evidence-vault-v2-hardening: WIP iGO Stage 1-3 local demo proof settlement  [merge → ^3 export]
stash@{10} Thu Apr 30 23:05:52 2026  On feature/evidence-vault-v2-hardening: WIP iGO Stage 1-2 local demo without App wiring  [merge → ^3 export]
stash@{11} Thu Apr 30 21:10:45 2026  On feature/evidence-vault-v2-hardening: WIP i command files - separate from evidence vault  [merge → ^3 export]
stash@{12} Thu Apr 30 15:48:54 2026  On feature/evidence-vault-v2-hardening: WIP studio i feature files - separate from evidence vault  [merge → ^3 export]
```

## Patch files

| File | Approx. size | Notes |
|------|--------------|-------|
| `patches/stash-0.patch` | 4 KB | i-feature prototype tree |
| `patches/stash-1.patch` | 31 KB | Studio proof panel |
| `patches/stash-2.patch` | 26 KB | Studio publish panel |
| `patches/stash-3.patch` | 119 KB | iGO Stage 1–5 |
| `patches/stash-4.patch` | 46 KB | post i Command Stage 4 |
| `patches/stash-5.patch` | 41 KB | Studio publish (duplicate message vs stash@{2}) |
| `patches/stash-6.patch` | 120 KB | iGO (merge ^3) |
| `patches/stash-7.patch` | 20 KB | non-i-command changes |
| `patches/stash-8.patch` | 91 KB | iGO Stage 1–4 (merge ^3) |
| `patches/stash-9.patch` | 73 KB | iGO Stage 1–3 (merge ^3) |
| `patches/stash-10.patch` | 56 KB | iGO Stage 1–2 (merge ^3) |
| `patches/stash-11.patch` | 26 KB | i Command files (merge ^3) |
| `patches/stash-12.patch` | 61 KB | Studio i feature files (merge ^3) |

## Redundancy warning

Several stashes share base branches with `chore/restore-stashed-prototypes`, `audit/repo-hygiene-checkpoint`, and `feature/evidence-vault-v2-hardening`. Diff against branch tips before treating a patch as unique net-new work.
