# REPOSITORY_MAP

**Generated:** 2026-05-21  
**Scope:** `i_project_migration_archive` + referenced sibling evidence  
**Purpose:** Complete inventory of where [ i ] knowledge lives in this archive

---

## 1. Executive Summary

This repository is a **migration and integration archive**, not the final [ i ] implementation. It combines:

- Rescued HTML/MD product prototypes (folders `00`–`08`)
- A canonical Vite/React **Loop 1 investor MVP** (`app/`)
- Promoted code slices under `integrations/`
- A prior lowercase `masterbrain/` chat-inventory
- **31+ technical recovery audits** in `docs/technical/`
- References to **11 cloned source repos** at sibling path `github-source-repos/`

Evidence hierarchy:

```
github-source-repos/ (raw clones)
    ↓
integrations/old-source-preservation/ (frozen snapshots)
    ↓
integrations/eye-tracking/ (promoted subsets)
    ↓
docs/technical/ (derived audits)
    ↓
MASTER_BRAIN/ (classified knowledge corpus)
```

---

## 2. Top-Level Directory Map

| Path | Type | Knowledge domain | Classification |
|------|------|------------------|----------------|
| `00_README/` | Docs | Migration bootstrap, manifest, timeline | Research |
| `01_strategy_docs/` | Docs | i-app-masterplan | Research |
| `02_clickable_prototypes/` | HTML | Early UX | Prototype |
| `03_pitch_pages/` | HTML | Pitch | Prototype |
| `04_wallet_payments/` | HTML | Wallet/payment UX | Prototype |
| `05_creator_campaigns/` | HTML | Creator/campaign UX | Prototype |
| `06_feed_earning_loops/` | HTML | Feed/earn UX | Prototype |
| `07_currency_system/` | HTML | Currency UX | Prototype |
| `08_raw_originals/` | HTML | Duplicate raw archive | Prototype |
| `app/` | Code | Loop 1 investor MVP (React/Vite) | Canonical candidate |
| `docs/` | Docs | MVP flow, app audit, technical audits | Mixed |
| `docs/technical/` | Docs | Branch audits, POPS, proof schema, SoT | Primary evidence |
| `integrations/` | Code | Eye-tracking runtime, source, preservation | Mixed |
| `masterbrain/` | Docs | Pre-MASTER_BRAIN category stubs | Research |
| `MASTER_BRAIN/` | Docs | **This knowledge corpus** | Canonical index |
| `prototype-app/` | HTML | Archive launcher | Prototype |

---

## 3. `app/` — Canonical Loop 1 Spine

```
app/
├── src/screens/          # 12+ screens (Splash, Feed, WatchVerify, Wallet, ProofLayer, …)
├── src/state/            # demoContext, types
├── src/components/       # AppShell, VerificationGate, PhoneFrame, …
├── src/data/demoData.ts  # Mock demo data
└── package.json          # npm run dev
```

**Screens (evidence):** splash, feed, offer-detail, watch-verify, verification-result, reward-reveal, wallet, convert, withdraw-preview, creator-economics, roadmap, consent-camera-gate, proof-layer.

**Classification:** Canonical candidate for **Loop 1 narrative**; Experimental for wallet timing (instant credit gap).

---

## 4. `integrations/` Map

```
integrations/
├── eye-tracking/
│   ├── flutter-runtime/     # Promoted Dart — Intent OS, VSL, proof_packet_v0 types
│   ├── source/              # i-initial-structures mirror — safe-action, studio collab
│   ├── demos/investor-demo/
│   ├── prototypes/i-mvp-prototype/
│   └── docs/                # AGENTS, DECISIONS, obsidian vault
└── old-source-preservation/
    ├── ivault-eye-tracking/snapshot/   # Full platform @ d23d365 (~2640 files)
    ├── home-eye-tracking-post-import/
    ├── itrack-dirty-worktree/
    └── ivault-eye-tracking-stashes/
```

| Subpath | Subsystems | Classification |
|---------|------------|----------------|
| flutter-runtime | Gaze, blink, Intent OS, Proof Packet v0 types | **Canonical** (native signals) |
| source | Safe-action, studio collab/media, ELO mock | **Canonical candidate** (types) |
| demos/prototypes | Investor walkthroughs | Prototype |
| ivault snapshot | POPS API, evidence vault SQL, Studio monolith | Experimental reference |

---

## 5. `docs/technical/` — Audit Corpus (Primary Input)

### Branch recovery audits (10)

