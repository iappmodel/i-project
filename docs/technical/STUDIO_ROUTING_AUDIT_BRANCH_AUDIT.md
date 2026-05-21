# Studio Routing Audit Branch Audit

**Date:** 2026-05-20  
**Audit type:** Read-only branch recovery — no merges, no source-repo modifications, no deletions  
**Source repo:** `~/Desktop/i-project-rescue/github-source-repos/eye_tracking_app`  
**Target branch:** `origin/integration/studio-routing-audit`  
**Comparison base:** `origin/main` (`36d685f`)  
**Integration repo:** `~/Desktop/i-project-rescue/i_project_migration_archive`  
**Related docs:** [`MULTI_REPO_SYSTEM_RECOVERY_REPORT.md`](MULTI_REPO_SYSTEM_RECOVERY_REPORT.md), [`EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`](EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md), [`EYE_TRACKING_PRE_COMPOSER_CLEANUP_BRANCH_AUDIT.md`](EYE_TRACKING_PRE_COMPOSER_CLEANUP_BRANCH_AUDIT.md), [`I_INITIAL_STRUCTURES_MVP_BRANCH_AUDIT.md`](I_INITIAL_STRUCTURES_MVP_BRANCH_AUDIT.md), [`OLD_SOURCE_PRESERVATION_REPORT.md`](OLD_SOURCE_PRESERVATION_REPORT.md), [`BRANCH_AND_SOURCE_INTEGRATION_AUDIT.md`](BRANCH_AND_SOURCE_INTEGRATION_AUDIT.md)

---

## 1. Executive verdict

**The branch name over-promises “routing” and under-describes what is actually on the tip.**

`integration/studio-routing-audit` is **byte-identical** to `feature/evidence-vault-v2-hardening` at `d23d365` (0 commits divergence). It is a **full platform monorepo checkpoint** (~2,368 files vs `main`), not a narrow Studio-routing slice. Prior recovery work already audited the evidence-vault, POPS backend, and ownership contracts on that tip; **this audit isolates Studio + i Command “routing” semantics and placement decisions.**

**What “routing” actually means on this branch (strict):**

| Meaning | Location | Status |
|---------|----------|--------|
| **i Command domain/action routing** | `src/lib/i/i-command-router.ts`, `i-command-parser.ts`, `tools/i-command-stage2-check.ts` | **Implemented** — maps parsed utterances to `actionType`, `nextRoute`, safety escalation |
| **App pathname routing** | `src/App.tsx` | **Minimal** — `/dev/i-command`, `/dev/igo`, `/ivatar/*`; **default route renders legacy Stage 1–6 `StudioScreen`** |
| **Studio command intent routing** | `src/lib/studio/studio-commands.ts` | **Implemented mock** — regex intent classes (`capture_control`, `publish_request`, `proof_request`, …) |
| **React Router / file-based studio routes** | — | **Absent** — no `react-router` studio tree; no filename contains “routing” |

**Two parallel Studio implementations coexist on the branch (critical):**

1. **Legacy Stage 1–7 mock stack** — `src/lib/studio/*` (9 files), `src/components/studio/*` (13 panels), `src/screens/StudioScreen.tsx` — reducer in `studio-state.ts`, **wired as default app surface** in `App.tsx`.
2. **Platform Studio monolith** — `src/screens/studio/*` (**151 files**) — ~2,596-line `studioStore.ts`, publish/wallet/POPS/backend/creator/campaign/runtime previews — **not the default `App.tsx` route** (separate `src/screens/studio/StudioScreen.tsx` exists but is not selected by current `App.tsx`).

**Where Studio should live (architecture decision):**

| Layer | Verdict |
|-------|---------|
| **`eye_tracking_app` `main`** | **Flutter eye-tracking OS only** — **zero** `src/lib/studio` or `src/screens/studio` on `main` |
| **This branch (ET repo)** | **Historical monorepo dump** — web Studio + API + admin + Flutter simulators co-located for Composer-era work; **do not merge back into `main` as-is** |
| **Canonical i-project (`integrations/eye-tracking/source/`)** | **Partial studio slice already promoted** — 25 files: **collab + media/render** from `i-initial-structures` lineage; **no** i Command, **no** publish/wallet monolith |
| **`integrations/old-source-preservation/ivault-eye-tracking/snapshot/`** | **Full branch archive @ `d23d365`** (~2,640 files) — **already preserved**; includes all Studio + i Command paths |
| **`eye-earn-sparkle-archive`** | **Production Studio UI** (`src/components/studio/` AI tools) — consumer-facing editor widgets; **different shape** from IVAULT type-first / mock-pipeline studio |

