# MASTERBRAIN_STRUCTURE

**Generated:** 2026-05-21  
**Version:** 1.0  
**Purpose:** Define the permanent MASTER_BRAIN knowledge architecture for [ i ]

---

## 1. Mission

MASTER_BRAIN is the **permanent knowledge corpus** for the [ i ] project. It:

- Extracts concepts from all repository evidence
- Classifies every finding: **Canonical · Experimental · Obsolete · Unknown**
- Records duplicates and conflicts explicitly
- Does **not** contain production code or implementation roadmaps

This archive (`i_project_migration_archive`) is evidence — not the final product. MASTER_BRAIN lives here until a dedicated knowledge repo is chosen.

---

## 2. Directory Tree

```
MASTER_BRAIN/
├── README.md                          ← Entry point
├── REPOSITORY_MAP.md                  ← Where evidence lives
├── KNOWLEDGE_GRAPH.md                 ← Concept relationships (Mermaid)
├── DUPLICATES_AND_CONFLICTS.md        ← Competing implementations registry
├── CANONICAL_CANDIDATES.md            ← What should become canonical
├── MASTERBRAIN_STRUCTURE.md           ← This file
│
├── CANONICAL/                         ← Aligns with i Source of Truth
│   ├── i_SOURCE_OF_TRUTH.md           ← Highest priority document
│   ├── CORE_LOOP.md
│   ├── THREE_PARTICIPANTS.md
│   └── REVENUE_MODEL.md
│
├── EXPERIMENTAL/                      ← Valuable but not final
│   └── INDEX.md
│
├── OBSOLETE/                          ← Superseded / closed threads
│   └── INDEX.md
│
├── RESEARCH/                          ← Gaps, unknowns, missing docs
│   └── GAPS_AND_UNKNOWNS.md
│
├── PROTOTYPES/                        ← Demos, HTML, click-throughs
│   └── INDEX.md
│
├── ECONOMY/                           ← Wallet, currencies, rewards
│   ├── CURRENCY_ECOSYSTEM.md
│   └── WALLET_SYSTEM.md
│
├── TRUST_SYSTEM/                      ← Trust, POPS, proof, fraud
│   ├── POPS_AND_PROOF.md
│   └── TRUST_AND_GOVERNANCE.md
│
├── ATTENTION_SYSTEM/                  ← Vision, verification, signals
│   └── VERIFICATION_AND_VISION.md
│
├── CREATOR_ECONOMY/                   ← Studio, campaigns, creator tools
│   └── STUDIO_AND_CAMPAIGNS.md
│
├── INVESTOR_DEMO/                     ← Demo paths, flows, pitch
│   └── DEMO_PATHS_AND_FLOWS.md
│
├── TECH_ARCHITECTURE/                 ← Multi-repo, authority, subsystems
│   └── MULTI_REPO_AND_AUTHORITY.md
│
└── DECISIONS/                         ← ADR-style extracted decisions
    └── ARCHITECTURE_DECISIONS.md
```

---

## 3. Classification Model

Every extracted finding receives:

| Field | Description |
|-------|-------------|
| **Classification** | Canonical / Experimental / Obsolete / Unknown |
| **Confidence** | High / Medium / Low |
| **Evidence** | File paths, audit refs, branch commits |
| **Conflicts** | Pointer to DUPLICATES_AND_CONFLICTS.md |
| **Constitution alignment** | Aligns / Partial / Contradicts i_SOURCE_OF_TRUTH |

### Definitions

- **Canonical** — Aligns with i Source of Truth OR audit-identified current authority
- **Experimental** — Potentially valuable; not promoted, verified, or final
- **Obsolete** — Superseded, stale, misleading, or explicitly closed
- **Unknown** — Evidence exists; authority or alignment undetermined

---

## 4. Evidence Hierarchy

```
1. i_SOURCE_OF_TRUTH.md          (product constitution — wins conflicts)
2. docs/technical/ branch audits  (archaeology verdicts)
3. Architecture schema docs       (POPS, Proof Packet, VSL, SoT)
4. Promoted integrations/         (flutter-runtime, source)
5. Preservation snapshots/        (IVAULT @ d23d365)
6. Sibling github-source-repos/   (raw clones — cite branch + commit)
7. HTML prototypes 00–08         (design archaeology)
8. masterbrain/ legacy stubs      (chat inventory — supplement only)
```

---

## 5. Relationship to `masterbrain/`

| | lowercase `masterbrain/` | `MASTER_BRAIN/` |
|---|--------------------------|-----------------|
| Origin | Pre-migration chat inventory | Archaeology plan deliverable |
| Content | Category README stubs | Classified knowledge + 5 core reports |
| Status | Supplementary | **Primary index** |
| Action | Do not delete — cross-link | Extend on new evidence |

---

## 6. Core Deliverables (Required)

| # | File | Status |
|---|------|--------|
| 1 | REPOSITORY_MAP.md | First pass complete |
| 2 | KNOWLEDGE_GRAPH.md | First pass complete |
| 3 | DUPLICATES_AND_CONFLICTS.md | First pass complete |
| 4 | CANONICAL_CANDIDATES.md | First pass complete |
| 5 | MASTERBRAIN_STRUCTURE.md | First pass complete |

---

## 7. Ingestion Workflow (Future Evidence)

When new evidence arrives (branch audit, promoted code, owner decision):

1. Add raw reference to REPOSITORY_MAP.md
2. Extract concepts into domain folder
3. Classify in domain file + update EXPERIMENTAL/OBSOLETE index if needed
4. Update KNOWLEDGE_GRAPH edges
5. Log conflicts in DUPLICATES_AND_CONFLICTS.md
6. Adjust CANONICAL_CANDIDATES tiers
7. Add ADR to DECISIONS/ if architectural

**Do not** skip classification. **Do not** add implementation tasks to MASTER_BRAIN.

---

## 8. What MASTER_BRAIN Is Not

- Not a codebase — no production code changes
- Not a roadmap — build priority lives in constitution; execution is separate phase
- Not a replacement for SYSTEM_PROMOTION_SOURCE_OF_TRUTH — complements it with product lens
- Not exhaustive file inventory — see REPOSITORY_MAP for paths; see audits for depth

---

## 9. Archaeology Completion Statement

Based on `docs/technical/MULTI_REPO_SYSTEM_RECOVERY_REPORT.md` (2026-05-21):

- 11 cloned repos inventoried; 8 analyzed in depth
- Critical branch audits complete
- Stale Cursor branches closed
- Knowledge extraction into MASTER_BRAIN completes the **first-pass librarian phase**
- Promotion/reconciliation is a **separate phase** — out of scope until owner accepts this corpus

---

## 10. Quick Navigation

| Question | Go to |
|----------|-------|
| What is [ i ]? | CANONICAL/i_SOURCE_OF_TRUTH.md |
| Where does X live? | REPOSITORY_MAP.md |
| How do concepts connect? | KNOWLEDGE_GRAPH.md |
| What conflicts exist? | DUPLICATES_AND_CONFLICTS.md |
| What should we canonize? | CANONICAL_CANDIDATES.md |
| What's wallet/POPS/trust? | ECONOMY/, TRUST_SYSTEM/ |
| What's vision/attention? | ATTENTION_SYSTEM/ |
| What's the investor demo? | INVESTOR_DEMO/ |
| What's obsolete? | OBSOLETE/INDEX.md |
| What's unknown? | RESEARCH/GAPS_AND_UNKNOWNS.md |

---

*MASTER_BRAIN v1.0 — First-pass knowledge extraction complete. No implementation plans included.*