| File | Subject |
|------|---------|
| EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md | POPS backend, trust, wallet, evidence vault |
| STUDIO_ROUTING_AUDIT_BRANCH_AUDIT.md | Studio, i Command, three-way merge |
| VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md | Web vision @ 22cabd3 |
| INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md | Full-app demo overlay |
| EYE_EARN_SPARKLE_V2_UNIFIED_VISION_ARCHIVE_AUDIT.md | v2 vision historical baseline |
| EYE_TRACKING_PRE_COMPOSER_CLEANUP_BRANCH_AUDIT.md | Pre-T-series checkpoint |
| I_INITIAL_STRUCTURES_MVP_BRANCH_AUDIT.md | Safe-action, ELO, studio types |
| CURSOR_V1_KERNEL_BRANCHES_AUDIT.md | Stale Cursor bookmarks |
| CURSOR_DEV_ENVIRONMENT_SETUP_BRANCH_AUDIT.md | Compile-fix branch closure |
| MULTI_REPO_SYSTEM_RECOVERY_REPORT.md | Multi-repo inventory + reconciliation |

### Architecture / schema docs (referenced)

| File | Subject |
|------|---------|
| SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md | 35 subsystem ownership map |
| POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md | Six-layer POPS |
| PROOF_PACKET_SCHEMA_V0.md | Device handoff wire format |
| VERIFICATION_STABILITY_LAYER_V1.md | Operator confidence bands |
| FULL_REPO_SOURCE_RECOVERY_AUDIT.md | Prior org clone audit |

**Evidence verification note (2026-05-21):** Core source docs are **source-verified** in the IVAULT primary repo (`~/Desktop/IVAULT/i-project-rescue/i_project_migration_archive`). This Cursor workspace may contain `MASTER_BRAIN/` only — see [`EVIDENCE_VERIFICATION.md`](EVIDENCE_VERIFICATION.md).

| File | Subject | Verification |
|------|---------|--------------|
| SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md | 35 subsystem ownership map | **Source-verified** — `docs/technical/`, 239 lines |
| POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md | Six-layer POPS | **Source-verified** — `docs/technical/` |
| PROOF_PACKET_SCHEMA_V0.md | Device handoff wire format | **Source-verified** — `docs/technical/` |
| VERIFICATION_STABILITY_LAYER_V1.md | Operator confidence bands | Present in primary repo |
| FULL_REPO_SOURCE_RECOVERY_AUDIT.md | Prior org clone audit | Present in primary repo |
| MVP_CANONICAL_FLOW.md | Loop 1 decision map | **Source-verified** — `docs/` |

---

## 6. Sibling Source Repos (`github-source-repos/`)

| # | Repo | Audited branches | Role |
|---|------|------------------|------|
| 1 | eye_tracking_app | main, evidence-vault, studio-routing, pre-composer, cursor/* | Native runtime + IVAULT checkpoint |
| 2 | eye-earn-sparkle-archive | main, vision-unified-pipeline, investor-demo-v2 | Production web + Supabase |
| 3 | eye-earn-sparkle-v2 | main, archive/unified-vision | Parallel + native plugin |
| 4 | i-initial-structures | main, investor-demo-mvp-night-build | Safe-action, studio types |
| 5–11 | eye-earn-sparkle stubs, i-project, i-the-app, iview, up-next-queue | Partial / placeholder | Context |

**Path:** `/Users/2023macbookpro/Desktop/i-project-rescue/github-source-repos/`

---

## 7. `masterbrain/` (Legacy Inventory)

```
masterbrain/
├── 00_INDEX.md
├── 01_chat_inventory/
├── 02_product_vision/ … 12_open_questions/
```

Category README stubs — chat ledger pointers. **Superseded as index by MASTER_BRAIN/** but retained for provenance.

---

## 8. Knowledge Density by Domain

| Domain | Richest evidence locations |
|--------|---------------------------|
| Attention / vision | flutter-runtime, vision audits, validate-attention |
| Wallet / economy | eye-earn-sparkle-archive Supabase, demoState, IVAULT POPS wallet |
| Trust / POPS | IVAULT services/api, safe-action-engine, evidence vault SQL |
| Creator / studio | 3 lineages — source/, IVAULT snapshot, archive components |
| Investor demo | app/, investor-demo v2 audit, demos/ |
| Product constitution | MASTER_BRAIN/CANONICAL/i_SOURCE_OF_TRUTH.md |

---

## 9. File Count Estimates

| Area | Scale |
|------|-------|
| Rescued HTML (02–08) | ~50 catalogued paths |
| docs/technical/*.md | 31 files |
| app/ | ~47 tracked files |
| integrations/old-source-preservation | Largest subtree (900KB+ tree JSON) |
| MASTER_BRAIN/ | This corpus |

---

## 10. How to Use This Map

1. Start product questions at `MASTER_BRAIN/CANONICAL/i_SOURCE_OF_TRUTH.md`
2. Trace implementation evidence via domain folders (ECONOMY/, ATTENTION_SYSTEM/, etc.)
3. Resolve conflicts in `DUPLICATES_AND_CONFLICTS.md`
4. Check promotion targets in `CANONICAL_CANDIDATES.md`
5. Do **not** treat any single repo as complete [ i ] — use authority contract in TECH_ARCHITECTURE/
