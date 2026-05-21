# MASTER_BRAIN Quality Review

**Date:** 2026-05-21  
**Scope:** `MASTER_BRAIN/` first-pass archaeology corpus  
**Review mode:** Strict evidence and classification review. No production code changes. No app refactors. No implementation plan.

---

## Executive Verdict

The first-pass MASTER_BRAIN corpus is useful and directionally aligned with the project: it captures the product constitution, identifies the major subsystems, records the most important duplicate implementations, and correctly separates many obvious obsolete branches from candidate sources.

It is **not ready for canonicalization as-is**. Several claims were too confident for the evidence available in this workspace, especially where the corpus cited source documents that were referenced by audits but not directly readable during this review: `SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md`, `POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`, `PROOF_PACKET_SCHEMA_V0.md`, and `docs/MVP_CANONICAL_FLOW.md`.

The safest current status is:

**MASTER_BRAIN is ready for a second evidence-verification pass, not for final canonicalization.**

---

## What Composer Did Well

- Correctly ingested `MASTER_BRAIN/CANONICAL/i_SOURCE_OF_TRUTH.md` as the highest-priority product constitution.
- Preserved the no-production-code boundary; all work is Markdown knowledge organization.
- Created the requested structure and the five requested top-level reports.
- Correctly identified major conflict domains: wallet authority, POPS/proof, vision lineages, investor demos, Studio/i Command, currencies, and simulation-vs-authority.
- Correctly treated `cursor/v1-*` and `cursor/dev-environment-setup` as obsolete based on the branch audits.
- Correctly captured the dual investor-demo distinction: `app/` as Loop 1 proof spine and archive demo v2 as full-app demo overlay.
- Correctly distinguished Evidence Vault v2 from Proof Packet v0 as different layers.

---

## What Needs Correction

### 1. Source-doc availability was overstated

Some MASTER_BRAIN files treated source docs as directly available and canonical even though the quality review could not read them from the workspace:

- `docs/technical/SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md`
- `docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`
- `docs/technical/PROOF_PACKET_SCHEMA_V0.md`
- `docs/MVP_CANONICAL_FLOW.md`

The readable `docs/technical/MULTI_REPO_SYSTEM_RECOVERY_REPORT.md` content in this pass was a 39-line reconciliation footer, even though IDE metadata indicates a longer file may exist. Claims depending on the full body remain unverified.

### 2. Some candidate systems were over-promoted

Several entries were labeled `High` or canonical-like even though the cited evidence is a branch audit, a demo localStorage model, or an unverified source path.

Corrective action applied: downgrade these to `Medium`, `Unknown until readable`, or explicitly label them as audit-referenced.

### 3. Some graph edges implied working integrations

`KNOWLEDGE_GRAPH.md` showed solid edges from Flutter runtime to Proof Packet and from Proof Packet to POPS. The text noted the gap, but the graph visually implied a wired pipeline.

Corrective action applied: changed those edges to dashed/unverified and clarified that packet emission and POPS ingestion are not verified as wired.

### 4. Some language drifted into implementation recommendation

Phrases such as "graft v2 pending UX" and "merge at product architecture level" sounded like implementation direction rather than archaeology classification.

Corrective action applied: softened to candidate-pattern and unresolved-conflict language.

---

## Claims Requiring Evidence

These claims should not be final-canonical until source paths are verified:

| Claim | Current evidence | Required evidence |
|-------|------------------|-------------------|
| `SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md` is the full 35-system canonical table | Multi-repo footer references it | Read the actual file and quote/link the table |
| POPS has a canonical six-layer architecture | Branch audits reference POPS doc | Read `POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` |
| Proof Packet v0 is the canonical wire format | Audits reference schema and Dart type | Read `PROOF_PACKET_SCHEMA_V0.md` and locate `proof_packet_v0.dart` |
| `app/` is exactly aligned with `MVP_CANONICAL_FLOW.md` | Investor audits reference it | Read `docs/MVP_CANONICAL_FLOW.md` and compare screen IDs |
| `source-of-truth-ownership-contract.md` and `runtime-wiring-matrix.md` should be high-confidence authority docs | Evidence Vault and Studio audits reference them | Locate files in preservation/source repos |
| `validate-attention` is authoritative beyond promo sessions | Audit says authoritative for promo validation | Confirm edge function and scope in source repo |
| Evidence Vault v2 SQL should be canonical | Audit says SQL is real and valuable | Verify migrations and distinguish admin custody from payout validation |

---

## Classifications Downgraded

The following were downgraded or narrowed in existing MASTER_BRAIN files:

