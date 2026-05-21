# i-initial-structures `investor-demo-mvp-night-build` Branch Audit

**Date:** 2026-05-20  
**Audit type:** Read-only branch/repo recovery — no merges, no source-repo modifications, no deletions  
**Source repo:** `~/Desktop/i-project-rescue/github-source-repos/i-initial-structures`  
**Target branch:** `origin/investor-demo-mvp-night-build`  
**Comparison base:** `main` (`a5b15d4`)  
**Integration repo:** `~/Desktop/i-project-rescue/i_project_migration_archive`  
**Related docs:** [`MULTI_REPO_SYSTEM_RECOVERY_REPORT.md`](MULTI_REPO_SYSTEM_RECOVERY_REPORT.md), [`INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md`](INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md), [`MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md), [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md)

---

## 1. Executive verdict

**The branch name over-promises integration; the branch under-delivers platform code.**

`investor-demo-mvp-night-build` is **4 commits ahead of `main`, 0 behind** (**81 files**, ~25,923 insertions, ~33 deletions). It does **not** modify `src/`, `app/` (Next.js shell), `lib/`, or any ELO/trust/studio/safe-action TypeScript. Every “hidden mature system” named in prior recovery reports lives on **`main` only** (single commit `a5b15d4`) and is **already mirrored byte-for-byte** in the integration repo at `integrations/eye-tracking/source/src/`.

**What the branch actually adds:**

| Addition | Status |
|----------|--------|
| `investor-demo/` — linear Loop 1 React/Vite walkthrough | **Implemented demo** — largely duplicate of `integrations/eye-tracking/demos/investor-demo/` (migration archive has extra `design-ref/` only) |
| `prototypes/i-mvp-prototype/` — single-file multi-screen MVP + HTML design bundle | **Implemented prototype** — matches `integrations/eye-tracking/prototypes/i-mvp-prototype/` (May 20 `App.tsx` update already present) |
| `.gitignore` | Trivial |

**Strict maturity assessment (repo-wide, including `main`):**

| System | Verdict |
|--------|---------|
| **Safe Action Execution Engine** | **Implemented** — ~320-line evaluator, 19 rule types, DB repository stubs, event emission |
| **Studio type/collab/media/render** | **Implemented (local/mock)** — `studioStore.ts` (~466 lines), permission/review/version engines, render queue simulation |
| **Trust impact model + wallet freeze flags** | **Types + minimal rules** — 2 active trust rules; **no rule sets `canFreeze*` true** |
| **ELO “recommendation engine”** | **Mock/UI shell** — services filter in-memory fixtures; **not** chess-ELO or production ranking |
| **POPS / Proof Packet v0** | **Absent** — zero references in entire repo |
| **iVatar / identity product** | **Absent** — zero references; ELO is “personal intelligence” UI only |
| **Investor demo on branch** | **Cosmetic Loop 1** — instant settle to wallet; **no** pending-validation state machine (contrast [`INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md`](INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md)) |

**Recommendation:** **Do not merge the branch.** **Do not re-copy** `investor-demo/` or `i-mvp-prototype/` into the migration archive unless a byte-level diff shows drift (current audit: negligible). **Do promote/reconcile from `main`/`integrations/eye-tracking/source/`** — especially `safe-action-engine.ts` and studio collab types — when wiring admin/trust to Supabase and unifying studio with `eye-earn-sparkle-archive`. **Prioritize** pending-first wallet UX from archive `codex/investor-demo-mode-v2` into canonical `app/`, not this branch.

---

## 2. Branch metadata

| Field | Value |
|-------|--------|
| **Branch name** | `investor-demo-mvp-night-build` |
| **Remote ref** | `remotes/origin/investor-demo-mvp-night-build` |
| **HEAD** | `9e7cc37` — *Update i MVP prototype before project migration* (2026-05-20) |
| **Default branch** | `main` |
| **Merge base with `main`** | `a5b15d4` — *Initial project structure* |
| **Commits ahead of `main`** | 4 |
| **Commits behind `main`** | 0 |
| **Diff vs `main` (three-dot)** | **81 files**, **~25,923 insertions**, **~33 deletions** |
| **Relation to `main`** | Fast-forward superset. **Zero changes** to platform `src/`. |
| **Relation to `origin/dev`** | **Identical to `main`** (0 commits divergence) |
| **Repo file count on `main`** | 83 paths total; **55** `.ts`/`.tsx` under `src/` |

### Commit breakdown (chronological)

| Commit | Date | Scope |
|--------|------|-------|
| `b9216bf` | 2026-05-13 | `.gitignore` — ignore local generated folders |
| `4eace0c` | 2026-05-13 | **Add investor demo MVP scaffold** — full `investor-demo/` Vite app (40 files, ~7.6k lines) |
| `4953e01` | 2026-05-14 | **Add clean MVP prototype** — `prototypes/i-mvp-prototype/` + 19 HTML design-reference copies (~17.8k lines) |
| `9e7cc37` | 2026-05-20 | **Update i MVP prototype** — `App.tsx` + `App.css` only (+639 / −110 lines) |

### Changed file buckets (branch-only)

| Bucket | Files (approx.) | Notes |
|--------|-----------------|-------|
| `investor-demo/` | 40 | Canonical screen order; presenter Prev/Next; mocked gaze context |
| `prototypes/i-mvp-prototype/` | 40 | Monolithic `App.tsx` flow + duplicated HTML prototypes |
| `.gitignore` | 1 | Build/cache ignores |
| `src/`, `app/`, Supabase, migrations | **0** | Platform architecture unchanged on branch |

---

## 3. High-value systems found

Systems are listed by **implementation status**, not folder hype.

### 3.1 On `main` (shared with branch base) — highest value

| System | Path (source repo) | Maturity | Integration repo mirror |
|--------|-------------------|----------|-------------------------|
| **Safe Action Execution Engine** | `src/lib/alphabet/safe-action-execution/` | **Implemented** evaluator + normalizers + 19 rules (`freeze_wallet`, `restrict_withdrawals`, …) | `integrations/eye-tracking/source/src/lib/alphabet/safe-action-execution/` (identical) |
| **Safe action DB repository** | `src/lib/alphabet/db-repositories/safe-action-execution.repository.ts` | **Implemented** insert API (Supabase client) | Same path under `integrations/eye-tracking/source/` |
| **Studio global store + media pipeline** | `src/screens/studio/studioStore.ts` | **Implemented** mock-mode store, upload validation, render job simulation | Same |
| **Studio collab engines** | `src/screens/studio/collab/` | **Implemented** permission, presence, review, version (local rules) | Same |
| **Studio media/render** | `src/screens/studio/media/` | **Implemented** adapters, queue, manifest, caption/mask artifacts | Same |
| **Trust impact types + factory** | `src/types/alphabet/trust.types.ts`, `src/lib/alphabet/trust-event-factory.ts` | **Schema** + 2 seed rules | Same |
| **U-value impact rules** | `src/data/alphabet/u-value-impact-rules.ts` | **Seed rules** (2 events) | Same |
| **Alphabet event types / DB types** | `src/types/alphabet/` | **Schema** for Supabase-shaped events | Same |
| **ELO personal intelligence shell** | `src/elo/` | **UI + mock services** | `integrations/eye-tracking/source/src/elo/` (identical) |

### 3.2 On branch only — demo/prototype value

| System | Path | Maturity |
|--------|------|----------|
| **Linear investor demo (Loop 1)** | `investor-demo/` | Runnable Vite demo; **mocked** attention; instant wallet credit |
| **Consolidated MVP click-through** | `prototypes/i-mvp-prototype/src/App.tsx` | Single-file ~550-line flow; **no** separate proof/consent screens |
| **HTML design archive (duplicate)** | `prototypes/.../design-reference/html-prototypes/` | Static references — overlap with migration `06_*` / `04_*` trees |

### 3.3 Not found (strict)

- POPS, proof packet, multi-signal validation pipeline  
- iVatar / avatar identity implementation  
- Supabase migrations, edge functions, wallet ledger  
- Production feed API, campaign backend, reward issuance  
- Real ELO scoring / pairwise ranking algorithm  

---

## 4. ELO / recommendation / ranking findings

| Finding | Detail |
|---------|--------|
| **Naming** | “ELO” = **E**xplainable **L**ayer **O**rchestrator-style **personal intelligence UI**, not sports/statistical ELO rating |
| **`eloRecommendationService.ts`** | **8 lines** — returns filtered `mockRecommendations`; no scoring function |
| **`eloActionService.ts`** | Executes actions after `eloSafetyService` gate; produces canned “Action prepared” decisions |
| **`eloSafetyService.ts`** | Blocks sensitive action types (`withdraw`, `convert`, `pay`, …) without explicit confirmation |
| **`eloMemoryService` / `eloContextService` / `eloPermissionService`** | In-memory mock arrays only |
| **`mockData.ts`** | Rich **narrative** fixtures: wallet pending $83, trust tier 2, creator affinity, GPS offer — **documentation of desired UX**, not live data |
| **`EloAppShell.tsx`** | Next.js entry renders orb + panel over mocked screens (“ELO Stage 1 shell integration”) |
| **Ranking / feed** | **No** connection to `get-personalized-feed` or archive feed; **no** item-item preference learning |
| **Migration archive** | Full `src/elo/` already at `integrations/eye-tracking/source/src/elo/` — **no branch delta** |

**Verdict:** Treat ELO as **product UX + permission model prototype**. **Do not** describe as production recommendation engine without a rewrite.

---

## 5. iVatar / identity / reputation findings

| Keyword | Result |
|---------|--------|
| `ivatar` / `iVatar` | **No matches** in source repo |
| **Identity** | ELO action type `identity_verification`; mock `payoutReadiness: 'blocked_identity'` in `mockData.ts` |
| **Reputation** | `TrustImpactRule.reputationDelta`, `TrustImpactCategory: "reputation"` — schema only |
| **masterbrain** | `masterbrain/04_elo_ivatar/README.md` in migration archive is **chat-inventory pointer** only — links to `integrations/eye-tracking/source/src/elo/`, not Ivatar code |

**Verdict:** **iVatar is not implemented** in `i-initial-structures`. Reputation is modeled as deltas on trust events, not a user-facing identity graph.

---

## 6. Trust / fraud / wallet-freeze findings

### 6.1 Trust impact rules (`trust-impact-rules.ts`)

- **2 rules:** `safe_action_allowed` (positive_small), `safe_action_blocked` (negative_small)  
- **All `canFreezeWallet` / `canFreezeWithdrawals` / `canFreezeCampaigns` = `false`**  
- Fraud/safety/payment deltas exist on paper but are **not** wired to triggers beyond safe-action events  

### 6.2 Safe Action Execution (real implementation)

- **`evaluateSafeAction()`** — risk score, confidence score, outcome machine (`execute` / `block` / `wait_approval` / `manual`)  
- **Rule catalog** includes `freeze_wallet`, `unfreeze_wallet`, `freeze_campaign`, `restrict_withdrawals`, `request_reverification`, compensation/repair actions  
- **`safe-action-normalizers.ts`** — maps review aliases; forbids direct money mutation on certain types  
- **Repository** — `insertSafeActionExecutionDb` with evidence fields, idempotency, linked wallet/campaign IDs  

### 6.3 Fraud

- **No** dedicated fraud graph, device fingerprint service, or POPS correlation  
- Fraud risk appears only as **numeric deltas** on trust rules  

**Verdict:** **Wallet freeze logic is implemented in the safe-action engine and rule types**, but **trust-impact rules do not auto-freeze** and nothing connects safe-action outcomes to user wallet state in this repo. Align with POPS delayed settlement in migration docs, not instant demo wallet updates.

---

## 7. Wallet / reward / economy findings

| Layer | Location | Status |
|-------|----------|--------|
| **ELO mock wallet** | `src/elo/mockData.ts` | Spendable/pending balances, failed verification reason — **fixture** |
| **Branch investor-demo wallet** | `investor-demo/src/demo/DemoProvider.tsx` | `finishRewardToWallet` **credits iCoins immediately**; shaves `pendingBalance` by min(12) — **not** POPS pending-first |
| **Branch i-mvp-prototype** | `prototypes/.../App.tsx` | Local `balance.pending`; reward flow **mock** |
| **U-value economy** | `u-value-impact-rules.ts` | Grant/scholarship eligibility flags — all **false** in seed rules |
| **Production wallet** | — | **Not in this repo** — canonical ledger remains `eye-earn-sparkle-archive` per multi-repo report |

**Conflicts:** Branch demos use **instant earn** narrative while [`MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md) and POPS docs require **pending validation**. Archive `codex/investor-demo-mode-v2` is the better UX reference for pending states ([`INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md`](INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md)).