**Does this branch supersede current i-project Studio source?** **No — it diverges.**

- Branch **ahead** on: i Command router, Stage 1–6 mock pipeline, publish/wallet/POPS event orchestration in `src/screens/studio/studioStore.ts`, backend contract panels, creator/campaign runtime previews.
- i-project **`integrations/eye-tracking/source/` ahead** on: `collab/` engines, `media/` render queue + Supabase storage adapters ( **absent** on branch `src/screens/studio/`).
- Canonical **proof packet v0** and **verification stability layer** live in migration-archive Flutter runtime/docs — **not on this branch**.

**Recommendation:** **Do not merge this branch into `eye_tracking_app/main` or bulk-promote into canonical app.** **Do not rebuild Studio inside the ET repo.** Treat preserved snapshot + this audit as the **reference monorepo**. Reconcile **three-way merge at the product architecture level**: (1) i-project collab/media types, (2) IVAULT publish/wallet/i Command mocks, (3) archive AI studio components — under **`i_project_migration_archive` web shell** or **`eye-earn-sparkle-archive`**, with ET repo supplying gaze/POPS **signals only**.

---

## 2. Branch metadata

| Field | Value |
|-------|--------|
| **Branch name** | `integration/studio-routing-audit` |
| **Remote ref** | `remotes/origin/integration/studio-routing-audit` |
| **HEAD** | `d23d365` — *Add autonomous Claude workflow docs* (2026-05-06) |
| **Identical branch** | `feature/evidence-vault-v2-hardening` @ `d23d365` (**0 / 0** commit delta) |
| **Default branch** | `main` (`36d685f`) |
| **Merge base with `main`** | `5b97d0021829e46dec1ec9ee608b7f396661e1e4` |
| **Commits ahead of `main`** | 32 |
| **Commits behind `main`** | 51 (T-series gaze/blink/calibration extractions on `main` not on branch) |
| **Diff vs `main` (three-dot)** | **2,368 files**, **488,406 insertions**, **658 deletions** |
| **Studio-tagged file paths in diff** | **~185** paths matching `studio` |
| **Relation to `main`** | Diverged checkpoint — bulk import at `78d8f68` then hardening + Studio/i Command stages |
| **Relation to preservation** | Snapshot `integrations/old-source-preservation/ivault-eye-tracking/snapshot/` matches branch tree (151 `src/screens/studio` files, 10 `src/lib/i` files) |

### Commit breakdown (Studio / i Command only, chronologic on branch)

| Commit | Date | Scope |
|--------|------|-------|
| `419562a` | 2026-04-30 | Annotate studio mock data files |
| `63ec872` | 2026-04-30 | Studio Stage 1 — lightweight shell |
| `361b962` | 2026-04-30 | Studio Stage 2 — command state previews |
| `c4c9b79` | 2026-04-30 | Studio Stage 3 — recording command state |
| `2374607` | 2026-04-30 | Studio Stage 4 — auto-cut mock engine |
| `7473c8e` | 2026-05-01 | Studio Stage 5 — storage cleanup previews |
| `250184b` | 2026-05-01 | Studio Stage 6 — publish mock pipeline |
| `054331f` / `e9e8e4f` | 2026-05-01 | Studio proof mock pipeline (merge) |
| `c0229ef` | 2026-05-01 | i Command Stage 1 core |
| `004b314` | 2026-05-01 | i Command parser/router check harness |
| `003e0e3` | 2026-05-01 | i Command display result normalization |
| `d6f4502` | 2026-05-01 | Expand i Command fixture coverage |
| `3c7740c` / `361e0ae` | 2026-05-01 | UI uses normalized display result |
| `45adbfb` | 2026-05-01 | i Command dev smoke buttons |
| `78d8f68` + earlier | 2026-04-29 | Checkpoint + evidence vault hardening (shared with evidence audit) |

### Changed file buckets (branch-wide, for context)

