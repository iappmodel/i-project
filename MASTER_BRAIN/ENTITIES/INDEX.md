# ENTITIES — Index

**Generated:** 2026-05-25  
**Sources:** 189 Desktop chat extractions + P0 batches 01–07 synthesis + constitution  
**Classification:** All entries are **Candidate** unless marked otherwise — none promoted to final canonical without owner lock.

---

## What is an Entity?

An **entity** in [ i ] is a **named organism** — a persistent role, companion, or identity layer that users relate to, not just a feature screen. Entities have philosophy, behavior, and cross-system relationships.

Systems (Wallet, Eye Tracking) are **machinery**. Entities are **who/what the platform feels like**.

---

## Entity Registry

| Entity | One-line role | Status | Doc |
|--------|---------------|--------|-----|
| **Elo** | Personal intelligence companion — continuity, memory, guidance | **Accepted** (ADR-013) | [ELO.md](./ELO.md) |
| **POP / POPS** | The senses — multimodal presence & validation layer | Candidate — design canonical | [POP.md](./POP.md) |
| **iAM** | Self/future identity layer — separate from Elo | **Accepted** — deferred post-MVP (ADR-013) | [iAM.md](./iAM.md) |
| **iVatar** | Avatar / embodied presence representation | Experimental — zero impl | [iVatar.md](./iVatar.md) |
| **MASTER_BRAIN** (meta) | Project knowledge organism — this corpus | Operational | [MASTER_BRAIN_ENTITY.md](./MASTER_BRAIN_ENTITY.md) |

---

## Entity vs Module vs System

| Kind | Examples | Question it answers |
|------|----------|---------------------|
| **Entity** | Elo, POP, iAM | *Who is present with the user?* |
| **Module** (`i*` alphabet) | iGET, iGO, iHEAR, iMAKE | *What job does this surface do?* |
| **System** | Wallet, Eye Tracking, Studio | *What machinery runs underneath?* |

Modules are catalogued in [`../SYSTEMS/ModuleAlphabet.md`](../SYSTEMS/ModuleAlphabet.md).

---

## Cross-Platform Evidence

| Platform | Primary entity threads |
|----------|------------------------|
| ChatGPT | Elo companion (143–144), POP/Presence (108), iAM (100), iGO (112–126) |
| Claude | Product brief (009), gaze/attention (003, 016–017), masterplan (012) |
| Repo | ELO mock shell, POPS backend, flutter-runtime proof |
| Desktop | `~/Desktop/[i]_PROJECT_CHAT_EXTRACTION/` — raw portable copy |

---

## Owner Decisions Pending

| ID | Question |
|----|----------|
| ENT-01 | Elo entity vs ELO mock | **Resolved** — same product (ADR-013) |
| ENT-02 | POP user-facing name | Open |
| ENT-03 | iAM in MVP scope | **Deferred** — post-MVP |
| ENT-04 | iVatar cut vs keep | Open |
| ENT-05 | Elo vs iAM | **Resolved** — separate (ADR-013) |
| MOD-01 | Roadmap module list | **Deferred** — owner TBD |

See [`../RELATIONSHIPS/INDEX.md`](../RELATIONSHIPS/INDEX.md) for how entities connect.
