# Evidence Vault v2 Hardening Branch Audit

**Date:** 2026-05-20  
**Audit type:** Read-only branch recovery — no merges, no source-repo modifications  
**Source repo:** `~/Desktop/i-project-rescue/github-source-repos/eye_tracking_app`  
**Target branch:** `origin/feature/evidence-vault-v2-hardening`  
**Comparison base:** `origin/main`  
**Integration repo:** `~/Desktop/i-project-rescue/i_project_migration_archive`  
**Related docs:** [`MULTI_REPO_SYSTEM_RECOVERY_REPORT.md`](MULTI_REPO_SYSTEM_RECOVERY_REPORT.md), [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md), [`PROOF_PACKET_SCHEMA_V0.md`](PROOF_PACKET_SCHEMA_V0.md), [`VERIFICATION_STABILITY_LAYER_V1.md`](VERIFICATION_STABILITY_LAYER_V1.md)

---

## 1. Executive verdict

**The branch name understates its scope.** `feature/evidence-vault-v2-hardening` is not primarily a mobile liveness/anti-spoof branch. It is a **large platform checkpoint** (~2,368 files, ~488k insertions vs `main`) containing a full TypeScript backend (`services/api/`), admin console, 216 SQL migrations under `db/migrations/`, Supabase admin-security migrations, Flutter economy/trust/POPS simulation layers, Studio mock pipelines, and i Command tooling.

**Evidence Vault v2** — the branch’s namesake — is a **real, implemented admin custody subsystem** (Supabase migrations 204–209, SQL smoke tests, RPC hardening commits). It governs legal-grade evidence registry, retention, export manifests, sealed-object immutability, and sync from trust systems. It is **backend/admin infrastructure**, not on-device proof capture.

**Anti-spoof / liveness on this branch is not new relative to `main`.** Native heuristics (`fakeStaticGaze`, `fakePerfectStability`, `fakeNoBlink`, `likelyFake`) exist in `VisionProcessor.kt` on **both** branches from shared ancestry. The branch adds segmentation performance tuning in Kotlin, not a new liveness model. Flutter-side “spoof” handling appears in **simulation/red-team** modules (`adversarial_layer.dart`, `reward_engine.dart` flags) and client-preview trust engines — explicitly marked non-authoritative.

**Relative to canonical i-project work, this branch is stale on eye-tracking runtime** and **ahead on platform economics/POPS backend**. `main` has 51 commits of T-series stabilization extractions (`pipeline_frame_confidence.dart`, `zone_dwell_logic.dart`, `drift_adjusted_gaze.dart`, etc.) that the branch lacks. i-project’s promoted [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/) includes `verification_stability_layer.dart` and `proof_packet_v0.dart` — **neither exists on this branch or on upstream `main`**; they were authored in the integration repo after promotion.

**Recommendation:** Do **not** merge or bulk-promote this branch. **Selectively preserve** (a) evidence-vault SQL + checklist, (b) runtime wiring / ownership docs, (c) backend POPS module as a **reference implementation to reconcile** with i-project POPS docs — while continuing to treat **promoted flutter-runtime + i-project proof schema** as the canonical client path.

---

## 2. Branch metadata

| Field | Value |
|-------|--------|
| **Branch name** | `feature/evidence-vault-v2-hardening` |
| **Remote ref** | `remotes/origin/feature/evidence-vault-v2-hardening` |
| **Merge base with `main`** | `5b97d0021829e46dec1ec9ee608b7f396661e1e4` |
| **Commits ahead of `main`** | 32 |
| **Commits behind `main`** | 51 |
| **Diff vs `main` (three-dot)** | 2,368 files changed, 488,406 insertions(+), 658 deletions(-) |
| **Latest commit** | `d23d365` — *Add autonomous Claude workflow docs* (2026-05-06) |
| **Evidence-vault-specific commits (recent)** | `01a43c4` checklist · `ebf2c0e` migration prereqs · `87130c8` RPC errors · `f62992e` deletion block · `d6d2858` manifest count · `7a1de91` sealed register protect |

**Top-level tree on branch (not on `main`):** `services/`, `supabase/`, `db/`, `src/`, `apps/`, `backend/`, `tools/`, expanded `docs/`, `ai/`.

**Checkpoint commit:** `78d8f68` — *Checkpoint current system state before Composer development* — marks the bulk platform import; subsequent commits are hardening, annotation, and Studio/i Command work.

---

## 3. High-value systems found