| Bucket | Approx. | Notes |
|--------|---------|-------|
| `services/api/`, `db/migrations/`, `supabase/` | Majority of diff | Backend POPS, admin security — see evidence vault audit |
| `src/screens/studio/` | 151 files | Platform studio monolith |
| `src/lib/studio/` + `src/components/studio/` | 22 files | Legacy mock pipeline |
| `src/lib/i/` + `tools/i-command-*` | 12 files | i Command routing system |
| `lib/` Flutter | Hundreds | ET runtime + **simulation** engines |
| `docs/` | Multiple | Ownership contract, wiring matrix, evidence checklist |

---

## 3. High-value systems found

| System | Location | Implementation | Authoritative? |
|--------|----------|------------------|----------------|
| **i Command parse → route → display pipeline** | `src/lib/i/i-command-*.ts`, `tools/i-command-fixtures.ts`, `tools/i-command-stage2-check.ts` | **Implemented** with 435-line fixture harness | UX/routing preview only |
| **Studio NL command intent detection** | `src/lib/studio/studio-commands.ts` | **Implemented mock** — regex intents + effect previews | No |
| **Legacy Studio reducer (Stages 1–7)** | `src/lib/studio/studio-state.ts`, `studio-autocut.ts`, `studio-publish.ts`, `studio-proof.ts` | **Implemented mock** — local state only | No |
| **Platform Studio store** | `src/screens/studio/studioStore.ts` (~2,596 lines) | **Implemented simulation** — publish, wallet unlock, POPS/trust/safety **events**, backend adapters | No — emits UI events; backend authoritative per ownership doc |
| **Studio publish orchestration** | `src/screens/studio/publish/studioPublishEngine.ts`, validators, post package builder | **Implemented local simulation** | No |
| **Studio backend readiness** | `src/screens/studio/backend/*` (contracts, RLS policy **docs**, migration plan, Supabase adapter stubs) | **Architecture + mock adapters** | Reference only until wired to real API |
| **Creator / campaign runtime previews** | `src/screens/studio/components/creator/*`, `campaign/*`, `runtime/*` | **UI mock** | No |
| **Remote command center (Flutter + React)** | `lib/features/remote/`, `src/features/remote/` | **Implemented** policy-gated remote surface | On-device / UX gate — not payout authority |
| **Ownership / wiring docs** | `docs/source-of-truth-ownership-contract.md`, `docs/runtime-wiring-matrix.md` | **Documentation** | **High value** for merge planning |
| **Evidence Vault v2** | `supabase/migrations/204–209`, checklist | **Implemented SQL** (admin) | Backend — see evidence audit |
| **Collab + media render queue** | — | **Absent on branch** | Promoted slice exists only in `integrations/eye-tracking/source/` |

---

## 4. Studio command routing findings

### 4.1 i Command router (`studio_creation` domain)

`routeICommand()` in `src/lib/i/i-command-router.ts`:

- Non-`i` prefixes → `actionType: "none"`, idle UX.
- Safety flags → `safety_escalation`, `nextRoute: "/i/safety"`, blocked UX.
- `studio_creation` domain + `post` verb → `prepare_post` (requires confirmation).
- `studio_creation` default → `open_studio` with suggested navigation (display layer maps to routes in `IResponseCard` / `IHomeScreen`).

Domains enumerated in `i-command.types.ts`: `private_self`, `wallet_economy`, `feed_content`, `studio_creation`, `originality_protection`, health/career/finance/relationships, `navigation`, `emergency_safety`.

**Harness:** `tools/i-command-stage2-check.ts` runs all `FIXTURES` through parse → route → `toICommandDisplayResult()` — **no Jest**; runnable via `tsx`.

**Dev surfaces:** `src/screens/IHomeScreen.tsx` (`/dev/i-command`), `services/admin-console/src/app/dev/i-command/page.tsx`, smoke buttons commit `45adbfb`.

### 4.2 Studio NL command routing (legacy lib)

`parseStudioCommand()` classifies normalized text into `CommandIntent`:

- `capture_control`, `edit_request`, `enhancement_request`, `audio_request`, `publish_request`, `storage_request`, `proof_request`, `unknown`.

`applyStudioCommand()` in `studio-state.ts` wires intents to auto-cut, cleanup, publish, and proof plan generators — **all in-memory**.

### 4.3 App-level “routing”

`src/App.tsx` uses `window.location.pathname`:

- Default **else** branch → **legacy** `src/screens/StudioScreen.tsx` (imports `../lib/studio/studio-state`).
- Does **not** mount `src/screens/studio/StudioScreen.tsx` (platform shell with `useStudioController`).