---

## 8. Studio / creator tooling findings

| Component | Implementation | Notes |
|-----------|----------------|-------|
| **`studioStore.ts`** | **Yes** — `useSyncExternalStore`, mock + Supabase adapter hooks | `mockMode: true` default |
| **Permission engine** | **Yes** — role matrices (editor, brand, safety, legal, finance, reviewer) | Comments reference “Stage 11” hard rules |
| **Review engine** | **Yes** — publish gates (safety, brand, rights, finance, legal) | Status `pending` / `passed` / `waived` |
| **Version engine** | **Yes** — snapshots, change log | Local IDs |
| **Render queue** | **Yes** — `createRenderJobFromProject`, `simulateRenderProgress` | **Simulation only** |
| **Media validation** | **Yes** — `validateMediaFile` | Client-side checks |
| **Creator campaigns** | **HTML only** on branch (`campaign_builder_owner.html` in design-reference) | No TS campaign builder in branch diff |
| **Archive studio UI** | Not in this repo | Rich components in `eye-earn-sparkle-archive/src/components/studio/` |

**Verdict:** **Strongest non-demo code on `main`** is studio architecture — **type-first, mock-backed**. Unify with archive React studio components before building a third studio stack.

---

## 9. Investor demo / MVP findings

### 9.1 Canonical screen order (branch `investor-demo`)