| System | Location | Implementation status | Authoritative? |
|--------|----------|----------------------|----------------|
| **Evidence Vault v2 (admin custody)** | `supabase/migrations/204–209_*.sql`, `db/migrations/176–190_*evidence*` | **Implemented SQL** + smoke tests; API module `admin-security-evidence-vault` referenced in checklist but **not present as committed routes** (only `evidence-answers` modules) | Backend/admin — yes when migrated |
| **Backend POPS stack** | `services/api/src/pops/` (~70 files, unit tests) | **Implemented** — scoring, session, decision, wallet hold/release, trust impact, privacy receipts, real-world proofs (QR/NFC/location) | **Yes** per branch’s own ownership contract |
| **Trust / fraud review (API)** | `services/api/src/lib/alphabet/trust-fraud-review/`, `services/api/src/data/alphabet/trust-rules.ts` | **Implemented** with tests | Backend authoritative |
| **Wallet / ledger (API)** | `services/api/src/pops/wallet/`, wallet invariants | **Implemented** with tests | Backend authoritative |
| **Admin Security suite** | `services/api/src/modules/admin-security-*` (~294 module files) | **Implemented** — audit packages, compliance reports, trust proof portals, command center, AI analyst | Admin/backend |
| **Flutter POPS hooks** | `lib/pops/` (6 files + tests) | **Partial** — scoring/decision/privacy receipt orchestration; emits bus events; **not wired to proof packets** | Client preview only |
| **Native anti-spoof heuristics** | `android/.../VisionProcessor.kt` | **Implemented** on both branches — static gaze, perfect stability, no-blink | Signal flags only; not payout gates |
| **Red-team / adversarial simulation** | `lib/adversarial_layer.dart`, `lib/adversarial_reward_loop_simulation.dart` | **Simulation** with tests | Non-authoritative |
| **Client economy/trust/wallet engines** | `lib/reward_engine.dart`, `lib/trust_engine.dart`, `lib/wallet_ledger_engine.dart`, etc. | **Implemented** but header-marked `CLIENT SIMULATION / NON-AUTHORITATIVE` | No |
| **Runtime ownership docs** | `docs/runtime-wiring-matrix.md`, `docs/source-of-truth-ownership-contract.md` | **Documentation** — high value | Canonical for branch architecture |
| **Studio / i Command mock pipeline** | `src/screens/studio/*`, `tools/i-command-*.ts` | **Mock/prototype** | No |
| **Intent OS / governance kernels** | `lib/core/intent_os/*` | **Shared with `main`** — production-quality on-device gates | On-device authority for UI actions only |

---

## 4. Evidence vault architecture

### 4.1 Purpose

Evidence Vault v2 is an **admin-side legal custody layer** for trust artifacts: immutable registry, storage location metadata, retention policies, legal hold, export packages, hash manifests, and sync from upstream trust subsystems.

### 4.2 Core schema (migration 205)

Tables include:

- `admin_security_evidence_storage_locations` — S3/GCS/supabase_storage/etc. with KMS, immutability flags
- `admin_security_evidence_retention_policies` — category-scoped retention (proof, verification, incident, audit_package, …)
- `admin_security_evidence_vault_objects` — registry rows linking to incidents, audit packages, AI findings, command-center items, webhooks
- Custody events, export manifests, legal hold lifecycle (extended in 205–209)

Categories explicitly include `proof`, `verification`, `governance`, `audit_package` — aligning with POPS delayed-review artifacts, but at **admin retention** granularity, not mobile capture format.

### 4.3 Hardening slices (committed)

| Migration | Purpose |
|-----------|---------|
| `204_admin_security_evidence_prereqs.sql` | Dependency guards |
| `205_admin_security_trust_evidence_vault_v2.sql` | Core vault v2 |
| `206_admin_security_evidence_rpc_fixes.sql` | RPC error semantics |
| `207_admin_security_evidence_deletion_block_persist.sql` | Blocked deletion persistence |
| `208_admin_security_evidence_export_manifest_count_fix.sql` | Manifest count drift fix |
| `209_admin_security_evidence_register_sealed_protect.sql` | Sealed objects immutable on re-register |

The checklist (`docs/evidence-vault-v2-hardening-checklist.md`) documents **six-slice** hardening order: migration safety → RPC correctness → API alignment → worker jobs → admin UI → test isolation. It explicitly states: *“Do not commit this feature as one blob”* and *“Do not merge runtime wiring before migration and RPC safety are reviewed.”*

### 4.4 API / UI wiring gap