**Implication:** The “routing audit” branch default UX exercises the **smaller mock stack**, not the 151-file platform studio. Platform studio is reachable only via explicit navigation/refactor not present in default `App.tsx`.

---

## 5. Studio state/type findings

### 5.1 Legacy types (`src/lib/studio/studio.types.ts`)

- Session/clip model, `StudioRecordingState`, edit/cleanup/publish/proof plans, custody events, originality status enums.
- `studio.mock.ts` — annotated mock session data (`419562a`).

### 5.2 Platform types (`src/screens/studio/studioTypes.ts`, `studioDomainTypes.ts`)

- `StudioProject`, monetization, safety/rights reports, publish targets, wallet ledger types, backend persistence shapes.
- Split from i-initial-structures `studioTypes.ts` in promoted source — **different type namespaces**.

### 5.3 Promoted i-project slice (`integrations/eye-tracking/source/src/screens/studio/`)

- **25 files** — `studioStore.ts` (~466 lines) with `useSyncExternalStore`, media adapters, render queue simulation.
- **Collab engines** (`studioPermissionEngine`, `studioReviewEngine`, `studioVersionEngine`, `studioPresenceEngine`) — **not present** on branch tree under `src/screens/studio/collab/`.

**State architecture conflict:** Three stores — legacy `useState`+reducer (`studio-state.ts`), platform `useReducer` monolith (`studioStore.ts` in screens/studio), promoted `useSyncExternalStore` (i-project source). **Unification required before any merge.**

---

## 6. Publish/render workflow findings

| Workflow | Branch location | Status |
|----------|-----------------|--------|
| **Legacy publish mock (Stage 6)** | `src/lib/studio/studio-publish.ts` | Readiness gates, destinations (`feed`, `stories`, `campaign`, `proof_vault`), schedule modes — **mock** |
| **Platform publish engine** | `src/screens/studio/publish/studioPublishEngine.ts` | Safety/rights scans, validation, `buildPostPackage`, local `publishProjectLocal` — **simulation** |
| **Render queue** | — on branch | **Not implemented** under `src/screens/studio/media/` |
| **Render queue** | `integrations/eye-tracking/source/.../studioRenderQueue.ts` | **Implemented mock** in promoted source only |
| **Export manifest** | Both stacks | Mock JSON manifests; no S3/Supabase upload authority on client |

**Strict:** No server-side render farm, no FFmpeg pipeline, no Supabase storage writes from Studio publish paths — only previews and event emission.

---

## 7. Evidence/proof/review findings

| Artifact | Branch | vs i-project canonical |
|----------|--------|------------------------|
| **Studio proof mock (Stage 7)** | `src/lib/studio/studio-proof.ts` — header: **MOCK ONLY**, no crypto hash | Not POPS Proof Packet v0 |
| **Proof packages in legacy state** | `generateProofPackagePreview`, `mockExportProofPackage` | Demo custody events only |
| **Evidence Vault v2 (admin)** | SQL + RPC hardening commits | **Real backend** — orthogonal to Studio UI |
| **Review engines** | `studioReviewEngine` etc. | **Only in promoted i-project source**, not branch |
| **POPS proof command center UI** | `src/admin/pops/proof-command-center/*` | Admin React — reference |

**Verdict:** Studio “proof” on this branch is **UX mock**. Legal-grade custody is **Evidence Vault admin SQL**, not mobile proof capture. Do not conflate with `PROOF_PACKET_SCHEMA_V0.md` in migration archive.

---

## 8. Creator/campaign implications

| Component | Path | Status |
|-----------|------|--------|
| Creator post dashboard / lifecycle | `src/screens/studio/components/creator/*` | Mock analytics panels |
| Campaign owner dashboard / runtime CTA | `src/screens/studio/components/campaign/*` | Mock — ties to `campaignMode` in publish plans |
| Publish monetization / CTA | `studioPublishEngine.ts`, legacy `studio-publish.ts` | Disclosure flags for sponsored content — **no live Stripe** |
| Backend campaign authority | `services/api/.../campaign-lifecycle-engine.ts` | **Authoritative** per ownership contract — branch simulation must not write budget |

**Creator economics:** Reconcile with `eye-earn-sparkle-archive` creator tools when building Studio — archive has **implemented** checkout/wallet; branch has **simulated** studio wallet unlock (`studioUnlockEngine.ts`).

---

## 9. Safety/governance implications