1. `Pending-first wallet UX`: `High` -> `Medium`, because `demoState.ts` is demo-only localStorage.
2. `Ownership contract`: `High` -> `Medium`, pending direct source-path verification.
3. `Runtime wiring matrix`: `High` -> `Medium`, pending direct source-path verification.
4. `SYSTEM_PROMOTION_SOURCE_OF_TRUTH`: `High` -> `Unknown until readable`.
5. `Proof Packet v0 schema`: `High` -> `Medium`, because schema is audit-referenced but not directly readable in this pass.
6. `validate-attention edge fn`: `High` -> `Medium`, scoped to promo sessions rather than full POPS authority.
7. `Evidence Vault v2 SQL`: `High` -> `Medium`, because it is admin custody, not proof/payout authority.
8. `POPS architecture doc`: `High` -> `Unknown until readable`.
9. `POPS_AND_PROOF.md` design confidence: `High` -> `Medium`, because core docs are audit-referenced but unread in this pass.
10. `Proof Packet v0` graph classification: `Canonical schema` -> `Candidate canonical schema / No verified emission`.
11. `CORE_LOOP.md` wallet backend authority: `Authoritative backend` -> audit-backed candidate authority.
12. `ATTENTION_SYSTEM` validate-attention authority: narrowed to promo scoring per audits, not full POPS.

---

## Classifications To Upgrade

No safe upgrades were applied in this pass.

Potential future upgrades after evidence verification:

- Upgrade `SYSTEM_PROMOTION_SOURCE_OF_TRUTH` to High if the actual file is readable and matches the recovery report.
- Upgrade `POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` to canonical architecture if the file confirms the six-layer model.
- Upgrade `PROOF_PACKET_SCHEMA_V0.md` to canonical wire-format status if the schema is present and matches the branch audit descriptions.
- Upgrade `MVP_CANONICAL_FLOW.md` as the app flow authority if it matches `app/` or clearly defines the intended divergence.

---

## Missing Source Areas

These areas remain insufficiently verified:

- Full `docs/technical/SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md`
- Full `docs/technical/MULTI_REPO_SYSTEM_RECOVERY_REPORT.md` body beyond the 39-line footer readable in this pass
- `docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`
- `docs/technical/PROOF_PACKET_SCHEMA_V0.md`
- `docs/MVP_CANONICAL_FLOW.md`
- `integrations/eye-tracking/flutter-runtime/lib/proof/proof_packet_v0.dart`
- IVAULT `docs/source-of-truth-ownership-contract.md`
- IVAULT `docs/runtime-wiring-matrix.md`
- `eye-earn-sparkle-archive` source files for `validate-attention`, `issue-reward`, `demoState.ts`, and wallet migrations
- `app/` screen/router source files for direct flow verification

---

## Safe Corrections Applied

Applied only narrow corrections:

- Added source-doc availability warnings to `REPOSITORY_MAP.md` and `RESEARCH/GAPS_AND_UNKNOWNS.md`.
- Downgraded overconfident entries in `CANONICAL_CANDIDATES.md`.
- Changed proof-pipeline graph edges in `KNOWLEDGE_GRAPH.md` to dashed/unverified.
- Scoped `validate-attention` to promo validation rather than full POPS authority.
- Reworded wallet and Studio conflict language in `DUPLICATES_AND_CONFLICTS.md` to avoid implementation-plan language.
- Clarified `CORE_LOOP.md`, `POPS_AND_PROOF.md`, `ATTENTION_SYSTEM/VERIFICATION_AND_VISION.md`, and `TECH_ARCHITECTURE/MULTI_REPO_AND_AUTHORITY.md` where claims depended on audit references.
- Corrected the `MASTERBRAIN_STRUCTURE.md` tree note and changed "complete" wording to "first pass complete".

---

## Next Recommended Masterbrain Pass

The next pass should be an **evidence verification pass**, not implementation planning.

Recommended order:

1. Restore or locate the missing source docs listed above.
2. Add exact source paths and line references for every High-confidence canonical candidate.
3. Split `CANONICAL_CANDIDATES.md` into:
   - `Declared Canonical`
   - `Audit-Backed Candidate`
   - `Source-Verified Candidate`
   - `Unknown Until File Verified`
4. Verify `app/` against `MVP_CANONICAL_FLOW.md`.
5. Verify Proof Packet v0 schema against any Dart/TypeScript implementation.
6. Verify whether `SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md` supersedes or narrows any MASTER_BRAIN classification.
7. Only after that, consider a canonicalization phase.

---

## Final Readiness

| Question | Verdict |
|----------|---------|
| Is MASTER_BRAIN useful as a first-pass map? | Yes |
| Is it fully source-verified? | No |
| Is it safe to treat as canonical project constitution? | No |
| Is it ready for canonicalization phase? | Not yet |
| Is it ready for evidence-verification pass? | Yes |

**Quality verdict:** First-pass corpus is valuable, but still too dependent on audit-referenced and unread source docs to become canonical.