Committed API modules under `services/api/src/modules/` include `evidence-answers` and `admin-security-evidence-answers` but **no** `admin-security-evidence-vault` route package in the committed tree. The checklist references that module as planned/uncommitted work. **Vault is SQL-first on this branch.**

### 4.5 Distinction from i-project Proof Packet v0

| Concern | Proof Packet v0 (i-project) | Evidence Vault v2 (branch) |
|---------|----------------------------|----------------------------|
| Layer | Device → platform review handoff | Admin custody after platform ingestion |
| Format | JSON derived signals, privacy-first | Registry rows + storage URIs + hash chains |
| Status in i-project | Schema + Dart types; **no emission** | SQL implemented; API partially planned |
| Overlap | POPS review inputs | Long-term retention / legal export |

These are **complementary**, not duplicates — but must be connected explicitly in a future integration design.

---

## 5. Anti-spoof / liveness findings

### 5.1 Implemented (native, both branches)

`VisionProcessor.kt` computes:

- **`fakeStaticGaze`** — no meaningful horizontal gaze step for extended period
- **`fakePerfectStability`** — rolling gaze variance below threshold (“frozen frame”)
- **`fakeNoBlink`** — no blink since face re-detected for `AUTH_NO_BLINK_FACE_MS` (30s)
- **`likelyFake`** — OR of the above

Values surface to Flutter via the vision channel; `main.dart` on **both** branches tracks `_fakeStaticGaze`, `_fakePerfectStability`, `_fakeNoBlink` for HUD/debug.

**Verdict:** Real heuristic **signal production**, not a liveness product. No challenge-response, no ML liveness model, no backend enforcement loop on this branch beyond simulation engines.

### 5.2 Branch-only native delta

Segmentation subsampling (`SEGMENT_EVERY_N_FRAMES`, grid-stride mask scan) — **performance optimization**, not anti-spoof logic.

### 5.3 Flutter / simulation “spoof”

| File | Role |
|------|------|
| `lib/adversarial_layer.dart` | Red-team agent types: `attentionSpoofing`, `platformSpoofing`, `sensorSpoofing` — ** Monte-Carlo style simulation** |
| `lib/reward_engine.dart` | `hasSpoofPattern` bool gates **client simulation** eligibility |
| `lib/trust_engine.dart` | `TrustFlags.sensorSpoofing` input to **preview** trust snapshot |
| `lib/global_reward_function.dart` | `spoofSuccessRate` in verification integrity term — **simulation metric** |

All economy/trust modules carry the banner: *CLIENT SIMULATION / NON-AUTHORITATIVE*.

### 5.4 Not found

- Dedicated `liveness` module or ML face-liveness SDK integration
- `anti-spoof` as a named production subsystem (only comments + simulation enums)
- Wiring from `likelyFake` → POPS scoring → wallet hold (backend POPS uses different signal batch shape)
- Proof packet emission tying blink/liveness into delayed validation

### 5.5 vs i-project Verification Stability Layer v1

Promoted runtime’s VSL (`lib/verification/verification_stability_layer.dart`) is **absent on this branch**. VSL is operator confidence for smoke tests — aligned with POPS but **not** fraud enforcement. Branch neither supersedes nor implements VSL.

---

## 6. POPS / proof / validation findings

### 6.1 Backend POPS (`services/api/src/pops/`) — **implemented**

Subsystems with tests:

- **Scoring** — weighted presence/attention/intent/continuity + automation/impossible-behavior fraud signals
- **Session / completion / decision services**
- **Reward decision + formula + reason codes**
- **Wallet integration** — hold rules, release service, Supabase wallet adapter
- **Trust impact** — events, rules, integration
- **Privacy** — consent, retention, privacy receipts
- **Real-world proofs** — QR, NFC, location, merchant confirmation
- **Economics** — budget reconciliation, brand invoice export
- **Versioning / replay** — model registry, rule registry

This is the **most complete executable POPS implementation** discovered in the recovery sweep — significantly ahead of i-project docs-only POPS architecture.

### 6.2 Flutter POPS (`lib/pops/`) — **partial client hooks**

- `PopsScoringService` — simpler average-based scoring (presence, attention, intent, continuity, fraudRisk)
- `PopsIntegrationHooks` — orchestrates score → decision → privacy receipt; emits `PresenceVerificationScoredEvent` on `System.bus`
- **No** `ProofPacket`, **no** `proof_packet_v0`, **no** session seal at end of watch
- Tests: `test/pops_integration_hooks_test.dart`

### 6.3 Proof / validation terminology elsewhere