| Layer | Finding |
|-------|---------|
| **i Command safety routing** | `detectSafetyFlags` → blocks autonomous actions, routes to `/i/safety` |
| **Privacy / memory consent** | `i-command-privacy.ts`, `requiresMemoryConsent` — gates `needs_consent` UX |
| **Studio safety scans** | `magicSafetyRules.ts`, `runSafetyScan`, `StudioSafetyReportPanel` — **mock reports** |
| **Rights scans** | `runRightsScan`, unlicensed music mock flag — **mock** |
| **Governance (Flutter)** | `lib/core/intent_os/governance_kernel.dart` on shared ancestry — **on-device gate**, not Studio |
| **Ownership contract** | Explicit: client engines **must not** write canonical wallet/trust/campaign state |

**Risk if merged blindly:** Dual authority — Flutter `reward_engine.dart` (simulation) vs `services/api` POPS — already documented on branch; Studio store emits `STUDIO_POPS_EVENTS` that could be mistaken for production POPS if wired without backend adapter.

---

## 10. Comparison to current i-project source and archive studio UI

| Dimension | Branch (`d23d365`) | `integrations/eye-tracking/source/` | `eye-earn-sparkle-archive` |
|-----------|-------------------|-------------------------------------|----------------------------|
| **File count (studio)** | 151 + 22 legacy | 25 | 18+ components under `src/components/studio/` |
| **i Command** | Full `src/lib/i/` | **Absent** | **Absent** |
| **Collab/version/review** | **Absent** | **Present** | Partial via content manager |
| **Media/render queue** | **Absent** | **Present** | Timeline/editor widgets |
| **Publish/wallet mock** | Extensive | Minimal in source store | Production checkout paths |
| **AI editor tools** | Mock panels | No | **AIVideoEditor**, subtitles, voiceover, etc. |
| **Default in ET `main`** | No | N/A (promoted subset) | N/A |

**Archive studio UI** is **widget-rich and consumer-integrated**; branch studio is **type-contract + simulation-heavy** with backend panels. **Neither replaces the other** — archive for UX components, branch for orchestration/event contracts, i-project source for collab/media types.

**Preservation:** Full branch already at `integrations/old-source-preservation/ivault-eye-tracking/snapshot/` — **no urgent re-copy**.

---

## 11. Files worth promoting

| Priority | Path(s) | Why |
|----------|---------|-----|
| **P1** | `docs/source-of-truth-ownership-contract.md`, `docs/runtime-wiring-matrix.md` | Prevent authority drift when wiring Studio to POPS API |
| **P1** | `src/lib/i/i-command-router.ts`, `i-command-parser.ts`, `i-command.types.ts`, `tools/i-command-fixtures.ts`, `tools/i-command-stage2-check.ts` | Only structured **command routing** system found; harness is testable without UI |
| **P1** | `src/screens/studio/backend/studioApiContracts.ts`, `studioHardBoundaries.ts`, `studioDataBoundary.ts` | Contract-first backend boundary definitions |
| **P2** | `src/screens/studio/publish/studioPublishTypes.ts`, `studioPostPackageBuilder.ts` | Post package shape for feed integration design |
| **P2** | `src/screens/studio/studioEvents.ts` | Event vocabulary for POPS/settlement/trust wiring |
| **Defer** | `src/lib/studio/*`, `src/components/studio/*` | Superseded by platform path **if** monolith is canonicalized; redundant with preservation |

**Do not promote into `eye_tracking_app/main`:** entire `src/`, `services/`, `apps/web/` trees.

---

## 12. Files to preserve only

| Category | Paths | Reason |
|----------|-------|--------|
| **Already archived** | Full snapshot under `integrations/old-source-preservation/ivault-eye-tracking/` | Complete @ `d23d365` |
| **Platform studio monolith** | `src/screens/studio/**` (151 files) | Reference implementation — merge cost high |
| **Backend + SQL** | `services/api/`, `db/migrations/`, `supabase/` | Covered by evidence vault audit — preserve as POPS reference |
| **Legacy Stage 1–7 UI** | `src/screens/StudioScreen.tsx`, `src/lib/studio/*` | Historical — shows iteration; default route misleading |
| **Investor-demo untracked** | IVAULT `investor-demo/` (not in git diff) | Live drift — see branch integration audit |

---

## 13. Files to ignore

