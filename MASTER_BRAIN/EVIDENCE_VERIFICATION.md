# MASTER_BRAIN Evidence Verification Pass

**Date:** 2026-05-21  
**Scope:** `MASTER_BRAIN/`, `docs/`, `integrations/`, `app/`  
**Primary repo verified:** `~/Desktop/IVAULT/i-project-rescue/i_project_migration_archive`  
**Cursor workspace checked:** `~/Desktop/i-project-rescue/i_project_migration_archive` (MASTER_BRAIN only)

---

## Executive Summary

Evidence verification located **16 primary source artifacts** in the IVAULT primary repo. The quality-review “unreadable / missing” warnings were caused by a **workspace split**: this Cursor workspace contains only `MASTER_BRAIN/`; the full archive (`docs/`, `integrations/`, `app/`) lives under the IVAULT path.

Source documents cited by audits **do exist and were read**. Several product gaps remain **confirmed by the source docs themselves** (notably Proof Packet emission and pending-wallet wiring). MASTER_BRAIN is **more source-backed than after the first pass**, but **not ready for final canonicalization**.

---

## Workspace vs Primary Repo

| Location | Contents | Status |
|----------|----------|--------|
| `~/Desktop/IVAULT/i-project-rescue/i_project_migration_archive` | Full archive: `docs/`, `integrations/`, `app/`, `MASTER_BRAIN/` | **Primary evidence home** |
| `~/Desktop/i-project-rescue/i_project_migration_archive` | `MASTER_BRAIN/` only | **Knowledge corpus only — no source docs in tree** |

All file paths below are relative to the **IVAULT primary repo** unless noted.

---

## Files Verified Present

| # | Path | Lines / size | Verification note |
|---|------|--------------|-------------------|
| 1 | `docs/technical/SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md` | 239 lines | §3 contains **35-row** canonical systems table with repo · branch · path · promotion status |
| 2 | `docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` | 252 lines | §2 defines **six POPS layers** (Presence, Participation, Perception, Signal, Session Integrity, Reward Eligibility) |
| 3 | `docs/technical/PROOF_PACKET_SCHEMA_V0.md` | 358 lines | JSON schema v0; §3 lifecycle explicitly states **no runtime emission yet** |
| 4 | `docs/MVP_CANONICAL_FLOW.md` | 271 lines | 10-step decision map; references investor-demo screen order |
| 5 | `docs/technical/MULTI_REPO_SYSTEM_RECOVERY_REPORT.md` | 1043 lines | Full archaeology body present (not 39-line footer only) |
| 6 | `integrations/eye-tracking/flutter-runtime/lib/proof/proof_packet_v0.dart` | 225 lines | Dart mirror of schema; `ProofPacketV0`, `ProofReviewStatus`, signal summaries |
| 7 | `integrations/eye-tracking/flutter-runtime/lib/proof/` | 1 Dart file | Proof types directory exists; no emission wiring elsewhere in runtime |
| 8 | `app/src/App.tsx` + `app/src/state/types.ts` | — | 13-screen router; `DemoScreenId` union verified |
| 9 | `integrations/eye-tracking/demos/investor-demo/src/demo/screensOrder.ts` | 17 lines | 11-screen linear flow (MVP canonical order reference) |
| 10 | `integrations/old-source-preservation/ivault-eye-tracking/snapshot/docs/source-of-truth-ownership-contract.md` | 31 lines | Authority ownership table (preservation snapshot, not promoted to `docs/`) |
| 11 | `integrations/old-source-preservation/ivault-eye-tracking/snapshot/docs/runtime-wiring-matrix.md` | 91 lines | Runtime-wired vs mock matrix (preservation snapshot) |
| 12 | `github-source-repos/eye-earn-sparkle-archive/src/lib/demoState.ts` | 164 lines | Demo-only localStorage wallet (`DEMO_BALANCES_KEY`, etc.) |
| 13 | `github-source-repos/eye-earn-sparkle-archive/supabase/functions/validate-attention/index.ts` | 488 lines | Promo attention validation; server recomputes score from samples; `promoId` optional |
| 14 | `github-source-repos/eye-earn-sparkle-archive/supabase/functions/issue-reward/index.ts` | present | Production reward edge function |
| 15 | `github-source-repos/eye-earn-sparkle-archive/supabase/migrations/` | 103 files | Wallet ledger series (`20260218100002_wallet_ledger.sql`, atomic ops, attention reward RPCs) |
| 16 | `integrations/old-source-preservation/ivault-eye-tracking/snapshot/supabase/migrations/204–209_*.sql` | 6 files | Evidence Vault v2 SQL (preservation snapshot; admin custody) |

**Verified evidence count:** 16

---

## Files Missing or Not Promoted