- `db/migrations/215_pops_user_disputes_stage11.sql` — dispute stage
- Admin trust proof timeline / merkle anchoring migrations (187–190, 219–223)
- Studio “proof mock pipeline” commits — **mock**, not POPS v0 schema

### 6.4 Alignment with i-project canonical docs

| i-project doc concept | Branch status |
|----------------------|---------------|
| Six POPS layers | Backend scoring maps closely; Flutter uses 4 confidence dimensions + fraudRisk |
| Delayed validation / pending rewards | API wallet hold + `release_pending_rewards_engine` (Flutter sim + API) |
| Proof Packet v0 JSON | **Not present** — schema divergence risk |
| Eye runtime as signal producer | Branch agrees in ownership doc; Flutter hooks exist but don’t emit packets |
| Verification stability bands | Only in i-project promoted runtime, not branch |

**Action:** Reconcile backend `PopsSignalBatch` / scoring weights with [`PROOF_PACKET_SCHEMA_V0.md`](PROOF_PACKET_SCHEMA_V0.md) — treat backend as scoring authority, i-project schema as wire format target.

---

## 7. Trust / fraud / governance findings

### 7.1 Backend (authoritative on branch)

- Trust rules: `services/api/src/data/alphabet/trust-rules.ts`
- Trust-fraud review engine under `services/api/src/lib/alphabet/trust-fraud-review/`
- Admin modules: command center, AI analyst anomaly governance, transparency portal, regulator export bundles
- DB: fraud cases (`019_create_fraud_cases.sql`), identity graph (`044`), audit hash chain (`049`), error taxonomy, incident corrective actions

### 7.2 Flutter (simulation)

- `lib/trust_engine.dart`, `lib/trust_recompute_engine.dart` — tier levels, payout delays, daily limits from trust inputs
- `lib/core/events/fraud_event.dart`, `trust_event.dart`, `policy_event.dart` — event bus models
- `test/trust_engine_test.dart`, `test/fraud_event_test.dart`, `test/red_team_simulation_engine_test.dart`

### 7.3 On-device governance (shared with `main`)

- `lib/core/intent_os/governance_kernel.dart` — confidence/risk/fixation/rate gate
- `lib/core/intent_os/safety_kernel.dart` — sanity/twin-risk/anomaly gate
- **Production-quality**, unit-tested, **not** linked to wallet or evidence vault

### 7.4 Governance documentation on branch

- `docs/runtime-wiring-matrix.md` — explicit simulation vs wired inventory
- `docs/source-of-truth-ownership-contract.md` — backend owns money/trust/POPS
- `docs/yield-grant-policy-alignment-note.md` — policy alignment notes

These three docs are **high-value promotion candidates** into i-project technical docs.

---

## 8. Runtime integration findings

### 8.1 Branch architecture (per wiring matrix)

| Surface | Entry | Role |
|---------|-------|------|
| Flutter | `lib/main.dart` | Capture, gaze, simulation UX |
| API | `services/api/src/server.ts` → `app.ts` | Canonical economics, POPS, trust |
| Admin console | `services/admin-console/` | Review UI (some demo stores) |
| Worker | `services/api/src/modules/worker/*` | Active; `services/worker/` parked |

### 8.2 Flutter runtime divergence vs `main` / promoted copy

**On `main` only (missing from branch):**

- `lib/features/gaze/pipeline_frame_confidence.dart`
- `lib/features/gaze/drift_adjusted_gaze.dart`
- `lib/features/gaze/held_face_policy.dart`
- `lib/features/gaze/pipeline_tracking_coordinator.dart`
- `lib/features/intent/zone_dwell_logic.dart`
- `lib/features/camera/camera_session_controller.dart`
- `lib/features/vision/frame_perf_metrics.dart`, `vision_channel_bridge.dart`, `vision_frame.dart`
- Matching unit tests

**On branch only (not on `main`):**

- Economy/trust/wallet/campaign engines (~40+ lib files)
- `lib/pops/*`, `lib/admin/*`, `lib/features/remote/*`
- `lib/adversarial_layer.dart`, simulation engines
- Expanded event bus (`presence_event.dart`, `wallet_event.dart`, …)

**Promoted i-project runtime** is derived from **`main` stabilization path**, not this branch. **Do not replace promoted runtime with branch `lib/main.dart`** — branch main is monolithic and includes simulation/economy wiring.

### 8.3 Native vision