| Category | Examples | Reason |
|----------|----------|--------|
| **Identical duplicate branch** | Treat `feature/evidence-vault-v2-hardening` as same tip | No second merge analysis needed |
| **Autonomous Claude workflow docs** | Latest commit `d23d365` | Process metadata, not product |
| **Mock proof/crypto** | `studio-proof.ts` “no cryptographic hash” | Not production proof |
| **Bulk Flutter simulation** | `lib/reward_engine.dart`, `lib/wallet_ledger_engine.dart` | Explicitly non-authoritative |
| **Default App.tsx studio route** | Legacy `StudioScreen` as homepage | Misleading for “platform studio” assessment |
| **2,368-file bulk merge** | Entire branch → `main` | Would destroy T-series ET `main` lineage |

---

## 14. Conflicts with current i-project implementation

| Conflict | Detail |
|----------|--------|
| **Three studio state models** | Legacy reducer vs platform `studioStore` vs promoted `useSyncExternalStore` |
| **Missing collab/media on branch** | Promoted source has engines branch lacks — **branch does not supersede** |
| **Missing i Command in promoted source** | Branch-only — must land in **web** integration path, not Flutter runtime |
| **Proof semantics** | Branch Studio mock proof ≠ `proof_packet_v0.dart` / `PROOF_PACKET_SCHEMA_V0.md` |
| **ET runtime staleness** | Branch 51 commits behind `main` on gaze — promoted `flutter-runtime/` is canonical for ET |
| **Repo placement** | Studio web code in ET repo contradicts current `main` (Flutter-only) and POPS-absent `ai/system-map.md` |
| **eye-earn-sparkle-archive** | Third Studio UI lineage — risk of **fourth** rewrite if not mapped |

---

## 15. Promotion priority

### P0 — promote/reconcile immediately

| Item | Action |
|------|--------|
| **Architecture decision record** | Document: Studio + i Command live in **i_project web / archive**, ET repo = signals + Intent OS only |
| **Authority boundaries** | Copy/adapt `source-of-truth-ownership-contract.md` into migration-archive `docs/technical/` before wiring wallet/POPS to Studio UI |
| **Do not merge branch to `main`** | Protect T-series ET extractions |

*No code files from this branch require immediate promotion — preservation snapshot already complete.*

### P1 — preserve and map

| Item | Action |
|------|--------|
| i Command router + fixtures + harness | Map `actionType` / `nextRoute` to canonical `app/` screen IDs when command bar ships |
| `src/screens/studio/backend/*` contracts | Crosswalk to Supabase migrations in migration archive |
| Platform `studioStore.ts` event taxonomy | Align with `POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` |
| Promoted `integrations/eye-tracking/source/` collab/media | **Retain as canonical type layer** — merge IVAULT publish/wallet **into** this tree, not vice versa |
| eye-earn-sparkle-archive `src/components/studio/` | Index widgets against IVAULT post-package types |

### P2 — archive

| Item | Action |
|------|--------|
| Legacy `src/lib/studio` Stage 1–7 stack | Keep in preservation only |
| Default `App.tsx` routing to legacy studio | Historical curiosity |
| Full monorepo in ET remote branch | Tag/read-only; no active development |

---

## 16. Exact recommended next action

1. **Record decision (today):** Canonical Studio implementation target = **`i_project_migration_archive` web integration** (merge `integrations/eye-tracking/source/src/screens/studio/` collab/media **with** IVAULT `src/screens/studio/publish|wallet|backend` contracts from preservation snapshot) **plus** archive AI components — **not** `eye_tracking_app/main`.

2. **Extract i Command routing (when scheduled):** Copy `src/lib/i/*` + `tools/i-command-*` from preservation snapshot into a new `integrations/eye-tracking/source/src/lib/i/` (or `app/src/lib/i/`) — run `i-command-stage2-check.ts` in CI as a smoke script; wire `studio_creation` routes to unified Studio screen ID.

3. **Do not open a merge PR** from `integration/studio-routing-audit` → `main`.

4. **Next branch audit:** `eye_tracking_app` `cursor/v1-autonomy-4f71` (and siblings `v1-safety`, `v1-signal`) — Intent OS / kernel alternatives not covered by studio or evidence audits.

5. **Parallel product audit (optional):** `eye-earn-sparkle-archive/main` Studio components vs IVAULT post-package types — consumer UI reconciliation.

---

*Audit generated: 2026-05-20 — read-only, no merges, no source-repo modifications*