Matches migration canonical flow:

`splash → feed → offer-detail → watch-verify → verification-result → reward-reveal → wallet → convert → withdraw-preview → creator-economics → roadmap`

### 9.2 Comparison to `i_project_migration_archive/app/`

| Feature | Branch `investor-demo` | Canonical `app/` |
|---------|------------------------|------------------|
| Screen order | Same 11 IDs | Same + **`consent-camera-gate`**, **`proof-layer`** |
| Watch entry | Direct `watch-verify` | **Consent gate** first |
| Verification | 5-gate cosmetic animation | `VerificationGate` + staged passes |
| Reward settle | **Immediate** iCoin credit | Immediate (same gap vs POPS) |
| Presenter controls | `goPrev` / `goNext` / `PresenterStrip` | Simpler nav in `demoContext` |
| Proof narrative | **Missing** | `ProofLayerScreen` + `PROOF_LAYER_STATUS` in `demoData.ts` |

### 9.3 `prototypes/i-mvp-prototype` (commit `9e7cc37`)

- Monolithic React pages embedded in one `App.tsx` (~550 lines)  
- **Already present** in `integrations/eye-tracking/prototypes/i-mvp-prototype/` (line count matches branch)  
- Useful as **clickable MVP** referenced in [`MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md) — not a backend integration night build  

### 9.4 Docs noise

- `docs/DECISIONS.md` and `docs/obsidian-vault/` describe **eye_tracking_app** kernels — copied context, not i-platform wallet MVP decisions  
- `AGENTS.md` is Flutter/Android eye-tracking ops — same cross-project bleed  

---

## 10. POPS / proof / validation findings

| Check | Result |
|-------|--------|
| `POPS` string search | **0** in `i-initial-structures` |
| `proof` / `ProofPacket` | **0** |
| `validation` (product sense) | Studio scan statuses, safe-action verification flags only |
| Canonical POPS | [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md) + [`PROOF_PACKET_SCHEMA_V0.md`](PROOF_PACKET_SCHEMA_V0.md) in migration repo only |
| Flutter proof types | `integrations/eye-tracking/flutter-runtime/lib/proof/proof_packet_v0.dart` — **not wired** to any demo in this repo |

**Verdict:** This repo **does not implement POPS**. Branch adds **no** proof-layer screen. Validation in demos is **5-gate UI theater** aligned with HTML Loop 1, not multi-signal review.

---

## 11. Files worth promoting

**From `main` / `integrations/eye-tracking/source/` (already in migration archive — verify wiring, not re-copy):**

| Path | Why |
|------|-----|
| `src/lib/alphabet/safe-action-execution/safe-action-engine.ts` | Admin/trust execution gate — map outcomes to wallet freeze |
| `src/data/alphabet/safe-action-execution-rules.ts` | Policy catalog for payouts, campaigns, reversions |
| `src/lib/alphabet/db-repositories/safe-action-execution.repository.ts` | Persistence contract when Supabase admin tables exist |
| `src/screens/studio/collab/*.ts` | Collab permission/review model for archive studio merge |
| `src/screens/studio/studioStore.ts` | Media/render pipeline state machine reference |
| `src/types/alphabet/trust.types.ts` | Extend rules beyond 2 seed events; enable freeze flags when POPS rejects |

**From branch (only if drift detected — currently redundant):**

| Path | Why |
|------|-----|
| `investor-demo/src/demo/screensOrder.ts` | Already mirrored — authority for screen IDs |
| `prototypes/i-mvp-prototype/src/App.tsx` | Already mirrored — optional presenter alternative |

**Do not promote:** 19× duplicate HTML files under `design-reference/html-prototypes/` (migration archive already has canonical HTML under `06_feed_earning_loops/`, `04_wallet_payments/`, etc.)

---

## 12. Files to preserve only

| Artifact | Reason |
|----------|--------|
| `investor-demo/` (source branch) | Historical snapshot of pre-migration demo packaging; superseded by `integrations/eye-tracking/demos/investor-demo/` |
| `prototypes/i-mvp-prototype/design-reference/html-prototypes/*` | Design-reference copies with duplicate filenames `(1)`, `(5)` — preserve in repo, don’t duplicate again |
| `src/elo/mockData.ts` | UX/fixture spec for wallet/trust/creator copy |
| `docs/obsidian-vault/Projects/eye-tracking-app/*` | Eye-tracking kernel docs — wrong product boundary but useful cross-link |
| Entire branch git history | Evidence that “night build” = demo export, not platform merge |

---

## 13. Files to ignore

| Pattern | Reason |
|---------|--------|
| `package-lock.json` (demo packages) | Boilerplate Vite locks — 2.7k lines each |
| Default Vite `README.md` in `investor-demo/` | Template text, not product docs |
| Duplicate HTML prototypes on branch | Third+ copy of same screens |
| `app/page.tsx` → `EloAppShell` only | Dev shell, not investor MVP |
| ELO service files as “ranking engine” | Misleading file names — mock only |
| Trust rules with all freezes `false` | Incomplete policy — don’t treat as production fraud response |

---

## 14. Conflicts with current i-project implementation

| Conflict | Detail | Resolution |
|----------|--------|------------|
| **Branch vs `main` value** | Auditors may expect branch-only secrets | Document: **platform code is on `main`**, already under `integrations/eye-tracking/source/` |
| **Instant vs pending rewards** | Branch demos credit immediately; POPS + v2 archive demo want pending-first | Port **v2 `demoState.ts` patterns** into `app/` ([`INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md`](INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md)) — **not** branch demos |
| **Proof layer** | `app/` has `ProofLayerScreen`; branch demos omit | Keep **`app/`** as proof narrative authority |
| **Consent gate** | `app/` has `ConsentCameraGateScreen`; branch `investor-demo` skips | Keep **`app/`** gate |
| **ELO vs feed** | Archive has `get-personalized-feed`; i-initial-structures ELO is mock | **Do not** wire ELO mocks to production feed without new service |
| **Studio duplication** | Archive has 18+ studio React components; i-initial-structures has types/store only | Merge **types from source**, **UI from archive** |
| **Safe-action vs POPS** | Safe-action emits `AlphabetEvent`s; POPS uses Proof Packet v0 | Design adapter: POPS outcome → `safe_action_*` / trust events |
| **Coin naming** | Demos: iCoins/aCoins; archive: Vicoin/Icoin | Document mapping in `MVP_CANONICAL_FLOW.md` |
| **masterbrain `04_elo_ivatar`** | Points to ELO folder — no Ivatar code | Update inventory when Ivatar is found elsewhere |

---

## 15. Promotion priority

### P0 — promote / reconcile immediately

1. **Confirm no re-copy from branch** — `integrations/eye-tracking/source/src` already matches `i-initial-structures` `main`; spend effort on **wiring**, not duplication.  
2. **Extend trust-impact rules** — add POPS/fraud-triggered rules with `canFreezeWallet: true` where policy requires; connect to `evaluateSafeAction` outcomes.  
3. **Pending-first demo in `app/`** — use archive v2 patterns (not branch `finishRewardToWallet` instant credit).  
4. **Studio merge plan** — map `integrations/eye-tracking/source/src/screens/studio/` types onto archive `src/components/studio/` before any new studio work.

### P1 — preserve and map

1. **`safe-action-execution-rules.ts`** — full catalog as admin runbook seed.  
2. **`studioPermissionEngine.ts` / `studioReviewEngine.ts`** — collab gates for creator/brand workflows.  
3. **ELO mock fixtures** — copy/deck text for wallet advisor, trust advisor, creator affinity cards.  
4. **Branch `investor-demo`** — presenter Prev/Next pattern if `app/` gains presenter mode.  
5. **`i-mvp-prototype`** — single-file fallback demo for quick investor clicks.

### P2 — archive

1. Branch-only HTML `design-reference` duplicates.  
2. Vite template READMEs and lockfiles from branch commits.  
3. Treat “ELO recommendation engine” label in old recovery docs as **deprecated wording** — use “ELO mock personal intelligence shell”.  
4. Obsidian eye-tracking vault in this repo — cross-reference only.

---

## 16. Exact recommended next action

1. **Close branch promotion queue** for `investor-demo-mvp-night-build` — content is already in `integrations/eye-tracking/demos/investor-demo/` and `integrations/eye-tracking/prototypes/i-mvp-prototype/`.  
2. **In migration archive `app/`** — implement pending-first earn per [`INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md`](INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md) §14 (archive demo, not this branch).  
3. **Engineering spike** — `evaluateSafeAction()` + trust rules → Supabase tables and admin UI; define mapping from [`PROOF_PACKET_SCHEMA_V0.md`](PROOF_PACKET_SCHEMA_V0.md) review status to `freeze_wallet` / `restrict_withdrawals`.  
4. **Replace ELO mock services** with feed/campaign hooks when archive backend promotes — keep UI components.  
5. **Next branch audit** — `eye-earn-sparkle-v2/archive/unified-vision-2025-02-07` (Feb 2026 vision snapshot; diff against archive + v2 pipeline).

---

## Appendix A — Keyword search summary (whole repo, all branches)

Searched `.ts`, `.tsx`, `.md` on default checkout (`main`) + branch-only paths via `git show`:

| Term | Hits | Notes |
|------|------|-------|
| ELO / elo | Many | Personal intelligence mock — see §4 |
| trust | Yes | Types + 2 rules + safe-action linkage |
| wallet / freeze | Yes | Safe-action rules; trust freeze flags unused |
| reward / economy / ledger | Mock + u-value rules only | No ledger SQL |
| campaign / creator | Mock + HTML refs | No live campaign API |
| studio | Extensive TS | See §8 |
| investor / demo / MVP | Branch folders + mock copy | |
| POPS / proof / ivatar | **None** | |
| fraud / governance / scoring / ranking / recommendation | Partial | fraud/governance as deltas or comments; ranking = mock filter |
| attention / feed / validation / evidence | Demo + studio scans | Not POPS validation |

---

## Appendix B — Integration repo cross-check

| Source (i-initial-structures) | Migration archive path | Match |
|------------------------------|------------------------|-------|
| `src/**` | `integrations/eye-tracking/source/src/**` | **Identical** (`diff -rq` clean) |
| `investor-demo/**` | `integrations/eye-tracking/demos/investor-demo/**` | **Substantially identical** (archive adds `design-ref/`) |
| `prototypes/i-mvp-prototype/**` | `integrations/eye-tracking/prototypes/i-mvp-prototype/**` | **Substantially identical** |
| Canonical Loop 1 + proof | `app/` | **Superset** of branch demo features |

---

*Audit generated: 2026-05-20*  
*Audit status: Read-only — no merges, no source-repo modifications, no deletions*