Shared anti-spoof heuristics; branch adds segmentation caching. Compatible with promoted runtime’s Kotlin bridge with minor merge attention on `VisionProcessor.kt` perf hunks only.

---

## 9. Wallet / reward implications

### 9.1 Backend (implementable)

- `services/api/src/pops/wallet/pops-wallet-release.service.ts` — pending → available transitions
- `services/api/src/pops/rewards/pops-reward-decision.service.ts` — eligibility from POPS scores
- Wallet invariants under `services/api/src/lib/alphabet/wallet-invariants/`
- Flutter projection rules: `lib/economy/wallet_ledger_projection_rules.dart` (simulation mirror)

### 9.2 Flutter simulation

- `lib/reward_engine.dart` — `hasSpoofPattern` affects **simulated** validation
- `lib/economy/release_pending_rewards_engine.dart` — client preview of pending release
- `lib/wallet_ledger_engine.dart`, `lib/value_lot_engine.dart` — ledger simulation with extensive tests

### 9.3 Policy alignment

Branch docs state yield/grant policy should align with backend rules — Flutter engines must not become silent writers. i-project MVP should use **API POPS + wallet** when integrated; until then, promoted runtime stays **signal-only**.

---

## 10. Files worth promoting

Copy-in to i-project or reference architecture — **not merge whole branch**.

| Priority | Path (on branch) | Why |
|----------|------------------|-----|
| **P0** | `docs/evidence-vault-v2-hardening-checklist.md` | Operational hardening playbook for vault SQL |
| **P0** | `docs/runtime-wiring-matrix.md` | Prevents authority drift across repos |
| **P0** | `docs/source-of-truth-ownership-contract.md` | Canonical writer rules — matches i-project POPS intent |
| **P0** | `supabase/migrations/204–209_*.sql` | Evidence vault v2 schema + fixes (after staged apply per checklist) |
| **P0** | `supabase/tests/*evidence*_smoke_test.sql` | Verification harness for vault RPCs |
| **P1** | `services/api/src/pops/` (selected) | Reconcile scoring/hold/release with i-project POPS docs; promote **interfaces + tests** as reference |
| **P1** | `services/api/src/data/alphabet/trust-rules.ts` + trust-fraud-review lib | Trust rule reference |
| **P1** | `lib/pops/pops_models.dart`, `pops_integration_hooks.dart` | Client hook shape — map to Proof Packet v0 emitters later |
| **P2** | `android/.../VisionProcessor.kt` segmentation perf hunks | Optional perf port to promoted runtime after diff review |

---

## 11. Files to preserve only

Archive pointers; do not wire into MVP without explicit design.

| Path | Reason |
|------|--------|
| `db/migrations/` (216 files) | Full admin-security universe — overlaps `eye-earn-sparkle-archive` / `i-initial-structures` migrations; needs dedup map |
| `services/api/src/modules/admin-security-*` (bulk) | Mature but enormous; depends on full DB graph |
| `services/admin-console/` | Demo stores flagged in wiring matrix |
| `lib/adversarial_layer.dart`, `adversarial_reward_loop_simulation.dart` | Red-team simulation |
| `lib/reward_engine.dart`, `lib/economy_engine.dart`, `lib/trust_engine.dart`, `lib/wallet_ledger_engine.dart` | Client simulation — already annotated on branch |
| `src/screens/studio/*Mock*`, `tools/i-command-*` | Studio/i Command prototypes |
| `services/worker/` (standalone) | Marked parked |
| `lib/main.dart` (branch) | Monolithic; superseded by promoted runtime extraction strategy |

---

## 12. Files to ignore

| Path / pattern | Reason |
|----------------|--------|
| `.cursor/`, `.github/` workflow duplicates | Environment-specific |
| `android/gradlew.broken-backup` | Backup artifact |
| `lib/main.dart.bak_step_fixation` | Explicit backup |
| `backend/api/contracts.ts` | Marked unwired in wiring matrix |
| `apps/web/` | Parked |
| Bulk generated / mock JSON in Studio publish paths | Non-production |
| Duplicate migration numbering conflicts (`170_*` twice in listing) | Needs DBA reconciliation before any apply |

---

## 13. Conflicts with current i-project implementation