| Item | Expected path | Status |
|------|---------------|--------|
| Source docs in Cursor workspace | `docs/` under workspace root | **Missing** — workspace is MASTER_BRAIN-only |
| Ownership contract (promoted) | `docs/source-of-truth-ownership-contract.md` | **Not promoted** — exists only in preservation snapshot |
| Runtime wiring matrix (promoted) | `docs/runtime-wiring-matrix.md` | **Not promoted** — exists only in preservation snapshot |
| POPS backend (live tree) | `services/api/src/pops/` at archive root | **Not in migration archive root** — executable POPS lives in IVAULT preservation snapshot (~184 files under `snapshot/services/api/src/pops/`) |
| Evidence Vault v2 in production archive | `eye-earn-sparkle-archive/supabase/migrations/204_*` | **Not in archive Supabase** — only in IVAULT branch preservation snapshot |
| Proof packet emission | flutter-runtime session end | **Confirmed gap** — schema + types exist; emission not implemented (per source docs) |
| `demoState.ts` in migration archive | `app/` or archive copy | **Absent from migration archive** — only in `github-source-repos/eye-earn-sparkle-archive` clone |

**Missing / not-promoted evidence count:** 7

---

## Claims Confirmed

| Claim | Evidence | Verdict |
|-------|----------|---------|
| SoT defines 35 platform systems | `SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md` §3 — 35 numbered rows | **Confirmed** |
| POPS has six-layer architecture | `POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` §2 table | **Confirmed** (design doc; not fully wired) |
| Proof Packet v0 is defined wire format | Schema doc + `proof_packet_v0.dart` field alignment (`packetVersion`, `sessionId`, `signals`, `eyeTracking`, `interaction`, `review`) | **Confirmed as schema/types** |
| Proof Packet v0 has no runtime emission | Schema §3: “not implemented in runtime yet”; Dart header: “no runtime wiring” | **Confirmed gap** |
| `validate-attention` is promo-session scoped | Edge fn schema: `contentId`, optional `promoId`, attention samples; not ProofPacketV0 ingestion | **Confirmed** — promo path, not full POPS authority |
| `demoState.ts` is demo localStorage only | `readJSON`/`writeJSON` on `localStorage` keys | **Confirmed** — not production wallet |
| Wallet migrations exist in production archive | `eye-earn-sparkle-archive/supabase/migrations/20260218*` ledger + atomic RPCs | **Confirmed** |
| Evidence Vault v2 SQL is real admin custody | Preservation snapshot migrations 204–209; audit §4.2 | **Confirmed in snapshot** — not promoted to archive Supabase |
| Archaeology phase complete | Full `MULTI_REPO_SYSTEM_RECOVERY_REPORT.md` + SoT reconciliation section | **Confirmed** |
| `app/` implements Loop 1 spine with extensions | 13 screens vs investor-demo 11-screen flow; adds `consent-camera-gate`, `proof-layer` | **Confirmed partial alignment** |

---

## Claims Still Unverified or Blocked

| Claim | Blocker |
|-------|---------|
| MASTER_BRAIN fully self-contained in workspace | Workspace lacks `docs/`, `integrations/`, `app/` — corpus depends on IVAULT path |
| `app/` exactly matches `MVP_CANONICAL_FLOW.md` screen order | `app/` adds 2 screens; instant credit timing may differ from pending-validation model |
| Proof Packet → POPS → pending wallet pipeline wired | Source docs confirm **not wired** |
| POPS backend executable is canonical in migration archive | Lives in preservation snapshot only; not promoted |
| Coin naming (Vicoin/Icoin vs aCoins/iCoins) | No owner decision document found |
| iVatar subsystem | SoT lists it; zero implementation found |
| `github-source-repos/` clone freshness | Clone tree existence assumed from SoT; not re-inventoried in this pass |

---

## Changes Made (This Pass)

| File | Change |
|------|--------|
| `MASTER_BRAIN/EVIDENCE_VERIFICATION.md` | **Created** — this report |
| `MASTER_BRAIN/QUALITY_REVIEW.md` | Added evidence-verification addendum; updated readiness verdict |
| `MASTER_BRAIN/CANONICAL_CANDIDATES.md` | Upgraded source-verified items; added exact evidence paths |
| `MASTER_BRAIN/RESEARCH/GAPS_AND_UNKNOWNS.md` | Resolved missing-doc entries; recorded workspace split |
| `MASTER_BRAIN/REPOSITORY_MAP.md` | Replaced “not readable” warning with verified paths |
| `MASTER_BRAIN/TRUST_SYSTEM/POPS_AND_PROOF.md` | Updated confidence + evidence paths |
| `MASTER_BRAIN/TECH_ARCHITECTURE/MULTI_REPO_AND_AUTHORITY.md` | SoT table marked source-verified; preservation paths for authority docs |

**No production code, app refactors, or feature implementation.**

---

## Canonicalization Readiness

| Question | Verdict |
|----------|---------|
| Are cited source docs readable in primary repo? | **Yes** (IVAULT path) |
| Is MASTER_BRAIN evidence-backed? | **Mostly yes** — major audit-referenced docs verified |
| Is Proof Packet → POPS → wallet wired? | **No** — confirmed gap in source docs |
| Are authority docs promoted to `docs/`? | **No** — preservation snapshot only |
| Is workspace self-contained? | **No** — MASTER_BRAIN-only checkout |
| Ready for final canonicalization? | **No** |

**Recommended next step:** Promote or symlink `docs/`, `integrations/`, and `app/` into the workspace used for MASTER_BRAIN work, then run owner review on Tier 4 unknowns (coin glossary, iVatar, dual-demo strategy).

---

*Evidence verification pass complete — 2026-05-21*
