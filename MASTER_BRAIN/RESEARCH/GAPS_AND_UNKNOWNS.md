# Research Notes — Gaps & Unknowns

**Classification:** Unknown / Research required  
**Last evidence pass:** 2026-05-21 — see [`EVIDENCE_VERIFICATION.md`](../EVIDENCE_VERIFICATION.md)

> **Full IVAULT global intake is required before final canonicalization or owner decisions.**  
> Census complete 2026-05-21 — see [`GLOBAL_INTAKE/IVAULT_GLOBAL_INVENTORY.md`](../GLOBAL_INTAKE/IVAULT_GLOBAL_INVENTORY.md). Remaining gaps below are **post-census** work items, not missing inventory.

## Workspace Split (Critical)

| Location | Has `docs/`, `integrations/`, `app/`? |
|----------|--------------------------------------|
| `~/Desktop/IVAULT/i-project-rescue/i_project_migration_archive` | **Yes** — primary evidence repo |
| `~/Desktop/i-project-rescue/i_project_migration_archive` (this workspace) | **No** — `MASTER_BRAIN/` only |

MASTER_BRAIN claims must cite IVAULT paths until the workspace is unified.

## Previously Missing Documents — Now Source-Verified (IVAULT Primary Repo)

| Document | Verified path | Status |
|----------|---------------|--------|
| SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md | `docs/technical/` (35 systems §3) | **Source-verified** |
| MULTI_REPO_SYSTEM_RECOVERY_REPORT.md | `docs/technical/` (1043 lines) | **Source-verified** — full body, not footer-only |
| POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md | `docs/technical/` | **Source-verified** — six layers §2 |
| PROOF_PACKET_SCHEMA_V0.md | `docs/technical/` | **Source-verified** — no emission yet |
| MVP_CANONICAL_FLOW.md | `docs/` | **Source-verified** |
| proof_packet_v0.dart | `integrations/eye-tracking/flutter-runtime/lib/proof/` | **Source-verified** |
| source-of-truth-ownership-contract.md | `integrations/old-source-preservation/ivault-eye-tracking/snapshot/docs/` | **Verified in snapshot** — not promoted to `docs/` |
| runtime-wiring-matrix.md | same preservation path | **Verified in snapshot** — not promoted to `docs/` |

## Still Missing or Not Promoted

| Item | Status |
|------|--------|
| Authority docs at `docs/source-of-truth-ownership-contract.md` | **Not promoted** from preservation snapshot |
| POPS backend at migration archive root | **Not promoted** — executable code in preservation snapshot only |
| Evidence Vault 204–209 in archive Supabase | **Not promoted** — snapshot only |
| Proof Packet runtime emission | **Confirmed gap** per schema doc and Dart types |
| `demoState.ts` in migration archive tree | **Clone-only** — `github-source-repos/eye-earn-sparkle-archive/src/lib/` |

## Unknown Classifications

| Topic | Question |
|-------|----------|
| iVatar | Product concept in SoT — **zero implementation** found |
| Coin naming final mapping | Vicoin/Icoin vs aCoins/iCoins — **no owner decision in repo** |
| Fourth studio rewrite risk | Three lineages + archive AI components — merge strategy undefined |
| `app/` vs MVP flow exact alignment | `app/` adds `consent-camera-gate` and `proof-layer`; pending-wallet timing may differ |
| github-source-repos live clone state | Assumed present from SoT; not re-inventoried in evidence pass |

## Archaeology Phase Status

Per verified `MULTI_REPO_SYSTEM_RECOVERY_REPORT.md` + SoT (2026-05-21): migration-archive archaeology **complete** at clone scope.

**IVAULT global intake (2026-05-21):** ~628k files on disk indexed at metadata level; 80,959 non-dependency rows in `GLOBAL_INTAKE/IVAULT_SOURCE_CENSUS.tsv`; 32 repos; 29 Lovable-likely apps; 2,917 chat files. Remaining work: **chat extraction**, **visual review**, **duplicate owner decisions**, then promotion/reconciliation — not raw discovery.

## Post-Intake Unknowns (New)

| Topic | Gap |
|-------|-----|
| IVAULT `MASTER_BRAIN/` PDFs | Multiple Ultimate Development Guide variants — which is canonical? |
| `DEMOS:REPOS` vs `i-project-rescue/github-source-repos` | Parallel eye-earn-sparkle lineages — merge order undefined |
| CHATGPT + CLAUDE exports | 2,917 files indexed; **zero** conversations summarized |
| `node_modules` (~495k files) | Excluded from row census — dependency preservation only |
| Workspace vs IVAULT primary repo | Two `i_project_migration_archive` trees — unification pending |

## Prior masterbrain/ Folder

Lowercase `masterbrain/` (14 READMEs + chat inventory) predates `MASTER_BRAIN/`. Relationship: chat-inventory pointers and category stubs — **supplement**, not replace, this corpus.