| Conflict | Detail | Resolution |
|----------|--------|------------|
| **Runtime lineage** | Promoted flutter-runtime follows `main` T-series; branch lacks extractions | Keep promoted runtime; cherry-pick Kotlin perf only if needed |
| **Proof Packet v0** | i-project has schema + Dart types; branch has zero `ProofPacket` references | Backend POPS batches become mappers **to** v0, not a parallel schema |
| **Dual POPS** | Flutter `lib/pops/` vs API `services/api/src/pops/` vs docs | API authoritative; Flutter emits signals → v0 packets → API |
| **Anti-spoof expectations** | Recovery report assumed branch = liveness implementation | Heuristics already on `main`; branch adds admin vault + backend POPS, not new liveness |
| **Migration universes** | Branch `db/migrations/` vs archive Supabase vs branch `supabase/migrations/` | Do not apply without cross-repo migration audit |
| **VSL** | i-project VSL not on branch | Continue VSL in promoted runtime for operator confidence |
| **Economy simulation** | Branch Flutter engines could confuse MVP if copied | Never promote without simulation headers |

---

## 14. Promotion priority

### P0 — promote / reconcile immediately

1. Copy **ownership + wiring docs** into i-project `docs/technical/` (or link permanently from this audit).
2. **Map** backend `services/api/src/pops/services/pops-scoring.service.ts` weights to POPS architecture doc layers.
3. **Stage-review** evidence vault migrations 204–209 against a disposable DB — do not deploy API callers until smoke tests pass.
4. **Confirm** promoted flutter-runtime anti-spoof flags (`likelyFake`) are documented as POPS **presence inputs** in proof packet emission task.

### P1 — preserve and map

1. Full `services/api/src/pops/` tree — inventory against [`PROOF_PACKET_SCHEMA_V0.md`](PROOF_PACKET_SCHEMA_V0.md) field-by-field.
2. Trust-fraud-review backend modules — map to i-initial-structures trust types.
3. Flutter `lib/pops/` — reference for bus events when wiring packet emission.
4. Admin-security evidence answer engine (migrations 184–186) — upstream of vault registry.

### P2 — archive

1. Entire Studio/i Command mock pipeline.
2. Flutter economy/trust/wallet simulation suite (preserve in source repo only).
3. Standalone `services/worker/` mirror.
4. Bulk admin-console demo stores.

---

## 15. Exact recommended next action

1. **In i-project:** Open a “POPS backend reconciliation” task — diff `services/api/src/pops/types/pops.types.ts` (from branch snapshot) against Proof Packet v0 `signals.*` sections; produce a single mapping table doc (do not copy 70 files yet).

2. **In i-project flutter-runtime:** Implement Proof Packet v0 **emission** at session end using existing signals + VSL snapshot + native `likelyFake` flags — branch does not provide this; i-project docs already define it.

3. **For evidence vault:** Run checklist Slice 1 on staging (`204` + `205` apply + smoke tests). Only after pass, copy migrations into i-project’s Supabase migration strategy (likely under a dedicated admin-security path, not consumer archive migrations).

4. **Do not merge** `feature/evidence-vault-v2-hardening` into `main` or i-project — branches have **diverged purposes** (`main` = ET stabilization, branch = platform checkpoint).

5. **Next branch audit:** `eye-earn-sparkle-archive` / `codex/vision-unified-pipeline` — highest remaining gap for web eye-control integration per multi-repo report.

---

## Appendix A — Keyword search summary (branch)

| Term | ~File hits (dart/md/sql/ts) | Notes |
|------|----------------------------|-------|
| evidence | 80+ | Admin vault, migrations, audit |
| vault | 10 | Narrow naming; mostly SQL |
| liveness | 7 | Mostly docs/comments, not SDK |
| spoof / anti-spoof | 16–18 | Native heuristics + simulation |
| fraud | 152 | Backend-heavy |
| proof | 75 | Admin trust proof timelines, not v0 packet |
| POPS | 53 | Backend + Flutter hooks |
| trust | 269 | Largest footprint — admin + API + sim |
| governance | 50 | Admin security + intent OS |
| wallet / reward | 100+ | API + Flutter simulation |
| blink / gaze | Shared with main | Core ET unchanged on branch |

---

## Appendix B — Top source paths (quick reference)

1. `services/api/src/pops/` — executable POPS backend  
2. `supabase/migrations/205_admin_security_trust_evidence_vault_v2.sql` — vault core  
3. `docs/runtime-wiring-matrix.md` — authority map  
4. `android/app/src/main/java/com/example/eye_tracking_app/VisionProcessor.kt` — anti-spoof heuristics  
5. `lib/pops/pops_integration_hooks.dart` — client orchestration stub  

---

*Audit performed read-only against `origin/feature/evidence-vault-v2-hardening` @ `d23d365` vs `origin/main` @ `36d685f`.*
